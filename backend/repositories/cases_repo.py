"""
backend/repositories/cases_repo.py
────────────────────────────────────────────────────────────────────────────
Data-access layer for FORENSIC_CASES. All DB interaction lives here so the
service layer stays free of SQLAlchemy specifics.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db.models import ForensicCase
from backend.schemas.cases import CaseCreate, CaseUpdate


# ── Helpers ───────────────────────────────────────────────────────────────────

def _evidence_to_json(evidence: list) -> str:
    return json.dumps([e.model_dump() for e in evidence])


def _build_case_id(symbol: str, pk: int) -> str:
    """
    Produce a deterministic human-readable case ID:
    CASE-<YEAR>-<SYMBOL>-<zero-padded pk>
    e.g. CASE-2026-ALPHATECH-001
    """
    year = datetime.utcnow().year
    return f"CASE-{year}-{symbol.upper()}-{str(pk).zfill(3)}"


# ── CRUD ──────────────────────────────────────────────────────────────────────

def create_case(db: Session, payload: CaseCreate) -> ForensicCase:
    """Insert a new forensic case and return the persisted ORM object."""
    now = datetime.utcnow()
    case = ForensicCase(
        # case_id will be set after flush (we need the PK first)
        case_id        = "PENDING",
        target_symbol  = payload.target_symbol.upper(),
        title          = payload.title,
        lead_officer   = payload.lead_officer,
        status         = payload.status,
        priority       = payload.priority,
        description    = payload.description,
        evidence_json  = _evidence_to_json(payload.evidence),
        created_at     = now,
        updated_at     = now,
        created_by     = payload.created_by,
    )
    db.add(case)
    db.flush()   # populates case.id without committing

    # Back-fill the case_id now that we have the PK
    case.case_id = _build_case_id(payload.target_symbol, case.id)
    db.commit()
    db.refresh(case)
    return case


def list_cases(
    db: Session,
    status: Optional[str] = None,
    symbol: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[ForensicCase]:
    q = db.query(ForensicCase)
    if status:
        q = q.filter(ForensicCase.status == status)
    if symbol:
        q = q.filter(ForensicCase.target_symbol == symbol.upper())
    if search:
        like = f"%{search}%"
        q = q.filter(
            ForensicCase.case_id.ilike(like)
            | ForensicCase.target_symbol.ilike(like)
            | ForensicCase.title.ilike(like)
        )
    return q.order_by(ForensicCase.created_at.desc()).offset(skip).limit(limit).all()


def count_cases(
    db: Session,
    status: Optional[str] = None,
    symbol: Optional[str] = None,
    search: Optional[str] = None,
) -> int:
    q = db.query(func.count(ForensicCase.id))
    if status:
        q = q.filter(ForensicCase.status == status)
    if symbol:
        q = q.filter(ForensicCase.target_symbol == symbol.upper())
    if search:
        like = f"%{search}%"
        q = q.filter(
            ForensicCase.case_id.ilike(like)
            | ForensicCase.target_symbol.ilike(like)
            | ForensicCase.title.ilike(like)
        )
    return q.scalar() or 0


def get_case_by_id(db: Session, case_id: str) -> Optional[ForensicCase]:
    return db.query(ForensicCase).filter(ForensicCase.case_id == case_id).first()


def get_case_by_pk(db: Session, pk: int) -> Optional[ForensicCase]:
    return db.query(ForensicCase).filter(ForensicCase.id == pk).first()


def update_case(db: Session, case: ForensicCase, payload: CaseUpdate) -> ForensicCase:
    """Apply a partial update and return the refreshed ORM object."""
    now = datetime.utcnow()

    if payload.title is not None:
        case.title = payload.title
    if payload.lead_officer is not None:
        case.lead_officer = payload.lead_officer
    if payload.priority is not None:
        case.priority = payload.priority
    if payload.description is not None:
        case.description = payload.description
    if payload.evidence is not None:
        case.evidence_json = _evidence_to_json(payload.evidence)

    if payload.status is not None and payload.status != case.status:
        case.status = payload.status
        if payload.status == "Closed":
            case.closed_at = now

    case.updated_at = now
    db.commit()
    db.refresh(case)
    return case


def delete_case(db: Session, case: ForensicCase) -> None:
    db.delete(case)
    db.commit()
