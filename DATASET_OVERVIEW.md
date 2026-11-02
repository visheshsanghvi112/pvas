# Market & Participant Data Overview

This document provides a simple, factual summary of the historical market and participant datasets received in [`result_part1.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/result_part1.xlsx), [`result_part2.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/result_part2.xlsx), and [`client_data.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/client_data.xlsx).

---

## 1. Quick Data Numbers

| Metric | Part 1 (`result_part1.xlsx`) | Part 2 (`result_part2.xlsx`) | Combined (Total Dataset) |
| :--- | :---: | :---: | :---: |
| **File Size** | 19.07 MB | 17.15 MB | **36.22 MB** |
| **Total Rows** | 176,056 rows | 157,918 rows | **333,974 rows (~3.34 Lakhs)** |
| **Start Date** | 11-Feb-2025 | 04-Jul-2025 | **11-Feb-2025** |
| **End Date** | 03-Jul-2025 | 03-Nov-2025 | **03-Nov-2025** |
| **Trading Days** | 96 trading days | 83 trading days | **179 trading days (~180 Days)** |
| **Calendar Span** | 142 days | 123 days | **265 calendar days (~9 months)** |
| **Total Companies** | 2,010 scrips | 2,155 scrips | **2,191 unique scrips** |
| **Scrips with Full Days** | 1,589 scrips (96d) | 1,544 scrips (83d) | **1,515 scrips (all 179 days)** |
| **Missing Values (Nulls)** | **0 Nulls** | **0 Nulls** | **100% Complete** |

---

## 2. Why Are There Two Parts?

The surveillance query requested **180 trading days** of data across all active stocks. 

- **Full Size**: ~2,000 stocks × ~180 trading days = **~3.34 lakh rows**.
- **Split**: To prevent Excel or Java export memory crashes, the query exporter partitioned the output into two halves:
  - **Part 1**: First half (11-Feb-2025 to 03-Jul-2025 = 96 trading days).
  - **Part 2**: Second half (04-Jul-2025 to 03-Nov-2025 = 83 trading days).
- **Continuity**: There are **zero missing days** between Part 1 (ends Thursday, July 3) and Part 2 (starts Friday, July 4).

---

## 3. Company (Scrip) Breakdown

Across the entire 9-month period, **2,191 unique companies** appear in the data:

```
Total Unique Companies: 2,191
  ├── Traded in Both Parts: 1,974 companies (Core active market: Reliance, TCS, Infy, etc.)
  ├── Only in Part 2:         181 companies (New IPO listings between July and November 2025)
  └── Only in Part 1:          36 companies (Delisted, merged, or suspended before July 2025)
```

### Why Do Only 1,515 Scrips Have All 179 Days?
- **1,515 companies** traded every single working day without missing a single session.
- **676 companies** traded on fewer days due to:
  1. **New IPOs**: Companies listed midway through the year only have 30–60 trading days of history.
  2. **Penny / Illiquid Stocks**: Stocks where no trades occurred on certain slow days.
  3. **Exchange Suspensions**: Periodic trading halts placed on specific stocks under regulatory surveillance.

---

## 4. Fields in Both Excel Files

Both files contain the exact same **15 columns**, matching [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md#L6-L20) 100%:

| # | Column Name | Format | Description |
| :-: | :--- | :--- | :--- |
| 1 | `SCRIP_SYMBOL` | Text | Exchange ticker (e.g. `RELIANCE`, `M&M`, `20MICRONS`) |
| 2 | `TRADE_DATE` | Datetime | Trade date (`YYYY-MM-DD`) |
| 3 | `ISIN` | Text | Unique security identification number (e.g. `INE002A01018`) |
| 4 | `COMPANY_LEGAL_NAME`| Text | Official corporate name |
| 5 | `DAY_OPEN_PRICE` | Decimal | Opening traded price |
| 6 | `DAY_HIGH_PRICE` | Decimal | Highest price during the session |
| 7 | `DAY_LOW_PRICE` | Decimal | Lowest price during the session |
| 8 | `CLOSE_PRICE` | Decimal | Official closing price (30-min VWAP) |
| 9 | `PREVIOUS_CLOSE_PRICE`| Decimal | Close price of previous trading day |
| 10 | `TOTAL_TRADED_QUANTITY`| Integer | Total shares traded on that day |
| 11 | `TOTAL_TRADED_TURNOVER`| Decimal | Total traded turnover value (Rupees) |
| 12 | `UPPER_CIRCUIT_LIMIT` | Decimal | Upper price band ceiling for the day |
| 13 | `LOWER_CIRCUIT_LIMIT` | Decimal | Lower price band floor for the day |
| 14 | `WEEK_52_HIGH_PRICE` | Decimal | 52-week rolling high price |
| 15 | `WEEK_52_LOW_PRICE` | Decimal | 52-week rolling low price |

---

## 5. How to Verify Manually in Terminal

Run this single command in terminal to verify these exact numbers anytime:

```bash
python3 -c "
import pandas as pd
df1 = pd.read_excel('result_part1.xlsx', usecols=['SCRIP_SYMBOL', 'TRADE_DATE'])
df2 = pd.read_excel('result_part2.xlsx', usecols=['SCRIP_SYMBOL', 'TRADE_DATE'])
df = pd.concat([df1, df2], ignore_index=True)

print(f'Total Combined Rows:      {len(df):,}')
print(f'Total Unique Scrips:     {df[\"SCRIP_SYMBOL\"].nunique():,}')
print(f'Total Trading Days:      {df[\"TRADE_DATE\"].nunique():,}')
print(f'Date Range:              {df[\"TRADE_DATE\"].min().strftime(\"%Y-%m-%d\")} to {df[\"TRADE_DATE\"].max().strftime(\"%Y-%m-%d\")}')
counts = df['SCRIP_SYMBOL'].value_counts()
print(f'Scrips with all 179 days:{ (counts == 179).sum():,}')
"
```

---

## 6. Participant Trade Data (`client_data.xlsx`)

In addition to market EOD prices, [`client_data.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/client_data.xlsx) provides the **participant-level trade execution records** for shortlisted surveillance targets.

