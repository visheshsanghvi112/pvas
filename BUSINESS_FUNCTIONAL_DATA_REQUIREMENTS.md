# PVASF Business & Functional Data Requirements Specification
## Price Volume Analysis & Surveillance Framework (PVASF)

**Document Purpose:** Outlines the functional data capabilities, mathematical formulas, and business data requirements across all 10 operational modules of the Price-Volume Alert Surveillance Framework (PVASF).  
**Functional Boundary:** Specifies *what* business data capabilities are required and *why* they are needed, leaving physical database table selections, SQL joins, and column mappings to the Data Engineering & DBA teams.

---

## 1. Module 1: Alert Scoring & Watchlist Engine
**Purpose:** Computes 5 shortlisting metric scores (Price Rise %, Price Z-Score, Volume Z-Score, Band Persistence, 180D New Highs) and generates the risk-ranked watchlist.

### Metric Definitions & Formulas
* **Price Rise (%)**: Flags stocks that have rallied hard over the last 6 months.  
  $$\text{Price Rise (\%)} = \left[ \frac{\text{Highest Price}_{\text{15D}} - \text{Price}_{T-180}}{\text{Price}_{T-180}} \right] \times 100$$

* **Price Z-Score ($Z_{\text{price}}$)**: Flags a 15-day price move that's well outside the stock's usual pattern.  
  $$Z_{\text{price}} = \frac{\bar{X}_{\text{15-Day Average Price Change}} - \mu_{\text{180-Day Baseline Mean}}}{\sigma_{\text{180-Day Baseline Std Dev}}}$$

* **Volume Z-Score ($Z_{\text{volume}}$)**: Same idea as above, but for volume — flags an unusual trading-activity spike.  
  $$Z_{\text{volume}} = \frac{\bar{X}_{\text{15-Day Average Volume}} - \mu_{\text{180-Day Baseline Mean}}}{\sigma_{\text{180-Day Baseline Std Dev}}}$$

* **Price Band Persistence**: Flags a stock that keeps getting stuck near its upper circuit — a sign of artificial price locking.  
  $\text{Band Persistence Score} = \text{based on the Band Hit Count (15D)}$ ($\text{High}_t \ge 0.90 \times \text{Upper Circuit Ceiling}$).

* **180-Day New High Breakout**: Flags a stock that keeps breaking its own 6-month high — a sign of a manufactured rally.  
  $\text{New High Score} = \text{based on the New High Count (15D)}$ ($\text{High}_t > \max_{j=T-180}^{t-1} \text{High}_j$).

* **Composite Scoring**: All 5 scores are combined into one final ranking score for the watchlist.  
  $$\text{Score}_{\text{Final}} = (w_1 \times \text{Price Rise}) + (w_2 \times Z_{\text{price}}) + (w_3 \times Z_{\text{volume}}) + (w_4 \times \text{Band Persistence}) + (w_5 \times \text{New High})$$

### Functional Business Data Required

| Functional Business Data Needed | Business Need & Consuming Metric | Data Horizon / Frequency |
| :--- | :--- | :--- |
| **Security Symbol & Ticker** | Primary security identifier for group-by scrip baseline calculations | Master Data |
| **Trading Calendar Date** | Date key for 180-day baseline and 15-day observation window | Daily EOD |
| **Daily Closing Price (30-min VWAP Close)** | Computes Price Rise % and Price Z-Score against T-180 baseline | Rolling 180 Days |
| **Daily Opening, High & Low Prices** | OHLC candlestick rendering and intraday circuit band hit checks | Rolling 180 Days |
| **Daily Traded Volume** | Total aggregate volume; computes rolling 15D vs 180D Volume Z-Score | Rolling 180 Days |
| **Daily Upper Circuit Limit Ceiling** | Daily assigned upper price band ceiling; computes Band Persistence ($\ge 90\%$) | Daily EOD / Rolling 15 Days |

---

## 2. Module 2: 180-Day Price & Volume Trend Chart
**Purpose:** For the interactive dual-axis price and volume trend chart in the dashboard.

