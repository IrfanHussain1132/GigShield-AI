import pytest
from sqlalchemy.exc import IntegrityError

import models
from services import premium_service
from utils.time_utils import utcnow


def test_policy_purchase_idempotent_replay_returns_same_payload(client, db_session, make_worker, auth_headers):
    worker = make_worker(phone="9991112222", partner_id="SW-982341", name="Rajan")

    headers = {
        **auth_headers(worker),
        "X-Idempotency-Key": "idem-policy-purchase-0001",
    }
    payload = {
        "partner_id": worker.partner_id,
        "premium_amount": 47,
        "tier": "Standard",
    }

    first = client.post("/api/v1/policies/purchase", json=payload, headers=headers)
    second = client.post("/api/v1/policies/purchase", json=payload, headers=headers)

    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert first.json() == second.json()

    worker_policies = db_session.query(models.Policy).filter(models.Policy.worker_id == worker.id).all()
    assert len(worker_policies) == 1

    idem = (
        db_session.query(models.IdempotencyRecord)
        .filter(models.IdempotencyRecord.idempotency_key == "idem-policy-purchase-0001")
        .first()
    )
    assert idem is not None
    assert idem.status == "completed"


def test_idempotency_key_reuse_with_different_body_fails(client, make_worker, auth_headers):
    worker = make_worker(phone="9991113333", partner_id="SW-123456", name="Rajan")
    headers = {
        **auth_headers(worker),
        "X-Idempotency-Key": "idem-policy-purchase-0002",
    }

    ok_payload = {
        "partner_id": worker.partner_id,
        "premium_amount": 47,
        "tier": "Standard",
    }
    mismatch_payload = {
        "partner_id": worker.partner_id,
        "premium_amount": 76,
        "tier": "Plus",
    }

    first = client.post("/api/v1/policies/purchase", json=ok_payload, headers=headers)
    second = client.post("/api/v1/policies/purchase", json=mismatch_payload, headers=headers)

    assert first.status_code == 200, first.text
    assert second.status_code == 409
    assert second.json()["detail"] == "Idempotency key reused with different request"


def test_cross_account_policy_access_is_forbidden(client, make_worker, auth_headers):
    worker_one = make_worker(phone="9991114444", partner_id="SW-OWNER1", name="Owner")
    worker_two = make_worker(phone="9991115555", partner_id="SW-OWNER2", name="Other")

    headers = auth_headers(worker_one)
    response = client.get(f"/api/v1/policies/active/{worker_two.partner_id}", headers=headers)

    assert response.status_code == 403
    assert response.json()["detail"] == "Partner access denied"


def test_duplicate_policy_trigger_payout_blocked_by_db_constraint(db_session, make_worker, make_policy):
    worker = make_worker(phone="9991116666", partner_id="SW-TRIG01", name="Trigger Worker")
    policy = make_policy(worker)

    event = models.TriggerEvent(
        type="Heavy Rain",
        zone=worker.zone,
        signal_value="70mm",
        alert_level="RED",
        timestamp=utcnow(),
        is_confirmed=True,
        affected_workers_count=1,
    )
    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)

    first = models.Payout(
        policy_id=policy.id,
        trigger_event_id=event.id,
        type="Heavy Rain",
        amount_paise=40800,
        status="Credited",
    )
    db_session.add(first)
    db_session.commit()

    duplicate = models.Payout(
        policy_id=policy.id,
        trigger_event_id=event.id,
        type="Heavy Rain",
        amount_paise=40800,
        status="Credited",
    )
    db_session.add(duplicate)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_premium_quote_returns_zone_risk_metadata(client, make_worker, auth_headers, monkeypatch):
    async def _fake_signals(zone: str, lat: float, lon: float):
        return (
            {
                "current_temp": 31,
                "rain_forecast": [12, 8, 6, 4, 3, 2, 0],
                "max_temps": [34, 35, 36, 34, 33, 32, 31],
            },
            118,
        )

    monkeypatch.setattr(premium_service, "_get_cached_signals", _fake_signals)

    worker = make_worker(phone="9991117777", partner_id="SW-PREM01", name="Premium Worker")
    response = client.post(
        "/api/v1/workers/premium-quote",
        json={
            "partner_id": worker.partner_id,
            "zone": worker.zone,
            "tier": "Standard",
        },
        headers=auth_headers(worker),
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["zone_risk_source"] in {"static", "postgis_blended"}
    assert "geo_hotspot_risk" in payload
    assert payload["final_premium"] >= 25
