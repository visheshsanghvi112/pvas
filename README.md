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
| **[`SYSTEM_ARCHITECTURE_GUIDE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/SYSTEM_ARCHITECTURE_GUIDE.md)** | Full-Stack Engineers, System Architects, Compliance Leads | **Master System Architecture & Codebase Map (v11.0.0)**.<br/>Details full file-by-file module directory, 15-table warehouse (158 columns, 854,061+ genuine records), 26 API routes, RBAC permissions, UI component architecture, dual Excel/PDF export engines, and data lineage. |
| **[`surveillance_schema.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/surveillance_schema.sql)** | Data Engineers, Upstream Feed Teams | **Clean ANSI SQL Database Schema & Reference DDL**.<br/>Production ANSI SQL schema defining all 15 warehouse tables (158 columns), indexes, foreign keys, and 3 analytical views. |
| **[`DATA_FEED_MAPPING_AUDIT.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_FEED_MAPPING_AUDIT.md)** | Data Architects, Upstream Data Engineering | **Data Feed Mapping Audit Matrix**.<br/>Exhaustive field-by-field mapping between upstream physical Excel files and the 15 normalized relational tables. |
| **[`DATASET_OVERVIEW.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATASET_OVERVIEW.md)** | Data Architects, Compliance Auditors | **Authoritative Dataset Catalog**.<br/>Documents all 5 delivered Excel datasets (399,572 cumulative source records across 2,191 scrips and 179 sessions). |
| **[`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md)** | Data Architects, Engineers & Surveillance Operations | **Data Request Specification**.<br/>Defines functional data contracts, analytical calculation rules, and field-level requirements across all 8 warehouse modules. |
| **[`PVASF_CORE_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_CORE_SPEC.md)** | Quantitative Analysts, Surveillance Modelers | **Anomaly Metric Formulas & Scoring Rules**.<br/>Formal mathematical specifications, statistical distributions, circuit persistence logic, 180D breakout conditions, and Scrip Alphabet Allotment. |
| **[`tests/test_surveillance_e2e.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/tests/test_surveillance_e2e.py)** | QA Engineers, Compliance Auditors | **End-to-End Verification Test Suite**.<br/>22 automated tests with sandbox DB isolation via `tests/conftest.py` validating DB integrity, views, leak prevention, math scoring, edge cases, live API endpoints, rate limiting, and Excel exports. |
| **[`scripts/cross_verify_data_parity.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/cross_verify_data_parity.py)** | Quantitative Analysts, QA Engineers | **Raw DB vs API Parity Audit Suite**.<br/>Standalone cross-verification script ensuring 100% mathematical and count parity between physical tables and API payloads. |

---

## 3. Technology Stack & Component Ownership

- **Frontend**: Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS)
- **Charting Engine**: Recharts (Screener-Style Dual-Axis Master Surveillance Chart with 20 DMA & 50 DMA, Real-Time Crosshair Tracker, Deliverable Volume Ratio, Parameter Radar Chart, 3-Pillar Statistical Deck)
- **Backend API**: FastAPI (Python 3.9+, Pydantic v2, Uvicorn)
- **Surveillance Engine**: Pure-Python `pv_alert_surveillance.py` (Vectorized NumPy/Pandas math)
- **Data Layer**: SQLAlchemy 2.0 ORM with SQLite (Development/Local, 854,061+ genuine physical records) & Enterprise Relational Warehouse (Production MPP)
- **Security & Auth**: PBKDF2-HMAC-SHA256 password hashing, Bearer Token Auth, 1-click identity switching modal, RBAC middleware, and immutable compliance audit trail

---

## 4. Repository Directory Structure

