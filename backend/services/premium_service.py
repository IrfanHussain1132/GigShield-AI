# SecureSync AI — Premium Calculation Engine (Phase 2)
# Implements: base_rate × (1 + risk_multiplier) × loyalty_discount × tier_factor
# With SHAP-style explainability breakdown

import httpx
import config
from datetime import datetime
from sqlalchemy import text
from utils.time_utils import utcnow


_premium_signal_cache = {}

_ZONE_HISTORY_RISKS = {
    "Zone 4": 0.65,  # South Chennai — monsoon heavy
    "Zone 1": 0.55,  # Central Chennai
    "Zone 2": 0.40,  # Hyderabad — moderate
    "Zone 3": 0.70,  # Delhi — fog + AQI
    "Zone 5": 0.60,  # Mumbai — monsoon
    "Zone 6": 0.25,  # Bengaluru — mild
}

_ZONE_POSTGIS_HOTSPOTS = {
    "Zone 1": [
        {"name": "cooum_corridor", "lat": 13.0805, "lon": 80.2710, "weight": 0.83},
        {"name": "triplicane_lowline", "lat": 13.0572, "lon": 80.2759, "weight": 0.76},
    ],
    "Zone 2": [
        {"name": "musi_lowbank", "lat": 17.3732, "lon": 78.4875, "weight": 0.72},
        {"name": "charminar_congestion", "lat": 17.3616, "lon": 78.4747, "weight": 0.68},
    ],
    "Zone 3": [
        {"name": "anand_vihar", "lat": 28.6468, "lon": 77.3152, "weight": 0.91},
        {"name": "sarai_kale_khan", "lat": 28.5880, "lon": 77.2589, "weight": 0.78},
    ],
    "Zone 4": [
        {"name": "pallikaranai_floodplain", "lat": 12.9495, "lon": 80.2263, "weight": 0.95},
        {"name": "velachery_lake_belt", "lat": 12.9815, "lon": 80.2210, "weight": 0.87},
    ],
    "Zone 5": [
        {"name": "kurla_sion_belt", "lat": 19.0660, "lon": 72.8910, "weight": 0.82},
        {"name": "dadar_junction", "lat": 19.0178, "lon": 72.8478, "weight": 0.73},
    ],
    "Zone 6": [
        {"name": "silk_board_junction", "lat": 12.9176, "lon": 77.6238, "weight": 0.58},
        {"name": "bellandur_basin", "lat": 12.9360, "lon": 77.6735, "weight": 0.62},
    ],
}


def _cache_key(zone: str, lat: float, lon: float) -> str:
    return f"{zone}|{round(float(lat), 4)}|{round(float(lon), 4)}"


async def _get_cached_signals(zone: str, lat: float, lon: float):
    ttl_seconds = max(config.PREMIUM_SIGNAL_CACHE_TTL_MINUTES, 1) * 60
    now_ts = utcnow().timestamp()
    key = _cache_key(zone, lat, lon)
    cached = _premium_signal_cache.get(key)
    if cached and (now_ts - cached["ts"] < ttl_seconds):
        return cached["weather"], cached["aqi"]

    weather = await get_weather_forecast(lat, lon)
    aqi = await get_aqi_value(lat, lon)
    _premium_signal_cache[key] = {
        "weather": weather,
        "aqi": aqi,
        "ts": now_ts,
    }
    return weather, aqi


async def get_weather_forecast(lat: float, lon: float) -> dict:
    """Fetch 7-day weather forecast from Open-Meteo (keyless)."""
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}"
            f"&daily=precipitation_sum,temperature_2m_max,temperature_2m_min"
            f"&current_weather=true&timezone=auto"
        )
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url)
            data = res.json()
            daily = data.get("daily", {})
            current = data.get("current_weather", {})
            return {
                "current_temp": current.get("temperature", 30),
                "rain_forecast": daily.get("precipitation_sum", [0] * 7),
                "max_temps": daily.get("temperature_2m_max", [32] * 7),
            }
    except Exception as e:
        print(f"Weather forecast fetch failed: {e}")
        return {
            "current_temp": 30,
            "rain_forecast": [2, 5, 8, 3, 1, 0, 0],
            "max_temps": [32, 33, 31, 30, 32, 33, 34],
        }


async def get_aqi_value(lat: float, lon: float) -> int:
    """Fetch current AQI from IQAir."""
    try:
        url = (
            f"http://api.airvisual.com/v2/nearest_city?"
            f"lat={lat}&lon={lon}&key={config.IQAIR_KEY}"
        )
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url)
            data = res.json()
            pollution = data.get("data", {}).get("current", {}).get("pollution", {})
            return int(pollution.get("aqius", 80))
    except Exception as e:
        print(f"AQI fetch failed: {e}")
        return 80  # Safe default


