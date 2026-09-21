"""
tests/test_surveillance_e2e.py
────────────────────────────────────────────────────────────────────────────
End-to-End Verification Test Suite for PVASF Production Lineup.

Covers:
  1. Relational Database Integrity & Foreign Keys (backend/db/surveillance.db)
  2. Complete 15 Table Coverage & Analytical Surveillance Views
  3. Declarative SQLAlchemy 2.0 ORM Models & Session Verification
  4. Core Mathematical Surveillance Engine & Scoring Metrics
  5. Proprietary Leak Prevention Scanner (ensures zero proprietary leaks in active codebase)
  6. Live FastAPI Service Endpoints & RBAC Security Verification
"""

import os
import re
import sqlite3
import pytest
from datetime import date, timedelta
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from backend.main import app
from backend.security import create_access_token, verify_password, hash_password
from backend.db.database import SessionLocal
from backend.db.models import (
    ClientIdentityMaster, ClientDematAccount, DailyMarketEod,
    MarketBaselineStat, ParticipantDailyTrade, CounterpartyTradePair,
    ShareholdingSummary, LargeShareholdersRegistry, CorporateEventsFeed,
    PriceDilutionFactor, TradingSessionCalendar, BrokerDailySummary,
    SurveillanceAlertCase, SysUser, SysAuditLog
)
from pv_alert_surveillance import MarketMetricsResult, SurveillanceEngine, SurveillanceConfig


# ══════════════════════════════════════════════════════════════════════════════
# 1. DATABASE INTEGRITY & SCHEMA COVERAGE TESTS
# ══════════════════════════════════════════════════════════════════════════════
class TestSurveillanceDatabase:
    DB_PATH = "backend/db/surveillance.db"

    EXPECTED_TABLES = [
        "client_identity_master",
        "client_demat_accounts",
        "daily_market_eod",
        "market_baseline_stats",
        "participant_daily_trades",
        "counterparty_trade_pairs",
        "shareholding_summary",
        "large_shareholders_registry",
        "corporate_events_feed",
        "price_dilution_factors",
        "trading_session_calendar",
        "broker_daily_summary",
        "surveillance_alert_cases",
        "portal_user_accounts",
        "compliance_audit_logs",
    ]

    EXPECTED_VIEWS = [
        "v_daily_surveillance_summary",
        "v_participant_conduct_ranking",
        "v_counterparty_concentration",
    ]

    def test_database_exists(self):
        assert os.path.exists(self.DB_PATH), f"Database {self.DB_PATH} must exist"

    def test_database_integrity_and_fks(self):
        conn = sqlite3.connect(self.DB_PATH)
        c = conn.cursor()
        c.execute("PRAGMA integrity_check;")
        res = c.fetchone()[0]
        assert res == "ok", f"Integrity check failed: {res}"

        c.execute("PRAGMA foreign_key_check;")
        fk_violations = c.fetchall()
        assert len(fk_violations) == 0, f"Foreign key violations found: {fk_violations}"
        conn.close()

    def test_table_coverage(self):
        conn = sqlite3.connect(self.DB_PATH)
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [r[0] for r in c.fetchall()]
        conn.close()

        for table in self.EXPECTED_TABLES:
            assert table in tables, f"Expected table '{table}' missing from {self.DB_PATH}"

    def test_analytical_views(self):
        conn = sqlite3.connect(self.DB_PATH)
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='view';")
        views = [r[0] for r in c.fetchall()]

        for view in self.EXPECTED_VIEWS:
            assert view in views, f"Expected analytical view '{view}' missing from {self.DB_PATH}"
            c.execute(f"SELECT COUNT(*) FROM {view};")
            cnt = c.fetchone()[0]
            assert cnt >= 0, f"View {view} query failed"
        conn.close()

    def test_symbol_and_row_coverage(self):
        conn = sqlite3.connect(self.DB_PATH)
        c = conn.cursor()
        c.execute("SELECT DISTINCT symbol FROM daily_market_eod;")
        symbols = [r[0] for r in c.fetchall()]
        assert "NOVAENERGY" in symbols
        assert "ALPHATECH" in symbols
        assert len(symbols) >= 15, f"Expected >= 15 symbols, found {len(symbols)}"

        c.execute("SELECT COUNT(*) FROM daily_market_eod;")
        row_count = c.fetchone()[0]
        assert row_count >= 3000, f"Expected >= 3000 rows, got {row_count}"
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# 2. SQLALCHEMY 2.0 ORM MODELS VERIFICATION
# ══════════════════════════════════════════════════════════════════════════════
class TestSQLAlchemyModels:

    def test_orm_query_all_15_entities(self):
        db = SessionLocal()
        try:
            assert db.query(ClientIdentityMaster).count() >= 10
            assert db.query(ClientDematAccount).count() >= 10
            assert db.query(DailyMarketEod).count() >= 3000
            assert db.query(MarketBaselineStat).count() >= 10
            assert db.query(ParticipantDailyTrade).count() >= 5
            assert db.query(CounterpartyTradePair).count() >= 5
            assert db.query(ShareholdingSummary).count() >= 10
            assert db.query(LargeShareholdersRegistry).count() >= 2
            assert db.query(CorporateEventsFeed).count() >= 2
            assert db.query(PriceDilutionFactor).count() >= 1
            assert db.query(TradingSessionCalendar).count() >= 200
            assert db.query(BrokerDailySummary).count() >= 4
            assert db.query(SurveillanceAlertCase).count() >= 1
            assert db.query(SysUser).count() >= 2
            assert db.query(SysAuditLog).count() >= 1
        finally:
            db.close()

    def test_orm_client_demat_foreign_key_join(self):
        db = SessionLocal()
        try:
            demat = db.query(ClientDematAccount).first()
            assert demat is not None
            client = db.query(ClientIdentityMaster).filter(
                ClientIdentityMaster.client_pan == demat.client_pan
            ).first()
            assert client is not None
            assert len(client.client_pan) == 10
        finally:
            db.close()


