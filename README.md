# Price-Volume Alert Surveillance Framework (PVASF)
## Internal Engineering, Data Science & Compliance Operations Manual

> **CONFIDENTIAL & PROPRIETARY — FOR INTERNAL TEAM USE ONLY**  
> This repository contains the complete enterprise codebase, quantitative surveillance algorithms, database schemas, and compliance UI workspace for the Price-Volume Alert Surveillance Framework (PVASF).

---

## 1. Executive Summary & Internal Architecture Overview

The **Price-Volume Alert Surveillance Framework (PVASF)** is an enterprise market surveillance platform designed to detect artificial price inflation, liquidity pump schemes, circular trading, and wash trading across listed securities.

The platform operates on a **3-Tier Enterprise SEBI Data Warehouse** architecture (`AGG_SEC_DAY`, `AGG_CLNT_SEC_DAY`, `AGG_PAN_PAIR_DAY`, `DIM_EXCH_CLNT_DTLS`, `DIM_DEP_CLNT_DTLS`), combining a **180-day baseline** with a **15-day observation window** to evaluate five core statistical anomaly parameters.

---

## 2. Internal Documentation Map & Authoritative Guides

The repository contains specialized `.md` specification documents. Every internal team member (Engineers, Quantitative Analysts, DBAs, and Compliance Officers) **must strictly consult the appropriate reference document before modifying code, SQL queries, or scoring parameters**:

