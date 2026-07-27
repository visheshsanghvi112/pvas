# PVASF Institutional Data Requirement & Extraction Specification

**Document Version:** 2.0.0  
**Prepared For:** Surveillance Product Manager & Teradata Data Engineering Team  
**System Target:** Price-Volume Alert Surveillance Framework (PVASF)  

---

## Executive Overview & Business Purpose

The **Price-Volume Alert Surveillance Framework (PVASF)** frontend and backend modules have been fully implemented, integrated, and validated against synthetic database schemas. The surveillance engine evaluates 5 statistical shortlisting metrics over a 180-day baseline and audits intraday trade execution logs to detect market manipulation schemes.

To transition from synthetic development data to live exchange analytics, we require a targeted extract of historical and ongoing production market data from the Teradata Data Warehouse. 

This document specifies:
1. **Which tables and columns** are mandatory for each surveillance module.
2. **Business justifications** for every requested column to ensure compliance with minimal-extract data governance.
3. **Production Teradata SQL queries** for data extraction.
4. **SLA, transmission, and PII security requirements**.

> **Scope Boundary (Current Phase — Artificial Price Inflation Focus):**  
> As defined in the PVASF core specification, the surveillance engine shortlists high-risk scrips using five right-tail metric parameters: Price Rise %, Price Z-Score ($Z \ge 1.645$), Volume Z-Score ($Z \ge 1.645$), Upper Circuit Band Persistence, and 180-Day New High Breakouts. The current phase targets **artificial price inflation and coordinated upward volume manipulation**. Downward price manipulation (deflation/short-selling raids) uses the same schema structure but is out of scope for the current scoring phase.

---

## Summary of Datasets Required

| Dataset ID | Dataset Name | Source Teradata Table / Feed | Primary Key | Refresh Frequency | Core Surveillance Module Powered |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DS-01** | **Trade Match Execution Log** | `FACT_TRADES` (`FTRD`) | `Ftrd_Trd_Num` | Daily EOD Batch | Watchlist Scoring, 180D Chart, Trade Explorer, LTP Pushers, Wash Trades |
| **DS-02** | **Exchange Client Master** | `DIM_EXCH_CLNT_DTLS` (`DECL`) | `Decl_Exch_Clnt_Token` | Daily EOD Delta | Participant PAN Resolution, Volume Share per Client, Trading Member Audit |
| **DS-03** | **Depository Client Master** | `DIM_DEP_CLNT_DTLS` (`DDCL`) | `Ddcl_Clnt_Token` | Daily EOD Delta | Client 360° Identity Resolution (Cross-referencing NSDL/CDSL Demat Accounts) |
| **DS-04** | **Corporate Announcements Feed** | `SCRIP_ANNOUNCEMENTS` | `Ticker`, `AnnouncementDate` | Daily EOD | Material Disclosure Timeline Correlation (Validating price surges against news) |
| **DS-05** | **Shareholding Pattern Archives** | `SCRIP_SHAREHOLDING` | `Ticker`, `Quarter` | Quarterly / Monthly | Float Analysis, Promoter % Shift, Top 1% Ownership Concentration |

---

## Historical Windows & Date Range Guidelines

- **Default Framework Baseline**: 180 Trading Days ($T-180$).
- **Default Observation Window**: 15 Trading Days ($T-15$).
- **Custom Range Investigation Support**: The surveillance backend is built with dynamic API filtering (`date_from` and `date_to`). Analysts frequently investigate historical manipulation events across custom date ranges (e.g., a specific 30-day window from 6 months ago).

> **Impact on Data Request**:  
> All column requirements specified below remain identical regardless of window size. To support analyst custom queries, **we request access to full historical `FACT_TRADES` records (minimum 260 trading days / 1 calendar year), refreshed nightly via an EOD batch process.**

---

## Detailed Column Requirements by Surveillance Module

### Module 1: PVASF Alert Scoring & Watchlist Engine

