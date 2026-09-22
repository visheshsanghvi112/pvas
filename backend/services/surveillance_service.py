import io
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, cast
import numpy as np
import pandas as pd
import zlib

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from pv_alert_surveillance import (
    SurveillanceConfig,
    SurveillanceEngine,
    clean_historical_data,
    MarketMetricsResult,
    ParticipantAuditResult
)
from backend.services.market_calendar_service import MarketCalendarService

COMPANY_NAMES = {
    "ALPHATECH": "Alpha Technologies Ltd",
    "NOVAENERGY": "Nova Energy Ltd",
    "ZENITHBIO": "Zenith Bio-Tech Ltd",
    "ORBITCEM": "Orbit Cement Ltd",
    "TCS": "Tata Consultancy Services Ltd",
    "SBIN": "State Bank of India",
    "ICICIBANK": "ICICI Bank Ltd",
    "AXISBANK": "Axis Bank Ltd",
    "RELIANCE": "Reliance Industries Ltd",
    "HDFCBANK": "HDFC Bank Ltd",
    "INFY": "Infosys Ltd",
    "WIPRO": "Wipro Ltd",
    "BAJFINANCE": "Bajaj Finance Ltd",
    "MARUTI": "Maruti Suzuki India Ltd",
    "SUNPHARMA": "Sun Pharma Industries Ltd",
}

ISIN_CODES = {
    "ALPHATECH": "INE001A01010",
    "NOVAENERGY": "INE002B01020",
    "ZENITHBIO": "INE003C01030",
    "ORBITCEM": "INE004D01040",
    "TCS": "INE467B01029",
    "SBIN": "INE062A01020",
    "ICICIBANK": "INE090A01021",
    "AXISBANK": "INE238A01034",
    "RELIANCE": "INE002A01018",
    "HDFCBANK": "INE040A01034",
    "INFY": "INE009A01021",
    "WIPRO": "INE075A01022",
    "BAJFINANCE": "INE296A01024",
    "MARUTI": "INE585B01010",
    "SUNPHARMA": "INE044A01036",
}


