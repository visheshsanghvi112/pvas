import io
import os
import sys
import json
import re
import ast
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, cast
import numpy as np
import pandas as pd
import zlib

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

CONFIG_PATH = os.path.join(ROOT_DIR, "backend", "db", "model_config.json")

from pv_alert_surveillance import (
    SurveillanceConfig,
    SurveillanceEngine,
    clean_historical_data,
    MarketMetricsResult,
    ParticipantAuditResult
)
from backend.services.market_calendar_service import MarketCalendarService

# Core company metadata is dynamically queried from daily_market_eod


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
    current_pairs_df: Optional[pd.DataFrame]

    def __init__(self):
        self.config = SurveillanceConfig()
        self._load_persisted_config()
        self.engine = SurveillanceEngine(self.config)
        self.calendar = MarketCalendarService()
        self._summary_cache: Dict[str, List[Dict[str, Any]]] = {}
        self._cached_trading_dates: Optional[List[str]] = None
        
        # Load genuine EOD pricing archives from daily_market_eod
        db_df = self._load_db_eod()
        self.current_df = db_df if db_df is not None else pd.DataFrame()

        # Load genuine participant trade logs from participant_daily_trades
        db_trades = self._load_db_trades()
        self.current_trades_df = db_trades if db_trades is not None else pd.DataFrame()

        # Load genuine bilateral trade matches from counterparty_trade_pairs
        self.current_pairs_df = self._load_db_pairs()

    def _load_persisted_config(self) -> None:
        """Loads model weights and risk threshold from disk or latest compliance audit log."""
        try:
            if os.path.exists(CONFIG_PATH):
                with open(CONFIG_PATH, "r") as f:
                    data = json.load(f)
                    if "weights" in data and isinstance(data["weights"], dict):
                        for k, v in data["weights"].items():
                            if k in self.config.weights:
                                self.config.weights[k] = float(v)
                    if "threshold" in data and data["threshold"] is not None:
                        self.config.threshold = float(data["threshold"])
                    return
        except Exception as e:
            print(f"[surveillance_service] Warning: Failed to load config from {CONFIG_PATH}: {e}")

        # Fallback: check SQLite compliance_audit_logs for most recent UPDATE_MODEL_WEIGHTS record
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import SysAuditLog
            db = SessionLocal()
            try:
                log = db.query(SysAuditLog).filter(
                    SysAuditLog.action == "UPDATE_MODEL_WEIGHTS"
                ).order_by(SysAuditLog.id.desc()).first()
                if log and log.details:
                    thresh_match = re.search(r"thresholds?\s*\(([\d\.]+)\)", log.details)
                    if thresh_match:
                        self.config.threshold = float(thresh_match.group(1))
                    weights_match = re.search(r"model weights\s*\((\{.*?\})\)", log.details)
                    if weights_match:
                        parsed_w = ast.literal_eval(weights_match.group(1))
                        if isinstance(parsed_w, dict):
                            for k, v in parsed_w.items():
                                if k in self.config.weights:
                                    self.config.weights[k] = float(v)
                    self._save_persisted_config()
            finally:
                db.close()
        except Exception as e:
            print(f"[surveillance_service] Warning: Audit log config recovery error: {e}")

    def _save_persisted_config(self) -> None:
        """Persists current weights and threshold to disk."""
        try:
            os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
            payload = {
                "weights": self.config.weights,
                "threshold": self.config.threshold,
                "updated_at": datetime.utcnow().isoformat()
            }
            with open(CONFIG_PATH, "w") as f:
                json.dump(payload, f, indent=2)
        except Exception as e:
            print(f"[surveillance_service] Warning: Failed to write {CONFIG_PATH}: {e}")

    def _load_db_eod(self) -> Optional[pd.DataFrame]:
        """Loads EOD OHLCV data directly from daily_market_eod with true dynamic price bands."""
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
                DailyMarketEod.prev_close_price.label("PrevClose"),
                DailyMarketEod.upper_circuit_limit.label("UpperCircuitLimit"),
                DailyMarketEod.lower_circuit_limit.label("LowerCircuitLimit"),
                DailyMarketEod.total_traded_quantity.label("Volume"),
                DailyMarketEod.company_name.label("CompanyName"),
                DailyMarketEod.isin.label("ISIN"),
                DailyMarketEod.delivery_quantity.label("DeliveryQuantity")
            ).order_by(DailyMarketEod.symbol, DailyMarketEod.trade_date)

            df = pd.read_sql(q.statement, db.bind)
            if not df.empty and len(df) > 10:
                upper = pd.to_numeric(df["UpperCircuitLimit"], errors="coerce")
                prev_c = pd.to_numeric(df["PrevClose"], errors="coerce")
                valid = (prev_c > 0) & (upper > 0)
                df["Band"] = 0.05
                df.loc[valid, "Band"] = (upper[valid] - prev_c[valid]) / prev_c[valid]
                return clean_historical_data(df)
        except Exception as e:
            print(f"[surveillance_service] DB EOD load error: {e}")
        finally:
            if db:
                db.close()
        return None

    def _load_single_ticker_eod(self, ticker: str) -> Optional[pd.DataFrame]:
        """Loads EOD OHLCV data for a specific ticker directly from daily_market_eod using indexed symbol."""
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
                DailyMarketEod.prev_close_price.label("PrevClose"),
                DailyMarketEod.upper_circuit_limit.label("UpperCircuitLimit"),
                DailyMarketEod.lower_circuit_limit.label("LowerCircuitLimit"),
                DailyMarketEod.total_traded_quantity.label("Volume"),
                DailyMarketEod.company_name.label("CompanyName"),
                DailyMarketEod.isin.label("ISIN"),
                DailyMarketEod.delivery_quantity.label("DeliveryQuantity")
            ).filter(DailyMarketEod.symbol == ticker).order_by(DailyMarketEod.trade_date)

            df = pd.read_sql(q.statement, db.bind)
            if not df.empty:
                upper = pd.to_numeric(df["UpperCircuitLimit"], errors="coerce")
                prev_c = pd.to_numeric(df["PrevClose"], errors="coerce")
                valid = (prev_c > 0) & (upper > 0)
                df["Band"] = 0.05
                df.loc[valid, "Band"] = (upper[valid] - prev_c[valid]) / prev_c[valid]
                return clean_historical_data(df)
        except Exception as e:
            print(f"[surveillance_service] DB single EOD load error for {ticker}: {e}")
        finally:
            if db:
                db.close()
        return None

    def _load_all_dilution_factors(self) -> Dict[str, float]:
        """Loads all active dilution factors from database."""
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import PriceDilutionFactor
            db = SessionLocal()
            try:
                recs = db.query(PriceDilutionFactor).all()
                return {r.symbol: float(r.split_multiplier or 1.0) for r in recs if r.split_multiplier is not None}
            finally:
                db.close()
        except Exception:
            return {}

    def _get_dilution_multiplier(self, ticker: str, as_of_date: Optional[str] = None) -> float:
        """Returns the split/bonus dilution multiplier for ticker valid as of observation date, defaulting to 1.0."""
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import PriceDilutionFactor
            db = SessionLocal()
            try:
                q = db.query(PriceDilutionFactor).filter(PriceDilutionFactor.symbol == ticker)
                if as_of_date:
                    q = q.filter(PriceDilutionFactor.valid_from_date <= as_of_date, PriceDilutionFactor.valid_thru_date >= as_of_date)
                rec = q.order_by(PriceDilutionFactor.valid_from_date.desc()).first()
                if rec and rec.split_multiplier is not None:
                    return float(rec.split_multiplier)
            finally:
                db.close()
        except Exception:
            pass
        return 1.0

    def _load_db_trades(self) -> Optional[pd.DataFrame]:
        """Loads genuine participant daily trades and LTP contributions directly from participant_daily_trades."""
        db = None
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import ParticipantDailyTrade

            db = SessionLocal()
            q_clnt = db.query(
                ParticipantDailyTrade.symbol.label("Ticker"),
                ParticipantDailyTrade.trade_date.label("Date"),
                ParticipantDailyTrade.client_pan.label("PAN"),
                ParticipantDailyTrade.client_legal_name.label("ClientName"),
                ParticipantDailyTrade.client_category.label("ClientCategory"),
                ParticipantDailyTrade.trading_member_id.label("TradingMemberId"),
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
                df["CounterpartyPAN"] = "UNKNOWN"
                return df
        except Exception as e:
            print(f"[surveillance_service] DB trades load error: {e}")
        finally:
            if db:
                db.close()
        return None

    def _load_db_pairs(self) -> Optional[pd.DataFrame]:
        """Loads genuine bilateral counterparty trades directly from counterparty_trade_pairs."""
        db = None
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import CounterpartyTradePair

            db = SessionLocal()
            q_pair = db.query(
                CounterpartyTradePair.symbol.label("symbol"),
                CounterpartyTradePair.trade_date.label("trade_date"),
                CounterpartyTradePair.buyer_pan.label("buyer_pan"),
                CounterpartyTradePair.buyer_legal_name.label("buyer_legal_name"),
                CounterpartyTradePair.seller_pan.label("seller_pan"),
                CounterpartyTradePair.seller_legal_name.label("seller_legal_name"),
                CounterpartyTradePair.buyer_tm_id.label("buyer_tm_id"),
                CounterpartyTradePair.seller_tm_id.label("seller_tm_id"),
                CounterpartyTradePair.matched_quantity.label("matched_quantity"),
                CounterpartyTradePair.matched_turnover_value.label("matched_turnover_value"),
                CounterpartyTradePair.pairwise_ltp_push_value.label("pairwise_ltp_push_value"),
                CounterpartyTradePair.pairwise_ltp_push_value_logic_2.label("pairwise_ltp_push_value_logic_2"),
                CounterpartyTradePair.reverse_matched_quantity.label("reverse_matched_quantity"),
                CounterpartyTradePair.is_same_broker_wash.label("is_same_broker_wash"),
            )

            df = pd.read_sql(q_pair.statement, db.bind)
            if not df.empty:
                return df
        except Exception as e:
            print(f"[surveillance_service] DB pairs load error: {e}")
        finally:
            if db:
                db.close()
        return None



    def update_weights(self, weights: Dict[str, float], threshold: Optional[float] = None) -> SurveillanceConfig:
        """Dynamically updates scoring weights w1..w5 and risk score threshold, persisting to disk."""
        for k, v in weights.items():
            if k in self.config.weights:
                self.config.weights[k] = float(v)
        if threshold is not None:
            self.config.threshold = float(threshold)
        self._save_persisted_config()
        self.engine = SurveillanceEngine(self.config)
        self._summary_cache.clear()
        return self.config

    def get_available_trading_dates(self) -> List[str]:
        """Returns sorted list of distinct, valid OPEN market trading dates (YYYY-MM-DD)."""
        if hasattr(self, "_cached_trading_dates") and self._cached_trading_dates is not None:
            return self._cached_trading_dates

        dates: List[Any] = []
        if hasattr(self, "current_df") and self.current_df is not None and not self.current_df.empty:
            dates = self.current_df["Date"].unique().tolist()
        else:
            db = None
            try:
                from backend.db.database import SessionLocal
                from backend.db.models import DailyMarketEod
                db = SessionLocal()
                dates = [r[0] for r in db.query(DailyMarketEod.trade_date).distinct().order_by(DailyMarketEod.trade_date.desc()).all()]
            except Exception as e:
                print(f"[surveillance_service] DB dates error: {e}")
                dates = []
            finally:
                if db:
                    db.close()

        if not dates:
            return []
        
        # Get raw dates from the data presence
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
                
        res = sorted(list(set(valid_trading_days)), reverse=True)
        if res:
            self._cached_trading_dates = res
        return res

    def get_watchlist(self, as_of_date: Optional[str] = None, window_days: int = 15, exchange: str = "ALL") -> List[Dict[str, Any]]:
        """Returns shortlisted scrips violating risk threshold according to Section 3 of PVASF_CORE_SPEC."""
        scrips = self.get_scrips_summary(as_of_date=as_of_date, window_days=window_days, exchange=exchange)
        return [s for s in scrips if s["watchlist"]]

    def _risk_and_status(self, score: float) -> tuple[str, str]:
        thresh = self.config.threshold
        if score >= thresh:
            return "High", "Open"
        med_thresh = max(10.0, round(thresh * 0.6))
        if score >= med_thresh:
            return "Medium", "Under review"
        return "Low", "Normal"

    def get_scrips_summary(self, as_of_date: Optional[str] = None, window_days: int = 15, exchange: str = "ALL") -> List[Dict[str, Any]]:
        """Calculates surveillance metrics for all scrips as of a specific EOD observation date."""
        # Check in-memory summary cache for instant sub-millisecond repeat responses
        weights_tuple = tuple(sorted(self.config.weights.items()))
        cache_key = f"{as_of_date}_{window_days}_{exchange}_{self.config.threshold}_{weights_tuple}"
        if hasattr(self, "_summary_cache") and cache_key in self._summary_cache:
            return self._summary_cache[cache_key]

        if not hasattr(self, "current_df") or self.current_df is None or self.current_df.empty:
            db_df = self._load_db_eod()
            if db_df is not None and not db_df.empty:
                self.current_df = db_df

        df_source = self.current_df
        resolved_date = as_of_date
        if resolved_date:
            while not self.calendar.is_market_open(resolved_date) and resolved_date > "2020-01-01":
                dt_obj = datetime.strptime(resolved_date, "%Y-%m-%d")
                resolved_date = (dt_obj - timedelta(days=1)).strftime("%Y-%m-%d")

            if "DateStr" not in df_source.columns:
                df_source["DateStr"] = df_source["Date"].apply(lambda d: d.strftime("%Y-%m-%d") if isinstance(d, (datetime, pd.Timestamp)) else str(d)[:10])
            df_source = df_source[df_source["DateStr"] <= resolved_date]

        # Pre-group by ticker once into a dictionary for O(1) instant access (10x faster)
        grouped_tickers = dict(tuple(df_source.groupby("Ticker", sort=False)))
        dilutions = self._load_all_dilution_factors()
        results = []

        for ticker, df_raw in grouped_tickers.items():
            df_t = df_raw.sort_values(by="Date").reset_index(drop=True)
            if len(df_t) < 30:
                continue
                
            try:
                dilution_mult = dilutions.get(ticker, 1.0)
                metrics: MarketMetricsResult = self.engine.calculate_core_metrics(ticker, df_t, dilution_multiplier=dilution_mult)
                t180_idx = max(0, len(df_t) - min(181, len(df_t)))
                start_p = float(df_t["Close"].iloc[t180_idx])
                end_p = float(df_t["Close"].iloc[-1])
                change_pct = float(((end_p - start_p) / start_p) * 100)
                
                company_name = str(df_t["CompanyName"].iloc[-1]) if "CompanyName" in df_t.columns and pd.notna(df_t["CompanyName"].iloc[-1]) and str(df_t["CompanyName"].iloc[-1]).strip() != "" else f"{ticker} Ltd"
                isin_code = str(df_t["ISIN"].iloc[-1]) if "ISIN" in df_t.columns and pd.notna(df_t["ISIN"].iloc[-1]) and str(df_t["ISIN"].iloc[-1]).strip() != "" else "—"
                risk, status = self._risk_and_status(metrics.final_score)

                # Determine exchange-adjusted metrics directly from calibrated engine
                effective_score = metrics.final_score
                effective_vol_z = metrics.volume_z
                effective_price_z = metrics.price_z
                effective_price_rise = metrics.price_rise_pct
                effective_band_hits = metrics.band_hit_days
                effective_high_days = metrics.new_high_days

                venue_trigger = None

                # 2. Data Quality / Feed Issue Detection
                data_quality_flags = []
                if resolved_date:
                    latest_available = df_t["DateStr"].iloc[-1] if not df_t.empty else None
                    if latest_available != resolved_date:
                        # Data missing for this session date
                        if exchange == "ALL":
                            data_quality_flags.append("CONSOLIDATED_FEED_MISSING")
                        elif exchange == "NSE":
                            data_quality_flags.append("NSE_FEED_MISSING")
                        elif exchange == "BSE":
                            data_quality_flags.append("BSE_FEED_MISSING")

                results.append({
                    "ticker": ticker,
                    "symbol": ticker,
                    "company": company_name,
                    "company_name": company_name,
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
                    "threshold": self.config.threshold,
                    "risk": risk,
                    "status": status,
                    "exchange_scope": exchange,
                    "data_quality": data_quality_flags,
                    "venue_trigger": venue_trigger
                })
            except Exception as e:
                print(f"[skip] {ticker}: {e}")
                
        results.sort(key=lambda x: x["risk_score"], reverse=True)
        if hasattr(self, "_summary_cache"):
            self._summary_cache[cache_key] = results
        return results

    def get_scrip_detail(self, ticker: str, as_of_date: Optional[str] = None, window_days: int = 15, exchange: str = "ALL") -> Dict[str, Any]:
        """Returns scrip EOD OHLCV price/volume history and calculated core PV metrics as of observation date."""
        if hasattr(self, "current_df") and self.current_df is not None and not self.current_df.empty and ticker in self.current_df["Ticker"].values:
            df_t = cast(pd.DataFrame, self.current_df[self.current_df["Ticker"] == ticker]).sort_values(by="Date").reset_index(drop=True)
        else:
            df_single = self._load_single_ticker_eod(ticker)
            if df_single is not None and not df_single.empty:
                df_t = df_single.sort_values(by="Date").reset_index(drop=True)
            else:
                raise ValueError(f"Scrip {ticker} not found in current EOD dataset")

        if df_t.empty:
            raise ValueError(f"Scrip {ticker} not found in current EOD dataset")
            
        if as_of_date:
            df_t["DateStr"] = df_t["Date"].apply(lambda d: d.strftime("%Y-%m-%d") if isinstance(d, (datetime, pd.Timestamp)) else str(d)[:10])
            df_t = cast(pd.DataFrame, df_t[df_t["DateStr"] <= as_of_date]).sort_values(by="Date").reset_index(drop=True)
            if df_t.empty:
                raise ValueError(f"No price data for {ticker} on or before {as_of_date}")

        dilution_mult = self._get_dilution_multiplier(ticker, as_of_date)
        metrics: MarketMetricsResult = self.engine.calculate_core_metrics(ticker, df_t, dilution_multiplier=dilution_mult)
        
        # Pre-compute MA20 and MA50 across the full historical dataset for complete chart coverage
        df_t["MA20"] = df_t["Close"].rolling(20).mean().round(2)
        df_t["MA50"] = df_t["Close"].rolling(50).mean().round(2)

        history = []
        # Include 181 trading days so item 0 is the exact T-180 baseline price
        for _, row in df_t.tail(181).iterrows():
            d_val: Any = row["Date"]
            deliv_q = row["DeliveryQuantity"] if "DeliveryQuantity" in row and pd.notna(row["DeliveryQuantity"]) else None
            vol_val = int(row["Volume"]) if pd.notna(row["Volume"]) else 0
            deliv_pct = round((float(deliv_q) / float(vol_val)) * 100, 1) if deliv_q is not None and vol_val > 0 else None
            history.append({
                "date": d_val.strftime("%Y-%m-%d") if hasattr(d_val, "strftime") else str(d_val)[:10],
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": vol_val,
                "delivery_pct": deliv_pct,
                "ma20": float(row["MA20"]) if bool(pd.notna(row["MA20"])) else None,
                "ma50": float(row["MA50"]) if bool(pd.notna(row["MA50"])) else None
            })
            
        risk, status = self._risk_and_status(metrics.final_score)
        price_band_val = float(df_t["Band"].iloc[-1]) if "Band" in df_t.columns and pd.notna(df_t["Band"].iloc[-1]) else 0.05

        company_val = str(df_t["CompanyName"].iloc[-1]) if "CompanyName" in df_t.columns and pd.notna(df_t["CompanyName"].iloc[-1]) and str(df_t["CompanyName"].iloc[-1]).strip() != "" else f"{ticker} Ltd"
        isin_val = str(df_t["ISIN"].iloc[-1]) if "ISIN" in df_t.columns and pd.notna(df_t["ISIN"].iloc[-1]) and str(df_t["ISIN"].iloc[-1]).strip() != "" else "—"

        return {
            "ticker": ticker,
            "symbol": ticker,
            "company": company_val,
            "isin": isin_val,
            "risk": risk,
            "status": status,
            "score": round(metrics.final_score, 2),
            "risk_score": round(metrics.final_score, 2),
            "threshold": self.config.threshold,
            "watchlist": metrics.final_score >= self.config.threshold,
            "price_band": price_band_val,
            "exchange_scope": exchange,
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
        unique_pans_holding_t = None
        unique_pans_holding_180 = None
        avg_trading_pans_15d = None
        avg_trading_pans_180d = None
        top_1pct_concentration = None
        promoter_pct = None
        public_pct = None
        has_live_feed = False

        db = None
        try:
            from sqlalchemy import func
            from backend.db.database import SessionLocal
            from backend.db.models import ShareholdingSummary, ParticipantDailyTrade
            db = SessionLocal()

            # Query shareholding filings sorted by filing_date desc
            sh_records = (
                db.query(ShareholdingSummary)
                .filter(ShareholdingSummary.symbol == ticker)
                .order_by(ShareholdingSummary.filing_date.desc())
                .all()
            )

            if sh_records:
                has_live_feed = True
                quarter_map: Dict[str, List[Any]] = {}
                for sh in sh_records:
                    quarter_map.setdefault(sh.quarter_code, []).append(sh)

                quarters_ordered = list(quarter_map.keys())
                latest_q = quarters_ordered[0]
                latest_records = quarter_map[latest_q]

                p_recs = [r for r in latest_records if "PROMOTER" in (r.category_type or "").upper()]
                t1_recs = [r for r in latest_records if "TOP_1_PCT" in (r.category_type or "").upper()]
                pub_recs = [r for r in latest_records if "PUBLIC" in (r.category_type or "").upper() or "FLOAT" in (r.category_type or "").upper()]

                if p_recs:
                    promoter_pct = round(sum(float(r.holding_percentage or 0.0) for r in p_recs), 2)
                if t1_recs:
                    top_1pct_concentration = round(sum(float(r.holding_percentage or 0.0) for r in t1_recs), 2)
                if pub_recs:
                    public_pct = round(sum(float(r.holding_percentage or 0.0) for r in pub_recs), 2)
                elif promoter_pct is not None:
                    public_pct = round(max(0.0, 100.0 - promoter_pct), 2)

                # Total unique holding PANs for latest filing across categories
                pans_t_sum = sum(r.unique_holding_pans or 0 for r in latest_records)
                unique_pans_holding_t = pans_t_sum if pans_t_sum > 0 else None

                # Baseline filing (~180 days prior, i.e. prior quarter)
                if len(quarters_ordered) > 1:
                    prior_q = quarters_ordered[-1]
                    prior_records = quarter_map[prior_q]
                    pans_180_sum = sum(r.unique_holding_pans or 0 for r in prior_records)
                    unique_pans_holding_180 = pans_180_sum if pans_180_sum > 0 else None
                else:
                    unique_pans_holding_180 = unique_pans_holding_t

            # Calculate real average daily trading PANs directly from participant_daily_trades
            subq_15 = (
                db.query(
                    ParticipantDailyTrade.trade_date,
                    func.count(func.distinct(ParticipantDailyTrade.client_pan)).label("daily_pans")
                )
                .filter(ParticipantDailyTrade.symbol == ticker)
                .group_by(ParticipantDailyTrade.trade_date)
                .order_by(ParticipantDailyTrade.trade_date.desc())
                .limit(15)
                .subquery()
            )
            res_15 = db.query(func.avg(subq_15.c.daily_pans)).scalar()
            if res_15 is not None:
                avg_trading_pans_15d = round(float(res_15), 1)

            subq_180 = (
                db.query(
                    ParticipantDailyTrade.trade_date,
                    func.count(func.distinct(ParticipantDailyTrade.client_pan)).label("daily_pans")
                )
                .filter(ParticipantDailyTrade.symbol == ticker)
                .group_by(ParticipantDailyTrade.trade_date)
                .subquery()
            )
            res_180 = db.query(func.avg(subq_180.c.daily_pans)).scalar()
            if res_180 is not None:
                avg_trading_pans_180d = round(float(res_180), 1)

            if avg_trading_pans_15d is None and sh_records:
                for r in sh_records:
                    if r.avg_daily_trading_pans:
                        avg_trading_pans_15d = r.avg_daily_trading_pans
                        avg_trading_pans_180d = r.avg_daily_trading_pans
                        break

        except Exception as e:
            print(f"[surveillance_service] Shareholding DB lookup error: {e}")
        finally:
            if db:
                db.close()

        return {
            "unique_pans_15d": unique_pans_holding_t,
            "unique_pans_180d": unique_pans_holding_180,
            "unique_pans_holding_t": unique_pans_holding_t,
            "unique_pans_holding_180": unique_pans_holding_180,
            "avg_trading_pans_15d": avg_trading_pans_15d,
            "avg_trading_pans_180d": avg_trading_pans_180d,
            "top_1pct_concentration": top_1pct_concentration,
            "promoter_percent": promoter_pct,
            "public_percent": public_pct,
            "has_live_feed": has_live_feed
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
        if hasattr(self, "current_df") and self.current_df is not None and not self.current_df.empty and ticker in self.current_df["Ticker"].values:
            df_t = cast(pd.DataFrame, self.current_df[self.current_df["Ticker"] == ticker]).sort_values(by="Date").reset_index(drop=True)
        else:
            df_single = self._load_single_ticker_eod(ticker)
            if df_single is not None and not df_single.empty:
                df_t = df_single.sort_values(by="Date").reset_index(drop=True)
            else:
                df_t = pd.DataFrame()
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
            trades_date_strs = trades_slice["Date"].apply(lambda d: d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10])
            if not df_t.empty and "DateStr" in df_t.columns:
                window_dates = list(df_t["DateStr"].tail(window_days))
                trades_slice = cast(pd.DataFrame, trades_slice[trades_date_strs.isin(window_dates)])
            else:
                trades_slice = cast(pd.DataFrame, trades_slice[trades_date_strs <= as_of_date])

        pairs_slice = getattr(self, "current_pairs_df", None)
        if pairs_slice is not None and not pairs_slice.empty and as_of_date and "trade_date" in pairs_slice.columns:
            pair_date_strs = pairs_slice["trade_date"].apply(lambda d: d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10])
            if not df_t.empty and "DateStr" in df_t.columns:
                window_dates = list(df_t["DateStr"].tail(window_days))
                pairs_slice = cast(pd.DataFrame, pairs_slice[pair_date_strs.isin(window_dates)])
            else:
                pairs_slice = cast(pd.DataFrame, pairs_slice[pair_date_strs <= as_of_date])

        part_res: ParticipantAuditResult = self.engine.analyze_participants(
            ticker, trades_slice, final_close, total_vol, pairs_df=pairs_slice
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
                    "scrip_movement_contribution_pct": round((float(row.get("LTPContribution", 0)) / scrip_15d_price_change) * 100, 2) if scrip_15d_price_change > 0.05 else None,
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
                    "scrip_movement_contribution_pct": round((float(row.get("PosContVal", max(0.0, float(row.get("LTPContribution", 0))))) / scrip_15d_price_change) * 100, 2) if scrip_15d_price_change > 0.05 else None,
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
                    "scrip_movement_contribution_pct": round((float(row.get("NegContVal", abs(float(row.get("LTPContribution", 0))))) / scrip_15d_price_change) * 100, 2) if scrip_15d_price_change > 0.05 else None,
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
            latest_q = quarter_keys[0] if quarter_keys else None
            prior_q = quarter_keys[-1] if len(quarter_keys) > 1 else latest_q

            prom_latest = [r for r in main_records if r.quarter_code == latest_q and "PROMOTER" in (r.category_type or "").upper()] if latest_q else []
            prom_prior = [r for r in main_records if r.quarter_code == prior_q and "PROMOTER" in (r.category_type or "").upper()] if prior_q else []
            promoter_shares_t = sum(p.total_shares_count or 0 for p in prom_latest) if prom_latest else None
            promoter_pct_t = round(sum(float(p.holding_percentage or 0.0) for p in prom_latest), 2) if prom_latest else None
            promoter_shares_180 = sum(p.total_shares_count or 0 for p in prom_prior) if prom_prior else promoter_shares_t
            promoter_pct_180 = round(sum(float(p.holding_percentage or 0.0) for p in prom_prior), 2) if prom_prior else promoter_pct_t

            top1_latest = [r for r in main_records if r.quarter_code == latest_q and "TOP_1_PCT" in (r.category_type or "").upper()] if latest_q else []
            top1_prior = [r for r in main_records if r.quarter_code == prior_q and "TOP_1_PCT" in (r.category_type or "").upper()] if prior_q else []
            top1_shares_t = sum(p.total_shares_count or 0 for p in top1_latest) if top1_latest else None
            top1_pct_t = round(sum(float(p.holding_percentage or 0.0) for p in top1_latest), 2) if top1_latest else None
            top1_shares_180 = sum(p.total_shares_count or 0 for p in top1_prior) if top1_prior else top1_shares_t
            top1_pct_180 = round(sum(float(p.holding_percentage or 0.0) for p in top1_prior), 2) if top1_prior else top1_pct_t

            major_shareholders = [
                {
                    "pan": p.holder_pan,
                    "name": p.holder_legal_name,
                    "client_name": p.holder_legal_name,
                    "category": p.holder_category,
                    "shares": p.shares_held,
                    "holding_pct": float(p.holding_percentage or 0.0),
                    "pledged_count": p.pledged_shares_count or 0,
                    "is_substantial": float(p.holding_percentage or 0.0) >= 5.0,
                }
                for p in prom_records
            ]

            return {
                "symbol": ticker,
                "quarterly_history": list(quarters.values()),
                "promoter_group": promoters,
                "major_shareholders": major_shareholders,
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
                "major_shareholders": [],
                "promoter_shares_t": None,
                "promoter_pct_t": None,
                "promoter_shares_180": None,
                "promoter_pct_180": None,
                "top1_shares_t": None,
                "top1_pct_t": None,
                "top1_shares_180": None,
                "top1_pct_180": None,
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