### Visual & Analytical Requirements
* **Price Chart**: Daily close price is plotted across 180 trading days, with MA-20, MA-50, and the 180-day peak shown as reference lines. The most recent 15 days are highlighted as the active observation window.
* **Volume Chart**: Daily volume is shown as bars, with the 15-day average plotted as an overlay so a spike stands out against the normal baseline.

### Functional Business Data Required

| Functional Business Data Needed | Business Need & Visual Component | Data Horizon / Frequency |
| :--- | :--- | :--- |
| **Security Symbol & Ticker** | Security filter key | Master Data |
| **Timeline Trade Date** | Date axis for 180-day trend timeline rendering | Rolling 180 Days |
| **Daily OHLC Price Bars** | Candlestick bars, 20D MA line, 50D MA line, and 180D peak ceiling line | Rolling 180 Days |
| **Daily Traded Volume** | Daily volume bar chart and rolling 15-day average volume overlay line | Rolling 180 Days |

---

## 3. Module 3: Participant Conduct Audit & Net LTP Contribution
**Purpose:** Identifies each client PAN's overall net impact on the scrip's LTP — combining both the upward pushes and the downward pulls a PAN is responsible for — plus volume concentration.

### Metric Definitions & Formulas
* **Net LTP Contribution % (Price Movers)**: Shown on the LTP Contribution chart — ranks PANs by their overall net effect on the scrip's LTP over 15 days. A PAN's upward-pushing trades count as a positive contribution and its downward-pulling trades count as a negative contribution; the two are netted together to give each PAN's true directional impact, rather than only surfacing the price pushers.  
  $$\text{Net LTP Contribution (\%)} = \frac{\sum_{15\text{D}} (\text{Positive LTP Contribution of PAN}) - \sum_{15\text{D}} (\text{Negative LTP Contribution of PAN})}{\text{Net LTP Movement of Scrip over 15D}} \times 100$$

* **Volume Share % (Dominance Metric)**: Shown on the Concentrated Volume Share table — calculates each PAN's volume as a percentage of the scrip's total volume over 15 days.  
  $$\text{Volume Share (\%)} = \frac{\text{Individual PAN Volume over 15D}}{\text{Total Scrip Volume over 15D}} \times 100$$

* **Net Realized / Unrealized P&L (Top 5 Profit-Makers)**: Sell value minus buy value per PAN over the 15-day window, to flag who's been taking profit during a rally.

### Functional Business Data Required

| Functional Business Data Needed | Business Need & Audit Role | Data Horizon / Frequency |
| :--- | :--- | :--- |
| **Client PAN & Legal Name** | Legal entity identifier and client full legal name for participant grouping | Master Data |
| **Client Daily Buy & Sell Volumes** | Individual client buy/sell volumes for Volume Share % calculation | Rolling 15 Days |
| **Positive & Negative LTP Push Values** | Attributes upward price pushes and downward price pulls to specific PANs | Rolling 15 Days |
| **Wash Trade Matched Quantity** | Aggregated self-matched or same-broker trades executed by a single client | Rolling 15 Days |
| **Net Realized P&L (Buy/Sell Value)** | Sell value minus buy value per client to flag top 5 profit-makers | Rolling 15 Days |

---

## 4. Module 4: Counterparty Concentration
**Purpose:** Audits synchronized trading between PAN pairs and circular trading loops.

### Metric Definitions & Formulas
* **Counterparty Pair Share % (Circular Trading Metric)**: Shown on the Counterparty Pair Concentration table and the circular network graph. The Buyer Client Token and Seller Client Token resolve to Buyer PAN and Seller PAN, and the traded quantity between each buyer–seller PAN pair is aggregated over the 15-day window as a percentage of the scrip's total volume.  
  $$\text{Counterparty Pair Share (\%)} = \frac{\text{Traded Volume within PAN Pair over 15D}}{\text{Total Scrip Volume over 15D}} \times 100$$

### Functional Business Data Required