class EODSurveillanceService:
    """
    Enterprise EOD Surveillance Service.
    
    Coordinates the Price-Volume Alert Surveillance Framework (PVASF) across:
      1. Market Data Extraction: Queries daily_market_eod with rolling 180-day baseline
         and 15-day evaluation windows.
      2. Scoring & Anomaly Detection: Drives SurveillanceEngine to evaluate Price Rise,
         Price Z-Score, Volume Z-Score, Upper Circuit Persistence, and 180D New Highs.
      3. Participant Conduct Auditing: Queries participant_daily_trades & counterparty_trade_pairs
         to calculate net LTP contributions, volume dominance, counterparty rings, and PnL.
      4. Shareholder & Governance Analytics: Queries shareholding_summary, large_shareholders_registry,
         and corporate_events_feed for ownership concentration and corporate announcements.
    """
    current_df: pd.DataFrame
    current_trades_df: pd.DataFrame

    def __init__(self):
        self.config = SurveillanceConfig()
        self.engine = SurveillanceEngine(self.config)
        self.calendar = MarketCalendarService()
        
        # Load EOD pricing archives from database daily_market_eod; fallback to deterministic synthetic feed
        db_df = self._load_db_eod()
        self.current_df = db_df if db_df is not None else self._generate_sample_eod()

        # Load participant trade logs from database counterparty_trade_pairs & participant_daily_trades
        db_trades = self._load_db_trades()
        self.current_trades_df = db_trades if db_trades is not None else self._generate_sample_trades_df()

    def _load_db_eod(self) -> Optional[pd.DataFrame]:
        """Loads EOD OHLCV data directly from daily_market_eod."""
        db = None
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import DailyMarketEod

            db = SessionLocal()
            q = db.query(
                DailyMarketEod.symbol.label("Ticker"),
                DailyMarketEod.trade_date.label("Date"),
                DailyMarketEod.open_price.label("Open"),
                DailyMarketEod.day_high_price.label("High"),
                DailyMarketEod.day_low_price.label("Low"),
                DailyMarketEod.close_price.label("Close"),
                DailyMarketEod.total_traded_quantity.label("Volume")
            ).order_by(DailyMarketEod.symbol, DailyMarketEod.trade_date)

            df = pd.read_sql(q.statement, db.bind)
            if not df.empty and len(df) > 10:
                return clean_historical_data(df)
        except Exception as e:
            print(f"[surveillance_service] DB EOD load error: {e}")
        finally:
            if db:
                db.close()
        return None

    def _load_db_trades(self) -> Optional[pd.DataFrame]:
        """Loads participant and counterparty trades from clean relational tables."""
        db = None
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import CounterpartyTradePair, ParticipantDailyTrade

            db = SessionLocal()
            
            # Primary: Load exact bilateral paired trades from counterparty_trade_pairs
            q_pair = db.query(
                CounterpartyTradePair.symbol.label("Ticker"),
                CounterpartyTradePair.trade_date.label("Date"),
                CounterpartyTradePair.buyer_pan.label("BuyerPAN"),
                CounterpartyTradePair.seller_pan.label("SellerPAN"),
                CounterpartyTradePair.matched_quantity.label("TrdQty"),
                CounterpartyTradePair.matched_turnover_value.label("TrdVal"),
                CounterpartyTradePair.pairwise_ltp_push_value.label("PosContVal"),
            )

            raw_df = pd.read_sql(q_pair.statement, db.bind)
            if not raw_df.empty:
                pos_vals = raw_df["PosContVal"].astype(float).fillna(0.0)
                # Construct matched buyer rows
                b_df = pd.DataFrame({
                    "Ticker": raw_df["Ticker"],
                    "Date": raw_df["Date"],
                    "PAN": raw_df["BuyerPAN"],
                    "CounterpartyPAN": raw_df["SellerPAN"],
                    "BuyVolume": raw_df["TrdQty"].astype(float),
                    "SellVolume": 0.0,
                    "BuyValue": raw_df["TrdVal"].astype(float),
                    "SellValue": 0.0,
                    "LTPContribution": pos_vals,
                    "PosContVal": pos_vals,
                    "NegContVal": 0.0,
                })
                # Construct matched seller rows
                s_df = pd.DataFrame({
                    "Ticker": raw_df["Ticker"],
                    "Date": raw_df["Date"],
                    "PAN": raw_df["SellerPAN"],
                    "CounterpartyPAN": raw_df["BuyerPAN"],
                    "BuyVolume": 0.0,
                    "SellVolume": raw_df["TrdQty"].astype(float),
                    "BuyValue": 0.0,
                    "SellValue": raw_df["TrdVal"].astype(float),
                    "LTPContribution": 0.0,
                    "PosContVal": 0.0,
                    "NegContVal": 0.0,
                })
                full_df = pd.concat([b_df, s_df], ignore_index=True)
                return full_df

            # Fallback: Load participant daily trade aggregates
            q_clnt = db.query(
                ParticipantDailyTrade.symbol.label("Ticker"),
                ParticipantDailyTrade.trade_date.label("Date"),
                ParticipantDailyTrade.client_pan.label("PAN"),
                ParticipantDailyTrade.buy_quantity.label("BuyVolume"),
                ParticipantDailyTrade.sell_quantity.label("SellVolume"),
                ParticipantDailyTrade.buy_turnover_value.label("BuyValue"),
                ParticipantDailyTrade.sell_turnover_value.label("SellValue"),
                ParticipantDailyTrade.gross_positive_ltp_value.label("PosContVal"),
                ParticipantDailyTrade.gross_negative_ltp_value.label("NegContVal"),
            )

            df = pd.read_sql(q_clnt.statement, db.bind)
            if not df.empty:
                pos = df["PosContVal"].astype(float).fillna(0.0)
                neg = df["NegContVal"].astype(float).fillna(0.0)
                df["PosContVal"] = pos
                df["NegContVal"] = neg
                df["LTPContribution"] = pos - neg
                df["CounterpartyPAN"] = "MULTIPLE"
                return df
        except Exception as e:
            print(f"[surveillance_service] DB trades load error: {e}")
        finally:
            if db:
                db.close()
        return None

    def _generate_sample_eod(self, days: int = 260) -> pd.DataFrame:
        """Generates fallback sample EOD price-volume extract for standard scrips."""
        end_date = datetime.now()
        dates = [end_date - timedelta(days=days - i) for i in range(days)]
        
        scrips = [
            ("ALPHATECH",   2400.0),
            ("NOVAENERGY",   140.0),
            ("ZENITHBIO",   1600.0),
            ("ORBITCEM",    1550.0),
            ("TCS",         3800.0),
            ("SBIN",         780.0),
            ("ICICIBANK",   1100.0),
            ("AXISBANK",    1150.0),
            ("RELIANCE",    2900.0),
            ("HDFCBANK",    1750.0),
            ("INFY",        1550.0),
            ("WIPRO",        480.0),
            ("BAJFINANCE",  7200.0),
            ("MARUTI",     11000.0),
            ("SUNPHARMA",  1200.0)
        ]
        
        all_rows = []
        for ticker, base_price in scrips:
            seed_val = zlib.crc32(ticker.encode("utf-8")) % 10000
            r_state = np.random.RandomState(seed_val)
            close = np.zeros(days)
            high = np.zeros(days)
            low = np.zeros(days)
            open_p = np.zeros(days)
            volume = np.zeros(days)
            close[0] = base_price

            if ticker == "ALPHATECH":
                circuit_days = {246, 248, 250, 252, 254, 256, 258, 259}
                for i in range(1, days):
                    if i < 245:
                        ret = r_state.normal(0.0007, 0.008)
                    else:
                        ret = 0.098 if i in circuit_days else r_state.uniform(0.008, 0.015)
                    close[i] = round(close[i - 1] * (1.0 + ret), 2)
                volume[:245] = np.maximum(r_state.normal(150000, 10000, 245), 50000)
                volume[245:] = r_state.normal(1200000, 30000, 15)

            elif ticker == "NOVAENERGY":
                circuit_days = {245, 246, 247, 249, 250, 251, 253, 254, 255, 257, 258}
                for i in range(1, days):
                    if i < 245:
                        ret = r_state.normal(0.0005, 0.007)
                    else:
                        ret = 0.048 if i in circuit_days else r_state.uniform(0.002, 0.008)
                    close[i] = round(close[i - 1] * (1.0 + ret), 2)
                volume[:245] = np.maximum(r_state.normal(120000, 8000, 245), 40000)
                volume[245:] = r_state.normal(450000, 15000, 15)

            elif ticker == "ZENITHBIO":
                circuit_days = {247, 250, 252, 255, 257, 259}
                for i in range(1, days):
                    if i < 245:
                        ret = r_state.normal(0.0006, 0.007)
                    else:
                        ret = 0.055 if i in circuit_days else r_state.uniform(0.005, 0.012)
                    close[i] = round(close[i - 1] * (1.0 + ret), 2)
                volume[:245] = np.maximum(r_state.normal(140000, 10000, 245), 40000)
                volume[245:] = r_state.normal(800000, 25000, 15)

            elif ticker == "ORBITCEM":
                circuit_days = {257}
                for i in range(1, days):
                    if i < 245:
                        ret = r_state.normal(0.0003, 0.006)
                    else:
                        ret = 0.114 if i in circuit_days else r_state.uniform(0.001, 0.006)
                    close[i] = round(close[i - 1] * (1.0 + ret), 2)
                volume[:245] = np.maximum(r_state.normal(150000, 10000, 245), 50000)
                volume[245:] = r_state.normal(210000, 10000, 15)

            elif ticker == "SBIN":
                for i in range(1, days):
                    ret = r_state.normal(0.0001, 0.006)
                    close[i] = round(close[i - 1] * (1.0 + ret), 2)
                volume[:245] = np.maximum(r_state.normal(150000, 10000, 245), 50000)
                volume[245:] = r_state.normal(320000, 15000, 15)

            elif ticker == "ICICIBANK":
                for i in range(1, days):
                    ret = r_state.normal(0.0001, 0.006)
                    close[i] = round(close[i - 1] * (1.0 + ret), 2)
                volume[:245] = np.maximum(r_state.normal(150000, 10000, 245), 50000)
                volume[245:] = r_state.normal(240000, 12000, 15)

            elif ticker == "AXISBANK":
                for i in range(1, days):
                    ret = 0.025 if i == 255 else r_state.normal(0.0002, 0.006)
                    close[i] = round(close[i - 1] * (1.0 + ret), 2)
                volume = np.maximum(r_state.normal(150000, 10000, days), 50000)

            else:
                for i in range(1, days):
                    ret = r_state.normal(0.0001, 0.006)
                    close[i] = round(close[i - 1] * (1.0 + ret), 2)
                volume = np.maximum(r_state.normal(150000, 10000, days), 50000)

            for i in range(days):
                prev_c = close[i - 1] if i > 0 else close[i]
                open_p[i] = round(prev_c * r_state.uniform(0.999, 1.001), 2)
                high[i] = max(close[i], open_p[i], round(close[i] * 1.004, 2))
                low[i] = min(close[i], open_p[i], round(close[i] * 0.996, 2))

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
        rows = []
        for ticker in ["ALPHATECH", "NOVAENERGY", "ZENITHBIO", "ORBITCEM", "TCS", "SBIN", "ICICIBANK", "AXISBANK"]:
            # 1. Bilateral high RTR reversal pairs (RTR = 2*min(A->B, B->A)/gross)
            rev_pairs = [
                ("GDKNW2066S", "UHKFC2840Q", 1010, 1015, 4.25, 0.40),
                ("EXUFM0503J", "HWFTM1488X", 795, 807, 3.10, 0.35),
                ("MZOKE8130O", "XCGWR8003L", 880, 948, 2.60, 0.50),
                ("CVXUL2488S", "MZOKE8130O", 725, 793, 1.95, 0.60),
                ("SSXSC8612W", "YQMCC7107X", 780, 910, 1.70, 0.75),
            ]
            for p1, p2, v1, v2, pos_c, neg_c in rev_pairs:
                price = 1500.0 if ticker in ["ALPHATECH", "ZENITHBIO", "ORBITCEM"] else 500.0
                # A -> B
                rows.append({
                    "Ticker": ticker,
                    "Date": datetime.now(),
                    "PAN": p1,
                    "CounterpartyPAN": p2,
                    "BuyVolume": float(v1),
                    "SellVolume": 0.0,
                    "BuyValue": float(v1 * price),
                    "SellValue": 0.0,
                    "LTPContribution": pos_c,
                    "PosContVal": pos_c,
                    "NegContVal": 0.0
                })
                rows.append({
                    "Ticker": ticker,
                    "Date": datetime.now(),
                    "PAN": p2,
                    "CounterpartyPAN": p1,
                    "BuyVolume": 0.0,
                    "SellVolume": float(v1),
                    "BuyValue": 0.0,
                    "SellValue": float(v1 * price),
                    "LTPContribution": -neg_c,
                    "PosContVal": 0.0,
                    "NegContVal": neg_c
                })
                # B -> A
                rows.append({
                    "Ticker": ticker,
                    "Date": datetime.now(),
                    "PAN": p2,
                    "CounterpartyPAN": p1,
                    "BuyVolume": float(v2),
                    "SellVolume": 0.0,
                    "BuyValue": float(v2 * price),
                    "SellValue": 0.0,
                    "LTPContribution": pos_c * 0.85,
                    "PosContVal": pos_c * 0.85,
                    "NegContVal": 0.0
                })
                rows.append({
                    "Ticker": ticker,
                    "Date": datetime.now(),
                    "PAN": p1,
                    "CounterpartyPAN": p2,
                    "BuyVolume": 0.0,
                    "SellVolume": float(v2),
                    "BuyValue": 0.0,
                    "SellValue": float(v2 * price),
                    "LTPContribution": -neg_c * 0.85,
                    "PosContVal": 0.0,
                    "NegContVal": neg_c * 0.85
                })

            # 2. 3-node circular loop: GDKNW2066S -> UHKFC2840Q -> MZOKE8130O -> GDKNW2066S
            ring_nodes = ["GDKNW2066S", "UHKFC2840Q", "MZOKE8130O"]
            for idx, src in enumerate(ring_nodes):
                dst = ring_nodes[(idx + 1) % len(ring_nodes)]
                ring_vol = 1450.0 + idx * 50
                price = 1500.0
                rows.append({
                    "Ticker": ticker,
                    "Date": datetime.now(),
                    "PAN": src,
                    "CounterpartyPAN": dst,
                    "BuyVolume": ring_vol,
                    "SellVolume": 0.0,
                    "BuyValue": ring_vol * price,
                    "SellValue": 0.0,
                    "LTPContribution": 1.45,
                    "PosContVal": 1.45,
                    "NegContVal": 0.0
                })
                rows.append({
                    "Ticker": ticker,
                    "Date": datetime.now(),
                    "PAN": dst,
                    "CounterpartyPAN": src,
                    "BuyVolume": 0.0,
                    "SellVolume": ring_vol,
                    "BuyValue": 0.0,
                    "SellValue": ring_vol * price,
                    "LTPContribution": -0.65,
                    "PosContVal": 0.0,
                    "NegContVal": 0.65
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

    def get_available_trading_dates(self) -> List[str]:
        """Returns sorted list of distinct, valid OPEN market trading dates (YYYY-MM-DD)."""
        db_df = self._load_db_eod()
        if db_df is not None and not db_df.empty:
            self.current_df = db_df
        if self.current_df.empty:
            return []
        
        # Get raw dates from the data presence
        dates = self.current_df["Date"].unique().tolist()
        formatted_dates = []
        for d in dates:
            if isinstance(d, (datetime, pd.Timestamp)):
                formatted_dates.append(d.strftime("%Y-%m-%d"))
            elif hasattr(d, "isoformat"):
                formatted_dates.append(d.isoformat())
            else:
                formatted_dates.append(str(d)[:10])
                
        # Use authoritative calendar to only yield OPEN sessions
        valid_trading_days = []
        for d in formatted_dates:
            if self.calendar.is_market_open(d, market="NSE"):
                valid_trading_days.append(d)
                
        return sorted(list(set(valid_trading_days)), reverse=True)

    def get_watchlist(self, as_of_date: Optional[str] = None, window_days: int = 15, exchange: str = "ALL") -> List[Dict[str, Any]]:
        """Returns shortlisted scrips violating risk threshold according to Section 3 of PVASF_CORE_SPEC."""
        scrips = self.get_scrips_summary(as_of_date=as_of_date, window_days=window_days, exchange=exchange)
        return [s for s in scrips if s["watchlist"]]

    def _risk_and_status(self, score: float) -> tuple[str, str]:
        thresh = self.config.threshold
        if score >= thresh:
            return "High", "Open"
        if score >= 10.0:
            return "Medium", "Under review"
        return "Low", "Normal"

    def get_scrips_summary(self, as_of_date: Optional[str] = None, window_days: int = 15, exchange: str = "ALL") -> List[Dict[str, Any]]:
        """Calculates surveillance metrics for all scrips as of a specific EOD observation date."""
        db_df = self._load_db_eod()
        if db_df is not None and not db_df.empty:
            self.current_df = db_df

        tickers = self.current_df["Ticker"].unique().tolist()
        results = []
        
        for ticker in tickers:
            df_t = cast(pd.DataFrame, self.current_df[self.current_df["Ticker"] == ticker]).sort_values(by="Date").reset_index(drop=True)
            
            # 1. Resolve to the nearest OPEN session if a closed day is requested
            resolved_date = as_of_date
            if resolved_date:
                while not self.calendar.is_market_open(resolved_date) and resolved_date > "2020-01-01":
                    dt_obj = datetime.strptime(resolved_date, "%Y-%m-%d")
                    resolved_date = (dt_obj - timedelta(days=1)).strftime("%Y-%m-%d")

                df_t["DateStr"] = df_t["Date"].apply(lambda d: d.strftime("%Y-%m-%d") if isinstance(d, (datetime, pd.Timestamp)) else str(d)[:10])
                df_t = cast(pd.DataFrame, df_t[df_t["DateStr"] <= resolved_date]).sort_values(by="Date").reset_index(drop=True)
                
            if len(df_t) < 181:
                # Minimum 181 days for full 180-day lookback + baseline T-180
                continue
                
            try:
                metrics: MarketMetricsResult = self.engine.calculate_core_metrics(ticker, df_t)
                t180_idx = max(0, len(df_t) - 181)
                start_p = float(df_t["Close"].iloc[t180_idx])
                end_p = float(df_t["Close"].iloc[-1])
                change_pct = float(((end_p - start_p) / start_p) * 100)
                
                company_name = COMPANY_NAMES.get(ticker, f"{ticker} India Ltd")
                isin_code = ISIN_CODES.get(ticker, f"INE{abs(hash(ticker)) % 1000000000:09d}")
                risk, status = self._risk_and_status(metrics.final_score)

                # Simulated deterministic venue distribution based on ticker hash
                h_val = abs(hash(ticker)) % 100
                is_dual = ticker not in ["ORBITCEM_SME"]  # Example single venue
                nse_pct = 85.0 + (h_val % 10) if is_dual else 0.0
                bse_pct = round(100.0 - nse_pct, 1)

                # Determine exchange-adjusted metrics
                effective_score = metrics.final_score
                effective_vol_z = metrics.volume_z
                effective_price_z = metrics.price_z
                effective_price_rise = metrics.price_rise_pct
                effective_band_hits = metrics.band_hit_days
                effective_high_days = metrics.new_high_days

                venue_trigger = None
                if bse_pct > 8 and effective_vol_z >= 1.645 and (h_val % 3 == 0):
                    venue_trigger = "BSE Vol Surge"

                if exchange == "NSE":
                    effective_vol_z = round(effective_vol_z * 0.98, 2)
                elif exchange == "BSE":
                    effective_vol_z = round(effective_vol_z * 1.05, 2)

                # 2. Data Quality / Feed Issue Detection
                data_quality_flags = []
                if resolved_date:
                    latest_available = df_t["DateStr"].iloc[-1] if not df_t.empty else None
                    if latest_available != resolved_date:
                        # We expected data for this OPEN session but didn't find it!
                        if exchange == "ALL":
                            data_quality_flags.append("CONSOLIDATED_FEED_MISSING")
                        elif exchange == "NSE":
                            data_quality_flags.append("NSE_FEED_MISSING")
                        elif exchange == "BSE":
                            data_quality_flags.append("BSE_FEED_MISSING")
                            
                    # Simulated logic for single-exchange feed failure when examining consolidated view
                    if exchange == "ALL" and h_val % 7 == 0 and latest_available == resolved_date:
                        # Arbitrary simulation: occasionally a stock might be missing BSE data on an OPEN day
                        if self.calendar.is_market_open(resolved_date, market="BSE"):
                            data_quality_flags.append("BSE_FEED_MISSING_ON_OPEN_SESSION")

                results.append({
                    "ticker": ticker,
                    "symbol": ticker,
                    "company": company_name,
                    "isin": isin_code,
                    "latest_close": round(end_p, 2),
                    "price_change_pct": round(change_pct, 2),
                    "risk_score": round(effective_score, 2),
                    "score": round(effective_score, 2),
                    "price_rise_pct": round(effective_price_rise, 2),
                    "price_z": round(effective_price_z, 2),
                    "volume_z": round(effective_vol_z, 2),
                    "band_hit_days": effective_band_hits,
                    "new_high_days": effective_high_days,
                    "watchlist": effective_score >= self.config.threshold,
                    "risk": risk,
                    "status": status,
                    "exchange_scope": exchange,
                    "data_quality": data_quality_flags,
                    "venue_split": {
                        "is_dual_listed": is_dual,
                        "nse_vol_pct": nse_pct,
                        "bse_vol_pct": bse_pct,
                        "primary_venue": "NSE" if nse_pct >= 50 else "BSE"
                    },
                    "venue_breakdown": {
                        "nse_volume_z": round(metrics.volume_z * 0.95, 2),
                        "bse_volume_z": round(metrics.volume_z * 1.05, 2),
                        "nse_circuit_hits": metrics.band_hit_days,
                        "bse_circuit_hits": metrics.band_hit_days,
                        "nse_price_rise": round(metrics.price_rise_pct, 2),
                        "bse_price_rise": round(metrics.price_rise_pct, 2)
                    },
                    "venue_trigger": venue_trigger
                })
            except Exception as e:
                print(f"[skip] {ticker}: {e}")
                
        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return results

    def get_scrip_detail(self, ticker: str, as_of_date: Optional[str] = None, window_days: int = 15, exchange: str = "ALL") -> Dict[str, Any]:
        """Returns scrip EOD OHLCV price/volume history and calculated core PV metrics as of observation date."""
        db_df = self._load_db_eod()
        if db_df is not None and not db_df.empty:
            self.current_df = db_df
        df_t = cast(pd.DataFrame, self.current_df[self.current_df["Ticker"] == ticker]).sort_values(by="Date").reset_index(drop=True)
        if df_t.empty:
            raise ValueError(f"Scrip {ticker} not found in current EOD dataset")
            
        if as_of_date:
            df_t["DateStr"] = df_t["Date"].apply(lambda d: d.strftime("%Y-%m-%d") if isinstance(d, (datetime, pd.Timestamp)) else str(d)[:10])
            df_t = cast(pd.DataFrame, df_t[df_t["DateStr"] <= as_of_date]).sort_values(by="Date").reset_index(drop=True)
            if df_t.empty:
                raise ValueError(f"No price data for {ticker} on or before {as_of_date}")

        metrics: MarketMetricsResult = self.engine.calculate_core_metrics(ticker, df_t)
        
        # Pre-compute MA20 and MA50 across the full historical dataset for complete chart coverage
        df_t["MA20"] = df_t["Close"].rolling(20).mean().round(2)
        df_t["MA50"] = df_t["Close"].rolling(50).mean().round(2)

        history = []
        # Include 181 trading days so item 0 is the exact T-180 baseline price
        for _, row in df_t.tail(181).iterrows():
            d_val: Any = row["Date"]
            history.append({
                "date": d_val.strftime("%Y-%m-%d") if hasattr(d_val, "strftime") else str(d_val)[:10],
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
                "ma20": float(row["MA20"]) if bool(pd.notna(row["MA20"])) else None,
                "ma50": float(row["MA50"]) if bool(pd.notna(row["MA50"])) else None
            })
            
        risk, status = self._risk_and_status(metrics.final_score)
        price_band_val = float(df_t["Band"].iloc[-1]) if "Band" in df_t.columns and pd.notna(df_t["Band"].iloc[-1]) else 0.05

        h_val = abs(hash(ticker)) % 100
        nse_pct = 85.0 + (h_val % 10)
        bse_pct = round(100.0 - nse_pct, 1)

        return {
            "ticker": ticker,
            "symbol": ticker,
            "company": COMPANY_NAMES.get(ticker, f"{ticker} Ltd"),
            "isin": ISIN_CODES.get(ticker, f"INE{abs(hash(ticker))%900000+100000}A01010"),
            "risk": risk,
            "status": status,
            "price_band": price_band_val,
            "exchange_scope": exchange,
            "venue_split": {
                "is_dual_listed": True,
                "nse_vol_pct": nse_pct,
                "bse_vol_pct": bse_pct,
                "primary_venue": "NSE"
            },
            "venue_breakdown": {
                "nse_volume_z": round(metrics.volume_z * 0.95, 2),
                "bse_volume_z": round(metrics.volume_z * 1.05, 2),
                "nse_circuit_hits": metrics.band_hit_days,
                "bse_circuit_hits": metrics.band_hit_days,
                "nse_price_rise": round(metrics.price_rise_pct, 2),
                "bse_price_rise": round(metrics.price_rise_pct, 2)
            },
            "metrics": metrics.as_dict(),
            "score_breakdown": [
                {"label": "Price Rise",     "score": metrics.price_rise_score, "weight": self.config.weights.get("price_rise", 0.0),      "contribution": round((metrics.price_rise_score / 5.0) * self.config.weights.get("price_rise", 0.0), 3)},
                {"label": "Price Z",        "score": metrics.price_z_score,    "weight": self.config.weights.get("price_z", 0.0),           "contribution": round((metrics.price_z_score    / 5.0) * self.config.weights.get("price_z", 0.0), 3)},
                {"label": "Volume Z",       "score": metrics.volume_z_score,   "weight": self.config.weights.get("volume_z", 0.0),          "contribution": round((metrics.volume_z_score   / 5.0) * self.config.weights.get("volume_z", 0.0), 3)},
                {"label": "Band Persistence","score": metrics.band_score,      "weight": self.config.weights.get("band_persistence", 0.0),  "contribution": round((metrics.band_score       / 5.0) * self.config.weights.get("band_persistence", 0.0), 3)},
                {"label": "180 Day New High","score": metrics.new_high_score,  "weight": self.config.weights.get("new_high", 0.0),          "contribution": round((metrics.new_high_score   / 5.0) * self.config.weights.get("new_high", 0.0), 3)}
            ],
            "history": history,
            "summary": {
                "start_price": round(float(df_t["Close"].iloc[max(0, len(df_t) - 181)]), 2),
                "latest_close": round(float(df_t["Close"].iloc[-1]), 2),
                "price_change_pct": round(
                    float(
                        (df_t["Close"].iloc[-1] - df_t["Close"].iloc[max(0, len(df_t) - 181)])
                        / df_t["Close"].iloc[max(0, len(df_t) - 181)]
                        * 100
                    ), 2
                ),
                "avg_15d_volume": int(df_t["Volume"].tail(15).mean())
            },
            "shareholders": self._calculate_shareholder_stats(ticker, df_t),
            "announcements": self._get_announcements(ticker)
        }

    def _calculate_shareholder_stats(self, ticker: str, df_t: pd.DataFrame) -> Dict[str, Any]:
        """Calculates dynamic participant demographics & shareholding statistics directly from Database."""
        unique_pans_15d = 0
        unique_pans_180d = 0
        top_1pct_concentration = 0.0
        promoter_pct = 52.4
        public_pct = 47.6
        unique_pans_holding_t = 0
        unique_pans_holding_180 = 0
        avg_trading_pans_15d = 0
        avg_trading_pans_180d = 0

        db = None
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import ShareholdingSummary
            db = SessionLocal()

            sh_records = db.query(ShareholdingSummary).filter(ShareholdingSummary.symbol == ticker).all()
            for sh in sh_records:
                if sh.category_type == "PROMOTER_GROUP":
                    promoter_pct = float(sh.holding_percentage or 50.0)
                    if sh.unique_holding_pans:
                        unique_pans_180d = sh.unique_holding_pans
                    if sh.avg_daily_trading_pans:
                        avg_trading_pans_180d = sh.avg_daily_trading_pans
                elif sh.category_type == "TOP_1_PCT_PUBLIC":
                    top_1pct_concentration = float(sh.holding_percentage or 20.0)
                elif sh.category_type == "GENERAL_PUBLIC_FLOAT":
                    public_pct = float(sh.holding_percentage or 30.0)
                    if sh.unique_holding_pans:
                        unique_pans_15d = sh.unique_holding_pans
                    if sh.avg_daily_trading_pans:
                        avg_trading_pans_15d = sh.avg_daily_trading_pans

            unique_pans_holding_t = unique_pans_15d
            unique_pans_holding_180 = unique_pans_180d
        except Exception as e:
            print(f"[surveillance_service] Shareholding DB lookup error: {e}")
            ticker_seed = sum(ord(c) for c in ticker)
            unique_pans_15d = 45 + (ticker_seed % 80)
            unique_pans_180d = int(unique_pans_15d * 2.4)
            unique_pans_holding_t = unique_pans_15d
            unique_pans_holding_180 = unique_pans_180d
            avg_trading_pans_15d = max(15, int(unique_pans_15d * 0.40))
            avg_trading_pans_180d = max(20, int(unique_pans_180d * 0.28))
            top_1pct_concentration = round(28.4 + (ticker_seed % 20), 2)
        finally:
            if db:
                db.close()

        return {
            "unique_pans_15d": unique_pans_15d,
            "unique_pans_180d": unique_pans_180d,
            "unique_pans_holding_t": unique_pans_holding_t,
            "unique_pans_holding_180": unique_pans_holding_180,
            "avg_trading_pans_15d": avg_trading_pans_15d,
            "avg_trading_pans_180d": avg_trading_pans_180d,
            "top_1pct_concentration": top_1pct_concentration,
            "promoter_percent": promoter_pct,
            "public_percent": public_pct,
            "has_live_feed": True
        }

    def _get_announcements(self, ticker: str) -> List[Dict[str, Any]]:
        """Retrieves official corporate announcements from Database for the given ticker."""
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import CorporateEventsFeed
            db = SessionLocal()
            ann_list = db.query(CorporateEventsFeed)\
                         .filter(CorporateEventsFeed.symbol == ticker)\
                         .order_by(CorporateEventsFeed.announcement_date.desc())\
                         .all()
            db.close()
            if ann_list:
                return [
                    {
                        "date": a.announcement_date.strftime("%Y-%m-%d") if hasattr(a.announcement_date, "strftime") else str(a.announcement_date),
                        "category": a.action_category or "General",
                        "title": a.announcement_purpose or f"Corporate Action — {a.action_category}",
                        "status": "Verified"
                    }
                    for a in ann_list
                ]
        except Exception as e:
            print(f"[surveillance_service] Announcements DB lookup error: {e}")

        return []

    def get_scrip_participants(self, ticker: str, as_of_date: Optional[str] = None, window_days: int = 15) -> Dict[str, Any]:
        """Serves participant-level analytical breakdown per Section 4 of PVASF_CORE_SPEC."""
        df_t = cast(pd.DataFrame, self.current_df[self.current_df["Ticker"] == ticker]).sort_values(by="Date").reset_index(drop=True)
        if as_of_date:
            df_t["DateStr"] = df_t["Date"].apply(lambda d: d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10])
            df_t = cast(pd.DataFrame, df_t[df_t["DateStr"] <= as_of_date]).sort_values(by="Date").reset_index(drop=True)

        final_close = float(df_t["Close"].iloc[-1]) if not df_t.empty else 100.0
        total_vol = float(df_t["Volume"].tail(window_days).sum()) if not df_t.empty else 1000000.0
        
        # Actual window Net Stock Price Movement (Close_T - Close_{T-window_days}) per PVASF_CORE_SPEC 4.1
        if len(df_t) >= (window_days + 1):
            scrip_15d_price_change = abs(float(df_t["Close"].iloc[-1]) - float(df_t["Close"].iloc[-(window_days + 1)]))
        elif len(df_t) >= 2:
            scrip_15d_price_change = abs(float(df_t["Close"].iloc[-1]) - float(df_t["Close"].iloc[0]))
        else:
            scrip_15d_price_change = 1.0
        scrip_15d_price_change = max(scrip_15d_price_change, 1e-4)

        trades_slice = self.current_trades_df
        if as_of_date and not trades_slice.empty and "Date" in trades_slice.columns:
            trades_slice = cast(pd.DataFrame, trades_slice[trades_slice["Date"].astype(str).str[:10] <= as_of_date])

        part_res: ParticipantAuditResult = self.engine.analyze_participants(
            ticker, trades_slice, final_close, total_vol
        )
        
        # Total positive & negative LTP contributions across all participants or net price movement (PVASF Spec 4.1)
        ticker_trades = cast(pd.DataFrame, trades_slice[trades_slice["Ticker"] == ticker]) if not trades_slice.empty else pd.DataFrame()
        if not ticker_trades.empty and "PosContVal" in ticker_trades.columns and float(ticker_trades["PosContVal"].sum()) > 0:
            tot_pos_ltp = float(ticker_trades["PosContVal"].sum())
        elif not ticker_trades.empty and "LTPContribution" in ticker_trades.columns:
            pos_vals = ticker_trades[ticker_trades["LTPContribution"] > 0]["LTPContribution"].sum()
            tot_pos_ltp = float(pos_vals) if pos_vals > 0 else scrip_15d_price_change
        else:
            tot_pos_ltp = scrip_15d_price_change
        tot_pos_ltp = max(tot_pos_ltp, 1e-4)

        if not ticker_trades.empty and "NegContVal" in ticker_trades.columns and float(ticker_trades["NegContVal"].sum()) > 0:
            tot_neg_ltp = float(ticker_trades["NegContVal"].sum())
        elif not ticker_trades.empty and "LTPContribution" in ticker_trades.columns:
            neg_vals = abs(ticker_trades[ticker_trades["LTPContribution"] < 0]["LTPContribution"].sum())
            tot_neg_ltp = float(neg_vals) if neg_vals > 0 else scrip_15d_price_change
        else:
            tot_neg_ltp = scrip_15d_price_change
        tot_neg_ltp = max(tot_neg_ltp, 1e-4)

        # Resolve legal entity / individual names from ClientIdentityMaster
        pan_names: Dict[str, str] = {}
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import ClientIdentityMaster
            db = SessionLocal()
            
            cp_pans = []
            for row in part_res.counterparty_pairs:
                pair_str = row.get("Pair", "")
                if " <-> " in pair_str:
                    cp_pans.extend([p.strip() for p in pair_str.split(" <-> ") if p.strip()])

            pans_to_lookup = set(
                [row["PAN"] for row in part_res.ltp_contributors if "PAN" in row] +
                [row["PAN"] for row in getattr(part_res, "pos_ltp_contributors", []) if "PAN" in row] +
                [row["PAN"] for row in getattr(part_res, "neg_ltp_contributors", []) if "PAN" in row] +
                [row["PAN"] for row in part_res.volume_share if "PAN" in row] +
                [row["PAN"] for row in part_res.profit_makers if "PAN" in row] +
                [row.get("PAN1") for row in part_res.reversal_pairs if row.get("PAN1")] +
                [row.get("PAN2") for row in part_res.reversal_pairs if row.get("PAN2")] +
                [node for row in part_res.circular_loops for node in row.get("Nodes", [])] +
                cp_pans
            )
            if pans_to_lookup:
                matches = db.query(ClientIdentityMaster.client_pan, ClientIdentityMaster.client_legal_name).filter(
                    ClientIdentityMaster.client_pan.in_(pans_to_lookup)
                ).all()
                for pan_code, full_name in matches:
                    if pan_code and full_name:
                        pan_names[pan_code] = full_name
            db.close()
        except Exception as e:
            print(f"[surveillance_service] PAN name lookup error: {e}")

        return {
            "ticker": ticker,
            "ltp_contributors": [
                {
                    "participant": row["PAN"],
                    "name": pan_names.get(row["PAN"], row.get("Name", "Unknown Entity")),
                    "contribution": round((row["LTPContribution"] / tot_pos_ltp) * 100, 2),
                    "net_val": round(float(row.get("LTPContribution", 0)), 2),
                    "pos_val": round(float(row.get("PosContVal", max(0.0, float(row.get("LTPContribution", 0))))), 2),
                    "neg_val": round(float(row.get("NegContVal", abs(min(0.0, float(row.get("LTPContribution", 0)))))), 2),
                    "effect": row.get("Effect", "POSITIVE" if float(row.get("LTPContribution", 0)) > 0 else "NEGATIVE" if float(row.get("LTPContribution", 0)) < 0 else "NEUTRAL")
                }
                for row in part_res.ltp_contributors
            ],
            "pos_ltp_contributors": [
                {
                    "participant": row["PAN"],
                    "name": pan_names.get(row["PAN"], row.get("Name", "Unknown Entity")),
                    "contribution": round((float(row.get("PosContVal", max(0.0, float(row.get("LTPContribution", 0))))) / tot_pos_ltp) * 100, 2),
                    "net_val": round(float(row.get("LTPContribution", 0)), 2),
                    "pos_val": round(float(row.get("PosContVal", max(0.0, float(row.get("LTPContribution", 0))))), 2),
                    "neg_val": round(float(row.get("NegContVal", abs(min(0.0, float(row.get("LTPContribution", 0)))))), 2),
                    "effect": "POSITIVE"
                }
                for row in getattr(part_res, "pos_ltp_contributors", [])
            ],
            "neg_ltp_contributors": [
                {
                    "participant": row["PAN"],
                    "name": pan_names.get(row["PAN"], row.get("Name", "Unknown Entity")),
                    "contribution": round((float(row.get("NegContVal", abs(float(row.get("LTPContribution", 0))))) / tot_neg_ltp) * 100, 2),
                    "net_val": round(float(row.get("LTPContribution", 0)), 2),
                    "pos_val": round(float(row.get("PosContVal", max(0.0, float(row.get("LTPContribution", 0))))), 2),
                    "neg_val": round(float(row.get("NegContVal", abs(min(0.0, float(row.get("LTPContribution", 0)))))), 2),
                    "effect": "NEGATIVE"
                }
                for row in getattr(part_res, "neg_ltp_contributors", [])
            ],
            "volume_share": [
                {
                    "participant": row["PAN"],
                    "name": pan_names.get(row["PAN"], row.get("Name", "Unknown Entity")),
                    "volume": row["PANVolume"],
                    "share_pct": round(row["VolumeSharePercent"], 2)
                }
                for row in part_res.volume_share
            ],
            "counterparty_pairs": [
                {
                    "pair": row["Pair"],
                    "pan1": row["Pair"].split(" <-> ")[0] if " <-> " in row["Pair"] else row["Pair"],
                    "pan2": row["Pair"].split(" <-> ")[1] if " <-> " in row["Pair"] else "",
                    "name1": pan_names.get(row["Pair"].split(" <-> ")[0] if " <-> " in row["Pair"] else "", "Unknown Entity"),
                    "name2": pan_names.get(row["Pair"].split(" <-> ")[1] if " <-> " in row["Pair"] else "", "Unknown Entity"),
                    "volume": row["Volume"],
                    "share_pct": round(row["SharePercent"], 2)
                }
                for row in part_res.counterparty_pairs
            ],
            "reversal_pairs": [
                {
                    "pair": row["Pair"],
                    "pan1": row.get("PAN1", row["Pair"].split(" <-> ")[0] if " <-> " in row["Pair"] else ""),
                    "pan2": row.get("PAN2", row["Pair"].split(" <-> ")[1] if " <-> " in row["Pair"] else ""),
                    "name1": pan_names.get(row.get("PAN1", row["Pair"].split(" <-> ")[0] if " <-> " in row["Pair"] else ""), ""),
                    "name2": pan_names.get(row.get("PAN2", row["Pair"].split(" <-> ")[1] if " <-> " in row["Pair"] else ""), ""),
                    "volume": row["GrossVolume"],
                    "vol_a_to_b": row.get("Vol_A_to_B", 0.0),
                    "vol_b_to_a": row.get("Vol_B_to_A", 0.0),
                    "reversal_ratio": row["ReversalRatio"]
                }
                for row in part_res.reversal_pairs
            ],
            "circular_loops": [
                {
                    "loop": row["Cycle"],
                    "nodes": row.get("Nodes", [n.strip() for n in row["Cycle"].split(" -> ")[:-1]]),
                    "length": row.get("Length", len(row.get("Nodes", []))),
                    "volume": row["RotatedVolume"],
                    "gross_volume": row["GrossVolume"],
                    "efficiency_pct": row.get("EfficiencyPercent", round((row["RotatedVolume"] / max(1.0, row["GrossVolume"])) * 100.0, 1))
                }
                for row in part_res.circular_loops
            ],
            "profit_makers": [
                {
                    "participant": row["PAN"],
                    "name": pan_names.get(row["PAN"], row.get("Name", "Unknown Entity")),
                    "net_pnl": row["NetPnL"],
                    "buy_volume": row["BuyVolume"],
                    "sell_volume": row["SellVolume"]
                }
                for row in part_res.profit_makers
            ]
        }

    def load_eod_csv(self, file_contents: bytes, filename: str) -> Dict[str, Any]:
        """Ingests structured EOD CSV or Excel file into the surveillance engine."""
        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(file_contents))
            elif filename.endswith((".xls", ".xlsx")):
                df = pd.read_excel(io.BytesIO(file_contents))
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

    def get_scrip_shareholding_breakdown(self, ticker: str) -> Dict[str, Any]:
        """Queries quarter-by-quarter shareholding summaries and large shareholder registries."""
        db = None
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import ShareholdingSummary, LargeShareholdersRegistry
            db = SessionLocal()
            
            main_records = (
                db.query(ShareholdingSummary)
                .filter(ShareholdingSummary.symbol == ticker)
                .order_by(ShareholdingSummary.filing_date.desc())
                .all()
            )
            prom_records = (
                db.query(LargeShareholdersRegistry)
                .filter(LargeShareholdersRegistry.symbol == ticker)
                .all()
            )

            quarters = {}
            for r in main_records:
                q = r.quarter_code
                if q not in quarters:
                    quarters[q] = {
                        "quarter": q,
                        "date": str(r.filing_date),
                        "promoter_pct": 0.0,
                        "public_pct": 0.0,
                        "pledged_pct": 0.0
                    }
                cat = (r.category_type or "").upper()
                if "PROMOTER" in cat:
                    quarters[q]["promoter_pct"] = float(r.holding_percentage or 0.0)
                    quarters[q]["pledged_pct"] = float(r.pledged_shares_percentage or 0.0)
                elif "PUBLIC" in cat or "FLOAT" in cat:
                    quarters[q]["public_pct"] = float(r.holding_percentage or 0.0)

            promoters = [
                {
                    "name": p.holder_legal_name,
                    "quarter": p.quarter_code,
                    "shares": p.shares_held,
                    "share_pct": float(p.holding_percentage or 0.0),
                    "pledged_pct": round(float(p.pledged_shares_count or 0) / max(1, p.shares_held) * 100.0, 2)
                }
                for p in prom_records
                if "PROMOTER" in (p.holder_category or "").upper()
            ]

            quarter_keys = sorted(quarters.keys(), reverse=True)
            latest_q = quarter_keys[0] if quarter_keys else "Q127"
            prior_q = quarter_keys[-1] if len(quarter_keys) > 1 else latest_q

            prom_latest = [r for r in main_records if r.quarter_code == latest_q and "PROMOTER" in (r.category_type or "").upper()]
            prom_prior = [r for r in main_records if r.quarter_code == prior_q and "PROMOTER" in (r.category_type or "").upper()]
            promoter_shares_t = sum(p.total_shares_count or 0 for p in prom_latest) if prom_latest else 58450000
            promoter_pct_t = round(sum(float(p.holding_percentage or 0.0) for p in prom_latest), 2) if prom_latest else 58.45
            promoter_shares_180 = sum(p.total_shares_count or 0 for p in prom_prior) if prom_prior else int(promoter_shares_t * 1.015)
            promoter_pct_180 = round(sum(float(p.holding_percentage or 0.0) for p in prom_prior), 2) if prom_prior else 58.45

            top1_latest = [r for r in main_records if r.quarter_code == latest_q and "TOP_1_PCT" in (r.category_type or "").upper()]
            top1_prior = [r for r in main_records if r.quarter_code == prior_q and "TOP_1_PCT" in (r.category_type or "").upper()]
            top1_shares_t = sum(p.total_shares_count or 0 for p in top1_latest) if top1_latest else 18200000
            top1_pct_t = round(sum(float(p.holding_percentage or 0.0) for p in top1_latest), 2) if top1_latest else 18.20
            top1_shares_180 = sum(p.total_shares_count or 0 for p in top1_prior) if top1_prior else int(top1_shares_t * 0.9)
            top1_pct_180 = round(sum(float(p.holding_percentage or 0.0) for p in top1_prior), 2) if top1_prior else 17.50

            return {
                "symbol": ticker,
                "quarterly_history": list(quarters.values()),
                "promoter_group": promoters,
                "promoter_shares_t": promoter_shares_t,
                "promoter_pct_t": promoter_pct_t,
                "promoter_shares_180": promoter_shares_180,
                "promoter_pct_180": promoter_pct_180,
                "top1_shares_t": top1_shares_t,
                "top1_pct_t": top1_pct_t,
                "top1_shares_180": top1_shares_180,
                "top1_pct_180": top1_pct_180,
            }
        except Exception as e:
            print(f"[surveillance_service] Shareholding breakdown error: {e}")
            return {
                "symbol": ticker,
                "quarterly_history": [],
                "promoter_group": [],
                "promoter_shares_t": 58450000,
                "promoter_pct_t": 58.45,
                "promoter_shares_180": 58450000,
                "promoter_pct_180": 58.45,
                "top1_shares_t": 18200000,
                "top1_pct_t": 18.20,
                "top1_shares_180": 17500000,
                "top1_pct_180": 17.50,
            }
        finally:
            if db:
                db.close()

    def get_scrip_corporate_actions(self, ticker: str) -> List[Dict[str, Any]]:
        """Queries corporate actions & dilution factors from corporate_events_feed and price_dilution_factors."""
        db = None
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import CorporateEventsFeed, PriceDilutionFactor
            db = SessionLocal()
            
            actions = (
                db.query(CorporateEventsFeed)
                .filter(CorporateEventsFeed.symbol == ticker)
                .order_by(CorporateEventsFeed.announcement_date.desc())
                .all()
            )
            dilutions = {
                d.symbol: float(d.split_multiplier or 1.0)
                for d in db.query(PriceDilutionFactor).filter(PriceDilutionFactor.symbol == ticker).all()
            }

            res = []
            for a in actions:
                catg = a.action_category or "GENERAL"
                purpose = a.announcement_purpose or f"Corporate Action — {catg}"
                ex_date = str(a.ex_date) if a.ex_date else "—"
                rec_date = str(a.record_date) if a.record_date else str(a.announcement_date)
                ratio_val = a.ratio_or_value or "—"
                dil_factor = float(a.dilution_factor or dilutions.get(a.symbol, 1.0))

                res.append({
                    "id": a.event_id,
                    "symbol": ticker,
                    "category": catg,
                    "purpose": purpose,
                    "record_date": rec_date,
                    "ex_date": ex_date,
                    "ratio_value": ratio_val,
                    "book_closure": None,
                    "dilution_factor": dil_factor
                })
            return res
        except Exception as e:
            print(f"[surveillance_service] Corporate actions error: {e}")
            return []
        finally:
            if db:
                db.close()

