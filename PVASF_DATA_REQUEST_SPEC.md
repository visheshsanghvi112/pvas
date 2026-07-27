# PVASF Data Requirement Specification

**Document Version:** 1.1  
**Prepared By:** PVASF Development Team  
**Reference Schema Document:** `PVASF_SCHEMA_REFERENCE.md` (attached)

---

## Context & Purpose

The Price-Volume Alert Surveillance Framework (PVASF) UI and backend modules have been developed against the Teradata schema definitions provided by the data engineering team. The system is fully built and operational on synthetic data.

To validate these modules against real exchange data, we are formally requesting a subset of production data. This document precisely maps **which columns** we need from **which tables** for **which module**, so the data team can make a targeted, minimal extract without exposing unnecessary sensitive information.

> **Scope Boundary — Artificial Price Inflation (Current Phase):** The PVASF_CORE_SPEC.md objective (Section 1) states the framework "Detects Artificial Inflation/Deflation." However, examining the **five scoring parameters in Section 2**, every metric is implemented as a **right-tail / upward-direction check only**: Price Rise scores only positive %, Price Z-Score and Volume Z-Score use right-tail thresholds (Z ≥ 1.645), 180D New High explicitly tracks highs, and Band Persistence is co-located with all upward metrics. The current implementation covers **artificial price inflation and coordinated upward manipulation only.** Deflation detection (downward manipulation, short-selling schemes) is architecturally possible using the same schema but is **out of scope for the current phase.** All column justifications in this document reflect this direction.

**The three tables in scope are:**

| Table | Full Name | Short Code | Total Columns |
|---|---|---|---|
| `FACT_TRADES` | Trade Execution Facts | FTRD | 97 |
| `DIM_EXCH_CLNT_DTLS` | Exchange Client Master | DECL | 44 |
| `DIM_DEP_CLNT_DTLS` | Depository Client Master | DDCL | 45 |

> Full column-by-column reference for all three tables is provided in `PVASF_SCHEMA_REFERENCE.md`.

---

## Important Note on Date Ranges

The PVASF framework defines a **180-day rolling baseline** and a **15-day observation window**. These are the default framework windows. However, in a production surveillance environment, analysts will need to run custom date range investigations (e.g., investigate a specific 30-day period, or re-examine a past event). 

**The impact on data requirements:**

All columns marked in the modules below are needed regardless of window size. What changes with custom date ranges is **volume** — the number of rows returned, not the columns needed. The system is architected to pass `date_from` and `date_to` filter parameters to the API, so all the same columns will be queried, just over a different time slice.

> **Therefore, the data request should not be scoped to a fixed 180-day extract. We request access to the full historical FACT_TRADES data (or as many days as the data team can provide), so the API can filter on `Ftrd_Trd_Date` at query time for any window an analyst selects.**

---

## Module 1: PVASF Alert Scoring & Watchlist

**PVASF Spec Reference:** Section 2 (Shortlisting Metrics), Section 3 (Scoring Logic)  
**Purpose:** Generates the primary surveillance watchlist — scrips ranked by their PVASF final score, computed from five parameters: Price Rise, Price Z-Score, Volume Z-Score, Band Persistence, 180-Day New High.

**Source Table:** `FACT_TRADES` (FTRD)  
**Default Timeframe:** Last 181 Trading Days (181 days needed — 180-day baseline + 1 anchor day for Price Rise calculation)  
**Custom Range Support:** Yes — query uses `date_from`/`date_to` on `Ftrd_Trd_Date`

**Shortlisted Columns Required:**

| Column | Why It's Needed |
|---|---|
| `Ftrd_Symbol` | Group all trades by scrip to compute per-scrip metrics |
| `Ftrd_Trd_Date` | Primary date filter; build daily buckets for rolling 15D / 180D windows |
| `Ftrd_Trd_Price` | EOD close price proxy; compute Price Rise %, Price Z-Score (15D avg vs 180D rolling avg) |
| `Ftrd_Last_Trd_Price` | Track running LTP to detect new 180-day high events (`max(180D LTP)`) |
| `Ftrd_Trd_Qty` | Daily volume; compute Volume Z-Score (15D avg vs 180D rolling avg and stdev) |
| `Ftrd_Trd_Val` | Daily traded value (secondary verification of volume concentration) |
| `Ftrd_Sess_Type` | Filter out pre-open (1) and closing auction (3); only market session (2) data counts toward scoring |
| `Ftrd_LTP_Chng_Indc` | Detect upper circuit hits — `+` on last trade of session = price touched upper band |
| `Ftrd_High` *(⚠️ see note)* | Daily high price needed for Band Persistence (90% of circuit limit check) |

