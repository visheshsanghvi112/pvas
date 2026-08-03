"""
Price-Volume (PV) Alert Surveillance Framework
------------------------------------------------
A modular, programmatic Python framework for price-volume compliance surveillance.
Implements the 5 core statistical metrics and participant trade audit logic.
Designed to be imported and run in web backends (FastAPI, Next.js API routes),
Spark pipelines, or stand-alone CLI scripts.
"""

import argparse
import sys
import os
import json
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import pandas as pd

# ----------------------------------------------------------------------
# Column Synonyms Mapping for Data Validation & Ingestion Robustness
# ----------------------------------------------------------------------
MAPPING_RULES = {
    "Ticker": ["ticker", "scrip", "symbol", "scripcode", "stock", "ticker_symbol", "tickersymbol"],
    "Date": ["date", "trade_date", "datetime", "timestamp", "tradedate"],
    "Open": ["open", "openprice", "open_price"],
    "High": ["high", "highprice", "high_price"],
    "Low": ["low", "lowprice", "low_price"],
    "Close": ["close", "closeprice", "close_price", "ltp"],
    "Volume": ["volume", "qty", "quantity", "traded_qty", "volume_traded"],
    "BandPercent": ["bandpercent", "band_percent", "circuit", "circuit_limit", "band"],
    "PAN": ["pan", "pan_id", "participant", "investor", "panno", "pan_no"],
    "CounterpartyPAN": ["counterpartypan", "counterparty_pan", "counterparty", "cp_pan"],
    "BuyVolume": ["buyvolume", "buy_volume", "buy_qty", "buy_quantity", "buyqty"],
    "SellVolume": ["sellvolume", "sell_volume", "sell_qty", "sell_quantity", "sellqty"],
    "BuyValue": ["buyvalue", "buy_value", "buy_amt", "buy_amount"],
    "SellValue": ["sellvalue", "sell_value", "sell_amt", "sell_amount"],
    "LTPContribution": ["ltpcontribution", "ltp_contribution", "price_impact", "price_contrib"]
}

FACT_TRADES_COLUMNS = [
    "Ftrd_Trd_Date", "Ftrd_Trd_Num", "Ftrd_Exch_Token", "Ftrd_Seg_Token", "Ftrd_Sess_Type",
    "Ftrd_Trd_Tmst", "Ftrd_Trd_Time", "Ftrd_Cmp_Token", "Ftrd_Buy_Exch_TM_Token", "Ftrd_Buy_Trdr_Token",
    "Ftrd_Buy_Exch_Clnt_Token", "Ftrd_Sell_Exch_TM_Token", "Ftrd_Sell_Trdr_Token", "Ftrd_Sell_Exch_Clnt_Token",
    "Ftrd_Trd_Prd_Token", "Ftrd_Symbol", "Ftrd_Series", "Ftrd_Sub_Seg_Code", "Ftrd_Lot_Qty",
    "Ftrd_Tick_Price", "Ftrd_Exch_Trd_Prd_Num", "Ftrd_Trd_Qty", "Ftrd_Trd_Price", "Ftrd_Trd_Val",
    "Ftrd_Buy_Ord_Num", "Ftrd_Buy_Acct_Type", "Ftrd_Buy_CA_Catg", "Ftrd_Buy_CP_Token", "Ftrd_Buy_CP_Flag",
    "Ftrd_Buy_CTCL_Ref", "Ftrd_Buy_IP_Addr", "Ftrd_Sell_Ord_Num", "Ftrd_Sell_CA_Catg", "Ftrd_Sell_Acct_Type",
    "Ftrd_Sell_CP_Token", "Ftrd_Sell_CP_Flag", "Ftrd_Sell_CTCL_Ref", "Ftrd_Sell_IP_Addr", "Ftrd_Buy_Ord_Tmst",
    "Ftrd_Buy_Ord_Price", "Ftrd_Buy_Ord_Qty", "Ftrd_Buy_Trig_Price", "Ftrd_Buy_Book_Type", "Ftrd_Buy_Price_Type",
    "Ftrd_Buy_Mkt_Flag", "Ftrd_Buy_Stop_Flag", "Ftrd_Buy_Time_Type", "Ftrd_Buy_Trig_Type", "Ftrd_Buy_FOK_Flag",
    "Ftrd_Buy_Qty_Type", "Ftrd_Buy_Ord_Type", "Ftrd_Sell_Ord_Tmst", "Ftrd_Sell_Ord_Price", "Ftrd_Sell_Ord_Qty",
    "Ftrd_Sell_Trig_Price", "Ftrd_Sell_Book_Type", "Ftrd_Sell_Price_Type", "Ftrd_Sell_MKt_Flag", "Ftrd_Sell_Stop_Flag",
    "Ftrd_Sell_Time_Type", "Ftrd_Sell_Trig_Type", "Ftrd_Sell_FOK_Flag", "Ftrd_Sell_Qty_Type", "Ftrd_Sell_Ord_Type",
    "Ftrd_Buy_Spread_Indc", "Ftrd_Sell_Spread_Indc", "Ftrd_Buy_Spread_Flag", "Ftrd_Sell_Spread_Flag",
    "Ftrd_Trd_Mod_Flag", "Ftrd_Trd_Can_Flag", "Ftrd_Buy_Orig_Clnt_Id", "Ftrd_BOrig_Exch_Clnt_Token",
    "Ftrd_Buy_Orig_Cp_Flag", "Ftrd_Buy_Orig_Cp_Id", "Ftrd_Buy_Orig_CP_Token", "Ftrd_Sell_Orig_Clnt_Id",
    "Ftrd_SOrig_Exch_Clnt_Token", "Ftrd_Sell_Orig_Cp_Flag", "Ftrd_Sell_Orig_Cp_Id", "Ftrd_Sell_Orig_CP_Token",
    "Ftrd_Init_Side_Type", "Ftrd_Init_Clnt_Token", "Ftrd_Same_Broker_Wash_Flag", "Ftrd_Diff_Broker_Wash_Flag",
    "Ftrd_Buy_Sell_Diff_Time", "Ftrd_Buy_Sell_Diff_Price", "Ftrd_Buy_Sell_Diff_Qty", "Ftrd_Last_Trd_Price",
    "Ftrd_LTP_Chng_Indc", "Ftrd_Buy_CTCL_Inet_DMA_Flag", "Ftrd_Buy_CTCL_Algo_Flag", "Ftrd_Buy_CTCL_Pin",
    "Ftrd_Buy_CTCL_State", "Ftrd_Buy_CTCL_Zone", "Ftrd_Sell_CTCL_Inet_DMA_Flag", "Ftrd_Sell_CTCL_Algo_Flag",
    "Ftrd_Sell_CTCL_Pin", "Ftrd_Sell_CTCL_State", "Ftrd_Sell_CTCL_Zone", "Ftrd_Best_Bid_Price",
    "Ftrd_Best_Ask_Price", "Ftrd_Best_Bid_Qty", "Ftrd_Best_Ask_Qty", "Ftrd_Best_Bid_Ord_Cnt",
    "Ftrd_Best_Ask_Ord_Cnt", "Ftrd_Bid_Pdg_Ord_Cnt", "Ftrd_Ask_Pdg_Ord_Cnt", "Ftrd_Bid_Pdg_Ord_Qty",
    "Ftrd_Ask_Pdg_Ord_Qty", "Ftrd_Bid_Pdg_Ord_Val", "Ftrd_Ask_Pdg_Ord_Val", "Ftrd_Buy_Prev_Rmng_Qty",
    "Ftrd_Sell_Prev_Rmng_Qty", "Ftrd_Last_Estd_Hi_Price", "Ftrd_Last_Estd_Low_Price", "Ftrd_Hi_Hit_Flag",
    "Ftrd_Low_Hit_Flag", "Ftrd_Last_Hi_Trd_Num", "Ftrd_Last_Low_Trd_Num", "FTRD_BUY_ALGO_ID",
    "FTRD_SELL_ALGO_ID", "FTRD_BUY_ALGO_CATG_TYPE", "FTRD_SELL_ALGO_CATG_TYPE"
]


