"""
backend/routers/clients.py
────────────────────────────────────────────────────────────────────────────
FastAPI router for client data:
  /api/v1/clients/exchange    → DIM_EXCH_CLNT_DTLS (DECL)
  /api/v1/clients/depository  → DIM_DEP_CLNT_DTLS  (DDCL)
  /api/v1/clients/profile/{token} → full cross-referenced profile
  /api/v1/clients/pan/{pan}   → ClientDetail lookup by PAN (frontend fetchClient360)
"""

from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.schemas.dim_exch_clnt import DimExchClntBase, DimExchClntDetail, DimExchClntFilter
from backend.schemas.dim_dep_clnt import DimDepClntBase, DimDepClntDetail, DimDepClntFilter
from backend.services.client_service import ClientService

router = APIRouter(
    prefix="/api/v1/clients",
    tags=["Clients — Exchange & Depository Accounts"],
)


def _get_service(db: Session = Depends(get_db)) -> ClientService:
    return ClientService(db)


# ═══════════════════════════════════════════════════════════════════════════════
#  EXCHANGE CLIENTS  (DIM_EXCH_CLNT_DTLS / DECL)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/exchange",
    summary="List exchange client accounts with filters, pagination, and sorting",
)
def list_exchange_clients(
    pan:        Optional[str] = Query(None, description="Client PAN (partial match)"),
    tm_id:      Optional[str] = Query(None, description="Trading Member ID"),
    clnt_id:    Optional[str] = Query(None, description="Client ID"),
    name:       Optional[str] = Query(None, description="Client name (partial match)"),
    catg_type:  Optional[int] = Query(None),
    stat:       Optional[int] = Query(None, description="1=Active 2=Suspended"),
    city:       Optional[str] = Query(None),
    exch_id:    Optional[str] = Query(None, description="e.g. NSE or BSE"),
    sort_by:    str           = Query("Decl_Exch_Clnt_Token"),
    sort_dir:   Literal["asc", "desc"] = Query("asc"),
    page:       int = Query(1, ge=1),
    page_size:  int = Query(50, ge=1, le=500),
    svc: ClientService = Depends(_get_service),
):
    filters = DimExchClntFilter(
        pan=pan, tm_id=tm_id, clnt_id=clnt_id, name=name,
        catg_type=catg_type, stat=stat, city=city, exch_id=exch_id,
        sort_by=sort_by, sort_dir=sort_dir,
    )
    result = svc.list_exchange_clients(filters, page, page_size)
    return {
        "data":       [DimExchClntBase.model_validate(r) for r in result["data"]],
        "pagination": result["pagination"],
    }


@router.get(
    "/exchange/search",
    summary="Full-text search across PAN, client ID, and name",
)
def search_exchange_clients(
    q:     str = Query(..., min_length=2, description="Search term"),
    limit: int = Query(20, ge=1, le=100),
    svc: ClientService = Depends(_get_service),
):
    results = svc.search_exchange_clients(q, limit)
    return [DimExchClntBase.model_validate(r) for r in results]


@router.get(
    "/exchange/{token}",
    summary="Full detail for a single exchange client account",
)
def get_exchange_client(
    token: int,
    svc: ClientService = Depends(_get_service),
):
    client = svc.get_exchange_client(token)
    if client is None:
        raise HTTPException(status_code=404, detail=f"Exchange client {token} not found")
    return DimExchClntDetail.model_validate(client)


# ═══════════════════════════════════════════════════════════════════════════════
#  DEPOSITORY CLIENTS  (DIM_DEP_CLNT_DTLS / DDCL)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/depository",
    summary="List depository client accounts with filters, pagination, and sorting",
)
def list_depository_clients(
    pan:        Optional[str] = Query(None),
    clnt_id:    Optional[str] = Query(None),
    name:       Optional[str] = Query(None),
    dep_token:  Optional[int] = Query(None, description="1=NSDL 2=CDSL"),
    catg_type:  Optional[int] = Query(None),
    stat:       Optional[int] = Query(None),
    sort_by:    str           = Query("Ddcl_Dep_Clnt_Token"),
    sort_dir:   Literal["asc", "desc"] = Query("asc"),
    page:       int = Query(1, ge=1),
    page_size:  int = Query(50, ge=1, le=500),
    svc: ClientService = Depends(_get_service),
):
    filters = DimDepClntFilter(
        pan=pan, clnt_id=clnt_id, name=name,
        dep_token=dep_token, catg_type=catg_type, stat=stat,
        sort_by=sort_by, sort_dir=sort_dir,
    )
    result = svc.list_depository_clients(filters, page, page_size)
    return {
        "data":       [DimDepClntBase.model_validate(r) for r in result["data"]],
        "pagination": result["pagination"],
    }


@router.get(
    "/depository/search",
    summary="Full-text search across PAN, client ID, and name",
)
def search_depository_clients(
    q:     str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=100),
    svc: ClientService = Depends(_get_service),
):
    results = svc.search_depository_clients(q, limit)
    return [DimDepClntBase.model_validate(r) for r in results]


@router.get(
    "/depository/{token}",
    summary="Full detail for a single depository client account",
)
def get_depository_client(
    token: int,
    svc: ClientService = Depends(_get_service),
):
    client = svc.get_depository_client(token)
    if client is None:
        raise HTTPException(status_code=404, detail=f"Depository client {token} not found")
    return DimDepClntDetail.model_validate(client)


# ═══════════════════════════════════════════════════════════════════════════════
#  CROSS-REFERENCE PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/profile/{exch_clnt_token}",
    summary="Full client profile: exchange account + linked depository accounts",
)
def get_client_profile(
    exch_clnt_token: int,
    svc: ClientService = Depends(_get_service),
):
    profile = svc.get_full_client_profile(exch_clnt_token)
    if "error" in profile:
        raise HTTPException(status_code=404, detail=profile["error"])

    return {
        "exchange_account":    DimExchClntDetail.model_validate(profile["exchange_account"]),
        "depository_accounts": [
            DimDepClntBase.model_validate(d) for d in profile["depository_accounts"]
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  PAN LOOKUP  (ClientDetail — used by frontend fetchClient360)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/pan/{pan}",
    summary="Client 360 lookup by PAN — returns ClientDetail for the frontend",
)
def get_client_by_pan(
    pan: str,
    svc: ClientService = Depends(_get_service),
):
    result = svc.get_client_by_pan(pan)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
