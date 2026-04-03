import hashlib
import hmac
import json

import models


def _signed_body(payload: dict, secret: str) -> tuple[str, str]:
    body = json.dumps(payload, separators=(",", ":"))
    signature = hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
    return body, signature


def test_webhook_enabled_without_secret_returns_503(client, monkeypatch):
    monkeypatch.setattr("config.ENABLE_RAZORPAY_WEBHOOK", True)
    monkeypatch.setattr("config.RAZORPAY_WEBHOOK_SECRET", "")

    response = client.post(
        "/api/v1/payments/razorpay/webhook",
        json={"event": "payment.captured"},
        headers={"X-Razorpay-Signature": "any"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Razorpay webhook secret not configured"


def test_webhook_rejects_invalid_signature_when_enabled(client, monkeypatch):
    monkeypatch.setattr("config.ENABLE_RAZORPAY_WEBHOOK", True)
    monkeypatch.setattr("config.RAZORPAY_WEBHOOK_SECRET", "supersecret")

    response = client.post(
        "/api/v1/payments/razorpay/webhook",
        json={"event": "payment.captured", "payload": {}},
        headers={"X-Razorpay-Signature": "bad-signature"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid Razorpay webhook signature"


def test_webhook_updates_payout_status_with_valid_signature(client, db_session, make_worker, make_policy, monkeypatch):
    monkeypatch.setattr("config.ENABLE_RAZORPAY_WEBHOOK", True)
    monkeypatch.setattr("config.RAZORPAY_WEBHOOK_SECRET", "supersecret")

    worker = make_worker(phone="9991118888", partner_id="SW-PAY01", name="Pay Worker")
    policy = make_policy(worker)
    payout = models.Payout(
        policy_id=policy.id,
        type="Heavy Rain",
        amount_paise=40800,
        status="Initiated",
        upi_ref="P-TEST-RAZOR-001",
    )
    db_session.add(payout)
    db_session.commit()
    db_session.refresh(payout)

    payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_123",
                    "notes": {"payout_id": str(payout.id)},
                }
            }
        },
    }
    body, signature = _signed_body(payload, "supersecret")

    response = client.post(
        "/api/v1/payments/razorpay/webhook",
        content=body,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": signature,
        },
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "ok"
    assert data["updated"] is True
    assert data["payout_status"] == "Credited"

    refreshed = db_session.query(models.Payout).filter(models.Payout.id == payout.id).first()
    assert refreshed.status == "Credited"
