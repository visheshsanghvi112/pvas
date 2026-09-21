"""
backend/repositories/client_identity_repo.py
────────────────────────────────────────────────────────────────────────────
Data-access layer for ClientIdentityMaster — PAN lookup.
"""

from __future__ import annotations

from typing import Optional
from sqlalchemy.orm import Session

from backend.db.models import ClientIdentityMaster


class ClientIdentityRepository:

    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_pan(self, pan: str) -> Optional[ClientIdentityMaster]:
        return (
            self._db.query(ClientIdentityMaster)
            .filter(ClientIdentityMaster.client_pan == pan.upper())
            .first()
        )
