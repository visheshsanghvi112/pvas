# PVASF UI/UX BLUEPRINT: Enterprise Surveillance Experience
**Document Version**: 1.0.0
**Design Philosophy**: High-density, context-preserving, investigation-optimized workspace (Bloomberg / Refinitiv / Palantir paradigm).

---

## 1. Global Design System

### 1.1 Typography Hierarchy
*Enterprise applications require strict typographical hierarchy to manage high information density.*
* **Header (24px, Bold)**: Page context (e.g., `ALPHATECH`).
* **Section (14px, Semi-Bold, Uppercase)**: Panel dividers (e.g., `PARTICIPANT AUDIT`).
* **Metric Value (16px/20px, Mono/Bold)**: Core numbers (e.g., `88`, `15.2M`).
* **Label (11px, Medium, Slate-500)**: Descriptions for metrics (e.g., `15-Day Avg Vol`).
* **Data Table (12px, Mono)**: Dense tabular data for alignment and scannability.

### 1.2 Semantic Color System
*Avoid random colors; use strict semantic meaning.*
* **Critical Risk / Alert**: `Red-600` (Score >= 75, Wash Trades, Circuit Hits).
* **Elevated Risk / Warning**: `Orange-500` (Score >= 60, High Concentration).
* **Normal / Baseline**: `Green-600` (Score < 60).
* **Information / Context**: `Blue-600` (Neutral data, clickable links, active tabs).
* **Backgrounds / Surface**: `Slate-50` for app background, `White` for panels, `Slate-100` for table headers.
* **Borders**: `Slate-200` for crisp, defined boundaries (no soft shadows).

### 1.3 Density & Spacing
* **Padding**: Minimal. Use 8px to 12px panel paddings instead of 24px.
* **Layout**: Grid-based. Maximize screen real estate. Eliminate "white space" by filling it with contextual micro-charts (sparklines) or historical comparisons.

---

## 2. Screen & Component Inventory

### 2.1 The Dashboard (Market Overview)
**Goal**: Immediate triage. What is happening, what is urgent, what needs investigation?
* **Top Navigation Bar**: Global Search (Symbol/PAN), Active Cases, System Status.
* **Market Overview Strip**: Dense row of macro stats (Total Scrips, High Risk Count, Total Wash Vol).
* **Risk Heatmap / Distribution**: Visual representation of the market's risk profile today.
* **Watchlist Data Grid (Dense)**: 
  * Columns: Symbol, Risk Score (with dot indicator), Price Change, Volume, Price Z, Vol Z, Circuit Hits, Participants count.
  * Interaction: Clicking a row opens the **Investigation Workspace**.

### 2.2 The Investigation Workspace (Single-Page App Paradigm)
**Goal**: Complete an investigation without ever leaving the page.
* **Sticky Header**: Scrip info, Risk Score, Open Case status.
* **Metric Strip**: Dense row of the 5 core PV metrics with historical context.
* **Main Content Area**: Tabbed interface (Overview, 180-Day Chart, Participants, Trades Log, Case Notes).
* **Contextual Drawers / Modals**: Clicking entities (PANs, Trades) opens overlays without losing the background context.

---

## 3. High-Fidelity Wireframes

