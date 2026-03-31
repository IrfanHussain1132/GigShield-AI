# SecureSync AI — Rule-Based Fraud Scoring (Phase 2)
# Phase 3 upgrades to Isolation Forest → supervised Random Forest

from datetime import timedelta
from sqlalchemy.orm import Session
import models
import config
from utils.time_utils import utcnow


def calculate_fraud_score(
    db: Session,
    worker_id: int,
    trigger_event: dict,
    policy_id: int = None,
) -> tuple[float, str]:
    """
    Phase 2 rule-based fraud scoring.

    Returns (fraud_score: 0.0–1.0, reason: str)

    Scoring:
        < 0.30  → Auto-approve, payout fires immediately
        0.30–0.65 → Soft flag, payout fires, async review logged
        > 0.65  → Hard hold, manual review within 2 hours
    """
    score = 0.0
    flags = []

    # ── Rule 1: Claim frequency check ──
    # More than MAX_CLAIMS_PER_WEEK in the last 7 days → suspicious
    if policy_id:
        week_ago = utcnow() - timedelta(days=7)
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
    # Check if worker already received payout for this exact event type today
    if policy_id and trigger_event.get("type"):
        today_start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
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
    # Weekly payout cannot exceed declared weekly income
    if policy_id:
        worker = None
        policy = db.query(models.Policy).filter(models.Policy.id == policy_id).first()
        if policy:
            worker = db.query(models.Worker).filter(models.Worker.id == policy.worker_id).first()
        if worker:
            week_ago = utcnow() - timedelta(days=7)
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
    # More than COORDINATED_SURGE_THRESHOLD claims in COORDINATED_SURGE_WINDOW
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
    # Lower verification score → higher fraud risk
    if policy_id:
        policy = db.query(models.Policy).filter(models.Policy.id == policy_id).first()
        if policy:
            worker = db.query(models.Worker).filter(models.Worker.id == policy.worker_id).first()
            if worker and worker.score < 60:
                score += 0.10
                flags.append(f"Low verification score: {worker.score}")

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
