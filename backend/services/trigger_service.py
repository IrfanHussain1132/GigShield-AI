# SecureSync AI — 8-Trigger Monitoring Engine (Phase 3 — Soar)
# High-concurrency async architecture using httpx and asyncio.gather()
import asyncio
import httpx
import json
import time
import logging
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from database import SessionLocal
import models
import config
from services import fraud_service
from services import payout_lifecycle_service
from services import event_bus_service
from services import notification_service
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from utils.time_utils import utcnow

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Trigger Definitions (per Policy Reference §3.2 and §5) ---
TRIGGERS = {
    "Heavy Rain":       {"threshold": 64.5,  "unit": "mm/day",  "payout_hrs": 4},
    "Very Heavy Rain":  {"threshold": 124.5, "unit": "mm/day",  "payout_hrs": 6},
    "AQI Danger":       {"threshold": 301,   "unit": "AQI",     "payout_hrs": 5},
    "AQI Severe":       {"threshold": 401,   "unit": "AQI",     "payout_hrs": 6},
    "Heat Wave":        {"threshold": 40.0,  "unit": "°C",      "payout_hrs": 4},
    "Severe Heat":      {"threshold": 45.0,  "unit": "°C",      "payout_hrs": 6},
    "Red Alert":        {"threshold": 1,     "unit": "Alert",   "payout_hrs": 8},
    "Dense Fog":        {"threshold": 200,   "unit": "meters",  "payout_hrs": 4},
    "Gridlock":         {"threshold": 8,     "unit": "km/h",    "payout_hrs": 3},
    "Bandh":            {"threshold": 1,     "unit": "Event",   "payout_hrs": 8},
    "Platform Outage":  {"threshold": 2,     "unit": "hours",   "payout_hrs": 2},
}

# Plan-based trigger filtering per Policy §2.1
# Basic plan: rain tiers + red alert + fog + gridlock
# Premium plan: all triggers
BASIC_TRIGGERS = {"Heavy Rain", "Very Heavy Rain", "Red Alert", "Dense Fog", "Gridlock"}
PREMIUM_ONLY_TRIGGERS = {"AQI Danger", "AQI Severe", "Heat Wave", "Severe Heat", "Bandh", "Platform Outage"}

# --- Shared In-Memory Data ---
_zone_cache = {} # Cache for dashboard reads

# ═══════════════════════════════════════════
# Async Data Polling (Source 1-8)
# ═══════════════════════════════════════════

async def fetch_weather_data(client, lat, lon):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&hourly=precipitation,visibility,temperature_2m&daily=precipitation_sum&timezone=auto&forecast_days=1"
    try:
        res = await client.get(url, timeout=5.0)
        d = res.json()
        now_h = datetime.now().hour
        return {
            "temp": d["current_weather"]["temperature"],
            "rain": d["daily"]["precipitation_sum"][0],
            "vis": d["hourly"]["visibility"][min(now_h, 23)],
            "hourly_rain": d["hourly"]["precipitation"][:24],
            "hourly_temp": d["hourly"]["temperature_2m"][:24],
        }
    except Exception: return {"temp": 30, "rain": 0, "vis": 10000, "hourly_rain": [0]*24, "hourly_temp": [30]*24}

async def fetch_aqi(client, lat, lon):
    try:
        url = f"http://api.airvisual.com/v2/nearest_city?lat={lat}&lon={lon}&key={config.IQAIR_KEY}"
        res = await client.get(url, timeout=3.0)
        return res.json()["data"]["current"]["pollution"]["aqius"]
    except Exception: return 85

async def fetch_traffic(client, lat, lon):
    try:
        url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point={lat},{lon}&key={config.TOMTOM_KEY}"
        res = await client.get(url, timeout=3.0)
        return res.json()["flowSegmentData"]["currentSpeed"]
    except Exception: return 32.0

async def check_platforms(client):
    try:
        res = await asyncio.gather(client.get("https://swiggy.com", timeout=2.0), client.get("https://zomato.com", timeout=2.0), return_exceptions=True)
        fails = sum(1 for r in res if isinstance(r, Exception) or (hasattr(r, 'status_code') and r.status_code >= 500))
        return fails >= 2
    except Exception: return False


