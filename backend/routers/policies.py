# SecureSync AI — Policies Router (Phase 2)
from datetime import timedelta
import hashlib
import json
import random

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database import get_db
import models
import config
from pydantic import BaseModel, Field
from services.auth_service import require_current_user
from utils.time_utils import utcnow

router = APIRouter(prefix="/api/v1/policies", tags=["policies"])


class PolicyPurchaseRequest(BaseModel):
    worker_id: str = None       # partner_id string
    partner_id: str = None      # Accept both
    premium_amount: float = Field(default=47, gt=0, le=5000)
    tier: str = Field(default="Basic", pattern="^(Basic|Premium)$")
    token: str = None
    idempotency_key: str = Field(default=None, min_length=12, max_length=128)


def _build_request_hash(pid: str, premium_amount: float, tier: str) -> str:
    premium_paise = int(round(float(premium_amount) * 100))
    payload = f"{pid.upper()}|{premium_paise}|{tier.strip().lower()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _get_authenticated_worker(db: Session, current_user: dict):
    worker = None
    worker_id = current_user.get("worker_id")
    phone = current_user.get("sub")
    if worker_id:
        worker = db.query(models.Worker).filter(models.Worker.id == worker_id).first()
    if worker is None and phone:
        worker = db.query(models.Worker).filter(models.Worker.phone == phone).first()
    return worker


def _require_partner_access(db: Session, current_user: dict, partner_id: str):
    worker = db.query(models.Worker).filter(models.Worker.partner_id == partner_id.upper()).first()
    if worker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    auth_worker = _get_authenticated_worker(db, current_user)
    if auth_worker is None or auth_worker.id != worker.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Partner access denied")

    return worker


@router.post("/purchase")
async def purchase_policy(
    request: PolicyPurchaseRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_current_user),
):
    """
    Purchase a weekly insurance policy.
    Phase 2: Mock Razorpay payment (always succeeds).
    Persists Policy in SQLite.
    """
    pid = request.partner_id or request.worker_id or ""
    if not pid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="partner_id is required",
        )

    idempotency_key = (
        http_request.headers.get("X-Idempotency-Key")
        or request.idempotency_key
        or ""
    ).strip()
    if len(idempotency_key) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing or invalid idempotency key",
        )

    request_hash = _build_request_hash(pid, request.premium_amount, request.tier)
    idempotency_record = (
        db.query(models.IdempotencyRecord)
        .filter(
            models.IdempotencyRecord.scope == "policy_purchase",
            models.IdempotencyRecord.idempotency_key == idempotency_key,
        )
        .first()
    )

    if idempotency_record:
        if idempotency_record.request_hash != request_hash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Idempotency key reused with different request",
            )

        if idempotency_record.status == "completed" and idempotency_record.response_body:
            return json.loads(idempotency_record.response_body)

        if idempotency_record.status == "processing":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Request with this idempotency key is already in progress",
            )
    else:
        idempotency_record = models.IdempotencyRecord(
            scope="policy_purchase",
            idempotency_key=idempotency_key,
            request_hash=request_hash,
            status="processing",
        )
        db.add(idempotency_record)
        try:
            db.commit()
            db.refresh(idempotency_record)
        except IntegrityError:
            db.rollback()
            existing = (
                db.query(models.IdempotencyRecord)
                .filter(
                    models.IdempotencyRecord.scope == "policy_purchase",
                    models.IdempotencyRecord.idempotency_key == idempotency_key,
                )
                .first()
            )
            if existing and existing.status == "completed" and existing.response_body:
                return json.loads(existing.response_body)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Duplicate request",
            )

    try:
        worker = _require_partner_access(db, current_user, pid)

        # Deactivate any existing active policies for this worker
        existing = (
            db.query(models.Policy)
            .filter(models.Policy.worker_id == worker.id, models.Policy.is_active == True)
            .all()
        )
        for p in existing:
            p.is_active = False
            p.status = "expired"
        
        # Flush deactivations to avoid unique constraint trigger on new policy
        db.flush()

        # Create new policy
        now = utcnow()
        end_date = now + timedelta(days=7)

        max_payout = config.MAX_PREMIUM_BASIC if request.tier == "Basic" else config.MAX_PREMIUM_PREMIUM

        policy_ref = None
        for _ in range(5):
            candidate = f"SS-{random.randint(1000, 9999)}-IND"
            exists = db.query(models.Policy).filter(models.Policy.policy_ref == candidate).first()
            if not exists:
                policy_ref = candidate
                break
        if not policy_ref:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to generate policy reference",
            )

        policy = models.Policy(
            policy_ref=policy_ref,
            worker_id=worker.id,
            premium_amount=request.premium_amount,
            tier=request.tier,
            coverage_type=request.tier,
            max_payout_per_event=max_payout,
            start_date=now,
            end_date=end_date,
            is_active=True,
            status="active",
        )
        db.add(policy)
        db.commit()
        db.refresh(policy)

        # Format dates for frontend
        start_str = now.strftime("%B %d")
        end_str = end_date.strftime("%B %d")

        response_payload = {
            "status": "success",
            "message": f"Policy {request.tier} activated for Rs {policy.premium_amount:.2f}",
            "policy_id": policy_ref,
            "policy_db_id": policy.id,
            "start_date": start_str,
            "end_date": end_str,
            "tier": request.tier,
            "max_payout": round(policy.max_payout_per_event, 2),
            "premium_amount": round(policy.premium_amount, 2),
            "worker_name": worker.name,
            "zone": worker.zone,
            "city": worker.city,
        }

        idempotency_record.status = "completed"
        idempotency_record.response_body = json.dumps(response_payload)
        db.commit()
        return response_payload

    except HTTPException:
        idempotency_record.status = "failed"
        db.commit()
        raise
    except IntegrityError:
        db.rollback()
        idempotency_record.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Active policy conflict. Retry with a new idempotency key.",
        )
    except Exception:
        db.rollback()
        idempotency_record.status = "failed"
        db.commit()
        raise


