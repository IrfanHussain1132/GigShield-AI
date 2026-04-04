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
