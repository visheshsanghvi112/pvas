# PVASF Targeted Data Request Specification
## Enterprise Production Data Extract Specification for Teradata DBAs & Data Engineers

**Document Version:** 8.0.0 (Empirically Verified Data Request Specification)  
**Target Systems:** Enterprise Teradata Data Warehouse (15 Warehouse Tables: `AGG_SEC_DAY`, `AGG_CLNT_SEC_DAY`, `AGG_PAN_PAIR_DAY`, `DIM_EXCH_CLNT_DTLS`, `DIM_DEP_CLNT_DTLS`, 8 Enterprise Shareholding Tables, 2 Corporate Action Tables, `FORENSIC_CASES`, `SYS_USERS`, `SYS_AUDIT_LOGS`)  
**Target Audience:** Surveillance Product Manager, Lead DBA & Teradata Data Engineering Team  
**Reference Schema Document:** [`PVASF_SCHEMA_REFERENCE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_SCHEMA_REFERENCE.md) (Definitive 19-Table Warehouse Specification)  
**Functional Requirements Reference:** [`BUSINESS_FUNCTIONAL_DATA_REQUIREMENTS.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/BUSINESS_FUNCTIONAL_DATA_REQUIREMENTS.md)

---

## 1. Executive Summary & Extraction Rationale

The **Price-Volume Alert Surveillance Framework (PVASF)** is an institutional-grade market conduct surveillance and anomaly detection system. Audited directly against our core engine (`pv_alert_surveillance.py`) and full application source code (`app/`, `components/`, `backend/routers/`, `backend/db/models.py`), it ingests daily trade aggregates, client demographics, quarterly shareholding distributions, corporate actions, and forensic case dossiers to detect artificial price inflation, volume pump schemes, circular trading rings, and wash trades.

> **Extraction Rule:** Raw `FACT_TRADES` execution streams are **completely omitted from the data request specification**. The Data Engineering team is only required to extract pre-aggregated trade summary tables (`AGG_SEC_DAY`, `AGG_CLNT_SEC_DAY`, `AGG_PAN_PAIR_DAY`), eliminating multi-terabyte raw trade dumps.

### Goal of This Specification
To execute our surveillance algorithms against live production market data without requiring a massive, multi-terabyte warehouse dump, **this document provides an exhaustive, column-by-column breakdown of the exact minimal dataset required across all 10 operational modules.**

By specifying exact Teradata physical column names (`Asd_Close_Price`, `Acsd_Pos_Cont_Val`, `Appd_Pos_Contri`, `Decl_Clnt_Pan`, `Fshg_Tot_Shares_Pct`, `Fcac_Divnd_Prpse`, etc.), data types, nullable rules, sample values, consuming module justifications, and source code files, **this document enables the Data Engineering team to fulfill the data request in a single extract without follow-up requests.**

---

## 2. Master Summary of Required Teradata Warehouse Tables

Our system consumes data across **15 physical Teradata Data Warehouse tables** plus 3 persistence tables (18 Total Extract Tables, 631 Columns):

