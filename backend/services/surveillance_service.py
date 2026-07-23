import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from pv_alert_surveillance import (
    SurveillanceConfig,
    SurveillanceEngine,
    clean_historical_data,
    MarketMetricsResult,
    ParticipantAuditResult,
    FactTradesAuditResult
)

class EODSurveillanceService:
    def __init__(self):
        self.config = SurveillanceConfig(threshold=10.0)
        self.engine = SurveillanceEngine(self.config)
        self.current_df = self._generate_sample_teradata_eod()
        self.current_trades_df = self._generate_sample_trades_df()

    def _generate_sample_teradata_eod(self, days: int = 260) -> pd.DataFrame:
        """Generates sample structured Teradata EOD price-volume extract for standard scrips."""
        end_date = datetime.now()
        dates = [end_date - timedelta(days=days - i) for i in range(days)]
        
        scrips = [
            ("ALPHATECH", 2400.0, 0.08, False),
            ("NOVAENERGY", 140.0, 0.25, True),   # High price rise & band hits
            ("ZENITHBIO", 1600.0, 0.05, False),
            ("ORBITCEM", 1550.0, 0.12, True),   # High volume spike
            ("TCS", 3800.0, 0.04, False),
            ("SBIN", 780.0, 0.18, True),       # High z-score
            ("ICICIBANK", 1100.0, 0.06, False),
            ("AXISBANK", 1150.0, 0.15, False)
        ]
        
        all_rows = []
        for ticker, base_price, volatility, inject_anomaly in scrips:
            np.random.seed(abs(hash(ticker)) % 10000)
            trend = np.linspace(0, base_price * 0.35 if inject_anomaly else base_price * 0.08, days)
            noise = np.cumsum(np.random.normal(0.1, base_price * volatility * 0.05, days))
            close = np.maximum(base_price + trend + noise, 10.0)
            
            high = close + np.abs(np.random.normal(base_price * 0.015, base_price * 0.008, days))
            low = np.maximum(close - np.abs(np.random.normal(base_price * 0.012, base_price * 0.006, days)), 5.0)
            open_p = low + (high - low) * np.random.uniform(0.2, 0.8, days)
            volume = np.random.randint(100000, 1500000, days)
            
            if inject_anomaly:
                for idx in range(days - 12, days):
                    high[idx] = close[idx - 1] * 1.195
                    close[idx] = high[idx]
                    volume[idx] = int(volume[idx] * 4.2)
            
            for d, o, h, l, c, v in zip(dates, open_p, high, low, close, volume):
                all_rows.append({
                    "Ticker": ticker,
                    "Date": d,
                    "Open": round(float(o), 2),
                    "High": round(float(h), 2),
                    "Low": round(float(l), 2),
                    "Close": round(float(c), 2),
                    "Volume": int(v)
                })
                
        df = pd.DataFrame(all_rows)
        return clean_historical_data(df)

    def _generate_sample_trades_df(self) -> pd.DataFrame:
        """Generates sample participant trades data for auditing LTP and counterparty concentration."""
        pans = ["PAN A", "PAN B", "PAN C", "PAN D", "PAN E", "PAN F"]
        rows = []
        for ticker in ["ALPHATECH", "NOVAENERGY", "ZENITHBIO", "ORBITCEM", "TCS", "SBIN", "ICICIBANK", "AXISBANK"]:
            for i in range(20):
                p1 = np.random.choice(pans)
                p2 = np.random.choice([p for p in pans if p != p1])
                buy_vol = np.random.randint(10000, 100000)
                sell_vol = buy_vol
                price = np.random.uniform(100, 2000)
                ltp_contrib = np.random.uniform(-0.5, 2.5)
                
                rows.append({
                    "Ticker": ticker,
                    "Date": datetime.now(),
                    "PAN": p1,
                    "CounterpartyPAN": p2,
                    "BuyVolume": buy_vol,
                    "SellVolume": 0,
                    "BuyValue": buy_vol * price,
                    "SellValue": 0,
                    "LTPContribution": ltp_contrib
                })
                rows.append({
                    "Ticker": ticker,
                    "Date": datetime.now(),
                    "PAN": p2,
                    "CounterpartyPAN": p1,
                    "BuyVolume": 0,
                    "SellVolume": sell_vol,
                    "BuyValue": 0,
                    "SellValue": sell_vol * price,
                    "LTPContribution": 0.0
                })
        return pd.DataFrame(rows)

    def update_weights(self, weights: Dict[str, float], threshold: Optional[float] = None) -> SurveillanceConfig:
        """Dynamically updates scoring weights w1..w5 and risk score threshold."""
        for k, v in weights.items():
            if k in self.config.weights:
                self.config.weights[k] = float(v)
        if threshold is not None:
            self.config.threshold = float(threshold)
        self.engine = SurveillanceEngine(self.config)
        return self.config

    def get_watchlist(self) -> List[Dict[str, Any]]:
        """Returns shortlisted scrips violating risk threshold according to Section 3 of PVASF_CORE_SPEC."""
        scrips = self.get_scrips_summary()
        return [s for s in scrips if s["watchlist"]]

    def get_scrips_summary(self) -> List[Dict[str, Any]]:
        """Calculates surveillance metrics for all scrips in the current EOD dataset."""
        tickers = self.current_df["Ticker"].unique().tolist()
        results = []
        
        for ticker in tickers:
            df_t = self.current_df[self.current_df["Ticker"] == ticker].sort_values("Date").reset_index(drop=True)
            if len(df_t) < 196:
                continue
                
            try:
                metrics: MarketMetricsResult = self.engine.calculate_core_metrics(ticker, df_t)
                start_p = float(df_t["Close"].iloc[-181])
                end_p = float(df_t["Close"].iloc[-1])
                change_pct = float(((end_p - start_p) / start_p) * 100)
                
                results.append({
                    "ticker": ticker,
                    "symbol": ticker,
                    "latest_close": round(end_p, 2),
                    "price_change_pct": round(change_pct, 2),
                    "risk_score": round(metrics.final_score, 2),
                    "score": round(metrics.final_score, 2),
                    "price_rise_pct": round(metrics.price_rise_pct, 2),
                    "price_z": round(metrics.price_z, 2),
                    "volume_z": round(metrics.volume_z, 2),
                    "band_hit_days": metrics.band_hit_days,
                    "new_high_days": metrics.new_high_days,
                    "watchlist": metrics.final_score >= self.config.threshold,
                    "risk": "High" if metrics.final_score >= 15.0 else ("Medium" if metrics.final_score >= 10.0 else "Low"),
                    "status": "Open" if metrics.final_score >= 10.0 else "Normal"
                })
            except Exception as e:
                print(f"[skip] {ticker}: {e}")
                
        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return results

    def get_scrip_detail(self, ticker: str) -> Dict[str, Any]:
        """Returns scrip EOD OHLCV price/volume history and calculated core PV metrics."""
        df_t = self.current_df[self.current_df["Ticker"] == ticker].sort_values("Date").reset_index(drop=True)
        if df_t.empty:
            raise ValueError(f"Scrip {ticker} not found in current EOD dataset")
            
        metrics: MarketMetricsResult = self.engine.calculate_core_metrics(ticker, df_t)
        
        history = []
        for _, row in df_t.tail(180).iterrows():
            history.append({
                "date": row["Date"].strftime("%Y-%m-%d") if isinstance(row["Date"], (datetime, pd.Timestamp)) else str(row["Date"]),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"])
            })
            
        return {
            "ticker": ticker,
            "symbol": ticker,
            "metrics": metrics.as_dict(),
            "score_breakdown": [
                {"label": "Price Rise", "score": metrics.price_rise_score, "weight": self.config.weights.get("price_rise", 1.0), "contribution": metrics.price_rise_score * self.config.weights.get("price_rise", 1.0)},
                {"label": "Price Z", "score": metrics.price_z_score, "weight": self.config.weights.get("price_z", 1.0), "contribution": metrics.price_z_score * self.config.weights.get("price_z", 1.0)},
                {"label": "Volume Z", "score": metrics.volume_z_score, "weight": self.config.weights.get("volume_z", 1.0), "contribution": metrics.volume_z_score * self.config.weights.get("volume_z", 1.0)},
                {"label": "Band Persistence", "score": metrics.band_score, "weight": self.config.weights.get("band_persistence", 1.0), "contribution": metrics.band_score * self.config.weights.get("band_persistence", 1.0)},
                {"label": "180 Day New High", "score": metrics.new_high_score, "weight": self.config.weights.get("new_high", 1.0), "contribution": metrics.new_high_score * self.config.weights.get("new_high", 1.0)}
            ],
            "history": history,
            "summary": {
                "start_price": round(float(df_t["Close"].iloc[-181]), 2),
                "latest_close": round(float(df_t["Close"].iloc[-1]), 2),
                "price_change_pct": round(float(((df_t["Close"].iloc[-1] - df_t["Close"].iloc[-181]) / df_t["Close"].iloc[-181]) * 100), 2),
                "avg_15d_volume": int(df_t["Volume"].tail(15).mean())
            }
        }

    def get_scrip_participants(self, ticker: str) -> Dict[str, Any]:
        """Serves participant-level analytical breakdown per Section 4 of PVASF_CORE_SPEC."""
        df_t = self.current_df[self.current_df["Ticker"] == ticker].sort_values("Date").reset_index(drop=True)
        final_close = float(df_t["Close"].iloc[-1]) if not df_t.empty else 100.0
        total_vol = float(df_t["Volume"].tail(15).sum()) if not df_t.empty else 1000000.0
        
        part_res: ParticipantAuditResult = self.engine.analyze_participants(
            ticker, self.current_trades_df, final_close, total_vol
        )
        
        return {
            "ticker": ticker,
            "ltp_contributors": part_res.ltp_contributors,
            "volume_share": part_res.volume_share,
            "counterparty_pairs": part_res.counterparty_pairs,
            "reversal_pairs": part_res.reversal_pairs,
            "circular_loops": part_res.circular_loops,
            "profit_makers": part_res.profit_makers
        }

    def load_eod_csv(self, file_contents: bytes, filename: str) -> Dict[str, Any]:
        """Ingests structured EOD CSV file (e.g. Teradata export) into the surveillance engine."""
        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(pd.io.common.BytesIO(file_contents))
            elif filename.endswith((".xls", ".xlsx")):
                df = pd.read_excel(pd.io.common.BytesIO(file_contents))
            else:
                return {"error": "Unsupported file format. Please upload CSV or Excel EOD files."}
                
            clean_df = clean_historical_data(df)
            self.current_df = clean_df
            scrips = self.get_scrips_summary()
            
            return {
                "status": "SUCCESS",
                "filename": filename,
                "total_rows": len(clean_df),
                "total_scrips": len(scrips),
                "scrips": scrips
            }
        except Exception as e:
            return {"error": f"Failed to ingest EOD file: {str(e)}"}
