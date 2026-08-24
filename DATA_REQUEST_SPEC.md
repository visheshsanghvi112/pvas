# PVASF Enterprise Data Request Specification & Teradata ETL Directives

**Document Version:** 3.5.0 (Exhaustive & Verified Single Source of Truth)  
**Target Architecture:** Enterprise 3-Tier SEBI Data Warehouse (Teradata PDM V10.0 / ANSI SQL Standard)  
**Security Level:** CONFIDENTIAL — Internal Data Engineering & DBA Operations Manual  

---

## 1. Executive Data Extraction Overview

The **Price-Volume Alert Surveillance Framework (PVASF)** requires End-Of-Day (EOD) batch data feeds extracted from the enterprise Teradata data warehouse. Data is pulled across three physical layers:
1. **Dimension Layer**: Registered client exchange accounts (`DIM_EXCH_CLNT_DTLS`), depository accounts (`DIM_DEP_CLNT_DTLS`), and corporate actions (`FACT_CORP_ACTIONS`).
2. **Aggregate Layer (Core Facts)**: Daily security-level aggregates (`AGG_SEC_DAY`), client-level daily summaries (`AGG_CLNT_SEC_DAY`), and paired counterparty trading (`AGG_PAN_PAIR_DAY`).
3. **Historical Baseline & Dilution Layer**: Historical baseline benchmarks (`FACT_PRC_RISE_HIST`), shareholder distribution (`FACT_MAIN_SHLDNG`), and dilution adjustment factors (`FACT_CA_DIL_FCTR`).

> **Architectural Note on `FACT_TRADES` (Out of Scope):**  
> Raw tick-by-tick execution records from `FACT_TRADES` are **NOT REQUESTED** in daily EOD pipelines. All surveillance metrics, price/volume momentum Z-scores, bilateral counterparty pairing, same-broker wash trades, and circular trading rings are computed directly from the daily pre-aggregated warehouse tables (`AGG_SEC_DAY`, `AGG_CLNT_SEC_DAY`, `AGG_PAN_PAIR_DAY`). This eliminates the need to scan billions of microsecond ticks, optimizing database query performance and network bandwidth.

---

## 2. Enterprise Table Inventory & Key Specifications

Below is the complete physical table inventory consumed by the surveillance engine, detailing physical table codes, primary join keys, and operational data frequency.

| Warehouse Physical Table | Code | Primary Key / Index | Primary Join Keys | Feed Horizon & Frequency | System Role in PVASF |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`AGG_SEC_DAY`** | `ASD` | `(Asd_Cmp_Token, Asd_Date)` | `Asd_Symbol` | Daily EOD / Rolling 260 Days | Daily OHLC price bars, official 30-min VWAP close, total traded volume, upper circuit ceiling limit. |
| **`AGG_CLNT_SEC_DAY`** | `ACSD` | `(Acsd_Exch_Clnt_Token, Acsd_Date)` | `Acsd_Cmp_Token`, `Decl_Clnt_Pan` | Daily EOD / Rolling 15 Days | Client buy/sell volumes, buy/sell values, positive/negative LTP push, same-broker wash trade quantities. |
| **`AGG_PAN_PAIR_DAY`** | `APPD` | `(Appd_Exch_Clnt_Token, Appd_Cpty_Exch_Clnt_Token, Appd_Date)` | `Appd_Cmp_Token`, `Appd_Buy_Pan`, `Appd_Sell_Pan` | Daily EOD / Rolling 15 Days | Paired buyer-seller trade concentration, matched turnover, Trade Reversal Ratio (RTR), circular loop cycle detection. |
| **`DIM_EXCH_CLNT_DTLS`** | `DECL` | `Decl_Exch_Clnt_Token` | `Decl_Clnt_Pan`, `Decl_TM_Id` | Master / Bi-Daily CDC | Resolves client exchange tokens to legal identity (PAN, Name, Address, Category, Status). |
| **`DIM_DEP_CLNT_DTLS`** | `DDCL` | `Ddcl_Dep_Clnt_Token` | `Ddcl_Clnt_Pan`, `Ddcl_BP_Id` | Master / Bi-Daily CDC | Beneficiary owner (BO) demat account details, NSDL/CDSL tokens, joint holder cross-references. |
| **`FACT_PRC_RISE_HIST`** | `FPRH` | `(Fprh_Cmp_Token, Fprh_Qrtr_Num)` | `Fprh_Symbol` | Quarterly / EOD Baseline | 180-day baseline prices ($P_{T-180}$), historical price rise benchmarks, baseline volume statistics. |
| **`FACT_CORP_ACTIONS`** | `FCAC` | `Fcac_Cmp_Token` | `Fcac_Symbol`, `Fcac_ISIN` | Daily EOD / Event Driven | Corporate action events (Bonus ratios, Stock splits, Rights issues, Dividends). |
| **`FACT_CA_DIL_FCTR`** | `FCDF` | `(Fcdf_Cmp_Token, Fcdf_Appl_From_Date)`| `Fcdf_Symbol` | Event Driven | Dilution price adjustment factors (`Fcdf_Price_Adj_Factor`) for baseline price normalization. |
| **`FACT_MAIN_SHLDNG`** | `FSHG` | `(Fshg_Cmp_Token, Fshg_Qrtr_Num)` | `Fshg_Symbol` | Quarterly / Event Driven | Promoter equity %, public float, pledged equity %, institutional shareholding breakdown. |