**Spec Reference**: PVASF Shortlisting Metrics (Section 2) & Composite Scoring (Section 3)  
**Purpose**: Generates the primary surveillance watchlist ranking all listed scrips by calculated PVASF Risk Score ($0 \dots 100$).  
**Source Table**: `FACT_TRADES` (`FTRD`)  

| Column Name | Data Type | Mandatory? | Business Justification & Metric Usage |
| :--- | :--- | :---: | :--- |
| `Ftrd_Symbol` | `VARCHAR` | **YES** | Ticker symbol; primary group-by key for scrip aggregated metrics. |
| `Ftrd_Trd_Date` | `DATE` | **YES** | Execution date; filters 180-day baseline and 15-day observation windows. |
| `Ftrd_Trd_Price` | `DECIMAL` | **YES** | Executed trade price; used as EOD close proxy to compute Price Rise % and Price Z-Score. |
| `Ftrd_Last_Trd_Price` | `DECIMAL` | **YES** | Running Last Traded Price (LTP); tracks 180-day historical new high breakouts. |
| `Ftrd_Trd_Qty` | `DECIMAL` | **YES** | Daily traded volume; computes 15-day mean volume vs 180-day baseline Volume Z-Score. |
| `Ftrd_Trd_Val` | `DECIMAL` | Optional | Daily traded value; validates volume concentration against rupee/dollar turnover. |
| `Ftrd_Sess_Type` | `INTEGER` | **YES** | Session type filter: `1`=Pre-Open, `2`=Normal Market, `3`=Closing Auction. Only `2` is scored. |
| `Ftrd_LTP_Chng_Indc` | `VARCHAR` | **YES** | LTP direction indicator (`+`, `-`, `=`). `+` flags positive price movement ticks. |
| `Ftrd_Last_Estd_Hi_Price` | `DECIMAL` | **YES** | Applicable upper price band limit; used to evaluate Circuit Band Persistence ($\ge 90\%$ band hits). |

---

### Module 2: 180-Day Interactive Price & Volume Chart

**Spec Reference**: Dashboard Output (Section 5) — "Price movement over 180 days", "Rolling 15-day average"  
**Purpose**: Renders dual-axis interactive price movement and volume trend charts for security deep-dive investigations.  
**Source Table**: `FACT_TRADES` (`FTRD`) (or pre-aggregated EOD bar table `EOD_PRICE_VOLUME_HIST`)  

| Column Name | Data Type | Mandatory? | Business Justification & Usage |
| :--- | :--- | :---: | :--- |
| `Ftrd_Symbol` | `VARCHAR` | **YES** | Filter for security under active investigation. |
| `Ftrd_Trd_Date` | `DATE` | **YES** | X-axis timeline distribution. |
| `Ftrd_Trd_Price` | `DECIMAL` | **YES** | Daily closing price trend and 20D / 50D moving average overlay. |
| `Ftrd_Trd_Qty` | `DECIMAL` | **YES** | Daily volume bars and 15-day rolling average volume line overlay. |
| `Ftrd_Sess_Type` | `INTEGER` | **YES** | Filter out pre-open/closing auction spikes (`Sess_Type = 2`). |

---

### Module 3: Participant Conduct Audit & LTP Contribution

**Spec Reference**: Participant-Level Metrics (Section 4.1, 4.2)  
**Purpose**: Identifies individual client PANs driving positive price movement (LTP pushers) and volume concentration.  
**Source Tables**: `FACT_TRADES` (`FTRD`) joined with `DIM_EXCH_CLNT_DTLS` (`DECL`)  
**Join Condition**: `Ftrd_Buy_Exch_Clnt_Token = Decl_Exch_Clnt_Token` and `Ftrd_Sell_Exch_Clnt_Token = Decl_Exch_Clnt_Token`  

