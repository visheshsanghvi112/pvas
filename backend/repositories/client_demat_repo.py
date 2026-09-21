"""
backend/repositories/client_demat_repo.py
────────────────────────────────────────────────────────────────────────────
Data-access layer for ClientDematAccount — Demat accounts linked to PAN.
"""

from __future__ import annotations

from typing import List
from sqlalchemy.orm import Session

from backend.db.models import ClientDematAccount


class ClientDematRepository:

    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_pan(self, pan: str) -> List[ClientDematAccount]:
        """Finds depository BO account(s) for a client PAN."""
        return (
            self._db.query(ClientDematAccount)
            .filter(ClientDematAccount.client_pan == pan.upper())
            .all()
        )