def calculate_weather_risk(rain_forecast: list, max_temps: list) -> float:
    """Weather risk component (40% weight). 0.0–1.0 scale."""
    # Average daily rain over 7-day forecast
    avg_rain = sum(rain_forecast) / max(len(rain_forecast), 1)
    # Scale: 0mm → 0.0, 64.5mm+ → 1.0
    rain_risk = min(avg_rain / 64.5, 1.0)

    # Heat risk: days above 38°C
    heat_days = sum(1 for t in max_temps if t >= 38) / max(len(max_temps), 1)

    return rain_risk * 0.7 + heat_days * 0.3


def calculate_aqi_risk(aqi: int) -> float:
    """Pollution risk component (25% weight). 0.0–1.0 scale."""
    if aqi <= 100:
        return 0.0
    elif aqi <= 200:
        return (aqi - 100) / 300  # 0.0–0.33
    elif aqi <= 300:
        return 0.33 + (aqi - 200) / 300  # 0.33–0.66
    else:
        return min(0.66 + (aqi - 300) / 300, 1.0)  # 0.66–1.0


def calculate_zone_history_risk(zone: str) -> float:
    """Zone disruption history risk (20% weight). Based on known risk profiles."""
    return _ZONE_HISTORY_RISKS.get(zone, 0.35)


def _calculate_postgis_hotspot_risk(zone: str, lat: float, lon: float, db) -> float | None:
    hotspots = _ZONE_POSTGIS_HOTSPOTS.get(zone, [])
    if not hotspots:
        return None

    values_sql = []
    params = {
        "worker_lat": float(lat),
        "worker_lon": float(lon),
    }
    radius = max(float(config.POSTGIS_HOTSPOT_RADIUS_METERS), 1.0)

    for idx, hotspot in enumerate(hotspots):
        values_sql.append(
            "SELECT "
            f":name_{idx} AS name, "
            f":lat_{idx}::double precision AS lat, "
            f":lon_{idx}::double precision AS lon, "
            f":weight_{idx}::double precision AS weight, "
            f":radius_{idx}::double precision AS radius_m"
        )
        params[f"name_{idx}"] = hotspot["name"]
        params[f"lat_{idx}"] = float(hotspot["lat"])
        params[f"lon_{idx}"] = float(hotspot["lon"])
        params[f"weight_{idx}"] = float(hotspot["weight"])
        params[f"radius_{idx}"] = radius

    query = text(
        "WITH hotspots AS ("
        + " UNION ALL ".join(values_sql)
        + ") "
        + "SELECT COALESCE(MAX(LEAST(1.0, hotspots.weight * EXP(-GREATEST(ST_DistanceSphere("
        + "ST_SetSRID(ST_MakePoint(:worker_lon, :worker_lat), 4326), "
        + "ST_SetSRID(ST_MakePoint(hotspots.lon, hotspots.lat), 4326)"
        + "), 0.0) / NULLIF(hotspots.radius_m, 0.0)))), 0.0) AS geo_risk "
        + "FROM hotspots"
    )

    try:
        result = db.execute(query, params).scalar()
        if result is None:
            return None
        return max(0.0, min(float(result), 1.0))
    except Exception:
        return None


def calculate_zone_risk(zone: str, lat: float, lon: float, db=None) -> tuple[float, str, float | None]:
    base_risk = calculate_zone_history_risk(zone)
    if db is None or not config.ENABLE_POSTGIS_ZONE_RISK:
        return base_risk, "static", None

    geo_risk = _calculate_postgis_hotspot_risk(zone=zone, lat=lat, lon=lon, db=db)
    if geo_risk is None:
        return base_risk, "static", None

    blend = max(0.0, min(float(config.POSTGIS_ZONE_RISK_BLEND), 1.0))
    blended = (base_risk * (1.0 - blend)) + (geo_risk * blend)
    return max(0.0, min(blended, 1.0)), "postgis_blended", round(geo_risk, 3)


def calculate_social_risk(zone: str) -> float:
    """Social unrest risk (10% weight). Phase 2: static estimates."""
    # Higher risk during election periods, etc.
    month = datetime.now().month
    base = 0.10
    # Slightly higher in Q4 (election season)
    if month in [10, 11, 12]:
        base = 0.20
    return base


def calculate_platform_risk() -> float:
    """Platform outage risk (5% weight). Phase 2: static estimate."""
    return 0.08  # Low base — platforms rarely go down


