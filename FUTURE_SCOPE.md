# PVASF Future Analytical Enhancements & Roadmap

**Document Version:** 1.1.0  
**Target System:** Price-Volume Alert Surveillance Framework (PVASF)

This document outlines upcoming analytical enhancements, robust statistical metrics, and automated compliance features planned for future iterations of the PVASF surveillance framework.

---

## 1. MAD (Median Absolute Deviation) Robust Z-Score Integration

### Overview

While the current framework uses standard Gaussian Z-Scores ($Z = \frac{X - \mu}{\sigma}$) to score 15-day price and volume momentum, illiquid or micro-cap stocks with extreme single-day outliers can suffer from distorted mean ($\mu$) and standard deviation ($\sigma$).

### Future Scope Specification

- Implement **Modified Z-Sore** based on Median Absolute Deviation (MAD):
  $$MAD = \text{median}(|X_i - \text{median}(X)|)$$
  $$Z_{\text{mod}} = 0.6745 \times \frac{X_i - \text{median}(X)}{MAD}$$
- Expose $Z_{\text{mod}}$ in the UI as a **Robustness Verification Badge** to help surveillance officers distinguish between sustained 15-day accumulation and single-day artificial spikes.

---

## 2. Corporate Action Adjustment Factor Integration (`price_dilution_factors`)

### Overview

Currently, 180-day baseline price calculations utilize historical close prices (`close_price`). Corporate actions such as 1:1 Bonus Issues, 2:1 Stock Splits, or Rights Offerings artificially drop historical close prices without reflecting real market capital loss.

### Future Scope Specification

- Integrate `price_dilution_factors.split_multiplier` into the $T-180$ base price lookup:
  $$\text{Adjusted Price}_{T-180} = \text{Closing Price}_{T-180} \times \text{split\_multiplier}$$
- Ensures Price Rise % accurately accounts for corporate action dilution.

---

## 3. Real-Time Streaming Anomaly Triggers (Kafka / WebSocket Integration)

### Overview

The current framework operates on EOD (End-Of-Day) market feeds.

### Future Scope Specification

- Integrate real-time intraday tick streaming via Kafka and WebSockets into the single-stock analysis workspace (`/analysis/[symbol]`) for live intraday circuit hit and volume surge alerts.

---

## 4. Automated Same-Broker Wash Trade Risk Badging (`same_broker_wash_quantity`)

### Overview

`participant_daily_trades` contains pre-calculated daily same-broker wash trade quantities (`same_broker_wash_quantity`).

### Future Scope Specification

- Automatically calculate Wash Trade Ratio per client:
  $$\text{Wash Trade Ratio \%} = \frac{\text{same\_broker\_wash\_quantity}}{\text{buy\_quantity} + \text{sell\_quantity}} \times 100$$
- Attach an automated **"High Wash Trade Risk"** alert badge to the Participant Audit view when the ratio exceeds 10%.
