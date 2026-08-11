"""
backend/services/client_service.py
────────────────────────────────────────────────────────────────────────────
Minimal client service — provides only the PAN lookup used by the
investigation workspace's Client 360 drawer.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from backend.repositories.dim_exch_clnt_repo import DimExchClntRepository
from backend.repositories.dim_dep_clnt_repo import DimDepClntRepository


class ClientService:

    def __init__(self, db: Session) -> None:
        self._exch_repo = DimExchClntRepository(db)
        self._dep_repo  = DimDepClntRepository(db)

    def get_client_by_pan(self, pan: str) -> dict[str, Any]:
        """
        Returns a ClientDetail-shaped dict for the frontend fetchClient360 call.
        Looks up exchange account(s) by PAN, then cross-references depository accounts.
        Returns 404-signal dict if not found.
        """
        exch_rows = self._exch_repo.get_by_pan(pan)
        if not exch_rows:
            return {"error": f"No client found for PAN {pan}"}

        # Use the first exchange account as the primary record
        primary = exch_rows[0]

        # Gather all depository accounts linked via Clnt_Token
        dep_accounts = self._dep_repo.get_by_clnt_token(primary.Decl_Clnt_Token)

        return {
            "pan":     primary.Decl_Clnt_Pan or pan,
            "clnt_id": primary.Decl_Clnt_Id,
            "tm_id":   primary.Decl_TM_Id,
            # terminals are not in the DB schema; return empty list
            "terminals": [],
            "depository_accounts": [
                {
                    "dp_id":     d.Ddcl_BP_Id,
                    "client_id": d.Ddcl_Clnt_Id,
                    "status":    "Active" if d.Ddcl_Clnt_Stat in (None, 1) else "Inactive",
                }
                for d in dep_accounts
            ],
        }