---

## 3. Exhaustive 10-Module Functional Data Field Specifications

### 3.1 Module 1: Alert Scoring & Watchlist Engine
- **Consuming UI / Service**: Executive Watchlist Dashboard (`/`, `components/dashboard/alerts-table.tsx`), Pure-Python Math Engine (`pv_alert_surveillance.py`).
- **Primary Objective**: Computes the 5 quantitative parameter scores (Price Rise %, Price Z-Score, Volume Z-Score, Upper Circuit Band Persistence, 180D New Highs) and generates composite risk scores.
- **Primary Source Table**: `AGG_SEC_DAY` (`ASD`) and `FACT_PRC_RISE_HIST` (`FPRH`).

#### Mathematical Formulas & Metric Logic
1. **Metric 1: 6-Month Absolute Price Rise %**:
   $$\text{Price Rise \%} = \frac{\text{High}_{15\text{D}} - \text{Close}_{T-180}}{\text{Close}_{T-180}} \times 100$$
   - Scoring: $<15\% \to 0$, $15\text{--}75\% \to 1$, $76\text{--}150\% \to 3$, $>150\% \to 5$.
2. **Metric 2: Price Z-Score (Abnormal Return Momentum)**:
   $$\text{Price } Z = \frac{\bar{R}_{15\text{D}} - \mu_{R, 180\text{D}}}{\sigma_{R, 180\text{D}}}$$
   - Measures rolling 15-day average daily Close-to-Close % returns ($\bar{R}_{15\text{D}}$) against 180-day baseline distribution.
   - Scoring: $Z < 1.645 \to 0$, $Z \ge 1.645 \to 1$, $Z \ge 2.33 \to 3$, $Z \ge 3.09 \to 5$.
3. **Metric 3: Volume Z-Score (Abnormal Activity Spike)**:
   $$\text{Volume } Z = \frac{\bar{V}_{15\text{D}} - \mu_{V, 180\text{D}}}{\sigma_{V, 180\text{D}}}$$
   - Measures rolling 15-day average daily volume ($\bar{V}_{15\text{D}}$) against 180-day baseline volume distribution.
   - Scoring: $Z < 1.645 \to 0$, $Z \ge 1.645 \to 1$, $Z \ge 2.33 \to 3$, $Z \ge 3.09 \to 5$.
4. **Metric 4: Upper Circuit Band Persistence**:
   $$\text{Band Hit Days} = \sum_{t=T-14}^{T} \mathbb{I}\left( \frac{\text{High}_t - \text{Close}_{t-1}}{\text{Close}_{t-1}} \ge 0.90 \times \text{Band} \right)$$
   - Scoring: $0\text{--}2\text{d} \to 0$, $3\text{--}5\text{d} \to 1$, $6\text{--}9\text{d} \to 3$, $\ge 10\text{d} \to 5$.
5. **Metric 5: 180-Day New High Breakout**:
   $$\text{New High Days} = \sum_{t=T-14}^{T} \mathbb{I}\left( \text{High}_t > \max_{k=t-180}^{t-1} \text{High}_k \right)$$
   - Scoring: $0\text{d} \to 0$, $1\text{--}4\text{d} \to 1$, $5\text{--}9\text{d} \to 3$, $\ge 10\text{d} \to 5$.
6. **Composite Risk Score Normalization**:
   $$\text{Score}_{\text{Final}} = \sum_{i=1}^{5} w_i \times \left( \frac{\text{Score}_i}{5.0} \right) \quad \in [0.0, 100.0]$$
   - Default Weights: $w_1 = 25\%, w_2 = 20\%, w_3 = 25\%, w_4 = 15\%, w_5 = 15\%$. Watchlist cutoff threshold: $\ge 15.0$.

#### Required Column Specifications (`AGG_SEC_DAY` + `FACT_PRC_RISE_HIST`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Profile Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `ASD` | `Asd_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Primary security identifier for group-by operations. |
| `ASD` | `Asd_Date` | `DATE` | **Y** | `'2026-07-28'` | Trading calendar date key for 180D baseline and 15D window. |
| `ASD` | `Asd_Close_Price` | `DECIMAL(15,6)` | **Y** | `1450.50` | **Official 30-min VWAP Closing Price** for Price Rise % & Price Z-Score. |
| `ASD` | `Asd_High_Price` | `DECIMAL(15,6)` | **Y** | `1480.00` | Daily peak high price for 180-day new high breakout checks. |
| `ASD` | `Asd_Low_Price` | `DECIMAL(15,6)` | **Y** | `1420.00` | Daily low price for OHLC candlestick rendering. |
| `ASD` | `Asd_Open_Price` | `DECIMAL(15,6)` | **Y** | `1425.00` | Daily open price. |
| `ASD` | `Asd_Tot_Qty` | `DECIMAL(20,3)` | **Y** | `154000.00` | Daily traded volume for Volume Z-Score calculations. |
| `ASD` | `Asd_Upper_Band_Prc` | `DECIMAL(15,6)` | **Y** | `1480.00` | Daily upper circuit ceiling limit for Band Persistence check ($\ge 90\%$). |
| `FPRH`| `Fprh_Base_Prc_T180` | `DECIMAL(15,6)` | **Y** | `540.00` | Baseline closing price at $T-180$ for Price Rise % calculation. |
| `FPRH`| `Fprh_Vol_Mean_180` | `DECIMAL(20,3)` | **Y** | `25000.00` | 180-day mean baseline volume ($\mu_{\text{vol}}$). |
| `FPRH`| `Fprh_Vol_Std_180` | `DECIMAL(20,3)` | **Y** | `8500.00` | 180-day volume standard deviation ($\sigma_{\text{vol}}$). |

