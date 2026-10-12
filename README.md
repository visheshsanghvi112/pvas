# Price-Volume Alert Surveillance Framework (PVASF)
## Internal Engineering, Data Science & Compliance Operations Manual

> **CONFIDENTIAL & PROPRIETARY — FOR INTERNAL TEAM USE ONLY**  
> This repository contains the complete enterprise codebase, quantitative surveillance algorithms, database schemas, and compliance UI workspace for the Price-Volume Alert Surveillance Framework (PVASF).

---

## 1. Executive Summary & Internal Architecture Overview

The **Price-Volume Alert Surveillance Framework (PVASF)** is an enterprise market surveillance platform designed to detect artificial price inflation, liquidity pump schemes, circular trading, and wash trading across listed securities.

The platform combines a **180-day historical baseline** with a **15-day observation window** to evaluate five core statistical anomaly parameters under an active calibrated configuration:
1. **Price Rise % vs T-180 Baseline** ($w_1 = 20.0\%$)
2. **Price Z-Score ($\sigma$)** ($w_2 = 20.0\%$)
3. **Volume Z-Score ($\sigma$)** ($w_3 = 20.0\%$)
4. **Upper Circuit Band Persistence** ($w_4 = 20.0\%$)
5. **180-Day New High Breakouts** ($w_5 = 20.0\%$)

If the composite score $S_{\text{final}} \ge 60.0$, the security is shortlisted for forensic investigation.

---

## 2. Internal Documentation Map & Authoritative Guides

