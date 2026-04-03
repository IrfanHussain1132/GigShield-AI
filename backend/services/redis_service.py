import importlib
import json
import logging
import time

import config

logger = logging.getLogger(__name__)

_client = None
_init_attempted = False

_local_rate_counter = {}
_local_rate_expiry = {}
_local_cache = {}
_local_cache_expiry = {}


def _now() -> float:
    return time.time()


def _cleanup_local_state() -> None:
    now_ts = _now()

    expired_rl = [k for k, exp in _local_rate_expiry.items() if exp <= now_ts]
    for key in expired_rl:
        _local_rate_expiry.pop(key, None)
        _local_rate_counter.pop(key, None)

    expired_cache = [k for k, exp in _local_cache_expiry.items() if exp <= now_ts]
    for key in expired_cache:
        _local_cache_expiry.pop(key, None)
        _local_cache.pop(key, None)


def _prefixed(kind: str, key: str) -> str:
    return f"{config.REDIS_KEY_PREFIX}:{kind}:{key}"


def get_client():
    global _client, _init_attempted

    if _client is not None:
        return _client

    if _init_attempted:
        return None

    if not (config.ENABLE_REDIS_RATE_LIMIT or config.ENABLE_REDIS_CACHE):
        return None

    _init_attempted = True

    try:
        redis_module = importlib.import_module("redis")
        redis_cls = getattr(redis_module, "Redis")
        client = redis_cls.from_url(
            config.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
        client.ping()
        _client = client
        logger.info("[Redis] Connected to %s", config.REDIS_URL)
        return _client
    except Exception as exc:
        logger.warning("[Redis] Unavailable, using in-memory fallback: %s", exc)
        _client = None
        return None


def check_rate_limit(key: str, limit: int, window_seconds: int) -> tuple[bool, int, int]:
    namespaced_key = _prefixed("rl", key)
    limit = max(1, int(limit))
    window_seconds = max(1, int(window_seconds))

    client = get_client()
    if client is not None:
        try:
            pipe = client.pipeline()
            pipe.incr(namespaced_key, 1)
            pipe.ttl(namespaced_key)
            count, ttl = pipe.execute()
            if int(count) == 1 or int(ttl) < 0:
                client.expire(namespaced_key, window_seconds)
                ttl = window_seconds

            count_i = int(count)
            ttl_i = int(ttl) if int(ttl) > 0 else window_seconds
            allowed = count_i <= limit
            return allowed, (0 if allowed else ttl_i), count_i
        except Exception as exc:
            logger.warning("[Redis] Rate-limit operation failed, falling back to local memory: %s", exc)

    _cleanup_local_state()
    now_ts = _now()
    expiry_ts = _local_rate_expiry.get(namespaced_key, 0)

    if expiry_ts <= now_ts:
        _local_rate_counter[namespaced_key] = 0
        _local_rate_expiry[namespaced_key] = now_ts + window_seconds

    _local_rate_counter[namespaced_key] = _local_rate_counter.get(namespaced_key, 0) + 1
    count_i = _local_rate_counter[namespaced_key]
    retry_after = int(max(_local_rate_expiry[namespaced_key] - now_ts, 0))
    allowed = count_i <= limit
    return allowed, (0 if allowed else retry_after), count_i


def get_cached_json(key: str):
    namespaced_key = _prefixed("cache", key)
    client = get_client()

    if client is not None:
        try:
            raw = client.get(namespaced_key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as exc:
            logger.warning("[Redis] Cache read failed, falling back to local memory: %s", exc)

    _cleanup_local_state()
    return _local_cache.get(namespaced_key)


def set_cached_json(key: str, value, ttl_seconds: int) -> bool:
    namespaced_key = _prefixed("cache", key)
    ttl_seconds = max(1, int(ttl_seconds))
    client = get_client()

    if client is not None:
        try:
            payload = json.dumps(value)
            client.setex(namespaced_key, ttl_seconds, payload)
            return True
        except Exception as exc:
            logger.warning("[Redis] Cache write failed, falling back to local memory: %s", exc)

    _cleanup_local_state()
    _local_cache[namespaced_key] = value
    _local_cache_expiry[namespaced_key] = _now() + ttl_seconds
    return False