```
UI_PVASF/
├── middleware.ts                           # Next.js 15 SSR Enterprise Security Middleware (Headers, CSP, Routing)
├── app/                                    # Next.js App Router Page Routes
│   ├── page.tsx                            # Executive Surveillance Watchlist Dashboard (Route: /)
│   ├── analysis/[symbol]/page.tsx          # Single-Stock Forensic Analysis Workspace (Route: /analysis/[symbol])
│   ├── history/page.tsx                    # Immutable Security & System Audit Logs (Route: /history)
│   └── settings/page.tsx                   # Model Weight Calibration & User Management (Route: /settings)
│
├── components/                             # Reusable React UI Components
│   ├── layout/app-shell.tsx                # Main Layout Shell & User Profile Switcher Modal
│   ├── dashboard/alerts-table.tsx          # Two-Tier Watchlist Deck with Scrip Alphabet Allotment & Sticky Scrip Column
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
│   ├── main.py                             # Server Entrypoint, Security Headers & CORS Setup
│   ├── security.py                         # PBKDF2 Hashing (100k rounds) & Bearer Token Authentication
│   ├── db/                                 # Database Engine, Models & Seeder
│   │   ├── database.py                     # SQLAlchemy Engine & Session Factory
│   │   ├── models.py                       # Relational Table ORM Models (15 Clean Tables, 158 Columns)
│   │   ├── schema.sql                      # Master DDL with 15 Tables & 3 Analytical Views
│   │   ├── model_config.json               # Active Calibrated Scoring Weights & Cutoff Threshold
│   │   └── surveillance.db                 # Unified Production SQLite Database (854,061+ Records)
│   ├── repositories/                       # Clean Data Access Repositories (Trades, Clients)
│   ├── routers/                            # REST API Endpoints (`surveillance`, `auth`, `clients`, `trades`)
│   ├── schemas/                            # Pydantic v2 DTO Request/Response Contracts
│   └── services/                           # Business Domain Services & Score Engine Integration
│
├── scripts/                                # Ingestion Pipelines & Verification Scripts
│   ├── ingest_market_eod.py                # Market EOD Ingestion Pipeline (result_part1/part2.xlsx)
│   ├── ingest_client_data.py               # Participant Execution Ingestion Pipeline (client_data.xlsx)
│   ├── ingest_pan_pairs.py                 # Bilateral PAN Pair Ingestion Pipeline (PAN_PAIR_*.xlsx)
│   ├── cross_verify_data_parity.py         # DB vs API 100% Mathematical Parity Verification Suite
│   ├── test_frontend_api.mjs               # 14-Contract Frontend API Integration Test Suite
│   ├── test_frontend_routes.mjs            # Headless Route Rendering Integration Test Suite
│   └── verify_e2e.mjs                      # Multi-Role End-to-End Verification Runner
│
├── tests/                                  # Automated Pytest Test Suite (22 Total Tests)
│   ├── conftest.py                         # Test Database Sandbox Isolation Fixture (sqlite3.backup API)
│   └── test_surveillance_e2e.py            # 22 E2E Integrity, Model, Endpoint & Security Rate Limiting Tests
│
├── archive/                                # Dedicated Storage for Historical DB Backups & SQL Dumps
│   └── sql/surveillance_insert.sql         # 1.8 MB Historical Seed Data Dump
│
├── pv_alert_surveillance.py                # Standalone Pure-Python Anomaly Engine & Math Formulas
├── surveillance_schema.sql                 # Clean ANSI SQL Database Schema & Views
├── SYSTEM_ARCHITECTURE_GUIDE.md            # Master Architecture & Technical Specification (v11.0.0)
├── PVASF_CORE_SPEC.md                      # PVASF Anomaly Metric Formulas & Score Mapping
├── DATA_REQUEST_SPEC.md                    # Data Feed Specification & Production Contracts
├── DATA_FEED_MAPPING_AUDIT.md              # Physical Data Feed to Relational Table Mapping Audit
├── DATASET_OVERVIEW.md                     # Overview of 5 Production Datasets (399k records)
└── FUTURE_SCOPE.md                         # Future Analytical Roadmap & Scope
```

---

## 5. Offline Data Storage & Backup Manifest (What to Keep / Download)

Because confidential exchange market data and proprietary participant trades cannot be committed to public/remote Git repositories, `.gitignore` excludes all `.db` databases and large raw `.xlsx` data files.

If you clone this codebase onto a new machine or store backups externally (e.g., Google Drive, AWS S3, USB drive, external SSD), **you must keep and copy the following files**:

### 5.1 Primary Operational Database (Must-Have for Immediate Running)