### 3.1 Investigation Workspace Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔍 Search Scrip or PAN...              [Dashboard] [Compare] [Cases]      [User Admin] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ALPHATECH  |  Risk: 88 🔴 HIGH  |  NSE / BSE  |  Tech Sector  |  [+ Assign to Case]    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PRICE RISE      VOLUME Z        PRICE Z         BAND HITS       NEW HIGHS              │
│ +124.5% 🔴      4.12 🔴         3.65 🔴         12 Days 🔴      4 Days 🟠              │
│ T-180: ₹1050    Avg: 4.2M       Avg: ₹1800      15d Window      15d Window             │
├─────────────────────────┬───────────────────────┴───────────────┬──────────────────────┤
│ [180-Day Chart]         │ [Participants] [Trades] [Case Notes]  │ 📌 Case Dossier      │
│                         ├───────────────────────────────────────┤                      │
│ 📈 (Dual Axis Chart)    │ TOP LTP CONTRIBUTORS                  │ [x] Wash Trade Log   │
│ Price Candlesticks      │ PAN          VOL       LTP%   PROFIT  │ [x] Chart Snapshot   │
│ 15d Moving Average      │ UAQK...4052  56.3K     22%    +1.2M   │                      │
│ Upper/Lower Circuits    │ QZHP...2759  55.9K     18%    +0.9M   │ Status: Open         │
│                         │                                       │ Officer: Sanskar     │
│ 📊 (Volume Bars)        │ COUNTERPARTY CONCENTRATION            │                      │
│ Vol Spikes Highlighted  │ PAN A        PAN B      VOL    SHARE  │                      │
│                         │ FEOQ...1077  MQMD...644  16K   5.3%   │                      │
│ 📢 (Event Pins)         │ ACAW...2646  GBWE...563  14K   4.8%   │                      │
│ Board Meeting (T-12)    │                                       │                      │
└─────────────────────────┴───────────────────────────────────────┴──────────────────────┘
```

### 3.2 Client 360° Drawer (Contextual Overlay)
*Triggered by clicking a PAN in the Participant table.*

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 👤 CLIENT 360° PROFILE (SLIDES IN FROM RIGHT)                       [X] │
├─────────────────────────────────────────────────────────────────────────┤
│ PAN: UAQKQ4052Y    |    Name: Aarav Trading LLC    |    Risk: HIGH      │
├─────────────────────────────────────────────────────────────────────────┤
│ EXCHANGE ACCOUNTS (DECL)                                                │
│ TM ID: TM00001 (Apex Sec) | Client Code: C-9912 | Terminals: 4          │
│ TM ID: TM00005 (Elite)    | Client Code: C-1144 | Terminals: 1          │
├─────────────────────────────────────────────────────────────────────────┤
│ DEPOSITORY ACCOUNTS (DDCL)                                              │
│ DP ID: IN300012 | Acc: 10000045 | NSDL | Active                         │
│ Joint Holders: QZHPD2759Y (Matched as Counterparty!)                    │
│ PoA: Yes (TM00001)                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ TRADING HISTORY (LAST 15 DAYS)                                          │
│ ALPHATECH: 56.3K Vol | SBIN: 12.1K Vol | NOVAENERGY: 0 Vol              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Interaction Flows

To preserve mental context, navigation is strictly hierarchical and modal-driven where appropriate:

1. **Dashboard Row Click** $\rightarrow$ Replaces screen with **Investigation Workspace** for that stock.
2. **Tab Click (e.g., Trades)** $\rightarrow$ Swaps main content area instantly. No page reload.
3. **PAN Click (Anywhere)** $\rightarrow$ Opens **Client 360° Drawer** from the right side of the screen. Analyst can review, copy data, and dismiss the drawer without losing their place on the chart or trade log.
4. **Trade Row Click** $\rightarrow$ Opens **Order Book Depth Modal** centered on screen, detailing the micro-second book state at execution.
5. **Pin to Case** $\rightarrow$ Clicking a "Pin" icon on a chart or table instantly updates the sticky "Case Dossier" panel on the right sidebar.

---

## 5. Next Steps for Implementation

1. **Phase 1**: Overhaul the global layout shell. Remove the left sidebar module-navigation; implement a dense top-nav for global search and context switching.
2. **Phase 2**: Implement the Single Investigation Workspace. Consolidate `/investigations`, `/trades`, and `/cases` into a unified tabbed view.
3. **Phase 3**: Build the Slide-out Drawers (Client 360) and Modals (Order Depth).
4. **Phase 4**: Apply the new density, typography, and semantic color rules across all components (DataTables, MetricCards, Charts).
