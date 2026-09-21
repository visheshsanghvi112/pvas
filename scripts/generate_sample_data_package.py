"""
scripts/generate_sample_data_package.py
────────────────────────────────────────────────────────────────────────────
Programmatic Exporter for PVASF Sample Reference Data Package.

Generates:
  1. sample_data_feeds/ directory containing individual CSV files for each of
     the 6 feeds defined in DATA_REQUEST_SPEC.md.
  2. PVASF_Sample_Data_Package.xlsx: An institutional, multi-tab Excel workbook
     with full metadata, styled headers, auto-column widths, and number formatting.

Security & Sanitization:
  - 100% compliant with public compliance guidelines.
  - Zero internal enterprise warehouse table names or physical column leaks.
  - Zero prohibited legacy terminology.
  - Exact column-to-column parity with DATA_REQUEST_SPEC.md.

Usage:
  python3 scripts/generate_sample_data_package.py [--db-path dummy_surveillance.db]
"""

import os
import sys
import re
import sqlite3
import argparse
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Styles for Institutional Excel Workbook
FONT_FAMILY = "Calibri"
FONT_TITLE = Font(name=FONT_FAMILY, size=14, bold=True, color="FFFFFF")
FONT_HEADER = Font(name=FONT_FAMILY, size=10, bold=True, color="FFFFFF")
FONT_SUBHEADER = Font(name=FONT_FAMILY, size=10, bold=True, color="0F172A")
FONT_BODY = Font(name=FONT_FAMILY, size=9.5, color="1E293B")
FONT_MUTED = Font(name=FONT_FAMILY, size=8.5, italic=True, color="64748B")
FONT_BOLD_CELL = Font(name=FONT_FAMILY, size=9.5, bold=True, color="0F172A")

FILL_NAVY = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
FILL_HEADER = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
FILL_ACCENT = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid")
FILL_ZEBRA = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
FILL_WHITE = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

BORDER_THIN = Border(
    left=Side(style="thin", color="E2E8F0"),
    right=Side(style="thin", color="E2E8F0"),
    top=Side(style="thin", color="E2E8F0"),
    bottom=Side(style="thin", color="E2E8F0")
)
BORDER_HEADER = Border(
    left=Side(style="thin", color="475569"),
    right=Side(style="thin", color="475569"),
    top=Side(style="thin", color="475569"),
    bottom=Side(style="medium", color="0F172A")
)

ALIGN_LEFT = Alignment(horizontal="left", vertical="center")
ALIGN_RIGHT = Alignment(horizontal="right", vertical="center")
ALIGN_CENTER = Alignment(horizontal="center", vertical="center")

# Number format strings
FMT_INT = "#,##0"
FMT_DECIMAL_2 = "#,##0.00"
FMT_DECIMAL_6 = "0.000000"
FMT_CURRENCY = "₹#,##0.00"
FMT_PERCENT = "0.00"


