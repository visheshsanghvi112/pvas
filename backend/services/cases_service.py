"""
backend/services/cases_service.py
────────────────────────────────────────────────────────────────────────────
Business logic layer for Forensic Case management.
Converts ORM objects → Pydantic response shapes and enforces
status-transition rules.
"""

from __future__ import annotations

import json
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.db.models import ForensicCase
from backend.repositories import cases_repo
from backend.schemas.cases import (
    CaseCreate,
    CaseListOut,
    CaseOut,
    CaseUpdate,
    EvidenceItem,
)

# Valid status transitions: key = current, value = allowed next states
_TRANSITIONS: dict[str, list[str]] = {
    "Draft":              ["Open Investigation", "Pending Action", "Closed"],
    "Open Investigation": ["Pending Action", "Closed"],
    "Pending Action":     ["Open Investigation", "Closed"],
    "Closed":             ["Open Investigation"],   # Re-open case dossier
}


# ── Internal helper ───────────────────────────────────────────────────────────

def _parse_evidence(case: ForensicCase) -> List[EvidenceItem]:
    """Safely parse the JSON evidence column into a list of EvidenceItem."""
    if not case.evidence_json:
        return []
    try:
        raw = json.loads(case.evidence_json)
        return [EvidenceItem(**item) for item in raw]
    except (json.JSONDecodeError, TypeError, ValueError):
        return []


def _to_case_out(case: ForensicCase) -> CaseOut:
    evidence = _parse_evidence(case)
    return CaseOut(
        id=case.id,
        case_id=case.case_id,
        target_symbol=case.target_symbol,
        title=case.title,
        lead_officer=case.lead_officer,
        status=case.status,
        priority=case.priority,
        description=case.description,
        evidence=evidence,
        created_at=case.created_at,
        updated_at=case.updated_at,
        closed_at=case.closed_at,
        created_by=case.created_by,
        pinned_evidence_count=len(evidence),
    )


def _to_list_out(case: ForensicCase) -> CaseListOut:
    evidence_count = len(_parse_evidence(case))
    return CaseListOut(
        id=case.id,
        case_id=case.case_id,
        target_symbol=case.target_symbol,
        title=case.title,
        lead_officer=case.lead_officer,
        status=case.status,
        priority=case.priority,
        created_at=case.created_at,
        updated_at=case.updated_at,
        pinned_evidence_count=evidence_count,
    )


# ── Public service functions ──────────────────────────────────────────────────

def create_case(db: Session, payload: CaseCreate) -> CaseOut:
    case = cases_repo.create_case(db, payload)
    return _to_case_out(case)


def list_cases(
    db: Session,
    status: Optional[str] = None,
    symbol: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[CaseListOut]:
    cases = cases_repo.list_cases(db, status=status, symbol=symbol, search=search, skip=skip, limit=limit)
    return [_to_list_out(c) for c in cases]


def get_case(db: Session, case_id: str) -> CaseOut:
    case = cases_repo.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found",
        )
    return _to_case_out(case)


def update_case(db: Session, case_id: str, payload: CaseUpdate) -> CaseOut:
    case = cases_repo.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found",
        )

    # Enforce status-transition rules
    if payload.status and payload.status != case.status:
        allowed = _TRANSITIONS.get(case.status, [])
        if payload.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Cannot transition from '{case.status}' to '{payload.status}'. "
                    f"Allowed next states: {allowed or ['none (terminal)']}"
                ),
            )

    updated = cases_repo.update_case(db, case, payload)
    return _to_case_out(updated)


def delete_case(db: Session, case_id: str) -> None:
    case = cases_repo.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found",
        )
    if case.status == "Open Investigation":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete an active investigation. Close it first.",
        )
    cases_repo.delete_case(db, case)
