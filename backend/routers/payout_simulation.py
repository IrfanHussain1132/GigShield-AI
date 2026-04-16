# SecureSync AI — Payout Simulation Router (Phase 3 – Scale)
# Provides a realistic step-by-step payout lifecycle for demo/presentation
import time
import uuid
import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.auth_service import require_current_user
from services import fraud_service
from utils.time_utils import utcnow
import models
import config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/simulate", tags=["simulation"])


@router.post("/trigger-payout")
async def simulate_trigger_payout(
    current_user: dict = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    """
    Simulate a complete payout lifecycle for demo purposes.
    Returns each step with timing data for frontend animation.

    Steps: weather_detect → fraud_check → upi_dispatch → credited
    """
    worker_id = current_user.get("worker_id")
    if not worker_id:
        raise HTTPException(status_code=400, detail="Worker profile not found")

    worker = db.query(models.Worker).filter(models.Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    # Find active policy
    policy = (
        db.query(models.Policy)
        .filter(
            models.Policy.worker_id == worker_id,
            models.Policy.is_active == True,
        )
        .first()
    )

    steps = []
    t0 = time.time()

    # ── Step 1: Weather Detection ──
    trigger_type = "Heavy Rain"
    zone = worker.zone or "Zone 4"
    step1_start = time.time()
    steps.append({
        "stage": "weather_detect",
        "status": "completed",
        "icon": "rainy",
        "title": "Weather Disruption Detected",
        "detail": f"{trigger_type} confirmed in {zone} via OpenMeteo + IMD dual-source",
        "time_ms": int((time.time() - step1_start) * 1000) + 120,
    })

    # ── Step 2: Trigger Event Created ──
    event = models.TriggerEvent(
        type=trigger_type,
        zone=zone,
        signal_value="67.2mm",
        alert_level="RED",
        sources='["OpenMeteo","IMD-RS"]',
        is_confirmed=True,
        affected_workers_count=1,
    )
    db.add(event)
    db.flush()

    steps.append({
        "stage": "trigger_logged",
        "status": "completed",
        "icon": "bolt",
        "title": "Trigger Event Logged",
        "detail": f"Event #{event.id} — {trigger_type} at 67.2mm (threshold: 64.5mm)",
        "time_ms": int((time.time() - t0) * 1000) + 240,
    })

    # ── Step 3: Fraud Check ──
    step3_start = time.time()
    fraud_score = 0.0
    fraud_reason = "Clean — no risk signals"
    if policy:
        fraud_score, fraud_reason = fraud_service.calculate_fraud_score(
            db=db,
            worker_id=worker_id,
            trigger_event={"type": trigger_type, "zone": zone, "event_id": event.id},
            policy_id=policy.id,
        )
    decision = fraud_service.get_fraud_decision(fraud_score)
    payout_status = fraud_service.get_payout_status(fraud_score)

    steps.append({
        "stage": "fraud_check",
        "status": "completed",
        "icon": "verified" if decision == "auto_approve" else "policy",
        "title": "7-Layer Fraud Detection",
        "detail": f"Score: {fraud_score:.2f} — {fraud_reason[:80]}",
        "fraud_score": round(fraud_score, 3),
        "decision": decision,
        "time_ms": int((time.time() - step3_start) * 1000) + 340,
    })

    # ── Step 4: Payout Calculation ──
    payout_hrs = 4
    amount_paise = payout_hrs * 10200  # ₹102/hr × 4hrs = ₹408
    amount_rupees = amount_paise / 100

    steps.append({
        "stage": "payout_calc",
        "status": "completed",
        "icon": "calculate",
        "title": "Payout Calculated",
        "detail": f"₹102/hr × {payout_hrs} disruption hours = ₹{amount_rupees:.0f}",
        "amount_paise": amount_paise,
        "time_ms": int((time.time() - t0) * 1000) + 50,
    })

    # ── Step 5: UPI Dispatch ──
    upi_ref = f"P-SSAI-{event.id}-SIM-{uuid.uuid4().hex[:8]}"
    steps.append({
        "stage": "upi_dispatch",
        "status": "completed",
        "icon": "credit_card",
        "title": "UPI Instant Transfer",
        "detail": f"Razorpay UPI → {upi_ref}",
        "upi_ref": upi_ref,
        "time_ms": int((time.time() - t0) * 1000) + 890,
    })

    # ── Step 6: Credited ──
    if policy:
        payout = models.Payout(
            policy_id=policy.id,
            trigger_event_id=event.id,
            type=trigger_type,
            amount_paise=amount_paise,
            status=payout_status,
            reason=f"Simulated {trigger_type} disruption in {zone}",
            upi_ref=upi_ref,
            fraud_score=fraud_score,
            processing_time_ms=int((time.time() - t0) * 1000) + 1200,
        )
        db.add(payout)
        db.flush()
        payout_id = payout.id
    else:
        payout_id = None

    total_ms = int((time.time() - t0) * 1000) + 1200

    steps.append({
        "stage": "credited",
        "status": "completed",
        "icon": "check_circle",
        "title": f"₹{amount_rupees:.0f} {payout_status}",
        "detail": f"Total processing: {total_ms}ms — {'Instant credit via UPI' if payout_status == 'Credited' else 'Held for manual review'}",
        "payout_id": payout_id,
        "time_ms": total_ms,
    })

    db.commit()

    return {
        "success": True,
        "payout_id": payout_id,
        "amount_rupees": amount_rupees,
        "trigger_type": trigger_type,
        "zone": zone,
        "upi_ref": upi_ref,
        "fraud_score": round(fraud_score, 3),
        "decision": decision,
        "status": payout_status,
        "total_processing_ms": total_ms,
        "steps": steps,
    }


@router.get("/payout-lifecycle/{payout_id}")
async def get_payout_lifecycle(
    payout_id: int,
    current_user: dict = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    """Get the full lifecycle audit trail for a payout."""
    payout = db.query(models.Payout).filter(models.Payout.id == payout_id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")

    events = (
        db.query(models.PayoutStatusEvent)
        .filter(models.PayoutStatusEvent.payout_id == payout_id)
        .order_by(models.PayoutStatusEvent.created_at.asc())
        .all()
    )

    return {
        "payout_id": payout_id,
        "current_status": payout.status,
        "amount_rupees": (payout.amount_paise or 0) / 100,
        "type": payout.type,
        "upi_ref": payout.upi_ref,
        "fraud_score": payout.fraud_score,
        "processing_time_ms": payout.processing_time_ms,
        "lifecycle": [
            {
                "from_status": e.from_status,
                "to_status": e.to_status,
                "reason": e.reason,
                "timestamp": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
    }
