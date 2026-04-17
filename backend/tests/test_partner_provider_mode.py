def test_verify_partner_known_id_succeeds_in_strict_mock_mode(client, make_worker, auth_headers, monkeypatch):
    monkeypatch.setattr("config.PARTNER_PROVIDER_MODE", "mock")
    monkeypatch.setattr("config.STRICT_MOCK_PARTNER_IDS", True)

    worker = make_worker(phone="9992221001", partner_id="SW-LOCAL-001", name="Demo Worker")
    response = client.post(
        "/api/v1/workers/verify",
        json={"platform": "swiggy", "partner_id": "SW-982341"},
        headers=auth_headers(worker),
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["status"] == "ACTIVE"
    assert payload["provider_mode"] == "mock"
    assert payload["strict_mock_partner_ids"] is True


def test_verify_partner_unknown_id_rejected_in_strict_mock_mode(client, make_worker, auth_headers, monkeypatch):
    monkeypatch.setattr("config.PARTNER_PROVIDER_MODE", "mock")
    monkeypatch.setattr("config.STRICT_MOCK_PARTNER_IDS", True)

    worker = make_worker(phone="9992221002", partner_id="SW-LOCAL-002", name="Demo Worker")
    response = client.post(
        "/api/v1/workers/verify",
        json={"platform": "swiggy", "partner_id": "SW-UNKNOWN-999"},
        headers=auth_headers(worker),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Partner ID not recognized"


def test_verify_partner_unknown_id_uses_fallback_when_not_strict(client, make_worker, auth_headers, monkeypatch):
    monkeypatch.setattr("config.PARTNER_PROVIDER_MODE", "mock")
    monkeypatch.setattr("config.STRICT_MOCK_PARTNER_IDS", False)

    worker = make_worker(phone="9992221003", partner_id="SW-LOCAL-003", name="Demo Worker")
    response = client.post(
        "/api/v1/workers/verify",
        json={"platform": "swiggy", "partner_id": "SW-UNKNOWN-888"},
        headers=auth_headers(worker),
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["name"] == "Rajan Kumar"
    assert payload["provider_mode"] == "mock"
    assert payload["strict_mock_partner_ids"] is False


def test_verify_partner_unsupported_provider_mode_returns_503(client, make_worker, auth_headers, monkeypatch):
    monkeypatch.setattr("config.PARTNER_PROVIDER_MODE", "swiggy_live")

    worker = make_worker(phone="9992221004", partner_id="SW-LOCAL-004", name="Demo Worker")
    response = client.post(
        "/api/v1/workers/verify",
        json={"platform": "swiggy", "partner_id": "SW-982341"},
        headers=auth_headers(worker),
    )

    assert response.status_code == 503
    assert "Unsupported PARTNER_PROVIDER_MODE" in response.json()["detail"]
