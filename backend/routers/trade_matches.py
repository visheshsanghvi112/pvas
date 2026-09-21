"""
backend/routers/trade_matches.py
────────────────────────────────────────────────────────────────────────────
FastAPI router for trade surveillance & match analytics.

All endpoints consume the TradeMatchesService — no direct DB access here.
"""

from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.schemas.trade_matches import (
    TradeMatchRecord,
    TradeMatchDetail,
    TradeMatchesFilter,
)
from backend.services.trade_matches_service import TradeMatchesService
from backend.security import get_current_user

router = APIRouter(
    prefix="/api/v1/trades",
    tags=["Trade Surveillance"],
    dependencies=[Depends(get_current_user)]
)


def _get_service(db: Session = Depends(get_db)) -> TradeMatchesService:
    return TradeMatchesService(db)


# ── 1. Paginated filtered trade list ─────────────────────────────────────────

@router.get(
    "/",
    summary="List trades with filters, pagination, and sorting",
    response_description="Paginated trade records",
)
def list_trades(
    symbol:              Optional[str]  = Query(None, description="Symbol e.g. NOVAENERGY"),
    date_from:           Optional[date] = Query(None, description="Start date YYYY-MM-DD"),
    date_to:             Optional[date] = Query(None, description="End date YYYY-MM-DD"),
    session_type:        Optional[int]  = Query(None, description="1=Pre-Open 2=Market 3=Close"),
    segment_code:        Optional[int]  = Query(None, description="1=EQ 2=Futures 3=Call 4=Put"),
    account_type:        Optional[int]  = Query(None, description="1=Client 2=Own 3=Inst"),
    wash_flag:           Optional[int]  = Query(None, description="1=wash trades only"),
    algo_flag:           Optional[int]  = Query(None, description="0=algo 1=manual"),
    buyer_broker_id:     Optional[int]  = Query(None),
    seller_broker_id:    Optional[int]  = Query(None),
    buyer_client_token:  Optional[int]  = Query(None),
    seller_client_token: Optional[int]  = Query(None),
    series:              Optional[str]  = Query(None, description="Series e.g. EQ"),
    sort_by:             str            = Query("trade_timestamp"),
    sort_dir:            Literal["asc", "desc"] = Query("desc"),
    page:                int            = Query(1, ge=1),
    page_size:           int            = Query(50, ge=1, le=500),
    svc: TradeMatchesService = Depends(_get_service),
):
    filters = TradeMatchesFilter(
        symbol=symbol, date_from=date_from, date_to=date_to,
        session_type=session_type, segment_code=segment_code,
        account_type=account_type, wash_flag=wash_flag, algo_flag=algo_flag,
        buyer_broker_id=buyer_broker_id, seller_broker_id=seller_broker_id,
        buyer_client_token=buyer_client_token, seller_client_token=seller_client_token,
        series=series, sort_by=sort_by, sort_dir=sort_dir,
    )
    result = svc.list_trades(filters, page, page_size)
    return {
        "data":       [TradeMatchRecord.model_validate(r) for r in result["data"]],
        "pagination": result["pagination"],
    }


# ── 2. Symbol-level daily stats (dashboard heat map) ─────────────────────────

@router.get(
    "/stats/daily",
    summary="Trade count and value per symbol per day",
)
def daily_stats(svc: TradeMatchesService = Depends(_get_service)):
    return svc.get_symbol_daily_stats()


# ── 3. Wash trade summary ─────────────────────────────────────────────────────

@router.get(
    "/analysis/wash-trades",
    summary="Same-broker wash trade analysis across symbols",
)
def wash_trade_summary(
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    svc: TradeMatchesService = Depends(_get_service),
):
    return svc.get_wash_trade_summary(date_from, date_to)


# ── 4. Algo vs manual vs DMA breakdown ───────────────────────────────────────

@router.get(
    "/analysis/algo-breakdown",
    summary="Algo / DMA / manual order breakdown per symbol",
)
def algo_breakdown(
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    svc: TradeMatchesService = Depends(_get_service),
):
    return svc.get_algo_breakdown(date_from, date_to)


# ── 5. All trades for a specific participant ──────────────────────────────────

@router.get(
    "/participant/{clnt_token}",
    summary="All trades (buy + sell) for a given client token",
)
def participant_trades(
    clnt_token:  int,
    date_from:   Optional[date] = Query(None),
    date_to:     Optional[date] = Query(None),
    page:        int = Query(1, ge=1),
    page_size:   int = Query(50, ge=1, le=500),
    svc: TradeMatchesService = Depends(_get_service),
):
    result = svc.get_participant_trades(clnt_token, date_from, date_to, page, page_size)
    return {
        "client_token": result["client_token"],
        "data":         [TradeMatchRecord.model_validate(r) for r in result["data"]],
        "pagination":   result["pagination"],
    }


# ── 6. Single trade detail by composite PK ───────────────────────────────────

@router.get(
    "/{trd_date}/{trd_num}",
    summary="Full detail for a single trade",
)
def get_trade_detail(
    trd_date:   date,
    trd_num:    int,
    svc: TradeMatchesService = Depends(_get_service),
):
    trade = svc.get_trade_detail(trd_date, trd_num)
    if trade is None:
        raise HTTPException(status_code=404, detail="Trade not found")
    return TradeMatchDetail.model_validate(trade)
