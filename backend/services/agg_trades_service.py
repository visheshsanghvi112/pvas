"""
backend/services/agg_trades_service.py
────────────────────────────────────────────────────────────────────────────
Service Layer for Trade Aggregates.
Consumes AggTradesRepository and provides business methods for API endpoints.
"""

from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session

from backend.repositories.agg_trades_repo import AggTradesRepository
from backend.db.models import AggSecDay, AggClntSecDay, AggPanPairDay


class AggTradesService:
    def __init__(self, db: Session):
        self.repo = AggTradesRepository(db)

    def get_security_daily_history(
        self,
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 260
    ) -> List[AggSecDay]:
        """Returns security daily OHLC, 30-min VWAP close prices, and circuit bounds."""
        return self.repo.get_security_aggregates(symbol, start_date, end_date, limit)

    def get_client_daily_history(
        self,
        cmp_token: Optional[int] = None,
        clnt_token: Optional[int] = None,
        target_date: Optional[date] = None,
        limit: int = 100
    ) -> List[AggClntSecDay]:
        """Returns client daily trading volume and LTP price push contribution values."""
        return self.repo.get_client_aggregates(cmp_token, clnt_token, target_date, limit)

    def get_pan_pair_matrix(
        self,
        cmp_token: Optional[int] = None,
        buy_clnt_token: Optional[int] = None,
        sell_clnt_token: Optional[int] = None,
        target_date: Optional[date] = None,
        limit: int = 100
    ) -> List[AggPanPairDay]:
        """Returns buyer-seller PAN pair trade concentration matrix."""
        return self.repo.get_pan_pair_aggregates(cmp_token, buy_clnt_token, sell_clnt_token, target_date, limit)
