# Price-Volume Alert Surveillance Framework (PVASF)
## Master System Architecture, Algorithmic Engine & Technical Manual

**Document Version:** 3.0.0  
**Target Systems:** Enterprise Teradata Data Warehouse (`FACT_TRADES`, `DIM_EXCH_CLNT_DTLS`, `DIM_DEP_CLNT_DTLS`) | FastAPI Surveillance Engine | Next.js Enterprise Compliance Suite  
**Scope:** Complete Architectural Specification, Scoring Algorithms, Database Schemas, User Workflows, Data Lineage, RBAC Security, and Regulatory Compliance Audit  

---

## Table of Contents
1. [Executive Summary & Regulatory Scope](#1-executive-summary--regulatory-scope)
2. [Top-Level Architecture & Layered Boundary Pattern](#2-top-level-architecture--layered-boundary-pattern)
3. [EOD Data Processing & Transformation Pipeline](#3-eod-data-processing--transformation-pipeline)
4. [PVASF Core Surveillance Engine & Scoring Algorithms](#4-pvasf-core-surveillance-engine--scoring-algorithms)
5. [Participant Conduct Audit & Algorithmic Intelligence](#5-participant-conduct-audit--algorithmic-intelligence)
6. [Complete Database Schemas & Entity-Relationship Models](#6-complete-database-schemas--entity-relationship-models)
7. [End-to-End Data Lineage](#7-end-to-end-data-lineage)
8. [UI/UX Blueprint & Single Continuous Workspace Paradigm](#8-uiux-blueprint--single-continuous-workspace-paradigm)
9. [API Service Reference Matrix](#9-api-service-reference-matrix)
10. [Role-Based Access Control (RBAC) & PII Masking Matrix](#10-role-based-access-control-rbac--pii-masking-matrix)
11. [Engineering Gap Analysis & Regulatory Compliance Audit](#11-engineering-gap-analysis--regulatory-compliance-audit)

---

## 1. Executive Summary & Regulatory Scope

The **Price-Volume Alert Surveillance Framework (PVASF)** is an enterprise market conduct platform engineered to detect artificial price inflation, liquidity pump schemes, and market manipulation across listed securities. The framework combines a 180-day historical baseline with a 15-day observation window, applying five statistical anomaly metrics to shortlist high-risk scrips for regulatory investigation.

### Scope Boundary (Artificial Price Inflation Focus)
The framework evaluates right-tail statistical metrics: Price Rise %, Price Z-Score ($Z \ge 1.645$), Volume Z-Score ($Z \ge 1.645$), Upper Circuit Band Persistence, and 180-Day New High Breakouts. The active implementation focuses on **artificial price inflation and coordinated upward manipulation**. Downward manipulation (deflation/short-selling schemes) is architecturally supported by the underlying schema but is out of scope for current scoring parameters.

---

## 2. Top-Level Architecture & Layered Boundary Pattern

The platform enforces a **Strictly Layered Boundary Pattern**. Database schemas, raw warehouse surrogate keys, and ORM models are completely isolated behind repository interfaces. Business services operate exclusively on domain entities, ensuring that switching underlying database engines (e.g. SQLite local development to Teradata JDBC/ODBC production) requires **zero changes** to API schemas, domain logic, or UI components.

### 2.1 System Topology Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS 15 SURVEILLANCE FRONTEND                         │
│   (App Router | Tailwind CSS | Recharts | React Query | Role-Based Nav)          │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ REST / HTTPS (JSON Payloads)
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                           FASTAPI SURVEILLANCE ENGINE                            │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ API ROUTER LAYER (Request Validation, Pydantic v2 Serialization, RBAC)     │  │
│  └─────────────────────────────────────┬──────────────────────────────────────┘  │
│                                        │ Calls Domain Services                   │
│  ┌─────────────────────────────────────▼──────────────────────────────────────┐  │
│  │ SERVICE LAYER (Business Logic, Anomaly Algorithms, Domain Coordination)     │  │
│  └─────────────────────────────────────┬──────────────────────────────────────┘  │
│                                        │ Interacts via Repository Interfaces     │
│  ┌─────────────────────────────────────▼──────────────────────────────────────┐  │
│  │ REPOSITORY LAYER (Data Access, Query Compilation, Cache Management)        │  │
│  └─────────────────────────────────────┬──────────────────────────────────────┘  │
└────────────────────────────────────────┼─────────────────────────────────────────┘
                                         │ SQLAlchemy ORM / Connection Pool
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                      DATA WAREHOUSE / STORAGE LAYER                              │
│   [ SQLite (Local Dev / Test)  |  Teradata Data Warehouse (Production / ODBC) ]  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Ownership & Boundaries

| Architecture Layer | Primary Responsibility | Input Boundary | Output Boundary | Forbidden Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **UI Component Layer** | Visual rendering, user interactions, chart animations, client-side state. | User Clicks, HTTP Responses | API Requests | **Must NOT** access SQL, ORM models, or raw warehouse surrogate tokens. |
| **API Router Layer** | HTTP verb mapping, parameter parsing, Pydantic validation, RBAC checks. | HTTP Requests | JSON Responses / HTTP Exceptions | **Must NOT** execute database queries directly or contain business calculations. |
| **Service Layer** | Domain workflows, score aggregation, anomaly logic, multi-repository coordination. | Business Parameters / DTOs | Domain Model Results | **Must NOT** depend on HTTP frameworks (FastAPI request objects) or raw database engines. |
| **Repository Layer** | Data access, ANSI SQL compilation, ORM mapping, connection lifecycle. | Repository Method Invocations | ORM Entities / Aggregates | **Must NOT** contain UI formatting or FastAPI HTTP exceptions. |
| **Database Engine** | Persistence, indexing, analytical window calculations, transactional integrity. | SQL Queries | Relational Tuple Sets | N/A |

---

## 3. EOD Data Processing & Transformation Pipeline

When end-of-day (EOD) trade feeds or historical market extracts arrive, the data flows through a 5-stage transformation pipeline from raw SQL tables to shortlisted risk alerts:

```
                  ┌─────────────────────────────────────────┐
                  │          RAW DATAWAREHOUSE TABLES       │
                  │   FACT_TRADES (31,200 Trade Matches)    │
                  │   DIM_EXCH_CLNT_DTLS (500 Accounts)     │
                  │   DIM_DEP_CLNT_DTLS (500 Demat Accts)   │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       1. DAILY OHLCV AGGREGATION        │
                  │  Derived from trade-level match data:   │
                  │  • Open  = Price of FIRST trade of day  │
                  │  • High  = MAX(Ftrd_Trd_Price) of day   │
                  │  • Low   = MIN(Ftrd_Trd_Price) of day   │
                  │  • Close = Price of LAST trade of day   │
                  │  • Volume = SUM(Ftrd_Trd_Qty) of day    │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │     2. 180-DAY HISTORICAL BASELINE      │
                  │  Filters last 180 trading days (T-180)  │
                  │  Calculates Mean(Close), StdDev(Close)  │
                  │  Calculates Mean(Vol), StdDev(Vol)      │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │     3. FIVE CORE METRIC CALCULATIONS    │
                  │  • Price Rise % (vs T-180 Close)        │
                  │  • Price Z-Score (vs 180d Baseline)     │
                  │  • Volume Z-Score (vs 180d Baseline)    │
                  │  • Band Hit Days (Count >= 90% Circuit) │
                  │  • 180-Day New High Breakout Count      │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │      4. WEIGHTED COMPOSITE SCORING      │
                  │  Score = (0.25 * PriceRise) +           │
                  │          (0.25 * PriceZ)    +           │
                  │          (0.20 * VolumeZ)   +           │
                  │          (0.15 * BandHits)  +           │
                  │          (0.15 * NewHighs)              │
                  │  Transformed to 0..100 Scale            │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │    5. RISK SEVERITY & WATCHLIST TRIAGE  │
                  │  Score >= 75.0  --> HIGH Risk (OPEN)    │
                  │  Score >= 60.0  --> MEDIUM (REVIEW)     │
                  │  Score < 60.0   --> LOW (NORMAL)        │
                  └─────────────────────────────────────────┘
```

---

## 4. PVASF Core Surveillance Engine & Scoring Algorithms

The framework shortlists high-risk scrips by evaluating 5 core statistical parameters over a 15-day observation window against a 180-day baseline ($T-180$). Each parameter awards a score of **0, 1, 3, or 5 points**.

### 4.1 Parameter 1: Price Rise Percentage

Compares the highest price in the last 15 days against the closing price at $T-180$:

$$\text{Price Rise \%} = \frac{\max(\text{High}_{15d}) - \text{Close}_{T-180}}{\text{Close}_{T-180}} \times 100$$

| Price Rise Range | Awarded Score |
| :--- | :---: |
| $< 15\%$ | **0** |
| $15.0\% - 75.0\%$ | **1** |
| $75.1\% - 150.0\%$ | **3** |
| $> 150.0\%$ | **5** |

---

### 4.2 Parameter 2: Price Z-Score

Evaluates whether average closing price during the last 15 days is statistically anomalous compared to the 180-day baseline distribution:

$$Z_{\text{Price}} = \frac{\mu_{P,15d} - \mu_{P,180d}}{\sigma_{P,180d}}$$

| Price Z-Score Threshold | Awarded Score | Statistical Significance |
| :--- | :---: | :--- |
| $Z < 1.645$ | **0** | Normal variance ($< 95\%$ confidence) |
| $1.645 \le Z < 2.33$ | **1** | Statistically significant ($95\%$ confidence) |
| $2.33 \le Z < 3.09$ | **3** | Highly anomalous ($99\%$ confidence) |
| $Z \ge 3.09$ | **5** | Extreme outlier ($99.9\%$ confidence) |

---

### 4.3 Parameter 3: Volume Z-Score

Evaluates whether average daily volume during the last 15 days is statistically anomalous compared to the 180-day baseline:

$$Z_{\text{Volume}} = \frac{\mu_{V,15d} - \mu_{V,180d}}{\sigma_{V,180d}}$$

| Volume Z-Score Threshold | Awarded Score | Liquidity Assessment |
| :--- | :---: | :--- |
| $Z < 1.645$ | **0** | Normal volume |
| $1.645 \le Z < 2.33$ | **1** | Elevated volume burst |
| $2.33 \le Z < 3.09$ | **3** | Heavy volume surge |
| $Z \ge 3.09$ | **5** | Extreme liquidity spike |

---

### 4.4 Parameter 4: Price Band Persistence (Circuit Hits)

Counts the number of trading days in the last 15 days where the daily High price reached at least **90% of the upper circuit limit**:

$$\text{Band Hit Count} = \sum_{t=T-15}^{T} \mathbb{I}\left(\text{High}_t \ge 0.90 \times \text{UpperCircuit}_t\right)$$

| Band Hit Count (Last 15 Days) | Awarded Score |
| :--- | :---: |
| $0 - 2\text{ days}$ | **0** |
| $3 - 5\text{ days}$ | **1** |
| $6 - 9\text{ days}$ | **3** |
| $\ge 10\text{ days}$ | **5** |

---

### 4.5 Parameter 5: 180-Day New High Breakouts

Counts the number of times the stock created a new 180-day high during the previous 15 trading days:

$$\text{New High Count} = \sum_{t=T-15}^{T} \mathbb{I}\left(\text{High}_t > \max_{j=t-180}^{t-1}(\text{High}_j)\right)$$

| New High Count (Last 15 Days) | Awarded Score |
| :--- | :---: |
| $0\text{ days}$ | **0** |
| $1 - 4\text{ days}$ | **1** |
| $5 - 9\text{ days}$ | **3** |
| $\ge 10\text{ days}$ | **5** |

---

### 4.6 Weighted Composite Score & Risk Triage

The weighted composite score is computed using configurable weights ($w_1 \dots w_5$ summing to $1.0$):

$$\text{Composite Score Raw} = (w_1 \cdot S_1) + (w_2 \cdot S_2) + (w_3 \cdot S_3) + (w_4 \cdot S_4) + (w_5 \cdot S_5)$$

$$\text{PVASF Final Risk Score} = \left(\frac{\text{Composite Score Raw}}{5.0}\right) \times 100$$

**Default Weight Allocation:**  
- $w_1$ (Price Rise %) = **0.25**
- $w_2$ (Price Z-Score) = **0.25**
- $w_3$ (Volume Z-Score) = **0.20**
- $w_4$ (Band Persistence) = **0.15**
- $w_5$ (New Highs) = **0.15**

**Watchlist Triage Thresholds:**  
- **HIGH Risk**: Score $\ge 75.0$ (Immediate investigation mandatory)
- **MEDIUM Risk**: $60.0 \le \text{Score} < 75.0$ (Surveillance review queue)
- **LOW Risk**: Score $< 60.0$ (Normal trading pattern)

---

## 5. Participant Conduct Audit & Algorithmic Intelligence

### 5.1 LTP Contribution % (Price Pushers)
Measures the percentage of positive price ticks driven by aggressive buy trades for each client PAN:

$$\text{LTP Contribution \% (PAN}_i) = \frac{\sum \text{Qty of Buy-Aggressive Trades by PAN}_i \text{ with LTP\_Chng = '+'}}{\text{Total Qty of All Upward Trades in 15d}} \times 100$$

### 5.2 Volume Share %
Measures each PAN's share of total traded volume during the observation window:

$$\text{Volume Share \% (PAN}_i) = \frac{\sum (\text{Buy Qty}_i + \text{Sell Qty}_i)}{\text{Total Traded Volume in 15d}} \times 100$$

### 5.3 Counterparty Pairs & Circular Loop Detection
Evaluates trade match concentration between buyer PAN ($A$) and seller PAN ($B$). A high pairwise concentration ($> 20\%$) indicates synchronized trading. Multi-node circular rotation ($A \rightarrow B \rightarrow C \rightarrow A$) is detected by traversing counterparty volume graphs.

### 5.4 Wash Trade Audit
Trade executions are audited for wash trade indicators:
- `Ftrd_Same_Broker_Wash_Flag = 1`: Buy and sell orders matched within the same Trading Member (Broker).
- `Ftrd_Diff_Broker_Wash_Flag = 1`: Pre-arranged wash trade executed across different brokers.

### 5.5 Algorithmic Order Book Intelligence (CTCL)
Audits execution channels (`Ftrd_Buy_CTCL_Algo_Flag`):
- **Manual vs DMA vs Algo Ratio**: Tracks algorithmic participation volume.
- **Order Book Depth Snapshot**: Renders Best Bid/Ask prices (`Ftrd_Best_Bid_Price`, `Ftrd_Best_Ask_Price`) and pending order queue counts at the exact trade execution millisecond.

---

## 6. Complete Database Schemas & Entity-Relationship Models

The official PVASF framework is built on a **3-Tier Enterprise SEBI Data Warehouse Architecture**:
1. **Dimension Layer (`DECL`, `DDCL`):** Legal entity demographics, PAN resolution, depository demat accounts, joint holders, and Power of Attorney (POA) hubs.
2. **Fact Execution Layer (`FACT_TRADES`, `FMSH`, `FCAC`):** Millisecond trade match logs, order IDs (`Ftrd_Buy_Ord_Num`), same-broker wash trade flags, and legal evidence in court proceedings. (*Note: `FACT_TRADES` is retained for legal evidence and microsecond execution logs, but omitted from daily baseline OHLC/Close calculations*).
3. **Aggregate Layer (`AGG_SEC_DAY`, `AGG_CLNT_SEC_DAY`, `AGG_PAN_PAIR_DAY`):** Pre-calculated daily security closing prices (30-min VWAP), OHLC bars, client volume shares, LTP price push contributions (`Pos_Cont_Val`), daily wash trade totals, and buyer-seller PAN pair concentrations.

```
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     AGG_SEC_DAY (ASD)         │               │   DIM_EXCH_CLNT_DTLS (DECL)   │
├───────────────────────────────┤               ├───────────────────────────────┤
│ Asd_Symbol (PK/Index)         │               │ Decl_Exch_Clnt_Token (PK)     │
│ Asd_Date (PK/Index)           │               │ Decl_Clnt_Token               │
│ Asd_Close_Price (VWAP Close)  │   FK Join     │ Decl_Clnt_Pan (PAN Key) ──────┼──────┐
│ Asd_Open, High, Low Prices    │  (Client      │ Decl_Clnt_Name                │      │
│ Asd_Tot_Qty, Asd_Tot_Wash_Qty │   Token)      │ Decl_TM_Id (Broker ID)        │      │
└───────────────────────────────┘               │ Decl_City, Decl_State         │      │
                                                └───────────────▲───────────────┘      │
┌───────────────────────────────┐                               │                      │ Join by
│     FACT_TRADES (FTRD)        │                               │                      │ Client
├───────────────────────────────┤               ┌───────────────┴───────────────┐      │ PAN
│ Ftrd_Trd_Num (PK)             │               │   DIM_DEP_CLNT_DTLS (DDCL)    │      │
│ Ftrd_Symbol, Ftrd_Trd_Date    │               ├───────────────────────────────┤      │
│ Ftrd_Trd_Tmst (Timestamp)     ├───────────────► Ddcl_Clnt_Token (PK)          │      │
│ Ftrd_Trd_Price, Ftrd_Trd_Qty  │               │ Ddcl_Clnt_Pan (PAN Key) ◄─────┴──────┘
│ Ftrd_Buy_Exch_Clnt_Token ─────┤               │ Ddcl_Dp_Id (NSDL/CDSL DP)     │
│ Ftrd_Sell_Exch_Clnt_Token ────┘               │ Ddcl_Clnt_Id (Demat Acct)     │
│ Ftrd_Same_Broker_Wash_Flag    │               │ Ddcl_Jnt_Hldr1_Pan            │
└───────────────────────────────┘               │ Ddcl_Poa_Hldr_Pan             │
                                                └───────────────────────────────┘
```

---

### Table 1: `FACT_TRADES` (`FTRD`) — 123 Total Columns (Enterprise Data Warehouse PDM V10.0)

Stores every trade execution match on the exchange.

#### Base Columns (27 Columns — Returned in List Responses)

| # | Column Name | Data Type | Description |
|---|---|---|---|
| 1 | `Ftrd_Trd_Date` | `DATE` | Calendar date of trade execution. |
| 2 | `Ftrd_Trd_Num` | `INTEGER` | Primary Key — Unique exchange trade match number. |
| 3 | `Ftrd_Symbol` | `VARCHAR` | NSE scrip symbol (e.g., `ALPHATECH`). |
| 4 | `Ftrd_Series` | `VARCHAR` | Market series code (`EQ`, `BE`). |
| 5 | `Ftrd_Sub_Seg_Code` | `INTEGER` | Sub-segment: `1`=EQ, `2`=Futures, `3`=Call, `4`=Put. |
| 6 | `Ftrd_Sess_Type` | `INTEGER` | Session: `1`=Pre-Open, `2`=Normal Market, `3`=Closing Auction. |
| 7 | `Ftrd_Trd_Tmst` | `TIMESTAMP` | Execution timestamp (millisecond precision). |
| 8 | `Ftrd_Trd_Price` | `DECIMAL` | Executed trade price. |
| 9 | `Ftrd_Trd_Qty` | `DECIMAL` | Executed trade quantity. |
| 10 | `Ftrd_Trd_Val` | `DECIMAL` | Executed trade value (Price × Qty). |
| 11 | `Ftrd_Buy_Exch_TM_Token` | `INTEGER` | Buying Trading Member (Broker) token. |
| 12 | `Ftrd_Buy_Exch_Clnt_Token` | `INTEGER` | Buying Client exchange token (FK → `DECL`). |
| 13 | `Ftrd_Sell_Exch_TM_Token` | `INTEGER` | Selling Trading Member (Broker) token. |
| 14 | `Ftrd_Sell_Exch_Clnt_Token` | `INTEGER` | Selling Client exchange token (FK → `DECL`). |
| 15 | `Ftrd_Buy_Acct_Type` | `INTEGER` | Buy account type: `1`=Client, `2`=Proprietary, `3`=Institutional. |
| 16 | `Ftrd_Sell_Acct_Type` | `INTEGER` | Sell account type: `1`=Client, `2`=Proprietary, `3`=Institutional. |
| 17 | `Ftrd_Same_Broker_Wash_Flag` | `INTEGER` | `1` if buy & sell client matched within same broker. |
| 18 | `Ftrd_Diff_Broker_Wash_Flag` | `INTEGER` | `1` if wash trade detected across different brokers. |
| 19 | `Ftrd_Buy_CTCL_Algo_Flag` | `INTEGER` | Buy side algo flag: `0`=Algo, `1`=Non-Algo. |
| 20 | `Ftrd_Sell_CTCL_Algo_Flag` | `INTEGER` | Sell side algo flag: `0`=Algo, `1`=Non-Algo. |
| 21 | `Ftrd_Buy_CTCL_Inet_DMA_Flag`| `INTEGER` | Buy side DMA / internet order flag. |
| 22 | `Ftrd_Sell_CTCL_Inet_DMA_Flag`| `INTEGER` | Sell side DMA / internet order flag. |
| 23 | `Ftrd_LTP_Chng_Indc` | `VARCHAR` | LTP change direction: `+` (up), `-` (down), `=` (unchanged). |
| 24 | `Ftrd_Last_Trd_Price` | `DECIMAL` | Last traded price prior to this trade match. |
| 25 | `Ftrd_Init_Side_Type` | `INTEGER` | Initiator side: `1`=Buy aggressive, `2`=Sell aggressive. |
| 26 | `Ftrd_Trd_Mod_Flag` | `INTEGER` | `1` if trade record was modified post-match. |
| 27 | `Ftrd_Trd_Can_Flag` | `INTEGER` | `1` if trade match was cancelled. |

#### Detail Columns (70 Columns — Order Book Depth & Order Attributes)

Key detail columns include: `Ftrd_Buy_Ord_Num`, `Ftrd_Sell_Ord_Num`, `Ftrd_Buy_Ord_Tmst`, `Ftrd_Sell_Ord_Tmst`, `Ftrd_Buy_Ord_Price`, `Ftrd_Sell_Ord_Price`, `Ftrd_Buy_IP_Addr`, `Ftrd_Sell_IP_Addr`, `Ftrd_Best_Bid_Price`, `Ftrd_Best_Ask_Price`, `Ftrd_Best_Bid_Qty`, `Ftrd_Best_Ask_Qty`, `Ftrd_Bid_Pdg_Ord_Cnt`, `Ftrd_Ask_Pdg_Ord_Cnt`, `FTRD_BUY_ALGO_ID`, `FTRD_SELL_ALGO_ID`.

---

### Table 2: `DIM_EXCH_CLNT_DTLS` (`DECL`) — 128 Total Columns (Enterprise Data Warehouse PDM V10.0)

Exchange client dimension table linking trading tokens to legal entities via PAN.

| # | Column Name | Data Type | Description |
|---|---|---|---|
| 1 | `Decl_Exch_Clnt_Token` | `INTEGER` | Primary Key — Unique exchange client token (FK target from `FTRD`). |
| 2 | `Decl_Clnt_Token` | `INTEGER` | Global internal client token. |
| 3 | `Decl_TM_Id` | `VARCHAR` | Trading Member (Broker) ID. |
| 4 | `Decl_Clnt_Id` | `VARCHAR` | Unique client code assigned by broker. |
| 5 | `Decl_Clnt_Pan` | `VARCHAR` | **Client Permanent Account Number (PAN) — Primary Join Key to DDCL.** |
| 6 | `Decl_Clnt_Name` | `VARCHAR` | Full legal client name. |
| 7 | `Decl_Clnt_Catg_Type` | `INTEGER` | Client category: `1`=Individual, `2`=Corporate, `3`=FII. |
| 8 | `Decl_Clnt_Stat` | `INTEGER` | Account status: `1`=Active, `2`=Suspended. |
| 9 | `Decl_City` | `VARCHAR` | Registered city. |
| 10 | `Decl_State` | `VARCHAR` | Registered state. |
| 11 | `Decl_Cntry` | `VARCHAR` | Registered country. |

---

### Table 3: `DIM_DEP_CLNT_DTLS` (`DDCL`) — 63 Total Columns (Enterprise Data Warehouse PDM V10.0)

Depository client dimension table storing demat accounts (NSDL / CDSL), joint holders, and Power of Attorney flags.

| # | Column Name | Data Type | Description |
|---|---|---|---|
| 1 | `Ddcl_Clnt_Token` | `INTEGER` | Primary Key — Depository client token. |
| 2 | `Ddcl_Clnt_Pan` | `VARCHAR` | **Client PAN — Join key from DECL.** |
| 3 | `Ddcl_Dp_Id` | `VARCHAR` | Depository Participant ID (NSDL / CDSL). |
| 4 | `Ddcl_Clnt_Id` | `VARCHAR` | Demat account client ID. |
| 5 | `Ddcl_Dp_Type_Desc` | `VARCHAR` | Depository type description (`NSDL`, `CDSL`). |
| 6 | `Ddcl_Jnt_Hldr1_Pan` | `VARCHAR` | Joint Holder 1 PAN. |
| 7 | `Ddcl_Poa_Hldr_Pan` | `VARCHAR` | Power of Attorney (PoA) holder PAN. |
| 8 | `Ddcl_Acct_Stat_Desc` | `VARCHAR` | Demat account status (`Active`, `Frozen`). |

---

### Tables 4-11: Quarterly Shareholding Results Tables (8 Tables, 174 Columns)
- **`FACT_MSTR_SHAREHLDG` (`FMSH`, 37 fields):** Shareholding Master
- **`FACT_MAIN_SHLDNG` (`FSHG`, 30 fields):** Main Shareholding Record
- **`FACT_PROM_SHLDR_DTLS` (`FPRH`, 22 fields):** Promoter Shareholder Details
- **`FACT_PUB_SHLDR_DTLS` (`FPUH`, 19 fields):** Public Shareholder Details
- **`FACT_DVR_SHLDNG` (`FDVR`, 25 fields):** Differential Voting Rights Details
- **`FACT_DR_HOLDING` (`FDRH`, 19 fields):** Depository Receipts Details
- **`FACT_LKDIN_SHLDNG` (`FLKD`, 17 fields):** Locked-In Shareholding
- **`FACT_CMP_EXCH_SHLDNG` (`FCES`, 5 fields):** Company Exchange Shareholding Details

---

### Tables 12-13: Corporate Actions & Dilution Factors (2 Tables, 62 Columns)
- **`FACT_CORP_ACTIONS` (`FCAC`, 49 fields):** Corporate Actions & Announcements
- **`FACT_CA_DIL_FCTR` (`FCDF`, 13 fields):** Corporate Actions Dilution Factor

---

## Complete Physical Teradata Warehouse Matrix (13 Tables, 551 Columns)

| Table | Short Name | Full Column Count | Domain / Category |
|---|---|---|---|
| `FACT_TRADES` | FTRD | **123** | Trade Execution Facts |
| `DIM_EXCH_CLNT_DTLS` | DECL | **128** | Exchange Client Master |
| `DIM_DEP_CLNT_DTLS` | DDCL | **63** | Depository Client Master |
| `FACT_MSTR_SHAREHLDG` | FMSH | **37** | Shareholding Master |
| `FACT_MAIN_SHLDNG` | FSHG | **30** | Main Shareholding Record |
| `FACT_PROM_SHLDR_DTLS` | FPRH | **22** | Promoter Shareholder Details |
| `FACT_PUB_SHLDR_DTLS` | FPUH | **19** | Public Shareholder Details |
| `FACT_DVR_SHLDNG` | FDVR | **25** | Differential Voting Rights |
| `FACT_DR_HOLDING` | FDRH | **19** | Depository Receipts |
| `FACT_LKDIN_SHLDNG` | FLKD | **17** | Locked-In Shareholding |
| `FACT_CMP_EXCH_SHLDNG` | FCES | **5** | Company Exchange Shareholding Index |
| `FACT_CORP_ACTIONS` | FCAC | **49** | Corporate Actions & Announcements |
| `FACT_CA_DIL_FCTR` | FCDF | **13** | Corporate Actions Dilution Factor |
| `FORENSIC_CASES` | CASES | **13** | Forensic Case Dossier Persistence |
| `SYS_USERS` | USERS | **9** | Security User Management & RBAC |
| `SYS_AUDIT_LOGS` | LOGS | **7** | Immutable Security Audit Trail |
| **Grand Total** | **16 Tables** | **580 Columns** | **Enterprise Physical Data Warehouse & Persistence Engine** |

## 7. End-to-End Data Lineage

```
[ FACT_TRADES (97 Cols) ] ────┐
[ DIM_EXCH_CLNT_DTLS (44) ] ──┼──► [ FactTradesRepository ] ──► [ EODSurveillanceService ]
[ DIM_DEP_CLNT_DTLS (45)  ] ──┘                                        │
                                                                       ▼
                                                          Computes 5 Metric Scores
                                                          Calculates LTP Pushers & PnL
                                                                       │
                                                                       ▼
                                                          [ FastAPI Router Layer ]
                                                                       │
                                                                       ▼
                                                          JSON Payloads (REST API)
                                                                       │
                                                                       ▼
                                                          [ Next.js UI Workspace ]
```

---

## 8. UI/UX Blueprint & Single Continuous Workspace Paradigm

The application enforces a **3-Click Investigation Journey** within a **Single Continuous Workspace** (`/investigations/[symbol]`):

```
                         DASHBOARD / WATCHLIST
                                   │
                                   │ (Select Stock: ALPHATECH)
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    ALPHATECH SINGLE INVESTIGATION WORKSPACE                      │
│                           (/investigations/ALPHATECH)                            │
│                                                                                  │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────────┐ │
│ │  1. OVERVIEW │  2. METRICS  │ 3. 180d CHART│  4. TRADES   │ 5. PARTICIPANTS  │ │
│ └──────────────┴──────────────┴──────────────┴──────────────┴──────────────────┘ │
│                                                                                  │
│   • Clicking any Trade Match  --> Launches Order Book Depth Inspector Modal      │
│   • Clicking any Client PAN   --> Launches Client 360° Profile Modal (DECL+DDCL) │
│   • Clicking Case Dossier     --> Saves Pinned Evidence & Notes to Workspace    │
│ └──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. API Service Reference Matrix

| API Endpoint | Verb | Input Parameters | Output Payloads / DTO | Purpose |
| :--- | :---: | :--- | :--- | :--- |
| `/api/v1/surveillance/health` | `GET` | None | `{"status": "ONLINE", "spec": "..."}` | System operational & spec alignment check. |
| `/api/v1/surveillance/watchlist` | `GET` | `search` | `List[ScripScorecardDTO]` | Executive dashboard risk-ranked watchlist. |
| `/api/v1/surveillance/scrips` | `GET` | `search` | `List[ScripScorecardDTO]` | Summary of active scrips and alert states. |
| `/api/v1/surveillance/scrip/{symbol}` | `GET` | `symbol`, `days=180` | `ScripDetailDTO` | 180-day historical OHLCV chart, scorecards, announcements & shareholding. |
| `/api/v1/surveillance/scrip/{symbol}/participants` | `GET` | `symbol` | `ParticipantSummaryDTO` | Participant conduct audit: LTP pushers, volume share, PnL & wash trades. |
| `/api/v1/surveillance/scrip/{symbol}/shareholding-breakdown` | `GET` | `symbol` | `DWBISShareholdingBreakdownDTO` | Full Enterprise Data Warehouse quarter-by-quarter shareholding trends (`FSHG`, `FPRH`). |
| `/api/v1/surveillance/scrip/{symbol}/corporate-actions` | `GET` | `symbol` | `List[DWBISCorpActionDTO]` | Official Regulatory corporate actions & price dilution factors (`FCAC`, `FCDF`). |
| `/api/v1/surveillance/weights` | `POST` | `{"weights": {...}, "threshold": X}` | `UpdatedWeightsDTO` | Dynamically updates scoring weights $w_1 \dots w_5$ & alert triage threshold. |
| `/api/v1/surveillance/upload-eod` | `POST` | `file` (CSV multipart) | `{"status": "SUCCESS", "records": N}` | Uploads and processes new EOD trade feed CSV files. |
| `/api/v1/trades/` | `GET` | `symbol`, `date_from`, `date_to`, `wash_flag`, `algo_flag`, `page`, `page_size` | `PaginatedTradesDTO` | Filtered & paginated trade matches from `FACT_TRADES`. |
| `/api/v1/trades/stats/daily` | `GET` | None | `List[DailySymbolStatsDTO]` | Daily trade count & value metrics for volume heatmaps. |
| `/api/v1/trades/analysis/wash-trades` | `GET` | `date_from`, `date_to` | `WashTradeSummaryDTO` | Same-broker wash trade analytics & counterparty pair matrix. |
| `/api/v1/trades/analysis/algo-breakdown` | `GET` | `date_from`, `date_to` | `AlgoBreakdownDTO` | HFT CTCL vs manual trade volume breakdown. |
| `/api/v1/trades/{date}/{num}` | `GET` | `date`, `num` | `FactTradeDetail` | Order book depth snapshot & execution timestamps. |
| `/api/v1/clients/exchange` | `GET` | `pan`, `tm_id`, `clnt_id`, `name`, `catg_type`, `stat`, `page` | `PaginatedExchClientsDTO` | List exchange client accounts from `DIM_EXCH_CLNT_DTLS` (`DECL`). |
| `/api/v1/clients/exchange/search` | `GET` | `q` (PAN/Name/ID), `limit` | `List[DimExchClntBase]` | Full-text client account search (`DECL`). |
| `/api/v1/clients/exchange/{token}` | `GET` | `token` | `DimExchClntDetail` | Detailed exchange account profile. |
| `/api/v1/clients/depository` | `GET` | `pan`, `dp_id`, `clnt_id`, `name`, `page` | `PaginatedDepClientsDTO` | List depository demat accounts from `DIM_DEP_CLNT_DTLS` (`DDCL`). |
| `/api/v1/clients/depository/{token}` | `GET` | `token` | `DimDepClntDetail` | Detailed depository demat account profile. |
| `/api/v1/clients/profile/{token}` | `GET` | `token` | `Client360DTO` | In-context Client 360° profile (`DECL` + `DDCL` cross-reference). |
| `/api/v1/clients/pan/{pan}` | `GET` | `pan` | `Client360DTO` | Client 360° lookup by PAN for identity resolution modals. |
| `/api/v1/cases/` | `GET`, `POST` | `status`, `target_symbol` | `List[ForensicCaseDTO]` | List or create forensic case dossiers (`FORENSIC_CASES`). |
| `/api/v1/cases/{case_id}` | `GET`, `PUT`, `DELETE` | `case_id`, `status` | `ForensicCaseDTO` | Fetch, advance status lifecycle, or update forensic case dossier. |
| `/api/v1/auth/login` | `POST` | `username`, `password` | `UserSessionDTO` | SHA-256 password authentication & bearer session token generation. |
| `/api/v1/auth/users` | `GET`, `POST` | `username`, `role` | `List[SysUserDTO]` | Role-Based Access Control (RBAC) user account management (`SYS_USERS`). |
| `/api/v1/auth/audit-logs` | `GET` | `username`, `action` | `List[SysAuditLogDTO]` | Immutable security audit trail logs (`SYS_AUDIT_LOGS`). |

---

## 10. Role-Based Access Control (RBAC) & PII Masking Matrix

### 10.1 Role Access Matrix

| Module | `ANALYST` | `SUPERVISOR` | `INVESTIGATOR` | `MEMBER_SUP` | `ALGO_SPEC` | `ADMIN` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Executive Dashboard** | **View** | **Full** | **View** | **View** | **View** | **Full** |
| **Alert Triage Queue** | **Action** | **Full** | **View** | **View** | **View** | **Full** |
| **Stock Workspace** | **View** | **View** | **View** | **View** | **View** | **View** |
| **Trade Execution Explorer**| **View** | **View** | **View** | **View** | **View** | **View** |
| **Participant Conduct Audit**| **View** | **View** | **Full** | **View** | **View** | **View** |
| **Client 360° Profile** | **View** | **View** | **Full** | **View** | **No Access**| **View** |
| **Broker Conduct Monitor** | **No Access**| **View** | **View** | **Full** | **No Access**| **View** |
| **CTCL & Algo Intelligence** | **No Access**| **View** | **View** | **No Access**| **Full** | **View** |
| **Forensic Case Workspace** | **No Access**| **View** | **Full** | **No Access**| **No Access**| **Full** |

### 10.2 PII Data Sensitivity Rules

| User Role | PAN Masking Rule | Contact Masking Rule | Bank Account Masking Rule |
| :--- | :--- | :--- | :--- |
| `ROLE_ANALYST` | Masked (`XXXXX1234F`) | Masked (`+91 98200*****`) | Masked (`HDFC - ****4501`) |
| `ROLE_SUPERVISOR` | Full Unmasked | Full Unmasked | Full Unmasked |
| `ROLE_INVESTIGATOR` | Full Unmasked | Full Unmasked | Full Unmasked |
| `ROLE_MEMBER_SUP` | Masked | Masked | Masked |
| `ROLE_ALGO_SPEC` | Masked | Masked | Masked |
| `ROLE_ADMIN` | Masked | Masked | Masked |

---

## 11. Engineering Gap Analysis & Regulatory Compliance Audit

### 11.1 Requirement Compliance Matrix

| Framework Area | Coverage Status | Implementation Classification | Evidence & Notes |
| :--- | :---: | :--- | :--- |
| **Data Inputs** | **Functional Equivalent** | Development Replica | Master scrips (`Ftrd_Symbol`), 180d trade archives, and circuit hit flags active; corporate action adjustment pending. |
| **Five Core Metrics** | **Functional Equivalent** | Mathematical Approximation | All 5 formulas, thresholds (0, 1, 3, 5), and weights ($w_1..w_5$) active; Z-Scores use 180d overall variance proxy. |
| **Composite Scoring** | **Exact Implementation** | Production-Grade Math | Scaled $0..100$ composite risk score and watchlist triage active. |
| **Participant Metrics** | **Exact Implementation** | Teradata Join Replica | LTP contribution %, volume share %, counterparty pairs, circular trade loop indicators active. |
| **Dashboard Outputs** | **Exact Implementation** | Production-Grade UI | Market charts, metrics, participant tables, trade match logs, and Client 360° identity resolution views. |
| **Teradata Architecture**| **Exact Implementation** | SQLite & Teradata DW ORM | Full 3-table ORM schemas (`FTRD`, `DECL`, `DDCL`); 100% compliant with enterprise Teradata warehouse extract specs. |

### 11.2 Production Readiness Action Plan

```
                                PRODUCTION ROADMAP
                                         │
    ┌────────────────────────────────────┼────────────────────────────────────┐
    │                                    │                                    │
    ▼                                    ▼                                    ▼
PHASE 1: FORMULA REFINEMENT        PHASE 2: FEED INTEGRATION          PHASE 3: TERADATA DEPLOYMENT
• Corporate Action base price      • Connect DS-04 Corporate          • Provision Teradata tables:
  adjustment logic                   Announcements feed                 - EOD_SCRIP_SCORES
• Rolling 15-day window variance   • Connect DS-05 Shareholding        - EOD_PARTICIPANT_SUMMARY
  for Price & Volume Z-Scores        pattern feed                     • Set DATABASE_URL to
• Multi-hop DFS circular loop      • Ingest official exchange           teradatasql:// driver
  detection algorithm                EOD bars (EOD_HIST)
```