# ══════════════════════════════════════════════════════════════════════════════
# 3. CORE SURVEILLANCE MATHEMATICAL ENGINE TESTS
# ══════════════════════════════════════════════════════════════════════════════
class TestSurveillanceEngineMath:

    def test_engine_synthetic_pump_scoring(self):
        config = SurveillanceConfig()
        engine = SurveillanceEngine(config)

        # Generate a synthetic 200-day dataframe with deliberate price pump
        dates = [date(2026, 1, 1) + timedelta(days=i) for i in range(200)]
        prices = [100.0 * (1.0 + 0.001 * i) for i in range(185)]
        for j in range(15):
            prices.append(prices[-1] * 1.05)

        volumes = [100000] * 185 + [500000] * 15
        df = pd.DataFrame({
            "Date": dates,
            "Open": prices,
            "High": [p * 1.02 for p in prices],
            "Low": [p * 0.98 for p in prices],
            "Close": prices,
            "Volume": volumes,
            "Band": [0.05] * 200
        })

        res: MarketMetricsResult = engine.calculate_core_metrics("TEST_STOCK", df)
        assert res.price_rise_pct > 50.0, "Expected significant price rise %"
        assert res.volume_z > 2.0, "Expected elevated volume Z-score"
        assert res.final_score > 60.0, "Expected high risk final score for pump profile"

    def test_engine_interoperability_with_db(self):
        conn = sqlite3.connect("backend/db/surveillance.db")
        mkt_df = pd.read_sql_query(
            "SELECT symbol, trade_date, open_price, day_high_price, day_low_price, close_price, total_traded_quantity, upper_circuit_limit "
            "FROM daily_market_eod WHERE symbol='NOVAENERGY' ORDER BY trade_date ASC",
            conn
        )
        part_df = pd.read_sql_query(
            "SELECT symbol, trade_date, client_pan, buy_quantity, sell_quantity, buy_turnover_value, sell_turnover_value, gross_positive_ltp_value "
            "FROM participant_daily_trades WHERE symbol='NOVAENERGY'",
            conn
        )
        conn.close()

        engine = SurveillanceEngine(SurveillanceConfig())
        res = engine.calculate_core_metrics("NOVAENERGY", mkt_df)
        assert res.price_rise_pct > 0.0, "Expected positive price rise"
        assert res.volume_z > 0.0, "Expected positive volume Z-score"
        assert res.final_score >= 15.0, "Expected watchlist threshold trigger"

        audit = engine.analyze_participants(
            "NOVAENERGY",
            part_df,
            final_close=float(mkt_df["close_price"].iloc[-1]),
            total_exchange_vol=float(mkt_df["total_traded_quantity"].sum())
        )
        assert len(audit.pos_ltp_contributors) > 0, "Expected positive LTP contributors detected"


