"""
backend/repositories/dim_dep_clnt_repo.py
────────────────────────────────────────────────────────────────────────────
Data-access layer for DIM_DEP_CLNT_DTLS (DDCL).
"""

from __future__ import annotations

from typing import Optional, List, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.db.models import DimDepClntDtls
from backend.schemas.dim_dep_clnt import DimDepClntFilter

_SORTABLE_COLS: set[str] = {
    "Ddcl_Dep_Clnt_Token", "Ddcl_Clnt_Id", "Ddcl_Clnt_Name",
    "Ddcl_Clnt_Pan", "Ddcl_City", "Ddcl_Rec_Date", "Ddcl_Acct_Openng_Date",
}


class DimDepClntRepository:

    def __init__(self, db: Session) -> None:
        self._db = db

    def _apply_filters(self, q, f: DimDepClntFilter):
        if f.pan:
            q = q.filter(DimDepClntDtls.Ddcl_Clnt_Pan.ilike(f"%{f.pan}%"))
        if f.clnt_id:
            q = q.filter(DimDepClntDtls.Ddcl_Clnt_Id.ilike(f"%{f.clnt_id}%"))
        if f.name:
            q = q.filter(DimDepClntDtls.Ddcl_Clnt_Name.ilike(f"%{f.name}%"))
        if f.dep_token is not None:
            q = q.filter(DimDepClntDtls.Ddcl_Dep_Token == f.dep_token)
        if f.catg_type is not None:
            q = q.filter(DimDepClntDtls.Ddcl_Clnt_Catg_Type == f.catg_type)
        if f.stat is not None:
            q = q.filter(DimDepClntDtls.Ddcl_Clnt_Stat == f.stat)
        return q

    def _apply_sort(self, q, sort_by: str, sort_dir: str):
        col_name = sort_by if sort_by in _SORTABLE_COLS else "Ddcl_Dep_Clnt_Token"
        col = getattr(DimDepClntDtls, col_name)
        return q.order_by(col.desc() if sort_dir == "desc" else col.asc())

    def list_clients(
        self,
        filters: DimDepClntFilter,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[DimDepClntDtls], int]:
        q = self._db.query(DimDepClntDtls)
        q = self._apply_filters(q, filters)
        total = q.count()
        q = self._apply_sort(q, filters.sort_by, filters.sort_dir)
        rows = q.offset((page - 1) * page_size).limit(page_size).all()
        return rows, total

    def get_by_token(self, token: int) -> Optional[DimDepClntDtls]:
        return (
            self._db.query(DimDepClntDtls)
            .filter(DimDepClntDtls.Ddcl_Dep_Clnt_Token == token)
            .first()
        )

    def get_by_clnt_token(self, clnt_token: int) -> List[DimDepClntDtls]:
        """Cross-reference: find depository account(s) for a de-duped client token."""
        return (
            self._db.query(DimDepClntDtls)
            .filter(DimDepClntDtls.Ddcl_Clnt_Token == clnt_token)
            .all()
        )

    def search(self, query: str, limit: int = 20) -> List[DimDepClntDtls]:
        q = self._db.query(DimDepClntDtls).filter(
            or_(
                DimDepClntDtls.Ddcl_Clnt_Pan.ilike(f"%{query}%"),
                DimDepClntDtls.Ddcl_Clnt_Id.ilike(f"%{query}%"),
                DimDepClntDtls.Ddcl_Clnt_Name.ilike(f"%{query}%"),
            )
        )
        return q.limit(limit).all()
