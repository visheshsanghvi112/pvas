#!/usr/bin/env python3
"""
scripts/generate_sample_data_package.py
────────────────────────────────────────────────────────────────────────────
Exports 100% accurate database tables directly from the SQLite warehouse
(backend/db/surveillance.db) into clean, non-confusing Excel workbooks and CSVs.

No artificial module groupings or numbered prefixes.
Sheets are named directly after the SQL tables in logical surveillance order:
  1. daily_market_eod           (Market OHLCV & Circuit Limits)
  2. participant_daily_trades   (Participant LTP Push & Buy/Sell Volumes)
  3. counterparty_trade_pairs   (Matched Buyer-Seller Pairs & Wash Trades)
  4. shareholding_summary       (Quarterly Float & Demographics)
  5. corporate_events_feed      (Splits, Bonuses, Dividends)
  6. trading_session_calendar   (Exchange Trading Days & Holidays)
  7. surveillance_alert_cases   (Scrip Alert Cases & Risk Scores)
  8. market_baseline_stats      (180-Day Statistical Baselines)
  9. large_shareholders_registry (Significant Shareholders >= 1%)
  10. price_dilution_factors    (Baseline Dilution Multipliers)
  11. broker_daily_summary      (Broker Trading Member Totals)
  12. client_identity_master    (Client KYC Entity Master)
  13. client_demat_accounts     (Depository Demat Accounts)
"""

import os
import shutil
import sqlite3
import zipfile
import csv
from datetime import date, datetime
import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

DB_PATH = "backend/db/surveillance.db"
PKG_DIR = "PVASF_Sample_Data_Package"
FEEDS_DIR = os.path.join(PKG_DIR, "sample_data_feeds")
PKG_XLSX = os.path.join(PKG_DIR, "PVASF_Sample_Data_Package.xlsx")
DOWNLOADS_XLSX = os.path.expanduser("~/Downloads/PVASF_Sample_Data.xlsx")
ZIP_PATH = "PVASF_Sample_Data_Package.zip"
PROD_FULL_XLSX = "PVASF_Production_Full_Data.xlsx"

