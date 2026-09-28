# Market Data Overview: Part 1 & Part 2

This document provides a simple, factual summary of the historical EOD market data received in [`result_part1.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/result_part1.xlsx) and [`result_part2.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/result_part2.xlsx).

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