| Functional Business Data Needed | Business Need & Audit Role | Data Horizon / Frequency |
| :--- | :--- | :--- |
| **Buyer PAN & Seller PAN Identifiers** | Resolves buyer and seller exchange tokens into buyer–seller PAN pairs | Rolling 15 Days |
| **Matched Pair Traded Quantity & Value** | Traded volume and matched turnover value between specific PAN pairs | Rolling 15 Days |
| **Pairwise Positive & Negative LTP Push** | Net price movement contributed specifically by trades within the counterparty pair | Rolling 15 Days |
| **Multi-Node Circular Loop Topology** | Circular trade graph ring detection ($A \rightarrow B \rightarrow C \rightarrow A$) between connected PANs | Rolling 15 Days |

---

## 5. Module 5: Client Identity Resolution (Exchange + Depository)
**Purpose:** In-context modal cross-referencing exchange client accounts with depository demat accounts.

### Entity Resolution Requirements
* **Demat & Entity Resolution**: When I click a Client PAN in the UI, I want the exchange-side details and the depository-side details pulled up together against that same PAN — account status, broker ID, demat ID, joint holder, and POA holder.

### Functional Business Data Required

| Functional Business Data Needed | Business Need & Entity Resolution Role | Data Horizon / Frequency |
| :--- | :--- | :--- |
| **Client PAN & Full Legal Name** | Primary legal entity identifier connecting exchange accounts to demat profiles | Master Data |
| **Trading Member (Broker) ID & Status** | Exchange Trading Member ID and account registration status (ACTIVE / SUSPENDED) | Master Data |
| **Depository Participant (DP) ID & BO Demat ID**| Depository Participant (DP) ID and Beneficiary Owner Demat Account Number | Master Data |
| **Joint Holders & POA Holder PAN Networks** | Joint Holder 1 PAN, Joint Holder 2 PAN, and Power of Attorney (POA) Holder PAN | Master Data |

---

## 6. Module 6: Shareholder Statistics (Promoter & Public Shareholding)
**Purpose:** Audits unique PAN-holder count trends, promoter & top 1% shareholdings on day $t$ vs day $T-180$, and promoter pledged shares (strictly matching core framework specification Section 5.3).

### Shareholder Statistics & Ownership Requirements
* **Unique PAN-Holders Count**: Number of unique PAN-holders in scrip on day $t$ & day $T-180$.
* **Average Trading PANs**: Average number of unique PANs trading in scrip in past 15 days & past 180 days.
* **Promoter & Top 1% Shareholding**: Number of shares held by promoters and top 1% shareholders on day $t$ & day $T-180$, including promoter share pledging percentage and promoter entity breakdowns.
* **Public Float Breakdown**: Breakdown of non-promoter holdings (public float), institutional holdings (FPIs/DIIs), Differential Voting Rights (DVR), Depository Receipts (ADR/GDR), and locked-in shareholding.

### Functional Business Data Required

| Functional Business Data Needed | Business Need & Shareholding Audit Role | Data Horizon / Frequency |
| :--- | :--- | :--- |
| **Unique PAN-Holders Count (Day t & T-180)** | Total unique PAN equity holders on day $t$ vs baseline day $T-180$ | Day $t$ & $T-180$ |
| **Average Trading PAN Count (15D & 180D)** | Average number of active trading PANs in past 15 days vs past 180 days | Rolling 15D / 180D |
| **Promoter & Top 1% Shareholdings** | Shares held by promoters and top 1% shareholders on day $t$ vs day $T-180$ | Day $t$ & $T-180$ |
| **Promoter Share Pledging Percentage** | Percentage of promoter-held shares pledged as collateral | As of Day $t$ & $T-180$ |
| **Promoter Entity Names & Holdings** | Specific names of promoter entities and individual promoter equity percentages | As of Day $t$ & $T-180$ |

---

## 7. Module 7: Corporate Announcements & News Feed
**Purpose:** Displays disclosures and corporate news filed by the company in the past 15 days to cross-reference trading spikes against legitimate corporate events.

