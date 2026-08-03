"""
backend/repositories/agg_trades_repo.py
────────────────────────────────────────────────────────────────────────────
Data Access Repository for Trade Aggregates:
  - AGG_SEC_DAY  (ASD  — Security Daily Aggregates & VWAP Closing Prices)
  - AGG_CLNT_SEC_DAY (ACSD — Client Daily Aggregates & LTP Push Values)
  - AGG_PAN_PAIR_DAY (APPD — Buyer-Seller PAN Pair Concentration Matrix)
"""

from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.db.models import AggSecDay, AggClntSecDay, AggPanPairDay


class AggTradesRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_security_aggregates(
        self,
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 260
    ) -> List[AggSecDay]:
        """Fetch daily security aggregates (OHLC, 30-min VWAP Close, Circuits, Volumes) for a symbol."""
        query = self.db.query(AggSecDay).filter(AggSecDay.Asd_Symbol == symbol)
        if start_date:
            query = query.filter(AggSecDay.Asd_Date >= start_date)
        if end_date:
            query = query.filter(AggSecDay.Asd_Date <= end_date)
        return query.order_by(AggSecDay.Asd_Date.asc()).limit(limit).all()

    def get_latest_closing_price(self, symbol: str) -> Optional[float]:
        """Fetch latest official VWAP closing price for a symbol."""
        rec = self.db.query(AggSecDay)\
            .filter(AggSecDay.Asd_Symbol == symbol)\
            .order_by(desc(AggSecDay.Asd_Date))\
            .first()
        return float(rec.Asd_Close_Price) if rec and rec.Asd_Close_Price else None

    def get_client_aggregates(
        self,
        cmp_token: Optional[int] = None,
        clnt_token: Optional[int] = None,
        target_date: Optional[date] = None,
        limit: int = 100
    ) -> List[AggClntSecDay]:
        """Fetch client-level daily trade & price push aggregates."""
        query = self.db.query(AggClntSecDay)
        if cmp_token:
            query = query.filter(AggClntSecDay.Acsd_Cmp_Token == cmp_token)
        if clnt_token:
            query = query.filter(AggClntSecDay.Acsd_Exch_Clnt_Token == clnt_token)
        if target_date:
            query = query.filter(AggClntSecDay.Acsd_Date == target_date)
        return query.order_by(desc(AggClntSecDay.Acsd_Date)).limit(limit).all()

    def get_pan_pair_aggregates(
        self,
        cmp_token: Optional[int] = None,
        buy_clnt_token: Optional[int] = None,
        sell_clnt_token: Optional[int] = None,
        target_date: Optional[date] = None,
        limit: int = 100
    ) -> List[AggPanPairDay]:
        """Fetch buyer-seller PAN pair trade concentration matrix."""
        query = self.db.query(AggPanPairDay)
        if cmp_token:
            query = query.filter(AggPanPairDay.Appd_Cmp_Token == cmp_token)
        if buy_clnt_token:
            query = query.filter(AggPanPairDay.Appd_Exch_Clnt_Token == buy_clnt_token)
        if sell_clnt_token:
            query = query.filter(AggPanPairDay.Appd_Cpty_Exch_Clnt_Token == sell_clnt_token)
        if target_date:
            query = query.filter(AggPanPairDay.Appd_Date == target_date)
        return query.order_by(desc(AggPanPairDay.Appd_Date)).limit(limit).all()
