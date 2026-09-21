# Price-Volume Alert Surveillance Framework (PVASF)
## Internal Engineering, Data Science & Compliance Operations Manual

> **CONFIDENTIAL & PROPRIETARY — FOR INTERNAL TEAM USE ONLY**  
> This repository contains the complete enterprise codebase, quantitative surveillance algorithms, database schemas, and compliance UI workspace for the Price-Volume Alert Surveillance Framework (PVASF).

---

## 1. Executive Summary & Internal Architecture Overview

The **Price-Volume Alert Surveillance Framework (PVASF)** is an enterprise market surveillance platform designed to detect artificial price inflation, liquidity pump schemes, circular trading, and wash trading across listed securities.

The platform combines a **180-day historical baseline** with a **15-day observation window** to evaluate five core statistical anomaly parameters:
1. **Price Rise % vs T-180 Baseline** ($25\%$ weight)
2. **Price Z-Score ($\sigma$)** ($20\%$ weight)
3. **Volume Z-Score ($\sigma$)** ($25\%$ weight)
4. **Upper Circuit Band Hit Days** ($15\%$ weight)
5. **180-Day New High Breakout Days** ($15\%$ weight)

If the composite score $S_{\text{final}} \ge 15.0$, the security is shortlisted for forensic investigation.

---

## 2. Internal Documentation Map & Authoritative Guides

| Documentation File | Target Role | Primary Purpose & Contents |
| :--- | :--- | :--- |
| **[`SYSTEM_ARCHITECTURE_GUIDE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/SYSTEM_ARCHITECTURE_GUIDE.md)** | Full-Stack Engineers, System Architects, Compliance Leads | **Master System Architecture & Codebase Map (v6.0.0)**.<br/>Details full file-by-file module directory, 18-table ORM models, 25 API routes, RBAC permissions, UI component ownership, dual Excel/PDF export engines, and data lineage. |
| **[`surveillance_schema.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/surveillance_schema.sql)** | Data Engineers, Upstream Feed Teams | **Clean ANSI SQL Database Schema & Reference DDL**.<br/>Production ANSI SQL schema for all 6 surveillance feeds with indexes, foreign keys, and 3 analytical views. |
| **[`SAMPLE_DATA_GUIDE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/SAMPLE_DATA_GUIDE.md)** | Data Architects, Upstream Data Engineering | **Sample Reference Data Handover Guide**.<br/>Accompanies Feeds 1–6 with CSV files, multi-tab Excel workbook (`PVASF_Sample_Data_Package.xlsx`), and clean email templates. |
| **[`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md)** | Data Architects, Engineers & Surveillance Operations | **Data Request Specification**.<br/>Defines functional data contracts, analytical calculation rules, and field-level requirements across all 6 core feeds (Feeds 1 to 6). |
| **[`tests/test_surveillance_e2e.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/tests/test_surveillance_e2e.py)** | QA Engineers, Compliance Auditors | **End-to-End Senior Verification Test Suite**.<br/>14 automated tests validating DB integrity, views, leak prevention, math scoring, live API endpoints, and Excel exports. |

---

## 3. Technology Stack & Component Ownership

- **Frontend**: Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS)
- **Charting Engine**: Recharts (Screener-Style Dual-Axis Master Surveillance Chart with 20 DMA & 50 DMA, Real-Time Crosshair Tracker, Deliverable Volume Ratio `D: xx%`, Parameter Radar Chart, Normalized Price Acceleration Curve)
- **Backend API**: FastAPI (Python 3.9+, Pydantic v2, Uvicorn)
- **Surveillance Engine**: Pure-Python `pv_alert_surveillance.py` (Vectorized NumPy/Pandas math)
- **Data Layer**: SQLAlchemy 2.0 ORM with SQLite (Development/Test) & ANSI SQL Relational Warehouse (Production)
- **Security & Auth**: PBKDF2-HMAC-SHA256 password hashing, Bearer Token Auth, 1-click identity switching modal, RBAC middleware, and compliance audit trail

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
│   │   ├── charts.tsx                      # CombinedMarketChart, ParameterRadarChart, Anomaly Matrix
│   │   ├── investigation-workspace.tsx     # 5-Tab Forensic Workspace (Overview, Participants, P2P, Dossier, Graph)
│   │   ├── participant-audit-view.tsx      # LTP Pusher, Volume Cornering, Collusion & Loop Audit
│   │   └── client-360-drawer.tsx           # Full Participant Demographics & Account Intelligence
│   └── ui/                                 # Shared UI Primitives (Badges, Buttons, Cards, Modals)
│
├── lib/                                    # Frontend API Connectors & Client Context
│   ├── api.ts                              # Unified REST Fetch Client Layer (`getAuthHeaders`)
│   ├── user-context.tsx                    # React User Session & RBAC Role Context
│   └── utils.ts                            # Tailwind CSS Helper Utilities
│
├── backend/                                # FastAPI Python Backend
│   ├── main.py                             # Server Entrypoint & CORS Setup
│   ├── security.py                         # Password Hashing & Bearer Token Authentication
│   ├── db/                                 # Database Engine, Models & Seeder
│   │   ├── database.py                     # SQLAlchemy Engine & Session Factory
│   │   ├── models.py                       # Relational Table ORM Models (15 Clean Tables)
│   │   ├── schema.sql                      # Master DDL with 15 Tables & 3 Analytical Views
│   │   ├── seed.py                         # Deterministic Market Data Seeder (3,600 EOD records)
│   │   └── surveillance.db                 # Unified Production SQLite Database
│   ├── repositories/                       # Clean Data Access Repositories (Trades, Clients)
│   ├── routers/                            # REST API Endpoints (`surveillance`, `auth`, `clients`, `trades`)
│   ├── schemas/                            # Pydantic v2 DTO Request/Response Contracts
│   └── services/                           # Business Domain Services & Score Engine Integration
│
├── pv_alert_surveillance.py                # Standalone Pure-Python Anomaly Engine & Math Formulas
├── surveillance_schema.sql                 # Clean ANSI SQL Database Schema & Views
├── SYSTEM_ARCHITECTURE_GUIDE.md            # Master Architecture & Technical Specification
├── PVASF_CORE_SPEC.md                      # PVASF Anomaly Metric Formulas & Score Mapping
├── DATA_REQUEST_SPEC.md                    # Data Feed Specification & Production Contracts
├── BUSINESS_FUNCTIONAL_DATA_REQUIREMENTS.md# Business Data Requirements Specification
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
