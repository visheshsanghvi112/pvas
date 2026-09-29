"""
scripts/ingest_market_eod.py
─────────────────────────────────────────────────────────────────────────────
High-performance ingestion and 180-day baseline calculation pipeline.
Merges result_part1.xlsx and result_part2.xlsx, calculates the 6 baseline metrics,
and loads them into SQLite database with full index optimization.
"""

import os
import sys
import time
import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
PART1_PATH = BASE_DIR / "result_part1.xlsx"
PART2_PATH = BASE_DIR / "result_part2.xlsx"
DB_PATH = BASE_DIR / "backend" / "db" / "surveillance.db"

def main():
    print("=" * 65)
    print("PVASF Market EOD Ingestion & 180-Day Baseline Pipeline")
    print("=" * 65)

    if not PART1_PATH.exists() or not PART2_PATH.exists():
        print(f"Error: Missing part files! Expected:\n  {PART1_PATH}\n  {PART2_PATH}")
        sys.exit(1)

    t0 = time.time()

    # 1. Load Excel Part 1 & Part 2
    print(f"\n[1/5] Reading {PART1_PATH.name}...")
    t_p1 = time.time()
    df1 = pd.read_excel(PART1_PATH)
    print(f"      Loaded {len(df1):,} rows from Part 1 in {time.time() - t_p1:.2f}s")

    print(f"[2/5] Reading {PART2_PATH.name}...")
    t_p2 = time.time()
    df2 = pd.read_excel(PART2_PATH)
    print(f"      Loaded {len(df2):,} rows from Part 2 in {time.time() - t_p2:.2f}s")

    # 2. Combine and Standardize
    print("\n[3/5] Combining datasets and standardizing dates...")
    df = pd.concat([df1, df2], ignore_index=True)
    
    # Rename columns to match SQLite schema
    col_map = {
        "SCRIP_SYMBOL": "symbol",
        "TRADE_DATE": "trade_date",
        "ISIN": "isin",
        "COMPANY_LEGAL_NAME": "company_name",
        "DAY_OPEN_PRICE": "open_price",
        "DAY_HIGH_PRICE": "day_high_price",
        "DAY_LOW_PRICE": "day_low_price",
        "CLOSE_PRICE": "close_price",
        "PREVIOUS_CLOSE_PRICE": "prev_close_price",
        "TOTAL_TRADED_QUANTITY": "total_traded_quantity",
        "TOTAL_TRADED_TURNOVER": "total_traded_value",
        "UPPER_CIRCUIT_LIMIT": "upper_circuit_limit",
        "LOWER_CIRCUIT_LIMIT": "lower_circuit_limit",
        "WEEK_52_HIGH_PRICE": "week_52_high_price",
        "WEEK_52_LOW_PRICE": "week_52_low_price",
    }
    df = df.rename(columns=col_map)

    # Standardize trade_date to string 'YYYY-MM-DD'
    df["trade_date"] = pd.to_datetime(df["trade_date"]).dt.strftime("%Y-%m-%d")

    # Clean symbols and strings
    df["symbol"] = df["symbol"].astype(str).str.strip().str.upper()
    df["isin"] = df["isin"].astype(str).str.strip()
    df["company_name"] = df["company_name"].astype(str).str.strip()

    # Deduplicate on (symbol, trade_date)
    initial_len = len(df)
    df = df.drop_duplicates(subset=["symbol", "trade_date"])
    dupes = initial_len - len(df)
    print(f"      Total unique rows: {len(df):,} (Duplicates removed: {dupes})")
    print(f"      Unique Scrips:     {df['symbol'].nunique():,}")
    print(f"      Unique Dates:      {df['trade_date'].nunique():,} ({df['trade_date'].min()} to {df['trade_date'].max()})")

    # 3. Vectorized Baseline Statistics Calculation
    print("\n[4/5] Computing rolling 180-day baseline statistics...")
    t_stat = time.time()
    df = df.sort_values(by=["symbol", "trade_date"]).reset_index(drop=True)

    # Calculate daily returns
    df["daily_return"] = df.groupby("symbol")["close_price"].pct_change()

    # Baseline 180d metrics using groupby transforms:
    # 1. Base price 180d: close price from 180 sessions prior (or earliest available)
    # Using shift(180) with fallback to bfill per symbol
    df["base_price_180d"] = df.groupby("symbol")["close_price"].shift(180)
    df["base_price_180d"] = df["base_price_180d"].fillna(df.groupby("symbol")["close_price"].transform("first"))

    # 2. Baseline volume mean & std over rolling 180 days
    grouped_vol = df.groupby("symbol")["total_traded_quantity"]
    df["baseline_volume_mean"] = grouped_vol.rolling(180, min_periods=15).mean().reset_index(drop=True)
    df["baseline_volume_std"] = grouped_vol.rolling(180, min_periods=15).std().reset_index(drop=True)

    # 3. Baseline return mean & std over rolling 180 days
    grouped_ret = df.groupby("symbol")["daily_return"]
    df["return_mean_180d"] = grouped_ret.rolling(180, min_periods=15).mean().reset_index(drop=True)
    df["return_std_180d"] = grouped_ret.rolling(180, min_periods=15).std().reset_index(drop=True)

    # 4. Peak high price over rolling 180 days
    grouped_high = df.groupby("symbol")["day_high_price"]
    df["peak_high_180d"] = grouped_high.rolling(180, min_periods=15).max().reset_index(drop=True)

    # Round numeric values
    df["base_price_180d"] = df["base_price_180d"].round(2)
    df["baseline_volume_mean"] = df["baseline_volume_mean"].fillna(0.0).round(2)
    df["baseline_volume_std"] = df["baseline_volume_std"].fillna(0.0).round(2)
    df["return_mean_180d"] = df["return_mean_180d"].fillna(0.0).round(6)
    df["return_std_180d"] = df["return_std_180d"].fillna(0.02).round(6)
    df["peak_high_180d"] = df["peak_high_180d"].round(2)

    print(f"      Baseline metrics computed in {time.time() - t_stat:.2f}s")

    # 4. Database Ingestion
    print(f"\n[5/5] Ingesting into SQLite database: {DB_PATH.name}...")
    t_db = time.time()

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA cache_size = 100000;")
    cursor = conn.cursor()

    # Clear old mock EOD & baseline tables
    cursor.execute("DELETE FROM daily_market_eod;")
    cursor.execute("DELETE FROM market_baseline_stats;")

    # Prepare rows for daily_market_eod
    eod_cols = [
        "symbol", "trade_date", "isin", "company_name",
        "open_price", "day_high_price", "day_low_price", "close_price",
        "total_traded_quantity", "total_traded_value",
        "upper_circuit_limit", "lower_circuit_limit",
        "prev_close_price", "week_52_high_price", "week_52_low_price",
        "base_price_180d", "baseline_volume_mean", "baseline_volume_std"
    ]
    eod_data = df[eod_cols].values.tolist()

    insert_eod_sql = f"""
        INSERT INTO daily_market_eod ({', '.join(eod_cols)})
        VALUES ({', '.join(['?'] * len(eod_cols))});
    """
    cursor.executemany(insert_eod_sql, eod_data)
    print(f"      Inserted {len(eod_data):,} rows into daily_market_eod")

    # Prepare rows for market_baseline_stats
    baseline_cols = [
        "symbol", "trade_date", "base_price_180d",
        "baseline_volume_mean", "baseline_volume_std",
        "return_mean_180d", "return_std_180d", "peak_high_180d"
    ]
    baseline_data = df[baseline_cols].values.tolist()

    insert_baseline_sql = f"""
        INSERT INTO market_baseline_stats ({', '.join(baseline_cols)})
        VALUES ({', '.join(['?'] * len(baseline_cols))});
    """
    cursor.executemany(insert_baseline_sql, baseline_data)
    print(f"      Inserted {len(baseline_data):,} rows into market_baseline_stats")

    # Run ANALYZE for query planner optimization
    cursor.execute("ANALYZE;")
    conn.commit()
    conn.close()

    print(f"      Database ingestion and index optimization completed in {time.time() - t_db:.2f}s")
    total_elapsed = time.time() - t0
    print("\n" + "=" * 65)
    print(f"SUCCESS: Ingestion fully complete in {total_elapsed:.2f}s!")
    print(f"Total Records: {len(df):,} rows across {df['symbol'].nunique():,} scrips")
    print(f"Database:      {DB_PATH}")
    print("=" * 65)

if __name__ == "__main__":
    main()