### Disclosure Requirements
* **Corporate Announcements (Past 15 Days)**: Details of official corporate announcements made in past 15 days, including category, disclosure narrative text summary, filing timestamp, and record dates.
* **News Feed**: Real-time / daily price-sensitive news disclosures to verify if price and volume movement aligns with public news or indicates unannounced insider/pump activity.

### Functional Business Data Required

| Functional Business Data Needed | Business Need & Announcement Role | Data Horizon / Frequency |
| :--- | :--- | :--- |
| **Security Symbol & Category** | Security symbol and corporate announcement category/subject | As-Announced |
| **Disclosure Narrative Text Summary** | Official text summary of disclosure filed by company in past 15 days | Past 15 Days |
| **Filing Timestamp & Effective Record Date** | Official timestamp when announcement was filed and effective record date | Past 15 Days |

---

## 8. Module 8: Financial Results
**Purpose:** Evaluates financial performance indicators to check if the scrip's price movement correlates with actual business fundamentals.

### Fundamental Requirements
* **Quarterly Financial Indicators**: Key financial metrics across recent reporting quarters — Revenue/Turnover, Operating Profit (EBITDA), Net Profit (PAT), Earnings Per Share (EPS), and Debt-to-Equity ratio.
* **Fundamental Anomaly Correlation**: Cross-references price rallies against financial growth to flag stocks experiencing extreme price inflation despite weak, stagnant, or negative financial performance.

### Functional Business Data Required

| Functional Business Data Needed | Business Need & Fundamental Role | Data Horizon / Frequency |
| :--- | :--- | :--- |
| **Quarterly Revenue / Turnover** | Total operating revenue to evaluate company scale and growth | Quarterly |
| **Operating Profit (EBITDA)** | Operating profit before interest, taxes, depreciation, and amortization | Quarterly |
| **Net Profit After Tax (PAT) & EPS** | Net profit after tax and earnings per share across reporting quarters | Quarterly |
| **Debt-to-Equity Ratio** | Capital structure leverage ratio to evaluate financial distress risks | Quarterly |

---

## 9. Module 9: Corporate Actions
**Purpose:** Tracks corporate action events (Bonuses, Splits, Dividends, Rights Issues) and applies price dilution factors to adjust historical price baselines and prevent false alerts.

### Corporate Action Requirements
* **Corporate Actions & Ex-Dates**: Details of corporate action events including Bonus issues (e.g., 1:1), Stock Splits (e.g., 10:1), Dividends, Ex-Dates, and Record Dates.
* **Price Dilution Factor Adjustment**: Multiplicative/divisive price adjustment factor applied to historical prices (T-180 to T-15) so price drops caused by ex-corporate action dates do not trigger false alerts or distort baseline calculations.

### Functional Business Data Required

| Functional Business Data Needed | Business Need & Dilution Role | Data Horizon / Frequency |
| :--- | :--- | :--- |
| **Corporate Event Category & Purpose** | Type of event (Bonus Issue, Stock Split, Dividend) and purpose description | Event-Driven |
| **Ex-Date & Record Date** | Calendar ex-date and official record date of corporate event | Event-Driven |
| **Price Dilution Adjustment Factor** | Multiplicative factor (e.g. 0.50 for 1:1 bonus) to adjust T-180 historical prices | Event-Driven |

---

## 10. Module 10: User Profiles, Accessibility Permissions, Assignment of Alphabetics & Risk Scoring Controls
**Purpose:** Controls user identity, role-based access permissions, assignment of scrip alphabets to surveillance officers, scoring model weights, risk tier cutoffs, forensic case dossiers, and security audit logs.

### System Governance Requirements
* **User Profiles & Accessibility Permissions**: User accounts, credentials, and role-based access control (Admin, Analyst, Viewer/Auditor) governing access to model settings, case dossiers, and audit trails.
* **Assignment of Alphabetics to Users**: From among the alphabets allocated to the surveillance officer, watchlisted scrips are alphabetically distributed based on allotted alphabets (e.g., Officer A handles scrips starting with A–D).
* **Weights and Thresholds of High, Medium, Low Risk Scores**: Configurable weights (w1 to w5) for the composite scoring model, parameter score cutoff ranges, and threshold scores defining High Risk (Score ≥ 15), Medium Risk (Score 10–14), and Low Risk (Score < 10) watchlist scrips.