### Quick Numbers

| Metric | Measured Value |
| :--- | :--- |
| **File Size** | **4.28 MB** |
| **Total Rows** | **58,898 execution records** |
| **Target Scrips** | **3 Scrips** (`TDPOWERSYS`, `SKMEGGPROD`, `GUJRAFFIA`) |
| **Unique Client PANs** | **58,896 unique entities** (100% valid Indian PAN format) |
| **Trading Members (Brokers)** | **453 brokerage firms** |
| **Date Range** | **14-Oct-2025 to 03-Nov-2025** (Active 15D analysis window) |
| **Total Turnover** | **₹2,772.18 Crore** (Buy: ₹1,342.13 Cr \| Sell: ₹1,430.06 Cr) |
| **Module Alignment** | **Module 3** (`participant_daily_trades`) & **Module 1** (`client_identity_master`) |

### Scrip Breakdown & Trading Session Status

| Symbol | Rows | Trading Sessions | Date Span | Turnover | Trading Status Context |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`TDPOWERSYS`** | 55,893 | 14 days | 14-Oct to 03-Nov-2025 | ₹2,742.04 Cr | 14 of 15 trading days in window (query started 14-Oct; captures 93.4% of total market volume) |
| **`SKMEGGPROD`** | 1,770 | 1 day | 03-Nov-2025 | ₹26.43 Cr | 100% complete; stock was dormant for 4.5 months and only traded on 03-Nov |
| **`GUJRAFFIA`** | 1,235 | 6 days | 14-Oct to 21-Oct-2025 | ₹3.71 Cr | 100% complete; exchange halted/suspended trading after 21-Oct (+109% surge) |

### Fields in `client_data.xlsx` (14 Columns)

| # | Column Name | Format | Target Database Field | Surveillance Role |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `symbol` | Text | `participant_daily_trades.symbol` | Security ticker |
| 2 | `trade_date` | Datetime | `participant_daily_trades.trade_date` | Session date |
| 3 | `client_pan` | Text | `participant_daily_trades.client_pan` | Client PAN |
| 4 | `client_legal_name` | Text | `participant_daily_trades.client_legal_name` | Registered legal entity name |
| 5 | `trading_member_id` | Integer | `participant_daily_trades.trading_member_id` | Clearing broker ID |
| 6 | `client_category` | Integer | `participant_daily_trades.client_category` | Entity category (Retail, Corporate, FPI) |
| 7 | `BUY_QUANTITY` | Integer | `participant_daily_trades.buy_quantity` | Total buy volume |
| 8 | `SELL_QUANTITY` | Integer | `participant_daily_trades.sell_quantity` | Total sell volume |
| 9 | `BUY_TURNOVER_VALUE` | Decimal | `participant_daily_trades.buy_turnover_value` | Buy turnover value (INR) |
| 10 | `SELL_TURNOVER_VALUE` | Decimal | `participant_daily_trades.sell_turnover_value` | Sell turnover value (INR) |
| 11 | `AGGRESSOR_BUY_QUANTITY` | Integer | `participant_daily_trades.aggressor_buy_quantity` | Aggressive buy orders lifting ask |
| 12 | `AGGRESSOR_SELL_QUANTITY` | Integer | `participant_daily_trades.aggressor_sell_quantity` | Aggressive sell orders hitting bid |
| 13 | `GROSS_POSITIVE_LTP_VALUE` | Decimal | `participant_daily_trades.gross_positive_ltp_value` | **Price Pusher Metric (+₹)** |
| 14 | `GROSS_NEGATIVE_LTP_VALUE` | Decimal | `participant_daily_trades.gross_negative_ltp_value` | **Price Suppressor Metric (-₹)** |

