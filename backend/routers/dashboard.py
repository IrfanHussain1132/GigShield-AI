# SecureSync AI — Dashboard Router (Phase 2)
# Live data endpoints for Home, Coverage, Zone Status, Payouts screens
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from database import get_db
import models
import config
from services import trigger_service
from services import redis_service
from services.auth_service import require_current_user
from utils.time_utils import utcnow

router = APIRouter(
    prefix="/api/v1/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(require_current_user)],
)


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


def _cache_get(key: str):
    if not config.ENABLE_REDIS_CACHE:
        return None
    return redis_service.get_cached_json(key)


def _cache_set(key: str, payload, ttl_seconds: int | None = None) -> None:
    if not config.ENABLE_REDIS_CACHE:
        return
    ttl = ttl_seconds if ttl_seconds is not None else config.REDIS_CACHE_TTL_SECONDS
    redis_service.set_cached_json(key, payload, ttl)


@router.get("/summary/{worker_id}")
async def dashboard_summary(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_current_user),
):
    """
    Dashboard home screen data: earnings, payouts, policy streak, score.
    worker_id = partner_id string (e.g. "SW-982341")
    """
    worker = _require_partner_access(db, current_user, worker_id)

    # Find active policy
    policy = (
        db.query(models.Policy)
        .filter(
            models.Policy.worker_id == worker.id,
            models.Policy.is_active == True,
        )
        .first()
    )

    # Calculate payout stats
    payouts = []
    month_start = utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if policy:
        payouts = (
            db.query(models.Payout)
            .filter(
                models.Payout.policy_id == policy.id,
                models.Payout.status.in_(["Credited", "Pending", "Processing", "Initiated"]),
            )
            .all()
        )

    # Monthly payouts (across all policies)
    all_policies = db.query(models.Policy).filter(models.Policy.worker_id == worker.id).all()
    policy_ids = [p.id for p in all_policies]

    month_payouts = []
    if policy_ids:
        month_payouts = (
            db.query(models.Payout)
            .filter(
                models.Payout.policy_id.in_(policy_ids),
                models.Payout.date >= month_start,
                models.Payout.status == "Credited",
            )
            .all()
        )

    month_total_paise = sum((p.amount_paise or 0) for p in month_payouts)
    total_payouts_paise = sum((p.amount_paise or 0) for p in payouts) if payouts else 0

    # Policy streak: count consecutive active weeks
    policy_streak = len([p for p in all_policies if p.status in ("active", "expired")])

    # Mock daily earnings estimate: hourly_rate × 8 hours + payouts
    daily_base_paise = (worker.hourly_rate_paise or 10200) * 8

    return {
        "name": worker.name.split()[0] if worker.name else "Partner",
        "zone": worker.zone or "Zone 4",
        "city": worker.city or "South Chennai",
        "score": worker.score or 82,
        "today_earnings": int((daily_base_paise + total_payouts_paise) / 100),
        "insurance_payout": int(total_payouts_paise / 100),
        "is_on_track": True,
        "month_total": int(month_total_paise / 100),
        "payouts_count": len(month_payouts),
        "policy_streak": min(policy_streak, 12),
        "has_active_policy": policy is not None and policy.is_active,
        "hourly_rate": worker.hourly_rate,
        "premium_amount": policy.premium_amount if policy else 0,
        "tier": policy.tier if policy else "Standard",
    }