---

### 3.2 Module 2: 180-Day Price & Volume Trend Chart
- **Consuming UI / Service**: Interactive dual-axis candlestick & volume chart (`/analysis/[symbol]`, `components/investigation/investigation-workspace.tsx`).
- **Primary Objective**: Visualizes 180-day price trend, 20D/50D moving averages, daily volume bars, and rolling 15D MA volume lines.
- **Primary Source Table**: `AGG_SEC_DAY` (`ASD`).

#### Required Column Specifications (`AGG_SEC_DAY`)

| Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & UI Component |
| :--- | :--- | :---: | :--- | :--- |
| `Asd_Symbol` | `VARCHAR(10)` | **Y** | `'ALPHATECH'` | Security symbol filter for investigation workspace. |
| `Asd_Date` | `DATE` | **Y** | `'2026-07-28'` | X-axis timeline distribution spanning 180 trading days. |
| `Asd_Close_Price` | `DECIMAL(15,6)` | **Y** | `1450.50` | Official 30-min VWAP close trend line, 20D moving average, and 50D moving average. |
| `Asd_Tot_Qty` | `DECIMAL(20,3)` | **Y** | `154000.00` | Daily volume bar chart and 15D rolling average volume line overlay. |

---

### 3.3 Module 3: Participant Conduct Audit & Net LTP Contribution
- **Consuming UI / Service**: Upward/Downward/Net LTP Pushers Bar Chart & Volume Share Table (`/analysis/[symbol]`, `ParticipantAudit`).
- **Primary Objective**: Attributes price increases/decreases to specific buyer/seller PANs and calculates client volume concentration and net Mark-to-Market P&L.
- **Source Tables**: `AGG_CLNT_SEC_DAY` (`ACSD`) joined with `DIM_EXCH_CLNT_DTLS` (`DECL`).

#### Mathematical Formulas & Metric Logic
1. **Net LTP Contribution Value**:
   $$\text{Net LTP Contribution}_i = \text{Acsd\_Pos\_Cont\_Val}_i - \text{Acsd\_Neg\_Cont\_Val}_i$$
2. **Net LTP Contribution %**:
   $$\text{Net LTP Contribution \%} = \frac{\sum (\text{Acsd\_Pos\_Cont\_Val}_i - \text{Acsd\_Neg\_Cont\_Val}_i \text{ over 15D})}{\max\left(\text{Total Net LTP Movement of Scrip over 15D}, \sum \text{PosContVal}, 1.0\right)} \times 100$$
3. **Volume Share %**:
   $$\text{Volume Share \%} = \frac{\sum (\text{Client Buy Volume} + \text{Client Sell Volume})}{\max\left(\text{Total Traded Volume of Scrip over 15D}, 1.0\right)} \times 100$$
4. **Mark-to-Market (MTM) PnL**:
   $$\text{Net PnL} = \text{Acsd\_Sell\_Tot\_Val} - \text{Acsd\_Buy\_Tot\_Val} + \left( (\text{Acsd\_Buy\_Tot\_Qty} - \text{Acsd\_Sell\_Tot\_Qty}) \times P_{\text{Latest Close}} \right)$$

