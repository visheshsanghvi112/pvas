# HOW THE PLATFORM WORKS — End-to-End System Manual & Analyst Guide
**Document Version**: 2.0.0  
**Target Audience**: Surveillance Analysts, Compliance Officers, and Platform Developers  
**Scope**: Current Platform Implementation (SQLite / Teradata Schema + FastAPI + Next.js UI)  

---

## 1. EOD Data Arrival & Processing Pipeline

### 1.1 Data Ingestion & Transformation Flow

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

> **Technical Note on Daily OHLCV Bar Derivation**:  
> In local development/prototype mode, official EOD scrip bars are derived directly from trade-level match records in `FACT_TRADES`. `Open` is determined by the timestamp of the first trade match of the session, `High` is the maximum price, `Low` is the minimum price, and `Close` is the timestamp of the last trade match of the session. In production, official EOD bars are ingested directly from exchange feeds (`EOD_PRICE_VOLUME_HIST`).

---

## 2. Continuous Investigation Journey (Single-Workspace Paradigm)

Enterprise investigation tools (like Bloomberg Terminal or Refinitiv) operate on a **Single Continuous Workspace Paradigm**. The analyst does not leave context or jump between disconnected standalone pages. Instead, the analyst selects a security once and conducts the entire investigation within a unified workspace (`/investigations/[symbol]`) with contextual tabs and instant drill-downs:

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
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Contextual Workflow Steps:

1. **Watchlist / Dashboard (`/`)**: Analyst reviews the EOD watchlist sorted by risk score. Clicks **`ALPHATECH`** (Score 88.5).
2. **Investigation Workspace Overview Tab**: Displays scrip details, risk severity, price surge %, and 5-metric scorecards.
3. **180d Chart & Market Data Tab**: Dual-axis candlestick price chart, volume bars, moving averages, and 15-day circuit hit calendar.
4. **Trades Log Tab (Contextual)**: Renders trade matches pre-filtered for `ALPHATECH`. Analyst clicks a wash trade row (`Ftrd_Same_Broker_Wash_Flag = 1`) to inspect order slippage and order book depth snapshot modal *without leaving the workspace*.
5. **Participants Audit Tab (Contextual)**: Displays LTP price contributors, volume concentration, and counterparty pairs. Analyst clicks top buyer PAN **`UAQKQ4052Y`**.
6. **Client 360° Profile Modal**: Instantly pops up the client's exchange account details (`DECL`) and linked depository demat accounts (`DDCL`), joint holders, and PoA status *in context*.
7. **Case Dossier & Notes Tab**: Analyst pins the chart, trade execution log, and demat proof, entering compliance audit notes to close the investigation.

---

## 3. Module Business Purpose Matrix

| Module Name | Business Purpose (Why it exists & what problem it solves) | Preceding Context | Following Context |
| :--- | :--- | :--- | :--- |
| **Module 1: Dashboard** | Macro command center that monitors all listed scrips to immediately highlight securities violating statistical price/volume thresholds. | System Ingestion | Stock Investigation Workspace |
| **Module 2: Alert Triage** | Risk score triage queue for compliance officers to review metric scorecards, adjust scoring weights, and assign investigation priorities. | Dashboard | Stock Investigation Workspace |
| **Module 3: Stock Workspace** | Single continuous investigation workspace for a security combining price history, scorecards, trades, participants, and case notes. | Alert Triage / Dashboard | Client 360 Modal / Case Dossier |
| **Module 4: Trade Explorer** | Contextual trade match audit tab within stock workspace to detect same-broker wash trades, order slippage, and spoofing depth. | Stock Overview Tab | Participants Tab / Order Book Depth |
| **Module 5: Participant Audit** | Evaluates market manipulation by identifying client PANs driving LTP price increases, volume concentration, and counterparty pairs. | Trade Explorer Tab | Client 360 Modal |
| **Module 6: Client 360° Profile** | In-context identity resolution modal cross-referencing exchange trading accounts (`DECL`) with depository demat accounts (`DDCL`). | Participant Audit Tab | Case Dossier Tab |
| **Module 7: Broker Conduct** | Systemic member-level audit tracking Trading Member brokers for wash trade volume ratios, client code alterations, and out-of-state terminals. | Member Supervision | Case Dossier Tab |
| **Module 8: CTCL & Algo Intel** | Detects algorithmic order book manipulation, quote spoofing ratios (`Pending/Executed`), and HFT strategy cancellation ratios. | Trade Explorer Tab | Case Dossier Tab |
| **Module 9: Case Workspace** | Dossier manager allowing compliance officers to pin chart evidence, compile chronological timelines, and manage case status. | Stock Workspace | Compliance Reports |
| **Module 10: Reports** | Compliance export engine producing formal regulatory PDF audit packages and masked CSV data binders. | Case Workspace | Regulatory Submission |

---

