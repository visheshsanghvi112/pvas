# PVASF — Backend Calculated & Tweaked Fields

This document lists **only** the fields and metrics that our backend calculates, derives, or tweaks. None of these fields come directly from the raw Excel files—they are all computed by our code.

---

## 1. Batch Calculations (Computed During Ingestion & Saved to DB)

These are rolling 180-day baseline statistics computed in `scripts/ingest_market_eod.py` and stored in the `market_baseline_stats` database table:

| Calculated Field | Raw Inputs Used | Exact Formula / Logic | Why We Compute It |
| :--- | :--- | :--- | :--- |
| **`daily_return`** | `close_price` | `(Close[t] - Close[t-1]) / Close[t-1]` | Daily percentage price change per scrip |
| **`base_price_180d`** | `close_price` | `Close[t - 180]` (shifted 180 trading sessions) | Starting price denominator for the 6-month rally calculation |
| **`baseline_volume_mean` ($\mu_V$)** | `total_traded_quantity` | Rolling 180-day mean of daily traded volume | Establishes the stock's normal volume level |
| **`baseline_volume_std` ($\sigma_V$)** | `total_traded_quantity` | Rolling 180-day standard deviation of volume | Establishes the normal volume variance |
| **`return_mean_180d` ($\mu_R$)** | `daily_return` | Rolling 180-day mean of daily price returns | Establishes normal daily price drift |
| **`return_std_180d` ($\sigma_R$)** | `daily_return` | Rolling 180-day standard deviation of returns | Establishes normal price return volatility |
| **`peak_high_180d`** | `day_high_price` | Rolling 180-day maximum intraday high | 6-month historical ceiling to identify breakouts |

---

## 2. On-The-Fly Surveillance Metrics (Computed in Alert Engine)

These are calculated dynamically in `pv_alert_surveillance.py` whenever the watchlist or summary API is called:

| Calculated Field | Raw Inputs Used | Formula / Logic | Resulting Scores / Values |
| :--- | :--- | :--- | :--- |
| **`price_rise_pct`** | `day_high_price`, `base_price_180d` | `(Max High in last 15d - Base Price 180d) / Base Price 180d * 100` | Percentage price rise across 6 months |
| **`price_rise_score`** | `price_rise_pct` | Tiered binning: `<15%` $\rightarrow$ **0**, `15–75%` $\rightarrow$ **1**, `76–150%` $\rightarrow$ **3**, `>150%` $\rightarrow$ **5** | Parameter Score: **0 to 5** |
| **`price_z`** | `close_price`, `return_mean_180d`, `return_std_180d` | `(15-day Avg Return - Historical Mean) / Historical Std Dev` | Z-score measuring price abnormality |
| **`price_z_score`** | `price_z` | Tiered binning: `Z < 1.645` $\rightarrow$ **0**, `Z ≥ 1.645` $\rightarrow$ **1**, `Z ≥ 2.33` $\rightarrow$ **3**, `Z ≥ 3.09` $\rightarrow$ **5** | Parameter Score: **0 to 5** |
| **`volume_z`** | `total_traded_quantity`, `baseline_volume_mean`, `baseline_volume_std` | `(15-day Avg Volume - Baseline Mean) / Baseline Std Dev` | Z-score measuring volume surge |
| **`volume_z_score`** | `volume_z` | Tiered binning: `Z < 1.645` $\rightarrow$ **0**, `Z ≥ 1.645` $\rightarrow$ **1**, `Z ≥ 2.33` $\rightarrow$ **3**, `Z ≥ 3.09` $\rightarrow$ **5** | Parameter Score: **0 to 5** |
| **`band_hit_days`** | `day_high_price`, `prev_close_price`, `upper_circuit_limit` | Daily check: `(High - PrevClose)/PrevClose >= 0.90 * CircuitBand`. Summed over last 15 days. | Count of circuit hits: **0 to 15 days** |
| **`band_score`** | `band_hit_days` | Tiered binning: `0–2d` $\rightarrow$ **0**, `3–5d` $\rightarrow$ **1**, `6–9d` $\rightarrow$ **3**, `≥10d` $\rightarrow$ **5** | Parameter Score: **0 to 5** |
| **`new_high_days`** | `day_high_price`, `peak_high_180d` | Daily check: `High > Previous 180-Day Peak High`. Summed over last 15 days. | Count of breakout days: **0 to 15 days** |
| **`new_high_score`** | `new_high_days` | Tiered binning: `0d` $\rightarrow$ **0**, `1–4d` $\rightarrow$ **1**, `5–9d` $\rightarrow$ **3**, `≥10d` $\rightarrow$ **5** | Parameter Score: **0 to 5** |
| **`composite_score`** | The 5 scores above + model weights | `Sum(Weight[i] * Score[i]) / 5.0` (Default: 20% each) | Final Risk Score: **0.0 to 100.0** |
| **`watchlist`** | `composite_score`, `threshold` | `composite_score >= threshold` (Default: 60.0) | Boolean: **True / False** |
| **`risk` / `status`** | `composite_score` | `>=60` $\rightarrow$ **High / Open**, `≥36` $\rightarrow$ **Medium / Under Review**, `<36` $\rightarrow$ **Low / Normal** | Surveillance Risk Classification |

