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
  - **Overview Tab**: Displays 5-Parameter Risk Radar Profile, Screener-Style Dual-Axis Master Surveillance Chart (Right Y-Axis: Price with 20 DMA & 50 DMA; Left Y-Axis: Volume with Screener Delivery ratio `D: xx%`; Live Crosshair Stats Subheader; 15D Observation Window Toggle), Anomaly Breakout & Band Persistence Matrix, 15-Day Corporate Announcements, and Shareholder Demographics.
  - **Participants Conduct Tab**: Displays participant Net LTP contribution % (Price Pushers), concentrated volume shares (HHI), counterparty pairs ($PAN_A \leftrightarrow PAN_B$), and trade reversals (RTR %).
  - **Trade Matches (P2P) Tab**: Microsecond Execution Log with Order ID filtering and legal case evidence pinning.
  - **Forensic Dossier Tab**: Investigation journal with case creation, evidence summary, and timeline history.
  - **Intelligence Graph Tab**: Interactive Entity-to-Entity Network visualization with DFS circular loop detection rings.
* **Client 360° Drawer**: 1-click drill-down on any participant PAN displaying legal entity KYC, UCC, DP/BO accounts, Bank details, and demographic profile.

---

## 3. Module 3: Head-to-Head Scrip Comparison (`/compare`)
**Purpose:** Side-by-side comparative analysis of two securities (Scrip A vs Scrip B) to evaluate relative surveillance risk and shared trader overlap.

### Key Capabilities
* **Head-to-Head Hero Cards**: Displays Scrip A (Blue accent) vs Scrip B (Indigo accent) summary cards with direct **Analyze** and **Cases** buttons.
* **PVASF Parameter Scoring Breakdown Tab**: Side-by-side comparison table of all 5 framework parameters with raw metrics, raw scores, weighted points, and variance.
* **Normalized Price Acceleration Curve Tab**: Overlays 180-day price trends rebased to 100% at T-180 baseline.
* **Shared Traders & Accounts Tab**: Identifies shared client PANs active across both securities to detect cross-scrip operator syndicates.

---

## 4. Module 4: Streamlined Forensic Case Dossiers (`/cases`)
**Purpose:** Manages persistent regulatory investigation dossiers for shortlisted scrips.

### Key Capabilities
* **Integrated Header Bar**: Single top bar displaying total dossier count, search bar, status filter tabs (`All`, `Active`, `Pending`, `Closed`), and **New Case Dossier** button.
* **5-Column Case Table**: Displays Target Security (with clickable stock links), Case Title & Description, Priority (`High`, `Medium`, `Low`), Inline Workflow Status Dropdown, and **`Analyze Scrip`** navigation button.
* **Direct 1-Step Case Creation**: Clean modal allowing officers to open a case dossier specifying Target Symbol, Title, Priority, and Initial Findings.

---

## 5. Module 5: Audit Trail & History Log (`/history`)
**Purpose:** Maintains immutable audit logs of regulatory decisions and system security events.

### Key Capabilities
* **Dual-Tab Workspace**:
  - **Case Investigation History Tab**: Displays past case dossiers, scrip links, workflow statuses, and regulatory outcomes.
  - **Security & System Audit Logs Tab**: Displays immutable audit records (`SYS_AUDIT_LOGS`) including timestamp, officer username, role, action, target, details, and IP address.
* **Search & Export**: Supports URL parameter pre-filling (`/history?search=SYMBOL`) and context-aware CSV export (`Case_History.csv` or `System_Audit_Log.csv`).

---

## 6. Module 6: Model Calibration & System Administration (`/settings`)
**Purpose:** Model weight recalibration and system user access control.

### Key Capabilities
* **Model Scoring Calibration Card**: Allows administrators to adjust weights for the 5 parameters or reset them to default framework values ($25\%, 20\%, 25\%, 15\%, 15\%$ and cutoff $15.0$) via a 1-click **Reset to Framework Defaults** button (`RotateCcw`).
* **User Access Management (`SYS_USERS`)**: Displays system users, role assignments (`Admin`, `Analyst`, `Viewer`), and active/inactive status toggles.
* **System Audit Trail**: Shows security audit events logged during administrative actions.
