import logging

import requests

import config

logger = logging.getLogger(__name__)


def _to_e164_indian(phone: str) -> str:
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    return f"+{digits}" if digits else ""


def send_otp_sms(phone: str, code: str) -> dict:
    """Send OTP via Twilio when configured. Falls back to mock mode safely."""
    if not config.ENABLE_TWILIO_SMS:
        return {"provider": "mock", "status": "skipped"}

    sid = config.TWILIO_ACCOUNT_SID
    token = config.TWILIO_AUTH_TOKEN
    from_number = config.TWILIO_SMS_FROM
    to_number = _to_e164_indian(phone)

    if not (sid and token and from_number and to_number):
        logger.warning("[OTP] Twilio SMS enabled but credentials/from/to are incomplete. Using mock fallback.")
        return {"provider": "mock", "status": "misconfigured"}

    body = f"Your SecureSync verification code is {code}. Valid for {config.OTP_TTL_MINUTES} minutes."
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"

    try:
        response = requests.post(
            url,
            data={"From": from_number, "To": to_number, "Body": body},
            auth=(sid, token),
            timeout=8,
        )
        if 200 <= response.status_code < 300:
            payload = response.json()
            return {
                "provider": "twilio",
                "status": "sent",
                "sid": payload.get("sid"),
            }

        logger.warning("[OTP] Twilio send failed: status=%s body=%s", response.status_code, response.text)
        return {"provider": "mock", "status": "failed_fallback"}
    except Exception as exc:
        logger.warning("[OTP] Twilio send exception: %s", exc)
        return {"provider": "mock", "status": "failed_fallback"}
