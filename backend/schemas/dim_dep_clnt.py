"""
backend/schemas/dim_dep_clnt.py
────────────────────────────────────────────────────────────────────────────
Pydantic v2 schemas for DIM_DEP_CLNT_DTLS (DDCL) — Client Depository Accounts.
"""

from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field


class DimDepClntBase(BaseModel):
    """Core fields returned in list responses."""
    Ddcl_Dep_Clnt_Token:    int
    Ddcl_Clnt_Token:        int
    Ddcl_Dep_Token:         int
    Ddcl_BP_Id:             str
    Ddcl_Clnt_Id:           str
    Ddcl_Clnt_Pan:          Optional[str] = None
    Ddcl_Clnt_Name:         Optional[str] = None
    Ddcl_Clnt_Shrt_Name:    Optional[str] = None
    Ddcl_Clnt_Catg_Type:    Optional[int] = None
    Ddcl_Clnt_Catg_Type_Desc: Optional[str] = None
    Ddcl_Clnt_Stat:         Optional[int] = None
    Ddcl_Clnt_Stat_Desc:    Optional[str] = None
    Ddcl_City:              Optional[str] = None
    Ddcl_Cntry:             Optional[str] = None
    Ddcl_Frst_Email_Id:     Optional[str] = None
    Ddcl_Acct_Openng_Date:  Optional[date] = None
    Ddcl_Rec_Date:          date

    model_config = {"from_attributes": True}


class DimDepClntDetail(DimDepClntBase):
    """Full detail record."""
    Ddcl_BP_Token:          int
    Ddcl_Clnt_Code:         Optional[str] = None
    Ddcl_Clnt_Uniq_Id:      Optional[str] = None
    Ddcl_Clnt_Mapin:        Optional[str] = None
    Ddcl_Clnt_SubCatg_Type_Desc: Optional[str] = None
    Ddcl_Clnt_Acct_Type_Desc:    Optional[str] = None
    Ddcl_Clnt_SubCatg_Type:      Optional[int] = None
    Ddcl_Clnt_Acct_Type:         Optional[int] = None
    Ddcl_Ftr_Hus_Name:           Optional[str] = None
    Ddcl_Sex:               Optional[str] = None
    Ddcl_Ntnlty_Desc:       Optional[str] = None
    Ddcl_Birth_Date:        Optional[date] = None
    Ddcl_Frst_Addr_Line:    Optional[str] = None
    Ddcl_Scnd_Addr_Line:    Optional[str] = None
    Ddcl_City:              Optional[str] = None
    Ddcl_State:             Optional[str] = None
    Ddcl_Pin:               Optional[str] = None
    Ddcl_Frst_Tele_Num:     Optional[str] = None
    Ddcl_Bank_Name:         Optional[str] = None
    Ddcl_Bank_Acct_Type:    Optional[int] = None
    Ddcl_Acct_Closr_Date:   Optional[date] = None
    Ddcl_Scnd_Hldr_Clnt_Token: Optional[int] = None
    Ddcl_Scnd_Hldr_Name:    Optional[str] = None
    Ddcl_Thrd_Hldr_Clnt_Token: Optional[int] = None
    Ddcl_Thrd_Hldr_Name:    Optional[str] = None
    Ddcl_Regulatory_Reg_Num:      Optional[str] = None
    Ddcl_BO_Exch_Id:        Optional[str] = None
    Ddcl_BO_CM_Id:          Optional[str] = None
    Ddcl_Exch_Clnt_Id:      Optional[str] = None


