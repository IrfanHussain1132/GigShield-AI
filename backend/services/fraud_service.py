# SecureSync AI — Multi-Layer Fraud Scoring (Phase 3 – ML Upgraded)
# Phase 2 rule-based + Phase 3 Isolation Forest + Graph + Location Validation

from datetime import timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import config
from utils.time_utils import utcnow
from services import ml_service, fraud_graph_service, location_validation_service


def calculate_fraud_score(
    db: Session,
    worker_id: int,
    trigger_event: dict,
    policy_id: int = None,
    cached_recent_payouts: list = None,
) -> tuple[float, str]:
    """
    Phase 3 multi-layer fraud scoring.

    Layer 1: Rule-based checks (Phase 2)
    Layer 2: Cell tower + Speed validation (Phase 3)
    Layer 3: Isolation Forest ML anomaly detection (Phase 3)
    Layer 4: Fraud ring graph detection (Phase 3)

    Returns (fraud_score: 0.0–1.0, reason: str)

    Scoring:
        < 0.30  → Auto-approve, payout fires immediately
        0.30–0.65 → Soft flag, payout fires, async review logged
        > 0.65  → Hard hold, manual review within 2 hours
    """
    score = 0.0
    flags = []

    # ══════════════════════════════════════
    # Layer 1: Rule-Based Checks (Phase 2)
    # ══════════════════════════════════════

    # ── Rule 1: Claim frequency check ──
    if policy_id:
        week_ago = utcnow() - timedelta(days=7)
        if cached_recent_payouts is not None:
            recent_claims = len(cached_recent_payouts)
        else:
            recent_claims = (
                db.query(models.Payout)
                .filter(
                    models.Payout.policy_id == policy_id,
                    models.Payout.date >= week_ago,
                )
                .count()
            )
        if recent_claims >= config.MAX_CLAIMS_PER_WEEK:
            score += 0.35
            flags.append(f"High claim frequency: {recent_claims} claims in 7 days")
        elif recent_claims >= 3:
            score += 0.15
            flags.append(f"Elevated claim frequency: {recent_claims} claims in 7 days")

    # ── Rule 2: Event deduplication ──
    if policy_id and trigger_event.get("type"):
        today_start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        if cached_recent_payouts is not None:
            duplicate = next((p for p in cached_recent_payouts if p.type == trigger_event["type"] and p.date >= today_start), None)
        else:
            duplicate = (
                db.query(models.Payout)
                .filter(
                    models.Payout.policy_id == policy_id,
                    models.Payout.type == trigger_event["type"],
                    models.Payout.date >= today_start,
                )
                .first()
            )
        if duplicate:
            score += 0.50
            flags.append(f"Duplicate claim: {trigger_event['type']} already paid today")

    # ── Rule 3: Income cap check ──
    if policy_id:
        worker = None
        policy = db.query(models.Policy).filter(models.Policy.id == policy_id).first()
        if policy:
            worker = db.query(models.Worker).filter(models.Worker.id == policy.worker_id).first()
        if worker:
            week_ago = utcnow() - timedelta(days=7)
            if cached_recent_payouts is not None:
                total_paid_paise = sum((p.amount_paise or 0) for p in cached_recent_payouts if p.status == "Credited")
            else:
                week_total = (
                    db.query(models.Payout)
                    .filter(
                        models.Payout.policy_id == policy_id,
                        models.Payout.date >= week_ago,
                        models.Payout.status == "Credited",
                    )
                    .all()
                )
                total_paid_paise = sum((p.amount_paise or 0) for p in week_total)
            
            worker_weekly_income_paise = worker.weekly_income_paise or 0
            if total_paid_paise >= worker_weekly_income_paise:
                score += 0.40
                flags.append(
                    "Weekly income cap reached: "
                    f"Rs {total_paid_paise / 100:.2f} / Rs {worker_weekly_income_paise / 100:.2f}"
                )

    # ── Rule 4: Coordinated surge detection ──
    window_start = utcnow() - timedelta(minutes=config.COORDINATED_SURGE_WINDOW_MINUTES)
    surge_count = (
        db.query(models.Payout)
        .filter(models.Payout.date >= window_start)
        .count()
    )
    if surge_count >= config.COORDINATED_SURGE_THRESHOLD:
        score += 0.30
        flags.append(f"Coordinated surge detected: {surge_count} claims in {config.COORDINATED_SURGE_WINDOW_MINUTES} min")

    # ── Rule 5: Worker verification score ──
    if policy_id:
        policy = db.query(models.Policy).filter(models.Policy.id == policy_id).first()
        if policy:
            worker = db.query(models.Worker).filter(models.Worker.id == policy.worker_id).first()
            if worker and worker.score < 60:
                score += 0.10
                flags.append(f"Low verification score: {worker.score}")

    # ══════════════════════════════════════
    # Layer 2: Cell Tower + Speed Check (Phase 3)
    # ══════════════════════════════════════
    try:
        worker_obj = None
        if policy_id:
            policy_obj = db.query(models.Policy).filter(models.Policy.id == policy_id).first()
            if policy_obj:
                worker_obj = db.query(models.Worker).filter(models.Worker.id == policy_obj.worker_id).first()

        if worker_obj:
            # Simulate location validation (in production, real GPS/tower data from device)
            anti_spoof = location_validation_service.run_anti_spoofing_checks(
                worker_id=worker_obj.id,
                claimed_zone=worker_obj.zone or "Zone 4",
                gps_lat=worker_obj.latitude,
                gps_lon=worker_obj.longitude,
                cell_tower_ids=[],  # Would come from device in production
                gps_pings=[],       # Would come from device in production
            )

            if anti_spoof["decision"] == "hard_hold":
                score += 0.40
                flags.append(f"Anti-spoofing: {anti_spoof['message']}")
            elif anti_spoof["decision"] == "soft_hold":
                score += 0.20
                flags.append(f"Anti-spoofing soft flag: {anti_spoof['message']}")
    except Exception:
        pass  # Don't block payout if location check fails

    # ══════════════════════════════════════
    # Layer 3: Isolation Forest ML (Phase 3)
    # ══════════════════════════════════════
    try:
        if policy_id and worker_id:
            # Gather ML features
            week_ago = utcnow() - timedelta(days=7)
            month_ago = utcnow() - timedelta(days=30)

            if cached_recent_payouts is not None:
                claims_7d = len(cached_recent_payouts)
                # Note: cache is only 7 days, so we still query for 30d if needed
                claims_30d = (
                    db.query(models.Payout)
                    .join(models.Policy)
                    .filter(models.Policy.worker_id == worker_id, models.Payout.date >= month_ago)
                    .count()
                )
            else:
                claims_7d = (
                    db.query(models.Payout)
                    .join(models.Policy)
                    .filter(models.Policy.worker_id == worker_id, models.Payout.date >= week_ago)
                    .count()
                )
                claims_30d = (
                    db.query(models.Payout)
                    .join(models.Policy)
                    .filter(models.Policy.worker_id == worker_id, models.Payout.date >= month_ago)
                    .count()
                )

            avg_amount = (
                db.query(func.avg(models.Payout.amount_paise))
                .join(models.Policy)
                .filter(models.Policy.worker_id == worker_id)
                .scalar()
            ) or 30000

            worker_for_ml = db.query(models.Worker).filter(models.Worker.id == worker_id).first()
            tenure = worker_for_ml.tenure_months if worker_for_ml else 12
            reg_days = 0
            if worker_for_ml and worker_for_ml.created_at:
                reg_days = (utcnow() - worker_for_ml.created_at).days

            # Zone consistency: based on whether worker has claims from their zone
            weekly_income = (worker_for_ml.weekly_income_paise or 612000) if worker_for_ml else 612000
            total_payout_week = (
                db.query(func.sum(models.Payout.amount_paise))
                .join(models.Policy)
                .filter(
                    models.Policy.worker_id == worker_id,
                    models.Payout.date >= week_ago,
                    models.Payout.status == "Credited",
                )
                .scalar()
            ) or 0

            payout_ratio = total_payout_week / max(weekly_income, 1)

            ml_features = {
                "claim_frequency_7d": claims_7d,
                "claim_frequency_30d": claims_30d,
                "avg_claim_amount_paise": float(avg_amount),
                "tenure_months": tenure,
                "zone_consistency_score": 0.8,  # Default; in production from GPS history
                "device_uniqueness": 0,         # Default; in production from device fingerprint
                "claim_timing_variance": 14400, # Default
                "peer_claim_ratio": 1.0,        # Default
                "payout_to_income_ratio": payout_ratio,
                "speed_anomaly_score": 0.0,     # Default
                "platform_activity_score": 0.7, # Default
                "registration_age_days": reg_days,
            }

            ml_score, is_anomaly, ml_explanation = ml_service.score_fraud_ml(ml_features)

            if is_anomaly:
                ml_contribution = min(ml_score * 0.5, 0.30)
                score += ml_contribution
                flags.append(f"ML: {ml_explanation}")
            elif ml_score > 0.5:
                score += 0.05
                flags.append(f"ML: Elevated anomaly score ({ml_score:.2f})")
    except Exception:
        pass  # Don't block payout if ML scoring fails

    # ══════════════════════════════════════
    # Layer 4: Fraud Ring Graph (Phase 3)
    # ══════════════════════════════════════
    try:
        ring_risk = fraud_graph_service.check_worker_fraud_ring(worker_id)
        if ring_risk["in_ring"]:
            ring_contribution = min(ring_risk["ring_risk_score"] * 0.3, 0.25)
            score += ring_contribution
            flags.append(f"Fraud ring: {'; '.join(ring_risk['flags'])}")
    except Exception:
        pass  # Don't block payout if graph check fails

    # ══════════════════════════════════════
    # Layer 5: Historical Weather Cross-Validation (Phase 3 – Scale)
    # Catches FAKE WEATHER CLAIMS: if no trigger event exists for
    # this weather type in the worker's zone recently, it's suspicious.
    # ══════════════════════════════════════
    try:
        trigger_type = trigger_event.get("type", "")
        trigger_zone = trigger_event.get("zone", "")
        if trigger_type and trigger_zone:
            six_hours_ago = utcnow() - timedelta(hours=6)
            matching_events = (
                db.query(models.TriggerEvent)
                .filter(
                    models.TriggerEvent.type == trigger_type,
                    models.TriggerEvent.zone == trigger_zone,
                    models.TriggerEvent.timestamp >= six_hours_ago,
                    models.TriggerEvent.is_confirmed == True,
                )
                .count()
            )
            # Exclude the current event itself (may just have been inserted)
            current_event_id = trigger_event.get("event_id")
            if current_event_id:
                matching_events = max(matching_events - 1, 0)

            if matching_events == 0:
                # No confirmed trigger event for this type in zone — high fraud signal
                score += 0.35
                flags.append(
                    f"Weather cross-validation: no confirmed '{trigger_type}' event in {trigger_zone} last 6h"
                )
            else:
                # Check if zone was GREEN alert in last 3 hours
                three_hours_ago = utcnow() - timedelta(hours=3)
                green_events = (
                    db.query(models.TriggerEvent)
                    .filter(
                        models.TriggerEvent.zone == trigger_zone,
                        models.TriggerEvent.timestamp >= three_hours_ago,
                        models.TriggerEvent.alert_level == "GREEN",
                    )
                    .count()
                )
                if green_events > 0 and matching_events <= 1:
                    score += 0.20
                    flags.append(
                        f"Weather cross-validation: zone was GREEN recently but claiming '{trigger_type}'"
                    )
    except Exception:
        pass  # Don't block payout on cross-validation failure

    # ══════════════════════════════════════
    # Layer 6: Clock/Timezone Anomaly Detection (Phase 3 – Scale)
    # Off-hours claims (midnight–5AM) without corresponding trigger → suspicious
    # ══════════════════════════════════════
    try:
        now = utcnow()
        claim_hour = now.hour
        # IST is UTC+5:30
        ist_hour = (claim_hour + 5) % 24  # Rough IST adjustment
        if 0 <= ist_hour <= 5:
            # Off-hours claim — check if there's a real trigger event at this time
            one_hour_ago = now - timedelta(hours=1)
            recent_triggers_count = (
                db.query(models.TriggerEvent)
                .filter(
                    models.TriggerEvent.timestamp >= one_hour_ago,
                    models.TriggerEvent.is_confirmed == True,
                )
                .count()
            )
            if recent_triggers_count == 0:
                score += 0.15
                flags.append(f"Off-hours claim at ~{ist_hour}:00 IST with no active trigger")
    except Exception:
        pass

    # ══════════════════════════════════════
    # Layer 7: Velocity Fraud — Multi-Zone Claims (Phase 3 – Scale)
    # If worker claims payouts from 2+ different zones within 4 hours → GPS spoofing
    # ══════════════════════════════════════
    try:
        if policy_id and trigger_event.get("zone"):
            four_hours_ago = utcnow() - timedelta(hours=4)
            recent_payout_zones = (
                db.query(models.Payout.type, models.TriggerEvent.zone)
                .join(models.TriggerEvent, models.Payout.trigger_event_id == models.TriggerEvent.id)
                .join(models.Policy, models.Payout.policy_id == models.Policy.id)
                .filter(
                    models.Policy.worker_id == worker_id,
                    models.Payout.date >= four_hours_ago,
                )
                .all()
            )
            other_zones = set(z for _, z in recent_payout_zones if z and z != trigger_event["zone"])
            if len(other_zones) >= 1:
                score += 0.30
                flags.append(
                    f"Velocity fraud: claims in {trigger_event['zone']} + {', '.join(other_zones)} within 4h"
                )
            elif len(other_zones) == 0:
                # Also check historical zone consistency (last 30 days)
                thirty_days_ago = utcnow() - timedelta(days=30)
                zone_count_30d = (
                    db.query(func.count(func.distinct(models.TriggerEvent.zone)))
                    .join(models.Payout, models.Payout.trigger_event_id == models.TriggerEvent.id)
                    .join(models.Policy, models.Payout.policy_id == models.Policy.id)
                    .filter(
                        models.Policy.worker_id == worker_id,
                        models.Payout.date >= thirty_days_ago,
                    )
                    .scalar()
                ) or 0
                if zone_count_30d >= 3:
                    score += 0.15
                    flags.append(f"Zone hopping: claims from {zone_count_30d} different zones in 30 days")
    except Exception:
        pass

    # Cap at 1.0
    final_score = min(score, 1.0)
    reason = "; ".join(flags) if flags else "Clean — no risk signals"

    return final_score, reason


def get_fraud_decision(fraud_score: float) -> str:
    """Return the decision based on fraud score thresholds."""
    if fraud_score < config.FRAUD_AUTO_APPROVE:
        return "auto_approve"
    elif fraud_score <= config.FRAUD_SOFT_FLAG:
        return "soft_flag"
    else:
        return "hard_hold"


def get_payout_status(fraud_score: float) -> str:
    """Return payout status string based on fraud decision."""
    decision = get_fraud_decision(fraud_score)
    if decision == "auto_approve":
        return "Credited"
    elif decision == "soft_flag":
        return "Credited"  # Payout fires, async review
    else:
        return "Held"      # Manual review required
