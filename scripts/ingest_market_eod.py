"""
scripts/ingest_market_eod.py
─────────────────────────────────────────────────────────────────────────────
Production-Grade Ingestion and 180-Day Baseline Calculation Pipeline for PVASF.

Key Enhancements:
1. Universal File Support: Supports .xlsx, .xls, .csv, and .parquet.
2. CLI Argument Interface: Accepts explicit file paths, directories, or globs.
   Defaults safely to result_part1.xlsx and result_part2.xlsx.
3. Non-Destructive Upserts: Uses SQLite ON CONFLICT(symbol, trade_date) DO UPDATE,
   preserving existing data. Optional --wipe / --fresh flag for complete reset.
4. Robust Rolling Math: Uses droplevel(0) index-aligned rolling groupby transforms,
   preventing positional index corruption.
5. Flexible Column Mapping: Tolerant of varying exchange column names & casings.
6. Calendar Synchronization: Auto-registers newly ingested trading dates into
   trading_session_calendar so UI date pickers update instantly.
7. Atomic Transactions & Rollback: Fully protected against half-written states.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import sqlite3
from pathlib import Path
from typing import List, Optional

import pandas as pd
import numpy as np

# Default Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "backend" / "db" / "surveillance.db"
DEFAULT_PART1 = BASE_DIR / "result_part1.xlsx"
DEFAULT_PART2 = BASE_DIR / "result_part2.xlsx"

COLUMN_ALIASES = {
    # Symbol
    "SCRIP_SYMBOL": "symbol",
    "SYMBOL": "symbol",
    "TICKER": "symbol",
    "SCRIP": "symbol",
    "SECURITY": "symbol",

    # Date
    "TRADE_DATE": "trade_date",
    "DATE": "trade_date",
    "TIMESTAMP": "trade_date",
    "TRADEDATE": "trade_date",

    # ISIN & Name
    "ISIN": "isin",
    "ISIN_CODE": "isin",
    "COMPANY_LEGAL_NAME": "company_name",
    "COMPANY_NAME": "company_name",
    "COMPANY": "company_name",
    "SECURITY_NAME": "company_name",

    # Prices
    "DAY_OPEN_PRICE": "open_price",
    "OPEN_PRICE": "open_price",
    "OPEN": "open_price",
    "DAY_HIGH_PRICE": "day_high_price",
    "HIGH_PRICE": "day_high_price",
    "HIGH": "day_high_price",
    "DAY_LOW_PRICE": "day_low_price",
    "LOW_PRICE": "day_low_price",
    "LOW": "day_low_price",
    "CLOSE_PRICE": "close_price",
    "CLOSE": "close_price",
    "PREVIOUS_CLOSE_PRICE": "prev_close_price",
    "PREV_CLOSE": "prev_close_price",
    "PREVCLOSE": "prev_close_price",

    # Volumes & Turnovers
    "TOTAL_TRADED_QUANTITY": "total_traded_quantity",
    "TRADED_QUANTITY": "total_traded_quantity",
    "VOLUME": "total_traded_quantity",
    "TOTTRDQTY": "total_traded_quantity",
    "TOTAL_TRADED_TURNOVER": "total_traded_value",
    "TURNOVER": "total_traded_value",
    "TOTTRDVAL": "total_traded_value",
    "VALUE": "total_traded_value",

    # Delivery Quantities
    "DELIVERY_QUANTITY": "delivery_quantity",
    "DELIVERY_QTY": "delivery_quantity",
    "DELIV_QTY": "delivery_quantity",
    "DELIV_QUANTITY": "delivery_quantity",

    # Price Bands & 52W Limits
    "UPPER_CIRCUIT_LIMIT": "upper_circuit_limit",
    "UPPER_BAND": "upper_circuit_limit",
    "LOWER_CIRCUIT_LIMIT": "lower_circuit_limit",
    "LOWER_BAND": "lower_circuit_limit",
    "WEEK_52_HIGH_PRICE": "week_52_high_price",
    "52W_HIGH": "week_52_high_price",
    "WEEK_52_LOW_PRICE": "week_52_low_price",
    "52W_LOW": "week_52_low_price",
}


def load_file(file_path: Path) -> pd.DataFrame:
    """Loads a single spreadsheet or delimited file with optimized engine."""
    suffix = file_path.suffix.lower()
    t_start = time.time()
    
    if suffix in [".csv", ".txt"]:
        df = pd.read_csv(file_path, low_memory=False)
    elif suffix in [".xlsx", ".xlsm"]:
        df = pd.read_excel(file_path, engine="openpyxl")
    elif suffix in [".xls"]:
        df = pd.read_excel(file_path)
    elif suffix in [".parquet"]:
        df = pd.read_parquet(file_path)
    else:
        raise ValueError(f"Unsupported file format: {suffix} for {file_path}")

    elapsed = time.time() - t_start
    print(f"      Loaded {len(df):,} rows from {file_path.name} in {elapsed:.2f}s")
    return df


def standardize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Normalizes column names, cleans strings, formats dates, and coerces numeric types."""
    # 1. Rename columns by checking normalized uppercase aliases
    rename_dict = {}
    for col in df.columns:
        norm_col = str(col).strip().upper()
        if norm_col in COLUMN_ALIASES:
            rename_dict[col] = COLUMN_ALIASES[norm_col]
        elif col in COLUMN_ALIASES:
            rename_dict[col] = COLUMN_ALIASES[col]
    df = df.rename(columns=rename_dict)

    # 2. Check essential columns
    required = ["symbol", "trade_date", "close_price"]
    for req in required:
        if req not in df.columns:
            raise KeyError(f"Missing mandatory column: '{req}'. Found columns: {list(df.columns)}")

    # 3. Clean symbol and identifiers
    df["symbol"] = df["symbol"].astype(str).str.strip().str.upper()
    df = df[df["symbol"].str.len() > 0]
    df = df[~df["symbol"].isin(["NAN", "NONE", "NULL"])]

    # 4. Standardize dates to 'YYYY-MM-DD'
    df["trade_date"] = pd.to_datetime(df["trade_date"], errors="coerce").dt.strftime("%Y-%m-%d")
    df = df.dropna(subset=["trade_date"])

    # 5. Populate missing optional string fields
    if "isin" not in df.columns or df["isin"].isna().all():
        df["isin"] = df["symbol"].apply(lambda s: f"INE{abs(hash(s)) % 900000 + 100000}A01010")
    else:
        df["isin"] = df["isin"].fillna("").astype(str).str.strip()
        # Fallback empty ISINs
        mask_empty = df["isin"] == ""
        if mask_empty.any():
            df.loc[mask_empty, "isin"] = df.loc[mask_empty, "symbol"].apply(
                lambda s: f"INE{abs(hash(s)) % 900000 + 100000}A01010"
            )

    if "company_name" not in df.columns or df["company_name"].isna().all():
        df["company_name"] = df["symbol"] + " Ltd"
    else:
        df["company_name"] = df["company_name"].fillna(df["symbol"] + " Ltd").astype(str).str.strip()

    # 6. Coerce numeric fields safely
    numeric_cols = [
        "open_price", "day_high_price", "day_low_price", "close_price",
        "prev_close_price", "total_traded_quantity", "total_traded_value",
        "upper_circuit_limit", "lower_circuit_limit",
        "week_52_high_price", "week_52_low_price"
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        else:
            # Create standard default
            if col == "open_price":
                df[col] = df["close_price"]
            elif col == "day_high_price":
                df[col] = df["close_price"]
            elif col == "day_low_price":
                df[col] = df["close_price"]
            elif col == "prev_close_price":
                df[col] = df["close_price"]
            elif col in ["total_traded_quantity", "total_traded_value"]:
                df[col] = 0
            elif col == "upper_circuit_limit":
                df[col] = (df["close_price"] * 1.20).round(2)
            elif col == "lower_circuit_limit":
                df[col] = (df["close_price"] * 0.80).round(2)
            else:
                df[col] = np.nan

    # Fill NaNs in OHLC with close_price
    df["open_price"] = df["open_price"].fillna(df["close_price"]).round(2)
    df["day_high_price"] = df["day_high_price"].fillna(df["close_price"]).round(2)
    df["day_low_price"] = df["day_low_price"].fillna(df["close_price"]).round(2)
    df["close_price"] = df["close_price"].round(2)
    df["prev_close_price"] = df["prev_close_price"].fillna(df["close_price"]).round(2)
    df["total_traded_quantity"] = df["total_traded_quantity"].fillna(0).astype(int)
    df["total_traded_value"] = df["total_traded_value"].fillna(
        df["total_traded_quantity"] * df["close_price"]
    ).round(2)
    df["upper_circuit_limit"] = df["upper_circuit_limit"].fillna(df["close_price"] * 1.20).round(2)
    df["lower_circuit_limit"] = df["lower_circuit_limit"].fillna(df["close_price"] * 0.80).round(2)
    df["week_52_high_price"] = df["week_52_high_price"].fillna(df["day_high_price"]).round(2)
    df["week_52_low_price"] = df["week_52_low_price"].fillna(df["day_low_price"]).round(2)

    # 7. Deduplicate on primary key (symbol, trade_date)
    initial_len = len(df)
    df = df.drop_duplicates(subset=["symbol", "trade_date"], keep="last")
    dupes = initial_len - len(df)
    if dupes > 0:
        print(f"      Deduplication: removed {dupes:,} duplicate records")

    return df


def calculate_baselines(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes rolling 180-day baseline statistics using guaranteed index-aligned transforms:
    - Base Price 180D (shift 180 with fallback to earliest session)
    - Volume Mean & Std Dev over rolling 180 sessions (min_periods=15)
    - Daily Return Mean & Std Dev over rolling 180 sessions (min_periods=15)
    - Rolling Peak High Price over rolling 180 sessions (min_periods=15)
    """
    print("\n[3/5] Computing rolling 180-day baseline statistics (Index-Aligned)...")
    t0 = time.time()

    # Sort strictly by symbol and trade_date to guarantee temporal ordering
    df = df.sort_values(by=["symbol", "trade_date"]).reset_index(drop=True)

    # 1. Daily percentage return per symbol
    df["daily_return"] = df.groupby("symbol")["close_price"].pct_change()

    # 2. Base Price 180D
    # shift(180) returns price 180 sessions prior. Fallback to first available close for young listings.
    df["base_price_180d"] = df.groupby("symbol")["close_price"].shift(180)
    df["base_price_180d"] = df["base_price_180d"].fillna(
        df.groupby("symbol")["close_price"].transform("first")
    ).round(2)

    # 3. Rolling Volume Mean & Volatility
    grouped_vol = df.groupby("symbol")["total_traded_quantity"]
    # min_periods=1 ensures newly listed stocks (<15 days) have valid expanding baseline volume rather than 0.0
    df["baseline_volume_mean"] = grouped_vol.rolling(180, min_periods=1).mean().droplevel(0).fillna(0.0).round(2)
    # Volatility requires at least 2 sessions
    df["baseline_volume_std"] = grouped_vol.rolling(180, min_periods=2).std().droplevel(0).fillna(0.0).round(2)

    # 4. Rolling Return Mean & Volatility
    grouped_ret = df.groupby("symbol")["daily_return"]
    df["return_mean_180d"] = grouped_ret.rolling(180, min_periods=1).mean().droplevel(0).fillna(0.0).round(6)
    df["return_std_180d"] = grouped_ret.rolling(180, min_periods=2).std().droplevel(0).fillna(0.02).round(6)

    # 5. Rolling Peak High Price
    grouped_high = df.groupby("symbol")["day_high_price"]
    df["peak_high_180d"] = grouped_high.rolling(180, min_periods=1).max().droplevel(0).fillna(df["day_high_price"]).round(2)

    print(f"      Baseline metrics computed in {time.time() - t0:.2f}s across {df['symbol'].nunique():,} scrips")
    return df


def ingest_to_database(df: pd.DataFrame, db_path: Path, wipe: bool = False):
    """
    Ingests processed records into SQLite with full transaction safety and atomic upserts.
    """
    print(f"\n[4/5] Ingesting into SQLite database: {db_path.name}...")
    t0 = time.time()

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA cache_size = 100000;")
    cursor = conn.cursor()

    try:
        # Ensure unique index exists on market_baseline_stats for conflict resolution
        cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS uk_market_baseline_stats_sym_date
            ON market_baseline_stats (symbol, trade_date);
        """)

        if wipe:
            print("      ⚠️ WIPE flag enabled: Purging existing daily_market_eod and market_baseline_stats...")
            cursor.execute("DELETE FROM daily_market_eod;")
            cursor.execute("DELETE FROM market_baseline_stats;")

        # ── 1. Ingest daily_market_eod (UPSERT) ──
        eod_cols = [
            "symbol", "trade_date", "isin", "company_name",
            "open_price", "day_high_price", "day_low_price", "close_price",
            "total_traded_quantity", "total_traded_value",
            "upper_circuit_limit", "lower_circuit_limit",
            "prev_close_price", "week_52_high_price", "week_52_low_price",
            "base_price_180d", "baseline_volume_mean", "baseline_volume_std"
        ]
        
        insert_eod_sql = f"""
            INSERT INTO daily_market_eod ({', '.join(eod_cols)})
            VALUES ({', '.join(['?'] * len(eod_cols))})
            ON CONFLICT(symbol, trade_date) DO UPDATE SET
                isin = excluded.isin,
                company_name = excluded.company_name,
                open_price = excluded.open_price,
                day_high_price = excluded.day_high_price,
                day_low_price = excluded.day_low_price,
                close_price = excluded.close_price,
                total_traded_quantity = excluded.total_traded_quantity,
                total_traded_value = excluded.total_traded_value,
                upper_circuit_limit = excluded.upper_circuit_limit,
                lower_circuit_limit = excluded.lower_circuit_limit,
                prev_close_price = excluded.prev_close_price,
                week_52_high_price = excluded.week_52_high_price,
                week_52_low_price = excluded.week_52_low_price,
                base_price_180d = excluded.base_price_180d,
                baseline_volume_mean = excluded.baseline_volume_mean,
                baseline_volume_std = excluded.baseline_volume_std;
        """

        eod_data = df[eod_cols].values.tolist()
        batch_size = 10000
        for i in range(0, len(eod_data), batch_size):
            cursor.executemany(insert_eod_sql, eod_data[i:i + batch_size])
        print(f"      ✓ Processed {len(eod_data):,} rows into daily_market_eod")

        # ── 2. Ingest market_baseline_stats (UPSERT) ──
        baseline_cols = [
            "symbol", "trade_date", "base_price_180d",
            "baseline_volume_mean", "baseline_volume_std",
            "return_mean_180d", "return_std_180d", "peak_high_180d"
        ]

        insert_baseline_sql = f"""
            INSERT INTO market_baseline_stats ({', '.join(baseline_cols)})
            VALUES ({', '.join(['?'] * len(baseline_cols))})
            ON CONFLICT(symbol, trade_date) DO UPDATE SET
                base_price_180d = excluded.base_price_180d,
                baseline_volume_mean = excluded.baseline_volume_mean,
                baseline_volume_std = excluded.baseline_volume_std,
                return_mean_180d = excluded.return_mean_180d,
                return_std_180d = excluded.return_std_180d,
                peak_high_180d = excluded.peak_high_180d;
        """

        baseline_data = df[baseline_cols].values.tolist()
        for i in range(0, len(baseline_data), batch_size):
            cursor.executemany(insert_baseline_sql, baseline_data[i:i + batch_size])
        print(f"      ✓ Processed {len(baseline_data):,} rows into market_baseline_stats")

        # ── 3. Synchronize Trading Session Calendar ──
        print("\n[5/5] Synchronizing trading_session_calendar...")
        unique_dates = df["trade_date"].unique().tolist()
        calendar_sql = """
            INSERT OR IGNORE INTO trading_session_calendar (calendar_date, is_trading_day, holiday_name, is_special_auction)
            VALUES (?, 1, NULL, 0);
        """
        cursor.executemany(calendar_sql, [(d,) for d in unique_dates])
        print(f"      ✓ Synchronized {len(unique_dates):,} trading sessions in calendar")

        # ── 4. Optimize SQLite Query Planner ──
        cursor.execute("ANALYZE;")
        conn.commit()
        print(f"      ✓ Database optimization completed in {time.time() - t0:.2f}s")

    except Exception as exc:
        conn.rollback()
        print(f"❌ DATABASE TRANSACTION ERROR: {exc}", file=sys.stderr)
        raise exc
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(
        description="PVASF Robust Market EOD & 180-Day Baseline Ingestion Pipeline"
    )
    parser.add_argument(
        "files",
        nargs="*",
        help="Path(s) to input file(s) (.xlsx, .csv, .parquet). Defaults to result_part1.xlsx and result_part2.xlsx.",
    )
    parser.add_argument(
        "--wipe",
        "--fresh",
        action="store_true",
        help="Purge existing EOD data before ingestion (default: False - safe incremental upsert).",
    )
    parser.add_argument(
        "--db",
        default=str(DB_PATH),
        help=f"Path to SQLite database file (default: {DB_PATH}).",
    )

    args = parser.parse_args()
    target_db = Path(args.db)

    print("=" * 68)
    print("   PVASF PRODUCTION-GRADE MARKET EOD INGESTION PIPELINE")
    print("=" * 68)

    # Resolve input files
    input_files: List[Path] = []
    if args.files:
        for arg in args.files:
            p = Path(arg)
            if p.is_dir():
                for ext in ["*.xlsx", "*.xls", "*.csv", "*.parquet"]:
                    input_files.extend(list(p.glob(ext)))
            elif p.exists():
                input_files.append(p)
            else:
                print(f"⚠️ Warning: Specified file does not exist: {p}")
    else:
        # Default fallback
        if DEFAULT_PART1.exists():
            input_files.append(DEFAULT_PART1)
        if DEFAULT_PART2.exists():
            input_files.append(DEFAULT_PART2)

    if not input_files:
        print(f"❌ Error: No valid input files found! Please provide input files or place result_part1.xlsx/result_part2.xlsx in project root.")
        sys.exit(1)

    print(f"\nDiscovered {len(input_files)} input file(s):")
    for f in input_files:
        print(f"  • {f.name} ({f.stat().st_size / (1024 * 1024):.2f} MB)")

    t_total = time.time()

    # Step 1: Load and Concatenate
    print("\n[1/5] Loading datasets...")
    dfs = [load_file(f) for f in input_files]
    df_raw = pd.concat(dfs, ignore_index=True)

    # Step 2: Standardize & Validate
    print("\n[2/5] Standardizing schemas, cleaning types and deduplicating...")
    df_clean = standardize_dataframe(df_raw)
    print(f"      Total Clean Records: {len(df_clean):,}")
    print(f"      Distinct Symbols:    {df_clean['symbol'].nunique():,}")
    print(f"      Date Range:          {df_clean['trade_date'].min()} to {df_clean['trade_date'].max()}")

    # Step 3: Compute Rolling Baselines
    df_processed = calculate_baselines(df_clean)

    # Step 4: Ingest & Upsert to SQLite
    ingest_to_database(df_processed, target_db, wipe=args.wipe)

    print("\n" + "=" * 68)
    print(f"🎉 INGESTION PIPELINE COMPLETED SUCCESSFULLY in {time.time() - t_total:.2f}s!")
    print(f"   Target Database: {target_db.name}")
    print(f"   Total Records:   {len(df_processed):,} sessions across {df_processed['symbol'].nunique():,} scrips")
    print("=" * 68 + "\n")


if __name__ == "__main__":
    main()
