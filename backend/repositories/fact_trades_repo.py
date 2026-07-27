"""
backend/repositories/fact_trades_repo.py
────────────────────────────────────────────────────────────────────────────
Data-access layer for FACT_TRADES.

All SQL/ORM logic lives here. Services and routers never touch SQLAlchemy
directly. When migrating to Teradata, only this file (and database.py)
needs to change.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Optional, List, Tuple

from sqlalchemy import func, text, Integer, case, Numeric
from sqlalchemy.orm import Session

from backend.db.models import FactTrades
from backend.schemas.fact_trades import FactTradesFilter

# Columns that callers are allowed to sort by (whitelist to prevent injection)
_SORTABLE_COLS: set[str] = {
    "Ftrd_Trd_Date", "Ftrd_Trd_Num", "Ftrd_Trd_Tmst", "Ftrd_Symbol",
    "Ftrd_Trd_Price", "Ftrd_Trd_Qty", "Ftrd_Trd_Val",
    "Ftrd_Same_Broker_Wash_Flag", "Ftrd_Sess_Type", "Ftrd_Sub_Seg_Code",
}


class FactTradesRepository:

    def __init__(self, db: Session) -> None:
        self._db = db

    # ── Internal helpers ───────────────────────────────────────────────────

    def _apply_filters(self, q, f: FactTradesFilter):
        if f.symbol:
            q = q.filter(FactTrades.Ftrd_Symbol == f.symbol.upper())
        if f.date_from:
            q = q.filter(FactTrades.Ftrd_Trd_Date >= f.date_from)
        if f.date_to:
            q = q.filter(FactTrades.Ftrd_Trd_Date <= f.date_to)
        if f.sess_type is not None:
            q = q.filter(FactTrades.Ftrd_Sess_Type == f.sess_type)
        if f.sub_seg_code is not None:
            q = q.filter(FactTrades.Ftrd_Sub_Seg_Code == f.sub_seg_code)
        if f.acct_type is not None:
            q = q.filter(FactTrades.Ftrd_Buy_Acct_Type == f.acct_type)
        if f.wash_flag is not None:
            q = q.filter(FactTrades.Ftrd_Same_Broker_Wash_Flag == f.wash_flag)
        if f.algo_flag is not None:
            q = q.filter(FactTrades.Ftrd_Buy_CTCL_Algo_Flag == f.algo_flag)
        if f.buy_tm_token is not None:
            q = q.filter(FactTrades.Ftrd_Buy_Exch_TM_Token == f.buy_tm_token)
        if f.sell_tm_token is not None:
            q = q.filter(FactTrades.Ftrd_Sell_Exch_TM_Token == f.sell_tm_token)
        if f.buy_clnt_token is not None:
            q = q.filter(FactTrades.Ftrd_Buy_Exch_Clnt_Token == f.buy_clnt_token)
        if f.sell_clnt_token is not None:
            q = q.filter(FactTrades.Ftrd_Sell_Exch_Clnt_Token == f.sell_clnt_token)
        if f.series:
            q = q.filter(FactTrades.Ftrd_Series == f.series.upper())
        return q

    def _apply_sort(self, q, sort_by: str, sort_dir: str):
        col_name = sort_by if sort_by in _SORTABLE_COLS else "Ftrd_Trd_Tmst"
        col = getattr(FactTrades, col_name)
        return q.order_by(col.desc() if sort_dir == "desc" else col.asc())

    # ── Public API ────────────────────────────────────────────────────────

    def list_trades(
        self,
        filters: FactTradesFilter,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[FactTrades], int]:
        """
        Returns (rows, total_count) applying all filters + pagination + sort.
        """
        q = self._db.query(FactTrades)
        q = self._apply_filters(q, filters)
        total = q.count()
        q = self._apply_sort(q, filters.sort_by, filters.sort_dir)
        offset = (page - 1) * page_size
        rows = q.offset(offset).limit(page_size).all()
        return rows, total

    def get_by_pk(
        self,
        trd_date: date,
        trd_num: int,
        cmp_token: int,
        prd_token: int,
        exch_token: int,
        seg_token: int,
    ) -> Optional[FactTrades]:
        return (
            self._db.query(FactTrades)
            .filter(
                FactTrades.Ftrd_Trd_Date      == trd_date,
                FactTrades.Ftrd_Trd_Num       == trd_num,
                FactTrades.Ftrd_Cmp_Token     == cmp_token,
                FactTrades.Ftrd_Trd_Prd_Token == prd_token,
                FactTrades.Ftrd_Exch_Token    == exch_token,
                FactTrades.Ftrd_Seg_Token     == seg_token,
            )
            .first()
        )

    def get_trades_for_symbol(
        self,
        symbol: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[FactTrades]:
        q = self._db.query(FactTrades).filter(
            FactTrades.Ftrd_Symbol == symbol.upper()
        )
        if date_from:
            q = q.filter(FactTrades.Ftrd_Trd_Date >= date_from)
        if date_to:
            q = q.filter(FactTrades.Ftrd_Trd_Date <= date_to)
        return q.order_by(FactTrades.Ftrd_Trd_Tmst).all()

    def get_wash_trade_summary(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[dict[str, Any]]:
        """
        Returns per-symbol wash trade statistics.
        """
        wash_col = case((FactTrades.Ftrd_Same_Broker_Wash_Flag == 1, 1), else_=0)
        q = self._db.query(
            FactTrades.Ftrd_Symbol,
            FactTrades.Ftrd_Trd_Date,
            func.sum(wash_col).label("wash_count"),
            func.sum(FactTrades.Ftrd_Trd_Val * wash_col).label("wash_value"),
            func.count().label("total_count"),
        )
        if date_from:
            q = q.filter(FactTrades.Ftrd_Trd_Date >= date_from)
        if date_to:
            q = q.filter(FactTrades.Ftrd_Trd_Date <= date_to)
        q = q.group_by(FactTrades.Ftrd_Symbol, FactTrades.Ftrd_Trd_Date)
        q = q.having(func.sum(wash_col) > 0)
        q = q.order_by(func.sum(wash_col).desc())
        rows = q.all()
        return [
            {
                "symbol":           r.Ftrd_Symbol,
                "trade_date":       r.Ftrd_Trd_Date,
                "wash_trade_count": int(r.wash_count or 0),
                "wash_trade_value": float(r.wash_value or 0),
                "total_trade_count":int(r.total_count),
                "wash_pct":         round(float(r.wash_count or 0) / max(int(r.total_count), 1) * 100, 2),
            }
            for r in rows
        ]

    def get_algo_breakdown(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[dict[str, Any]]:
        """
        Returns per-symbol algo vs manual vs DMA breakdown.
        Algo  = Ftrd_Buy_CTCL_Algo_Flag == 0
        DMA   = Ftrd_Buy_CTCL_Inet_DMA_Flag == 1
        Manual = everything else
        """
        algo_col = case((FactTrades.Ftrd_Buy_CTCL_Algo_Flag == 0, 1), else_=0)
        dma_col  = case((FactTrades.Ftrd_Buy_CTCL_Inet_DMA_Flag == 1, 1), else_=0)
        q = self._db.query(
            FactTrades.Ftrd_Symbol,
            func.count().label("total"),
            func.sum(algo_col).label("algo"),
            func.sum(dma_col).label("dma"),
        )
        if date_from:
            q = q.filter(FactTrades.Ftrd_Trd_Date >= date_from)
        if date_to:
            q = q.filter(FactTrades.Ftrd_Trd_Date <= date_to)
        q = q.group_by(FactTrades.Ftrd_Symbol)
        rows = q.all()
        return [
            {
                "symbol":       r.Ftrd_Symbol,
                "algo_count":   int(r.algo or 0),
                "manual_count": int(r.total) - int(r.algo or 0) - int(r.dma or 0),
                "dma_count":    int(r.dma or 0),
                "total_count":  int(r.total),
                "algo_pct":     round(int(r.algo or 0) / max(int(r.total), 1) * 100, 2),
                "dma_pct":      round(int(r.dma or 0) / max(int(r.total), 1) * 100, 2),
            }
            for r in rows
        ]

    def get_participant_trades(
        self,
        clnt_token: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[FactTrades], int]:
        """All trades where the client appears on either buy or sell side."""
        q = self._db.query(FactTrades).filter(
            (FactTrades.Ftrd_Buy_Exch_Clnt_Token == clnt_token) |
            (FactTrades.Ftrd_Sell_Exch_Clnt_Token == clnt_token)
        )
        if date_from:
            q = q.filter(FactTrades.Ftrd_Trd_Date >= date_from)
        if date_to:
            q = q.filter(FactTrades.Ftrd_Trd_Date <= date_to)
        total = q.count()
        rows = (
            q.order_by(FactTrades.Ftrd_Trd_Tmst.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return rows, total

    def count_by_symbol_date(self) -> List[dict[str, Any]]:
        """Aggregated trade counts per symbol per date (for dashboard heat map)."""
        rows = (
            self._db.query(
                FactTrades.Ftrd_Symbol,
                FactTrades.Ftrd_Trd_Date,
                func.count().label("trade_count"),
                func.sum(FactTrades.Ftrd_Trd_Val).label("total_value"),
            )
            .group_by(FactTrades.Ftrd_Symbol, FactTrades.Ftrd_Trd_Date)
            .order_by(FactTrades.Ftrd_Trd_Date.desc())
            .all()
        )
        return [
            {
                "symbol":      r.Ftrd_Symbol,
                "trade_date":  r.Ftrd_Trd_Date,
                "trade_count": r.trade_count,
                "total_value": float(r.total_value or 0),
            }
            for r in rows
        ]
