import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from seed_data import MOCK_PARTNERS
from utils.time_utils import utcnow

# --- Configuration ---
NUM_PAYOUTS_PER_WORKER = (3, 7)  # Min, Max payouts
PAYOUT_TYPES = [
    ("Rain Protection", "Rainfall exceeded 5mm/hr in your zone"),
    ("Heat Surge", "Dynamic surge due to heatwave (>42°C)"),
    ("Flood Alert", "Pre-emptive payout for waterlogged routes"),
    ("Wind Alert", "High wind speeds affecting two-wheeler safety"),
    ("Extreme Temp", "Night-time temperature drop below 10°C")
]
STATUSES = ["Credited", "Processing", "Pending", "Failed"]
TIERS = ["Basic", "Premium"]

def clear_db(db: Session):
    """Clear existing data to avoid duplicates during seeding."""
    print("Cleaning up old mock data...")
    db.query(models.PayoutStatusEvent).delete()
    db.query(models.Payout).delete()
    db.query(models.TriggerEvent).delete()
    db.query(models.Policy).delete()
    db.query(models.Worker).delete()
    db.commit()

def seed_data():
    db = SessionLocal()
    try:
        clear_db(db)
        print(f"Seeding {len(MOCK_PARTNERS)} partners...")

        for partner_id, data in MOCK_PARTNERS.items():
            # 1. Create Worker
            worker = models.Worker(
                partner_id=partner_id,
                name=data["name"],
                platform=data["platform"],
                zone=data["zone"],
                city=data["city"],
                latitude=data["lat"],
                longitude=data["lon"],
                score=data["score"],
                partner_since=data["tenure"],
                tenure_months=data["tenure_months"],
                hourly_rate=data["hourly_rate"],
                weekly_income=data["weekly_income"],
                is_verified=True
            )
            db.add(worker)
            db.flush()  # Get worker.id

            # 2. Create Policy
            tier = random.choice(TIERS)
            policy_ref = f"SS-{random.randint(1000, 9999)}-{worker.city[:3].upper()}"
            policy = models.Policy(
                policy_ref=policy_ref,
                worker_id=worker.id,
                tier=tier,
                coverage_type=tier,
                premium_amount=random.randint(25, 120),
                max_payout_per_event=800 if tier == "Basic" else 1200,
                start_date=utcnow() - timedelta(days=60),
                is_active=True,
                status="active"
            )
            db.add(policy)
            db.flush()

            # 3. Create historical Payouts
            num_payouts = random.randint(*NUM_PAYOUTS_PER_WORKER)
            for i in range(num_payouts):
                p_type, p_reason = random.choice(PAYOUT_TYPES)
                p_status = random.choices(STATUSES, weights=[0.7, 0.1, 0.1, 0.1])[0]
                days_ago = random.randint(1, 14)
                p_date = utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))
                
                # Mock Trigger Event
                trigger = models.TriggerEvent(
                    type=p_type.split()[0].upper(),
                    zone=worker.zone,
                    signal_value="High" if p_status != "Failed" else "Medium",
                    alert_level="RED" if p_status == "Credited" else "ORANGE",
                    timestamp=p_date - timedelta(minutes=random.randint(5, 30)),
                    is_confirmed=True,
                    affected_workers_count=random.randint(50, 500)
                )
                db.add(trigger)
                db.flush()

                payout = models.Payout(
                    policy_id=policy.id,
                    trigger_event_id=trigger.id,
                    type=p_type,
                    amount=random.randint(200, 600),
                    date=p_date,
                    status=p_status,
                    status_updated_at=p_date + timedelta(minutes=random.randint(10, 120)),
                    reason=p_reason,
                    upi_ref=f"UPI-{random.randint(100, 999)}-{p_type.split()[0].upper()}-{worker.score}",
                    fraud_score=random.uniform(0.01, 0.4) if p_status != "Failed" else random.uniform(0.7, 0.95)
                )
                db.add(payout)
                db.flush()

                # Add status event
                status_event = models.PayoutStatusEvent(
                    payout_id=payout.id,
                    from_status=None,
                    to_status=p_status,
                    reason="System Automated Processing"
                )
                db.add(status_event)

        db.commit()
        print("Seeding completed successfully!")
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Ensure tables exist
    models.Base.metadata.create_all(bind=engine)
    seed_data()
