# Price-Volume Alert Surveillance Framework (PVASF)
## Master System Architecture, Algorithmic Engine & Technical Manual

**Document Version:** 3.3.0 (Absolute Single Source of Truth — Fully Synchronized)  
**Target Systems:** Enterprise 3-Tier SEBI Data Warehouse (`AGG_SEC_DAY`, `AGG_CLNT_SEC_DAY`, `AGG_PAN_PAIR_DAY`, `DIM_EXCH_CLNT_DTLS`, `DIM_DEP_CLNT_DTLS`) | FastAPI Surveillance Engine | Next.js Enterprise Compliance Suite  
**Scope:** Complete Architectural Specification, Scoring Algorithms, Database Schemas, User Workflows, Data Lineage, RBAC Security, and Regulatory Compliance Audit  

---

## Table of Contents
1. [Executive Summary & Regulatory Scope](#1-executive-summary--regulatory-scope)
2. [Top-Level Architecture & Layered Boundary Pattern](#2-top-level-architecture--layered-boundary-pattern)
3. [Comprehensive File-by-File Code & Module Directory](#3-comprehensive-file-by-file-code--module-directory)
4. [EOD Data Processing & Transformation Pipeline](#4-eod-data-processing--transformation-pipeline)
5. [PVASF Core Surveillance Engine & Scoring Algorithms](#5-pvasf-core-surveillance-engine--scoring-algorithms)
6. [Participant Conduct Audit & Algorithmic Intelligence](#6-participant-conduct-audit--algorithmic-intelligence)
7. [Complete Database Schemas & Entity-Relationship Models](#7-complete-database-schemas--entity-relationship-models)
8. [End-to-End System Data Lineage](#8-end-to-end-system-data-lineage)
9. [UI/UX Blueprint, Navigation & Page Route Matrix](#9-uiux-blueprint-navigation--page-route-matrix)
10. [API Service Reference Matrix](#10-api-service-reference-matrix)
11. [Role-Based Access Control (RBAC) & Security Architecture](#11-role-based-access-control-rbac--security-architecture)
12. [Engineering Audit & Verification Results](#12-engineering-audit--verification-results)

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

## 3. Comprehensive File-by-File Code & Module Directory

Every file in the codebase has been inspected and cataloged by its specific architectural layer, primary responsibilities, and system dependencies:

### 3.1 Core Surveillance Engine & Specification Files
- **[`pv_alert_surveillance.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/pv_alert_surveillance.py)**: Pure Python implementation of the 5 Core Statistical Anomaly Metrics, Z-score calculations, participant trade audit algorithms, and weighted composite scoring ($w_1=25.0, w_2=20.0, w_3=25.0, w_4=15.0, w_5=15.0$). Operates independently of web frameworks.
- **[`PVASF_CORE_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_CORE_SPEC.md)**: Regulatory specification document detailing mathematical scoring rules, metric cutoffs (0, 1, 3, 5), and watchlist triage thresholds ($S \ge 15.0$).
- **[`PVASF_SCHEMA_REFERENCE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_SCHEMA_REFERENCE.md)**: Master schema reference document defining physical tables across the Dimension, Fact, Application, and SEBI Trade Aggregate layers.
- **[`TRADE_AGGREGATE_REARCHITECTURE_PLAN.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/TRADE_AGGREGATE_REARCHITECTURE_PLAN.md)**: Architecture plan documenting 30-minute VWAP closing price calculations and trade aggregate repository projections.

### 3.2 Backend Infrastructure Layer (`backend/`)
- **[`backend/main.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/main.py)**: FastAPI application entry point. Configures CORS middleware, registers router modules (`surveillance`, `trade_matches`, `clients`, `auth`, `cases`, `agg_trades`), and manages lifespan database initialization and seeding.
- **[`backend/security.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/security.py)**: Authentication & authorization library enforcing PBKDF2-HMAC-SHA256 password hashing, bearer token parsing, and role verification (`get_current_user`, `require_admin`).
- **[`backend/db/database.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/database.py)**: SQLAlchemy engine configuration, connection pool setup, `SessionLocal` factory, `init_db()`, and `reset_database()` helper routines.
- **[`backend/db/models.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/models.py)**: Declarative ORM models defining 18 physical database tables (`DimExchClntDtls`, `DimDepClntDtls`, `FactMstrSharehldg`, `FactMainShldng`, `FactPromShldrDtls`, `FactPubShldrDtls`, `FactDvrShldng`, `FactDrHolding`, `FactLkdinShldng`, `FactCmpExchShldng`, `FactCorpActions`, `FactCaDilFctr`, `SysUser`, `SysAuditLog`, `ForensicCase`, `AggSecDay`, `AggClntSecDay`, `AggPanPairDay`).
- **[`backend/db/seed.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/seed.py)**: Synthetic data generator. Populates 260 trading days of EOD security aggregates (`AGG_SEC_DAY`), participant trade aggregates (`AGG_CLNT_SEC_DAY`), counterparty PAN pair matrices (`AGG_PAN_PAIR_DAY`), quarterly shareholding shifts, corporate actions, exchange & depository demat clients, and forensic case dossiers.

### 3.3 Backend Services Layer (`backend/services/`)
- **[`backend/services/surveillance_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/surveillance_service.py)**: Main business logic service for EOD surveillance. Loads EOD data directly from `AGG_SEC_DAY`, aligns 181 trading days of history ($T-180$ baseline), pre-computes MA20/MA50, executes `SurveillanceEngine`, calculates participant conduct metrics (LTP pushers, volume share, PnL), and formats shareholding breakdowns & corporate actions.
- **[`backend/services/trade_matches_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/trade_matches_service.py)**: Business logic service for trade match analytics. Orchestrates repository calls, computes pagination metadata, and summarizes same-broker wash trades and HFT algo executions.
- **[`backend/services/agg_trades_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/agg_trades_service.py)**: Service layer for querying pre-calculated SEBI trade aggregates (`AGG_SEC_DAY`, `AGG_CLNT_SEC_DAY`, `AGG_PAN_PAIR_DAY`).
- **[`backend/services/cases_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/cases_service.py)**: Business logic for forensic investigation dossiers (`Draft` $\rightarrow$ `Open Investigation` $\rightarrow$ `Pending Action` $\rightarrow$ `Closed`) and evidence JSON attachments.
- **[`backend/services/client_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/client_service.py)**: Client 360° identity resolution service. Cross-references exchange client accounts (`DECL`) with depository demat accounts (`DDCL`) by PAN.
- **[`backend/services/auth_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/auth_service.py)**: Security service enforcing RBAC roles (`Admin`, `Analyst`, `Viewer`), salted password hashing, and immutable security audit logging (`SYS_AUDIT_LOGS`).

### 3.4 Backend Repositories Layer (`backend/repositories/`)
- **[`backend/repositories/trade_matches_repo.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/repositories/trade_matches_repo.py)**: Data access layer projecting millisecond trade execution records (`AggTradeRecord`) directly from `AGG_PAN_PAIR_DAY` + `AGG_SEC_DAY`. Filters by symbol, date range, wash flags, and algo flags.
- **[`backend/repositories/agg_trades_repo.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/repositories/agg_trades_repo.py)**: Data access layer executing optimized SQL queries against `AGG_SEC_DAY`, `AGG_CLNT_SEC_DAY`, and `AGG_PAN_PAIR_DAY`.
- **[`backend/repositories/cases_repo.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/repositories/cases_repo.py)**: Data access layer managing CRUD persistence for `FORENSIC_CASES`.
- **[`backend/repositories/dim_exch_clnt_repo.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/repositories/dim_exch_clnt_repo.py)**: Data access layer querying exchange client accounts (`DIM_EXCH_CLNT_DTLS`).
- **[`backend/repositories/dim_dep_clnt_repo.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/repositories/dim_dep_clnt_repo.py)**: Data access layer querying depository demat accounts (`DIM_DEP_CLNT_DTLS`).

### 3.5 Backend Routers & Schemas (`backend/routers/`, `backend/schemas/`)
- **[`backend/routers/surveillance.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/routers/surveillance.py)**: FastAPI endpoints for watchlist risk triage (`/watchlist`, `/scrips`), scrip detail (`/scrip/{scrip_id}`), participant audits, shareholding breakdowns, corporate actions, and weight adjustments.
- **[`backend/routers/trade_matches.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/routers/trade_matches.py)**: FastAPI endpoints for trade execution exploration (`/api/v1/trades/`), daily symbol trade heatmaps, wash trade summaries, and algo breakdowns.
- **[`backend/routers/agg_trades.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/routers/agg_trades.py)**: FastAPI endpoints serving raw SEBI trade warehouse aggregates (`/api/aggregates/...` & `/api/v1/agg-trades/...`).
- **[`backend/routers/cases.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/routers/cases.py)**: FastAPI endpoints for forensic case management (`/api/v1/cases/`).
- **[`backend/routers/clients.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/routers/clients.py)**: FastAPI endpoints for exchange/depository client listings and Client 360° PAN lookups (`/api/v1/clients/...`).
- **[`backend/routers/auth.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/routers/auth.py)**: FastAPI endpoints for authentication (`/api/v1/auth/login`), user management, and audit log viewing.
- **[`backend/schemas/`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/schemas/)**: Pydantic v2 validation models (`agg_trades.py`, `cases.py`, `common.py`, `dim_dep_clnt.py`, `dim_exch_clnt.py`, `trade_matches.py`).

### 3.6 Frontend Client & Pages (`lib/`, `app/`)
- **[`lib/api.ts`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/lib/api.ts)**: Unified TypeScript API client encapsulating REST fetch requests (`fetchWatchlist`, `fetchScripDetail`, `fetchScripParticipants`, `fetchTradeLog`, `fetchCases`, `fetchClient360`).
- **[`app/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/page.tsx)**: Executive Surveillance Dashboard rendering KPI summary cards, risk-ranked watchlist table, and anomaly trigger filters.
- **[`app/analysis/[symbol]/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/analysis/[symbol]/page.tsx)** & **[`app/analyse/[symbol]/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/analyse/[symbol]/page.tsx)**: Single Continuous Scrip Analysis Workspace. Houses the 180-day price/volume chart, participant conduct audit, shareholding trends, corporate actions, and case evidence tabs.
- **[`app/history/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/history/page.tsx)**: Regulatory Audit & Alert Triage History Log.
- **[`app/trades/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/trades/page.tsx)**: Trade Execution Explorer providing paginated filtering across millisecond trade executions, wash trade flags, and HFT algo tags.
- **[`app/clients/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/clients/page.tsx)**: Client 360° Identity Resolution Portal enabling searching exchange and depository demat accounts by PAN.
- **[`app/cases/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/cases/page.tsx)**: Forensic Case Management Workspace tracking active investigation dossiers and status transitions.
- **[`app/compare/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/compare/page.tsx)**: Multi-Scrip Anomaly Comparison Matrix.
- **[`app/members/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/members/page.tsx)**: Clearing Member & Broker Conduct Monitor.
- **[`app/algo-ctcl/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/algo-ctcl/page.tsx)**: CTCL Terminal & HFT Algo Intelligence.
- **[`app/settings/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/settings/page.tsx)**: Interactive Model Weight Calibration & User Management Page.

### 3.7 Frontend UI Components (`components/`)
- **[`components/layout/app-shell.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/layout/app-shell.tsx)**: Navigation shell housing top bar, sidebar links, role badge selector, Teradata Data Sync button, and the **Unified Notification Drawer**.
- **[`components/dashboard/alerts-table.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/dashboard/alerts-table.tsx)**: Watchlist table component rendering risk scores, 180D price rise %, $Z_{\text{price}}$, $Z_{\text{volume}}$, circuit hit badges, CSV exporter, and navigation to `/analysis/[symbol]`.
- **[`components/dashboard/filter-panel.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/dashboard/filter-panel.tsx)**: Risk triage & anomaly score range filters.
- **[`components/dashboard/kpi-card.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/dashboard/kpi-card.tsx)**: Executive KPI cards rendering high-risk scrip counts and monitored metrics.
- **[`components/investigation/investigation-workspace.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/investigation/investigation-workspace.tsx)**: Single Continuous Stock Workspace tab container (Overview, 5-Metric Breakdown, 180d OHLCV Chart, Participant Conduct Audit, Case Dossiers).
- **[`components/investigation/charts.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/investigation/charts.tsx)**: Recharts-powered 180-day price and volume visualizer with brush zoom, time horizon filters (15D, 30D, 90D, ALL), risk-colored surge bars (`#e11d48`, `#f59e0b`, `#3b82f6`), and live hover cursor readout headers.
- **[`components/investigation/timeline.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/investigation/timeline.tsx)**: Corporate announcements & dilution timeline component.
- **[`components/ui/`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/ui/)**: Shared UI primitives (`badge.tsx`, `button.tsx`, `card.tsx`, `input.tsx`, `metric-card.tsx`, `metric-help.tsx`).

---

## 4. EOD Data Processing & Transformation Pipeline

### 4.1 End-to-End System Execution Flow

The system operates across 5 interconnected execution phases from database boot to frontend rendering:

```
───────────────────────────────────────────────────────────────────────────────────────────
PHASE A: STARTUP & DATABASE INITIALIZATION
  `backend/main.py` ──► `database.py` (init_db) ──► `models.py` (18 ORM Tables Created)
                                                         │
                                                         ▼
                                            `seed.py` (Seeds Aggregate Tables)
───────────────────────────────────────────────────────────────────────────────────────────
PHASE B: EOD DATA RELOAD & ANOMALY SURVEILLANCE ENGINE
  User Opens App / Sync Data ──► `routers/surveillance.py` (/scrips)
                                        │
                                        ▼
                           `surveillance_service.py` (get_scrips_summary)
                                        │
                                        ├──► Reloads fresh EOD data from `AGG_SEC_DAY`
                                        └──► Invokes `pv_alert_surveillance.py` Engine
                                                    │
                                                    ▼
                                       Calculates 5 Statistical Anomaly Metrics:
                                       • Price Rise % (s1)  • Price Z-Score (s2)
                                       • Volume Z-Score (s3) • Circuit Band Hits (s4)
                                       • 180D New High Breakouts (s5)
                                                    │
                                                    ▼
                                       Computes Weighted Composite Risk Score (S)
                                       Assigns Risk Tier: High (>=15.0), Medium (10-14.9), Low (<10.0)
───────────────────────────────────────────────────────────────────────────────────────────
PHASE C: REST API SERIALIZATION & FRONTEND HYDRATION
  FastAPI Router ──► Serializes DTO ──► REST JSON Payload
                                              │
                                              ▼
                               `lib/api.ts` (fetchWatchlist -> /scrips)
                                              │
                                              ▼
                               `app/page.tsx` Dashboard & `app-shell.tsx`
                               • Alerts Table Renders Watchlist & Badges
                               • Notification Bell Drawer Combines Live Scores
───────────────────────────────────────────────────────────────────────────────────────────
PHASE D: IN-DEPTH PARTICIPANT & SCRIP CONDUCT AUDIT
  User Clicks "Analyze Scrip" ──► `/analysis/[symbol]` Page
                                         │
                                         ▼
                           `routers/surveillance.py` (/scrip/{symbol}/participants)
                                         │
                                         ▼
                           `surveillance_service.py`
                                         ├──► Reads `AGG_CLNT_SEC_DAY` (LTP Pushers, Volume Share)
                                         └──► Reads `AGG_PAN_PAIR_DAY` (Circular Loops & Wash Trades)
                                                    │
                                                    ▼
                           Renders Recharts Price Chart, LTP Push Table, Circular Loop Node Map
───────────────────────────────────────────────────────────────────────────────────────────
PHASE E: TRADE EXECUTION EXPLORATION & FORENSIC DOSSIERS
  User Navigates to `/trades` ──► `routers/trade_matches.py` (/api/v1/trades/)
                                          │
                                          ▼
                             `trade_matches_service.py` ──► `trade_matches_repo.py`
                                                                    │
                                                                    ▼
                                                 Projects `AGG_PAN_PAIR_DAY` + `AGG_SEC_DAY`
                                                 Extracts Same-Broker Wash Trade Flag (1)
                                                 Extracts HFT Algo Execution Flag (1)
                                                                    │
                                                                    ▼
                             Renders Paginated Millisecond Execution Match Log Table
───────────────────────────────────────────────────────────────────────────────────────────
```

---

## 5. PVASF Core Surveillance Engine & Scoring Algorithms

The framework shortlists high-risk scrips by evaluating 5 core statistical parameters over a 15-day observation window against a 180-day baseline ($T-180$). Each parameter awards a score of **0, 1, 3, or 5 points**.

### 5.1 Parameter 1: Price Rise Percentage

Compares the highest price in the last 15 days against the closing price at $T-180$:

$$\text{Price Rise \%} = \frac{\max(\text{High}_{15d}) - \text{Close}_{T-180}}{\text{Close}_{T-180}} \times 100$$

| Price Rise Range | Awarded Score |
| :--- | :---: |
| $< 15\%$ | **0** |
| $15.0\% - 75.0\%$ | **1** |
| $75.1\% - 150.0\%$ | **3** |
| $> 150.0\%$ | **5** |

---

### 5.2 Parameter 2: Price Z-Score

Evaluates whether average closing price during the last 15 days is statistically anomalous compared to the 180-day baseline distribution:

$$Z_{\text{Price}} = \frac{\mu_{P,15d} - \mu_{P,180d}}{\sigma_{P,180d}}$$

| Price Z-Score Threshold | Awarded Score | Statistical Significance |
| :--- | :---: | :--- |
| $Z < 1.645$ | **0** | Normal variance ($< 95\%$ confidence) |
| $1.645 \le Z < 2.33$ | **1** | Statistically significant ($95\%$ confidence) |
| $2.33 \le Z < 3.09$ | **3** | Highly anomalous ($99\%$ confidence) |
| $Z \ge 3.09$ | **5** | Extreme outlier ($99.9\%$ confidence) |

---

### 5.3 Parameter 3: Volume Z-Score

Evaluates whether average daily volume during the last 15 days is statistically anomalous compared to the 180-day baseline:

$$Z_{\text{Volume}} = \frac{\mu_{V,15d} - \mu_{V,180d}}{\sigma_{V,180d}}$$

| Volume Z-Score Threshold | Awarded Score | Liquidity Assessment |
| :--- | :---: | :--- |
| $Z < 1.645$ | **0** | Normal volume |
| $1.645 \le Z < 2.33$ | **1** | Elevated volume burst |
| $2.33 \le Z < 3.09$ | **3** | Heavy volume surge |
| $Z \ge 3.09$ | **5** | Extreme liquidity spike |

---

### 5.4 Parameter 4: Price Band Persistence (Circuit Hits)

Counts the number of trading days in the last 15 days where the daily High price reached at least **90% of the upper circuit limit**:

$$\text{Band Hit Count} = \sum_{t=T-15}^{T} \mathbb{I}\left(\text{High}_t \ge 0.90 \times \text{UpperCircuit}_t\right)$$

| Band Hit Count (Last 15 Days) | Awarded Score |
| :--- | :---: |
| $0 - 2\text{ days}$ | **0** |
| $3 - 5\text{ days}$ | **1** |
| $6 - 9\text{ days}$ | **3** |
| $\ge 10\text{ days}$ | **5** |

---

### 5.5 Parameter 5: 180-Day New High Breakouts

Counts the number of times the stock created a new 180-day high during the previous 15 trading days:

$$\text{New High Count} = \sum_{t=T-15}^{T} \mathbb{I}\left(\text{High}_t > \max_{j=t-180}^{t-1}(\text{High}_j)\right)$$

| New High Count (Last 15 Days) | Awarded Score |
| :--- | :---: |
| $0\text{ days}$ | **0** |
| $1 - 4\text{ days}$ | **1** |
| $5 - 9\text{ days}$ | **3** |
| $\ge 10\text{ days}$ | **5** |

---

### 5.6 Weighted Composite Score & Risk Triage

The weighted composite score is computed using configurable weights in [`pv_alert_surveillance.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/pv_alert_surveillance.py#L128-L135):

$$\text{PVASF Final Risk Score} = \sum_{i=1}^{5} \frac{w_i \cdot S_i}{5.0}$$

**Active Default Weight Allocation:**  
- $w_1$ (Price Rise %) = **25.0** (25%)
- $w_2$ (Price Z-Score) = **20.0** (20%)
- $w_3$ (Volume Z-Score) = **25.0** (25%)
- $w_4$ (Band Persistence) = **15.0** (15%)
- $w_5$ (New Highs) = **15.0** (15%)

**Active Watchlist Triage Thresholds:**  
- **HIGH Risk**: Score $\ge 15.0$ (Immediate investigation mandatory)
- **MEDIUM Risk**: $10.0 \le \text{Score} < 15.0$ (Surveillance review queue)
- **LOW Risk**: Score $< 10.0$ (Normal trading pattern)

---

## 6. Participant Conduct Audit & Algorithmic Intelligence

### 6.1 LTP Contribution % (Price Pushers)
Measures positive price impact derived from participant trades stored in `AGG_CLNT_SEC_DAY` (`Acsd_Pos_Cont_Val` - `Acsd_Neg_Cont_Val`).

### 6.2 Volume Share %
Measures each participant PAN's share of total traded volume during the observation window:

$$\text{Volume Share \% (PAN}_i) = \frac{\sum (\text{Acsd\_Buy\_Tot\_Qty}_i + \text{Acsd\_Sell\_Tot\_Qty}_i)}{\text{Total Traded Volume in 15d}} \times 100$$

### 6.3 Counterparty Pairs & Circular Loop Detection
Evaluates trade match concentration between buyer PAN ($A$) and seller PAN ($B$) from `AGG_PAN_PAIR_DAY`. Multi-node circular rotation ($A \rightarrow B \rightarrow C \rightarrow A$) is detected by traversing counterparty volume graphs.

### 6.4 Wash Trade Audit
Trade executions are audited for wash trade indicators:
- `Appd_Same_Broker_Wash_Flag = 1` / `Ftrd_Same_Broker_Wash_Flag = 1`: Buy and sell orders matched within the same Trading Member.

---

## 7. Complete Database Schemas & Entity-Relationship Models

The official PVASF framework is built on a **3-Tier Enterprise SEBI Data Warehouse Architecture**:
1. **Dimension Layer (`DECL`, `DDCL`):** Legal entity demographics, PAN resolution, depository demat accounts, joint holders, and Power of Attorney (POA) hubs.
2. **Fact Execution Layer (`FMSH`, `FCAC`):** Order IDs, corporate actions, and forensic dossiers. (*Note: In the active Python backend, millisecond trade match records `AggTradeRecord` are projected dynamically from `AGG_PAN_PAIR_DAY` + `AGG_SEC_DAY` by `TradeMatchesRepository`*).
3. **Aggregate Layer (`AGG_SEC_DAY`, `AGG_CLNT_SEC_DAY`, `AGG_PAN_PAIR_DAY`):** Pre-calculated daily security closing prices (30-min VWAP), OHLC bars, client volume shares, positive/negative/net LTP price push contributions, daily wash trade totals, and buyer-seller PAN pair concentrations.

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
│    AGG_PAN_PAIR_DAY (APPD)    │                               │                      │ Client
├───────────────────────────────┤               ┌───────────────┴───────────────┐      │ PAN
│ Appd_Buy_Clnt_Token ──────────┼───────────────► Ddcl_Clnt_Token (PK)          │      │
│ Appd_Sell_Clnt_Token ─────────┤               │ Ddcl_Clnt_Pan (PAN Key) ◄─────┴──────┘
│ Appd_Trd_Date, Appd_Cmp_Token │               │ Ddcl_Dp_Id (NSDL/CDSL DP)     │
│ Appd_Buy_Tot_Qty, Val         │               │ Ddcl_Jnt_Hldr1_Pan            │
│ Appd_Same_Broker_Wash_Flag    │               │ Ddcl_Poa_Hldr_Pan             │
└───────────────────────────────┘               └───────────────────────────────┘
```

---

### Physical Teradata Warehouse ORM Matrix (18 SQLAlchemy ORM Models)

| Table Name | Short Name | ORM Class Name | Domain / Category | Framework Purpose & Consuming Modules |
| :--- | :---: | :---: | :--- | :--- |
| `DIM_EXCH_CLNT_DTLS` | `DECL` | `DimExchClntDtls` | Exchange Client Master | Client PAN legal resolution, trading member broker IDs & city/state clusters |
| `DIM_DEP_CLNT_DTLS` | `DDCL` | `DimDepClntDtls` | Depository Client Master | Demat beneficiary owner accounts, joint holder PANs & POA control hubs |
| `FACT_MSTR_SHAREHLDG` | `FMSH` | `FactMstrSharehldg` | Shareholding Header | Master record for quarterly shareholding filing status & reporting dates |
| `FACT_MAIN_SHLDNG` | `FSHG` | `FactMainShldng` | Main Shareholding Record | Promoter float % vs. Public float % & total promoter share pledge % |
| `FACT_PROM_SHLDR_DTLS` | `FPRH` | `FactPromShldrDtls` | Promoter Shareholder Details | Promoter entity names, individual share counts & pledged share percentages |
| `FACT_PUB_SHLDR_DTLS` | `FPUH` | `FactPubShldrDtls` | Public Shareholder Details | Listing of public institutional & non-institutional entities holding >1% |
| `FACT_DVR_SHLDNG` | `FDVR` | `FactDvrShldng` | Differential Voting Rights | Shareholding pattern for stocks with DVR share classes (Class X, Y, Z) |
| `FACT_DR_HOLDING` | `FDRH` | `FactDrHolding` | Depository Receipts | Outstanding ADR/GDR counts and underlying custodian shares |
| `FACT_LKDIN_SHLDNG` | `FLKD` | `FactLkdinShldng` | Locked-In Shareholding | Locked-in promoter/public share counts and lock-in expiry dates |
| `FACT_CMP_EXCH_SHLDNG` | `FCES` | `FactCmpExchShldng` | Company Exchange Index | Mapping index for company tokens, trade periods, and filing dates |
| `FACT_CORP_ACTIONS` | `FCAC` | `FactCorpActions` | Corporate Announcements | Official disclosures for dividends, bonus issues, stock splits & record dates |
| `FACT_CA_DIL_FCTR` | `FCDF` | `FactCaDilFctr` | Corporate Action Dilution | Price dilution adjustment factors (e.g. 0.500000 for 1:1 bonus/split) |
| `FORENSIC_CASES` | `CASES` | `ForensicCase` | Dossier Persistence | Persistence for regulatory investigation dossiers & pinned trade evidence |
| `SYS_USERS` | `USERS` | `SysUser` | Security & RBAC | Salted SHA-256 password authentication & RBAC roles (`Admin`, `Analyst`, `Viewer`) |
| `SYS_AUDIT_LOGS` | `LOGS` | `SysAuditLog` | Immutable Security Audit Log | Security audit trail recording user logins, weight changes & KYC views |
| `AGG_SEC_DAY` | `ASD` | `AggSecDay` | Trade Security Aggregate | Official 30-min VWAP Close (`Asd_Close_Price`), OHLC bars & 52W Highs/Lows |
| `AGG_CLNT_SEC_DAY` | `ACSD` | `AggClntSecDay` | Trade Client Aggregate | Pre-calculated daily client volume share, LTP push & wash trade counts |
| `AGG_PAN_PAIR_DAY` | `APPD` | `AggPanPairDay` | Trade PAN Pair Aggregate | Pre-calculated buyer-seller PAN pair matched volume, value & circular loops |

---

## 8. End-to-End System Data Lineage

```
[ AGG_SEC_DAY ] ───────────┐
[ AGG_CLNT_SEC_DAY ] ──────┼──► [ AggTradesRepository ] ──► [ EODSurveillanceService ]
[ AGG_PAN_PAIR_DAY ] ──────┤                                        │
[ DIM_EXCH_CLNT_DTLS ] ────┤                                        ▼
[ DIM_DEP_CLNT_DTLS ] ─────┘                           Computes 5 Anomaly Scores
                                                       Calculates Client LTP Push & PnL
                                                       Extracts Wash Trades & Circular Loops
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

## 9. UI/UX Blueprint, Navigation & Page Route Matrix

The PVASF frontend is built with Next.js 15 App Router, Tailwind CSS, Recharts, and Lucide React icons, adhering to a **Single Continuous Workspace Paradigm**.

### 9.1 Institutional Charting Engine Features ([`charts.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/investigation/charts.tsx))

1. **Interactive Scrub & Pinch-Zooming (`<Brush />`)**:
   - Every chart includes an interactive range slider at the bottom.
   - Analysts can scrub, drag start/end boundaries, and zoom into specific trading sessions or anomaly days down to single-day granularity.

2. **Time Horizon Quick Filters**:
   - Preset time window buttons added to each chart header: **`15D`**, **`30D`**, **`90D`**, **`ALL (181D)`**.

3. **Live Hover Data Inspector Readout**:
   - Real-time data bar above the canvas displaying exact values under the cursor:
     - **Price Chart**: `Date` · `Close Price` · `Open` · `High / Low` · `% Change vs Baseline` · `20D MA` · `50D MA`.
     - **Volume Charts**: `Date` · `Traded Volume` · `15D MA Volume` · `Surge Multiplier (e.g. 4.19x 15D MA)` · `Anomaly Risk Label`.

4. **Dynamic Anomaly Bar Coloring**:
   - Volume bars are automatically risk-colored:
     - **Crimson Red (`#e11d48`)**: Extreme Anomaly ($\ge 3.0\times$ 15D MA).
     - **Amber (`#f59e0b`)**: Elevated Volume Surge ($1.5\times \text{--} 3.0\times$ 15D MA).
     - **Royal Blue (`#3b82f6` / `#93c5fd`)**: Normal Traded Volume.

---

### 9.2 Page Route Code Reference & Functional Matrix

| Route Path | File Location | Primary Purpose & Key Functionality | Main Components Used | API Endpoints Invoked |
| :--- | :--- | :--- | :--- | :--- |
| `/` | [`app/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/page.tsx) | **Executive Surveillance Dashboard**: Main triage workspace displaying high-risk scrips, executive KPI stat cards, and composite risk filters. | `KpiCard`, `AlertsTable`, `FilterPanel` | `/api/v1/surveillance/scrips`, `/api/v1/surveillance/weights` |
| `/analysis/[symbol]` | [`app/analysis/[symbol]/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/analysis/[symbol]/page.tsx) | **Single Continuous Stock Workspace**: 5-Tab deep dive for a selected stock (Overview, 5-Metric Breakdown, 180d OHLCV Chart, Trade Execution Matches, Participant Conduct Audit & Case Dossier creation). | `InvestigationWorkspace`, `Charts`, `Timeline`, `MetricCard` | `/api/v1/surveillance/scrip/{scrip_id}`, `/scrip/{scrip_id}/participants`, `/shareholding-breakdown`, `/corporate-actions` |
| `/trades` | [`app/trades/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/trades/page.tsx) | **Trade Execution Explorer**: Full-featured execution match search with pagination, filtering by wash trade flag, HFT CTCL flag, date range, and order depth. | `Badge`, `Input`, `Button` | `/api/v1/trades/`, `/api/v1/trades/stats/daily`, `/api/v1/trades/analysis/wash-trades` |
| `/clients` | [`app/clients/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/clients/page.tsx) | **Client 360° Directory**: Entity resolution lookup mapping Exchange Accounts (`DECL`) with Depository Demat Accounts (`DDCL`) by PAN. | `Badge`, `Input` | `/api/v1/clients/exchange`, `/api/v1/clients/depository`, `/api/v1/clients/pan/{pan}` |
| `/cases` | [`app/cases/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/cases/page.tsx) | **Forensic Case Management**: Case dossier triage workspace to track open regulatory investigations, assign investigators, and record notes. | Case Grid, Case Creator Modal | `/api/v1/cases/`, `/api/v1/cases/{case_id}` |
| `/compare` | [`app/compare/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/compare/page.tsx) | **Multi-Scrip Comparison Matrix**: Side-by-side comparative analysis of scrips across all 5 anomaly metrics. | Comparison Grid, Metric Cards | `/api/v1/surveillance/scrips`, `/api/v1/surveillance/scrip/{symbol}` |
| `/members` | [`app/members/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/members/page.tsx) | **Broker & Clearing Member Conduct**: Monitor trading member concentration and wash trade ratios across stock brokers. | Member Stat Cards, Broker Table | `/api/v1/trades/analysis/wash-trades`, `/api/v1/trades/analysis/algo-breakdown` |
| `/algo-ctcl` | [`app/algo-ctcl/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/algo-ctcl/page.tsx) | **CTCL & Algo Intelligence**: Specialized dashboard auditing High-Frequency Trading (HFT) algorithms and terminal IDs. | Algo Distribution Charts | `/api/v1/trades/analysis/algo-breakdown` |
| `/history` | [`app/history/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/history/page.tsx) | **Regulatory Audit & Alert History**: Log of historical alert triggers, user actions, and investigation archives. | History Table, Filter Toolbar | `/api/v1/auth/audit-logs`, `/api/v1/surveillance/scrips` |
| `/settings` | [`app/settings/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/settings/page.tsx) | **System Settings & Model Tuning**: Calibrate metric weights ($w_1 \dots w_5$), set alert thresholds, and manage system users. | Weight Tuning Sliders, User Table | `/api/v1/surveillance/weights`, `/api/v1/auth/users` |

---

## 10. API Service Reference Matrix

| API Endpoint | Verb | Input Parameters | Output Payloads / DTO | Purpose |
| :--- | :---: | :--- | :--- | :--- |
| `/api/v1/surveillance/health` | `GET` | None | `{"status": "ONLINE", "spec": "..."}` | System operational & spec alignment check. |
| `/api/v1/surveillance/scrips` | `GET` | `search` | `List[ScripSummary]` | Active scrips summary & executive dashboard watchlist triage. |
| `/api/v1/surveillance/scrip/{scrip_id}` | `GET` | `scrip_id` | `ScripDetailDTO` | 181-day historical OHLCV chart, scorecards, announcements & shareholding. |
| `/api/v1/surveillance/scrip/{scrip_id}/participants` | `GET` | `scrip_id` | `ParticipantAudit` | Participant conduct audit: LTP pushers, volume share, PnL & wash trades. |
| `/api/v1/surveillance/scrip/{scrip_id}/shareholding-breakdown` | `GET` | `scrip_id` | `DWBISShareholdingBreakdownDTO` | Full Enterprise Data Warehouse quarter-by-quarter shareholding trends (`FSHG`, `FPRH`). |
| `/api/v1/surveillance/scrip/{scrip_id}/corporate-actions` | `GET` | `scrip_id` | `List[DWBISCorpActionDTO]` | Official Regulatory corporate actions & price dilution factors (`FCAC`, `FCDF`). |
| `/api/v1/surveillance/weights` | `POST` | `{"weights": {...}, "threshold": X}` | `UpdatedWeightsDTO` | Dynamically updates scoring weights $w_1 \dots w_5$ & alert triage threshold. |
| `/api/v1/trades/` | `GET` | `symbol`, `date_from`, `date_to`, `wash_flag`, `algo_flag`, `page`, `page_size` | `PaginatedTradesDTO` | Filtered & paginated trade matches projected from `AGG_PAN_PAIR_DAY` + `AGG_SEC_DAY`. |
| `/api/v1/trades/stats/daily` | `GET` | None | `List[DailySymbolStatsDTO]` | Daily trade count & value metrics for volume heatmaps. |
| `/api/v1/trades/analysis/wash-trades` | `GET` | `date_from`, `date_to` | `WashTradeSummaryDTO` | Same-broker wash trade analytics & counterparty pair matrix. |
| `/api/v1/trades/analysis/algo-breakdown` | `GET` | `date_from`, `date_to` | `AlgoBreakdownDTO` | HFT CTCL vs manual trade volume breakdown. |
| `/api/v1/clients/exchange` | `GET` | `pan`, `tm_id`, `clnt_id`, `name`, `catg_type`, `stat`, `page` | `PaginatedExchClientsDTO` | List exchange client accounts from `DIM_EXCH_CLNT_DTLS` (`DECL`). |
| `/api/v1/clients/exchange/search` | `GET` | `q` (PAN/Name/ID), `limit` | `List[DimExchClntBase]` | Full-text client account search (`DECL`). |
| `/api/v1/clients/depository` | `GET` | `pan`, `dp_id`, `clnt_id`, `name`, `page` | `PaginatedDepClientsDTO` | List depository demat accounts from `DIM_DEP_CLNT_DTLS` (`DDCL`). |
| `/api/v1/clients/pan/{pan}` | `GET` | `pan` | `ClientDetail` | Client 360° lookup by PAN for identity resolution. |
| `/api/v1/cases/` | `GET`, `POST` | `status`, `target_symbol` | `List[ForensicCaseDTO]` | List or create forensic case dossiers (`FORENSIC_CASES`). |
| `/api/v1/cases/{case_id}` | `GET`, `PUT`, `DELETE` | `case_id`, `status` | `ForensicCaseDTO` | Fetch, advance status lifecycle, or update forensic case dossier. |
| `/api/v1/auth/login` | `POST` | `username`, `password` | `UserSessionDTO` | PBKDF2-HMAC-SHA256 password authentication & bearer token generation. |
| `/api/v1/auth/users` | `GET`, `POST` | `username`, `role` | `List[UserResponse]` | Role-Based Access Control (RBAC) user account management (`SYS_USERS`). |
| `/api/v1/auth/audit-logs` | `GET` | `username`, `action` | `List[AuditLogResponse]` | Immutable security audit trail logs (`SYS_AUDIT_LOGS`). |
| `/api/aggregates/security/{symbol}` | `GET` | `symbol`, `start_date`, `end_date`, `limit` | `List[AggSecDaySchema]` | Security daily aggregates: Official 30-min VWAP Close, OHLC bars (`AGG_SEC_DAY`). |

---

## 11. Role-Based Access Control (RBAC) & Security Architecture

### 11.1 Security Architecture & Authentication Protocol
- **Authentication Engine**: PBKDF2-HMAC-SHA256 password hashing with salt.
- **Authorization Dependency**: Enforced via FastAPI dependency injection (`get_current_user`, `require_admin`).
- **Audit Logging**: Every sensitive action (weight calibration, login, KYC PAN view) is logged to `SYS_AUDIT_LOGS`.

### 11.2 Role Access Matrix

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

---

## 12. Engineering Audit & Verification Results

| Framework Area | Coverage Status | Implementation Classification | Evidence & Notes |
| :--- | :---: | :--- | :--- |
| **Data Inputs** | **Exact Implementation** | Production-Grade Engine | Master scrips, 181d trade archives ($T-180$ baseline), and upper circuit hit flags active. |
| **Five Core Metrics** | **Exact Implementation** | Mathematical Accuracy | All 5 formulas, thresholds (0, 1, 3, 5), and active weights ($w_1=25.0, w_2=20.0, w_3=25.0, w_4=15.0, w_5=15.0$) active in `pv_alert_surveillance.py`. |
| **Composite Scoring** | **Exact Implementation** | Production-Grade Math | Weighted composite risk score and watchlist triage active ($S \ge 15.0$ High Risk). |
| **Participant Metrics** | **Exact Implementation** | Teradata Join Replica | LTP contribution %, volume share %, counterparty pairs, circular trade loop indicators active. |
| **Dashboard Outputs** | **Exact Implementation** | Production-Grade UI | Market charts, metrics, participant tables, trade match logs, and Client 360° identity resolution views. |
| **Teradata Architecture**| **Exact Implementation** | SQLite & Teradata DW ORM | 18 ORM table schemas (`DECL`, `DDCL`, `ASD`, `ACSD`, `APPD`, etc.); 100% compliant with enterprise Teradata warehouse extract specs. |
