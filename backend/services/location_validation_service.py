# SecureSync AI — Cell Tower Validation + Impossible Speed Check (Phase 3)
# Layer 2 anti-spoofing: Cross-references cell tower IDs and GPS speed checks

import math
import logging
from datetime import datetime, timedelta
from utils.time_utils import utcnow

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════
# Cell Tower Zone Coverage Maps (Simulated)
# ═══════════════════════════════════════════
# In production, these would come from OpenCellID or Google Geolocation API.
# For demo, we define tower coverage areas per zone.

ZONE_TOWER_COVERAGE = {
    "Zone 1": {
        "towers": ["CELL-CHN-001", "CELL-CHN-002", "CELL-CHN-003", "CELL-CHN-004"],
        "center_lat": 13.0827,
        "center_lon": 80.2707,
        "radius_km": 5.0,
    },
    "Zone 2": {
        "towers": ["CELL-HYD-001", "CELL-HYD-002", "CELL-HYD-003", "CELL-HYD-004"],
        "center_lat": 17.3850,
        "center_lon": 78.4867,
        "radius_km": 5.0,
    },
    "Zone 3": {
        "towers": ["CELL-DEL-001", "CELL-DEL-002", "CELL-DEL-003", "CELL-DEL-004"],
        "center_lat": 28.6139,
        "center_lon": 77.2090,
        "radius_km": 5.0,
    },
    "Zone 4": {
        "towers": ["CELL-SCH-001", "CELL-SCH-002", "CELL-SCH-003", "CELL-SCH-004"],
        "center_lat": 13.0125,
        "center_lon": 80.2241,
        "radius_km": 5.0,
    },
    "Zone 5": {
        "towers": ["CELL-MUM-001", "CELL-MUM-002", "CELL-MUM-003", "CELL-MUM-004"],
        "center_lat": 19.0760,
        "center_lon": 72.8777,
        "radius_km": 5.0,
    },
    "Zone 6": {
        "towers": ["CELL-BLR-001", "CELL-BLR-002", "CELL-BLR-003", "CELL-BLR-004"],
        "center_lat": 12.9716,
        "center_lon": 77.5946,
        "radius_km": 5.0,
    },
}

# Maximum plausible speed in urban areas (km/h)
MAX_URBAN_SPEED_KMH = 120.0
# Minimum time between GPS pings for speed calculation (seconds)
MIN_PING_INTERVAL_S = 10


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in km between two points on earth."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    return R * c


# ═══════════════════════════════════════════
# Cell Tower Validation
# ═══════════════════════════════════════════

def validate_cell_towers(
    worker_tower_ids: list[str],
    claimed_zone: str,
) -> dict:
    """
    Validate that the worker's cell tower IDs are consistent with the claimed zone.

    Tower IDs require physical radio proximity — they cannot be faked by a spoofing app.

    Args:
        worker_tower_ids: List of cell tower IDs from the worker's device
        claimed_zone: The zone the worker claims to be in

    Returns:
        dict with validation result
    """
    zone_coverage = ZONE_TOWER_COVERAGE.get(claimed_zone)
    if not zone_coverage:
        return {
            "valid": True,
            "confidence": 0.5,
            "reason": f"Zone {claimed_zone} not in coverage map — defaulting to pass",
            "check": "cell_tower",
        }

    if not worker_tower_ids:
        return {
            "valid": True,  # Grace-Pay: don't block on missing tower data
            "confidence": 0.3,
            "reason": "No cell tower data available — Grace-Pay applied",
            "check": "cell_tower",
            "grace_pay": True,
        }

    zone_towers = set(zone_coverage["towers"])
    worker_towers = set(worker_tower_ids)

    # Check intersection
    matching_towers = zone_towers & worker_towers
    match_ratio = len(matching_towers) / max(len(worker_towers), 1)

    if match_ratio >= 0.5:
        return {
            "valid": True,
            "confidence": min(0.5 + match_ratio * 0.5, 1.0),
            "reason": f"{len(matching_towers)}/{len(worker_towers)} towers match zone coverage",
            "check": "cell_tower",
            "matching_towers": len(matching_towers),
        }
    else:
        return {
            "valid": False,
            "confidence": 0.85,
            "reason": f"Cell tower mismatch: only {len(matching_towers)}/{len(worker_towers)} towers in zone",
            "check": "cell_tower",
            "matching_towers": len(matching_towers),
            "expected_zone": claimed_zone,
        }


# ═══════════════════════════════════════════
# Impossible Speed Check
# ═══════════════════════════════════════════