def extract_data_feeds(conn: sqlite3.Connection):
    """Queries and extracts the 6 feeds matching DATA_REQUEST_SPEC.md exactly."""

    # Feed 1: Daily Market OHLCV & Price Trends
    query_ohlcv = """
        SELECT 
            m.symbol,
            m.trade_date,
            m.isin,
            m.company_name,
            ROUND(m.open_price, 2) AS open_price,
            ROUND(m.day_high_price, 2) AS day_high_price,
            ROUND(m.day_low_price, 2) AS day_low_price,
            ROUND(m.close_price, 2) AS close_price,
            m.total_traded_quantity,
            ROUND(m.total_traded_value, 2) AS total_traded_value,
            ROUND(MAX(m.upper_circuit_limit, m.day_high_price * 1.02), 2) AS upper_circuit_limit,
            ROUND(MIN(m.lower_circuit_limit, m.day_low_price * 0.98), 2) AS lower_circuit_limit,
            m.delivery_quantity,
            ROUND(b.base_price_180d, 2) AS base_price_180d,
            ROUND(b.baseline_volume_mean, 2) AS baseline_volume_mean,
            ROUND(b.baseline_volume_std, 2) AS baseline_volume_std
        FROM daily_market_eod m
        LEFT JOIN market_baseline_stats b
            ON m.symbol = b.symbol AND m.trade_date = b.trade_date
        WHERE m.trade_date >= '2026-08-01'
        ORDER BY m.symbol, m.trade_date ASC
    """
    df_ohlcv = pd.read_sql_query(query_ohlcv, conn)

    # Feed 2: Participant Trading & Gross LTP Impact
    query_participant = """
        SELECT 
            symbol,
            trade_date,
            client_pan,
            client_legal_name,
            trading_member_id,
            buy_quantity,
            sell_quantity,
            ROUND(buy_turnover_value, 2) AS buy_turnover_value,
            ROUND(sell_turnover_value, 2) AS sell_turnover_value,
            ROUND(gross_positive_ltp_value, 2) AS gross_positive_ltp_value,
            ROUND(gross_negative_ltp_value, 2) AS gross_negative_ltp_value,
            same_broker_wash_quantity,
            client_category
        FROM participant_daily_trades
        WHERE trade_date >= '2026-08-11'
        ORDER BY trade_date DESC, symbol, gross_positive_ltp_value DESC
    """
    df_participant = pd.read_sql_query(query_participant, conn)

    # Feed 3: Bilateral Counterparty Trading & Matched Pairs
    query_counterparty = """
        SELECT 
            symbol,
            trade_date,
            buyer_pan,
            buyer_legal_name,
            seller_pan,
            seller_legal_name,
            buyer_tm_id,
            seller_tm_id,
            matched_quantity,
            ROUND(matched_turnover_value, 2) AS matched_turnover_value,
            ROUND(pairwise_ltp_push_value, 2) AS pairwise_ltp_push_value,
            CASE WHEN is_same_broker_wash = 1 THEN 'TRUE' ELSE 'FALSE' END AS is_same_broker_wash,
            algo_execution_flag
        FROM counterparty_trade_pairs
        WHERE trade_date >= '2026-08-11'
        ORDER BY trade_date DESC, matched_turnover_value DESC
    """
    df_counterparty = pd.read_sql_query(query_counterparty, conn)

    # Feed 4: Shareholding Structure & Demographics
    query_shareholding = """
        SELECT 
            symbol,
            quarter_code,
            filing_date,
            category_type,
            total_shares_count,
            ROUND(holding_percentage, 2) AS holding_percentage,
            ROUND(pledged_shares_percentage, 2) AS pledged_shares_percentage,
            unique_holding_pans,
            avg_daily_trading_pans
        FROM shareholding_summary
        ORDER BY symbol, filing_date DESC, category_type ASC
    """
    df_shareholding = pd.read_sql_query(query_shareholding, conn)

    # Feed 5: Corporate Actions & Material Disclosures
    query_corporate = """
        SELECT 
            symbol,
            isin,
            announcement_date,
            record_date,
            ex_date,
            action_category,
            announcement_purpose,
            ratio_or_value,
            ROUND(dilution_factor, 6) AS dilution_factor
        FROM corporate_events_feed
        ORDER BY announcement_date DESC, symbol ASC
    """
    df_corporate = pd.read_sql_query(query_corporate, conn)

    # Feed 6: Market Trading Calendar
    query_calendar = """
        SELECT 
            calendar_date,
            CASE WHEN is_trading_day = 1 THEN 'TRUE' ELSE 'FALSE' END AS is_trading_day,
            COALESCE(holiday_name, '') AS holiday_name
        FROM trading_session_calendar
        WHERE calendar_date BETWEEN '2026-07-01' AND '2026-09-15'
        ORDER BY calendar_date ASC
    """
    df_calendar = pd.read_sql_query(query_calendar, conn)

    return {
        "01_daily_market_ohlcv": df_ohlcv,
        "02_participant_trading": df_participant,
        "03_counterparty_trade_pairs": df_counterparty,
        "04_shareholding_structure": df_shareholding,
        "05_corporate_actions": df_corporate,
        "06_trading_calendar": df_calendar
    }


def write_csv_feeds(feeds: dict, output_dir: str):
    """Exports each DataFrame as a clean, standardized CSV file."""
    os.makedirs(output_dir, exist_ok=True)
    csv_paths = {}
    for feed_name, df in feeds.items():
        file_path = os.path.join(output_dir, f"{feed_name}.csv")
        df.to_csv(file_path, index=False, encoding="utf-8")
        csv_paths[feed_name] = file_path
        print(f"  [+] CSV: {file_path:<45} ({len(df):>5} rows, {len(df.columns):>2} cols)")
    return csv_paths


