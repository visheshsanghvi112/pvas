# Price-Volume Alert Surveillance Framework (PVASF)

## Executive Summary
This document outlines a high-efficiency Price-Volume (PV) Alert Surveillance Framework designed to identify market manipulation. This framework establishes a rigorous, automated screening process to identify scrips that exhibit anomalous trading patterns. By focusing on statistical outliers in price, volume, and Price Band (Circuit) behaviour, the system shortlists high-risk securities for further regulatory review.

## Objective
The primary goal of this framework is to build a statistically robust and scalable surveillance system that:
- **Detects Artificial Inflation/Deflation**: Identifying where prices & volume have moved dramatically without genuine market news.
- **Identifies Volatility Outliers**: Stocks moving far beyond their historical norm.
- **Flags Liquidity Bursts**: Stocks experiencing sudden, unexplained trading interest.

## Key Data Inputs
To operate this framework, the following data points are required:
- **Scrip Master Data**: Daily Closing, Opening, High, and Low prices.
- **Price Band Data**: The daily Upper and Lower Circuit limits assigned to the scrip.
- **Historical Archives**: A rolling 180-day window of price and volume data for every scrip and participant to establish "normal" behaviour.

---

## 1. Core Terminology (The Basics)

### 1.1. Price Movement
Stock's movement compared to 6-month closing price.

### 1.2. Volume
Total number of shares bought and sold in a particular stock during the period. *"How much activity is in this stock?"*

#### 1.2.1. Mean (Average)
The "normal" level.
- **Mean N-Days Volume**: Sum of daily traded volume over last N days divided by N.

#### 1.2.2. Standard Deviation ($\sigma$)
A measure of stability.
- **Low Standard Deviation**: Stock volume stays within a tight, consistent range (e.g., reliably trading 10,000 to 12,000 shares/day).
- **High Standard Deviation**: Stock volume swings wildly (e.g., trading 5,000 shares one day and 1,000,000 the next).

### 1.3. Price Bands (Circuits)
Regulatory limits that prevent a stock price from moving beyond a certain percentage (e.g., 2%, 5%, 10%, 20%) in a single day.

### 1.4. New Highs in 180 Days
Highest recorded price of the preceding 180 trading days.

---

## 2. The Shortlisting Metrics

A scrip is evaluated against five distinct parameters. If the Composite Scrip Score exceeds the threshold, the scrip is shortlisted for the watchlist. The watchlisted scrips shall be alphabetically distributed to officers based on allotted alphabets.

### 2.1. Price Rise

#### 2.1.1. What It Is
Compares the absolute percentage growth of the stock's price in the last 15 days vis-à-vis price on $T-180$ days. The price is to be adjusted for any Corporate Action.

#### 2.1.2. Formula
$$\text{Price Change (\%)} = \frac{\text{Highest Price}_{\text{Last 15 Days}} - \text{Closing Price}_{T-180}}{\text{Closing Price}_{T-180}} \times 100$$

#### 2.1.3. Explanation
Identifies stocks that have exhibited extreme upward movement or potential "pump" behaviour at any point during the observation window. Flags securities that experienced massive, abnormal price rallies over the last six months.

#### 2.1.4. Scoring Mechanism

| Criteria | Score |
| :--- | :---: |
| Under $15\%$ Rise | **0** |
| $15\% - 75\%$ Rise | **1** |
| $76\% - 150\%$ Rise | **3** |
| Maximum Rise $> 150\%$ | **5** |

---

### 2.2. Price Z-Score

#### 2.2.1. What It Is
Measures if the average price movement over the last 15 days ($T$ to $T-15$) is statistically abnormal when compared directly to its typical 15-day price behaviour over the last 180 trading days.

#### 2.2.2. Formula
$$Z_{\text{price}} = \frac{\bar{X}_{\text{Average Daily Price Movement (T to T-15)}} - \mu_{\text{Rolling 15-Day Average}}}{\sigma_{\text{Rolling 15-Day}}}$$

#### 2.2.3. Calculation Methodology
- **Current Value ($\bar{X}$)**: The average close-to-close (C-C) price movement over the most recent 15 days ($T$ to $T-15$).
- **Historical Mean ($\mu$)**: Calculates the 15-day average price movement for every rolling 15-day window over 180 trading days (e.g., $T-180 \dots T-165$, $T-179 \dots T-164$, etc.). The mean ($\mu$) is the average across these rolling windows.
- **Standard Deviation ($\sigma$)**: Calculated across that specific universe of rolling 15-day windows.