def check_impossible_speed(
    gps_pings: list[dict],
    max_speed_kmh: float = MAX_URBAN_SPEED_KMH,
) -> dict:
    """
    Check for impossible speeds between consecutive GPS pings.

    If speed exceeds max_speed_kmh in an urban zone, the device teleported —
    it didn't travel. This check runs in <1ms.

    Args:
        gps_pings: List of {lat, lon, timestamp} sorted chronologically
        max_speed_kmh: Maximum plausible speed (default 120 km/h)

    Returns:
        dict with speed check result
    """
    if len(gps_pings) < 2:
        return {
            "valid": True,
            "max_speed_kmh": 0,
            "reason": "Insufficient GPS data for speed check",
            "check": "speed",
        }

    max_observed_speed = 0.0
    teleport_detected = False
    teleport_details = []

    for i in range(1, len(gps_pings)):
        prev = gps_pings[i - 1]
        curr = gps_pings[i]

        distance_km = haversine_km(
            prev["lat"], prev["lon"],
            curr["lat"], curr["lon"],
        )

        # Calculate time difference
        t1 = prev.get("timestamp")
        t2 = curr.get("timestamp")

        if isinstance(t1, str):
            t1 = datetime.fromisoformat(t1)
        if isinstance(t2, str):
            t2 = datetime.fromisoformat(t2)

        if t1 and t2:
            dt_seconds = abs((t2 - t1).total_seconds())
        else:
            dt_seconds = 300  # Assume 5 min default

        if dt_seconds < MIN_PING_INTERVAL_S:
            continue

        speed_kmh = (distance_km / dt_seconds) * 3600.0

        if speed_kmh > max_observed_speed:
            max_observed_speed = speed_kmh

        if speed_kmh > max_speed_kmh:
            teleport_detected = True
            teleport_details.append({
                "from": {"lat": prev["lat"], "lon": prev["lon"]},
                "to": {"lat": curr["lat"], "lon": curr["lon"]},
                "distance_km": round(distance_km, 2),
                "time_seconds": round(dt_seconds, 1),
                "speed_kmh": round(speed_kmh, 1),
            })

    if teleport_detected:
        return {
            "valid": False,
            "max_speed_kmh": round(max_observed_speed, 1),
            "reason": f"Impossible speed detected: {round(max_observed_speed, 1)} km/h (limit: {max_speed_kmh})",
            "check": "speed",
            "teleport_count": len(teleport_details),
            "teleport_details": teleport_details[:3],  # Limit to 3 details
        }
    else:
        return {
            "valid": True,
            "max_speed_kmh": round(max_observed_speed, 1),
            "reason": f"Speed check passed: max {round(max_observed_speed, 1)} km/h",
            "check": "speed",
        }


# ═══════════════════════════════════════════
# GPS Location Zone Validation
# ═══════════════════════════════════════════

def validate_gps_in_zone(
    lat: float,
    lon: float,
    claimed_zone: str,
    tolerance_km: float = 8.0,
) -> dict:
    """
    Check if GPS coordinates are within the claimed zone's coverage area.

    Args:
        lat: Worker's GPS latitude
        lon: Worker's GPS longitude
        claimed_zone: The zone the worker claims to be in
        tolerance_km: How far outside zone center is still accepted

    Returns:
        dict with validation result
    """
    zone_coverage = ZONE_TOWER_COVERAGE.get(claimed_zone)
    if not zone_coverage:
        return {
            "valid": True,
            "distance_km": 0,
            "reason": f"Zone {claimed_zone} not configured",
            "check": "gps_zone",
        }

    distance = haversine_km(
        lat, lon,
        zone_coverage["center_lat"], zone_coverage["center_lon"],
    )

    max_distance = zone_coverage["radius_km"] + tolerance_km

    if distance <= max_distance:
        return {
            "valid": True,
            "distance_km": round(distance, 2),
            "reason": f"GPS within zone: {round(distance, 2)} km from center",
            "check": "gps_zone",
        }
    else:
        return {
            "valid": False,
            "distance_km": round(distance, 2),
            "reason": f"GPS outside zone: {round(distance, 2)} km from center (limit: {max_distance} km)",
            "check": "gps_zone",
        }


# ═══════════════════════════════════════════
# Combined Anti-Spoofing Check
# ═══════════════════════════════════════════

def run_anti_spoofing_checks(
    worker_id: int,
    claimed_zone: str,
    gps_lat: float = None,
    gps_lon: float = None,
    cell_tower_ids: list[str] = None,
    gps_pings: list[dict] = None,
) -> dict:
    """
    Run all anti-spoofing checks for a payout claim.

    Returns combined result with individual check details and overall fraud signal.
    """
    checks = []
    total_score = 0.0
    weights = {
        "cell_tower": 0.35,
        "speed": 0.35,
        "gps_zone": 0.30,
    }

    # 1. Cell tower validation
    tower_result = validate_cell_towers(
        worker_tower_ids=cell_tower_ids or [],
        claimed_zone=claimed_zone,
    )
    checks.append(tower_result)
    if not tower_result["valid"]:
        total_score += weights["cell_tower"]

    # 2. Speed check
    speed_result = check_impossible_speed(gps_pings or [])
    checks.append(speed_result)
    if not speed_result["valid"]:
        total_score += weights["speed"]

    # 3. GPS zone check
    if gps_lat and gps_lon:
        gps_result = validate_gps_in_zone(gps_lat, gps_lon, claimed_zone)
        checks.append(gps_result)
        if not gps_result["valid"]:
            total_score += weights["gps_zone"]
    else:
        checks.append({
            "valid": True,
            "reason": "No GPS data — Grace-Pay applied",
            "check": "gps_zone",
            "grace_pay": True,
        })

    # Overall decision
    all_valid = all(c["valid"] for c in checks)
    grace_pay = any(c.get("grace_pay", False) for c in checks)

    if all_valid:
        decision = "pass"
        message = "All anti-spoofing checks passed"
    elif grace_pay and total_score < 0.35:
        decision = "grace_pay"
        message = "Weak signal data — Grace-Pay applied, async review queued"
    elif total_score >= 0.65:
        decision = "hard_hold"
        message = "Multiple anti-spoofing failures — manual review required"
    else:
        decision = "soft_hold"
        message = "Partial anti-spoofing failure — confirmation requested"

    return {
        "worker_id": worker_id,
        "spoofing_score": round(total_score, 3),
        "decision": decision,
        "message": message,
        "checks": checks,
        "all_valid": all_valid,
    }