## 4. Architecture Dependency Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             FRAMEWORK (NEXT.JS 15 + FASTAPI)                     │
└────────────────────────────┬─────────────────────────────────────────────────────┘
                             │ Render Single Workspace & Contextual Tabs
┌────────────────────────────▼─────────────────────────────────────────────────────┐
│                             FRONTEND & BACKEND MODULES                           │
│  [ Dashboard | Stock Workspace (Overview, Chart, Trades, Participants) | Client ]│
└────────────────────────────┬─────────────────────────────────────────────────────┘
                             │ Invokes Domain Workflows
┌────────────────────────────▼─────────────────────────────────────────────────────┐
│                                  SERVICE LAYER                                   │
│  [ EODSurveillanceService | FactTradesService | ClientService ]                   │
└────────────────────────────┬─────────────────────────────────────────────────────┘
                             │ Calls Data Access Repositories
┌────────────────────────────▼─────────────────────────────────────────────────────┐
│                                REPOSITORY LAYER                                  │
│  [ FactTradesRepository | DimExchClntRepository | DimDepClntRepository ]         │
└────────────────────────────┬─────────────────────────────────────────────────────┘
                             │ Compiles ANSI SQL / SQLAlchemy Queries
┌────────────────────────────▼─────────────────────────────────────────────────────┐
│                             DATABASE TABLES (SQLITE / TERADATA)                  │
│  [ FACT_TRADES (FTRD) | DIM_EXCH_CLNT_DTLS (DECL) | DIM_DEP_CLNT_DTLS (DDCL) ]   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. API Explanation Matrix

| API Endpoint | HTTP Verb | Who Calls It | When Called | Why It Exists (Business Purpose) |
| :--- | :---: | :--- | :--- | :--- |
| `/api/v1/surveillance/health` | `GET` | Monitoring Scripts | Server startup & health checks | Verifies system operational status and spec alignment. |
| `/api/v1/surveillance/scrips` | `GET` | Dashboard / Watchlist | Page load & search filter | Computes and returns 5 core metric risk scores for all scrips. |
| `/api/v1/surveillance/scrip/{symbol}` | `GET` | Stock Workspace | Analyst selects a security | Fetches 180-day OHLCV price history & metric scorecard for a scrip. |
| `/api/v1/surveillance/scrip/{symbol}/participants` | `GET` | Participants Tab | Analyst opens Participants tab | Calculates LTP price contribution, volume share, and counterparty pairs per PAN. |
| `/api/v1/surveillance/weights` | `POST` | Admin Settings Page | Analyst updates metric weights | Dynamically updates scoring weights $w_1 \dots w_5$ and risk threshold. |
| `/api/v1/trades/` | `GET` | Trades Tab | Analyst opens Trades tab | Returns paginated trade matches from `FACT_TRADES` with wash & algo filters. |
| `/api/v1/trades/{date}/{num}` | `GET` | Trade Detail Modal | Analyst clicks trade row | Returns granular order placement prices, timestamps, and depth snapshot. |
| `/api/v1/trades/analysis/wash-trades` | `GET` | Broker Conduct / Trades Tab | Analyst checks wash summary | Aggregates same-broker wash trade count and value per security. |
| `/api/v1/trades/analysis/algo-breakdown` | `GET` | CTCL & Algo Intel Page | Analyst opens Algo page | Computes execution channel split (Manual vs Internet vs DMA vs Algo) per scrip. |
| `/api/v1/clients/exchange` | `GET` | Client Directory Modal | Analyst opens client list | Returns paginated exchange client trading accounts (`DECL`). |
| `/api/v1/clients/exchange/search` | `GET` | Client Search Input | Analyst types PAN/Name | Performs full-text search across PAN, Client ID, and Name. |
| `/api/v1/clients/depository` | `GET` | Client Profile Modal | Analyst filters demat accounts | Returns paginated NSDL/CDSL depository accounts (`DDCL`). |
| `/api/v1/clients/profile/{token}` | `GET` | Client 360 Modal | Analyst clicks PAN link | Cross-references exchange account (`DECL`) with linked demat accounts (`DDCL`). |

---

## 6. Database Table Mapping Matrix

| Database Table Name | Primary Responsibilities & Attributes | Used by Modules | Used by APIs | Used by Services |
| :--- | :--- | :--- | :--- | :--- |
| `FACT_TRADES` (`FTRD`) | Stores 31,200 trade matches, prices, quantities, timestamps, wash flags, CTCL flags, order depth. | Stock Workspace (Overview, Chart, Trades, Participants), Broker Conduct, Algo Intel | `/surveillance/scrips`, `/surveillance/scrip/*`, `/trades/*` | `EODSurveillanceService`, `FactTradesService` |
| `DIM_EXCH_CLNT_DTLS` (`DECL`) | Stores 500 exchange client accounts, PANs, legal names, Trading Member tokens, status, addresses. | Participant Audit Tab, Client 360 Modal, Broker Conduct | `/surveillance/scrip/*/participants`, `/clients/exchange/*`, `/clients/profile/*` | `EODSurveillanceService`, `ClientService` |
| `DIM_DEP_CLNT_DTLS` (`DDCL`) | Stores 500 NSDL/CDSL depository demat accounts, DP IDs, joint holders, PoA flags linked via `Decl_Clnt_Token`. | Client 360 Modal, Case Workspace | `/clients/depository/*`, `/clients/profile/*` | `ClientService` |

