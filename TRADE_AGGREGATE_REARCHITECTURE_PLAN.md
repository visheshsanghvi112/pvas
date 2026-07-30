# Trade Aggregate Rearchitecture & Database Recreation Master Plan

**Document Version:** 2.0.0  
**Target System:** Price-Volume Alert Surveillance Framework (PVASF)  
**Scope:** Complete Database Recreation, Backend Rearchitecture, SEBI Trade Aggregate Integration, & Documentation Sync  
**Reference Specification Documents:**  
- [`PVASF_CORE_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_CORE_SPEC.md) (Core Surveillance Algorithms & Metric Definitions)  
- [`PVASF_SCHEMA_REFERENCE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_SCHEMA_REFERENCE.md) (Definitive 19-Table 754-Column Warehouse Specification)  
- [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md) (Teradata Extraction Specification)

---

## 1. Executive Summary & Audit Rationale

### Current System Limitations (What We Have Today)
1. **Closing Price Proxy:** Because `FACT_TRADES` stores trade execution ticks rather than pre-calculated daily closing prices, the surveillance engine previously computed a daily mean price (`func.avg(Ftrd_Trd_Price)`). This proxy deviated from the official Indian exchange 30-minute Volume Weighted Average Price (VWAP) Closing Price.
2. **Heavy Runtime Computation:** To evaluate 180-day baseline metrics (Volume Z-Scores, Price Z-Scores, Circuit Persistence) or participant volume shares, the backend executed heavy `GROUP BY` SQL queries over tens of thousands of raw trade execution rows.
3. **Missing Aggregate Layer:** The schema lacked the SEBI Enterprise Data Warehouse **Aggregate Layer** (`AGG_SEC_DAY`, `AGG_CLNT_SEC_DAY`, `AGG_PAN_PAIR_DAY`).

### Target System Architecture (What We Will Have)
We are implementing a **3-Tier Enterprise SEBI Data Warehouse Architecture**:

```
                  ┌──────────────────────────────────────────────┐
                  │  TIER 1: DIMENSION LAYER                    │
                  │  • DIM_EXCH_CLNT_DTLS (DECL: Exchange PANs) │
                  │  • DIM_DEP_CLNT_DTLS  (DDCL: Demat Accounts) │
                  └──────────────────────┬───────────────────────┘
                                         │
                  ┌──────────────────────┴───────────────────────┐
                  │  TIER 2: FACT EXECUTION LAYER                │
                  │  • FACT_TRADES (FTRD: Millisecond Matches)   │
                  │  • FACT_MSTR_SHAREHLDG (FMSH: Filing Header) │
                  │  • FACT_CORP_ACTIONS (FCAC: Disclosures)     │
                  └──────────────────────┬───────────────────────┘
                                         │
                  ┌──────────────────────┴───────────────────────┐
                  │  TIER 3: AGGREGATE LAYER (NEW)               │
                  │  • AGG_SEC_DAY  (ASD:  VWAP Close & OHLC)    │
                  │  • AGG_CLNT_SEC_DAY (ACSD: Client Pushers)  │
                  │  • AGG_PAN_PAIR_DAY (APPD: PAN Pair Matrix)  │
                  └──────────────────────────────────────────────┘
```

---

## 2. Complete 19-Table Database Schema Blueprint

The database will be **100% recreated** with the following 19 physical tables (754 total columns):

