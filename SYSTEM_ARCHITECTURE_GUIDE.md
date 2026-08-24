# Price-Volume Alert Surveillance Framework (PVASF)
## Master System Architecture, Algorithmic Engine & Technical Manual

**Document Version:** 3.6.0 (Absolute Single Source of Truth — Fully Synchronized)  
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

---

## 3. Comprehensive File-by-File Code & Module Directory

```
UI_PVASF/
├── app/                                    # Next.js App Router Routes & Page Workspaces
│   ├── layout.tsx                          # Root Application Layout Shell
│   ├── page.tsx                            # Executive Surveillance Watchlist Dashboard (Route: /)
│   ├── analysis/[symbol]/page.tsx          # Single-Stock Forensic Analysis Workspace (Route: /analysis/[symbol])
│   ├── history/page.tsx                    # Immutable Security Audit Logs (Route: /history)
│   └── settings/page.tsx                   # Model Parameter Calibration & User Management (Route: /settings)
│
├── components/                             # UI Component Layer
│   ├── layout/app-shell.tsx                # AppShell Layout Header with Profile Switcher Modal & Clean Title
│   ├── dashboard/alerts-table.tsx          # Surveillance Watchlist Table with Row Actions & Filters
│   ├── investigation/                      # Stock Analysis Workspaces, Recharts, Participant Audits
│   │   ├── charts.tsx                      # CombinedMarketChart, ParameterRadarChart, Anomaly Matrix
│   │   ├── investigation-workspace.tsx     # 5-Tab Forensic Workspace (Overview, Participants, P2P, Dossier, Graph)
│   │   ├── participant-audit-view.tsx      # LTP Pusher, Volume Cornering, Collusion & Loop Audit
│   │   └── client-360-drawer.tsx           # Full Participant Demographics & Account Intelligence
│   └── ui/                                 # Shared UI Primitives (Badges, Buttons, Cards, Modals, Popovers)
│
├── lib/                                    # Frontend Core Utilities & Connectors
│   ├── api.ts                              # Centralized REST API Client with Token Authentication
│   ├── user-context.tsx                    # User Session State & 1-Click Identity Switching
│   └── utils.ts                            # Tailwind CSS Helper Utilities
│
├── backend/                                # FastAPI Python Backend
│   ├── main.py                             # Server Entrypoint, CORS Setup & DB Initializer
│   ├── security.py                         # PBKDF2 Password Hashing & Bearer Token Authentication
│   ├── db/                                 # Database Layer
│   │   ├── database.py                     # SQLAlchemy Engine & Session Factory
│   │   ├── models.py                       # 18 Relational Table ORM Models + Security/Case Models
│   │   └── seed.py                         # Synthetic Market Data Generator (260 Trading Days)
│   ├── repositories/                       # Data-Access Layer
│   │   ├── cases_repo.py                   # Case Dossier Queries
│   │   └── trade_matches_repo.py           # Trade Match Reconstruction from Daily Aggregates
│   ├── routers/                            # REST API Endpoints
│   │   ├── surveillance.py                 # Watchlist Summary & Stock Detail Routes
│   │   ├── cases.py                        # Forensic Case Dossier CRUD Routes
│   │   ├── auth.py                         # User Management, Auth & System Audit Logs Routes
│   │   ├── clients.py                      # Participant Audits & Client 360° Drawer Routes
│   │   └── trade_matches.py                # Trade Log Filtering Routes
│   └── services/                           # Domain Services
│       ├── surveillance_service.py         # PVASF Scoring Engine Integration & Warehouse Extraction
│       ├── cases_service.py                # Forensic Case Management Logic
│       ├── auth_service.py                 # User Auth, RBAC & Audit Trail Service
│       └── client_service.py               # Client Profile & Demographics Service
│
├── tests/                                  # Automated Test Suite
│   └── test_backend_surveillance.py        # 20 Automated Unit & Integration Tests (100% Pass)
│
├── pv_alert_surveillance.py                # Pure-Python Scoring Framework Script
├── SYSTEM_ARCHITECTURE_GUIDE.md            # Master System Architecture Manual (v3.6.0)
├── PVASF_CORE_SPEC.md                      # SEBI Anomaly Engine & Scoring Formulas
├── PVASF_SCHEMA_REFERENCE.md               # 18-Table Physical Data Warehouse Schema Reference
├── DATA_REQUEST_SPEC.md                    # Teradata ETL & Production SQL Extraction Queries
├── BUSINESS_FUNCTIONAL_DATA_REQUIREMENTS.md# Business Data Requirements Specification
└── FUTURE_SCOPE.md                         # Future Roadmap & Analytical Scope
```

---

## 4. EOD Data Processing & Transformation Pipeline