> **Note — Band Persistence:** Section 2.4 of the core spec uses the word "applicable circuit limit." This is confirmed to mean the **upper price band (upper circuit limit)** only. The system checks if the daily High reached ≥ 90% of the upper circuit limit for each scrip on each day in the 15-day window. Lower circuit hits are not counted. We are currently computing `daily High = max(Ftrd_Trd_Price)` per scrip per day from FACT_TRADES. A separate `PRICE_BAND_MASTER` or `SCRIP_MASTER` table providing the official upper circuit limit per scrip per day would improve accuracy — please share its schema if available (see Open Clarifications, Question 1).

**Derived PVASF Metrics Computed from These Columns:**
- **Price Rise (%):** `((max(Close last 15D) − Close T-180) / Close T-180) × 100` — only positive rise is scored (0/1/3/5). A price fall scores 0.
- **Price Z-Score:** Z of 15D avg close vs distribution of all 15D rolling windows in 180D — **only positive Z (price significantly higher than baseline) is scored** (0/1/3/5). Negative Z (price below baseline) scores 0.
- **Volume Z-Score:** Z of 15D avg volume vs distribution of 180D rolling volume — only abnormally **high** volume is scored (0/1/3/5). Volume below baseline scores 0.
- **Band Persistence:** Count of days in last 15D where daily High ≥ 90% of the **upper** circuit limit — scored 0/1/3/5. Lower circuit hits are not counted.
- **180D New High:** Count of days in last 15D where LTP exceeded all prior 180D **highs** — scored 0/1/3/5. New 180D lows are not tracked.
- **Final Score:** Weighted sum of above five parameters (weights configurable via `/api/v1/surveillance/weights`)

---

## Module 2: 180-Day Price & Volume Chart

**PVASF Spec Reference:** Section 5 (Dashboard Output — "Price movement over 180 days", "Rolling 15-day average price/volume")  
**Purpose:** Visualizes the full price and volume time-series for a scrip under investigation. Enables investigators to visually identify the surge period. Powers the "180-Day Chart" tab in the Investigation Workspace.

**Source Table:** `FACT_TRADES` (FTRD)  
**Default Timeframe:** Last 180 Trading Days (EOD aggregated per scrip)  
**Custom Range Support:** Yes — same columns, analyst selects window

**Shortlisted Columns Required:**

| Column | Why It's Needed |
|---|---|
| `Ftrd_Symbol` | Filter to the scrip under review |
| `Ftrd_Trd_Date` | X-axis of the chart |
| `Ftrd_Trd_Price` | Daily close price (we use `avg(Ftrd_Trd_Price)` per day as close proxy) |
| `Ftrd_Trd_Qty` | Daily total volume (`sum(Ftrd_Trd_Qty)`) for volume bar chart |
| `Ftrd_Sess_Type` | Filter to market session only (Type=2) so pre-open trades don't distort close price |

**Computed Chart Outputs:**
- Close price line (180 days)
- 20-Day Moving Average (computed server-side)
- 50-Day Moving Average (computed server-side)
- 15-Day Rolling Average Volume line (computed server-side)
- Volume bars (daily)

> **⚠️ Clarification Needed:** For a more accurate chart, we ideally need an explicit **High and Close** price per scrip per day rather than aggregating from individual trade records. We specifically need the **daily High** (for Band Persistence overlays) and daily **Close** (for price trend and moving averages). Open and Low are not required by this framework. Please advise if a pre-aggregated EOD table exists that provides these.

---

## Module 3: Participant Analytics & LTP Contribution

**PVASF Spec Reference:** Section 4.1 (LTP Contribution), Section 4.2 (Volume Share), Section 5 (LTP contributors, Concentrated volume)  
**Purpose:** Identifies which specific PAN holders drove the Last Traded Price (LTP) during the alert period, and measures their volume concentration.