| Table | Column Name | Data Type | Business Justification & Usage |
| :--- | :--- | :--- | :--- |
| `FTRD` | `Ftrd_Trd_Tmst` | `TIMESTAMP` | Millisecond timestamp to match trade match moment to LTP tick movement. |
| `FTRD` | `Ftrd_Buy_Exch_Clnt_Token` | `INTEGER` | Buyer exchange client token; joins to `DECL` to resolve buyer PAN. |
| `FTRD` | `Ftrd_Sell_Exch_Clnt_Token` | `INTEGER` | Seller exchange client token; joins to `DECL` to resolve seller PAN. |
| `FTRD` | `Ftrd_Init_Side_Type` | `INTEGER` | Initiator flag: `1`=Buy Aggressive, `2`=Sell Aggressive. Aggressive buy trades drive LTP up. |
| `FTRD` | `Ftrd_LTP_Chng_Indc` | `VARCHAR` | `+` flag indicates buyer pushed LTP higher. Only positive ticks count for LTP Contribution %. |
| `FTRD` | `Ftrd_Trd_Qty` | `DECIMAL` | Summed per buyer/seller PAN to measure Volume Share %. |
| `FTRD` | `Ftrd_Trd_Val` | `DECIMAL` | Summed buy value vs sell value per PAN to calculate Net Realized/Unrealized P&L. |
| `DECL` | `Decl_Exch_Clnt_Token` | `INTEGER` | Primary key join token. |
| `DECL` | `Decl_Clnt_Pan` | `VARCHAR` | Client PAN; primary legal entity identifier for grouping participant activity. |
| `DECL` | `Decl_Clnt_Name` | `VARCHAR` | Client full legal name. |

---

### Module 4: Counterparty Concentration & Wash Trade Audit

**Spec Reference**: Counterparty Concentration (Section 4.3)  
**Purpose**: Detects synchronized trading between PAN pairs, circular volume rotation (A→B→C→A), and same-broker wash trades.  
**Source Tables**: `FACT_TRADES` (`FTRD`) joined with `DIM_EXCH_CLNT_DTLS` (`DECL`)  

| Column Name | Data Type | Mandatory? | Business Justification & Usage |
| :--- | :--- | :---: | :--- |
| `Ftrd_Buy_Exch_Clnt_Token` | `INTEGER` | **YES** | Buyer token for counterparty pair aggregation. |
| `Ftrd_Sell_Exch_Clnt_Token` | `INTEGER` | **YES** | Seller token for counterparty pair aggregation. |
| `Ftrd_Buy_Exch_TM_Token` | `INTEGER` | **YES** | Buying Trading Member (Broker) token. |
| `Ftrd_Sell_Exch_TM_Token` | `INTEGER` | **YES** | Selling Trading Member (Broker) token. |
| `Ftrd_Same_Broker_Wash_Flag`| `INTEGER` | **YES** | Flag `1` indicates buy and sell orders matched within the same broker. |
| `Ftrd_Diff_Broker_Wash_Flag`| `INTEGER` | **YES** | Flag `1` indicates pre-arranged wash trade matched across different brokers. |

---

### Module 5: Client 360° Identity Resolution (Exchange + Depository)

**Purpose**: Cross-references exchange trading accounts (`DECL`) with depository demat accounts (`DDCL`) to audit client holdings, joint accounts, and Power of Attorney (PoA) relationships.  
**Source Tables**: `DIM_EXCH_CLNT_DTLS` (`DECL`) and `DIM_DEP_CLNT_DTLS` (`DDCL`)  
**Join Condition**: `DECL.Decl_Clnt_Pan = DDCL.Ddcl_Clnt_Pan`  

