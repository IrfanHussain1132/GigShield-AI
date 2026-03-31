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