#### Required Column Specifications (`ACSD` + `DECL`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Audit Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `ACSD` | `Acsd_Cmp_Token` | `BIGINT` | **Y** | `1001` | Security company token; identifies scrip. |
| `ACSD` | `Acsd_Exch_Clnt_Token` | `BIGINT` | **Y** | `400129` | Client token; joins to `DECL.Decl_Exch_Clnt_Token`. |
| `ACSD` | `Acsd_Date` | `DATE` | **Y** | `'2026-07-28'` | Calendar date filter. |
| `ACSD` | `Acsd_Buy_Tot_Qty` | `DECIMAL(20,3)` | **Y** | `12500.00` | Total daily buy volume per client. |
| `ACSD` | `Acsd_Sell_Tot_Qty` | `DECIMAL(20,3)` | **Y** | `500.00` | Total daily sell volume per client. |
| `ACSD` | `Acsd_Buy_Tot_Val` | `DECIMAL(20,2)` | **Y** | `18125000.00`| Total daily buy turnover value for cash-flow PnL. |
| `ACSD` | `Acsd_Sell_Tot_Val` | `DECIMAL(20,2)` | **Y** | `740000.00` | Total daily sell turnover value for cash-flow PnL. |
| `ACSD` | `Acsd_Pos_Cont_Val` | `DECIMAL(15,6)` | **Y** | `4.25` | Positive LTP push contribution value (upward pushes). |
| `ACSD` | `Acsd_Neg_Cont_Val` | `DECIMAL(15,6)` | **Y** | `1.10` | Negative LTP push contribution value (downward pushes). |
| `ACSD` | `Acsd_Buy_Wash_Qty` | `DECIMAL(20,3)` | **Y** | `0.00` | Same-broker wash trade matched quantity. |
| `DECL` | `Decl_Exch_Clnt_Token` | `BIGINT` | **Y** | `400129` | Join token matching `ACSD.Acsd_Exch_Clnt_Token`. |
| `DECL` | `Decl_Clnt_Pan` | `VARCHAR(25)` | **Y** | `'AAACB1234F'` | **Client PAN — primary legal entity identifier for participant grouping.** |
| `DECL` | `Decl_Clnt_Name` | `VARCHAR(250)`| **Y** | `'ALPHA HOLDINGS PVT LTD'`| Client full legal name for audit UI. |

---

### 3.4 Module 4: Counterparty Concentration, Wash Trades & Circular Trade Explorer
- **Consuming UI / Service**: Counterparty Pair Matrix, Reversal Ratios & Circular Loop Graph (`/analysis/[symbol]`).
- **Primary Objective**: Identifies synchronized trading between PAN pairs, same-broker internal wash crosses, and circular loops ($A \rightarrow B \rightarrow C \rightarrow A$).
- **Source Tables**: `AGG_PAN_PAIR_DAY` (`APPD`) joined with `DIM_EXCH_CLNT_DTLS` (`DECL`).

#### Mathematical Formulas & Metric Logic
1. **Trade Reversal Ratio (RTR)**:
   $$\text{RTR} = \left[ \frac{2 \times \min(V_{A \to B}, V_{B \to A})}{V_{A \to B} + V_{B \to A}} \right] \times 100$$
   - Quantifies the proportion of shares passed back and forth between two accounts without genuine beneficial ownership transfer.
2. **Circular Trading Loops (DFS Cycle Finding Algorithm)**:
   - Directed graph cycle finding of lengths 3 to 5 ($A \to B \to C \to A$) with canonical rotation deduplication.
   - Rotated bottleneck volume: $V_{\text{bottleneck}} = \min(e_1, e_2, \dots, e_k)$.
3. **Same-Broker Wash Trade Flag**:
   $$\text{Is Wash} = \begin{cases} 1 & \text{if } \text{Appd\_Exch\_TM\_Token} = \text{Appd\_Cpty\_Exch\_TM\_Token} \text{ and } > 0 \\ 0 & \text{otherwise} \end{cases}$$

#### Required Column Specifications (`APPD` + `DECL`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Audit Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `APPD` | `Appd_Cmp_Token` | `BIGINT` | **Y** | `1001` | Security company token. |
| `APPD` | `Appd_Exch_Clnt_Token` | `BIGINT` | **Y** | `400129` | Buyer client token. |
| `APPD` | `Appd_Cpty_Exch_Clnt_Token` | `BIGINT` | **Y** | `400842` | Seller client token. |
| `APPD` | `Appd_Exch_TM_Token` | `BIGINT` | **Y** | `101` | Buyer Trading Member (Broker) Token. |
| `APPD` | `Appd_Cpty_Exch_TM_Token` | `BIGINT` | **Y** | `101` | Seller Trading Member (Broker) Token for wash trade detection. |
| `APPD` | `Appd_Date` | `DATE` | **Y** | `'2026-07-28'` | Calendar date filter. |
| `APPD` | `Appd_Buy_Tot_Qty` | `DECIMAL(20,3)` | **Y** | `15000.00` | Traded quantity matched within buyer-seller pair. |
| `APPD` | `Appd_Buy_Tot_Val` | `DECIMAL(20,2)` | **Y** | `21750000.00`| Traded value matched within buyer-seller pair. |
| `APPD` | `Appd_Pos_Contri` | `DECIMAL(15,6)` | **Y** | `2.80` | Positive LTP push contribution by PAN pair. |
| `APPD` | `Appd_High_Hit_Cnt` | `BIGINT` | **Y** | `3` | Number of upper circuit limit hits contributed by pair. |
| `APPD` | `Appd_Algo_Flag` | `SMALLINT` | **Y** | `0` | CTCL algo execution flag (`0=Manual`, `1=Algo`). |

---

### 3.5 Module 5: Client Identity Resolution (Exchange + Depository)
- **Consuming UI / Service**: Client 360° Drawer (`backend/routers/clients.py`).
- **Primary Objective**: Cross-references exchange trading accounts (`DECL`) with depository demat accounts (`DDCL`).
- **Source Tables**: `DIM_EXCH_CLNT_DTLS` (`DECL`) and `DIM_DEP_CLNT_DTLS` (`DDCL`).

