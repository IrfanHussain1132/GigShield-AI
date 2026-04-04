# SecureSync AI — Workers Router (Phase 3)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
from pydantic import BaseModel, Field
from seed_data import lookup_partner
from services import premium_service
from services.auth_service import require_current_user

router = APIRouter(prefix="/api/v1/workers", tags=["workers"])


class PartnerVerifyRequest(BaseModel):
    platform: str = Field(default="swiggy", pattern="^(swiggy|zomato|both)$")
    partner_id: str = Field(min_length=4, max_length=32, pattern=r"^[A-Za-z0-9-]+$")


class PremiumQuoteRequest(BaseModel):
    partner_id: str = Field(min_length=4, max_length=32, pattern=r"^[A-Za-z0-9-]+$")
    zone: str = Field(default="Zone 4", pattern=r"^Zone\s[1-6]$")
    tier: str = Field(default="Basic", pattern="^(Basic|Premium)$")


def _get_authenticated_worker(db: Session, current_user: dict):
    worker = None
    worker_id = current_user.get("worker_id")
    phone = current_user.get("sub")
    if worker_id:
        worker = db.query(models.Worker).filter(models.Worker.id == worker_id).first()
    if worker is None and phone:
        worker = db.query(models.Worker).filter(models.Worker.phone == phone).first()
    return worker


@router.post("/verify")
async def verify_partner(
    request: PartnerVerifyRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_current_user),
):
    """
    Verify Swiggy/Zomato Partner ID against mock partner database.
    Creates or updates Worker record in DB.
    """
    partner_data = lookup_partner(request.partner_id)

    if not partner_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner ID not recognized")

    auth_worker = _get_authenticated_worker(db, current_user)
    if auth_worker is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated worker not found")

    requested_partner_id = request.partner_id.upper()

    # Update existing_partner_worker and auth_worker relationship logic.
    existing_partner_worker = db.query(models.Worker).filter(
        models.Worker.partner_id == requested_partner_id
    ).first()

    if existing_partner_worker and existing_partner_worker.id != auth_worker.id:
        if existing_partner_worker.phone and existing_partner_worker.phone != auth_worker.phone:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Partner ID already linked to another account",
            )
        # Identity Transfer: Take metadata from stub record
        auth_worker.name = partner_data["name"]
        auth_worker.platform = request.platform or partner_data["platform"]
        auth_worker.zone = partner_data["zone"]
        auth_worker.city = partner_data["city"]
        auth_worker.latitude = partner_data["lat"]
        auth_worker.longitude = partner_data["lon"]
        auth_worker.score = partner_data["score"]
        auth_worker.partner_since = partner_data["tenure"]
        auth_worker.tenure_months = partner_data["tenure_months"]
        auth_worker.hourly_rate = partner_data["hourly_rate"]
        auth_worker.weekly_income = partner_data["weekly_income"]
        auth_worker.is_verified = True
        
        # Avoid UNIQUE constraint violation: unset old partner_id before assigning to new worker
        existing_partner_worker.partner_id = None
        db.flush() 

        auth_worker.partner_id = requested_partner_id
        
        # Reassign legacy records (policies, etc.) to the new account
        # Note: We must reassign explicitly since cascading would delete them.
        for policy in existing_partner_worker.policies:
            policy.worker_id = auth_worker.id
        
        # Delete the stub/redundant record now that it's empty
        db.delete(existing_partner_worker)
        db.commit()
        worker = auth_worker
    else:
        worker = auth_worker
        worker.partner_id = requested_partner_id
        worker.name = partner_data["name"]
        worker.platform = request.platform or partner_data["platform"]
        worker.zone = partner_data["zone"]
        worker.city = partner_data["city"]
        worker.latitude = partner_data["lat"]
        worker.longitude = partner_data["lon"]
        worker.score = partner_data["score"]
        worker.partner_since = partner_data["tenure"]
        worker.tenure_months = partner_data["tenure_months"]
        worker.hourly_rate = partner_data["hourly_rate"]
        worker.weekly_income = partner_data["weekly_income"]
        worker.is_verified = True
        db.commit()

    db.refresh(worker)

    return {
        "status": "ACTIVE",
        "name": partner_data["name"],
        "zone": partner_data["zone"],
        "city": partner_data["city"],
        "tenure": partner_data["tenure"],
        "tenure_months": partner_data["tenure_months"],
        "score": partner_data["score"],
        "platform": partner_data["platform"],
        "hourly_rate": worker.hourly_rate,
        "weekly_income": worker.weekly_income,
        "worker_id": worker.id,
        "partner_id": requested_partner_id,
    }


@router.post("/premium-quote")
async def premium_quote(
    request: PremiumQuoteRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_current_user),
):
    """
    Calculate weekly premium using live weather data + 5-component risk formula.
    Returns SHAP-style explainability breakdown.
    """
    # Look up worker for personalized pricing
    worker = db.query(models.Worker).filter(
        models.Worker.partner_id == request.partner_id.upper()
    ).first()
    if worker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    auth_worker = _get_authenticated_worker(db, current_user)
    if auth_worker is None or auth_worker.id != worker.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Partner access denied")

    # Get zone coordinates
    import config
    zone_info = config.ZONES.get(request.zone, config.CHENNAI_ZONE4)

    # Calculate claim history
    claim_count = 0
    if worker:
        from sqlalchemy import func
        claim_count = (
            db.query(models.Payout)
            .join(models.Policy)
            .filter(models.Policy.worker_id == worker.id)
            .count()
        )

    result = await premium_service.calculate_premium(
        zone=request.zone,
        lat=zone_info["lat"],
        lon=zone_info["lon"],
        tier=request.tier,
        tenure_months=worker.tenure_months,
        claim_history_count=claim_count,
        score=worker.score,
        db=db,
    )

    return result
