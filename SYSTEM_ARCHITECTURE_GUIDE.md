# Price-Volume Alert Surveillance Framework (PVASF)
## Master System Architecture, Algorithmic Engine & Technical Manual

**Document Version:** 4.0.0 (Production Master Specification — Fully Synchronized)  
**Target Systems:** Enterprise 5-Layer Regulatory Data Warehouse (18 Tables) | FastAPI Surveillance Engine | Next.js 15 Enterprise Compliance Suite  
**Scope:** Complete System Topology, 5 Core Scoring Algorithms, 18-Table Database Schemas, Participant Intelligence, Data Lineage, RBAC Security, and Engineering Verification  
**Physical Schema References:** [`schema.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/schema.sql) | [`backend/db/schema.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/schema.sql)

---

## Table of Contents
1. [Executive Summary & Regulatory Scope](#1-executive-summary--regulatory-scope)
2. [Top-Level Architecture & Layered Boundary Pattern](#2-top-level-architecture--layered-boundary-pattern)
3. [Comprehensive File-by-File Code & Module Directory](#3-comprehensive-file-by-file-code--module-directory)
4. [EOD Data Processing & Transformation Pipeline](#4-eod-data-processing--transformation-pipeline)
5. [PVASF Core Surveillance Engine & Scoring Algorithms](#5-pvasf-core-surveillance-engine--scoring-algorithms)
6. [Participant Conduct Audit & Forensic Intelligence](#6-participant-conduct-audit--forensic-intelligence)
7. [Complete 18-Table Database Schema & Data Dictionary](#7-complete-18-table-database-schema--data-dictionary)
8. [End-to-End System Data Lineage](#8-end-to-end-system-data-lineage)
9. [UI/UX Blueprint, Navigation & Component Architecture](#9-uiux-blueprint-navigation--component-architecture)
10. [API Service Reference Matrix](#10-api-service-reference-matrix)
11. [Role-Based Access Control (RBAC) & Security Architecture](#11-role-based-access-control-rbac--security-architecture)
12. [Engineering Audit & Verification Results](#12-engineering-audit--verification-results)

---

## 1. Executive Summary & Regulatory Scope

The **Price-Volume Alert Surveillance Framework (PVASF)** is an institutional-grade market conduct platform engineered to detect artificial price inflation, liquidity pump-and-dump schemes, and coordinated trading rings across exchange-listed securities.

The framework continuously reconciles a **180-trading-day historical baseline ($T-180$)** against a **15-trading-day active surveillance window ($t-15$ to $t$)**, computing 5 mathematical anomaly metrics to triage high-risk securities for forensic investigation.

### 1.1 Scope Boundary (Artificial Price Inflation Focus)
The platform evaluates right-tail statistical metrics:
- **Price Rise %** (Gain relative to $T-180$ baseline closing price)
- **Price Z-Score** ($Z \ge 1.645\sigma$, 95th percentile anomaly)
- **Volume Z-Score** ($Z \ge 1.645\sigma$, 95th percentile anomaly)
- **Upper Circuit Band Persistence** ($\ge 90\%$ of price band ceiling)
- **180-Day New High Breakout Frequency** (Count of rolling peak breakout sessions)

---

## 2. Top-Level Architecture & Layered Boundary Pattern

The platform enforces a **Strictly Layered Boundary Pattern**. Database schemas, raw warehouse surrogate keys, and ORM models are isolated behind repository interfaces. Domain services operate exclusively on typed domain entities, ensuring seamless migration between local development (SQLite) and enterprise data warehouses (Teradata/PostgreSQL) with zero code refactoring across APIs or frontend components.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             NEXT.JS 15 SURVEILLANCE FRONTEND                             │
│       (App Router | Tailwind CSS | Recharts | React Query | Institutional Glassmorphism)  │
└─────────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │ REST / HTTPS (JSON Payloads)
┌─────────────────────────────────────────────▼────────────────────────────────────────────┐
│                                FASTAPI SURVEILLANCE ENGINE                               │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ API ROUTER LAYER (Request Validation, Pydantic v2 Serialization, RBAC Auth)        │  │
│  └──────────────────────────────────────────┬─────────────────────────────────────────┘  │
│                                             │ Calls Domain Services                      │
│  ┌──────────────────────────────────────────▼─────────────────────────────────────────┐  │
│  │ SERVICE LAYER (PVASF Scoring Engine, Circular Loop DFS, Graph Clustering)          │  │
│  └──────────────────────────────────────────┬─────────────────────────────────────────┘  │
│                                             │ Interacts via Repository Interfaces        │
│  ┌──────────────────────────────────────────▼─────────────────────────────────────────┐  │
│  │ REPOSITORY LAYER (Data Access, Query Compilation, Cache Management)                │  │
│  └──────────────────────────────────────────┬─────────────────────────────────────────┘  │
└─────────────────────────────────────────────┼────────────────────────────────────────────┘
                                              │ SQLAlchemy ORM / Connection Pool
┌─────────────────────────────────────────────▼────────────────────────────────────────────┐
│                           5-LAYER REGULATORY DATA WAREHOUSE                              │
│   [ Layer 1: Market EOD | Layer 2: KYC Dims | Layer 3: Holdings | Layer 4: Corp Actions ]│
│   [ Local Dev: backend/db/surveillance.db (24MB) | Production: Teradata / PostgreSQL ]   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Comprehensive File-by-File Code & Module Directory

```
UI_PVASF/
├── schema.sql                              # Complete 18-Table Production SQL Schema & Master DDL
├── SYSTEM_ARCHITECTURE_GUIDE.md            # Master System Architecture Manual (v4.0.0)
├── PVASF_CORE_SPEC.md                      # PVASF Anomaly Engine Formulas & Scoring Rules
├── PVASF_SCHEMA_REFERENCE.md               # 18-Table Physical Data Warehouse Schema Reference
├── DATA_REQUEST_SPEC.md                    # Teradata ETL & Production SQL Extraction Queries
├── pv_alert_surveillance.py                # Pure-Python Standalone Scoring Script
│
├── app/                                    # Next.js App Router Pages
│   ├── layout.tsx                          # Root Layout with Font & Theme Configuration
│   ├── page.tsx                            # Executive Surveillance Watchlist Dashboard (Route: /)
│   ├── analysis/[symbol]/page.tsx          # Single-Stock Forensic Workspace (Route: /analysis/[symbol])
│   ├── history/page.tsx                    # Immutable Security Audit Logs (Route: /history)
│   └── settings/page.tsx                   # Model Parameter Calibration & Admin (Route: /settings)
│
├── components/                             # UI Component Layer
│   ├── layout/app-shell.tsx                # AppShell Layout with Profile Switcher & Clean Navigation
│   ├── dashboard/                          # Dashboard Components
│   │   └── alerts-table.tsx                # Surveillance Watchlist Table with Non-Clipping Tooltips & Filters
│   ├── investigation/                      # Forensic Analysis Components
│   │   ├── charts.tsx                      # Dual-Axis Surveillance Master Chart, Radar, Breakout Matrix
│   │   ├── investigation-workspace.tsx     # 5-Tab Forensic Workspace (Overview, Participants, P2P, Dossier)
│   │   ├── participant-audit-view.tsx      # LTP Pusher, Volume Dominance, Collusion & Loop Audit
│   │   └── client-360-drawer.tsx           # Preserved Client 360° Demographics Drawer Component
│   └── ui/                                 # Shared UI Primitives
│       ├── card.tsx                        # Elevated Metric Cards with Institutional Glassmorphism
│       ├── metric-help.tsx                 # Regulatory Metric Help Tooltips with Clean Info (i) Icons
│       └── exchange-scope-selector.tsx     # Consolidated Exchange Scope Picker (NSE / BSE / Combined)
│
├── lib/                                    # Core Utilities & API Connectors
│   ├── api.ts                              # Centralized REST Client with Auth Headers & Fallbacks
│   ├── user-context.tsx                    # Session State & 1-Click Profile Switcher
│   └── utils.ts                            # Tailwind CSS Helper Utilities
│
├── backend/                                # FastAPI Python Backend
│   ├── main.py                             # FastAPI Server Entrypoint & CORS Configuration
│   ├── security.py                         # Password Hashing & Token Authentication
│   ├── db/                                 # Database Layer
│   │   ├── database.py                     # SQLAlchemy Engine & Session Factory
│   │   ├── models.py                       # 18 Relational Table ORM Models
│   │   ├── schema.sql                      # Synced 18-Table Production Schema File
│   │   ├── seed.py                         # Synthetic Market Data Generator (260 Trading Days)
│   │   └── surveillance.db                 # Active Local SQLite Database (24MB, 105K+ Rows)
│   ├── repositories/                       # Data-Access Layer
│   │   ├── cases_repo.py                   # Case Dossier Queries & Mutations
│   │   └── trade_matches_repo.py           # Trade Match Reconstruction from Aggregates
│   ├── routers/                            # REST API Endpoints
│   │   ├── surveillance.py                 # Watchlist Summary & Stock Detail Routes
│   │   ├── cases.py                        # Forensic Case Dossier CRUD Routes
│   │   ├── auth.py                         # User Management & System Audit Logs Routes
│   │   ├── clients.py                      # Participant Audits & Preserved Client 360 Routes
│   │   └── trade_matches.py                # Trade Execution Filtering Routes
│   └── services/                           # Domain Services
│       ├── surveillance_service.py         # PVASF Scoring Engine & Warehouse Query Execution
│       ├── cases_service.py                # Forensic Case Management Logic
│       ├── auth_service.py                 # User Auth, RBAC & Audit Trail Service
│       └── client_service.py               # Preserved Client 360 Demographics Service
│
└── tests/                                  # Automated Test Suite
    └── test_backend_surveillance.py        # 20 Automated Unit & Integration Tests (100% Pass)
```

---

## 4. EOD Data Processing & Transformation Pipeline

```
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │ 1. EOD EXTRACTION: Query AGG_SEC_DAY, AGG_CLNT_SEC_DAY, AGG_PAN_PAIR_DAY for [T-180, t]│
  └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
  ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
  │ 2. CORPORATE ACTION DILUTION NORMALIZATION: Apply FACT_CA_DIL_FCTR to baseline prices   │
  └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
  ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
  │ 3. BASELINE AGGREGATION: Compute P_{T-180}, Mean Return μ_R, Volatility σ_R, Mean Vol  │
  └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
  ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
  │ 4. 15-DAY WINDOW EVALUATION: Compute High_{15D}, 15D Mean Vol, Band Hits, New High Days │
  └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
  ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
  │ 5. METRIC SCORING & COMPOSITE TRIAGE: Map to {0,1,3,5} scores; Score_Final ≥ 15.0 Flag │
  └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. PVASF Core Surveillance Engine & Scoring Algorithms

The composite risk score is computed as:

$$\text{Score}_{\text{Final}} = \sum_{i=1}^{5} w_i \times \left( \frac{\text{Score}_i}{5.0} \right)$$

Where parameter scores $\text{Score}_i \in \{0, 1, 3, 5\}$ and weights $\sum w_i = 100\%$:

| Metric # | Parameter Name | Evaluation Formula | Weight ($w_i$) | Scoring Thresholds (0, 1, 3, 5) |
| :--- | :--- | :--- | :--- | :--- |
| **Metric 1** | Price Rise % | $\frac{\text{High}_{15\text{D}} - P_{T-180}}{P_{T-180}} \times 100$ | 25% | $<15\% \to 0$, $15\text{--}75\% \to 1$, $76\text{--}150\% \to 3$, $>150\% \to 5$ |
| **Metric 2** | Price Z-Score | $\frac{\bar{R}_{15\text{D}} - \mu_{R, 180\text{D}}}{\sigma_{R, 180\text{D}}}$ | 20% | $Z < 1.645 \to 0$, $Z \ge 1.645 \to 1$, $Z \ge 2.33 \to 3$, $Z \ge 3.09 \to 5$ |
| **Metric 3** | Volume Z-Score | $\frac{\bar{V}_{15\text{D}} - \mu_{V, 180\text{D}}}{\sigma_{V, 180\text{D}}}$ | 25% | $Z < 1.645 \to 0$, $Z \ge 1.645 \to 1$, $Z \ge 2.33 \to 3$, $Z \ge 3.09 \to 5$ |
| **Metric 4** | Upper Circuit Persistence | $\text{Count}(\text{Move}_t \ge 0.90 \times \text{Band})$ | 15% | $0\text{--}2\text{d} \to 0$, $3\text{--}5\text{d} \to 1$, $6\text{--}9\text{d} \to 3$, $\ge 10\text{d} \to 5$ |
| **Metric 5** | 180D New High Breakouts | $\text{Count}(\text{High}_t > \max \text{High}_{t-180}^{t-1})$ | 15% | $0\text{d} \to 0$, $1\text{--}4\text{d} \to 1$, $5\text{--}9\text{d} \to 3$, $\ge 10\text{d} \to 5$ |

**Default Cutoff Threshold**: $15.0$ Points out of $100$ flags security for High Risk priority investigation.

---

## 6. Participant Conduct Audit & Forensic Intelligence

The platform executes six specialized forensic algorithms across client trading logs:

1. **Net LTP Contribution ("Price Pusher" Metric)**:
   - Evaluates aggressive market orders lifting the ask: $\text{Net LTP} = \sum \Delta \text{LTP}_{\text{Buy}} - \sum \Delta \text{LTP}_{\text{Sell}}$.
   - Rendered in a clean 4-column table: `PAN Holder Name`, `Client PAN`, `Price Push / Pull`, `Contribution %`.
2. **Volume Share Dominance ("Cornering" Metric)**:
   - $\text{Share \%} = \frac{\text{Entity Gross Volume}}{\text{Total Exchange Scrip Volume}} \times 100$.
3. **Counterparty Pair Concentration ("Collusion" Metric)**:
   - Evaluates bilateral matched volumes ($PAN_A \leftrightarrow PAN_B$) against total scrip turnover.
4. **Trade Reversal Ratio (RTR / "Synchronized Reversal" Metric)**:
   - $\text{RTR} = \left[ \frac{2 \times \min(V_{A \to B}, V_{B \to A})}{V_{A \to B} + V_{B \to A}} \right] \times 100$.
5. **Circular Trading Loops ("Cycle Detection" Algorithm)**:
   - Directed graph DFS algorithm detecting closed rings of length 3 to 5 ($A \to B \to C \to A$) with bottleneck volume calculation.
6. **Mark-to-Market PnL ("Profit Extraction" Metric)**:
   - $\text{Net PnL} = \text{Total Sell Value} - \text{Total Buy Value} + (\text{Net Remaining Quantity} \times P_{\text{Latest Close}})$.

---

## 7. Complete 18-Table Database Schema & Data Dictionary

The physical database comprises **18 tables (617 columns total)** organized across 5 architectural layers:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 18-TABLE DATA WAREHOUSE                                  │
├──────────────────────────┬───────────────────────────┬───────────────────────────────────┤
│ Layer                    │ Table Name                │ Description & Key Surveillance Role│
├──────────────────────────┼───────────────────────────┼───────────────────────────────────┤
│ Layer 1: Market EOD      │ AGG_SEC_DAY               │ Daily OHLCV, Circuit Limits, 180D  │
│                          │ AGG_CLNT_SEC_DAY          │ Client trade summaries, LTP impact│
│                          │ AGG_PAN_PAIR_DAY          │ Bilateral matched trade aggregates│
├──────────────────────────┼───────────────────────────┼───────────────────────────────────┤
│ Layer 2: Master KYC      │ DIM_EXCH_CLNT_DTLS        │ Exchange client master (PAN, UCC) │
│                          │ DIM_DEP_CLNT_DTLS         │ Depository client demat master    │
├──────────────────────────┼───────────────────────────┼───────────────────────────────────┤
│ Layer 3: Shareholdings   │ FACT_MAIN_SHLDNG          │ Quarterly Promoter & Public float │
│                          │ FACT_PROM_SHLDR_DTLS      │ Granular promoter entity holdings │
│                          │ FACT_PUB_SHLDR_DTLS       │ Public institutional / Top 1%     │
│                          │ FACT_MSTR_SHAREHLDG       │ Master filing submission logs     │
│                          │ FACT_CMP_EXCH_SHLDNG      │ Cross-exchange listing tokens     │
│                          │ FACT_LKDIN_SHLDNG         │ Locked-in equity share schedules  │
│                          │ FACT_DVR_SHLDNG           │ Differential voting right classes │
│                          │ FACT_DR_HOLDING           │ Depository receipt underlying eq  │
├──────────────────────────┼───────────────────────────┼───────────────────────────────────┤
│ Layer 4: Corp Actions    │ FACT_CORP_ACTIONS         │ Splits, Bonus, Dividends, AGMs    │
│                          │ FACT_CA_DIL_FCTR          │ Price/Volume dilution adjustments │
├──────────────────────────┼───────────────────────────┼───────────────────────────────────┤
│ Layer 5: Governance      │ FORENSIC_CASES            │ Case management, evidence JSON    │
│                          │ SYS_AUDIT_LOGS            │ Immutable regulatory audit trail  │
│                          │ SYS_USERS                 │ User authentication & RBAC roles  │
└──────────────────────────┴───────────────────────────┴───────────────────────────────────┘
```

*Complete DDL specifications, primary keys, and indexes are documented in [`schema.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/schema.sql).*

---

## 8. End-to-End System Data Lineage

```
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ Teradata EOD Feed / Warehouse Tables (AGG_SEC_DAY, AGG_CLNT_SEC_DAY, AGG_PAN_PAIR_DAY) │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
 ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
 │ FastAPI Backend Service Layer (Port 8000) — surveillance_service.py                    │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ JSON REST API
 ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
 │ Next.js Centralized Client (`lib/api.ts` with Token Authentication)                    │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
     ┌───────────────────────────────────────┼───────────────────────────────────────┐
     ▼                                       ▼                                       ▼
Dashboard (/)                       Forensic Analysis                      Audit Log (/history)
Watchlist Table & KPIs             (/analysis/[symbol])                     Immutable Records
```

---

## 9. UI/UX Blueprint, Navigation & Component Architecture

### 9.1 Design System & Aesthetic Standards
- **Institutional Dark Slate Glassmorphism**: Clean dark-slate card surfaces, high-contrast typography, and backdrop-blur glass panels (`bg-slate-900/95 backdrop-blur-md`).
- **Non-Clipping Downward Tooltips**: All table header and KPI tooltips open downward (`top-full mt-2`) with custom edge alignments (`align="left"` / `align="right"`), preventing clipping inside `overflow-auto` containers.
- **Clean Iconography**: Standard `Info` (`i`) icons across all metrics, trigger filter pills, and column headers.
- **No Horizontal Scrollbars**: Participant tables use 4 proportional columns with responsive layouts.

### 9.2 Page Routes Matrix

| Page Route | Purpose | Key UI Features |
| :--- | :--- | :--- |
| **`/`** | Executive Watchlist Dashboard | Exchange Scope Selector (NSE / BSE / Combined), KPI Summary Cards, Risk Distribution Bar, Watchlist Table with downward info tooltips, and 1-click sortable headers. |
| **`/analysis/[symbol]`** | Forensic Analysis Workspace | **4 Surveillance Tabs**:<br/>• **`Overview`**: Dual-Axis Master Chart (20 & 50 DMA, Volume, Screener Delivery %, 15D Window Toggle, Adaptive Date Ticks), Breakout Matrix, 5-Parameter Radar.<br/>• **`Shareholders`**: Comparative tables for Promoter / Top 1% / Public float (Day $t$ vs $T-180$), PAN Demographics, and Corporate Actions timeline.<br/>• **`Participants`**: Positive & Negative LTP Contribution tables (4 columns), Concentrated Volume Dominance, Bilateral Loops, and DFS Circular Trading Loops.<br/>• **`Case Dossier`**: Case management, status updates, priority assignment, and evidence notes. |
| **`/history`** | Immutable System Audit Trail | Immutable Security & System Audit Logs (`SYS_AUDIT_LOGS`), action filtering, search query pre-fill (`/history?search=SYMBOL`), CSV exporter. |
| **`/settings`** | Model Settings & User Admin | Model Weight Calibration with 1-click **Reset to Framework Defaults**, User Management table (`SYS_USERS`), and Security Logs. |

---

## 10. API Service Reference Matrix

| Endpoint Route | HTTP Verb | Purpose & Scope | Access Control |
| :--- | :--- | :--- | :--- |
| `/api/v1/surveillance/summary` | GET | Returns Watchlist scrip summaries & risk categories. | Public / All |
| `/api/v1/surveillance/scrip/{symbol}` | GET | Returns detailed scrip metrics & historical EOD price/volume series. | Public / All |
| `/api/v1/surveillance/scrip/{symbol}/participants` | GET | Returns participant Net LTP contributions, volume shares, counterparty pairs, RTR, and circular loops. | Authenticated |
| `/api/v1/surveillance/scrip/{symbol}/shareholding-breakdown` | GET | Returns Day $t$ vs $T-180$ promoter & top 1% shareholder details. | Authenticated |
| `/api/v1/surveillance/scrip/{symbol}/corporate-actions` | GET | Returns 15-day corporate announcements and dilution factors. | Authenticated |
| `/api/v1/auth/login` | POST | Authenticates user & issues 24-hour access token. | Public |
| `/api/v1/auth/me` | GET | Returns current logged-in user profile. | Authenticated |
| `/api/v1/auth/users` | GET | Returns all system users. | Admin Only |
| `/api/v1/auth/audit-logs` | GET | Returns immutable security audit logs. | Authenticated |
| `/api/v1/trades/matches` | GET | Returns filtered trade executions from `AGG_PAN_PAIR_DAY`. | Authenticated |
| `/api/v1/clients/{pan}/profile` | GET | Preserved Client 360° profile endpoint. | Authenticated |

---

## 11. Role-Based Access Control (RBAC) & Security Architecture

The application enforces 3 distinct operational roles:
1. **Admin**: Full system access, model weight recalibration, user provisioning, and audit log inspection (`Vishesh Admin`).
2. **Analyst**: Surveillance analysis, case creation, status updates, and note logging (`A. Rao Analyst`).
3. **Viewer / Guest User**: Read-only access to scrip analysis and watchlist metrics (`Guest User`).

---

## 12. Engineering Audit & Verification Results

All components, mathematical scoring algorithms, and database schemas have been fully validated:
- **Database Schema Audit**: Programmatic column-by-column audit across all **18 tables and 617 columns** achieved a **100% exact match** with the active warehouse database (`backend/db/surveillance.db`).
- **Automated Test Suite**: 20 comprehensive unit and integration tests passing (`pytest -v` in [`tests/test_backend_surveillance.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/tests/test_backend_surveillance.py)).
- **TypeScript Type Checking**: `npx tsc --noEmit` passed with **0 errors**.
- **Production Build**: Next.js production build (`npx next build`) compiles successfully in **2.5s**.
