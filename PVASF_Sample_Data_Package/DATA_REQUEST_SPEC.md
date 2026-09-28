# PVASF — Enterprise Data Request Specification
## Price-Volume Alert Surveillance Framework

### 1. Purpose & Delivery Guidelines
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
| `company_name` | VARCHAR(200) | **Yes** | Non-empty corporate name string | `'Nova Energy Ltd'` |
| `open_price` | DECIMAL(15,2) | **Yes** | `> 0.00` | `264.91` |
| `day_high_price` | DECIMAL(15,2) | **Yes** | `>= open, close, low` | `274.86` |
| `day_low_price` | DECIMAL(15,2) | **Yes** | `<= open, close, high; > 0` | `263.59` |
| `close_price` | DECIMAL(15,2) | **Yes** | `> 0.00` | `274.74` |
| `total_traded_quantity` | BIGINT | **Yes** | `>= 0` | `1971401` |
| `total_traded_value` | DECIMAL(20,2) | **Yes** | `>= 0.00` | `541622710.74` |
| `upper_circuit_limit` | DECIMAL(15,2) | **Yes** | `> close_price` | `274.86` |
| `lower_circuit_limit` | DECIMAL(15,2) | **Yes** | `< close_price; > 0` | `248.68` |
| `delivery_quantity` | BIGINT | **Yes** | `0 <= delivery <= total` | `1084270` |
| `prev_close_price` | DECIMAL(15,2) | **Yes** | `> 0.00` | `261.77` |
| `week_52_high_price` | DECIMAL(15,2) | Optional | `> 0.00` | `274.74` |
| `week_52_low_price` | DECIMAL(15,2) | Optional | `> 0.00` | `137.00` |
| `base_price_180d` | DECIMAL(15,2) | Optional | `> 0.00` if provided | `140.53` |
| `baseline_volume_mean` | DECIMAL(18,2) | Optional | `>= 0.00` if provided | `288547.36` |
| `baseline_volume_std` | DECIMAL(18,2) | Optional | `>= 0.00` if provided | `459243.93` |

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
| `buy_turnover_value` | DECIMAL(20,2) | **Yes** | `>= 0.00` | `23352900.00` |
| `sell_turnover_value` | DECIMAL(20,2) | **Yes** | `>= 0.00` | `3296880.00` |
| `gross_positive_ltp_value` | DECIMAL(20,2) | **Yes** | `>= 0.00` | `4808097.78` |
| `gross_negative_ltp_value` | DECIMAL(20,2) | **Yes** | `>= 0.00` | `120500.00` |
| `same_broker_wash_quantity` | BIGINT | **Yes** | `>= 0` | `0` |
| `buy_trade_count` | BIGINT | Optional | `>= 0` | `142` |
| `sell_trade_count` | BIGINT | Optional | `>= 0` | `28` |
| `aggressor_buy_quantity` | BIGINT | Optional | `>= 0` | `75000` |
| `client_category` | VARCHAR(30) | Optional | `'INDIVIDUAL'`, `'CORPORATE'`, `'PROMOTER'`, `'HNI'`, `'FPI'` | `'INDIVIDUAL'` |

---

## 3. Bilateral Counterparty Trading & Matched Pairs

| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `symbol` | VARCHAR(20) | **Yes** | Composite Key; 1–20 uppercase alphanumeric | `'NOVAENERGY'` |
| `trade_date` | DATE | **Yes** | Composite Key; ISO-8601 (`YYYY-MM-DD`) | `'2026-08-27'` |
| `buyer_pan` | VARCHAR(10) | **Yes** | Composite Key; `[A-Z]{5}[0-9]{4}[A-Z]{1}` | `'CVXUL2488S'` |
| `buyer_legal_name` | VARCHAR(250) | **Yes** | Non-empty string | `'Lokesh Joshi'` |
| `seller_pan` | VARCHAR(10) | **Yes** | Composite Key; `[A-Z]{5}[0-9]{4}[A-Z]{1}` | `'HWFTM1488X'` |
| `seller_legal_name` | VARCHAR(250) | **Yes** | Non-empty string | `'Rahul Gupta'` |
| `buyer_tm_id` | VARCHAR(20) | **Yes** | Alphanumeric identifier | `'TM101'` |
| `seller_tm_id` | VARCHAR(20) | **Yes** | Alphanumeric identifier | `'TM101'` |
| `matched_quantity` | BIGINT | **Yes** | `> 0` | `67617` |
| `matched_turnover_value` | DECIMAL(20,2) | **Yes** | `> 0.00` | `18577094.58` |
| `pairwise_ltp_push_value` | DECIMAL(15,2) | Optional | Decimal value | `0.32` |
| `reverse_matched_quantity` | BIGINT | Optional | `>= 0` | `64236` |
| `is_same_broker_wash` | BOOLEAN | **Yes** | `True` or `False` | `True` |
| `algo_execution_flag` | SMALLINT | Optional | `0`=Manual, `1`=Algo/HFT, `2`=DMA | `0` |

---

## 4. Shareholding Structure & Demographics

### 4.1 Capital Float & Demographic Summary
| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `symbol` | VARCHAR(20) | **Yes** | Composite Key; 1–20 uppercase alphanumeric | `'NOVAENERGY'` |
| `quarter_code` | VARCHAR(10) | **Yes** | Composite Key; e.g. `'Q127'`, `'Q426'` | `'Q127'` |
| `filing_date` | DATE | **Yes** | ISO-8601 (`YYYY-MM-DD`) | `'2026-06-30'` |
| `category_type` | VARCHAR(40) | **Yes** | Composite Key; `'PROMOTER_GROUP'`, `'TOP_1_PCT_PUBLIC'`, `'GENERAL_PUBLIC_FLOAT'` | `'PROMOTER_GROUP'` |
| `total_shares_count` | BIGINT | **Yes** | `>= 0` | `58450000` |
| `holding_percentage` | DECIMAL(6,2) | **Yes** | `0.00` to `100.00` | `58.45` |
| `pledged_shares_percentage` | DECIMAL(6,2) | Optional | `0.00` to `100.00` | `12.50` |
| `locked_in_shares_percentage` | DECIMAL(6,2) | Optional | `0.00` to `100.00` | `0.00` |
| `unique_holding_pans` | INTEGER | **Yes** | `>= 0` | `14` |
| `avg_daily_trading_pans` | INTEGER | **Yes** | `>= 0` | `24` |

### 4.2 Significant Shareholders Register (Holdings ≥ 1.00%)
| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `symbol` | VARCHAR(20) | **Yes** | Composite Natural Key | `'NOVAENERGY'` |
| `quarter_code` | VARCHAR(10) | **Yes** | Composite Natural Key | `'Q127'` |
| `holder_pan` | VARCHAR(10) | **Yes** | `[A-Z]{5}[0-9]{4}[A-Z]{1}` | `'AAACP9876K'` |
| `holder_legal_name` | VARCHAR(250) | **Yes** | Non-empty string | `'Nova Energy Promoter Trust'` |
| `holder_category` | VARCHAR(30) | **Yes** | `'PROMOTER'`, `'INSTITUTIONAL_DII'`, `'INSTITUTIONAL_FPI'`, `'PUBLIC_INDIVIDUAL'` | `'PROMOTER'` |
| `shares_held` | BIGINT | **Yes** | `> 0` | `42000000` |
| `holding_percentage` | DECIMAL(6,2) | **Yes** | `> 0.00` | `42.00` |
| `pledged_shares_count` | BIGINT | Optional | `>= 0` | `5250000` |

---

## 5. Corporate Actions & Material Disclosures

| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `symbol` | VARCHAR(20) | **Yes** | Composite Key; 1–20 uppercase alphanumeric | `'NOVAENERGY'` |
| `isin` | CHAR(12) | **Yes** | Exact 12 alphanumeric characters | `'INE752716A01'` |
| `announcement_date` | DATE | **Yes** | Composite Key; ISO-8601 (`YYYY-MM-DD`) | `'2026-08-20'` |
| `record_date` | DATE | Optional | ISO-8601 (`YYYY-MM-DD`) | `'2026-08-26'` |
| `ex_date` | DATE | Optional | ISO-8601 (`YYYY-MM-DD`) | `'2026-08-25'` |
| `action_category` | VARCHAR(40) | **Yes** | Composite Key; `'BONUS'`, `'SPLIT'`, `'DIVIDEND'`, `'RIGHTS'`, `'BOARD_MEETING'`, `'AGM'` | `'BONUS'` |
| `announcement_purpose` | VARCHAR(500) | **Yes** | Non-empty string | `'Board approves 1:1 Bonus Issue of Equity Shares'` |
| `ratio_or_value` | VARCHAR(50) | Optional | Text description or ratio | `'1:1'` |
| `dilution_factor` | DECIMAL(8,6) | **Yes** | `> 0.000000` | `0.500000` |

---

## 6. Market Trading Calendar

| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `calendar_date` | DATE | **Yes** | Primary Key; ISO-8601 (`YYYY-MM-DD`) | `'2026-08-27'` |
| `is_trading_day` | BOOLEAN | **Yes** | `True` or `False` | `True` |
| `holiday_name` | VARCHAR(100) | Optional | Holiday title string | NULL |
| `is_special_auction` | BOOLEAN | **Yes** | `True` or `False` | `False` |

---

## 7. Optional Supplementary Feed: Client Demat & KYC Registry

### 7.1 Client KYC Master
| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `client_pan` | VARCHAR(10) | **Yes** | Primary Key; `[A-Z]{5}[0-9]{4}[A-Z]{1}` | `'HWFTM1488X'` |
| `client_legal_name` | VARCHAR(250) | **Yes** | Non-empty string | `'Rahul Gupta'` |
| `entity_type` | VARCHAR(30) | **Yes** | `'INDIVIDUAL'`, `'CORPORATE'`, `'HUF'`, `'PROMOTER'`, `'FPI'` | `'INDIVIDUAL'` |
| `account_state` | VARCHAR(20) | **Yes** | `'ACTIVE'`, `'SUSPENDED'`, `'DORMANT'`, `'CLOSED'` | `'ACTIVE'` |
| `residential_city` | VARCHAR(100) | Optional | City string | `'Mumbai'` |
| `registration_date` | DATE | **Yes** | ISO-8601 (`YYYY-MM-DD`) | `'2021-03-15'` |
| `risk_profile_grade` | VARCHAR(10) | Optional | `'LOW'`, `'STANDARD'`, `'WATCHLIST'`, `'HIGH_RISK'` | `'WATCHLIST'` |

### 7.2 Depository Demat Accounts
| Field Name | Data Type | Mandatory | Constraints / Validation | Sample Value |
| :--- | :--- | :---: | :--- | :--- |
| `client_pan` | VARCHAR(10) | **Yes** | Foreign Key -> Client Master | `'HWFTM1488X'` |
| `depository_id` | VARCHAR(16) | **Yes** | NSDL / CDSL DP registration code | `'IN300123'` |
| `beneficiary_acc_no` | VARCHAR(20) | **Yes** | Unique 8 or 16-digit BO account number | `'10495821'` |
| `account_open_date` | DATE | **Yes** | ISO-8601 (`YYYY-MM-DD`) | `'2021-03-20'` |
| `joint_holder_pan_2` | VARCHAR(10) | Optional | Valid PAN or NULL | `'PKTBY7338I'` |
| `is_poa_active` | BOOLEAN | **Yes** | `True` or `False` | `False` |
| `bank_account_masked` | VARCHAR(20) | Optional | Masked account string | `'XXXXXX4819'` |