| Table Name | Short Code | Full Entity Name | Total Columns in Warehouse | Required Columns for System | Consuming System Modules |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `AGG_SEC_DAY` | `ASD` | Security Daily Aggregates & Closing Price | **83** | **15 Columns** | **Module 1**: Scoring Engine & **Module 2**: 180D Chart |
| `AGG_CLNT_SEC_DAY` | `ACSD` | Client Security Daily Aggregates | **31** | **11 Columns** | **Module 3**: Participant Conduct & LTP Push |
| `AGG_PAN_PAIR_DAY` | `APPD` | Counterparty PAN Pair Aggregates | **60** | **10 Columns** | **Module 4**: Counterparty Concentration & Loops |
| `DIM_EXCH_CLNT_DTLS` | `DECL` | Exchange Client Master (PAN Link) | **128** | **14 Columns** | **Module 3, 4 & 5**: Client 360° Identity Resolution |
| `DIM_DEP_CLNT_DTLS` | `DDCL` | Depository Client Master (Demat) | **63** | **8 Columns** | **Module 5**: Client 360° Identity Resolution |
| `FACT_MSTR_SHAREHLDG` | `FMSH` | Shareholding Master Record | **37** | **12 Columns** | **Module 6**: Enterprise Shareholding Structure |
| `FACT_MAIN_SHLDNG` | `FSHG` | Main Shareholding Distribution | **30** | **16 Columns** | **Module 6**: Enterprise Shareholding Structure |
| `FACT_PROM_SHLDR_DTLS` | `FPRH` | Promoter Shareholder Details | **22** | **10 Columns** | **Module 6**: Enterprise Shareholding Structure |
| `FACT_PUB_SHLDR_DTLS` | `FPUH` | Public Shareholder Details | **19** | **8 Columns** | **Module 6**: Enterprise Shareholding Structure |
| `FACT_DVR_SHLDNG` | `FDVR` | Differential Voting Rights | **25** | **5 Columns** | **Module 6**: Enterprise Shareholding Structure |
| `FACT_DR_HOLDING` | `FDRH` | Depository Receipts (ADR/GDR) | **19** | **4 Columns** | **Module 6**: Enterprise Shareholding Structure |
| `FACT_LKDIN_SHLDNG` | `FLKD` | Locked-In Shareholding | **17** | **4 Columns** | **Module 6**: Enterprise Shareholding Structure |
| `FACT_CMP_EXCH_SHLDNG` | `FCES` | Company Exchange Index | **5** | **3 Columns** | **Module 6**: Enterprise Shareholding Structure |
| `FACT_CORP_ACTIONS` | `FCAC` | Corporate Actions & Disclosures | **49** | **15 Columns** | **Module 7**: Announcements & **Module 9**: Dilution |
| `FACT_CA_DIL_FCTR` | `FCDF` | Corporate Action Dilution Factor | **13** | **7 Columns** | **Module 9**: Corporate Actions & Dilution |
| `FORENSIC_CASES` | `CASES` | Forensic Case Dossier Persistence | **13** | **13 Columns** | **Module 10**: User Profiles, RBAC & Cases |
| `SYS_USERS` | `USERS` | Security User Management | **9** | **9 Columns** | **Module 10**: User Profiles, RBAC & Cases |
| `SYS_AUDIT_LOGS` | `LOGS` | Security Audit Trail Logs | **7** | **7 Columns** | **Module 10**: User Profiles, RBAC & Cases |

---

## 3. Module-by-Module Data Field Specifications

### 3.1 Module 1: Alert Scoring & Watchlist Engine
- **Consuming UI / Service**: Executive Surveillance Dashboard (`/`, `components/dashboard/alerts-table.tsx`, `EODSurveillanceService`).
- **Primary Objective**: Evaluates five shortlisting anomaly metrics to calculate a composite scrip risk score ($0 \dots 100$).
- **Primary Source Table**: `AGG_SEC_DAY` (`ASD`)

#### Mathematical Formulas & Metric Bins
1. **Price Rise %**:
   $$\text{Price Rise \%} = \frac{\text{Highest Price}_{15\text{D}} - \text{Price}_{T-180}}{\text{Price}_{T-180}} \times 100$$
   *Bins:* $<15\%$ (0 pts), $15-75\%$ (1 pt), $76-150\%$ (3 pts), $>150\%$ (5 pts).
2. **Price Z-Score**:
   $$Z_{\text{price}} = \frac{\bar{X}_{15\text{D}} - \mu_{180\text{D}}}{\sigma_{180\text{D}}}$$
   *Bins:* $<1.645$ (0 pts), $\ge 1.645$ (1 pt), $\ge 2.33$ (3 pts), $\ge 3.09$ (5 pts).
3. **Volume Z-Score**:
   $$Z_{\text{volume}} = \frac{\bar{X}_{\text{vol}, 15\text{D}} - \mu_{\text{vol}, 180\text{D}}}{\sigma_{\text{vol}, 180\text{D}}}$$
   *Bins:* $<1.645$ (0 pts), $\ge 1.645$ (1 pt), $\ge 2.33$ (3 pts), $\ge 3.09$ (5 pts).
