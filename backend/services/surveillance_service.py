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
        self.config = SurveillanceConfig()
        self.engine = SurveillanceEngine(self.config)
        
        db_df = self._load_db_eod()
        self.current_df = db_df if db_df is not None else self._generate_sample_teradata_eod()

        db_trades = self._load_db_trades()
        self.current_trades_df = db_trades if db_trades is not None else self._generate_sample_trades_df()

    def _load_db_eod(self) -> Optional[pd.DataFrame]:
        """Loads EOD OHLCV data directly from the aggregate table AGG_SEC_DAY."""
        db = None
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import AggSecDay

            db = SessionLocal()
            q = db.query(
                AggSecDay.Asd_Symbol.label("Ticker"),
                AggSecDay.Asd_Date.label("Date"),
                AggSecDay.Asd_Open_Price.label("Open"),
                AggSecDay.Asd_High_Price.label("High"),
                AggSecDay.Asd_Low_Price.label("Low"),
                AggSecDay.Asd_Close_Price.label("Close"),
                AggSecDay.Asd_Tot_Qty.label("Volume")
            ).order_by(AggSecDay.Asd_Symbol, AggSecDay.Asd_Date)

            df = pd.read_sql(q.statement, db.bind)
            if not df.empty and len(df) > 10:
                return clean_historical_data(df)
        except Exception as e:
            print(f"[surveillance_service] DB EOD load error from AGG_SEC_DAY: {e}")
        finally:
            if db:
                db.close()
        return None

    def _load_db_trades(self) -> Optional[pd.DataFrame]:
        """Loads participant trade aggregates directly from AGG_CLNT_SEC_DAY + DECL in the database."""
        db = None
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import AggClntSecDay, DimExchClntDtls, AggSecDay

            db = SessionLocal()
            q = db.query(
                AggSecDay.Asd_Symbol.label("Ticker"),
                AggClntSecDay.Acsd_Date.label("Date"),
                DimExchClntDtls.Decl_Clnt_Pan.label("PAN"),
                AggClntSecDay.Acsd_Buy_Tot_Qty.label("BuyVolume"),
                AggClntSecDay.Acsd_Sell_Tot_Qty.label("SellVolume"),
                AggClntSecDay.Acsd_Buy_Tot_Val.label("BuyValue"),
                AggClntSecDay.Acsd_Sell_Tot_Val.label("SellValue"),
                AggClntSecDay.Acsd_Pos_Cont_Val.label("PosContVal"),
                AggClntSecDay.Acsd_Neg_Cont_Val.label("NegContVal"),
                (AggClntSecDay.Acsd_Buy_Wash_Qty + AggClntSecDay.Acsd_Sell_Wash_Qty).label("WashVolume")
            ).join(DimExchClntDtls, AggClntSecDay.Acsd_Clnt_Token == DimExchClntDtls.Decl_Exch_Clnt_Token)\
             .join(AggSecDay, (AggClntSecDay.Acsd_Cmp_Token == AggSecDay.Asd_Cmp_Token) & (AggClntSecDay.Acsd_Date == AggSecDay.Asd_Date))

            df = pd.read_sql(q.statement, db.bind)
            if not df.empty:
                pos = df["PosContVal"].fillna(0.0)
                neg = df["NegContVal"].fillna(0.0)
                df["LTPContribution"] = pos - neg
                df["CounterpartyPAN"] = "MULTIPLE"
                return df
        except Exception as e:
            print(f"[surveillance_service] DB aggregate trades load error from AGG_CLNT_SEC_DAY: {e}")
        finally:
            if db:
                db.close()
        return None

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
            ("AXISBANK", 1150.0, 0.15, False),
            ("RELIANCE", 2900.0, 0.06, False),
            ("HDFCBANK", 1750.0, 0.05, False),
            ("INFY", 1550.0, 0.07, False),
            ("WIPRO", 480.0, 0.10, False),
            ("BAJFINANCE", 7200.0, 0.12, True),
            ("MARUTI", 11000.0, 0.08, False),
            ("SUNPHARMA", 1200.0, 0.09, False)
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
                    close[idx] = close[idx - 1] * 1.025
                    high[idx] = close[idx] * 1.002
                    volume[idx] = int(volume[idx - 1] * 1.8)
            
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

    def _risk_and_status(self, score: float) -> tuple[str, str]:
        thresh = self.config.threshold
        if score >= thresh:
            return "High", "Open"
        if score >= 10.0:
            return "Medium", "Under review"
        return "Low", "Normal"

    def get_scrips_summary(self) -> List[Dict[str, Any]]:
        """Calculates surveillance metrics for all scrips in the current EOD dataset."""
        if len(self.current_df["Ticker"].unique()) < 15:
            db_df = self._load_db_eod()
            if db_df is not None and not db_df.empty:
                self.current_df = db_df

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
                
                risk, status = self._risk_and_status(metrics.final_score)
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
                    "risk": risk,
                    "status": status
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
            
        risk, status = self._risk_and_status(metrics.final_score)
        return {
            "ticker": ticker,
            "symbol": ticker,
            "risk": risk,
            "status": status,
            "metrics": metrics.as_dict(),
            "score_breakdown": [
                {"label": "Price Rise", "score": metrics.price_rise_score, "weight": self.config.weights.get("price_rise", 0.0), "contribution": metrics.price_rise_score * self.config.weights.get("price_rise", 0.0) / 5},
                {"label": "Price Z", "score": metrics.price_z_score, "weight": self.config.weights.get("price_z", 0.0), "contribution": metrics.price_z_score * self.config.weights.get("price_z", 0.0) / 5},
                {"label": "Volume Z", "score": metrics.volume_z_score, "weight": self.config.weights.get("volume_z", 0.0), "contribution": metrics.volume_z_score * self.config.weights.get("volume_z", 0.0) / 5},
                {"label": "Band Persistence", "score": metrics.band_score, "weight": self.config.weights.get("band_persistence", 0.0), "contribution": metrics.band_score * self.config.weights.get("band_persistence", 0.0) / 5},
                {"label": "180 Day New High", "score": metrics.new_high_score, "weight": self.config.weights.get("new_high", 0.0), "contribution": metrics.new_high_score * self.config.weights.get("new_high", 0.0) / 5}
            ],
            "history": history,
            "summary": {
                "start_price": round(float(df_t["Close"].iloc[-181 if len(df_t) >= 181 else 0]), 2),
                "latest_close": round(float(df_t["Close"].iloc[-1]), 2),
                "price_change_pct": round(float(((df_t["Close"].iloc[-1] - df_t["Close"].iloc[-181 if len(df_t) >= 181 else 0]) / df_t["Close"].iloc[-181 if len(df_t) >= 181 else 0]) * 100), 2),
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
        promoter_pct = 0.0
        public_pct = 0.0

        db = None
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import AggClntSecDay, AggSecDay, FactMainShldng
            db = SessionLocal()

            # Query real trade aggregate database AGG_CLNT_SEC_DAY
            clnt_records = db.query(AggClntSecDay).join(
                AggSecDay, (AggClntSecDay.Acsd_Cmp_Token == AggSecDay.Asd_Cmp_Token) & (AggClntSecDay.Acsd_Date == AggSecDay.Asd_Date)
            ).filter(AggSecDay.Asd_Symbol == ticker).all()

            if clnt_records:
                clients = set(r.Acsd_Clnt_Token for r in clnt_records if r.Acsd_Clnt_Token)
                unique_pans_15d = len(clients)
                unique_pans_180d = len(clients)

                # Concentration
                buy_vols: Dict[int, float] = {}
                for r in clnt_records:
                    if r.Acsd_Clnt_Token:
                        buy_vols[r.Acsd_Clnt_Token] = buy_vols.get(r.Acsd_Clnt_Token, 0.0) + float(r.Acsd_Buy_Tot_Qty or 0.0)
                tot_v = sum(buy_vols.values())
                if tot_v > 0 and len(buy_vols) > 0:
                    sorted_vols = sorted(buy_vols.values(), reverse=True)
                    top_n = max(1, int(np.ceil(len(sorted_vols) * 0.01)))
                    top_1pct_concentration = round(float((sum(sorted_vols[:top_n]) / tot_v) * 100), 2)

            # Query real shareholding database FactMainShldng
            sh_prom = db.query(FactMainShldng).filter(FactMainShldng.Fshg_Symbol == ticker, FactMainShldng.Fshg_Shldng_Catg_Type == 1).order_by(FactMainShldng.Fshg_Shldng_Date.desc()).first()
            sh_pub = db.query(FactMainShldng).filter(FactMainShldng.Fshg_Symbol == ticker, FactMainShldng.Fshg_Shldng_Catg_Type == 2).order_by(FactMainShldng.Fshg_Shldng_Date.desc()).first()
            if sh_prom:
                promoter_pct = float(sh_prom.Fshg_Tot_Shares_Pct or 0.0)
            if sh_pub:
                public_pct = float(sh_pub.Fshg_Tot_Shares_Pct or 0.0)
        except Exception as e:
            print(f"[surveillance_service] Shareholding DB lookup error: {e}")
        finally:
            if db:
                db.close()

        return {
            "unique_pans_15d": unique_pans_15d,
            "unique_pans_180d": unique_pans_180d,
            "top_1pct_concentration": top_1pct_concentration,
            "promoter_percent": promoter_pct,
            "public_percent": public_pct,
            "has_live_feed": True
        }

    def _get_announcements(self, ticker: str) -> List[Dict[str, Any]]:
        """Retrieves official corporate announcements from Database for the given ticker."""
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import FactCorpActions
            db = SessionLocal()
            ann_list = db.query(FactCorpActions)\
                         .filter(FactCorpActions.Fcac_Symbol == ticker)\
                         .order_by(FactCorpActions.Fcac_Rec_Date.desc())\
                         .all()
            db.close()
            if ann_list:
                return [
                    {
                        "date": a.Fcac_Rec_Date.strftime("%Y-%m-%d") if hasattr(a.Fcac_Rec_Date, "strftime") else str(a.Fcac_Rec_Date),
                        "category": a.Fcac_Corp_Action_Catg or "General",
                        "title": a.Fcac_Divnd_Prpse or f"Corporate Action — {a.Fcac_Corp_Action_Catg}",
                        "status": "Verified"
                    }
                    for a in ann_list
                ]
        except Exception as e:
            print(f"[surveillance_service] Announcements DB lookup error: {e}")

        return []

    def get_scrip_participants(self, ticker: str) -> Dict[str, Any]:
        """Serves participant-level analytical breakdown per Section 4 of PVASF_CORE_SPEC."""
        df_t = self.current_df[self.current_df["Ticker"] == ticker].sort_values("Date").reset_index(drop=True)
        final_close = float(df_t["Close"].iloc[-1]) if not df_t.empty else 100.0
        total_vol = float(df_t["Volume"].tail(15).sum()) if not df_t.empty else 1000000.0
        
        # Actual 15-day Net Stock Price Movement (Close_T - Close_{T-15}) per PVASF_CORE_SPEC 4.1
        if len(df_t) >= 15:
            scrip_15d_price_change = abs(float(df_t["Close"].iloc[-1]) - float(df_t["Close"].iloc[-15]))
        else:
            scrip_15d_price_change = 1.0
        scrip_15d_price_change = max(scrip_15d_price_change, 1e-4)

        part_res: ParticipantAuditResult = self.engine.analyze_participants(
            ticker, self.current_trades_df, final_close, total_vol
        )
        
        return {
            "ticker": ticker,
            "ltp_contributors": [
                {"participant": row["PAN"], "contribution": round((row["LTPContribution"] / scrip_15d_price_change) * 100, 2)}
                for row in part_res.ltp_contributors
            ],
            "volume_share": [
                {"participant": row["PAN"], "volume": row["PANVolume"], "share_pct": round(row["VolumeSharePercent"], 2)}
                for row in part_res.volume_share
            ],
            "counterparty_pairs": [
                {"pair": row["Pair"], "volume": row["Volume"], "share_pct": round(row["SharePercent"], 2)}
                for row in part_res.counterparty_pairs
            ],
            "reversal_pairs": [
                {"pair": row["Pair"], "volume": row["GrossVolume"], "reversal_ratio": row["ReversalRatio"]}
                for row in part_res.reversal_pairs
            ],
            "circular_loops": [
                {"loop": row["Cycle"], "volume": row["RotatedVolume"], "gross_volume": row["GrossVolume"]}
                for row in part_res.circular_loops
            ],
            "profit_makers": [
                {"participant": row["PAN"], "net_pnl": row["NetPnL"], "buy_volume": row["BuyVolume"], "sell_volume": row["SellVolume"]}
                for row in part_res.profit_makers
            ]
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

    def get_scrip_shareholding_breakdown(self, ticker: str) -> Dict[str, Any]:
        """Queries full quarter-by-quarter Enterprise Data Warehouse shareholding tables (FMSH, FSHG, FPRH, FPUH)."""
        db = None
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import FactMainShldng, FactPromShldrDtls, FactPubShldrDtls
            db = SessionLocal()
            
            main_records = db.query(FactMainShldng).filter(FactMainShldng.Fshg_Symbol == ticker).order_by(FactMainShldng.Fshg_Shldng_Date.desc()).all()
            prom_records = db.query(FactPromShldrDtls).filter(FactPromShldrDtls.Fprh_Symbol == ticker).all()
            pub_records = db.query(FactPubShldrDtls).filter(FactPubShldrDtls.Fpuh_Symbol == ticker).all()

            quarters = {}
            for r in main_records:
                q = r.Fshg_Qrtr_Num
                if q not in quarters:
                    quarters[q] = {"quarter": q, "date": str(r.Fshg_Shldng_Date), "promoter_pct": 0.0, "public_pct": 0.0, "pledged_pct": 0.0}
                if r.Fshg_Shldng_Catg_Type == 1:
                    quarters[q]["promoter_pct"] = float(r.Fshg_Tot_Shares_Pct or 0.0)
                    quarters[q]["pledged_pct"] = float(r.Fshg_Plge_Tot_Shares_Pct or 0.0)
                elif r.Fshg_Shldng_Catg_Type == 2:
                    quarters[q]["public_pct"] = float(r.Fshg_Tot_Shares_Pct or 0.0)

            promoters = [
                {
                    "name": p.Fprh_Shldr_Name,
                    "quarter": p.Fprh_Qrtr_Num,
                    "shares": p.Fprh_Tot_Shares,
                    "share_pct": float(p.Fprh_Tot_Shares_Pct or 0.0),
                    "pledged_pct": float(p.Fprh_Plge_Shares_Pct or 0.0)
                }
                for p in prom_records
            ]

            return {
                "symbol": ticker,
                "quarterly_history": list(quarters.values()),
                "promoter_group": promoters
            }
        except Exception as e:
            print(f"[surveillance_service] Shareholding breakdown error: {e}")
            return {"symbol": ticker, "quarterly_history": [], "promoter_group": []}
        finally:
            if db:
                db.close()

    def get_scrip_corporate_actions(self, ticker: str) -> List[Dict[str, Any]]:
        """Queries official Enterprise Data Warehouse corporate actions & dilution factors (FCAC, FCDF)."""
        db = None
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import FactCorpActions, FactCaDilFctr
            db = SessionLocal()
            
            actions = db.query(FactCorpActions).filter(FactCorpActions.Fcac_Symbol == ticker).order_by(FactCorpActions.Fcac_Rec_Date.desc()).all()
            dilutions = {d.Fcdf_Corp_Action_Catg: float(d.Fcdf_Price_Adj_Factor or 1.0) for d in db.query(FactCaDilFctr).filter(FactCaDilFctr.Fcdf_Symbol == ticker).all()}

            res = []
            for a in actions:
                catg = a.Fcac_Corp_Action_Catg or "General"
                res.append({
                    "id": a.id,
                    "symbol": ticker,
                    "category": catg,
                    "purpose": a.Fcac_Divnd_Prpse or f"Corporate Action — {catg}",
                    "record_date": str(a.Fcac_Rec_Date),
                    "ex_dividend_date": str(a.Fcac_Ex_Divnd_Date) if a.Fcac_Ex_Divnd_Date else None,
                    "dividend_pct": float(a.Fcac_Divnd_Pct) if a.Fcac_Divnd_Pct else None,
                    "dividend_val": float(a.Fcac_Divnd_Val) if a.Fcac_Divnd_Val else None,
                    "bonus_ratio": a.Fcac_Bonus_Ratio,
                    "dilution_factor": dilutions.get(catg, 1.0)
                })
            return res
        except Exception as e:
            print(f"[surveillance_service] Corporate actions error: {e}")
            return []
        finally:
            if db:
                db.close()