---

## 7. Completion Status Classification

### 7.1 Completed (100% Working Today)
* **Full Database Schema Replication**: `FACT_TRADES` (123 fields), `DIM_EXCH_CLNT_DTLS` (128 fields), `DIM_DEP_CLNT_DTLS` (63 fields) populated with 31,200 seeded database records.
* **Core Statistical Anomaly Engine**: 5 shortlisting metrics (Price Rise %, Price Z, Vol Z, Band Hits, New Highs) calculated live against DB trade data.
* **FastAPI Backend & Repository Layer**: `FactTradesRepository`, `DimExchClntRepository`, `DimDepClntRepository` wired to database.
* **Next.js Production UI Suite**:
  - Executive Dashboard (`/`)
  - Stock Investigation Workspace (`/investigations/[symbol]`) with contextual tabs.
  - Contextual Trade Execution Explorer & Order Depth Inspector.
  - In-Context Client 360° Profile Modal (`DECL` + `DDCL`).
  - Broker Conduct Monitor (`/members`).
  - CTCL & Algo Intelligence (`/algo-ctcl`).
  - Forensic Case Workspace (`/cases`).
* **Build & Type Safety**: `npx tsc --noEmit` (**0 errors**), `npm run build` (**100% successful**).

### 7.2 Partially Completed (Working with Approximations)
* **Derived Daily OHLCV Bars**: In development mode, daily Open (first trade of day), High (max price), Low (min price), Close (last trade of day), and Volume (sum of qty) are derived from trade-level matches in `FACT_TRADES`. In production, official EOD bars come from `EOD_PRICE_VOLUME_HIST`.
* **Participant Circular Loop Detection**: Calculates counterparty volume shares and LTP contribution from real DB trades; 3-node circular loop visualizer uses rendered trade path graphs.

### 7.3 Future (Requires Production Teradata Credentials or External Feeds)
* **Production Teradata ODBC Connection**: Switching `DATABASE_URL` from SQLite to `teradatasql://...` when live credentials are provided.
* **External Feeds**: Live Corporate Announcements (`SCRIP_ANNOUNCEMENTS`) and Shareholding Archives (`SCRIP_SHAREHOLDING`).

---

## 8. Continuous Investigation Workflow (Step-by-Step)

If an analyst opens the application tomorrow to investigate a suspicious stock from start to finish within a single continuous workspace:

1. **Step 1 (Open Dashboard)**: Open `http://localhost:3000`. The **Executive Dashboard** renders the Watchlist sorted by Risk Score.
2. **Step 2 (Select Suspicious Stock)**: The analyst identifies `ALPHATECH` at the top of the Watchlist with a High Risk Score ($88.5/100$) and a $+124.5\%$ price surge. Click **`ALPHATECH`**.
3. **Step 3 (Continuous Workspace Opens)**: The page navigates to `/investigations/ALPHATECH`. The single workspace loads with tabs for Overview, Market Data, Trades Log, Participants Audit, and Case Dossier.
4. **Step 4 (Review Overview & Chart)**: The analyst reviews the 180-day price/volume candlestick chart, noting upper-circuit limit hits.
5. **Step 5 (Audit Pre-Filtered Trades)**: Click the **Trades Log** tab within the `ALPHATECH` workspace. The trade list is automatically filtered for `ALPHATECH` matches. The analyst checks wash trades (`Ftrd_Same_Broker_Wash_Flag = 1`).
6. **Step 6 (Inspect Order Depth)**: Click **View** on a wash trade match row. A modal pops up displaying the exact **Best Bid/Ask and Pending Book Depth** at that trade execution millisecond.
7. **Step 7 (Audit Participants)**: Click the **Participants Audit** tab within the `ALPHATECH` workspace. The analyst reviews **Top LTP Contributors** and identifies PAN `KXYKJ0719S` driving $22.58\%$ of positive price ticks.
8. **Step 8 (Pop Up Client 360° Profile)**: Click the PAN **`KXYKJ0719S`** directly inside the table. A modal pops up showing the client's exchange account details (`DECL`) and linked depository demat accounts (`DDCL`), joint holders, and PoA status *without navigating away*.
9. **Step 9 (Document & Close Case)**: Click the **Case Dossier & Notes** tab. The analyst pins the chart, trade execution log, and demat proof, entering compliance audit notes to close the investigation.
