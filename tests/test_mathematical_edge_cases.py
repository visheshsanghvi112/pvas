"""
tests/test_mathematical_edge_cases.py
────────────────────────────────────────────────────────────────────────────
Deep statistical, mathematical, and algorithmic edge-case verification suite.

Covers:
  1. Constant Flat Price (Zero Variance, sigma = 0, no division by zero)
  2. Zero Volume Days (Inactive / Illiquid Trading)
  3. Short Trading History (e.g. 35 trading sessions, newly listed IPOs)
  4. Extreme Outlier Pump (+300% price rise, massive volume, circuit persistence)
  5. Corporate Action Dilution (2:1 stock split / bonus baseline price adjustments)
  6. Watchlist Cutoff Boundary Conditions (exactly 60.0 threshold)
  7. Lookahead Bias Prevention (observation window temporal integrity)
  8. Participant Forensic Conduct Audit Integrity
"""

import math
import numpy as np
import pandas as pd
import pytest

from pv_alert_surveillance import SurveillanceEngine, SurveillanceConfig, MarketMetricsResult
from backend.services.surveillance_service import EODSurveillanceService
from backend.db.database import SessionLocal
from backend.db.models import ParticipantDailyTrade, CounterpartyTradePair


class TestMathematicalEdgeCases:
    @pytest.fixture(autouse=True)
    def setup_engine(self):
        self.engine = SurveillanceEngine(SurveillanceConfig())
        self.dates = pd.date_range("2025-01-01", periods=100, freq="B")

    def test_zero_variance_flat_pricing(self):
        """Zero variance in prices should not trigger division by zero or NaN Z-scores."""
        df_flat = pd.DataFrame({
            "Ticker": ["FLAT"] * 100,
            "Date": self.dates,
            "Open": [100.0] * 100,
            "High": [100.0] * 100,
            "Low": [100.0] * 100,
            "Close": [100.0] * 100,
            "Volume": [1000] * 100
        })
        res = self.engine.calculate_core_metrics("FLAT", df_flat)
        assert not math.isnan(res.price_z), "Price Z should not be NaN on zero variance"
        assert not math.isnan(res.volume_z), "Volume Z should not be NaN on zero variance"
        assert res.price_z == 0.0, f"Price Z should be 0.0, got {res.price_z}"
        assert res.volume_z == 0.0, f"Volume Z should be 0.0, got {res.volume_z}"
        assert res.final_score == 0.0, f"Flat stock should score 0.0, got {res.final_score}"

    def test_zero_volume_illiquid(self):
        """Scrips with zero volume across all sessions must evaluate cleanly with volume_z = 0."""
        df_zero_vol = pd.DataFrame({
            "Ticker": ["ZEROVOL"] * 100,
            "Date": self.dates,
            "Open": [100.0] * 100,
            "High": [100.0] * 100,
            "Low": [100.0] * 100,
            "Close": [100.0] * 100,
            "Volume": [0] * 100
        })
        res = self.engine.calculate_core_metrics("ZEROVOL", df_zero_vol)
        assert not math.isnan(res.volume_z)
        assert res.volume_z == 0.0

    def test_short_history_ipo(self):
        """Scrips with limited historical sessions (e.g. 35 days) must evaluate without crashing."""
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
        res = self.engine.calculate_core_metrics("SHORT", df_short)
        assert res.price_rise_pct > 0
        assert res.final_score >= 0

    def test_extreme_outlier_pump(self):
        """Extreme artificial pump (+300% surge, 50x volume) must trigger top-tier alert scores."""
        df_extreme = pd.DataFrame({
            "Ticker": ["EXTREME"] * 100,
            "Date": self.dates,
            "Open": [100.0] * 100,
            "High": [100.0] * 100,
            "Low": [100.0] * 100,
            "Close": [100.0] * 100,
            "Volume": [1000] * 100
        })
        for idx in range(85, 100):
            df_extreme.loc[idx, "Close"] = 100.0 * (1.10 ** (idx - 84))
            df_extreme.loc[idx, "High"] = df_extreme.loc[idx, "Close"] * 1.02
            df_extreme.loc[idx, "Volume"] = 500000

        res = self.engine.calculate_core_metrics("EXTREME", df_extreme)
        assert res.price_rise_score == 5, f"Expected Price Rise score 5, got {res.price_rise_score}"
        assert res.price_z_score == 5, f"Expected Price Z score 5, got {res.price_z_score}"
        assert res.volume_z_score == 5, f"Expected Volume Z score 5, got {res.volume_z_score}"
        assert res.new_high_score == 5, f"Expected New High score 5, got {res.new_high_score}"
        assert res.final_score >= 80.0, f"Expected high score >= 80.0, got {res.final_score}"

    def test_corporate_action_dilution(self):
        """Stock splits and bonus dilutions must adjust baseline price without artificial inflation."""
        df_split = pd.DataFrame({
            "Ticker": ["SPLIT"] * 100,
            "Date": self.dates,
            "Open": [100.0] * 100,
            "High": [100.0] * 100,
            "Low": [100.0] * 100,
            "Close": [100.0] * 100,
            "Volume": [1000] * 100
        })
        df_split.loc[0, "Close"] = 200.0
        df_split.loc[99, "Close"] = 110.0
        df_split.loc[99, "High"] = 110.0

        res = self.engine.calculate_core_metrics("SPLIT", df_split, dilution_multiplier=0.5)
        assert abs(res.price_rise_pct - 10.0) < 0.1, f"Expected ~10%, got {res.price_rise_pct}"
        assert res.price_rise_score == 0, f"Expected score 0 for 10% rise, got {res.price_rise_score}"

    def test_watchlist_cutoff_boundary(self):
        """Scrip scoring exactly 60.0 must meet the >= 60.0 cutoff threshold."""
        w = self.engine.config.weights
        scores = {"price_rise": 3, "price_z": 3, "volume_z": 3, "band_persistence": 3, "new_high": 3}
        calc_score = round(sum((w.get(k, 0.0) * s) / 5.0 for k, s in scores.items()), 2)
        assert calc_score == 60.0
        assert calc_score >= self.engine.config.threshold

    def test_lookahead_bias_prevention(self):
        """Surveillance service must never leak future data past the selected as_of_date."""
        svc = EODSurveillanceService()
        test_date = "2025-10-15"
        detail = svc.get_scrip_detail("BINANIIND", as_of_date=test_date)
        hist_dates = [h["date"] for h in detail["history"]]
        assert all(d <= test_date for d in hist_dates), f"Lookahead bias detected! Dates exceed {test_date}"

    def test_participant_forensic_db_integrity(self):
        """Verify presence and validity of active participant trades and counterparty pairs."""
        db = SessionLocal()
        try:
            p_count = db.query(ParticipantDailyTrade).count()
            pair_count = db.query(CounterpartyTradePair).count()
            assert p_count > 0, "Participant trades table must not be empty"
            assert pair_count > 0, "Counterparty pairs table must not be empty"
        finally:
            db.close()