@router.get("/payout-history/{worker_id}")
async def payout_history(
    worker_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_current_user),
):
    """Full payout history for the Payouts screen."""
    worker = _require_partner_access(db, current_user, worker_id)

    # Get all policies for this worker
    policies = db.query(models.Policy).filter(models.Policy.worker_id == worker.id).all()
    if not policies:
        return []

    policy_ids = [p.id for p in policies]
    payouts = (
        db.query(models.Payout)
        .filter(models.Payout.policy_id.in_(policy_ids))
        .order_by(desc(models.Payout.date))
        .offset(offset)
        .limit(limit)
        .all()
    )

    icon_map = {
        "Heavy Rain": "rainy",
        "AQI Danger": "air",
        "Heat Wave": "thermostat",
        "Red Alert": "notifications_active",
        "Dense Fog": "foggy",
        "Gridlock": "traffic",
        "Bandh": "lock_clock",
        "Platform Outage": "cloud_off",
    }

    history = []
    for p in payouts:
        history.append({
            "id": p.id,
            "type": p.type,
            "date": p.date.strftime("%d %b, %I:%M %p") if p.date else "",
            "amount": round((p.amount_paise or 0) / 100, 2),
            "status": p.status,
            "status_updated_at": p.status_updated_at.strftime("%d %b, %I:%M %p") if p.status_updated_at else "",
            "icon": icon_map.get(p.type, "payments"),
            "reason": p.reason or "",
            "upi_ref": p.upi_ref or "",
            "fraud_score": round(p.fraud_score, 2) if p.fraud_score else 0,
            "processing_time_ms": p.processing_time_ms or 0,
        })

    return history


@router.get("/payout-total/{worker_id}")
async def payout_total(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_current_user),
):
    """Total payout summary for the Payouts screen header."""
    worker = _require_partner_access(db, current_user, worker_id)

    policies = db.query(models.Policy).filter(models.Policy.worker_id == worker.id).all()
    policy_ids = [p.id for p in policies]

    if not policy_ids:
        return {"total": 0, "count": 0, "this_month": 0, "this_month_count": 0}

    all_payouts = (
        db.query(models.Payout)
        .filter(
            models.Payout.policy_id.in_(policy_ids),
            models.Payout.status == "Credited",
        )
        .all()
    )

    month_start = utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_payouts = [p for p in all_payouts if p.date and p.date >= month_start]

    total_paise = sum((p.amount_paise or 0) for p in all_payouts)
    month_total_paise = sum((p.amount_paise or 0) for p in month_payouts)

    return {
        "total": int(total_paise / 100),
        "count": len(all_payouts),
        "this_month": int(month_total_paise / 100),
        "this_month_count": len(month_payouts),
    }


@router.get("/zone-status/{zone_name}")
async def zone_status(zone_name: str, db: Session = Depends(get_db)):
    """
    Live zone status with real sensor data + trigger history.
    Used by the Live Zone Status screen.
    """
    cache_key = f"dashboard:zone_status:{zone_name.lower().replace(' ', '_')}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    # Get live weather/sensor data
    live_data = trigger_service.get_live_zone_data(zone_name)

    # Get latest trigger event for this zone
    latest_event = (
        db.query(models.TriggerEvent)
        .filter(models.TriggerEvent.zone == zone_name)
        .order_by(desc(models.TriggerEvent.timestamp))
        .first()
    )

    # Determine alert level from live data
    alert_level = "GREEN"
    status_text = "Safe"
    if live_data["rain_mm"] >= 64.5:
        alert_level = "RED"
        status_text = "Heavy Rain"
    elif live_data["aqi"] >= 300:
        alert_level = "ORANGE"
        status_text = "AQI Danger"
    elif live_data["temp_c"] >= 40:
        alert_level = "RED"
        status_text = "Heat Wave"
    elif live_data["visibility_km"] < 0.2:
        alert_level = "RED"
        status_text = "Dense Fog"
    elif live_data["rain_mm"] > 15:
        alert_level = "YELLOW"
        status_text = "Light Rain"

    # Use trigger event data if recent (within 30 min)
    if latest_event:
        event_age = (utcnow() - latest_event.timestamp).total_seconds()
        if event_age < 1800:  # 30 minutes
            alert_level = latest_event.alert_level or alert_level
            status_text = latest_event.type or status_text

    # Get risk forecast
    forecast = trigger_service.get_risk_forecast(zone_name)

    payload = {
        "zone": zone_name,
        "status": status_text,
        "alert_level": alert_level,
        # Live sensor readings
        "rain_mm": live_data["rain_mm"],
        "aqi": live_data["aqi"],
        "temp_c": live_data["temp_c"],
        "visibility_km": live_data["visibility_km"],
        "wind_kmh": live_data["wind_kmh"],
        "traffic_speed": live_data["traffic_speed"],
        # Risk forecast
        "forecast": forecast,
        # Latest event info
        "latest_event": {
            "type": latest_event.type if latest_event else None,
            "signal": latest_event.signal_value if latest_event else None,
            "time": latest_event.timestamp.strftime("%I:%M %p") if latest_event else None,
        } if latest_event else None,
    }
    _cache_set(cache_key, payload, ttl_seconds=min(config.REDIS_CACHE_TTL_SECONDS, 30))
    return payload


