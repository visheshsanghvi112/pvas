# Price-Volume Alert Surveillance Framework (PVASF)
## Master System Architecture, Algorithmic Engine & Technical Manual

**Document Version:** 11.0.0 (Production Master Engineering Blueprint — Code-Verified Single Source of Truth)  
**Target Systems:** Standardized 15-Table Relational Regulatory Data Warehouse (854,061+ Genuine Records, 158 Columns) | FastAPI Surveillance Engine (26 Endpoints) | Next.js 15 Enterprise Compliance Suite | Teradata MPP Enterprise Scale  
**Scope:** Complete System Topology, Standardized Relational Data Model (15 Tables across 8 Functional Modules, 854,061+ Physical Records [852,773 immutable market/participant/demat/calendar rows + dynamic append-only compliance audit trail], 2,191 Listed Scrips, 179 Trading Sessions, 19 Dynamic Alert Shortlists on 2025-11-03, 13 Historical Triage Cases), 5 Core Mathematical Anomaly Metrics (with Gaussian & Modified Z-Scores), Active Model Configuration Persistence Engine (`backend/db/model_config.json` with Audit Trail Recovery), Calibrated 5-Parameter Equal Scoring ($w_1\dots w_5 = 20\%$) & Triage Cutoff Threshold ($60.0$), 3 Production-Grade Universal Ingestion Pipelines (`scripts/ingest_market_eod.py`, `scripts/ingest_client_data.py`, and `scripts/ingest_pan_pairs.py`), Ingestion of 5 Canonical Exchange Excel Datasets (`result_part1.xlsx`, `result_part2.xlsx`, `client_data.xlsx`, `PAN_PAIR_GUJRAFFIA.xlsx`, `PAN_PAIR_SKMEGGPROD.xlsx`), Participant Forensic Algorithms & Client 360° Demographics Intelligence, 15-Table Warehouse Physical Schemas (158 Columns with `pairwise_ltp_push_value_logic_2`), 3 Analytical Surveillance Views, Complete 26-Endpoint API Service Reference, Dual Dossier Export Engines (5-Sheet Institutional Excel Workbook & Vector-Accurate A4 PDF), Clean UI/UX Blueprint with Dynamic Risk Tiers & Calibrated Cutoffs, Strict Zero-Mock Data Policy with Clean Empty States for Pending Feeds (Shareholding Patterns & Corporate Actions), Pairwise LTP Push Logic 1 & 2 Storage with Clean Volume-Based UI Concentration, Major Shareholders Registry with Substantial Ownership (≥ 5%) Flags, Macro-Scale P&L Beneficiaries (`Cr`/`L`), Two-Tier Surveillance Toolbar with Scrip Alphabet Allotment Segmented Control (PVASF §2 & §5), Sticky Scrip Column, Clean Date Navigation, RBAC Security & Sliding-Window Rate Limiting, Multi-Stage Automated Verification Suites (`tests/test_surveillance_e2e.py` [22 passing tests with sandbox database isolation via `tests/conftest.py`], `scripts/cross_verify_data_parity.py`, `scripts/test_frontend_api.mjs` [14 passing contracts], `scripts/verify_e2e.mjs`, and `scripts/test_frontend_routes.mjs`), Archival Database Hygiene (`archive/database_backups/`), and Teradata Enterprise Data Warehouse Transition Architecture.  
**Physical Schema References:** [`surveillance_schema.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/surveillance_schema.sql) | [`backend/db/schema.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/schema.sql)  
**Data Specifications & Audits:** [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md) | [`DATA_FEED_MAPPING_AUDIT.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_FEED_MAPPING_AUDIT.md) | [`DATASET_OVERVIEW.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATASET_OVERVIEW.md)

---

