"""
backend/routers/cases.py
────────────────────────────────────────────────────────────────────────────
REST endpoints for Forensic Case Dossier management.

Prefix : /api/v1/cases
Tags   : Cases
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.db.database import SessionLocal
from backend.schemas.cases import CaseCreate, CaseListOut, CaseOut, CaseUpdate
from backend.services import cases_service

router = APIRouter(prefix="/api/v1/cases", tags=["Cases"])


# ── DB dependency ─────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[CaseListOut], summary="List all forensic cases")
def list_cases(
    status:  Optional[str] = Query(None, description="Filter by status"),
    symbol:  Optional[str] = Query(None, description="Filter by target symbol"),
    search:  Optional[str] = Query(None, description="Search case ID, symbol, or title"),
    skip:    int           = Query(0,    ge=0),
    limit:   int           = Query(100,  ge=1, le=500),
    db: Session = Depends(get_db),
):
    return cases_service.list_cases(db, status=status, symbol=symbol, search=search, skip=skip, limit=limit)


@router.post("/", response_model=CaseOut, status_code=status.HTTP_201_CREATED, summary="Create a new forensic case dossier")
def create_case(payload: CaseCreate, db: Session = Depends(get_db)):
    return cases_service.create_case(db, payload)


@router.get("/{case_id}", response_model=CaseOut, summary="Get a single forensic case by case_id")
def get_case(case_id: str, db: Session = Depends(get_db)):
    return cases_service.get_case(db, case_id)


@router.patch("/{case_id}", response_model=CaseOut, summary="Update case fields or advance status")
def update_case(case_id: str, payload: CaseUpdate, db: Session = Depends(get_db)):
    return cases_service.update_case(db, case_id, payload)


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a draft or closed case")
def delete_case(case_id: str, db: Session = Depends(get_db)):
    cases_service.delete_case(db, case_id)
