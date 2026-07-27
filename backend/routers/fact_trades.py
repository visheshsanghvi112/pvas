"""
backend/routers/fact_trades.py
────────────────────────────────────────────────────────────────────────────
FastAPI router for FACT_TRADES (FTRD).

All endpoints consume the FactTradesService — no direct DB access here.
"""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.schemas.fact_trades import (
    FactTradeBase,
    FactTradeDetail,
    FactTradesFilter,
)
from backend.services.fact_trades_service import FactTradesService

router = APIRouter(
    prefix="/api/v1/trades",
    tags=["FACT_TRADES — Trade Surveillance"],
)


def _get_service(db: Session = Depends(get_db)) -> FactTradesService:
    return FactTradesService(db)


# ── 1. Paginated filtered trade list ─────────────────────────────────────────

@router.get(
    "/",
    summary="List trades with filters, pagination, and sorting",
    response_description="Paginated trade records from FACT_TRADES",
)
def list_trades(
    symbol:          Optional[str]  = Query(None, description="NSE symbol e.g. ALPHATECH"),
    date_from:       Optional[date] = Query(None, description="Start date YYYY-MM-DD"),
    date_to:         Optional[date] = Query(None, description="End date YYYY-MM-DD"),
    sess_type:       Optional[int]  = Query(None, description="1=Pre-Open 2=Market 3=Close"),
    sub_seg_code:    Optional[int]  = Query(None, description="1=EQ 2=Futures 3=Call 4=Put"),
    acct_type:       Optional[int]  = Query(None, description="1=Client 2=Own 3=Inst"),
    wash_flag:       Optional[int]  = Query(None, description="1=wash trades only"),
    algo_flag:       Optional[int]  = Query(None, description="0=algo 1=manual"),
    buy_tm_token:    Optional[int]  = Query(None),
    sell_tm_token:   Optional[int]  = Query(None),
    buy_clnt_token:  Optional[int]  = Query(None),
    sell_clnt_token: Optional[int]  = Query(None),
    series:          Optional[str]  = Query(None, description="Series e.g. EQ"),
    sort_by:         str            = Query("Ftrd_Trd_Tmst"),
    sort_dir:        Literal["asc", "desc"] = Query("desc"),
    page:            int            = Query(1, ge=1),
    page_size:       int            = Query(50, ge=1, le=500),
    svc: FactTradesService = Depends(_get_service),
):
    filters = FactTradesFilter(
        symbol=symbol, date_from=date_from, date_to=date_to,
        sess_type=sess_type, sub_seg_code=sub_seg_code,
        acct_type=acct_type, wash_flag=wash_flag, algo_flag=algo_flag,
        buy_tm_token=buy_tm_token, sell_tm_token=sell_tm_token,
        buy_clnt_token=buy_clnt_token, sell_clnt_token=sell_clnt_token,
        series=series, sort_by=sort_by, sort_dir=sort_dir,
    )
    result = svc.list_trades(filters, page, page_size)
    return {
        "data":       [FactTradeBase.model_validate(r) for r in result["data"]],
        "pagination": result["pagination"],
    }


# ── 2. Symbol-level daily stats (dashboard heat map) ─────────────────────────

@router.get(
    "/stats/daily",
    summary="Trade count and value per symbol per day",
)
def daily_stats(svc: FactTradesService = Depends(_get_service)):
    return svc.get_symbol_daily_stats()


# ── 3. Wash trade summary ─────────────────────────────────────────────────────

@router.get(
    "/analysis/wash-trades",
    summary="Same-broker wash trade analysis across symbols",
)
def wash_trade_summary(
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    svc: FactTradesService = Depends(_get_service),
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
    svc: FactTradesService = Depends(_get_service),
):
    return svc.get_algo_breakdown(date_from, date_to)


# ── 5. All trades for a specific participant ──────────────────────────────────

@router.get(
    "/participant/{clnt_token}",
    summary="All trades (buy + sell) for a given exchange client token",
)
def participant_trades(
    clnt_token:  int,
    date_from:   Optional[date] = Query(None),
    date_to:     Optional[date] = Query(None),
    page:        int = Query(1, ge=1),
    page_size:   int = Query(50, ge=1, le=500),
    svc: FactTradesService = Depends(_get_service),
):
    result = svc.get_participant_trades(clnt_token, date_from, date_to, page, page_size)
    return {
        "client_token": result["client_token"],
        "data":         [FactTradeBase.model_validate(r) for r in result["data"]],
        "pagination":   result["pagination"],
    }


# ── 6. Single trade detail by composite PK ───────────────────────────────────

@router.get(
    "/{trd_date}/{trd_num}",
    summary="Full detail for a single trade (composite PK lookup)",
)
def get_trade_detail(
    trd_date:   date,
    trd_num:    int,
    cmp_token:  int = Query(..., description="Company token (part of composite PK)"),
    prd_token:  int = Query(..., description="Product token (part of composite PK)"),
    exch_token: int = Query(..., description="Exchange token"),
    seg_token:  int = Query(..., description="Segment token"),
    svc: FactTradesService = Depends(_get_service),
):
    trade = svc.get_trade_detail(
        trd_date, trd_num, cmp_token, prd_token, exch_token, seg_token
    )
    if trade is None:
        raise HTTPException(status_code=404, detail="Trade not found")
    return FactTradeDetail.model_validate(trade)
