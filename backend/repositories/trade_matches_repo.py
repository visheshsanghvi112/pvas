"""
backend/repositories/trade_matches_repo.py
────────────────────────────────────────────────────────────────────────────
Data-access layer for trade surveillance matches and counterparty pairs.
Queries clean CounterpartyTradePair and DailyMarketEod models.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional, List, Tuple
from decimal import Decimal
import zlib

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from backend.db.models import CounterpartyTradePair, DailyMarketEod
from backend.schemas.trade_matches import TradeMatchesFilter, TradeMatchRecord


def _pan_token(pan: Optional[str]) -> int:
    return zlib.crc32((pan or "").encode("utf-8")) % 1000000


class TradeMatchesRepository:

    def __init__(self, db: Session) -> None:
        self._db = db

    def _to_record(self, row: CounterpartyTradePair) -> TradeMatchRecord:
        qty = Decimal(str(row.matched_quantity or 1.0))
        val = Decimal(str(row.matched_turnover_value or 0.0))
        price = round(val / qty, 2) if qty > 0 else Decimal("0.0")
        is_wash = 1 if row.is_same_broker_wash else 0
        tmst = datetime.combine(row.trade_date, datetime.min.time())

        # Deterministic token numbers from PANs across restarts/workers
        b_tok = _pan_token(row.buyer_pan)
        s_tok = _pan_token(row.seller_pan)

        return TradeMatchRecord(
            trade_date=row.trade_date,
            trade_number=row.pair_match_id,
            trade_timestamp=tmst,
            symbol=row.symbol,
            series="EQ",
            trade_price=price,
            trade_quantity=qty,
            trade_value=val,
            is_same_broker_wash=is_wash,
            is_algo_trade=row.algo_execution_flag or 0,
            buyer_broker_id=int(row.buyer_tm_id) if (row.buyer_tm_id and str(row.buyer_tm_id).isdigit()) else 101,
            seller_broker_id=int(row.seller_tm_id) if (row.seller_tm_id and str(row.seller_tm_id).isdigit()) else (int(row.buyer_tm_id) if (is_wash and row.buyer_tm_id and str(row.buyer_tm_id).isdigit()) else 102),
            buyer_client_token=b_tok,
            seller_client_token=s_tok,
            session_type=2,
            segment_code=1,
            exchange="NSE",
        )

    def list_trades(
        self,
        filters: TradeMatchesFilter,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[TradeMatchRecord], int]:
        # CounterpartyTradePair records represent NSE executions until multi-venue columns are added
        if filters.exchange and filters.exchange.upper() not in ("ALL", "NSE"):
            return [], 0

        q = self._db.query(CounterpartyTradePair)

        if filters.symbol:
            q = q.filter(CounterpartyTradePair.symbol == filters.symbol.upper())
        if filters.date_from:
            q = q.filter(CounterpartyTradePair.trade_date >= filters.date_from)
        if filters.date_to:
            q = q.filter(CounterpartyTradePair.trade_date <= filters.date_to)
        if filters.wash_flag is not None:
            if filters.wash_flag == 1:
                q = q.filter(CounterpartyTradePair.is_same_broker_wash == True)
            else:
                q = q.filter(CounterpartyTradePair.is_same_broker_wash == False)

        total = q.count()
        offset = (page - 1) * page_size
        rows = q.order_by(CounterpartyTradePair.trade_date.desc()).offset(offset).limit(page_size).all()

        records = [self._to_record(row) for row in rows]
        return records, total

    def get_by_pk(
        self,
        trd_date: date,
        trd_num: int,
        **kwargs
    ) -> Optional[TradeMatchRecord]:
        row = self._db.query(CounterpartyTradePair).filter(
            CounterpartyTradePair.trade_date == trd_date,
            CounterpartyTradePair.pair_match_id == trd_num,
        ).first()
        if row:
            return self._to_record(row)
        return None

    def get_trades_for_symbol(
        self,
        symbol: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[TradeMatchRecord]:
        q = self._db.query(CounterpartyTradePair).filter(
            CounterpartyTradePair.symbol == symbol.upper()
        )
        if date_from:
            q = q.filter(CounterpartyTradePair.trade_date >= date_from)
        if date_to:
            q = q.filter(CounterpartyTradePair.trade_date <= date_to)

        rows = q.order_by(CounterpartyTradePair.trade_date.asc()).all()
        return [self._to_record(row) for row in rows]

    def get_wash_trade_summary(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[dict[str, Any]]:
        q = self._db.query(
            CounterpartyTradePair.symbol.label("symbol"),
            CounterpartyTradePair.trade_date.label("trade_date"),
            func.count().label("total_count"),
            func.sum(CounterpartyTradePair.matched_turnover_value).label("total_value"),
        ).filter(CounterpartyTradePair.is_same_broker_wash == True)

        if date_from:
            q = q.filter(CounterpartyTradePair.trade_date >= date_from)
        if date_to:
            q = q.filter(CounterpartyTradePair.trade_date <= date_to)

        rows = q.group_by(CounterpartyTradePair.symbol, CounterpartyTradePair.trade_date).all()
        return [
            {
                "symbol": r.symbol,
                "trade_date": r.trade_date,
                "wash_trade_count": int(r.total_count or 0),
                "wash_trade_value": float(r.total_value or 0),
                "total_trade_count": int(r.total_count or 1),
                "wash_pct": 100.0,
            }
            for r in rows
        ]

    def get_algo_breakdown(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[dict[str, Any]]:
        algo_case = func.sum(case((CounterpartyTradePair.algo_execution_flag == 1, 1), else_=0))
        q = self._db.query(
            CounterpartyTradePair.symbol.label("symbol"),
            func.count().label("total"),
            algo_case.label("algo_total"),
        )
        if date_from:
            q = q.filter(CounterpartyTradePair.trade_date >= date_from)
        if date_to:
            q = q.filter(CounterpartyTradePair.trade_date <= date_to)

        rows = q.group_by(CounterpartyTradePair.symbol).all()
        results: List[dict[str, Any]] = []
        for r in rows:
            total = int(r.total or 0)
            algo_count = int(r.algo_total or 0)
            manual_count = max(0, total - algo_count)
            algo_pct = round((algo_count / total) * 100.0, 2) if total > 0 else 0.0
            results.append({
                "symbol": r.symbol,
                "algo_count": algo_count,
                "manual_count": manual_count,
                "dma_count": 0,
                "total_count": total,
                "algo_pct": algo_pct,
                "dma_pct": 0.0,
                "spoof_ratio": 1.0,
            })
        return results

    def get_participant_trades(
        self,
        clnt_token: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[TradeMatchRecord], int]:
        q = self._db.query(CounterpartyTradePair)
        if date_from:
            q = q.filter(CounterpartyTradePair.trade_date >= date_from)
        if date_to:
            q = q.filter(CounterpartyTradePair.trade_date <= date_to)

        rows = q.order_by(CounterpartyTradePair.trade_date.desc()).all()
        matched = [
            r for r in rows
            if (_pan_token(r.buyer_pan) == clnt_token or _pan_token(r.seller_pan) == clnt_token)
        ]
        total = len(matched)
        offset = (page - 1) * page_size
        paged = matched[offset:offset + page_size]
        records = [self._to_record(r) for r in paged]
        return records, total

    def count_by_symbol_date(self) -> List[dict[str, Any]]:
        rows = (
            self._db.query(
                DailyMarketEod.symbol.label("symbol"),
                DailyMarketEod.trade_date.label("trade_date"),
                func.count().label("trade_count"),
                func.sum(DailyMarketEod.total_traded_value).label("total_value"),
            )
            .group_by(DailyMarketEod.symbol, DailyMarketEod.trade_date)
            .order_by(DailyMarketEod.trade_date.desc())
            .all()
        )
        return [
            {
                "symbol": r.symbol,
                "trade_date": r.trade_date,
                "trade_count": int(r.trade_count or 0),
                "total_value": float(r.total_value or 0),
            }
            for r in rows
        ]