| # | Table Name | Short Code | Full Columns | Category / Domain | Framework Purpose & Consuming Modules |
|---|---|---|:---:|---|---|
| 1 | `FACT_TRADES` | `FTRD` | **123** | Fact Execution Match | Intraday millisecond trade ticks, order IDs, wash trade flags & court evidence |
| 2 | `DIM_EXCH_CLNT_DTLS` | `DECL` | **128** | Exchange Client Master | Client PAN legal resolution, trading member broker IDs & city/state clusters |
| 3 | `DIM_DEP_CLNT_DTLS` | `DDCL` | **63** | Depository Client Master | Demat beneficiary owner accounts, joint holder PANs & POA control hubs |
| 4 | `FACT_MSTR_SHAREHLDG` | `FMSH` | **37** | Shareholding Header | Master record for quarterly shareholding filing status & reporting dates |
| 5 | `FACT_MAIN_SHLDNG` | `FSHG` | **30** | Main Shareholding Record | Promoter float % vs. Public float % & total promoter share pledge % |
| 6 | `FACT_PROM_SHLDR_DTLS` | `FPRH` | **22** | Promoter Shareholder Details | Promoter entity names, individual share counts & pledged share percentages |
| 7 | `FACT_PUB_SHLDR_DTLS` | `FPUH` | **19** | Public Shareholder Details | Listing of public institutional & non-institutional entities holding >1% |
| 8 | `FACT_DVR_SHLDNG` | `FDVR` | **25** | Differential Voting Rights | Shareholding pattern for stocks with DVR share classes (Class X, Y, Z) |
| 9 | `FACT_DR_HOLDING` | `FDRH` | **19** | Depository Receipts | Outstanding ADR/GDR counts and underlying custodian shares |
| 10 | `FACT_LKDIN_SHLDNG` | `FLKD` | **17** | Locked-In Shareholding | Locked-in promoter/public share counts and lock-in expiry dates |
| 11 | `FACT_CMP_EXCH_SHLDNG` | `FCES` | **5** | Company Exchange Index | Mapping index for company tokens, trade periods, and filing dates |
| 12 | `FACT_CORP_ACTIONS` | `FCAC` | **49** | Corporate Announcements | Official disclosures for dividends, bonus issues, stock splits & record dates |
| 13 | `FACT_CA_DIL_FCTR` | `FCDF` | **13** | Corporate Action Dilution | Price dilution adjustment factors (e.g. 0.500000 for 1:1 bonus/split) |
| 14 | `FORENSIC_CASES` | `CASES` | **13** | Dossier Persistence | Persistence for regulatory investigation dossiers & pinned trade evidence |
| 15 | `SYS_USERS` | `USERS` | **9** | Security & RBAC | Salted SHA-256 password authentication & RBAC roles (`Admin`, `Analyst`, `Viewer`) |
| 16 | `SYS_AUDIT_LOGS` | `LOGS` | **7** | Immutable Security Log | Security audit trail recording user logins, weight changes & KYC views |
| 17 | `AGG_SEC_DAY` | `ASD` | **83** | **Trade Security Aggregate** | **Official 30-min VWAP Close (`Asd_Close_Price`), OHLC bars, 52W High/Low & Circuit Limits** |
| 18 | `AGG_CLNT_SEC_DAY` | `ACSD` | **31** | **Trade Client Aggregate** | **Pre-calculated daily client volume share, LTP push (`Acsd_Pos_Cont_Val`) & wash trades** |
| 19 | `AGG_PAN_PAIR_DAY` | `APPD` | **60** | **Trade PAN Pair Aggregate** | **Pre-calculated buyer-seller PAN pair matched volume, value & circular loops** |

---

## 3. Detailed Component Inspection & Change Blueprint

### Component 1: Database Recreation & Reset Infrastructure
- **Current State:** SQLite database stored at `backend/pvasf.db`.
- **Target Changes:**
  - Update `backend/db/database.py` (`init_db`) to include an explicit `reset_database()` method that drops all existing tables and recreates all 19 ORM tables clean.
  - Add CLI command `python -m backend.db.database --reset` for zero-downtime database recreation.

### Component 2: Synthetic Data Seeding Pipeline (`backend/db/seed.py`)
- **Current State:** Seeds `FACT_TRADES`, `DECL`, `DDCL`, `FSHG`, `FCAC`, `CASES`, `USERS`.
- **Target Changes:**
  - Add seeding function `_seed_agg_sec_day(db, trading_dates, symbols)`: Generates daily `Asd_Close_Price` (30-min VWAP), `Asd_Open_Price`, `Asd_High_Price`, `Asd_Low_Price`, `Asd_Prev_Close_Price`, `Asd_Tot_Qty`, `Asd_Tot_Wash_Qty`, and Circuit limits.
  - Add seeding function `_seed_agg_clnt_sec_day(db, trading_dates, clients)`: Generates client-level daily buy/sell volumes, values, LTP push values (`Acsd_Pos_Cont_Val`), and client wash quantities.
  - Add seeding function `_seed_agg_pan_pair_day(db, trading_dates, clients)`: Generates buyer-seller PAN pair matched volumes (`Appd_Buy_Tot_Qty`), trade counts, and price push values (`Appd_Pos_Contri`).