#### 2.2.4. Explanation
Identifies stocks experiencing acute, 15-day momentum bursts that fall outside the stock's established normal variance for a 15-day period.

#### 2.2.5. Scoring Mechanism

| Criteria | Score | Statistical Confidence |
| :--- | :---: | :--- |
| $Z < 1.645$ | **0** | Normal variance |
| $Z \ge 1.645$ | **1** | 95th Percentile |
| $Z \ge 2.33$ | **3** | 99th Percentile |
| $Z \ge 3.09$ | **5** | 99.9th Percentile |

---

### 2.3. Volume Z-Score

#### 2.3.1. What It Is
Measures if the stock's trading volume over the last 15 days is statistically abnormal when compared directly to its typical 15-day volume behaviour over the last 6 months.

#### 2.3.2. Formula
$$Z_{\text{volume}} = \frac{\bar{X}_{\text{Average Daily Volume (T to T-15)}} - \mu_{\text{Rolling 15-Day Average}}}{\sigma_{\text{Rolling 15-Day}}}$$

#### 2.3.3. Calculation Methodology
- **Current Value ($\bar{X}$)**: The average daily volume over the most recent 15 days ($T$ to $T-15$).
- **Historical Mean ($\mu$)**: Calculates the 15-day average volume for every rolling 15-day window over 180 trading days (e.g., $T-180 \dots T-165$, $T-179 \dots T-164$, etc.). The mean ($\mu$) is the average of these rolling windows.
- **Standard Deviation ($\sigma$)**: Calculated across that specific universe of rolling 15-day windows.

#### 2.3.4. Explanation
Flags periods where sustained trading activity over a 15-day period has surged significantly beyond the stock's established normal variance for a 15-day window.

#### 2.3.5. Scoring Mechanism

| Criteria | Score | Statistical Confidence |
| :--- | :---: | :--- |
| $Z < 1.645$ | **0** | Normal volume |
| $Z \ge 1.645$ | **1** | 95th Percentile |
| $Z \ge 2.33$ | **3** | 99th Percentile |
| $Z \ge 3.09$ | **5** | 99.9th Percentile |

---

### 2.4. Price Band Persistence (Detects Pump Phase)

#### 2.4.1. What It Is
The frequency with which a scrip approaches (at least 90%) or hits its Upper Circuit over a rolling 15-day window.

#### 2.4.2. Formula
$$\text{Daily Move (\%)} = \frac{|\text{Intraday High}_t - \text{Previous Close}_{t-1}|}{\text{Previous Close}_{t-1}}$$

$$\text{Band Hit Condition}: \text{Daily Move (\%)} \ge (0.90 \times \text{Applicable Circuit Limit})$$

$$\text{Persistence Count} = \sum_{t=T-14}^{T} \mathbb{I}(\text{Band Hit Condition is True})$$

#### 2.4.3. Explanation
Manipulators often "lock" a stock at the Upper Circuit for several days in a row to prevent selling and create a "fear of missing out" (FOMO) among retail investors. This metric flags stocks that are repeatedly hitting the ceiling.

#### 2.4.4. Scoring Mechanism

| Criteria | Score |
| :--- | :---: |
| 0 to 2 days | **0** |
| 3 to 5 days | **1** |
| 6 to 9 days | **3** |
| 10 or more days | **5** |

---

### 2.5. 180-Day New High Breakout

#### 2.5.1. What It Is
Highlights the number of times the stock has broken past its 6-month ceiling and hit a brand new high in the past 15 days.

#### 2.5.2. Formula
$$\text{New High Condition}: \text{High}_t \ge \max_{j=t-180}^{t-1}(\text{High}_j)$$

$$\text{Persistence Count} = \sum_{t=T-14}^{T} \mathbb{I}(\text{New High Condition is True})$$

#### 2.5.3. Methodology
For each day in the last 15 days ($T \dots T-14$), carries out a binary check ($\text{Yes}=1, \text{No}=0$) to determine if the current day's high price is greater than or equal to the highest recorded price of the preceding 180 trading days. The count is accumulated.

#### 2.5.4. Explanation
Manipulators intentionally push a stock to a new high to trigger algorithmic buy signals and attract retail momentum traders.

#### 2.5.5. Scoring Mechanism

| Criteria | Score |
| :--- | :---: |
| 0 days | **0** |
| 1 to 4 days | **1** |
| 5 to 9 days | **3** |
| 10 or more days | **5** |

---

## 3. The Scoring & Shortlisting Logic

