import asyncio

from services import premium_service


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar(self):
        return self._value


class _FakeDb:
    def __init__(self, value):
        self.value = value
        self.execute_calls = 0

    def execute(self, *args, **kwargs):
        self.execute_calls += 1
        return _ScalarResult(self.value)


class _BrokenDb:
    def execute(self, *args, **kwargs):
        raise RuntimeError("PostGIS function unavailable")


async def _fake_signals(zone: str, lat: float, lon: float):
    return (
        {
            "current_temp": 31,
            "rain_forecast": [10, 10, 8, 8, 4, 2, 0],
            "max_temps": [34, 35, 35, 34, 33, 32, 32],
        },
        120,
    )


def test_calculate_premium_uses_static_zone_risk_on_postgis_failure(monkeypatch):
    monkeypatch.setattr(premium_service, "_get_cached_signals", _fake_signals)
    monkeypatch.setattr(premium_service.config, "ENABLE_POSTGIS_ZONE_RISK", True)
    monkeypatch.setattr(premium_service.config, "POSTGIS_ZONE_RISK_BLEND", 0.35)
    monkeypatch.setattr(premium_service.config, "POSTGIS_HOTSPOT_RADIUS_METERS", 2200)

    result = asyncio.run(
        premium_service.calculate_premium(
            zone="Zone 4",
            lat=13.0125,
            lon=80.2241,
            tier="Standard",
            tenure_months=12,
            claim_history_count=0,
            score=85,
            db=_BrokenDb(),
        )
    )

    assert result["zone_risk_source"] == "static"
    assert result["geo_hotspot_risk"] is None


def test_calculate_premium_blends_postgis_zone_risk(monkeypatch):
    monkeypatch.setattr(premium_service, "_get_cached_signals", _fake_signals)
    monkeypatch.setattr(premium_service.config, "ENABLE_POSTGIS_ZONE_RISK", True)
    monkeypatch.setattr(premium_service.config, "POSTGIS_ZONE_RISK_BLEND", 0.35)
    monkeypatch.setattr(premium_service.config, "POSTGIS_HOTSPOT_RADIUS_METERS", 2200)

    fake_db = _FakeDb(0.9)

    result = asyncio.run(
        premium_service.calculate_premium(
            zone="Zone 4",
            lat=13.0125,
            lon=80.2241,
            tier="Standard",
            tenure_months=12,
            claim_history_count=0,
            score=85,
            db=fake_db,
        )
    )

    assert fake_db.execute_calls == 1
    assert result["zone_risk_source"] == "postgis_blended"
    assert result["geo_hotspot_risk"] == 0.9
    assert any("hotspot" in item["label"].lower() for item in result["adjustments"])
