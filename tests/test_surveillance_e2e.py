"""
tests/test_surveillance_e2e.py
────────────────────────────────────────────────────────────────────────────
End-to-End Senior Engineering Verification Test Suite for PVASF.

Covers:
  1. Real Surveillance Database Integrity & Foreign Keys (backend/db/surveillance.db)
  2. Sanitized Reference Dummy Database & Views (dummy_surveillance.db)
  3. Proprietary Leak Prevention Scanner (ensures zero proprietary leaks in external artifacts)
  4. Core Mathematical Surveillance Engine & Scoring Metrics
  5. Live FastAPI Service Endpoints & RBAC Security Verification
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
from pv_alert_surveillance import MarketMetricsResult, SurveillanceEngine, SurveillanceConfig


# ══════════════════════════════════════════════════════════════════════════════
# 1. REAL DATABASE INTEGRITY TESTS
# ══════════════════════════════════════════════════════════════════════════════
class TestRealDatabase:
    DB_PATH = "backend/db/surveillance.db"

    def test_real_database_exists(self):
        assert os.path.exists(self.DB_PATH), f"Database {self.DB_PATH} must exist"

    def test_real_database_integrity_and_fks(self):
        conn = sqlite3.connect(self.DB_PATH)
        c = conn.cursor()
        c.execute("PRAGMA integrity_check;")
        res = c.fetchone()[0]
        assert res == "ok", f"Integrity check failed: {res}"

        c.execute("PRAGMA foreign_key_check;")
        fk_violations = c.fetchall()
        assert len(fk_violations) == 0, f"Foreign key violations found: {fk_violations}"
        conn.close()

    def test_real_database_symbol_and_row_coverage(self):
        conn = sqlite3.connect(self.DB_PATH)
        c = conn.cursor()
        c.execute("SELECT DISTINCT Asd_Symbol FROM AGG_SEC_DAY;")
        symbols = [r[0] for r in c.fetchall()]
        assert "NOVAENERGY" in symbols
        assert "ALPHATECH" in symbols
        assert len(symbols) >= 15

        c.execute("SELECT COUNT(*) FROM AGG_SEC_DAY;")
        row_count = c.fetchone()[0]
        assert row_count >= 3000, f"Expected >= 3000 rows, got {row_count}"
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# 2. SANITIZED DUMMY DATABASE TESTS
# ══════════════════════════════════════════════════════════════════════════════
class TestSanitizedDummyDatabase:
    DB_PATH = "dummy_surveillance.db"

    def test_dummy_database_exists(self):
        assert os.path.exists(self.DB_PATH), f"Dummy DB {self.DB_PATH} must exist"

    def test_dummy_database_integrity_and_tables(self):
        conn = sqlite3.connect(self.DB_PATH)
        c = conn.cursor()
        c.execute("PRAGMA integrity_check;")
        assert c.fetchone()[0] == "ok"

        c.execute("PRAGMA foreign_key_check;")
        assert len(c.fetchall()) == 0

        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [r[0] for r in c.fetchall()]
        assert len(tables) == 15
        assert "daily_market_eod" in tables
        assert "client_identity_master" in tables
        assert "counterparty_trade_pairs" in tables
        conn.close()

    def test_dummy_analytical_views(self):
        conn = sqlite3.connect(self.DB_PATH)
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='view';")
        views = [r[0] for r in c.fetchall()]
        expected_views = [
            "v_daily_surveillance_summary",
            "v_participant_conduct_ranking",
            "v_counterparty_concentration"
        ]
        for ev in expected_views:
            assert ev in views, f"View {ev} missing from dummy database"

        # Verify counterparty concentration pairs
        c.execute("SELECT COUNT(*) FROM v_counterparty_concentration;")
        pair_cnt = c.fetchone()[0]
        assert pair_cnt > 0, "Expected counterparty concentration pairs to be identified by view"
        conn.close()

    def test_dummy_db_interoperability_with_engine(self):
        """Verifies that tables in dummy_surveillance.db feed directly into pv_alert_surveillance.py with 0 errors."""
        conn = sqlite3.connect(self.DB_PATH)
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
# 3. PROPRIETARY LEAK & PROHIBITED TERM SCANNER TESTS
# ══════════════════════════════════════════════════════════════════════════════
class TestProprietaryLeakPrevention:
    # Sanitized dummy reference schema & seed scripts that must be free of warehouse physical table prefixes
    SANITIZED_FILES_TO_AUDIT = [
        "DATA_REQUEST_SPEC.md",
        "DUMMY_SURVEILLANCE_SCHEMA.sql",
        "scripts/seed_dummy_db.py",
        "scripts/generate_sample_data_package.py",
        "sample_data_feeds/01_daily_market_ohlcv.csv",
        "sample_data_feeds/02_participant_trading.csv",
        "sample_data_feeds/03_counterparty_trade_pairs.csv",
        "sample_data_feeds/04_shareholding_structure.csv",
        "sample_data_feeds/05_corporate_actions.csv",
        "sample_data_feeds/06_trading_calendar.csv"
    ]
    # All surveillance specification & schema artifacts that must have circular and reversal completely purged
    ALL_FILES_TO_AUDIT = [
        "DATA_REQUEST_SPEC.md",
        "DUMMY_SURVEILLANCE_SCHEMA.sql",
        "scripts/seed_dummy_db.py",
        "scripts/generate_sample_data_package.py",
        "sample_data_feeds/01_daily_market_ohlcv.csv",
        "sample_data_feeds/02_participant_trading.csv",
        "sample_data_feeds/03_counterparty_trade_pairs.csv",
        "sample_data_feeds/04_shareholding_structure.csv",
        "sample_data_feeds/05_corporate_actions.csv",
        "sample_data_feeds/06_trading_calendar.csv"
    ]
    # Regex matching internal warehouse physical naming conventions
    LEAK_PATTERN = re.compile(r"\b(AGG_|FACT_|DIM_|DECL_|ASD_|ACSD_|APPD_|DDCL_)\w*", re.IGNORECASE)

    def test_no_proprietary_names_in_public_documentation(self):
        for filepath in self.SANITIZED_FILES_TO_AUDIT:
            assert os.path.exists(filepath), f"File {filepath} must exist"
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            matches = self.LEAK_PATTERN.findall(content)
            assert len(matches) == 0, f"Proprietary warehouse naming leak found in {filepath}: {matches[:10]}"

    def test_no_circular_or_reversal_in_spec_and_dummy_schema(self):
        """Ensures circular trading and trade reversal are completely purged per user requirements."""
        prohibited_terms = ["circular", "reversal"]
        for filepath in self.ALL_FILES_TO_AUDIT:
            assert os.path.exists(filepath), f"File {filepath} must exist"
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read().lower()
            for term in prohibited_terms:
                assert term not in content, f"Prohibited term '{term}' found in {filepath}"

    def test_sample_data_package_integrity(self):
        """Validates that PVASF_Sample_Data_Package.xlsx and CSV feeds match DATA_REQUEST_SPEC.md 1-to-1."""
        excel_path = "PVASF_Sample_Data_Package.xlsx"
        assert os.path.exists(excel_path), f"{excel_path} must exist"
        
        import openpyxl
        wb = openpyxl.load_workbook(excel_path, read_only=True)
        expected_sheets = [
            "Overview & Specifications",
            "1_Daily_Market_OHLCV",
            "2_Participant_Trading",
            "3_Counterparty_Pairs",
            "4_Shareholding_Structure",
            "5_Corporate_Actions",
            "6_Trading_Calendar"
        ]
        for s in expected_sheets:
            assert s in wb.sheetnames, f"Sheet {s} missing from {excel_path}"
        wb.close()

        # Validate CSV column definitions
        csv_specs = {
            "sample_data_feeds/01_daily_market_ohlcv.csv": [
                "symbol", "trade_date", "isin", "company_name", "open_price", "day_high_price",
                "day_low_price", "close_price", "total_traded_quantity", "total_traded_value",
                "upper_circuit_limit", "lower_circuit_limit", "delivery_quantity", "base_price_180d",
                "baseline_volume_mean", "baseline_volume_std"
            ],
            "sample_data_feeds/02_participant_trading.csv": [
                "symbol", "trade_date", "client_pan", "client_legal_name", "trading_member_id",
                "buy_quantity", "sell_quantity", "buy_turnover_value", "sell_turnover_value",
                "gross_positive_ltp_value", "gross_negative_ltp_value", "same_broker_wash_quantity",
                "client_category"
            ],
            "sample_data_feeds/03_counterparty_trade_pairs.csv": [
                "symbol", "trade_date", "buyer_pan", "buyer_legal_name", "seller_pan",
                "seller_legal_name", "buyer_tm_id", "seller_tm_id", "matched_quantity",
                "matched_turnover_value", "pairwise_ltp_push_value", "is_same_broker_wash",
                "algo_execution_flag"
            ],
            "sample_data_feeds/04_shareholding_structure.csv": [
                "symbol", "quarter_code", "filing_date", "category_type", "total_shares_count",
                "holding_percentage", "pledged_shares_percentage", "unique_holding_pans",
                "avg_daily_trading_pans"
            ],
            "sample_data_feeds/05_corporate_actions.csv": [
                "symbol", "isin", "announcement_date", "record_date", "ex_date",
                "action_category", "announcement_purpose", "ratio_or_value", "dilution_factor"
            ],
            "sample_data_feeds/06_trading_calendar.csv": [
                "calendar_date", "is_trading_day", "holiday_name"
            ]
        }

        for path, expected_cols in csv_specs.items():
            assert os.path.exists(path), f"CSV feed {path} must exist"
            df = pd.read_csv(path)
            assert len(df) > 0, f"CSV feed {path} must have data rows"
            assert list(df.columns) == expected_cols, f"Columns in {path} do not match DATA_REQUEST_SPEC.md: {list(df.columns)} vs {expected_cols}"


# ══════════════════════════════════════════════════════════════════════════════
# 4. CORE SURVEILLANCE MATHEMATICAL ENGINE TESTS
# ══════════════════════════════════════════════════════════════════════════════
class TestSurveillanceEngineMath:
    def test_engine_metric_scoring(self):
        config = SurveillanceConfig()
        engine = SurveillanceEngine(config)

        # Generate a synthetic 200-day dataframe with deliberate price pump
        dates = [date(2026, 1, 1) + timedelta(days=i) for i in range(200)]
        prices = [100.0 * (1.0 + 0.001 * i) for i in range(185)]
        # Add pump in last 15 days
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


# ══════════════════════════════════════════════════════════════════════════════
# 5. LIVE API ENDPOINTS & RBAC TESTS
# ══════════════════════════════════════════════════════════════════════════════
class TestFastAPIEndpoints:
    client = TestClient(app)

    def test_health_check(self):
        resp = self.client.get("/api/v1/surveillance/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ONLINE"

    def test_unauthenticated_request_rejected(self):
        resp = self.client.get("/api/v1/surveillance/dates")
        assert resp.status_code == 401, "Unauthenticated requests must receive 401 Unauthorized"

    def test_authenticated_flow(self):
        # 1. Login
        login_resp = self.client.post("/api/v1/auth/login", json={"username": "vishesh_admin", "password": "vishesh123"})
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Available Dates
        dates_resp = self.client.get("/api/v1/surveillance/dates", headers=headers)
        assert dates_resp.status_code == 200
        dates = dates_resp.json()
        assert len(dates) > 0

        # 3. Watchlist
        wl_resp = self.client.get("/api/v1/surveillance/watchlist?as_of_date=2026-08-27", headers=headers)
        assert wl_resp.status_code == 200
        wl = wl_resp.json()
        assert len(wl) > 0

        # 4. Scrip Detail: NOVAENERGY
        detail_resp = self.client.get("/api/v1/surveillance/scrip/NOVAENERGY?as_of_date=2026-08-27", headers=headers)
        assert detail_resp.status_code == 200
        d = detail_resp.json()
        assert d["ticker"] == "NOVAENERGY"
        assert d["risk"] in ["High", "Medium", "Low"]
        assert len(d["history"]) > 0

        # 5. Scrip Participants: NOVAENERGY
        parts_resp = self.client.get("/api/v1/surveillance/scrip/NOVAENERGY/participants", headers=headers)
        assert parts_resp.status_code == 200
        p = parts_resp.json()
        assert "counterparty_pairs" in p
        assert len(p["counterparty_pairs"]) > 0

        # 6. Scrip Excel Dossier Export: NOVAENERGY
        excel_resp = self.client.get("/api/v1/surveillance/scrip/NOVAENERGY/export-excel?as_of_date=2026-08-27", headers=headers)
        assert excel_resp.status_code == 200
        assert "spreadsheetml.sheet" in excel_resp.headers.get("content-type", "")
        assert len(excel_resp.content) > 5000, "Expected non-empty .xlsx binary payload"

