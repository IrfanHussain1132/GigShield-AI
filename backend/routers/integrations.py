from fastapi import APIRouter

import config

router = APIRouter(prefix="/api/v1/integrations", tags=["integrations"])


def _status(enabled: bool, checks: dict[str, bool], extra: dict | None = None) -> dict:
    credentials_complete = all(checks.values()) if checks else True
    payload = {
        "enabled": enabled,
        "credentials_complete": credentials_complete,
        "ready": enabled and credentials_complete,
        "missing": [name for name, ok in checks.items() if not ok],
    }
    if extra:
        payload.update(extra)
    return payload


@router.get("/status")
async def integration_status():
    twilio_core_checks = {
        "twilio_account_sid": bool(config.TWILIO_ACCOUNT_SID),
        "twilio_auth_token": bool(config.TWILIO_AUTH_TOKEN),
    }

    providers = {
        "twilio_sms": _status(
            config.ENABLE_TWILIO_SMS,
            {
                **twilio_core_checks,
                "twilio_sms_from": bool(config.TWILIO_SMS_FROM),
            },
        ),
        "twilio_whatsapp": _status(
            config.ENABLE_WHATSAPP_NOTIFICATIONS,
            {
                **twilio_core_checks,
                "twilio_whatsapp_from": bool(config.TWILIO_WHATSAPP_FROM),
            },
        ),
        "razorpay_webhook": _status(
            config.ENABLE_RAZORPAY_WEBHOOK,
            {
                "razorpay_webhook_secret": bool(config.RAZORPAY_WEBHOOK_SECRET),
            },
        ),
        "kafka_events": _status(
            config.ENABLE_KAFKA_EVENTS,
            {
                "kafka_bootstrap_servers": bool(config.KAFKA_BOOTSTRAP_SERVERS),
                "kafka_topic_prefix": bool(config.KAFKA_TOPIC_PREFIX),
            },
            extra={
                "bootstrap_servers_count": len(config.KAFKA_BOOTSTRAP_SERVERS),
            },
        ),
        "redis": _status(
            config.ENABLE_REDIS_RATE_LIMIT or config.ENABLE_REDIS_CACHE,
            {
                "redis_url": bool(config.REDIS_URL),
            },
            extra={
                "features": {
                    "rate_limit": config.ENABLE_REDIS_RATE_LIMIT,
                    "cache": config.ENABLE_REDIS_CACHE,
                }
            },
        ),
    }

    enabled_count = sum(1 for p in providers.values() if p["enabled"])
    ready_count = sum(1 for p in providers.values() if p["ready"])

    return {
        "providers": providers,
        "summary": {
            "enabled": enabled_count,
            "ready": ready_count,
            "total": len(providers),
        },
    }