### 4.1 Data Pipeline Execution Order
1. **Extraction (Teradata EOD Feed)**: Extracts daily traded security metrics (`AGG_SEC_DAY`), client trade summaries (`AGG_CLNT_SEC_DAY`), and paired counterparty volumes (`AGG_PAN_PAIR_DAY`).
2. **Baseline Computation (T-180 Window)**: Calculates the 180-day baseline closing price ($P_{T-180}$), baseline mean volume ($\mu_{\text{vol}}$), and baseline volume standard deviation ($\sigma_{\text{vol}}$).
3. **Observation Window Evaluation (15-Day Window)**: Evaluates peak price ($\text{High}_{15\text{D}}$), 15-day average daily returns, 15-day average volume ($\bar{V}_{15\text{D}}$), upper circuit band hits ($\ge 90\%$), and 180-day high breakouts.
4. **Metric Scoring & Cutoff Triage**: Maps raw metric values to ordinal scores ($0, 1, 3, 5$) and calculates the weighted composite score $S_{\text{final}}$. If $S_{\text{final}} \ge 15.0$, the scrip is flagged as **HIGH RISK** on the surveillance watchlist.

---

## 5. PVASF Core Surveillance Engine & Scoring Algorithms

The composite risk score is calculated as:

$$\text{Score}_{\text{Final}} = \sum_{i=1}^{5} w_i \times \left( \frac{\text{Score}_i}{5.0} \right)$$

Where parameter scores $\text{Score}_i \in \{0, 1, 3, 5\}$ and weights $\sum w_i = 100\%$:

| Metric # | Parameter Name | Evaluation Formula | Weight ($w_i$) | Scoring Thresholds (0, 1, 3, 5) |
| :--- | :--- | :--- | :--- | :--- |
| **Metric 1** | Price Rise % | $\frac{\text{High}_{15\text{D}} - P_{T-180}}{P_{T-180}} \times 100$ | 25% | $<15\% \to 0$, $15\text{--}75\% \to 1$, $76\text{--}150\% \to 3$, $>150\% \to 5$ |
| **Metric 2** | Price Z-Score | $\frac{\bar{R}_{15\text{D}} - \mu_{R, 180\text{D}}}{\sigma_{R, 180\text{D}}}$ | 20% | $Z < 1.645 \to 0$, $Z \ge 1.645 \to 1$, $Z \ge 2.33 \to 3$, $Z \ge 3.09 \to 5$ |
| **Metric 3** | Volume Z-Score | $\frac{\bar{V}_{15\text{D}} - \mu_{V, 180\text{D}}}{\sigma_{V, 180\text{D}}}$ | 25% | $Z < 1.645 \to 0$, $Z \ge 1.645 \to 1$, $Z \ge 2.33 \to 3$, $Z \ge 3.09 \to 5$ |
| **Metric 4** | Band Persistence | Count($\text{Move}_t \ge 0.90 \times \text{Band}$) | 15% | $0\text{--}2\text{d} \to 0$, $3\text{--}5\text{d} \to 1$, $6\text{--}9\text{d} \to 3$, $\ge 10\text{d} \to 5$ |
| **Metric 5** | 180D New Highs | Count($\text{High}_t > \max \text{High}_{t-180}^{t-1}$) | 15% | $0\text{d} \to 0$, $1\text{--}4\text{d} \to 1$, $5\text{--}9\text{d} \to 3$, $\ge 10\text{d} \to 5$ |

**Default Cutoff Threshold**: $15.0$ Points out of $100$.

---

## 6. Participant Conduct Audit & Algorithmic Intelligence

The platform executes six distinct forensic algorithms across client trading logs:

1. **Net LTP Contribution ("Price Pusher" Metric)**:
   - Sums the net price impact ($\Delta \text{LTP}$) generated by each entity's aggressive market orders.
   - Identifies entities artificially bidding prices upward.

2. **Volume Share Dominance ("Cornering" Metric)**:
   - $\text{Share \%} = \frac{\text{Entity Gross Volume}}{\text{Total Exchange Scrip Volume}} \times 100$.
   - Flags accounts controlling a disproportionate fraction of traded liquidity.

3. **Counterparty Pair Concentration ("Collusion" Metric)**:
   - Evaluates bilateral pair volumes ($PAN_A \leftrightarrow PAN_B$) against total volume.

4. **Trade Reversal Ratio (RTR / "Synchronized Reversal" Metric)**:
   - $\text{RTR} = \left[ \frac{2 \times \min(V_{A \to B}, V_{B \to A})}{V_{A \to B} + V_{B \to A}} \right] \times 100$.
   - Quantifies the extent to which shares were bought and sold back between two accounts without change of beneficial ownership.

5. **Circular Trading Loops ("Cycle Detection" Algorithm)**:
   - Directed graph DFS backtrack algorithm detecting closed rings of length 3 to 5 ($A \to B \to C \to A$).
   - Calculates the bottleneck rotated volume ($V_{\text{bottleneck}} = \min(e_1, e_2, \dots, e_k)$) and canonical cycle deduplication.

6. **Mark-to-Market PnL ("Profit Extraction" Metric)**:
   - $\text{Net PnL} = \text{Total Sell Value} - \text{Total Buy Value} + (\text{Net Remaining Quantity} \times P_{\text{Latest Close}})$.
   - Pinpoints who extracted cash profits during the pump rally.

---

## 7. Complete Database Schemas & Entity-Relationship Models

