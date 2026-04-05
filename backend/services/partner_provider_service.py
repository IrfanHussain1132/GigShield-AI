# SecureSync AI — Partner Provider Adapter
# Keeps hackathon mock mode deterministic while preserving a clean seam for real providers.

import config
from seed_data import lookup_partner


def _provider_mode() -> str:
    return (config.PARTNER_PROVIDER_MODE or "mock").strip().lower()


def resolve_partner(partner_id: str, platform: str = "swiggy") -> dict | None:
    mode = _provider_mode()

    if mode == "mock":
        return lookup_partner(partner_id, strict_mode=config.STRICT_MOCK_PARTNER_IDS)

    # Future integration seam: swiggy/zomato adapters can be wired here.
    raise ValueError(f"Unsupported PARTNER_PROVIDER_MODE: {mode}")


def provider_metadata() -> dict:
    mode = _provider_mode()
    if mode == "mock":
        return {
            "provider_mode": mode,
            "strict_mock_partner_ids": bool(config.STRICT_MOCK_PARTNER_IDS),
        }
    return {
        "provider_mode": mode,
    }
