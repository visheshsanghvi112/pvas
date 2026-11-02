# Price-Volume Alert Surveillance Framework (PVASF)
## Enterprise Market Surveillance, Anomaly Detection & Regulatory Forensic Intelligence Platform

[![System Architecture](https://img.shields.io/badge/Architecture-v11.0.0%20Production%20Master-blue.svg)](file:///Users/vishesh/Downloads/UI_PVASF%20copy/SYSTEM_ARCHITECTURE_GUIDE.md)
[![Relational Warehouse](https://img.shields.io/badge/Warehouse-15%20Tables%20%7C%20158%20Columns%20%7C%20854%2C061%2B%20Records-green.svg)](file:///Users/vishesh/Downloads/UI_PVASF%20copy/surveillance_schema.sql)
[![Backend Engine](https://img.shields.io/badge/Backend-FastAPI%200.115%2B%20%7C%20Port%208005-teal.svg)](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/main.py)
[![Frontend Suite](https://img.shields.io/badge/Frontend-Next.js%2015%20(App%20Router)%20%7C%20Port%203000-black.svg)](file:///Users/vishesh/Downloads/UI_PVASF%20copy/app/page.tsx)
[![Test Suite](https://img.shields.io/badge/Pytest-22%2F22%20Passed%20(100%25)%20%7C%20Isolated%20Sandbox-brightgreen.svg)](file:///Users/vishesh/Downloads/UI_PVASF%20copy/tests/test_surveillance_e2e.py)
[![Data Parity](https://img.shields.io/badge/Parity-100%25%20DB--to--API%20Verified%20%7C%20Zero--Mock-success.svg)](file:///Users/vishesh/Downloads/UI_PVASF%20copy/scripts/cross_verify_data_parity.py)

> **CONFIDENTIAL & PROPRIETARY — REGULATORY MARKET SURVEILLANCE**  
> This repository contains the complete enterprise source code, quantitative surveillance engine, normalized relational data warehouse, forensic analysis workspaces, and automated verification suites for the **Price-Volume Alert Surveillance Framework (PVASF)**.

---

## Table of Contents

1. [Executive Summary & Core Objectives](#1-executive-summary--core-objectives)
2. [Quantitative Surveillance Engine & Mathematical Formulas](#2-quantitative-surveillance-engine--mathematical-formulas)
   - 2.1 [The 5 Core Anomaly Metrics](#21-the-5-core-anomaly-metrics)
   - 2.2 [Composite Scoring & Calibrated Risk Tiers](#22-composite-scoring--calibrated-risk-tiers)
   - 2.3 [Scrip Alphabet Allotment System](#23-scrip-alphabet-allotment-system)
   - 2.4 [Active Model Configuration Persistence](#24-active-model-configuration-persistence)
3. [Physical Relational Warehouse & Dataset Catalog](#3-physical-relational-warehouse--dataset-catalog)
   - 3.1 [Warehouse Metrics (854,061+ Physical Records)](#31-warehouse-metrics-854061-physical-records)
   - 3.2 [15 Normalized Warehouse Tables](#32-15-normalized-warehouse-tables)
   - 3.3 [3 Analytical SQL Views](#33-3-analytical-sql-views)
   - 3.4 [Delivered Raw Datasets (399,572 Canonical Records)](#34-delivered-raw-datasets-399572-canonical-records)
   - 3.5 [Zero-Mock Policy & Clean Empty States](#35-zero-mock-policy--clean-empty-states)
4. [User Interface & Forensic Workspaces](#4-user-interface--forensic-workspaces)
   - 4.1 [Module 1: Executive Surveillance Watchlist Dashboard (`/`)](#41-module-1-executive-surveillance-watchlist-dashboard-)
   - 4.2 [Module 2: Single-Stock Forensic Analysis Workspace (`/analysis/[symbol]`)](#42-module-2-single-stock-forensic-analysis-workspace-analysissymbol)
   - 4.3 [Module 3: Security & Compliance Audit Trail (`/history`)](#43-module-3-security--compliance-audit-trail-history)
   - 4.4 [Module 4: Model Calibration & System Administration (`/settings`)](#44-module-4-model-calibration--system-administration-settings)
   - 4.5 [Dual Institutional Dossier Export Engines](#45-dual-institutional-dossier-export-engines)
5. [System Architecture & Network Topology](#5-system-architecture--network-topology)
6. [REST API Service Reference (27 Production Endpoints)](#6-rest-api-service-reference-27-production-endpoints)
7. [Security, RBAC & Operational Safeguards](#7-security-rbac--operational-safeguards)
   - 7.1 [Cryptographic Authentication & Password Hashing](#71-cryptographic-authentication--password-hashing)
   - 7.2 [Role-Based Access Control (RBAC) Matrix](#72-role-based-access-control-rbac-matrix)
   - 7.3 [Authentication Rate Limiting & Brute-Force Defense](#73-authentication-rate-limiting--brute-force-defense)
   - 7.4 [Default Surveillance Officer Accounts](#74-default-surveillance-officer-accounts)
8. [Automated Verification & Testing Protocol](#8-automated-verification--testing-protocol)
9. [Developer Quickstart & Operational Setup Guide](#9-developer-quickstart--operational-setup-guide)
   - 9.1 [Backend Service Setup (FastAPI on Port 8005)](#91-backend-service-setup-fastapi-on-port-8005)
   - 9.2 [Frontend Workspace Setup (Next.js 15 on Port 3000)](#92-frontend-workspace-setup-nextjs-15-on-port-3000)
   - 9.3 [Ingestion Pipelines (Rebuilding the Warehouse)](#93-ingestion-pipelines-rebuilding-the-warehouse)
   - 9.4 [Environment Variables Reference](#94-environment-variables-reference)
10. [Repository Directory Map](#10-repository-directory-map)
11. [Authoritative Documentation Reference Index](#11-authoritative-documentation-reference-index)

---

## 1. Executive Summary & Core Objectives

The **Price-Volume Alert Surveillance Framework (PVASF)** is an institutional regulatory surveillance platform designed to identify, quantify, and document market manipulation across exchange-listed equities.

The platform targets market anomalies including:
* **Artificial Price Inflation / Pump-and-Dump Schemes**: Sustained price run-ups detached from broader market fundamentals.
* **Volume Pump Operations**: Sudden, non-stationary liquidity surges engineered to attract retail order flow.
* **Continuous Upper Circuit Locking**: Illiquid equities trapped at exchange-mandated daily circuit band ceilings.
* **6-Month Ceiling Breakouts**: Coordinated trades engineered to trigger algorithmic momentum buy filters.
* **Circular & Wash Trading Networks**: Synchronized buy-sell trading loops executed between colluding Client PAN entities through common or cross-broker rings.

PVASF evaluates every listed security by comparing its **15-day active observation window** against its **180-day historical baseline** across **2,191 listed equities** and **179 consecutive trading sessions**.

---

## 2. Quantitative Surveillance Engine & Mathematical Formulas

The analytical engine (`pv_alert_surveillance.py` and `backend/services/surveillance_service.py`) calculates 5 primary anomaly metrics for every scrip on each trading session.

```
                      ┌──────────────────────────────────────────────┐
                      │    180-Day Historical Baseline (T-180 -> T)  │
                      └──────────────────────┬───────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             Gaussian Baseline Distribution            Rolling Circuit & Breakout
             - Volume Mean (μ) & Std Dev (σ)           - Historical Peak Highs
             - Price Return Mean (μ) & Std Dev (σ)     - Upper Circuit Band Ceilings
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │      15-Day Active Observation Window        │
                      └──────────────────────┬───────────────────────┘
                                             │
         ┌───────────────┬───────────────────┼───────────────────┬───────────────┐
         ▼               ▼                   ▼                   ▼               ▼
     Metric 1        Metric 2            Metric 3            Metric 4        Metric 5
    Price Rise %   Price Z-Score       Volume Z-Score      Circuit Hits    180D New Highs
    (0-5 pts)       (0-5 pts)           (0-5 pts)           (0-5 pts)       (0-5 pts)
         │               │                   │                   │               │
         └───────────────┴───────────────────┼───────────────────┴───────────────┘
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │      Composite Scoring: Final Score (0-100)  │
                      │   S = Σ (w_i × Score_i / 5.0)  |  w_i = 20%  │
                      └──────────────────────┬───────────────────────┘
                                             │
                    ┌────────────────────────┴────────────────────────┐
                    ▼                                                 ▼
             S >= 60.0 (High Risk)                             S < 60.0 (Safe / Med)
         SHORTLISTED TO WATCHLIST                              ROUTINE SURVEILLANCE
```

### 2.1 The 5 Core Anomaly Metrics

#### Metric 1: Price Rise % vs $T-180$ Baseline ($\Delta P_{180d}$)
Measures cumulative price expansion from the 180-day baseline start price ($P_{T-180}$) to the highest price achieved in the 15-day evaluation window:
$$\text{Price Rise (\%)} = \left[ \frac{\max_{t=T-14}^{T}(\text{High}_t) - P_{T-180}}{P_{T-180}} \right] \times 100$$

* **Scoring Tiers**:
  * $< 25\%$ $\rightarrow$ **Score 0** (Normal price drift)
  * $25\% \dots 49.99\%$ $\rightarrow$ **Score 1** (Moderate upward movement)
  * $50\% \dots 99.99\%$ $\rightarrow$ **Score 2** (Substantial price expansion)
  * $100\% \dots 199.99\%$ $\rightarrow$ **Score 3** (High price doubling)
  * $200\% \dots 299.99\%$ $\rightarrow$ **Score 4** (Extreme surge)
  * $\ge 300\%$ $\rightarrow$ **Score 5** (Parabolic pump anomaly)

#### Metric 2: Price Z-Score ($Z_{\text{price}}$)
Measures the statistical significance of the 15-day mean daily return relative to the 180-day historical baseline distribution:
$$Z_{\text{price}} = \frac{\bar{R}_{15d} - \mu_{R, 180d}}{\sigma_{R, 180d}}$$

* **Modified MAD Z-Score** (Robust against non-Gaussian distribution outliers):
  $$Z_{\text{mod, price}} = 0.6745 \times \frac{\bar{R}_{15d} - \text{median}(R_{180d})}{\text{MAD}(R_{180d})}$$
* **Scoring Tiers**:
  * $Z < 1.00$ $\rightarrow$ **Score 0** ($< 84.1\%$ confidence)
  * $1.00 \le Z < 1.65$ $\rightarrow$ **Score 1** ($84.1\% \dots 95.0\%$ confidence)
  * $1.65 \le Z < 1.96$ $\rightarrow$ **Score 2** ($95.0\% \dots 97.5\%$ confidence)
  * $1.96 \le Z < 2.58$ $\rightarrow$ **Score 3** ($97.5\% \dots 99.5\%$ confidence)
  * $2.58 \le Z < 3.29$ $\rightarrow$ **Score 4** ($99.5\% \dots 99.9\%$ confidence)
  * $Z \ge 3.29$ $\rightarrow$ **Score 5** ($\ge 99.9\%$ confidence — extreme anomaly)

#### Metric 3: Volume Z-Score ($Z_{\text{volume}}$)
Detects anomalous liquidity concentration by evaluating the 15-day rolling average volume against the 180-day historical trading baseline:
$$Z_{\text{volume}} = \frac{\bar{V}_{15d} - \mu_{V, 180d}}{\sigma_{V, 180d}}$$

* **Scoring Tiers**:
  * $Z < 1.00$ $\rightarrow$ **Score 0** (Normal liquidity)
  * $1.00 \le Z < 1.65$ $\rightarrow$ **Score 1** (Elevated trading volume)
  * $1.65 \le Z < 1.96$ $\rightarrow$ **Score 2** (Significant volume expansion)
  * $1.96 \le Z < 2.58$ $\rightarrow$ **Score 3** (High volume surge — 97.5% confidence)
  * $2.58 \le Z < 3.29$ $\rightarrow$ **Score 4** (Very high volume surge — 99.5% confidence)
  * $Z \ge 3.29$ $\rightarrow$ **Score 5** (Extreme volume surge — 99.9% confidence)

#### Metric 4: Upper Circuit Band Persistence ($N_{\text{circuit}}$)
Tracks the number of sessions in the 15-day observation window where the day's high reached or exceeded 90% of the daily upper circuit limit:
$$N_{\text{circuit}} = \sum_{t=T-14}^{T} \mathbb{I}\left( \text{High}_t \ge 0.90 \times \text{UpperCircuitLimit}_t \right)$$

* **Scoring Tiers**:
  * $0 \dots 2\text{ days}$ $\rightarrow$ **Score 0** (Normal trading)
  * $3 \dots 5\text{ days}$ $\rightarrow$ **Score 1** (Frequent circuit hits)
  * $6 \dots 9\text{ days}$ $\rightarrow$ **Score 3** (Repeated circuit locks)
  * $\ge 10\text{ days}$ $\rightarrow$ **Score 5** (Severe multi-day circuit manipulation)

#### Metric 5: 180-Day New High Breakout ($N_{\text{high}}$)
Accumulates sessions where the day's high strictly exceeded the rolling 180-day price ceiling:
$$N_{\text{high}} = \sum_{t=T-14}^{T} \mathbb{I}\left( \text{High}_t > \max_{j=t-180}^{t-1} \text{High}_j \right)$$

* **Scoring Tiers**:
  * $0\text{ days}$ $\rightarrow$ **Score 0** (No breakout)
  * $1 \dots 4\text{ days}$ $\rightarrow$ **Score 1** (Occasional breakout)
  * $5 \dots 9\text{ days}$ $\rightarrow$ **Score 3** (Frequent breakouts)
  * $\ge 10\text{ days}$ $\rightarrow$ **Score 5** (Aggressive breakout run)

---

### 2.2 Composite Scoring & Calibrated Risk Tiers

The composite alert score ($S_{\text{final}} \in [0.0, 100.0]$) combines all five parameters using calibrated, balanced weights:
$$S_{\text{final}} = \sum_{i=1}^{5} \left( \frac{\text{Score}_i}{5.0} \right) \times w_i$$

Under active calibrated regulatory settings:
$$w_1 = w_2 = w_3 = w_4 = w_5 = 20.0\% \quad (\sum w_i = 100\%)$$

| Risk Category | Score Range | Watchlist Status | Regulatory Action |
| :--- | :---: | :---: | :--- |
| **High Risk** | **$60.0 \dots 100.0$** | **SHORTLISTED** | **Mandatory Forensic Triage**: Full participant audit, counterparty loop detection, and dossier export. |
| **Medium Risk** | **$40.0 \dots 59.99$** | Active Monitoring | Secondary watch; automated alerts on subsequent circuit hit or volume spike. |
| **Low / Safe** | **$0.0 \dots 39.99$** | Routine Surveillance | Standard surveillance archive; no action required. |

---

### 2.3 Scrip Alphabet Allotment System

To support official regulatory division of labor (where surveillance teams assign securities to officers by scrip ticker initial), PVASF incorporates the **Scrip Alphabet Allotment Deck**:

$$\text{Group}(S) = \begin{cases} 
\text{Group 1 (A--E)}, & S_1 \in [\text{A}, \text{E}] \\ 
\text{Group 2 (F--J)}, & S_1 \in [\text{F}, \text{J}] \\ 
\text{Group 3 (K--O)}, & S_1 \in [\text{K}, \text{O}] \\ 
\text{Group 4 (P--T)}, & S_1 \in [\text{P}, \text{T}] \\ 
\text{Group 5 (U--Z)}, & S_1 \in [\text{U}, \text{Z}] 
\end{cases}$$

Available as one-click surveillance deck filters in the Watchlist UI (`ALL | A-E | F-J | K-O | P-T | U-Z`).

---

### 2.4 Active Model Configuration Persistence

Scoring weights and cutoff thresholds are managed through `backend/db/model_config.json`:
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
  "last_updated": "2026-10-31T21:44:00.000Z",
  "updated_by": "vishesh_admin"
}
```
* **Persistence Guarantee**: Saved to disk atomically; loaded dynamically on cold start.
* **Audit Trail Integration**: Any update via `POST /api/v1/surveillance/weights` logs an immutable entry in `compliance_audit_logs`.
* **One-Click Reset**: The Admin UI includes a **Reset to Framework Defaults** button restoring $20\%$ equal weights and cutoff $60.0$.

---

## 3. Physical Relational Warehouse & Dataset Catalog

The data subsystem operates on an ANSI-standard relational warehouse (`backend/db/surveillance.db`) providing zero synthetic mocks and clean relational integrity.

### 3.1 Warehouse Metrics (854,061+ Physical Records)

* **Physical Relational Tables**: 15 normalized tables
* **Table Columns**: 158 strongly-typed columns
* **Analytical SQL Views**: 3 production views
* **Unique Listed Equities**: 2,191 scrips
* **Trading Sessions Covered**: 179 consecutive days (2025-02-11 $\rightarrow$ 2025-11-03)
* **Calendar Date Coverage**: 426 calendar dates (296 trading sessions) in calendar master
* **Total Physical Records**: **854,061+ records** (852,773 immutable market/participant rows + dynamic append-only compliance audit records)

---

### 3.2 15 Normalized Warehouse Tables

| # | Table Name | Physical Records | Columns | Primary Key / Unique Keys | Description & Functional Role |
| :-: | :--- | :---: | :---: | :--- | :--- |
| 1 | `daily_market_eod` | **333,974** | 15 | `(symbol, trade_date)` | EOD Market OHLCV, turnover, circuit limits, 52W high/low |
| 2 | `market_baseline_stats` | **333,974** | 9 | `(symbol, trade_date)` | Pre-computed rolling 180D baseline statistics ($\mu, \sigma$, peak high) |
| 3 | `client_identity_master` | **59,397** | 12 | `client_pan` | Master KYC registry with full legal names, categories, and cities |
| 4 | `client_demat_accounts` | **59,387** | 10 | `(dp_id, client_id)` | Depository participant and beneficial owner (BO) accounts |
| 5 | `participant_daily_trades` | **58,898** | 17 | `(symbol, trade_date, client_pan, trading_member_id)` | Daily participant execution volumes, aggressor orders, $\pm$ LTP push |
| 6 | `counterparty_trade_pairs` | **6,700** | 14 | `pair_id` (Auto-inc) | Bilateral matched buyer-seller executions and reversal trades |
| 7 | `compliance_audit_logs` | **1,312+** | 8 | `log_id` (Auto-inc) | Immutable audit trail tracking user actions, logins, and calibrations |
| 8 | `trading_session_calendar` | **426** | 5 | `calendar_date` | Exchange trading calendar, holiday flags, and session types |
| 9 | `surveillance_alert_cases`| **13** | 12 | `case_id` (Auto-inc) | Regulatory case triage records, officer assignments, review notes |
| 10 | `portal_user_accounts` | **4** | 10 | `user_id` / `username` | System users, PBKDF2 password hashes, and assigned RBAC roles |
| 11 | `broker_daily_summary` | *0 (clean state)* | 10 | `(trading_member_id, trade_date)` | Clearing broker aggregate volume and turnover summary |
| 12 | `corporate_events_feed` | *0 (clean state)* | 9 | `event_id` (Auto-inc) | Dividends, bonus issues, stock splits, and record dates |
| 13 | `large_shareholders_registry` | *0 (clean state)* | 9 | `record_id` (Auto-inc) | Substantial holders ($\ge 5\%$) and institutional shareholdings |
| 14 | `price_dilution_factors` | *0 (clean state)* | 6 | `factor_id` (Auto-inc) | Split multipliers and corporate action price adjustment factors |
| 15 | `shareholding_summary` | *0 (clean state)* | 8 | `(symbol, filing_date)` | Quarterly promoter, institutional, and public float breakdown |

---

### 3.3 3 Analytical SQL Views

1. **`v_daily_surveillance_summary`**: Joins `daily_market_eod` and `market_baseline_stats` to present unified 180-day baseline context, price change %, and rolling volume statistics.
2. **`v_participant_conduct_ranking`**: Aggregates `participant_daily_trades` to rank top positive LTP pushers (+₹), negative LTP suppressors (-₹), and net volume buyers/sellers per scrip.
3. **`v_counterparty_concentration`**: Analyzes `counterparty_trade_pairs` to calculate bilateral trading concentration and compute Reversal Trade Rates (RTR %) to detect circular trading rings.

---

### 3.4 Delivered Raw Datasets (399,572 Canonical Records)

The warehouse was ingested from 5 official exchange data feeds:
* **`result_part1.xlsx`** (19.1 MB): 176,056 rows covering 2025-02-11 to 2025-07-03 across 2,010 scrips.
* **`result_part2.xlsx`** (17.2 MB): 157,918 rows covering 2025-07-04 to 2025-11-03 across 2,155 scrips.
* **`client_data.xlsx`** (4.3 MB): 58,898 execution records covering 58,896 unique PANs and 453 brokers across `TDPOWERSYS`, `SKMEGGPROD`, and `GUJRAFFIA`.
* **`PAN_PAIR_GUJRAFFIA.xlsx`** (222 KB): 2,713 matched pairs across 6 trading sessions (Oct 14 $\rightarrow$ Oct 21, 2025).
* **`PAN_PAIR_SKMEGGPROD.xlsx`** (325 KB): 3,987 matched pairs executed during the Nov 03, 2025 +20% circuit surge.

---

### 3.5 Zero-Mock Policy & Clean Empty States

PVASF adheres to a strict **Zero-Mock Data Policy**:
* **No Synthetic Fillers**: Any tables where upstream regulatory feeds have not yet been delivered (`shareholding_summary`, `corporate_events_feed`, `large_shareholders_registry`) are maintained in a clean, empty state.
* **Resilient UI Handling**: Frontend investigation tabs render clean institutional empty states (*"No quarterly filings received"*, *"No corporate events logged"*) without console warnings or runtime exceptions.
* **Ignored Secondary Columns**: Auxiliary columns provided by the exchange (`pairwise_ltp_push_value_logic_1` and `_logic_2`) are safely stored in `counterparty_trade_pairs` but excluded from active scoring to ensure transparent, volume-weighted metrics.

---

## 4. User Interface & Forensic Workspaces

The frontend is an institutional surveillance suite built with Next.js 15, React 19, and Tailwind CSS.

### 4.1 Module 1: Executive Surveillance Watchlist Dashboard (`/`)

The primary executive interface for surveillance officers:
* **Two-Tier Bloomberg-Style Control Deck**:
  * **Tier 1 (Utility Bar)**: Search input (`Search scrip, company or ISIN...`) on left; contextual `Reset filters` + `Export CSV` right-aligned.
  * **Tier 2 (Surveillance Filter Deck)**: Scrip Alphabet Allotment tabs (`ALL | A-E | F-J | K-O | P-T | U-Z`) + vertical separator + 5 instant anomaly trigger toggles (`Price ≥ 15%`, `Price Z ≥ 1.65σ`, `Vol Z ≥ 1.65σ`, `Circuit ≥ 3d`, `180D Highs ≥ 1`) + live counter badge (`Showing 19 of 2,117 scrips`).
* **Sticky Scrip Column**: The first column (`Scrip / Company / ISIN`) remains frozen on horizontal scroll, ensuring continuous context when evaluating high-dimensional metrics.
* **Direct Navigation**: Clicking any scrip navigates instantly to `/analysis/[symbol]`.

---

### 4.2 Module 2: Single-Stock Forensic Analysis Workspace (`/analysis/[symbol]`)

A four-tab forensic deep-dive workspace:
* **Top Command Bar**: Displays Scrip Symbol, Company Legal Name, ISIN, Risk Badge (High / Medium / Low), Composite Score, Active Threshold, and quick links to **Export Excel**, **Export PDF**, and **View Audit Trail**.
* **Investigation Tabs**:
  1. **Overview Tab**:
     * **Screener-Style Master Surveillance Chart**: Dual-axis price and volume time series covering 180 days with 20-day DMA, 50-day DMA, volume bars, Screener-format `D: xx%` deliverable volume indicator, 15-day observation window highlight toggle, and real-time crosshair stats tracker.
     * **5-Parameter Radar Signature**: Visual polygon signature comparing the stock's anomaly profile against maximum risk boundaries.
     * **3-Pillar Statistical Distribution Deck**: Normal distribution bell curve benchmarks ($68.3\%, 95.5\%, 99.7\%$) vs. empirical Z-scores and Modified MAD scores.
  2. **Shareholders Tab**:
     * Visual breakdown of Promoter Float, Top 1% Institutional, and Public Float.
     * Granular Substantial Holders registry ($\ge 5\%$ shareholding).
  3. **Corporate Actions Tab**:
     * Chronological disclosures feed, dividend payouts, bonus issues, and stock split history with dilution multipliers.
  4. **Participants Tab**:
     * **Price Pushers (+₹)**: Top participant PANs responsible for lifting the ask price.
     * **Price Suppressors (-₹)**: Top participant PANs hitting the bid price.
     * **Realized Cash P&L Beneficiaries**: Macro-scale profit rankings formatted in Lakhs (`L`) and Crores (`Cr`).
     * **Bilateral Counterparty Concentration**: Matched buyer-seller pairs, executed volumes, and circular trade reversal rates.
     * **Client 360° KYC Drawer**: 1-click drill-down on any participant PAN displaying legal entity name, UCC category, DP/BO demat accounts, and registered address.

---

### 4.3 Module 3: Security & Compliance Audit Trail (`/history`)

Regulatory compliance audit logging:
* **Immutable Event Log**: Records all system actions (`LOGIN`, `UPDATE_MODEL_WEIGHTS`, `UPDATE_USER_ROLE`, `UPLOAD_EOD_DATA`, `PAN_LOOKUP`).
* **Filtering & Search**: Instant action code dropdown filtering and text search across officer usernames, target resources, and IP addresses.
* **URL Parameter Pre-Filling**: Supports direct deep-linking (e.g. `/history?search=SKMEGGPROD`).
* **Audit CSV Export**: 1-click regulatory export (`PVASF_System_Audit_Log.csv`).

---

### 4.4 Module 4: Model Calibration & System Administration (`/settings`)

Administrative control panel restricted to `Admin` users:
* **Model Scoring Calibration**: Interactive sliders for the 5 anomaly parameters ($w_1 \dots w_5$), alert cutoff threshold slider ($50.0 \dots 80.0$), and a **Reset to Framework Defaults** action.
* **User Management Deck**: Manage system accounts, assign RBAC roles (`Admin`, `Analyst`, `Viewer`), toggle account active status, and view last login timestamps.
* **Admin Anti-Lockout Enforcement**: Prevents accidental deactivation or demotion of the last active Administrator.

---

### 4.5 Dual Institutional Dossier Export Engines

1. **5-Sheet Institutional Excel Workbook** (`/api/v1/surveillance/scrip/{symbol}/export-excel`):
   * Sheet 1: `Executive_Summary` (Company metadata, composite score, risk rating, parameter breakdown)
   * Sheet 2: `180D_Historical_OHLCV` (Complete 180-day price, volume, circuit bands, moving averages)
   * Sheet 3: `Participant_Audit` (Top LTP contributors, net buyers/sellers, realized P&L)
   * Sheet 4: `Counterparty_Pairs` (Bilateral matched trade pairs, volumes, and reversal rates)
   * Sheet 5: `Regulatory_Audit_Trail` (Immutable compliance logs for the scrip)
2. **Vector-Accurate Printable A4 PDF Dossier**:
   * Multi-page regulatory briefing document formatted with institutional typography, signature blocks, risk badges, and tabular summaries.

---

## 5. System Architecture & Network Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Next.js 15 Frontend (Port 3000)                       │
│  - App Router: /, /analysis/[symbol], /history, /settings                   │
│  - Security Middleware: CSP, HSTS, X-Frame-Options, Cookie Proxy            │
│  - Recharts Master Chart, Client 360° Drawer, Vector PDF Dossier           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                      HTTP /api/v1 (Reverse Proxy / Fetch)
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        FastAPI Backend (Port 8005)                          │
│  - 27 REST Endpoints across Surveillance, Auth, Clients & Trades Routers    │
│  - Security: PBKDF2 Hashing (100k rounds), Bearer Token Auth, CORS Guard   │
│  - Scoring Engine: Vectorized NumPy/Pandas Core Math (pv_alert_surveillance)│
│  - Rate Limiter: LoginRateLimiter (Max 25 attempts / 60s window, 30s lockout) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                        SQLAlchemy 2.0 ORM Engine
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│            Relational Regulatory Warehouse (backend/db/surveillance.db)      │
│  - 15 Normalized ANSI Tables (158 Columns, 854,061+ Physical Records)       │
│  - 3 Analytical SQL Views (Concentration, Summary, Conduct Rankings)        │
│  - 2,191 Listed Equities | 179 Trading Sessions | Zero Synthetic Mocks      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. REST API Service Reference (27 Production Endpoints)

The FastAPI backend runs on port `8005`. Interactive Swagger documentation is available at `http://127.0.0.1:8005/docs`.

### 6.1 Surveillance Router (`/api/v1/surveillance/*`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/surveillance/health` | Public | System health check and specification version |
| `GET` | `/api/v1/surveillance/dates` | Authenticated | List of available trading dates (179 sessions) |
| `GET` | `/api/v1/surveillance/watchlist` | Authenticated | Risk-ranked surveillance watchlist for a given `date` |
| `GET` | `/api/v1/surveillance/scrips` | Authenticated | Directory of all 2,191 listed scrips with metadata |
| `GET` | `/api/v1/surveillance/scrip/{symbol}` | Authenticated | 180-day OHLCV history, DMA20/50, and 5-parameter score breakdown |
| `GET` | `/api/v1/surveillance/scrip/{symbol}/participants` | Authenticated | $\pm$ LTP pushers, volume share, and realized P&L |
| `GET` | `/api/v1/surveillance/scrip/{symbol}/shareholding-breakdown` | Authenticated | Float distribution and substantial shareholders |
| `GET` | `/api/v1/surveillance/scrip/{symbol}/corporate-actions` | Authenticated | Disclosures, splits, bonuses, and dilution factors |
| `GET` | `/api/v1/surveillance/scrip/{symbol}/export-excel` | Authenticated | Generates 5-sheet institutional regulatory Excel workbook |
| `GET` | `/api/v1/surveillance/weights` | Authenticated | Retrieves active model weights and cutoff threshold |
| `POST`| `/api/v1/surveillance/weights` | **Admin Only** | Updates model weights and cutoff threshold with audit logging |
| `POST`| `/api/v1/surveillance/upload-eod` | **Admin Only** | Ingests daily market EOD file (Max 50MB, `.xlsx`/`.csv`) |

### 6.2 Authentication & User Management Router (`/api/v1/auth/*`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/auth/login` | Public (Rate-Limited)| Authenticates officer credentials and issues 24-hr Bearer token |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieves current authenticated officer profile and role |
| `GET` | `/api/v1/auth/users` | **Admin Only** | Lists all registered portal accounts and activity |
| `POST` | `/api/v1/auth/users` | **Admin Only** | Creates a new surveillance portal user |
| `PUT` | `/api/v1/auth/users/{user_id}/role` | **Admin Only** | Updates an officer's RBAC role (`Admin`, `Analyst`, `Viewer`) |
| `PUT` | `/api/v1/auth/users/{user_id}/toggle` | **Admin Only** | Activates or deactivates an officer account (anti-lockout protected) |
| `GET` | `/api/v1/auth/audit-logs` | Authenticated | Retrieves immutable compliance audit log entries |

### 6.3 Clients & Demographics Router (`/api/v1/clients/*`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/clients/pan/{pan}` | Authenticated | Client 360° KYC demographics, UCC category, DP/BO demat accounts |

### 6.4 Trade Matches & Counterparty Router (`/api/v1/trades/*`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/trades` | Authenticated | Paginated bilateral matched trade execution logs |
| `GET` | `/api/v1/trades/stats/daily` | Authenticated | Daily execution statistics and matched volume metrics |
| `GET` | `/api/v1/trades/analysis/wash-trades` | Authenticated | Bilateral counterparty reversal rings and wash trade loops |
| `GET` | `/api/v1/trades/analysis/algo-breakdown` | Authenticated | Algorithmic execution breakdown by order type |
| `GET` | `/api/v1/trades/participant/{clnt_token}`| Authenticated | Historical execution activity for a specific client token |
| `GET` | `/api/v1/trades/{trd_date}/{trd_num}` | Authenticated | Specific execution trade ticket lookup |

---

## 7. Security, RBAC & Operational Safeguards

### 7.1 Cryptographic Authentication & Password Hashing
* **PBKDF2-HMAC-SHA256**: Passwords hashed with 100,000 rounds using a cryptographically secure 16-byte random salt per user.
* **Constant-Time Verification**: Uses Python's `hmac.compare_digest` to eliminate timing side-channel attacks.
* **Bearer Token Session Management**: Cryptographically signed access tokens with 24-hour expiration.

### 7.2 Role-Based Access Control (RBAC) Matrix

| Operational Permission | `Admin` | `Analyst` | `Viewer` |
| :--- | :---: | :---: | :---: |
| View Surveillance Watchlist (`/`) | ✅ | ✅ | ✅ |
| Single-Stock Forensic Analysis (`/analysis/[symbol]`) | ✅ | ✅ | ✅ |
| Client 360° Demographics KYC Lookup | ✅ | ✅ | ✅ |
| Export Excel & PDF Dossiers | ✅ | ✅ | ❌ |
| View Security & Compliance Audit Trail (`/history`) | ✅ | ✅ | ❌ |
| Calibrate Model Weights & Cutoff (`/settings`) | ✅ | ❌ (HTTP 403) | ❌ (HTTP 403) |
| Manage User Accounts & RBAC Roles (`/settings`) | ✅ | ❌ (HTTP 403) | ❌ (HTTP 403) |
| Upload Market EOD Feeds | ✅ | ❌ (HTTP 403) | ❌ (HTTP 403) |

### 7.3 Authentication Rate Limiting & Brute-Force Defense
`LoginRateLimiter` (`backend/routers/auth.py`) enforces strict sliding-window brute-force defense:
* Max **25 login attempts** per client IP within a rolling **60-second window**.
* Exceeding threshold triggers immediate **HTTP 429 Too Many Requests** with a **30-second lockout penalty**.
* Successful authentication resets the counter for that IP.

### 7.4 Default Surveillance Officer Accounts

| Username | Default Password | Assigned Role | Department | Role Description |
| :--- | :--- | :---: | :--- | :--- |
| `vishesh_admin` | `vishesh123` | **`Admin`** | Surveillance & Risk Oversight | Full operational administration, calibration, user management |
| `arao_analyst` | `arao123` | **`Analyst`** | Market Conduct Division | Senior surveillance officer, investigations, dossier exports |
| `analyst_surv` | `analyst123` | **`Analyst`** | Trade Investigations | Operational surveillance officer |
| `guest_viewer` | `guest123` | **`Viewer`** | Compliance Review | Read-only audit guest access |

> [!CAUTION]
> In production deployments, default passwords must be changed immediately via the administrative user settings console.

---

## 8. Automated Verification & Testing Protocol

PVASF includes a multi-tier automated test suite guaranteeing 100% operational integrity:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Multi-Tier Automated Verification Architecture               │
├──────────────────────────┬──────────────────────────┬───────────────────────┤
│    Pytest Backend Suite  │  Cross-Verification Test │   Frontend API Suite  │
│  22 Tests (pytest -v)    │  cross_verify_data_parity│   test_frontend_api   │
│  - DB & View Integrity   │  - 100% Parity Verified  │   - 14 API Contracts  │
│  - 15 ORM Model Joins    │  - Raw DB vs API Values  │   - Auth & Watchlist  │
│  - Scoring Math Accuracy │  - +₹ / -₹ LTP Matches   │   - Client 360 & KYC  │
│  - Leak Prevention       │  - Realized Cash P&L     │   - Excel Dossier     │
│  - RBAC & Rate Limiting  │  - Zero Synthetic Mocks  │   - Audit Logs        │
└──────────────────────────┴──────────────────────────┴───────────────────────┘
```

Run all test suites locally:

```bash
# 1. Run Python Backend Test Suite (22 tests with SQLite sandbox isolation)
pytest -v

# 2. Run Standalone Raw DB vs API Parity Verification
python3 scripts/cross_verify_data_parity.py

# 3. Verify Frontend API Data Contracts (14 contracts)
node scripts/test_frontend_api.mjs

# 4. Run Multi-Role End-to-End Suite (Auth, RBAC, Persistence, SSR HTML)
node scripts/verify_e2e.mjs

# 5. Verify TypeScript Type Safety
npx tsc --noEmit

# 6. Verify Python Syntax
python3 -m compileall backend/ tests/ scripts/
```

### Sandbox Test Isolation (`tests/conftest.py`)
All Pytest test runs execute in an isolated temporary database created via SQLite's native `src.backup(dst)` API. The production warehouse (`backend/db/surveillance.db`) is **never mutated** during test runs.

---

## 9. Developer Quickstart & Operational Setup Guide

### 9.1 Backend Service Setup (FastAPI on Port 8005)

```bash
# 1. Navigate to the project root
cd UI_PVASF

# 2. Activate Python virtual environment (Python 3.9+)
source .venv/bin/activate

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Start the FastAPI development server on port 8005
python3 backend/main.py
```
*Backend runs on `http://127.0.0.1:8005`. OpenAPI docs at `http://127.0.0.1:8005/docs`.*

---

### 9.2 Frontend Workspace Setup (Next.js 15 on Port 3000)

```bash
# In a separate terminal window:
cd UI_PVASF

# 1. Install Node.js dependencies
npm install

# 2. Start the Next.js development server on port 3000
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

---

### 9.3 Ingestion Pipelines (Rebuilding the Warehouse)

If starting from raw exchange Excel deliverables:

```bash
# 1. Ingest 180-day Market OHLCV and compute baseline statistics (333,974 rows)
python3 scripts/ingest_market_eod.py

# 2. Ingest participant trades, demat accounts, and KYC demographics (58,898 rows)
python3 scripts/ingest_client_data.py

# 3. Ingest bilateral matched counterparty trade pairs (6,700 rows)
python3 scripts/ingest_pan_pairs.py
```

---

### 9.4 Environment Variables Reference

Create a `.env` file in the project root:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Environment mode (`development` / `production`). |
| `PORT` | `3000` | Frontend port for the Next.js server. |
| `BACKEND_PORT` | `8005` | Backend port for the FastAPI server. |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8005` | Upstream backend API endpoint for Next.js proxy. |
| `DATABASE_URL` | `sqlite:///./backend/db/surveillance.db` | SQLAlchemy connection string. |
| `PVASF_SECRET_KEY` | *(Configured)* | Cryptographic HMAC secret for signing authentication session tokens. |

---

## 10. Repository Directory Map

```
UI_PVASF/
├── app/                                    # Next.js 15 App Router Pages
│   ├── page.tsx                            # Surveillance Watchlist Dashboard (Route: /)
│   ├── analysis/[symbol]/page.tsx          # Single-Stock Forensic Workspace (Route: /analysis/[symbol])
│   ├── history/page.tsx                    # Security & System Audit Logs (Route: /history)
│   ├── settings/page.tsx                   # Model Calibration & User Management (Route: /settings)
│   ├── layout.tsx                          # Root Application Layout & Font Provider
│   ├── error.tsx                           # Global Error Boundary Component
│   └── not-found.tsx                       # Institutional 404 Error Screen
│
├── components/                             # Reusable React UI Components
│   ├── dashboard/alerts-table.tsx          # Two-Tier Watchlist Deck with Alphabet Allotment & Sticky Scrip Column
│   ├── investigation/                      # Forensic Investigation Workspace
│   │   ├── charts.tsx                      # Screener Master Chart, 20/50 DMA, Radar, Statistical Deck
│   │   ├── investigation-workspace.tsx     # 4-Tab Workspace (Overview, Shareholders, Actions, Participants)
│   │   └── surveillance-dossier-pdf.tsx    # Vector-Accurate Printable A4 PDF Dossier Generator
│   ├── layout/app-shell.tsx                # Enterprise Navigation Shell & Profile Switcher Modal
│   └── ui/                                 # Shared UI Primitives (Badges, Buttons, Cards, Dialogs)
│
├── backend/                                # FastAPI Python Backend Subsystem
│   ├── main.py                             # Server Entrypoint, Security Headers, CORS (Port 8005)
│   ├── security.py                         # PBKDF2 Password Hashing, Bearer Token Auth, RBAC Guards
│   ├── db/                                 # Relational Database Subsystem
│   │   ├── database.py                     # SQLAlchemy 2.0 Engine & Session Local Factory
│   │   ├── models.py                       # 15 Normalized Table Models (158 Strongly-Typed Columns)
│   │   ├── schema.sql                      # Production ANSI SQL DDL & 3 Analytical Views
│   │   ├── seed.py                         # Development Database Seeder
│   │   ├── model_config.json               # Active Calibrated Scoring Weights & Cutoff Threshold
│   │   ├── README.md                       # Database Subsystem Operational Guide
│   │   └── surveillance.db                 # Unified Production Relational Warehouse (854,061+ Records)
│   ├── repositories/                       # Clean Data Access Layer (Client, Demat, Trade Matches)
│   ├── routers/                            # REST Endpoints (Surveillance, Auth, Clients, Trades)
│   ├── schemas/                            # Pydantic v2 DTO Request/Response Schemas
│   └── services/                           # Business Domain Services & Score Engine Driver
│
├── scripts/                                # Pipelines, Verification & Ingestion Tools
│   ├── ingest_market_eod.py                # Ingestion Pipeline: result_part1.xlsx & result_part2.xlsx
│   ├── ingest_client_data.py               # Ingestion Pipeline: client_data.xlsx
│   ├── ingest_pan_pairs.py                 # Ingestion Pipeline: PAN_PAIR_GUJRAFFIA & SKMEGGPROD.xlsx
│   ├── cross_verify_data_parity.py         # DB vs API 100% Mathematical Parity Verification Suite
│   ├── test_frontend_api.mjs               # 14-Contract Frontend API Integration Test Suite
│   ├── test_frontend_routes.mjs            # Headless Route Rendering Verification Suite
│   └── verify_e2e.mjs                      # Multi-Role End-to-End Test Runner
│
├── tests/                                  # Automated Pytest Test Suite
│   ├── conftest.py                         # Sandbox Test Isolation Fixture (sqlite3.backup API)
│   └── test_surveillance_e2e.py            # 22 Tests: DB Integrity, Models, Math, Leaks, RBAC, Security
│
├── lib/                                    # Frontend Core Utilities & API Connectors
│   ├── api.ts                              # Unified Fetch Client with Concurrency Lock & Auto-Retry
│   ├── user-context.tsx                    # React User Context & Active Role Provider
│   └── utils.ts                            # Tailwind Class Merging Utility
│
├── middleware.ts                           # Next.js 15 SSR Security Middleware (CSP, FrameGuard, HSTS)
├── next.config.mjs                         # Next.js Server & Reverse Proxy Configuration
├── pv_alert_surveillance.py                # Pure-Python Anomaly Engine (NumPy/Pandas Vectorized Math)
├── surveillance_schema.sql                 # Reference Clean ANSI SQL Master Schema & DDL
├── SYSTEM_ARCHITECTURE_GUIDE.md            # Master Architecture & Technical Blueprint (v11.0.0)
├── PVASF_CORE_SPEC.md                      # Anomaly Metric Formulas & Scoring Rules
├── DATA_REQUEST_SPEC.md                    # Data Feed Contracts & Delivery Specification
├── DATA_FEED_MAPPING_AUDIT.md              # Upstream Data Feed to Warehouse Mapping Matrix
├── DATASET_OVERVIEW.md                     # Overview of 5 Canonical Exchange Datasets
└── FUTURE_SCOPE.md                         # Future Roadmap & Analytical Scope
```

---

## 11. Authoritative Documentation Reference Index

| Document | File Path | Scope & Role |
| :--- | :--- | :--- |
| **Master Architecture Guide** | [`SYSTEM_ARCHITECTURE_GUIDE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/SYSTEM_ARCHITECTURE_GUIDE.md) | **v11.0.0 Production Blueprint**: Complete code-verified manual detailing all 15 tables, 158 columns, 3 views, 27 API endpoints, security, and UI components. |
| **Clean ANSI SQL Schema** | [`surveillance_schema.sql`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/surveillance_schema.sql) | Standalone DDL creating all 15 warehouse tables, primary/foreign keys, indexes, and 3 analytical views. |
| **Data Feed Mapping Audit** | [`DATA_FEED_MAPPING_AUDIT.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_FEED_MAPPING_AUDIT.md) | Field-by-field audit linking delivered Excel columns to normalized relational warehouse tables. |
| **Dataset Overview Catalog** | [`DATASET_OVERVIEW.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATASET_OVERVIEW.md) | Authoritative inventory of all 5 delivered Excel datasets covering 399,572 source rows. |
| **Data Request Specification** | [`DATA_REQUEST_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/DATA_REQUEST_SPEC.md) | Official data delivery specification detailing schemas across all 8 functional modules. |
| **PVASF Core Surveillance Spec** | [`PVASF_CORE_SPEC.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_CORE_SPEC.md) | Regulatory mathematical formulas, statistical score mapping, and surveillance business rules. |
| **Database Subsystem README** | [`backend/db/README.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/backend/db/README.md) | Technical database operations manual covering connection pooling, migrations, and backups. |
| **Future Analytical Roadmap** | [`FUTURE_SCOPE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/FUTURE_SCOPE.md) | Planned analytical extensions (MAD Z-scores, Kafka intraday streaming, wash trade badging). |
