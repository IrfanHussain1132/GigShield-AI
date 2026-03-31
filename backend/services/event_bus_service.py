import json
import logging
import importlib

import config
from utils.time_utils import utcnow

logger = logging.getLogger(__name__)

_producer = None
_init_attempted = False


def _get_producer():
    global _producer, _init_attempted

    if not config.ENABLE_KAFKA_EVENTS:
        return None

    if _producer is not None:
        return _producer

    if _init_attempted:
        return None

    _init_attempted = True

    try:
        kafka_module = importlib.import_module("kafka")
        KafkaProducer = getattr(kafka_module, "KafkaProducer")

        _producer = KafkaProducer(
            bootstrap_servers=config.KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda value: json.dumps(value).encode("utf-8"),
            retries=2,
            acks="all",
        )
        return _producer
    except Exception as exc:
        logger.warning("[Kafka] Producer init failed: %s", exc)
        _producer = None
        return None


def publish_event(event_name: str, payload: dict) -> bool:
    """Publish domain events to Kafka when enabled. Falls back to logs."""
    event = {
        "event": event_name,
        "timestamp": utcnow().isoformat() + "Z",
        "payload": payload,
    }

    producer = _get_producer()
    if producer is None:
        logger.info("[Kafka-Mock] %s %s", event_name, payload)
        return False

    topic = f"{config.KAFKA_TOPIC_PREFIX}.{event_name}".replace("..", ".")
    try:
        future = producer.send(topic, event)
        future.get(timeout=2)
        return True
    except Exception as exc:
        logger.warning("[Kafka] Publish failed for topic=%s event=%s error=%s", topic, event_name, exc)
        return False
