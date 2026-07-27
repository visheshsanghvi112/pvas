# Price-Volume Alert Surveillance Framework (Transcribed)

> **Note**: This document is reconstructed from the uploaded images. It preserves the extracted wording as closely as possible. Any unreadable portions from the images may be omitted or lightly normalized for formatting.

---

## Executive Summary
This document outlines a high-efficiency Price-Volume (PV) Alert Surveillance Framework designed to identify market manipulation. This framework establishes a rigorous, automated screening process to identify scrips that exhibit anomalous trading patterns. By focusing on statistical outliers in price, volume, and Price Band (Circuit) behaviour, the system shortlists high-risk securities for further regulatory review.

## Objective
The primary goal of this framework is to build a statistically robust and scalable surveillance system that:
- Detects Artificial Inflation/Deflation.
- Identifies Volatility Outliers.
- Flags Liquidity Bursts.

## Key Data Inputs
- Scrip Master Data.
- Price Band Data.
- Historical Archives (180-day rolling window).

---

## 1. Core Terminology

### 1.1 Price Movement
Stocks movement compared to 6-month closing price.

### 1.2 Volume
Total number of shares traded.
- **Mean (Average)**: Normal level.
- **Standard Deviation ($\sigma$)**: Measure of stability.

### 1.3 Price Bands (Circuits)
Regulatory limits preventing price movement beyond the permitted percentage.

### 1.4 New Highs in 180 Days
Highest recorded price in the preceding 180 trading days.

---

## 2. Shortlisting Metrics

### 2.1 Price Rise
Compares the absolute percentage growth between the highest price in the last 15 days and the closing price at $T-180$ after adjusting for corporate actions.

**Score:**
- Under $15\% = 0$
- $15–75\% = 1$
- $76–150\% = 3$
- $>150\% = 5$

### 2.2 Price Z-Score
Measures whether the average price movement during the latest 15 days is statistically abnormal compared to rolling 15-day windows over the previous 180 trading days.

**Score:**
- $Z < 1.645 = 0$
- $Z \ge 1.645 = 1$
- $Z \ge 2.33 = 3$
- $Z \ge 3.09 = 5$

### 2.3 Volume Z-Score
Measures whether the average trading volume during the latest 15 days is statistically abnormal compared to rolling 15-day windows over the previous 180 trading days.

**Score:**
- $Z < 1.645 = 0$
- $Z \ge 1.645 = 1$
- $Z \ge 2.33 = 3$
- $Z \ge 3.09 = 5$

### 2.4 Price Band Persistence
Counts the number of days during the previous 15 trading days where the price reached at least 90% of the applicable circuit limit.

**Score:**
- $0–2\text{ days} = 0$
- $3–5\text{ days} = 1$
- $6–9\text{ days} = 3$
- $10+\text{ days} = 5$

### 2.5 180-Day New High Breakout
Counts the number of times the stock created a new 180-day high during the previous 15 trading days.

**Score:**
- $0\text{ days} = 0$
- $1–5\text{ days} = 1$
- $5–9\text{ days} = 3$
- $10+\text{ days} = 5$

---

## 3. Scoring & Shortlisting Logic

$$\text{Final Score} = (w_1 \times \text{Price Rise}) + (w_2 \times \text{Price Z-Score}) + (w_3 \times \text{Volume Z-Score}) + (w_4 \times \text{Band Persistence}) + (w_5 \times \text{180-Day New High})$$

Scrips exceeding the threshold form the watch-list.

---

## 4. Participant-Level Metrics

### 4.1 LTP Contribution
Identifies PANs whose aggressive trades contributed significantly to the overall LTP movement over the previous 15 days.

### 4.2 Volume Share
Measures each PAN's contribution to the total traded volume over the previous 15 days.

### 4.3 Counterparty Concentration
Measures the trading concentration between PAN-counterparty pairs to detect potential circular trading.

---

## 5. Dashboard Output
- Price movement over 180 days
- Rolling 15-day average price movement
- Rolling 15-day average volume
- Number of 180-day highs in last 15 days
- Number of 90% price band hits
- Corporate announcements in previous 15 days
- Shareholder statistics
- Unique PAN holders
- Promoter & top 1% shareholding
- Concentrated volume
- LTP contributors
- Counterparty concentration
- Top 5 profit-makers

---

## 6. System Architecture & Integration Guidelines

### 6.1 EOD Processing Pipeline & Teradata Engine
1. **End-Of-Day (EOD) Data Ingestion**:
   - Daily EOD trade files, scrip master feeds, and price band definitions are ingested into **Teradata** following market close.
   - Teradata SQL analytical window functions (`AVG() OVER (...)`, `STDDEV_SAMP() OVER (...)`, `MAX() OVER (...)`) run in high-performance batch scripts to calculate the 180-day rolling baselines and 15-day metrics for all scrips.
2. **Teradata Data Warehouse Layer**:
   - High-volume raw trade data and 180-day historical archives are stored in Teradata tables indexed by Scrip ID, Trade Date, and Participant PAN.
   - Pre-computed EOD aggregate tables (`EOD_SCRIP_SCORES`, `EOD_PARTICIPANT_ANALYTICAL_SUMMARY`) are generated nightly so that web dashboard queries complete sub-second.

### 6.2 FastAPI Backend Layer (Python)
1. **Database Connector**:
   - Interfaces with Teradata using `teradatasql` or SQLAlchemy database connection pooling.
2. **REST Endpoints**:
   - `/api/v1/surveillance/watchlist`: Fetches shortlisted scrips sorted by calculated final risk score.
   - `/api/v1/surveillance/scrip/{scrip_id}`: Provides detailed 180-day price/volume historical time series, Z-scores, circuit band hits, and announcements.
   - `/api/v1/surveillance/scrip/{scrip_id}/participants`: Serves participant-level analytical breakdown (LTP contributors, volume share by PAN, counterparty pair concentrations, top profit makers).
   - `/api/v1/surveillance/weights`: Dynamic updates for scoring weights ($w_1..w_5$) and risk score thresholds.

### 6.3 Next.js Frontend Dashboard Layer
1. **UI Components & Charts**:
   - Built with Next.js (React 19, App Router), Tailwind CSS, and Recharts.
   - Displays real-time watchlists, shortlisting metric breakdowns, participant concentration matrix, and 180-day rolling trend visualization.
2. **Data Fetching**:
   - Consumes FastAPI backend API endpoints for seamless EOD data visualization and surveillance investigation workflows.
