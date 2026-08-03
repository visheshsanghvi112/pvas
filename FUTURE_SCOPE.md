# PVASF Future Analytical Enhancements & Roadmap

**Document Version:** 1.0.0  
**Target System:** Price-Volume Alert Surveillance Framework (PVASF)  

This document outlines upcoming analytical enhancements, robust statistical metrics, and automated compliance features planned for future iterations of the PVASF surveillance framework.

---

## 1. MAD (Median Absolute Deviation) Modified Z-Score Integration

### Overview
While the current framework uses standard Gaussian Z-Scores ($Z = \frac{X - \mu}{\sigma}$) to score 15-day price and volume momentum, illiquid or micro-cap stocks with extreme single-day outliers can suffer from distorted mean ($\mu$) and standard deviation ($\sigma$).

### Future Scope Specification
- Implement **Modified Z-Score** based on Median Absolute Deviation (MAD):
  $$MAD = \text{median}(|X_i - \text{median}(X)|)$$
  $$Z_{\text{mod}} = 0.6745 \times \frac{X_i - \text{median}(X)}{MAD}$$
- Expose $Z_{\text{mod}}$ in the UI as a **Robustness Verification Badge** to help surveillance officers distinguish between sustained 15-day accumulation and single-day artificial spikes.

---

## 2. Corporate Action Adjustment Factor Integration (`FACT_CA_DIL_FCTR`)

### Overview
Currently, 180-day baseline price calculations utilize raw historical close prices (`Asd_Close_Price`). Corporate actions such as 1:1 Bonus Issues, 2:1 Stock Splits, or Rights Offerings artificially drop historical close prices without reflecting real market capital loss.

### Future Scope Specification
- Integrate `FACT_CA_DIL_FCTR.Fcdf_Price_Adj_Factor` into the $T-180$ base price lookup:
  $$\text{Adjusted Price}_{T-180} = \text{Closing Price}_{T-180} \times \text{Fcdf\_Price\_Adj\_Factor}$$
- Ensures Price Rise % ($\frac{\text{High}_{15D} - \text{Price}_{T-180}}{\text{Price}_{T-180}}$) accurately accounts for corporate action dilution.

---

## 3. Rolling 15-Day Volume Share Denominator Refinement

### Overview
Participant Volume Share % is currently calculated against 15-day total traded volume of the scrip.

### Future Scope Specification
- Option to evaluate participant volume dominance against **rolling 15-day moving average volume baselines** to detect silent cornering in low-liquidity phases.

---

## 4. Automated Same-Broker Wash Trade Risk Badging (`Acsd_Wash_Trd_Qty`)

### Overview
`AGG_CLNT_SEC_DAY` (`ACSD`) contains pre-calculated daily same-broker wash trade quantities (`Acsd_Wash_Trd_Qty`).

### Future Scope Specification
- Automatically calculate Wash Trade Ratio per client:
  $$\text{Wash Trade Ratio \%} = \frac{\text{Acsd\_Wash\_Trd\_Qty}}{\text{Acsd\_Buy\_Tot\_Qty} + \text{Acsd\_Sell\_Tot\_Qty}} \times 100$$
- Attach an automated **"High Wash Trade Risk"** alert badge to the Participant Audit modal when the ratio exceeds 10%.