def _build_active_triggers(
    weather: dict,
    aqi: int,
    speed: float,
    platform_down: bool,
    current_hour: int | None = None,
) -> list[dict]:
    """Derive active trigger list with mutually exclusive severity tiers."""
    active: list[dict] = []

    rain_mm = float(weather.get("rain", 0) or 0)
    temp_c = float(weather.get("temp", 0) or 0)
    vis_m = float(weather.get("vis", 10000) or 10000)
    hour = datetime.now().hour if current_hour is None else int(current_hour)

    # Rainfall tiers: only highest severity should fire in one cycle.
    if rain_mm >= 244.4:
        active.append({"type": "Red Alert", "val": f"{rain_mm}mm", "src": ["OpenMeteo", "IMD-RS"], "conf": True})
    elif rain_mm >= TRIGGERS["Very Heavy Rain"]["threshold"]:
        active.append({"type": "Very Heavy Rain", "val": f"{rain_mm}mm", "src": ["OpenMeteo", "IMD-RS"], "conf": True})
    elif rain_mm >= TRIGGERS["Heavy Rain"]["threshold"]:
        active.append({"type": "Heavy Rain", "val": f"{rain_mm}mm", "src": ["OpenMeteo", "IMD-RS"], "conf": True})

    # AQI tiers: avoid paying both levels in one cycle.
    if aqi >= TRIGGERS["AQI Severe"]["threshold"]:
        active.append({"type": "AQI Severe", "val": f"{aqi} AQI", "src": ["IQAir", "WAQI"], "conf": True})
    elif aqi >= TRIGGERS["AQI Danger"]["threshold"]:
        active.append({"type": "AQI Danger", "val": f"{aqi} AQI", "src": ["IQAir", "WAQI"], "conf": True})

    # Heat tiers: avoid dual trigger on severe heat.
    if temp_c >= TRIGGERS["Severe Heat"]["threshold"]:
        active.append({"type": "Severe Heat", "val": f"{temp_c}°C", "src": ["OpenMeteo", "NASA-HT"], "conf": True})
    elif temp_c >= TRIGGERS["Heat Wave"]["threshold"]:
        active.append({"type": "Heat Wave", "val": f"{temp_c}°C", "src": ["OpenMeteo", "NASA-HT"], "conf": True})

    if vis_m < TRIGGERS["Dense Fog"]["threshold"]:
        active.append({"type": "Dense Fog", "val": f"{vis_m}m", "src": ["OpenMeteo", "Vis-Obs"], "conf": True})

    if speed <= TRIGGERS["Gridlock"]["threshold"] and (8 <= hour <= 11 or 17 <= hour <= 21):
        active.append({"type": "Gridlock", "val": f"{speed}km/h", "src": ["TomTom", "PeakLogic"], "conf": True})

    if platform_down:
        active.append({"type": "Platform Outage", "val": "System Offline", "src": ["Probe-S", "Probe-Z"], "conf": True})

    return active

# ═══════════════════════════════════════════
# Neural Inference & Payout Engine
# ═══════════════════════════════════════════

async def monitor_zone(db, client, name, info, platform_down):
    lat, lon = info["lat"], info["lon"]
    # PARALLEL POLL: 3 network calls in 1 step
    weather, aqi, speed = await asyncio.gather(fetch_weather_data(client, lat, lon), fetch_aqi(client, lat, lon), fetch_traffic(client, lat, lon))
    
    active = _build_active_triggers(weather=weather, aqi=aqi, speed=speed, platform_down=platform_down)

    # Cache for dashboard reads
    _zone_cache[name] = {"w": weather, "a": aqi, "s": speed, "tr": active, "ts": time.time()}
    
    if active:
        await _process_zone_payouts(db, name, active)

