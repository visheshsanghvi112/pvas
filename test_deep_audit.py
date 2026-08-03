import sys
import unittest
import numpy as np
import pandas as pd
from pv_alert_surveillance import SurveillanceEngine, SurveillanceConfig
from backend.services.surveillance_service import EODSurveillanceService

class TestDeepFrameworkAudit(unittest.TestCase):

    def setUp(self):
        self.engine = SurveillanceEngine()
        self.service = EODSurveillanceService()

    # ------------------------------------------------------------------
    # 1. PRICE RISE BOUNDARY TESTS
    # ------------------------------------------------------------------
    def test_price_rise_exact_boundaries(self):
        self.assertEqual(self.engine.score_price_rise(14.99), 0)
        self.assertEqual(self.engine.score_price_rise(15.00), 1)
        self.assertEqual(self.engine.score_price_rise(75.00), 1)
        self.assertEqual(self.engine.score_price_rise(75.01), 3)
        self.assertEqual(self.engine.score_price_rise(150.00), 3)
        self.assertEqual(self.engine.score_price_rise(150.01), 5)

    # ------------------------------------------------------------------
    # 2. Z-SCORE STATISTICAL THRESHOLD BOUNDARY TESTS
    # ------------------------------------------------------------------
    def test_zscore_exact_boundaries(self):
        self.assertEqual(self.engine.score_zscore(1.644), 0)
        self.assertEqual(self.engine.score_zscore(1.645), 1)
        self.assertEqual(self.engine.score_zscore(2.329), 1)
        self.assertEqual(self.engine.score_zscore(2.330), 3)
        self.assertEqual(self.engine.score_zscore(3.089), 3)
        self.assertEqual(self.engine.score_zscore(3.090), 5)

    # ------------------------------------------------------------------
    # 3. PRICE BAND PERSISTENCE BOUNDARY TESTS
    # ------------------------------------------------------------------
    def test_band_persistence_exact_boundaries(self):
        self.assertEqual(self.engine.score_band_persistence(0), 0)
        self.assertEqual(self.engine.score_band_persistence(2), 0)
        self.assertEqual(self.engine.score_band_persistence(3), 1)
        self.assertEqual(self.engine.score_band_persistence(5), 1)
        self.assertEqual(self.engine.score_band_persistence(6), 3)
        self.assertEqual(self.engine.score_band_persistence(9), 3)
        self.assertEqual(self.engine.score_band_persistence(10), 5)
        self.assertEqual(self.engine.score_band_persistence(15), 5)

    # ------------------------------------------------------------------
    # 4. 180-DAY NEW HIGH BREAKOUT BOUNDARY TESTS
    # ------------------------------------------------------------------
    def test_new_high_exact_boundaries(self):
        self.assertEqual(self.engine.score_new_high(0), 0)
        self.assertEqual(self.engine.score_new_high(1), 1)
        self.assertEqual(self.engine.score_new_high(4), 1)
        self.assertEqual(self.engine.score_new_high(5), 3)
        self.assertEqual(self.engine.score_new_high(9), 3)
        self.assertEqual(self.engine.score_new_high(10), 5)
        self.assertEqual(self.engine.score_new_high(15), 5)

    # ------------------------------------------------------------------
    # 5. COMPOSITE SCORE & RISK TRIAGE TEST
    # ------------------------------------------------------------------
    def test_risk_triage_classification(self):
        # High Risk threshold = 15.0
        risk_high, status_high = self.service._risk_and_status(15.0)
        self.assertEqual(risk_high, "High")
        self.assertEqual(status_high, "Open")

        # Medium Risk threshold = 10.0
        risk_med, status_med = self.service._risk_and_status(14.9)
        self.assertEqual(risk_med, "Medium")
        self.assertEqual(status_med, "Under review")

        risk_med2, status_med2 = self.service._risk_and_status(10.0)
        self.assertEqual(risk_med2, "Medium")
        self.assertEqual(status_med2, "Under review")

        # Low Risk threshold < 10.0
        risk_low, status_low = self.service._risk_and_status(9.9)
        self.assertEqual(risk_low, "Low")
        self.assertEqual(status_low, "Normal")

    # ------------------------------------------------------------------
    # 6. PARTICIPANT AUDITS (LTP, RTR, LOOPS)
    # ------------------------------------------------------------------
    def test_circular_loops_detection(self):
        # Create circular trade flow: PAN A -> PAN B -> PAN C -> PAN A
        trades_df = pd.DataFrame([
            {"Ticker": "LOOP_SCRIP", "PAN": "PAN_A", "CounterpartyPAN": "PAN_B", "BuyVolume": 10000, "SellVolume": 0, "LTPContribution": 1.0},
            {"Ticker": "LOOP_SCRIP", "PAN": "PAN_B", "CounterpartyPAN": "PAN_C", "BuyVolume": 10000, "SellVolume": 0, "LTPContribution": 1.0},
            {"Ticker": "LOOP_SCRIP", "PAN": "PAN_C", "CounterpartyPAN": "PAN_A", "BuyVolume": 10000, "SellVolume": 0, "LTPContribution": 1.0},
        ])

        audit = self.engine.analyze_participants("LOOP_SCRIP", trades_df, final_close=100.0, total_exchange_vol=100000.0)
        self.assertTrue(len(audit.circular_loops) > 0)
        loop_str = audit.circular_loops[0]["Cycle"]
        self.assertIn("PAN_A", loop_str)
        self.assertIn("PAN_B", loop_str)
        self.assertIn("PAN_C", loop_str)

if __name__ == "__main__":
    unittest.main()
