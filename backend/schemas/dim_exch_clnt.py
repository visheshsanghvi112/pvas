"""
backend/schemas/dim_exch_clnt.py
────────────────────────────────────────────────────────────────────────────
Pydantic v2 schemas for DIM_EXCH_CLNT_DTLS (DECL) — Client Exchange Accounts.
"""

from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class DimExchClntBase(BaseModel):
    """Core fields returned in list responses."""
    Decl_Exch_Clnt_Token:   int
    Decl_Clnt_Token:        int
    Decl_TM_Id:             str
    Decl_Clnt_Id:           str
    Decl_Client_Code:       str
    Decl_Clnt_Pan:          Optional[str] = None
    Decl_Clnt_Name:         Optional[str] = None
    Decl_Frst_Name:         Optional[str] = None
    Decl_Last_Name:         Optional[str] = None
    Decl_Clnt_Catg_Type:    Optional[int] = None
    Decl_Clnt_Catg_Type_Desc: Optional[str] = None
    Decl_Clnt_Stat:         Optional[int] = None
    Decl_Clnt_Stat_Indc:    Optional[str] = None
    Decl_City:              Optional[str] = None
    Decl_State:             Optional[str] = None
    Decl_Cntry:             Optional[str] = None
    Decl_Frst_Email_Id:     Optional[str] = None
    Decl_Frst_Mob_Num:      Optional[str] = None
    Decl_Rec_Date:          date
    Decl_Exch_Id:           str
    Decl_Seg_Id:            str

    model_config = {"from_attributes": True}


class DimExchClntDetail(DimExchClntBase):
    """Full detail record."""
    Decl_Exch_Token:        int
    Decl_Seg_Token:         int
    Decl_Exch_TM_Token:     int
    Decl_Clnt_Uid:          Optional[str] = None
    Decl_Clnt_UCC:          Optional[str] = None
    Decl_Clnt_Mapin:        Optional[str] = None
    Decl_Mid_Name:          Optional[str] = None
    Decl_Ftr_Hus_Name:      Optional[str] = None
    Decl_Birth_Date:        Optional[date] = None
    Decl_Frst_Addr_Line:    Optional[str] = None
    Decl_Scnd_Addr_Line:    Optional[str] = None
    Decl_Thrd_Addr_Line:    Optional[str] = None
    Decl_Pin:               Optional[str] = None
    Decl_Bank_Name:         Optional[str] = None
    Decl_Bank_Acct_Type:    Optional[int] = None
    Decl_Agmt_Date:         Optional[date] = None
    Decl_Dep_Id:            Optional[str] = None
    Decl_Dep_Name:          Optional[str] = None
    Decl_Dp_Id:             Optional[str] = None
    Decl_BO_Id:             Optional[str] = None
    Decl_Clnt_Acct_Type:    Optional[int] = None
    Decl_Clnt_Acct_Type_Desc: Optional[str] = None
    Decl_Dmat_Acct_Num:     Optional[str] = None