#### Required Column Specifications (`DECL` + `DDCL`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Profile Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `DECL` | `Decl_Clnt_Pan` | `VARCHAR(25)` | **Y** | `'AAACB1234F'` | Join key to `DDCL.Ddcl_Clnt_Pan`. |
| `DECL` | `Decl_Clnt_Name` | `VARCHAR(250)`| **Y** | `'ALPHA HOLDINGS PVT LTD'`| Client full legal entity name. |
| `DECL` | `Decl_TM_Id` | `VARCHAR(15)` | **Y** | `'TM101'` | Trading Member (Broker) ID. |
| `DECL` | `Decl_Clnt_Stat` | `SMALLINT` | **Y** | `1` | Account status (`1=Active`, `2=Suspended`). |
| `DDCL` | `Ddcl_BP_Id` | `CHAR(16)` | **Y** | `'IN300123'` | Depository Participant (DP) ID. |
| `DDCL` | `Ddcl_Clnt_Id` | `CHAR(16)` | **Y** | `'10495821'` | Beneficiary Owner Demat Account Number. |
| `DDCL` | `Ddcl_Thrd_Hldr_Pan` | `VARCHAR(30)`| **Y** | `'BBBCB5678G'` | Third Holder PAN (uncovers connected accounts). |

---

### 3.6 Module 6: Promoter & Public Shareholding Details
- **Consuming UI / Service**: Enterprise Shareholding Audit (`FACT_MAIN_SHLDNG`).
- **Primary Objective**: Audits quarterly ownership distribution ($Q1\dots Q4$), promoter equity %, promoter pledge %, and public float.
- **Source Tables**: `FACT_MAIN_SHLDNG` (`FSHG`), `FACT_PROM_SHLDR_DTLS` (`FPRH`), `FACT_PUB_SHLDR_DTLS` (`FPUH`).

#### Required Column Specifications (`FSHG` + `FPRH`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Profile Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `FSHG` | `Fshg_Symbol` | `CHAR(10)` | **Y** | `'ALPHATECH'` | Security symbol. |
| `FSHG` | `Fshg_Qrtr_Num` | `CHAR(4)` | **Y** | `'Q4'` | Reporting quarter. |
| `FSHG` | `Fshg_Shldng_Catg_Type`| `BYTEINT` | **Y** | `1` | Category 1 (Promoter) vs Category 2 (Public). |
| `FSHG` | `Fshg_Tot_Shares_Pct` | `NUMERIC(10,2)`| **Y** | `58.45` | Percentage of total share capital held. |
| `FSHG` | `Fshg_Plge_Tot_Shares_Pct`| `NUMERIC(10,2)`| **Y** | `12.50` | Percentage of promoter shares pledged as collateral. |
| `FPRH` | `Fprh_Shldr_Name` | `VARCHAR(200)`| **Y** | `'PROMOTER ENTITY PVT LTD'`| Name of specific promoter entity. |

---

### 3.7 Module 7: Corporate Announcements & News Feed
- **Consuming UI / Service**: Corporate Action Disclosures (`/analysis/[symbol]`).
- **Primary Objective**: Cross-references price/volume surges against official disclosures filed with the exchange in the last 15 days.

---

### 3.8 Module 8: Clearing Member & Broker Conduct Monitor
- **Consuming UI / Service**: Broker Conduct Explorer (`TradeMatchesRepository`).
- **Primary Objective**: Monitors clearing members and brokers executing concentrated volumes or same-broker wash trades.

---

### 3.9 Module 9: Corporate Action Dilution Adjustment
- **Consuming UI / Service**: Price Dilution Adjuster (`FACT_CA_DIL_FCTR`).
- **Primary Objective**: Adjusts historical prices ($T-180$) for splits, bonus issues, and dividends to prevent false-positive alerts.
- **Source Tables**: `FACT_CORP_ACTIONS` (`FCAC`) and `FACT_CA_DIL_FCTR` (`FCDF`).

#### Required Column Specifications (`FCAC` + `FCDF`)

| Table | Teradata Column Name | Data Type | Req'd | Sample Value | Business Justification & Profile Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `FCAC` | `Fcac_Symbol` | `CHAR(10)` | **Y** | `'ALPHATECH'` | Security symbol. |
| `FCAC` | `Fcac_Corp_Action_Catg` | `VARCHAR(30)` | **Y** | `'BONUS'` | Category (`BONUS`, `SPLIT`, `DIVIDEND`). |
| `FCDF` | `Fcdf_Price_Adj_Factor` | `NUMERIC(15,6)`| **Y** | `0.500000` | Price dilution adjustment factor (e.g. 0.50 for 1:1 bonus). |

---

### 3.10 Module 10: System Storage (Users, Audit Logs, Cases & Settings)
- **Consuming UI / Service**: System Settings (`/settings`), Forensic Case Dossiers (`/cases`), Auth Security (`security.py`).
- **Primary Objective**: Manages user profiles, PBKDF2 password encryption, 3-tier RBAC, scoring model weights, risk tier cutoffs, forensic case dossiers with JSON evidence, and security audit trails.
- **Source Tables**: `SYS_USERS`, `SYS_AUDIT_LOGS`, `FORENSIC_CASES`, `MODEL_SETTINGS`.

