"""
backend/routers/agg_trades.py
────────────────────────────────────────────────────────────────────────────
FastAPI Router for Trade Aggregates (AGG_SEC_DAY, AGG_CLNT_SEC_DAY, AGG_PAN_PAIR_DAY).
Exposes endpoints for security daily VWAP closing prices, client volume shares, and PAN pair matrices.
"""

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.schemas.agg_trades import AggSecDaySchema, AggClntSecDaySchema, AggPanPairDaySchema
from backend.services.agg_trades_service import AggTradesService

router = APIRouter(prefix="/api/aggregates", tags=["Trade Aggregates"])
v1_router = APIRouter(prefix="/api/v1/agg-trades", tags=["Trade Aggregates V1"])


def _get_security_aggregates_impl(symbol: str, start_date: Optional[date], end_date: Optional[date], limit: int, db: Session):
    service = AggTradesService(db)
    return service.get_security_daily_history(symbol.upper(), start_date, end_date, limit)


def _get_client_aggregates_impl(cmp_token: Optional[int], clnt_token: Optional[int], target_date: Optional[date], limit: int, db: Session):
    service = AggTradesService(db)
    return service.get_client_daily_history(cmp_token, clnt_token, target_date, limit)


def _get_pan_pair_matrix_impl(cmp_token: Optional[int], buy_clnt_token: Optional[int], sell_clnt_token: Optional[int], target_date: Optional[date], limit: int, db: Session):
    service = AggTradesService(db)
    return service.get_pan_pair_matrix(cmp_token, buy_clnt_token, sell_clnt_token, target_date, limit)


@router.get("/security/{symbol}", response_model=List[AggSecDaySchema])
def get_security_aggregates(
    symbol: str,
    start_date: Optional[date] = Query(None, description="Filter from start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter to end date (YYYY-MM-DD)"),
    limit: int = Query(260, ge=1, le=1000, description="Max records to return"),
    db: Session = Depends(get_db)
):
    """Fetch daily security aggregates including 30-minute VWAP Closing Prices, OHLC bars, and volume totals."""
    return _get_security_aggregates_impl(symbol, start_date, end_date, limit, db)


@v1_router.get("/security/{symbol}", response_model=List[AggSecDaySchema])
def get_security_aggregates_v1(
    symbol: str,
    start_date: Optional[date] = Query(None, description="Filter from start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter to end date (YYYY-MM-DD)"),
    limit: int = Query(260, ge=1, le=1000, description="Max records to return"),
    db: Session = Depends(get_db)
):
    return _get_security_aggregates_impl(symbol, start_date, end_date, limit, db)


@router.get("/client", response_model=List[AggClntSecDaySchema])
def get_client_aggregates(
    cmp_token: Optional[int] = Query(None, description="Company Security Token"),
    clnt_token: Optional[int] = Query(None, description="Exchange Client Token"),
    target_date: Optional[date] = Query(None, description="Filter date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: Session = Depends(get_db)
):
    """Fetch client-level daily volume share and LTP price push contribution aggregates."""
    return _get_client_aggregates_impl(cmp_token, clnt_token, target_date, limit, db)


@v1_router.get("/client", response_model=List[AggClntSecDaySchema])
def get_client_aggregates_v1(
    cmp_token: Optional[int] = Query(None, description="Company Security Token"),
    clnt_token: Optional[int] = Query(None, description="Exchange Client Token"),
    target_date: Optional[date] = Query(None, description="Filter date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: Session = Depends(get_db)
):
    return _get_client_aggregates_impl(cmp_token, clnt_token, target_date, limit, db)


@router.get("/pan_pair", response_model=List[AggPanPairDaySchema])
def get_pan_pair_matrix(
    cmp_token: Optional[int] = Query(None, description="Company Security Token"),
    buy_clnt_token: Optional[int] = Query(None, description="Buyer Client Exchange Token"),
    sell_clnt_token: Optional[int] = Query(None, description="Seller Client Exchange Token"),
    target_date: Optional[date] = Query(None, description="Filter date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: Session = Depends(get_db)
):
    """Fetch buyer-seller PAN pair trade concentration matrix and matched turnover values."""
    return _get_pan_pair_matrix_impl(cmp_token, buy_clnt_token, sell_clnt_token, target_date, limit, db)


@v1_router.get("/pan_pair", response_model=List[AggPanPairDaySchema])
def get_pan_pair_matrix_v1(
    cmp_token: Optional[int] = Query(None, description="Company Security Token"),
    buy_clnt_token: Optional[int] = Query(None, description="Buyer Client Exchange Token"),
    sell_clnt_token: Optional[int] = Query(None, description="Seller Client Exchange Token"),
    target_date: Optional[date] = Query(None, description="Filter date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: Session = Depends(get_db)
):
    return _get_pan_pair_matrix_impl(cmp_token, buy_clnt_token, sell_clnt_token, target_date, limit, db)