### Component 3: Core Surveillance Engine (`pv_alert_surveillance.py`)
- **Current State:** Consumes a single DataFrame with columns `Ticker`, `Date`, `Open`, `High`, `Low`, `Close`, `Volume`.
- **Target Changes:**
  - Add support for loading `AGG_SEC_DAY` fields (`Asd_Close_Price`, `Asd_Prev_Close_Price`, `Asd_Upp_Crct_Price`) in `normalize_columns()`.
  - Ensure 180-day baseline metrics (Price Rise %, Price Z-Score, Volume Z-Score, Circuit Persistence, 180-Day New High Breakout) compute directly from `AGG_SEC_DAY` data.

### Component 4: Backend Surveillance Service (`backend/services/surveillance_service.py`)
- **Current State:** `_load_db_eod()` queries `FactTrades` and computes `func.avg(Ftrd_Trd_Price)` as close price proxy.
- **Target Changes:**
  - Rearchitect `_load_db_eod()` to query `AggSecDay.Asd_Close_Price` directly as primary path.
  - Rearchitect `get_scrip_participants()` to query `AggClntSecDay` and `AggPanPairDay` for client LTP pushers and counterparty pair matrices.
  - Preserve `FactTrades` queries for millisecond trade execution log views and legal dossier evidence pinning.

### Component 5: Repository Layer (`backend/repositories/`)
- **Current State:** Repositories exist for `FactTrades`, `DimExchClntDtls`, `DimDepClntDtls`, `ForensicCase`.
- **Target Changes:**
  - Add `backend/repositories/agg_trades_repo.py`:
    - `get_security_aggregates(symbol, start_date, end_date)`
    - `get_client_aggregates(symbol, date)`
    - `get_pan_pair_aggregates(symbol, date)`

### Component 6: FastAPI Routers & Pydantic Schemas (`backend/schemas/` & `backend/routers/`)
- **Current State:** Routers exist for `surveillance.py`, `fact_trades.py`, `clients.py`, `cases.py`, `auth.py`.
- **Target Changes:**
  - Add `backend/schemas/agg_trades.py`: Pydantic schemas for `AggSecDaySchema`, `AggClntSecDaySchema`, `AggPanPairDaySchema`.
  - Add `backend/routers/agg_trades.py`: Expose REST endpoints under `/api/aggregates/`:
    - `GET /api/aggregates/security/{symbol}`
    - `GET /api/aggregates/client/{symbol}`
    - `GET /api/aggregates/pan_pair/{symbol}`
  - Register new router in `backend/main.py`.

### Component 7: Documentation Sync (`SYSTEM_ARCHITECTURE_GUIDE.md`, `DATA_REQUEST_SPEC.md`, `PVASF_SCHEMA_REFERENCE.md`)
- **Current State:** Markdown files reference the older 16-table specification.
- **Target Changes:**
  - Update `SYSTEM_ARCHITECTURE_GUIDE.md` to document the 3-tier SEBI Data Warehouse architecture.
  - Update `DATA_REQUEST_SPEC.md` to specify Teradata extraction rules for `AGG_SEC_DAY`, `AGG_CLNT_SEC_DAY`, and `AGG_PAN_PAIR_DAY`.
  - Update `PVASF_SCHEMA_REFERENCE.md` with complete column mapping tables for all 19 tables (754 columns).

---

## 5. Verification & Testing Protocol

When implementation is performed later, the following automated commands will be used to verify clean execution:

```bash
# 1. Verify Database Reset & ORM Models (19 Tables)
python3 -c "from backend.db.database import init_db; init_db(); from backend.db.models import Base; print('DB Recreated! Total tables:', len(Base.metadata.tables))"

# 2. Verify Data Seeding across all 19 Tables
python3 -c "from backend.db.database import SessionLocal; from backend.db.seed import seed_database; db=SessionLocal(); res=seed_database(db); print('Seeding Result:', res); db.close()"

# 3. Verify Surveillance Service loading AGG_SEC_DAY
python3 -c "from backend.services.surveillance_service import EODSurveillanceService; s=EODSurveillanceService(); print('Engine loaded scrips:', len(s.get_scrips_summary()))"

# 4. Verify FastAPI Backend Routers
python3 -c "from backend.main import app; print('FastAPI App initialized cleanly with routes:', len(app.routes))"
```

---

## 6. Conclusion

This plan provides a **complete, zero-gap blueprint** to re-create the database, integrate the 3 SEBI Trade Aggregate tables, re-wire the surveillance engine, and synchronize all documentation. **Implementation will be executed in a future step upon explicit user directive.**
