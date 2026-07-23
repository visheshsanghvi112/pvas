# Price-Volume Alert Surveillance Framework (PVASF)
## Institutional Data Requirements & Teradata SQL Interface Specification

---

### Executive Overview

This document specifies the exact data feeds, table schemas, column definitions, and Teradata database queries required by the **Price-Volume Alert Surveillance Framework (PVASF)**. 

To power the 5 Core Statistical Shortlisting Metrics and the Participant Conduct Audit modules, the surveillance engine requires **End-of-Day (EOD)** structured market archives. No real-time intraday feeds are required; data is processed in nightly EOD batches after market close.

---

## 1. Summary of Required Datasets

| Dataset ID | Dataset Name | Primary Key | Refresh Frequency | Usage / Core Metric Powered |
| :--- | :--- | :--- | :--- | :--- |
| **DS-01** | **Historical Price-Volume Archives** | `Ticker`, `TradeDate` | Nightly EOD | 180d Baseline, Price Rise %, Price Z-Score, Volume Z-Score |
| **DS-02** | **Scrip Master & Circuit Band Feed** | `Ticker`, `TradeDate` | Daily EOD | Circuit Band Persistence (90% Band Hit Count), 180d New Highs |
| **DS-03** | **Participant Trade Audit / FACT_TRADES** | `TradeId` / `TradeNum` | Nightly EOD | LTP Contribution, Volume Share by PAN, Circular Trading Loops, PnL |
| **DS-04** | **Corporate Announcements & Actions** | `Ticker`, `AnnouncementDate` | Daily EOD | Material Disclosure Timeline & Sentiment Correlation |
| **DS-05** | **Shareholding Pattern Archives** | `Ticker`, `Quarter` | Quarterly / Monthly | Unique PAN Count, Promoter % Shift, Top 1% Concentration |

---

## 2. Detailed Schema & Column Specifications

### DS-01: Historical Daily Price-Volume Archives (`EOD_PRICE_VOLUME_HIST`)
> **Requirement**: Minimum **180 to 260 trading days** of consecutive daily OHLCV pricing records per scrip.

| Column Name | Recommended Teradata Type | Mandatory? | Description & Validation Rules | Sample Value |
| :--- | :--- | :--- | :--- | :--- |
| `Ticker` | `VARCHAR(30)` | **YES** | Exchange Scrip Symbol / Ticker Code | `'RELIANCE'`, `'TATASTEEL'` |
| `ISIN` | `CHAR(12)` | Optional | International Securities Identification Number | `'INE002A01018'` |
| `TradeDate` | `DATE` | **YES** | Trading Day Date (`YYYY-MM-DD`) | `'2026-07-22'` |
| `OpenPrice` | `DECIMAL(12,2)` | **YES** | Official Exchange Opening Price | `2450.50` |
| `HighPrice` | `DECIMAL(12,2)` | **YES** | Maximum Price reached during trading hours | `2510.00` |
| `LowPrice` | `DECIMAL(12,2)` | **YES** | Minimum Price reached during trading hours | `2440.00` |
| `ClosePrice` | `DECIMAL(12,2)` | **YES** | Official EOD Closing Price (Adjusted for split/bonus) | `2498.75` |
| `TradedVolume`| `BIGINT` | **YES** | Total number of shares traded on exchange | `1854200` |
| `TradedValue` | `DECIMAL(18,2)` | Optional | Total traded value in local currency (INR/USD) | `4633276150.00` |

---

### DS-02: Scrip Master & Circuit Band Feed (`SCRIP_CIRCUIT_BANDS`)
> **Requirement**: Applicable daily circuit limit percentages for each security.

| Column Name | Recommended Teradata Type | Mandatory? | Description & Validation Rules | Sample Value |
| :--- | :--- | :--- | :--- | :--- |
| `Ticker` | `VARCHAR(30)` | **YES** | Exchange Scrip Symbol | `'TATASTEEL'` |
| `TradeDate` | `DATE` | **YES** | Effective Date | `'2026-07-22'` |
| `BandPercent` | `DECIMAL(5,2)` | **YES** | Applicable Circuit Limit Percentage ($2.0, 5.0, 10.0, 20.0$) | `20.00` (for 20%) |
| `UpperLimit` | `DECIMAL(12,2)` | Optional | Exact Upper Circuit Price Boundary | `168.00` |
| `LowerLimit` | `DECIMAL(12,2)` | Optional | Exact Lower Circuit Price Boundary | `112.00` |
| `Series` | `VARCHAR(10)` | Optional | Market Segment (`'EQ'`, `'BE'`, `'SM'`) | `'EQ'` |