### 7.1 Security & User Management Tables

#### `SYS_USERS` (System User Accounts)
- `id` (INTEGER PRIMARY KEY)
- `username` (VARCHAR(50) UNIQUE)
- `email` (VARCHAR(100))
- `full_name` (VARCHAR(100))
- `department` (VARCHAR(100))
- `hashed_password` (VARCHAR(255)) — Encrypted using PBKDF2 (100,000 rounds)
- `role` (VARCHAR(20)) — `Admin`, `Analyst`, `Viewer`
- `is_active` (BOOLEAN)

#### `SYS_AUDIT_LOGS` (Immutable Security Audit Trail)
- `id` (INTEGER PRIMARY KEY)
- `timestamp` (DATETIME)
- `username` (VARCHAR(50))
- `role` (VARCHAR(20))
- `action` (VARCHAR(100))
- `target` (VARCHAR(100))
- `details` (TEXT)
- `ip_address` (VARCHAR(45))

#### `MODEL_SETTINGS` (Model Weights & Calibration)
- `id` (INTEGER PRIMARY KEY)
- `price_rise_weight` (FLOAT) — Default: 25.0
- `price_z_weight` (FLOAT) — Default: 20.0
- `volume_z_weight` (FLOAT) — Default: 25.0
- `band_hit_weight` (FLOAT) — Default: 15.0
- `new_high_weight` (FLOAT) — Default: 15.0
- `score_cutoff` (FLOAT) — Default: 15.0
- `updated_at` (DATETIME)
- `updated_by` (VARCHAR(50))

---

## 8. End-to-End System Data Lineage

```
 Teradata EOD Feed / Warehouse Aggregate Tables (AGG_SEC_DAY, AGG_CLNT_SEC_DAY, AGG_PAN_PAIR_DAY)
                                     │
                                     ▼
                      FastAPI Python Backend (Port 8000)
                                     │
                                     ▼
        Next.js Centralized Client (`lib/api.ts` with `getAuthHeaders()`)
                                     │
    ┌────────────────────────┬───────┴────────────────────────┐
    ▼                        ▼                                ▼
Dashboard            Analysis Workspace             Audit Trail & History
  (/)               (/analysis/[symbol])                 (/history)
```

---

## 9. UI/UX Blueprint, Navigation & Page Route Matrix

| Page Route | Purpose | Key UI Features |
| :--- | :--- | :--- |
| **`/`** | Executive Watchlist Dashboard | Clean AppHeader, KPI summary, risk distribution, Watchlist Table with status dropdown & direct action links (`Analyze Scrip`). |
| **`/analysis/[symbol]`** | Single-Stock Forensic Analysis Workspace | **3 Surveillance Tabs**:<br/>• **`Overview`**: Dual-Axis Surveillance Master Chart (20 & 50 DMA, Volume bars, Live Crosshair Stats Tracker, Screener `D: xx%` Delivery Metric, 15D Window Toggle, Adaptive Date Ticks), 180-Day Breakout & Band Persistence Matrix, 5-Parameter Radar Signature.<br/>• **`Shareholders`**: Direct comparative tables for Promoter / Top 1% / Public float (Day $t$ vs $T-180$), PAN Demographics (Unique PANs & Avg Trading PANs 15D vs 180D), and 15-Day Corporate Announcements (`FACT_CORP_ACTIONS`).<br/>• **`Participants`**: Participant Suspect Breakdown Table (Net LTP contribution, Buy/Sell volume, Concentration HHI, RTR, MTM PnL), Counterparty Pairs, and DFS Circular Trading Loops. |
| **`/history`** | Immutable System Audit Trail | Immutable Security & System Audit Logs (`SYS_AUDIT_LOGS`), action filtering, search query pre-fill (`/history?search=SYMBOL`), CSV exporter. |
| **`/settings`** | Model Settings & User Admin | Single consolidated Model Weight Calibration card with 1-click **Reset to Framework Defaults** button, User Management table (`SYS_USERS`), Security Audit Logs. |

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
| `/api/v1/clients/{pan}/profile` | GET | Returns Client 360° profile and registered accounts. | Authenticated |

---

## 11. Role-Based Access Control (RBAC) & Security Architecture

The application enforces three user roles:
1. **Admin**: Full system access, model weight recalibration, user management, and audit log inspection (`Vishesh Admin`).
2. **Analyst**: Surveillance analysis, case creation, status updates, and note logging (`A. Rao Analyst`).
3. **Viewer / Guest User**: Read-only access to scrip analysis and watchlist metrics (`Guest User`).

---

## 12. Engineering Audit & Verification Results

All components, algorithms, and backend REST endpoints have been validated:
- **Automated Test Suite**: 20 comprehensive unit and integration tests passing (`pytest -v` in [`tests/test_backend_surveillance.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/tests/test_backend_surveillance.py)).
- **TypeScript Type Checking**: `npx tsc --noEmit` passed with **0 errors**.
- **Security Audit**: All authentication checks, password hashing (PBKDF2), token validation, and RBAC guards verified.
