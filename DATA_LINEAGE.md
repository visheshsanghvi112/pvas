# Market Conduct & Surveillance Platform — Data Lineage & Metric Calculation Specification
**Document Version**: 1.0.0  

---

## 1. Metric Lineage & Calculation Formulas

Every surveillance metric, chart, and alert in the system is mapped directly to underlying database columns and explicit mathematical formulas.

### 1.1 Price Rise % (Metric 1)
- **Business Meaning**: Measures 15-day peak price growth relative to the 180-day baseline closing price ($T-180$).
- **Mathematical Formula**:
  $$\text{Price Rise \%} = \frac{\max(\text{HighPrice}_{15d}) - \text{ClosePrice}_{T-180}}{\text{ClosePrice}_{T-180}} \times 100$$
- **Source Table & Columns**: `FACT_TRADES` (`Ftrd_Trd_Price`, `Ftrd_Trd_Date`) or `EOD_PRICE_VOLUME_HIST` (`ClosePrice`, `HighPrice`).
- **Scoring Logic**: $< 15\% \rightarrow 0$, $15–75\% \rightarrow 1$, $76–150\% \rightarrow 3$, $> 150\% \rightarrow 5$.

### 1.2 Price Z-Score (Metric 2)
- **Business Meaning**: Evaluates whether average price movement during the latest 15 trading days is statistically abnormal compared to rolling 15-day windows over the preceding 180 trading days.
- **Mathematical Formula**:
  $$Z_{\text{Price}} = \frac{\mu_{15d} - \mu_{180d}}{\sigma_{180d}}$$
  where $\mu_{15d} = \text{Mean}(\text{Close}_{15d})$, $\mu_{180d} = \text{Mean}(\text{Close}_{180d})$, and $\sigma_{180d} = \text{StdDev}(\text{Close}_{180d})$.
- **Source Table & Columns**: `FACT_TRADES` (`Ftrd_Trd_Price`) or `EOD_PRICE_VOLUME_HIST` (`ClosePrice`).
- **Scoring Logic**: $Z < 1.645 \rightarrow 0$, $Z \ge 1.645 \rightarrow 1$, $Z \ge 2.33 \rightarrow 3$, $Z \ge 3.09 \rightarrow 5$.

### 1.3 Volume Z-Score (Metric 3)
- **Business Meaning**: Evaluates whether average daily trading volume during the latest 15 trading days is statistically abnormal compared to rolling 15-day windows over the preceding 180 trading days.
- **Mathematical Formula**:
  $$Z_{\text{Volume}} = \frac{\mu_{V,15d} - \mu_{V,180d}}{\sigma_{V,180d}}$$
- **Source Table & Columns**: `FACT_TRADES` (`Ftrd_Trd_Qty`) or `EOD_PRICE_VOLUME_HIST` (`TradedVolume`).
- **Scoring Logic**: $Z < 1.645 \rightarrow 0$, $Z \ge 1.645 \rightarrow 1$, $Z \ge 2.33 \rightarrow 3$, $Z \ge 3.09 \rightarrow 5$.

### 1.4 Price Band Persistence (Metric 4)
- **Business Meaning**: Counts the number of trading days in the last 15 days where the closing price reached at least $90\%$ of the upper/lower circuit limit.
- **Mathematical Formula**:
  $$\text{Band Hit Count} = \sum_{t=T-15}^{T} \mathbb{I}\left(\text{Ftrd\_Hi\_Hit\_Flag}_t = 'Y' \lor \text{Ftrd\_Low\_Hit\_Flag}_t = 'Y'\right)$$
- **Source Table & Columns**: `FACT_TRADES` (`Ftrd_Hi_Hit_Flag`, `Ftrd_Low_Hit_Flag`, `Ftrd_Last_Estd_Hi_Price`).
- **Scoring Logic**: $0–2\text{ days} \rightarrow 0$, $3–5\text{ days} \rightarrow 1$, $6–9\text{ days} \rightarrow 3$, $10+\text{ days} \rightarrow 5$.

### 1.5 180-Day New High Breakout (Metric 5)
- **Business Meaning**: Counts the number of times the stock set a new 180-day high price during the previous 15 trading days.
- **Mathematical Formula**:
  $$\text{New High Count} = \sum_{t=T-15}^{T} \mathbb{I}\left(\text{HighPrice}_t > \max_{j=t-180}^{t-16}(\text{HighPrice}_j)\right)$$
- **Source Table & Columns**: `FACT_TRADES` (`Ftrd_Trd_Price`, `Ftrd_Trd_Date`) or `EOD_PRICE_VOLUME_HIST` (`HighPrice`).
- **Scoring Logic**: $0\text{ days} \rightarrow 0$, $1–4\text{ days} \rightarrow 1$, $5–9\text{ days} \rightarrow 3$, $10+\text{ days} \rightarrow 5$.

### 1.6 Composite Risk Score
- **Formula**:
  $$\text{Final Score} = (w_1 \cdot S_1) + (w_2 \cdot S_2) + (w_3 \cdot S_3) + (w_4 \cdot S_4) + (w_5 \cdot S_5)$$
  Default weights: $w_1=0.25, w_2=0.25, w_3=0.20, w_4=0.15, w_5=0.15$. Scaled to $0..100$.

---

## 2. External Dataset Dependencies & Future Feeds Matrix

| Dataset ID | Dataset Name | Availability Status | Impacted Module | Fallback / Mock Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **DS-01** | **EOD Price-Volume Archives** | **AVAILABLE** | Modules 1, 2, 3 | Calculated from `FACT_TRADES` EOD aggregation |
| **DS-02** | **Scrip Circuit Band Feed** | **PARTIAL** | Modules 2, 3 | Using `FACT_TRADES.Ftrd_Last_Estd_Hi_Price` & `Ftrd_Hi_Hit_Flag` |
| **DS-03** | **Participant Trade Log (`FACT_TRADES`)** | **AVAILABLE** | Modules 4, 5, 7, 8 | Loaded via SQLite seed database (31,200 rows) |
| **DS-04** | **Corporate Announcements** (`SCRIP_ANNOUNCEMENTS`) | **FUTURE INTEGRATION** | Module 3 (Scrip Analytics) | Render mock notification pins on time-series charts until live feed connected |
| **DS-05** | **Shareholding Pattern Archives** (`SCRIP_SHAREHOLDING`) | **FUTURE INTEGRATION** | Module 3, Module 6 | Render static quarterly promoter % shift until feed connected |
