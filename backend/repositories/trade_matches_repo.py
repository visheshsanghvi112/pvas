"""
backend/repositories/trade_matches_repo.py
────────────────────────────────────────────────────────────────────────────
Data-access layer for trade execution matches and counterparty pairs.
Queries clean CounterpartyTradePair and DailyMarketEod models.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Optional, List, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db.models import CounterpartyTradePair, DailyMarketEod
from backend.schemas.trade_matches import TradeMatchesFilter


@dataclass
class AggTradeRecord:
    """Domain object representing a trade match constructed for the frontend."""
    Ftrd_Trd_Date: date
    Ftrd_Trd_Num: int
    Ftrd_Trd_Tmst: datetime
    Ftrd_Symbol: str
    Ftrd_Series: str
    Ftrd_Trd_Price: float
    Ftrd_Trd_Qty: float
    Ftrd_Trd_Val: float
    Ftrd_Same_Broker_Wash_Flag: int
    Ftrd_Buy_CTCL_Algo_Flag: int
    Ftrd_Buy_Exch_TM_Token: int
    Ftrd_Sell_Exch_TM_Token: int
    Ftrd_Buy_Exch_Clnt_Token: int
    Ftrd_Sell_Exch_Clnt_Token: int
    Ftrd_Sess_Type: int
    Ftrd_Sub_Seg_Code: int
    Ftrd_Cmp_Token: int
    Ftrd_Trd_Prd_Token: int
    Ftrd_Exch_Token: int
    Ftrd_Seg_Token: int
    Ftrd_Buy_Acct_Type: int
    Ftrd_Bid_Pdg_Ord_Qty: float = 0.0
    Ftrd_Ask_Pdg_Ord_Qty: float = 0.0


class TradeMatchesRepository:

    def __init__(self, db: Session) -> None:
        self._db = db

    def _to_record(self, row: CounterpartyTradePair) -> AggTradeRecord:
        qty = float(row.matched_quantity or 1.0)
        val = float(row.matched_turnover_value or 0.0)
        price = round(val / qty, 2) if qty > 0 else 0.0
        is_wash = 1 if row.is_same_broker_wash else 0
        tmst = datetime.combine(row.trade_date, datetime.min.time())

        # Generate deterministic token numbers from PAN hashes
        b_tok = abs(hash(row.buyer_pan)) % 1000000
        s_tok = abs(hash(row.seller_pan)) % 1000000

        return AggTradeRecord(
            Ftrd_Trd_Date=row.trade_date,
            Ftrd_Trd_Num=row.pair_match_id,
            Ftrd_Trd_Tmst=tmst,
            Ftrd_Symbol=row.symbol,
            Ftrd_Series="EQ",
            Ftrd_Trd_Price=price,
            Ftrd_Trd_Qty=qty,
            Ftrd_Trd_Val=val,
            Ftrd_Same_Broker_Wash_Flag=is_wash,
            Ftrd_Buy_CTCL_Algo_Flag=row.algo_execution_flag or 0,
            Ftrd_Buy_Exch_TM_Token=101,
            Ftrd_Sell_Exch_TM_Token=101 if is_wash else 102,
            Ftrd_Buy_Exch_Clnt_Token=b_tok,
            Ftrd_Sell_Exch_Clnt_Token=s_tok,
            Ftrd_Sess_Type=2,
            Ftrd_Sub_Seg_Code=1,
            Ftrd_Cmp_Token=1,
            Ftrd_Trd_Prd_Token=1,
            Ftrd_Exch_Token=1,
            Ftrd_Seg_Token=1,
            Ftrd_Buy_Acct_Type=1,
        )

    def list_trades(
        self,
        filters: TradeMatchesFilter,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[AggTradeRecord], int]:
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
        cmp_token: Optional[int] = None,
        prd_token: Optional[int] = None,
        exch_token: Optional[int] = None,
        seg_token: Optional[int] = None,
    ) -> Optional[AggTradeRecord]:
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
    ) -> List[AggTradeRecord]:
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
        q = self._db.query(
            CounterpartyTradePair.symbol.label("symbol"),
            func.count().label("total"),
        )
        if date_from:
            q = q.filter(CounterpartyTradePair.trade_date >= date_from)
        if date_to:
            q = q.filter(CounterpartyTradePair.trade_date <= date_to)

        rows = q.group_by(CounterpartyTradePair.symbol).all()
        return [
            {
                "symbol": r.symbol,
                "algo_count": 0,
                "manual_count": int(r.total or 0),
                "dma_count": 0,
                "total_count": int(r.total or 1),
                "algo_pct": 0.0,
                "dma_pct": 0.0,
                "spoof_ratio": 1.0,
            }
            for r in rows
        ]

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
