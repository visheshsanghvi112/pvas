# PVASF Targeted Data Request Specification
## Enterprise Production Data Extract Specification for Teradata DBAs & Data Engineers

**Document Version:** 5.0.0  
**Target Systems:** Enterprise Teradata Data Warehouse (16 Data Warehouse Tables: `AGG_SEC_DAY`, `AGG_CLNT_SEC_DAY`, `AGG_PAN_PAIR_DAY`, `FACT_TRADES`, `DIM_EXCH_CLNT_DTLS`, `DIM_DEP_CLNT_DTLS`, 8 Enterprise Shareholding Tables, 2 Corporate Action Tables, `FORENSIC_CASES`, `SYS_USERS`, `SYS_AUDIT_LOGS`)  
**Target Audience:** Surveillance Product Manager, Lead DBA & Teradata Data Engineering Team  
**Reference Schema Document:** [`PVASF_SCHEMA_REFERENCE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_SCHEMA_REFERENCE.md) (Complete 754-Column Specification)

---

## 1. Executive Summary & Extraction Rationale

The **Price-Volume Alert Surveillance Framework (PVASF)** is an end-to-end market conduct surveillance and anomaly detection system. It ingests daily trade aggregates, trade execution matches, exchange/depository client demographics, quarterly shareholding distributions, corporate actions, and forensic case dossiers to detect artificial price inflation, coordinated volume pump schemes, circular trading rings, and wash trades.

> **Architecture Note:** `FACT_TRADES` is retained in the data extract specification for microsecond execution logs, order numbers (`Ftrd_Buy_Ord_Num`), same-broker wash trade flags, and legal evidence in court proceedings. However, `FACT_TRADES` is **omitted from daily baseline OHLC/Close calculations** because official 30-minute VWAP Closing Prices and daily volume aggregates are provided directly by `AGG_SEC_DAY`.

### Goal of This Specification
To execute our surveillance algorithms against live production market data without requiring a massive, multi-terabyte warehouse dump, **this document provides an exhaustive, column-by-column breakdown of the exact minimal dataset required by our 9 operational system modules.**

By specifying exact Teradata physical column names (`Asd_Close_Price`, `Acsd_Pos_Cont_Val`, `Appd_Pos_Contri`, `Ftrd_Symbol`, `Ftrd_Trd_Price`, `Ftrd_Trd_Qty`, `Decl_Clnt_Pan`, `Fshg_Tot_Shares_Pct`, `Fcac_Divnd_Prpse`, etc.), data types, nullable rules, sample values, and consuming module justifications, **this document enables the Data Engineering team to fulfill the data request in a single extract without needing follow-up requests.**

---

## 2. Master Summary of Required Teradata Warehouse Tables

Our system consumes data across **16 physical Teradata Data Warehouse tables** plus 3 local persistence tables:

| Table Name | Short Code | Full Entity Name | Total Columns in Warehouse | Required Columns for System | Minimal Extract Scope |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `FACT_TRADES` | `FTRD` | Trade Match Execution Facts | **123** | **27 Columns** | 180D Baseline + 15D Window ($T-180$ to $T$) |
| `DIM_EXCH_CLNT_DTLS` | `DECL` | Exchange Client Master (PAN Link) | **128** | **14 Columns** | Active & Suspended Client Accounts |
| `DIM_DEP_CLNT_DTLS` | `DDCL` | Depository Client Master (Demat) | **63** | **8 Columns** | NSDL / CDSL Beneficiary Owner Accounts |
| `FACT_MSTR_SHAREHLDG` | `FMSH` | Shareholding Master Record | **37** | **12 Columns** | Last 4 Quarters ($Q1$–$Q4$) |
| `FACT_MAIN_SHLDNG` | `FSHG` | Main Shareholding Distribution | **30** | **16 Columns** | Promoter ($Catg=1$) vs Public ($Catg=2$) |
| `FACT_PROM_SHLDR_DTLS` | `FPRH` | Promoter Shareholder Details | **22** | **10 Columns** | Promoter Entity Names & Share Pct |
| `FACT_PUB_SHLDR_DTLS` | `FPUH` | Public Shareholder Details | **19** | **8 Columns** | Public Institutional Holdings |
| `FACT_DVR_SHLDNG` | `FDVR` | Differential Voting Rights | **25** | **5 Columns** | DVR Shareholding Records |
| `FACT_DR_HOLDING` | `FDRH` | Depository Receipts (ADR/GDR) | **19** | **4 Columns** | Foreign Depository Receipts |
| `FACT_LKDIN_SHLDNG` | `FLKD` | Locked-In Shareholding | **17** | **4 Columns** | Lock-In Promoter/Public Shares |
| `FACT_CMP_EXCH_SHLDNG` | `FCES` | Company Exchange Index | **5** | **3 Columns** | Exchange Shareholding Index |
| `FACT_CORP_ACTIONS` | `FCAC` | Corporate Actions & Disclosures | **49** | **15 Columns** | Bonus, Dividend, Stock Split Disclosures |
| `FACT_CA_DIL_FCTR` | `FCDF` | Corporate Action Dilution Factor | **13** | **7 Columns** | Price Adjustment Factor (e.g. $0.50$) |
| `AGG_SEC_DAY` | `ASD` | Security Daily Aggregates & Closing Price | **83** | **13 Columns** | Daily VWAP Close, OHLC & Circuit Limits |
| `AGG_CLNT_SEC_DAY` | `ACSD` | Client Security Daily Aggregates | **31** | **9 Columns** | Client Buy/Sell Volumes & LTP Push |
| `AGG_PAN_PAIR_DAY` | `APPD` | Counterparty PAN Pair Aggregates | **60** | **8 Columns** | Buyer/Seller PAN Pair Trading Concentration |
| `FORENSIC_CASES` | `CASES` | Forensic Case Dossier Persistence | **13** | **13 Columns** | Regulatory Dossiers & Evidence Pinning |
| `SYS_USERS` | `USERS` | Security User Management | **9** | **9 Columns** | SHA-256 Auth & RBAC User Roles |
| `SYS_AUDIT_LOGS` | `LOGS` | Security Audit Trail Logs | **7** | **7 Columns** | Immutable Action & Access Logs |

---


## 3. Detailed Module-by-Module Specification

---

### 3.1 Module 1: Alert Scoring & Watchlist Engine
- **Consuming UI / Service**: Executive Surveillance Dashboard & Watchlist (`/`, `EODSurveillanceService`).
- **Primary Objective**: Evaluates five shortlisting anomaly metrics to score and rank scrips by risk ($0 \dots 100$).
- **Source Table**: `FACT_TRADES` (`FTRD`)

#### Mathematical Formulas & Metric Logic
1. **Price Rise %**:
   $$\text{Price Rise \%} = \frac{\text{Highest Price}_{15\text{D}} - \text{Price}_{T-180}}{\text{Price}_{T-180}} \times 100$$
2. **Price Z-Score**:
   $$Z_{\text{price}} = \frac{\bar{X}_{15\text{D}} - \mu_{180\text{D}}}{\sigma_{180\text{D}}}$$
3. **Volume Z-Score**:
   $$Z_{\text{volume}} = \frac{\bar{X}_{\text{vol}, 15\text{D}} - \mu_{\text{vol}, 180\text{D}}}{\sigma_{\text{vol}, 180\text{D}}}$$
4. **Price Band Persistence**: Counts days where intraday high reached $\ge 90\%$ of upper circuit ceiling (`Ftrd_Last_Estd_Hi_Price`).
5. **180-Day New High Breakout**: Counts days where running LTP (`Ftrd_Last_Trd_Price`) matched or exceeded the 180-day historical peak.

#### Required Column Specifications (`FACT_TRADES`)

| Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Consuming Metric |
| :--- | :--- | :---: | :--- | :--- |
| `Ftrd_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Scrip ticker symbol; primary group-by key for per-security baseline calculations. |
| `Ftrd_Trd_Date` | `DATE` | **Y** | `'2026-07-28'` | Calendar date filter for 180-day baseline and 15-day observation window. |
| `Ftrd_Trd_Price` | `DECIMAL(20,2)` | **Y** | `1450.50` | Executed trade price; used as EOD close proxy to compute Price Rise % and Price Z-Score. |
| `Ftrd_Last_Trd_Price` | `DECIMAL(20,2)` | **Y** | `1448.00` | Running LTP prior to match; evaluates 180-day peak new high breakouts. |
| `Ftrd_Trd_Qty` | `DECIMAL(20,2)` | **Y** | `500.00` | Traded volume quantity; computes 15-day average vs 180-day rolling Volume Z-Score. |
| `Ftrd_Sess_Type` | `BYTEINT` | **Y** | `2` | Session filter: `1`=Pre-Open, `2`=Normal Market, `3`=Closing Auction. |
| `Ftrd_LTP_Chng_Indc` | `CHAR(1)` | **Y** | `'+'` | LTP change direction: `+` (up), `-` (down), `=` (unchanged). |
| `Ftrd_Last_Estd_Hi_Price`| `DECIMAL(20,2)` | **Y** | `1520.00` | Upper price band; evaluates Circuit Band Persistence ($\ge 90\%$ of circuit limit). |

---

### 3.2 Module 2: 180-Day Price & Volume Trend Chart
- **Consuming UI / Service**: Interactive dual-axis candlestick & volume chart (`/investigations/[symbol]`, `charts.tsx`).
- **Primary Objective**: Visualizes 180-day price trend, 20D/50D moving averages, daily volume bars, and rolling 15D MA volume lines.
- **Source Table**: `FACT_TRADES` (`FTRD`)

#### Required Column Specifications (`FACT_TRADES`)

| Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & UI Component |
| :--- | :--- | :---: | :--- | :--- |
| `Ftrd_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Security symbol filter for investigation workspace. |
| `Ftrd_Trd_Date` | `DATE` | **Y** | `'2026-07-28'` | X-axis timeline distribution spanning 180 trading days. |
| `Ftrd_Trd_Price` | `DECIMAL(20,2)` | **Y** | `1450.50` | Daily close price trend line, 20D moving average, and 50D moving average. |
| `Ftrd_Trd_Qty` | `DECIMAL(20,2)` | **Y** | `154000.00` | Daily volume bar chart and 15D rolling average volume line overlay. |
| `Ftrd_Sess_Type` | `BYTEINT` | **Y** | `2` | Session filter (`Sess_Type = 2` for normal trading hours). |

---

### 3.3 Module 3: Participant Conduct Audit & LTP Contribution
- **Consuming UI / Service**: Upward LTP Pushers Bar Chart & Volume Share Table (`/investigations/[symbol]`, `ParticipantAudit`).
- **Primary Objective**: Attributes price increases to specific buyer PANs and calculates client volume concentration and net P&L.
- **Source Tables**: `FACT_TRADES` (`FTRD`) joined with `DIM_EXCH_CLNT_DTLS` (`DECL`)

#### Mathematical Formulas & Metric Logic
1. **LTP Contribution %**:
   $$\text{LTP Contribution \%} = \frac{\sum (\text{LTP Upward Push of PAN}_i \text{ over 15D})}{\text{Total Net Upward LTP Movement of Scrip over 15D}} \times 100$$
2. **Volume Share %**:
   $$\text{Volume Share \%} = \frac{\sum (\text{Traded Quantity of PAN}_i)}{\text{Total Traded Volume of Scrip over 15D}} \times 100$$
3. **Net Realized/Unrealized P&L**:
   $$\text{Net P\&L} = \sum (\text{Gross Sell Value}) - \sum (\text{Gross Buy Value})$$

#### Required Column Specifications (`FTRD` + `DECL`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Audit Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `FTRD` | `Ftrd_Trd_Tmst` | `TIMESTAMP` | **Y** | `'2026-07-28 14:15:02.124'` | Millisecond timestamp to correlate executions to tick price changes. |
| `FTRD` | `Ftrd_Buy_Exch_Clnt_Token` | `BIGINT` | **Y** | `400129` | Buyer client exchange token; joins to `DECL.Decl_Exch_Clnt_Token`. |
| `FTRD` | `Ftrd_Sell_Exch_Clnt_Token` | `BIGINT` | **Y** | `400842` | Seller client exchange token; joins to `DECL.Decl_Exch_Clnt_Token`. |
| `FTRD` | `Ftrd_Init_Side_Type` | `BYTEINT` | **Y** | `1` | Aggressor flag (`1`=Buy Aggressive). Aggressive buyers drive price up. |
| `FTRD` | `Ftrd_LTP_Chng_Indc` | `CHAR(1)` | **Y** | `'+'` | `+` flag indicates trade pushed LTP higher. Only `+` trades count for LTP Push %. |
| `FTRD` | `Ftrd_Trd_Qty` | `DECIMAL(20,2)` | **Y** | `2500.00` | Executed quantity per buyer/seller PAN to compute Volume Share %. |
| `FTRD` | `Ftrd_Trd_Val` | `DECIMAL(20,2)` | **Y** | `3626250.00` | Trade value to calculate net buy/sell cash flow and profit-takers. |
| `DECL` | `Decl_Exch_Clnt_Token` | `BIGINT` | **Y** | `400129` | Primary key join token matching `FTRD` buy/sell client tokens. |
| `DECL` | `Decl_Clnt_Pan` | `VARCHAR(10)` | **Y** | `'AAACB1234F'` | **Client PAN — primary legal entity identifier for participant grouping.** |
| `DECL` | `Decl_Clnt_Name` | `VARCHAR(100)`| **Y** | `'ALPHA HOLDINGS PVT LTD'`| Client full legal name for audit UI. |

---

### 3.4 Module 4: Counterparty Concentration & Wash Trade Explorer
- **Consuming UI / Service**: Counterparty Pair Matrix, Circular Loop Graph & Wash Trade Log (`/trades`, `/investigations/[symbol]`).
- **Primary Objective**: Identifies synchronized trading between PAN pairs, circular trading loops, and same-broker wash trades.
- **Source Tables**: `FACT_TRADES` (`FTRD`) joined with `DIM_EXCH_CLNT_DTLS` (`DECL`)

#### Required Column Specifications (`FTRD` + `DECL`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Audit Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `FTRD` | `Ftrd_Buy_Exch_Clnt_Token` | `BIGINT` | **Y** | `400129` | Buyer token for counterparty pair matrix. |
| `FTRD` | `Ftrd_Sell_Exch_Clnt_Token` | `BIGINT` | **Y** | `400842` | Seller token for counterparty pair matrix. |
| `FTRD` | `Ftrd_Buy_Exch_TM_Token` | `INT` | **Y** | `101` | Buying Trading Member (Broker) token. |
| `FTRD` | `Ftrd_Sell_Exch_TM_Token` | `INT` | **Y** | `101` | Selling Trading Member (Broker) token. |
| `FTRD` | `Ftrd_Same_Broker_Wash_Flag`| `BYTEINT` | **Y** | `1` | Flag `1` indicates buyer & seller matched at same broker (wash trade). |
| `FTRD` | `Ftrd_Diff_Broker_Wash_Flag`| `BYTEINT` | **Y** | `0` | Flag `1` indicates pre-arranged wash trade across different brokers. |

---

### 3.5 Module 5: Client 360° Identity Resolution (Exchange + Depository)
- **Consuming UI / Service**: In-context Client Profile Modal (`/clients`, `Client360Modal`).
- **Primary Objective**: Cross-references exchange trading accounts (`DECL`) with depository demat accounts (`DDCL`).
- **Source Tables**: `DIM_EXCH_CLNT_DTLS` (`DECL`) and `DIM_DEP_CLNT_DTLS` (`DDCL`)

#### Required Column Specifications (`DECL` + `DDCL`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Profile Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `DECL` | `Decl_Clnt_Pan` | `VARCHAR(10)` | **Y** | `'AAACB1234F'` | Join key to `DDCL.Ddcl_Clnt_Pan`. |
| `DECL` | `Decl_TM_Id` | `VARCHAR(10)` | **Y** | `'TM001'` | Trading Member Broker ID. |
| `DECL` | `Decl_Clnt_Stat` | `BYTEINT` | **Y** | `1` | Account status (`1`=Active, `2`=Suspended). |
| `DECL` | `Decl_City` | `VARCHAR(50)` | **Y** | `'MUMBAI'` | Geographical audit (detecting out-of-state terminal clusters). |
| `DECL` | `Decl_State` | `VARCHAR(50)` | **Y** | `'MAHARASHTRA'`| State location audit. |
| `DDCL` | `Ddcl_Clnt_Pan` | `VARCHAR(10)` | **Y** | `'AAACB1234F'` | Primary join token matching `DECL.Decl_Clnt_Pan`. |
| `DDCL` | `Ddcl_Dp_Id` | `VARCHAR(10)` | **Y** | `'IN300123'` | Depository Participant ID (NSDL / CDSL). |
| `DDCL` | `Ddcl_Clnt_Id` | `VARCHAR(20)` | **Y** | `'12345678'` | Demat Beneficiary Owner account client ID. |
| `DDCL` | `Ddcl_Jnt_Hldr1_Pan` | `VARCHAR(10)` | **Y** | `'BBBCB5678G'` | Joint Holder 1 PAN (verifying connected entity networks). |
| `DDCL` | `Ddcl_Poa_Hldr_Pan` | `VARCHAR(10)` | **Y** | `'CCCCB9101H'` | Power of Attorney PAN (detecting entity control hubs). |

---

### 3.6 Module 6: Enterprise Quarterly Shareholding Results
- **Consuming UI / Service**: Quarterly Shareholding Distribution Table (`/investigations/[symbol]`, `ShareholdingCard`).
- **Primary Objective**: Audits quarterly shareholding master, promoter vs public float %, promoter entity holdings, and pledge % trends.
- **Source Tables**: `FACT_MSTR_SHAREHLDG` (`FMSH`), `FACT_MAIN_SHLDNG` (`FSHG`), `FACT_PROM_SHLDR_DTLS` (`FPRH`), `FACT_PUB_SHLDR_DTLS` (`FPUH`)

#### Required Column Specifications (`Quarterly Shareholding`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Audit Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `FMSH` | `Fmsh_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Scrip symbol key for shareholding master lookup. |
| `FMSH` | `Fmsh_Qrtr_Num` | `VARCHAR(5)` | **Y** | `'Q4'` | Reporting quarter code (`Q1`, `Q2`, `Q3`, `Q4`). |
| `FMSH` | `Fmsh_As_on_Date` | `DATE` | **Y** | `'2026-12-31'` | Quarter reporting date. |
| `FSHG` | `Fshg_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Scrip symbol key for main shareholding distribution. |
| `FSHG` | `Fshg_Shldng_Catg_Type` | `BYTEINT` | **Y** | `1` | Category code: `1`=Promoter & Promoter Group, `2`=Public Shareholding. |
| `FSHG` | `Fshg_Tot_Shares_Pct` | `DECIMAL(10,2)`| **Y** | `54.27` | Percentage of total equity capital held by category. |
| `FSHG` | `Fshg_Plge_Tot_Shares_Pct`| `DECIMAL(10,2)`| **Y** | `2.50` | Percentage of promoter shares pledged to lenders. |
| `FPRH` | `Fprh_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Scrip symbol key for promoter shareholder entity details. |
| `FPRH` | `Fprh_Shldr_Name` | `VARCHAR(100)`| **Y** | `'ALPHATECH HOLDINGS PVT LTD'` | Legal entity name of promoter shareholder. |
| `FPRH` | `Fprh_Tot_Shares` | `BIGINT` | **Y** | `54270000` | Absolute share quantity held by promoter entity. |
| `FPRH` | `Fprh_Tot_Shares_Pct` | `DECIMAL(10,2)`| **Y** | `54.27` | Percentage of total equity capital held by promoter entity. |

---

### 3.7 Module 7: Corporate Actions & Disclosures
- **Consuming UI / Service**: Corporate Disclosures & Price Dilution Timeline (`/investigations/[symbol]`, `CorporateActionsCard`).
- **Primary Objective**: Renders corporate action events (dividends, bonus shares, stock splits) and price dilution adjustment factors.
- **Source Tables**: `FACT_CORP_ACTIONS` (`FCAC`) and `FACT_CA_DIL_FCTR` (`FCDF`)

#### Required Column Specifications (`Corporate Actions`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Audit Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `FCAC` | `Fcac_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Scrip symbol key for corporate action lookup. |
| `FCAC` | `Fcac_Corp_Action_Catg` | `VARCHAR(30)` | **Y** | `'DP'` | Corporate action category: `BN`=Bonus, `DP`=Dividend, `SS`=Split. |
| `FCAC` | `Fcac_Divnd_Prpse` | `VARCHAR(50)` | **Y** | `'Board recommended interim dividend of INR 12 per share'` | Corporate disclosure purpose description. |
| `FCAC` | `Fcac_Rec_Date` | `DATE` | **Y** | `'2026-06-15'` | Official corporate action record date. |
| `FCAC` | `Fcac_Ex_Divnd_Date` | `DATE` | **Y** | `'2026-06-15'` | Ex-dividend date. |
| `FCAC` | `Fcac_Bonus_Ratio` | `VARCHAR(15)` | **Y** | `'1:1'` | Bonus issue ratio. |
| `FCDF` | `Fcdf_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Scrip symbol key for dilution factor lookup. |
| `FCDF` | `Fcdf_Price_Adj_Factor` | `DECIMAL(15,6)`| **Y** | `0.500000` | Price dilution adjustment factor (e.g. `0.500000` for 1:1 bonus/split). |

---

### 3.8 Module 8: Forensic Case Dossier Workspace
- **Consuming UI / Service**: Forensic Case Management Workspace (`/cases`, `ForensicCasesPage`).
- **Primary Objective**: Persists regulatory investigation dossiers, pinned chart/trade evidence, assigned lead officers, and workflow status.
- **Source Table**: `FORENSIC_CASES` (`CASES`)

#### Required Column Specifications (`FORENSIC_CASES`)

| Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Workflow Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `case_id` | `VARCHAR(50)` | **Y** | `'CASE-2026-ALPHATECH-001'` | Primary Key — Unique dossier ID string. |
| `target_symbol` | `VARCHAR(20)` | **Y** | `'ALPHATECH'` | Target security symbol under investigation. |
| `title` | `VARCHAR(300)` | **Y** | `'Pump & Dump Scheme Review'`| Dossier title and investigation subject. |
| `lead_officer` | `VARCHAR(100)` | **Y** | `'Surveillance Officer #104'` | Assigned surveillance lead officer. |
| `status` | `VARCHAR(30)` | **Y** | `'Open Investigation'` | Status lifecycle (`Draft` $\rightarrow$ `Open Investigation` $\rightarrow$ `Pending Action` $\rightarrow$ `Closed`). |
| `priority` | `VARCHAR(10)` | **Y** | `'High'` | Priority triage level (`High`, `Medium`, `Low`). |
| `description` | `TEXT` | **N** | `'Concentrated buying by 3 PANs'`| Officer investigation narrative and observations. |
| `evidence_json` | `TEXT` | **Y** | `'[{"title":"Z Chart","type":"Chart"}]'`| Pinned evidence JSON payload. |
| `created_at` | `TIMESTAMP` | **Y** | `'2026-07-28 09:00:00'` | Dossier creation audit timestamp. |
| `closed_at` | `TIMESTAMP` | **N** | `'2026-07-28 14:00:00'` | Dossier completion timestamp for SLA tracking. |

---

### 3.9 Module 9: Role-Based Access Control (RBAC) & Audit Trail
- **Consuming UI / Service**: User Accounts & Audit Trail Workspace (`/settings`, `user-context.tsx`).
- **Primary Objective**: Manages authenticated user login credentials, SHA-256 password hashing, RBAC user roles, and immutable audit logs.
- **Source Tables**: `SYS_USERS` (`USERS`) and `SYS_AUDIT_LOGS` (`LOGS`)

#### Required Column Specifications (`SYS_USERS` + `SYS_AUDIT_LOGS`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Security Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `USERS` | `username` | `VARCHAR(50)` | **Y** | `'vishesh_admin'` | Primary login identity key. |
| `USERS` | `email` | `VARCHAR(100)`| **Y** | `'vishesh@surveillance.gov'`| User email address for notification. |
| `USERS` | `hashed_password` | `VARCHAR(128)`| **Y** | `'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'` | Salted SHA-256 password hash. |
| `USERS` | `role` | `VARCHAR(20)` | **Y** | `'Admin'` | RBAC user role (`Admin`, `Analyst`, `Viewer`). |
| `USERS` | `is_active` | `BOOLEAN` | **Y** | `TRUE` | User account active/suspended status flag. |
| `LOGS` | `timestamp` | `TIMESTAMP` | **Y** | `'2026-07-28 09:15:00'` | Immutable audit trail timestamp. |
| `LOGS` | `username` | `VARCHAR(50)` | **Y** | `'vishesh_admin'` | User username performing action. |
| `LOGS` | `action` | `VARCHAR(50)` | **Y** | `'UPDATE_MODEL_WEIGHTS'` | Security action code. |
| `LOGS` | `target` | `VARCHAR(100)`| **Y** | `'SURVEILLANCE_ENGINE'` | Target resource impacted by action. |

---

## 4. Production Teradata Extraction Queries

The following targeted ANSI/Teradata SQL queries extract **only the required data fields** for our modules:

```sql
-- 1. Daily Aggregated OHLCV Extract (Module 1 & Module 2)
SELECT 
    Ftrd_Symbol AS Ticker,
    Ftrd_Trd_Date AS TradeDate,
    MIN(Ftrd_Trd_Price) AS LowPrice,
    MAX(Ftrd_Trd_Price) AS HighPrice,
    SUM(Ftrd_Trd_Qty) AS TradedVolume,
    SUM(Ftrd_Trd_Val) AS TradedValue,
    MAX(Ftrd_Last_Estd_Hi_Price) AS UpperCircuitLimit
FROM FACT_TRADES
WHERE Ftrd_Sess_Type = 2
  AND Ftrd_Trd_Date BETWEEN CURRENT_DATE - 365 AND CURRENT_DATE
GROUP BY Ftrd_Symbol, Ftrd_Trd_Date;

-- 2. Intraday Participant Trade Audit Extract (Module 3 & Module 4)
SELECT 
    f.Ftrd_Trd_Num AS TradeNum,
    f.Ftrd_Trd_Date AS TradeDate,
    f.Ftrd_Trd_Tmst AS TradeTimestamp,
    f.Ftrd_Symbol AS Ticker,
    f.Ftrd_Trd_Price AS TradePrice,
    f.Ftrd_Trd_Qty AS TradeQty,
    f.Ftrd_LTP_Chng_Indc AS LTPChangeIndicator,
    f.Ftrd_Init_Side_Type AS InitiatorSide,
    f.Ftrd_Same_Broker_Wash_Flag AS SameBrokerWashFlag,
    b.Decl_Clnt_Pan AS BuyerPAN,
    s.Decl_Clnt_Pan AS SellerPAN,
    f.Ftrd_Buy_Exch_TM_Token AS BuyerBrokerID,
    f.Ftrd_Sell_Exch_TM_Token AS SellerBrokerID
FROM FACT_TRADES f
JOIN DIM_EXCH_CLNT_DTLS b ON f.Ftrd_Buy_Exch_Clnt_Token = b.Decl_Exch_Clnt_Token
JOIN DIM_EXCH_CLNT_DTLS s ON f.Ftrd_Sell_Exch_Clnt_Token = s.Decl_Exch_Clnt_Token
WHERE f.Ftrd_Trd_Date BETWEEN :DateFrom AND :DateTo
  AND f.Ftrd_Symbol = :TargetSymbol;

-- 3. Enterprise Quarterly Shareholding Extract (Module 6)
SELECT 
    m.Fshg_Symbol AS Symbol,
    m.Fshg_Qrtr_Num AS Quarter,
    m.Fshg_Shldng_Date AS ReportDate,
    m.Fshg_Shldng_Catg_Type AS CategoryType,
    m.Fshg_Tot_Shares_Pct AS SharePct,
    m.Fshg_Plge_Tot_Shares_Pct AS PledgedPct
FROM FACT_MAIN_SHLDNG m
WHERE m.Fshg_Symbol = :TargetSymbol
ORDER BY m.Fshg_Shldng_Date DESC;

-- 4. Corporate Actions & Dilution Extract (Module 7)
SELECT 
    c.Fcac_Symbol AS Symbol,
    c.Fcac_Corp_Action_Catg AS Category,
    c.Fcac_Divnd_Prpse AS Purpose,
    c.Fcac_Rec_Date AS RecordDate,
    d.Fcdf_Price_Adj_Factor AS DilutionFactor
FROM FACT_CORP_ACTIONS c
LEFT JOIN FACT_CA_DIL_FCTR d ON c.Fcac_Symbol = d.Fcdf_Symbol AND c.Fcac_Corp_Action_Catg = d.Fcdf_Corp_Action_Catg
WHERE c.Fcac_Symbol = :TargetSymbol
ORDER BY c.Fcac_Rec_Date DESC;
```

---

## 5. Exhaustive Table-to-Module Data Mapping Reference

| Source Table | Teradata Column Name | Consuming Module | Purpose & Justification |
| :--- | :--- | :--- | :--- |
| `FACT_TRADES` (`FTRD`) | `Ftrd_Symbol`, `Ftrd_Trd_Date`, `Ftrd_Trd_Price`, `Ftrd_Last_Trd_Price`, `Ftrd_Trd_Qty`, `Ftrd_Sess_Type`, `Ftrd_LTP_Chng_Indc`, `Ftrd_Last_Estd_Hi_Price` | **Module 1**: Alert Scoring Engine | Computes 5 shortlisting metrics (Price Z, Volume Z, Band Persistence, New High, Price Rise). |
| `FACT_TRADES` (`FTRD`) | `Ftrd_Symbol`, `Ftrd_Trd_Date`, `Ftrd_Trd_Price`, `Ftrd_Trd_Qty`, `Ftrd_Sess_Type` | **Module 2**: 180-Day Trend Chart | Populates dual-axis candlestick price trend, 20D/50D MAs, and volume bars. |
| `FACT_TRADES` (`FTRD`) | `Ftrd_Trd_Tmst`, `Ftrd_Buy_Exch_Clnt_Token`, `Ftrd_Sell_Exch_Clnt_Token`, `Ftrd_Init_Side_Type`, `Ftrd_LTP_Chng_Indc`, `Ftrd_Trd_Qty`, `Ftrd_Trd_Val` | **Module 3**: Participant Audit | Identifies buyer/seller LTP price pushers, volume share %, and net P&L. |
| `DIM_EXCH_CLNT_DTLS` (`DECL`)| `Decl_Exch_Clnt_Token`, `Decl_Clnt_Pan`, `Decl_Clnt_Name` | **Module 3**: Participant Audit | Translates raw exchange tokens from `FTRD` into Client PANs and legal names. |
| `FACT_TRADES` (`FTRD`) | `Ftrd_Buy_Exch_Clnt_Token`, `Ftrd_Sell_Exch_Clnt_Token`, `Ftrd_Buy_Exch_TM_Token`, `Ftrd_Sell_Exch_TM_Token`, `Ftrd_Same_Broker_Wash_Flag`, `Ftrd_Diff_Broker_Wash_Flag` | **Module 4**: Counterparty Explorer | Detects circular trading loops, synchronized counterparty pairs, and wash trades. |
| `DIM_EXCH_CLNT_DTLS` (`DECL`)| `Decl_Clnt_Pan`, `Decl_TM_Id`, `Decl_Clnt_Stat`, `Decl_City`, `Decl_State` | **Module 5**: Client 360° Identity Resolution | Provides client demographic data, active/suspended status, and geographic location. |
| `DIM_DEP_CLNT_DTLS` (`DDCL`) | `Ddcl_Dp_Id`, `Ddcl_Clnt_Id`, `Ddcl_Jnt_Hldr1_Pan`, `Ddcl_Poa_Hldr_Pan` | **Module 5**: Client 360° Identity Resolution | Cross-references Demat accounts and connected entity networks (Joint Holders, POA). |
| `FACT_MAIN_SHLDNG` (`FSHG`), `FACT_PROM_SHLDR_DTLS` (`FPRH`) | `Fshg_Symbol`, `Fshg_Qrtr_Num`, `Fshg_Shldng_Catg_Type`, `Fshg_Tot_Shares_Pct`, `Fprh_Shldr_Name` | **Module 6**: Enterprise Shareholding Results | Audits quarterly promoter vs public float distribution, promoter entity holdings, and pledge %. |
| `FACT_CORP_ACTIONS` (`FCAC`), `FACT_CA_DIL_FCTR` (`FCDF`) | `Fcac_Symbol`, `Fcac_Corp_Action_Catg`, `Fcac_Divnd_Prpse`, `Fcac_Rec_Date`, `Fcdf_Price_Adj_Factor` | **Module 7**: Corporate Actions & Disclosures | Renders corporate actions (dividends, bonus issues, splits) and price dilution adjustment factors. |
| `FORENSIC_CASES` (`CASES`) | `case_id`, `target_symbol`, `title`, `lead_officer`, `status`, `priority`, `evidence_json` | **Module 8**: Forensic Case Dossier Workspace | Persists regulatory investigation dossiers, pinned chart/trade evidence, and workflow lifecycle states. |
| `SYS_USERS` (`USERS`), `SYS_AUDIT_LOGS` (`LOGS`) | `username`, `email`, `hashed_password`, `role`, `action`, `details`, `timestamp` | **Module 9**: RBAC Security & Audit Trail | Powers SHA-256 user authentication, session tokens, RBAC roles, and security audit logging. |