| Table | Column Name | Data Type | Business Justification & Usage |
| :--- | :--- | :--- | :--- |
| `DECL` | `Decl_Clnt_Pan` | `VARCHAR` | Join key to `DDCL`. |
| `DECL` | `Decl_TM_Id` | `VARCHAR` | Trading Member Broker ID. |
| `DECL` | `Decl_Clnt_Stat` | `INTEGER` | Account status (`1`=Active, `2`=Suspended). |
| `DECL` | `Decl_City`, `Decl_State` | `VARCHAR` | Geographical location auditing (detecting out-of-state terminal concentrations). |
| `DDCL` | `Ddcl_Dp_Id` | `VARCHAR` | Depository Participant ID (NSDL / CDSL). |
| `DDCL` | `Ddcl_Clnt_Id` | `VARCHAR` | Demat Account Client ID. |
| `DDCL` | `Ddcl_Jnt_Hldr1_Pan` | `VARCHAR` | Joint Holder 1 PAN (verifying connected party networks). |
| `DDCL` | `Ddcl_Poa_Hldr_Pan` | `VARCHAR` | Power of Attorney PAN (detecting entity control hubs). |

---

## Production Teradata SQL Extraction Queries

To facilitate data extraction by the Teradata engineering team, standard ANSI / Teradata SQL queries are provided below.

### Query 1: EOD Historical Price-Volume Extraction (DS-01)

```sql
-- Extract 260 Trading Days of Daily Aggregated OHLCV per Scrip
SELECT 
    Ftrd_Symbol AS Ticker,
    Ftrd_Trd_Date AS TradeDate,
    MIN(Ftrd_Trd_Tmst) AS FirstTradeTimestamp,
    MAX(Ftrd_Trd_Tmst) AS LastTradeTimestamp,
    -- Open Price: Price of first trade match of day
    (SELECT TOP 1 t1.Ftrd_Trd_Price 
     FROM FACT_TRADES t1 
     WHERE t1.Ftrd_Symbol = f.Ftrd_Symbol 
       AND t1.Ftrd_Trd_Date = f.Ftrd_Trd_Date 
       AND t1.Ftrd_Sess_Type = 2
     ORDER BY t1.Ftrd_Trd_Tmst ASC) AS OpenPrice,
    MAX(Ftrd_Trd_Price) AS HighPrice,
    MIN(Ftrd_Trd_Price) AS LowPrice,
    -- Close Price: Price of last trade match of day
    (SELECT TOP 1 t2.Ftrd_Trd_Price 
     FROM FACT_TRADES t2 
     WHERE t2.Ftrd_Symbol = f.Ftrd_Symbol 
       AND t2.Ftrd_Trd_Date = f.Ftrd_Trd_Date 
       AND t2.Ftrd_Sess_Type = 2
     ORDER BY t2.Ftrd_Trd_Tmst DESC) AS ClosePrice,
    SUM(Ftrd_Trd_Qty) AS TradedVolume,
    SUM(Ftrd_Trd_Val) AS TradedValue,
    MAX(Ftrd_Last_Estd_Hi_Price) AS ApplicableUpperBandPrice
FROM FACT_TRADES f
WHERE Ftrd_Sess_Type = 2
  AND Ftrd_Trd_Date BETWEEN CURRENT_DATE - 365 AND CURRENT_DATE
GROUP BY Ftrd_Symbol, Ftrd_Trd_Date
ORDER BY Ftrd_Symbol, Ftrd_Trd_Date ASC;
```

---

### Query 2: Participant Trade Match Audit Extraction (DS-03 + DS-02)