---

## 3. Chart & Workspace Overlays (Single-Stock Workspace)

These are computed in `surveillance_service.py` to power the interactive chart and summary cards on `/analysis/[symbol]`:

| Calculated Field | Raw Inputs Used | Formula / Logic | Where It Appears |
| :--- | :--- | :--- | :--- |
| **`MA20`** | `close_price` | Rolling 20-day mean of `close_price` | 20-Day DMA line on the chart |
| **`MA50`** | `close_price` | Rolling 50-day mean of `close_price` | 50-Day DMA line on the chart |
| **`delivery_pct`** | `delivery_quantity`, `total_traded_quantity` | `(Delivery Quantity / Total Traded Quantity) * 100` | Screener-style `D: xx%` on volume bars |
| **`is_band_hit`** | `day_high_price`, `upper_circuit_limit` | Boolean flag per day if stock touched $\ge 90\%$ circuit | Visual amber dot on price chart |
| **`is_new_high`** | `day_high_price`, `peak_high_180d` | Boolean flag per day if stock broke previous 180-day peak | Visual blue diamond on price chart |
| **`avg_15d_volume`** | `total_traded_quantity` | Average traded shares across the last 15 trading days | Overview KPI card |
| **`price_change_pct`** | `close_price`, `base_price_180d` | `(Latest Close - Base Close 180d) / Base Close 180d * 100` | 180-day net price change KPI card |

---

## 4. Participant Conduct & Forensic Rings (Trade Forensic Tab)

These are computed in `pv_alert_surveillance.py` from client executions and matched pairs:

| Module / Field | Raw Inputs Used | Formula / Logic | Why We Compute It |
| :--- | :--- | :--- | :--- |
| **Net LTP Contribution** | `gross_positive_ltp_value`, `gross_negative_ltp_value` | Aggregated per PAN: `Sum(Positive Push) - Sum(Negative Pull)`. Classified as `POSITIVE`, `NEGATIVE`, or `NEUTRAL`. | Identifies the primary **"Price Pusher"** driving the rally |
| **Volume Dominance %** | `buy_quantity`, `sell_quantity`, `total_traded_quantity` | `(PAN Buy Qty + PAN Sell Qty) / (2 * Total Scrip Volume) * 100` | Exposes entities **cornering** market float |
| **Counterparty Concentration %** | `matched_quantity`, `total_traded_quantity` | `(Bilateral Matched Volume between A & B) / Total Scrip Volume * 100` | Flags collusive trading between specific entity pairs |
| **Reversal Trade Ratio (RTR %)** | `matched_quantity` (A $\to$ B and B $\to$ A) | `[2 * min(Vol_A_to_B, Vol_B_to_A) / (Vol_A_to_B + Vol_B_to_A)] * 100` | Quantifies synchronized **wash trading** (round-tripping) |
| **Circular Trading Loops** | Directed trade flows between PANs | Graph Depth-First Search (DFS) detecting closed loops of length 3 to 5 ($A \to B \to C \to A$) | Uncovers multi-party circular rings evading simple 2-party pair filters |
| **Realized Closed-Trade PnL** | `buy_quantity`, `sell_quantity`, `buy_turnover_value`, `sell_turnover_value` | `Matched Volume * (Avg Sell Price - Avg Buy Price)` (Requires both Buy > 0 and Sell > 0) | Ranks top **"Profit-Makers"** extracting cash during the pump |
