"""
backend/repositories/dim_exch_clnt_repo.py
────────────────────────────────────────────────────────────────────────────
Data-access layer for DIM_EXCH_CLNT_DTLS (DECL).
"""

from __future__ import annotations

from typing import Optional, List, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.db.models import DimExchClntDtls
from backend.schemas.dim_exch_clnt import DimExchClntFilter

_SORTABLE_COLS: set[str] = {
    "Decl_Exch_Clnt_Token", "Decl_TM_Id", "Decl_Clnt_Id",
    "Decl_Clnt_Name", "Decl_Clnt_Pan", "Decl_City", "Decl_Rec_Date",
}


class DimExchClntRepository:

    def __init__(self, db: Session) -> None:
        self._db = db

    def _apply_filters(self, q, f: DimExchClntFilter):
        if f.pan:
            q = q.filter(DimExchClntDtls.Decl_Clnt_Pan.ilike(f"%{f.pan}%"))
        if f.tm_id:
            q = q.filter(DimExchClntDtls.Decl_TM_Id == f.tm_id)
        if f.clnt_id:
            q = q.filter(DimExchClntDtls.Decl_Clnt_Id.ilike(f"%{f.clnt_id}%"))
        if f.name:
            q = q.filter(DimExchClntDtls.Decl_Clnt_Name.ilike(f"%{f.name}%"))
        if f.catg_type is not None:
            q = q.filter(DimExchClntDtls.Decl_Clnt_Catg_Type == f.catg_type)
        if f.stat is not None:
            q = q.filter(DimExchClntDtls.Decl_Clnt_Stat == f.stat)
        if f.city:
            q = q.filter(DimExchClntDtls.Decl_City.ilike(f"%{f.city}%"))
        if f.exch_id:
            q = q.filter(DimExchClntDtls.Decl_Exch_Id == f.exch_id.upper())
        return q

    def _apply_sort(self, q, sort_by: str, sort_dir: str):
        col_name = sort_by if sort_by in _SORTABLE_COLS else "Decl_Exch_Clnt_Token"
        col = getattr(DimExchClntDtls, col_name)
        return q.order_by(col.desc() if sort_dir == "desc" else col.asc())

    def list_clients(
        self,
        filters: DimExchClntFilter,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[DimExchClntDtls], int]:
        q = self._db.query(DimExchClntDtls)
        q = self._apply_filters(q, filters)
        total = q.count()
        q = self._apply_sort(q, filters.sort_by, filters.sort_dir)
        rows = q.offset((page - 1) * page_size).limit(page_size).all()
        return rows, total

    def get_by_token(self, token: int) -> Optional[DimExchClntDtls]:
        return (
            self._db.query(DimExchClntDtls)
            .filter(DimExchClntDtls.Decl_Exch_Clnt_Token == token)
            .first()
        )

    def get_by_pan(self, pan: str) -> List[DimExchClntDtls]:
        return (
            self._db.query(DimExchClntDtls)
            .filter(DimExchClntDtls.Decl_Clnt_Pan == pan.upper())
            .all()
        )

    def search(self, query: str, limit: int = 20) -> List[DimExchClntDtls]:
        """Full-text style search across PAN, client ID, and name."""
        q = self._db.query(DimExchClntDtls).filter(
            or_(
                DimExchClntDtls.Decl_Clnt_Pan.ilike(f"%{query}%"),
                DimExchClntDtls.Decl_Clnt_Id.ilike(f"%{query}%"),
                DimExchClntDtls.Decl_Clnt_Name.ilike(f"%{query}%"),
                DimExchClntDtls.Decl_Client_Code.ilike(f"%{query}%"),
            )
        )
        return q.limit(limit).all()
