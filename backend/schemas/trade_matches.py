"""
backend/schemas/trade_matches.py
────────────────────────────────────────────────────────────────────────────
Pydantic v2 schemas for trade surveillance and execution match endpoints.
Standard institutional relational attributes.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ── Read schema (returned by APIs) ────────────────────────────────────────────

class TradeMatchRecord(BaseModel):
    """Standard fields returned in trade surveillance list responses."""
    trade_date:                 date
    trade_number:               int
    symbol:                     str
    series:                     Optional[str] = "EQ"
    segment_code:               int = 1
    session_type:               int = 2
    trade_timestamp:            datetime
    trade_price:                Decimal
    trade_quantity:             Decimal
    trade_value:                Decimal
    buyer_broker_id:            int = 0
    buyer_client_token:         int = 0
    seller_broker_id:           int = 0
    seller_client_token:        int = 0
    buyer_account_type:         int = 1
    seller_account_type:        int = 1
    is_same_broker_wash:        int = 0
    is_diff_broker_wash:        int = 0
    is_algo_trade:              Optional[int] = 0
    is_dma_trade:               Optional[int] = 0
    ltp_change_indicator:       str = "N"
    last_trade_price:           Decimal = Decimal("0.0")
    initiator_side:             int = 1
    exchange:                   str = "NSE"

    model_config = {"from_attributes": True}


class TradeMatchDetail(TradeMatchRecord):
    """Full detail including order-level and market depth metrics."""
    buyer_order_number:         Optional[int] = None
    buyer_order_timestamp:      Optional[datetime] = None
    buyer_order_price:          Optional[Decimal] = None
    buyer_order_quantity:       Optional[Decimal] = None
    seller_order_number:        Optional[int] = None
    seller_order_timestamp:     Optional[datetime] = None
    seller_order_price:         Optional[Decimal] = None
    seller_order_quantity:      Optional[Decimal] = None
    best_bid_price:             Optional[Decimal] = None
    best_ask_price:             Optional[Decimal] = None
    best_bid_quantity:          Optional[Decimal] = None
    best_ask_quantity:          Optional[Decimal] = None
    bid_pending_order_quantity: Optional[Decimal] = None
    ask_pending_order_quantity: Optional[Decimal] = None


# ── Filter schema (used by query endpoints) ───────────────────────────────────

class TradeMatchesFilter(BaseModel):
    symbol:              Optional[str]  = Field(None, description="Filter by symbol e.g. NOVAENERGY")
    date_from:           Optional[date] = Field(None, description="Inclusive start date (YYYY-MM-DD)")
    date_to:             Optional[date] = Field(None, description="Inclusive end date (YYYY-MM-DD)")
    session_type:        Optional[int]  = Field(None, description="1=Pre-Open, 2=Market, 3=Close")
    segment_code:        Optional[int]  = Field(None, description="1=EQ, 2=Futures, 3=Call, 4=Put")
    account_type:        Optional[int]  = Field(None, description="1=Client, 2=Own, 3=Inst")
    wash_flag:           Optional[int]  = Field(None, description="1=only wash trades, 0=exclude wash trades")
    algo_flag:           Optional[int]  = Field(None, description="0=algo orders, 1=non-algo")
    buyer_broker_id:     Optional[int]  = Field(None, description="Filter by buying broker ID")
    seller_broker_id:    Optional[int]  = Field(None, description="Filter by selling broker ID")
    buyer_client_token:  Optional[int]  = Field(None, description="Filter by buying client token")
    seller_client_token: Optional[int]  = Field(None, description="Filter by selling client token")
    series:              Optional[str]  = Field(None, description="Series e.g. EQ")
    sort_by:             str            = Field("trade_timestamp", description="Column to sort by")
    sort_dir:            Literal["asc", "desc"] = Field("desc", description="Sort direction")


# ── Wash trade summary ────────────────────────────────────────────────────────

class WashTradeSummary(BaseModel):
    symbol:             str
    trade_date:         date
    wash_trade_count:   int
    wash_trade_value:   Decimal
    total_trade_count:  int
    wash_pct:           float

    model_config = {"from_attributes": True}


# ── Algo breakdown ─────────────────────────────────────────────────────────────

class AlgoBreakdown(BaseModel):
    symbol:         str
    algo_count:     int
    manual_count:   int
    dma_count:      int
    total_count:    int
    algo_pct:       float
    dma_pct:        float

    model_config = {"from_attributes": True}


# ── Participant trades ─────────────────────────────────────────────────────────

class ParticipantTradeSummary(BaseModel):
    buyer_client_token: int
    trade_count:        int
    buy_value:          Decimal
    sell_value:         Decimal
    net_value:          Decimal
    symbols_traded:     list[str]

    model_config = {"from_attributes": True}
