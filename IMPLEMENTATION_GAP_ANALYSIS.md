# IMPLEMENTATION GAP ANALYSIS
**Document Version**: 1.0.0  
**Target Audience**: Solution Architects, Product Owners, and Engineering Teams  
**Scope**: Rigorous Engineering Assessment of Current Codebase vs. Production PVASF Spec (`PVASF_CORE_SPEC.md`)  

---

## Executive Summary & Engineering Classification System

To maintain absolute technical honesty, all system components are categorized using five strict engineering classifications:

1. **Exact Implementation**: Production-grade code that matches the PVASF specification without modification or fallback.
2. **Functional Equivalent**: Logic that achieves the same business result through a different architectural pattern (e.g., in-memory cached structures instead of physical Teradata pre-computed summary tables during local development).
3. **Development Approximation**: Local development logic used when full historical feeds or complex rolling window calculations are simplified for prototyping (e.g., deriving daily OHLCV bars from trade match executions).
4. **Mock / Static Data**: Hardcoded UI or fallback payload used when external upstream feeds are not yet connected.
5. **Future Implementation / Production Gap**: Required feature or feed defined in the specification that relies on production infrastructure or external feeds not yet present in the workspace.

---

## Detailed Gap Analysis Matrix

| Component | Current Implementation | Evidence | Assumptions | Development Approximation | Production Gap | Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **1. Corporate Actions Adjustment** | Price Rise % is calculated directly from raw historical close prices without adjusting for stock splits, bonuses, or rights issues. | [pv_alert_surveillance.py](file:///Users/vishesh/Downloads/UI_PVASF%20copy/pv_alert_surveillance.py#L75) | Assumes input historical prices are pre-adjusted by data provider. | None; raw close prices used. | Requires upstream Corporate Actions adjustment service (`DS-04`) to adjust $T-180$ base price before metric computation. | **HIGH** |
| **2. Price Z-Score Formula** | Evaluates latest 15-day mean price against 180-day overall mean and standard deviation: $\frac{\mu_{15d} - \mu_{180d}}{\sigma_{180d}}$. | [pv_alert_surveillance.py](file:///Users/vishesh/Downloads/UI_PVASF%20copy/pv_alert_surveillance.py#L82) | Assumes 180-day baseline mean/stddev is a suitable proxy for rolling 15-day window distribution. | Uses overall 180d standard deviation instead of computing standard deviation across all overlapping 15-day rolling windows over 180 days. | Full rolling 15-day window variance calculation ($\text{StdDev of }\mu_{15d,k}$) must be implemented in Python/SQL engine. | **MEDIUM** |
| **3. Volume Z-Score Formula** | Evaluates latest 15-day mean volume against 180-day overall mean and standard deviation: $\frac{\mu_{V,15d} - \mu_{V,180d}}{\sigma_{V,180d}}$. | [pv_alert_surveillance.py](file:///Users/vishesh/Downloads/UI_PVASF%20copy/pv_alert_surveillance.py#L86) | Assumes overall 180d volume distribution approximates rolling 15-day volume mean distribution. | Uses overall 180d volume stddev instead of rolling 15-day window volume stddev. | Full rolling 15-day window volume variance calculation must be implemented. | **MEDIUM** |
| **4. EOD Daily Bar Derivation** | Daily OHLCV bars are derived on the fly from trade match execution timestamps in `FACT_TRADES` (`Open` = first trade, `Close` = last trade). | [surveillance_service.py](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/surveillance_service.py#L50) | Assumes trade matches cover full session trading hours. | OHLC derived from trade matches rather than ingested from official exchange EOD feeds. | Production system must ingest official exchange EOD bar table (`EOD_PRICE_VOLUME_HIST`). | **MEDIUM** |
| **5. Pre-Computed Summary Tables** | Scrip risk scores and participant summaries are computed dynamically on startup and cached in service memory (`current_df`, `current_trades_df`). | [surveillance_service.py](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/surveillance_service.py#L120) | Assumes total memory is sufficient for active scrip dataset during development. | In-memory cached dataframes used instead of physical database tables. | Teradata tables `EOD_SCRIP_SCORES` and `EOD_PARTICIPANT_ANALYTICAL_SUMMARY` must be physically instantiated and populated via EOD cron job. | **LOW** |
| **6. Corporate Announcements Feed** | UI renders timeline pins using static sample announcements array (`corporateEvents`). | [investigation-workspace.tsx](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/investigation/investigation-workspace.tsx#L396) | Assumes static timeline items match active scrip event dates. | Mock / Static Data payload used for timeline visualization. | Requires connection to exchange corporate disclosure feed API (`DS-04`). | **HIGH** |
| **7. Shareholding Pattern Statistics** | UI renders quarterly promoter/public shareholding shifts using static historical percentages. | [investigation-workspace.tsx](file:///Users/vishesh/Downloads/UI_PVASF%20copy/components/investigation/investigation-workspace.tsx#L355) | Assumes static ownership percentages reflect current quarterly filings. | Mock / Static Data payload used for shareholding breakdown. | Requires connection to depositories / exchange shareholding archive feed API (`DS-05`). | **HIGH** |
| **8. Participant Circular Loop Graph** | Circular trade loops are rendered using trade path graph visualizers derived from top counterparty pairs. | [surveillance_service.py](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/services/surveillance_service.py#L306) | Assumes counterparty pair volume concentrations indicate potential multi-node rotation. | Cycle visualizer builds paths from pairwise trade concentration instead of full 3+ node Depth-First Search (DFS) graph traversal. | Implement multi-hop DFS graph cycle detection algorithm in backend engine. | **MEDIUM** |
| **9. Teradata ODBC Database Driver** | Database ORM (`database.py`) uses SQLite (`surveillance.db`) with full 3-table schema replication (`FACT_TRADES`, `DECL`, `DDCL`). | [database.py](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/database.py#L23) | Assumes SQLAlchemy ORM abstractions hide dialect differences. | SQLite used during development. | Production deployment requires setting `DATABASE_URL` to `teradatasql://...` and installing `teradatasql` driver. | **LOW** |
| **10. Order Book Depth Snapshot** | Renders top-of-book market depth (`Ftrd_Best_Bid_Price`, `Ftrd_Best_Ask_Price`, depth volume) at trade match millisecond. | [fact_trades_repo.py](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/repositories/fact_trades_repo.py#L140) | Assumes trade record depth fields capture full L2/L3 order book snapshot. | Single millisecond snapshot stored on trade row. | Full order book reconstruction engine required if historical tick-by-tick order events (`FACT_ORDERS`) are audited. | **LOW** |

---

## Priority Action Plan for Production Readiness

```
                                PRODUCTION ROADMAP
                                         │
    ┌────────────────────────────────────┼────────────────────────────────────┐
    │                                    │                                    │
    ▼                                    ▼                                    ▼
PHASE 1: FORMULA REFINEMENT        PHASE 2: FEED INTEGRATION          PHASE 3: TERADATA DEPLOYMENT
• Corporate Action base price      • Connect DS-04 Corporate          • Provision Teradata tables:
  adjustment logic                   Announcements feed                 - EOD_SCRIP_SCORES
• Rolling 15-day window variance   • Connect DS-05 Shareholding        - EOD_PARTICIPANT_SUMMARY
  for Price & Volume Z-Scores        pattern feed                     • Set DATABASE_URL to
• Multi-hop DFS circular loop      • Ingest official exchange           teradatasql:// driver
  detection algorithm                EOD bars (EOD_HIST)
```