#### Required Column Specifications (`SYS_USERS` + `SYS_AUDIT_LOGS` + `FORENSIC_CASES` + `MODEL_SETTINGS`)

| Table | Column Name | Data Type | Req'd | Sample Value | Business Justification & Profile Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `SYS_USERS` | `username` | `VARCHAR(50)` | **Y** | `'vishesh_admin'` | Unique user account login identifier. |
| `SYS_USERS` | `hashed_password` | `VARCHAR(255)`| **Y** | `'pbkdf2_sha256$100000$...'`| PBKDF2 encrypted password (100k rounds + 16B salt). |
| `SYS_USERS` | `role` | `VARCHAR(20)` | **Y** | `'Admin'` | RBAC user role (`Admin`, `Analyst`, `Viewer`). |
| `SYS_AUDIT_LOGS` | `action` | `VARCHAR(100)`| **Y** | `'UPDATE_WEIGHTS'` | Security audit log action type. |
| `FORENSIC_CASES` | `case_id` | `VARCHAR(50)` | **Y** | `'CASE-2026-ALPHATECH-001'` | Forensic investigation dossier ID. |
| `FORENSIC_CASES` | `evidence_json` | `TEXT` | **Y** | `'[{"metric":"Price Rise"}]'`| Serialized JSON evidence attachments. |
| `FORENSIC_CASES` | `status` | `VARCHAR(30)` | **Y** | `'Open Investigation'`| Lifecycle status (`Draft`, `Open Investigation`, `Pending Action`, `Closed`). |
| `MODEL_SETTINGS` | `score_cutoff` | `FLOAT` | **Y** | `15.0` | SEBI framework alert trigger threshold score cutoff. |

---

## 4. Production Teradata Extraction ANSI SQL Queries

### 4.1 Query 1: Daily Aggregated OHLCV & Baseline Extract (Module 1 & Module 2)

```sql
SELECT 
    asd.Asd_Symbol             AS target_symbol,
    asd.Asd_Date               AS trade_date,
    asd.Asd_Open_Price         AS open_price,
    asd.Asd_Close_Price        AS close_price,       -- Official 30-Min VWAP Closing Price
    asd.Asd_High_Price         AS high_price,
    asd.Asd_Low_Price          AS low_price,
    asd.Asd_Tot_Qty            AS total_traded_volume,
    asd.Asd_Tot_Val            AS total_traded_value,
    asd.Asd_Upper_Band_Prc     AS upper_circuit_limit,
    fprh.Fprh_Base_Prc_T180    AS base_price_t180,
    fprh.Fprh_Vol_Mean_180     AS volume_mean_180,
    fprh.Fprh_Vol_Std_180      AS volume_std_180
FROM AGG_SEC_DAY asd
INNER JOIN FACT_PRC_RISE_HIST fprh
    ON asd.Asd_Symbol = fprh.Fprh_Symbol
    AND asd.Asd_Date = fprh.Fprh_Rec_Date
WHERE asd.Asd_Date BETWEEN CURRENT_DATE - 180 AND CURRENT_DATE
ORDER BY asd.Asd_Symbol ASC, asd.Asd_Date ASC;
```

---

### 4.2 Query 2: Client Security Daily Aggregate Extract (Module 3 - LTP Pushers & PnL)

```sql
SELECT
    acsd.Acsd_Date              AS trade_date,
    asd.Asd_Symbol              AS target_symbol,
    acsd.Acsd_Exch_Clnt_Token   AS exch_client_token,
    decl.Decl_Clnt_Pan          AS client_pan,
    decl.Decl_Clnt_Name         AS client_name,
    decl.Decl_TM_Id             AS trading_member_id,
    acsd.Acsd_Buy_Tot_Qty       AS buy_volume,
    acsd.Acsd_Sell_Tot_Qty      AS sell_volume,
    acsd.Acsd_Buy_Tot_Val       AS buy_value,
    acsd.Acsd_Sell_Tot_Val      AS sell_value,
    acsd.Acsd_Pos_Cont_Val      AS positive_ltp_push_value,
    acsd.Acsd_Neg_Cont_Val      AS negative_ltp_push_value,
    acsd.Acsd_Buy_Wash_Qty      AS wash_trade_quantity
FROM AGG_CLNT_SEC_DAY acsd
INNER JOIN AGG_SEC_DAY asd
    ON acsd.Acsd_Cmp_Token = asd.Asd_Cmp_Token
    AND acsd.Acsd_Date = asd.Asd_Date
LEFT JOIN DIM_EXCH_CLNT_DTLS decl
    ON acsd.Acsd_Exch_Clnt_Token = decl.Decl_Exch_Clnt_Token
WHERE acsd.Acsd_Date BETWEEN CURRENT_DATE - 15 AND CURRENT_DATE
ORDER BY asd.Asd_Symbol ASC, acsd.Acsd_Pos_Cont_Val DESC;
```

---

### 4.3 Query 3: Counterparty PAN Pair Extract (Module 4 - Circular Trade & Wash Cross Matrix)

