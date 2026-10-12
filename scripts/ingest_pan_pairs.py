#!/usr/bin/env python3
"""
ingest_pan_pairs.py
===================
Enterprise Ingestion Script for Official Exchange Bilateral PAN Pairs:
  - PAN_PAIR_GUJRAFFIA.xlsx (2,713 trade pairs across Oct 14 - Oct 21, 2025)
  - PAN_PAIR_SKMEGGPROD.xlsx (3,987 trade pairs for Nov 03, 2025 alert session)

Populates `counterparty_trade_pairs` table in `backend/db/surveillance.db`
with genuine exchange data, preserving both LTP Push Logic 1 and Logic 2.
Purges legacy synthetic trade pairs and dummy scrips.
"""

import os
import sys
import time
import sqlite3
import pandas as pd

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "db", "surveillance.db")
GUJRAFFIA_FILE = os.path.join(os.path.dirname(__file__), "..", "PAN_PAIR_GUJRAFFIA.xlsx")
SKMEGGPROD_FILE = os.path.join(os.path.dirname(__file__), "..", "PAN_PAIR_SKMEGGPROD.xlsx")

DUMMY_SCRIPS = [
    "ALPHATECH", "NOVAENERGY", "ORBITCEM", "ZENITHBIO",
    "AXISBANK", "BAJFINANCE", "HDFCBANK", "ICICIBANK", "INFY",
    "MARUTI", "RELIANCE", "SBIN", "SUNPHARMA", "TCS", "WIPRO"
]

