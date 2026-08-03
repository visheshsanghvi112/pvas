"""
backend/schemas/trade_matches.py
────────────────────────────────────────────────────────────────────────────
Pydantic v2 schemas for trade execution match endpoints.
"""

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ── Read schema (returned by APIs) ────────────────────────────────────────────

class FactTradeBase(BaseModel):
    """Minimal fields always returned in list responses."""
    Ftrd_Trd_Date:              date
    Ftrd_Trd_Num:               int
    Ftrd_Symbol:                str
    Ftrd_Series:                Optional[str] = None
    Ftrd_Sub_Seg_Code:          int
    Ftrd_Sess_Type:             int
    Ftrd_Trd_Tmst:              datetime
    Ftrd_Trd_Price:             Decimal
    Ftrd_Trd_Qty:               Decimal
    Ftrd_Trd_Val:               Decimal
    Ftrd_Buy_Exch_TM_Token:     int = 0
    Ftrd_Buy_Exch_Clnt_Token:   int = 0
    Ftrd_Sell_Exch_TM_Token:    int = 0
    Ftrd_Sell_Exch_Clnt_Token:  int = 0
    Ftrd_Buy_Acct_Type:         int = 1
    Ftrd_Sell_Acct_Type:        int = 1
    Ftrd_Same_Broker_Wash_Flag: int = 0
    Ftrd_Diff_Broker_Wash_Flag: int = 0
    Ftrd_Buy_CTCL_Algo_Flag:    Optional[int] = None
    Ftrd_Sell_CTCL_Algo_Flag:   Optional[int] = None
    Ftrd_Buy_CTCL_Inet_DMA_Flag:Optional[int] = None
    Ftrd_Sell_CTCL_Inet_DMA_Flag:Optional[int] = None
    Ftrd_LTP_Chng_Indc:         str = "N"
    Ftrd_Last_Trd_Price:        Decimal = Decimal("0.0")
    Ftrd_Init_Side_Type:        int = 1
    Ftrd_Trd_Mod_Flag:          int = 0
    Ftrd_Trd_Can_Flag:          int = 0

    model_config = {"from_attributes": True}


