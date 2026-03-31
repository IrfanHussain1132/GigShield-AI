def test_integrations_status_has_expected_top_level_keys(client):
    response = client.get("/api/v1/integrations/status")

    assert response.status_code == 200, response.text
    payload = response.json()

    assert set(payload.keys()) == {"providers", "summary"}

    providers = payload["providers"]
    assert set(providers.keys()) == {
        "twilio_sms",
        "twilio_whatsapp",
        "razorpay_webhook",
        "kafka_events",
        "redis",
    }

    for provider_name, provider_payload in providers.items():
        assert "enabled" in provider_payload, provider_name
        assert "credentials_complete" in provider_payload, provider_name
        assert "ready" in provider_payload, provider_name
        assert "missing" in provider_payload, provider_name

    summary = payload["summary"]
    assert set(summary.keys()) == {"enabled", "ready", "total"}
    assert summary["total"] == 5