@router.get("/live-weather/{zone_name}")
async def live_weather(zone_name: str):
    """
    Dedicated endpoint for the weather strip on home screen.
    Returns compact sensor readings. Cached for 5 minutes.
    """
    cache_key = f"dashboard:live_weather:{zone_name.lower().replace(' ', '_')}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    live = trigger_service.get_live_zone_data(zone_name)
    payload = {
        "rain_mm": live["rain_mm"],
        "aqi": live["aqi"],
        "temp_c": live["temp_c"],
        "visibility_km": live["visibility_km"],
    }
    _cache_set(cache_key, payload, ttl_seconds=min(config.REDIS_CACHE_TTL_SECONDS, 20))
    return payload


@router.get("/risk-forecast/{zone_name}")
async def risk_forecast(zone_name: str):
    """6-hour risk forecast for the home screen forecast strip."""
    cache_key = f"dashboard:risk_forecast:{zone_name.lower().replace(' ', '_')}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    forecast = trigger_service.get_risk_forecast(zone_name)
    _cache_set(cache_key, forecast, ttl_seconds=min(config.REDIS_CACHE_TTL_SECONDS, 20))
    return forecast


@router.get("/latest-payout/{worker_id}")
async def latest_payout(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_current_user),
):
    """Get the most recent payout for the Payout Celebration screen."""
    worker = _require_partner_access(db, current_user, worker_id)

    policies = db.query(models.Policy).filter(models.Policy.worker_id == worker.id).all()
    policy_ids = [p.id for p in policies]

    if not policy_ids:
        return None

    payout = (
        db.query(models.Payout)
        .filter(
            models.Payout.policy_id.in_(policy_ids),
            models.Payout.status == "Credited",
        )
        .order_by(desc(models.Payout.date))
        .first()
    )

    if not payout:
        return None

    return {
        "amount": round((payout.amount_paise or 0) / 100, 2),
        "type": payout.type,
        "status": payout.status,
        "signal": payout.reason or "",
        "upi_ref": payout.upi_ref or "",
        "time": payout.date.strftime("%I:%M %p") if payout.date else "",
        "date": payout.date.strftime("%d %b %Y") if payout.date else "",
        "status_updated_at": payout.status_updated_at.strftime("%d %b, %I:%M %p") if payout.status_updated_at else "",
        "zone": worker.zone,
        "city": worker.city,
        "fraud_score": round(payout.fraud_score, 2) if payout.fraud_score else 0,
        "processing_ms": payout.processing_time_ms or 0,
    }


@router.get("/payout-status-events/{worker_id}/{payout_id}")
async def payout_status_events(
    worker_id: str,
    payout_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_current_user),
):
    """Lifecycle event stream for a payout."""
    worker = _require_partner_access(db, current_user, worker_id)

    payout = (
        db.query(models.Payout)
        .join(models.Policy)
        .filter(
            models.Payout.id == payout_id,
            models.Policy.worker_id == worker.id,
        )
        .first()
    )
    if not payout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payout not found")

    events = (
        db.query(models.PayoutStatusEvent)
        .filter(models.PayoutStatusEvent.payout_id == payout.id)
        .order_by(models.PayoutStatusEvent.created_at.asc())
        .all()
    )

    return [
        {
            "id": e.id,
            "from_status": e.from_status,
            "to_status": e.to_status,
            "reason": e.reason or "",
            "external_ref": e.external_ref or "",
            "created_at": e.created_at.strftime("%d %b, %I:%M %p") if e.created_at else "",
        }
        for e in events
    ]