Every scrip is assigned a **Scrip Risk Score**:

$$\text{Score}_{\text{Final}} = (w_1 \cdot \text{Price Rise}) + (w_2 \cdot Z_{\text{price}}) + (w_3 \cdot Z_{\text{volume}}) + (w_4 \cdot \text{Band Persistence}) + (w_5 \cdot \text{180 Day New High})$$

Scrips with a Score beyond a given threshold form the watchlist for surveillance officers.

---

## 4. Other Metrics: Identifying the "Suspects" (Participant Level)

Once a stock is flagged, the alert provides insights into manipulative activity in the scrip—including concentrated volume, LTP contribution, and counterparty concentration by certain group of entities (PANs).

### 4.1. LTP Contribution (The "Price Pusher" Metric)
- **Aim**: Details of top unique PANs who contributed to price movement of the scrip in the past 15 days, beyond a given threshold.
- **Formula**:
$$\text{LTP Contribution \%} = \frac{\sum (\text{Net LTP contribution of entity over 15 trading days})}{\text{Net LTP movement in scrip over 15 trading days}}$$
*(Calculated only for trades where the PAN was the "Aggressor" or initiator)*
- **What It Conveys**: Tracks how much each PAN's trades changed the Last Traded Price (LTP) throughout the 15-day observation period.
- **Explanation**: Finds the "Leader". If the price went from ₹100 to ₹110 over the last 15 days, and one specific investor's trades were responsible for ₹8 of that ₹10 increase, they are setting the price rather than following it.
- **Report Output**: Entities with positive/negative LTP contribution higher than x% of total 15-day LTP movement are displayed under **"LTP Contributors"** with their percentage contribution.

### 4.2. Volume Share (The "Dominance" Metric)
- **Aim**: Details of top unique PANs who significantly contributed to total volume of the scrip in the past 15 days, beyond a given threshold.
- **Formula**:
$$\text{Volume Share \%} = \frac{\text{Individual PAN Volume over 15 trading days}}{\text{Total Scrip Volume over 15 trading days}} \times 100$$
- **What It Conveys**: Percentage of total trading accounted for by each PAN.
- **Explanation**: If one person accounts for 50% of all buying and selling in a stock, they dominate the market—a key sign of cornering.
- **Report Output**: Entities with volume concentration higher than x% are displayed under **"Volume Contributors"**.

### 4.3. Counterparty Concentration (The "Circular Trading" Metric)
- **Aim**: Details of top unique PAN-counterparty PAN pairs who significantly contributed to total volume in the past 15 days, beyond a given threshold.
- **Formula**:
$$\text{Counterparty Pair Share \%} = \frac{\text{Volume traded within Entity-Counterparty Pair over 15 trading days}}{\text{Total Scrip Volume over 15 trading days}} \times 100$$
- **What It Conveys**: Evaluates if a single counterparty pair accounts for the majority of the security's volume.
- **Explanation**: If "Person A" sells to "Person B," who sells back to "Person A," the price rises without shares leaving the group. High concentration suggests a trading ring.
- **Report Output**: Counterparty pairs exceeding x% volume concentration are displayed under **"Counterparty Concentration"**.

---

## 5. Output (Dashboard Requirements)

From among the alphabets allocated to the surveillance officer, the dashboard provides the following details for scrips shortlisted with scores beyond the threshold:

### 5.1. Price-Volume Movement Details
- **5.1.1**: Price movement in the scrip in past 180 days.
- **5.1.2**: Rolling 15 days' average close-to-close (C-C) price movement in 15 days & 180 days.
- **5.1.3**: Rolling 15 days' average volume in 15 days & 180 days.
- **5.1.4**: Number of days in past 15 days the scrip hit 180-day high.
- **5.1.5**: Number of days in past 15 days the scrip hit 90% of price band.

### 5.2. Corporate Announcements
- Details of corporate announcements made in past 15 days.

### 5.3. Shareholder Statistics
- **5.3.1**: Number of unique PAN-holders in scrip on day $t$ & day $T-180$.
- **5.3.2**: Average number of unique PANs trading in scrip in past 15 days & 180 days.
- **5.3.3**: Number of shares held by promoters and top 1% shareholders on day $t$ & day $T-180$.

### 5.4. Possible Suspects (Participant Breakdown)
- **5.4.1**: Concentrated volume.
- **5.4.2**: LTP contribution.
- **5.4.3**: Counterparty concentration by entity groups (PANs).
- **5.4.4**: Top 5 Profit-Makers.
