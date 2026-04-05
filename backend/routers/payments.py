import hashlib
import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

import config
import models
from database import get_db
from services import event_bus_service, notification_service, payout_lifecycle_service

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])
logger = logging.getLogger(__name__)


def _verify_razorpay_signature(raw_body: bytes, signature: str) -> bool:
    if not config.RAZORPAY_WEBHOOK_SECRET:
        return False
    digest = hmac.new(
        config.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(digest, signature or "")


def _extract_entity(payload: dict) -> dict:
    payload_obj = payload.get("payload", {}) or {}
    payout_entity = ((payload_obj.get("payout") or {}).get("entity") or {})
    if payout_entity:
        return payout_entity
    payment_entity = ((payload_obj.get("payment") or {}).get("entity") or {})
    return payment_entity or {}


def _resolve_target_status(event_name: str) -> str | None:
    mapping = {
        "payout.processed": "Credited",
        "payout.paid": "Credited",
        "payment.captured": "Credited",
        "payout.failed": "Failed",
        "payment.failed": "Failed",
        "payout.pending": "Processing",
        "payment.authorized": "Processing",
    }
    return mapping.get(event_name)


@router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if config.ENV_PROD and not config.ENABLE_RAZORPAY_WEBHOOK:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Razorpay webhook is disabled in production",
        )

    if config.ENABLE_RAZORPAY_WEBHOOK:
        if not config.RAZORPAY_WEBHOOK_SECRET:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Razorpay webhook secret not configured",
            )
        if not _verify_razorpay_signature(raw_body, signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Razorpay webhook signature",
            )

    payload = await request.json()
    event_name = payload.get("event", "")
    target_status = _resolve_target_status(event_name)
    if not target_status:
        return {"status": "ignored", "event": event_name, "updated": False}

    entity = _extract_entity(payload)
    notes = entity.get("notes") if isinstance(entity.get("notes"), dict) else {}

    upi_candidates = []
    for key in ("upi_ref", "reference_id", "id"):
        value = entity.get(key)
        if value:
            upi_candidates.append(str(value))
    for key in ("upi_ref", "payout_ref"):
        value = notes.get(key)
        if value:
            upi_candidates.append(str(value))

    payout = None
    for ref in upi_candidates:
        payout = db.query(models.Payout).filter(models.Payout.upi_ref == ref).first()
        if payout:
            break

    if payout is None and notes.get("payout_id"):
        try:
            payout_id = int(notes.get("payout_id"))
            payout = db.query(models.Payout).filter(models.Payout.id == payout_id).first()
        except (TypeError, ValueError):
            payout = None

    if payout is None:
        logger.warning(
            "Webhook payout not found: event=%s, upi_candidates=%s, notes=%s",
            event_name,
            upi_candidates,
            notes,
        )
        event_bus_service.publish_event(
            "payment.webhook.unmatched",
            {
                "event_name": event_name,
                "upi_candidates": upi_candidates,
                "notes": notes,
            },
        )
        return {"status": "ignored", "event": event_name, "updated": False, "reason": "payout_not_found"}

    external_ref = entity.get("id") or payout.upi_ref
    reason = f"Webhook event {event_name}"

    event_row = None
    if payout.status != target_status and payout_lifecycle_service.can_transition(payout.status, target_status):
        event_row = payout_lifecycle_service.transition_payout_status(
            db,
            payout,
            target_status,
            reason=reason,
            external_ref=external_ref,
        )
        db.commit()
    else:
        db.commit()

    event_payload = {
        "payout_id": payout.id,
        "policy_id": payout.policy_id,
        "event_name": event_name,
        "status": payout.status,
        "upi_ref": payout.upi_ref,
        "transitioned": event_row is not None,
    }
    event_bus_service.publish_event("payment.webhook", event_payload)

    if payout.status == "Credited" and payout.policy and payout.policy.worker and payout.policy.worker.phone:
        notification_service.send_payout_notification(
            phone=payout.policy.worker.phone,
            amount_paise=payout.amount_paise or 0,
            trigger_type=payout.type,
            payout_status=payout.status,
            payout_ref=payout.upi_ref or "",
        )

    return {
        "status": "ok",
        "event": event_name,
        "updated": event_row is not None,
        "payout_id": payout.id,
        "payout_status": payout.status,
    }
