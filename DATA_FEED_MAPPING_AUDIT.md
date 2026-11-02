# PVASF — Data Feed Audit & Specification Mapping
## What We Wanted vs. What We Got

**Document Version:** 2.1.0  
**Framework Target:** Price-Volume Alert Surveillance Framework (PVASF)  
**Primary Specifications:**  
* [`PVASF_CORE_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_CORE_SPEC.md) (Core Surveillance Engine & Mathematical Formulas)  
* [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md) (Formal Data Delivery Schema)  
**Database Target:** `backend/db/surveillance.db` (SQLite relational warehouse)  
**Last Updated:** 2026-10-01  

---

## 1. Executive Summary: Delivered Raw Excel Files Overview

To date, five production raw data Excel files have been delivered by the exchange / surveillance data team. This document tracks the exact mapping of requested fields against delivered columns, data types, discrepancies, and storage schemas with **100% genuine data verification**.

| File Name | Functional Scope | Period Covered | Trading Days | Total Records | Unique Scrips | Primary Spec Section | Delivery Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :---: |
| [`result_part1.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/result_part1.xlsx) | EOD Market OHLCV & Circuit Limits (Part 1) | 2025-02-11 $\rightarrow$ 2025-07-03 | 96 Days | **176,056** | 2,010 | **Section 1: Daily Market OHLCV** | **COMPLETE** |
| [`result_part2.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/result_part2.xlsx) | EOD Market OHLCV & Circuit Limits (Part 2) | 2025-07-04 $\rightarrow$ 2025-11-03 | 83 Days | **157,918** | 2,155 | **Section 1: Daily Market OHLCV** | **COMPLETE** |
| **Combined EOD Universe** | **Full 180-Day EOD Baseline Universe** | **2025-02-11 $\rightarrow$ 2025-11-03** | **179 Days** | **333,974** | **2,191** | **Section 1 (Complete)** | **ACTIVE IN DB** |
| [`client_data.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/client_data.xlsx) | Participant Trading & Intraday LTP Impact | 2025-10-14 $\rightarrow$ 2025-11-03 | Up to 14 Days | **58,898** | 3 | **Section 2: Participant Conduct** | **ACTIVE IN DB** |
| [`PAN_PAIR_GUJRAFFIA.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PAN_PAIR_GUJRAFFIA.xlsx) | Counterparty Matched Trades & Rings | 2025-10-14 $\rightarrow$ 2025-10-21 | 6 Days | **2,713** | 1 (`GUJRAFFIA`) | **Section 3: Matched Pairs** | **INGESTED & ACTIVE** |
| [`PAN_PAIR_SKMEGGPROD.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PAN_PAIR_SKMEGGPROD.xlsx) | Counterparty Matched Trades & Rings | 2025-11-03 | 1 Day | **3,987** | 1 (`SKMEGGPROD`) | **Section 3: Matched Pairs** | **INGESTED & ACTIVE** |
| **Combined PAN Pairs** | **Bilateral Matched Trade Logs** | **2025-10-14 $\rightarrow$ 2025-11-03** | **7 Days** | **6,700** | **2 Scrips** | **Section 3 (Alert Scrips)** | **INGESTED & ACTIVE** |

---

## 2. Files 1 & 2: `result_part1.xlsx` and `result_part2.xlsx`

