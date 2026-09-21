# PVASF — Enterprise Data Request Specification

## 1. Purpose & Delivery Guidelines

The Price-Volume Alert Surveillance Framework (PVASF) monitors price-volume anomalies, concentrated participant trading, and bilateral trade networks using End-of-Day (EOD) aggregate data. Feeds require official market values (30-minute Volume-Weighted Average Price close) across a rolling 180-trading-day baseline (~6 months, with 260 days optional for annual trends) and a 15-trading-day active analysis window. Daily batches must be delivered by 18:30 Indian Standard Time (IST).

---

## Master Summary of Required Data Feeds

The surveillance framework operates across six functional data categories:

| # | Data Category / Domain | Delivery Frequency | Historical Horizon |
| :---: | :--- | :---: | :---: |
| 1 | **Daily Market OHLCV & Price Trends** | Daily (EOD) | 180 Trading Days |
| 2 | **Participant Trading & Gross LTP Impact** | Daily (EOD) | 15 Trading Days |
| 3 | **Bilateral Counterparty Trading & Matched Pairs** | Daily (EOD) | 15 Trading Days |
| 4 | **Shareholding Structure & Demographics** | Quarterly | Past 4 Quarters |
| 5 | **Corporate Actions & Material Disclosures** | Daily (EOD) | Rolling 180 Days |
| 6 | **Market Trading Calendar** | Annual / Monthly | Rolling 3 Years |

---

## 1. Daily Market OHLCV & Price Trends

| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `symbol` | VARCHAR(20) | **Yes** | Composite Key; 1–20 uppercase alphanumeric | `'NOVAENERGY'` |
| `trade_date` | DATE | **Yes** | Composite Key; ISO-8601 (`YYYY-MM-DD`) | `'2026-08-27'` |
| `isin` | CHAR(12) | **Yes** | Exact 12 alphanumeric characters | `'INE752716A01'` |
| `company_name` | VARCHAR(200) | **Yes** | Non-empty string | `'Nova Energy & Power Ltd'` |
| `open_price` | DECIMAL(15,2) | **Yes** | `> 0.00` | `260.50` |
| `day_high_price` | DECIMAL(15,2) | **Yes** | `>= open, close, low` | `278.40` |
| `day_low_price` | DECIMAL(15,2) | **Yes** | `<= open, close, high; > 0` | `258.00` |
| `close_price` | DECIMAL(15,2) | **Yes** | `> 0.00` | `276.85` |
| `total_traded_quantity` | BIGINT | **Yes** | `>= 0` | `1850000` |
| `total_traded_value` | DECIMAL(20,2) | **Yes** | `>= 0.00` | `505000000.00` |
| `upper_circuit_limit` | DECIMAL(15,2) | **Yes** | `> close_price` | `282.50` |
| `lower_circuit_limit` | DECIMAL(15,2) | **Yes** | `< close_price; > 0` | `235.50` |
| `delivery_quantity` | BIGINT | **Yes** | `0 <= delivery <= total` | `925000` |
| `base_price_180d` | DECIMAL(15,2) | Optional | `> 0.00` if provided | `112.50` |
| `baseline_volume_mean` | DECIMAL(15,2) | Optional | `>= 0.00` if provided | `420000.00` |
| `baseline_volume_std` | DECIMAL(15,2) | Optional | `>= 0.00` if provided | `115000.00` |

---

## 2. Participant Trading & Gross Last Traded Price (LTP) Impact

| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `symbol` | VARCHAR(20) | **Yes** | Composite Key; 1–20 uppercase alphanumeric | `'NOVAENERGY'` |
| `trade_date` | DATE | **Yes** | Composite Key; ISO-8601 (`YYYY-MM-DD`) | `'2026-08-27'` |
| `client_pan` | VARCHAR(10) | **Yes** | Composite Key; `[A-Z]{5}[0-9]{4}[A-Z]{1}` | `'HWFTM1488X'` |
| `client_legal_name` | VARCHAR(250) | **Yes** | Non-empty string | `'Rahul Gupta'` |
| `trading_member_id` | VARCHAR(20) | **Yes** | Alphanumeric identifier | `'TM101'` |
| `buy_quantity` | BIGINT | **Yes** | `>= 0` | `85000` |
| `sell_quantity` | BIGINT | **Yes** | `>= 0` | `12000` |
| `buy_turnover_value` | DECIMAL(20,2) | **Yes** | `>= 0.00` | `23532250.00` |
| `sell_turnover_value` | DECIMAL(20,2) | **Yes** | `>= 0.00` | `3322200.00` |
| `gross_positive_ltp_value` | DECIMAL(20,2) | **Yes** | `>= 0.00` | `4808097.78` |
| `gross_negative_ltp_value` | DECIMAL(20,2) | **Yes** | `>= 0.00` | `120500.00` |
| `same_broker_wash_quantity` | BIGINT | **Yes** | `>= 0` | `0` |
| `client_category` | VARCHAR(30) | Optional | `'INDIVIDUAL'`, `'CORPORATE'`, `'PROMOTER'`, `'HNI'`, `'FPI'` | `'INDIVIDUAL'` |