def main():
    start_time = time.time()
    print("=" * 80)
    print("PVASF — Exchange Bilateral PAN Pair Ingestion")
    print("=" * 80)

    if not os.path.exists(DB_PATH):
        print(f"[FATAL] Database not found at: {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check column existence for logic 2
        cursor.execute("PRAGMA table_info(counterparty_trade_pairs)")
        cols = [r[1] for r in cursor.fetchall()]
        if "pairwise_ltp_push_value_logic_2" not in cols:
            print("[*] Adding column `pairwise_ltp_push_value_logic_2` to `counterparty_trade_pairs`...")
            cursor.execute("ALTER TABLE counterparty_trade_pairs ADD COLUMN pairwise_ltp_push_value_logic_2 NUMERIC(15, 2)")
            conn.commit()

        cursor.execute("BEGIN TRANSACTION;")

        # 1. Purge legacy dummy scrips from counterparty_trade_pairs
        print(f"\n[1/4] Purging dummy scrips {DUMMY_SCRIPS} from counterparty_trade_pairs...")
        placeholders = ",".join(["?"] * len(DUMMY_SCRIPS))
        cursor.execute(f"DELETE FROM counterparty_trade_pairs WHERE symbol IN ({placeholders})", DUMMY_SCRIPS)
        print(f"      Purged {cursor.rowcount} dummy counterparty records.")

        # 2. Purge prior synthetic records for GUJRAFFIA and SKMEGGPROD
        target_symbols = ["GUJRAFFIA", "SKMEGGPROD"]
        print(f"\n[2/4] Wiping prior records for genuine scrips: {target_symbols}...")
        sym_placeholders = ",".join(["?"] * len(target_symbols))
        cursor.execute(f"DELETE FROM counterparty_trade_pairs WHERE symbol IN ({sym_placeholders})", target_symbols)
        print(f"      Removed {cursor.rowcount} prior counterparty records.")

        # 3. Read and validate Excel feeds
        print(f"\n[3/4] Reading and preparing PAN pair Excel feeds...")
        files_to_load = [
            ("GUJRAFFIA", GUJRAFFIA_FILE),
            ("SKMEGGPROD", SKMEGGPROD_FILE)
        ]

        total_pairs_loaded = 0
        all_pair_records = []

        for sym, fpath in files_to_load:
            if not os.path.exists(fpath):
                print(f"[WARN] File not found: {fpath}, skipping...")
                continue
            
            print(f"      Loading {fpath}...")
            df = pd.read_excel(fpath)
            print(f"      Parsed {len(df):,} rows for {sym}.")

            # Validate PANs in client_identity_master
            pair_pans = set(df["BUYER_PAN"].astype(str).str.strip()).union(set(df["SELLER_PAN"].astype(str).str.strip()))
            cursor.execute("SELECT client_pan FROM client_identity_master")
            existing_master_pans = set(r[0] for r in cursor.fetchall())
            missing_pans = pair_pans - existing_master_pans

            if missing_pans:
                print(f"      [NOTE] Adding {len(missing_pans)} missing counterparties to client_identity_master...")
                # Extract names for missing pans
                missing_records = []
                for p in missing_pans:
                    # find name from buyer or seller
                    name = "UNKNOWN COUNTERPARTY"
                    b_match = df[df["BUYER_PAN"] == p]
                    if not b_match.empty:
                        name = str(b_match.iloc[0]["BUYER_NAME"]).strip()
                    else:
                        s_match = df[df["SELLER_PAN"] == p]
                        if not s_match.empty:
                            name = str(s_match.iloc[0]["SELLER_NAME"]).strip()
                    missing_records.append((p, name, "INDIVIDUAL", "ACTIVE", "MUMBAI", "2024-01-01", "MEDIUM"))
                
                cursor.executemany("""
                    INSERT INTO client_identity_master (
                        client_pan, client_legal_name, entity_type, account_state,
                        residential_city, registration_date, risk_profile_grade
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(client_pan) DO NOTHING;
                """, missing_records)
                print(f"      Registered {len(missing_records)} identities in client_identity_master.")

            for _, r in df.iterrows():
                b_name = str(r["BUYER_NAME"]).strip()
                s_name = str(r["SELLER_NAME"]).strip()
                b_tm = str(r["BUYER_BROKER_ID"])
                s_tm = str(r["SELLER_BROKER_ID"])
                
                is_same_broker = 1 if b_tm == s_tm else 0
                is_algo = 1 if any(kw in b_name.upper() or kw in s_name.upper() for kw in ["LLP", "CAPITAL", "RESEARCH", "SECURITIES", "ALGO", "QUANT", "FINANCIAL", "VENTURE"]) else 0
                
                trade_dt = str(r["TRADE_DATE"])[:10]
                
                all_pair_records.append((
                    str(r["SYMBOL"]).strip(),
                    trade_dt,
                    str(r["BUYER_PAN"]).strip(),
                    b_name,
                    str(r["SELLER_PAN"]).strip(),
                    s_name,
                    b_tm,
                    s_tm,
                    int(r["MATCHED_QUANTITY"]),
                    round(float(r["MATCHED_TURNOVER_VALUE"]), 2),
                    round(float(r["LTP_PUSH_VALUE_LOGIC_1"]), 2),
                    round(float(r["LTP_PUSH_VALUE_LOGIC_2"]), 2),
                    int(r["REVERSE_MATCHED_QUANTITY"]),
                    is_same_broker,
                    is_algo
                ))

        # 4. Insert all pairs
        print(f"\n[4/4] Inserting {len(all_pair_records):,} bilateral trade pairs into `counterparty_trade_pairs`...")
        cursor.executemany("""
            INSERT INTO counterparty_trade_pairs (
                symbol, trade_date, buyer_pan, buyer_legal_name,
                seller_pan, seller_legal_name, buyer_tm_id, seller_tm_id,
                matched_quantity, matched_turnover_value,
                pairwise_ltp_push_value, pairwise_ltp_push_value_logic_2,
                reverse_matched_quantity, is_same_broker_wash, algo_execution_flag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, all_pair_records)

        conn.commit()
        print(f"      Successfully inserted {len(all_pair_records):,} records.")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Ingestion failed, rolled back: {e}", file=sys.stderr)
        raise
    finally:
        conn.close()

    elapsed = time.time() - start_time
    print("=" * 80)
    print(f"INGESTION COMPLETE IN {elapsed:.2f}s")
    print(f"Total Exchange Trade Pairs Stored: {len(all_pair_records):,}")
    print("=" * 80)

if __name__ == "__main__":
    main()
