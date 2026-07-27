"""
backend/schemas/common.py
────────────────────────────────────────────────────────────────────────────
Shared Pydantic v2 schemas, enums, and pagination helpers used across
all API modules.
"""

from enum import IntEnum
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


# ── Enumerations mirroring Teradata domain codes ──────────────────────────────

class SessionType(IntEnum):
    PRE_OPEN    = 1
    MARKET_OPEN = 2
    CLOSE       = 3


class SubSegCode(IntEnum):
    EQ      = 1
    FUTURES = 2
    CALL    = 3
    PUT     = 4


class AccountType(IntEnum):
    CLIENT = 1
    OWN    = 2
    INST   = 3


class BookType(IntEnum):
    NORMAL   = 1
    STOPLOSS = 2


class PriceType(IntEnum):
    LIMIT  = 1
    MARKET = 2
    SLL    = 3
    SLM    = 4


class TimeType(IntEnum):
    DAY = 1
    IOC = 2
    GTC = 3
    GTD = 4


class TrigType(IntEnum):
    NOT_TRIGGERED           = 0
    TRIGGERED               = 1
    TRIGGERED_ON_MODIFY     = 2


class QtyType(IntEnum):
    AON  = 1
    FOK  = 2
    NONE = 3


class OrdType(IntEnum):
    MF              = 1
    BASKET          = 2
    FILL_OR_CONVERT = 3
    NONE            = 4


class LTPChangeIndc(str):
    UP     = "U"
    DOWN   = "D"
    NO_CHG = "N"


class ClientCatgType(IntEnum):
    INDIVIDUAL        = 1
    PARTNERSHIP       = 2
    HUF               = 3
    CORPORATE         = 4
    TRUST             = 5
    MUTUAL_FUND       = 6
    DFI               = 7
    BANK              = 8
    INSURANCE         = 9
    STATUTORY         = 10
    NRI               = 11
    FII               = 12
    OCB               = 13
    FDI_VC            = 14
    PMS               = 15
    NPS               = 16
    NON_TAXPAYING     = 17
    OTHERS            = 18


# ── Pagination ─────────────────────────────────────────────────────────────────

class PaginationMeta(BaseModel):
    page:        int
    page_size:   int
    total:       int
    total_pages: int


class PagedResponse(BaseModel, Generic[T]):
    data:       list[T]
    pagination: PaginationMeta

    model_config = {"arbitrary_types_allowed": True}


# ── Sort helpers ───────────────────────────────────────────────────────────────

class SortDirection(str):
    ASC  = "asc"
    DESC = "desc"