### How to Verify Manually in Terminal

```bash
python3 -c "
import pandas as pd
df = pd.read_excel('client_data.xlsx')
print(f'Total Rows:      {len(df):,}')
print(f'Unique PANs:     {df[\"client_pan\"].nunique():,}')
print(f'Unique Brokers:  {df[\"trading_member_id\"].nunique():,}')
print(f'Date Range:      {df[\"trade_date\"].min().strftime(\"%Y-%m-%d\")} to {df[\"trade_date\"].max().strftime(\"%Y-%m-%d\")}')
print(f'Total Turnover:  ₹{(df[\"BUY_TURNOVER_VALUE\"].sum() + df[\"SELL_TURNOVER_VALUE\"].sum()) / 1e7:,.2f} Cr')
for sym, g in df.groupby('symbol'):
    print(f'  - {sym:<12}: {len(g):>6,} rows | {g[\"trade_date\"].nunique()} days | ₹{(g[\"BUY_TURNOVER_VALUE\"].sum() + g[\"SELL_TURNOVER_VALUE\"].sum()) / 1e7:,.2f} Cr')
"
```

### Ingestion Pipeline Command

To ingest and index `client_data.xlsx` into `backend/db/surveillance.db` (`client_identity_master`, `client_demat_accounts`, `participant_daily_trades`, and `counterparty_trade_pairs`):

```bash
python3 scripts/ingest_client_data.py
```

---

## 7. Counterparty Matched Trades (`PAN_PAIR_*.xlsx`)

The exchange provided bilateral counterparty matched trade logs for the top alert scrips in two dedicated Excel files:

| File Name | Scrip Symbol | Rows | Trading Sessions | Date Span | Total Matched Volume |
| :--- | :--- | :---: | :---: | :---: | :---: |
| [`PAN_PAIR_GUJRAFFIA.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PAN_PAIR_GUJRAFFIA.xlsx) | **`GUJRAFFIA`** | **2,713** | 6 days | 14-Oct to 21-Oct-2025 | 702,408 shares |
| [`PAN_PAIR_SKMEGGPROD.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PAN_PAIR_SKMEGGPROD.xlsx) | **`SKMEGGPROD`** | **3,987** | 1 day | 03-Nov-2025 | 3,061,684 shares |
| **Combined** | **2 Alert Scrips** | **6,700** | **7 days** | **14-Oct to 03-Nov-2025** | **3,764,092 shares** |

### Fields in `PAN_PAIR_*.xlsx` (13 Columns)

| # | Column Name | Format | Target Database Field | Surveillance Role |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `SYMBOL` | Text | `counterparty_trade_pairs.symbol` | Security ticker |
| 2 | `TRADE_DATE` | Datetime | `counterparty_trade_pairs.trade_date` | Trade execution date |
| 3 | `BUYER_PAN` | Text | `counterparty_trade_pairs.buyer_pan` | Buyer 10-char PAN |
| 4 | `BUYER_NAME` | Text | `counterparty_trade_pairs.buyer_client_name` | Buyer legal name (KYC) |
| 5 | `BUYER_BROKER_ID` | Integer | `counterparty_trade_pairs.buyer_tm_id` | Buying broker clearing ID |
| 6 | `SELLER_PAN` | Text | `counterparty_trade_pairs.seller_pan` | Seller 10-char PAN |
| 7 | `SELLER_NAME` | Text | `counterparty_trade_pairs.seller_client_name` | Seller legal name (KYC) |
| 8 | `SELLER_BROKER_ID` | Integer | `counterparty_trade_pairs.seller_tm_id` | Selling broker clearing ID |
| 9 | `MATCHED_QUANTITY` | Integer | `counterparty_trade_pairs.matched_quantity` | **Bilateral Matched Volume** (used for Volume & Ring loops) |
| 10 | `MATCHED_TURNOVER_VALUE` | Decimal | `counterparty_trade_pairs.trade_value` | Gross rupee trade turnover |
| 11 | `LTP_PUSH_VALUE_LOGIC_1` | Decimal | `counterparty_trade_pairs.pairwise_ltp_push_value` | *Stored in DB; Ignored in current engine & UI* |
| 12 | `LTP_PUSH_VALUE_LOGIC_2` | Decimal | `counterparty_trade_pairs.pairwise_ltp_push_value_logic_2` | *Stored in DB; Ignored in current engine & UI* |
| 13 | `REVERSE_MATCHED_QUANTITY`| Integer | `counterparty_trade_pairs.reverse_matched_qty` | **Reversal Volume** (used for Reversal Trade Rate / Wash trading) |

> **Note on LTP Push Columns**: The two delivered LTP push columns (`LOGIC_1` and `LOGIC_2`) are safely stored in the database for reference, but are **completely ignored** in current surveillance engine calculations and UI screens to keep the surveillance workflow straightforward and focused on volume, concentration, and reversal rings.

