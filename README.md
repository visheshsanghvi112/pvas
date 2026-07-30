# Price-Volume Alert Surveillance Framework (PVASF)

**Enterprise Market Conduct Surveillance & Anomaly Detection System**

---

## Executive Overview

The **Price-Volume Alert Surveillance Framework (PVASF)** is an end-to-end, high-performance market surveillance platform designed for stock exchanges, regulatory compliance bodies, and institutional compliance teams. It automatically detects potential market manipulation—such as artificial price inflation, coordinated volume pump schemes, circular trading, and wash trading—by applying statistical anomaly algorithms over 180-day historical baselines and auditing participant trading conduct down to millisecond-level trade executions.

### Key Capabilities

- **5 Core Statistical Shortlisting Metrics**: Evaluates Price Rise %, Price Z-Score, Volume Z-Score, Price Band Persistence (Circuit Hits), and 180-Day New High Breakouts.
- **Participant Conduct Audit Engine**: Identifies Last Traded Price (LTP) price pushers, volume concentration per PAN, counterparty trading loops, and same-broker wash trade executions.
- **Enterprise Data Warehouse Physical Data Model (PDM v10.0) Integration**: Fully integrated with 10 official Shareholding & Corporate Action tables covering **Quarterly Shareholding Results (Section 1.3, 8 Tables)** and **Corporate Actions & Disclosures (Section 1.5, 2 Tables)** across **16 system tables with 580 total physical & system columns**.
- **Role-Based Access Control (RBAC) & User Management**: Enterprise security layer featuring salted SHA-256 password hashing, signed bearer token authorization, 3-tier user roles (`Admin`, `Analyst`, `Viewer`), and immutable security audit logs (`SYS_AUDIT_LOGS`).
- **Forensic Case Dossier System (`FORENSIC_CASES`)**: Persistent case management workspace (`/cases`) for creating formal regulatory investigation dossiers, pinning chart/trade evidence, assigning lead officers, and advancing workflow states (`Draft` → `Open Investigation` → `Pending Action` → `Closed`).
- **Single Continuous Investigation Workspace**: Analysts conduct end-to-end investigations within a unified, interactive workspace (`/investigations/[symbol]`) featuring quarter-by-quarter shareholding trends, corporate action dilution factors, contextual tabs, order book depth modals, and identity resolution profile modals.
- **Layered Architecture & Database Isolation**: Built with strict boundary isolation allowing seamless execution against local SQLite (development/demo) and enterprise Teradata Data Warehouses (production).

---

## Technology Stack

- **Frontend Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Styling & UI**: Vanilla CSS Design Tokens, Tailwind CSS, Lucide Icons, Shadcn UI Components
- **Data Visualization**: Recharts (Candlestick overlays, Volume bars, Moving Averages, Radar charts)
- **Backend API Engine**: FastAPI (Python 3.10+, Pydantic v2, Uvicorn)
- **Security & Auth**: SHA-256 salted password hashing, signed token authorization, FastAPI RBAC dependencies
- **Data Access & ORM**: SQLAlchemy 2.0, Repository Pattern Architecture
- **Database Support**: SQLite (Development Seed DB) / Teradata SQL via `teradatasql` (Production Warehouse)

---

## Repository Structure

```
.
├── app/                        # Next.js App Router Pages
│   ├── page.tsx                # Executive Surveillance Dashboard & Watchlist
│   ├── compare/                # Scrip Comparison & Multi-Asset Analysis
│   ├── clients/                # Exchange & Depository Client Directory (Client 360)
│   ├── trades/                 # Global Trade Match Explorer
│   ├── members/                # Trading Member (Broker) Conduct Audit
│   ├── algo-ctcl/              # CTCL & HFT Order Book Intelligence
│   ├── cases/                  # Forensic Case Dossier Workspace & Evidence Pinning
│   ├── settings/               # 3-Tab Administration (Model Config, User Accounts, Audit Trail)
│   └── investigations/[symbol]/# Single Continuous Investigation Workspace
├── components/                 # Reusable UI Components
│   ├── dashboard/              # Watchlist, Alert Cards, Risk Metric Tables
│   ├── investigation/          # 180D Candlestick Charts, Participant Audits, Dossiers
│   ├── layout/                 # App Shell, Header, Navigation Sidebar
│   └── ui/                     # Cards, Modals, Badges, Data Grids
├── lib/                        # Client-side API Client, User Auth Context & Utilities
│   ├── api.ts                  # REST API Client Functions
│   ├── user-context.tsx        # React Context for RBAC Session & Audit Trail
│   └── utils.ts                # Class Merging & Formatter Utilities
├── backend/                    # FastAPI Backend Engine
│   ├── main.py                 # FastAPI Application Server & CORS Setup
│   ├── security.py             # Password Hashing, Session Token & RBAC Dependencies
│   ├── requirements.txt        # Python Backend Dependencies
│   ├── db/                     # Database Configuration, Models & Seed Script
│   │   ├── database.py         # SQLAlchemy Engine & Session Factory
│   │   ├── models.py           # 13 Teradata Table Entities (FTRD, DECL, DDCL, FMSH, FSHG, FPRH, FPUH, FDVR, FDRH, FLKD, FCES, FCAC, FCDF, SYS_USERS, SYS_AUDIT_LOGS, FORENSIC_CASES)
│   │   ├── seed.py             # Synthetic Seed Data Generator (31,200 trade records)
│   │   └── surveillance.db     # Local Development SQLite Database
│   ├── repositories/           # Repository Pattern Data Access Layer
│   │   ├── fact_trades_repo.py # FACT_TRADES Repository
│   │   ├── dim_exch_clnt_repo.py# DIM_EXCH_CLNT_DTLS Repository
│   │   └── dim_dep_clnt_repo.py# DIM_DEP_CLNT_DTLS Repository
│   ├── schemas/                # Pydantic v2 Validation Schemas & DTOs
│   ├── services/               # Core Business Logic & Surveillance Algorithms
│   │   ├── surveillance_service.py # EOD Scoring Engine & DWBIS Shareholding Analytics
│   │   ├── fact_trades_service.py # Trade Match Filtering & Analytics
│   │   ├── client_service.py   # Client 360 Identity Resolution
│   │   └── auth_service.py     # Authentication, User Accounts & Audit Logging
│   └── routers/                # FastAPI HTTP REST API Endpoints
│       ├── surveillance.py     # Shortlisting Metrics, Shareholding & Corporate Actions
│       ├── fact_trades.py      # Trade Match Explorer & Wash Trade Analytics
│       ├── clients.py          # Client 360 Directory & Identity Resolution
│       ├── cases.py            # Forensic Case Dossier Persistence API
│       └── auth.py             # Authentication, User Management & Audit Log API
├── pv_alert_surveillance.py    # Standalone Pure-Python Surveillance Scoring Engine
├── README.md                   # Project Overview & Quick Start Guide (This File)
├── PVASF_SCHEMA_REFERENCE.md   # Enterprise Data Warehouse 13-Table Schema Specifications & Column Matrix
├── SYSTEM_ARCHITECTURE_GUIDE.md# Master System Architecture, Formulas & Domain Reference
├── DATA_REQUEST_SPEC.md        # Formal Teradata Data Extraction Spec for Managers/Data Team
└── PVASF_CORE_SPEC.md          # 5 Core Statistical Shortlisting Metrics & Audit Formulas
```