@router.get("/active/{partner_id}")
async def get_active_policy(
    partner_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_current_user),
):
    """Get the current active policy for a worker."""
    worker = _require_partner_access(db, current_user, partner_id)

    policy = (
        db.query(models.Policy)
        .filter(
            models.Policy.worker_id == worker.id,
            models.Policy.is_active == True,
            models.Policy.status == "active",
        )
        .first()
    )

    if not policy:
        return {"has_policy": False}

    # Check if expired
    if policy.end_date and policy.end_date < utcnow():
        policy.is_active = False
        policy.status = "expired"
        db.commit()
        return {"has_policy": False, "last_expired": policy.policy_ref}

    # Calculate remaining days
    remaining = (policy.end_date - utcnow()).days if policy.end_date else 0

    return {
        "has_policy": True,
        "policy_ref": policy.policy_ref,
        "tier": policy.tier,
        "premium_amount": round(policy.premium_amount, 2),
        "max_payout": round(policy.max_payout_per_event, 2),
        "start_date": policy.start_date.strftime("%B %d") if policy.start_date else "",
        "end_date": policy.end_date.strftime("%B %d") if policy.end_date else "",
        "remaining_days": max(0, remaining),
        "status": policy.status,
    }


@router.get("/history/{partner_id}")
async def get_policy_history(
    partner_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_current_user),
):
    """Get all policies (past and current) for the account screen."""
    worker = _require_partner_access(db, current_user, partner_id)

    policies = (
        db.query(models.Policy)
        .filter(models.Policy.worker_id == worker.id)
        .order_by(models.Policy.created_at.desc())
        .all()
    )

    return [
        {
            "policy_ref": p.policy_ref,
            "tier": p.tier,
            "premium_amount": round(p.premium_amount, 2),
            "start_date": p.start_date.strftime("%d %b %Y") if p.start_date else "",
            "end_date": p.end_date.strftime("%d %b %Y") if p.end_date else "",
            "status": p.status,
            "is_active": p.is_active,
        }
        for p in policies
    ]
