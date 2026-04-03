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


def send_payout_notification(
    phone: str,
    amount_paise: int,
    trigger_type: str,
    payout_status: str,
    payout_ref: str,
) -> dict:
    """Send payout status updates via WhatsApp (Twilio) when enabled."""
    amount_rupees = round(float(amount_paise or 0) / 100.0, 2)

    if not config.ENABLE_WHATSAPP_NOTIFICATIONS:
        logger.info(
            "[Notify] Mock WhatsApp: phone=%s amount=%.2f trigger=%s status=%s ref=%s",
            phone,
            amount_rupees,
            trigger_type,
            payout_status,
            payout_ref,
        )
        return {"provider": "mock", "status": "skipped"}

    sid = config.TWILIO_ACCOUNT_SID
    token = config.TWILIO_AUTH_TOKEN
    from_whatsapp = config.TWILIO_WHATSAPP_FROM
    to_phone = _to_e164_indian(phone)

    if not (sid and token and from_whatsapp and to_phone):
        logger.warning("[Notify] WhatsApp enabled but credentials/from/to are incomplete. Falling back to mock.")
        return {"provider": "mock", "status": "misconfigured"}

    body = (
        "SecureSync AI update: "
        f"Payout status is {payout_status}. "
        f"Amount: Rs {amount_rupees:.2f}. "
        f"Trigger: {trigger_type}. "
        f"Ref: {payout_ref}."
    )
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"

    try:
        response = requests.post(
            url,
            data={
                "From": from_whatsapp,
                "To": f"whatsapp:{to_phone}",
                "Body": body,
            },
            auth=(sid, token),
            timeout=8,
        )
        if 200 <= response.status_code < 300:
            payload = response.json()
            return {
                "provider": "twilio_whatsapp",
                "status": "sent",
                "sid": payload.get("sid"),
            }

        logger.warning("[Notify] WhatsApp send failed: status=%s body=%s", response.status_code, response.text)
        return {"provider": "mock", "status": "failed_fallback"}
    except Exception as exc:
        logger.warning("[Notify] WhatsApp send exception: %s", exc)
        return {"provider": "mock", "status": "failed_fallback"}