| Documentation File | Target Internal Role | Primary Purpose & Contents | How to Use Carefully |
| :--- | :--- | :--- | :--- |
| **[`SYSTEM_ARCHITECTURE_GUIDE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/SYSTEM_ARCHITECTURE_GUIDE.md)** | Full-Stack Engineers, System Architects, Compliance Tech Leads | **Master System Architecture & Codebase Map (v3.3.0)**.<br/>Contains end-to-end data lineage, full file-by-file module directory, 18-table ORM mapping, API service matrix (21 endpoints), RBAC permissions, and UI component ownership. | **MANDATORY**: Read before creating new API endpoints, refactoring services, modifying state management, or altering system topology. Serves as the **Single Source of Truth** for technical implementation. |
| **[`PVASF_CORE_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_CORE_SPEC.md)** | Quantitative Analysts, Surveillance Modelers, Risk Officers | **Regulatory Anomaly Engine & Scoring Formulas**.<br/>Details the mathematical formulas for Price Rise %, Price Z-Score, Volume Z-Score, Upper Circuit Persistence, 180D New Highs, raw score cutoffs (0, 1, 3, 5), default weights ($w_1=25, w_2=20, w_3=25, w_4=15, w_5=15$), and watchlist triage thresholds ($S \ge 15.0$). | **CAUTION**: Consult whenever calibrating surveillance scoring logic, adjusting parameter cutoffs, or verifying mathematical correctness. Do NOT change default weights without updating `pv_alert_surveillance.py` and running tests. |
| **[`PVASF_SCHEMA_REFERENCE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_SCHEMA_REFERENCE.md)** | Data Engineers, DBAs, Backend Developers | **Enterprise Data Warehouse Physical Schema Reference**.<br/>Column-by-column physical specifications for all 18 database tables (`ASD`, `ACSD`, `APPD`, `DECL`, `DDCL`, `FSHG`, `FPRH`, `FCAC`, etc.), foreign key relationships, surrogate tokens, and indexing strategies. | **MANDATORY**: Check before adding or altering SQLAlchemy models in `backend/db/models.py` or writing raw SQL queries. Ensures 100% compatibility with production Teradata extracts. |
| **[`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md)** | Data Engineering Team, Database Administrators | **Teradata ETL & Production SQL Extraction Queries**.<br/>Contains ANSI SQL extraction scripts, table join logic, and business column mapping for pulling 260-day EOD market feeds from enterprise Teradata warehouses into the surveillance engine. | **USE WHEN**: Setting up production database pipelines, configuring Teradata ODBC/JDBC connectors, or updating batch ingestion scripts. |
| **[`TRADE_AGGREGATE_REARCHITECTURE_PLAN.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/TRADE_AGGREGATE_REARCHITECTURE_PLAN.md)** | Backend Engineers, High-Frequency Trading Analysts | **30-Minute VWAP & PAN-Pair Rearchitecture Plan**.<br/>Technical specification documenting 30-minute Volume-Weighted Average Price (VWAP) close calculations, wash trade flags, and millisecond trade execution projections. | **USE WHEN**: Working on millisecond trade match explorer features (`/trades`), wash trade matrix analysis, or CTCL/HFT algo intelligence endpoints. |

---

## 3. Technology Stack & Component Ownership

- **Frontend**: Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS)
- **Charting Engine**: Recharts (Interactive `<Brush />` zoom, live hover inspector, risk-colored volume bars `#e11d48`, `#f59e0b`, `#3b82f6`)
- **Backend API**: FastAPI (Python 3.9+, Pydantic v2, Uvicorn)
- **Surveillance Engine**: Pure-Python `pv_alert_surveillance.py` (Vectorized NumPy/Pandas math)
- **Data Layer**: SQLAlchemy 2.0 ORM with SQLite (Development/Test) & Teradata Data Warehouse (Production)
- **Security & Auth**: PBKDF2-HMAC-SHA256 password hashing, Bearer Token Auth, RBAC middleware, and `SYS_AUDIT_LOGS` logging

---

## 4. Repository Directory Structure

```
UI_PVASF/
├── app/                                    # Next.js App Router Page Routes
│   ├── page.tsx                            # Executive Surveillance Dashboard & Watchlist (Route: /)
│   ├── analysis/[symbol]/page.tsx          # Single Continuous Stock Workspace (Route: /analysis/[symbol])
│   ├── analyse/[symbol]/page.tsx           # Route alias for analysis workspace
│   ├── trades/page.tsx                     # Trade Execution Explorer & Order Matches (Route: /trades)
│   ├── clients/page.tsx                    # Client 360° Directory & Identity Resolution (Route: /clients)
│   ├── cases/page.tsx                      # Forensic Case Dossier Workspace (Route: /cases)
│   ├── compare/page.tsx                    # Multi-Scrip Anomaly Comparison Matrix (Route: /compare)
│   ├── members/page.tsx                    # Clearing Member & Broker Conduct Monitor (Route: /members)
│   ├── algo-ctcl/page.tsx                  # CTCL Terminal & HFT Algo Intelligence (Route: /algo-ctcl)
│   ├── history/page.tsx                    # Regulatory Alert Audit & Triage Log (Route: /history)
│   └── settings/page.tsx                   # Model Weight Calibration & User Management (Route: /settings)
│
├── components/                             # Reusable React UI Components
│   ├── layout/app-shell.tsx                # Main Layout Shell & Navigation Drawer
│   ├── dashboard/                          # Watchlist Table, KPI Cards, Filter Panels
│   ├── investigation/                      # 180D Candlestick Charts, Participant Audits, Dossiers
│   └── ui/                                 # Shared UI Primitives (Badges, Buttons, Cards, Modals)
│
├── lib/                                    # Frontend API Connectors & Client Context
│   ├── api.ts                              # Unified REST Fetch Client Layer (`getAuthHeaders`)
│   ├── user-context.tsx                    # React User Session & RBAC Role Context
│   └── metric-help.ts                      # Parameter Formula Descriptions & Reference Metadata
│
├── backend/                                # FastAPI Python Backend
│   ├── main.py                             # FastAPI Server Entrypoint & CORS Setup
│   ├── security.py                         # Password Hashing & Bearer Token Authorization
│   ├── db/                                 # Database Engine, Models & Synthetic Seeder
│   │   ├── database.py                     # SQLAlchemy Engine & Session Factory
│   │   ├── models.py                       # 18 Relational Table ORM Models
│   │   └── seed.py                         # Synthetic Market Data Generator (260 Trading Days)
│   ├── repositories/                       # Data Access Layer (SQL Query Compilation)
│   ├── services/                           # Business Domain Services & Score Engine Integration
│   ├── routers/                            # REST API Endpoints (`surveillance`, `trades`, `cases`, `auth`)
│   └── schemas/                            # Pydantic v2 Request/Response Validation DTOs
│
├── pv_alert_surveillance.py                # Standalone Pure-Python Anomaly Engine & Math Formulas
├── SYSTEM_ARCHITECTURE_GUIDE.md            # Master Architecture & Technical Specification (v3.3.0)
├── PVASF_CORE_SPEC.md                      # SEBI Anomaly Metric Formulas & Score Mapping
├── PVASF_SCHEMA_REFERENCE.md               # 18-Table Data Warehouse Column Specification
├── DATA_REQUEST_SPEC.md                    # Teradata ETL & Production SQL Extraction Queries
└── TRADE_AGGREGATE_REARCHITECTURE_PLAN.md  # 30-Min VWAP Close & Trade Match Projection Plan
```

---

## 5. Local Setup & Execution Guide for Internal Developers

### 5.1 Backend Service (FastAPI) Setup

```bash
# 1. Navigate to project root directory
cd "/Users/vishesh/Downloads/UI_PVASF copy"

# 2. Activate virtual environment (or create one using python -m venv .venv)
source .venv/bin/activate

# 3. Install required Python packages
pip install -r backend/requirements.txt

# 4. Initialize and seed the development SQLite database
python3 -c "from backend.db.database import init_db, SessionLocal; from backend.db.seed import seed_database; init_db(); db=SessionLocal(); seed_database(db); db.close()"

# 5. Start FastAPI development server (runs on http://127.0.0.1:8000)
python3 -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```
*Interactive OpenAPI Swagger documentation is available at `http://127.0.0.1:8000/docs`.*

---

### 5.2 Frontend Workspace (Next.js 15) Setup

```bash
# In a new terminal window:
cd "/Users/vishesh/Downloads/UI_PVASF copy"

# 1. Install Node.js dependencies
npm install

# 2. Start Next.js development server (runs on http://localhost:3000)
npm run dev
```

---

## 6. Verification & Testing Protocol

Before committing code changes or deploying updates, internal engineers **must run all of the following verification commands**:

```bash
# 1. Verify TypeScript type safety across all React components and API DTOs
npx tsc --noEmit

# 2. Run Python backend test suite (verifies engine math, endpoints, DB queries, and auth)
python3 -m pytest tests/ -v

# 3. Test production Next.js build
npm run build
```

---

## 7. Security & Confidentiality Directives

1. **Do NOT Hardcode Credentials**: Always use authorization bearer headers via `getAuthHeaders()` in `lib/api.ts`.
2. **Audit Logging**: Any changes to model weights, user permissions, or PII PAN lookups automatically generate immutable entries in `SYS_AUDIT_LOGS`.
3. **Proprietary Notice**: Source code, quantitative algorithms, and schema definitions are proprietary internal property. Unauthorized copying or external distribution is strictly prohibited.
