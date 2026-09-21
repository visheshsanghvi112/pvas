"""
backend/schemas/clients.py
────────────────────────────────────────────────────────────────────────────
Pydantic v2 schemas for ClientIdentityMaster and ClientDematAccount entities.
"""

from __future__ import annotations

from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field


class ClientDematAccountSchema(BaseModel):
    account_id:          int
    client_pan:          str
    depository_id:       str
    beneficiary_acc_no:  str
    account_open_date:   date
    joint_holder_pan_2:  Optional[str] = None
    joint_holder_pan_3:  Optional[str] = None
    is_poa_active:       bool = False
    bank_account_masked: Optional[str] = None

    model_config = {"from_attributes": True}


class ClientIdentitySchema(BaseModel):
    client_pan:          str
    client_legal_name:   str
    entity_type:         str
    account_state:       str = "ACTIVE"
    residential_city:    Optional[str] = None
    registration_date:   date
    risk_profile_grade:  str = "STANDARD"
    demat_accounts:      List[ClientDematAccountSchema] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class Client360Detail(BaseModel):
    pan:                 str
    clnt_id:             str
    tm_id:               str
    name:                str
    category:            str
    client_code:         str
    city:                str
    risk_grade:          str
    terminals:           List[str] = Field(default_factory=list)
    depository_accounts: List[dict] = Field(default_factory=list)