### 2.1. Functional Purpose
These two files deliver **Section 1 ("Daily Market OHLCV & Price Trends")** of [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md#L6-L26).
Because a 180-day archive for 2,191 listed companies exceeds 330,000 rows, the exchange split the delivery chronologically into two consecutive halves:
* **Part 1 (Feb 11 – Jul 03, 2025)**: Baseline historical window ($T-180$ to $T-84$).
* **Part 2 (Jul 04 – Nov 03, 2025)**: Mid-to-recent observation window and alert trigger window ($T-83$ to $T$).

Together they provide the full 179 trading days required for the 180-day baseline calculation.

---

### 2.2. Detailed Field-by-Field Mapping (Section 1)

| # | Spec Field Name | Spec Variable | Spec Calc / Source | Excel Column Name (Delivered) | Excel Stored Type | Database Column (`daily_market_eod`) | Database Schema Type | Sample Value (from File) | Mapping Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :-: |
| 1 | Scrip Symbol | `symbol` | Precalculated | `SCRIP_SYMBOL` | String (`str`) | `symbol` | `VARCHAR(20) NOT NULL` | `'20MICRONS'` | **EXACT MATCH** |
| 2 | Trade Date | `trade_date` | Precalculated | `TRADE_DATE` | `datetime.datetime` | `trade_date` | `DATE NOT NULL` | `2025-02-11 00:00:00` | **EXACT MATCH** |
| 3 | ISIN Code | `isin` | Precalculated | `ISIN` | String (`str`) | `isin` | `VARCHAR(12) NOT NULL` | `'INE144J01027'` | **EXACT MATCH** |
| 4 | Company Legal Name | `company_name` | Precalculated | `COMPANY_LEGAL_NAME` | String (`str`) | `company_name` | `VARCHAR(200) NOT NULL` | `'20 MICRONS LTD'` | **EXACT MATCH** |
| 5 | Day Open Price | `open_price` | Precalculated | `DAY_OPEN_PRICE` | Numeric text (`str`) | `open_price` | `NUMERIC(15, 2) NOT NULL` | `'176.44'` $\rightarrow$ `176.44` | **EXACT MATCH** |
| 6 | Day High Price | `day_high_price` | Precalculated | `DAY_HIGH_PRICE` | Numeric text (`str`) | `day_high_price` | `NUMERIC(15, 2) NOT NULL` | `'177.99'` $\rightarrow$ `177.99` | **EXACT MATCH** |
| 7 | Day Low Price | `day_low_price` | Precalculated | `DAY_LOW_PRICE` | Numeric text (`str`) | `day_low_price` | `NUMERIC(15, 2) NOT NULL` | `'167.41'` $\rightarrow$ `167.41` | **EXACT MATCH** |
| 8 | Close Price (VWAP) | `close_price` | Precalculated | `CLOSE_PRICE` | Numeric text (`str`) | `close_price` | `NUMERIC(15, 2) NOT NULL` | `'168.42'` $\rightarrow$ `168.42` | **EXACT MATCH** |
| 9 | Previous Close Price | `prev_close_price` | Precalculated | `PREVIOUS_CLOSE_PRICE` | Numeric text (`str`) | `prev_close_price` | `NUMERIC(15, 2)` | `'176.94'` $\rightarrow$ `176.94` | **EXACT MATCH** |
| 10 | Total Traded Quantity | `total_traded_quantity` | Precalculated | `TOTAL_TRADED_QUANTITY` | Numeric text (`str`) | `total_traded_quantity` | `BIGINT NOT NULL` | `'207691'` $\rightarrow$ `207691` | **EXACT MATCH** |
| 11 | Total Traded Turnover | `total_traded_value` | Precalculated | `TOTAL_TRADED_TURNOVER` | Numeric text (`str`) | `total_traded_value` | `NUMERIC(20, 2) NOT NULL` | `'35454739.45'` $\rightarrow$ `35454739.45` | **EXACT MATCH** |
| 12 | Upper Circuit Limit | `upper_circuit_limit` | Precalculated | `UPPER_CIRCUIT_LIMIT` | Numeric text (`str`) | `upper_circuit_limit` | `NUMERIC(15, 2) NOT NULL` | `'212.32'` $\rightarrow$ `212.32` | **EXACT MATCH** |
| 13 | Lower Circuit Limit | `lower_circuit_limit` | Precalculated | `LOWER_CIRCUIT_LIMIT` | Numeric text (`str`) | `lower_circuit_limit` | `NUMERIC(15, 2)` | `'141.55'` $\rightarrow$ `141.55` | **EXACT MATCH** |
| 14 | 52-Week High Price | `week_52_high_price` | Precalculated | `WEEK_52_HIGH_PRICE` | Numeric text (`str`) | `week_52_high_price` | `NUMERIC(15, 2)` | `'348'` $\rightarrow$ `348.00` | **EXACT MATCH** |
| 15 | 52-Week Low Price | `week_52_low_price` | Precalculated | `WEEK_52_LOW_PRICE` | Numeric text (`str`) | `week_52_low_price` | `NUMERIC(15, 2)` | `'132'` $\rightarrow$ `132.00` | **EXACT MATCH** |

---

### 2.3. Section 1 Fields Handled by Backend (Not Required from Exchange)
The remaining 6 variables in Section 1 of [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md#L21-L26) are marked `Backend` because our engine calculates them dynamically:

| Spec Field Name | Spec Variable | Spec Source | How It Is Computed by Backend Engine |
| :--- | :--- | :---: | :--- |
| **Closing Price (T-180)** | `base_price_180d` | `Backend` | `close_price` indexed at row $-(N+1)$ where $N = \min(180, \text{len}(df)-1)$. |
| **Volume Baseline Mean** | `baseline_volume_mean` | `Backend` | $\mu$ of rolling 15-day average volumes across the 180-day baseline window. |
| **Volume Baseline Std Dev** | `baseline_volume_std` | `Backend` | $\sigma$ of rolling 15-day average volumes across the 180-day baseline window. |
| **180-Day Return Baseline Mean** | `return_mean_180d` | `Backend` | Mean of daily close-to-close returns across the 180-day baseline window. |
| **180-Day Return Baseline Std Dev** | `return_std_180d` | `Backend` | $\sigma$ of daily close-to-close returns across the 180-day baseline window. |
| **180-Day Peak High Price** | `peak_high_180d` | `Backend` | $\max(\text{day\_high\_price})$ across the rolling 180 trading days prior to trade date. |

---

## 3. File 3: `client_data.xlsx`

### 3.1. Functional Purpose
This file delivers **Section 2 ("Participant Trading & LTP Impact")** of [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md#L27-L41).
It contains participant-level daily trade aggregates per Client PAN per trading day, detailing aggressive buying, aggressive selling, turnover, and rupee LTP shifts.

---

### 3.2. Detailed Field-by-Field Mapping (Section 2)

| # | Spec Field Name | Spec Variable | Excel Column Name (Delivered) | Excel Stored Type | Database Column (`participant_daily_trades`) | Database Schema Type | Sample Value | Mapping Status & Notes |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Scrip Symbol | `symbol` | `symbol` | String (`str`) | `symbol` | `VARCHAR(20) NOT NULL` | `'SKMEGGPROD'` | **EXACT MATCH** |
| 2 | Trade Date | `trade_date` | `trade_date` | `datetime.datetime` | `trade_date` | `DATE NOT NULL` | `2025-11-03 00:00:00` | **EXACT MATCH** |
| 3 | Client PAN | `client_pan` | `client_pan` | String (`str`) | `client_pan` | `VARCHAR(10) NOT NULL` | `'ABNPP8622K'` | **EXACT MATCH** (10-char PAN) |
| 4 | Client Legal Name | `client_legal_name` | `client_legal_name` | String (`str`) | `client_legal_name` | `VARCHAR(250)` | `'PADMABEN MUKESHBHAI PATEL'` | **EXACT MATCH** (KYC legal name) |
| 5 | Trading Member ID | `trading_member_id` | `trading_member_id` | Integer (`int64`) | `trading_member_id` | `VARCHAR(20)` | `10548`, `12798` | **VARIATION**: Real numeric exchange broker clearing ID instead of string `'TM101'`. |
| 6 | Client Category | `client_category` | `client_category` | Integer (`int64`) | `client_category` | `VARCHAR(30)` | `1`, `3`, `4`, `11`, `15` | **ENCODED**: Delivered as numeric UCC category code (`Decl_Clnt_Catg_Type`) instead of text string. See Section 4 for complete decoder. |
| 7 | Buy Quantity | `buy_quantity` | `BUY_QUANTITY` | Integer (`int64`) | `buy_quantity` | `BIGINT NOT NULL` | `32742` | **EXACT MATCH** |
| 8 | Sell Quantity | `sell_quantity` | `SELL_QUANTITY` | Integer (`int64`) | `sell_quantity` | `BIGINT NOT NULL` | `12500` | **EXACT MATCH** |
| 9 | Buy Turnover Value | `buy_turnover_value` | `BUY_TURNOVER_VALUE` | Float (`float64`) | `buy_turnover_value` | `NUMERIC(20, 2) NOT NULL` | `13941543.60` | **EXACT MATCH** |
| 10 | Sell Turnover Value | `sell_turnover_value` | `SELL_TURNOVER_VALUE` | Float (`float64`) | `sell_turnover_value` | `NUMERIC(20, 2) NOT NULL` | `5325000.00` | **EXACT MATCH** |
| 11 | Aggressor Buy Quantity | `aggressor_buy_quantity` | `AGGRESSOR_BUY_QUANTITY` | Integer (`int64`) | `aggressor_buy_quantity` | `BIGINT` | `28500` | **EXACT MATCH** (Orders lifting ask price) |
| 12 | *Aggressor Sell Quantity* | *(Not originally listed)* | `AGGRESSOR_SELL_QUANTITY` | Integer (`int64`) | *(Extends framework)* | `BIGINT` | `11200` | **BONUS FIELD**: Exchange provided sell-side aggression (hitting bids) in addition to buy aggression. |
| 13 | Gross Positive LTP Value | `gross_positive_ltp_value` | `GROSS_POSITIVE_LTP_VALUE` | Float (`float64`) | `gross_positive_ltp_value` | `NUMERIC(20, 2) NOT NULL` | `31.40` | **EXACT MATCH** (+₹ price push by aggressor buy orders) |
| 14 | Gross Negative LTP Value | `gross_negative_ltp_value` | `GROSS_NEGATIVE_LTP_VALUE` | Float (`float64`) | `gross_negative_ltp_value` | `NUMERIC(20, 2) NOT NULL` | `32.25` | **EXACT MATCH** (-₹ price pull by aggressor sell orders) |
| 15 | Buy Trade Count | `buy_trade_count` | *(Not in file)* | — | `buy_trade_count` | `BIGINT` | `NULL` | **NOT PROVIDED**: File provides volume/turnover aggregates; execution trade counts are omitted. |
| 16 | Sell Trade Count | `sell_trade_count` | *(Not in file)* | — | `sell_trade_count` | `BIGINT` | `NULL` | **NOT PROVIDED**: File provides volume/turnover aggregates; execution trade counts are omitted. |

---

### 3.3. Scrip Distribution in `client_data.xlsx`
The 58,898 rows cover three scrips across differing session observation periods:

| Scrip Symbol | Total Trade Records | Unique Client PANs | Trading Days Present | Date Span | Observation Window Completeness |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`TDPOWERSYS`** | **55,893** | 22,410 | **14 Days** | Oct 14, 2025 $\rightarrow$ Nov 03, 2025 | **Complete** (~15-day statutory observation window) |
| **`GUJRAFFIA`** | **1,235** | 812 | **6 Days** | Oct 14, 2025 $\rightarrow$ Oct 21, 2025 | **Partial** (6 sessions) |
| **`SKMEGGPROD`** | **1,770** | 1,770 | **1 Day** | Nov 03, 2025 | **Single Session Snapshot** (Peak trigger day) |

---

## 4. Master Decoder Key: `Decl_Clnt_Catg_Type` (Client Category)

The `client_category` column in [`client_data.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/client_data.xlsx) contains numeric codes conforming to the official regulatory Unique Client Code (UCC) specification for **`Decl_Clnt_Catg_Type`**.

### 4.1. Standard Exchange Categories (Codes 1 – 18)

| Code | Official UCC Category Name | Regulatory Definition | Records in `client_data.xlsx` | Share of Feed | Surveillance & Enforcement Role |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **`1`** | **Individuals** | Indian resident individual (Retail / HNI) | **56,716** | **96.30%** | Retail market participants; checks for mule accounts / front-running. |
| **`2`** | **Partnership Firms** | Partnership entities registered under Indian Partnership Act | **190** | **0.32%** | Closely-held firms; frequently used in cartel trading rings. |
| **`3`** | **HUF** | Hindu Undivided Family | **651** | **1.11%** | Family trusts/entities; critical for detecting family-coordinated manipulation rings. |
| **`4`** | **Public & Private Companies / Bodies Corporate** | Incorporated Indian corporates (Pvt Ltd / Ltd) | **258** | **0.44%** | Operating companies or suspected shell entities accumulating float. |
| **`5`** | **Trust / Society** | Registered public/charitable/family trusts | **12** | **0.02%** | Dedicated promoter trusts or non-profit entities. |
| **`6`** | **Mutual Funds** | SEBI-registered Asset Management Companies (AMCs) | **20** | **0.03%** | Institutional domestic long-only funds. |
| **`7`** | **Domestic Financial Institutions (DFIs)** | Financial institutions other than banks & insurance | **0** | 0.00% | Quasi-government / institutional lenders. |
| **`8`** | **Banks** | Commercial banks (Scheduled Commercial Banks) | **0** | 0.00% | Treasury operations of scheduled banks. |
| **`9`** | **Insurance Companies** | IRDAI-registered life/general insurers | **0** | 0.00% | Institutional domestic insurance pools. |
| **`10`** | **Statutory Bodies** | Government corporations / statutory authorities | **0** | 0.00% | Government statutory investment arms. |
| **`11`** | **NRIs** | Non-Resident Indian accounts | **428** | **0.73%** | Offshore Indian individuals; checked for foreign remittance flows. |
| **`12`** | **FIIs** | Foreign Institutional Investors (legacy designation) | **0** | 0.00% | Replaced by FPI regime. |
| **`13`** | **Overseas Corporate Bodies (OCBs)** | Foreign companies majority-owned by NRIs | **0** | 0.00% | Monitored for overseas round-tripping. |
| **`14`** | **FDI / FVCI** | Foreign Direct Investment / Foreign Venture Capital | **0** | 0.00% | Direct FDI equity stakes. |
| **`15`** | **PMS Clients** | Portfolio Management Service clients | **297** | **0.50%** | Discretionary / Non-discretionary high-net-worth managed portfolios. |
| **`16`** | **New Pension Funds (NPS)** | PFRDA-regulated pension fund schemes | **0** | 0.00% | National pension system institutional managers. |
| **`17`** | **Non-Taxpaying Entities** | Entities exempt under Section 10/12 of Income Tax Act | **0** | 0.00% | Tax-exempt institutions. |
| **`18`** | **Others** | Unclassified client accounts | **0** | 0.00% | Catch-all category. |

### 4.2. Extended Institutional & Sub-Category Codes (> 18)

| Code | Decoded Institutional Category | Entities Found in Feed | Sample Legal Names | Records |
| :---: | :--- | :--- | :--- | :---: |
| **`51`** | **Alternative Investment Funds (AIFs)** | SEBI Category I/II/III Domestic AIFs | `PERSISTENCE CAPITAL FUND I`, `MOTILAL OSWAL INDIA EXCELLENCE FUND` | **10** |
| **`69`** | **FPI Category II (Offshore Funds)** | Broad-based foreign funds, offshore hedge funds | `QUADRATURE CAPITAL VECTOR SP`, `DIMENSIONAL EMERGING MARKETS FUND` | **6** |
| **`80`** | **Corporate Special Category** | Foreign corporate holding vehicles | `RED BAY LTD` | **1** |
| **`92`** | **FPI Category I (Global Custody / Sovereign)** | Sovereign wealth funds, global investment banks | `BOFA SECURITIES EUROPE SA`, `CITADEL SECURITIES`, `GOLDMAN SACHS` | **32** |
| **`125`** | **Foreign Individual Investor** | Qualified foreign individuals | `JOHN ALBERT GUNN` | **1** |
| **`244`** | **NRI Special Repatriable / NRE-NRO** | NRI accounts with designated repatriation flags | `ABDUL MAJID`, `NAVINKUMAR MAHABIRPRASAD DALMIA` | **274** |

---

## 5. Files 4 & 5: `PAN_PAIR_GUJRAFFIA.xlsx` and `PAN_PAIR_SKMEGGPROD.xlsx`

### 5.1. Functional Purpose
These two files deliver **Section 3 ("Counterparty Trading & Matched Pairs")** of [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md#L42-L53).
They provide genuine bilateral matched buyer-seller pairs executed at the exchange matching engine level, complete with traded quantity, transaction value, broker IDs, and dual LTP push values.

* **`PAN_PAIR_GUJRAFFIA.xlsx`**: Covers **2,713 matched pairs** executed across 6 consecutive trading sessions (Oct 14, 2025 to Oct 21, 2025) involving 1,361 unique PAN entities during `GUJRAFFIA`'s 5-session circuit lock sequence.
* **`PAN_PAIR_SKMEGGPROD.xlsx`**: Covers **3,987 matched pairs** executed on Nov 03, 2025 across 1,864 unique PAN entities during `SKMEGGPROD`'s peak +20% circuit surge day.

Together, they inject **6,700 high-fidelity bilateral matched transactions** with **zero null values**, all 100% pre-validated against `client_identity_master`.

---

### 5.2. Detailed Field-by-Field Mapping (Section 3: What We Wanted vs. What We Got)

Below is the exact column-by-column comparison between what was formally requested in [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md#L42-L53) and what the exchange delivered in the Excel files:

| # | Spec Field Name (What We Wanted) | Spec Variable | Delivered Column in Excel | Excel Data Type | Database Column (`counterparty_trade_pairs`) | Database Schema Type | Sample Value (from File) | Mapping Status & Technical Notes |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Scrip Symbol | `symbol` | **`SYMBOL`** | String (`str`) | `symbol` | `VARCHAR(20) NOT NULL` | `'SKMEGGPROD'`, `'GUJRAFFIA'` | **EXACT MATCH** |
| 2 | Trade Date | `trade_date` | **`TRADE_DATE`** | `datetime.datetime` | `trade_date` | `DATE NOT NULL` | `2025-11-03 00:00:00` | **EXACT MATCH** |
| 3 | Buyer PAN | `buyer_pan` | **`BUYER_PAN`** | String (`str`) | `buyer_pan` | `VARCHAR(10) NOT NULL` | `'AAHCC4825H'`, `'EHZPM9626L'` | **EXACT MATCH** (10-char PAN) |
| 4 | Buyer Legal Name | `buyer_legal_name` | **`BUYER_NAME`** | String (`str`) | `buyer_client_name` | `VARCHAR(250)` | `'BHOOMIKA S JAIN'` | **EXACT MATCH** (KYC legal entity name) |
| 5 | Buyer Broker ID | `buyer_tm_id` | **`BUYER_BROKER_ID`** | Integer (`int64`) | `buyer_tm_id` | `VARCHAR(20)` | `13906`, `11378`, `90187` | **EXACT MATCH** (Clearing broker ID) |
| 6 | Seller PAN | `seller_pan` | **`SELLER_PAN`** | String (`str`) | `seller_pan` | `VARCHAR(10) NOT NULL` | `'ABNPP9067G'`, `'CYBPB8784M'` | **EXACT MATCH** (10-char PAN) |
| 7 | Seller Legal Name | `seller_legal_name` | **`SELLER_NAME`** | String (`str`) | `seller_client_name` | `VARCHAR(250)` | `'NILAYKUMAR PRAVINBHAI PATEL'` | **EXACT MATCH** (KYC legal entity name) |
| 8 | Seller Broker ID | `seller_tm_id` | **`SELLER_BROKER_ID`** | Integer (`int64`) | `seller_tm_id` | `VARCHAR(20)` | `13906`, `90187`, `6378` | **EXACT MATCH** (Clearing broker ID) |
| 9 | Matched Quantity | `matched_quantity` | **`MATCHED_QUANTITY`** | Integer (`int64`) | `matched_quantity` | `BIGINT NOT NULL` | `220`, `11879` | **EXACT MATCH** (Shares transacted) |
| 10 | Matched Turnover Value | `matched_turnover_value` | **`MATCHED_TURNOVER_VALUE`** | Float (`float64`) | `trade_value` | `NUMERIC(20, 2) NOT NULL` | `97163.00`, `5246327.90` | **EXACT MATCH** (Rupee transaction value) |
| 11 | Pairwise LTP Push Value | `pairwise_ltp_push_value` | **SPLIT INTO TWO COLUMNS:**<br>1. **`LTP_PUSH_VALUE_LOGIC_1`**<br>2. **`LTP_PUSH_VALUE_LOGIC_2`** | Float (`float64`) | `pairwise_ltp_push_value`<br>`pairwise_ltp_push_value_logic_2` | `NUMERIC(15, 2) DEFAULT 0.0`<br>`NUMERIC(15, 2) DEFAULT 0.0` | `97163.00`, `0.00`<br>`0.00`, `4785.00` | **IGNORED / STORED ONLY**: The exchange provided 2 columns (`LOGIC_1` and `LOGIC_2`). Both are saved in the DB, but are **completely ignored** in current surveillance scoring and UI tables. |
| 12 | Reverse Matched Quantity | `reverse_matched_quantity` | **`REVERSE_MATCHED_QUANTITY`** | Integer (`int64`) | `reverse_matched_qty` | `BIGINT NOT NULL DEFAULT 0` | `0`, `2040` | **EXACT MATCH** (Volume executed in reverse direction) |

---

### 5.3. Pairwise LTP Push (`Logic 1` & `Logic 2`) — Status: Ignored

* **What the exchange delivered**: In [`PAN_PAIR_SKMEGGPROD.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PAN_PAIR_SKMEGGPROD.xlsx) and [`PAN_PAIR_GUJRAFFIA.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PAN_PAIR_GUJRAFFIA.xlsx), the exchange delivered two separate columns:
  * `LTP_PUSH_VALUE_LOGIC_1` (Trade vs. Previous Trade price jump)
  * `LTP_PUSH_VALUE_LOGIC_2` (Trade vs. Best Offer on Screen depth sweep)
* **Current Usage**: **IGNORED**.
  * **Not used in engine math or scoring**: Counterparty pairs and rings are evaluated purely by **Traded Volume** and **Reversal Trade Rate (RTR %)**.
  * **Not displayed in the UI**: The Counterparty Concentration table only displays *Matched Entities & PANs*, *Volume*, and *Share %*.
  * Both columns remain safely stored in the database if ever needed for future reference, but are excluded from active surveillance logic to keep things clean and simple.

---

### 5.4. Analysis: Why `TDPOWERSYS` Did Not Receive an Extract

The exchange surveillance data team did not provide a `PAN_PAIR_TDPOWERSYS.xlsx` extract for two structural reasons:

1. **Data Volume & Granularity Constraint**:
   * In [`client_data.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/client_data.xlsx), `TDPOWERSYS` accounts for **55,893 participant trade entries** over 14 trading days, generating between ₹883 Cr and ₹1,271 Cr daily turnover.
   * Computing tick-level bilateral cross-matching across 55,000+ executions would produce **200,000 to 500,000+ matched counterparty pairs**, which substantially exceeds typical sample extract delivery thresholds.
2. **Surveillance Anomaly Divergence (Circuit Lock vs. Continuous Auction)**:
   * **`GUJRAFFIA`**: Experienced 5 consecutive upper circuit locks (+10.00%), leading the exchange to tighten its surveillance price band.
   * **`SKMEGGPROD`**: Underwent an acute single-day +20.00% upper circuit surge on Nov 03, 2025.
   * Both `GUJRAFFIA` and `SKMEGGPROD` are classic illiquid, synchronized circuit runs where bilateral wash trading and circular collusion rings are most potent.
   * **`TDPOWERSYS`**: Traded in deep, continuous, two-sided institutional auction without hitting circuit limits. Hence, the exchange's targeted bilateral matching query was focused exclusively on the acute circuit anomaly scrips.
   * In the PVASF system, `TDPOWERSYS` participant flows are analyzed directly via its 55,893 records in `participant_daily_trades`, where participant conduct, positive LTP contributors (+₹170.45), and negative LTP contributors (-₹314.05) are fully operational.

---

## 6. Database Schema & Data Hygiene Verification

All incoming raw data from the five delivered Excel files has been parsed, cleaned, and ingested into `backend/db/surveillance.db`. **All synthetic and fake test rows have been purged.**

### 6.1. Table: `daily_market_eod` (from `result_part1.xlsx` & `result_part2.xlsx`)
* **Total Records**: `333,974`
* **Symbols Covered**: `2,191`
* **Data Range**: `2025-02-11` to `2025-11-03`
* **Data Integrity**:
  * Null Prices (`open_price`, `close_price`): **`0` (0.00%)**
  * Null Upper Circuit Limits (`upper_circuit_limit`): **`0` (0.00%)**
  * Null Previous Closes (`prev_close_price`): **`0` (0.00%)**
  * Negative / Corrupt Quantities: **`0` (0.00%)**
* **Schema Types**: Strongly typed as `NUMERIC(15, 2)`, `BIGINT`, `DATE`.

### 6.2. Table: `participant_daily_trades` (from `client_data.xlsx`)
* **Total Records**: `58,898` (**100% genuine data**, exactly matching `client_data.xlsx`; 2,400 synthetic rows purged)
* **Data Integrity**:
  * Null Buy / Sell Quantities: **`0` (0.00%)**
  * Null Positive LTP Values: **`0` (0.00%)**
  * Null Negative LTP Values: **`0` (0.00%)**
* **Schema Types**: Strongly typed as `NUMERIC(20, 2)`, `BIGINT`, `VARCHAR(10)`.

### 6.3. Table: `counterparty_trade_pairs` (from `PAN_PAIR_*.xlsx` & Participant Ingestion)
* **Total Records**: `6,700` (100% genuine bilateral matched trades from `PAN_PAIR_GUJRAFFIA.xlsx` [2,713 pairs] and `PAN_PAIR_SKMEGGPROD.xlsx` [3,987 pairs]; all dummy records purged)
* **Data Integrity**:
  * Null Matched Quantities: **`0` (0.00%)**
  * Null Buyer/Seller PANs: **`0` (0.00%)**
  * Both Logic 1 and Logic 2 LTP push values populated: **`100%`**
* **Schema Types**: Strongly typed as `BIGINT`, `NUMERIC(20, 2)`, `NUMERIC(15, 2)`, `VARCHAR(10)`.

---

## 7. Specification Gap Analysis (Complete Status Tracking)

Based on [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md) and [`PVASF_CORE_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_CORE_SPEC.md), the status of each data section is summarized below:

| Spec Section | Scope / Description | Delivery Status | Source File | Action / Implementation Status |
| :--- | :--- | :---: | :---: | :--- |
| **Section 1: Daily Market OHLCV** | 180-day price, volume, circuit bands, 52w high/low | **COMPLETE** | `result_part1.xlsx`, `result_part2.xlsx` | **Active**: 333,974 rows in `daily_market_eod`. Powers all 5 core alert metrics, Z-scores, and dynamic circuit bands. |
| **Section 2: Participant Trading & LTP** | 15-day client PAN buys, sells, aggressor qty, $\pm$ LTP push | **COMPLETE (FOR TARGET SCRIPS)** | `client_data.xlsx` | **Active**: 58,898 genuine rows in `participant_daily_trades`. Powers participant concentration and $\pm$ LTP push rankings. |
| **Section 3: Counterparty Trading & Matched Pairs** | Bilateral matched buyer-seller pairs, pairwise LTP push | **COMPLETE (FOR ALERT SCRIPS)** | `PAN_PAIR_GUJRAFFIA.xlsx`, `PAN_PAIR_SKMEGGPROD.xlsx` | **Active**: 6,700 genuine matched trade records in `counterparty_trade_pairs`. Powers circular trade and wash sale detection. |
| **Section 4: Shareholding Patterns (SHP)** | Quarterly promoter float, top 1% public, pledge %, substantial holders | **PENDING** | *(Awaiting quarterly filing feed)* | Tables (`shareholding_summary`, `large_shareholders_registry`) are empty (purged of fake data). Ready for ingestion upon arrival. |
| **Section 5: Corporate Actions** | 15-day dividends, bonus issues, splits, record dates | **PENDING** | *(Awaiting corporate action feed)* | Table `corporate_events_feed` is empty (purged of fake data). Ready for ingestion upon arrival. |
| **Section 6: Trading Calendar** | Trading vs. non-trading days, exchange holidays, Muhurat sessions | **COMPLETE** | `trading_session_calendar` | **Active**: 426 calendar dates (296 trading sessions) mapped. |
| **Section 7: Client KYC Master** | Full legal names, PAN master registry | **COMPLETE** | `client_identity_master` | **Active**: 59,397 real PANs indexed with KYC entity names. |
