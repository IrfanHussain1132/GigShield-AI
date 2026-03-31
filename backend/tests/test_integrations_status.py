def test_integration_status_reports_provider_readiness(client, monkeypatch):
    monkeypatch.setattr("config.ENABLE_TWILIO_SMS", True)
    monkeypatch.setattr("config.TWILIO_ACCOUNT_SID", "AC123")
    monkeypatch.setattr("config.TWILIO_AUTH_TOKEN", "secret-token")
    monkeypatch.setattr("config.TWILIO_SMS_FROM", "+14155550123")

    monkeypatch.setattr("config.ENABLE_WHATSAPP_NOTIFICATIONS", True)
    monkeypatch.setattr("config.TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

    monkeypatch.setattr("config.ENABLE_RAZORPAY_WEBHOOK", True)
    monkeypatch.setattr("config.RAZORPAY_WEBHOOK_SECRET", "supersecret")

    monkeypatch.setattr("config.ENABLE_KAFKA_EVENTS", True)
    monkeypatch.setattr("config.KAFKA_BOOTSTRAP_SERVERS", ["kafka:9092"])
    monkeypatch.setattr("config.KAFKA_TOPIC_PREFIX", "securesync")

    monkeypatch.setattr("config.ENABLE_REDIS_RATE_LIMIT", False)
    monkeypatch.setattr("config.ENABLE_REDIS_CACHE", True)
    monkeypatch.setattr("config.REDIS_URL", "redis://redis:6379/0")

    response = client.get("/api/v1/integrations/status")

    assert response.status_code == 200, response.text
    payload = response.json()

    providers = payload["providers"]
    assert providers["twilio_sms"]["enabled"] is True
    assert providers["twilio_sms"]["credentials_complete"] is True
    assert providers["twilio_sms"]["ready"] is True

    assert providers["twilio_whatsapp"]["enabled"] is True
    assert providers["twilio_whatsapp"]["credentials_complete"] is True
    assert providers["twilio_whatsapp"]["ready"] is True

    assert providers["razorpay_webhook"]["enabled"] is True
    assert providers["razorpay_webhook"]["credentials_complete"] is True
    assert providers["razorpay_webhook"]["ready"] is True

    assert providers["kafka_events"]["enabled"] is True
    assert providers["kafka_events"]["credentials_complete"] is True
    assert providers["kafka_events"]["bootstrap_servers_count"] == 1

    assert providers["redis"]["enabled"] is True
    assert providers["redis"]["credentials_complete"] is True
    assert providers["redis"]["features"] == {"rate_limit": False, "cache": True}

    assert payload["summary"] == {"enabled": 5, "ready": 5, "total": 5}


def test_integration_status_highlights_missing_credentials(client, monkeypatch):
    monkeypatch.setattr("config.ENABLE_TWILIO_SMS", True)
    monkeypatch.setattr("config.TWILIO_ACCOUNT_SID", "")
    monkeypatch.setattr("config.TWILIO_AUTH_TOKEN", "")
    monkeypatch.setattr("config.TWILIO_SMS_FROM", "")

    monkeypatch.setattr("config.ENABLE_WHATSAPP_NOTIFICATIONS", True)
    monkeypatch.setattr("config.TWILIO_WHATSAPP_FROM", "")

    monkeypatch.setattr("config.ENABLE_RAZORPAY_WEBHOOK", True)
    monkeypatch.setattr("config.RAZORPAY_WEBHOOK_SECRET", "")

    monkeypatch.setattr("config.ENABLE_KAFKA_EVENTS", True)
    monkeypatch.setattr("config.KAFKA_BOOTSTRAP_SERVERS", [])
    monkeypatch.setattr("config.KAFKA_TOPIC_PREFIX", "")

    monkeypatch.setattr("config.ENABLE_REDIS_RATE_LIMIT", True)
    monkeypatch.setattr("config.ENABLE_REDIS_CACHE", False)
    monkeypatch.setattr("config.REDIS_URL", "")

    response = client.get("/api/v1/integrations/status")

    assert response.status_code == 200, response.text
    payload = response.json()
    providers = payload["providers"]

    assert providers["twilio_sms"]["ready"] is False
    assert providers["twilio_sms"]["missing"] == [
        "twilio_account_sid",
        "twilio_auth_token",
        "twilio_sms_from",
    ]

    assert providers["twilio_whatsapp"]["ready"] is False
    assert providers["twilio_whatsapp"]["missing"] == [
        "twilio_account_sid",
        "twilio_auth_token",
        "twilio_whatsapp_from",
    ]

    assert providers["razorpay_webhook"]["ready"] is False
    assert providers["razorpay_webhook"]["missing"] == ["razorpay_webhook_secret"]

    assert providers["kafka_events"]["ready"] is False
    assert providers["kafka_events"]["missing"] == [
        "kafka_bootstrap_servers",
        "kafka_topic_prefix",
    ]

    assert providers["redis"]["ready"] is False
    assert providers["redis"]["missing"] == ["redis_url"]

    assert payload["summary"] == {"enabled": 5, "ready": 0, "total": 5}