```sql
SELECT
    appd.Appd_Date                  AS trade_date,
    asd.Asd_Symbol                  AS target_symbol,
    buyer_decl.Decl_Clnt_Pan        AS buyer_pan,
    buyer_decl.Decl_Clnt_Name       AS buyer_name,
    seller_decl.Decl_Clnt_Pan       AS seller_pan,
    seller_decl.Decl_Clnt_Name      AS seller_name,
    appd.Appd_Exch_TM_Token         AS buyer_tm_token,
    appd.Appd_Cpty_Exch_TM_Token    AS seller_tm_token,
    CASE 
        WHEN appd.Appd_Exch_TM_Token = appd.Appd_Cpty_Exch_TM_Token AND appd.Appd_Exch_TM_Token > 0 
        THEN 1 ELSE 0 
    END                             AS same_broker_wash_flag,
    appd.Appd_Buy_Tot_Qty           AS matched_trade_quantity,
    appd.Appd_Buy_Tot_Val           AS matched_trade_value,
    appd.Appd_Pos_Contri            AS pairwise_ltp_push_contri,
    appd.Appd_High_Hit_Cnt          AS upper_circuit_hits_count,
    appd.Appd_Algo_Flag             AS algo_execution_flag
FROM AGG_PAN_PAIR_DAY appd
INNER JOIN AGG_SEC_DAY asd
    ON appd.Appd_Cmp_Token = asd.Asd_Cmp_Token
    AND appd.Appd_Date = asd.Asd_Date
LEFT JOIN DIM_EXCH_CLNT_DTLS buyer_decl
    ON appd.Appd_Exch_Clnt_Token = buyer_decl.Decl_Exch_Clnt_Token
LEFT JOIN DIM_EXCH_CLNT_DTLS seller_decl
    ON appd.Appd_Cpty_Exch_Clnt_Token = seller_decl.Decl_Exch_Clnt_Token
WHERE appd.Appd_Date BETWEEN CURRENT_DATE - 15 AND CURRENT_DATE
ORDER BY appd.Appd_Buy_Tot_Qty DESC;
```

---

### 4.4 Query 4: Enterprise Quarterly Shareholding Extract (Module 6)

```sql
SELECT 
    m.Fshg_Symbol              AS target_symbol,
    m.Fshg_Qrtr_Num            AS quarter_number,
    m.Fshg_Shldng_Date         AS report_date,
    m.Fshg_Shldng_Catg_Type    AS category_type,
    m.Fshg_Tot_Shares_Pct      AS total_share_percentage,
    m.Fshg_Plge_Tot_Shares_Pct  AS pledged_share_percentage
FROM FACT_MAIN_SHLDNG m
WHERE m.Fshg_Symbol = :TargetSymbol
ORDER BY m.Fshg_Shldng_Date DESC;
```

---

### 4.5 Query 5: Corporate Actions & Dilution Adjustment Feed (Module 9)

```sql
SELECT
    fcac.Fcac_Symbol               AS target_symbol,
    fcac.Fcac_ISIN                 AS isin_code,
    fcac.Fcac_Corp_Action_Catg     AS action_category,
    fcac.Fcac_Ex_Split_Date        AS ex_action_date,
    fcdf.Fcdf_Price_Adj_Factor     AS dilution_adjustment_factor,
    fcdf.Fcdf_Appl_From_Date       AS valid_from_date,
    fcdf.Fcdf_Appl_To_Date         AS valid_to_date
FROM FACT_CORP_ACTIONS fcac
INNER JOIN FACT_CA_DIL_FCTR fcdf
    ON fcac.Fcac_Symbol = fcdf.Fcdf_Symbol
WHERE fcdf.Fcdf_Appl_To_Date >= CURRENT_DATE - 180
ORDER BY fcac.Fcac_Symbol ASC, fcdf.Fcdf_Appl_From_Date DESC;
```

---

## 5. Exhaustive Table-to-Module Data Mapping Reference