4. **Price Band Persistence**: Counts days where intraday high reached $\ge 90\%$ of upper circuit ceiling (`Asd_Upp_Crct_Price`).
   *Bins:* $0-2$ days (0 pts), $3-5$ days (1 pt), $6-9$ days (3 pts), $\ge 10$ days (5 pts).
5. **180-Day New High Breakout**: Counts days where close/high matched or exceeded the 180-day historical peak.
   *Bins:* $0$ days (0 pts), $1-4$ days (1 pt), $5-9$ days (3 pts), $\ge 10$ days (5 pts).
6. **Composite Weighted Score**:
   $$\text{Score}_{\text{Final}} = \sum_{i=1}^{5} \frac{w_i \times S_i}{5.0}$$

#### Required Column Specifications (`AGG_SEC_DAY`)

| Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Consuming Metric |
| :--- | :--- | :---: | :--- | :--- |
| `Asd_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Scrip ticker symbol; primary group-by key for per-security baseline calculations. |
| `Asd_Date` | `DATE` | **Y** | `'2026-07-28'` | Calendar date filter for 180-day baseline and 15-day observation window. |
| `Asd_Close_Price` | `DECIMAL(15,6)` | **Y** | `1450.50` | **Official 30-minute VWAP Closing Price**; used to compute Price Rise % and Price Z-Score. |
| `Asd_Open_Price` | `DECIMAL(15,6)` | **Y** | `1440.00` | Official Opening Price for daily bar calculations. |
| `Asd_High_Price` | `DECIMAL(15,6)` | **Y** | `1475.00` | Daily High Price; used for circuit band hits and 180-day new high breakouts. |
| `Asd_Low_Price` | `DECIMAL(15,6)` | **Y** | `1435.00` | Daily Low Price for OHLC bar rendering. |
| `Asd_Tot_Qty` | `DECIMAL(20,3)` | **Y** | `154000.00` | Total Daily Traded Volume; computes 15-day average vs 180-day rolling Volume Z-Score. |
| `Asd_Upp_Crct_Price` | `DECIMAL(15,6)` | **Y** | `1520.00` | Upper price band ceiling; evaluates Circuit Band Persistence ($\ge 90\%$ of circuit limit). |
| `Asd_Pos_Cont_Val` | `DECIMAL(20,2)` | **Y** | `125000.00` | Total security-level daily positive LTP price push. |
| `Asd_Neg_Cont_Val` | `DECIMAL(20,2)` | **Y** | `35000.00` | Total security-level daily negative LTP price push. |

---

### 3.2 Module 2: 180-Day Price & Volume Trend Chart
- **Consuming UI / Service**: Interactive dual-axis candlestick & volume chart (`/investigations/[symbol]`, `components/investigation/charts.tsx`).
- **Primary Objective**: Visualizes 180-day price trend, 20D/50D moving averages, daily volume bars, and rolling 15D MA volume lines.
- **Primary Source Table**: `AGG_SEC_DAY` (`ASD`)

#### Required Column Specifications (`AGG_SEC_DAY`)

| Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & UI Component |
| :--- | :--- | :---: | :--- | :--- |
| `Asd_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Security symbol filter for investigation workspace. |
| `Asd_Date` | `DATE` | **Y** | `'2026-07-28'` | X-axis timeline distribution spanning 180 trading days. |
| `Asd_Close_Price` | `DECIMAL(15,6)` | **Y** | `1450.50` | Official 30-min VWAP close trend line, 20D moving average, and 50D moving average. |
| `Asd_Tot_Qty` | `DECIMAL(20,3)` | **Y** | `154000.00` | Daily volume bar chart and 15D rolling average volume line overlay. |

---

### 3.3 Module 3: Participant Conduct Audit & Net LTP Contribution
- **Consuming UI / Service**: Upward/Downward/Net LTP Pushers Bar Chart & Volume Share Table (`/investigations/[symbol]`, `ParticipantAudit`).
- **Primary Objective**: Attributes price increases/decreases to specific buyer/seller PANs and calculates client volume concentration and net P&L.
- **Source Tables**: `AGG_CLNT_SEC_DAY` (`ACSD`) joined with `DIM_EXCH_CLNT_DTLS` (`DECL`)

