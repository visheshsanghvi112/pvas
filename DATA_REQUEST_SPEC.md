# PVASF Targeted Data Request Specification
## Minimal Data Extract Requirements for Production Model Execution

**Document Version:** 2.1.0  
**Prepared By:** PVASF Surveillance Development Team  
**Target Audience:** Surveillance Product Manager & Teradata Data Engineering Team  
**Reference Schema Document:** [`PVASF_SCHEMA_REFERENCE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_SCHEMA_REFERENCE.md) (attached)

---

## 1. Executive Context: Minimal Extract Rationale

The Price-Volume Alert Surveillance Framework (PVASF) UI and FastAPI backend modules are fully operational on synthetic schemas matching Teradata warehouse structures (`FACT_TRADES`, `DIM_EXCH_CLNT_DTLS`, `DIM_DEP_CLNT_DTLS`).

To execute our surveillance algorithms against live production market data without requiring a massive, full-database warehouse dump, **this document specifies the exact minimal set of tables, columns, and date ranges required to power the specific modules we have built.**

### Scope & System Compatibility
- **Built Engine Capabilities**: Our current implementation focuses on **Artificial Price Inflation, Volume Pumps, and Conduct Audits** (Price Rise %, Price Z-Score $Z \ge 1.645$, Volume Z-Score $Z \ge 1.645$, Upper Circuit Band Persistence, 180D New Highs, LTP Price Pushers, Same-Broker Wash Trades, and Counterparty Loops).
- **Compatibility with Deflation / Downward Surveillance Systems**: If the organization has existing modules or is building separate alerts for price deflation, short-selling raids, or volatility drops, **the schema request below is 100% compatible**. The trade match columns (`Ftrd_Trd_Price`, `Ftrd_Trd_Qty`, `Ftrd_Trd_Date`, `Ftrd_LTP_Chng_Indc`, `Decl_Clnt_Pan`) support both upward and downward statistical scoring.

---

## 2. Summary of Minimum Required Tables

Out of the hundreds of tables in the production data warehouse, **our system requires access to only 3 core tables**:

| Table Name | Short Code | Full Entity Name | Total Columns in Schema | Minimal Columns Required by Our System |
| :--- | :--- | :--- | :---: | :---: |
| `FACT_TRADES` | `FTRD` | Trade Match Execution Facts | 97 | **18 Columns** |
| `DIM_EXCH_CLNT_DTLS` | `DECL` | Exchange Client Master (PAN Link) | 44 | **7 Columns** |
| `DIM_DEP_CLNT_DTLS` | `DDCL` | Depository Client Master (Demat Accounts) | 45 | **6 Columns** |

> Complete column-by-column schema descriptions for all 3 tables are available in [`PVASF_SCHEMA_REFERENCE.md`](file:///Users/vishesh/Downloads/UI_PVASF%20copy/PVASF_SCHEMA_REFERENCE.md).

---

## 3. Date Range & Baseline Guidelines

- **Default Surveillance Window**: 180 Trading Days ($T-180$) baseline + 15 Trading Days observation window.
- **Dynamic Custom Range Queries**: Analysts require flexibility to run custom date-range investigations (e.g. audit a 30-day window from 6 months ago).

> **Impact on Extract Request**:  
> The system requires access to historical `FACT_TRADES` records (minimum 260 trading days / 1 calendar year), refreshed via a daily EOD batch. The API dynamically filters `Ftrd_Trd_Date BETWEEN date_from AND date_to` at query time.

---

## 4. Module-by-Module Column Requirements & Business Justifications

### Module 1: PVASF Alert Scoring & Watchlist Engine
**Purpose**: Computes 5 shortlisting metric scores and generates the primary risk-ranked watchlist.  
**Source Table**: `FACT_TRADES` (`FTRD`)  

| Column Name | Data Type | Mandatory? | Exact Business Justification & Metric Formula |
| :--- | :--- | :---: | :--- |
| `Ftrd_Symbol` | `VARCHAR` | **YES** | Ticker symbol; primary group-by key for per-scrip calculations. |
| `Ftrd_Trd_Date` | `DATE` | **YES** | Calendar date filter for 180-day baseline and 15-day window. |
| `Ftrd_Trd_Price` | `DECIMAL` | **YES** | Executed price; used as EOD close proxy to compute Price Rise % and Price Z-Score. |
| `Ftrd_Last_Trd_Price` | `DECIMAL` | **YES** | Running LTP; computes 180-day new high breakouts (`max(180D LTP)`). |
| `Ftrd_Trd_Qty` | `DECIMAL` | **YES** | Daily volume; computes Volume Z-Score (15D avg vs 180D rolling mean & stddev). |
| `Ftrd_Sess_Type` | `INTEGER` | **YES** | Session type filter (`2` = Normal Market). Pre-open (`1`) and closing auction (`3`) trades are filtered out. |
| `Ftrd_LTP_Chng_Indc` | `VARCHAR` | **YES** | LTP direction (`+`, `-`, `=`). `+` indicates positive tick movement. |
| `Ftrd_Last_Estd_Hi_Price` | `DECIMAL` | **YES** | Upper price band; evaluates Circuit Band Persistence ($\ge 90\%$ of upper circuit limit). |

---

### Module 2: 180-Day Price & Volume Trend Chart
**Purpose**: Powers the interactive dual-axis price candlestick and volume bar chart in the Security Workspace.  
**Source Table**: `FACT_TRADES` (`FTRD`)  

| Column Name | Data Type | Mandatory? | Exact Business Justification & Chart Element |
| :--- | :--- | :---: | :--- |
| `Ftrd_Symbol` | `VARCHAR` | **YES** | Filter to selected security under investigation. |
| `Ftrd_Trd_Date` | `DATE` | **YES** | X-axis timeline distribution. |
| `Ftrd_Trd_Price` | `DECIMAL` | **YES** | Daily close price trend, 20D and 50D moving average overlays. |
| `Ftrd_Trd_Qty` | `DECIMAL` | **YES** | Daily volume bars and 15D rolling average volume line overlay. |
| `Ftrd_Sess_Type` | `INTEGER` | **YES** | Filters normal trading session (`Sess_Type = 2`). |

---

### Module 3: Participant Conduct Audit & LTP Contribution
**Purpose**: Identifies client PANs driving positive price movement (LTP pushers) and volume concentration.  
**Source Tables**: `FACT_TRADES` (`FTRD`) joined with `DIM_EXCH_CLNT_DTLS` (`DECL`)  

| Table | Column Name | Data Type | Exact Business Justification |
| :--- | :--- | :--- | :--- |
| `FTRD` | `Ftrd_Trd_Tmst` | `TIMESTAMP` | Millisecond execution timestamp to correlate trade execution to LTP tick changes. |
| `FTRD` | `Ftrd_Buy_Exch_Clnt_Token` | `INTEGER` | Buyer client token; joins to `DECL.Decl_Exch_Clnt_Token` to resolve buyer PAN. |
| `FTRD` | `Ftrd_Sell_Exch_Clnt_Token` | `INTEGER` | Seller client token; joins to `DECL.Decl_Exch_Clnt_Token` to resolve seller PAN. |
| `FTRD` | `Ftrd_Init_Side_Type` | `INTEGER` | Aggressor flag (`1`=Buy Aggressive). Aggressive buyers drive price up. |
| `FTRD` | `Ftrd_LTP_Chng_Indc` | `VARCHAR` | `+` flag indicates trade pushed LTP higher. Only `+` trades count for LTP Contribution %. |
| `FTRD` | `Ftrd_Trd_Qty` | `DECIMAL` | Volume per buyer/seller PAN to compute Volume Share %. |
| `FTRD` | `Ftrd_Trd_Val` | `DECIMAL` | Gross buy value vs sell value per PAN to calculate Net Realized/Unrealized P&L. |
| `DECL` | `Decl_Exch_Clnt_Token` | `INTEGER` | Primary key join token from `FTRD`. |
| `DECL` | `Decl_Clnt_Pan` | `VARCHAR` | **Client PAN — primary legal entity identifier for participant grouping.** |
| `DECL` | `Decl_Clnt_Name` | `VARCHAR` | Client full legal name for audit UI. |

---

### Module 4: Counterparty Concentration & Wash Trade Explorer
**Purpose**: Audits synchronized trading between PAN pairs, circular trading, and same-broker wash trades.  
**Source Tables**: `FACT_TRADES` (`FTRD`) joined with `DIM_EXCH_CLNT_DTLS` (`DECL`)  

| Column Name | Data Type | Mandatory? | Exact Business Justification |
| :--- | :--- | :---: | :--- |
| `Ftrd_Buy_Exch_Clnt_Token` | `INTEGER` | **YES** | Buyer token for counterparty pair matrix. |
| `Ftrd_Sell_Exch_Clnt_Token` | `INTEGER` | **YES** | Seller token for counterparty pair matrix. |
| `Ftrd_Buy_Exch_TM_Token` | `INTEGER` | **YES** | Buyer Trading Member (Broker) token. |
| `Ftrd_Sell_Exch_TM_Token` | `INTEGER` | **YES** | Seller Trading Member (Broker) token. |
| `Ftrd_Same_Broker_Wash_Flag`| `INTEGER` | **YES** | Flag `1` indicates buyer & seller matched at the same broker (wash trade). |
| `Ftrd_Diff_Broker_Wash_Flag`| `INTEGER` | **YES** | Flag `1` indicates pre-arranged wash trade across different brokers. |

---

### Module 5: Client 360° Identity Resolution (Exchange + Depository)
**Purpose**: In-context modal cross-referencing exchange client accounts (`DECL`) with depository demat accounts (`DDCL`).  
**Source Tables**: `DIM_EXCH_CLNT_DTLS` (`DECL`) and `DIM_DEP_CLNT_DTLS` (`DDCL`)  

| Table | Column Name | Data Type | Exact Business Justification |
| :--- | :--- | :--- | :--- |
| `DECL` | `Decl_Clnt_Pan` | `VARCHAR` | Join key to `DDCL.Ddcl_Clnt_Pan`. |
| `DECL` | `Decl_TM_Id` | `VARCHAR` | Trading Member Broker ID. |
| `DECL` | `Decl_Clnt_Stat` | `INTEGER` | Account status (`1`=Active, `2`=Suspended). |
| `DECL` | `Decl_City`, `Decl_State` | `VARCHAR` | Geographical audit (detecting out-of-state terminal concentrations). |
| `DDCL` | `Ddcl_Dp_Id` | `VARCHAR` | Depository Participant ID (NSDL / CDSL). |
| `DDCL` | `Ddcl_Clnt_Id` | `VARCHAR` | Demat account client ID. |
| `DDCL` | `Ddcl_Jnt_Hldr1_Pan` | `VARCHAR` | Joint Holder 1 PAN (verifying connected entity networks). |
| `DDCL` | `Ddcl_Poa_Hldr_Pan` | `VARCHAR` | Power of Attorney PAN (detecting entity control hubs). |

---

## 5. Production Teradata Extraction Queries

The following targeted ANSI/Teradata SQL queries extract **only the required data fields** for our modules:

```sql
-- 1. Daily Aggregated OHLCV Extract (Module 1 & Module 2)
SELECT 
    Ftrd_Symbol AS Ticker,
    Ftrd_Trd_Date AS TradeDate,
    MIN(Ftrd_Trd_Price) AS LowPrice,
    MAX(Ftrd_Trd_Price) AS HighPrice,
    SUM(Ftrd_Trd_Qty) AS TradedVolume,
    SUM(Ftrd_Trd_Val) AS TradedValue,
    MAX(Ftrd_Last_Estd_Hi_Price) AS UpperCircuitLimit
FROM FACT_TRADES
WHERE Ftrd_Sess_Type = 2
  AND Ftrd_Trd_Date BETWEEN CURRENT_DATE - 365 AND CURRENT_DATE
GROUP BY Ftrd_Symbol, Ftrd_Trd_Date;

-- 2. Intraday Participant Trade Audit Extract (Module 3 & Module 4)
SELECT 
    f.Ftrd_Trd_Num AS TradeNum,
    f.Ftrd_Trd_Date AS TradeDate,
    f.Ftrd_Trd_Tmst AS TradeTimestamp,
    f.Ftrd_Symbol AS Ticker,
    f.Ftrd_Trd_Price AS TradePrice,
    f.Ftrd_Trd_Qty AS TradeQty,
    f.Ftrd_LTP_Chng_Indc AS LTPChangeIndicator,
    f.Ftrd_Init_Side_Type AS InitiatorSide,
    f.Ftrd_Same_Broker_Wash_Flag AS SameBrokerWashFlag,
    b.Decl_Clnt_Pan AS BuyerPAN,
    s.Decl_Clnt_Pan AS SellerPAN,
    f.Ftrd_Buy_Exch_TM_Token AS BuyerBrokerID,
    f.Ftrd_Sell_Exch_TM_Token AS SellerBrokerID
FROM FACT_TRADES f
JOIN DIM_EXCH_CLNT_DTLS b ON f.Ftrd_Buy_Exch_Clnt_Token = b.Decl_Exch_Clnt_Token
JOIN DIM_EXCH_CLNT_DTLS s ON f.Ftrd_Sell_Exch_Clnt_Token = s.Decl_Exch_Clnt_Token
WHERE f.Ftrd_Trd_Date BETWEEN :DateFrom AND :DateTo
  AND f.Ftrd_Symbol = :TargetSymbol;
```

---

## 6. Table-to-Module Mapping Reference

This table provides a direct cross-reference of the required tables and columns to their specific consuming UI and backend modules, as requested by the data engineering team.

| Source Table | Required Columns | Consuming Module | Purpose / Justification |
| :--- | :--- | :--- | :--- |
| `FACT_TRADES` (`FTRD`) | `Ftrd_Symbol`, `Ftrd_Trd_Date`, `Ftrd_Trd_Price`, `Ftrd_Last_Trd_Price`, `Ftrd_Trd_Qty`, `Ftrd_Sess_Type`, `Ftrd_LTP_Chng_Indc`, `Ftrd_Last_Estd_Hi_Price` | **Module 1**: PVASF Alert Scoring & Watchlist Engine | Feeds the 5 core anomaly algorithms (Price Z, Volume Z, Band Persistence, New High, Price Rise). |
| `FACT_TRADES` (`FTRD`) | `Ftrd_Symbol`, `Ftrd_Trd_Date`, `Ftrd_Trd_Price`, `Ftrd_Trd_Qty`, `Ftrd_Sess_Type` | **Module 2**: 180-Day Price & Volume Trend Chart | Populates the dual-axis candlestick and volume chart on the Security Workspace. |
| `FACT_TRADES` (`FTRD`) | `Ftrd_Trd_Tmst`, `Ftrd_Buy_Exch_Clnt_Token`, `Ftrd_Sell_Exch_Clnt_Token`, `Ftrd_Init_Side_Type`, `Ftrd_LTP_Chng_Indc`, `Ftrd_Trd_Qty`, `Ftrd_Trd_Val` | **Module 3**: Participant Conduct Audit & LTP Contribution | Used to identify which buyers/sellers pushed the price (LTP tick analysis) and volume concentration. |
| `DIM_EXCH_CLNT_DTLS` (`DECL`) | `Decl_Exch_Clnt_Token`, `Decl_Clnt_Pan`, `Decl_Clnt_Name` | **Module 3**: Participant Conduct Audit & LTP Contribution | Translates raw exchange tokens from `FTRD` into actionable Client PANs and Names. |
| `FACT_TRADES` (`FTRD`) | `Ftrd_Buy_Exch_Clnt_Token`, `Ftrd_Sell_Exch_Clnt_Token`, `Ftrd_Buy_Exch_TM_Token`, `Ftrd_Sell_Exch_TM_Token`, `Ftrd_Same_Broker_Wash_Flag`, `Ftrd_Diff_Broker_Wash_Flag` | **Module 4**: Counterparty Concentration & Wash Trade Explorer | Detects circular trading loops, synchronized counterparty pairs, and matched wash trades. |
| `DIM_EXCH_CLNT_DTLS` (`DECL`) | `Decl_Clnt_Pan`, `Decl_TM_Id`, `Decl_Clnt_Stat`, `Decl_City`, `Decl_State` | **Module 5**: Client 360° Identity Resolution | Provides client demographic data, active/suspended status, and geographic location for audits. |
| `DIM_DEP_CLNT_DTLS` (`DDCL`) | `Ddcl_Dp_Id`, `Ddcl_Clnt_Id`, `Ddcl_Jnt_Hldr1_Pan`, `Ddcl_Poa_Hldr_Pan` | **Module 5**: Client 360° Identity Resolution | Cross-references Demat accounts and connected entity networks (Joint Holders, POA). |
