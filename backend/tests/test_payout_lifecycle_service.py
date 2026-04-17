import pytest

from services import payout_lifecycle_service as lifecycle


def test_normalize_status_aliases():
    assert lifecycle.normalize_status("pending") == "Processing"
    assert lifecycle.normalize_status("Rejected") == "Failed"
    assert lifecycle.normalize_status("credited") == "Credited"


def test_invalid_status_raises():
    with pytest.raises(ValueError):
        lifecycle.normalize_status("unknown")


def test_valid_transition_paths():
    assert lifecycle.can_transition("Initiated", "Processing") is True
    assert lifecycle.can_transition("Processing", "Credited") is True
    assert lifecycle.can_transition("Held", "Processing") is True


def test_invalid_transition_paths():
    assert lifecycle.can_transition("Credited", "Processing") is False
    assert lifecycle.can_transition("Failed", "Credited") is False


def test_same_status_transition_is_allowed():
    assert lifecycle.can_transition("Processing", "Processing") is True


def test_transition_generates_db_event():
    import models
    from unittest.mock import MagicMock
    db_mock = MagicMock()
    payout = models.Payout(id=1, status="Initiated", upi_ref="")
    
    event = lifecycle.transition_payout_status(db_mock, payout, "Processing", "Started processing")
    
    assert event is not None
    assert payout.status == "Processing"
    assert event.from_status == "Initiated"
    assert event.to_status == "Processing"
    assert event.reason == "Started processing"
    db_mock.add.assert_called_once_with(event)


def test_invalid_db_transition_raises():
    import models
    from unittest.mock import MagicMock
    db_mock = MagicMock()
    payout = models.Payout(id=2, status="Credited", upi_ref="")
    
    with pytest.raises(ValueError, match="Invalid payout status transition"):
        lifecycle.transition_payout_status(db_mock, payout, "Processing")
    
    db_mock.add.assert_not_called()
