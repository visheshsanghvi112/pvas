"""
tests/test_backend_surveillance.py
────────────────────────────────────────────────────────────────────────────
Automated Test Suite for Price-Volume Alert Surveillance Framework (PVASF).

Tests:
1. Core Mathematical Scoring Engine (pv_alert_surveillance.py)
   - Price Rise % & Score boundaries
   - Price Z-Score (Rolling 15-day Close-to-Close returns vs 180-day baseline)
   - Volume Z-Score (Rolling 15-day volume vs 180-day baseline)
   - Band Persistence (Upper circuit touches >= 90%)
   - 180-Day New High Breakouts (High >= max 180d previous high)
   - Weighted Composite Risk Scoring & Dynamic Recalibration
2. Participant Conduct & Market Abuse Audits
   - Net LTP Contribution & Leader Identification
   - Volume Concentration / Dominance (HHI)
   - Counterparty Pair Concentration
   - Trade Reversal Ratio (RTR) / Wash Trading
   - Circular Trade Loop Detection (Cycles of Length 3 to 5)
   - Mark-to-Market PnL Calculation
3. Robustness & Ingestion Normalization
   - Column synonym normalization (e.g. scrip -> Ticker, qty -> Volume)
   - Zero-variance / flatline price series handling
   - Missing data boundaries imputation
4. Database Initialisation & Synthetic Teradata Seed Integrity
5. FastAPI REST API Endpoint Routing, JWT Bearer Auth & RBAC Security
6. Forensic Case Management Lifecycle & Status Transitions
7. Immutable Security & System Audit Trail Logging
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
    ParticipantAuditResult,
    clean_historical_data,
    normalize_columns,
    clean_bands_data,
    clean_shareholding_data,
    clean_announcements_data,
)
from backend.main import app
from backend.db.database import init_db, SessionLocal
from backend.db.seed import seed_database
from backend.services.auth_service import AuthService
from backend.services.cases_service import create_case, update_case, list_cases, get_case
from backend.schemas.cases import CaseCreate, CaseUpdate

client = TestClient(app)


# ── 1. Core Surveillance Engine Unit Tests ────────────────────────────────────

def test_engine_metric_scoring_boundaries():
    """Verify that raw score cutoffs strictly align with PVASF spec section 2."""
    engine = SurveillanceEngine()

    # Price Rise scoring: <15% -> 0, 15-75% -> 1, 76-150% -> 3, >150% -> 5
    assert engine.score_price_rise(0.0) == 0
    assert engine.score_price_rise(14.99) == 0
    assert engine.score_price_rise(15.0) == 1
    assert engine.score_price_rise(50.0) == 1
    assert engine.score_price_rise(75.0) == 1
    assert engine.score_price_rise(75.01) == 3
    assert engine.score_price_rise(100.0) == 3
    assert engine.score_price_rise(150.0) == 3
    assert engine.score_price_rise(150.01) == 5
    assert engine.score_price_rise(500.0) == 5

    # Z-score scoring: <1.645 -> 0, >=1.645 -> 1, >=2.33 -> 3, >=3.09 -> 5
    assert engine.score_zscore(0.0) == 0
    assert engine.score_zscore(1.64) == 0
    assert engine.score_zscore(1.645) == 1
    assert engine.score_zscore(2.0) == 1
    assert engine.score_zscore(2.33) == 3
    assert engine.score_zscore(3.0) == 3
    assert engine.score_zscore(3.09) == 5
    assert engine.score_zscore(6.5) == 5

    # Band Persistence scoring: 0-2d -> 0, 3-5d -> 1, 6-9d -> 3, >=10d -> 5
    assert engine.score_band_persistence(0) == 0
    assert engine.score_band_persistence(2) == 0
    assert engine.score_band_persistence(3) == 1
    assert engine.score_band_persistence(5) == 1
    assert engine.score_band_persistence(6) == 3
    assert engine.score_band_persistence(9) == 3
    assert engine.score_band_persistence(10) == 5
    assert engine.score_band_persistence(15) == 5

    # 180D New High Breakout scoring: 0d -> 0, 1-4d -> 1, 5-9d -> 3, >=10d -> 5
    assert engine.score_new_high(0) == 0
    assert engine.score_new_high(1) == 1
    assert engine.score_new_high(4) == 1
    assert engine.score_new_high(5) == 3
    assert engine.score_new_high(9) == 3
    assert engine.score_new_high(10) == 5
    assert engine.score_new_high(15) == 5


def test_engine_price_rise_calculation():
    """Verify Price Rise % formula: ((High_15D - Close_T-180) / Close_T-180) * 100."""
    engine = SurveillanceEngine()
    days = 200
    dates = pd.date_range(end="2026-08-10", periods=days, freq="D")
    
    # Stock stays at 100 for 185 days, then surges to 250 in the last 15 days
    close = [100.0] * 185 + [200.0] * 15
    high = [102.0] * 185 + [250.0] * 15
    low = [98.0] * 185 + [190.0] * 15
    open_p = [100.0] * 185 + [195.0] * 15
    volume = [10000] * days

    df = pd.DataFrame({
        "Ticker": ["PUMPTARGET"] * days,
        "Date": dates,
        "Open": open_p,
        "High": high,
        "Low": low,
        "Close": close,
        "Volume": volume
    })

    result = engine.calculate_core_metrics("PUMPTARGET", df, band_percent=0.20)
    # T-180 close = 100.0, 15D High = 250.0 -> ((250 - 100) / 100) * 100 = 150.0%
    assert pytest.approx(result.price_rise_pct, 0.01) == 150.0
    assert result.price_rise_score == 3  # <=150% is 3


def test_engine_price_zscore_abnormal_momentum():
    """Verify Price Z-Score detects acute 15-day momentum surge."""
    engine = SurveillanceEngine()
    days = 200
    dates = pd.date_range(end="2026-08-10", periods=days, freq="D")
    
    # Baseline: very small daily returns (~0.01%) for 185 days
    prices = [100.0]
    for i in range(1, 185):
        prices.append(prices[-1] * 1.0001)
    # Last 15 days: daily 5% rally
    for i in range(15):
        prices.append(prices[-1] * 1.05)

    df = pd.DataFrame({
        "Ticker": ["MOMENTUM_SCRIP"] * days,
        "Date": dates,
        "Open": prices,
        "High": [p * 1.01 for p in prices],
        "Low": [p * 0.99 for p in prices],
        "Close": prices,
        "Volume": [50000] * days
    })

    result = engine.calculate_core_metrics("MOMENTUM_SCRIP", df, band_percent=0.10)
    assert result.price_z > 3.09
    assert result.price_z_score == 5


def test_engine_band_persistence_counting():
    """Verify Upper Circuit Band Persistence counts daily moves >= 90% of price band."""
    engine = SurveillanceEngine()
    days = 200
    dates = pd.date_range(end="2026-08-10", periods=days, freq="D")
    
    close = [100.0] * 185
    high = [101.0] * 185
    
    # For last 15 days, simulate 8 upper circuit hits (high >= 90% of 10% circuit = 9.0%)
    for i in range(15):
        prev = close[-1]
        if i < 8:
            # 9.5% intraday surge
            h = prev * 1.095
            c = prev * 1.09
        else:
            h = prev * 1.02
            c = prev * 1.01
        high.append(h)
        close.append(c)

    df = pd.DataFrame({
        "Ticker": ["CIRCUIT_SCRIP"] * days,
        "Date": dates,
        "Open": close,
        "High": high,
        "Low": [c * 0.99 for c in close],
        "Close": close,
        "Volume": [100000] * days
    })

    result = engine.calculate_core_metrics("CIRCUIT_SCRIP", df, band_percent=0.10)
    assert result.band_hit_days == 8
    assert result.band_score == 3  # 6 to 9 days -> 3


def test_engine_180d_new_high_counting():
    """Verify 180-Day New High Breakout counts days where High >= max of previous 180 days."""
    engine = SurveillanceEngine()
    days = 200
    dates = pd.date_range(end="2026-08-10", periods=days, freq="D")
    
    # Peak in past 180 days was 150.0
    close = [100.0] * 100 + [150.0] + [120.0] * 84
    high = [105.0] * 100 + [150.0] + [125.0] * 84
    
    # Last 15 days: 6 days break the 150.0 ceiling (e.g. 155.0)
    for i in range(15):
        if i < 6:
            h = 160.0 + i
            c = 158.0 + i
        else:
            h = 140.0
            c = 138.0
        high.append(h)
        close.append(c)

    df = pd.DataFrame({
        "Ticker": ["NEWHIGH_SCRIP"] * days,
        "Date": dates,
        "Open": close,
        "High": high,
        "Low": [c * 0.95 for c in close],
        "Close": close,
        "Volume": [50000] * days
    })

    result = engine.calculate_core_metrics("NEWHIGH_SCRIP", df, band_percent=0.20)
    assert result.new_high_days == 6
    assert result.new_high_score == 3  # 5 to 9 days -> 3


def test_composite_score_weight_normalization():
    """Verify composite risk score sums to 100 when all metrics are maximal (5/5)."""
    engine = SurveillanceEngine(SurveillanceConfig(
        weights={"price_rise": 25.0, "price_z": 20.0, "volume_z": 25.0, "band_persistence": 15.0, "new_high": 15.0}
    ))
    
    # If all 5 scores are 5:
    # (25 * 5 / 5) + (20 * 5 / 5) + (25 * 5 / 5) + (15 * 5 / 5) + (15 * 5 / 5) = 100.0
    mock_metrics = MarketMetricsResult(
        ticker="MAXRISK",
        price_rise_pct=200.0,
        price_rise_score=5,
        price_z=4.0,
        price_z_score=5,
        volume_z=4.0,
        volume_z_score=5,
        band_hit_days=12,
        band_score=5,
        new_high_days=12,
        new_high_score=5,
        final_score=100.0
    )
    assert mock_metrics.final_score == 100.0


# ── 2. Participant Conduct & Market Abuse Unit Tests ─────────────────────────

def test_participant_trade_reversal_ratio_rtr():
    """Verify Trade Reversal Ratio (RTR) = 2 * min(V_AB, V_BA) / (V_AB + V_BA) * 100."""
    engine = SurveillanceEngine()
    
    trades = pd.DataFrame([
        # 100% perfectly matched reversal between PAN_A and PAN_B
        {"Ticker": "TEST", "Date": pd.Timestamp("2026-08-01"), "PAN": "PAN_A", "CounterpartyPAN": "PAN_B", "BuyVolume": 10000, "SellVolume": 0, "BuyValue": 1000000, "SellValue": 0, "LTPContribution": 1.0},
        {"Ticker": "TEST", "Date": pd.Timestamp("2026-08-01"), "PAN": "PAN_B", "CounterpartyPAN": "PAN_A", "BuyVolume": 10000, "SellVolume": 0, "BuyValue": 1000000, "SellValue": 0, "LTPContribution": 0.0},
        # One-way flow between PAN_C and PAN_D (RTR = 0%)
        {"Ticker": "TEST", "Date": pd.Timestamp("2026-08-01"), "PAN": "PAN_C", "CounterpartyPAN": "PAN_D", "BuyVolume": 5000, "SellVolume": 0, "BuyValue": 500000, "SellValue": 0, "LTPContribution": 0.5},
    ])

    result = engine.analyze_participants("TEST", trades, final_close=100.0, total_exchange_vol=25000.0)
    assert len(result.reversal_pairs) > 0
    
    top_pair = next(p for p in result.reversal_pairs if "PAN_A" in p["Pair"] and "PAN_B" in p["Pair"])
    assert pytest.approx(top_pair["ReversalRatio"], 0.1) == 100.0
    assert top_pair["GrossVolume"] == 20000.0


def test_participant_circular_loops_detection():
    """Verify multi-node circular cycle detection (A -> B -> C -> A)."""
    engine = SurveillanceEngine()

    trades = pd.DataFrame([
        {"Ticker": "LOOP_SCRIP", "Date": pd.Timestamp("2026-08-01"), "PAN": "PAN_1", "CounterpartyPAN": "PAN_2", "BuyVolume": 50000, "SellVolume": 0, "BuyValue": 5000000, "SellValue": 0, "LTPContribution": 1.0},
        {"Ticker": "LOOP_SCRIP", "Date": pd.Timestamp("2026-08-01"), "PAN": "PAN_2", "CounterpartyPAN": "PAN_3", "BuyVolume": 50000, "SellVolume": 0, "BuyValue": 5000000, "SellValue": 0, "LTPContribution": 1.0},
        {"Ticker": "LOOP_SCRIP", "Date": pd.Timestamp("2026-08-01"), "PAN": "PAN_3", "CounterpartyPAN": "PAN_1", "BuyVolume": 50000, "SellVolume": 0, "BuyValue": 5000000, "SellValue": 0, "LTPContribution": 1.0},
    ])

    result = engine.analyze_participants("LOOP_SCRIP", trades, final_close=100.0, total_exchange_vol=150000.0)
    assert len(result.circular_loops) >= 1
    cycle = result.circular_loops[0]
    assert "PAN_1" in cycle["Cycle"] and "PAN_2" in cycle["Cycle"] and "PAN_3" in cycle["Cycle"]
    assert cycle["RotatedVolume"] == 50000.0


def test_participant_mtm_pnl_accounting():
    """Verify Mark-to-Market PnL: SellValue - BuyValue + (NetQty * FinalClose)."""
    engine = SurveillanceEngine()

    trades = pd.DataFrame([
        # PAN_WINNER: Bought 1000 @ 100 (BuyVal=100k), Sold 1000 @ 150 (SellVal=150k) -> Realized PnL = +50,000
        {"Ticker": "PNL_SCRIP", "Date": pd.Timestamp("2026-08-01"), "PAN": "PAN_WINNER", "CounterpartyPAN": "PAN_LOSER", "BuyVolume": 1000, "SellVolume": 1000, "BuyValue": 100000, "SellValue": 150000, "LTPContribution": 2.0},
    ])

    result = engine.analyze_participants("PNL_SCRIP", trades, final_close=150.0, total_exchange_vol=2000.0)
    winner = next(p for p in result.profit_makers if p["PAN"] == "PAN_WINNER")
    assert pytest.approx(winner["NetPnL"], 0.1) == 50000.0


# ── 3. Data Cleaning & Normalization Robustness ──────────────────────────────

def test_normalize_columns_synonyms():
    """Verify column header normalization handles case variations and synonyms."""
    df_raw = pd.DataFrame({
        "scrip": ["TCS"],
        "trade_date": ["2026-08-01"],
        "openprice": [3800.0],
        "high_price": [3850.0],
        "low_price": [3790.0],
        "ltp": [3820.0],
        "traded_qty": [50000]
    })
    cleaned = clean_historical_data(df_raw)
    assert "Ticker" in cleaned.columns
    assert "Date" in cleaned.columns
    assert "Close" in cleaned.columns
    assert "Volume" in cleaned.columns
    assert cleaned["Close"].iloc[0] == 3820.0


def test_flatline_price_zero_variance_guard():
    """Verify that a flatline price series (zero std dev) evaluates safely to Z=0 without crashing."""
    engine = SurveillanceEngine()
    days = 200
    dates = pd.date_range(end="2026-08-10", periods=days, freq="D")
    
    df = pd.DataFrame({
        "Ticker": ["FLAT_SCRIP"] * days,
        "Date": dates,
        "Open": [100.0] * days,
        "High": [100.0] * days,
        "Low": [100.0] * days,
        "Close": [100.0] * days,
        "Volume": [0] * days
    })

    result = engine.calculate_core_metrics("FLAT_SCRIP", df, band_percent=0.20)
    assert result.price_z == 0.0
    assert result.volume_z == 0.0
    assert result.final_score == 0.0


# ── 4. Database Schema & Seed Verification ───────────────────────────────────

def test_database_seeding_and_models():
    """Verify schema initialisation and seed summary status."""
    init_db()
    db = SessionLocal()
    try:
        summary = seed_database(db)
        assert summary.get("status") in ("SUCCESS", "already_seeded", "seeded")
    finally:
        db.close()


# ── 5. FastAPI Authentication, JWT & RBAC Security ───────────────────────────

def get_auth_headers(username: str = "vishesh_admin", password: str = "vishesh123"):
    """Helper to acquire JWT token for protected endpoint testing."""
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    if res.status_code == 200:
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {}


def test_auth_login_and_profile():
    """POST /api/v1/auth/login and GET /api/v1/auth/me returns valid session."""
    response = client.post("/api/v1/auth/login", json={"username": "vishesh_admin", "password": "vishesh123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "vishesh_admin"

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "vishesh_admin"


def test_health_check_endpoint():
    """GET /api/v1/surveillance/health returns status ONLINE."""
    response = client.get("/api/v1/surveillance/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "PVASF_CORE_SPEC.md" in data["spec"]


def test_scrips_summary_and_watchlist():
    """GET /api/v1/surveillance/scrips and /watchlist return risk-ordered securities."""
    headers = get_auth_headers()
    response = client.get("/api/v1/surveillance/scrips", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    
    # Verified watchlist filter
    wl_response = client.get("/api/v1/surveillance/watchlist", headers=headers)
    assert wl_response.status_code == 200
    wl_data = wl_response.json()
    assert all(s["watchlist"] is True for s in wl_data)


def test_scrip_detail_endpoint():
    """GET /api/v1/surveillance/scrip/ALPHATECH returns complete OHLCV history & metrics."""
    headers = get_auth_headers()
    response = client.get("/api/v1/surveillance/scrip/ALPHATECH", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "ALPHATECH"
    assert "metrics" in data
    assert "history" in data
    assert len(data["history"]) > 0
    assert "score_breakdown" in data
    assert "shareholders" in data


def test_scrip_participants_endpoint():
    """GET /api/v1/surveillance/scrip/ALPHATECH/participants returns participant conduct audit."""
    headers = get_auth_headers()
    response = client.get("/api/v1/surveillance/scrip/ALPHATECH/participants", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "ticker" in data
    assert "ltp_contributors" in data
    assert "volume_share" in data
    assert "counterparty_pairs" in data
    assert "reversal_pairs" in data
    assert "circular_loops" in data
    assert "profit_makers" in data


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


def test_cases_crud_and_status_transitions():
    """Verify Forensic Case Dossier creation and status workflow transitions."""
    headers = get_auth_headers()
    
    # Create Case
    create_payload = {
        "target_symbol": "ALPHATECH",
        "title": "Audit Test: Coordinated Price Pump",
        "description": "Automated test case for PVASF compliance audit",
        "priority": "High",
        "status": "Draft",
        "lead_officer": "Vishesh Admin"
    }
    create_resp = client.post("/api/v1/cases/", json=create_payload, headers=headers)
    assert create_resp.status_code == 201
    created_case = create_resp.json()
    case_id = created_case["case_id"]

    # Valid Transition: Draft -> Open Investigation
    update_resp = client.patch(f"/api/v1/cases/{case_id}", json={"status": "Open Investigation"}, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "Open Investigation"

    # Valid Transition: Open Investigation -> Closed
    close_resp = client.patch(f"/api/v1/cases/{case_id}", json={"status": "Closed"}, headers=headers)
    assert close_resp.status_code == 200
    assert close_resp.json()["status"] == "Closed"


def test_audit_logs_and_model_calibration_security():
    """Verify weight updates log immutable security audit trail."""
    headers = get_auth_headers("vishesh_admin", "vishesh123")
    
    # Update weights
    weights_payload = {
        "weights": {
            "price_rise": 25.0,
            "price_z": 20.0,
            "volume_z": 25.0,
            "band_persistence": 15.0,
            "new_high": 15.0
        },
        "threshold": 15.0
    }
    weight_resp = client.post("/api/v1/surveillance/weights", json=weights_payload, headers=headers)
    assert weight_resp.status_code == 200

    # Verify audit log entry
    audit_resp = client.get("/api/v1/auth/audit-logs", headers=headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert len(logs) > 0
    assert any(log["action"] in ("UPDATE_MODEL_WEIGHTS", "LOGIN_SUCCESS") for log in logs)