def normalize_fact_trades_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Renames case-insensitive/spaced/underscored columns to standard FACT_TRADES columns."""
    df = df.copy()
    col_map = {}
    existing_cols = {c.lower().replace("_", "").replace(" ", ""): c for c in df.columns}
    
    for std in FACT_TRADES_COLUMNS:
        std_key = std.lower().replace("_", "").replace(" ", "")
        if std_key in existing_cols:
            col_map[existing_cols[std_key]] = std
            
    df.rename(columns=col_map, inplace=True)
    return df


def normalize_columns(df: pd.DataFrame, standard_cols: List[str]) -> pd.DataFrame:
    """Renames mixed-case, spaced, or synonymous column headers to standard PascalCase columns."""
    df = df.copy()
    col_map = {}
    existing_cols = {c.lower().replace("_", "").replace(" ", ""): c for c in df.columns}
    
    for std in standard_cols:
        std_key = std.lower().replace("_", "").replace(" ", "")
        if std_key in existing_cols:
            col_map[existing_cols[std_key]] = std
        else:
            rules = MAPPING_RULES.get(std, [])
            for rule in rules:
                rule_key = rule.lower().replace("_", "").replace(" ", "")
                if rule_key in existing_cols:
                    col_map[existing_cols[rule_key]] = std
                    break
                    
    df.rename(columns=col_map, inplace=True)
    return df


def clean_historical_data(df: pd.DataFrame) -> pd.DataFrame:
    """Sanitizes pricing archives by sorting, dropping NaNs/duplicates, and filling missing bounds."""
    df = normalize_columns(df, ["Ticker", "Date", "Open", "High", "Low", "Close", "Volume"])
    required = ["Ticker", "Date", "Open", "High", "Low", "Close", "Volume"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Historical price data is missing required columns: {missing}")
        
    df["Date"] = pd.to_datetime(df["Date"])
    # Drop rows with critical NaN values
    df = df.dropna(subset=["Ticker", "Date", "Close", "Volume"])
    
    # Graceful boundaries imputation
    df["Open"] = df["Open"].fillna(df["Close"])
    df["High"] = df["High"].fillna(df["Close"])
    df["Low"] = df["Low"].fillna(df["Close"])
    
    df = df.sort_values(["Ticker", "Date"])
    df = df.drop_duplicates(subset=["Ticker", "Date"], keep="last")
    
    # Enforce non-negative values
    df = df[(df["Close"] >= 0) & (df["Volume"] >= 0)]
    return df


def clean_bands_data(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_columns(df, ["Ticker", "BandPercent"])
    required = ["Ticker", "BandPercent"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Bands data is missing required columns: {missing}")
    df = df.dropna(subset=["Ticker", "BandPercent"])
    return df


def clean_shareholding_data(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_columns(df, ["Ticker", "UniquePANs", "PromoterPercent", "Top1PercentShare"])
    required = ["Ticker", "UniquePANs", "PromoterPercent", "Top1PercentShare"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Shareholding data is missing required columns: {missing}")
    df = df.dropna(subset=["Ticker"])
    return df


def clean_announcements_data(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_columns(df, ["Ticker", "Date", "Details"])
    required = ["Ticker", "Date", "Details"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Announcements data is missing required columns: {missing}")
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.dropna(subset=["Ticker", "Date"])
    return df


# ----------------------------------------------------------------------
# Core Data Container Structs
# ----------------------------------------------------------------------

@dataclass
class SurveillanceConfig:
    """Configuration weights and lookup parameters for the Surveillance Engine."""
    weights: Dict[str, float] = field(default_factory=lambda: {
        "price_rise": 25.0,
        "price_z": 20.0,
        "volume_z": 25.0,
        "band_persistence": 15.0,
        "new_high": 15.0,
    })
    default_band_percent: float = 0.20
    lookback_days: int = 180
    recent_days: int = 15
    threshold: float = 15.0


@dataclass
class MarketMetricsResult:
    """Surveillance results for a single scrip's core market indicators."""
    ticker: str
    price_rise_pct: float
    price_rise_score: int
    price_z: float
    price_z_score: int
    volume_z: float
    volume_z_score: int
    band_hit_days: int
    band_score: int
    new_high_days: int
    new_high_score: int
    final_score: float

    def as_dict(self) -> Dict[str, Any]:
        return {
            "Ticker": self.ticker,
            "Price Rise %": round(self.price_rise_pct, 2),
            "Price Rise Score": self.price_rise_score,
            "Price Z": round(self.price_z, 2),
            "Price Z Score": self.price_z_score,
            "Volume Z": round(self.volume_z, 2),
            "Volume Z Score": self.volume_z_score,
            "Band Hit Days (15d)": self.band_hit_days,
            "Band Score": self.band_score,
            "180d New Highs (15d)": self.new_high_days,
            "New High Score": self.new_high_score,
            "Final Score": round(self.final_score, 2),
        }


@dataclass
class ParticipantAuditResult:
    """Participant trade audit findings including price impact and PnL."""
    ltp_contributors: List[Dict[str, Any]] = field(default_factory=list)
    volume_share: List[Dict[str, Any]] = field(default_factory=list)
    counterparty_pairs: List[Dict[str, Any]] = field(default_factory=list)
    profit_makers: List[Dict[str, Any]] = field(default_factory=list)
    reversal_pairs: List[Dict[str, Any]] = field(default_factory=list)
    circular_loops: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class FactTradesAuditResult:
    """Advanced exchange trade compliance findings (FACT_TRADES)."""
    same_broker_wash_count: int = 0
    same_broker_wash_volume: float = 0.0
    diff_broker_wash_count: int = 0
    diff_broker_wash_volume: float = 0.0
    self_trade_count: int = 0
    self_trade_volume: float = 0.0
    
    algo_buy_count: int = 0
    algo_buy_pct: float = 0.0
    algo_sell_count: int = 0
    algo_sell_pct: float = 0.0
    dma_buy_count: int = 0
    dma_buy_pct: float = 0.0
    dma_sell_count: int = 0
    dma_sell_pct: float = 0.0
    internet_buy_count: int = 0
    internet_buy_pct: float = 0.0
    internet_sell_count: int = 0
    internet_sell_pct: float = 0.0
    
    avg_bid_ask_spread: float = 0.0
    avg_buy_sell_diff_time_sec: float = 0.0
    avg_buy_sell_diff_price: float = 0.0
    avg_buy_sell_diff_qty: float = 0.0
    
    avg_bid_pdg_qty: float = 0.0
    avg_ask_pdg_qty: float = 0.0
    avg_bid_pdg_val: float = 0.0
    avg_ask_pdg_val: float = 0.0
    
    avg_order_imbalance: float = 0.0
    top_otr_contributors: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class ScripSurveillanceReport:
    """Full integrated compliance report for a stock."""
    ticker: str
    market_metrics: MarketMetricsResult
    participant_audit: ParticipantAuditResult
    shareholding: Dict[str, Any] = field(default_factory=dict)
    announcements: List[Dict[str, Any]] = field(default_factory=list)
    market_summary: Dict[str, Any] = field(default_factory=dict)
    watchlist: bool = False
    fact_trades_audit: Optional[FactTradesAuditResult] = None


# ----------------------------------------------------------------------
# Core Surveillance Engine Implementation
# ----------------------------------------------------------------------

