import asyncio

from services import premium_service
from services.trigger_service import _build_active_triggers


async def _low_risk_signals(zone: str, lat: float, lon: float):
    return (
        {
            "current_temp": 29,
            "rain_forecast": [0, 0, 0, 0, 0, 0, 0],
            "max_temps": [30, 31, 30, 29, 30, 31, 30],
        },
        50,
    )


async def _high_risk_signals(zone: str, lat: float, lon: float):
    return (
        {
            "current_temp": 45,
            "rain_forecast": [120, 140, 80, 90, 110, 70, 60],
            "max_temps": [45, 46, 44, 45, 46, 45, 44],
        },
        480,
    )


def _types_for(
    rain: float,
    aqi: int,
    temp: float,
    vis: float = 10000,
    speed: float = 20,
    hour: int = 10,
    platform_down: bool = False,
):
    active = _build_active_triggers(
        weather={"rain": rain, "temp": temp, "vis": vis},
        aqi=aqi,
        speed=speed,
        platform_down=platform_down,
        current_hour=hour,
    )
    return {item["type"] for item in active}


def test_premium_multipliers_and_basic_floor_clamp(monkeypatch):
    monkeypatch.setattr(premium_service, "_get_cached_signals", _low_risk_signals)
    monkeypatch.setattr(premium_service.config, "ENABLE_POSTGIS_ZONE_RISK", False)

    result = asyncio.run(
        premium_service.calculate_premium(
            zone="Zone 6",
            lat=12.9716,
            lon=77.5946,
            tier="Basic",
            tenure_months=60,
            claim_history_count=0,
            score=95,
            db=None,
        )
    )

    assert result["final_premium"] == premium_service.config.MIN_PREMIUM_BASIC
    assert 0.70 <= result["zone_multiplier"] <= 2.80
    assert 0.90 <= result["weather_multiplier"] <= 1.60
    assert 0.85 <= result["history_multiplier"] <= 1.25


def test_premium_basic_and_premium_upper_clamps(monkeypatch):
    monkeypatch.setattr(premium_service, "_get_cached_signals", _high_risk_signals)
    monkeypatch.setattr(premium_service.config, "ENABLE_POSTGIS_ZONE_RISK", False)

    basic = asyncio.run(
        premium_service.calculate_premium(
            zone="Zone 3",
            lat=28.6139,
            lon=77.2090,
            tier="Basic",
            tenure_months=0,
            claim_history_count=10,
            score=60,
            db=None,
        )
    )
    premium = asyncio.run(
        premium_service.calculate_premium(
            zone="Zone 3",
            lat=28.6139,
            lon=77.2090,
            tier="Premium",
            tenure_months=0,
            claim_history_count=10,
            score=60,
            db=None,
        )
    )

    assert basic["final_premium"] == premium_service.config.MAX_PREMIUM_BASIC
    assert premium["final_premium"] == premium_service.config.MAX_PREMIUM_PREMIUM
    assert premium["tier_factor"] == 2.0


def test_rain_trigger_threshold_boundaries():
    assert "Heavy Rain" not in _types_for(rain=64.4, aqi=80, temp=30)
    assert "Heavy Rain" in _types_for(rain=64.5, aqi=80, temp=30)
    assert "Very Heavy Rain" not in _types_for(rain=124.4, aqi=80, temp=30)
    assert "Very Heavy Rain" in _types_for(rain=124.5, aqi=80, temp=30)
    assert "Red Alert" in _types_for(rain=244.4, aqi=80, temp=30)


def test_aqi_trigger_threshold_boundaries():
    assert "AQI Danger" not in _types_for(rain=0, aqi=300, temp=30)
    assert "AQI Danger" in _types_for(rain=0, aqi=301, temp=30)
    assert "AQI Severe" not in _types_for(rain=0, aqi=400, temp=30)
    assert "AQI Severe" in _types_for(rain=0, aqi=401, temp=30)


def test_heat_trigger_threshold_boundaries():
    assert "Heat Wave" not in _types_for(rain=0, aqi=80, temp=39.9)
    assert "Heat Wave" in _types_for(rain=0, aqi=80, temp=40.0)
    assert "Severe Heat" not in _types_for(rain=0, aqi=80, temp=44.9)
    assert "Severe Heat" in _types_for(rain=0, aqi=80, temp=45.0)