| Documentation File | Target Role | Primary Purpose & Contents |
| :--- | :--- | :--- |
| **[`SYSTEM_ARCHITECTURE_GUIDE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/SYSTEM_ARCHITECTURE_GUIDE.md)** | Full-Stack Engineers, System Architects, Compliance Leads | **Master System Architecture & Codebase Map (v9.0.0)**.<br/>Details full file-by-file module directory, 15-table warehouse (158 columns, 861,607 genuine records), 26 API routes, RBAC permissions, UI component architecture, dual Excel/PDF export engines, and data lineage. |
| **[`surveillance_schema.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/surveillance_schema.sql)** | Data Engineers, Upstream Feed Teams | **Clean ANSI SQL Database Schema & Reference DDL**.<br/>Production ANSI SQL schema defining all 15 warehouse tables (158 columns), indexes, foreign keys, and 3 analytical views. |
| **[`DATA_FEED_MAPPING_AUDIT.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_FEED_MAPPING_AUDIT.md)** | Data Architects, Upstream Data Engineering | **Data Feed Mapping Audit Matrix**.<br/>Exhaustive field-by-field mapping between upstream physical Excel files and the 15 normalized relational tables. |
| **[`DATASET_OVERVIEW.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATASET_OVERVIEW.md)** | Data Architects, Compliance Auditors | **Authoritative Dataset Catalog**.<br/>Documents all 5 delivered Excel datasets (399,572 cumulative source records across 2,191 scrips and 179 sessions). |
| **[`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md)** | Data Architects, Engineers & Surveillance Operations | **Data Request Specification**.<br/>Defines functional data contracts, analytical calculation rules, and field-level requirements across all 8 warehouse modules. |
| **[`PVASF_CORE_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_CORE_SPEC.md)** | Quantitative Analysts, Surveillance Modelers | **Anomaly Metric Formulas & Scoring Rules**.<br/>Formal mathematical specifications, statistical distributions, circuit persistence logic, and 180D breakout conditions. |
| **[`tests/test_surveillance_e2e.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/tests/test_surveillance_e2e.py)** | QA Engineers, Compliance Auditors | **End-to-End Verification Test Suite**.<br/>14 automated tests validating DB integrity, views, leak prevention, math scoring, live API endpoints, and Excel exports. |

---

## 3. Technology Stack & Component Ownership

- **Frontend**: Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS)
- **Charting Engine**: Recharts (Screener-Style Dual-Axis Master Surveillance Chart with 20 DMA & 50 DMA, Real-Time Crosshair Tracker, Deliverable Volume Ratio, Parameter Radar Chart, 3-Pillar Statistical Deck)
- **Backend API**: FastAPI (Python 3.9+, Pydantic v2, Uvicorn)
- **Surveillance Engine**: Pure-Python `pv_alert_surveillance.py` (Vectorized NumPy/Pandas math)
- **Data Layer**: SQLAlchemy 2.0 ORM with SQLite (Development/Local, 861,607 genuine physical records) & Enterprise Relational Warehouse (Production MPP)
- **Security & Auth**: PBKDF2-HMAC-SHA256 password hashing, Bearer Token Auth, 1-click identity switching modal, RBAC middleware, and immutable compliance audit trail

---

## 4. Repository Directory Structure

```
UI_PVASF/
├── app/                                    # Next.js App Router Page Routes
│   ├── page.tsx                            # Executive Surveillance Watchlist Dashboard (Route: /)
│   ├── analysis/[symbol]/page.tsx          # Single-Stock Forensic Analysis Workspace (Route: /analysis/[symbol])
│   ├── history/page.tsx                    # Immutable Security & System Audit Logs (Route: /history)
│   └── settings/page.tsx                   # Model Weight Calibration & User Management (Route: /settings)
│
├── components/                             # Reusable React UI Components
│   ├── layout/app-shell.tsx                # Main Layout Shell & User Profile Switcher Modal
│   ├── dashboard/alerts-table.tsx          # Watchlist Table with Row Actions & Filters
│   ├── investigation/                      # Stock Analysis Workspaces, Recharts, Participant Audits
│   │   ├── charts.tsx                      # UnifiedPriceVolumeChart, ParameterRadarChart, Statistical Deck
│   │   ├── investigation-workspace.tsx     # 4-Tab Forensic Workspace (Overview, Shareholders, Corporate Actions, Participants)
│   │   └── surveillance-dossier-pdf.tsx    # 5-Page Printable Vector A4 Regulatory PDF Dossier
│   └── ui/                                 # Shared UI Primitives (Badges, Buttons, Cards, Modals)
│
├── lib/                                    # Frontend API Connectors & Client Context
│   ├── api.ts                              # Unified REST Fetch Client Layer with Auth Lock
│   ├── user-context.tsx                    # React User Session & RBAC Role Context
│   └── utils.ts                            # Tailwind CSS Helper Utilities
│
├── backend/                                # FastAPI Python Backend
│   ├── main.py                             # Server Entrypoint & CORS Setup
│   ├── security.py                         # Password Hashing & Bearer Token Authentication
│   ├── db/                                 # Database Engine, Models & Seeder
│   │   ├── database.py                     # SQLAlchemy Engine & Session Factory
│   │   ├── models.py                       # Relational Table ORM Models (15 Clean Tables, 158 Columns)
│   │   ├── schema.sql                      # Master DDL with 15 Tables & 3 Analytical Views
│   │   ├── model_config.json               # Active Calibrated Scoring Weights & Cutoff Threshold
│   │   └── surveillance.db                 # Unified Production SQLite Database (861,607 Records)
│   ├── repositories/                       # Clean Data Access Repositories (Trades, Clients)
│   ├── routers/                            # REST API Endpoints (`surveillance`, `auth`, `clients`, `trades`)
│   ├── schemas/                            # Pydantic v2 DTO Request/Response Contracts
│   └── services/                           # Business Domain Services & Score Engine Integration
│
├── scripts/                                # Ingestion Pipelines & Verification Scripts
│   ├── ingest_market_eod.py                # Market EOD Ingestion Pipeline (result_part1/part2.xlsx)
│   ├── ingest_client_data.py               # Participant Execution Ingestion Pipeline (client_data.xlsx)
│   ├── ingest_pan_pairs.py                 # Bilateral PAN Pair Ingestion Pipeline (PAN_PAIR_*.xlsx)
│   ├── test_frontend_api.mjs               # 14-Contract Frontend API Integration Test Suite
│   ├── test_frontend_routes.mjs            # Headless Route Rendering Integration Test Suite
│   └── verify_e2e.mjs                      # Multi-Role End-to-End Verification Runner
│
├── pv_alert_surveillance.py                # Standalone Pure-Python Anomaly Engine & Math Formulas
├── surveillance_schema.sql                 # Clean ANSI SQL Database Schema & Views
├── SYSTEM_ARCHITECTURE_GUIDE.md            # Master Architecture & Technical Specification (v9.0.0)
├── PVASF_CORE_SPEC.md                      # PVASF Anomaly Metric Formulas & Score Mapping
├── DATA_REQUEST_SPEC.md                    # Data Feed Specification & Production Contracts
├── DATA_FEED_MAPPING_AUDIT.md              # Physical Data Feed to Relational Table Mapping Audit
├── DATASET_OVERVIEW.md                     # Overview of 5 Production Datasets (399k records)
└── FUTURE_SCOPE.md                         # Future Analytical Roadmap & Scope
```

---

## 5. Local Setup & Execution Guide for Internal Developers

### 5.1 Backend Service (FastAPI) Setup

```bash
# 1. Navigate to project root directory
cd "/Users/vishesh/Downloads/UI_PVASF copy"

# 2. Activate virtual environment
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

# 2. Run Python backend test suite
python3 -m pytest tests/ -v

# 3. Test production Next.js build
npm run build
```

---

## 7. Security & Confidentiality Directives

1. **Do NOT Hardcode Credentials**: Always use authorization bearer headers via `getAuthHeaders()` in `lib/api.ts`.
2. **Audit Logging**: Any changes to model weights, user permissions, or forensic case statuses automatically generate immutable entries in `SYS_AUDIT_LOGS`.
3. **Proprietary Notice**: Source code, quantitative algorithms, and schema definitions are proprietary internal property. Unauthorized copying or external distribution is strictly prohibited.