---

## Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **npm** / **yarn** / **pnpm**

---

### 1. Backend Setup (FastAPI Engine)

```bash
# Navigate to project root directory
cd "/Users/vishesh/Downloads/UI_PVASF copy"

# Set up Python Virtual Environment
python3 -m venv .venv
source .venv/bin/activate

# Install Backend Dependencies
pip install -r backend/requirements.txt

# Seed Development Database (Generates SQLite DB with 31,200 realistic trade matches & 10 Shareholding & Corporate Action tables)
python3 -c "from backend.db.database import init_db, SessionLocal; from backend.db.seed import seed_database; init_db(); db=SessionLocal(); seed_database(db); db.close()"

# Start FastAPI Development Server (Runs on http://localhost:8000)
python3 -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

*Backend REST documentation is available at `http://localhost:8000/docs` (FastAPI Swagger UI).*

---

### 2. Frontend Setup (Next.js Application)

```bash
# In a new terminal window, navigate to project root directory
cd "/Users/vishesh/Downloads/UI_PVASF copy"

# Install Node Modules
npm install

# Start Next.js Development Server (Runs on http://localhost:3000)
npm run dev
```

Open `http://localhost:3000` in your web browser to access the Surveillance Platform.

---

## Primary Documentation Index

The repository maintains **5 primary documentation guides** detailing all technical, database, and algorithmic aspects of the platform:

| Document File | Target Audience | Content Summary |
| :--- | :--- | :--- |
| **[`README.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/README.md)** | Developers & Operators | System Overview, Quick Start, Tech Stack, Directory Map, Verification Commands. |
| **[`PVASF_SCHEMA_REFERENCE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_SCHEMA_REFERENCE.md)** | DBAs & Schema Architects | Complete column-level specification for all 13 physical Teradata tables (**551 total physical columns**), indexing strategies, foreign keys, and RBAC schemas. |
| **[`SYSTEM_ARCHITECTURE_GUIDE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/SYSTEM_ARCHITECTURE_GUIDE.md)** | Architects, Analysts & Auditors | Comprehensive Master Architecture Guide detailing 5 Scoring Formulas, Participant Conduct Audits, Teradata Database Lineage, Single-Workspace UI Blueprint, RBAC Permissions, and Regulatory Compliance Audits. |
| **[`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md)** | Management & Data Engineering Team | Executive Data Request, Teradata Schema Column Mapping, Business Justifications & Production SQL Extraction Queries. |
| **[`PVASF_CORE_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_CORE_SPEC.md)** | Quantitative Analysts | In-depth specification of the 5 Core Statistical Shortlisting Metrics, raw score mapping (0/1/3/5), weight vector configuration, and participant conduct audit algorithms. |

---

## System Health & Verification Commands

### Build & Type Verification
```bash
# Run TypeScript compilation check
npx tsc --noEmit

# Run Next.js production build verification
npm run build
```

### Backend API Verification
```bash
# Run automated API test suite
python3 -c "
from fastapi.testclient import TestClient
from backend.main import app
client = TestClient(app)
assert client.get('/api/v1/surveillance/health').status_code == 200
assert client.get('/api/v1/surveillance/scrip/ALPHATECH/shareholding-breakdown').status_code == 200
assert client.get('/api/v1/surveillance/scrip/ALPHATECH/corporate-actions').status_code == 200
assert client.get('/api/v1/cases/').status_code == 200
assert client.get('/api/v1/auth/users').status_code == 200
print('All System REST API Endpoints Verified Successfully!')
"
```

---

## License & Support

Confidential & Proprietary — Developed for Enterprise Market Conduct & Compliance Surveillance.