# Exact SQL tables in clear, intuitive market-first order
TABLE_FEEDS = [
    {
        "table": "daily_market_eod",
        "sheet": "daily_market_eod",
        "csv_file": "daily_market_eod.csv",
        "columns": [
            "symbol", "trade_date", "isin", "company_name", "open_price",
            "day_high_price", "day_low_price", "close_price", "total_traded_quantity",
            "total_traded_value", "upper_circuit_limit", "lower_circuit_limit",
            "delivery_quantity", "prev_close_price", "week_52_high_price",
            "week_52_low_price", "base_price_180d", "baseline_volume_mean", "baseline_volume_std"
        ],
        "alignments": ["left", "center", "center", "left", "right", "right", "right", "right", "right", "right", "right", "right", "right", "right", "right", "right", "right", "right", "right"]
    },
    {
        "table": "participant_daily_trades",
        "sheet": "participant_daily_trades",
        "csv_file": "participant_daily_trades.csv",
        "columns": [
            "symbol", "trade_date", "client_pan", "client_legal_name", "trading_member_id",
            "buy_quantity", "sell_quantity", "buy_turnover_value", "sell_turnover_value",
            "gross_positive_ltp_value", "gross_negative_ltp_value", "same_broker_wash_quantity",
            "buy_trade_count", "sell_trade_count", "aggressor_buy_quantity", "client_category"
        ],
        "alignments": ["left", "center", "center", "left", "center", "right", "right", "right", "right", "right", "right", "right", "right", "right", "right", "center"]
    },
    {
        "table": "counterparty_trade_pairs",
        "sheet": "counterparty_trade_pairs",
        "csv_file": "counterparty_trade_pairs.csv",
        "columns": [
            "symbol", "trade_date", "buyer_pan", "buyer_legal_name", "seller_pan",
            "seller_legal_name", "buyer_tm_id", "seller_tm_id", "matched_quantity",
            "matched_turnover_value", "pairwise_ltp_push_value", "reverse_matched_quantity",
            "is_same_broker_wash", "algo_execution_flag"
        ],
        "alignments": ["left", "center", "center", "left", "center", "left", "center", "center", "right", "right", "right", "right", "center", "center"]
    },
    {
        "table": "shareholding_summary",
        "sheet": "shareholding_summary",
        "csv_file": "shareholding_summary.csv",
        "columns": [
            "symbol", "quarter_code", "filing_date", "category_type", "total_shares_count",
            "holding_percentage", "pledged_shares_percentage", "locked_in_shares_percentage",
            "unique_holding_pans", "avg_daily_trading_pans"
        ],
        "alignments": ["left", "center", "center", "left", "right", "right", "right", "right", "right", "right"]
    },
    {
        "table": "corporate_events_feed",
        "sheet": "corporate_events_feed",
        "csv_file": "corporate_events_feed.csv",
        "columns": [
            "symbol", "isin", "announcement_date", "record_date", "ex_date",
            "action_category", "announcement_purpose", "ratio_or_value", "dilution_factor"
        ],
        "alignments": ["left", "center", "center", "center", "center", "center", "left", "center", "right"]
    },
    {
        "table": "trading_session_calendar",
        "sheet": "trading_session_calendar",
        "csv_file": "trading_session_calendar.csv",
        "columns": [
            "calendar_date", "is_trading_day", "holiday_name", "is_special_auction"
        ],
        "alignments": ["center", "center", "left", "center"]
    },
    {
        "table": "surveillance_alert_cases",
        "sheet": "surveillance_alert_cases",
        "csv_file": "surveillance_alert_cases.csv",
        "columns": [
            "case_reference_id", "symbol", "observation_date", "composite_risk_score",
            "alert_severity_level", "surveillance_status", "metric_price_rise_pct",
            "metric_price_zscore", "metric_volume_zscore", "metric_band_hit_days",
            "metric_new_high_days", "assigned_officer", "investigation_notes"
        ],
        "alignments": ["center", "left", "center", "right", "center", "center", "right", "right", "right", "right", "right", "left", "left"]
    },
    {
        "table": "market_baseline_stats",
        "sheet": "market_baseline_stats",
        "csv_file": "market_baseline_stats.csv",
        "columns": [
            "stat_id", "symbol", "trade_date", "base_price_180d", "baseline_volume_mean",
            "baseline_volume_std", "return_mean_180d", "return_std_180d", "peak_high_180d"
        ],
        "alignments": ["center", "left", "center", "right", "right", "right", "right", "right", "right"]
    },
    {
        "table": "large_shareholders_registry",
        "sheet": "large_shareholders_registry",
        "csv_file": "large_shareholders_registry.csv",
        "columns": [
            "record_id", "symbol", "quarter_code", "holder_pan", "holder_legal_name",
            "holder_category", "shares_held", "holding_percentage", "pledged_shares_count"
        ],
        "alignments": ["center", "left", "center", "center", "left", "center", "right", "right", "right"]
    },
    {
        "table": "price_dilution_factors",
        "sheet": "price_dilution_factors",
        "csv_file": "price_dilution_factors.csv",
        "columns": [
            "factor_id", "symbol", "split_multiplier", "valid_from_date", "valid_thru_date"
        ],
        "alignments": ["center", "left", "right", "center", "center"]
    },
    {
        "table": "broker_daily_summary",
        "sheet": "broker_daily_summary",
        "csv_file": "broker_daily_summary.csv",
        "columns": [
            "broker_summary_id", "trading_member_id", "trading_member_name",
            "symbol", "trade_date", "total_buy_volume", "total_sell_volume",
            "same_broker_wash_volume", "total_turnover_value"
        ],
        "alignments": ["center", "center", "left", "left", "center", "right", "right", "right", "right"]
    },
    {
        "table": "client_identity_master",
        "sheet": "client_identity_master",
        "csv_file": "client_identity_master.csv",
        "columns": [
            "client_pan", "client_legal_name", "entity_type", "account_state",
            "residential_city", "registration_date", "risk_profile_grade"
        ],
        "alignments": ["center", "left", "center", "center", "left", "center", "center"]
    },
    {
        "table": "client_demat_accounts",
        "sheet": "client_demat_accounts",
        "csv_file": "client_demat_accounts.csv",
        "columns": [
            "account_id", "client_pan", "depository_id", "beneficiary_acc_no",
            "account_open_date", "joint_holder_pan_2", "joint_holder_pan_3",
            "is_poa_active", "bank_account_masked"
        ],
        "alignments": ["center", "center", "center", "center", "center", "center", "center", "center", "center"]
    }
]

# Formatting styles
FONT_NAME = "Calibri"
FONT_HDR = Font(name=FONT_NAME, size=10, bold=True, color="FFFFFF")
FONT_ROW = Font(name=FONT_NAME, size=9.5, color="1E293B")
FILL_HDR = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
FILL_ZEBRA = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
FILL_WHITE = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
BORDER_SUBTLE = Side(border_style="thin", color="E2E8F0")
BORDER_CELL = Border(left=BORDER_SUBTLE, right=BORDER_SUBTLE, top=BORDER_SUBTLE, bottom=BORDER_SUBTLE)

ALIGN_LOOKUP = {
    "left": Alignment(horizontal="left", vertical="center"),
    "right": Alignment(horizontal="right", vertical="center"),
    "center": Alignment(horizontal="center", vertical="center"),
}