---

### DS-03: Participant Trade Log / Exchange `FACT_TRADES` (`FACT_TRADES_EOD`)
> **Requirement**: Detailed transaction logs identifying buying/selling client PANs, brokers, timestamps, and order types for audit.

| Column Name | Recommended Teradata Type | Mandatory? | Description & Validation Rules | Sample Value |
| :--- | :--- | :--- | :--- | :--- |
| `TradeNum` | `BIGINT` | **YES** | Unique Exchange Trade Match Number | `984512048` |
| `TradeDate` | `DATE` | **YES** | Execution Date | `'2026-07-22'` |
| `TradeTime` | `TIMESTAMP(6)` | **YES** | Millisecond-level trade execution timestamp | `'2026-07-22 14:15:02.145000'` |
| `Ticker` | `VARCHAR(30)` | **YES** | Exchange Scrip Symbol | `'ALPHATECH'` |
| `BuyClientPAN` | `VARCHAR(20)` | **YES** | Buyer Permanent Account Number (PAN) / Client Code | `'AAACB1234F'` |
| `SellClientPAN`| `VARCHAR(20)` | **YES** | Seller Permanent Account Number (PAN) / Client Code | `'XYZPB9876K'` |
| `BuyBrokerID` | `VARCHAR(20)` | **YES** | Buyer Trading Member (TM) Token / Broker ID | `'TM_00124'` |
| `SellBrokerID`| `VARCHAR(20)` | **YES** | Seller Trading Member (TM) Token / Broker ID | `'TM_00582'` |
| `TradeQty` | `BIGINT` | **YES** | Executed Quantity | `5000` |
| `TradePrice` | `DECIMAL(12,2)` | **YES** | Executed Trade Match Price | `185.50` |
| `LTPImpact` | `DECIMAL(8,4)` | Optional | Price change caused by initiator (+/- impact) | `+0.50` |
| `SameBrokerWashFlag` | `SMALLINT` | Optional | `1` if Buy and Sell TM/Client are identical | `0` or `1` |
| `CTCLAlgoFlag` | `VARCHAR(20)` | Optional | Execution channel flag (`Algo`, `DMA`, `Internet`, `Manual`) | `'Algo'` |

---

### DS-04: Corporate Announcements & Disclosures (`SCRIP_ANNOUNCEMENTS`)
> **Requirement**: Exchange corporate disclosures to evaluate whether price surges correspond to public news.

| Column Name | Recommended Teradata Type | Mandatory? | Description | Sample Value |
| :--- | :--- | :--- | :--- | :--- |
| `Ticker` | `VARCHAR(30)` | **YES** | Exchange Scrip Symbol | `'ALPHATECH'` |
| `AnnouncementDate` | `DATE` | **YES** | Date of Exchange Filing | `'2026-07-15'` |
| `Category` | `VARCHAR(50)` | **YES** | Filing Category | `'Board Meeting'`, `'Clarification'` |
| `Subject` | `VARCHAR(255)`| **YES** | Headline summary of filing | `'Board intimation for strategic partnership'` |
| `Details` | `VARCHAR(1000)`| Optional | Brief body of announcement | `'Company has received order worth 500Cr'` |

---

### DS-05: Shareholding Pattern Archives (`SCRIP_SHAREHOLDING`)
> **Requirement**: Ownership pattern to verify public float vs promoter concentration.

| Column Name | Recommended Teradata Type | Mandatory? | Description | Sample Value |
| :--- | :--- | :--- | :--- | :--- |
| `Ticker` | `VARCHAR(30)` | **YES** | Exchange Scrip Symbol | `'ALPHATECH'` |
| `QuarterEndDate` | `DATE` | **YES** | Quarter End Date | `'2026-06-30'` |
| `PromoterPercent` | `DECIMAL(5,2)` | **YES** | % Held by Promoters & Promoter Group | `52.40` |
| `Top1PercentShare` | `DECIMAL(5,2)` | **YES** | % Held by Top 1% Non-Promoter Shareholders | `18.20` |
| `UniquePANs` | `INTEGER` | **YES** | Total count of distinct public PAN holders | `14200` |

---

## 3. Sample Teradata SQL Queries (For Teradata Engineering Team)

If your data engineering team prefers to execute pre-aggregations in Teradata before passing dataset views to the backend, they can use the optimized Teradata SQL window functions below:

### Query 1: Teradata SQL for 180-Day Baseline & 15-Day Rolling Z-Scores