# ══════════════════════════════════════════════════════════════════════════════
# 4. PROPRIETARY LEAK & SENSITIVE PREFIX SCANNER TESTS
# ══════════════════════════════════════════════════════════════════════════════
class TestProprietaryLeakPrevention:
    LEAK_PATTERN = re.compile(
        r"\b(AGG_|FACT_|DIM_|DECL_|ASD_|ACSD_|APPD_|DDCL_|FMSH_|FSHG_|FPRH_|FPUH_|FCAC_|FCDF_|FTRD_)\w*",
        re.IGNORECASE
    )
    EXCLUDE_DIRS = {".git", "node_modules", ".next", "agent_reference", "__pycache__"}

    def test_zero_warehouse_naming_leaks_in_active_code(self):
        """Scans all active code in backend, components, lib, app for proprietary warehouse abbreviations."""
        leaks = []
        code_extensions = (".py", ".sql", ".ts", ".tsx", ".json")

        for root, dirs, files in os.walk("."):
            dirs[:] = [d for d in dirs if d not in self.EXCLUDE_DIRS]
            for file in files:
                if file.endswith(code_extensions):
                    path = os.path.join(root, file)
                    # Skip test file itself which defines the regex
                    if "test_surveillance_e2e.py" in path:
                        continue
                    try:
                        with open(path, "r", encoding="utf-8", errors="ignore") as f:
                            for line_num, line in enumerate(f, 1):
                                if self.LEAK_PATTERN.search(line):
                                    leaks.append(f"{path}:{line_num} -> {line.strip()}")
                    except Exception:
                        pass

        assert len(leaks) == 0, f"Found {len(leaks)} proprietary naming leaks:\n" + "\n".join(leaks[:15])

    def test_zero_teradatasql_dependencies(self):
        """Ensures driver dependencies remain clean and standard."""
        req_files = ["requirements.txt", "backend/requirements.txt"]
        for rf in req_files:
            if os.path.exists(rf):
                with open(rf, "r") as f:
                    content = f.read()
                assert "teradatasql" not in content.lower(), f"Found teradatasql reference in {rf}"