#### Mathematical Formulas & Metric Logic
1. **Net LTP Contribution Value**:
   $$\text{Net LTP Contribution}_i = \text{Acsd\_Pos\_Cont\_Val}_i - \text{Acsd\_Neg\_Cont\_Val}_i$$
2. **Net LTP Contribution %**:
   $$\text{Net LTP Contribution \%} = \frac{\sum (\text{Acsd\_Pos\_Cont\_Val}_i - \text{Acsd\_Neg\_Cont\_Val}_i \text{ over 15D})}{\text{Total Net LTP Movement of Scrip over 15D}} \times 100$$
3. **Volume Share %**:
   $$\text{Volume Share \%} = \frac{\sum (\text{Client Buy Volume} + \text{Client Sell Volume})}{\text{Total Traded Volume of Scrip over 15D}} \times 100$$

#### Required Column Specifications (`ACSD` + `DECL`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Audit Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `ACSD` | `Acsd_Cmp_Token` | `BIGINT` | **Y** | `1001` | Security company token; identifies scrip. |
| `ACSD` | `Acsd_Clnt_Token` | `BIGINT` | **Y** | `400129` | Client token; joins to `DECL.Decl_Exch_Clnt_Token`. |
| `ACSD` | `Acsd_Date` | `DATE` | **Y** | `'2026-07-28'` | Calendar date filter. |
| `ACSD` | `Acsd_Buy_Qty` | `DECIMAL(20,3)` | **Y** | `12500.00` | Total daily buy volume per client. |
| `ACSD` | `Acsd_Sell_Qty` | `DECIMAL(20,3)` | **Y** | `500.00` | Total daily sell volume per client. |
| `ACSD` | `Acsd_Pos_Cont_Val` | `DECIMAL(15,6)` | **Y** | `4.25` | Positive LTP push contribution value (upward pushes). |
| `ACSD` | `Acsd_Neg_Cont_Val` | `DECIMAL(15,6)` | **Y** | `1.10` | Negative LTP push contribution value (downward pushes). |
| `ACSD` | `Acsd_Wash_Trd_Qty` | `DECIMAL(20,3)` | **Y** | `0.00` | Same-broker wash trade matched quantity. |
| `DECL` | `Decl_Exch_Clnt_Token` | `BIGINT` | **Y** | `400129` | Join token matching `ACSD.Acsd_Clnt_Token`. |
| `DECL` | `Decl_Clnt_Pan` | `VARCHAR(10)` | **Y** | `'AAACB1234F'` | **Client PAN — primary legal entity identifier for participant grouping.** |
| `DECL` | `Decl_Clnt_Name` | `VARCHAR(100)`| **Y** | `'ALPHA HOLDINGS PVT LTD'`| Client full legal name for audit UI. |

---

### 3.4 Module 4: Counterparty Concentration & Circular Trade Explorer
- **Consuming UI / Service**: Counterparty Pair Matrix & Circular Loop Graph (`/investigations/[symbol]`, `CircularNetworkGraph`).
- **Primary Objective**: Identifies synchronized trading between PAN pairs and circular trading loops ($A \rightarrow B \rightarrow C \rightarrow A$).
- **Source Tables**: `AGG_PAN_PAIR_DAY` (`APPD`) joined with `DIM_EXCH_CLNT_DTLS` (`DECL`)

#### Required Column Specifications (`APPD` + `DECL`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Audit Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `APPD` | `Appd_Cmp_Token` | `BIGINT` | **Y** | `1001` | Security company token. |
| `APPD` | `Appd_Buy_Clnt_Token` | `BIGINT` | **Y** | `400129` | Buyer client token. |
| `APPD` | `Appd_Sell_Clnt_Token` | `BIGINT` | **Y** | `400842` | Seller client token. |
| `APPD` | `Appd_Date` | `DATE` | **Y** | `'2026-07-28'` | Calendar date filter. |
| `APPD` | `Appd_Matched_Qty` | `DECIMAL(20,3)` | **Y** | `15000.00` | Traded quantity matched within buyer-seller pair. |
| `APPD` | `Appd_Matched_Val` | `DECIMAL(20,6)` | **Y** | `21750000.00`| Traded value matched within buyer-seller pair. |
| `APPD` | `Appd_Pos_Contri` | `DECIMAL(15,6)` | **Y** | `2.80` | Positive LTP push contribution by PAN pair. |
| `APPD` | `Appd_Neg_Contri` | `DECIMAL(15,6)` | **Y** | `0.45` | Negative LTP push contribution by PAN pair. |