---

## 3. Bilateral Counterparty Trading & Matched Pairs

| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `symbol` | VARCHAR(20) | **Yes** | Composite Key; 1–20 uppercase alphanumeric | `'NOVAENERGY'` |
| `trade_date` | DATE | **Yes** | Composite Key; ISO-8601 (`YYYY-MM-DD`) | `'2026-08-27'` |
| `buyer_pan` | VARCHAR(10) | **Yes** | Composite Key; `[A-Z]{5}[0-9]{4}[A-Z]{1}` | `'CVXUL2488S'` |
| `buyer_legal_name` | VARCHAR(250) | **Yes** | Non-empty string | `'Pooja Sharma'` |
| `seller_pan` | VARCHAR(10) | **Yes** | Composite Key; `[A-Z]{5}[0-9]{4}[A-Z]{1}` | `'HWFTM1488X'` |
| `seller_legal_name` | VARCHAR(250) | **Yes** | Non-empty string | `'Rahul Gupta'` |
| `buyer_tm_id` | VARCHAR(20) | **Yes** | Alphanumeric identifier | `'TM101'` |
| `seller_tm_id` | VARCHAR(20) | **Yes** | Alphanumeric identifier | `'TM101'` |
| `matched_quantity` | BIGINT | **Yes** | `> 0` | `520000` |
| `matched_turnover_value` | DECIMAL(20,2) | **Yes** | `> 0.00` | `143962000.00` |
| `pairwise_ltp_push_value` | DECIMAL(15,2) | Optional | Decimal value | `2.80` |
| `is_same_broker_wash` | BOOLEAN | **Yes** | `True` or `False` | `True` |
| `algo_execution_flag` | INTEGER | Optional | `0` or `1` | `0` |

---

## 4. Shareholding Structure & Demographics

| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `symbol` | VARCHAR(20) | **Yes** | Composite Key; 1–20 uppercase alphanumeric | `'NOVAENERGY'` |
| `quarter_code` | VARCHAR(10) | **Yes** | Composite Key; e.g. `'Q127'`, `'Q426'` | `'Q127'` |
| `filing_date` | DATE | **Yes** | ISO-8601 (`YYYY-MM-DD`) | `'2026-06-30'` |
| `category_type` | VARCHAR(40) | **Yes** | Composite Key; `'PROMOTER_GROUP'`, `'TOP_1_PCT_PUBLIC'`, `'GENERAL_PUBLIC_FLOAT'` | `'PROMOTER_GROUP'` |
| `total_shares_count` | BIGINT | **Yes** | `>= 0` | `58450000` |
| `holding_percentage` | DECIMAL(5,2) | **Yes** | `0.00` to `100.00` | `58.45` |
| `pledged_shares_percentage` | DECIMAL(5,2) | Optional | `0.00` to `100.00` | `12.50` |
| `unique_holding_pans` | INTEGER | **Yes** | `>= 0` | `14250` |
| `avg_daily_trading_pans` | INTEGER | **Yes** | `>= 0` | `24` |

---

## 5. Corporate Actions & Material Disclosures

| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `symbol` | VARCHAR(20) | **Yes** | Composite Key; 1–20 uppercase alphanumeric | `'NOVAENERGY'` |
| `isin` | CHAR(12) | **Yes** | Exact 12 alphanumeric characters | `'INE752716A01'` |
| `announcement_date` | DATE | **Yes** | Composite Key; ISO-8601 (`YYYY-MM-DD`) | `'2026-08-20'` |
| `record_date` | DATE | **Yes** | ISO-8601 (`YYYY-MM-DD`) | `'2026-08-26'` |
| `ex_date` | DATE | **Yes** | ISO-8601 (`YYYY-MM-DD`) | `'2026-08-25'` |
| `action_category` | VARCHAR(40) | **Yes** | Composite Key; `'BONUS'`, `'SPLIT'`, `'DIVIDEND'`, `'RIGHTS'`, `'BOARD_MEETING'` | `'BONUS'` |
| `announcement_purpose` | VARCHAR(500) | **Yes** | Non-empty string | `'Board approves 1:1 Bonus Issue'` |
| `ratio_or_value` | VARCHAR(50) | Optional | Text description or ratio | `'1:1'` |
| `dilution_factor` | DECIMAL(8,6) | **Yes** | `> 0.000000` | `0.500000` |

---

## 6. Market Trading Calendar

| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `calendar_date` | DATE | **Yes** | Primary Key; ISO-8601 (`YYYY-MM-DD`) | `'2026-08-27'` |
| `is_trading_day` | BOOLEAN | **Yes** | `True` or `False` | `True` |
| `holiday_name` | VARCHAR(100) | Optional | Non-empty if holiday | `'Diwali - Laxmi Pujan'` |