# ══════════════════════════════════════════════════════════════════════════════
# 5. LIVE API ENDPOINTS & RBAC SECURITY TESTS
# ══════════════════════════════════════════════════════════════════════════════
class TestFastAPIEndpoints:
    client = TestClient(app)

    def test_health_check(self):
        resp = self.client.get("/api/v1/surveillance/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ONLINE"
        assert "Surveillance Engine" in data["spec"]

    def test_unauthenticated_request_rejected(self):
        resp = self.client.get("/api/v1/surveillance/dates")
        assert resp.status_code == 401, "Unauthenticated requests must receive 401 Unauthorized"

    def test_authenticated_flow_admin_and_analyst(self):
        # 1. Login Admin
        login_resp = self.client.post("/api/v1/auth/login", json={"username": "vishesh_admin", "password": "vishesh123"})
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        admin_token = login_resp.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Login Analyst
        analyst_login = self.client.post("/api/v1/auth/login", json={"username": "arao_analyst", "password": "arao123"})
        assert analyst_login.status_code == 200, f"Analyst login failed: {analyst_login.text}"

        # 3. Available Dates
        dates_resp = self.client.get("/api/v1/surveillance/dates", headers=admin_headers)
        assert dates_resp.status_code == 200
        dates = dates_resp.json()
        assert len(dates) > 0

        # 4. Watchlist
        wl_resp = self.client.get("/api/v1/surveillance/watchlist?as_of_date=2026-08-27", headers=admin_headers)
        assert wl_resp.status_code == 200
        wl = wl_resp.json()
        assert len(wl) > 0

        # 5. Scrip Detail: NOVAENERGY
        detail_resp = self.client.get("/api/v1/surveillance/scrip/NOVAENERGY?as_of_date=2026-08-27", headers=admin_headers)
        assert detail_resp.status_code == 200
        d = detail_resp.json()
        assert d["ticker"] == "NOVAENERGY"
        assert d["risk"] in ["High", "Medium", "Low"]
        assert len(d["history"]) > 0

        # 6. Scrip Participants: NOVAENERGY
        parts_resp = self.client.get("/api/v1/surveillance/scrip/NOVAENERGY/participants", headers=admin_headers)
        assert parts_resp.status_code == 200
        p = parts_resp.json()
        assert "counterparty_pairs" in p
        assert len(p["counterparty_pairs"]) > 0

        # 7. Scrip Shareholding Breakdown: NOVAENERGY
        sh_resp = self.client.get("/api/v1/surveillance/scrip/NOVAENERGY/shareholding-breakdown", headers=admin_headers)
        assert sh_resp.status_code == 200
        sh_data = sh_resp.json()
        assert sh_data["symbol"] == "NOVAENERGY"
        assert "promoter_group" in sh_data
        assert sh_data["promoter_pct_t"] > 0

        # 8. Scrip Corporate Actions: NOVAENERGY
        ca_resp = self.client.get("/api/v1/surveillance/scrip/NOVAENERGY/corporate-actions", headers=admin_headers)
        assert ca_resp.status_code == 200
        ca_data = ca_resp.json()
        assert isinstance(ca_data, list)
        assert len(ca_data) > 0

        # 9. Scrip Excel Dossier Export: NOVAENERGY
        excel_resp = self.client.get("/api/v1/surveillance/scrip/NOVAENERGY/export-excel?as_of_date=2026-08-27", headers=admin_headers)
        assert excel_resp.status_code == 200
        assert "spreadsheetml.sheet" in excel_resp.headers.get("content-type", "")
        assert len(excel_resp.content) > 5000, "Expected non-empty .xlsx binary payload"

        # 10. Client 360 PAN Lookup
        client_resp = self.client.get("/api/v1/clients/pan/HWFTM1488X", headers=admin_headers)
        assert client_resp.status_code == 200
        c_data = client_resp.json()
        assert c_data["pan"] == "HWFTM1488X"
        assert "Rahul Gupta" in c_data["name"]
        assert len(c_data["depository_accounts"]) > 0

        # 11. Trades surveillance list endpoint
        trades_resp = self.client.get("/api/v1/trades/?symbol=NOVAENERGY", headers=admin_headers)
        assert trades_resp.status_code == 200
        t_data = trades_resp.json()
        assert "data" in t_data
        assert "pagination" in t_data
        if len(t_data["data"]) > 0:
            first_trade = t_data["data"][0]
            assert "trade_number" in first_trade
            assert "trade_date" in first_trade
            assert "trade_price" in first_trade
            assert "trade_quantity" in first_trade
            assert "symbol" in first_trade
            assert first_trade["symbol"] == "NOVAENERGY"

        # 12. Trade Analytics: Wash trade summary & stats
        wash_resp = self.client.get("/api/v1/trades/analysis/wash-trades", headers=admin_headers)
        assert wash_resp.status_code == 200

        stats_resp = self.client.get("/api/v1/trades/stats/daily", headers=admin_headers)
        assert stats_resp.status_code == 200
