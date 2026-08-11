"""
backend/repositories/dim_exch_clnt_repo.py
────────────────────────────────────────────────────────────────────────────
Minimal data-access layer for DIM_EXCH_CLNT_DTLS (DECL) — PAN lookup only.
"""

from __future__ import annotations

from typing import List
from sqlalchemy.orm import Session

from backend.db.models import DimExchClntDtls


class DimExchClntRepository:

    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_pan(self, pan: str) -> List[DimExchClntDtls]:
        return (
            self._db.query(DimExchClntDtls)
            .filter(DimExchClntDtls.Decl_Clnt_Pan == pan.upper())
            .all()
        )