---

### 3.5 Module 5: Client Identity Resolution (Exchange + Depository)
- **Consuming UI / Service**: In-context Client Profile Modal (`/clients`, `Client360Modal.tsx`).
- **Primary Objective**: Cross-references exchange trading accounts (`DECL`) with depository demat accounts (`DDCL`).
- **Source Tables**: `DIM_EXCH_CLNT_DTLS` (`DECL`) and `DIM_DEP_CLNT_DTLS` (`DDCL`)

#### Required Column Specifications (`DECL` + `DDCL`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Profile Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `DECL` | `Decl_Clnt_Pan` | `VARCHAR(10)` | **Y** | `'AAACB1234F'` | Join key to `DDCL.Ddcl_Clnt_Pan`. |
| `DECL` | `Decl_Clnt_Name` | `VARCHAR(100)`| **Y** | `'ALPHA HOLDINGS PVT LTD'`| Client full legal entity name. |
| `DECL` | `Decl_TM_Id` | `VARCHAR(10)` | **Y** | `'TM101'` | Trading Member (Broker) ID. |
| `DECL` | `Decl_Clnt_Stat` | `VARCHAR(10)` | **Y** | `'ACTIVE'` | Account status (`ACTIVE` or `SUSPENDED`). |
| `DDCL` | `Ddcl_Dp_Id` | `VARCHAR(8)` | **Y** | `'IN300123'` | Depository Participant (DP) ID. |
| `DDCL` | `Ddcl_Clnt_Id` | `VARCHAR(8)` | **Y** | `'10495821'` | Beneficiary Owner Demat Account Number. |
| `DDCL` | `Ddcl_Jnt_Hldr1_Pan` | `VARCHAR(10)` | **Y** | `'BBBCB5678G'` | Joint Holder 1 PAN (uncovers connected accounts). |
| `DDCL` | `Ddcl_Poa_Hldr_Pan` | `VARCHAR(10)` | **Y** | `'CCCCB9012H'` | Power of Attorney (POA) Holder PAN. |

---

### 3.6 Module 6: Promoter & Public Shareholding Details
- **Consuming UI / Service**: Shareholding Breakdown Tab (`/investigations/[symbol]`, `ShareholdingTab`).
- **Primary Objective**: Audits quarterly ownership distribution ($Q1\dots Q4$), promoter equity %, promoter pledge %, and public float.
- **Source Tables**: `FACT_MAIN_SHLDNG` (`FSHG`), `FACT_PROM_SHLDR_DTLS` (`FPRH`), `FACT_PUB_SHLDR_DTLS` (`FPUH`).

#### Required Column Specifications (`FSHG` + `FPRH`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Profile Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `FSHG` | `Fshg_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Security symbol. |
| `FSHG` | `Fshg_Qrtr_Num` | `VARCHAR(5)` | **Y** | `'Q4'` | Reporting quarter. |
| `FSHG` | `Fshg_Shldng_Catg_Type`| `SMALLINT` | **Y** | `1` | Category 1 (Promoter) vs Category 2 (Public). |
| `FSHG` | `Fshg_Tot_Shares_Pct` | `DECIMAL(7,4)` | **Y** | `58.45` | Percentage of total share capital held. |
| `FSHG` | `Fshg_Plge_Tot_Shares_Pct`| `DECIMAL(7,4)`| **Y** | `12.50` | Percentage of promoter shares pledged as collateral. |
| `FPRH` | `Fprh_Shldr_Name` | `VARCHAR(100)`| **Y** | `'PROMOTER ENTITY PVT LTD'`| Name of specific promoter entity. |

---

