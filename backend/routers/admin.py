# SecureSync AI — Admin Dashboard Router (Phase 3)
# Loss ratio, heatmap data, manual review queue, fraud ring analysis

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from database import get_db
import models
import config
from services import trigger_service, ml_service, fraud_graph_service, location_validation_service
from services.auth_service import require_admin_user
from utils.time_utils import utcnow
from datetime import timedelta
import json

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin_user)],
)

# ── Public (no-auth) router for the payouts-received dashboard ──
public_router = APIRouter(
    prefix="/api/v1/admin",
    tags=["admin-public"],
)

@public_router.get("/payouts-received")
def payouts_received(
    limit: int = Query(default=100, ge=1, le=500),
    status_filter: str = Query(default="Credited", description="Payout status to filter by"),
    db: Session = Depends(get_db),
):
    """
    List of workers who have received money (Credited payouts).
    Shows: worker name, amount, reason, date, payout type, UPI ref.
    No auth required — used by the public admin payouts dashboard.
    """
    payouts = (
        db.query(models.Payout)
        .join(models.Policy, models.Payout.policy_id == models.Policy.id)
        .join(models.Worker, models.Policy.worker_id == models.Worker.id)
        .filter(models.Payout.status == status_filter)
        .order_by(desc(models.Payout.date))
        .limit(limit)
        .all()
    )

    result = []
    for p in payouts:
        policy = p.policy
        worker = policy.worker if policy else None
        result.append({
            "payout_id": p.id,
            "worker_name": worker.name if worker else "Unknown",
            "partner_id": worker.partner_id if worker else "",
            "worker_id": worker.id if worker else None,
            "amount_rupees": round((p.amount_paise or 0) / 100, 2),
            "reason": p.reason or p.type or "Insurance Payout",
            "type": p.type or "General",
            "date": p.date.strftime("%d %b %Y, %I:%M %p") if p.date else "",
            "date_iso": p.date.isoformat() if p.date else "",
            "status": p.status,
            "upi_ref": p.upi_ref or "",
            "zone": worker.zone if worker else "",
            "city": worker.city if worker else "",
        })

    total_amount = sum(p["amount_rupees"] for p in result)

    return {
        "count": len(result),
        "total_amount_rupees": round(total_amount, 2),
        "status_filter": status_filter,
        "payouts": result,
    }


@router.get("/overview")
def admin_overview(db: Session = Depends(get_db)):
    """
    Admin dashboard overview: key metrics, loss ratio, active policies.
    """
    now = utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    # Active policies count
    active_policies = db.query(models.Policy).filter(models.Policy.is_active == True).count()

    # Total workers
    total_workers = db.query(models.Worker).count()
    verified_workers = db.query(models.Worker).filter(models.Worker.is_verified == True).count()

    # This month's payouts
    month_payout_total_paise = (
        db.query(func.sum(models.Payout.amount_paise))
        .filter(
            models.Payout.date >= month_start,
            models.Payout.status == "Credited",
        )
        .scalar()
    ) or 0
    month_payouts_count = (
        db.query(func.count(models.Payout.id))
        .filter(
            models.Payout.date >= month_start,
            models.Payout.status == "Credited",
        )
        .scalar()
    ) or 0

    # This month's premium collection (active policies × their premium)
    active_policy_records = db.query(models.Policy).filter(models.Policy.is_active == True).all()
    month_premium_paise = sum((p.premium_amount_paise or 0) for p in active_policy_records)
    # Weekly premium × ~4.3 weeks per month
    month_premium_est_paise = int(month_premium_paise * 4.3)

    # Loss ratio
    loss_ratio = 0.0
    if month_premium_est_paise > 0:
        loss_ratio = round(month_payout_total_paise / month_premium_est_paise, 3)

    # Claims this week
    week_claims = db.query(models.Payout).filter(models.Payout.date >= week_ago).count()
    week_credited = (
        db.query(models.Payout)
        .filter(
            models.Payout.date >= week_ago,
            models.Payout.status == "Credited",
        )
        .count()
    )
    week_held = (
        db.query(models.Payout)
        .filter(
            models.Payout.date >= week_ago,
            models.Payout.status == "Held",
        )
        .count()
    )

    # Trigger events count
    total_triggers = db.query(models.TriggerEvent).filter(
        models.TriggerEvent.timestamp >= month_start
    ).count()

    # Average fraud score
    avg_fraud = (
        db.query(func.avg(models.Payout.fraud_score))
        .filter(models.Payout.date >= month_start)
        .scalar()
    ) or 0.0

    # Average processing time
    avg_processing_ms = (
        db.query(func.avg(models.Payout.processing_time_ms))
        .filter(
            models.Payout.date >= month_start,
            models.Payout.processing_time_ms > 0,
        )
        .scalar()
    ) or 0

    return {
        "total_workers": total_workers,
        "verified_workers": verified_workers,
        "active_policies": active_policies,
        "month_payouts_total": round(month_payout_total_paise / 100, 2),
        "month_payouts_count": month_payouts_count,
        "month_premium_est": round(month_premium_est_paise / 100, 2),
        "loss_ratio": loss_ratio,
        "loss_ratio_target": 0.65,
        "loss_ratio_status": "healthy" if loss_ratio <= 0.65 else ("warning" if loss_ratio <= 0.80 else "critical"),
        "week_claims": week_claims,
        "week_credited": week_credited,
        "week_held": week_held,
        "total_triggers_month": total_triggers,
        "avg_fraud_score": round(avg_fraud, 3),
        "avg_processing_ms": int(avg_processing_ms),
        "zones": len(config.ZONES),
    }