class FactTradeDetail(FactTradeBase):
    """Full detail including order-level and depth fields."""
    Ftrd_Cmp_Token:             int
    Ftrd_Trd_Prd_Token:         int
    Ftrd_Exch_Token:            int
    Ftrd_Seg_Token:             int
    Ftrd_Trd_Time:              Optional[time] = None
    Ftrd_Buy_Trdr_Token:        int
    Ftrd_Sell_Trdr_Token:       int
    Ftrd_Lot_Qty:               Optional[Decimal] = None
    Ftrd_Tick_Price:            Optional[Decimal] = None
    Ftrd_Buy_Ord_Num:           int
    Ftrd_Buy_CA_Catg:           Optional[str] = None
    Ftrd_Buy_CP_Flag:           Optional[str] = None
    Ftrd_Buy_CTCL_Ref:          Optional[str] = None
    Ftrd_Buy_IP_Addr:           Optional[str] = None
    Ftrd_Buy_Ord_Tmst:          datetime
    Ftrd_Buy_Ord_Price:         Decimal
    Ftrd_Buy_Ord_Qty:           Decimal
    Ftrd_Buy_Trig_Price:        Optional[Decimal] = None
    Ftrd_Buy_Book_Type:         int
    Ftrd_Buy_Price_Type:        int
    Ftrd_Buy_Mkt_Flag:          str
    Ftrd_Buy_Stop_Flag:         Optional[str] = None
    Ftrd_Buy_Time_Type:         int
    Ftrd_Buy_Trig_Type:         int
    Ftrd_Buy_FOK_Flag:          str
    Ftrd_Buy_Qty_Type:          int
    Ftrd_Buy_Ord_Type:          int
    Ftrd_Sell_Ord_Num:          int
    Ftrd_Sell_CA_Catg:          Optional[str] = None
    Ftrd_Sell_CP_Flag:          Optional[str] = None
    Ftrd_Sell_CTCL_Ref:         Optional[str] = None
    Ftrd_Sell_IP_Addr:          Optional[str] = None
    Ftrd_Sell_Ord_Tmst:         datetime
    Ftrd_Sell_Ord_Price:        Decimal
    Ftrd_Sell_Ord_Qty:          Decimal
    Ftrd_Sell_Trig_Price:       Optional[Decimal] = None
    Ftrd_Sell_Book_Type:        int
    Ftrd_Sell_Price_Type:       int
    Ftrd_Sell_MKt_Flag:         str
    Ftrd_Sell_Stop_Flag:        Optional[str] = None
    Ftrd_Sell_Time_Type:        int
    Ftrd_Sell_Trig_Type:        int
    Ftrd_Sell_FOK_Flag:         str
    Ftrd_Sell_Qty_Type:         int
    Ftrd_Sell_Ord_Type:         int
    Ftrd_Buy_Spread_Indc:       Optional[str] = None
    Ftrd_Sell_Spread_Indc:      Optional[str] = None
    Ftrd_Buy_Spread_Flag:       int
    Ftrd_Sell_Spread_Flag:      int
    Ftrd_Init_Clnt_Token:       int
    Ftrd_Buy_Sell_Diff_Price:   Optional[Decimal] = None
    Ftrd_Buy_Sell_Diff_Qty:     Optional[Decimal] = None
    Ftrd_Best_Bid_Price:        Decimal
    Ftrd_Best_Ask_Price:        Decimal
    Ftrd_Best_Bid_Qty:          Decimal
    Ftrd_Best_Ask_Qty:          Decimal
    Ftrd_Best_Bid_Ord_Cnt:      int
    Ftrd_Best_Ask_Ord_Cnt:      int
    Ftrd_Bid_Pdg_Ord_Cnt:       int
    Ftrd_Ask_Pdg_Ord_Cnt:       int
    Ftrd_Bid_Pdg_Ord_Qty:       Decimal
    Ftrd_Ask_Pdg_Ord_Qty:       Decimal
    Ftrd_Bid_Pdg_Ord_Val:       Decimal
    Ftrd_Ask_Pdg_Ord_Val:       Decimal
    Ftrd_Last_Estd_Hi_Price:    Optional[Decimal] = None
    Ftrd_Last_Estd_Low_Price:   Optional[Decimal] = None
    FTRD_BUY_ALGO_ID:           Optional[str] = None
    FTRD_SELL_ALGO_ID:          Optional[str] = None
    FTRD_BUY_ALGO_CATG_TYPE:    Optional[int] = None
    FTRD_SELL_ALGO_CATG_TYPE:   Optional[int] = None


# ── Filter schema (used by query endpoints) ───────────────────────────────────

class TradeMatchesFilter(BaseModel):
    symbol:         Optional[str]  = Field(None, description="Filter by NSE symbol e.g. ALPHATECH")
    date_from:      Optional[date] = Field(None, description="Inclusive start date (YYYY-MM-DD)")
    date_to:        Optional[date] = Field(None, description="Inclusive end date (YYYY-MM-DD)")
    sess_type:      Optional[int]  = Field(None, description="1=Pre-Open, 2=Market, 3=Close")
    sub_seg_code:   Optional[int]  = Field(None, description="1=EQ, 2=Futures, 3=Call, 4=Put")
    acct_type:      Optional[int]  = Field(None, description="1=Client, 2=Own, 3=Inst (applies to buy side)")
    wash_flag:      Optional[int]  = Field(None, description="1=only wash trades, 0=exclude wash trades")
    algo_flag:      Optional[int]  = Field(None, description="0=algo orders, 1=non-algo (buy side CTCL flag)")
    buy_tm_token:   Optional[int]  = Field(None, description="Filter by buying TM token")
    sell_tm_token:  Optional[int]  = Field(None, description="Filter by selling TM token")
    buy_clnt_token: Optional[int]  = Field(None, description="Filter by buying client exchange token")
    sell_clnt_token:Optional[int]  = Field(None, description="Filter by selling client exchange token")
    series:         Optional[str]  = Field(None, description="Series e.g. EQ, BE")
    sort_by:        str            = Field("Ftrd_Trd_Tmst", description="Column to sort by")
    sort_dir:       Literal["asc", "desc"] = Field("desc", description="Sort direction")


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
    Ftrd_Buy_Exch_Clnt_Token:   int
    trade_count:                int
    buy_value:                  Decimal
    sell_value:                 Decimal
    net_value:                  Decimal
    symbols_traded:             list[str]

    model_config = {"from_attributes": True}
