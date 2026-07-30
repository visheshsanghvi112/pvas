"""
backend/services/client_service.py
────────────────────────────────────────────────────────────────────────────
Business logic layer for client data (exchange + depository accounts).
Cross-references DECL and DDCL by shared Clnt_Token.
"""

from __future__ import annotations

import math
from typing import Any

from sqlalchemy.orm import Session

from backend.repositories.dim_exch_clnt_repo import DimExchClntRepository
from backend.repositories.dim_dep_clnt_repo import DimDepClntRepository
from backend.schemas.dim_exch_clnt import DimExchClntFilter
from backend.schemas.dim_dep_clnt import DimDepClntFilter


class ClientService:

    def __init__(self, db: Session) -> None:
        self._exch_repo = DimExchClntRepository(db)
        self._dep_repo  = DimDepClntRepository(db)

    # ── Exchange clients ───────────────────────────────────────────────────

    def list_exchange_clients(
        self,
        filters: DimExchClntFilter,
        page: int,
        page_size: int,
    ) -> dict[str, Any]:
        rows, total = self._exch_repo.list_clients(filters, page, page_size)
        return {
            "data": rows,
            "pagination": {
                "page":        page,
                "page_size":   page_size,
                "total":       total,
                "total_pages": math.ceil(total / page_size) if page_size else 0,
            },
        }

    def get_exchange_client(self, token: int):
        return self._exch_repo.get_by_token(token)

    def search_exchange_clients(self, query: str, limit: int = 20):
        return self._exch_repo.search(query, limit)

    # ── Depository clients ─────────────────────────────────────────────────

    def list_depository_clients(
        self,
        filters: DimDepClntFilter,
        page: int,
        page_size: int,
    ) -> dict[str, Any]:
        rows, total = self._dep_repo.list_clients(filters, page, page_size)
        return {
            "data": rows,
            "pagination": {
                "page":        page,
                "page_size":   page_size,
                "total":       total,
                "total_pages": math.ceil(total / page_size) if page_size else 0,
            },
        }

    def get_depository_client(self, token: int):
        return self._dep_repo.get_by_token(token)

    def search_depository_clients(self, query: str, limit: int = 20):
        return self._dep_repo.search(query, limit)

    # ── Cross-reference ────────────────────────────────────────────────────

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

    def get_full_client_profile(self, exch_clnt_token: int) -> dict[str, Any]:
        """
        Returns the exchange account + all linked depository accounts
        for a given Decl_Exch_Clnt_Token.
        """
        exch = self._exch_repo.get_by_token(exch_clnt_token)
        if exch is None:
            return {"error": "Exchange client not found"}

        dep_accounts = self._dep_repo.get_by_clnt_token(exch.Decl_Clnt_Token)
        return {
            "exchange_account":    exch,
            "depository_accounts": dep_accounts,
        }