@router.get("/loss-ratio")
def loss_ratio_data(
    days: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """
    Daily loss ratio timeline for charting.
    Returns daily premium collected vs payouts made.
    """
    now = utcnow()
    start = now - timedelta(days=days)

    daily_data = []
    for i in range(days):
        day_start = (start + timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        # Payouts for this day
        day_payouts = (
            db.query(models.Payout)
            .filter(
                models.Payout.date >= day_start,
                models.Payout.date < day_end,
                models.Payout.status == "Credited",
            )
            .all()
        )
        payout_total = sum((p.amount_paise or 0) for p in day_payouts)

        # Estimate daily premium: active policies / 7 (weekly premium spread)
        active_that_day = (
            db.query(models.Policy)
            .filter(
                models.Policy.start_date <= day_end,
                models.Policy.is_active == True,
            )
            .count()
        )
        est_daily_premium = active_that_day * int(config.BASE_RATE * 100 / 7)

        ratio = round(payout_total / max(est_daily_premium, 1), 3)

        daily_data.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "label": day_start.strftime("%d %b"),
            "payouts_paise": payout_total,
            "payouts_rupees": round(payout_total / 100, 2),
            "premium_est_paise": est_daily_premium,
            "premium_est_rupees": round(est_daily_premium / 100, 2),
            "loss_ratio": ratio,
            "claims_count": len(day_payouts),
        })

    return {
        "days": days,
        "data": daily_data,
        "target_ratio": 0.65,
    }


@router.get("/heatmap")
def disruption_heatmap(
    days: int = Query(default=7, ge=1, le=30),
    db: Session = Depends(get_db),
):
    """
    Zone disruption heatmap data for visualization.
    Returns trigger counts and severity by zone.
    """
    start = utcnow() - timedelta(days=days)

    events = (
        db.query(models.TriggerEvent)
        .filter(models.TriggerEvent.timestamp >= start)
        .all()
    )

    zone_data = {}
    for zone_name, zone_info in config.ZONES.items():
        zone_events = [e for e in events if e.zone == zone_name]

        type_counts = {}
        for e in zone_events:
            t = e.type or "Unknown"
            type_counts[t] = type_counts.get(t, 0) + 1

        total_affected = sum(e.affected_workers_count or 0 for e in zone_events)

        # Calculate severity score
        severity = 0
        if len(zone_events) > 0:
            red_count = sum(1 for e in zone_events if e.alert_level == "RED")
            severity = min(100, int((red_count / max(len(zone_events), 1)) * 80 + len(zone_events) * 2))

        zone_data[zone_name] = {
            "zone": zone_name,
            "city": zone_info["city"],
            "lat": zone_info["lat"],
            "lon": zone_info["lon"],
            "total_events": len(zone_events),
            "trigger_types": type_counts,
            "total_affected_workers": total_affected,
            "severity": severity,
            "alert_level": "RED" if severity > 70 else ("ORANGE" if severity > 40 else ("YELLOW" if severity > 15 else "GREEN")),
        }

    return {
        "days": days,
        "zones": zone_data,
        "total_events": len(events),
    }


