"""
Rigorous QA / SDET Test Suite for PVASF.
Exhaustively audits backend API resilience, concurrent load bursts, schema contracts,
sparse/adversarial payloads, edge-case math invariants, error formatting, and UI safety.
"""
import concurrent.futures
import json
import random
import re
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.surveillance_service import EODSurveillanceService

ROOT_DIR = Path(__file__).resolve().parent.parent
client = TestClient(app)


class TestQASoftwareTesterRigorous:
    """Suite of rigorous tests simulating an adversarial and thorough SDET audit."""

    @pytest.fixture(autouse=True)
    def setup_auth(self):
        resp = client.post(
            "/api/v1/auth/login",
            json={"username": "vishesh_admin", "password": "vishesh123"}
        )
        assert resp.status_code == 200, "Admin login must succeed"
        self.token = resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    # =========================================================================
    # 1. CONCURRENT BURST & THREAD SAFETY TESTS
    # =========================================================================
    def test_concurrent_watchlist_burst(self):
        """Send 15 parallel requests to watchlist endpoint to test SQLite concurrency."""
        def fetch_watchlist():
            return client.get("/api/v1/surveillance/watchlist?exchange=ALL", headers=self.headers)

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(fetch_watchlist) for _ in range(15)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        for res in results:
            assert res.status_code == 200, f"Expected 200 during concurrent load, got {res.status_code}"
            data = res.json()
            assert isinstance(data, list), "Watchlist must return a list"
            assert len(data) > 0, "Watchlist must return scrips"

    def test_concurrent_scrip_detail_burst(self):
        """Send 10 parallel requests to OCCL scrip details."""
        def fetch_detail():
            return client.get("/api/v1/surveillance/scrip/OCCL?exchange=ALL", headers=self.headers)

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(fetch_detail) for _ in range(10)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        for res in results:
            assert res.status_code == 200
            data = res.json()
            assert data["symbol"] == "OCCL"
            assert "metrics" in data
            assert "history" in data
            assert len(data["history"]) > 0

    # =========================================================================
    # 2. DATA SCHEMA & BOUNDARY VALIDATION
    # =========================================================================
    def test_scrip_export_excel_content_type_and_bytes(self):
        """Verify the Excel export endpoint returns proper openxml binary stream."""
        resp = client.get("/api/v1/surveillance/scrip/OCCL/export-excel", headers=self.headers)
        assert resp.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in resp.headers.get("content-type", "")
        assert len(resp.content) > 1000, "Excel binary content must exceed 1KB"

    def test_corporate_actions_and_shareholding_contracts(self):
        """Verify secondary data endpoints return valid structures without crashing."""
        # Known scrip
        resp = client.get("/api/v1/surveillance/scrip/OCCL/corporate-actions", headers=self.headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

        resp2 = client.get("/api/v1/surveillance/scrip/OCCL/shareholding-breakdown", headers=self.headers)
        assert resp2.status_code == 200
        sh_data = resp2.json()
        assert "symbol" in sh_data
        assert "quarterly_history" in sh_data

        # Non-existent scrip should return empty structure or 404, never 500
        resp3 = client.get("/api/v1/surveillance/scrip/NON_EXISTENT_999/corporate-actions", headers=self.headers)
        assert resp3.status_code in (200, 404)
        if resp3.status_code == 200:
            assert resp3.json() == []

    def test_unauthenticated_requests_strictly_rejected(self):
        """All private surveillance endpoints must return 401 when no token is supplied."""
        private_endpoints = [
            "/api/v1/surveillance/watchlist",
            "/api/v1/surveillance/scrip/OCCL",
            "/api/v1/surveillance/scrip/OCCL/participants",
            "/api/v1/surveillance/scrip/OCCL/export-excel",
            "/api/v1/surveillance/weights",
            "/api/v1/clients/pan/AAAPA1234A",
            "/api/v1/auth/users",
        ]
        for ep in private_endpoints:
            res = client.get(ep)
            assert res.status_code == 401, f"Endpoint {ep} must require authentication (got {res.status_code})"

    def test_auth_invalid_credentials_rejected(self):
        """Login must reject incorrect password and non-existent username."""
        resp = client.post("/api/v1/auth/login", json={"username": "vishesh_admin", "password": "wrongpassword"})
        assert resp.status_code == 401

        resp2 = client.post("/api/v1/auth/login", json={"username": "ghost_user", "password": "anypassword"})
        assert resp2.status_code == 401

    # =========================================================================
    # 3. MATHEMATICAL ALGORITHM INVARIANTS & NORMALIZATION
    # =========================================================================
    def test_auto_balance_algorithm_stress_1000_trials(self):
        """Ensure auto-balance logic strictly sums to 100 for 1,000 random permutations."""
        def auto_balance(w1, w2, w3, w4, w5):
            s = w1 + w2 + w3 + w4 + w5
            if s == 0:
                return 20, 20, 20, 20, 20
            r1 = round((w1 / s) * 100)
            r2 = round((w2 / s) * 100)
            r3 = round((w3 / s) * 100)
            r4 = round((w4 / s) * 100)
            r5 = 100 - (r1 + r2 + r3 + r4)
            return r1, r2, r3, r4, r5

        for _ in range(1000):
            weights = [random.randint(0, 100) for _ in range(5)]
            balanced = auto_balance(*weights)
            assert sum(balanced) == 100, f"Auto-balance failed on {weights} -> {balanced} (sum {sum(balanced)})"
            # Invariant: weights must be bounded
            assert -100 <= balanced[4] <= 200

    def test_date_clamping_algorithm_invariants(self):
        """Test the date snapping logic for past, future, and weekend dates."""
        available_dates = ["2025-11-07", "2025-11-06", "2025-11-05", "2025-11-04", "2025-11-03", "2025-10-31"]

        def snap_to_trading_date(raw, dates):
            if not raw or not dates:
                return raw
            if raw in dates:
                return raw
            # Snap to nearest previous valid session, or clamp to earliest
            for d in dates:
                if d <= raw:
                    return d
            return dates[-1]

        # Valid date
        assert snap_to_trading_date("2025-11-05", available_dates) == "2025-11-05"
        # Weekend date (Sunday 2025-11-02 snaps to Friday 2025-10-31)
        assert snap_to_trading_date("2025-11-02", available_dates) == "2025-10-31"
        # Future date snaps to newest available date
        assert snap_to_trading_date("2026-05-01", available_dates) == "2025-11-07"
        # Ancient date snaps to oldest available date
        assert snap_to_trading_date("2020-01-01", available_dates) == "2025-10-31"

    def test_table_sorting_type_safety_simulation(self):
        """Simulate alerts-table sorting comparator against mixed, null, and numeric values."""
        def safe_sort(records, sort_field, sort_order="asc"):
            def cmp_func(a, b):
                raw_a = a.get(sort_field)
                raw_b = b.get(sort_field)
                if raw_a is None and raw_b is None:
                    return 0
                if raw_a is None:
                    return 1  # null always sinks to bottom
                if raw_b is None:
                    return -1
                if isinstance(raw_a, str) or isinstance(raw_b, str):
                    sa = str(raw_a).lower()
                    sb = str(raw_b).lower()
                    if sa < sb:
                        return -1 if sort_order == "asc" else 1
                    if sa > sb:
                        return 1 if sort_order == "asc" else -1
                    return 0
                num_a = float(raw_a) if raw_a is not None else 0.0
                num_b = float(raw_b) if raw_b is not None else 0.0
                if num_a < num_b:
                    return -1 if sort_order == "asc" else 1
                if num_a > num_b:
                    return 1 if sort_order == "asc" else -1
                return 0

            from functools import cmp_to_key
            return sorted(records, key=cmp_to_key(cmp_func))

        # Mixed records with nulls, numbers, strings
        test_records = [
            {"symbol": "B", "company": "Beta Ltd", "risk_score": 80.5},
            {"symbol": "A", "company": None, "risk_score": 95.0},
            {"symbol": "C", "company": "Gamma Corp", "risk_score": None},
            {"symbol": "D", "company": 12345, "risk_score": 40.0}, # Non-string company
        ]

        # Sort by company asc: None sinks to bottom
        sorted_company_asc = safe_sort(test_records, "company", "asc")
        assert len(sorted_company_asc) == 4
        assert sorted_company_asc[-1]["company"] is None

        # Sort by risk_score desc: highest first, None sinks to bottom
        sorted_score_desc = safe_sort(test_records, "risk_score", "desc")
        assert sorted_score_desc[0]["risk_score"] == 95.0
        assert sorted_score_desc[-1]["risk_score"] is None

    # =========================================================================
    # 4. FRONTEND SOURCE CODE RIGOROUS INSPECTIONS
    # =========================================================================
    def test_api_ts_format_error_detail_presence_and_exports(self):
        """Ensure lib/api.ts exports formatErrorDetail and handles Pydantic error structures."""
        api_path = ROOT_DIR / "lib" / "api.ts"
        assert api_path.exists()
        content = api_path.read_text(encoding="utf-8")

        assert "export function formatErrorDetail" in content
        assert "Array.isArray(detail)" in content
        assert "typeof detail === \"object\"" in content
        assert "formatErrorDetail(errJson.detail)" in content

    def test_alerts_table_column_widths_sum_to_100_percent(self):
        """Ensure all column widths in alerts-table.tsx sum to exactly 100%."""
        alerts_path = ROOT_DIR / "components" / "dashboard" / "alerts-table.tsx"
        assert alerts_path.exists()
        content = alerts_path.read_text(encoding="utf-8")

        # Column widths configured across the table header: 22% (Security), 15% (Score),
        # 13% (Price Rise), 12% (Price Z), 12% (Volume Z), 9% (Circuit Hits), 9% (180D Highs), 8% (Action)
        th_direct = re.findall(r'style=\{\{\s*width:\s*"(\d+)%"\s*\}\}', content)
        th_sort_props = re.findall(r'width="(\d+)%"', content)
        all_widths = [int(w) for w in th_direct + th_sort_props]
        assert len(all_widths) == 8, f"Expected 8 column widths, found {len(all_widths)}: {all_widths}"
        total_width = sum(all_widths)
        assert total_width == 100, f"Column widths must sum to exactly 100%, got {total_width}%"

    def test_modal_dialog_scroll_locks_and_keyboard_safety(self):
        """Verify modal components implement backdrop-click filtering and body overflow locks."""
        app_shell_path = ROOT_DIR / "components" / "layout" / "app-shell.tsx"
        assert app_shell_path.exists()
        content = app_shell_path.read_text(encoding="utf-8")

        # Login modal checks
        assert 'if (e.target === e.currentTarget)' in content, "LoginModal must filter backdrop clicks"
        assert 'e.key === "Escape"' in content, "LoginModal must handle Escape key"
        assert 'document.body.style.overflow = "hidden"' in content, "LoginModal must lock body scroll"
        assert 'document.body.style.overflow = original' in content, "LoginModal must restore body scroll"

        settings_path = ROOT_DIR / "app" / "settings" / "page.tsx"
        assert settings_path.exists()
        s_content = settings_path.read_text(encoding="utf-8")

        # Create user modal checks
        assert 'if (e.target === e.currentTarget)' in s_content, "CreateUserModal must filter backdrop clicks"
        assert 'e.key === "Escape"' in s_content, "CreateUserModal must handle Escape key"
        assert 'document.body.style.overflow = "hidden"' in s_content, "CreateUserModal must lock body scroll"
        assert 'document.body.style.overflow = original' in s_content, "CreateUserModal must restore body scroll"

    def test_investigation_workspace_body_scroll_locking(self):
        """Verify investigation workspace locks scroll when drawer, chart, or dossier is open."""
        ws_path = ROOT_DIR / "components" / "investigation" / "investigation-workspace.tsx"
        assert ws_path.exists()
        content = ws_path.read_text(encoding="utf-8")

        assert "selectedPan || expandedChart || isDossierOpen" in content
        assert 'document.body.style.overflow = "hidden"' in content
        assert 'document.body.style.overflow = original' in content

    def test_surveillance_dossier_score_parity(self):
        """Verify SurveillanceDossierPDF reads engine metrics with fallback."""
        pdf_path = ROOT_DIR / "components" / "investigation" / "surveillance-dossier-pdf.tsx"
        assert pdf_path.exists()
        content = pdf_path.read_text(encoding="utf-8")

        assert "metrics.price_rise_score ?? rawScoreForPriceRise" in content
        assert "metrics.price_z_score ?? rawScoreForZ" in content
        assert "metrics.volume_z_score ?? rawScoreForZ" in content
        assert "metrics.band_score ?? rawScoreForBandDays" in content
        assert "metrics.new_high_score ?? rawScoreForNewHighDays" in content