| Source Table | Teradata Column Name | Consuming Module | Purpose & Justification | Verified Source File |
| :--- | :--- | :--- | :--- | :--- |
| `AGG_SEC_DAY` (`ASD`) | `Asd_Symbol`, `Asd_Date`, `Asd_Close_Price`, `Asd_Open_Price`, `Asd_High_Price`, `Asd_Low_Price`, `Asd_Tot_Qty`, `Asd_Upper_Band_Prc` | **Module 1**: Scoring Engine & **Module 2**: 180D Trend Chart | Computes 5 shortlisting metrics (Price Z, Volume Z, Band Hits, New Highs, Price Rise) and populates dual-axis candlestick chart. | [`app/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/page.tsx), [`pv_alert_surveillance.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/pv_alert_surveillance.py) |
| `AGG_CLNT_SEC_DAY` (`ACSD`) | `Acsd_Cmp_Token`, `Acsd_Exch_Clnt_Token`, `Acsd_Date`, `Acsd_Buy_Tot_Qty`, `Acsd_Sell_Tot_Qty`, `Acsd_Buy_Tot_Val`, `Acsd_Sell_Tot_Val`, `Acsd_Pos_Cont_Val`, `Acsd_Neg_Cont_Val`, `Acsd_Buy_Wash_Qty` | **Module 3**: Participant Audit | Identifies positive/negative LTP price pushers, volume share %, cash-flow PnL, and wash trade totals. | [`app/analysis/[symbol]/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/analysis/%5Bsymbol%5D/page.tsx), [`surveillance_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/surveillance_service.py) |
| `AGG_PAN_PAIR_DAY` (`APPD`) | `Appd_Cmp_Token`, `Appd_Exch_Clnt_Token`, `Appd_Cpty_Exch_Clnt_Token`, `Appd_Exch_TM_Token`, `Appd_Cpty_Exch_TM_Token`, `Appd_Date`, `Appd_Buy_Tot_Qty`, `Appd_Buy_Tot_Val`, `Appd_Pos_Contri`, `Appd_Algo_Flag` | **Module 4**: Counterparty Explorer | Detects circular trading loops, synchronized counterparty pairs, RTR ratios, same-broker wash trades, and matched turnover. | [`app/analysis/[symbol]/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/analysis/%5Bsymbol%5D/page.tsx), [`trade_matches_repo.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/repositories/trade_matches_repo.py) |
| `DIM_EXCH_CLNT_DTLS` (`DECL`)| `Decl_Exch_Clnt_Token`, `Decl_Clnt_Pan`, `Decl_Clnt_Name`, `Decl_TM_Id`, `Decl_Clnt_Stat` | **Module 3, 4 & 5**: Client 360° Identity Resolution | Translates exchange tokens into Client PANs, legal names, broker IDs, and active/suspended status. | [`app/analysis/[symbol]/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/analysis/%5Bsymbol%5D/page.tsx), [`backend/routers/clients.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/routers/clients.py) |
| `DIM_DEP_CLNT_DTLS` (`DDCL`) | `Ddcl_BP_Id`, `Ddcl_Clnt_Id`, `Ddcl_Thrd_Hldr_Pan`, `Ddcl_Poa_Enbld_Indc` | **Module 5**: Client 360° Identity Resolution | Cross-references Demat accounts and connected entity networks (Joint Holders, POA). | [`app/analysis/[symbol]/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/analysis/%5Bsymbol%5D/page.tsx), [`backend/routers/clients.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/routers/clients.py) |
| `FACT_MAIN_SHLDNG` (`FSHG`), `FACT_PROM_SHLDR_DTLS` (`FPRH`) | `Fshg_Symbol`, `Fshg_Qrtr_Num`, `Fshg_Shldng_Catg_Type`, `Fshg_Tot_Shares_Pct`, `Fprh_Shldr_Name` | **Module 6**: Enterprise Shareholding | Audits quarterly promoter vs public float distribution, promoter entity holdings, and pledge %. | [`app/analysis/[symbol]/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/analysis/%5Bsymbol%5D/page.tsx), [`surveillance_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/surveillance_service.py) |
| `FACT_CORP_ACTIONS` (`FCAC`), `FACT_CA_DIL_FCTR` (`FCDF`) | `Fcac_Symbol`, `Fcac_Corp_Action_Catg`, `Fcac_Divnd_Prpse`, `Fcac_Rec_Date`, `Fcdf_Price_Adj_Factor` | **Module 7**: Announcements & **Module 9**: Dilution | Renders corporate disclosures and price dilution adjustment factors ($F_{\text{CDF}}$). | [`app/analysis/[symbol]/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/analysis/%5Bsymbol%5D/page.tsx), [`surveillance_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/surveillance_service.py) |
| `FORENSIC_CASES`, `SYS_USERS`, `SYS_AUDIT_LOGS`, `MODEL_SETTINGS` | `case_id`, `target_symbol`, `username`, `role`, `action`, `details`, `timestamp`, `score_cutoff` | **Module 10**: User Profiles, RBAC, Cases & Settings | Powers user profiles, PBKDF2 auth, RBAC roles, case dossiers, model settings, and security audit logs. | [`app/settings/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/settings/page.tsx), [`app/cases/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/cases/page.tsx) |

---

## 6. Verification & Data Quality Assertion Rules

1. **Non-Null Identity Verification**: Every record extracted from `AGG_CLNT_SEC_DAY` and `AGG_PAN_PAIR_DAY` must resolve to a valid legal client PAN (`Decl_Clnt_Pan`). If a PAN is missing from Teradata `DECL`, populate with fallback token code `PAN_UNAVAILABLE`.
2. **VWAP Closing Price Rule**: `Asd_Close_Price` must always use the official exchange 30-minute Volume Weighted Average Price (VWAP) close, NOT the last tick price.
3. **Date Format Standard**: All date columns must adhere strictly to ISO-8601 `YYYY-MM-DD` format.
4. **Primary Key Uniqueness**: `AGG_SEC_DAY` extracts must be strictly unique on `(Asd_Symbol, Asd_Date)`. Duplicate rows must be rejected during ETL staging.
5. **No Microsecond Tick Requirement**: Under no circumstances should ETL pipelines attempt to stream unaggregated `FACT_TRADES` for daily surveillance scoring; all processing is strictly aggregate-driven.
