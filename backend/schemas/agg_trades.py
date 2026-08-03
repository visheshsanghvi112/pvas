"""
backend/schemas/agg_trades.py
────────────────────────────────────────────────────────────────────────────
Pydantic schemas for Trade Aggregate responses (AGG_SEC_DAY, AGG_CLNT_SEC_DAY, AGG_PAN_PAIR_DAY).
"""

from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AggSecDaySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    Asd_Date: date
    Asd_Symbol: Optional[str] = None
    Asd_Cmp_Token: int
    Asd_Trd_Prd_Token: int
    Asd_Open_Price: Decimal
    Asd_Close_Price: Decimal
    Asd_High_Price: Decimal
    Asd_Low_Price: Decimal
    Asd_Prev_Close_Price: Optional[Decimal] = None
    Asd_Tot_Qty: Decimal
    Asd_Tot_Val: Decimal
    Asd_Tot_Cnt: int
    Asd_Tot_Wash_Qty: Optional[Decimal] = None
    Asd_Tot_Wash_Cnt: Optional[int] = None
    Asd_Low_Crct_Price: Optional[Decimal] = None
    Asd_Upp_Crct_Price: Optional[Decimal] = None
    Asd_52_Week_High_Price: Optional[Decimal] = None
    Asd_52_Week_Low_Price: Optional[Decimal] = None


class AggClntSecDaySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    Acsd_Date: date
    Acsd_Cmp_Token: int
    Acsd_Exch_Clnt_Token: int
    Acsd_Clnt_Token: int
    Acsd_Buy_Tot_Qty: Optional[Decimal] = None
    Acsd_Sell_Tot_Qty: Optional[Decimal] = None
    Acsd_Buy_Tot_Val: Optional[Decimal] = None
    Acsd_Sell_Tot_Val: Optional[Decimal] = None
    Acsd_Buy_Tot_Cnt: Optional[int] = None
    Acsd_Pos_Cont_Val: Optional[Decimal] = None
    Acsd_Neg_Cont_Val: Optional[Decimal] = None
    Acsd_Net_Cont_Val: Optional[Decimal] = None


class AggPanPairDaySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    Appd_Date: date
    Appd_Cmp_Token: int
    Appd_Exch_Clnt_Token: int
    Appd_Cpty_Exch_Clnt_Token: int
    Appd_Exch_TM_Token: int
    Appd_Cpty_Exch_TM_Token: int
    Appd_Matched_Qty: Optional[Decimal] = None
    Appd_Matched_Val: Optional[Decimal] = None
    Appd_Pos_Contri: Optional[Decimal] = None
    Appd_Neg_Contri: Optional[Decimal] = None
    Appd_Net_Contri: Optional[Decimal] = None
    Appd_Buy_Tot_Qty: Optional[Decimal] = None
    Appd_Buy_Tot_Val: Optional[Decimal] = None
    Appd_Buy_Tot_Cnt: Optional[int] = None