### 3.7 Module 7: Corporate Announcements & News Feed
- **Consuming UI / Service**: Corporate Announcements Feed (`/investigations/[symbol]`, `AnnouncementsTab`).
- **Primary Objective**: Cross-references price/volume surges against official disclosures filed with the exchange in the last 15 days.
- **Source Table**: `FACT_CORP_ACTIONS` (`FCAC`)

#### Required Column Specifications (`FCAC`)

| Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Profile Role |
| :--- | :--- | :---: | :--- | :--- |
| `Fcac_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Security symbol. |
| `Fcac_Corp_Action_Catg` | `VARCHAR(30)` | **Y** | `'DISCLOSURE'` | Announcement category/subject. |
| `Fcac_Divnd_Prpse` | `VARCHAR(250)` | **Y** | `'Quarterly Earnings Results Release'` | Narrative text summary of announcement. |
| `Fcac_Rec_Date` | `DATE` | **Y** | `'2026-07-20'` | Official filing/record timestamp. |

---

### 3.8 Module 8: Financial Results & Fundamental Analysis
- **Consuming UI / Service**: Financials Tab (`/investigations/[symbol]`, `agg_trades.py`).
- **Primary Objective**: Renders quarterly revenue, EBITDA, PAT, EPS, and debt ratios to detect shell-company price manipulation.
- **Source Table**: Warehouse Financial Data Feeds

#### Required Column Specifications

| Column Name | Data Type | Req'd | Sample Value | Business Justification & Profile Role |
| :--- | :--- | :---: | :--- | :--- |
| `Fin_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Security symbol. |
| `Fin_Turnover` | `DECIMAL(20,2)`| **Y** | `450000000.00`| Total quarterly revenue/turnover. |
| `Fin_Ebitda` | `DECIMAL(20,2)`| **Y** | `85000000.00` | Operating profit before interest/taxes. |
| `Fin_Net_Profit` | `DECIMAL(20,2)`| **Y** | `42000000.00` | Net profit after tax (PAT). |
| `Fin_Eps` | `DECIMAL(10,2)`| **Y** | `12.50` | Earnings per share. |

---

### 3.9 Module 9: Corporate Actions & Price Dilution Factors
- **Consuming UI / Service**: Price Chart Ex-Date Markers (`charts.tsx`) & Surveillance Engine Adjuster (`surveillance_service.py`).
- **Primary Objective**: Adjusts historical prices ($T-180$) for splits, bonus issues, and dividends to prevent false-positive alerts.
- **Source Tables**: `FACT_CORP_ACTIONS` (`FCAC`) and `FACT_CA_DIL_FCTR` (`FCDF`)

#### Required Column Specifications (`FCAC` + `FCDF`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Profile Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `FCAC` | `Fcac_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Security symbol. |
| `FCAC` | `Fcac_Corp_Action_Catg` | `VARCHAR(30)` | **Y** | `'BONUS'` | Category (`BONUS`, `SPLIT`, `DIVIDEND`). |
| `FCDF` | `Fcdf_Price_Adj_Factor` | `DECIMAL(7,4)` | **Y** | `0.5000` | **Price dilution adjustment factor (e.g. 0.50 for 1:1 bonus).** |

---

### 3.10 Module 10: User Profiles, RBAC, Risk Controls & Case Management
- **Consuming UI / Service**: System Settings (`/settings`), Forensic Case Dossiers (`/cases`), Auth Security (`security.py`).
- **Primary Objective**: Manages user profiles, role-based access control, officer alphabet scrip allocations, scoring model weights, risk tier cutoffs, forensic case dossiers, and security audit trails.
- **Source Tables**: `SYS_USERS` (`USERS`), `SYS_AUDIT_LOGS` (`LOGS`), `FORENSIC_CASES` (`CASES`).

#### Required Column Specifications (`USERS` + `LOGS` + `CASES`)

| Table | Column Name | Data Type | Req'd | Sample Value | Business Justification & Profile Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `USERS` | `username` | `VARCHAR(50)` | **Y** | `'officer_101'` | Unique user identifier. |
| `USERS` | `role` | `VARCHAR(20)` | **Y** | `'Analyst'` | RBAC user role (`Admin`, `Analyst`, `Viewer`). |
| `LOGS` | `action` | `VARCHAR(100)`| **Y** | `'UPDATE_WEIGHTS'` | Security audit log action type. |
| `CASES` | `case_id` | `VARCHAR(30)` | **Y** | `'CASE-2026-004'` | Forensic investigation dossier ID. |
| `CASES` | `status` | `VARCHAR(20)` | **Y** | `'Open Investigation'`| Lifecycle status (`Draft`, `Open Investigation`, `Closed`). |

