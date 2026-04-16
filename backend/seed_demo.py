# SecureSync AI — Rich Demo Data Seeder (Phase 3 – Scale)
# Populates a compelling demo experience with workers, policies, triggers, and payouts
import uuid
import random
import logging
from datetime import timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from utils.time_utils import utcnow
from seed_data import MOCK_PARTNERS

logger = logging.getLogger(__name__)

# Trigger types with their payout hours
TRIGGER_CONFIGS = {
    "Heavy Rain":      {"payout_hrs": 4, "signal": "67.2mm",  "sources": '["OpenMeteo","IMD-RS"]'},
    "Very Heavy Rain": {"payout_hrs": 6, "signal": "132.5mm", "sources": '["OpenMeteo","IMD-RS"]'},
    "AQI Danger":      {"payout_hrs": 5, "signal": "342 AQI", "sources": '["IQAir","WAQI"]'},
    "Heat Wave":       {"payout_hrs": 4, "signal": "42.3°C",  "sources": '["OpenMeteo","NASA-HT"]'},
    "Dense Fog":       {"payout_hrs": 4, "signal": "120m",    "sources": '["OpenMeteo","Vis-Obs"]'},
    "Gridlock":        {"payout_hrs": 3, "signal": "6.2km/h", "sources": '["TomTom","PeakLogic"]'},
}

# Partner IDs to seed as workers
SEED_PARTNERS = [
    "SW-982341",  # Rajan Kumar, Zone 4, Chennai
    "ZM-445521",  # Amit Verma, Zone 2, Hyderabad
    "SW-334455",  # Vikram Singh, Zone 3, Delhi
    "SW-889900",  # Deepak Patil, Zone 5, Mumbai
    "SW-131415",  # Karthik Gowda, Zone 6, Bengaluru
]


def seed_demo_data():
    """Seed rich demo data for a compelling first-boot experience."""
    db = SessionLocal()
    try:
        worker_count = db.query(models.Worker).count()
        if worker_count >= 3:
            logger.info("[Seed] Skipping — %d workers already exist", worker_count)
            return

        logger.info("[Seed] Populating demo data for Phase 3 presentation...")
        now = utcnow()
        random.seed(42)  # Deterministic for reproducibility

        workers = []
        policies = []

        # ── Step 1: Seed Workers ──
        for pid in SEED_PARTNERS:
            partner = MOCK_PARTNERS.get(pid)
            if not partner:
                continue

            # Check if worker already exists with this phone-ish pattern
            existing = db.query(models.Worker).filter(models.Worker.name == partner["name"]).first()
            if existing:
                workers.append(existing)
                continue

            phone = f"9{random.randint(100000000, 999999999)}"
            worker = models.Worker(
                phone=phone,
                name=partner["name"],
                platform=partner["platform"],
                partner_id=pid,
                zone=partner["zone"],
                city=partner["city"],
                latitude=partner["lat"],
                longitude=partner["lon"],
                score=partner["score"],
                is_verified=True,
                hourly_rate=partner["hourly_rate"],
                weekly_income=partner["weekly_income"],
                weekly_income_paise=partner["weekly_income"] * 100,
                tenure_months=partner["tenure_months"],
                created_at=now - timedelta(days=partner["tenure_months"] * 30),
            )
            db.add(worker)
            db.flush()
            workers.append(worker)
            logger.info("[Seed] Created worker: %s (%s, %s)", worker.name, pid, worker.zone)

        # ── Step 2: Seed Policies ──
        tier_assignments = ["Basic", "Premium", "Premium", "Basic", "Premium"]
        for i, worker in enumerate(workers):
            existing_policy = (
                db.query(models.Policy)
                .filter(models.Policy.worker_id == worker.id, models.Policy.is_active == True)
                .first()
            )
            if existing_policy:
                policies.append(existing_policy)
                continue

            tier = tier_assignments[i] if i < len(tier_assignments) else "Basic"
            premium = 75 if tier == "Basic" else 180
            policy = models.Policy(
                worker_id=worker.id,
                tier=tier,
                premium_amount_paise=premium * 100,
                start_date=now - timedelta(days=random.randint(1, 5)),
                end_date=now + timedelta(days=random.randint(2, 6)),
                is_active=True,
            )
            db.add(policy)
            db.flush()
            policies.append(policy)
            logger.info("[Seed] Created %s policy for %s", tier, worker.name)

        # ── Step 3: Seed Trigger Events (30 events across 30 days) ──
        zones = ["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6"]
        trigger_events = []

        for day_offset in range(30):
            # 1-2 events per day
            n_events = random.choice([0, 1, 1, 1, 2])
            for _ in range(n_events):
                trigger_type = random.choice(list(TRIGGER_CONFIGS.keys()))
                zone = random.choice(zones)
                cfg = TRIGGER_CONFIGS[trigger_type]

                event = models.TriggerEvent(
                    type=trigger_type,
                    zone=zone,
                    signal_value=cfg["signal"],
                    alert_level=random.choice(["RED", "ORANGE", "RED"]),
                    sources=cfg["sources"],
                    is_confirmed=True,
                    affected_workers_count=random.randint(1, 4),
                    timestamp=now - timedelta(days=day_offset, hours=random.randint(6, 20)),
                )
                db.add(event)
                db.flush()
                trigger_events.append(event)

        logger.info("[Seed] Created %d trigger events", len(trigger_events))

        # ── Step 4: Seed Payouts (20 payouts linked to trigger events) ──
        statuses = ["Credited", "Credited", "Credited", "Credited", "Held", "Processing"]
        payout_count = 0

        for event in trigger_events[:20]:
            # Assign to a random worker's policy
            if not policies:
                break

            policy = random.choice(policies)
            worker = db.query(models.Worker).filter(models.Worker.id == policy.worker_id).first()
            if not worker:
                continue

            cfg = TRIGGER_CONFIGS.get(event.type, {"payout_hrs": 4})
            amount_paise = cfg["payout_hrs"] * 10200
            status = random.choice(statuses)
            fraud_score = round(random.uniform(0.02, 0.28), 3) if status == "Credited" else round(random.uniform(0.35, 0.72), 3)

            payout = models.Payout(
                policy_id=policy.id,
                trigger_event_id=event.id,
                type=event.type,
                amount_paise=amount_paise,
                status=status,
                reason=f"{event.type} disruption in {event.zone}",
                upi_ref=f"P-SSAI-{event.id}-{policy.id}-{uuid.uuid4().hex[:8]}",
                fraud_score=fraud_score,
                processing_time_ms=random.randint(800, 3200),
                date=event.timestamp,
            )
            db.add(payout)
            db.flush()
            payout_count += 1

            # Create lifecycle audit trail for recent payouts
            if payout_count <= 5:
                for from_s, to_s, reason in [
                    (None, "Initiated", "Trigger event accepted"),
                    ("Initiated", "Processing", "Fraud checks started"),
                    ("Processing", status, f"Score: {fraud_score:.3f} — {'auto-approved' if status == 'Credited' else 'held for review'}"),
                ]:
                    pse = models.PayoutStatusEvent(
                        payout_id=payout.id,
                        from_status=from_s,
                        to_status=to_s,
                        reason=reason,
                        created_at=event.timestamp + timedelta(seconds=random.randint(1, 60)),
                    )
                    db.add(pse)

        db.commit()
        logger.info("[Seed] Demo data complete: %d workers, %d policies, %d triggers, %d payouts",
                     len(workers), len(policies), len(trigger_events), payout_count)

    except Exception as e:
        db.rollback()
        logger.error("[Seed] Demo data seeding failed: %s", e)
    finally:
        db.close()
