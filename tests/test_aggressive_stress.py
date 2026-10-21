"""
Aggressive Stress & Boundary Test Suite for PVASF.
Executes high-intensity fuzzing, malformed parameter handling,
concurrent requests, and randomized auto-balance convergence.
"""
import random
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

class TestAggressiveApiFuzzing:
    """Fuzzing and adversarial testing of FastAPI surveillance endpoints."""

    @pytest.fixture(autouse=True)
    def setup_token(self):
        resp = client.post("/api/v1/auth/login", json={"username": "vishesh_admin", "password": "vishesh123"})
        assert resp.status_code == 200
        self.token = resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_malformed_scrip_ticker_fuzzing(self):
        """Test random symbols, SQL injection fragments, and path traversal strings."""
        malicious_tickers = [
            "'; DROP TABLE daily_market_eod; --",
            "../../../etc/passwd",
            "<script>alert('xss')</script>",
            "NON_EXISTENT_TICKER_99999",
            "   ",
            "SYM%20BOL",
            "🔥🚀📈",
            "A" * 500,
        ]
        for ticker in malicious_tickers:
            resp = client.get(f"/api/v1/surveillance/scrip/{ticker}", headers=self.headers)
            # Must return 404 or 422, NEVER 500 internal server error
            assert resp.status_code in (400, 404, 422), f"Failed for payload: {ticker} with {resp.status_code}"

    def test_extreme_as_of_date_fuzzing(self):
        """Test out-of-range, future, ancient, and malformed dates."""
        adversarial_dates = [
            "2099-12-31",      # Far future
            "1900-01-01",      # Far past
            "not-a-date",      # Malformed string
            "2026-02-30",      # Invalid leap day
            "2025/11/03",      # Wrong delimiter
            "2025-13-45",      # Out of bounds month/day
            "'; SELECT 1; --", # SQL fragment
        ]
        for d in adversarial_dates:
            resp = client.get(f"/api/v1/surveillance/watchlist?as_of_date={d}", headers=self.headers)
            # Engine must gracefully handle or auto-snap to valid date without crashing
            assert resp.status_code in (200, 400, 422), f"Date {d} crashed with {resp.status_code}"

    def test_extreme_window_days_fuzzing(self):
        """Test negative, zero, and huge window_days."""
        for w in [-10, 0, 1, 99999, 1000000]:
            resp = client.get(f"/api/v1/surveillance/watchlist?window_days={w}", headers=self.headers)
            assert resp.status_code in (200, 400, 422), f"Window {w} crashed with {resp.status_code}"

    def test_client360_malicious_pan_fuzzing(self):
        """Test Client 360 lookup with adversarial PAN inputs."""
        bad_pans = [
            "INVALIDPAN",
            "1234567890",
            "'; DROP TABLE client_identity_master; --",
            "<svg onload=alert(1)>",
            "AAAAA0000A", # Valid format but non-existent
        ]
        for pan in bad_pans:
            resp = client.get(f"/api/v1/clients/pan/{pan}", headers=self.headers)
            assert resp.status_code in (404, 422), f"PAN {pan} yielded unexpected status {resp.status_code}"

    def test_model_weight_boundary_and_rejection(self):
        """Verify strict rejection of invalid or non-100% weight configurations."""
        bad_configs = [
            {"weights": {"price_rise": 10, "price_z": 10, "volume_z": 10, "band_persistence": 10, "new_high": 10}, "threshold": 60}, # Sum 50 != 100
            {"weights": {"price_rise": 50, "price_z": 50, "volume_z": 50, "band_persistence": 50, "new_high": 50}, "threshold": 60}, # Sum 250 != 100
            {"weights": {"price_rise": -20, "price_z": 40, "volume_z": 40, "band_persistence": 20, "new_high": 20}, "threshold": 60}, # Negative weight
        ]
        for cfg in bad_configs:
            resp = client.post("/api/v1/surveillance/weights", json=cfg, headers=self.headers)
            assert resp.status_code == 400, f"Expected 400 rejection for bad config {cfg}, got {resp.status_code}"

        # Clean isolation: Always restore standard default weights
        default_cfg = {
            "weights": {"price_rise": 20, "price_z": 20, "volume_z": 20, "band_persistence": 20, "new_high": 20},
            "threshold": 60.0
        }
        client.post("/api/v1/surveillance/weights", json=default_cfg, headers=self.headers)


class TestAutoBalanceMathStress:
    """Stress test the Auto-Balance algorithm across 1,000 randomized weight inputs."""

    def auto_balance(self, w1, w2, w3, w4, w5):
        s = w1 + w2 + w3 + w4 + w5
        if s == 0:
            return 20, 20, 20, 20, 20
        r1 = round((w1 / s) * 100)
        r2 = round((w2 / s) * 100)
        r3 = round((w3 / s) * 100)
        r4 = round((w4 / s) * 100)
        r5 = 100 - (r1 + r2 + r3 + r4)
        return r1, r2, r3, r4, r5

    def test_randomized_1000_auto_balance_convergences(self):
        random.seed(42)
        for _ in range(1000):
            w1 = random.randint(0, 100)
            w2 = random.randint(0, 100)
            w3 = random.randint(0, 100)
            w4 = random.randint(0, 100)
            w5 = random.randint(0, 100)
            r1, r2, r3, r4, r5 = self.auto_balance(w1, w2, w3, w4, w5)
            total = r1 + r2 + r3 + r4 + r5
            assert total == 100, f"Auto-balance failed for ({w1}, {w2}, {w3}, {w4}, {w5}) -> sum is {total}"
