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
| **[`SYSTEM_ARCHITECTURE_GUIDE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/SYSTEM_ARCHITECTURE_GUIDE.md)** | Full-Stack Engineers, System Architects, Compliance Leads | **Master System Architecture & Codebase Map (v3.6.0)**.<br/>Details full file-by-file module directory, ORM models, API routes, RBAC permissions, UI component ownership, and data lineage. |
| **[`PVASF_CORE_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_CORE_SPEC.md)** | Quantitative Analysts, Risk Officers | **Regulatory Anomaly Engine & Scoring Formulas**.<br/>Details mathematical formulas for Price Rise %, Z-Scores, Band Persistence, New Highs, ordinal cutoffs, and default weight calibrations. |
| **[`PVASF_SCHEMA_REFERENCE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_SCHEMA_REFERENCE.md)** | Data Engineers, DBAs | **Enterprise Data Warehouse Physical Schema Reference**.<br/>Column-by-column physical specifications for all enterprise data tables (`ASD`, `ACSD`, `APPD`, `DECL`, `DDCL`, `FSHG`, `FPRH`, `FCAC`, etc.). |
| **[`BUSINESS_FUNCTIONAL_DATA_REQUIREMENTS.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/BUSINESS_FUNCTIONAL_DATA_REQUIREMENTS.md)** | Business Analysts, Compliance Officers | **Functional Data Requirements Specification**.<br/>Outlines business data requirements across Watchlist, Stock Analysis, Scrip Comparison, Forensic Cases, Audit Trail, and Settings. |
| **[`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md)** | Data Engineers, DBAs | **Teradata ETL & Production Extraction Queries**.<br/>Contains ANSI SQL extraction scripts, table join logic, and business column mapping for pulling 260-day EOD market feeds. |
| **[`MANAGER_PRESENTATION_GUIDE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/MANAGER_PRESENTATION_GUIDE.md)** | Managers, Team Leads, Stakeholders | **Plain English Project Presentation Guide**.<br/>Executive talking points, 5 scoring parameters, and module-by-module walkthrough. |
| **[`FUTURE_SCOPE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/FUTURE_SCOPE.md)** | Analytical Engineers, Data Scientists | **Future Analytical Enhancements & Roadmap**.<br/>Outlines MAD robust Z-scores, corporate action factor adjustments, and wash trade badging. |

---

## 3. Technology Stack & Component Ownership

- **Frontend**: Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS)
- **Charting Engine**: Recharts (Screener-Style Dual-Axis Master Surveillance Chart with 20 DMA & 50 DMA, Real-Time Crosshair Tracker, Deliverable Volume Ratio `D: xx%`, Parameter Radar Chart, Normalized Price Acceleration Curve)
- **Backend API**: FastAPI (Python 3.9+, Pydantic v2, Uvicorn)
- **Surveillance Engine**: Pure-Python `pv_alert_surveillance.py` (Vectorized NumPy/Pandas math)
- **Data Layer**: SQLAlchemy 2.0 ORM with SQLite (Development/Test) & Teradata Data Warehouse (Production)
- **Security & Auth**: PBKDF2-HMAC-SHA256 password hashing, Bearer Token Auth, 1-click identity switching modal, RBAC middleware, and `SYS_AUDIT_LOGS` audit trail

---

## 4. Repository Directory Structure

```
UI_PVASF/
├── app/                                    # Next.js App Router Page Routes
│   ├── page.tsx                            # Executive Surveillance Watchlist Dashboard (Route: /)
│   ├── analysis/[symbol]/page.tsx          # Single-Stock Forensic Analysis Workspace (Route: /analysis/[symbol])
│   ├── compare/page.tsx                    # Head-to-Head Scrip Comparison Workspace (Route: /compare)
│   ├── cases/page.tsx                      # Streamlined Forensic Case Dossier Workspace (Route: /cases)
│   ├── history/page.tsx                    # Dual-Tab Case History & Security Audit Logs (Route: /history)
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
│   ├── db/                                 # Database Engine, Models & Synthetic Seeder
│   │   ├── database.py                     # SQLAlchemy Engine & Session Factory
│   │   ├── models.py                       # Relational Table ORM Models (`SYS_USERS`, `SYS_AUDIT_LOGS`, `FORENSIC_CASES`, `MODEL_SETTINGS`, etc.)
│   │   └── seed.py                         # Synthetic Market Data Generator (260 Trading Days)
│   ├── routers/                            # REST API Endpoints (`surveillance`, `cases`, `auth`, `clients`)
│   └── services/                           # Business Domain Services & Score Engine Integration
│
├── pv_alert_surveillance.py                # Standalone Pure-Python Anomaly Engine & Math Formulas
├── SYSTEM_ARCHITECTURE_GUIDE.md            # Master Architecture & Technical Specification (v3.4.0)
├── PVASF_CORE_SPEC.md                      # SEBI Anomaly Metric Formulas & Score Mapping
├── PVASF_SCHEMA_REFERENCE.md               # Enterprise Data Warehouse Column Specification
├── DATA_REQUEST_SPEC.md                    # Teradata ETL & Production SQL Extraction Queries
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