def format_workbook_sheet(ws, title, cols, rows, alignments):
    ws.title = title
    ws.views.sheetView[0].showGridLines = True
    ws.freeze_panes = "A2"
    ws.row_dimensions[1].height = 24

    # Header Row
    for col_idx, col_name in enumerate(cols, start=1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.font = FONT_HDR
        cell.fill = FILL_HDR
        cell.alignment = ALIGN_LOOKUP.get(alignments[col_idx - 1] if col_idx - 1 < len(alignments) else "left", Alignment(horizontal="left", vertical="center"))
        cell.border = BORDER_CELL

    # Data Rows
    col_widths = {c_idx: len(str(cols[c_idx - 1])) for c_idx in range(1, len(cols) + 1)}

    for r_idx, row_vals in enumerate(rows, start=2):
        ws.row_dimensions[r_idx].height = 19
        zebra = FILL_WHITE if r_idx % 2 == 0 else FILL_ZEBRA
        for c_idx, val in enumerate(row_vals, start=1):
            cell = ws.cell(row=r_idx, column=c_idx, value=val)
            cell.font = FONT_ROW
            cell.fill = zebra
            cell.border = BORDER_CELL
            align = alignments[c_idx - 1] if c_idx - 1 < len(alignments) else "left"
            cell.alignment = ALIGN_LOOKUP.get(align, Alignment(horizontal="left", vertical="center"))

            # Number formats
            col_name = cols[c_idx - 1]
            if any(term in col_name for term in ["price", "value", "mean", "std"]):
                if isinstance(val, (int, float)):
                    cell.number_format = "#,##0.00"
            elif any(term in col_name for term in ["quantity", "count", "pans", "volume", "shares"]):
                if isinstance(val, (int, float)):
                    cell.number_format = "#,##0"
            elif "percentage" in col_name or "pct" in col_name or "score" in col_name:
                if isinstance(val, (int, float)):
                    cell.number_format = "0.00"
            elif "factor" in col_name or "multiplier" in col_name:
                if isinstance(val, (int, float)):
                    cell.number_format = "0.000000"

            val_str = str(val) if val is not None else ""
            if len(val_str) > col_widths[c_idx]:
                col_widths[c_idx] = len(val_str)

    # Set column widths with comfortable padding
    for c_idx, max_len in col_widths.items():
        col_letter = get_column_letter(c_idx)
        ws.column_dimensions[col_letter].width = max(12, min(max_len + 4, 50))


def main():
    print(f"Connecting to database: {DB_PATH} ...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Clear and recreate clean feeds dir
    if os.path.exists(FEEDS_DIR):
        shutil.rmtree(FEEDS_DIR)
    os.makedirs(FEEDS_DIR, exist_ok=True)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # Remove default empty sheet

    print("\n--- Generating Clean SQL Table Sheets & Feeds ---")
    for idx, feed in enumerate(TABLE_FEEDS, start=1):
        table = feed["table"]
        cols = feed["columns"]
        sheet_name = feed["sheet"]
        csv_filename = feed["csv_file"]
        alignments = feed["alignments"]

        col_str = ", ".join(cols)
        query = f"SELECT {col_str} FROM {table}"
        cursor.execute(query)
        rows = [list(r) for r in cursor.fetchall()]

        print(f"[{idx:2d}/{len(TABLE_FEEDS)}] Sheet: {sheet_name:30} ({len(rows):5d} rows, {len(cols):2d} cols)")

        # 1. Add Excel Sheet
        ws = wb.create_sheet(title=sheet_name)
        format_workbook_sheet(ws, sheet_name, cols, rows, alignments)

        # 2. Write CSV Feed
        csv_path = os.path.join(FEEDS_DIR, csv_filename)
        with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(cols)
            writer.writerows(rows)

    # Save primary workbook
    print(f"\nSaving Excel Workbook -> {PKG_XLSX} ...")
    wb.save(PKG_XLSX)

    # Mirror to Downloads folder
    print(f"Mirroring Excel Workbook -> {DOWNLOADS_XLSX} ...")
    shutil.copyfile(PKG_XLSX, DOWNLOADS_XLSX)

    # Mirror to repo root
    shutil.copyfile(PKG_XLSX, PROD_FULL_XLSX)

    # Copy updated DATA_REQUEST_SPEC.md and surveillance_schema.sql into PKG_DIR
    shutil.copyfile("DATA_REQUEST_SPEC.md", os.path.join(PKG_DIR, "DATA_REQUEST_SPEC.md"))
    shutil.copyfile("backend/db/schema.sql", os.path.join(PKG_DIR, "surveillance_schema.sql"))

    # Build updated zip package
    print(f"Packaging complete delivery bundle -> {ZIP_PATH} ...")
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(os.path.join(PKG_DIR, "DATA_REQUEST_SPEC.md"), arcname="DATA_REQUEST_SPEC.md")
        z.write(os.path.join(PKG_DIR, "surveillance_schema.sql"), arcname="surveillance_schema.sql")
        z.write(PKG_XLSX, arcname="PVASF_Sample_Data_Package.xlsx")
        for f in sorted(os.listdir(FEEDS_DIR)):
            if f.endswith(".csv"):
                z.write(os.path.join(FEEDS_DIR, f), arcname=f"sample_data_feeds/{f}")

    print("\n[SUCCESS] Clean SQL data workbook generated successfully!")
    conn.close()


if __name__ == "__main__":
    main()
