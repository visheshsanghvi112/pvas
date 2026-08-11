"""
backend/repositories/dim_dep_clnt_repo.py
────────────────────────────────────────────────────────────────────────────
Minimal data-access layer for DIM_DEP_CLNT_DTLS (DDCL) — lookup by client token only.
"""

from __future__ import annotations

from typing import List
from sqlalchemy.orm import Session

from backend.db.models import DimDepClntDtls


class DimDepClntRepository:

    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_clnt_token(self, clnt_token: int) -> List[DimDepClntDtls]:
        """Cross-reference: find depository account(s) for a de-duped client token."""
        return (
            self._db.query(DimDepClntDtls)
            .filter(DimDepClntDtls.Ddcl_Clnt_Token == clnt_token)
            .all()
        )
