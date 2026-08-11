"""
backend/routers/clients.py
────────────────────────────────────────────────────────────────────────────
Minimal client router — exposes only the PAN lookup endpoint used by the
investigation workspace's Client 360 drawer (fetchClient360 in lib/api.ts).

  /api/v1/clients/pan/{pan}  → ClientDetail (investigation workspace only)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.services.client_service import ClientService
from backend.security import get_current_user

router = APIRouter(
    prefix="/api/v1/clients",
    tags=["Clients — PAN Lookup"],
    dependencies=[Depends(get_current_user)]
)


def _get_service(db: Session = Depends(get_db)) -> ClientService:
    return ClientService(db)


# ── PAN Lookup ────────────────────────────────────────────────────────────────
# Used exclusively by the investigation workspace's "Participants" tab
# when an officer clicks a PAN to open the Client 360 drawer.

@router.get(
    "/pan/{pan}",
    summary="Client 360 lookup by PAN — returns ClientDetail for the investigation workspace",
)
def get_client_by_pan(
    pan: str,
    svc: ClientService = Depends(_get_service),
):
    result = svc.get_client_by_pan(pan)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
