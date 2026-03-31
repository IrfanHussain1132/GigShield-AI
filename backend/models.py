from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, Index, CheckConstraint
from sqlalchemy.orm import relationship
from database import Base
from utils.time_utils import utcnow


def _rupees_to_paise(value: float | int | None) -> int:
    if value is None:
        return 0
    return int(round(float(value) * 100))


def _paise_to_rupees(value: int | None) -> float:
    if value is None:
        return 0.0
    return round(float(value) / 100.0, 2)


class Worker(Base):
    __tablename__ = "workers"
    __table_args__ = (
        CheckConstraint("hourly_rate >= 0", name="ck_workers_hourly_rate_non_negative"),
        CheckConstraint("weekly_income >= 0", name="ck_workers_weekly_income_non_negative"),
    )

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True)
    name = Column(String)
    platform = Column(String)                       # swiggy / zomato / both
    partner_id = Column(String, unique=True, index=True)
    zone = Column(String, index=True)
    city = Column(String)
    latitude = Column(Float, default=13.0125)
    longitude = Column(Float, default=80.2241)
    score = Column(Integer, default=82)
    partner_since = Column(String)
    tenure_months = Column(Integer, default=0)
    tier = Column(String, default="Basic")
    hourly_rate_paise = Column("hourly_rate", Integer, default=10200)
    weekly_income_paise = Column("weekly_income", Integer, default=612000)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    policies = relationship("Policy", back_populates="worker", cascade="all, delete-orphan")

    @property
    def hourly_rate(self) -> float:
        return _paise_to_rupees(self.hourly_rate_paise)

    @hourly_rate.setter
    def hourly_rate(self, value: float | int) -> None:
        self.hourly_rate_paise = _rupees_to_paise(value)

    @property
    def weekly_income(self) -> float:
        return _paise_to_rupees(self.weekly_income_paise)

    @weekly_income.setter
    def weekly_income(self, value: float | int) -> None:
        self.weekly_income_paise = _rupees_to_paise(value)


class Policy(Base):
    __tablename__ = "policies"
    __table_args__ = (
        CheckConstraint("premium_amount >= 0", name="ck_policies_premium_amount_non_negative"),
        CheckConstraint("max_payout_per_event >= 0", name="ck_policies_max_payout_non_negative"),
    )

    id = Column(Integer, primary_key=True, index=True)
    policy_ref = Column(String, unique=True, index=True)   # e.g. SS-8829-IND
    worker_id = Column(Integer, ForeignKey("workers.id"), index=True)
    premium_amount_paise = Column("premium_amount", Integer)
    tier = Column(String)                                    # Basic / Premium
    coverage_type = Column(String, default="Basic")
    max_payout_per_event_paise = Column("max_payout_per_event", Integer, default=80000)
    start_date = Column(DateTime, default=utcnow)
    end_date = Column(DateTime)
    is_active = Column(Boolean, default=True, index=True)
    status = Column(String, default="active")                # active / expired / cancelled
    created_at = Column(DateTime, default=utcnow)

    worker = relationship("Worker", back_populates="policies")
    payouts = relationship("Payout", back_populates="policy", cascade="all, delete-orphan")

    @property
    def premium_amount(self) -> float:
        return _paise_to_rupees(self.premium_amount_paise)

    @premium_amount.setter
    def premium_amount(self, value: float | int) -> None:
        self.premium_amount_paise = _rupees_to_paise(value)

    @property
    def max_payout_per_event(self) -> float:
        return _paise_to_rupees(self.max_payout_per_event_paise)

    @max_payout_per_event.setter
    def max_payout_per_event(self, value: float | int) -> None:
        self.max_payout_per_event_paise = _rupees_to_paise(value)


class Payout(Base):
    __tablename__ = "payouts"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_payouts_amount_non_negative"),
        CheckConstraint(
            "status IN ('Initiated','Processing','Credited','Held','Failed','Pending','Rejected')",
            name="ck_payouts_status_allowed",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("policies.id"), index=True)
    trigger_event_id = Column(Integer, ForeignKey("trigger_events.id"), nullable=True)
    type = Column(String, index=True)
    amount_paise = Column("amount", Integer)
    date = Column(DateTime, default=utcnow, index=True)
    status = Column(String, default="Initiated", index=True)
    status_updated_at = Column(DateTime, default=utcnow, index=True)
    reason = Column(String)
    upi_ref = Column(String)                     # e.g. UPI-408-RAIN-82
    fraud_score = Column(Float, default=0.0)
    processing_time_ms = Column(Integer, default=0)

    policy = relationship("Policy", back_populates="payouts")
    trigger_event = relationship("TriggerEvent", back_populates="payouts")
    status_events = relationship("PayoutStatusEvent", back_populates="payout", cascade="all, delete-orphan")

    @property
    def amount(self) -> float:
        return _paise_to_rupees(self.amount_paise)

    @amount.setter
    def amount(self, value: float | int) -> None:
        self.amount_paise = _rupees_to_paise(value)


class PayoutStatusEvent(Base):
    __tablename__ = "payout_status_events"

    id = Column(Integer, primary_key=True, index=True)
    payout_id = Column(Integer, ForeignKey("payouts.id"), index=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String)
    reason = Column(String, default="")
    external_ref = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow, index=True)

    payout = relationship("Payout", back_populates="status_events")


class TriggerEvent(Base):
    __tablename__ = "trigger_events"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, index=True)
    zone = Column(String, index=True)
    signal_value = Column(String)
    alert_level = Column(String)                  # GREEN / YELLOW / ORANGE / RED
    timestamp = Column(DateTime, default=utcnow, index=True)
    source_count = Column(Integer, default=2)
    sources = Column(Text, default="[]")          # JSON string of source names
    is_confirmed = Column(Boolean, default=False) # Dual-source gate passed
    affected_workers_count = Column(Integer, default=0)

    payouts = relationship("Payout", back_populates="trigger_event")


class OTPSession(Base):
    __tablename__ = "otp_sessions"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, index=True)
    code = Column(String)
    created_at = Column(DateTime, default=utcnow)
    is_used = Column(Boolean, default=False)


class OTPVerifyAttempt(Base):
    __tablename__ = "otp_verify_attempts"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, index=True)
    success = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=utcnow, index=True)


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    id = Column(Integer, primary_key=True, index=True)
    scope = Column(String, index=True)
    idempotency_key = Column(String, unique=True, index=True)
    request_hash = Column(String)
    status = Column(String, default="processing", index=True)
    response_body = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


# Composite index for fast zone+time lookups
Index('idx_zone_timestamp', TriggerEvent.zone, TriggerEvent.timestamp.desc())
Index('idx_payout_policy_date', Payout.policy_id, Payout.date.desc())
Index(
    'uq_active_policy_per_worker',
    Policy.worker_id,
    unique=True,
    sqlite_where=Policy.is_active == True,
    postgresql_where=Policy.is_active == True,
)
Index(
    'uq_payout_policy_trigger',
    Payout.policy_id,
    Payout.trigger_event_id,
    unique=True,
    sqlite_where=Payout.trigger_event_id.isnot(None),
    postgresql_where=Payout.trigger_event_id.isnot(None),
)
Index('idx_payout_status_events_payout_time', PayoutStatusEvent.payout_id, PayoutStatusEvent.created_at.desc())