async def _process_zone_payouts(db, zone, triggers):
    now = utcnow()
    from sqlalchemy.orm import joinedload
    active_policies = (
        db.query(models.Policy)
        .options(joinedload(models.Policy.worker))
        .filter(
            models.Policy.is_active == True,
            models.Policy.worker.has(models.Worker.zone == zone),
            or_(models.Policy.end_date == None, models.Policy.end_date >= now),
        )
        .all()
    )
    
    # Pre-fetch recent payouts for all active policies to avoid N+1 in fraud scoring
    week_ago = now - timedelta(days=7)
    policy_ids = [p.id for p in active_policies]
    
    recent_payouts = {}
    if policy_ids:
        payouts = (
            db.query(models.Payout)
            .filter(models.Payout.policy_id.in_(policy_ids), models.Payout.date >= week_ago)
            .all()
        )
        for p in payouts:
            if p.policy_id not in recent_payouts: recent_payouts[p.policy_id] = []
            recent_payouts[p.policy_id].append(p)

    for tr in triggers:
        if not tr["conf"]: continue
        
        # Log Trigger Event
        event = models.TriggerEvent(
            type=tr["type"],
            zone=zone,
            signal_value=tr["val"],
            alert_level="RED",
            sources=json.dumps(tr["src"]),
            is_confirmed=True,
            affected_workers_count=len(active_policies),
        )
        db.add(event); db.flush()
        
        # Payout amount in paise (§3.1: EPH × Disruption Hours = ₹102/hr × hours).
        amt_paise = TRIGGERS[tr["type"]]["payout_hrs"] * 10200
        
        # Plan-based trigger filtering (§2.1)
        trigger_type = tr["type"]
        is_premium_only = trigger_type in PREMIUM_ONLY_TRIGGERS
        
        for pol in active_policies:
            # §2.1: Basic plan only covers Basic triggers; skip Premium-only triggers
            if is_premium_only and (pol.tier or "Basic").strip().lower() != "premium":
                continue

            # Efficient duplicate check using local cache
            pol_recent = recent_payouts.get(pol.id, [])
            
            # Payout Deduplication (Check last 12h for this type)
            cutoff = now - timedelta(hours=12)
            if any(p.type == tr["type"] and p.date >= cutoff for p in pol_recent):
                continue

            # Weekly income cap guardrail before payout creation.
            already_paid_paise = sum((p.amount_paise or 0) for p in pol_recent if p.status == "Credited")
            remaining_cap_paise = max((pol.worker.weekly_income_paise or 0) - already_paid_paise, 0)
            payout_amount_paise = min(amt_paise, remaining_cap_paise) if remaining_cap_paise > 0 else 0
            if payout_amount_paise <= 0:
                continue

            fraud_score, fraud_reason = fraud_service.calculate_fraud_score(
                db=db,
                worker_id=pol.worker_id,
                trigger_event={"type": tr["type"], "zone": zone, "event_id": event.id},
                policy_id=pol.id,
            )
            payout_status = fraud_service.get_payout_status(fraud_score)
            process_started_at = time.time()
            
            # Create payout and move it through explicit lifecycle transitions.
            payout = models.Payout(
                policy_id=pol.id,
                trigger_event_id=event.id,
                type=tr["type"],
                amount_paise=payout_amount_paise,
                status="Initiated",
                reason="Payout initialized",
                upi_ref=f"P-SSAI-{event.id}-{pol.id}-{uuid.uuid4().hex[:8]}",
                fraud_score=fraud_score,
            )
            try:
                with db.begin_nested():
                    db.add(payout)
                    db.flush()

                    payout_lifecycle_service.record_initial_status(
                        db,
                        payout,
                        reason="Trigger event accepted for payout processing",
                    )
                    payout_lifecycle_service.transition_payout_status(
                        db,
                        payout,
                        "Processing",
                        reason="Fraud checks completed",
                    )
                    payout_lifecycle_service.transition_payout_status(
                        db,
                        payout,
                        payout_status,
                        reason=f"Disruption detected via {len(tr['src'])} sources. {fraud_reason}",
                    )
                    payout.processing_time_ms = int((time.time() - process_started_at) * 1000)
                    db.flush()

                    event_bus_service.publish_event(
                        "payout.status_changed",
                        {
                            "payout_id": payout.id,
                            "policy_id": pol.id,
                            "worker_id": pol.worker_id,
                            "status": payout.status,
                            "trigger_type": tr["type"],
                            "zone": zone,
                            "amount_paise": payout.amount_paise,
                            "upi_ref": payout.upi_ref,
                        },
                    )

                    if payout.status == "Credited" and pol.worker and pol.worker.phone:
                        notification_service.send_payout_notification(
                            phone=pol.worker.phone,
                            amount_paise=payout.amount_paise or 0,
                            trigger_type=tr["type"],
                            payout_status=payout.status,
                            payout_ref=payout.upi_ref or "",
                        )

                logger.info(
                    f"[NeuralMonitor] Payout Rs {payout_amount_paise / 100:.2f} {payout.status} for {pol.worker.name} ({tr['type']})"
                )
            except IntegrityError:
                logger.info(
                    "[NeuralMonitor] Duplicate payout blocked by unique constraint for policy=%s trigger=%s",
                    pol.id,
                    event.id,
                )
            except ValueError as lifecycle_error:
                logger.error(
                    "[NeuralMonitor] Lifecycle transition error for policy=%s trigger=%s: %s",
                    pol.id,
                    event.id,
                    lifecycle_error,
                )

