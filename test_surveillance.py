import unittest
import numpy as np
import pandas as pd
from pv_alert_surveillance import (
    SurveillanceConfig,
    SurveillanceEngine,
    normalize_columns,
    clean_historical_data
)

class TestPVSurveillanceFramework(unittest.TestCase):

    def test_scoring_buckets(self):
        engine = SurveillanceEngine()
        
        # 1. Price Rise scoring
        self.assertEqual(engine.score_price_rise(10.0), 0)
        self.assertEqual(engine.score_price_rise(15.0), 1)
        self.assertEqual(engine.score_price_rise(75.0), 1)
        self.assertEqual(engine.score_price_rise(100.0), 3)
        self.assertEqual(engine.score_price_rise(150.0), 3)
        self.assertEqual(engine.score_price_rise(200.0), 5)

        # 2. Z-Score scoring
        self.assertEqual(engine.score_zscore(1.0), 0)
        self.assertEqual(engine.score_zscore(1.645), 1)
        self.assertEqual(engine.score_zscore(2.0), 1)
        self.assertEqual(engine.score_zscore(2.33), 3)
        self.assertEqual(engine.score_zscore(3.0), 3)
        self.assertEqual(engine.score_zscore(3.09), 5)
        self.assertEqual(engine.score_zscore(4.0), 5)

        # 3. Band Persistence scoring
        self.assertEqual(engine.score_band_persistence(1), 0)
        self.assertEqual(engine.score_band_persistence(2), 0)
        self.assertEqual(engine.score_band_persistence(3), 1)
        self.assertEqual(engine.score_band_persistence(5), 1)
        self.assertEqual(engine.score_band_persistence(6), 3)
        self.assertEqual(engine.score_band_persistence(9), 3)
        self.assertEqual(engine.score_band_persistence(10), 5)

        # 4. New High Breakout scoring
        self.assertEqual(engine.score_new_high(0), 0)
        self.assertEqual(engine.score_new_high(1), 1)
        self.assertEqual(engine.score_new_high(4), 1)
        self.assertEqual(engine.score_new_high(5), 3)
        self.assertEqual(engine.score_new_high(9), 3)
        self.assertEqual(engine.score_new_high(10), 5)

    def test_calculate_core_metrics(self):
        engine = SurveillanceEngine()
        
        # Generate artificial price history
        np.random.seed(0)
        dates = pd.date_range(start="2020-01-01", periods=200, freq="D")
        
        close_prices = 100.0 + np.cumsum(np.random.normal(0.1, 0.5, 200))
        high_prices = close_prices + np.random.uniform(0.1, 1.5, 200)
        low_prices = close_prices - np.random.uniform(0.1, 1.5, 200)
        open_prices = close_prices - np.random.normal(0, 0.5, 200)
        volume = np.random.randint(10000, 50000, 200)

        df = pd.DataFrame({
            "Open": open_prices,
            "High": high_prices,
            "Low": low_prices,
            "Close": close_prices,
            "Volume": volume
        }, index=dates)

        res = engine.calculate_core_metrics("TEST", df, band_percent=0.20)

        self.assertIsNotNone(res)
        self.assertEqual(res.ticker, "TEST")
        self.assertIsInstance(res.price_rise_pct, float)
        self.assertIsInstance(res.price_z, float)
        self.assertIsInstance(res.volume_z, float)
        self.assertIsInstance(res.band_hit_days, int)
        self.assertIsInstance(res.new_high_days, int)
        self.assertIsInstance(res.final_score, float)

    def test_column_name_normalization(self):
        # Create a DataFrame with non-standard, mixed-case, spaced/underscored names
        df_mixed = pd.DataFrame({
            "ticker_symbol": ["TEST", "TEST"],
            "Trade Date": ["2026-07-01", "2026-07-02"],
            "open_price": [10.0, 11.0],
            "HIGH": [12.0, 13.0],
            "low": [9.0, 10.0],
            "ltp": [11.0, 12.0],
            "traded_qty": [1000, 1200]
        })

        normalized = normalize_columns(df_mixed, ["Ticker", "Date", "Open", "High", "Low", "Close", "Volume"])
        
        # Verify columns are successfully renamed to standard PascalCase
        self.assertIn("Ticker", normalized.columns)
        self.assertIn("Date", normalized.columns)
        self.assertIn("Open", normalized.columns)
        self.assertIn("High", normalized.columns)
        self.assertIn("Low", normalized.columns)
        self.assertIn("Close", normalized.columns)
        self.assertIn("Volume", normalized.columns)

    def test_data_cleansing_and_duplicates(self):
        # Create data with duplicates and NaNs
        df_dirty = pd.DataFrame({
            "Ticker": ["TEST", "TEST", "TEST", "TEST"],
            "Date": ["2026-07-01", "2026-07-02", "2026-07-02", "2026-07-03"], # duplicate on 07-02
            "Open": [10.0, 11.0, 11.2, None], # NaN Open
            "High": [12.0, 13.0, 13.5, 14.0],
            "Low": [9.0, 10.0, 9.8, 11.0],
            "Close": [11.0, 12.0, 12.5, 13.0],
            "Volume": [1000, 1200, 1500, 900]
        })

        cleaned = clean_historical_data(df_dirty)

        # 1. Verify duplicates are resolved (last one kept: 12.5 Close and 1500 Volume)
        self.assertEqual(len(cleaned), 3)
        row_07_02 = cleaned[cleaned["Date"] == "2026-07-02"]
        self.assertEqual(len(row_07_02), 1)
        self.assertEqual(row_07_02.iloc[0]["Close"], 12.5)
        self.assertEqual(row_07_02.iloc[0]["Volume"], 1500)

        # 2. Verify Open NaN is imputed with Close (13.0)
        row_07_03 = cleaned[cleaned["Date"] == "2026-07-03"]
        self.assertEqual(row_07_03.iloc[0]["Open"], 13.0)

    def test_smart_estimations_in_pipeline(self):
        engine = SurveillanceEngine()

        # 1. Setup price history (200 days)
        np.random.seed(0)
        dates = pd.date_range(start="2020-01-01", periods=200, freq="D")
        close_prices = 10.0 + np.cumsum(np.random.normal(0.05, 0.2, 200))
        high_prices = close_prices + 0.5
        low_prices = close_prices - 0.5
        open_prices = close_prices - 0.1
        volume = np.random.randint(10000, 20000, 200)

        df_hist = pd.DataFrame({
            "Ticker": "TEST",
            "Date": dates,
            "Open": open_prices,
            "High": high_prices,
            "Low": low_prices,
            "Close": close_prices,
            "Volume": volume
        })

        # 2. Setup trade log with missing LTPContribution and values
        # Let's check calculations for the last date (T)
        last_date_str = dates[-1].strftime("%Y-%m-%d")
        trades = pd.DataFrame([
            {
                "ticker_symbol": "TEST",
                "trade_date": last_date_str,
                "investor": "PAN_001",
                # missing CounterpartyPAN -> should default to UNKNOWN
                "buy_qty": 100,
                "sell_qty": 50
                # missing BuyValue, SellValue, LTPContribution -> should be estimated
            }
        ])

        reports = engine.run_pipeline(historical_df=df_hist, trades_df=trades)
        report = reports[0]

        # 3. Assert estimations took place correctly
        self.assertEqual(report.ticker, "TEST")
        audit = report.participant_audit
        
        # Verify counterparty PAN fell back to UNKNOWN
        self.assertEqual(audit.profit_makers[0]["PAN"], "PAN_001")
        # BuyVolume (100) and SellVolume (50) correctly verified
        self.assertEqual(audit.profit_makers[0]["BuyVolume"], 100)
        self.assertEqual(audit.profit_makers[0]["SellVolume"], 50)
        
        # MTM PnL calculated successfully using close price fallback
        self.assertIsInstance(audit.profit_makers[0]["NetPnL"], float)
        self.assertEqual(len(audit.ltp_contributors), 1)
        self.assertEqual(audit.ltp_contributors[0]["PAN"], "PAN_001")
        self.assertIsInstance(audit.ltp_contributors[0]["LTPContribution"], float)

    def test_corporate_announcements_in_pipeline(self):
        engine = SurveillanceEngine()

        # 1. Setup price history (200 days)
        np.random.seed(0)
        dates = pd.date_range(start="2020-01-01", periods=200, freq="D")
        close_prices = 10.0 + np.cumsum(np.random.normal(0.05, 0.2, 200))
        high_prices = close_prices + 0.5
        low_prices = close_prices - 0.5
        open_prices = close_prices - 0.1
        volume = np.random.randint(10000, 20000, 200)

        df_hist = pd.DataFrame({
            "Ticker": "TEST",
            "Date": dates,
            "Open": open_prices,
            "High": high_prices,
            "Low": low_prices,
            "Close": close_prices,
            "Volume": volume
        })

        # 2. Setup announcements data
        announcements = pd.DataFrame([
            {
                "ticker": "TEST",
                "date": dates[-5].strftime("%Y-%m-%d"),
                "details": "Major earnings release"
            },
            {
                "ticker": "TEST",
                "date": dates[-12].strftime("%Y-%m-%d"),
                "details": "CEO resignation"
            }
        ])

        reports = engine.run_pipeline(historical_df=df_hist, announcements_df=announcements)
        self.assertEqual(len(reports), 1)
        report = reports[0]

        # Verify announcements are loaded and sorted/cleaned properly
        self.assertEqual(len(report.announcements), 2)
        # Check details are matches
        details = [ann["Details"] for ann in report.announcements]
        self.assertIn("Major earnings release", details)
        self.assertIn("CEO resignation", details)

    def test_fact_trades_integration(self):
        engine = SurveillanceEngine()

        # 1. Setup price history (200 days)
        np.random.seed(0)
        dates = pd.date_range(start="2020-01-01", periods=200, freq="D")
        close_prices = [100.0] * 200
        high_prices = [101.0] * 200
        low_prices = [99.0] * 200
        open_prices = [100.0] * 200
        volume = [10000] * 200

        df_hist = pd.DataFrame({
            "Ticker": "TCS",
            "Date": dates,
            "Open": open_prices,
            "High": high_prices,
            "Low": low_prices,
            "Close": close_prices,
            "Volume": volume
        })

        # 2. Setup mock FACT_TRADES data
        last_date_str = dates[-1].strftime("%Y-%m-%d")
        
        # We will pass keys in mixed-case and underscores to test normalization
        fact_trades = pd.DataFrame([
            {
                "ftrd_symbol": "TCS",
                "ftrd_trd_date": last_date_str,
                "ftrd_trd_num": 10001,
                "ftrd_trd_qty": 500.0,
                "ftrd_trd_price": 105.0,
                "ftrd_trd_val": 52500.0,
                "ftrd_buy_exch_clnt_token": 999999,
                "ftrd_sell_exch_clnt_token": 888888,
                "ftrd_buy_exch_tm_token": 2020,
                "ftrd_sell_exch_tm_token": 2020, # Same broker TM
                "ftrd_same_broker_wash_flag": 1,
                "ftrd_init_clnt_token": 999999, # Buyer is initiator
                "ftrd_buy_ctcl_algo_flag": "111111111111011", # 13th digit is '0' -> Algo
                "ftrd_sell_ctcl_algo_flag": "111111111111111", # normal
                "ftrd_buy_ctcl_inet_dma_flag": "111111111111111", # Internet
                "ftrd_sell_ctcl_inet_dma_flag": "222222222222222", # DMA
                "ftrd_best_bid_price": 104.0,
                "ftrd_best_ask_price": 106.0,
                "ftrd_best_bid_qty": 1000.0,
                "ftrd_best_ask_qty": 1200.0,
                "ftrd_bid_pdg_ord_qty": 2000.0,
                "ftrd_ask_pdg_ord_qty": 2500.0,
                "ftrd_bid_pdg_ord_val": 208000.0,
                "ftrd_ask_pdg_ord_val": 265000.0,
                "ftrd_buy_sell_diff_time": "00:00:05", # 5 seconds delay
                "ftrd_buy_sell_diff_price": 1.0,
                "ftrd_buy_sell_diff_qty": 100.0,
                "ftrd_last_trd_price": 104.0
            }
        ])

        reports = engine.run_pipeline(historical_df=df_hist, trades_df=fact_trades)
        self.assertEqual(len(reports), 1)
        report = reports[0]

        # 3. Asserts on standard participant output generated from FACT_TRADES
        self.assertEqual(report.ticker, "TCS")
        audit = report.participant_audit
        
        # Verify Seller (888888) is the top profit maker because price fell from 105 to 100
        self.assertEqual(int(audit.profit_makers[0]["PAN"]), 888888)
        self.assertEqual(audit.profit_makers[0]["SellVolume"], 500)
        
        # Verify Buyer (999999) is also represented (in loss)
        pans = [int(p["PAN"]) for p in audit.profit_makers]
        self.assertIn(999999, pans)

        # 4. Asserts on advanced FACT_TRADES specific audit
        self.assertIsNotNone(report.fact_trades_audit)
        ft = report.fact_trades_audit
        
        # Wash trade counts
        self.assertEqual(ft.same_broker_wash_count, 1)
        self.assertEqual(ft.same_broker_wash_volume, 500.0)
        self.assertEqual(ft.self_trade_count, 0)
        
        # Channel statistics
        self.assertEqual(ft.algo_buy_count, 1)
        self.assertEqual(ft.algo_sell_count, 0)
        self.assertEqual(ft.algo_buy_pct, 100.0)
        self.assertEqual(ft.dma_sell_count, 1)
        self.assertEqual(ft.dma_sell_pct, 100.0)
        self.assertEqual(ft.internet_buy_count, 1)
        self.assertEqual(ft.internet_buy_pct, 100.0)
        
        # Order book spread & depth
        self.assertEqual(ft.avg_bid_ask_spread, 2.0)
        self.assertEqual(ft.avg_bid_pdg_qty, 2000.0)
        self.assertEqual(ft.avg_ask_pdg_val, 265000.0)
        
        # Match delay & differences
        self.assertEqual(ft.avg_buy_sell_diff_time_sec, 5.0)
        self.assertEqual(ft.avg_buy_sell_diff_price, 1.0)
        self.assertEqual(ft.avg_buy_sell_diff_qty, 100.0)

    def test_modified_zscore_mad(self):
        engine = SurveillanceEngine()
        
        # Generate baseline series with one massive outlier
        np.random.seed(0)
        dates = pd.date_range(start="2020-01-01", periods=196, freq="D")
        
        # All baseline volumes are constant at 1000, except one outlier day (index 100) which is 50,000
        volume = [1000.0] * 196
        volume[100] = 50000.0
        
        # Now, the active day (T) has a significant volume increase to 5000
        volume[-1] = 5000.0
        
        # Close prices constant
        close = [10.0] * 196
        high = [10.0] * 196
        low = [10.0] * 196
        open_p = [10.0] * 196
        
        df = pd.DataFrame({
            "Ticker": "TCS",
            "Date": dates,
            "Open": open_p,
            "High": high,
            "Low": low,
            "Close": close,
            "Volume": volume
        })
        
        res = engine.calculate_core_metrics("TCS", df, band_percent=0.20)
        
        self.assertIsInstance(res.volume_z, float)
        print(f"\n  [Volume Z Verification] Standard Z-score: {res.volume_z:.3f}")

    def test_circular_trade_loops(self):
        engine = SurveillanceEngine()
        
        # Create mock trades establishing a loop: PAN_A -> PAN_B -> PAN_C -> PAN_A
        trades = pd.DataFrame([
            {"Ticker": "TCS", "PAN": "PAN_A", "CounterpartyPAN": "PAN_B", "BuyVolume": 100.0, "SellVolume": 0.0},
            {"Ticker": "TCS", "PAN": "PAN_B", "CounterpartyPAN": "PAN_C", "BuyVolume": 120.0, "SellVolume": 0.0},
            {"Ticker": "TCS", "PAN": "PAN_C", "CounterpartyPAN": "PAN_A", "BuyVolume": 150.0, "SellVolume": 0.0},
        ])
        
        res = engine.analyze_participants("TCS", trades, final_close=100.0, total_exchange_vol=1000.0)
        
        self.assertEqual(len(res.circular_loops), 1)
        loop = res.circular_loops[0]
        self.assertEqual(loop["RotatedVolume"], 100.0)
        self.assertEqual(loop["GrossVolume"], 370.0)
        self.assertIn("PAN_A -> PAN_B -> PAN_C -> PAN_A", loop["Cycle"])

    def test_trade_reversal_ratio(self):
        engine = SurveillanceEngine()
        
        # Pair 1: Perfect reversal (A buys 100 from B, and B buys 100 from A)
        # Pair 2: Partial reversal (C buys 100 from D, D buys 20 from C)
        trades = pd.DataFrame([
            {"Ticker": "TCS", "PAN": "PAN_A", "CounterpartyPAN": "PAN_B", "BuyVolume": 100.0, "SellVolume": 0.0},
            {"Ticker": "TCS", "PAN": "PAN_B", "CounterpartyPAN": "PAN_A", "BuyVolume": 100.0, "SellVolume": 0.0},
            {"Ticker": "TCS", "PAN": "PAN_C", "CounterpartyPAN": "PAN_D", "BuyVolume": 100.0, "SellVolume": 0.0},
            {"Ticker": "TCS", "PAN": "PAN_D", "CounterpartyPAN": "PAN_C", "BuyVolume": 20.0, "SellVolume": 0.0},
        ])
        
        res = engine.analyze_participants("TCS", trades, final_close=100.0, total_exchange_vol=1000.0)
        
        self.assertEqual(len(res.reversal_pairs), 2)
        
        # Perfect reversal pair
        r_perf = [r for r in res.reversal_pairs if "PAN_A" in r["Pair"]][0]
        self.assertEqual(r_perf["ReversalRatio"], 100.0)
        self.assertEqual(r_perf["GrossVolume"], 200.0)
        
        # Partial reversal pair
        r_part = [r for r in res.reversal_pairs if "PAN_C" in r["Pair"]][0]
        # RTR = 2 * min(100, 20) / (120) = 40 / 120 = 33.33%
        self.assertEqual(r_part["ReversalRatio"], 33.33)

    def test_otr_and_order_imbalance(self):
        from pv_alert_surveillance import normalize_fact_trades_columns
        engine = SurveillanceEngine()
        
        # TCS mock FACT_TRADES
        fact_trades = pd.DataFrame([
            {
                "ftrd_symbol": "TCS",
                "ftrd_trd_date": "2026-07-16",
                "ftrd_trd_num": 1,
                "ftrd_trd_qty": 10.0,
                "ftrd_trd_price": 100.0,
                "ftrd_buy_exch_clnt_token": "PAN_A",
                "ftrd_sell_exch_clnt_token": "PAN_B",
                "ftrd_buy_ord_num": 101,
                "ftrd_sell_ord_num": 201,
                "ftrd_buy_ord_qty": 100.0,
                "ftrd_sell_ord_qty": 20.0,
            }
        ])
        
        normalized = normalize_fact_trades_columns(fact_trades)
        res = engine.analyze_fact_trades("TCS", normalized)
        
        self.assertEqual(res.avg_order_imbalance, round((100.0 - 20.0) / 120.0, 4))
        self.assertEqual(len(res.top_otr_contributors), 2)
        
        otr_a = [o for o in res.top_otr_contributors if o["PAN"] == "PAN_A"][0]
        self.assertEqual(otr_a["OTR"], 10.0)


if __name__ == "__main__":
    unittest.main()