@router.get("/review-queue")
def manual_review_queue(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Manual review queue: payouts with status 'Held' that need human review.
    """
    held_payouts = (
        db.query(models.Payout)
        .options(
            models.joinedload(models.Payout.policy).joinedload(models.Policy.worker),
            models.joinedload(models.Payout.trigger_event),
        )
        .filter(models.Payout.status == "Held")
        .order_by(desc(models.Payout.date))
        .limit(limit)
        .all()
    )

    queue = []
    for p in held_payouts:
        policy = p.policy
        worker = policy.worker if policy else None
        trigger = p.trigger_event

        queue.append({
            "payout_id": p.id,
            "amount_rupees": round((p.amount_paise or 0) / 100, 2),
            "type": p.type,
            "status": p.status,
            "fraud_score": round(p.fraud_score, 3) if p.fraud_score else 0,
            "date": p.date.strftime("%d %b, %I:%M %p") if p.date else "",
            "reason": p.reason or "",
            "upi_ref": p.upi_ref or "",
            "worker": {
                "id": worker.id if worker else None,
                "name": worker.name if worker else "Unknown",
                "partner_id": worker.partner_id if worker else "",
                "zone": worker.zone if worker else "",
                "city": worker.city if worker else "",
                "score": worker.score if worker else 0,
            } if worker else None,
            "trigger": {
                "type": trigger.type if trigger else None,
                "zone": trigger.zone if trigger else None,
                "signal_value": trigger.signal_value if trigger else None,
                "sources": json.loads(trigger.sources) if trigger and trigger.sources else [],
                "timestamp": trigger.timestamp.strftime("%d %b, %I:%M %p") if trigger and trigger.timestamp else None,
            } if trigger else None,
        })

    return {
        "count": len(queue),
        "queue": queue,
    }


@router.post("/review/{payout_id}/approve")
def approve_payout(payout_id: int, db: Session = Depends(get_db)):
    """Approve a held payout — transition to Credited."""
    payout = db.query(models.Payout).filter(models.Payout.id == payout_id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    if payout.status != "Held":
        raise HTTPException(status_code=400, detail=f"Cannot approve payout with status: {payout.status}")

    from services.payout_lifecycle_service import transition_payout_status
    transition_payout_status(db, payout, "Credited", reason="Manually approved by admin")
    db.commit()

    return {"status": "success", "payout_id": payout_id, "new_status": "Credited"}


@router.post("/review/{payout_id}/reject")
def reject_payout(payout_id: int, db: Session = Depends(get_db)):
    """Reject a held payout — transition to Failed."""
    payout = db.query(models.Payout).filter(models.Payout.id == payout_id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    if payout.status != "Held":
        raise HTTPException(status_code=400, detail=f"Cannot reject payout with status: {payout.status}")

    from services.payout_lifecycle_service import transition_payout_status
    transition_payout_status(db, payout, "Failed", reason="Rejected by admin after manual review")
    db.commit()

    return {"status": "success", "payout_id": payout_id, "new_status": "Failed"}


@router.get("/fraud-graph")
def fraud_graph_stats(db: Session = Depends(get_db)):
    """
    Fraud ring detection graph analysis.
    Returns graph statistics and detected fraud rings, including D3-compatible visualization data.
    """
    # Rebuild graph from current data
    fraud_graph_service.build_graph_from_db(db)
    graph = fraud_graph_service.get_fraud_graph()

    stats = graph.get_graph_stats()
    shared_devices = graph.detect_shared_devices()
    shared_upis = graph.detect_shared_upis()

    # Generate nodes/links for D3 visualization
    nodes = []
    links = []
    
    # Map for workers to avoid duplicates and store node index
    worker_node_map = {}
    
    for wid, metadata in graph.worker_metadata.items():
        node_id = f"w_{wid}"
        nodes.append({
            "id": node_id,
            "label": metadata.get("name", f"Worker {wid}"),
            "type": "worker",
            "risk": graph.get_worker_risk(wid).get("ring_risk_score", 0.0)
        })
        worker_node_map[wid] = node_id
        
        # Add links to devices
        for dev in graph.worker_to_devices.get(wid, set()):
            dev_node_id = f"d_{dev}"
            # Add device node if not exists
            if not any(n["id"] == dev_node_id for n in nodes):
                nodes.append({
                    "id": dev_node_id,
                    "label": f"Device {dev[-6:]}",
                    "type": "device"
                })
            links.append({"source": node_id, "target": dev_node_id, "type": "uses_device"})
            
        # Add links to UPIs
        for upi in graph.worker_to_upis.get(wid, set()):
            upi_node_id = f"u_{upi}"
            # Add UPI node if not exists
            if not any(n["id"] == upi_node_id for n in nodes):
                nodes.append({
                    "id": upi_node_id,
                    "label": "UPI Account",
                    "type": "upi"
                })
            links.append({"source": node_id, "target": upi_node_id, "type": "payout_to"})

    return {
        "graph_stats": stats,
        "shared_devices": shared_devices,
        "shared_upis": shared_upis,
        "vis_data": {
            "nodes": nodes,
            "links": links
        }
    }


@router.get("/trigger-history")
def trigger_history(
    limit: int = Query(default=50, ge=1, le=200),
    zone: str = Query(default=None),
    db: Session = Depends(get_db),
):
    """Recent trigger events for the admin timeline."""
    query = db.query(models.TriggerEvent).order_by(desc(models.TriggerEvent.timestamp))

    if zone:
        query = query.filter(models.TriggerEvent.zone == zone)

    events = query.limit(limit).all()

    return [
        {
            "id": e.id,
            "type": e.type,
            "zone": e.zone,
            "signal_value": e.signal_value,
            "alert_level": e.alert_level,
            "timestamp": e.timestamp.strftime("%d %b, %I:%M %p") if e.timestamp else "",
            "source_count": e.source_count,
            "sources": json.loads(e.sources) if e.sources else [],
            "is_confirmed": e.is_confirmed,
            "affected_workers": e.affected_workers_count,
        }
        for e in events
    ]


@router.get("/forecast/{zone_name}")
def zone_forecast(zone_name: str):
    """72-hour LSTM predictive forecast for a zone."""
    live_data = trigger_service.get_live_zone_data(zone_name)

    current_data = {
        "rain_mm": live_data.get("rain_mm", 0),
        "temp_c": live_data.get("temp_c", 30),
        "aqi": live_data.get("aqi", 80),
        "visibility_m": live_data.get("visibility_km", 5) * 1000,
    }

    summary = ml_service.get_forecast_summary(zone_name, current_data)
    return summary


@router.get("/workers")
def list_workers(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List all workers with their fraud risk profiles."""
    workers = (
        db.query(models.Worker)
        .order_by(desc(models.Worker.created_at))
        .limit(limit)
        .all()
    )

    result = []
    # Batch payouts data by worker
    payout_stats = (
        db.query(
            models.Policy.worker_id,
            func.count(models.Payout.id).label('total_payouts'),
            func.sum(models.Payout.amount_paise).label('total_amount')
        )
        .join(models.Payout, models.Payout.policy_id == models.Policy.id)
        .filter(models.Payout.status == "Credited")
        .group_by(models.Policy.worker_id)
        .all()
    )
    payout_map = {row.worker_id: (row.total_payouts, row.total_amount) for row in payout_stats}

    # Batch active policies
    active_policies = (
        db.query(models.Policy)
        .filter(models.Policy.is_active == True)
        .all()
    )
    policy_map = {p.worker_id: p for p in active_policies}

    for w in workers:
        active_policy = policy_map.get(w.id)
        total_payouts_count, total_paise = payout_map.get(w.id, (0, 0))

        result.append({
            "id": w.id,
            "name": w.name,
            "partner_id": w.partner_id,
            "phone": w.phone,
            "zone": w.zone,
            "city": w.city,
            "platform": w.platform,
            "score": w.score,
            "is_verified": w.is_verified,
            "hourly_rate": w.hourly_rate,
            "weekly_income": w.weekly_income,
            "has_active_policy": bool(active_policy),
            "policy_tier": active_policy.tier if active_policy else None,
            "total_payouts": total_payouts_count,
            "total_payout_amount": round(total_paise / 100, 2),
        })

    return result


# ═══════════════════════════════════════════
# Phase 3 – Scale: Predictive Analytics
# ═══════════════════════════════════════════

@router.get("/admin/predictive-claims")
async def predictive_claims(db: Session = Depends(get_db)):
    """
    Predict next week's claims using LSTM forecast + historical trigger patterns.
    Returns per-zone predictions with confidence and risk factors.
    """
    now = utcnow()
    from services import ml_service

    zones_config = {
        "Zone 1": {"city": "Central Chennai", "lat": 13.0827, "lon": 80.2707},
        "Zone 2": {"city": "Hyderabad", "lat": 17.3850, "lon": 78.4867},
        "Zone 3": {"city": "Delhi", "lat": 28.6139, "lon": 77.2090},
        "Zone 4": {"city": "South Chennai", "lat": 13.0125, "lon": 80.2241},
        "Zone 5": {"city": "Mumbai", "lat": 19.0760, "lon": 72.8777},
        "Zone 6": {"city": "Bengaluru", "lat": 12.9716, "lon": 77.5946},
    }

    zone_predictions = []
    total_predicted_liability = 0

    for zone_name, zone_info in zones_config.items():
        # Historical claims in last 4 weeks for this zone
        four_weeks_ago = now - timedelta(days=28)
        last_week = now - timedelta(days=7)

        hist_claims = (
            db.query(func.count(models.Payout.id))
            .join(models.TriggerEvent, models.Payout.trigger_event_id == models.TriggerEvent.id)
            .filter(
                models.TriggerEvent.zone == zone_name,
                models.Payout.date >= four_weeks_ago,
            )
            .scalar()
        ) or 0

        recent_claims = (
            db.query(func.count(models.Payout.id))
            .join(models.TriggerEvent, models.Payout.trigger_event_id == models.TriggerEvent.id)
            .filter(
                models.TriggerEvent.zone == zone_name,
                models.Payout.date >= last_week,
            )
            .scalar()
        ) or 0

        # Get 72hr forecast for risk estimation
        from services.trigger_service import get_live_zone_data
        live_data = get_live_zone_data(zone_name)
        forecast_summary = ml_service.get_forecast_summary(zone_name, live_data)

        # Predict next week based on trend + forecast
        weekly_avg = hist_claims / 4 if hist_claims > 0 else 0
        trend_factor = (recent_claims / max(weekly_avg, 0.5)) if weekly_avg > 0 else 1.0
        forecast_factor = 1 + (forecast_summary.get("max_risk_72h", 0) / 100) * 0.5

        predicted_claims = max(0, round(weekly_avg * trend_factor * forecast_factor))
        avg_payout = 408  # ₹408 per claim average
        predicted_liability = predicted_claims * avg_payout

        # Identify risk factors
        risk_factors = []
        if forecast_summary.get("red_hours", 0) > 5:
            risk_factors.append(f"{forecast_summary.get('red_hours', 0)} RED hours in 72h forecast")
        if forecast_summary.get("max_risk_6h", 0) >= 70:
            risk_factors.append("High imminent 6h risk")
        if trend_factor > 1.5:
            risk_factors.append("Claims trending up vs 4-week average")
        if live_data.get("rain_mm", 0) > 30:
            risk_factors.append(f"Current rainfall: {live_data.get('rain_mm', 0)}mm")
        if live_data.get("aqi", 0) > 200:
            risk_factors.append(f"Elevated AQI: {live_data.get('aqi', 0)}")
        if not risk_factors:
            risk_factors.append("Normal conditions expected")

        zone_predictions.append({
            "zone": zone_name,
            "city": zone_info["city"],
            "predicted_claims": predicted_claims,
            "predicted_liability": predicted_liability,
            "historical_weekly_avg": round(weekly_avg, 1),
            "last_week_claims": recent_claims,
            "trend_factor": round(trend_factor, 2),
            "forecast_risk_72h": forecast_summary.get("max_risk_72h", 0),
            "risk_factors": risk_factors,
            "confidence": min(95, 60 + hist_claims * 2),
        })
        total_predicted_liability += predicted_liability

    # Sort by predicted liability descending
    zone_predictions.sort(key=lambda z: z["predicted_liability"], reverse=True)

    return {
        "zones": zone_predictions,
        "total_predicted_liability": total_predicted_liability,
        "total_predicted_claims": sum(z["predicted_claims"] for z in zone_predictions),
        "generated_at": now.isoformat(),
        "confidence": "high" if total_predicted_liability > 0 else "moderate",
    }


@router.get("/admin/claims-distribution")
async def claims_distribution(days: int = 30, db: Session = Depends(get_db)):
    """
    Claims distribution analytics — breakdown by trigger type, zone, time-of-day.
    """
    now = utcnow()
    start = now - timedelta(days=days)

    payouts = (
        db.query(models.Payout)
        .filter(models.Payout.date >= start)
        .all()
    )

    # By trigger type
    type_dist = {}
    zone_dist = {}
    hour_dist = {h: 0 for h in range(24)}
    fraud_by_type = {}

    for p in payouts:
        ptype = p.type or "Unknown"
        type_dist[ptype] = type_dist.get(ptype, 0) + 1

        # Get zone from trigger event
        if p.trigger_event_id:
            te = db.query(models.TriggerEvent).filter(models.TriggerEvent.id == p.trigger_event_id).first()
            if te:
                zone_dist[te.zone] = zone_dist.get(te.zone, 0) + 1

        # Time of day
        if p.date:
            hour_dist[p.date.hour] = hour_dist.get(p.date.hour, 0) + 1

        # Fraud scores by type
        if ptype not in fraud_by_type:
            fraud_by_type[ptype] = []
        fraud_by_type[ptype].append(p.fraud_score or 0)

    # Calculate averages
    avg_fraud_by_type = {
        t: round(sum(scores) / max(len(scores), 1), 3)
        for t, scores in fraud_by_type.items()
    }

    return {
        "period_days": days,
        "total_claims": len(payouts),
        "by_trigger_type": [
            {"type": t, "count": c, "avg_fraud_score": avg_fraud_by_type.get(t, 0)}
            for t, c in sorted(type_dist.items(), key=lambda x: x[1], reverse=True)
        ],
        "by_zone": [
            {"zone": z, "count": c}
            for z, c in sorted(zone_dist.items(), key=lambda x: x[1], reverse=True)
        ],
        "by_hour": [
            {"hour": h, "count": c} for h, c in sorted(hour_dist.items())
        ],
    }


@router.get("/admin/loss-ratio-trend")
async def loss_ratio_trend(days: int = 30, db: Session = Depends(get_db)):
    """
    30-day rolling loss ratio with weekly comparison.
    Loss Ratio = total payouts / total premiums collected.
    """
    now = utcnow()

    # Weekly loss ratios for the past N days
    weekly_data = []
    for week_offset in range(days // 7):
        week_end = now - timedelta(days=week_offset * 7)
        week_start = week_end - timedelta(days=7)

        week_payouts = (
            db.query(func.sum(models.Payout.amount_paise))
            .filter(
                models.Payout.date >= week_start,
                models.Payout.date < week_end,
                models.Payout.status == "Credited",
            )
            .scalar()
        ) or 0

        week_premiums = (
            db.query(func.sum(models.Policy.premium_amount_paise))
            .filter(
                models.Policy.start_date <= week_end,
                or_(models.Policy.end_date >= week_start, models.Policy.end_date == None),
            )
            .scalar()
        ) or 0

        lr = round((week_payouts / max(week_premiums, 1)) * 100, 1)

        weekly_data.append({
            "week_label": f"W-{week_offset}" if week_offset > 0 else "This Week",
            "week_start": week_start.strftime("%Y-%m-%d"),
            "week_end": week_end.strftime("%Y-%m-%d"),
            "payouts_total": week_payouts / 100,
            "premiums_total": week_premiums / 100,
            "loss_ratio": lr,
        })

    weekly_data.reverse()

    # Current vs last week
    current_lr = weekly_data[-1]["loss_ratio"] if weekly_data else 0
    prev_lr = weekly_data[-2]["loss_ratio"] if len(weekly_data) >= 2 else 0
    wow_delta = round(current_lr - prev_lr, 1)

    return {
        "current_loss_ratio": current_lr,
        "previous_week_loss_ratio": prev_lr,
        "wow_delta": wow_delta,
        "target": 65.0,
        "status": "healthy" if current_lr <= 65 else "warning" if current_lr <= 80 else "critical",
        "weekly_trend": weekly_data,
    }

