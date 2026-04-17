# SecureSync AI — Forecast Router (Phase 3)
# LSTM 72-hour predictive risk forecast for worker dashboard

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from services import trigger_service, ml_service
from services.auth_service import require_current_user
import config

router = APIRouter(
    prefix="/api/v1/forecast",
    tags=["forecast"],
    dependencies=[Depends(require_current_user)],
)


@router.get("/72hr/{zone_name}")
def get_72hr_forecast(zone_name: str):
    """
    72-hour LSTM predictive risk forecast.

    Returns hourly risk predictions for rain, temperature, AQI, and fog.
    Used by the worker dashboard to show upcoming disruption probabilities.
    """
    live_data = trigger_service.get_live_zone_data(zone_name)

    current_data = {
        "rain_mm": live_data.get("rain_mm", 0),
        "temp_c": live_data.get("temp_c", 30),
        "aqi": live_data.get("aqi", 80),
        "visibility_m": live_data.get("visibility_km", 5) * 1000,
    }

    summary = ml_service.get_forecast_summary(zone_name, current_data)
    return summary


@router.get("/alert/{zone_name}")
def get_forecast_alert(zone_name: str):
    """
    Quick forecast alert for the worker dashboard.
    Returns a simple message + risk level for the next 6 hours.
    """
    live_data = trigger_service.get_live_zone_data(zone_name)

    current_data = {
        "rain_mm": live_data.get("rain_mm", 0),
        "temp_c": live_data.get("temp_c", 30),
        "aqi": live_data.get("aqi", 80),
        "visibility_m": live_data.get("visibility_km", 5) * 1000,
    }

    summary = ml_service.get_forecast_summary(zone_name, current_data)

    risk_6h = summary["max_risk_6h"]
    if risk_6h >= 70:
        alert_level = "HIGH"
        icon = "warning"
        color = "#ef4444"
    elif risk_6h >= 45:
        alert_level = "MODERATE"
        icon = "cloud"
        color = "#f59e0b"
    elif risk_6h >= 20:
        alert_level = "LOW"
        icon = "partly_cloudy_day"
        color = "#3b82f6"
    else:
        alert_level = "CLEAR"
        icon = "check_circle"
        color = "#22c55e"

    return {
        "alert_level": alert_level,
        "risk_percentage": risk_6h,
        "message": summary["message"],
        "icon": icon,
        "color": color,
        "red_hours_72h": summary["red_hours"],
        "orange_hours_72h": summary["orange_hours"],
        "next_6h": summary["next_6h"],
    }


@router.get("/zones")
def all_zones_forecast():
    """
    Quick forecast overview for all zones.
    Used by the admin dashboard and zone selector.
    """
    zone_forecasts = []
    for zone_name, zone_info in config.ZONES.items():
        live_data = trigger_service.get_live_zone_data(zone_name)
        current_data = {
            "rain_mm": live_data.get("rain_mm", 0),
            "temp_c": live_data.get("temp_c", 30),
            "aqi": live_data.get("aqi", 80),
            "visibility_m": live_data.get("visibility_km", 5) * 1000,
        }

        summary = ml_service.get_forecast_summary(zone_name, current_data)

        zone_forecasts.append({
            "zone": zone_name,
            "city": zone_info["city"],
            "lat": zone_info["lat"],
            "lon": zone_info["lon"],
            "max_risk_6h": summary["max_risk_6h"],
            "max_risk_24h": summary["max_risk_24h"],
            "max_risk_72h": summary["max_risk_72h"],
            "red_hours": summary["red_hours"],
            "orange_hours": summary["orange_hours"],
            "message": summary["message"],
        })

    return zone_forecasts