```sql
-- Teradata Pre-Aggregate View for 5 Core PV Shortlisting Metrics
CREATE VIEW V_EOD_SURVEILLANCE_METRICS AS
WITH ScripBaselines AS (
    SELECT 
        Ticker,
        TradeDate,
        ClosePrice,
        TradedVolume,
        HighPrice,
        LowPrice,
        -- T-180 Closing Price
        MIN(ClosePrice) OVER (
            PARTITION BY Ticker 
            ORDER BY TradeDate 
            ROWS BETWEEN 180 PRECEDING AND 180 PRECEDING
        ) AS Close_T180,
        -- 180-Day Rolling High (excluding current 15d)
        MAX(HighPrice) OVER (
            PARTITION BY Ticker 
            ORDER BY TradeDate 
            ROWS BETWEEN 180 PRECEDING AND 15 PRECEDING
        ) AS High_180d_Baseline,
        -- 180-Day Volume Mean and StdDev
        AVG(CAST(TradedVolume AS FLOAT)) OVER (
            PARTITION BY Ticker 
            ORDER BY TradeDate 
            ROWS BETWEEN 180 PRECEDING AND 1 PRECEDING
        ) AS Vol_180d_Mean,
        STDDEV_SAMP(CAST(TradedVolume AS FLOAT)) OVER (
            PARTITION BY Ticker 
            ORDER BY TradeDate 
            ROWS BETWEEN 180 PRECEDING AND 1 PRECEDING
        ) AS Vol_180d_StdDev
    FROM EOD_PRICE_VOLUME_HIST
)
SELECT 
    Ticker,
    MAX(TradeDate) AS Latest_Date,
    MAX(ClosePrice) AS Latest_Close,
    -- Metric 1: Price Rise % (15d High vs T-180 Close)
    ((MAX(HighPrice) - MAX(Close_T180)) / NULLIFZERO(MAX(Close_T180))) * 100.0 AS Price_Rise_Pct,
    -- Metric 3: Volume Z-Score
    (AVG(TradedVolume) - MAX(Vol_180d_Mean)) / NULLIFZERO(MAX(Vol_180d_StdDev)) AS Volume_Z_Score
FROM ScripBaselines
WHERE TradeDate >= CURRENT_DATE - 15
GROUP BY Ticker;
```

---

### Query 2: Teradata SQL for Participant LTP Contribution & Concentration

```sql
-- Teradata Participant Audit Query for Top Volume Share and LTP Impact
SELECT 
    Ticker,
    BuyClientPAN AS Participant_PAN,
    SUM(TradeQty) AS Total_Buy_Qty,
    SUM(TradeQty * TradePrice) AS Total_Buy_Val,
    COUNT(DISTINCT SellClientPAN) AS Counterparty_Count,
    -- Concentration % against total scrip volume
    (SUM(TradeQty) * 100.0) / NULLIFZERO(MAX(Scrip_Total_Vol)) AS Volume_Share_Pct
FROM FACT_TRADES_EOD
CROSS JOIN (
    SELECT SUM(TradedVolume) AS Scrip_Total_Vol 
    FROM EOD_PRICE_VOLUME_HIST 
    WHERE TradeDate >= CURRENT_DATE - 15
) TotalVol
WHERE TradeDate >= CURRENT_DATE - 15
GROUP BY Ticker, BuyClientPAN
ORDER BY Volume_Share_Pct DESC;
```

---

## 4. Preferred Integration Options

Your team can provide the data in **any of the following 3 ways** (ordered by preference):

1. **Option A: Direct Teradata SQL Database Connection (Recommended)**
   - Provide a Read-Only Teradata database user / service account.
   - We will use `teradatasql` Python connector to execute queries directly.

2. **Option B: Daily Automated EOD CSV / Parquet File Export**
   - Dump nightly EOD files into a shared directory or GCS/S3 bucket.
   - File Naming: `EOD_PRICES_YYYYMMDD.csv`, `FACT_TRADES_YYYYMMDD.csv`.

3. **Option C: Internal REST API Service**
   - Provide internal API endpoints returning JSON matching the schemas above.

---

## 5. Next Steps for Data & DB Teams

1. **Review Schemas**: Check which of the 5 datasets (`DS-01` to `DS-05`) already exist in your Teradata warehouse.
2. **Column Mapping**: If column names differ, share your existing table DDLS or dictionary; our backend column synonym normalizer (`MAPPING_RULES`) will handle column name mapping automatically.
3. **Sample Data Export**: Provide a sample CSV (e.g., 6 months of price history for 10-20 scrips) so we can run full validation.