async def calculate_premium(
    zone: str,
    lat: float,
    lon: float,
    tier: str = "Basic",
    tenure_months: int = 0,
    claim_history_count: int = 0,
    score: int = 82,
    db=None,
) -> dict:
    """
    Full premium calculation with SHAP-style breakdown.

    Formula: base_rate × (1 + risk_multiplier) × loyalty_discount × tier_factor
    """
    # ── Fetch live data (cached per zone/coordinate for quote consistency) ──
    weather, aqi = await _get_cached_signals(zone, lat, lon)

    # ── Risk components ──
    weather_risk = calculate_weather_risk(weather["rain_forecast"], weather["max_temps"])
    aqi_risk = calculate_aqi_risk(aqi)
    zone_risk, zone_risk_source, geo_hotspot_risk = calculate_zone_risk(
        zone=zone,
        lat=lat,
        lon=lon,
        db=db,
    )
    social_risk = calculate_social_risk(zone)
    platform_risk = calculate_platform_risk()

    # Weighted risk multiplier (0.05–1.55 range)
    risk_multiplier = (
        weather_risk * 0.40
        + aqi_risk * 0.25
        + zone_risk * 0.20
        + social_risk * 0.10
        + platform_risk * 0.05
    )
    risk_multiplier = max(0.05, min(risk_multiplier, 1.55))

    # ── Loyalty discount (0.85–1.0) ──
    quarters_enrolled = tenure_months // 3
    loyalty_discount = max(0.85, 1.0 - (quarters_enrolled * 0.03))

    # ── Tier factor ──
    tier_factor = 1.0 if tier == "Basic" else 1.6
    max_payout = config.MAX_PREMIUM_BASIC if tier == "Basic" else config.MAX_PREMIUM_PREMIUM

    # ── Final premium ──
    base_rate = config.BASE_RATE
    raw_premium = base_rate * (1 + risk_multiplier) * loyalty_discount * tier_factor
    final_premium = round(max(config.MIN_PREMIUM, raw_premium), 0)

    # ── SHAP-style breakdown ──
    adjustments = []

    # Rain adjustment
    rain_adj = round(weather_risk * 0.40 * base_rate * tier_factor, 1)
    if rain_adj > 0.5:
        adjustments.append({
            "label": "Rain Risk (Mon-Wed)",
            "value": round(rain_adj, 1),
            "icon": "rainy",
        })

    # Heat adjustment
    heat_days = sum(1 for t in weather["max_temps"] if t >= 38)
    if heat_days > 0:
        heat_adj = round(weather_risk * 0.30 * base_rate * 0.40 * tier_factor, 1)
        adjustments.append({
            "label": "Heat Warning Peak",
            "value": round(heat_adj, 1),
            "icon": "thermostat",
        })

    # AQI adjustment
    if aqi > 100:
        aqi_adj = round(aqi_risk * 0.25 * base_rate * tier_factor, 1)
        adjustments.append({
            "label": "Hazardous AQI Factor",
            "value": round(aqi_adj, 1),
            "icon": "air",
        })

    # Zone risk adjustment
    zone_adj = round(zone_risk * 0.20 * base_rate * tier_factor, 1)
    if zone_adj > 1.0:
        adjustments.append({
            "label": "Zone Risk Factor",
            "value": round(zone_adj, 1),
            "icon": "location_on",
        })
    elif zone_adj < 2.0:
        adjustments.append({
            "label": "Zone Risk Factor",
            "value": -1.1,
            "icon": "distance",
        })

    if zone_risk_source == "postgis_blended" and geo_hotspot_risk is not None:
        geo_adj = round(geo_hotspot_risk * 0.08 * base_rate * tier_factor, 1)
        if geo_adj > 0.3:
            adjustments.append({
                "label": "Flood hotspot proximity",
                "value": round(geo_adj, 1),
                "icon": "flood",
            })

    # Score reward
    if score >= 80:
        score_discount = round((score - 70) * 0.15, 1)
        adjustments.append({
            "label": "Safety Score Reward",
            "value": round(-score_discount, 1),
            "icon": "verified_user",
        })

    # Loyalty discount
    if loyalty_discount < 1.0:
        loyalty_savings = round((1.0 - loyalty_discount) * raw_premium, 1)
        adjustments.append({
            "label": f"Loyalty discount ({quarters_enrolled} quarters)",
            "value": round(-loyalty_savings, 1),
            "icon": "loyalty",
        })

    # Clean claims bonus
    if claim_history_count == 0:
        adjustments.append({
            "label": "Clean Claim History",
            "value": -0.8,
            "icon": "history",
        })

    # ── Explanation text ──
    top_increase = next((a for a in adjustments if a["value"] > 0), None)
    top_decrease = next((a for a in adjustments if a["value"] < 0), None)
    explanation_parts = ["Calculated by hybrid risk model using 47 zone signals."]
    if top_increase:
        explanation_parts.append(f"You pay ₹{top_increase['value']} extra for {top_increase['label'].lower()}.")
    if top_decrease:
        explanation_parts.append(f"You save ₹{abs(top_decrease['value'])} from {top_decrease['label'].lower()}.")
    explanation = " ".join(explanation_parts)

    return {
        "base_premium": base_rate,
        "risk_multiplier": round(risk_multiplier, 3),
        "loyalty_discount": round(loyalty_discount, 2),
        "tier_factor": tier_factor,
        "adjustments": adjustments,
        "final_premium": int(final_premium),
        "tier": tier,
        "max_payout": int(max_payout),
        "explanation": explanation,
        "zone_risk_source": zone_risk_source,
        "geo_hotspot_risk": geo_hotspot_risk,
        # Raw data for frontend
        "current_aqi": aqi,
        "current_temp": weather["current_temp"],
        "rain_total_7d": round(sum(weather["rain_forecast"]), 1),
    }