---

## 4. Optimized Teradata SQL Extraction Queries

The following targeted ANSI/Teradata SQL queries extract **only the required aggregate data fields** across all 10 modules:

```sql
-- 1. Daily Aggregated OHLCV Extract (Module 1 & Module 2)
SELECT 
    Asd_Symbol AS Ticker,
    Asd_Date AS TradeDate,
    Asd_Open_Price AS OpenPrice,
    Asd_High_Price AS HighPrice,
    Asd_Low_Price AS LowPrice,
    Asd_Close_Price AS ClosePrice,
    Asd_Tot_Qty AS TradedVolume,
    Asd_Upp_Crct_Price AS UpperCircuitLimit,
    Asd_Pos_Cont_Val AS PosLTPContribution,
    Asd_Neg_Cont_Val AS NegLTPContribution,
    (Asd_Pos_Cont_Val - Asd_Neg_Cont_Val) AS NetLTPContribution
FROM AGG_SEC_DAY
WHERE Asd_Date BETWEEN CURRENT_DATE - 365 AND CURRENT_DATE
ORDER BY Asd_Symbol, Asd_Date;

-- 2. Client Security Daily Aggregate Extract (Module 3 - LTP Pushers & Volume Share)
SELECT 
    c.Acsd_Date AS TradeDate,
    c.Acsd_Cmp_Token AS CompanyToken,
    d.Decl_Clnt_Pan AS ClientPAN,
    d.Decl_Clnt_Name AS ClientName,
    c.Acsd_Buy_Qty AS BuyVolume,
    c.Acsd_Sell_Qty AS SellVolume,
    c.Acsd_Pos_Cont_Val AS PositiveLTPContribution,
    c.Acsd_Neg_Cont_Val AS NegativeLTPContribution,
    (c.Acsd_Pos_Cont_Val - c.Acsd_Neg_Cont_Val) AS NetLTPContribution,
    c.Acsd_Wash_Trd_Qty AS WashTradeQty
FROM AGG_CLNT_SEC_DAY c
JOIN DIM_EXCH_CLNT_DTLS d ON c.Acsd_Clnt_Token = d.Decl_Exch_Clnt_Token
WHERE c.Acsd_Date BETWEEN :DateFrom AND :DateTo;

-- 3. Counterparty PAN Pair Extract (Module 4 - Circular Trade Matrix)
SELECT 
    p.Appd_Date AS TradeDate,
    p.Appd_Cmp_Token AS CompanyToken,
    b.Decl_Clnt_Pan AS BuyerPAN,
    s.Decl_Clnt_Pan AS SellerPAN,
    p.Appd_Matched_Qty AS MatchedQty,
    p.Appd_Matched_Val AS MatchedValue,
    p.Appd_Pos_Contri AS PairPositiveLTPContribution,
    p.Appd_Neg_Contri AS PairNegativeLTPContribution,
    (p.Appd_Pos_Contri - p.Appd_Neg_Contri) AS PairNetLTPContribution
FROM AGG_PAN_PAIR_DAY p
JOIN DIM_EXCH_CLNT_DTLS b ON p.Appd_Buy_Clnt_Token = b.Decl_Exch_Clnt_Token
JOIN DIM_EXCH_CLNT_DTLS s ON p.Appd_Sell_Clnt_Token = s.Decl_Exch_Clnt_Token
WHERE p.Appd_Date BETWEEN :DateFrom AND :DateTo;

-- 4. Enterprise Quarterly Shareholding Extract (Module 6)
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

-- 5. Corporate Actions & Dilution Extract (Module 7 & Module 9)
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

| Source Table | Teradata Column Name | Consuming Module | Purpose & Justification | Verified Source File |
| :--- | :--- | :--- | :--- | :--- |
| `AGG_SEC_DAY` (`ASD`) | `Asd_Symbol`, `Asd_Date`, `Asd_Close_Price`, `Asd_Open_Price`, `Asd_High_Price`, `Asd_Low_Price`, `Asd_Tot_Qty`, `Asd_Upp_Crct_Price` | **Module 1**: Scoring Engine & **Module 2**: 180D Trend Chart | Computes 5 shortlisting metrics (Price Z, Volume Z, Band Hits, New Highs, Price Rise) and populates dual-axis candlestick chart. | `app/page.tsx`, `pv_alert_surveillance.py` |
| `AGG_CLNT_SEC_DAY` (`ACSD`) | `Acsd_Cmp_Token`, `Acsd_Clnt_Token`, `Acsd_Date`, `Acsd_Buy_Qty`, `Acsd_Sell_Qty`, `Acsd_Pos_Cont_Val`, `Acsd_Neg_Cont_Val`, `Acsd_Wash_Trd_Qty` | **Module 3**: Participant Audit | Identifies positive/negative LTP price pushers, volume share %, and wash trade totals. | `investigation-workspace.tsx` (`ParticipantAudit`) |
| `AGG_PAN_PAIR_DAY` (`APPD`) | `Appd_Cmp_Token`, `Appd_Buy_Clnt_Token`, `Appd_Sell_Clnt_Token`, `Appd_Date`, `Appd_Matched_Qty`, `Appd_Matched_Val`, `Appd_Pos_Contri` | **Module 4**: Counterparty Explorer | Detects circular trading loops, synchronized counterparty pairs, matched turnover, and pair LTP push. | `investigation-workspace.tsx` (`CircularNetworkGraph`) |
| `DIM_EXCH_CLNT_DTLS` (`DECL`)| `Decl_Exch_Clnt_Token`, `Decl_Clnt_Pan`, `Decl_Clnt_Name`, `Decl_TM_Id`, `Decl_Clnt_Stat` | **Module 3, 4 & 5**: Client 360° Identity Resolution | Translates exchange tokens into Client PANs, legal names, broker IDs, and active/suspended status. | `app/clients/page.tsx`, `Client360Modal.tsx` |
| `DIM_DEP_CLNT_DTLS` (`DDCL`) | `Ddcl_Dp_Id`, `Ddcl_Clnt_Id`, `Ddcl_Jnt_Hldr1_Pan`, `Ddcl_Poa_Hldr_Pan` | **Module 5**: Client 360° Identity Resolution | Cross-references Demat accounts and connected entity networks (Joint Holders, POA). | `app/clients/page.tsx`, `Client360Modal.tsx` |
| `FACT_MAIN_SHLDNG` (`FSHG`), `FACT_PROM_SHLDR_DTLS` (`FPRH`) | `Fshg_Symbol`, `Fshg_Qrtr_Num`, `Fshg_Shldng_Catg_Type`, `Fshg_Tot_Shares_Pct`, `Fprh_Shldr_Name` | **Module 6**: Enterprise Shareholding | Audits quarterly promoter vs public float distribution, promoter entity holdings, and pledge %. | `investigation-workspace.tsx` (`ShareholdingTab`) |
| `FACT_CORP_ACTIONS` (`FCAC`), `FACT_CA_DIL_FCTR` (`FCDF`) | `Fcac_Symbol`, `Fcac_Corp_Action_Catg`, `Fcac_Divnd_Prpse`, `Fcac_Rec_Date`, `Fcdf_Price_Adj_Factor` | **Module 7**: Announcements & **Module 9**: Dilution | Renders corporate disclosures and price dilution adjustment factors ($F_{\text{CDF}}$). | `investigation-workspace.tsx`, `charts.tsx` |
| `FORENSIC_CASES` (`CASES`), `SYS_USERS`, `SYS_AUDIT_LOGS` | `case_id`, `target_symbol`, `username`, `role`, `action`, `details`, `timestamp` | **Module 10**: User Profiles, RBAC & Cases | Powers user profiles, SHA-256 auth, RBAC roles, officer alphabet allocations, case dossiers, and security audit logs. | `app/settings/page.tsx`, `app/cases/page.tsx` |
