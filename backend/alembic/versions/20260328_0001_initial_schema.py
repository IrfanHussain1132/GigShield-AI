"""initial schema

Revision ID: 20260328_0001
Revises:
Create Date: 2026-03-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260328_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("platform", sa.String(), nullable=True),
        sa.Column("partner_id", sa.String(), nullable=True),
        sa.Column("zone", sa.String(), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("partner_since", sa.String(), nullable=True),
        sa.Column("tenure_months", sa.Integer(), nullable=True),
        sa.Column("tier", sa.String(), nullable=True),
        sa.Column("hourly_rate", sa.Integer(), nullable=True),
        sa.Column("weekly_income", sa.Integer(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint("hourly_rate >= 0", name="ck_workers_hourly_rate_non_negative"),
        sa.CheckConstraint("weekly_income >= 0", name="ck_workers_weekly_income_non_negative"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workers_id", "workers", ["id"], unique=False)
    op.create_index("ix_workers_partner_id", "workers", ["partner_id"], unique=True)
    op.create_index("ix_workers_phone", "workers", ["phone"], unique=True)
    op.create_index("ix_workers_zone", "workers", ["zone"], unique=False)

    op.create_table(
        "otp_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("code", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("is_used", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_otp_sessions_id", "otp_sessions", ["id"], unique=False)
    op.create_index("ix_otp_sessions_phone", "otp_sessions", ["phone"], unique=False)

    op.create_table(
        "otp_verify_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_otp_verify_attempts_created_at", "otp_verify_attempts", ["created_at"], unique=False)
    op.create_index("ix_otp_verify_attempts_id", "otp_verify_attempts", ["id"], unique=False)
    op.create_index("ix_otp_verify_attempts_phone", "otp_verify_attempts", ["phone"], unique=False)
    op.create_index("ix_otp_verify_attempts_success", "otp_verify_attempts", ["success"], unique=False)

    op.create_table(
        "idempotency_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("scope", sa.String(), nullable=True),
        sa.Column("idempotency_key", sa.String(), nullable=True),
        sa.Column("request_hash", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("response_body", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_idempotency_records_created_at", "idempotency_records", ["created_at"], unique=False)
    op.create_index("ix_idempotency_records_id", "idempotency_records", ["id"], unique=False)
    op.create_index("ix_idempotency_records_idempotency_key", "idempotency_records", ["idempotency_key"], unique=True)
    op.create_index("ix_idempotency_records_scope", "idempotency_records", ["scope"], unique=False)
    op.create_index("ix_idempotency_records_status", "idempotency_records", ["status"], unique=False)

    op.create_table(
        "trigger_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(), nullable=True),
        sa.Column("zone", sa.String(), nullable=True),
        sa.Column("signal_value", sa.String(), nullable=True),
        sa.Column("alert_level", sa.String(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("source_count", sa.Integer(), nullable=True),
        sa.Column("sources", sa.Text(), nullable=True),
        sa.Column("is_confirmed", sa.Boolean(), nullable=True),
        sa.Column("affected_workers_count", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trigger_events_id", "trigger_events", ["id"], unique=False)
    op.create_index("ix_trigger_events_timestamp", "trigger_events", ["timestamp"], unique=False)
    op.create_index("ix_trigger_events_type", "trigger_events", ["type"], unique=False)
    op.create_index("ix_trigger_events_zone", "trigger_events", ["zone"], unique=False)
    op.create_index("idx_zone_timestamp", "trigger_events", ["zone", sa.text("timestamp DESC")], unique=False)

    op.create_table(
        "policies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("policy_ref", sa.String(), nullable=True),
        sa.Column("worker_id", sa.Integer(), nullable=True),
        sa.Column("premium_amount", sa.Integer(), nullable=True),
        sa.Column("tier", sa.String(), nullable=True),
        sa.Column("coverage_type", sa.String(), nullable=True),
        sa.Column("max_payout_per_event", sa.Integer(), nullable=True),
        sa.Column("start_date", sa.DateTime(), nullable=True),
        sa.Column("end_date", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint("premium_amount >= 0", name="ck_policies_premium_amount_non_negative"),
        sa.CheckConstraint("max_payout_per_event >= 0", name="ck_policies_max_payout_non_negative"),
        sa.ForeignKeyConstraint(["worker_id"], ["workers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_policies_id", "policies", ["id"], unique=False)
    op.create_index("ix_policies_is_active", "policies", ["is_active"], unique=False)
    op.create_index("ix_policies_policy_ref", "policies", ["policy_ref"], unique=True)
    op.create_index("ix_policies_worker_id", "policies", ["worker_id"], unique=False)
    op.create_index(
        "uq_active_policy_per_worker",
        "policies",
        ["worker_id"],
        unique=True,
        sqlite_where=sa.text("is_active = 1"),
        postgresql_where=sa.text("is_active = true"),
    )

    op.create_table(
        "payouts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("policy_id", sa.Integer(), nullable=True),
        sa.Column("trigger_event_id", sa.Integer(), nullable=True),
        sa.Column("type", sa.String(), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=True),
        sa.Column("date", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("status_updated_at", sa.DateTime(), nullable=True),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("upi_ref", sa.String(), nullable=True),
        sa.Column("fraud_score", sa.Float(), nullable=True),
        sa.Column("processing_time_ms", sa.Integer(), nullable=True),
        sa.CheckConstraint("amount >= 0", name="ck_payouts_amount_non_negative"),
        sa.CheckConstraint(
            "status IN ('Initiated','Processing','Credited','Held','Failed','Pending','Rejected')",
            name="ck_payouts_status_allowed",
        ),
        sa.ForeignKeyConstraint(["policy_id"], ["policies.id"]),
        sa.ForeignKeyConstraint(["trigger_event_id"], ["trigger_events.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payouts_date", "payouts", ["date"], unique=False)
    op.create_index("ix_payouts_id", "payouts", ["id"], unique=False)
    op.create_index("ix_payouts_policy_id", "payouts", ["policy_id"], unique=False)
    op.create_index("ix_payouts_status", "payouts", ["status"], unique=False)
    op.create_index("ix_payouts_status_updated_at", "payouts", ["status_updated_at"], unique=False)
    op.create_index("ix_payouts_type", "payouts", ["type"], unique=False)
    op.create_index("idx_payout_policy_date", "payouts", ["policy_id", sa.text("date DESC")], unique=False)
    op.create_index(
        "uq_payout_policy_trigger",
        "payouts",
        ["policy_id", "trigger_event_id"],
        unique=True,
        sqlite_where=sa.text("trigger_event_id IS NOT NULL"),
        postgresql_where=sa.text("trigger_event_id IS NOT NULL"),
    )

    op.create_table(
        "payout_status_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("payout_id", sa.Integer(), nullable=True),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=True),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("external_ref", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["payout_id"], ["payouts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payout_status_events_created_at", "payout_status_events", ["created_at"], unique=False)
    op.create_index("ix_payout_status_events_id", "payout_status_events", ["id"], unique=False)
    op.create_index("ix_payout_status_events_payout_id", "payout_status_events", ["payout_id"], unique=False)
    op.create_index(
        "idx_payout_status_events_payout_time",
        "payout_status_events",
        ["payout_id", sa.text("created_at DESC")],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_payout_status_events_payout_time", table_name="payout_status_events")
    op.drop_index("ix_payout_status_events_payout_id", table_name="payout_status_events")
    op.drop_index("ix_payout_status_events_id", table_name="payout_status_events")
    op.drop_index("ix_payout_status_events_created_at", table_name="payout_status_events")
    op.drop_table("payout_status_events")

    op.drop_index("idx_payout_policy_date", table_name="payouts")
    op.drop_index("uq_payout_policy_trigger", table_name="payouts")
    op.drop_index("ix_payouts_status_updated_at", table_name="payouts")
    op.drop_index("ix_payouts_status", table_name="payouts")
    op.drop_index("ix_payouts_type", table_name="payouts")
    op.drop_index("ix_payouts_policy_id", table_name="payouts")
    op.drop_index("ix_payouts_id", table_name="payouts")
    op.drop_index("ix_payouts_date", table_name="payouts")
    op.drop_table("payouts")

    op.drop_index("ix_policies_worker_id", table_name="policies")
    op.drop_index("uq_active_policy_per_worker", table_name="policies")
    op.drop_index("ix_policies_policy_ref", table_name="policies")
    op.drop_index("ix_policies_is_active", table_name="policies")
    op.drop_index("ix_policies_id", table_name="policies")
    op.drop_table("policies")

    op.drop_index("idx_zone_timestamp", table_name="trigger_events")
    op.drop_index("ix_trigger_events_zone", table_name="trigger_events")
    op.drop_index("ix_trigger_events_type", table_name="trigger_events")
    op.drop_index("ix_trigger_events_timestamp", table_name="trigger_events")
    op.drop_index("ix_trigger_events_id", table_name="trigger_events")
    op.drop_table("trigger_events")

    op.drop_index("ix_idempotency_records_status", table_name="idempotency_records")
    op.drop_index("ix_idempotency_records_scope", table_name="idempotency_records")
    op.drop_index("ix_idempotency_records_idempotency_key", table_name="idempotency_records")
    op.drop_index("ix_idempotency_records_id", table_name="idempotency_records")
    op.drop_index("ix_idempotency_records_created_at", table_name="idempotency_records")
    op.drop_table("idempotency_records")

    op.drop_index("ix_otp_verify_attempts_success", table_name="otp_verify_attempts")
    op.drop_index("ix_otp_verify_attempts_phone", table_name="otp_verify_attempts")
    op.drop_index("ix_otp_verify_attempts_id", table_name="otp_verify_attempts")
    op.drop_index("ix_otp_verify_attempts_created_at", table_name="otp_verify_attempts")
    op.drop_table("otp_verify_attempts")

    op.drop_index("ix_otp_sessions_phone", table_name="otp_sessions")
    op.drop_index("ix_otp_sessions_id", table_name="otp_sessions")
    op.drop_table("otp_sessions")

    op.drop_index("ix_workers_zone", table_name="workers")
    op.drop_index("ix_workers_phone", table_name="workers")
    op.drop_index("ix_workers_partner_id", table_name="workers")
    op.drop_index("ix_workers_id", table_name="workers")
    op.drop_table("workers")
