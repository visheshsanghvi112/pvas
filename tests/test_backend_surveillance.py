"""
tests/test_backend_surveillance.py
────────────────────────────────────────────────────────────────────────────
Automated Test Suite for Price-Volume Alert Surveillance Framework (PVASF).

Tests:
1. Core Mathematical Scoring Engine (pv_alert_surveillance.py)
2. Database Initialisation & Synthetic Teradata Seed Integrity
3. FastAPI REST API Endpoint Routing & Data Serialization
4. User Authentication & JWT Bearer Token Security
"""

import sys
import os
import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

# Ensure root directory is in sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from pv_alert_surveillance import (
    SurveillanceEngine,
    SurveillanceConfig,
    MarketMetricsResult,
    clean_historical_data
)
from backend.main import app
from backend.db.database import init_db, SessionLocal
from backend.db.seed import seed_database

client = TestClient(app)


# ── 1. Core Surveillance Engine Unit Tests ────────────────────────────────────

def test_engine_metric_scoring():
    """Verify that raw score cutoffs strictly align with PVASF spec section 2."""
    engine = SurveillanceEngine()

    # Price Rise scoring: <15% -> 0, 15-75% -> 1, 76-150% -> 3, >150% -> 5
    assert engine.score_price_rise(10.0) == 0
    assert engine.score_price_rise(15.0) == 1
    assert engine.score_price_rise(50.0) == 1
    assert engine.score_price_rise(100.0) == 3
    assert engine.score_price_rise(200.0) == 5

    # Z-score scoring: <1.645 -> 0, >=1.645 -> 1, >=2.33 -> 3, >=3.09 -> 5
    assert engine.score_zscore(1.0) == 0
    assert engine.score_zscore(1.65) == 1
    assert engine.score_zscore(2.5) == 3
    assert engine.score_zscore(3.5) == 5

    # Band Persistence scoring: 0-2d -> 0, 3-5d -> 1, 6-9d -> 3, >=10d -> 5
    assert engine.score_band_persistence(1) == 0
    assert engine.score_band_persistence(4) == 1
    assert engine.score_band_persistence(7) == 3
    assert engine.score_band_persistence(12) == 5

    # 180D New High Breakout scoring: 0d -> 0, 1-4d -> 1, 5-9d -> 3, >=10d -> 5
    assert engine.score_new_high(0) == 0
    assert engine.score_new_high(3) == 1
    assert engine.score_new_high(6) == 3
    assert engine.score_new_high(11) == 5


def test_engine_calculate_core_metrics_synthetic():
    """Verify calculation of 5 core metrics and weighted final score calculation."""
    engine = SurveillanceEngine()
    days = 200
    dates = pd.date_range(end="2026-08-10", periods=days, freq="D")
    
    df = pd.DataFrame({
        "Ticker": ["TESTSCRIP"] * days,
        "Date": dates,
        "Open": np.linspace(100, 200, days),
        "High": np.linspace(102, 210, days),
        "Low": np.linspace(98, 195, days),
        "Close": np.linspace(100, 200, days),
        "Volume": np.random.randint(10000, 50000, days)
    })
    
    result = engine.calculate_core_metrics("TESTSCRIP", df, band_percent=0.20)
    assert isinstance(result, MarketMetricsResult)
    assert result.ticker == "TESTSCRIP"
    assert 0.0 <= result.final_score <= 100.0
    assert result.price_rise_pct > 0


# ── 2. Database Schema & Seed Verification ───────────────────────────────────

def test_database_seeding_and_models():
    """Verify schema initialisation and seed summary status."""
    init_db()
    db = SessionLocal()
    try:
        summary = seed_database(db)
        assert summary.get("status") in ("SUCCESS", "already_seeded", "seeded")
    finally:
        db.close()


# ── 3. FastAPI Authentication & JWT Bearer Token Test ────────────────────────

def get_auth_headers():
    """Helper to acquire JWT token for protected endpoint testing."""
    res = client.post("/api/v1/auth/login", json={"username": "vishesh_admin", "password": "vishesh123"})
    if res.status_code == 200:
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {}


def test_auth_login():
    """POST /api/v1/auth/login returns JWT bearer token for valid user."""
    response = client.post("/api/v1/auth/login", json={"username": "vishesh_admin", "password": "vishesh123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_health_check_endpoint():
    """GET /api/v1/surveillance/health returns status ONLINE."""
    response = client.get("/api/v1/surveillance/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "PVASF_CORE_SPEC.md" in data["spec"]


def test_scrips_summary_endpoint():
    """GET /api/v1/surveillance/scrips returns list of scrips with metrics."""
    headers = get_auth_headers()
    response = client.get("/api/v1/surveillance/scrips", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    scrip = data[0]
    assert "ticker" in scrip
    assert "score" in scrip
    assert "risk" in scrip


def test_scrip_detail_endpoint():
    """GET /api/v1/surveillance/scrip/ALPHATECH returns full scrip detail."""
    headers = get_auth_headers()
    response = client.get("/api/v1/surveillance/scrip/ALPHATECH", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "ALPHATECH"
    assert "metrics" in data
    assert "history" in data
    assert "score_breakdown" in data


def test_scrip_participants_endpoint():
    """GET /api/v1/surveillance/scrip/ALPHATECH/participants returns participant audit."""
    headers = get_auth_headers()
    response = client.get("/api/v1/surveillance/scrip/ALPHATECH/participants", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "ticker" in data
    assert "ltp_contributors" in data
    assert "volume_share" in data


def test_trade_matches_endpoints():
    """GET /api/v1/trades/ returns paginated trades and daily stats."""
    headers = get_auth_headers()
    response = client.get("/api/v1/trades/?page=1&page_size=10", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "pagination" in data

    stats_resp = client.get("/api/v1/trades/stats/daily", headers=headers)
    assert stats_resp.status_code == 200

    wash_resp = client.get("/api/v1/trades/analysis/wash-trades", headers=headers)
    assert wash_resp.status_code == 200

    algo_resp = client.get("/api/v1/trades/analysis/algo-breakdown", headers=headers)
    assert algo_resp.status_code == 200


def test_cases_endpoints():
    """GET /api/v1/cases/ returns forensic cases."""
    headers = get_auth_headers()
    response = client.get("/api/v1/cases/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_client_pan_endpoint():
    """GET /api/v1/clients/pan/{pan} returns ClientDetail for investigation workspace."""
    headers = get_auth_headers()
    # Test looking up PAN 'ABCDE1234F' which exists in seed database
    response = client.get("/api/v1/clients/pan/ABCDE1234F", headers=headers)
    assert response.status_code in (200, 404)  # 200 if seeded, 404 if unknown PAN