## Table of Contents
1. [Executive Summary & Regulatory Scope](#1-executive-summary--regulatory-scope)
2. [Top-Level Architecture & Layered Boundary Pattern](#2-top-level-architecture--layered-boundary-pattern)
   - 2.1 [Standardized Relational Data Model (RDM) across 8 Functional Modules](#21-standardized-relational-data-model-rdm-across-8-functional-modules)
   - 2.2 [Market Calendar Service & Authoritative Trading Session Decoupling](#22-market-calendar-service--authoritative-trading-session-decoupling)
   - 2.3 [Authoritative Pre-Consolidated Market Pricing & Feed Architecture](#23-authoritative-pre-consolidated-market-pricing--feed-architecture)
3. [Exhaustive File-by-File Code & Module Directory](#3-exhaustive-file-by-file-code--module-directory)
   - 3.1 [Project Root Specifications, Test Suites & Core Scripts](#31-project-root-specifications-test-suites--core-scripts)
   - 3.2 [Next.js 15 Application Routing Layer (`app/`)](#32-nextjs-15-application-routing-layer-app)
   - 3.3 [UI Component Library (`components/`)](#33-ui-component-library-components)
   - 3.4 [Client Library & State Management (`lib/`)](#34-client-library--state-management-lib)
   - 3.5 [FastAPI Backend Architecture (`backend/`)](#35-fastapi-backend-architecture-backend)
4. [EOD Data Processing & Transformation Pipeline](#4-eod-data-processing--transformation-pipeline)
   - 4.1 [Production-Grade Universal Market EOD Ingestion Pipeline (`scripts/ingest_market_eod.py`)](#41-production-grade-universal-market-eod-ingestion-pipeline-scriptsingest_market_eodpy)
   - 4.2 [High-Performance Participant Ingestion Pipeline (`scripts/ingest_client_data.py`)](#42-high-performance-participant-ingestion-pipeline-scriptsingest_client_datapy)
   - 4.3 [Bilateral Matched Pair Ingestion Pipeline (`scripts/ingest_pan_pairs.py`)](#43-bilateral-matched-pair-ingestion-pipeline-scriptsingest_pan_pairspy)
5. [PVASF Core Surveillance Engine & Scoring Algorithms](#5-pvasf-core-surveillance-engine--scoring-algorithms)
   - 5.1 [Active Calibrated Configuration (Audit Log #108 Aligned)](#51-active-calibrated-configuration-audit-log-108-aligned)
   - 5.2 [Model Configuration Persistence & Recovery Engine (`model_config.json`)](#52-model-configuration-persistence--recovery-engine-model_configjson)
6. [Participant Conduct Audit, Forensic Intelligence & Client 360°](#6-participant-conduct-audit-forensic-intelligence--client-360)
7. [Complete 15-Table Database Schema & Physical Data Dictionary](#7-complete-15-table-database-schema--physical-data-dictionary)
   - 7.1 [Master Table Inventory & Module Alignment (15 Tables, 158 Columns)](#71-master-table-inventory--module-alignment-15-tables-158-columns)
   - 7.2 [Detailed Physical Table Specifications (All 15 Relational Tables)](#72-detailed-physical-table-specifications-all-15-relational-tables)
   - 7.3 [Analytical Surveillance Views (3 Production SQL Views)](#73-analytical-surveillance-views-3-production-sql-views)
8. [End-to-End System Data Lineage](#8-end-to-end-system-data-lineage)
   - 8.1 [Offline Data Storage & External Backup Manifest (What to Keep / Download)](#81-offline-data-storage--external-backup-manifest-what-to-keep--download)
9. [UI/UX Blueprint, Navigation & Component Architecture](#9-uiux-blueprint-navigation--component-architecture)
   - 9.1 [Design System & Visual Standards](#91-design-system--visual-standards)
   - 9.2 [Page Routes & Workflow Matrix](#92-page-routes--workflow-matrix)
   - 9.3 [Institutional Dossier Export Architecture (Excel & PDF Engines)](#93-institutional-dossier-export-architecture-excel--pdf-engines)
   - 9.4 [Decommissioned Legacy Artifacts & Clean Interface Directives](#94-decommissioned-legacy-artifacts--clean-interface-directives)
10. [API Service Reference Matrix (26 Endpoints)](#10-api-service-reference-matrix-26-endpoints)
11. [Role-Based Access Control (RBAC) & Security Architecture](#11-role-based-access-control-rbac--security-architecture)
   - 11.1 [Operational RBAC Permissions Matrix](#111-operational-rbac-permissions-matrix)
12. [Engineering Audit, Live Verification & Scaling Architecture](#12-engineering-audit-live-verification--scaling-architecture)
   - 12.1 [Live Physical Warehouse Scale Audit (854,061+ Genuine Records)](#121-live-physical-warehouse-scale-audit-854061-genuine-records)
   - 12.2 [Automated Multi-Pass Test Suites](#122-automated-multi-pass-test-suites)
   - 12.3 [Teradata Enterprise Data Warehouse Scaling Architecture](#123-teradata-enterprise-data-warehouse-scaling-architecture)

---

## 1. Executive Summary & Regulatory Scope

The **Price-Volume Alert Surveillance Framework (PVASF)** is an institutional-grade market conduct platform engineered to detect artificial price inflation, liquidity pump-and-dump schemes, and coordinated trading rings across exchange-listed securities.

The framework continuously reconciles a **180-trading-day historical baseline ($T-180$)** against a **15-trading-day active analysis window ($t-15$ to $t$)**, computing 5 mathematical anomaly metrics to triage high-risk securities for forensic investigation.

### 1.1 Scope Boundary (Artificial Price Inflation Focus)
The platform evaluates right-tail statistical metrics:
- **Price Rise %** (Gain relative to $T-180$ baseline closing price)
- **Price Z-Score** ($Z \ge 1.645\sigma$, 95th percentile anomaly)
- **Volume Z-Score** ($Z \ge 1.645\sigma$, 95th percentile anomaly)
- **Upper Circuit Band Persistence** ($\ge 90\%$ of dynamic daily price band ceiling)
- **180-Day New High Breakout Frequency** (Count of rolling peak breakout sessions where $\text{High}_t > \text{rolling 180D peak}$)

---

## 2. Top-Level Architecture & Layered Boundary Pattern

The platform enforces a **Strictly Layered Boundary Pattern**. Database schemas, raw warehouse surrogate keys, and ORM models are isolated behind repository interfaces. Domain services operate exclusively on typed domain entities, ensuring seamless migration between local development (SQLite) and enterprise data warehouses (Relational Warehouse / PostgreSQL) with zero code refactoring across APIs or frontend components.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             NEXT.JS 15 SURVEILLANCE FRONTEND                             │
│       (App Router | Tailwind CSS | Recharts | React Query | Institutional Glassmorphism)  │
└─────────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │ REST / HTTPS (JSON Payloads + Bearer Token)
┌─────────────────────────────────────────────▼────────────────────────────────────────────┐
│                                FASTAPI SURVEILLANCE ENGINE                               │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ API ROUTER LAYER (Request Validation, Pydantic v2 Serialization, RBAC Auth)        │  │
│  │ [/api/v1/surveillance/* | /api/v1/trades/* | /api/v1/clients/* | /api/v1/auth/*]   │  │
│  └──────────────────────────────────────────┬─────────────────────────────────────────┘  │
│                                             │ Calls Domain Services                      │
│  ┌──────────────────────────────────────────▼─────────────────────────────────────────┐  │
│  │ DOMAIN SERVICE LAYER                                                               │  │
│  │  - EODSurveillanceService (PVASF Scoring Engine, Baselines, Major Shareholders)    │  │
│  │  - ExcelExporter (Multi-Sheet Institutional Excel Dossier Generator .xlsx)         │  │
│  │  - TradeMatchesService (Aggregated Trade Reconstructions, Wash Trades, Algos)      │  │
│  │  - ClientService (Client 360° Identity Resolution, KYC Demographics & Demat Links)│  │
│  │  - MarketCalendarService (Authoritative Session Verification & Holiday Fallback)   │  │
│  │  - AuthService (PBKDF2 Password Hashing, JWT Tokens, System Audit Trail)           │  │
│  └──────────────────────────────────────────┬─────────────────────────────────────────┘  │
│                                             │ Interacts via Repository Interfaces        │
│  ┌──────────────────────────────────────────▼─────────────────────────────────────────┐  │
│  │ REPOSITORY LAYER                                                                   │  │
│  │  - ClientIdentityRepo (Exchange Client Entity Lookup & KYC Profile)                │  │
│  │  - ClientDematRepo (Depository Demat Accounts, POA & Joint Holders Lookup)         │  │
│  │  - TradeMatchesRepository (Matched Turnover, Reversals & Wash Trade Filters)       │  │
│  └──────────────────────────────────────────┬─────────────────────────────────────────┘  │
└─────────────────────────────────────────────┼────────────────────────────────────────────┘
                                              │ SQLAlchemy ORM / Connection Pool
┌─────────────────────────────────────────────▼────────────────────────────────────────────┐
│                           15-TABLE REGULATORY DATA WAREHOUSE                             │
│   [ 8 Functional Modules | Master DDL: backend/db/schema.sql & surveillance_schema.sql ] │
│   [ Production/Local DB: backend/db/surveillance.db (854,061+ Genuine Records, 15 Tables, 158 Cols) | Scale: Teradata MPP ]│
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Standardized Relational Data Model (RDM) across 8 Functional Modules
To ensure rapid operational readiness and eliminate semantic impedance mismatch, the PVASF data layer deliberately employs a **Standardized Relational Data Model** mapped directly to the institutional regulatory data warehouse across 8 functional modules:

1. **Zero Semantic Impedance Mismatch During Sourcing**:
   By directly mirroring the enterprise warehouse entities (`daily_market_eod`, `participant_daily_trades`, `counterparty_trade_pairs`, `client_identity_master`, `client_demat_accounts`), the framework eliminates artificial schema translations. Upstream Data Engineers and DBAs immediately recognize their production table definitions, column names (`close_price`, `gross_positive_ltp_value`, `client_pan`), and primary/foreign keys without needing to decipher custom application aliases.
2. **Local Prototype as an Executable Data Contract**:
   The local SQLite database (`backend/db/surveillance.db`), master DDL script (`surveillance_schema.sql`), and schema specification (`backend/db/schema.sql`) serve as a **live, fully populated executable specification** (15 tables, 158 columns, 854,061+ genuine physical records across 2,191 scrips and 179 trading sessions [852,773 immutable market/participant/demat rows + 1,304+ dynamic append-only audit trail records]). When communicating with the data warehouse team, this schema acts as an exact physical contract defining the precise column grain, mathematical inputs, and cardinality required by the surveillance engine.
3. **Decoupled Application Boundary via Services & DTOs**:
   While the database models adhere 1:1 to institutional surveillance data nomenclature, the application routers and Next.js frontend interact strictly with sanitized Pydantic DTOs and REST contracts (`close_price`, `net_ltp_push`, `client_pan`). If the Relational Warehouse team provides data via materialized views (`v_daily_surveillance_summary`) or staging tables, only the internal SQLAlchemy ORM mapping in `backend/db/models.py` requires adjustment—the entire frontend and surveillance mathematical algorithms remain completely untouched.
4. **Seamless Relational Warehouse Production Dialect Switch**:
   The database engine (`backend/db/database.py`) is engineered to transition from SQLite to an enterprise Relational Warehouse (e.g. PostgreSQL) by setting a single environment variable:
   ```bash
   export DATABASE_URL="postgresql://surv_app:prod_credentials@warehouse_host:5432/SURV_DB"
   ```

### 2.2 Market Calendar Service & Authoritative Trading Session Decoupling
Market session status is decoupled from data presence through the **Authoritative Market Calendar Contract** (`backend/services/market_calendar_service.py` backed by `backend/data/market_calendar.json` and `trading_session_calendar` table):
- **No False Holiday Assumptions**: The system never infers that missing data indicates a market holiday. It queries the authoritative calendar to verify whether a date was an official trading session, weekend, or exchange holiday.
- **Client-Side Auto-Correction & Toast Notifications**: If an investigator selects a non-trading date (e.g. weekend or exchange holiday), the UI automatically detects the session status, seamlessly falls back to the most recent active trading date, and fires an institutional Toast notification informing the user of the auto-adjustment.

### 2.3 Authoritative Pre-Consolidated Market Pricing & Feed Architecture
- **Upstream Pre-Consolidated Market Pricing**: In accordance with enterprise data architecture directives, the market data feed delivered into `daily_market_eod` is **already pre-consolidated** at the warehouse source across all canonical trading venues (NSE + BSE). The closing price, OHLC bounds, volume, and turnover reflect authoritative market-wide consolidated figures directly.
- **Zero In-Engine Consolidation Overhead**: The surveillance engine consumes these pre-consolidated records directly without requiring complex cross-exchange VWAP reconciliations, multi-feed joining, or custom exchange blending logic.
- **Elimination of Artificial Scope Toggles**: Redundant and simulated single-venue toggle controls (`Consolidated (Avg) | NSE | BSE`) have been completely decoupled and removed from user-facing screens and URL parameters. The entire dashboard and analysis workspace present canonical, authoritative market data directly, keeping the interface uncluttered and mathematically consistent.

---

## 3. Exhaustive File-by-File Code & Module Directory

Every file in the repository has been inspected code-by-code and verified against the live filesystem:

### 3.1 Project Root Specifications, Test Suites & Core Scripts
- [`surveillance_schema.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/surveillance_schema.sql): Master ANSI SQL DDL defining all 15 tables, indexes, and full pre-populated seed data for SQLite, PostgreSQL, and ANSI SQL compliance.
- [`archive/sql/surveillance_insert.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/archive/sql/surveillance_insert.sql): Standalone pre-populated seed data script with 11,000+ operational records across all 15 tables (relocated to `archive/sql/`).
- [`SYSTEM_ARCHITECTURE_GUIDE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/SYSTEM_ARCHITECTURE_GUIDE.md): Master technical manual and architectural blueprint (Version 11.0.0, 854,061+ genuine records, 158 columns, 3 ingestion pipelines).
- [`README.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/README.md): Primary system documentation, quick-start guide, operational procedures, and architectural overview.
- [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md): Module-by-module data contract and sanitized warehouse extraction specification for upstream data engineering teams.
- [`DATA_FEED_MAPPING_AUDIT.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_FEED_MAPPING_AUDIT.md): Comprehensive audit catalog and field-level physical mapping matrix documenting the transformation from the 5 upstream Excel datasets to the 15 warehouse relational tables.
- [`DATASET_OVERVIEW.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATASET_OVERVIEW.md): Authoritative dataset overview detailing source files, record counts (399,572 cumulative source rows across 5 files), schema layouts, and data integrity guarantees.
- [`PVASF_CORE_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_CORE_SPEC.md): Mathematical anomaly engine formulas, scoring rules, and baseline distribution specifications.
- [`agent_reference/BUSINESS_FUNCTIONAL_DATA_REQUIREMENTS.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/agent_reference/BUSINESS_FUNCTIONAL_DATA_REQUIREMENTS.md): Business requirements mapping regulatory surveillance rules to functional data requirements.
- [`FUTURE_SCOPE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/FUTURE_SCOPE.md): Strategic roadmap covering ML scoring enhancements, real-time tick streaming, and cross-market surveillance.
- [`scripts/ingest_market_eod.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/ingest_market_eod.py): Universal production-grade market EOD data ingestion pipeline supporting `.xlsx`, `.csv`, `.parquet`, `.feather`, non-destructive SQLite UPSERT (`ON CONFLICT(symbol, trade_date) DO UPDATE`), multi-level pandas index flattening (`droplevel(0)`), trading session calendar auto-registration, and batch verification (333,974 records ingested from `result_part1.xlsx` and `result_part2.xlsx`).
- [`scripts/ingest_client_data.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/ingest_client_data.py): High-performance client trade execution ingestion pipeline ingesting 58,898 genuine records from `client_data.xlsx` across 3 active scrips (`TDPOWERSYS`, `SKMEGGPROD`, `GUJRAFFIA`), populating `participant_daily_trades`, mapping client PANs, resolving trading member IDs, buy/sell quantities, turnover, and gross LTP impact.
- [`scripts/ingest_pan_pairs.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/ingest_pan_pairs.py): Bilateral matched pair ingestion pipeline ingesting 6,700 genuine trade pairings from `PAN_PAIR_GUJRAFFIA.xlsx` (2,713 pairs) and `PAN_PAIR_SKMEGGPROD.xlsx` (3,987 pairs), populating `counterparty_trade_pairs`, computing pairwise matched volume, turnover, and storing both Logic 1 and Logic 2 pairwise LTP push values.
- [`scripts/cross_verify_data_parity.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/cross_verify_data_parity.py): Standalone parity audit script verifying complete mathematical and row-count parity between raw SQLite warehouse tables and backend API payloads.
- [`scripts/generate_sample_data_package.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/generate_sample_data_package.py): Database export tool querying `backend/db/surveillance.db` directly to generate clean, verified 13-sheet sample Excel packages (`PVASF_Sample_Data_Package.xlsx`, `PVASF_Production_Full_Data.xlsx`, and `PVASF_Sample_Data_Package.zip`) and 13 CSV feeds in `PVASF_Sample_Data_Package/sample_data_feeds/`.
- [`PVASF_Sample_Data_Package/`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_Sample_Data_Package): Standardized deliverables directory containing 13 CSV data feeds, data request specification, sample schema, and comprehensive multi-sheet Excel workbook.
- [`PVASF_Production_Full_Data.xlsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_Production_Full_Data.xlsx): Complete production workbook export containing full physical table snapshots generated directly from `backend/db/surveillance.db`.
- [`scripts/verify_e2e.mjs`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/verify_e2e.mjs): Complete automated Node.js ES-module end-to-end verification suite testing backend health, date catalog, JWT authentication, watchlist retrieval, scrip detail, participant forensics, Excel export binary streaming, and frontend route rendering.
- [`scripts/test_frontend_routes.mjs`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/test_frontend_routes.mjs): Automated headless route integration suite validating Next.js frontend pages (`/`, `/analysis/TATAMOTORS`, `/history`, `/settings`) with HTTP 200 checks, HTML integrity, and asset checks.
- [`scripts/test_frontend_api.mjs`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/test_frontend_api.mjs): Automated frontend API integration verification script testing JWT auth, watchlist queries, scrip details, and participant lookups (14/14 contracts verified).
- [`tests/conftest.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/tests/conftest.py): Master Pytest fixture suite managing test database isolation by snapshotting the production database into `pvasf_test_surveillance_isolated.db` using SQLite's native `sqlite3.backup` API, ensuring hermetic test isolation and zero state pollution on `surveillance.db`.
- [`tests/test_surveillance_e2e.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/tests/test_surveillance_e2e.py): Comprehensive 22-test automated end-to-end verification suite testing database integrity, foreign keys, 15-table coverage, 3 analytical views, SQLAlchemy 2.0 ORM models, mathematical scoring, OCCL precision and spec adherence, proprietary leak prevention, live FastAPI endpoints, sliding-window rate limiting, and binary Excel streaming (22 passed).
- [`middleware.ts`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/middleware.ts): Next.js 15 enterprise security middleware enforcing HTTP security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-DNS-Prefetch-Control`, `X-XSS-Protection`) and routing guards.
- [`pv_alert_surveillance.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/pv_alert_surveillance.py): Pure-Python standalone calculation engine implementing `SurveillanceEngine`, `MarketMetricsResult`, `ParticipantAuditResult`, and CLI test runners with zero web dependencies.
- [`package.json`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/package.json): Next.js 15 application manifest, npm scripts (`dev`, `build`, `start`, `lint`, `test`, `test:e2e`), and frontend dependency definitions (Tailwind CSS, Lucide icons, Recharts, Radix UI).
- [`next.config.mjs`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/next.config.mjs): Next.js runtime configuration defining enterprise HTTP security headers (CSP, HSTS) and API rewrites routing `/api/v1/:path*` to the FastAPI backend (`http://127.0.0.1:8005`).
- [`tailwind.config.ts`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/tailwind.config.ts): Design system theme configuration with institutional slate color palettes, font definitions, and container queries.
- [`postcss.config.mjs`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/postcss.config.mjs): PostCSS pipeline configuration with Tailwind CSS and Autoprefixer.
- [`tsconfig.json`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/tsconfig.json): TypeScript configuration enforcing strict type checking, path aliases (`@/*`), and Next.js compiler optimizations.
- [`pytest.ini`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/pytest.ini): Pytest configuration specifying test discovery paths, root directory, and execution options.
- [`requirements.txt`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/requirements.txt): Root Python environment dependency manifest ensuring parity with backend runtime.
- [`archive/database_backups/`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/archive/database_backups/): Dedicated archival directory housing historical database dumps and legacy backups (`my_database.db*`), keeping the root directory clean and uncluttered.
- [`archive/sql/`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/archive/sql/): Dedicated archival directory housing standalone historical SQL inserts (`surveillance_insert.sql`).

### 3.2 Next.js 15 Application Routing Layer (`app/`)
- [`app/layout.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/layout.tsx): Root application layout configuring font typography, metadata, and wrapping the view tree inside `UserProvider` and `AppShell`.
- [`app/globals.css`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/globals.css): Global styling, custom scrollbars, institutional slate color tokens, Tailwind directives, and authoritative `@media print` layout engine enforcing A4 page breaks (`page-break-after: always`, `height: 275mm`, zero header/footer bleed) isolating `#surveillance-dossier-print-root`.
- [`app/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/page.tsx): Executive Surveillance Watchlist Dashboard (Route: `/`). Houses the `TradingDatePicker` with clean date display (purged of cluttered `T-` and `Latest` badges, popover directly opening to calendar grid), quick day-shifters (`Prev Day`, `Next Day` only, purged of `Latest EOD`), 4 subtle pastel risk summary cards (`High Risk`, `Medium`, `Low`, `All Risks`), clean URL parameters with automatic stripping of legacy `exchange` query strings, 15D analysis window indicator readout badge, dynamic cutoff badge (`Score ≥ 60.0`), risk distribution progress bar, and `AlertsTable` with direct 'Analyze' navigation, sticky `Scrip` column, and two-tier surveillance toolbar featuring segmented Scrip Alphabet Allotment control (`ALL`, `A-E`, `F-J`, `K-O`, `P-T`, `U-Z` per PVASF §2 & §5).
- [`app/analysis/[symbol]/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/analysis/%5Bsymbol%5D/page.tsx): Single-stock forensic investigation workspace (Route: `/analysis/[symbol]`). Orchestrates the 4 surveillance tabs (`Overview`, `Shareholders`, `Corporate Actions`, `Participants`), participant drilldowns, and top command bar export actions.
- [`app/analyse/[symbol]/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/analyse/%5Bsymbol%5D/page.tsx): Backward-compatible route alias performing an asynchronous server redirect: `redirect('/analysis/${symbol}')`.
- [`app/not-found.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/not-found.tsx): Institutional 404 error page. Catches unmapped routes or missing scrip identifiers and presents a stylized slate recovery card with navigation back to the Surveillance Dashboard.
- [`app/error.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/error.tsx): Global client-side React error boundary. Gracefully catches uncaught rendering or network exceptions, displays diagnostic error summaries, and provides single-click workspace re-initialization (`reset()`).
- [`app/history/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/history/page.tsx): Immutable Security Audit Logs (Route: `/history`). Displays real-time entries from `compliance_audit_logs`, action filtering, search pre-fill (`/history?search=SYMBOL`), and CSV exporter.
- [`app/settings/page.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/settings/page.tsx): Model Parameter Calibration & Admin Center (Route: `/settings`). Features 3 tabs: Model Configuration (5-weight sliders & cutoff threshold), User Management (RBAC role assignments, user status toggles), and Security Audit Trail.

### 3.3 UI Component Library (`components/`)
- **Layout**:
  - [`components/layout/app-shell.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/layout/app-shell.tsx): Application frame with global search (keyboard shortcut `/` and `Cmd+K`), watchlist notification bell (5-minute background poll with `99+` notification badge formatting), user profile pill, and 1-click role switcher.
- **Dashboard**:
  - [`components/dashboard/alerts-table.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/dashboard/alerts-table.tsx): High-performance surveillance watchlist table featuring 4 subtle pastel Risk KPI cards (`High Risk`, `Medium`, `Low`, `All Risks` with alert score ranges), two-tier controls toolbar (Tier 1: Search + Export CSV / Reset filters; Tier 2: Scrip Alphabet Allotment segmented control `ALL | A-E | F-J | K-O | P-T | U-Z`, Triggers bar, and live scrip count), sticky first column (`Scrip`), non-clipping downward tooltips, column sorting, pagination, risk badges, clean URLs (purged of exchange scope params), and direct "Analyze" action triggers.
- **Forensic Investigation**:
  - [`components/investigation/investigation-workspace.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/investigation/investigation-workspace.tsx): Master forensic analysis workspace orchestrating 4 primary tabs (`Overview`, `Shareholders`, `Corporate Actions`, `Participants`), unified observation bar with clean calendar date picker, top command bar export actions, **High-Resolution Fullscreen Chart Modal** (`expandedChart` with sticky header, symbol badge, subtitle, and ESC shortcut), and the **Client 360° Demographics Slide-Over Drawer** (`selectedPan`, dynamically resolving `tm_id` from `participant_daily_trades.trading_member_id`). Enforces a strict zero-mock data policy: displays clean institutional empty states when quarterly filing data or corporate actions are pending. In `Shareholders`, features 4 streamlined KPI cards, Table 1 (Capital Structure), Table 2 (PAN Demographics with clean percentage deltas), and **Table 3: Major Shareholders Registry** with substantial ownership flags (`Substantial (≥ 5%)`, `Promoter`, `Standard`). In `Participants`, renders Gross Positive and Gross Negative LTP Contribution tables (Row 1), Concentrated Volume Share and Counterparty Concentration (`n1 ⇄ n2`, `p1 ⇄ p2`, Row 2), and **Enhanced Net P&L — Top Trading Beneficiaries** with macro scale notation (`+₹X.XX Cr` or `+₹X.XX L`, Row 3). Reversal pairs (RTR) and circular trading loops are evaluated via the engine and exported in the Excel dossier.
  - [`components/investigation/charts.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/investigation/charts.tsx): Streamlined visualization suite containing `CombinedMarketChart` (dual-axis master chart with 20/50 DMA and 15D window overlay, 6M/180D baseline default, 5-range timeframe selector `15D (Window) | 1M | 3M | 6M (180D Baseline) | Max`, `15D Window` highlight toggle, `Pump Anomaly Detected` quick-zoom shortcut, live cursor crosshair HUD tracker with Date, Close, Open, High, Low, % vs Day 1, 20 DMA, 50 DMA, Volume, Delivery % [`D: xx%`], dynamic volume surge indicators, and embedded `ChartGuideButton`), `SurveillanceStatisticalDeck` (3-pillar layout: **Price Rise**, **Price Z-Score**, **Volume Z-Score** using clean human terms, professional statistical thresholds, zero clause section numbers, and adaptive baseline day labels for short histories), price band breakout card (`AnomalyEventMatrixChart` with clean `5% daily exchange price band` format), and `ParameterRadarChart`.
  - [`components/investigation/surveillance-dossier-pdf.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/investigation/surveillance-dossier-pdf.tsx): Institutional multi-page regulatory surveillance dossier generator supporting instant print, A4 PDF generation, dynamic risk thresholds, clean institutional empty-state notices for unpopulated tables, and in-modal zoom preview (`0.5x` to `1.5x`). Renders 5 standalone A4 print pages: (1) Executive Cover & 5-Parameter Scorecard with Vector SVG Radar Chart, (2) Market Dynamics & 15-Day Trading Ledger, (3) Shareholding Pattern & Ownership Concentration ($t$ vs $T-180$), (4) Regulatory Disclosures & Corporate Actions, and (5) High-Volume Entities & Participant Surveillance.
- **UI Primitives (`components/ui/`)**:
  - [`components/ui/badge.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/ui/badge.tsx): Styled badges for risk levels (High, Medium, Low) and case statuses.
  - [`components/ui/button.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/ui/button.tsx): Reusable button primitives supporting variants (`default`, `secondary`, `destructive`, `ghost`).
  - [`components/ui/card.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/ui/card.tsx): Card container primitive with institutional border styling.
  - [`components/ui/input.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/ui/input.tsx): Form inputs with focus rings and error states.
  - [`components/ui/metric-help.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/ui/metric-help.tsx): Info (`i`) toggle icon opening non-clipping downward tooltips with explanations.
  - [`components/ui/info-tooltip.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/ui/info-tooltip.tsx): Institutional portal-based tooltip primitive (`createPortal`) ensuring metric descriptions and explanations hover seamlessly over all table headers, overflowing containers, and viewport edges without clipping or CSS overflow truncation.
  - [`components/ui/trading-date-picker.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/ui/trading-date-picker.tsx): Clean calendar picker with pure date display (purged of `T-` relative indices and `Latest` badge pills), highlighting available market trading dates, disabling weekends and holidays, with a popover that opens directly to the monthly calendar grid and session status footer (purged of top shortcut row).
  - [`components/ui/toast.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/ui/toast.tsx): Floating auto-dismissing toast notification for session auto-adjustments.

### 3.4 Client Library & State Management (`lib/`)
- [`lib/api.ts`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/lib/api.ts): Centralized REST client handling concurrency-safe JWT token injection via an in-flight authentication lock in `fetchWithAuth`, auto-re-authentication on HTTP 401, type definitions for all entities, purged of fake ISINs and legacy venues, supporting `ParticipantAudit` and binary streaming helpers (`downloadScripExcel`).
- [`lib/metric-help.ts`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/lib/metric-help.ts): Central dictionary of regulatory metric descriptions and surveillance definitions.
- [`lib/user-context.tsx`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/lib/user-context.tsx): Global React Context managing user authentication, role switching, auto-provisioned analyst session with explicit logout tracking, and audit log syncing.
- [`lib/utils.ts`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/lib/utils.ts): Utility functions (`cn` for Tailwind class merging with `clsx` and `tailwind-merge`).

### 3.5 FastAPI Backend Architecture (`backend/`)
- [`backend/main.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/main.py): Server entrypoint mounting restricted CORS middleware (`localhost:3000`, `127.0.0.1:3000`, `localhost:8000`, `127.0.0.1:8000`, `localhost:8005`, `127.0.0.1:8005`), enterprise HTTP security headers middleware (`add_security_headers`), database lifespan initialization with smart idempotent check (verifies row count in `portal_user_accounts` and `daily_market_eod` before triggering seeding), and mounting all 4 production routers.
- [`backend/security.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/security.py): Security subsystem implementing PBKDF2-HMAC-SHA256 password hashing (100,000 iterations + 16B salt), HMAC-SHA256 signed access tokens (24-hour expiration), token decoders, and RBAC role guards (`require_admin`, `require_analyst`, `require_viewer`).
- [`backend/requirements.txt`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/requirements.txt): Python backend dependencies manifest.

#### Reference Feeds (`backend/data/`)
- [`backend/data/market_calendar.json`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/data/market_calendar.json): Authoritative holiday schedule defining national/state market closures and special trading sessions (e.g. Diwali Muhurat Trading).

#### Database Layer (`backend/db/`)
- [`backend/db/database.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/database.py): SQLAlchemy engine, session factory (`SessionLocal`), dependency provider (`get_db`), SQLite foreign-key pragma hooks, and schema initialization helpers (`init_db`, `reset_database`). Supports PostgreSQL/MySQL via `DATABASE_URL`.
- [`backend/db/models.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/models.py): Complete declarative SQLAlchemy 2.0 ORM mappings for all 15 active database tables adhering to standardized relational column nomenclature:
  - `DailyMarketEod` (`daily_market_eod`)
  - `MarketBaselineStat` (`market_baseline_stats`)
  - `ClientIdentityMaster` (`client_identity_master`)
  - `ClientDematAccount` (`client_demat_accounts`)
  - `ParticipantDailyTrade` (`participant_daily_trades`)
  - `CounterpartyTradePair` (`counterparty_trade_pairs`)
  - `ShareholdingSummary` (`shareholding_summary`)
  - `LargeShareholdersRegistry` (`large_shareholders_registry`)
  - `CorporateEventsFeed` (`corporate_events_feed`)
  - `PriceDilutionFactor` (`price_dilution_factors`)
  - `TradingSessionCalendar` (`trading_session_calendar`)
  - `BrokerDailySummary` (`broker_daily_summary`)
  - `SurveillanceAlertCase` (`surveillance_alert_cases`)
  - `SysUser` (`portal_user_accounts`)
  - `SysAuditLog` (`compliance_audit_logs`)
- [`backend/db/schema.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/schema.sql): Master 15-table production schema DDL with data contracts, constraints, foreign keys, and module annotations (158 columns total).
- [`backend/db/model_config.json`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/model_config.json): Active persisted model configuration holding calibrated weights (`price_rise: 20.0`, `price_z: 20.0`, `volume_z: 20.0`, `band_persistence: 20.0`, `new_high: 20.0`) and alert triage threshold (`60.0`).
- [`backend/db/seed.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/seed.py): Deterministic synthetic data generator creating 500 exchange clients, 500 depository accounts, 260 trading days of EOD data across 15 scrips, shareholding records, corporate actions, and system users.
- [`backend/db/surveillance.db`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/surveillance.db): Production & local SQLite database (854,061+ genuine physical records [852,773 immutable market/participant/demat rows + 1,304+ dynamic append-only audit trail records] across 15 tables and 2,191 distinct scrips) for high-performance surveillance and offline verification.

#### Repositories Layer (`backend/repositories/`)
- [`backend/repositories/client_identity_repo.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/repositories/client_identity_repo.py): Data-access layer querying `client_identity_master` by legal entity PAN.
- [`backend/repositories/client_demat_repo.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/repositories/client_demat_repo.py): Data-access layer querying `client_demat_accounts` by PAN to resolve beneficiary owner accounts, DP IDs, and joint holders.
- [`backend/repositories/trade_matches_repo.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/repositories/trade_matches_repo.py): Data-access layer reconstructing execution records by joining `counterparty_trade_pairs`, `daily_market_eod`, and `participant_daily_trades`. Detects same-broker wash trades and computes execution filters.

#### Routers Layer (`backend/routers/`)
- [`backend/routers/surveillance.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/routers/surveillance.py): Endpoints for `/health`, `/dates`, `/watchlist`, `/scrips`, `/scrip/{id}`, `/scrip/{id}/participants`, `/scrip/{id}/shareholding-breakdown`, `/scrip/{id}/corporate-actions`, `/scrip/{id}/export-excel` (streaming 5-sheet Excel workbook), `GET /weights`, `POST /weights` (updating weights, persisting to `model_config.json`, and writing audit trail), and `/upload-eod` (12 endpoints total; 26 application endpoints system-wide).
- [`backend/routers/trade_matches.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/routers/trade_matches.py): Endpoints for paginated trade records (`/api/v1/trades/`), `/stats/daily`, `/analysis/wash-trades`, `/analysis/algo-breakdown`, `/participant/{clnt_token}`, and single trade composite PK lookups (6 endpoints total).
- [`backend/routers/clients.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/routers/clients.py): Minimal client endpoint `/api/v1/clients/pan/{pan}` powering the Client 360° Demographics drawer (1 endpoint).
- [`backend/routers/auth.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/routers/auth.py): Security endpoints for `/login`, `/me`, `/users` (list/create), `/users/{id}/role`, `/users/{id}/toggle`, and `/audit-logs`, fortified by an in-memory sliding-window rate limiter (`LoginRateLimiter`: max 25 attempts per 60s, 30s lockout penalty) protecting authentication endpoints against brute force attacks (7 endpoints total).

#### Schemas Layer (`backend/schemas/`)
- [`backend/schemas/common.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/schemas/common.py): Pydantic models for pagination metadata (`PaginationMeta`) and generic paged envelopes (`PagedResponse`).
- [`backend/schemas/clients.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/schemas/clients.py): Pydantic models for exchange client records and depository demat accounts.
- [`backend/schemas/trade_matches.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/schemas/trade_matches.py): Pydantic models for trade matching filters (`TradeMatchesFilter`), `FactTradeBase`, and `FactTradeDetail`.

#### Services Layer (`backend/services/`)
- [`backend/services/surveillance_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/surveillance_service.py): Primary business logic engine executing the 5 PVASF anomaly scoring algorithms, 180-day baseline aggregations, participant Gross Positive/Negative LTP contributions, circular trading loops, corporate action normalizations, major shareholder rankings, and dual-tier model configuration persistence (`_load_persisted_config()` reading `model_config.json`, fallback to latest `compliance_audit_logs` record, fallback to defaults).
- [`backend/services/excel_exporter.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/excel_exporter.py): Institutional multi-sheet Excel dossier generator built on `openpyxl`. Generates 5 dedicated worksheets with zero mock data, real computed formulas, and dynamic regulatory narratives.
- [`backend/services/trade_matches_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/trade_matches_service.py): Service coordinating repository calls for paginated trade records, wash trade summaries, and algo execution breakdowns.
- [`backend/services/client_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/client_service.py): Service cross-referencing exchange client PANs against depository records for Client 360° views, dynamically resolving Trading Member ID from `ParticipantDailyTrade.trading_member_id`.
- [`backend/services/market_calendar_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/market_calendar_service.py): Authoritative market session validation service preventing false holiday assumptions.
- [`backend/services/auth_service.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/auth_service.py): User authentication, credential validation, user provisioning, role management, and audit log generation with anti-lockout protection.

---

## 4. EOD Data Processing & Transformation Pipeline

The EOD surveillance batch processing pipeline operates in 5 deterministic stages:

```
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │ 1. EOD WAREHOUSE EXTRACTION                                                            │
  │    Extract daily_market_eod, participant_daily_trades, counterparty_trade_pairs for window [T-180, t]     │
  └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
  ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
  │ 2. CORPORATE ACTION DILUTION NORMALIZATION                                             │
  │    Query price_dilution_factors; adjust baseline price: P_{T-180, adj} = P_{T-180} * F_dil   │
  └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
  ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
  │ 3. 180-DAY BASELINE STATISTICAL MODELING                                               │
  │    Compute mean return μ_R, return volatility σ_R, mean volume μ_V, volume stddev σ_V  │
  └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
  ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
  │ 4. 15-DAY ACTIVE ANALYSIS WINDOW EVALUATION                                            │
  │    Compute High_{15D}, 15D mean return, 15D mean volume, Band Hits, and New High Days  │
  └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
  ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
  │ 5. METRIC SCORING & COMPOSITE TRIAGE                                                   │
  │    Map raw metrics to {0, 1, 3, 5} discrete scores; compute Score_Final; shortlist ≥60 │
  └────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Production-Grade Universal Market EOD Ingestion Pipeline (`scripts/ingest_market_eod.py`)

To bridge multi-format market data feeds (Excel `.xlsx`/`.xls`, CSV `.csv`, Apache Parquet `.parquet`, Apache Arrow Feather `.feather`) directly into the 15-table relational warehouse without data corruption, positional drift, or index mismatch, the platform incorporates [`scripts/ingest_market_eod.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/ingest_market_eod.py):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               UNIVERSAL MARKET EOD INGESTION PIPELINE (CLI & BATCH RUNNER)             │
│            scripts/ingest_market_eod.py [--file / --wipe / --dry-run / --stats]       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
   ┌────────────────────────────────────────┼────────────────────────────────────────┐
   ▼                                        ▼                                        ▼
Excel Files (.xlsx, .xls)             Delimited Text (.csv)              Columnar Binary (.parquet)
- OpenPyXL / Calamine engine           - Chunked streaming parser        - FastParquet / PyArrow
- Multi-sheet auto-detection           - Flexible delimiter inference    - High-density compression
   │                                        │                                        │
   └────────────────────────────────────────┼────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. FLEXIBLE COLUMN ALIASING & CASING NORMALIZATION                                     │
│    - Resolves heterogeneous exchange aliases (SCRIP_SYMBOL, TICKER, TOTTRDQTY, etc.)   │
│    - Standardizes date formats (YYYY-MM-DD) and numeric types (float64, int64)         │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. ROBUST ROLLING BASELINE MATH WITH INDEX-ALIGNED DROPOFF                             │
│    - Computes 180-day rolling mean volume, volume std dev, mean return, return std dev │
│    - Enforces `.droplevel(0)` on grouped rolling series to prevent MultiIndex drift    │
│    - Preserves exact 1:1 positional alignment with the original DataFrame index        │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. ATOMIC NON-DESTRUCTIVE SQLITE UPSERT (ON CONFLICT DO UPDATE)                        │
│    - Executes: INSERT INTO daily_market_eod ... ON CONFLICT(symbol, trade_date)        │
│      DO UPDATE SET open_price=excluded.open_price, close_price=excluded.close_price... │
│    - Guarantees zero historical data loss during daily incremental market feed batches │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. AUTHORITATIVE TRADING SESSION CALENDAR AUTO-REGISTRATION                            │
│    - Automatically registers new trade dates into `trading_session_calendar`           │
│    - Marks `is_trading_day = 1`, instantly updating UI calendar pickers               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Universal File Format Support**:
   - Ingests single files, directories, or wildcard glob patterns. Automatically selects optimal parsing engines based on file extension (`.xlsx`, `.xls`, `.csv`, `.parquet`, `.feather`).
   - Default CLI paths resolve to canonical exchange data files (`result_part1.xlsx`, `result_part2.xlsx`).
2. **Index-Aligned Droplevel Transforms (`df.droplevel(0)`)**:
   - Solves a subtle pandas rolling groupby defect: grouped rolling aggregations in pandas generate a two-level MultiIndex `(symbol, original_index)`. Assigning this series directly back to the DataFrame causes index misalignment and silent NaN corruption.
   - Calling `.droplevel(0)` strips the redundant group symbol index, guaranteeing exact 1:1 index alignment with the parent DataFrame before database insertion.
3. **Non-Destructive Upsert Architecture**:
   - Uses SQLite 3.24+ `INSERT INTO daily_market_eod (...) VALUES (...) ON CONFLICT(symbol, trade_date) DO UPDATE SET ...`.
   - Running the script incrementally updates existing trade dates and appends newly arrived trading sessions without requiring full database wipes.
   - Provides `--wipe` flag for intentional fresh initializations.
4. **Calendar Synchronization**:
   - Auto-registers every ingested trade date into `trading_session_calendar` with `is_trading_day = 1` and `holiday_name = NULL`. The Next.js `TradingDatePicker` immediately recognizes newly ingested dates without manual database maintenance.
5. **High-Performance Execution**:
   - Evaluates 180-day baseline statistics and commits batches in $\approx 0.58\text{s}$ for incremental runs.

### 4.2 High-Performance Participant Ingestion Pipeline (`scripts/ingest_client_data.py`)

To transform institutional client-level order execution feeds directly into participant conduct metrics, the platform provides [`scripts/ingest_client_data.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/ingest_client_data.py). It ingests **58,898 genuine execution records** from `client_data.xlsx` across active surveillance scrips (`TDPOWERSYS`, `SKMEGGPROD`, `GUJRAFFIA`):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│            PARTICIPANT TRADE EXECUTION INGESTION PIPELINE (CLI & BATCH RUNNER)         │
│                        scripts/ingest_client_data.py [--file]                          │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. ENTITY CLASSIFICATION & PAN CLEANSING                                               │
│    - Parses 4th PAN character: 'P' -> INDIVIDUAL, 'C' -> CORPORATE, 'H' -> HUF, etc.   │
│    - Auto-registers missing entities into `client_identity_master` (59,397 records)    │
│    - Auto-generates depository links in `client_demat_accounts` (59,387 records)       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. AGGREGATION & CONDUCT METRIC EVALUATION                                             │
│    - Computes buy/sell quantities, buy/sell turnover values per client per trade date  │
│    - Computes Gross Positive LTP Value (+₹ ask lifting) & Gross Negative LTP Value     │
│    - Reconciles same-broker internal wash volume and aggressive taker trade counts    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. ATOMIC BATCH UPSERT (ON CONFLICT DO UPDATE)                                         │
│    - Inserts into `participant_daily_trades` with transactional atomicity              │
│    - Populates 58,898 active execution records across TDPOWERSYS, SKMEGGPROD, GUJRAFFIA│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Deterministic Entity Classification**:
   - Analyzes the fourth character of the Indian Permanent Account Number (PAN) according to statutory tax rules (`P` for Individual, `C` for Company, `H` for Hindu Undivided Family, `F` for Partnership/LLP, `T` for Trust, etc.).
   - Distinguishes proprietary trading desks and broker pool accounts (`PROPRIETARY`, `POOL`, category `0`) from institutional and retail clients.
2. **Auto-Provisioning of Demat & KYC Master Links**:
   - Guarantees relational referential integrity: every unique client PAN discovered in the execution feed is checked against `client_identity_master`. Any missing PANs are registered atomically with default demographic attributes (`MUMBAI`, `ACTIVE`, `STANDARD`).
   - Generates corresponding beneficiary depository accounts in `client_demat_accounts` (NSDL/CDSL DP IDs) to ensure complete interactive drilldown in the Client 360° slide-over drawer.
3. **Execution Conduct Calculations**:
   - Evaluates buy turnover, sell turnover, gross positive LTP value, gross negative LTP value, and same-broker wash quantity per `(symbol, trade_date, client_pan)`.

---

### 4.3 Bilateral Matched Pair Ingestion Pipeline (`scripts/ingest_pan_pairs.py`)

To evaluate counterparty collusion, synchronized trading, circular flow loops, and bilateral concentration, [`scripts/ingest_pan_pairs.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/ingest_pan_pairs.py) processes official exchange matched trade pair feeds:
- `PAN_PAIR_GUJRAFFIA.xlsx`: **2,713 matched trade pairs** spanning October 14 – October 21, 2025.
- `PAN_PAIR_SKMEGGPROD.xlsx`: **3,987 matched trade pairs** for the November 03, 2025 alert session.
- Cumulative total: **6,700 genuine bilateral matched trade records** ingested into `counterparty_trade_pairs` (100% genuine exchange data; all prior synthetic base pairs purged).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             BILATERAL PAN PAIR INGESTION PIPELINE (scripts/ingest_pan_pairs.py)        │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. TRANSACTIONAL PURGE OF SYNTHETIC RECORDS & DUMMY SCRIPS                             │
│    - Wipes obsolete dummy test tickers (ALPHATECH, NOVAENERGY, ORBITCEM, etc.)         │
│    - Wipes legacy uncalibrated pair records for target scrips                          │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. SCHEMA AUTO-MIGRATION FOR DUAL-LOGIC LTP PUSH                                       │
│    - Validates presence of `pairwise_ltp_push_value_logic_2` in SQLite catalog         │
│    - Executes ALTER TABLE if needed, ensuring 16-column physical table consistency     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. COUNTERPARTY KYC REGISTRATION & BATCH INSERT                                        │
│    - Registers missing buyer/seller PANs into `client_identity_master`                 │
│    - Computes matched volume, matched turnover, and stores Logic 1 and Logic 2 push    │
│    - Flags same-broker crossing (`buyer_tm_id == seller_tm_id`)                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Dual-Logic Pairwise LTP Push Handling**:
   - The exchange data feed supplies two distinct methodologies for calculating pairwise LTP push:
     - **Logic 1 (`pairwise_ltp_push_value`)**: LTP price differential contributed by trades directly between Buyer and Seller.
     - **Logic 2 (`pairwise_ltp_push_value_logic_2`)**: Alternative price push methodology incorporating weighted aggressor volumes.
   - Both metrics are preserved side-by-side in `counterparty_trade_pairs` (columns 12 and 13).
   - **Active Surveillance Policy**: In the active surveillance engine and UI tables, pairwise LTP push values are intentionally **ignored** to eliminate statistical noise; the platform prioritizes **genuine matched volume, matched turnover value, and pairwise volume share %** to detect concentration and collusion with 100% empirical rigor.
2. **Wash Trade & Synchronized Execution Detection**:
   - Identifies internal broker matches where `buyer_tm_id == seller_tm_id`, setting `is_same_broker_wash = 1`.
   - Provides matched volumes for engine DFS circular trading cycle detection ($A \to B \to C \to A$) and Trade Reversal Ratio (RTR) calculations.

---

## 5. PVASF Core Surveillance Engine & Scoring Algorithms

The composite risk score is evaluated as:

$$\text{Score}_{\text{Final}} = \sum_{i=1}^{5} w_i \times \left( \frac{\text{Score}_i}{5.0} \right)$$

Where parameter scores $\text{Score}_i \in \{0, 1, 3, 5\}$ and active weights $\sum w_i = 100\%$:

| Metric # | Parameter Name | Evaluation Formula | Initial Weight | Active Calibrated Weight ($w_i$) | Scoring Thresholds (0, 1, 3, 5) |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Metric 1** | Price Rise % | $\frac{\text{High}_{15\text{D}} - P_{T-180, \text{adj}}}{P_{T-180, \text{adj}}} \times 100$ | 25% | **20.0%** | $<15\% \to 0$<br/>$15\text{--}75\% \to 1$<br/>$76\text{--}150\% \to 3$<br/>$>150\% \to 5$ |
| **Metric 2** | Price Z-Score | $Z = \frac{\bar{R}_{15\text{D}} - \mu_{R, 180\text{D}}}{\sigma_{R, 180\text{D}}}$<br/>$\text{Mod } Z = 0.6745 \frac{\bar{R}_{15\text{D}} - \text{Med}}{\text{MAD}}$ | 20% | **20.0%** | $Z < 1.645 \to 0$<br/>$Z \ge 1.645 \to 1$<br/>$Z \ge 2.33 \to 3$<br/>$Z \ge 3.09 \to 5$ |
| **Metric 3** | Volume Z-Score | $Z = \frac{\bar{V}_{15\text{D}} - \mu_{V, 180\text{D}}}{\sigma_{V, 180\text{D}}}$<br/>$\text{Mod } Z = 0.6745 \frac{\bar{V}_{15\text{D}} - \text{Med}}{\text{MAD}}$ | 25% | **20.0%** | $Z < 1.645 \to 0$<br/>$Z \ge 1.645 \to 1$<br/>$Z \ge 2.33 \to 3$<br/>$Z \ge 3.09 \to 5$ |
| **Metric 4** | Upper Circuit Persistence | $\sum_{t=T-14}^{T} \mathbb{I}\left( \frac{\text{High}_t - \text{Close}_{t-1}}{\text{Close}_{t-1}} \ge 0.90 \times \text{Band}_t \right)$ | 15% | **20.0%** | $0\text{--}2\text{d} \to 0$<br/>$3\text{--}5\text{d} \to 1$<br/>$6\text{--}9\text{d} \to 3$<br/>$\ge 10\text{d} \to 5$ |
| **Metric 5** | 180D New High Breakouts | $\sum_{t=T-14}^{T} \mathbb{I}\left( \text{High}_t > \max_{k=t-180}^{t-1} \text{High}_k \right)$ | 15% | **20.0%** | $0\text{d} \to 0$<br/>$1\text{--}4\text{d} \to 1$<br/>$5\text{--}9\text{d} \to 3$<br/>$\ge 10\text{d} \to 5$ |

#### Algorithmic Resolution Details:
- **Metric 1 (Dilution Normalization)**: Baseline price $P_{T-180, \text{adj}} = \max(P_{T-180} \times \text{dilution\_multiplier}, 10^{-4})$. For listings with $<181$ trading sessions, $P_{T-180}$ automatically resolves to the earliest available closing session ($t_0$), eliminating index out-of-bound errors.
- **Metric 2 & 3 (Gaussian & Modified Z-Scores)**: Background distributions $\mu$ and $\sigma$ evaluate the preceding rolling 15-day averages over the 180-day baseline window ($\sigma \ge 10^{-6}$). The engine also evaluates the robust Modified Z-Score ($\text{Mod } Z = 0.6745 \times \frac{X - \text{Median}}{\text{MAD}}$) to provide median-anchored anomaly detection immune to single extreme outliers. The engine exposes exact Gaussian anomaly thresholds: $95^{\text{th}}$ percentile ($+1.645\sigma$), $99^{\text{th}}$ percentile ($+2.33\sigma$), and $99.9^{\text{th}}$ percentile ($+3.09\sigma$).
- **Metric 4 (Dynamic Empirical Price Band Resolution)**: Checks for empirical daily upper circuit limits in `daily_market_eod` ($\text{Band}_t = \frac{\text{UpperCircuitLimit}_t - \text{PrevClose}_t}{\text{PrevClose}_t}$). If daily limit feeds are absent, estimates band tiers (2%, 5%, 10%, or 20%) based on the historical 99th percentile high move.
- **Metric 5 (Strict Rolling Peak High Breakout)**: Evaluates strict inequality $\text{High}_t > \max_{k=t-180}^{t-1} \text{High}_k$ against the prior rolling peak with $\text{min\_periods} = \min(15, \text{lookback})$.

### 5.1 Active Calibrated Configuration (Audit Log #108 Aligned)

The operational surveillance environment operates under the **Calibrated Equal-Weight Scoring Configuration** aligned with official Compliance Audit Record #108:
- **Balanced 20% Allocation Across All 5 Parameters**:
  Each surveillance dimension contributes equally ($20.0\%$) to the composite score:
  - Price Rise %: $w_1 = 20.0\%$
  - Price Z-Score: $w_2 = 20.0\%$
  - Volume Z-Score: $w_3 = 20.0\%$
  - Upper Circuit Band Persistence: $w_4 = 20.0\%$
  - 180-Day New High Breakouts: $w_5 = 20.0\%$
- **Calibrated Triage Cutoff Threshold**:
  The alert cutoff is set to $\mathbf{60.0}$ points (elevated from the legacy 15.0 development baseline). A threshold of $60.0$ requires a scrip to exhibit multiple concurrent severe statistical anomalies (e.g., extreme volume surge + upper circuit lockouts + sustained 180-day price breakout) before generating a regulatory alert, effectively suppressing false positives while highlighting high-conviction market manipulation.
- **Dynamic Risk Tiering & Status Mapping**:
  The platform dynamically partitions all analyzed scrips into 3 operational risk tiers evaluated relative to the active threshold ($\text{Cutoff} = 60.0$):
  $$\text{Medium Threshold} = \max\left(10, \text{round}(\text{Threshold} \times 0.6)\right) \quad (= 36.0 \text{ when Threshold } = 60.0)$$
  - **High Risk**: $\text{Composite Score} \ge \text{Threshold}$ ($\ge 60.0$) $\to$ Triage Watchlist Alert Trigger (`Open`, rose)
  - **Medium Risk**: $\text{Medium Threshold} \le \text{Composite Score} < \text{Threshold}$ ($36.0\text{--}59.9$) $\to$ Active Review (`Under review`, amber)
  - **Low Risk**: $\text{Composite Score} < \text{Medium Threshold}$ ($< 36.0$) $\to$ Routine Baseline (`Normal`, emerald)
  - **All Risks**: Total universe of listed securities analyzed (slate)

### 5.2 Model Configuration Persistence & Recovery Engine (`model_config.json`)

To ensure that parameter adjustments and threshold calibrations survive application restarts, container redeployments, and host reboots, the backend implements a **Dual-Tier State Persistence & Recovery Engine**:

1. **Persistent State File (`backend/db/model_config.json`)**:
   All active weights and thresholds are stored on disk in a structured JSON envelope:
   ```json
   {
     "weights": {
       "price_rise": 20.0,
       "price_z": 20.0,
       "volume_z": 20.0,
       "band_persistence": 20.0,
       "new_high": 20.0
     },
     "threshold": 60.0,
     "updated_at": "2026-10-08T11:22:20.454246"
   }
   ```
2. **Three-Tier Fallback Lifecycle (`_load_persisted_config`)**:
   - **Tier 1 (Disk File)**: Reads `backend/db/model_config.json`. If valid, loads weights and threshold immediately.
   - **Tier 2 (Audit Log Recovery)**: If the JSON file is missing or corrupted, queries `compliance_audit_logs` for the most recent `RECALIBRATE_MODEL` or `UPDATE_MODEL_WEIGHTS` action, parses the logged narrative, and restores state.
   - **Tier 3 (Calibrated Defaults)**: If no audit records exist, falls back to equal 20% weights and 60.0 threshold.
3. **Atomic Admin Calibration Endpoint (`POST /api/v1/surveillance/weights`)**:
   - Enforces RBAC `Admin` privileges.
   - Validates that weights sum to $100.0\% \pm 0.01\%$.
   - Atomically updates the in-memory singleton.
   - Writes the updated JSON structure to `backend/db/model_config.json`.
   - Records an immutable audit entry in `compliance_audit_logs` capturing officer username, previous weights, new weights, and client IP.
4. **Zero-Downtime Hot-Reloading (`GET /api/v1/surveillance/weights`)**:
   - Provides real-time read access to active weights and threshold for Next.js Settings sliders and KPI badges without requiring backend restarts.

---

## 6. Participant Conduct Audit, Forensic Intelligence & Client 360°

When an investigator opens the forensic workspace for a shortlisted scrip, the backend executes 7 specialized algorithmic audits across client trade aggregates and links them directly to the Client 360° Demographics Intelligence drawer:

1. **Gross Positive & Gross Negative LTP Contribution ("Price Pusher & Suppressor" Metrics)**:
   - Quantifies aggressive orders lifting the ask or hitting the bid:
     $$\text{Gross Positive LTP}_i = \sum_{15\text{D}} \text{gross\_positive\_ltp\_value}_i$$
     $$\text{Gross Negative LTP}_i = \sum_{15\text{D}} \text{gross\_negative\_ltp\_value}_i$$
     $$\text{Net LTP}_i = \text{Gross Positive LTP}_i - \text{Gross Negative LTP}_i$$
   - **Dual Contribution Metrics**:
     - **Participant LTP Share (`contribution`)**: Evaluates the participant's proportion of total positive (or negative) LTP pushed by all active participants during the 15-day window:
       $$\text{Contribution \%} = \frac{\text{PosContVal}_i}{\sum_j \text{PosContVal}_j} \times 100 \quad \left(\text{or } \frac{\text{NegContVal}_i}{\sum_j \text{NegContVal}_j} \times 100\right)$$
     - **Scrip Movement Contribution (`scrip_movement_contribution_pct`)**: Measures the participant's LTP push relative to the net 15-day scrip price movement ($\Delta P_{15\text{D}} = P_{\text{latest}} - P_{\text{baseline}}$), computed when $\Delta P_{15\text{D}} > 0.05$:
       $$\text{Scrip Movement Contribution \%} = \frac{\text{PosContVal}_i}{\Delta P_{15\text{D}}} \times 100$$
   - Displayed in two dedicated 4-column tables: **Gross Positive LTP Contribution** (entities aggressively lifting ask prices, $+₹$) and **Gross Negative LTP Contribution** (entities aggressively hitting bid prices, $-₹$). Resolves legal entity names from `client_identity_master` (`client_legal_name`) alongside client PANs. Enforces proportional column distribution (`colWidths={["35%", "21%", "22%", "22%"]}`, `minWidth="min-w-[500px]"`, `w-full overflow-x-auto`):
     - **Column 1 (`PAN Holder Name`)**: Expanded responsive truncation (`max-w-[170px] sm:max-w-[210px] xl:max-w-[240px]`) with full-name hover tooltip (`title`), eliminating premature truncation for corporate entities.
     - **Column 2 (`Client PAN`)**: Monospace interactive button with UserCircle icon, triggering the Client 360° Demographics drawer on click.
     - **Column 3 (`LTP Push (+₹)` / `LTP Pull (-₹)`)**: Streamlined header preventing header bloat while retaining complete SEBI price-pusher/suppressor definitions in interactive `InfoTooltip`.
     - **Column 4 (`Contribution %`)**: Compact visual progress bar with tabular-num percentage share (`+X.XX%` / `-X.XX%`), protected from border clipping.
2. **Volume Share Dominance ("Cornering" Metric)**:
   - Identifies entities controlling a disproportionate percentage of total exchange turnover:
     $$\text{Volume Share \%} = \frac{\sum_{15\text{D}} (\text{Buy Volume}_i + \text{Sell Volume}_i)}{\max\left(1.0, 2 \times \sum_{15\text{D}} \text{Total Exchange Volume}\right)} \times 100$$
   - **Gross Trade Legs Denominator**: The denominator represents $2 \times \text{Total Exchange Volume}$ because each executed trade on the exchange comprises two distinct legs (one buyer leg and one seller leg). Normalizing by total market legs ensures an accurate measure of market dominance without exceeding 100%.
3. **Counterparty Pair Concentration ("Collusion" Metric)**:
   - Evaluates bilateral matched turnover ($PAN_A \leftrightarrow PAN_B$) from `counterparty_trade_pairs` to uncover synchronized trading partnerships. The UI renders matched legal entity names (`n1 ⇄ n2`), PAN badges (`p1 ⇄ p2`), matched volume, and volume share %.
   - **Pairwise LTP Push Status**: The underlying schema stores both `pairwise_ltp_push_value` (Logic 1) and `pairwise_ltp_push_value_logic_2` (Logic 2) for complete upstream provenance. However, both metrics are intentionally **ignored** in the active triage scoring engine and UI display tables to prioritize empirical matched volume and volume share %, avoiding statistical artifacts from thin liquidity.
4. **Trade Reversal Ratio (RTR / "Synchronized Reversal" Metric)**:
   - Measures shares passed back and forth between two accounts without genuine beneficial ownership transfer:
     $$\text{RTR} = \left[ \frac{2 \times \min(V_{A \to B}, V_{B \to A})}{V_{A \to B} + V_{B \to A}} \right] \times 100$$
   - Exported in the institutional Excel dossier (`Participant_Surveillance` worksheet).
5. **Circular Trading Loops ("Cycle Detection" Algorithm)**:
   - Employs a directed graph Depth-First Search (DFS) algorithm detecting closed loops of length 3 to 5 ($A \to B \to C \to A$) with canonical rotation deduplication and rotated bottleneck volume calculation:
     $$V_{\text{bottleneck}} = \min(e_1, e_2, \dots, e_k)$$
   - Analyzed by backend algorithms and exported in the Excel dossier.
6. **Realized P&L — Top Trading Beneficiaries ("Profit Extraction" Metric)**:
   - **Active Production Logic (Clean Closed-Trade Realization)**:
     To eliminate false positives on genuine retail long-term investors (who buy and hold without selling), the engine strictly requires round-trip trading activity ($\text{Buy Volume} > 0 \land \text{Sell Volume} > 0$):
     $$\text{Matched Vol} = \min(\text{Buy Qty}, \text{Sell Qty})$$
     $$\text{Realized PnL} = \text{Matched Vol} \times \left( \frac{\text{Sell Value}}{\text{Sell Qty}} - \frac{\text{Buy Value}}{\text{Buy Qty}} \right)$$
     Ranked descending to identify participants who successfully extracted cash profits during the surveillance window. Displayed in Row 3 of the Participants tab with macro-scale badges (`+₹X.XX Cr` / `+₹X.XX L`).
   - **Future Scope / Surveillance Roadmap (Position Accumulator Intelligence)**:
     Dedicated subsystem to track unclosed open positions ($\text{Sell Volume} = 0$) held by syndicate accumulators prior to the dump phase. Will incorporate float concentration filters ($> 5\%$ of total window volume) and a dedicated "Accumulators" toggle to prevent conflating genuine retail long-term holders with manipulative accumulators.
7. **Same-Broker Wash Trade Identification**:
   - Flags internal broker crossing when the buying and selling Trading Member tokens match (`buyer_tm_id == seller_tm_id`).
8. **Client 360° Identity Resolution & Demat Intelligence**:
   - Cross-references exchange client PANs against `client_identity_master` (legal entity name, UCC, entity type, registration date, risk grade) and depository records in `client_demat_accounts` (depository ID, DP account number, joint holders, active Power of Attorney status, and masked bank accounts).
   - **Dynamic Trading Member Resolution**: Dynamically resolves the Trading Member ID (`tm_id`) in `ClientService.get_client_by_pan()` by querying `ParticipantDailyTrade.trading_member_id` where `client_pan == clean_pan` and `trading_member_id.isnot(None)`.
   - Fully interactive in the Next.js frontend via an institutional slide-over drawer triggered by clicking any client PAN across all forensic tables.

---

## 7. Complete 15-Table Database Schema & Physical Data Dictionary

The physical regulatory data warehouse comprises **15 standardized relational tables (158 columns total)** organized across 8 functional surveillance modules:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 15-TABLE DATA WAREHOUSE                                  │
├──────────────────────────┬───────────────────────────┬──────┬────────────────────────────┤
│ Module                   │ Table Name                │ Cols │ Key Surveillance Role      │
├──────────────────────────┼───────────────────────────┼──────┼────────────────────────────┤
│ 1. Client KYC & Demat    │ client_identity_master    │  7   │ Legal entity KYC & UCC     │
│                          │ client_demat_accounts     │  9   │ Depository BO accounts, DP │
├──────────────────────────┼───────────────────────────┼──────┼────────────────────────────┤
│ 2. Scrip Master & Prices │ daily_market_eod          │ 20   │ Consolidated OHLCV, bands  │
│                          │ market_baseline_stats     │  9   │ 180D mean, vol, std dev    │
├──────────────────────────┼───────────────────────────┼──────┼────────────────────────────┤
│ 3. Participant Conduct   │ participant_daily_trades  │ 17   │ Client trades, LTP impact  │
├──────────────────────────┼───────────────────────────┼──────┼────────────────────────────┤
│ 4. Counterparty Network  │ counterparty_trade_pairs  │ 16   │ Matched pairs, wash trades │
├──────────────────────────┼───────────────────────────┼──────┼────────────────────────────┤
│ 5. Shareholder Stats     │ shareholding_summary      │ 11   │ Quarterly float, promoter %│
│                          │ large_shareholders_registry│ 9   │ Granular promoter & ≥1%    │
├──────────────────────────┼───────────────────────────┼──────┼────────────────────────────┤
│ 6. Corporate Actions     │ corporate_events_feed     │ 10   │ Bonuses, splits, dividends │
│                          │ price_dilution_factors    │  5   │ Historical price dilution  │
├──────────────────────────┼───────────────────────────┼──────┼────────────────────────────┤
│ 7. Trading Calendar      │ trading_session_calendar  │  4   │ Active sessions & holidays │
│                          │ broker_daily_summary      │  9   │ Broker member daily totals │
├──────────────────────────┼───────────────────────────┼──────┼────────────────────────────┤
│ 8. Scoring & Audit       │ surveillance_alert_cases  │ 14   │ Alert scores, watchlist    │
│                          │ portal_user_accounts      │ 10   │ Officer auth, RBAC roles   │
│                          │ compliance_audit_logs     │  8   │ Immutable regulatory audit │
├──────────────────────────┴───────────────────────────┴──────┴────────────────────────────┤
│ Total Columns across 15 Normalized Tables: 158 Columns                                   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Master Table Inventory & Module Alignment (15 Tables, 158 Columns)

#### Module 1: Client KYC & Demat Account Registry
- **`client_identity_master` (7 cols)**: Primary Key `client_pan`. Contains legal entity PAN, legal name, entity type (`INDIVIDUAL`, `CORPORATE`, `PROMOTER`, `FPI`), account status, city, registration date, and risk grade.
- **`client_demat_accounts` (9 cols)**: Primary Key `account_id`, Foreign Key `client_pan -> client_identity_master(client_pan)`. Contains depository ID (NSDL/CDSL), beneficiary owner account number, opening date, joint holders (`joint_holder_pan_2`, `joint_holder_pan_3`), active POA flag, and masked bank account.

#### Module 2: Scrip Master & Daily Market Prices
- **`daily_market_eod` (20 cols)**: Primary Key `record_id`, Natural Key `(symbol, trade_date)`. Contains symbol, trade date, ISIN, company name, OHLC prices, total traded quantity, total traded value, upper/lower circuit limits, delivery quantity, previous close, 52-week high/low, and 180-day baseline figures.
- **`market_baseline_stats` (9 cols)**: Primary Key `stat_id`, Natural Key `(symbol, trade_date)`. Contains 180-day base price, baseline volume mean, baseline volume standard deviation, 180-day return mean, 180-day return standard deviation, and rolling peak high.

#### Module 3: Participant Level Metrics — Identifying Suspects
- **`participant_daily_trades` (17 cols)**: Primary Key `trade_summary_id`, Foreign Key `client_pan -> client_identity_master(client_pan)`. Contains symbol, trade date, client PAN, client legal name, trading member ID, buy/sell quantities, buy/sell turnover values, gross positive LTP value, gross negative LTP value, same-broker wash quantity, trade counts, aggressor buy quantity, and client category.

#### Module 4: Counterparty Concentration & Matched Pairs
- **`counterparty_trade_pairs` (16 cols)**: Primary Key `pair_match_id`. Contains symbol, trade date, buyer PAN, buyer legal name, seller PAN, seller legal name, buyer TM ID, seller TM ID, matched quantity, matched turnover value, pairwise LTP push value (Logic 1), pairwise LTP push value (Logic 2), reverse matched quantity, same-broker wash flag, and algo execution flag. *Note*: Both Logic 1 and Logic 2 push values are preserved for upstream compliance provenance, but ignored in active engine triage scoring to ground surveillance on genuine traded volume and market share %.

#### Module 5: Shareholder Statistics & Large Holdings
- **`shareholding_summary` (11 cols)**: Primary Key `filing_id`. Contains symbol, quarter code (`Q127`, `Q426`), filing date, category type (`PROMOTER_GROUP`, `TOP_1_PCT_PUBLIC`, `GENERAL_PUBLIC_FLOAT`), total shares count, holding percentage, pledged shares percentage, locked-in percentage, unique holding PANs, and average daily trading PANs.
- **`large_shareholders_registry` (9 cols)**: Primary Key `record_id`. Contains symbol, quarter code, holder PAN, holder legal name, holder category (`PROMOTER`, `INSTITUTIONAL_DII`, `INSTITUTIONAL_FPI`, `PUBLIC_INDIVIDUAL`), shares held, holding percentage, and pledged shares count.

#### Module 6: Corporate Announcements & Price Adjustments
- **`corporate_events_feed` (10 cols)**: Primary Key `event_id`. Contains symbol, ISIN, action category (`BONUS`, `SPLIT`, `DIVIDEND`, `RIGHTS`, `BOARD_MEETING`), announcement purpose, announcement date, ex-date, record date, ratio/value description, and dilution factor.
- **`price_dilution_factors` (5 cols)**: Primary Key `factor_id`. Contains symbol, split multiplier, valid from date, and valid through date for baseline price normalization.

#### Module 7: Market Trading Calendar & Broker Totals
- **`trading_session_calendar` (4 cols)**: Primary Key `calendar_date`. Contains calendar date, trading day flag, holiday name, and special auction flag.
- **`broker_daily_summary` (9 cols)**: Primary Key `broker_summary_id`. Contains trading member ID, trading member name, symbol, trade date, total buy volume, total sell volume, same-broker wash volume, and total turnover value.

#### Module 8: Scrip Scoring, Alert Watchlist & Audit Trail
- **`surveillance_alert_cases` (14 cols)**: Primary Key `case_reference_id`, Natural Key `(symbol, observation_date)`. Contains symbol, observation date, composite risk score, alert severity level (`HIGH`, `MEDIUM`, `LOW`), surveillance status (`UNDER_INVESTIGATION`, `MONITORED`, `SAFE_FLAGGED`), 5 individual metrics, assigned officer, investigation notes, and last updated timestamp.
- **`portal_user_accounts` (10 cols)**: Primary Key `user_id`, Unique `username`, Unique `email`. Contains username, email, full name, department, PBKDF2 password hash, assigned role (`Admin`, `Analyst`, `Viewer`), account active flag, created timestamp, and last login timestamp.
- **`compliance_audit_logs` (8 cols)**: Primary Key `log_id`. Contains log timestamp, username, role, action code (`MARK_SAFE`, `RECALIBRATE_MODEL`, `EXPORT_REPORT`), target entity, action narrative, and client IP address.

### 7.2 Detailed Physical Table Specifications (All 15 Relational Tables)

The authoritative SQL DDL definitions for all 15 tables, indexes, and constraints as defined in `backend/db/schema.sql` and `surveillance_schema.sql`:

```sql
-- ======================================================================================
-- MODULE 1: Client KYC & Demat Account Registry
-- ======================================================================================

-- Table 1.1: client_identity_master (7 columns)
CREATE TABLE client_identity_master (
    client_pan              VARCHAR(10)     NOT NULL PRIMARY KEY,
    client_legal_name       VARCHAR(250)    NOT NULL,
    entity_type             VARCHAR(30)     NOT NULL, -- 'INDIVIDUAL', 'CORPORATE', 'HUF', 'PROMOTER', 'FPI'
    account_state           VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED', 'DORMANT', 'CLOSED'
    residential_city        VARCHAR(100),
    registration_date       DATE            NOT NULL,
    risk_profile_grade      VARCHAR(10)     DEFAULT 'STANDARD' -- 'LOW', 'STANDARD', 'WATCHLIST', 'HIGH_RISK'
);

-- Table 1.2: client_demat_accounts (9 columns)
CREATE TABLE client_demat_accounts (
    account_id              INTEGER         PRIMARY KEY AUTOINCREMENT,
    client_pan              VARCHAR(10)     NOT NULL,
    depository_id           VARCHAR(16)     NOT NULL, -- NSDL / CDSL DP Registration Code
    beneficiary_acc_no      VARCHAR(20)     NOT NULL UNIQUE,
    account_open_date       DATE            NOT NULL,
    joint_holder_pan_2      VARCHAR(10),              -- Second Joint Account Holder (Connected entity)
    joint_holder_pan_3      VARCHAR(10),              -- Third Joint Account Holder
    is_poa_active           BOOLEAN         NOT NULL DEFAULT FALSE,
    bank_account_masked     VARCHAR(20),
    FOREIGN KEY (client_pan) REFERENCES client_identity_master (client_pan)
);
CREATE INDEX idx_demat_pan ON client_demat_accounts (client_pan);
CREATE INDEX idx_demat_joint2 ON client_demat_accounts (joint_holder_pan_2);

-- ======================================================================================
-- MODULE 2: Scrip Master & Daily Market Prices
-- ======================================================================================

-- Table 2.1: daily_market_eod (20 columns)
CREATE TABLE daily_market_eod (
    record_id               INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                  VARCHAR(20)     NOT NULL,
    trade_date              DATE            NOT NULL,
    isin                    CHAR(12)        NOT NULL,
    company_name            VARCHAR(200)    NOT NULL DEFAULT '', -- Registered corporate entity name
    open_price              DECIMAL(15, 2)  NOT NULL,
    day_high_price          DECIMAL(15, 2)  NOT NULL,
    day_low_price           DECIMAL(15, 2)  NOT NULL,
    close_price             DECIMAL(15, 2)  NOT NULL, -- Official 30-min VWAP consolidated close
    total_traded_quantity   BIGINT          NOT NULL, -- Combined volume (NSE + BSE)
    total_traded_value      DECIMAL(20, 2)  NOT NULL, -- Combined traded value (NSE + BSE)
    upper_circuit_limit     DECIMAL(15, 2)  NOT NULL, -- Statutory daily upper price band
    lower_circuit_limit     DECIMAL(15, 2),           -- Statutory daily lower price band
    delivery_quantity       BIGINT,                   -- Delivery quantity for Screener Delivery %
    prev_close_price        DECIMAL(15, 2),           -- Previous day consolidated close price
    week_52_high_price      DECIMAL(15, 2),           -- Rolling 52-week highest traded price
    week_52_low_price       DECIMAL(15, 2),           -- Rolling 52-week lowest traded price
    base_price_180d         DECIMAL(15, 2),           -- [Inline baseline] T-180 closing price adjusted for splits
    baseline_volume_mean    DECIMAL(18, 2),           -- [Inline baseline] 180-day baseline mean daily volume
    baseline_volume_std     DECIMAL(18, 2),           -- [Inline baseline] 180-day baseline volume std
    CONSTRAINT uk_market_symbol_date UNIQUE (symbol, trade_date)
);
CREATE INDEX idx_market_sym_date ON daily_market_eod (symbol, trade_date);
CREATE INDEX idx_market_date ON daily_market_eod (trade_date);

-- Table 2.2: market_baseline_stats (9 columns)
CREATE TABLE market_baseline_stats (
    stat_id                 INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                  VARCHAR(20)     NOT NULL,
    trade_date              DATE            NOT NULL,
    base_price_180d         DECIMAL(15, 2)  NOT NULL, -- Closing price at T-180 (adjusted for splits)
    baseline_volume_mean    DECIMAL(18, 2)  NOT NULL, -- 180-day baseline mean daily volume (mu_V)
    baseline_volume_std     DECIMAL(18, 2)  NOT NULL, -- 180-day baseline volume standard deviation (sigma_V)
    return_mean_180d        DECIMAL(12, 6)  DEFAULT 0.0, -- 180-day baseline mean daily return (mu_R)
    return_std_180d         DECIMAL(12, 6)  DEFAULT 0.02, -- 180-day baseline return standard deviation (sigma_R)
    peak_high_180d          DECIMAL(15, 2),           -- 180-day rolling highest price peak
    FOREIGN KEY (symbol, trade_date) REFERENCES daily_market_eod (symbol, trade_date)
);
CREATE INDEX idx_baseline_sym_date ON market_baseline_stats (symbol, trade_date);

-- ======================================================================================
-- MODULE 3: Participant Level Metrics — Identifying Suspects
-- ======================================================================================

-- Table 3.1: participant_daily_trades (17 columns)
CREATE TABLE participant_daily_trades (
    trade_summary_id          INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    trade_date                DATE            NOT NULL,
    client_pan                VARCHAR(10)     NOT NULL,
    client_legal_name         VARCHAR(250),             -- Registered legal name from KYC records
    trading_member_id         VARCHAR(20),              -- Trading Member / Broker ID
    buy_quantity              BIGINT          NOT NULL DEFAULT 0,
    sell_quantity             BIGINT          NOT NULL DEFAULT 0,
    buy_turnover_value        DECIMAL(20, 2)  NOT NULL DEFAULT 0.00,
    sell_turnover_value       DECIMAL(20, 2)  NOT NULL DEFAULT 0.00,
    gross_positive_ltp_value  DECIMAL(20, 2)  NOT NULL DEFAULT 0.00, -- Buy orders lifting ask (+₹ price push)
    gross_negative_ltp_value  DECIMAL(20, 2)  NOT NULL DEFAULT 0.00, -- Sell orders hitting bid (-₹ price pull)
    same_broker_wash_quantity BIGINT          DEFAULT 0,             -- Quantity matched within same broker/account
    buy_trade_count           BIGINT          DEFAULT 0,             -- Number of executed buy trades
    sell_trade_count          BIGINT          DEFAULT 0,             -- Number of executed sell trades
    aggressor_buy_quantity    BIGINT          DEFAULT 0,             -- Buy volume executing as aggressive taker
    client_category           VARCHAR(30)     DEFAULT 'INDIVIDUAL',  -- 'INDIVIDUAL', 'CORPORATE', 'PROMOTER', 'HNI', 'FPI'
    CONSTRAINT uk_participant_sym_date_pan UNIQUE (symbol, trade_date, client_pan),
    FOREIGN KEY (client_pan) REFERENCES client_identity_master (client_pan)
);
CREATE INDEX idx_part_sym_date ON participant_daily_trades (symbol, trade_date);
CREATE INDEX idx_part_pan ON participant_daily_trades (client_pan);

-- ======================================================================================
-- MODULE 4: Counterparty Concentration & Matched Pairs
-- ======================================================================================

-- Table 4.1: counterparty_trade_pairs (16 columns)
CREATE TABLE counterparty_trade_pairs (
    pair_match_id             INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    trade_date                DATE            NOT NULL,
    buyer_pan                 VARCHAR(10)     NOT NULL,
    buyer_legal_name          VARCHAR(250),             -- Buyer legal entity name from KYC records
    seller_pan                VARCHAR(10)     NOT NULL,
    seller_legal_name         VARCHAR(250),             -- Seller legal entity name from KYC records
    buyer_tm_id               VARCHAR(20),
    seller_tm_id              VARCHAR(20),
    matched_quantity          BIGINT          NOT NULL,
    matched_turnover_value    DECIMAL(20, 2)  NOT NULL,
    pairwise_ltp_push_value   DECIMAL(15, 2)  DEFAULT 0.00, -- Upward price push contributed by trades between pair (Logic 1)
    pairwise_ltp_push_value_logic_2 DECIMAL(15, 2) DEFAULT 0.00, -- Alternative price push methodology incorporating weighted aggressor volumes (Logic 2)
    reverse_matched_quantity  BIGINT          DEFAULT 0,             -- Volume traded Seller -> Buyer (for RTR)
    is_same_broker_wash       BOOLEAN         NOT NULL DEFAULT FALSE, -- TRUE if buyer_tm_id == seller_tm_id
    algo_execution_flag       SMALLINT        DEFAULT 0,             -- 0=Manual, 1=Algo/HFT, 2=DMA
    FOREIGN KEY (buyer_pan) REFERENCES client_identity_master (client_pan),
    FOREIGN KEY (seller_pan) REFERENCES client_identity_master (client_pan)
);
CREATE INDEX idx_cpty_sym_date ON counterparty_trade_pairs (symbol, trade_date);
CREATE INDEX idx_cpty_buyer ON counterparty_trade_pairs (buyer_pan);
CREATE INDEX idx_cpty_seller ON counterparty_trade_pairs (seller_pan);

-- ======================================================================================
-- MODULE 5: Shareholder Statistics & Large Holdings
-- ======================================================================================

-- Table 5.1: shareholding_summary (11 columns)
CREATE TABLE shareholding_summary (
    filing_id                 INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    quarter_code              VARCHAR(10)     NOT NULL, -- 'Q126', 'Q226', 'Q326', 'Q426'
    filing_date               DATE            NOT NULL,
    category_type             VARCHAR(40)     NOT NULL, -- 'PROMOTER_GROUP', 'TOP_1_PCT_PUBLIC', 'GENERAL_PUBLIC_FLOAT'
    total_shares_count        BIGINT          NOT NULL,
    holding_percentage        DECIMAL(6, 2)   NOT NULL,
    pledged_shares_percentage DECIMAL(6, 2)   DEFAULT 0.00,
    locked_in_shares_percentage DECIMAL(6, 2) DEFAULT 0.00, -- Pre-IPO or Promoter statutory lock-in
    unique_holding_pans       INTEGER,
    avg_daily_trading_pans    INTEGER         DEFAULT 0, -- Average unique trading PAN count per day
    CONSTRAINT uk_shldng_sym_qtr_cat UNIQUE (symbol, quarter_code, category_type)
);
CREATE INDEX idx_shldng_sym_date ON shareholding_summary (symbol, filing_date);

-- Table 5.2: large_shareholders_registry (9 columns)
CREATE TABLE large_shareholders_registry (
    record_id                 INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    quarter_code              VARCHAR(10)     NOT NULL,
    holder_pan                VARCHAR(10)     NOT NULL,
    holder_legal_name         VARCHAR(250)    NOT NULL,
    holder_category           VARCHAR(30)     NOT NULL, -- 'PROMOTER', 'INSTITUTIONAL_DII', 'INSTITUTIONAL_FPI', 'PUBLIC_INDIVIDUAL'
    shares_held               BIGINT          NOT NULL,
    holding_percentage        DECIMAL(6, 2)   NOT NULL,
    pledged_shares_count      BIGINT          DEFAULT 0,
    FOREIGN KEY (holder_pan) REFERENCES client_identity_master (client_pan)
);
CREATE INDEX idx_large_shldr_sym_qtr ON large_shareholders_registry (symbol, quarter_code);

-- ======================================================================================
-- MODULE 6: Corporate Announcements & Price Adjustments
-- ======================================================================================

-- Table 6.1: corporate_events_feed (10 columns)
CREATE TABLE corporate_events_feed (
    event_id                  INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    isin                      CHAR(12)        NOT NULL,
    action_category           VARCHAR(40)     NOT NULL, -- 'BONUS', 'SPLIT', 'DIVIDEND', 'RIGHTS', 'BOARD_MEETING', 'AGM'
    announcement_purpose      VARCHAR(500)    NOT NULL,
    announcement_date         DATE            NOT NULL,
    ex_date                   DATE,
    record_date               DATE,
    ratio_or_value            VARCHAR(50),              -- Execution ratio or dividend amount (e.g. '1:1', 'INR 4.50/sh')
    dilution_factor           DECIMAL(8, 6)   DEFAULT 1.000000 -- Price adjustment multiplier (e.g. 0.500000 for 1:1 bonus)
);
CREATE INDEX idx_corp_sym_date ON corporate_events_feed (symbol, announcement_date);

-- Table 6.2: price_dilution_factors (5 columns)
CREATE TABLE price_dilution_factors (
    factor_id                 INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    split_multiplier          DECIMAL(10, 6)  NOT NULL, -- e.g., 0.50 for 1:1 bonus, 0.10 for 10:1 split
    valid_from_date           DATE            NOT NULL,
    valid_thru_date           DATE            NOT NULL DEFAULT '9999-12-31'
);
CREATE INDEX idx_dilution_sym ON price_dilution_factors (symbol, valid_from_date);

-- ======================================================================================
-- MODULE 7: Market Trading Calendar & Broker Totals
-- ======================================================================================

-- Table 7.1: trading_session_calendar (4 columns)
CREATE TABLE trading_session_calendar (
    calendar_date             DATE            PRIMARY KEY,
    is_trading_day            BOOLEAN         NOT NULL, -- TRUE if markets open; FALSE if holiday/weekend
    holiday_name              VARCHAR(100),
    is_special_auction        BOOLEAN         NOT NULL DEFAULT FALSE -- e.g., Diwali Muhurat Trading
);

-- Table 7.2: broker_daily_summary (9 columns)
CREATE TABLE broker_daily_summary (
    broker_summary_id         INTEGER         PRIMARY KEY AUTOINCREMENT,
    trading_member_id         VARCHAR(20)     NOT NULL,
    trading_member_name       VARCHAR(250)    NOT NULL,
    symbol                    VARCHAR(20)     NOT NULL,
    trade_date                DATE            NOT NULL,
    total_buy_volume          BIGINT          NOT NULL DEFAULT 0,
    total_sell_volume         BIGINT          NOT NULL DEFAULT 0,
    same_broker_wash_volume   BIGINT          NOT NULL DEFAULT 0,
    total_turnover_value      DECIMAL(20, 2)  NOT NULL DEFAULT 0.00,
    CONSTRAINT uk_broker_sym_date UNIQUE (trading_member_id, symbol, trade_date)
);

-- ======================================================================================
-- MODULE 8: Scrip Scoring, Alert Watchlist & Audit Trail
-- ======================================================================================

-- Table 8.1: surveillance_alert_cases (14 columns)
CREATE TABLE surveillance_alert_cases (
    case_reference_id         INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    observation_date          DATE            NOT NULL,
    composite_risk_score      DECIMAL(5, 2)   NOT NULL, -- Score between 0.00 and 100.00
    alert_severity_level      VARCHAR(15)     NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH'
    surveillance_status       VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SAFE', 'ESCALATED', 'CLOSED'
    metric_price_rise_pct     DECIMAL(8, 2)   NOT NULL,
    metric_price_zscore       DECIMAL(6, 2)   NOT NULL,
    metric_volume_zscore      DECIMAL(6, 2)   NOT NULL,
    metric_band_hit_days      INTEGER         NOT NULL,
    metric_new_high_days      INTEGER         NOT NULL,
    assigned_officer          VARCHAR(50),
    investigation_notes       TEXT,
    last_updated_time         TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_alert_sym_date UNIQUE (symbol, observation_date)
);

-- Table 8.2: portal_user_accounts (10 columns)
CREATE TABLE portal_user_accounts (
    user_id                   INTEGER         PRIMARY KEY AUTOINCREMENT,
    username                  VARCHAR(50)     NOT NULL UNIQUE,
    email                     VARCHAR(100)    NOT NULL UNIQUE,
    full_name                 VARCHAR(100)    NOT NULL DEFAULT '',
    department                VARCHAR(100)    NOT NULL DEFAULT 'Market Conduct',
    password_hash             VARCHAR(255)    NOT NULL,
    assigned_role             VARCHAR(20)     NOT NULL DEFAULT 'Viewer', -- 'Admin', 'Analyst', 'Viewer'
    is_account_active         BOOLEAN         NOT NULL DEFAULT TRUE,
    created_timestamp         TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    last_login_at             TIMESTAMP
);
CREATE UNIQUE INDEX idx_portal_username ON portal_user_accounts (username);

-- Table 8.3: compliance_audit_logs (8 columns)
CREATE TABLE compliance_audit_logs (
    log_id                    INTEGER         PRIMARY KEY AUTOINCREMENT,
    log_timestamp             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    username                  VARCHAR(50)     NOT NULL,
    role                      VARCHAR(20)     NOT NULL DEFAULT 'Analyst',
    action_code               VARCHAR(100)    NOT NULL, -- 'MARK_SAFE', 'RECALIBRATE_MODEL', 'EXPORT_REPORT'
    target_entity             VARCHAR(50),              -- e.g. Stock symbol or Config key
    action_narrative          TEXT            NOT NULL,
    client_ip_address         VARCHAR(45)
);
CREATE INDEX idx_audit_log_timestamp ON compliance_audit_logs (log_timestamp);
CREATE INDEX idx_audit_log_username ON compliance_audit_logs (username);
CREATE INDEX idx_audit_log_action ON compliance_audit_logs (action_code);
```

### 7.3 Analytical Surveillance Views (3 Production SQL Views)

The database schema defines 3 pre-aggregated SQL views that serve as high-performance reporting projections:

```sql
-- View 1: v_daily_surveillance_summary
-- Joins daily_market_eod with baseline metrics to compute daily returns, price changes, and circuit flags
CREATE VIEW v_daily_surveillance_summary AS
SELECT 
    d.symbol,
    d.trade_date,
    d.close_price,
    d.prev_close_price,
    ROUND(((d.close_price - COALESCE(d.prev_close_price, d.close_price)) / NULLIF(d.prev_close_price, 0)) * 100.0, 2) AS price_change_pct,
    d.total_traded_quantity,
    d.total_traded_value,
    d.upper_circuit_limit,
    d.lower_circuit_limit,
    CASE WHEN d.close_price >= d.upper_circuit_limit THEN 1 ELSE 0 END AS is_upper_circuit_hit,
    d.baseline_volume_mean,
    d.baseline_volume_std
FROM daily_market_eod d;

-- View 2: v_participant_conduct_ranking
-- Aggregates participant trades to compute net LTP impact (+₹ lifting ask minus -₹ hitting bid)
CREATE VIEW v_participant_conduct_ranking AS
SELECT 
    p.symbol,
    p.trade_date,
    p.client_pan,
    p.client_legal_name,
    p.trading_member_id,
    p.buy_quantity,
    p.sell_quantity,
    p.buy_turnover_value,
    p.sell_turnover_value,
    p.gross_positive_ltp_value,
    p.gross_negative_ltp_value,
    (p.gross_positive_ltp_value - p.gross_negative_ltp_value) AS net_ltp_impact,
    p.same_broker_wash_quantity,
    p.client_category
FROM participant_daily_trades p;

-- View 3: v_counterparty_concentration
-- Exposes buyer-seller pairings with turnover, pairwise price push, and wash flags
CREATE VIEW v_counterparty_concentration AS
SELECT 
    c.symbol,
    c.trade_date,
    c.buyer_pan,
    c.buyer_legal_name,
    c.seller_pan,
    c.seller_legal_name,
    c.buyer_tm_id,
    c.seller_tm_id,
    c.matched_quantity,
    c.matched_turnover_value,
    c.pairwise_ltp_push_value,
    c.is_same_broker_wash,
    c.algo_execution_flag
FROM counterparty_trade_pairs c;
```

---

## 8. End-to-End System Data Lineage

```
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 0. UPSTREAM CANONICAL EXCEL FEEDS (399,572 Cumulative Production Records)              │
 │    - result_part1.xlsx & result_part2.xlsx (333,974 Market EOD Rows across 2,191 scrips)│
 │    - client_data.xlsx (58,898 Participant Execution Records across 3 Scrips)           │
 │    - PAN_PAIR_GUJRAFFIA.xlsx (2,713 Pairs) & PAN_PAIR_SKMEGGPROD.xlsx (3,987 Pairs)    │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ High-Performance Python Ingestion Pipelines
 ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
 │ 1. INGESTION PIPELINES & 15-TABLE REGULATORY WAREHOUSE (854,061+ Genuine Records)      │
 │    - scripts/ingest_market_eod.py -> daily_market_eod & market_baseline_stats (667,948)│
 │    - scripts/ingest_client_data.py -> participant_daily_trades, KYC & Demat (177,682) │
 │    - scripts/ingest_pan_pairs.py -> counterparty_trade_pairs (6,700 records, 16 cols)  │
 │    - trading_session_calendar (426 sessions) & compliance_audit_logs (1,304+ records)  │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ SQLAlchemy 2.0 Pool (or SQLite Local DB)
 ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
 │ 2. FASTAPI SURVEILLANCE ENGINE SERVICE LAYER                                            │
 │    - surveillance_service.py: Evaluates 5 scoring metrics, baselines, and major holders│
 │    - excel_exporter.py: Generates multi-sheet institutional Excel workbook (.xlsx)     │
 │    - trade_matches_service.py: Reconstructs execution records and wash metrics          │
 │    - client_service.py: Cross-references exchange tokens to demat accounts for 360°    │
 │    - market_calendar_service.py: Validates trading sessions against calendar table    │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ JSON REST Endpoints (/api/v1/*) + Binary Streaming
 ┌───────────────────────────────────────────▼────────────────────────────────────────────┐
 │ 3. NEXT.JS CENTRALIZED API CLIENT (`lib/api.ts`)                                       │
 │    - Injects Authorization Bearer token via `fetchWithAuth` (concurrency-safe lock)    │
 │    - Coordinates `downloadScripExcel` binary streams & Auto-Print PDF triggers         │
 │    - Auto-refreshes expired sessions and handles network fallbacks                     │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
Dashboard (Route: `/`)             Forensic Workspace                    Audit Trail (Route: `/history`)
- Watchlist Table & Clean URLs     (Route: `/analysis/[symbol]`)         - Immutable compliance_audit_logs
- Two-Tier Surveillance Toolbar    - 4-Tab Forensic Investigation        - Action Filter & CSV Export
- Alphabet Segmented Allotment     - Client 360° Demographics Drawer     - Search Pre-fill Integration
- Sticky Scrip Column & Triggers   - Major Shareholders Table (≥5% flag) - Full Operational History
- 4 Subtle Pastel Risk KPI Cards   - Enhanced Macro P&L (`Cr`/`L`)       - Live User Event Logging
```

> [!NOTE]
> **Dynamic Surveillance Watchlist (19 Alerts) vs Historical Cases (13 Records)**:
> In production operations, the dashboard watchlist (`GET /api/v1/surveillance/watchlist?date=2025-11-03`) dynamically evaluates all 2,117 listed scrips meeting the minimum session criterion ($\ge 30$ trading days) against active calibrated weights ($20\%$ each) and threshold ($60.0$). This live vector evaluation identifies **19 active alert scrips** on `2025-11-03` (`BINANIIND`, `HYBRIDFIN`, `INFOMEDIA`, `LOTUSEYE`, `SKMEGGPROD`, `STALLION`, `GUJRAFFIA`, `KAUSHALYA`, `RELIABLE`, `BHAGYANGR`, `ORTINGLOBE`, `TDPOWERSYS`, `ATLANTAA`, `IZMO`, `MASKINVEST`, `NACLIND`, `OCCL`, `SOMATEX`, `VIJIFIN`). In contrast, the physical database table `surveillance_alert_cases` contains **13 pre-populated historical triage case dossiers** preserved for static baseline testing and retrospective review.

### 8.1 Offline Data Storage & External Backup Manifest (What to Keep / Download)

Because confidential exchange market data and proprietary participant executions cannot be committed to public/remote Git repositories, `.gitignore` excludes all `.db` databases and large raw `.xlsx` data files.

When backing up the system externally (e.g. Google Drive, AWS S3, local encrypted drive) or setting up the platform on another computer:

| Priority | File Name | Size | Target Location in Project | Role & Importance |
| :---: | :--- | :---: | :--- | :--- |
| 🔴 **ESSENTIAL** | **`surveillance.db`** | **145 MB** | `backend/db/surveillance.db` | **Unified Relational Production Database**.<br/>Contains all **854,061+ physical records** across all 15 normalized tables (OHLCV, 180D baselines, KYC, demat accounts, participant trades, counterparty pairs).<br/>**If you preserve this single file, the entire platform runs immediately with 100% full data without needing any ingestion steps.** |
| 🟡 **RAW FEED** | **`result_part1.xlsx`** | 19.1 MB | Project Root (`/`) | `scripts/ingest_market_eod.py` (EOD Market Part 1: 176k rows) |
| 🟡 **RAW FEED** | **`result_part2.xlsx`** | 17.2 MB | Project Root (`/`) | `scripts/ingest_market_eod.py` (EOD Market Part 2: 158k rows) |
| 🟡 **RAW FEED** | **`client_data.xlsx`** | 4.3 MB | Project Root (`/`) | `scripts/ingest_client_data.py` (Participant trades & KYC: 58k rows) |
| 🟡 **RAW FEED** | **`PAN_PAIR_GUJRAFFIA.xlsx`** | 222 KB | Project Root (`/`) | `scripts/ingest_pan_pairs.py` (Bilateral matched pairs: 2,713 rows) |
| 🟡 **RAW FEED** | **`PAN_PAIR_SKMEGGPROD.xlsx`**| 325 KB | Project Root (`/`) | `scripts/ingest_pan_pairs.py` (Bilateral matched pairs: 3,987 rows) |
| 🟢 **DELIVERABLE** | `PVASF_Production_Full_Data.xlsx` | 984 KB | Project Root (`/`) | Institutional master Excel dataset export workbook |
| 🟢 **DELIVERABLE** | `PVASF_Sample_Data_Package.zip` | 1.3 MB | Project Root (`/`) | Standalone regulatory sample package with all CSV feeds |
| 🟢 **BACKUP DB** | `archive/database_backups/my_database.db` | 2.2 MB | `archive/database_backups/` | Historical development database snapshot |

> [!TIP]
> **Portability Rule**: To run on any new PC, you only need to copy [`backend/db/surveillance.db`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/surveillance.db) (145 MB) into `backend/db/`. Run `npm install` and `pip install -r backend/requirements.txt`, and the full system is immediately functional.

---

## 9. UI/UX Blueprint, Navigation & Component Architecture

### 9.1 Design System & Visual Standards
- **Institutional Dark Slate Glassmorphism**: High-contrast dark-slate panels (`bg-slate-900/95 backdrop-blur-md`), elevated border styling, and crisp typography.
- **Downward Non-Clipping Tooltips**: Table header and KPI tooltips open downward (`top-full mt-2`) with custom edge alignments, preventing clipping inside `overflow-auto` containers.
- **Clean Iconography**: Standard `Info` (`i`) icons across all metrics, trigger filter pills, and column headers.
- **Responsive 4-Column Layouts**: Participant tables use 4 proportional columns with responsive layouts, eliminating horizontal scrollbars.

### 9.2 Page Routes & Workflow Matrix

| Page Route | Purpose | Key UI Components & Interactions |
| :--- | :--- | :--- |
| **`/`** | Executive Watchlist Dashboard | **Trading Date Picker** (clean date display, holiday-aware auto-fallback with Toast alert, popover directly opening to calendar grid), quick day-shifters (`Prev Day`, `Next Day` only, purged of `Latest EOD`), 4 subtle pastel Risk KPI summary cards (`High Risk`, `Medium`, `Low`, `All Risks`), 15D Analysis Window indicator readout badge, dynamic triage cutoff badge (`Score ≥ 60.0`), Risk Distribution Progress Bar, and **Watchlist Table** featuring a **Two-Tier Controls Toolbar** (Tier 1: Search + Export CSV / Reset filters; Tier 2: Scrip Alphabet Allotment segmented control `ALL | A-E | F-J | K-O | P-T | U-Z` per PVASF §2 & §5, Triggers bar, and live scrip count), sticky first column (`Scrip`), 1-click sortable headers, clean URLs (purged of exchange params), and direct "Analyze" action triggers. |
| **`/analysis/[symbol]`** | Forensic Analysis Workspace | **Clean Top Command Bar** with direct institutional export actions (`Download Excel`, `Download PDF`, `Preview`), unified observation bar, **Client 360° Demographics Slide-Over Drawer** (with dynamic TM ID resolution), and **4 Dedicated Surveillance Tabs** adhering to the Zero-Mock Data Policy:<br/>• **`Overview`**: Dual-Axis Master Chart (default 6M/180D baseline, 20 & 50 DMA toggles, traded volume, Screener Delivery %, 15D window overlay), 3-Pillar Statistical Deck (**Price Rise**, **Price Z-Score**, **Volume Z-Score** with clean statistical labels and zero clause section numbers), Price Band Breakout Card (clean 5% daily price band format), Anomaly Event Breakout Matrix, 5-Parameter Radar, and Alert Drivers Chart.<br/>• **`Shareholders`**: Executive Day $t$ / 15D KPI summary cards, Comparative Table 1 (Capital Structure Day $t$ vs $T-180$), Comparative Table 2 (PAN Delivery Demographics with percentage-only Net Change), and **Table 3: Major Shareholders Registry** with substantial ownership badges (`Substantial (≥ 5%)`, `Promoter`, `Standard`). Renders clean empty state when quarterly filings are pending.<br/>• **`Corporate Actions`**: Exchange disclosures timeline, board meetings, bonus/split/dividend events, and dilution adjustment factors. Renders clean empty state when disclosures are pending.<br/>• **`Participants`**: Row 1: Side-by-side tables for **Gross Positive LTP Contribution** ($+₹$ lifting ask) and **Gross Negative LTP Contribution** ($-₹$ hitting bids) with legal entity names; Row 2: **Concentrated Volume Share** and **Counterparty Concentration** (`n1 ⇄ n2`, `p1 ⇄ p2`, with pairwise LTP push preserved in DB but ignored in active display to prioritize volume); Row 3: **Enhanced Net P&L — Top Trading Beneficiaries** with macro scale labels (`+₹X.XX Cr` or `+₹X.XX L`) alongside exact rupee values. |
| **`/analyse/[symbol]`** | Backward-Compatible Route Alias | Asynchronous server redirect forwarding traffic to `/analysis/[symbol]`. |
| **`/history`** | Immutable System Audit Trail | Live feed from `compliance_audit_logs`, action filtering, search query pre-fill (`/history?search=SYMBOL`), and CSV exporter. |
| **`/settings`** | Model Calibration & User Admin | **Model Configuration Tab** (5 parameter weight sliders summing to 100%, alert cutoff threshold input, 1-click **Reset to Defaults**), **User Management Tab** (provision users, switch RBAC roles, toggle active/suspended status with anti-lockout protection), and **Security Audit Trail Tab**. |

### 9.3 Institutional Dossier Export Architecture (Excel & PDF Engines)

To support regulatory submissions, compliance committee review, and offline audit distribution, the platform features a **Dual Dossier Export Architecture**:

#### 1. Server-Side Institutional Excel Generator (`backend/services/excel_exporter.py`)
- **Technology & Engine**: Built with `openpyxl`, generating a structured, multi-sheet workbook (`.xlsx`) streamed directly via `StreamingResponse` from `GET /api/v1/surveillance/scrip/{scrip_id}/export-excel`.
- **Institutional Visual Standards**:
  - **Calibri Typography**: Strict typographic hierarchy (`FONT_TITLE`, `FONT_SEC_HEADER`, `FONT_TH`, `FONT_BOLD`, `FONT_REGULAR`, `FONT_MUTED`, `FONT_KPI_VAL`).
  - **Refined Color Palette**: Institutional dark slate `#1E293B` title banners, `#334155` table headers with white text, `#F1F5F9` subheaders, `#F8FAFC` zebra striping and KPI card backgrounds, and subtle `#E2E8F0` cell borders.
  - **Native Excel Formats**: Explicit formatting for currencies (`₹#,##0.00`), percentages (`0.00%`), integers (`#,##0`), and dates (`YYYY-MM-DD`).
  - **Active Gridlines & Freeze Panes**: Every worksheet explicitly enforces visible gridlines (`showGridLines = True`) and locks header panes (`A5`, `A7`, `A9`).
- **5 Comprehensive Worksheets (Zero Mock Data)**:
  1. **`Executive_Scorecard`**: Security master profile, 6 KPI cards, Quantitative Anomaly Scoring Matrix with live native Excel formulas (`=D{row}*4` and `=SUM(...)`), and automated regulatory case findings narrative.
  2. **`Market_Dynamics`**: 180-trading-day OHLCV time series, 20 DMA and 50 DMA moving averages, daily Close-to-Close returns, Return Z-Scores, Volume Z-Scores, Circuit Band Hit indicators, and rolling 180-day new high breakout flags.
  3. **`Shareholding_Structure`**: Capital distribution comparing Day $t$ vs $T-180$ (Promoter % vs Public float), granular individual promoter holdings with entity names and share counts, top 1% institutional/public shareholders, and pledged float analysis (or clean empty state note if pending quarterly feed).
  4. **`Corporate_Actions`**: 15-day chronological disclosure ledger with material impact categorizations (Splits, Bonuses, Dividends, AGMs, Board Meetings) and sentiment indicators (or clean empty state note if no disclosures).
  5. **`Participant_Surveillance`**: Concentrated market participants by traded volume, Gross Positive LTP Contribution (entities lifting price), Gross Negative LTP Contribution (entities depressing price), Bilateral Counterparty Pairs with matched turnover and Trade Reversal Ratio (RTR), DFS Directed Circular Trading Loops ($A \to B \to C \to A$), and Mark-to-Market Realized/Unrealized P&L calculations.

#### 2. Client-Side Vector-Accurate A4 PDF Dossier Generator (`components/investigation/surveillance-dossier-pdf.tsx`)
- **Technology & Layout Engine**: Pure React/Tailwind printable document component paired with strict `@media print` CSS rules in `app/globals.css`. Isolates the root container (`#surveillance-dossier-print-root`), suppresses normal page UI, and enforces exact A4 page boxes (`275mm` height, zero margin overflow, `page-break-after: always`).
- **Vector Graphics & Radar Visualization**: Features an in-component SVG vector radar chart (`VectorRadarChart`) calculating exact polar coordinates for all 5 surveillance parameters without clipping, external image dependencies, or canvas pixelation.
- **Dual User Modes**:
  1. **In-Modal Dossier Preview**: Interactive preview modal with sticky header, close trigger (`Escape` key), and fluid zoom slider (`0.5x` to `1.5x` with 1-click reset to `1.0x`), allowing investigators to inspect document layout before printing.
  2. **Instant Background Auto-Print Trigger**: When clicked from the header command bar (`Download PDF`), the modal opens with `autoPrint={true}`, immediately invoking `window.print()` after rendering and providing a seamless "Save as PDF" / Print workflow.
- **5 Standalone Printable Pages**:
  - **Page 1**: Executive Cover & 5-Parameter Surveillance Scorecard (Security Profile, Radar Chart, 6 KPI cards, Quantitative Scoring Matrix, Case Findings narrative).
  - **Page 2**: Market Dynamics, Price-Volume & 15-Day Trading Ledger (15-day tabular trading ledger with OHLCV, net returns, daily Z-scores, and breakout markers).
  - **Page 3**: Shareholding Pattern & Ownership Concentration (Day $t$ vs $T-180$ comparison table, individual promoter entity holdings, and top 1% public holdings).
  - **Page 4**: Regulatory Disclosures & Corporate Actions (Chronological exchange disclosures, material impact classifications, and dilution factors).
  - **Page 5**: High-Volume Trading Entities & Participant Surveillance (Volume concentration rankings, Gross Positive/Negative LTP contribution tables, counterparty pairs, circular loops, and P&L audit).

### 9.4 Decommissioned Legacy Artifacts & Clean Interface Directives

To eliminate simulated mock workflows, reduce cognitive overhead, and maintain institutional integrity, the following components and patterns were permanently decommissioned:
1. **Mock Case Management Purge**: Decommissioned simulated ticket workflow buttons (`Mark Safe`, `Reopen`, `Active Surveillance` status toggle, and `Audit Log` button) from the investigation workspace. The system functions as a pure, authoritative forensic intelligence engine.
2. **Artificial Venue Toggles Decoupled**: Completely retired the `ExchangeScopeSelector` (`ALL | NSE | BSE`) and removed `exchange` URL query parameters from the dashboard (`app/page.tsx`) and investigation workspace (`app/analysis/[symbol]/page.tsx`). Upstream warehouse data in `daily_market_eod` is already pre-consolidated across venues.
3. **Purge of Section Clause Numbering**: Eliminated rigid numbering prefixes (`2.1`, `2.2`, `2.3`) from UI cards and tooltips in favor of clean, human-readable titles: **Price Rise**, **Price Z-Score**, and **Volume Z-Score**.
4. **Clean Price Band Wording**: Updated price band anomaly metrics from `±5% daily exchange price band` to canonical `5% daily exchange price band` (removing redundant `±`).
5. **Subtle Pastel Risk KPI Cards**: Redesigned dashboard triage summary into 4 clean, pastel-tinted cards dynamically computed from the calibrated triage cutoff threshold ($\text{Cutoff} = 60.0$): `High Risk` (Alert Score $\ge \text{Threshold}$ [$\ge 60$], rose), `Medium` (Alert Score $0.6 \times \text{Threshold}$ to $\text{Threshold}-1$ [$36\text{--}59$], amber), `Low` (Alert Score $< 0.6 \times \text{Threshold}$ [$< 36$], emerald), and `All Risks` (Total Securities, slate).
6. **Shareholder Card & Demographics Streamlining**: Removed redundant Day $T-180$ baseline subtitle footers from the 4 executive KPI cards in the Shareholders tab, removed cluttering parenthetical percentage labels from Unique PAN and Average Trading PAN count delta badges, and streamlined Table 2 (`PAN Delivery Demographics & Trading Activity`)'s `Net Change (Delta)` column to display clean, dedicated percentage deltas.
7. **Trading Date Picker Trigger & Popover Decluttering**: Removed `T-` relative index and `Latest` badge pills from the trigger button, rendering a clean, pure date string (`DD Mon YYYY`). The popover opens directly to the interactive calendar month grid with green active session indicator dots and date range footer, having completely eradicated the redundant top shortcut row (`Latest EOD | T-1 | T-5 | T-15`).
8. **Day-Shift Navigation Streamlining**: Removed the redundant `Latest EOD` button from the dashboard day shifter, leaving clean, intuitive `Prev Day` and `Next Day` navigation controls.
9. **Analysis Window Terminology Harmonization**: Standardized all references from "15D Surveillance Window" to **"15D Analysis Window"** across the dashboard readout badge, workspace observation header, charts, and API query parameters.
10. **Corporate Actions & Gross LTP Naming Alignment**: Renamed the 3rd workspace tab and 4th Excel worksheet to **"Corporate Actions"** (and PDF dossier Page 4 to **"Regulatory Disclosures & Corporate Actions"**), accurately reflecting corporate actions (splits, bonuses, dividends, AGMs, dilution factors) alongside regulatory disclosures. Renamed LTP tables to **"Gross Positive LTP Contribution"** and **"Gross Negative LTP Contribution"** with full legal entity name resolution from `client_identity_master`.
11. **Strict Zero-Mock Data Policy**: Completely purged synthetic mock test data from 5 warehouse tables (`broker_daily_summary`, `large_shareholders_registry`, `shareholding_summary`, `corporate_events_feed`, `price_dilution_factors`). UI tabs, Excel export sheets, and PDF pages display clean, institutional empty-state notices when upstream filings are pending, guaranteeing that every figure presented in the system is 100% empirical and verifiable against source feeds.
12. **High-Resolution Fullscreen Chart Modal & Live HUD Toolbar**: Added a dedicated high-definition modal overlay (`expandedChart`) accessible via chart maximize buttons, featuring a sticky header with security symbol badge, title/subtitle, and ESC keyboard trigger. Integrated a live cursor crosshair HUD toolbar into the master surveillance chart displaying date, close price, % gain vs baseline, 20 DMA, 50 DMA, volume, delivery % (`D: xx%`), and dynamic volume surge badges (`Extreme Anomaly ≥ 3x 15D MA` in rose, `Elevated Surge ≥ 1.5x 15D MA` in amber), alongside 5 surveillance timeframes (`15D (Window) | 1M | 3M | 6M (180D Baseline) | Max`), interactive `15D Window` highlight toggle, and `Pump Anomaly Detected` quick-zoom trigger.
13. **Two-Tier Surveillance Toolbar & Scrip Alphabet Allotment**: Restructured the watchlist table controls into an ergonomic two-tier Bloomberg-style layout: Tier 1 houses the search input (`Search scrip, company or ISIN...`) on the left and utility actions (`Reset filters`, `Export CSV`) on the right; Tier 2 houses the **Scrip Alphabet Allotment** segmented control (`ALL`, `A-E`, `F-J`, `K-O`, `P-T`, `U-Z` per regulatory allocation guidelines PVASF §2 & §5), vertical separator, 5 quick trigger toggle pills (`Price ≥ 15%`, `Price Z ≥ 1.65σ`, `Vol Z ≥ 1.65σ`, `Circuit ≥ 3d`, `180D Highs ≥ 1`), and a live scrip counter indicator (`Showing X of Y scrips`). Frozen sticky styling is applied to the first table column (`Scrip`), preserving stock identity during horizontal scrolling across wide viewports.

---

## 10. API Service Reference Matrix (26 Endpoints)

The FastAPI server exposes 26 production REST endpoints organized across 4 router modules:

| # | HTTP Verb | Endpoint Route | Router File | Primary Handler Function | Access Control | Description |
| :-: | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `GET` | `/api/v1/surveillance/health` | `surveillance.py` | `health_check()` | Public | System status check and spec verification. |
| 2 | `GET` | `/api/v1/surveillance/dates` | `surveillance.py` | `get_available_dates()` | Authenticated | Returns sorted list of distinct trading dates in warehouse. |
| 3 | `GET` | `/api/v1/surveillance/watchlist` | `surveillance.py` | `get_watchlist()` | Authenticated | Returns scrips scoring $\ge 60.0$ cutoff for observation date. |
| 4 | `GET` | `/api/v1/surveillance/scrips` | `surveillance.py` | `get_scrips()` | Authenticated | Returns full scrip population summary with venue breakdown. |
| 5 | `GET` | `/api/v1/surveillance/scrip/{scrip_id}` | `surveillance.py` | `get_scrip_detail()` | Authenticated | Returns deep-dive scrip details, 180D OHLCV series, and metrics. |
| 6 | `GET` | `/api/v1/surveillance/scrip/{scrip_id}/participants` | `surveillance.py` | `get_scrip_participants()` | Authenticated | Returns Gross Positive/Negative LTP contributors, volume shares, pairs, and loops. |
| 7 | `GET` | `/api/v1/surveillance/scrip/{scrip_id}/shareholding-breakdown` | `surveillance.py` | `get_scrip_shareholding_breakdown()` | Authenticated | Returns Day $t$ vs $T-180$ promoter & top 1% shareholder details and major shareholders registry. |
| 8 | `GET` | `/api/v1/surveillance/scrip/{scrip_id}/corporate-actions` | `surveillance.py` | `get_scrip_corporate_actions()` | Authenticated | Returns 15-day corporate actions, material disclosures, and dilution factors. |
| 9 | `GET` | `/api/v1/surveillance/scrip/{scrip_id}/export-excel` | `surveillance.py` | `export_scrip_excel()` | Authenticated | Generates and streams multi-sheet institutional Excel surveillance dossier (.xlsx). |
| 10 | `GET` | `/api/v1/surveillance/weights` | `surveillance.py` | `get_weights()` | Authenticated | Retrieves active scoring model weights, threshold (60.0), and timestamp from `model_config.json`. |
| 11 | `POST` | `/api/v1/surveillance/weights` | `surveillance.py` | `update_weights()` | Admin Only | Updates scoring model weights and threshold, persists to `model_config.json`, and records immutable audit log. |
| 12 | `POST` | `/api/v1/surveillance/upload-eod` | `surveillance.py` | `upload_eod()` | Admin Only | Ingests and stages daily EOD market data file. |
| 13 | `GET` | `/api/v1/trades/` | `trade_matches.py` | `list_trades()` | Authenticated | Paginated, filtered trade execution records. |
| 14 | `GET` | `/api/v1/trades/stats/daily` | `trade_matches.py` | `daily_stats()` | Authenticated | Trade counts and values per symbol per day. |
| 15 | `GET` | `/api/v1/trades/analysis/wash-trades` | `trade_matches.py` | `wash_trade_summary()` | Authenticated | Same-broker wash trade summary across symbols. |
| 16 | `GET` | `/api/v1/trades/analysis/algo-breakdown` | `trade_matches.py` | `algo_breakdown()` | Authenticated | Algo vs DMA vs manual execution breakdown. |
| 17 | `GET` | `/api/v1/trades/participant/{clnt_token}` | `trade_matches.py` | `participant_trades()` | Authenticated | All trades executed for a specific client token. |
| 18 | `GET` | `/api/v1/trades/{trd_date}/{trd_num}` | `trade_matches.py` | `get_trade_detail()` | Authenticated | Single trade detail lookup by composite primary key. |
| 19 | `GET` | `/api/v1/clients/pan/{pan}` | `clients.py` | `get_client_by_pan()` | Authenticated | Resolves client PAN to legal entity KYC profile, UCC, and linked demat accounts. |
| 20 | `POST` | `/api/v1/auth/login` | `auth.py` | `login()` | Public | Validates credentials and issues 24-hour JWT token. |
| 21 | `GET` | `/api/v1/auth/me` | `auth.py` | `get_me()` | Authenticated | Returns current authenticated user profile. |
| 22 | `GET` | `/api/v1/auth/users` | `auth.py` | `list_users()` | Admin Only | Lists all registered system users. |
| 23 | `POST` | `/api/v1/auth/users` | `auth.py` | `create_user()` | Admin Only | Registers a new surveillance officer. |
| 24 | `PUT` | `/api/v1/auth/users/{user_id}/role` | `auth.py` | `update_user_role()` | Admin Only | Updates user RBAC role with anti-lockout protection. |
| 25 | `PUT` | `/api/v1/auth/users/{user_id}/toggle` | `auth.py` | `toggle_user_active()` | Admin Only | Activates or deactivates user accounts. |
| 26 | `GET` | `/api/v1/auth/audit-logs` | `auth.py` | `get_audit_logs()` | Authenticated | Returns immutable regulatory security audit trail. |

---

## 11. Role-Based Access Control (RBAC) & Security Architecture

The platform enforces strict Role-Based Access Control across three operational tiers:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                4 DEFAULT SEEDED USER PROFILES                                           │
├─────────────────┬───────────┬─────────────────────────────────┬───────────────────────────────┬─────────────────────────┤
│ Username        │ Role      │ Full Name & Email               │ Department                    │ Default Credentials     │
├─────────────────┼───────────┼─────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ `vishesh_admin` │ **Admin**   │ Vishesh Sanghvi                 │ Surveillance & Risk Oversight │ Password: `vishesh123`  │
│                 │           │ `vishesh@surveillance.exchange.org`│                             │ (Full Governance & Admin)│
├─────────────────┼───────────┼─────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ `arao_analyst`  │ **Analyst** │ Ananya Rao                      │ Market Conduct Division       │ Password: `arao123`     │
│                 │           │ `arao@surveillance.exchange.org`   │                             │ (*Auto-authenticated on │
│                 │           │                                 │                               │ initial web visit*)     │
├─────────────────┼───────────┼─────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ `analyst_surv`  │ **Analyst** │ Surveillance Officer            │ Trade Investigations          │ Password: `analyst123`  │
│                 │           │ `analyst@surveillance.exchange.org`│                            │ (Forensic Investigator) │
├─────────────────┼───────────┼─────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ `guest_viewer`  │ **Viewer**  │ Audit Guest                     │ Compliance Review             │ Password: `guest123`    │
│                 │           │ `viewer@surveillance.exchange.org` │                            │ (Read-Only Inspection)  │
└─────────────────┴───────────┴─────────────────────────────────┴───────────────────────────────┴─────────────────────────┘
```

### 11.1 Operational RBAC Permissions Matrix

| Permission Capability | Admin (`vishesh_admin`) | Analyst (`arao_analyst`, `analyst_surv`) | Viewer (`guest_viewer`) |
| :--- | :---: | :---: | :---: |
| **Watchlist Triage & Metric Sorting** | Yes | Yes | Yes |
| **Forensic Charts & Deep-Dive Analysis** | Yes | Yes | Yes |
| **Participant LTP & Counterparty Audits** | Yes | Yes | Yes |
| **Client 360° Demographics Drawer** | Yes | Yes | Yes |
| **Download Institutional Excel Dossier (.xlsx)** | Yes | Yes | Yes |
| **Download Vector-Accurate A4 PDF Dossier** | Yes | Yes | Yes |
| **Add / Edit Forensic Investigation Notes** | Yes | Yes | No |
| **Mark Scrip Status (Under Inv. / Monitored)** | Yes | Yes | No |
| **Model Weight Sliders & Threshold Calibration** | Yes | No | No |
| **EOD Market Data Upload & Ingestion Staging** | Yes | No | No |
| **User Provisioning, Role Updates & Suspension** | Yes | No | No |
| **Full Regulatory Audit Log Inspection** | Yes | Yes | Read-Only |

### Security Implementation Specifications
1. **Password Encryption**: Implements **PBKDF2-HMAC-SHA256** with **100,000 iterations** and a unique random 16-byte salt per user (`hash_password` in `backend/security.py`).
2. **Token Authentication**: Issues signed HMAC-SHA256 tokens expiring after **24 hours**. Clients transmit tokens via the `Authorization: Bearer <token>` HTTP header.
3. **Anti-Lockout Protection**: `AuthService` prevents deactivating or demoting the last remaining active Admin user, ensuring system governance cannot be orphaned.
4. **Immutable Audit Trail**: All authentication events (`LOGIN_SUCCESS`, `LOGIN_FAILED`), role modifications, and model weight calibrations automatically write immutable records to `compliance_audit_logs` capturing timestamp, username, role, action narrative, and client IP address.
5. **FastAPI Security Headers & Origin Restriction**: `backend/main.py` enforces the `add_security_headers` middleware and restricts `CORSMiddleware` strictly to authorized origins (`http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:8000`, `http://127.0.0.1:8000`, `http://localhost:8005`, `http://127.0.0.1:8005`), rejecting wildcard access.
6. **Next.js 15 Middleware Security Enforcement**: `middleware.ts` intercepts all Next.js incoming requests, injecting strict enterprise HTTP headers:
   - `X-Frame-Options: DENY` (clickjacking defense)
   - `X-Content-Type-Options: nosniff` (MIME-sniffing prevention)
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - `Cross-Origin-Opener-Policy: same-origin`
   - `X-DNS-Prefetch-Control: on`
   - `X-XSS-Protection: 1; mode=block`
7. **In-Memory Sliding-Window Rate Limiting**: `backend/routers/auth.py` deploys `LoginRateLimiter` to protect `/api/v1/auth/login` against brute force credential attacks (maximum 25 login attempts per rolling 60-second window, imposing a 30-second lockout penalty).

---

## 12. Engineering Audit, Live Verification & Scaling Architecture

A rigorous, multi-pass engineering audit was executed across all layers of the codebase to guarantee that this architecture guide represents an authoritative, 100% verified blueprint.

### 12.1 Live Physical Warehouse Scale Audit (854,061+ Genuine Records)

The master relational database [`backend/db/surveillance.db`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/surveillance.db) was queried directly via the SQLite catalog engine. The warehouse hosts **854,061+ genuine physical records** (comprising 852,773 immutable market, participant, demat, calendar, and alert case records + 1,304+ dynamic append-only entries in `compliance_audit_logs`) across all 15 normalized tables (158 columns total), spanning **2,191 distinct exchange-listed scrips** and **179 distinct trading sessions** (2025-02-11 to 2025-11-03):

| # | Table Name | Module Alignment | Physical Row Count | Columns | Key Surveillance Role |
| :-: | :--- | :--- | :---: | :---: | :--- |
| 1 | `daily_market_eod` | Module 2: Market Prices | **333,974** | 20 | Consolidated OHLCV, circuit bands, delivery volumes |
| 2 | `market_baseline_stats` | Module 2: Baseline Stats | **333,974** | 9 | 180-day rolling return/volume mean, std dev, rolling highs |
| 3 | `client_identity_master` | Module 1: Client KYC | **59,397** | 7 | Exchange client legal entities, PAN master, risk grades |
| 4 | `client_demat_accounts` | Module 1: Demat Registry | **59,387** | 9 | Depository BO accounts, DP IDs, joint holders, active POA |
| 5 | `participant_daily_trades` | Module 3: Participant Conduct | **58,898** | 17 | Client trade executions, Gross Positive/Negative LTP push |
| 6 | `counterparty_trade_pairs` | Module 4: Counterparty Network| **6,700** | 16 | Matched buyer-seller pairs, pairwise LTP (Logic 1 & 2), wash trades |
| 7 | `trading_session_calendar` | Module 7: Market Calendar | **426** | 4 | Authoritative exchange trading sessions and market holidays |
| 8 | `compliance_audit_logs` | Module 8: Audit Trail | **1,304+** | 8 | Immutable regulatory security log, model calibrations (append-only) |
| 9 | `surveillance_alert_cases` | Module 8: Alert Cases | **13** | 14 | Pre-populated historical triage cases (19 dynamic alerts on 2025-11-03) |
| 10 | `portal_user_accounts` | Module 8: Officer Auth | **4** | 10 | Surveillance officers, PBKDF2 credentials, RBAC tiers |
| 11 | `broker_daily_summary` | Module 7: Broker Totals | **0** | 9 | *Purged synthetic test data; awaiting live broker feed* |
| 12 | `large_shareholders_registry`| Module 5: Large Holdings | **0** | 9 | *Purged synthetic test data; awaiting registrar feed* |
| 13 | `shareholding_summary` | Module 5: Shareholder Stats | **0** | 11 | *Purged synthetic test data; awaiting exchange quarterly float feed* |
| 14 | `corporate_events_feed` | Module 6: Corporate Events | **0** | 10 | *Purged synthetic test data; awaiting corporate announcements feed* |
| 15 | `price_dilution_factors` | Module 6: Corporate Actions | **0** | 5 | *Purged synthetic test data; awaiting corporate adjustment feed* |
| **Σ** | **15 Normalized Tables** | **8 Functional Modules** | **854,061+** | **158** | **Authoritative Relational Regulatory Data Warehouse** |

#### Operational Scale Benchmarks
- **Watchlist Triage Query Latency**: **~6.15 s** cold calculation across all 2,117 active scrips; **< 1 ms** cached in-memory response evaluated against the calibrated 60.0 threshold.
- **Forensic Participants Query Latency**: **~283.36 ms** for complete participant aggregation, Gross Positive/Negative LTP ranking, counterparty pairs, and circular trading loops.
- **Single-Stock Deep Dive Investigation**: **~48.02 ms** for complete 180-day baseline analysis, 5-parameter scoring breakdown, corporate actions, and major shareholding registry resolution.

### 12.2 Automated Multi-Pass Test Suites

The codebase is protected by four complementary automated test suites covering backend unit logic, database integrity, mathematical edge cases, API contracts, model calibration persistence, and frontend SSR route rendering (22 automated Pytest test modules total):

1. **Pytest End-to-End Suite with Sandbox Database Isolation ([`tests/test_surveillance_e2e.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/tests/test_surveillance_e2e.py) & [`tests/conftest.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/tests/conftest.py))**:
   - Executes 22 comprehensive test modules organized across 5 test classes against an isolated SQLite sandbox database initialized via SQLite's native `sqlite3.backup` API (`pvasf_test_surveillance_isolated.db`), guaranteeing zero state mutation or test pollution against live `surveillance.db`:
     - **Database Integrity & ORM Coverage (`TestSurveillanceDatabase`)**:
       1. `test_database_exists`: Confirms master database presence (`backend/db/surveillance.db`).
       2. `test_database_integrity_and_fks`: Validates SQLite integrity check (`ok`) and foreign key consistency.
       3. `test_table_coverage`: Asserts all 15 production tables exist.
       4. `test_analytical_views`: Validates all 3 SQL views (`v_daily_surveillance_summary`, `v_participant_conduct_ranking`, `v_counterparty_concentration`).
       5. `test_symbol_and_row_coverage`: Asserts $\ge 2,000$ scrips and $\ge 300,000$ market records.
       6. `test_orm_query_all_15_entities`: Verifies SQLAlchemy 2.0 ORM queries against all 15 declarative models.
       7. `test_orm_client_demat_foreign_key_join`: Validates relational joins between `ClientDematAccount` and `ClientIdentityMaster`.
     - **Mathematical Scoring Engine (`TestScoringEngine`)**:
       8. `test_engine_synthetic_pump_scoring`: Validates 5 mathematical anomaly algorithms against synthetic pump profiles.
       9. `test_engine_interoperability_with_db`: Tests calculation engine against live database records.
       10. `test_occl_mathematical_precision_and_spec_adherence`: Validates mathematical formula precision, OCCL pricing, lookbacks, and scoring threshold boundaries against regulatory specifications.
     - **Proprietary Leak Prevention (`TestProprietaryLeakPrevention`)**:
       11. `test_zero_warehouse_naming_leaks_in_active_code`: Enforces zero internal warehouse prefixes across active code.
       12. `test_zero_teradatasql_dependencies`: Verifies zero deprecated proprietary drivers in active dependencies.
     - **Live FastAPI Endpoints & RBAC Security (`TestFastAPIEndpoints`)**:
       13. `test_health_check`: Verifies `GET /api/v1/surveillance/health` returns status `ONLINE`.
       14. `test_unauthenticated_request_rejected`: Validates HTTP 401 guard on protected endpoints.
       15. `test_authenticated_flow_admin_and_analyst`: Tests full officer flow (login, dates, watchlist, scrip detail, participants, shareholding, corporate actions, and binary Excel dossier streaming).
       16. `test_rbac_forbidden_on_non_admin_weight_change`: Asserts Analyst or Viewer attempting model weight modifications receives HTTP 403 Forbidden.
       17. `test_rbac_forbidden_on_non_admin_user_management`: Asserts Analyst attempting user creation or status toggling receives HTTP 403 Forbidden.
       18. `test_tampered_token_rejected`: Confirms tampered or invalid JWT signatures receive HTTP 401 Unauthorized.
     - **Security Hardenings & Rate Limiting (`TestSecurityHardenings`)**:
       19. `test_eod_upload_rejects_disallowed_extension`: Validates that non-spreadsheet uploads (.sh, .py, .exe) receive HTTP 400.
       20. `test_pan_lookup_generates_audit_log`: Verifies Client 360 PAN inspection generates a tamper-evident compliance audit trail record.
       21. `test_login_rate_limiter_throttles_excessive_failures`: Validates sliding-window rate limiting on login attempts with HTTP 429 lockout.
       22. `test_eod_upload_rejects_oversized_payload`: Verifies payload size limiting rejecting files > 50 MB with HTTP 413 Payload Too Large.
   - **Result**: `22 passed in 16.80s` (100% pass rate).

2. **Data & Mathematical Parity Cross-Verification Suite ([`scripts/cross_verify_data_parity.py`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/cross_verify_data_parity.py))**:
   - Standalone parity audit script verifying complete mathematical and row-count parity between raw SQLite warehouse tables (`daily_market_eod`, `participant_daily_trades`, `counterparty_trade_pairs`) and FastAPI endpoint responses.

3. **Comprehensive E2E Node.js Test Suite ([`scripts/verify_e2e.mjs`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/verify_e2e.mjs)) & Frontend API Contracts ([`scripts/test_frontend_api.mjs`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/test_frontend_api.mjs))**:
   - Exercises multi-role authentication (`vishesh_admin`, `arao_analyst`, `guest_viewer`).
   - Verifies active model weights and threshold (60.0) from `GET /api/v1/surveillance/weights` and on-disk [`backend/db/model_config.json`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/model_config.json).
   - Validates RBAC enforcement: asserts Analyst and Viewer receive HTTP 403 Forbidden when attempting calibration updates.
   - Tests mathematical consistency of scrip detail 5-parameter score breakdown ($\sum \text{contributions} \equiv \text{final\_score}$).
   - Executes full calibration update-audit-restore cycle and validates SSR HTML generation across all pages.
   - Validates all 14 frontend API contracts against active backend endpoints with 100% pass rate.

4. **Headless Route Integration Suite ([`scripts/test_frontend_routes.mjs`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/test_frontend_routes.mjs))**:
   - Programmatically requests all Next.js App Router endpoints (`/`, `/history`, `/settings`, `/analysis/TATAMOTORS`, `/analyse/TATAMOTORS` dynamic redirect).
   - Validates HTTP 200 responses, confirms absence of unhandled React SSR exceptions, and verifies security token injection.

5. **Static Analysis & Type Safety**:
   - `npx tsc --noEmit`: `0 errors, 0 warnings` across all Next.js TypeScript files.
   - `python3 -m compileall backend/ pv_alert_surveillance.py scripts/ tests/`: `0 errors` across all Python source modules.

### 12.3 Teradata Enterprise Data Warehouse Scaling Architecture

When scaling surveillance operations from hundreds of scrips to national-market scale (5,000+ exchange-listed securities over 10+ years, exceeding 100 million trade records), the system transitions from SQLite to an enterprise **Teradata Vantage Massive Parallel Processing (MPP)** data warehouse:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      TERADATA VANTAGE ENTERPRISE MPP DATA WAREHOUSE                    │
│                 (100M+ Historical EOD Records | 5,000+ Exchange Scrips)                │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
   ┌────────────────────────────────────────┴────────────────────────────────────────┐
   ▼                                                                                 ▼
ANALYTICAL WINDOW PUSHDOWN (IN-AMP PROCESSING)             PHYSICAL PARTITIONING & PRIMARY INDEXING
- Computes 180D rolling mean/std on AMPs                   - NUPI: (symbol, trade_date) for zero skew
- Evaluates Z-scores without data egress                   - PPI: RANGE_N by trade_date (Monthly partitions)
- Zero memory bottlenecks on application tier             - Single-day queries scan ONLY 1 partition
   │                                                                                 │
   └────────────────────────────────────────┬────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TERADATA FASTEXPORT / TPT HIGH-SPEED EXTRACTION & DAILY STAGING                        │
│ - Daily EOD batch pre-computes scores into `v_daily_surveillance_summary`              │
│ - Automatically populates `surveillance_alert_cases` for watchlist triage              │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2-TIER SERVING LAYER (FASTAPI + IN-MEMORY / REDIS CACHE)                               │
│ - Pre-loads observation date watchlist into FastAPI in-memory LRU / Redis cache        │
│ - Eliminates real-time warehouse queries for routine dashboard navigation              │
│ - Delivers < 15ms response latency to Next.js compliance officers at 100M+ row scale   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **In-Database MPP Analytical Window Functions (Push-Down Execution)**:
   - Rather than streaming millions of raw OHLCV rows across the network into application memory, 180-day baseline statistics and Z-scores are executed directly on Teradata Access Module Processors (AMPs) using ANSI SQL window functions:
     ```sql
     SELECT 
         symbol,
         trade_date,
         close_price,
         total_traded_quantity,
         AVG(total_traded_quantity) OVER (
             PARTITION BY symbol
             ORDER BY trade_date
             ROWS BETWEEN 180 PRECEDING AND 1 PRECEDING
         ) AS baseline_volume_mean,
         STDDEV_SAMP(total_traded_quantity) OVER (
             PARTITION BY symbol
             ORDER BY trade_date
             ROWS BETWEEN 180 PRECEDING AND 1 PRECEDING
         ) AS baseline_volume_std,
         AVG((close_price - prev_close_price) / NULLIF(prev_close_price, 0)) OVER (
             PARTITION BY symbol
             ORDER BY trade_date
             ROWS BETWEEN 180 PRECEDING AND 1 PRECEDING
         ) AS baseline_return_mean,
         STDDEV_SAMP((close_price - prev_close_price) / NULLIF(prev_close_price, 0)) OVER (
             PARTITION BY symbol
             ORDER BY trade_date
             ROWS BETWEEN 180 PRECEDING AND 1 PRECEDING
         ) AS baseline_return_std
     FROM daily_market_eod;
     ```
   - Running this aggregation inside Teradata leverages dozens of parallel AMPs simultaneously, computing baselines across 5,000 scrips in seconds.
2. **Physical Data Distribution & Indexing Topology**:
   - **Non-Unique Primary Index (NUPI)**: Tables are indexed on `(symbol, trade_date)`. This guarantees even row hashing across all AMPs without data skew, preventing hot-spotting on high-volume scrips.
   - **Partitioned Primary Index (PPI)**: Partitioned by `RANGE_N(trade_date BETWEEN DATE '2020-01-01' AND DATE '2030-12-31' EACH INTERVAL '1' MONTH)`. When an investigator queries date $t$, Teradata's optimizer eliminates 99% of historical data blocks, scanning only the specific monthly partition for that date.
3. **2-Tier Serving Architecture**:
   - To guarantee that the Next.js surveillance dashboard responds in $< 15\text{ms}$ regardless of historical warehouse volume, the architecture decouples batch computation from interactive serving:
     - **Batch Tier (Teradata)**: Scheduled post-market EOD job executes the surveillance scoring engine, computes all 5 metrics, and materializes flagged scrips ($\ge 60.0$) into `surveillance_alert_cases`.
     - **Serving Tier (FastAPI + Cache)**: FastAPI loads the day's pre-computed alert cases into an in-memory / Redis cache. When compliance officers navigate the dashboard, sort columns, or filter by risk tier, queries are served directly from cache in milliseconds without issuing a single query to Teradata. Single-stock deep dives query indexed partitions on demand.
4. **Zero Code Changes in Frontend or Scoring Algorithms**:
   - Because the platform adheres to the Strictly Layered Boundary Pattern and standardized relational column nomenclature (`close_price`, `total_traded_quantity`, `client_pan`), transitioning from SQLite to Teradata requires only updating the SQLAlchemy connection string in `DATABASE_URL` and running the DDL script. The Next.js UI, Pydantic DTOs, and REST API contracts remain 100% identical.