| Priority | File Name | Size | Target Location in Project | Role & Importance |
| :---: | :--- | :---: | :--- | :--- |
| 🔴 **ESSENTIAL** | **`surveillance.db`** | **145 MB** | `backend/db/surveillance.db` | **Unified Relational Production Database**.<br/>Contains all **854,061+ physical records** across all 15 normalized tables (consolidated OHLCV, 180D baselines, KYC, demat registry, participant trades, counterparty pairs).<br/>**If you have this single file, the entire platform runs immediately with 100% full data without needing any ingestion steps.** |

### 5.2 Upstream Raw Excel Deliverables (Required Only to Re-Run Ingestion Pipelines)

If you need to rebuild the database from scratch using `scripts/ingest_*.py`, keep these original raw Excel files:

| Priority | File Name | Size | Target Location in Project | Ingestion Script & Purpose |
| :---: | :--- | :---: | :--- | :--- |
| 🟡 **RAW FEED** | **`result_part1.xlsx`** | 19.1 MB | Project Root (`/`) | `scripts/ingest_market_eod.py` (EOD Market Part 1: 176k rows) |
| 🟡 **RAW FEED** | **`result_part2.xlsx`** | 17.2 MB | Project Root (`/`) | `scripts/ingest_market_eod.py` (EOD Market Part 2: 158k rows) |
| 🟡 **RAW FEED** | **`client_data.xlsx`** | 4.3 MB | Project Root (`/`) | `scripts/ingest_client_data.py` (Participant trades & KYC: 58k rows) |
| 🟡 **RAW FEED** | **`PAN_PAIR_GUJRAFFIA.xlsx`** | 222 KB | Project Root (`/`) | `scripts/ingest_pan_pairs.py` (Bilateral matched pairs: 2,713 rows) |
| 🟡 **RAW FEED** | **`PAN_PAIR_SKMEGGPROD.xlsx`**| 325 KB | Project Root (`/`) | `scripts/ingest_pan_pairs.py` (Bilateral matched pairs: 3,987 rows) |

### 5.3 Export Packages & Deliverables (External Reference)

| Priority | File / Directory | Size | Target Location in Project | Role & Purpose |
| :---: | :--- | :---: | :--- | :--- |
| 🟢 **DELIVERABLE** | `PVASF_Production_Full_Data.xlsx` | 984 KB | Project Root (`/`) | Institutional master Excel dataset export workbook |
| 🟢 **DELIVERABLE** | `PVASF_Sample_Data_Package.zip` | 1.3 MB | Project Root (`/`) | Standalone regulatory sample package with all CSV feeds |
| 🟢 **BACKUP DB** | `archive/database_backups/my_database.db` | 2.2 MB | `archive/database_backups/` | Historical development database snapshot |

> [!TIP]
> **Summary for Moving to a New PC**:  
> To run the complete platform on any new computer, you only need to copy **one file**: [`backend/db/surveillance.db`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/surveillance.db) (145 MB).  
> Place it into `backend/db/`, run `npm install` and `pip install -r backend/requirements.txt`, and start the app!

---

## 6. Local Setup & Execution Guide for Internal Developers

### 6.1 Backend Service (FastAPI) Setup

```bash
# 1. Navigate to project root directory
cd UI_PVASF

# 2. Activate virtual environment
source .venv/bin/activate

# 3. Install required Python packages
pip install -r backend/requirements.txt

# 4. Initialize and seed the development SQLite database (if starting fresh without surveillance.db)
python3 -c "from backend.db.database import init_db, SessionLocal; from backend.db.seed import seed_database; init_db(); db=SessionLocal(); seed_database(db); db.close()"

# 5. Start FastAPI development server (runs on http://127.0.0.1:8005)
python3 -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8005
```
*Interactive OpenAPI Swagger documentation is available at `http://127.0.0.1:8005/docs`.*

---

### 6.2 Frontend Workspace (Next.js 15) Setup

```bash
# In a new terminal window:
cd UI_PVASF

# 1. Install Node.js dependencies
npm install

# 2. Start Next.js development server (runs on http://localhost:3000)
npm run dev
```

---

## 7. Verification & Testing Protocol

Before committing code changes or deploying updates, internal engineers **must run all of the following verification commands**:

```bash
# 1. Verify TypeScript type safety across all React components and API DTOs
npx tsc --noEmit

# 2. Run Python backend test suite (22 comprehensive tests with sandbox isolation via tests/conftest.py)
python3 -m pytest tests/ -v

# 3. Test production Next.js build
npm run build
```

