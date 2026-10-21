# PVASF — Canonical Database Subsystem (`backend/db`)

This directory is the **single source of truth** for all database models, DDL definitions, connection management, and data seeding for the **Price-Volume Alert Surveillance Framework (PVASF)**.

---

## 1. Directory Structure & File Roles

| File | Role & Purpose |
| :--- | :--- |
| **`database.py`** | **Engine & Session Factory**: Configures connection to SQLite (`surveillance.db`), sets SQLite PRAGMA `foreign_keys=ON`, defines `SessionLocal`, `get_db` FastAPI dependency, `init_db()`, and `reset_database()`. |
| **`models.py`** | **Declarative ORM**: 15 SQLAlchemy 2.0 mapped models covering all entities in [`PVASF_CORE_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_CORE_SPEC.md) and [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md). |
| **`schema.sql`** | **Canonical DDL**: ANSI SQL / SQLite / PostgreSQL compliant DDL containing all 15 table definitions, primary keys, foreign keys, and indexes. |
| **`seed.py`** | **Self-Contained Seeding Engine**: Generates and inserts all synthetic operational records across 15 scrips, 500 clients, multi-date participant trade logs, matched trade pairs, and quarterly shareholding filings. |
| **`surveillance.db`** | **Active Production SQLite Database**: The live operational database used by the FastAPI backend server (`http://localhost:8000`). |

---

## 2. The 15 Institutional Relational Entities

All application features, surveillance scoring engines, and API endpoints map strictly to these 15 tables:

| # | Table Name | SQLAlchemy Class | Primary Key | Description |
| :-: | :--- | :--- | :--- | :--- |
| **1** | `client_identity_master` | `ClientIdentityMaster` | `client_pan` | KYC master for trading entities (Individuals, Corporates, Promoters). |
| **2** | `client_demat_accounts` | `ClientDematAccount` | `account_id` | NSDL/CDSL Depository accounts, joint holders, and POA flags. |
| **3** | `daily_market_eod` | `DailyMarketEod` | `record_id` | Daily OHLCV, 52-week ranges, circuit price bands, and turnover. |
| **4** | `market_baseline_stats` | `MarketBaselineStat` | `stat_id` | Rolling 180-day baseline statistics (Mean volume, $\sigma$, 180-day high). |
| **5** | `participant_daily_trades` | `ParticipantDailyTrade` | `trade_summary_id` | Daily client-level trading volume, turnover, and LTP impact. |
| **6** | `counterparty_trade_pairs` | `CounterpartyTradePair` | `pair_match_id` | Matched bilateral trades for detecting circular trading rings. |
| **7** | `shareholding_summary` | `ShareholdingSummary` | `filing_id` | Quarterly float categorization (Promoter %, Top 1% Public %, Float %). |
| **8** | `large_shareholders_registry` | `LargeShareholdersRegistry` | `record_id` | Specific registry of all entities holding $\ge 1.00\%$ voting equity. |
| **9** | `corporate_events_feed` | `CorporateEventsFeed` | `event_id` | Material announcements (Splits, Bonuses, Dividends, Board Meetings). |
| **10** | `price_dilution_factors` | `PriceDilutionFactor` | `factor_id` | Split/Bonus baseline price adjustment multipliers. |
| **11** | `trading_session_calendar` | `TradingSessionCalendar` | `calendar_date` | Exchange calendar marking active trading days vs national holidays. |
| **12** | `broker_daily_summary` | `BrokerDailySummary` | `broker_summary_id` | Daily trading member aggregates. |
| **13** | `surveillance_alert_cases` | `SurveillanceAlertCase` | `case_reference_id` | Generated alert cases with composite scores ($w_1 \dots w_5$) and statuses. |
| **14** | `portal_user_accounts` | `SysUser` | `user_id` | Surveillance officer logins and RBAC roles (Analyst, Officer, Admin). |
| **15** | `compliance_audit_logs` | `SysAuditLog` | `log_id` | Immutable audit trail of officer investigations and case reviews. |

---

## 3. Operational CLI Commands

### A. Run Database Migrations / Schema Creation
```bash
python3 -c "from backend.db.database import init_db; init_db()"
```

### B. Completely Re-Seed the Database from Scratch
```bash
python3 -m backend.db.seed
```
*Note: Running `seed.py` drops and recreates all tables, populating all 15 tables with clean, synchronized data.*

### C. Connect via SQLite CLI
```bash
sqlite3 backend/db/surveillance.db
```

---

## 4. Safe Removal of Legacy / Unwanted DB Files

Because `backend/db/` is completely self-contained, **the following external / root files are redundant and can be safely removed** whenever you perform cleanup:

- 📦 `surveillance_insert.sql` *(Archived in `archive/sql/surveillance_insert.sql` — 1.8 MB historical static dump)*
- 📄 `surveillance_schema.sql` *(Root directory — clean ANSI reference DDL)*
- 📦 `PVASF_Sample_Data_Package/` *(Sample export bundle; does not affect backend runtime)*

The application backend **only** accesses `backend/db/surveillance.db`.

---

## 5. Offline Data Storage & Backup Manifest (What to Keep / Download)

Because confidential exchange market data cannot be pushed to public/remote Git repositories, `.gitignore` excludes all `.db` databases.

If you are setting up the project on another computer or maintaining external backups (Google Drive, AWS S3, USB drive):

| File Name | Location in Project | Size | Role & Importance |
| :--- | :--- | :---: | :--- |
| **`surveillance.db`** | `backend/db/surveillance.db` | **145 MB** | **🔴 PRIMARY OPERATIONAL DATABASE (853,157+ records)**.<br/>If you keep this single file and place it here, the entire platform runs with full production data immediately. |
| **`result_part1.xlsx`** | Project root (`/`) | 19.1 MB | Raw EOD Market feed (Feb–Jul 2025). Used by `scripts/ingest_market_eod.py`. |
| **`result_part2.xlsx`** | Project root (`/`) | 17.2 MB | Raw EOD Market feed (Jul–Nov 2025). Used by `scripts/ingest_market_eod.py`. |
| **`client_data.xlsx`** | Project root (`/`) | 4.3 MB | Raw participant trade executions & KYC. Used by `scripts/ingest_client_data.py`. |
| **`PAN_PAIR_GUJRAFFIA.xlsx`** | Project root (`/`) | 222 KB | Bilateral matched trade logs. Used by `scripts/ingest_pan_pairs.py`. |
| **`PAN_PAIR_SKMEGGPROD.xlsx`** | Project root (`/`) | 325 KB | Bilateral matched trade logs. Used by `scripts/ingest_pan_pairs.py`. |

> **Fresh Machine Setup Without DB**: If you don't have `surveillance.db` on a new PC, run `python3 -m backend.db.seed` to instantly generate an operational database with 15 scrips and 500 KYC clients for development.
