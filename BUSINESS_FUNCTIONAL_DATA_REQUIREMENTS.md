# PVASF Business & Functional Data Requirements Specification
## High-Level Functional Data Needs for Data Engineering & Database Administration Teams

**Document Version:** 1.0.0 (Functional & Business Perspective)  
**Target Audience:** Lead Data Architect, Database Administrator (DBA) & Data Engineering Teams  
**Purpose:** Outlines the functional data capabilities required by each operational module of the Price-Volume Alert Surveillance Framework (PVASF). This document specifies *what* data capabilities are required and *why* they are needed, leaving physical database table selections, joins, and column mappings to the Data Engineering team.

---

## 1. Project Overview & Data Objective

The **Price-Volume Alert Surveillance Framework (PVASF)** is an institutional-grade market conduct surveillance system designed to detect price manipulation, artificial price inflation, volume pump schemes, circular trading rings, and wash trades.

To operate the surveillance models, the system requires business data spanning **daily security price/volume baselines, participant-level trade summaries, client identity profiles, quarterly shareholding distributions, and corporate action disclosures**.

---

## 2. Module-by-Module Functional Data Requirements

### 2.1 Module 1: Alert Scoring & Watchlist Engine
- **Business Purpose**: Evaluates 5 statistical anomaly metrics (Price Rise, Price Z-Score, Volume Z-Score, Circuit Band Persistence, 180-Day New High Breakouts) to calculate a composite risk score ($0 \dots 100$) for scrip triage.
- **Functional Data Required**:
  1. **Historical Timeline**: 180 trading days of historical data for every listed security ($T-180$ to $T$).
  2. **Daily Security Prices**: Daily Opening Price, Intraday High Price, Intraday Low Price, and Official Closing Price (or 30-minute VWAP Close).
  3. **Daily Traded Volume**: Total aggregate quantity of shares traded per security per day.
  4. **Circuit Band Limits**: Daily assigned Upper and Lower price band percentage limits assigned by the exchange.

---

### 2.2 Module 2: 180-Day Price & Volume Trend Chart
- **Business Purpose**: Renders interactive dual-axis candlestick price trends, moving averages (20D / 50D MA), and volume bar charts for investigation analysis.
- **Functional Data Required**:
  1. **Time-Series OHLCV Bar Data**: Sequential 180-day price bars (Open, High, Low, Close) and total volume per trading day.
  2. **Trading Session Filtering**: Filter to distinguish normal market trading hours from pre-open or post-closing auction sessions.

---

### 2.3 Module 3: Participant Conduct Audit & LTP Pushers
- **Business Purpose**: Identifies specific investors/entities (PANs) driving upward price movements, dominating trading volume, or extracting profits.
- **Functional Data Required**:
  1. **Client Identification**: Legal entity identifier (Client PAN) and legal name for all active market participants.
  2. **Client Volume Aggregates**: Total daily buy volume and total daily sell volume aggregated per client per security.
  3. **Price Impact (LTP Push)**: Value/percentage contribution of each client's aggressive buy orders toward positive price changes in the security over a rolling 15-day window.
  4. **Matched Wash Trade Quantities**: Aggregated volume of self-matched or same-broker trades executed by a single client.

---

### 2.4 Module 4: Counterparty Concentration & Circular Trade Explorer
- **Business Purpose**: Uncovers coordinated trading rings, synchronized buyer-seller pairs, and circular trade loops where shares cycle between specific entities.
- **Functional Data Required**:
  1. **Buyer-Seller Pair Matching**: Volume and value traded directly between specific Buyer PAN and Seller PAN pairs over a 15-day window.
  2. **Pairwise Price Impact**: Positive price movement contributed by specific buyer-seller pairs.

---

### 2.5 Module 5: Client 360° Identity Resolution
- **Business Purpose**: Provides compliance officers with a 360-degree profile of any flagged participant, linking trading accounts to demat beneficiary holdings and connected entity networks.
- **Functional Data Required**:
  1. **Exchange Account Profile**: Legal name, PAN, Trading Member (Broker) ID, registration status (Active/Suspended), and address details.
  2. **Depository Demat Profile**: Demat Beneficiary Owner Account numbers (NSDL / CDSL) and Depository Participant (DP) IDs.
  3. **Connected Entity Network**: Joint holder PANs and Power of Attorney (POA) holder PANs associated with the demat account.

---

### 2.6 Module 6: Enterprise Shareholding Results
- **Business Purpose**: Audits quarterly ownership structure to evaluate promoter control, public float available for trading, and promoter share pledges.
- **Functional Data Required**:
  1. **Quarterly Distribution**: Last 4 quarters of shareholding distribution broken down by category (Promoter Group vs. Public Float).
  2. **Promoter Entity Breakdown**: Specific names and share percentages of major promoter entities.
  3. **Pledged Share Percentage**: Percentage of promoter-held shares pledged as collateral.

---

### 2.7 Module 7: Corporate Actions & Disclosures
- **Business Purpose**: Displays corporate announcements and applies dilution adjustment factors to prevent false-positive alerts caused by genuine corporate events (e.g. 1:1 Bonus, Stock Splits, Dividends).
- **Functional Data Required**:
  1. **Corporate Announcements**: Category, purpose, and record date of official corporate disclosures in the last 15 days.
  2. **Dilution Factors**: Price adjustment factor (e.g. 0.50 for a 1:1 bonus issue) to adjust historical price baselines.

---

### 2.8 Module 8: Forensic Case Dossier Workspace
- **Business Purpose**: Allows compliance officers to create, manage, advance status, and pin chart/trade evidence for formal regulatory investigations.
- **Functional Data Required**:
  1. **Case Management Fields**: Case ID, target security symbol, case title, assigned officer, priority, status lifecycle (`Open`, `Under Review`, `Escalated`, `Closed`), and JSON evidence store.

---

### 2.9 Module 9: RBAC Security & Audit Trail
- **Business Purpose**: Enforces Role-Based Access Control (`ADMIN`, `ANALYST`, `AUDITOR`) and maintains an immutable security audit log.
- **Functional Data Required**:
  1. **User Credentials & Roles**: Username, email, SHA-256 hashed password, and role permissions.
  2. **Audit Event Logs**: Immutable log of user actions, timestamp, target resource, and client IP address.

---

## 3. Summary of Functional Capabilities Required

| Functional Area | Business Need | Frequency / Horizon |
| :--- | :--- | :--- |
| **Security Price/Volume Baselines** | Daily OHLC, VWAP Close, Volume & Circuit Limits | Daily EOD / Rolling 180 Days |
| **Participant Trade Summaries** | Client-level buy/sell volumes, LTP push, wash trade totals | Daily EOD / Rolling 15 Days |
| **Counterparty Concentration** | Pairwise matched traded volume and circular trade loops | Daily EOD / Rolling 15 Days |
| **Client Demographics & Demat** | PAN lookup, joint holders, POA networks, active/suspended status | Master Data / On-Demand |
| **Shareholding & Corporate Actions**| Quarterly float %, promoter pledge %, bonus/split adjustments | Quarterly & As-Announced |
| **Forensic Dossiers & Security Logs**| Investigation dossiers, pinned evidence, RBAC audit trails | Real-Time / Event-Driven |