**Source Table:** `FACT_TRADES` (FTRD) joined with `DIM_EXCH_CLNT_DTLS` (DECL)  
**Join:** `Ftrd_Buy_Exch_Clnt_Token = Decl_Exch_Clnt_Token` (for buyer PAN) and `Ftrd_Sell_Exch_Clnt_Token = Decl_Exch_Clnt_Token` (for seller PAN)  
**Default Timeframe:** Last 15 Trading Days (Intraday — individual trades needed, not EOD aggregates)  
**Custom Range Support:** Yes

**Shortlisted Columns Required from FTRD:**

| Column | Why It's Needed |
|---|---|
| `Ftrd_Trd_Tmst` | Match each trade to an exact LTP moment (millisecond precision) |
| `Ftrd_Symbol` | Filter to specific scrip |
| `Ftrd_Trd_Date` | Date filter for rolling window |
| `Ftrd_Trd_Qty` | Aggregate buy/sell volume per PAN |
| `Ftrd_Trd_Val` | Compute gross buy value and sell value per PAN (for Net P&L) |
| `Ftrd_Trd_Price` | Needed for P&L = `Σ(sell_val) − Σ(buy_val)` |
| `Ftrd_Buy_Exch_Clnt_Token` | Identify buying participant → join to DECL for PAN |
| `Ftrd_Sell_Exch_Clnt_Token` | Identify selling participant → join to DECL for PAN |
| `Ftrd_LTP_Chng_Indc` | Flag which trades moved the LTP **upward** (`+`) — a trade with `Ftrd_LTP_Chng_Indc = '+'` means the buyer pushed the price higher. Only upward LTP contributions count toward the LTP Contribution metric. Downward (`-`) trades are excluded. |
| `Ftrd_Init_Side_Type` | Identifies **buy-aggressive** trades (Type=1 = buyer was the aggressor) — these are the trades driving the price up. Sell-aggressive trades (Type=2) are not scored in this framework. |

**Shortlisted Columns Required from DECL (for PAN resolution):**

| Column | Why It's Needed |
|---|---|
| `Decl_Exch_Clnt_Token` | Join key from FTRD |
| `Decl_Clnt_Pan` | PAN number — the entity identifier for participant grouping |

**Computed Outputs:**
- LTP Contribution % per PAN (Top 5)
- Volume Share % per PAN (Top 5)
- Net P&L per PAN (Top 5 profit-makers)

---

## Module 4: Counterparty Concentration & Circular Trading Detection

**PVASF Spec Reference:** Section 4.3 (Counterparty Concentration)  
**Purpose:** Detects synchronized and circular trading between PAN pairs. Flags scenarios where Client A consistently buys from Client B, or where volume rotates in a loop (A→B→C→A).

**Source Table:** `FACT_TRADES` (FTRD) joined with `DIM_EXCH_CLNT_DTLS` (DECL)  
**Join:** Buy side and Sell side both joined to DECL for PAN resolution  
**Default Timeframe:** Last 15 Trading Days (Intraday)  
**Custom Range Support:** Yes

**Shortlisted Columns Required from FTRD:**

| Column | Why It's Needed |
|---|---|
| `Ftrd_Symbol` | Filter to scrip under investigation |
| `Ftrd_Trd_Date` | Date window filter |
| `Ftrd_Buy_Exch_Clnt_Token` | One side of the trading pair |
| `Ftrd_Sell_Exch_Clnt_Token` | Other side of the trading pair |
| `Ftrd_Trd_Qty` | Volume to aggregate at pair level |
| `Ftrd_Trd_Val` | Value to compute pair-level concentration |
| `Ftrd_Same_Broker_Wash_Flag` | Direct wash trade indicator (buyer & seller at same broker) |
| `Ftrd_Diff_Broker_Wash_Flag` | Cross-broker wash trade indicator |
| `Ftrd_Trd_Tmst` | For reversal pair detection (buy followed by sell within short time window) |

**Shortlisted Columns Required from DECL:**

| Column | Why It's Needed |
|---|---|
| `Decl_Exch_Clnt_Token` | Join key |
| `Decl_Clnt_Pan` | Resolve token to PAN for pair labelling |

**Computed Outputs:**
- Top counterparty pairs by shared volume (Buyer–Seller PAN pairs)
- Pair Share % = pair's volume / total scrip volume
- Wash trade count and rate
- Reversal pairs (rapid buy-then-sell between same two PANs)
- Circular trading loops (A → B → C → A detection)

