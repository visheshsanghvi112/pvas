"""
backend/services/client_service.py
────────────────────────────────────────────────────────────────────────────
Client Service — provides PAN lookup used by the investigation workspace's
Client 360 drawer (fetchClient360 in lib/api.ts).
"""

from __future__ import annotations

from typing import Any
from sqlalchemy.orm import Session

from backend.repositories.client_identity_repo import ClientIdentityRepository
from backend.repositories.client_demat_repo import ClientDematRepository


class ClientService:

    def __init__(self, db: Session) -> None:
        self._exch_repo = ClientIdentityRepository(db)
        self._dep_repo = ClientDematRepository(db)

    def get_client_by_pan(self, pan: str) -> dict[str, Any]:
        """
        Returns a ClientDetail-shaped dict for the frontend fetchClient360 call.
        Looks up KYC record by PAN, then cross-references depository accounts.
        Returns 404-signal dict if not found.
        """
        clean_pan = pan.strip().upper()
        client = self._exch_repo.get_by_pan(clean_pan)
        if not client:
            return {"error": f"No client found for PAN {clean_pan}"}

        dep_accounts = self._dep_repo.get_by_pan(clean_pan)

        return {
            "pan": client.client_pan,
            "clnt_id": f"CLI-{client.client_pan[-4:]}",
            "tm_id": "TM101",
            "name": client.client_legal_name or "Unknown Entity",
            "category": client.entity_type or "Client",
            "client_code": f"CL-{client.client_pan[-4:]}",
            "city": client.residential_city or "Mumbai",
            "risk_grade": client.risk_profile_grade or "STANDARD",
            "terminals": [],
            "depository_accounts": [
                {
                    "dp_id": d.depository_id,
                    "client_id": d.beneficiary_acc_no,
                    "status": "Active" if not d.is_poa_active else "Active (POA)",
                }
                for d in dep_accounts
            ],
        }