### Functional Business Data Required

| Functional Business Data Needed | Business Need & Governance Role | Data Horizon / Frequency |
| :--- | :--- | :--- |
| **User Profile & Credentials** | Username, email, department, and RBAC roles (Admin, Analyst, Viewer) | System Master |
| **Officer Alphabet Allocations** | Allocated symbol alphabets assigned to surveillance officer (e.g. A–D) | System Master |
| **Model Weights & Score Cutoffs** | Configurable scoring model weights (w1 to w5) and risk threshold scores | System Settings |
| **Security Audit Log Entries** | Immutable event logs capturing user actions, IP address, and resource access | Real-Time Log |
| **Forensic Case Dossier Fields** | Case ID, target scrip, lead officer, priority, lifecycle status, and pinned evidence | Case-Driven |

---

## Consolidated Summary — All Modules (1 to 10)

| Module ID | Module Name | Primary Business Need | Functional Data Capabilities Required | Data Horizon / Frequency |
| :--- | :--- | :--- | :--- | :--- |
| **Module 1** | **Alert Scoring & Watchlist Engine** | Computes 5 anomaly metric scores & composite risk ranking for triage | Daily OHLC, VWAP Close, Traded Volume, Upper Circuit Limit | Daily EOD / Rolling 180 Days |
| **Module 2** | **180-Day Price & Volume Trend Chart** | Interactive dual-axis candlestick price trends, moving averages & volume bars | OHLC Prices, MA-20, MA-50, 180D Peak High, 15D Volume MA Overlay | Daily EOD / Rolling 180 Days |
| **Module 3** | **Participant Conduct Audit & Net LTP Contribution** | Attributes upward/downward price moves to client PANs, volume share & P&L | Client PAN, Legal Name, Buy/Sell Volume, Pos/Neg LTP Push, Wash Trades, Net P&L | Daily EOD / Rolling 15 Days |
| **Module 4** | **Counterparty Concentration** | Audits synchronized buyer-seller PAN pairs & circular trade loops | Buyer PAN, Seller PAN, Matched Qty, Matched Value, Pair LTP Push, Loop Graph | Daily EOD / Rolling 15 Days |
| **Module 5** | **Client Identity Resolution (Exchange + Depository)** | Cross-references exchange client accounts with depository demat accounts in 360° modal | Client PAN, Legal Name, Broker ID, Status, DP ID, Demat BO ID, Joint/POA PANs | Master Data / On-Demand |
| **Module 6** | **Shareholder Statistics (Promoter & Public)** | Audits unique PAN count trends, promoter & top 1% shares on day $t$ vs $T-180$, and pledge % | Unique PANs (Day $t$ & $T-180$), Avg Trading PANs (15D & 180D), Promoter & Top 1% Shares | Day $t$ & $T-180$ Comparison |
| **Module 7** | **Corporate Announcements & News Feed** | Displays company disclosures & news to cross-reference trading spikes against announcements | Category, Disclosure Narrative, Filing Timestamp, Effective Record Dates | Past 15 Days / As-Announced |
| **Module 8** | **Financial Results** | Evaluates quarterly revenues, profits & fundamentals to detect shell-company manipulation | Revenue, EBITDA, Net Profit (PAT), EPS, Debt-to-Equity Ratio | Quarterly |
| **Module 9** | **Corporate Actions** | Applies dilution adjustment factors for bonuses/splits to normalize historical price baselines | Event Category (Bonus/Split), Ex-Date, Record Date, Dilution Factor Adjustment | Event-Driven / Rolling 180 Days |
| **Module 10**| **User Profiles, RBAC, Alphabetics & Risk Controls** | User management, RBAC security roles, alphabet scrip allocation, model weights & audit logs | User Profiles, Roles (`Admin`/`Analyst`), Alphabet Allocation, Weights ($w_1\dots w_5$), Audit Logs | System Master / Real-Time Log |
