def test_admin_overview_requires_auth(client):
    response = client.get("/api/v1/admin/overview")

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing Authorization token"


def test_admin_overview_forbidden_for_non_admin(client, make_worker, auth_headers, monkeypatch):
    monkeypatch.setattr("config.ADMIN_ALLOWED_PHONES", [])
    monkeypatch.setattr("config.ADMIN_ALLOWED_WORKER_IDS", [])

    worker = make_worker(phone="9990001111", partner_id="SW-ADM-001", name="Regular Worker")
    response = client.get("/api/v1/admin/overview", headers=auth_headers(worker))

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access denied"


def test_admin_overview_allows_allowlisted_phone(client, make_worker, auth_headers, monkeypatch):
    worker = make_worker(phone="9990002222", partner_id="SW-ADM-002", name="Admin Worker")
    monkeypatch.setattr("config.ADMIN_ALLOWED_PHONES", [worker.phone])
    monkeypatch.setattr("config.ADMIN_ALLOWED_WORKER_IDS", [])

    response = client.get("/api/v1/admin/overview", headers=auth_headers(worker))

    assert response.status_code == 200
    payload = response.json()
    assert "total_workers" in payload
    assert "loss_ratio" in payload