---

## Module 5: Trades Execution Log

**PVASF Spec Reference:** Section 6.2 (REST endpoint `/api/v1/trades/*`)  
**Purpose:** Provides the raw execution tape (individual trade records) for an investigator to reconstruct a suspected manipulation sequence. This is the forensic evidence layer — the investigator can drill into specific timestamps and examine order book depth at the moment of each suspicious trade.

**Source Table:** `FACT_TRADES` (FTRD)  
**Default Timeframe:** Last 15 Days (paginated — up to 500 rows per page)  
**Custom Range Support:** Yes — this is the most important module for custom ranges; an investigator will filter to a specific day or even a specific hour to examine manipulation windows

**Shortlisted Columns Required:**

| Column | Why It's Needed |
|---|---|
| `Ftrd_Trd_Num` | Unique trade ID — primary key for drill-down and cross-referencing |
| `Ftrd_Trd_Date` | Date filter |
| `Ftrd_Trd_Tmst` | Millisecond-precision execution timestamp — sequence reconstruction |
| `Ftrd_Trd_Price` | Execution price |
| `Ftrd_Trd_Qty` | Executed quantity |
| `Ftrd_Trd_Val` | Trade value |
| `Ftrd_Buy_Exch_Clnt_Token` | Buyer identity token (resolved to PAN via DECL) |
| `Ftrd_Sell_Exch_Clnt_Token` | Seller identity token (resolved to PAN via DECL) |
| `Ftrd_Buy_Exch_TM_Token` | Buying broker — needed to detect same-broker collusion |
| `Ftrd_Sell_Exch_TM_Token` | Selling broker |
| `Ftrd_Init_Side_Type` | Identifies **buy-aggressive** trades (Type=1) — the key signal in artificial inflation. A sequence of buy-aggressive trades pushing the LTP up is the core manipulation pattern being reconstructed. |
| `Ftrd_Same_Broker_Wash_Flag` | Wash trade flag — highlight in the execution log |
| `Ftrd_Diff_Broker_Wash_Flag` | Cross-broker wash flag |
| `Ftrd_Best_Bid_Price` | Order book state at execution moment |
| `Ftrd_Best_Ask_Price` | Order book state at execution moment |
| `Ftrd_Best_Bid_Qty` | Market depth — how thin was the book? |
| `Ftrd_Best_Ask_Qty` | Market depth |
| `Ftrd_LTP_Chng_Indc` | Highlight trades where `= '+'` — i.e., this trade pushed the LTP **upward**. These are the key trades in an artificial inflation sequence. Trades with `-` are not highlighted as suspicious under this framework. |

---

## Module 6: Client 360° Profile

**PVASF Spec Reference:** Section 5 (Dashboard Output — "Unique PAN holders", "Promoter & top 1% shareholding"), Section 4 (Participant-Level Metrics)  
**Purpose:** When an investigator clicks on a suspect PAN in any module, this drawer loads the complete entity profile: KYC details, exchange accounts, depository accounts, and joint holders (critical for identifying beneficial ownership).

**Source Tables:** `DIM_EXCH_CLNT_DTLS` (DECL) + `DIM_DEP_CLNT_DTLS` (DDCL)  
**Timeframe:** Latest snapshot (not time-windowed — we need the current KYC state)  
**Join Key:** `Decl_Clnt_Pan = Ddcl_Clnt_Pan`

**Shortlisted Columns Required from DECL:**

| Column | Why It's Needed |
|---|---|
| `Decl_Exch_Clnt_Token` | Entry point — provided by FTRD trade record |
| `Decl_Clnt_Pan` | Primary identity; join key to DDCL |
| `Decl_TM_Id` | Which broker — shows which trading member facilitated the trades |
| `Decl_Clnt_Id` | Broker-assigned client code |
| `Decl_Clnt_Name` | Display name in investigator dossier |
| `Decl_Clnt_Catg_Type_Desc` | Individual / Corporate / FII — risk category indicator |
| `Decl_Clnt_Stat_Indc` | Active or Suspended — suspended clients still trading is a red flag |
| `Decl_City` / `Decl_State` | Geographic clustering — are suspects in the same city? |
| `Decl_Exch_Id` / `Decl_Seg_Id` | Which exchange and segment the account is registered in |
| `Decl_Rec_Date` | When this account was registered (new accounts during a price spike = suspicious) |

