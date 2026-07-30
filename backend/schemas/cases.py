"""
backend/schemas/cases.py
────────────────────────────────────────────────────────────────────────────
Pydantic v2 schemas for the FORENSIC_CASES table.

Status lifecycle:  Draft → Open Investigation → Pending Action → Closed
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ── Evidence item (stored as JSON array inside the ORM column) ────────────────

class EvidenceItem(BaseModel):
    title:       str
    description: str
    type:        str = "General"   # Chart | Trade Log | KYC | General


# ── Shared literal types ──────────────────────────────────────────────────────

CaseStatus   = Literal["Draft", "Open Investigation", "Pending Action", "Closed"]
CasePriority = Literal["High", "Medium", "Low"]


# ── Request: create a new dossier ─────────────────────────────────────────────

class CaseCreate(BaseModel):
    target_symbol: str             = Field(..., min_length=1, max_length=20)
    title:         str             = Field(..., min_length=3, max_length=300)
    lead_officer:  str             = Field(..., min_length=1, max_length=100)
    priority:      CasePriority    = "Medium"
    status:        CaseStatus      = "Draft"
    description:   Optional[str]   = Field(None, max_length=2000)
    evidence:      List[EvidenceItem] = Field(default_factory=list)
    created_by:    Optional[str]   = None


# ── Request: update status / fields ──────────────────────────────────────────

class CaseUpdate(BaseModel):
    title:        Optional[str]           = Field(None, min_length=3, max_length=300)
    lead_officer: Optional[str]           = Field(None, min_length=1, max_length=100)
    status:       Optional[CaseStatus]    = None
    priority:     Optional[CasePriority]  = None
    description:  Optional[str]           = Field(None, max_length=2000)
    evidence:     Optional[List[EvidenceItem]] = None


# ── Response: single case ─────────────────────────────────────────────────────

class CaseOut(BaseModel):
    id:                    int
    case_id:               str
    target_symbol:         str
    title:                 str
    lead_officer:          str
    status:                str
    priority:              str
    description:           Optional[str]
    evidence:              List[EvidenceItem]
    created_at:            datetime
    updated_at:            datetime
    closed_at:             Optional[datetime]
    created_by:            Optional[str]
    pinned_evidence_count: int

    model_config = {"from_attributes": True}

    @field_validator("evidence", mode="before")
    @classmethod
    def parse_evidence(cls, v: object) -> List[EvidenceItem]:
        """
        The ORM model stores evidence as a JSON string in a TEXT column.
        Convert it to a list of EvidenceItem objects before validation.
        """
        if isinstance(v, str):
            try:
                raw = json.loads(v)
                return [EvidenceItem(**item) for item in raw] if raw else []
            except (json.JSONDecodeError, TypeError):
                return []
        if isinstance(v, list):
            return v
        return []

    @field_validator("pinned_evidence_count", mode="before")
    @classmethod
    def compute_count(cls, v: object) -> int:
        # Allows the field to be omitted — the router sets it from len(evidence)
        return v if isinstance(v, int) else 0


# ── Response: list endpoint ───────────────────────────────────────────────────

class CaseListOut(BaseModel):
    """Lightweight summary used in the table view."""
    id:                    int
    case_id:               str
    target_symbol:         str
    title:                 str
    lead_officer:          str
    status:                str
    priority:              str
    created_at:            datetime
    updated_at:            datetime
    pinned_evidence_count: int

    model_config = {"from_attributes": True}

    @field_validator("pinned_evidence_count", mode="before")
    @classmethod
    def compute_count(cls, v: object) -> int:
        return v if isinstance(v, int) else 0
