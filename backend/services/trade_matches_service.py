"""
backend/services/trade_matches_service.py
────────────────────────────────────────────────────────────────────────────
Business logic layer for trade execution matches.

Orchestrates repository calls and computes derived aggregates.
No SQLAlchemy or raw SQL here.
"""

from __future__ import annotations

import math
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from backend.repositories.trade_matches_repo import TradeMatchesRepository
from backend.schemas.trade_matches import TradeMatchesFilter
from backend.schemas.common import PaginationMeta, PagedResponse


class TradeMatchesService:

    def __init__(self, db: Session) -> None:
        self._repo = TradeMatchesRepository(db)

    def list_trades(
        self,
        filters: TradeMatchesFilter,
        page: int,
        page_size: int,
    ) -> dict[str, Any]:
        rows, total = self._repo.list_trades(filters, page, page_size)
        total_pages = math.ceil(total / page_size) if page_size > 0 else 0
        return {
            "data": rows,
            "pagination": {
                "page":        page,
                "page_size":   page_size,
                "total":       total,
                "total_pages": total_pages,
            },
        }

    def get_trade_detail(
        self,
        trd_date: date,
        trd_num: int,
        cmp_token: int | None = None,
        prd_token: int | None = None,
        exch_token: int | None = None,
        seg_token: int | None = None,
    ):
        return self._repo.get_by_pk(
            trd_date, trd_num, cmp_token, prd_token, exch_token, seg_token
        )

    def get_wash_trade_summary(
        self,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[dict[str, Any]]:
        return self._repo.get_wash_trade_summary(date_from, date_to)

    def get_algo_breakdown(
        self,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[dict[str, Any]]:
        return self._repo.get_algo_breakdown(date_from, date_to)

    def get_participant_trades(
        self,
        clnt_token: int,
        date_from: date | None,
        date_to: date | None,
        page: int,
        page_size: int,
    ) -> dict[str, Any]:
        rows, total = self._repo.get_participant_trades(
            clnt_token, date_from, date_to, page, page_size
        )
        total_pages = math.ceil(total / page_size) if page_size > 0 else 0
        return {
            "client_token": clnt_token,
            "data": rows,
            "pagination": {
                "page":        page,
                "page_size":   page_size,
                "total":       total,
                "total_pages": total_pages,
            },
        }

    def get_symbol_daily_stats(self) -> list[dict[str, Any]]:
        """Trade counts and values per symbol per date — feeds dashboard heatmap."""
        return self._repo.count_by_symbol_date()
