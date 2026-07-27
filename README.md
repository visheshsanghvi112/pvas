# Price-Volume Alert Surveillance Framework (PVASF)

**Enterprise Market Conduct Surveillance & Anomaly Detection System**

---

## Executive Overview

The **Price-Volume Alert Surveillance Framework (PVASF)** is an end-to-end, high-performance market surveillance platform designed for exchanges, regulatory bodies, and compliance teams. It automatically detects potential market manipulation—such as artificial price inflation, coordinated volume pump schemes, and wash trading—by applying statistical anomaly algorithms over 180-day historical baselines and auditing participant trading conduct down to millisecond-level trade executions.

### Key Capabilities
- **5 Core Statistical Shortlisting Metrics**: Evaluates Price Rise %, Price Z-Score, Volume Z-Score, Price Band Persistence (Circuit Hits), and 180-Day New High Breakouts.
- **Participant Conduct Audit**: Analyzes Last Traded Price (LTP) price pushers, volume concentration per PAN, counterparty trading loops, and same-broker wash trade executions.
- **Single Continuous Investigation Workspace**: Analysts conduct complete investigations within a unified, interactive workspace (`/investigations/[symbol]`) featuring contextual tabs, in-place order book depth modals, and identity resolution profile modals.
- **Layered Architecture & Database Isolation**: Built with strict boundary isolation allowing seamless execution against local SQLite (development/demo) and enterprise Teradata Data Warehouses (production).

---

## Technology Stack

- **Frontend Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Styling & UI**: Tailwind CSS, Lucide Icons, Shadcn UI Components
- **Data Visualization**: Recharts (Candlestick overlays, Volume bars, Moving Averages, Radar charts)
- **Backend API Engine**: FastAPI (Python 3.10+, Pydantic v2, Uvicorn)
- **Data Access & ORM**: SQLAlchemy 2.0, Repository Pattern Architecture
- **Database Support**: SQLite (Development Seed DB) / Teradata SQL via `teradatasql` (Production Warehouse)

---

## Repository Structure

```
.
├── app/                        # Next.js App Router Pages
│   ├── page.tsx                # Executive Surveillance Dashboard & Watchlist
│   ├── compare/                # Scrip Comparison & Multi-Asset Analysis
│   ├── clients/                # Exchange & Depository Client Directory
│   ├── trades/                 # Global Trade Match Explorer
│   ├── members/                # Trading Member (Broker) Conduct Audit
│   ├── algo-ctcl/              # CTCL & HFT Order Book Intelligence
│   ├── cases/                  # Forensic Case Dossier Workspace
│   └── investigations/[symbol]/# Single Continuous Investigation Workspace
├── components/                 # Reusable UI Components
│   ├── dashboard/              # Watchlist, Alert Cards, Risk Metric Tables
│   ├── investigation/          # 180D Candlestick Charts, Participant Audits, Dossiers
│   ├── layout/                 # App Shell, Header, Navigation Sidebar
│   └── ui/                     # Cards, Modals, Badges, Data Grids
├── lib/                        # Client-side API Client & Utility Functions
├── backend/                    # FastAPI Backend Engine
│   ├── main.py                 # FastAPI Application Server & CORS Setup
│   ├── requirements.txt        # Python Backend Dependencies
│   ├── db/                     # Database Configuration, Models & Seed Script
│   │   ├── database.py         # SQLAlchemy Engine & Session Factory
│   │   ├── models.py           # ORM Entities (FactTrades, DimExchClnt, DimDepClnt)
│   │   ├── seed.py             # Synthetic Seed Data Generator (31,200 trade records)
│   │   └── surveillance.db     # Local Development SQLite Database
│   ├── repositories/           # Repository Pattern Data Access Layer
│   │   ├── fact_trades_repo.py # FACT_TRADES Repository
│   │   ├── dim_exch_clnt_repo.py# DIM_EXCH_CLNT_DTLS Repository
│   │   └── dim_dep_clnt_repo.py# DIM_DEP_CLNT_DTLS Repository
│   ├── schemas/                # Pydantic v2 Validation Schemas DTOs
│   ├── services/               # Core Business Logic & Surveillance Algorithms
│   │   ├── surveillance_service.py # EOD Scoring Engine & Participant Analytics
│   │   ├── fact_trades_service.py # Trade Match Filtering & Analytics
│   │   └── client_service.py   # Client 360 Identity Resolution
│   └── routers/                # FastAPI HTTP REST API Endpoints
├── pv_alert_surveillance.py    # Standalone Pure-Python Surveillance Scoring Engine
├── README.md                   # Project Overview & Quick Start Guide (This File)
├── DATA_REQUEST_SPEC.md        # Formal Teradata Data Extraction Spec for Managers/Data Team
└── SYSTEM_ARCHITECTURE_GUIDE.md# Master System Architecture, Formulas & Domain Reference
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

# Seed Development Database (Generates SQLite DB with 31,200 realistic trade matches)
python backend/db/seed.py

# Start FastAPI Development Server (Runs on http://localhost:8000)
python backend/main.py
```

*Backend REST documentation is available at `http://localhost:8000/docs` (Swagger UI).*

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

To streamline project documentation while preserving 100% of technical details, the repository maintains **3 core markdown files**:

| Document File | Target Audience | Content Summary |
| :--- | :--- | :--- |
| **[`README.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/README.md)** | Developers & Operators | Repository Overview, Quick Start, Setup, Tech Stack, Directory Map. |
| **[`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md)** | Management & Data Engineering Team | Executive Data Request, Teradata Schema Column Mapping, Business Justifications & SQL Extraction Queries. |
| **[`SYSTEM_ARCHITECTURE_GUIDE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/SYSTEM_ARCHITECTURE_GUIDE.md)** | Architects, Analysts & Auditors | Comprehensive Master Guide detailing Architecture, 5 Scoring Formulas, Participant Audits, Database Schemas, Data Lineage, Single-Workspace UI Blueprint, RBAC Permissions, and Regulatory Compliance Audits. |

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
# Test backend surveillance engine health endpoint
curl http://localhost:8000/api/v1/surveillance/health
```

---

## License & Support

Confidential & Proprietary — Developed for Enterprise Market Conduct & Compliance Surveillance.
