# PVASF Business & Functional Data Requirements Specification
## Price Volume Analysis & Surveillance Framework (PVASF)

**Document Purpose:** Outlines the functional data capabilities, mathematical formulas, and business data requirements across all core operational modules of the Price-Volume Alert Surveillance Framework (PVASF).  
**Functional Boundary:** Specifies *what* business data capabilities are required and *why* they are needed, leaving physical database table selections, SQL joins, and column mappings to the Data Engineering & DBA teams.

---

## 1. Module 1: Alert Scoring & Watchlist Engine (`/`)
**Purpose:** Computes 5 shortlisting metric scores (Price Rise %, Price Z-Score, Volume Z-Score, Band Persistence, 180D New Highs) and generates the risk-ranked watchlist.

### Metric Definitions & Formulas
* **Price Rise (%)**: Flags stocks that have rallied over the last 6 months.  
  $$\text{Price Rise (\%)} = \left[ \frac{\text{Highest Price}_{\text{15D}} - \text{Price}_{T-180}}{\text{Price}_{T-180}} \right] \times 100$$

* **Price Z-Score ($Z_{\text{price}}$)**: Flags a 15-day price move outside the stock's historical baseline.  
  $$Z_{\text{price}} = \frac{\bar{X}_{\text{15-Day Average Price Change}} - \mu_{\text{180-Day Baseline Mean}}}{\sigma_{\text{180-Day Baseline Std Dev}}}$$

* **Volume Z-Score ($Z_{\text{volume}}$)**: Flags an unusual trading activity surge.  
  $$Z_{\text{volume}} = \frac{\bar{X}_{\text{15-Day Average Volume}} - \mu_{\text{180-Day Baseline Mean}}}{\sigma_{\text{180-Day Baseline Std Dev}}}$$

* **Price Band Persistence**: Flags stocks hitting upper circuit limits ($\ge 90\%$ upper circuit ceiling).

* **180-Day New High Breakout**: Flags stocks recording new 6-month price peaks.

* **Composite Score**: Combines all 5 metrics into a single score out of 100:  
  $$\text{Score}_{\text{Final}} = (w_1 \times \text{Price Rise}) + (w_2 \times Z_{\text{price}}) + (w_3 \times Z_{\text{volume}}) + (w_4 \times \text{Band Persistence}) + (w_5 \times \text{New High})$$

---

## 2. Module 2: Single-Stock Forensic Analysis Workspace (`/analysis/[symbol]`)
**Purpose:** Comprehensive single-stock investigation workspace providing 180-day price/volume trends, participant conduct audits, Client 360° intelligence, trade execution logs, and case note logging.

### Key Capabilities
* **Top Command Bar**: Displays stock symbol, company name, ISIN, risk badge, and direct navigation links to **Forensic Dossiers**, **Audit Logs**, and **Mark Safe / Active** workflow toggles.
* **5 Investigation Tabs**:
  - **Overview Tab**: 5-Parameter Radar Signature, Screener-Style Dual-Axis Master Surveillance Chart (20 & 50 DMA, Volume bars, Live Crosshair Stats Tracker, Screener `D: xx%` Delivery Metric, 15D Window Toggle, Adaptive Date Ticks), and 180-day breakout & band persistence matrix.
  - **Shareholders Tab**: Direct comparative tables for Promoter / Top 1% / Public float (Day $t$ vs $T-180$), PAN Demographics (Unique PANs & Avg Trading PANs 15D vs 180D), and 15-Day Corporate Announcements (`corporate_events_feed`).
  - **Participants Tab**: Participant Suspect Breakdown Table (Net LTP contribution, Buy/Sell volume, Concentration HHI, RTR, MTM PnL), Counterparty Pairs, and DFS Circular Trading Loops.
* **Client 360° Drawer**: 1-click drill-down on any participant PAN displaying legal entity KYC, UCC, DP/BO accounts, Bank details, and demographic profile.

---

## 3. Module 3: Security & System Audit Trail (`/history`)
**Purpose:** Maintains immutable audit logs of regulatory decisions, parameter calibration updates, and system security events (`compliance_audit_logs`).

### Key Capabilities
* **Immutable Audit Trail Table**: Displays timestamp, officer, role, action code, target resource, details, and IP address.
* **Action Code Filtering & Search**: Instant filtering across specific actions and fast keyword search across officers, actions, and targets.
* **CSV Audit Export**: 1-click audit trail extraction for regulatory record keeping.
* **Search & Export**: Supports URL parameter pre-filling (`/history?search=SYMBOL`) and CSV export (`PVASF_System_Audit_Log.csv`).

---

## 4. Module 4: Model Calibration & System Administration (`/settings`)
**Purpose:** Model weight recalibration and system user access control.

### Key Capabilities
* **Model Scoring Calibration Card**: Allows administrators to adjust weights for the 5 parameters or reset them to default framework values ($25\%, 20\%, 25\%, 15\%, 15\%$ and cutoff $15.0$) via a 1-click **Reset to Framework Defaults** button (`RotateCcw`).
* **User Access Management (`SYS_USERS`)**: Displays system users, role assignments (`Admin`, `Analyst`, `Viewer`), and active/inactive status toggles.
* **System Audit Trail**: Shows security audit events logged during administrative actions.
