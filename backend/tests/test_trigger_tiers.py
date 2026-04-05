from services.trigger_service import _build_active_triggers


def _types(active):
    return {item["type"] for item in active}


def test_rain_tiers_are_mutually_exclusive():
    heavy = _build_active_triggers(
        weather={"rain": 80, "temp": 30, "vis": 10000},
        aqi=120,
        speed=20,
        platform_down=False,
        current_hour=10,
    )
    very_heavy = _build_active_triggers(
        weather={"rain": 130, "temp": 30, "vis": 10000},
        aqi=120,
        speed=20,
        platform_down=False,
        current_hour=10,
    )
    red_alert = _build_active_triggers(
        weather={"rain": 260, "temp": 30, "vis": 10000},
        aqi=120,
        speed=20,
        platform_down=False,
        current_hour=10,
    )

    assert _types(heavy) == {"Heavy Rain"}
    assert _types(very_heavy) == {"Very Heavy Rain"}
    assert _types(red_alert) == {"Red Alert"}


def test_aqi_tiers_are_mutually_exclusive():
    danger = _build_active_triggers(
        weather={"rain": 0, "temp": 30, "vis": 10000},
        aqi=350,
        speed=20,
        platform_down=False,
        current_hour=10,
    )
    severe = _build_active_triggers(
        weather={"rain": 0, "temp": 30, "vis": 10000},
        aqi=420,
        speed=20,
        platform_down=False,
        current_hour=10,
    )

    assert "AQI Danger" in _types(danger)
    assert "AQI Severe" not in _types(danger)
    assert "AQI Severe" in _types(severe)
    assert "AQI Danger" not in _types(severe)


def test_heat_tiers_are_mutually_exclusive():
    heat_wave = _build_active_triggers(
        weather={"rain": 0, "temp": 42, "vis": 10000},
        aqi=120,
        speed=20,
        platform_down=False,
        current_hour=10,
    )
    severe_heat = _build_active_triggers(
        weather={"rain": 0, "temp": 46, "vis": 10000},
        aqi=120,
        speed=20,
        platform_down=False,
        current_hour=10,
    )

    assert "Heat Wave" in _types(heat_wave)
    assert "Severe Heat" not in _types(heat_wave)
    assert "Severe Heat" in _types(severe_heat)
    assert "Heat Wave" not in _types(severe_heat)


def test_gridlock_only_fires_in_peak_hours():
    peak = _build_active_triggers(
        weather={"rain": 0, "temp": 30, "vis": 10000},
        aqi=80,
        speed=6,
        platform_down=False,
        current_hour=9,
    )
    off_peak = _build_active_triggers(
        weather={"rain": 0, "temp": 30, "vis": 10000},
        aqi=80,
        speed=6,
        platform_down=False,
        current_hour=14,
    )

    assert "Gridlock" in _types(peak)
    assert "Gridlock" not in _types(off_peak)


def test_platform_outage_trigger_is_added():
    active = _build_active_triggers(
        weather={"rain": 0, "temp": 30, "vis": 10000},
        aqi=80,
        speed=20,
        platform_down=True,
        current_hour=10,
    )

    assert "Platform Outage" in _types(active)