```sql
-- Extract Detailed Intraday Trade Matches for Suspicious Scrips (Joined with Client PANs)
SELECT 
    f.Ftrd_Trd_Num AS TradeNum,
    f.Ftrd_Trd_Date AS TradeDate,
    f.Ftrd_Trd_Tmst AS TradeTimestamp,
    f.Ftrd_Symbol AS Ticker,
    f.Ftrd_Trd_Price AS TradePrice,
    f.Ftrd_Trd_Qty AS TradeQty,
    f.Ftrd_Trd_Val AS TradeVal,
    f.Ftrd_LTP_Chng_Indc AS LTPChangeIndicator,
    f.Ftrd_Init_Side_Type AS InitiatorSide,
    f.Ftrd_Same_Broker_Wash_Flag AS SameBrokerWashFlag,
    f.Ftrd_Buy_CTCL_Algo_Flag AS BuyAlgoFlag,
    f.Ftrd_Sell_CTCL_Algo_Flag AS SellAlgoFlag,
    b.Decl_Clnt_Pan AS BuyerPAN,
    b.Decl_Clnt_Name AS BuyerName,
    s.Decl_Clnt_Pan AS SellerPAN,
    s.Decl_Clnt_Name AS SellerName,
    f.Ftrd_Buy_Exch_TM_Token AS BuyerBrokerID,
    f.Ftrd_Sell_Exch_TM_Token AS SellerBrokerID
FROM FACT_TRADES f
INNER JOIN DIM_EXCH_CLNT_DTLS b ON f.Ftrd_Buy_Exch_Clnt_Token = b.Decl_Exch_Clnt_Token
INNER JOIN DIM_EXCH_CLNT_DTLS s ON f.Ftrd_Sell_Exch_Clnt_Token = s.Decl_Exch_Clnt_Token
WHERE f.Ftrd_Trd_Date BETWEEN :DateFrom AND :DateTo
  AND f.Ftrd_Symbol = :TargetSymbol
ORDER BY f.Ftrd_Trd_Tmst ASC;
```

---

### Query 3: Unified Client 360 Master Extraction (DS-02 + DS-03)

```sql
-- Join Exchange Client Accounts with Depository Demat Accounts by PAN
SELECT 
    e.Decl_Exch_Clnt_Token AS ExchangeClientToken,
    e.Decl_Clnt_Pan AS ClientPAN,
    e.Decl_Clnt_Name AS ClientName,
    e.Decl_TM_Id AS BrokerID,
    e.Decl_Client_Code AS ExchangeClientCode,
    e.Decl_Clnt_Stat_Indc AS AccountStatus,
    e.Decl_City AS City,
    e.Decl_State AS State,
    d.Ddcl_Dp_Id AS DepositoryDPID,
    d.Ddcl_Clnt_Id AS DematClientID,
    d.Ddcl_Dp_Type_Desc AS DepositoryType,
    d.Ddcl_Jnt_Hldr1_Pan AS JointHolder1PAN,
    d.Ddcl_Poa_Hldr_Pan AS PowerOfAttorneyPAN
FROM DIM_EXCH_CLNT_DTLS e
LEFT JOIN DIM_DEP_CLNT_DTLS d ON e.Decl_Clnt_Pan = d.Ddcl_Clnt_Pan;
```

---

## Data Delivery, SLA & Governance Requirements

### 1. Delivery Frequency & Schedule
- **Nightly EOD Batch**: Trade archives (`FACT_TRADES`) and client delta updates (`DECL`/`DDCL`) must be delivered nightly by **22:00 IST** following market close.
- **File Format**: Encrypted CSV / Parquet or direct staging table access in Teradata.

### 2. Security & PII Masking
- In accordance with RBAC security policies:
  - **Analyst Role View**: PAN numbers exported to reporting layers must be masked (`XXXXX1234F`).
  - **Investigator / Supervisor Role View**: Unmasked PAN numbers are retained for formal enforcement action.
- Data transmission must use SSH/SFTP or TLS 1.3 encrypted ODBC channels.

### 3. Open Clarifications for Data Engineering Team
1. **Official Circuit Band Table**: Does an explicit `PRICE_BAND_MASTER` table exist providing exact daily upper circuit limits per scrip, or should the engine continue computing limits from `Ftrd_Last_Estd_Hi_Price`?
2. **Corporate Action Price Adjustments**: Does Teradata store pre-adjusted historical closing prices (`ClosePriceAdjusted`), or will corporate actions be provided via feed `DS-04`?