def build_excel_package(feeds: dict, excel_path: str):
    """Creates a beautifully formatted, multi-tab Excel package."""
    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    # ── TAB 1: README & SPEC OVERVIEW ─────────────────────────────────────────
    ws_cover = wb.create_sheet(title="Overview & Specifications")
    ws_cover.views.sheetView[0].showGridLines = True

    # Title Banner
    ws_cover.merge_cells("A1:G1")
    title_cell = ws_cover["A1"]
    title_cell.value = "PVASF — Enterprise Surveillance Sample Data Package"
    title_cell.font = FONT_TITLE
    title_cell.fill = FILL_NAVY
    title_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_cover.row_dimensions[1].height = 40

    ws_cover["A2"].value = "Companion sample dataset for DATA_REQUEST_SPEC.md. All tables, columns, and data types match 1-to-1."
    ws_cover["A2"].font = FONT_MUTED
    ws_cover.row_dimensions[2].height = 20

    # Summary Table Headers
    overview_headers = ["Feed #", "Data Category / Domain", "Target File / Tab", "Delivery Frequency", "Historical Horizon", "Columns", "Sample Records"]
    for col_idx, h in enumerate(overview_headers, start=1):
        cell = ws_cover.cell(row=4, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_HEADER
        cell.alignment = ALIGN_CENTER if col_idx in [1, 4, 6, 7] else ALIGN_LEFT
        cell.border = BORDER_HEADER
    ws_cover.row_dimensions[4].height = 26

    feed_meta = [
        ("1", "Daily Market OHLCV & Price Trends", "1_Daily_Market_OHLCV", "Daily (EOD)", "180 Trading Days", 16, len(feeds["01_daily_market_ohlcv"])),
        ("2", "Participant Trading & Gross LTP Impact", "2_Participant_Trading", "Daily (EOD)", "15 Trading Days", 13, len(feeds["02_participant_trading"])),
        ("3", "Bilateral Counterparty Trading & Matched Pairs", "3_Counterparty_Pairs", "Daily (EOD)", "15 Trading Days", 13, len(feeds["03_counterparty_trade_pairs"])),
        ("4", "Shareholding Structure & Demographics", "4_Shareholding_Structure", "Quarterly", "Past 4 Quarters", 9, len(feeds["04_shareholding_structure"])),
        ("5", "Corporate Actions & Material Disclosures", "5_Corporate_Actions", "Daily (EOD)", "Rolling 180 Days", 9, len(feeds["05_corporate_actions"])),
        ("6", "Market Trading Calendar", "6_Trading_Calendar", "Annual / Monthly", "Rolling 3 Years", 3, len(feeds["06_trading_calendar"]))
    ]

    for row_idx, meta in enumerate(feed_meta, start=5):
        fill = FILL_ZEBRA if row_idx % 2 == 0 else FILL_WHITE
        for col_idx, val in enumerate(meta, start=1):
            cell = ws_cover.cell(row=row_idx, column=col_idx, value=val)
            cell.font = FONT_BODY
            cell.fill = fill
            cell.border = BORDER_THIN
            if col_idx in [1, 4]:
                cell.alignment = ALIGN_CENTER
            elif col_idx in [6, 7]:
                cell.alignment = ALIGN_RIGHT
                cell.number_format = FMT_INT
            else:
                cell.alignment = ALIGN_LEFT
        ws_cover.row_dimensions[row_idx].height = 22

    # Notes Section
    note_start_row = 12
    ws_cover.cell(row=note_start_row, column=1, value="Important Notes for Upstream Data Engineering & Handover:").font = FONT_SUBHEADER
    notes = [
        "1. Feed Contract Parity: Column names, data types, and primary keys match DATA_REQUEST_SPEC.md exactly.",
        "2. Consolidated EOD Feeds: Market aggregates represent consolidated volume and 30-min VWAP close across all venues.",
        "3. Calculation Boundaries: All mathematical models (Z-scores, price rise %, circuit hit counters, MTM P&L) are computed in-house by PVASF.",
        "4. Null Values: Zero values or empty strings are represented cleanly without proprietary placeholders.",
        "5. File Encoding: CSV files are UTF-8 encoded with standard comma delimiters and RFC-4180 quote handling."
    ]
    for i, n in enumerate(notes, start=note_start_row + 1):
        ws_cover.cell(row=i, column=1, value=n).font = FONT_MUTED
        ws_cover.row_dimensions[i].height = 18

    # Auto column widths for cover sheet
    for col in ws_cover.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws_cover.column_dimensions[col_letter].width = max(max_len + 3, 12)

    # ── TABS 2–7: INDIVIDUAL DATA FEEDS ───────────────────────────────────────
    sheet_configs = [
        ("1_Daily_Market_OHLCV", feeds["01_daily_market_ohlcv"]),
        ("2_Participant_Trading", feeds["02_participant_trading"]),
        ("3_Counterparty_Pairs", feeds["03_counterparty_trade_pairs"]),
        ("4_Shareholding_Structure", feeds["04_shareholding_structure"]),
        ("5_Corporate_Actions", feeds["05_corporate_actions"]),
        ("6_Trading_Calendar", feeds["06_trading_calendar"])
    ]

    for title, df in sheet_configs:
        ws = wb.create_sheet(title=title)
        ws.views.sheetView[0].showGridLines = True

        # Header Row
        for col_idx, col_name in enumerate(df.columns, start=1):
            cell = ws.cell(row=1, column=col_idx, value=col_name)
            cell.font = FONT_HEADER
            cell.fill = FILL_NAVY
            cell.alignment = ALIGN_CENTER
            cell.border = BORDER_HEADER
        ws.row_dimensions[1].height = 26
        ws.freeze_panes = "A2"

        # Data Rows
        for r_idx, row in enumerate(df.itertuples(index=False), start=2):
            fill = FILL_ZEBRA if r_idx % 2 == 0 else FILL_WHITE
            for c_idx, val in enumerate(row, start=1):
                cell = ws.cell(row=r_idx, column=c_idx, value=val)
                cell.font = FONT_BODY
                cell.fill = fill
                cell.border = BORDER_THIN
                col_name = df.columns[c_idx - 1]

                # Format by column type
                if val is None or pd.isna(val):
                    cell.value = ""
                    cell.alignment = ALIGN_CENTER
                elif "price" in col_name or "limit" in col_name or "ltp" in col_name or "std" in col_name or "mean" in col_name:
                    cell.alignment = ALIGN_RIGHT
                    cell.number_format = FMT_DECIMAL_2
                elif "value" in col_name or "turnover" in col_name:
                    cell.alignment = ALIGN_RIGHT
                    cell.number_format = FMT_CURRENCY
                elif "quantity" in col_name or "count" in col_name or "pans" in col_name or "shares" in col_name:
                    cell.alignment = ALIGN_RIGHT
                    cell.number_format = FMT_INT
                elif "percentage" in col_name:
                    cell.alignment = ALIGN_RIGHT
                    cell.number_format = FMT_PERCENT
                elif "factor" in col_name:
                    cell.alignment = ALIGN_RIGHT
                    cell.number_format = FMT_DECIMAL_6
                elif "date" in col_name or "flag" in col_name or "wash" in col_name or "day" in col_name:
                    cell.alignment = ALIGN_CENTER
                else:
                    cell.alignment = ALIGN_LEFT
            ws.row_dimensions[r_idx].height = 20

        # Auto-adjust column widths
        for col in ws.columns:
            max_len = 0
            for cell in col:
                val_str = str(cell.value or "")
                if len(val_str) > max_len:
                    max_len = len(val_str)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    wb.save(excel_path)
    print(f"  [+] Excel Workbook: {excel_path} ({len(sheet_configs)} data sheets + overview)")


def main():
    parser = argparse.ArgumentParser(description="Export PVASF Sample Reference Data Package")
    parser.add_argument("--db-path", default="dummy_surveillance.db", help="Path to SQLite database")
    parser.add_argument("--output-dir", default="sample_data_feeds", help="Target directory for sample CSVs")
    parser.add_argument("--excel-path", default="PVASF_Sample_Data_Package.xlsx", help="Target Excel package path")
    args = parser.parse_args()

    print(f"=== PVASF Sample Reference Data Package Generator ===")
    print(f"Source DB:   {args.db_path}")
    print(f"CSV Output:  {args.output_dir}/")
    print(f"Excel File:  {args.excel_path}\n")

    if not os.path.exists(args.db_path):
        print(f"[-] Error: Database {args.db_path} not found. Please run seed_dummy_db.py first.")
        sys.exit(1)

    conn = sqlite3.connect(args.db_path)
    try:
        print("[1/3] Extracting feeds aligned to DATA_REQUEST_SPEC.md...")
        feeds = extract_data_feeds(conn)

        print("\n[2/3] Generating individual feed CSV files...")
        write_csv_feeds(feeds, args.output_dir)

        print("\n[3/3] Generating master institutional Excel workbook...")
        build_excel_package(feeds, args.excel_path)

        print("\n=== Package Generation Complete ===")
        print(f"Ready to submit: {args.excel_path} and {args.output_dir}/*")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