**Shortlisted Columns Required from DDCL:**

| Column | Why It's Needed |
|---|---|
| `Ddcl_Clnt_Pan` | Join key to DECL |
| `Ddcl_Dep_Token` | Identify NSDL (1) vs CDSL (2) |
| `Ddcl_BP_Id` | Depository Participant ID |
| `Ddcl_Clnt_Id` | Beneficiary Owner account ID |
| `Ddcl_Clnt_Stat_Desc` | Account status (active / closed) |
| `Ddcl_Acct_Openng_Date` | Account age — new accounts during surge = red flag |
| `Ddcl_Scnd_Hldr_Clnt_Token` | Second joint account holder token — beneficial ownership chain |
| `Ddcl_Scnd_Hldr_Name` | Second holder name |
| `Ddcl_Thrd_Hldr_Clnt_Token` | Third joint holder token |
| `Ddcl_Thrd_Hldr_Name` | Third holder name |
| `Ddcl_Exch_Clnt_Id` | Cross-reference to DECL record |

---

## Summary: Columns Requested vs. Available

| Table | Total Columns | Columns Requested | % Requested |
|---|---|---|---|
| `FACT_TRADES` (FTRD) | 97 | **26** | 27% |
| `DIM_EXCH_CLNT_DTLS` (DECL) | 44 | **10** | 23% |
| `DIM_DEP_CLNT_DTLS` (DDCL) | 45 | **11** | 24% |

We are requesting **47 out of 186 total columns — approximately 25% of the schema** — covering exactly what is needed to run the PVASF modules end-to-end.

**Columns explicitly not requested** (and why):
- `Ftrd_Buy_IP_Addr` / `Ftrd_Sell_IP_Addr` — IP address logs are not required for PVASF analytics (may be needed for a future cyber-investigation module)
- `Ftrd_Buy_CTCL_Ref` / `Ftrd_Sell_CTCL_Ref` — internal broker reference strings, not needed for participant analytics
- `Decl_Bank_Name`, `Decl_Bank_Acct_Type`, `Decl_Birth_Date`, `Decl_Frst_Addr_Line` — detailed PII not needed for surveillance analytics
- `Ddcl_Bank_Name`, `Ddcl_Sex`, `Ddcl_Ntnlty_Desc` — same as above
- All algo order routing detail columns (`Ftrd_Buy_FOK_Flag`, `Ftrd_Buy_Trig_Type`, etc.) — needed only if an Algo Trading Detection module is added to scope

---

## Open Clarifications for the Data Team

| # | Question | Impact |
|---|---|---|
| 1 | Is there a pre-aggregated **EOD price table** (daily High + upper circuit band limit) separate from `FACT_TRADES`? | If yes, modules 1 and 2 should use it for Band Persistence and charting. Current fallback is `max(Ftrd_Trd_Price)` per day. |
| 2 | Can data be provided with **consistent token-based anonymization** (same token across FTRD, DECL, DDCL) rather than PAN masking for Stage 1? | Enables join validation without exposing PAN |
| 3 | Is historical FACT_TRADES data available going back **more than 180 days**? If yes, how far? | Custom date range support |
| 4 | Are `Ddcl_Scnd_Hldr_Clnt_Token` and `Ddcl_Thrd_Hldr_Clnt_Token` populated in production, or are they typically NULL? | Beneficial ownership detection in Client 360° |

---

## Proposed Data Extraction Strategy (Staged Approach)

| Stage | Scope | PAN / Token Treatment | Purpose |
|---|---|---|---|
| **Stage 1** | 5 scrips, last 15 days | Replace all PANs with consistent hashed tokens (`TKN_001`, `TKN_002`…) across FTRD, DECL, and DDCL | Validate joins, participant analytics, execution log, Client 360° drawer |
| **Stage 2** | 15 scrips, last 181 days | Same hashed tokens | Validate Z-score baselines, 180-day charting, scoring engine |
| **Stage 3** | Full watchlist scope | Unmasked (on secure VPN / read-replica) | Full production validation including real KYC names, geographic clustering |

The hashing approach in Stages 1 and 2 ensures zero PII exposure while still allowing complete relational join validation across all three tables.

---

*For complete column-by-column schema reference including all non-requested columns and data types, see: `PVASF_SCHEMA_REFERENCE.md`*
