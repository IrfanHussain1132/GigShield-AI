# SecureSync AI — Backend Integration Tests
# Coverage: Auth hardening, IDOR protection, dashboard auth
# Run: pytest backend/tests/test_integration.py -v

import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Set env vars BEFORE importing app modules
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_securesync.db")
os.environ["ENABLE_REDIS_RATE_LIMIT"] = "false"
os.environ["ENABLE_REDIS_CACHE"] = "false"
os.environ["ENABLE_TWILIO_SMS"] = "false"
os.environ["ENABLE_KAFKA_EVENTS"] = "false"

import models
from database import engine
import config

# Patch config in-process for test isolation
config.ENABLE_PHASE2_MOCK_OTP = True
config.PHASE2_MOCK_OTP_CODE = "123456"
config.ENABLE_REDIS_RATE_LIMIT = False
config.ENABLE_REDIS_CACHE = False
config.AUTO_CREATE_SCHEMA = True

# Create all tables before tests run (lifespan doesn't fire in TestClient)
models.Base.metadata.create_all(bind=engine)

from main import app

client = TestClient(app, raise_server_exceptions=False)


# ──────────────────────────────────────────────────
# Helper: Register a test user and get a token
# ──────────────────────────────────────────────────
def _get_token(phone: str = "9999999999") -> tuple[str, int]:
    """Send mock OTP login and return (token, worker_id)."""
    # Send OTP
    r = client.post("/api/v1/auth/send-otp", json={"phone": phone})
    assert r.status_code == 200, f"send-otp failed: {r.text}"

    # Verify with mock code
    r = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    assert r.status_code == 200, f"verify-otp failed: {r.text}"
    data = r.json()
    assert "token" in data, f"No token in response: {data}"
    return data["token"], data["worker_id"]


# ──────────────────────────────────────────────────
# Auth Tests
# ──────────────────────────────────────────────────
class TestAuthHardening:
    def test_send_otp_valid_phone(self):
        """Valid phone should return success."""
        r = client.post("/api/v1/auth/send-otp", json={"phone": "9988776655"})
        assert r.status_code == 200
        assert r.json()["status"] == "success"

    def test_send_otp_invalid_phone_short(self):
        """Short phone number must be rejected with 400."""
        r = client.post("/api/v1/auth/send-otp", json={"phone": "12345"})
        assert r.status_code == 400

    def test_send_otp_invalid_phone_alpha(self):
        """Non-numeric phone must be rejected with 400."""
        r = client.post("/api/v1/auth/send-otp", json={"phone": "abcde12345"})
        assert r.status_code == 400

    def test_verify_otp_valid_mock(self):
        """Any 6-digit OTP should return a JWT token in mock mode."""
        phone = "9111111111"
        client.post("/api/v1/auth/send-otp", json={"phone": phone})
        r = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": "123456"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["status"] == "success"

    def test_verify_otp_any_6_digit_code_returns_200_in_mock_mode(self):
        """In mock mode, any 6-digit numeric OTP should be accepted."""
        phone = "9222222222"
        client.post("/api/v1/auth/send-otp", json={"phone": phone})
        r = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": "000000"})
        assert r.status_code == 200, f"Expected 200 but got {r.status_code}: {r.text}"
        data = r.json()
        assert "token" in data
        assert data["status"] == "success"

    def test_verify_otp_malformed_code_returns_400(self):
        """Non-6-digit code should be rejected with 400."""
        phone = "9333333333"
        client.post("/api/v1/auth/send-otp", json={"phone": phone})
        r = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": "12"})
        assert r.status_code == 400

    def test_me_without_token_returns_401(self):
        """Unauthenticated /auth/me should return 401."""
        r = client.get("/api/v1/auth/me")
        assert r.status_code == 401

    def test_me_with_valid_token(self):
        """Authenticated /auth/me should return worker info."""
        token, worker_id = _get_token("9444444444")
        r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["worker_id"] == worker_id


# ──────────────────────────────────────────────────
# Dashboard Auth & IDOR Tests
# ──────────────────────────────────────────────────
class TestDashboardAuth:
    def test_dashboard_summary_no_token_returns_401(self):
        """Dashboard endpoint without auth must return 401."""
        r = client.get("/api/v1/dashboard/summary/SW-982341")
        assert r.status_code == 401, f"Expected 401 but got {r.status_code}"

    def test_payout_history_no_token_returns_401(self):
        """Payout history without auth must return 401."""
        r = client.get("/api/v1/dashboard/payout-history/SW-982341")
        assert r.status_code == 401, f"Expected 401 but got {r.status_code}"

    def test_zone_status_no_token_returns_401(self):
        """Zone status without auth must return 401."""
        r = client.get("/api/v1/dashboard/zone-status/Zone 4")
        assert r.status_code == 401, f"Expected 401 but got {r.status_code}"

    def test_dashboard_idor_protection(self):
        """
        User A's token must not be able to access User B's dashboard.
        IDOR: If user A tries to read partner_id of user B → 403 or 404.
        """
        token_a, _ = _get_token("9555555555")
        token_b, _ = _get_token("9666666666")

        # First, get user B's partner_id if they have one
        me_b = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_b}"})
        partner_id_b = me_b.json().get("partner_id")

        if not partner_id_b:
            pytest.skip("User B has no partner_id — IDOR test requires a verified partner")

        # User A tries to read User B's dashboard
        r = client.get(
            f"/api/v1/dashboard/summary/{partner_id_b}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert r.status_code in (403, 404), (
            f"IDOR vulnerability: User A accessed User B's data! Got {r.status_code}"
        )


# ──────────────────────────────────────────────────
# Health Check Tests
# ──────────────────────────────────────────────────
class TestHealthCheck:
    def test_health_returns_200(self):
        r = client.get("/api/v1/health")
        assert r.status_code == 200

    def test_health_has_required_fields(self):
        r = client.get("/api/v1/health")
        data = r.json()
        assert "status" in data
        assert "checks" in data
        assert "database" in data["checks"]
        assert "trigger_monitor" in data["checks"]

    def test_health_db_ok(self):
        r = client.get("/api/v1/health")
        assert r.json()["checks"]["database"] == "ok"


# ──────────────────────────────────────────────────
# Cleanup: remove test DB after session
# ──────────────────────────────────────────────────
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_db():
    yield
    test_db = os.path.join(os.path.dirname(__file__), "..", "test_securesync.db")
    if os.path.exists(test_db):
        os.remove(test_db)