class SurveillanceEngine:
    """Engine executing core market analytics and participant audits."""

    def __init__(self, config: Optional[SurveillanceConfig] = None):
        self.config = config or SurveillanceConfig()

    def score_price_rise(self, pct: float) -> int:
        if pct < 15:
            return 0
        if pct <= 75:
            return 1
        if pct <= 150:
            return 3
        return 5

    def score_zscore(self, z: float) -> int:
        if z >= 3.09:
            return 5
        if z >= 2.33:
            return 3
        if z >= 1.645:
            return 1
        return 0

    def score_band_persistence(self, days: int) -> int:
        if days >= 10:
            return 5
        if days >= 6:
            return 3
        if days >= 3:
            return 1
        return 0

    def score_new_high(self, days: int) -> int:
        # 0 days = 0, 1-4 days = 1, 5-9 days = 3, 10+ days = 5
        if days >= 10:
            return 5
        if days >= 5:
            return 3
        if days >= 1:
            return 1
        return 0

    def calculate_core_metrics(self, ticker: str, df: pd.DataFrame, band_percent: Optional[float] = None) -> MarketMetricsResult:
        """Calculate the 5 core PV metrics according to Section 2."""
        lookback = self.config.lookback_days
        recent = self.config.recent_days
        required_len = lookback + recent + 1
        if len(df) < required_len:
            raise ValueError(
                f"Only {len(df)} trading days available, need at least {required_len} days for 180d lookback analysis"
            )

        # Impute or estimate band_percent
        if band_percent is None:
            # Dynamic upper price band inference: 99th percentile of historical upward daily moves
            prev_close_all = df["Close"].shift(1)
            high_pct_all = (df["High"] - prev_close_all) / prev_close_all
            p99 = high_pct_all.dropna().quantile(0.99)
            
            # Map to standard upper circuit bands: 2%, 5%, 10%, 20%
            if p99 <= 0.03:
                band_percent = 0.02
            elif p99 <= 0.075:
                band_percent = 0.05
            elif p99 <= 0.15:
                band_percent = 0.10
            else:
                band_percent = 0.20
        else:
            if band_percent > 1.0:
                band_percent /= 100.0

        close = df["Close"]
        volume = df["Volume"]
        high = df["High"]
        low = df["Low"]

        # --- 2.1 Price Rise ---
        # highest price (High) in last 15 days vs closing price at T-180
        last15_high = high.iloc[-recent:].max()
        close_t180 = float(close.iloc[-(lookback + 1)])
        safe_close_t180 = max(close_t180, 1e-4) if close_t180 != 0 else 1e-4
        price_rise_pct = ((last15_high - close_t180) / safe_close_t180) * 100
        price_rise_score = self.score_price_rise(price_rise_pct)

        # Helper rolling calculators
        def rolling_mean_pct_change(c: pd.Series) -> pd.Series:
            return (c.pct_change(fill_method=None) * 100).rolling(recent).mean()

        def rolling_mean_volume(v: pd.Series) -> pd.Series:
            return v.rolling(recent).mean()

        def zscore_latest(series: pd.Series) -> float:
            series_clean = series.dropna()
            if len(series_clean) < lookback + 1:
                return 0.0
            latest = series_clean.iloc[-1]
            background = series_clean.iloc[-(lookback + 1):-1]
            mu = background.mean()
            sigma = background.std()
            if sigma < 1e-6 or np.isnan(sigma):
                return 0.0
            return float((latest - mu) / sigma)
        # --- 2.2 Price Z-Score ---
        price_roll = close.rolling(recent).mean()
        price_z = zscore_latest(price_roll)
        price_z_score = self.score_zscore(price_z)

        # --- 2.3 Volume Z-Score ---
        vol_roll = rolling_mean_volume(volume)
        volume_z = zscore_latest(vol_roll)
        volume_z_score = self.score_zscore(volume_z)

        # --- 2.4 Price Band Persistence (Upper Circuit Only) ---
        # Checks if the daily High reached >= 90% of the upper circuit limit.
        # Per PVASF spec (confirmed): only upper circuit hits are counted.
        prev_close = close.shift(1).replace(0, np.nan).fillna(1e-4)
        high_pct = (high - prev_close) / prev_close
        band_hit_days = int((high_pct.iloc[-recent:] >= 0.90 * band_percent).sum())
        band_score = self.score_band_persistence(band_hit_days)

        # --- 2.5 180-Day New High Breakout ---
        rolling_180_high_prev = high.shift(1).rolling(lookback).max()
        is_new_high = high > rolling_180_high_prev
        new_high_days = int(is_new_high.iloc[-recent:].sum())
        new_high_score = self.score_new_high(new_high_days)

        # --- Section 3: Weighted Final Score (0.0 to 100.0) ---
        w = self.config.weights
        final_score = round(sum((w.get(key, 0.0) * score) / 5.0 for key, score in {
            "price_rise": price_rise_score,
            "price_z": price_z_score,
            "volume_z": volume_z_score,
            "band_persistence": band_score,
            "new_high": new_high_score,
        }.items()), 2)

        return MarketMetricsResult(
            ticker=ticker,
            price_rise_pct=price_rise_pct,
            price_rise_score=price_rise_score,
            price_z=price_z,
            price_z_score=price_z_score,
            volume_z=volume_z,
            volume_z_score=volume_z_score,
            band_hit_days=band_hit_days,
            band_score=band_score,
            new_high_days=new_high_days,
            new_high_score=new_high_score,
            final_score=final_score
        )

    def analyze_participants(self, ticker: str, trades_df: pd.DataFrame, final_close: float, total_exchange_vol: float) -> ParticipantAuditResult:
        """Perform participant trade audits including LTP contribution, volume concentration, and PnL."""
        if trades_df.empty or ticker not in trades_df["Ticker"].values:
            return ParticipantAuditResult()

        df = trades_df[trades_df["Ticker"] == ticker].copy()
        
        # Ensure all required columns exist
        for col in ["BuyVolume", "SellVolume", "BuyValue", "SellValue", "LTPContribution", "CounterpartyPAN"]:
            if col not in df.columns:
                if col == "CounterpartyPAN":
                    df[col] = "UNKNOWN"
                else:
                    df[col] = 0.0

        # --- 4.1 LTP Contribution ---
        ltp_group = df.groupby("PAN")["LTPContribution"].sum().reset_index()
        ltp_group["AbsLTPContribution"] = ltp_group["LTPContribution"].abs()
        top_ltp = ltp_group.sort_values("AbsLTPContribution", ascending=False).head(5).to_dict("records")
        for r in top_ltp:
            r.pop("AbsLTPContribution", None)

        # --- 4.2 Volume Share ---
        df["PANVolume"] = df["BuyVolume"] + df["SellVolume"]
        vol_group = df.groupby("PAN")["PANVolume"].sum().reset_index()
        vol_group["VolumeSharePercent"] = (vol_group["PANVolume"] / max(1.0, total_exchange_vol)) * 100
        top_vol = vol_group.sort_values("VolumeSharePercent", ascending=False).head(5).to_dict("records")

        # --- 4.3 Counterparty Concentration ---
        pair_records = []
        for _, r in df.iterrows():
            p1, p2 = sorted([r["PAN"], r["CounterpartyPAN"]])
            pair_records.append({
                "Pair": f"{p1} <-> {p2}",
                "Volume": r["BuyVolume"] + r["SellVolume"]
            })
        
        pair_df = pd.DataFrame(pair_records)
        if not pair_df.empty:
            pair_group = pair_df.groupby("Pair")["Volume"].sum().reset_index()
            pair_group["SharePercent"] = (pair_group["Volume"] / max(1.0, total_exchange_vol)) * 100
            top_pairs = pair_group.sort_values("SharePercent", ascending=False).head(5).to_dict("records")
        else:
            top_pairs = []

        # --- 4.4 Trade Reversal Ratio (RTR) ---
        df_filtered = df[(df["PAN"] != "UNKNOWN") & (df["CounterpartyPAN"] != "UNKNOWN") & (df["PAN"] != df["CounterpartyPAN"])]
        flow_df = df_filtered.groupby(["PAN", "CounterpartyPAN"])["BuyVolume"].sum().reset_index()
        flows = {(r["PAN"], r["CounterpartyPAN"]): r["BuyVolume"] for _, r in flow_df.iterrows()}
        
        undir_pairs = set()
        for A, B in flows.keys():
            p1, p2 = sorted([A, B])
            undir_pairs.add((p1, p2))
            
        reversal_list = []
        for A, B in undir_pairs:
            v_a_b = flows.get((A, B), 0.0)
            v_b_a = flows.get((B, A), 0.0)
            gross = v_a_b + v_b_a
            if gross > 0:
                rtr = (2.0 * min(v_a_b, v_b_a) / gross) * 100.0
                reversal_list.append({
                    "Pair": f"{A} <-> {B}",
                    "GrossVolume": float(gross),
                    "ReversalRatio": round(rtr, 2)
                })
        top_reversals = sorted(reversal_list, key=lambda x: x["ReversalRatio"], reverse=True)[:5]

        # --- 4.5 Circular Trade Loops Detection ---
        adj = {}
        for (A, B), vol in flows.items():
            if vol > 0:
                if A not in adj:
                    adj[A] = set()
                adj[A].add(B)

        detected_loops = []
        
        def find_cycles(start_node):
            path = [start_node]
            visited = {start_node}
            
            def backtrack(u):
                if len(path) > 5:
                    return
                if u in adj:
                    for v in adj[u]:
                        if v == start_node:
                            if len(path) >= 3:
                                min_idx = path.index(min(path))
                                normalized_cycle = path[min_idx:] + path[:min_idx]
                                if normalized_cycle not in detected_loops:
                                    detected_loops.append(normalized_cycle)
                        elif v not in visited:
                            visited.add(v)
                            path.append(v)
                            backtrack(v)
                            path.pop()
                            visited.remove(v)
            backtrack(start_node)

        for node in adj.keys():
            find_cycles(node)
            
        loop_results = []
        for cycle in detected_loops:
            edges = list(zip(cycle, cycle[1:] + [cycle[0]]))
            edge_vols = [flows.get(edge, 0.0) for edge in edges]
            bottleneck_vol = min(edge_vols)
            gross_vol = sum(edge_vols)
            loop_results.append({
                "Cycle": " -> ".join(str(node) for node in cycle) + f" -> {cycle[0]}",
                "Length": len(cycle),
                "RotatedVolume": float(bottleneck_vol),
                "GrossVolume": float(gross_vol)
            })
        top_loops = sorted(loop_results, key=lambda x: x["RotatedVolume"], reverse=True)[:5]

        # --- Profit-Makers (PnL Analysis) ---
        pnl_df = df.groupby("PAN").agg({
            "BuyVolume": "sum",
            "SellVolume": "sum",
            "BuyValue": "sum",
            "SellValue": "sum"
        }).reset_index()

        pnl_records = []
        for _, row in pnl_df.iterrows():
            net_pos = row["BuyVolume"] - row["SellVolume"]
            pnl = row["SellValue"] - row["BuyValue"] + (net_pos * final_close)
            pnl_records.append({
                "PAN": row["PAN"],
                "BuyVolume": int(row["BuyVolume"]),
                "SellVolume": int(row["SellVolume"]),
                "NetPnL": round(pnl, 2)
            })

        top_profit = sorted(pnl_records, key=lambda x: x["NetPnL"], reverse=True)[:5]

        return ParticipantAuditResult(
            ltp_contributors=top_ltp,
            volume_share=top_vol,
            counterparty_pairs=top_pairs,
            profit_makers=top_profit,
            reversal_pairs=top_reversals,
            circular_loops=top_loops
        )

    def transform_fact_trades_to_client_trades(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transforms a FACT_TRADES format DataFrame to client-centric transaction log."""
        df_sorted = df.sort_values(["Ftrd_Symbol" if "Ftrd_Symbol" in df.columns else "Ticker", 
                                    "Ftrd_Trd_Tmst" if "Ftrd_Trd_Tmst" in df.columns else ("Ftrd_Trd_Date" if "Ftrd_Trd_Date" in df.columns else "Date")])
        
        ticker_col = "Ftrd_Symbol" if "Ftrd_Symbol" in df_sorted.columns else (
            "Ticker" if "Ticker" in df_sorted.columns else (
                "Ftrd_Trd_Prd_Token" if "Ftrd_Trd_Prd_Token" in df_sorted.columns else "Ftrd_Cmp_Token"
            )
        )
        date_col = "Ftrd_Trd_Date" if "Ftrd_Trd_Date" in df_sorted.columns else (
            "Date" if "Date" in df_sorted.columns else "Ftrd_Trd_Tmst"
        )
        
        if "Ftrd_Last_Trd_Price" in df_sorted.columns:
            last_price = df_sorted["Ftrd_Last_Trd_Price"].fillna(df_sorted["Ftrd_Trd_Price"])
        else:
            last_price = df_sorted.groupby(ticker_col)["Ftrd_Trd_Price"].shift(1).fillna(df_sorted["Ftrd_Trd_Price"])
            
        price_impact = df_sorted["Ftrd_Trd_Price"] - last_price
        
        init_col = "Ftrd_Init_Clnt_Token" if "Ftrd_Init_Clnt_Token" in df_sorted.columns else None
        
        # Buy Side
        buy_ltp = np.where(
            df_sorted[init_col] == df_sorted["Ftrd_Buy_Exch_Clnt_Token"] if init_col else True,
            price_impact,
            0.0
        )
        buy_df = pd.DataFrame({
            "Ticker": df_sorted[ticker_col],
            "Date": df_sorted[date_col],
            "PAN": df_sorted["Ftrd_Buy_Exch_Clnt_Token"],
            "CounterpartyPAN": df_sorted["Ftrd_Sell_Exch_Clnt_Token"].fillna("UNKNOWN"),
            "BuyVolume": df_sorted["Ftrd_Trd_Qty"],
            "SellVolume": 0.0,
            "BuyValue": df_sorted["Ftrd_Trd_Val"] if "Ftrd_Trd_Val" in df_sorted.columns else (df_sorted["Ftrd_Trd_Qty"] * df_sorted["Ftrd_Trd_Price"]),
            "SellValue": 0.0,
            "PosLTPContribution": np.where(buy_ltp > 0, buy_ltp, 0.0),
            "NegLTPContribution": np.where(buy_ltp < 0, np.abs(buy_ltp), 0.0),
            "LTPContribution": buy_ltp
        })
        
        # Sell Side
        sell_ltp = np.where(
            df_sorted[init_col] == df_sorted["Ftrd_Sell_Exch_Clnt_Token"] if init_col else False,
            price_impact,
            0.0
        )
        sell_df = pd.DataFrame({
            "Ticker": df_sorted[ticker_col],
            "Date": df_sorted[date_col],
            "PAN": df_sorted["Ftrd_Sell_Exch_Clnt_Token"],
            "CounterpartyPAN": df_sorted["Ftrd_Buy_Exch_Clnt_Token"].fillna("UNKNOWN"),
            "BuyVolume": 0.0,
            "SellVolume": df_sorted["Ftrd_Trd_Qty"],
            "BuyValue": 0.0,
            "SellValue": df_sorted["Ftrd_Trd_Val"] if "Ftrd_Trd_Val" in df_sorted.columns else (df_sorted["Ftrd_Trd_Qty"] * df_sorted["Ftrd_Trd_Price"]),
            "PosLTPContribution": np.where(sell_ltp > 0, sell_ltp, 0.0),
            "NegLTPContribution": np.where(sell_ltp < 0, np.abs(sell_ltp), 0.0),
            "LTPContribution": sell_ltp
        })
        
        combined = pd.concat([buy_df, sell_df], ignore_index=True)
        
        grouped = combined.groupby(["Ticker", "Date", "PAN", "CounterpartyPAN"], as_index=False).agg({
            "BuyVolume": "sum",
            "SellVolume": "sum",
            "BuyValue": "sum",
            "SellValue": "sum",
            "PosLTPContribution": "sum",
            "NegLTPContribution": "sum",
            "LTPContribution": "sum"
        })
        return grouped

    def analyze_fact_trades(self, ticker: str, df_ft: pd.DataFrame) -> FactTradesAuditResult:
        """Perform advanced exchange-level compliance audits on FACT_TRADES data."""
        if df_ft.empty or ticker not in df_ft["Ftrd_Symbol" if "Ftrd_Symbol" in df_ft.columns else "Ticker"].values:
            return FactTradesAuditResult()

        ticker_col = "Ftrd_Symbol" if "Ftrd_Symbol" in df_ft.columns else "Ticker"
        df = df_ft[df_ft[ticker_col] == ticker].copy()
        total_trades = len(df)
        if total_trades == 0:
            return FactTradesAuditResult()

        # Helper algorithms for parsing flags
        def parse_algo_flag(series: pd.Series) -> pd.Series:
            def check_val(val):
                if pd.isna(val):
                    return False
                val_str = str(val).split('.')[0].strip()
                if len(val_str) >= 13:
                    # NSE / MCX: 13th digit (index 12) is '0'
                    return val_str[12] == '0'
                if val_str in ['1', '3', 'Y', 'YES', 'true', 'TRUE', '1.0']:
                    return True
                return False
            return series.apply(check_val)

        def parse_inet_dma_flag(series: pd.Series) -> Tuple[pd.Series, pd.Series]:
            is_inet = []
            is_dma = []
            for val in series:
                if pd.isna(val):
                    is_inet.append(False)
                    is_dma.append(False)
                    continue
                val_str = str(val).split('.')[0].strip()
                if len(val_str) >= 12:
                    if val_str[:12] == '1' * 12:
                        is_inet.append(True)
                        is_dma.append(False)
                    elif val_str[:12] == '2' * 12:
                        is_inet.append(False)
                        is_dma.append(True)
                    elif len(val_str) >= 14 and val_str[13] in ['1', '2']:
                        is_inet.append(False)
                        is_dma.append(True)
                    else:
                        if all(c == '1' for c in val_str):
                            is_inet.append(True)
                            is_dma.append(False)
                        else:
                            is_inet.append(False)
                            is_dma.append(False)
                else:
                    if val_str in ['1', 'I', 'INET', 'INTERNET', '1.0']:
                        is_inet.append(True)
                        is_dma.append(False)
                    elif val_str in ['2', 'D', 'DMA', '2.0']:
                        is_inet.append(False)
                        is_dma.append(True)
                    else:
                        is_inet.append(False)
                        is_dma.append(False)
            return pd.Series(is_inet, index=series.index), pd.Series(is_dma, index=series.index)

        def parse_diff_time(val):
            if pd.isna(val):
                return 0.0
            if isinstance(val, (int, float)):
                return float(val)
            s = str(val).strip()
            try:
                td = pd.to_timedelta(s)
                return td.total_seconds()
            except Exception:
                try:
                    return float(s)
                except ValueError:
                    return 0.0

        # Wash Trade Audits
        def get_series(col_name, default_val=np.nan):
            if col_name in df.columns:
                return df[col_name]
            return pd.Series([default_val] * total_trades, index=df.index)

        same_broker_flag = get_series("Ftrd_Same_Broker_Wash_Flag", 0)
        buy_tm = get_series("Ftrd_Buy_Exch_TM_Token", -1)
        sell_tm = get_series("Ftrd_Sell_Exch_TM_Token", -2)
        buy_clnt = get_series("Ftrd_Buy_Exch_Clnt_Token", -3)
        sell_clnt = get_series("Ftrd_Sell_Exch_Clnt_Token", -4)
        qty = get_series("Ftrd_Trd_Qty", 0.0)

        same_broker = (same_broker_flag.fillna(0) == 1) | (
            (buy_tm.fillna(-1) == sell_tm.fillna(-2)) &
            (buy_clnt.fillna(-3) == sell_clnt.fillna(-4))
        )
        same_broker_wash_count = int(same_broker.sum())
        same_broker_wash_volume = float(qty.loc[same_broker].sum())

        diff_broker_flag = get_series("Ftrd_Diff_Broker_Wash_Flag", 0)
        diff_broker = (diff_broker_flag.fillna(0) == 1)
        diff_broker_wash_count = int(diff_broker.sum())
        diff_broker_wash_volume = float(qty.loc[diff_broker].sum())

        self_trade = (buy_clnt.fillna(-3) == sell_clnt.fillna(-4))
        self_trade_count = int(self_trade.sum())
        self_trade_volume = float(qty.loc[self_trade].sum())

        # Order Execution & Channel Distribution
        algo_buy = parse_algo_flag(get_series("Ftrd_Buy_CTCL_Algo_Flag", "111111111111111"))
        algo_sell = parse_algo_flag(get_series("Ftrd_Sell_CTCL_Algo_Flag", "111111111111111"))
        inet_buy, dma_buy = parse_inet_dma_flag(get_series("Ftrd_Buy_CTCL_Inet_DMA_Flag", ""))
        inet_sell, dma_sell = parse_inet_dma_flag(get_series("Ftrd_Sell_CTCL_Inet_DMA_Flag", ""))

        algo_buy_count = int(algo_buy.sum())
        algo_buy_pct = (algo_buy_count / total_trades) * 100.0
        algo_sell_count = int(algo_sell.sum())
        algo_sell_pct = (algo_sell_count / total_trades) * 100.0

        dma_buy_count = int(dma_buy.sum())
        dma_buy_pct = (dma_buy_count / total_trades) * 100.0
        dma_sell_count = int(dma_sell.sum())
        dma_sell_pct = (dma_sell_count / total_trades) * 100.0

        internet_buy_count = int(inet_buy.sum())
        internet_buy_pct = (internet_buy_count / total_trades) * 100.0
        internet_sell_count = int(inet_sell.sum())
        internet_sell_pct = (internet_sell_count / total_trades) * 100.0

        # Order Book Quality & Bid-Ask Spread Statistics
        spread = get_series("Ftrd_Best_Ask_Price") - get_series("Ftrd_Best_Bid_Price")
        avg_bid_ask_spread = float(spread.dropna().mean()) if not spread.dropna().empty else 0.0

        avg_bid_pdg_qty = float(get_series("Ftrd_Bid_Pdg_Ord_Qty").dropna().mean()) if not get_series("Ftrd_Bid_Pdg_Ord_Qty").dropna().empty else 0.0
        avg_ask_pdg_qty = float(get_series("Ftrd_Ask_Pdg_Ord_Qty").dropna().mean()) if not get_series("Ftrd_Ask_Pdg_Ord_Qty").dropna().empty else 0.0
        avg_bid_pdg_val = float(get_series("Ftrd_Bid_Pdg_Ord_Val").dropna().mean()) if not get_series("Ftrd_Bid_Pdg_Ord_Val").dropna().empty else 0.0
        avg_ask_pdg_val = float(get_series("Ftrd_Ask_Pdg_Ord_Val").dropna().mean()) if not get_series("Ftrd_Ask_Pdg_Ord_Val").dropna().empty else 0.0

        # Order Match Statistics
        avg_buy_sell_diff_time_sec = float(get_series("Ftrd_Buy_Sell_Diff_Time").apply(parse_diff_time).dropna().mean()) if not get_series("Ftrd_Buy_Sell_Diff_Time").apply(parse_diff_time).dropna().empty else 0.0
        avg_buy_sell_diff_price = float(get_series("Ftrd_Buy_Sell_Diff_Price").dropna().mean()) if not get_series("Ftrd_Buy_Sell_Diff_Price").dropna().empty else 0.0
        avg_buy_sell_diff_qty = float(get_series("Ftrd_Buy_Sell_Diff_Qty").dropna().mean()) if not get_series("Ftrd_Buy_Sell_Diff_Qty").dropna().empty else 0.0

        # Spoofing & OTR (Order-to-Trade Ratio) Audits
        top_otr = []
        avg_order_imbalance = 0.0
        
        buy_ord_qty_col = "Ftrd_Buy_Ord_Qty" if "Ftrd_Buy_Ord_Qty" in df.columns else None
        sell_ord_qty_col = "Ftrd_Sell_Ord_Qty" if "Ftrd_Sell_Ord_Qty" in df.columns else None
        
        if buy_ord_qty_col and sell_ord_qty_col:
            buy_orders = df.copy()
            if "Ftrd_Buy_Ord_Num" in buy_orders.columns:
                buy_orders_unique = buy_orders.drop_duplicates(subset=["Ftrd_Buy_Ord_Num"])
            else:
                buy_orders_unique = buy_orders
                
            sell_orders = df.copy()
            if "Ftrd_Sell_Ord_Num" in sell_orders.columns:
                sell_orders_unique = sell_orders.drop_duplicates(subset=["Ftrd_Sell_Ord_Num"])
            else:
                sell_orders_unique = sell_orders
                
            buy_ord_sum = buy_orders_unique.groupby("Ftrd_Buy_Exch_Clnt_Token")["Ftrd_Buy_Ord_Qty"].sum().reset_index()
            buy_ord_sum.columns = ["PAN", "OrderQty"]
            
            sell_ord_sum = sell_orders_unique.groupby("Ftrd_Sell_Exch_Clnt_Token")["Ftrd_Sell_Ord_Qty"].sum().reset_index()
            sell_ord_sum.columns = ["PAN", "OrderQty"]
            
            total_ord = pd.concat([buy_ord_sum, sell_ord_sum]).groupby("PAN")["OrderQty"].sum().reset_index()
            
            buy_exec = df.groupby("Ftrd_Buy_Exch_Clnt_Token")["Ftrd_Trd_Qty"].sum().reset_index()
            buy_exec.columns = ["PAN", "ExecQty"]
            
            sell_exec = df.groupby("Ftrd_Sell_Exch_Clnt_Token")["Ftrd_Trd_Qty"].sum().reset_index()
            sell_exec.columns = ["PAN", "ExecQty"]
            
            total_exec = pd.concat([buy_exec, sell_exec]).groupby("PAN")["ExecQty"].sum().reset_index()
            
            otr_df = pd.merge(total_ord, total_exec, on="PAN", how="outer").fillna(0.0)
            otr_df["OTR"] = otr_df["OrderQty"] / otr_df["ExecQty"].replace(0, 1.0)
            
            top_otr = otr_df[otr_df["OrderQty"] > 0].sort_values("OTR", ascending=False).head(5).to_dict("records")
            for r in top_otr:
                r["OrderQty"] = float(r["OrderQty"])
                r["ExecQty"] = float(r["ExecQty"])
                r["OTR"] = float(r["OTR"])

            # Order Book Imbalance (OBI)
            total_buy_ord_qty = buy_orders_unique["Ftrd_Buy_Ord_Qty"].sum()
            total_sell_ord_qty = sell_orders_unique["Ftrd_Sell_Ord_Qty"].sum()
            denom = total_buy_ord_qty + total_sell_ord_qty
            avg_order_imbalance = float((total_buy_ord_qty - total_sell_ord_qty) / denom if denom > 0 else 0.0)

        return FactTradesAuditResult(
            same_broker_wash_count=same_broker_wash_count,
            same_broker_wash_volume=same_broker_wash_volume,
            diff_broker_wash_count=diff_broker_wash_count,
            diff_broker_wash_volume=diff_broker_wash_volume,
            self_trade_count=self_trade_count,
            self_trade_volume=self_trade_volume,
            algo_buy_count=algo_buy_count,
            algo_buy_pct=round(algo_buy_pct, 2),
            algo_sell_count=algo_sell_count,
            algo_sell_pct=round(algo_sell_pct, 2),
            dma_buy_count=dma_buy_count,
            dma_buy_pct=round(dma_buy_pct, 2),
            dma_sell_count=dma_sell_count,
            dma_sell_pct=round(dma_sell_pct, 2),
            internet_buy_count=internet_buy_count,
            internet_buy_pct=round(internet_buy_pct, 2),
            internet_sell_count=internet_sell_count,
            internet_sell_pct=round(internet_sell_pct, 2),
            avg_bid_ask_spread=round(avg_bid_ask_spread, 4),
            avg_buy_sell_diff_time_sec=round(avg_buy_sell_diff_time_sec, 4),
            avg_buy_sell_diff_price=round(avg_buy_sell_diff_price, 4),
            avg_buy_sell_diff_qty=round(avg_buy_sell_diff_qty, 4),
            avg_bid_pdg_qty=round(avg_bid_pdg_qty, 2),
            avg_ask_pdg_qty=round(avg_ask_pdg_qty, 2),
            avg_bid_pdg_val=round(avg_bid_pdg_val, 2),
            avg_ask_pdg_val=round(avg_ask_pdg_val, 2),
            avg_order_imbalance=round(avg_order_imbalance, 4),
            top_otr_contributors=top_otr
        )

    def run_pipeline(
        self,
        historical_df: pd.DataFrame,
        bands_df: Optional[pd.DataFrame] = None,
        trades_df: Optional[pd.DataFrame] = None,
        shareholding_df: Optional[pd.DataFrame] = None,
        announcements_df: Optional[pd.DataFrame] = None
    ) -> List[ScripSurveillanceReport]:
        """Runs the complete surveillance engine end-to-end on dataframes in memory."""
        # 1. Clean and validate historical data
        historical_df = clean_historical_data(historical_df)
        tickers = historical_df["Ticker"].unique().tolist()

        # 2. Clean and validate bands
        bands_dict = {}
        if bands_df is not None and not bands_df.empty:
            df_b = clean_bands_data(bands_df)
            bands_dict = dict(zip(df_b["Ticker"], df_b["BandPercent"]))

        # 3. Clean and validate shareholder pattern
        sh_df = pd.DataFrame()
        if shareholding_df is not None and not shareholding_df.empty:
            sh_df = clean_shareholding_data(shareholding_df)

        # 4. Clean and validate announcements
        ann_df = pd.DataFrame()
        if announcements_df is not None and not announcements_df.empty:
            ann_df = clean_announcements_data(announcements_df)

        # 5. Clean, sanitize and estimate trades data
        trades_df_clean = pd.DataFrame()
        fact_trades_df_clean = pd.DataFrame()
        is_fact_trades = False

        if trades_df is not None and not trades_df.empty:
            temp_ft_df = normalize_fact_trades_columns(trades_df)
            if "Ftrd_Buy_Exch_Clnt_Token" in temp_ft_df.columns:
                is_fact_trades = True
                trades_df = temp_ft_df
                date_col = "Ftrd_Trd_Date" if "Ftrd_Trd_Date" in trades_df.columns else (
                    "Date" if "Date" in trades_df.columns else "Ftrd_Trd_Tmst"
                )
                trades_df[date_col] = pd.to_datetime(trades_df[date_col])
                fact_trades_df_clean = trades_df
                trades_df_clean = self.transform_fact_trades_to_client_trades(trades_df)
            else:
                trades_df = normalize_columns(trades_df, ["Ticker", "Date", "PAN", "CounterpartyPAN", "BuyVolume", "SellVolume", "BuyValue", "SellValue", "LTPContribution"])
                req = ["Ticker", "Date", "PAN", "BuyVolume", "SellVolume"]
                missing_req = [c for c in req if c not in trades_df.columns]
                if missing_req:
                    print(f"[warning] Trade logs missing required columns {missing_req}. Skipping trade audits.", file=sys.stderr)
                else:
                    trades_df["Date"] = pd.to_datetime(trades_df["Date"])
                    trades_df = trades_df.dropna(subset=["Ticker", "Date", "PAN"])
                    
                    # Default missing counterparty
                    if "CounterpartyPAN" not in trades_df.columns:
                        trades_df["CounterpartyPAN"] = "UNKNOWN"
                    else:
                        trades_df["CounterpartyPAN"] = trades_df["CounterpartyPAN"].fillna("UNKNOWN")
                        
                    # Merge with historical to estimate missing values
                    df_m = pd.merge(trades_df, historical_df[["Ticker", "Date", "Open", "High", "Low", "Close", "Volume"]], on=["Ticker", "Date"], how="left")
                    
                    # Fill missing BuyValue / SellValue
                    if "BuyValue" not in trades_df.columns:
                        trades_df["BuyValue"] = trades_df["BuyVolume"] * df_m["Close"].fillna(0.0)
                    else:
                        trades_df["BuyValue"] = trades_df["BuyValue"].fillna(trades_df["BuyVolume"] * df_m["Close"].fillna(0.0))
                        
                    if "SellValue" not in trades_df.columns:
                        trades_df["SellValue"] = trades_df["SellVolume"] * df_m["Close"].fillna(0.0)
                    else:
                        trades_df["SellValue"] = trades_df["SellValue"].fillna(trades_df["SellVolume"] * df_m["Close"].fillna(0.0))
                        
                    # Fill missing LTPContribution (Estimator fallback)
                    if "LTPContribution" not in trades_df.columns:
                        net_vol = trades_df["BuyVolume"] - trades_df["SellVolume"]
                        price_change = df_m["Close"] - df_m["Open"]
                        trades_df["LTPContribution"] = (net_vol / df_m["Volume"].fillna(1.0).replace(0, 1.0)) * price_change.fillna(0.0)
                    else:
                        net_vol = trades_df["BuyVolume"] - trades_df["SellVolume"]
                        price_change = df_m["Close"] - df_m["Open"]
                        estimated = (net_vol / df_m["Volume"].fillna(1.0).replace(0, 1.0)) * price_change.fillna(0.0)
                        trades_df["LTPContribution"] = trades_df["LTPContribution"].fillna(estimated).fillna(0.0)
                        
                    trades_df_clean = trades_df

        reports = []
        
        for ticker in tickers:
            df_ticker = historical_df[historical_df["Ticker"] == ticker].sort_values("Date").reset_index(drop=True)
            band_percent = bands_dict.get(ticker, None)
            
            try:
                # Market indicators
                market_res = self.calculate_core_metrics(ticker, df_ticker, band_percent)
                
                # Participant audits
                final_close = float(df_ticker["Close"].iloc[-1])
                total_exchange_vol = float(df_ticker["Volume"].iloc[-self.config.recent_days:].sum())
                
                part_res = ParticipantAuditResult()
                fact_audit_res = None
                
                if not trades_df_clean.empty:
                    part_res = self.analyze_participants(ticker, trades_df_clean, final_close, total_exchange_vol)
                    if is_fact_trades:
                        fact_audit_res = self.analyze_fact_trades(ticker, fact_trades_df_clean)

                # Shareholder details
                ticker_sh = {}
                if not sh_df.empty and ticker in sh_df["Ticker"].values:
                    ticker_sh = sh_df[sh_df["Ticker"] == ticker].iloc[0].to_dict()

                # Corporate announcements
                ticker_ann = []
                if not ann_df.empty and ticker in ann_df["Ticker"].values:
                    ticker_ann = ann_df[ann_df["Ticker"] == ticker].to_dict("records")

                # Market statistics summary
                lookback = self.config.lookback_days
                recent = self.config.recent_days
                hist_summary = {
                    "StartPrice": float(df_ticker["Close"].iloc[-(lookback + 1)]),
                    "EndPrice": float(df_ticker["Close"].iloc[-1]),
                    "PriceChangePercent": float(((df_ticker["Close"].iloc[-1] - df_ticker["Close"].iloc[-(lookback + 1)]) / df_ticker["Close"].iloc[-(lookback + 1)]) * 100),
                    "15dAvgDailyReturn": float((df_ticker["Close"].pct_change() * 100).iloc[-recent:].mean()),
                    "15dAvgVolume": float(df_ticker["Volume"].iloc[-recent:].mean())
                }

                report = ScripSurveillanceReport(
                    ticker=ticker,
                    market_metrics=market_res,
                    participant_audit=part_res,
                    shareholding=ticker_sh,
                    announcements=ticker_ann,
                    market_summary=hist_summary,
                    watchlist=(market_res.final_score >= self.config.threshold),
                    fact_trades_audit=fact_audit_res
                )
                reports.append(report)
            except Exception as e:
                print(f"[skip] {ticker}: {e}", file=sys.stderr)

        return sorted(reports, key=lambda r: r.market_metrics.final_score, reverse=True)


# ----------------------------------------------------------------------
# CLI Dashboard Printer Utility
# ----------------------------------------------------------------------

def print_dashboard(report: ScripSurveillanceReport, threshold: float):
    """Prints a beautiful, comprehensive compliance surveillance report for a scrip."""
    ticker = report.ticker
    core = report.market_metrics
    participant = report.participant_audit
    sh_pattern = report.shareholding
    announcements = report.announcements
    hist_summary = report.market_summary

    print("=" * 72)
    print(f" SURVEILLANCE REPORT: {ticker} ".center(72, "#"))
    print("=" * 72)

    watchlist_status = "!! ALERT: WATCHLIST SHORTLISTED !!" if report.watchlist else "PASSED SURVEILLANCE"
    print(f"Status: {watchlist_status} | Final Alert Score: {core.final_score:.2f} (Threshold: {threshold})")
    print("-" * 72)

    # Core Metrics
    print(f"{'Surveillance Metric':<35} | {'Value (Std / Mod Z)':<22} | {'Score':<10}")
    print("-" * 72)
    print(f"2.1 Price Rise % (15d High vs T-180) | {core.price_rise_pct:>20.2f}% | {core.price_rise_score:<10}")
    print(f"2.2 Price Z-Score (15d Avg daily %)   | {core.price_z:>8.2f} / {core.price_mod_z:<11.2f} | {core.price_z_score:<10}")
    print(f"2.3 Volume Z-Score (15d Avg Vol)      | {core.volume_z:>8.2f} / {core.volume_mod_z:<11.2f} | {core.volume_z_score:<10}")
    print(f"2.4 Price Band Hits (last 15 days)    | {core.band_hit_days:>21d} | {core.band_score:<10}")
    print(f"2.5 180d New High Hits (last 15 days) | {core.new_high_days:>21d} | {core.new_high_score:<10}")
    print("-" * 72)

    # Market Indicators
    print(f"Price Path (180d ago -> Latest): {hist_summary['StartPrice']:.2f} -> {hist_summary['EndPrice']:.2f} ({hist_summary['PriceChangePercent']:.2f}%)")
    print(f"Rolling 15d Avg Price Move:      {hist_summary['15dAvgDailyReturn']:.3f}%")
    print(f"Rolling 15d Avg Volume:          {hist_summary['15dAvgVolume']:,.0f} shares")
    print("-" * 72)

    # Shareholding Pattern
    if sh_pattern:
        print("Shareholder Statistics:")
        print(f"  - Unique PAN Holders:       {sh_pattern.get('UniquePANs', 0):,}")
        print(f"  - Promoter Holding:         {sh_pattern.get('PromoterPercent', 0.0):.2f}%")
        print(f"  - Top 1% Shareholder Share: {sh_pattern.get('Top1PercentShare', 0.0):.2f}%")
    else:
        print("Shareholder Statistics: No Data Available")
    print("-" * 72)

    # Announcements
    print(f"Corporate Announcements (Last 15 days): {len(announcements)}")
    for ann in announcements:
        print(f"  - [{ann['Date']}] {ann['Details']}")
    print("-" * 72)

    # Participant Details
    print("Participant Audit (Last 15 days):")
    
    print("\n  Top 5 LTP Price Impact Contributors:")
    if participant.ltp_contributors:
        print("    " + f"{'PAN':<15} | {'Net LTP Contrib (Price)':<22}")
        for p in participant.ltp_contributors:
            print("    " + f"{p['PAN']:<15} | {p['LTPContribution']:>22.4f}")
    else:
        print("    No participant trade records found.")

    print("\n  Top 5 Volume Share Concentrators:")
    if participant.volume_share:
        print("    " + f"{'PAN':<15} | {'Total Volume':<15} | {'% of Exchange Volume':<20}")
        for p in participant.volume_share:
            print("    " + f"{p['PAN']:<15} | {p['PANVolume']:>15,} | {p['VolumeSharePercent']:>19.3f}%")
    else:
        print("    No participant trade records found.")

    print("\n  Top 5 Trading Counterparty Pairs (Circular Trade Risk):")
    if participant.counterparty_pairs:
        print("    " + f"{'Counterparty Pair':<33} | {'Volume':<12} | {'% of Exchange Vol':<18}")
        for p in participant.counterparty_pairs:
            print("    " + f"{p['Pair']:<33} | {p['Volume']:>12,} | {p['SharePercent']:>17.3f}%")
    else:
        print("    No counterparty details available.")

    print("\n  Top 5 Trade Reversal Pairs (RTR / Collusion Risk):")
    if participant.reversal_pairs:
        print("    " + f"{'Participant Pair':<33} | {'Gross Volume':<12} | {'Reversal Ratio (RTR)':<20}")
        for p in participant.reversal_pairs:
            print("    " + f"{p['Pair']:<33} | {p['GrossVolume']:>12,} | {p['ReversalRatio']:>19.2f}%")
    else:
        print("    No trade reversal details available.")

    print("\n  Circular Trade Loops Detected (Lengths 3-5):")
    if participant.circular_loops:
        print("    " + f"{'Detected Collusive Loop':<55} | {'Rotated Vol':<12}")
        for p in participant.circular_loops:
            print("    " + f"{p['Cycle']:<55} | {p['RotatedVolume']:>12,}")
    else:
        print("    No circular trading loops detected.")

    print("\n  Top 5 Participant Profit-Makers (MTM PnL):")
    if participant.profit_makers:
        print("    " + f"{'PAN':<15} | {'Buy Qty':<10} | {'Sell Qty':<10} | {'Net MTM PnL (INR)':<18}")
        for p in participant.profit_makers:
            print("    " + f"{p['PAN']:<15} | {p['BuyVolume']:>10,} | {p['SellVolume']:>10,} | {p['NetPnL']:>17.2f}")
    else:
        print("    No trade records to calculate PnL.")
    print("=" * 72 + "\n")

    if report.fact_trades_audit:
        ft = report.fact_trades_audit
        print("=" * 72)
        print(" FACT_TRADES SYSTEM COMPLIANCE AUDIT ".center(72, "#"))
        print("=" * 72)
        print("Wash Trading & Self-Trading Risks:")
        print(f"  - Same-Broker Wash Trades:   {ft.same_broker_wash_count:,} trades ({ft.same_broker_wash_volume:,.0f} shares)")
        print(f"  - Different-Broker Wash:     {ft.diff_broker_wash_count:,} trades ({ft.diff_broker_wash_volume:,.0f} shares)")
        print(f"  - Self-Trades (Wash Risk):   {ft.self_trade_count:,} trades ({ft.self_trade_volume:,.0f} shares)")
        print("-" * 72)
        print("Execution Channel Distribution:")
        print(f"  - Algorithmic Trading:       Buy: {ft.algo_buy_pct:.2f}% ({ft.algo_buy_count:,} trades)")
        print(f"                               Sell: {ft.algo_sell_pct:.2f}% ({ft.algo_sell_count:,} trades)")
        print(f"  - Direct Market Access (DMA): Buy: {ft.dma_buy_pct:.2f}% ({ft.dma_buy_count:,} trades)")
        print(f"                               Sell: {ft.dma_sell_pct:.2f}% ({ft.dma_sell_count:,} trades)")
        print(f"  - Internet Trading:          Buy: {ft.internet_buy_pct:.2f}% ({ft.internet_buy_count:,} trades)")
        print(f"                               Sell: {ft.internet_sell_pct:.2f}% ({ft.internet_sell_count:,} trades)")
        print("-" * 72)
        print("Order Book Quality & Matching Statistics:")
        print(f"  - Average Bid-Ask Spread:    {ft.avg_bid_ask_spread:.4f}")
        print(f"  - Average Order Match Delay: {ft.avg_buy_sell_diff_time_sec:.4f} seconds")
        print(f"  - Avg Match Price / Qty Diff: Price Diff: {ft.avg_buy_sell_diff_price:.4f} | Qty Diff: {ft.avg_buy_sell_diff_qty:.2f}")
        print(f"  - Avg Pending Bid (Depth):   Qty: {ft.avg_bid_pdg_qty:,.2f} | Val: {ft.avg_bid_pdg_val:,.2f}")
        print(f"  - Avg Pending Ask (Depth):   Qty: {ft.avg_ask_pdg_qty:,.2f} | Val: {ft.avg_ask_pdg_val:,.2f}")
        print(f"  - Avg Order Book Imbalance:  {ft.avg_order_imbalance:.4f} (positive = buy pressure)")
        print("-" * 72)
        print("Top 5 Spoofing Risk Contributors (Order-to-Trade Ratio):")
        if ft.top_otr_contributors:
            print("    " + f"{'PAN':<15} | {'Order Qty':<15} | {'Executed Qty':<15} | {'OTR':<10}")
            for p in ft.top_otr_contributors:
                print("    " + f"{p['PAN']:<15} | {p['OrderQty']:>15,} | {p['ExecQty']:>15,} | {p['OTR']:>9.2f}")
        else:
            print("    No OTR details available.")
        print("=" * 72 + "\n")


# ----------------------------------------------------------------------
# CLI Application Wrapper
# ----------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Offline PV Alert Surveillance Framework (modular library & CLI wrapper)")
    parser.add_argument("--historical", required=True, help="Path to historical price-volume CSV (required)")
    parser.add_argument("--bands", help="Path to price bands CSV")
    parser.add_argument("--trades", help="Path to PAN trades CSV")
    parser.add_argument("--shareholding", help="Path to shareholding pattern CSV")
    parser.add_argument("--announcements", help="Path to corporate announcements CSV")
    parser.add_argument("--threshold", type=float, default=10.0, help="Watch-list score threshold")
    parser.add_argument("--lookback", type=int, default=180, help="Historical baseline lookback period in days (default: 180)")
    parser.add_argument("--recent", type=int, default=15, help="Recent evaluation window in days (default: 15)")
    parser.add_argument("--out", default="pv_surveillance_output.csv", help="Output summary CSV path")
    parser.add_argument("--json-out", default="pv_surveillance_details.json", help="Detailed JSON report output path")
    parser.add_argument("--verbose", action="store_true", help="Print dashboard for all scrips, not just watchlist")
    args = parser.parse_args()

    if not os.path.exists(args.historical):
        parser.error(f"Historical file not found: {args.historical}. Please verify files and try again.")

    # 1. Load files as DataFrames
    df_hist = pd.read_csv(args.historical)
    df_bands = pd.read_csv(args.bands) if args.bands and os.path.exists(args.bands) else None
    df_trades = pd.read_csv(args.trades) if args.trades and os.path.exists(args.trades) else None
    df_sh = pd.read_csv(args.shareholding) if args.shareholding and os.path.exists(args.shareholding) else None
    df_ann = pd.read_csv(args.announcements) if args.announcements and os.path.exists(args.announcements) else None

    # 2. Configure and run programmatic engine
    config = SurveillanceConfig(
        threshold=args.threshold,
        lookback_days=args.lookback,
        recent_days=args.recent
    )
    engine = SurveillanceEngine(config)
    reports = engine.run_pipeline(
        historical_df=df_hist,
        bands_df=df_bands,
        trades_df=df_trades,
        shareholding_df=df_sh,
        announcements_df=df_ann
    )

    if not reports:
        print("No surveillance results generated. Check the integrity of your historical price-volume file.")
        return

    # 3. Format CLI output
    df_summary = pd.DataFrame([r.market_metrics.as_dict() for r in reports])
    df_summary["Watchlist"] = df_summary["Final Score"] >= args.threshold

    print("\n" + "#" * 72)
    print(" SURVEILLANCE SUMMARY ".center(72, "#"))
    print("#" * 72)
    pd.set_option("display.width", 160)
    print(df_summary.to_string(index=False))
    print("-" * 72)

    watchlist_reports = [r for r in reports if r.watchlist]
    print(f"\n{len(watchlist_reports)}/{len(reports)} scrips exceeded watchlist threshold ({args.threshold})\n")

    reports_to_print = reports if args.verbose else watchlist_reports
    for r in reports_to_print:
        print_dashboard(r, args.threshold)

    # 4. Save exports
    df_summary.to_csv(args.out, index=False)
    print(f"Saved summary watchlist: {args.out}")

    # Export full dashboard objects to JSON
    json_export = {}
    for r in reports:
        json_export[r.ticker] = {
            "surveillance_score": r.market_metrics.as_dict(),
            "participant_audits": {
                "ltp_contributors": r.participant_audit.ltp_contributors,
                "volume_share": r.participant_audit.volume_share,
                "counterparty_pairs": r.participant_audit.counterparty_pairs,
                "profit_makers": r.participant_audit.profit_makers,
                "reversal_pairs": r.participant_audit.reversal_pairs,
                "circular_loops": r.participant_audit.circular_loops
            },
            "fact_trades_audit": asdict(r.fact_trades_audit) if r.fact_trades_audit else None,
            "shareholders": r.shareholding,
            "announcements": r.announcements,
            "market_summary": r.market_summary
        }

    with open(args.json_out, "w") as f:
        json.dump(json_export, f, indent=2, default=str)
    print(f"Saved detailed compliance reports: {args.json_out}")


if __name__ == "__main__":
    main()