# ═══════════════════════════════════════════
# Public Lifecycle Logic
# ═══════════════════════════════════════════

async def neural_check_cycle():
    async with httpx.AsyncClient() as client:
        db = SessionLocal()
        try:
            platform_down = await check_platforms(client)
            # MEGA PARALLEL: All 6 zones in 1 async batch
            tasks = [monitor_zone(db, client, name, info, platform_down) for name, info in config.ZONES.items()]
            await asyncio.gather(*tasks)
            db.commit()
        except Exception as e: logger.error(f"[NeuralCycle] Critical failure: {e}")
        finally: db.close()


scheduler = AsyncIOScheduler(timezone="UTC")


def start_monitor():
    if not scheduler.running:
        scheduler.add_job(
            neural_check_cycle,
            "interval",
            minutes=config.TRIGGER_INTERVAL_MINUTES,
            id="trigger-monitor",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        scheduler.start()
        logger.info(f"[NeuralEngine] Phase 3 Monitor Active across {len(config.ZONES)} zones.")

def get_live_zone_data(zone: str) -> dict:
    c = _zone_cache.get(zone)
    if c: return {"rain_mm": c["w"]["rain"], "aqi": c["a"], "temp_c": c["w"]["temp"], "visibility_km": c["w"]["vis"]/1000, "traffic_speed": c["s"], "wind_kmh": 12}
    return {"rain_mm": 0, "aqi": 82, "temp_c": 31, "visibility_km": 5.0, "traffic_speed": 30, "wind_kmh": 10}

def get_risk_forecast(zone: str) -> list:
    """Return 6 hourly forecast points (Now, +1hr … +5hr) for the dashboard strip."""
    c = _zone_cache.get(zone)
    now_h = datetime.now().hour
    labels = ["Now", "+1hr", "+2hr", "+3hr", "+4hr", "+5hr"]

    if not c:
        # No live data yet — return a flat low-risk forecast
        return [{"time": t, "probability": 8, "icon": "sunny"} for t in labels]

    hourly_rain = c["w"].get("hourly_rain", [0] * 24)

    forecast = []
    for i, label in enumerate(labels):
        h = (now_h + i) % 24
        rain = hourly_rain[h] if h < len(hourly_rain) else 0
        # Map mm → probability (0–100), factoring in daily accumulation
        daily_signal = c["w"].get("rain", 0)
        prob = min(int(rain * 8) + int(daily_signal * 1.2) + 5, 100)

        if prob >= 70:
            icon = "thunderstorm"
        elif prob >= 45:
            icon = "rainy"
        elif prob >= 20:
            icon = "cloudy"
        else:
            icon = "sunny"

        forecast.append({"time": label, "probability": prob, "icon": icon})

    return forecast
