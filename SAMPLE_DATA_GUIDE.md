# PVASF — Sample Reference Data Package & Handover Guide

## 1. Overview & Purpose

To accompany the **Enterprise Data Request Specification** ([`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md)), this package provides concrete, high-fidelity reference data illustrating the exact format, schema, column naming, and value ranges expected from upstream data providers.

### Available Delivery Artifacts Ready to Submit:
1. **Master Excel Workbook**: [`PVASF_Sample_Data_Package.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_Sample_Data_Package.xlsx)
   - Multi-tab workbook with institutional styling, freeze-panes, column auto-sizing, and formatted numbers/currencies.
   - Ideal for business analysts, database architects, and leadership review.
2. **Individual CSV Feeds**: [`sample_data_feeds/`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/sample_data_feeds/)
   - Standard UTF-8 comma-separated files ready for automated staging pipelines and ETL tests.
3. **Database Schema**: [`surveillance_schema.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/surveillance_schema.sql)
   - ANSI SQL schema defining the database tables matching the 6 feeds.
4. **All-in-One Package**: [`PVASF_Sample_Data_Package.zip`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_Sample_Data_Package.zip)
   - ZIP archive containing the specification, SQL schema, Excel file, and CSV feeds.

---

## 2. Feed-by-Feed Mapping & Content Summary

| # | Spec Domain / Feed | Target DB Table(s) | Target Excel Tab / CSV File | Key Primary Columns | Record Count |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **1** | **Daily Market OHLCV & Price Trends** | `daily_market_eod`<br>`market_baseline_stats` | `1_Daily_Market_OHLCV`<br>`01_daily_market_ohlcv.csv` | `symbol`, `trade_date`, `isin`, `company_name`, `open_price`, `day_high_price`, `day_low_price`, `close_price`, `total_traded_quantity`, `total_traded_value`, `upper_circuit_limit`, `lower_circuit_limit`, `delivery_quantity`, `base_price_180d`, `baseline_volume_mean`, `baseline_volume_std` | 285 rows |
| **2** | **Participant Trading & Gross LTP Impact** | `participant_daily_trades` | `2_Participant_Trading`<br>`02_participant_trading.csv` | `symbol`, `trade_date`, `client_pan`, `client_legal_name`, `trading_member_id`, `buy_quantity`, `sell_quantity`, `buy_turnover_value`, `sell_turnover_value`, `gross_positive_ltp_value`, `gross_negative_ltp_value`, `same_broker_wash_quantity`, `client_category` | 2,513 rows |
| **3** | **Bilateral Counterparty Trading & Matched Pairs** | `counterparty_trade_pairs` | `3_Counterparty_Pairs`<br>`03_counterparty_trade_pairs.csv` | `symbol`, `trade_date`, `buyer_pan`, `buyer_legal_name`, `seller_pan`, `seller_legal_name`, `buyer_tm_id`, `seller_tm_id`, `matched_quantity`, `matched_turnover_value`, `pairwise_ltp_push_value`, `is_same_broker_wash`, `algo_execution_flag` | 689 rows |
| **4** | **Shareholding Structure & Demographics** | `shareholding_summary`<br>`large_shareholders_registry` | `4_Shareholding_Structure`<br>`04_shareholding_structure.csv` | `symbol`, `quarter_code`, `filing_date`, `category_type`, `total_shares_count`, `holding_percentage`, `pledged_shares_percentage`, `unique_holding_pans`, `avg_daily_trading_pans` | 180 rows |
| **5** | **Corporate Actions & Material Disclosures** | `corporate_events_feed`<br>`price_dilution_factors` | `5_Corporate_Actions`<br>`05_corporate_actions.csv` | `symbol`, `isin`, `announcement_date`, `record_date`, `ex_date`, `action_category`, `announcement_purpose`, `ratio_or_value`, `dilution_factor` | 32 rows |
| **6** | **Market Trading Calendar** | `trading_session_calendar`<br>`broker_daily_summary` | `6_Trading_Calendar`<br>`06_trading_calendar.csv` | `calendar_date`, `is_trading_day`, `holiday_name` | 58 rows |

---

## 3. Sample Data Previews (Quick Copy-Paste)

### Feed 1: Daily Market OHLCV (`01_daily_market_ohlcv.csv`)
```csv
symbol,trade_date,isin,company_name,open_price,day_high_price,day_low_price,close_price,total_traded_quantity,total_traded_value,upper_circuit_limit,lower_circuit_limit,delivery_quantity,base_price_180d,baseline_volume_mean,baseline_volume_std
NOVAENERGY,2026-08-25,INE002B01020,Nova Energy Ltd,1894.22,1904.75,1885.67,1895.34,1714200,3248987828.0,1992.57,1802.8,702822,540.0,259427.77,412920.42
NOVAENERGY,2026-08-26,INE002B01020,Nova Energy Ltd,1892.45,1994.47,1875.2,1986.35,1685400,3347794290.0,1990.11,1800.57,758430,540.0,269192.85,429468.61
NOVAENERGY,2026-08-27,INE002B01020,Nova Energy Ltd,1984.36,2096.34,1968.48,2080.52,1920100,3994806452.0,2085.67,1887.03,883246,540.0,277705.51,442479.89
```

### Feed 2: Participant Trading (`02_participant_trading.csv`)
```csv
symbol,trade_date,client_pan,client_legal_name,trading_member_id,buy_quantity,sell_quantity,buy_turnover_value,sell_turnover_value,gross_positive_ltp_value,gross_negative_ltp_value,same_broker_wash_quantity,client_category
NOVAENERGY,2026-08-27,HWFTM1488X,Rahul Gupta,BRK0001,85000,12000,176844200.0,24966240.0,14147536.0,249662.4,9000,INDIVIDUAL
NOVAENERGY,2026-08-27,CVXUL2488S,Sunita Trivedi,BRK0002,78000,8000,162280560.0,16644160.0,12982444.8,166441.6,6000,INDIVIDUAL
NOVAENERGY,2026-08-27,XWRUW6552F,Jayant Joshi,BRK0003,65000,5000,135233800.0,10402600.0,10818704.0,104026.0,3750,INDIVIDUAL
```

### Feed 3: Bilateral Counterparty Pairs (`03_counterparty_trade_pairs.csv`)
```csv
symbol,trade_date,buyer_pan,buyer_legal_name,seller_pan,seller_legal_name,buyer_tm_id,seller_tm_id,matched_quantity,matched_turnover_value,pairwise_ltp_push_value,is_same_broker_wash,algo_execution_flag
NOVAENERGY,2026-08-27,HWFTM1488X,Rahul Gupta,CVXUL2488S,Sunita Trivedi,BRK0001,BRK0002,520000,1081870400.0,64912224.0,FALSE,1
NOVAENERGY,2026-08-27,CVXUL2488S,Sunita Trivedi,XWRUW6552F,Jayant Joshi,BRK0002,BRK0003,510000,1061065200.0,63663912.0,FALSE,1
NOVAENERGY,2026-08-27,XWRUW6552F,Jayant Joshi,HWFTM1488X,Rahul Gupta,BRK0003,BRK0001,495000,1029857400.0,61791444.0,FALSE,1
```

### Feed 4: Shareholding Structure (`04_shareholding_structure.csv`)
```csv
symbol,quarter_code,filing_date,category_type,total_shares_count,holding_percentage,pledged_shares_percentage,unique_holding_pans,avg_daily_trading_pans
NOVAENERGY,Q226,2026-06-30,GENERAL_PUBLIC_FLOAT,23000000,23.0,0.0,42000,850
NOVAENERGY,Q226,2026-06-30,PROMOTER_GROUP,54200000,54.2,12.5,4,1
NOVAENERGY,Q226,2026-06-30,TOP_1_PCT_PUBLIC,22800000,22.8,0.0,18,12
```

### Feed 5: Corporate Actions (`05_corporate_actions.csv`)
```csv
symbol,isin,announcement_date,record_date,ex_date,action_category,announcement_purpose,ratio_or_value,dilution_factor
NOVAENERGY,INE002B01020,2026-07-15,,,BOARD_MEETING,NOVAENERGY Board Meeting to consider Financial Results,,1.000000
NOVAENERGY,INE002B01020,2026-05-10,2026-05-26,2026-05-24,DIVIDEND,NOVAENERGY Interim Dividend announcement of INR 4.50 per share,INR 4.50/sh,1.000000
NOVAENERGY,INE002B01020,2026-02-15,2026-03-03,2026-03-01,BONUS,NOVAENERGY 1:1 Bonus Issue of Equity Shares,1:1,0.500000
```

### Feed 6: Market Trading Calendar (`06_trading_calendar.csv`)
```csv
calendar_date,is_trading_day,holiday_name
2026-08-14,TRUE,Regular Trading Session
2026-08-15,FALSE,Exchange Holiday
2026-08-16,FALSE,Weekend
2026-08-17,TRUE,Regular Trading Session
```

---

## 4. Ready-to-Send Email / Message Template

You can copy and send this message directly to the upstream data team:

```text
Subject: Sample Data Package & Schema for PVASF Feeds

Hi Team,

Following up on the Data Request Specification (DATA_REQUEST_SPEC.md), we have prepared sample data and a database schema for all 6 feeds.

Attached to this email:
1. PVASF_Sample_Data_Package.xlsx: Excel workbook with all 6 data feeds.
2. surveillance_schema.sql: SQL schema defining the tables and sample queries.
3. sample_data_feeds/ (or PVASF_Sample_Data_Package.zip): CSV files for each feed.

Key Notes:
- All column names and types match the specification document.
- Volumes and close prices represent pre-consolidated market aggregates.
- Surveillance metrics (such as Z-scores) are computed by our engine.
- The SQL schema uses standard ANSI SQL types (VARCHAR, DECIMAL, BIGINT, DATE).

Please review and let us know if you have any questions.

Best regards,
Vishesh
```

