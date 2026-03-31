import models
from utils.time_utils import utcnow


_STATUS_ALIASES = {
    "initiated": "Initiated",
    "processing": "Processing",
    "pending": "Processing",
    "credited": "Credited",
    "held": "Held",
    "failed": "Failed",
    "rejected": "Failed",
}

_ALLOWED_TRANSITIONS = {
    "Initiated": {"Processing", "Credited", "Held", "Failed"},
    "Processing": {"Credited", "Held", "Failed"},
    "Held": {"Processing", "Credited", "Failed"},
    "Credited": set(),
    "Failed": set(),
}


def normalize_status(status: str | None) -> str:
    if status is None:
        return "Initiated"
    normalized = _STATUS_ALIASES.get(str(status).strip().lower())
    if not normalized:
        raise ValueError(f"Unsupported payout status: {status}")
    return normalized


def can_transition(current_status: str | None, new_status: str) -> bool:
    current = normalize_status(current_status)
    target = normalize_status(new_status)
    if current == target:
        return True
    return target in _ALLOWED_TRANSITIONS.get(current, set())


def record_initial_status(db, payout: models.Payout, reason: str = "Payout initialized") -> models.PayoutStatusEvent:
    payout.status = normalize_status(payout.status)
    payout.status_updated_at = utcnow()

    event = models.PayoutStatusEvent(
        payout_id=payout.id,
        from_status=None,
        to_status=payout.status,
        reason=reason,
        external_ref=payout.upi_ref,
    )
    db.add(event)
    return event


def transition_payout_status(
    db,
    payout: models.Payout,
    new_status: str,
    reason: str = "",
    external_ref: str | None = None,
) -> models.PayoutStatusEvent | None:
    current = normalize_status(payout.status)
    target = normalize_status(new_status)

    if current == target:
        return None

    if not can_transition(current, target):
        raise ValueError(f"Invalid payout status transition: {current} -> {target}")

    payout.status = target
    payout.status_updated_at = utcnow()
    if reason:
        payout.reason = reason
    if external_ref:
        payout.upi_ref = external_ref

    event = models.PayoutStatusEvent(
        payout_id=payout.id,
        from_status=current,
        to_status=target,
        reason=reason,
        external_ref=external_ref or payout.upi_ref,
    )
    db.add(event)
    return event