---

## 8. IT Department Handover & Security Runbook

When handing this codebase over to the Infrastructure & IT Security team, the following standardized configurations and operational guarantees apply:

### 8.1 Consolidated Data Architecture (No Exchange Fragmentation)
The upstream surveillance warehouse operates on **market-wide consolidated data** keyed by Scrip Symbol / ISIN (`daily_market_eod`). Tickers are not fragmented across separate venues, eliminating artificial venue toggles. The analysis workspace and alert engine process consolidated market volume and blended pricing natively.

### 8.2 Security Best Practices & Safeguards
1. **Password Hashing (PBKDF2-HMAC-SHA256)**:
   - Implemented in `backend/security.py` using 100,000 iterations and a unique 16-byte random salt per user.
   - Passwords cannot be reverse-decrypted or broken via precomputed rainbow tables.
   - Password comparison uses `hmac.compare_digest` (constant-time execution) to eliminate side-channel timing attacks.
2. **Session Tokens**:
   - 24-hour HMAC-SHA256 signed access tokens transmitted via standard `Authorization: Bearer <token>` headers.
   - Automatically verified by FastAPI dependency `get_current_user`.
3. **Role-Based Access Control (RBAC)**:
   - **`Admin`**: Full operational control (Calibrate model weights, adjust alert thresholds, upload EOD data, manage user accounts).
   - **`Analyst`**: Surveillance officer (Investigate alerts, inspect participant circular loops/reversals, export Excel/PDF dossiers, review audit logs).
   - **`Viewer`**: Read-only guest (Inspect scrips and charts without edit permissions).
   - *Protected Endpoints:* Weight changes (`POST /api/v1/surveillance/weights`) and user management (`/api/v1/auth/users/*`) strictly enforce `require_admin` (HTTP 403 Forbidden for non-admins).
4. **Admin Anti-Lockout Protection**:
   - `AuthService` in `backend/services/auth_service.py` enforces safety checks preventing demotion or deactivation of the last remaining active Admin in the database.
5. **SQL Injection Immunity**:
   - All database queries across `backend/` use SQLAlchemy 2.0 ORM query builders and parameterized bindings. Zero string-concatenated SQL queries exist in application routes.
6. **Graceful Error Boundaries & Resilience**:
   - Next.js institutional 404 page: [`app/not-found.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/not-found.tsx).
   - Next.js client-side error boundary: [`app/error.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/error.tsx).
   - API client auto-retry: `lib/api.ts` provides single-flight concurrency lock, auto-token refresh on HTTP 401, and 700ms exponential backoff on cold starts.
7. **Immutable Compliance Audit Trail**:
   - All user logins, weight modifications, user role edits, and file uploads are recorded in `compliance_audit_logs` with timestamps, officer username, target, and IP address.

### 8.3 Environment Variables Reference
Copy [`.env.example`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/.env.example) to `.env`:
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Environment mode. |
| `PVASF_SECRET_KEY` | *(Set in `.env`)* | Cryptographic HMAC secret for signing auth session tokens. Generate with `openssl rand -hex 32`. |
| `DATABASE_URL` | `sqlite:///./backend/db/surveillance.db` | SQLAlchemy database connection string (SQLite for local, or PostgreSQL / MySQL for clustered MPP). |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8005` | Backend API URL for the Next.js frontend proxy. |

### 8.4 Default Surveillance Team Accounts (Change in Production)
| Username | Default Password | Role | Department |
| :--- | :--- | :--- | :--- |
| `vishesh_admin` | `vishesh123` | `Admin` | Head of Surveillance & Market Conduct |
| `arao_analyst` | `arao123` | `Analyst` | Market Surveillance Operations |
| `guest_viewer` | `guest123` | `Viewer` | Read-Only Audit Guest |

---

## 9. Security & Confidentiality Directives

1. **Do NOT Hardcode Credentials**: Always use authorization bearer headers via `getAuthHeaders()` in `lib/api.ts`.
2. **Audit Logging**: Any changes to model weights, user permissions, or forensic case statuses automatically generate immutable entries in `compliance_audit_logs`.
3. **Proprietary Notice**: Source code, quantitative algorithms, and schema definitions are proprietary internal property. Unauthorized copying or external distribution is strictly prohibited.

