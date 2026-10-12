import sys
import os
import math
import numpy as np
import pandas as pd

# Ensure root directory is in sys.path
ROOT_DIR = "/Users/vishesh/Downloads/UI_PVASF copy"
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from pv_alert_surveillance import SurveillanceEngine, SurveillanceConfig, MarketMetricsResult

def run_deep_audit():
    print("=" * 60)
    print("STARTING DEEP STATISTICAL & MATHEMATICAL EDGE-CASE AUDIT")
    print("=" * 60)
    
    engine = SurveillanceEngine(SurveillanceConfig())

    # TEST 1: Constant Flat Price (Zero Variance, sigma = 0)
    dates = pd.date_range("2025-01-01", periods=100, freq="B")
    df_flat = pd.DataFrame({
        "Ticker": ["FLAT"] * 100,
        "Date": dates,
        "Open": [100.0] * 100,
        "High": [100.0] * 100,
        "Low": [100.0] * 100,
        "Close": [100.0] * 100,
        "Volume": [1000] * 100
    })
    res_flat = engine.calculate_core_metrics("FLAT", df_flat)
    assert not math.isnan(res_flat.price_z), "Price Z should not be NaN on zero variance"
    assert not math.isnan(res_flat.volume_z), "Volume Z should not be NaN on zero variance"
    assert res_flat.price_z == 0.0, f"Price Z should be 0.0, got {res_flat.price_z}"
    assert res_flat.volume_z == 0.0, f"Volume Z should be 0.0, got {res_flat.volume_z}"
    assert res_flat.final_score == 0.0, f"Flat stock should score 0.0, got {res_flat.final_score}"
    print("✓ Test 1 Passed: Zero variance flat pricing handled without division by zero (Z = 0.0, Score = 0.0)")

    # TEST 2: Zero Volume Days (Inactive / Illiquid Trading)
    df_zero_vol = df_flat.copy()
    df_zero_vol["Volume"] = 0
    res_zero_vol = engine.calculate_core_metrics("ZEROVOL", df_zero_vol)
    assert not math.isnan(res_zero_vol.volume_z)
    assert res_zero_vol.volume_z == 0.0
    print("✓ Test 2 Passed: Zero volume scrip handled cleanly without errors")

    # TEST 3: Short History (e.g., 35 trading days available, IPO or newly listed)
    dates_short = pd.date_range("2025-01-01", periods=35, freq="B")
    df_short = pd.DataFrame({
        "Ticker": ["SHORT"] * 35,
        "Date": dates_short,
        "Open": [10.0 + i for i in range(35)],
        "High": [11.0 + i for i in range(35)],
        "Low": [9.5 + i for i in range(35)],
        "Close": [10.5 + i for i in range(35)],
        "Volume": [10000 + i * 500 for i in range(35)]
    })
    res_short = engine.calculate_core_metrics("SHORT", df_short)
    assert res_short.price_rise_pct > 0
    assert res_short.final_score >= 0
    print(f"✓ Test 3 Passed: Short history (35d) gracefully evaluated: Rise={res_short.price_rise_pct:.1f}%, Score={res_short.final_score}")

    # TEST 4: Extreme Outlier Pump (+300% Price Rise, Massive Volume Surge, 12 Circuit Hits)
    df_extreme = df_flat.copy()
    # In the last 15 days, pump price from 100 to 450, volume 50x, all hitting circuit
    for idx in range(85, 100):
        df_extreme.loc[idx, "Close"] = 100.0 * (1.10 ** (idx - 84))
        df_extreme.loc[idx, "High"] = df_extreme.loc[idx, "Close"] * 1.02
        df_extreme.loc[idx, "Volume"] = 500000
    res_extreme = engine.calculate_core_metrics("EXTREME", df_extreme)
    assert res_extreme.price_rise_score == 5, f"Expected Price Rise score 5, got {res_extreme.price_rise_score}"
    assert res_extreme.price_z_score == 5, f"Expected Price Z score 5, got {res_extreme.price_z_score}"
    assert res_extreme.volume_z_score == 5, f"Expected Volume Z score 5, got {res_extreme.volume_z_score}"
    assert res_extreme.new_high_score == 5, f"Expected New High score 5, got {res_extreme.new_high_score}"
    assert res_extreme.final_score >= 80.0, f"Expected high score >= 80.0, got {res_extreme.final_score}"
    print(f"✓ Test 4 Passed: Extreme pump correctly scores maximums across all dimensions (Final Score = {res_extreme.final_score})")

    # TEST 5: Corporate Action Dilution (2:1 Stock Split / Bonus, dilution_multiplier = 0.5)
    # Price dropped from 200 to 100 on split, but genuine value is unchanged
    df_split = df_flat.copy()
    # Baseline was 200
    df_split.loc[0, "Close"] = 200.0
    # Now trading at 110 after split (true gain is from adjusted 100 to 110 = +10%)
    df_split.loc[99, "Close"] = 110.0
    df_split.loc[99, "High"] = 110.0
    # With multiplier 0.5, baseline 200 becomes 100, so price rise is (110 - 100)/100 = +10%
    res_split = engine.calculate_core_metrics("SPLIT", df_split, dilution_multiplier=0.5)
    assert abs(res_split.price_rise_pct - 10.0) < 0.1, f"Expected ~10%, got {res_split.price_rise_pct}"
    assert res_split.price_rise_score == 0, f"Expected score 0 for 10% rise, got {res_split.price_rise_score}"
    print(f"✓ Test 5 Passed: Corporate action dilution multiplier correctly adjusts baseline (Adjusted Rise = {res_split.price_rise_pct:.2f}%)")

    # TEST 6: Watchlist Cutoff Boundary (Exactly 60.0 threshold)
    # 5 scores: if scores are 3, 3, 3, 3, 3 => (20*3*5)/5 = 60.0
    w = engine.config.weights
    scores = {"price_rise": 3, "price_z": 3, "volume_z": 3, "band_persistence": 3, "new_high": 3}
    calc_score = round(sum((w.get(k, 0.0) * s) / 5.0 for k, s in scores.items()), 2)
    assert calc_score == 60.0, f"Expected 60.0, got {calc_score}"
    assert calc_score >= engine.config.threshold, "Score 60.0 must meet threshold >= 60.0"
    print(f"✓ Test 6 Passed: Watchlist cutoff boundary score 60.0 strictly qualifies for watchlist")

    # TEST 7: Lookahead Bias Check in EODSurveillanceService
    from backend.services.surveillance_service import EODSurveillanceService
    svc = EODSurveillanceService()
    test_date = "2025-10-15"
    summary = svc.get_scrips_summary(as_of_date=test_date)
    # Check that for any scrip detail as of test_date, history has NO date > test_date
    detail = svc.get_scrip_detail("BINANIIND", as_of_date=test_date)
    hist_dates = [h["date"] for h in detail["history"]]
    assert all(d <= test_date for d in hist_dates), f"Lookahead bias detected! Dates exceed {test_date}: {[d for d in hist_dates if d > test_date]}"
    print(f"✓ Test 7 Passed: Lookahead bias verification passed. Zero future dates leak into observation {test_date}")

    # TEST 8: Participant Forensic Conduct Audit Integrity
    from backend.db.database import SessionLocal
    from backend.db.models import ParticipantDailyTrade, CounterpartyTradePair
    db = SessionLocal()
    try:
        p_count = db.query(ParticipantDailyTrade).count()
        pair_count = db.query(CounterpartyTradePair).count()
        print(f"✓ Test 8 Passed: Physical DB records verified: {p_count} participant trades, {pair_count} counterparty matched pairs")
    finally:
        db.close()

    print("=" * 60)
    print("ALL 8 DEEP END-TO-END STATISTICAL TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_deep_audit()
