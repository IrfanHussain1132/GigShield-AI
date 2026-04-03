# SecureSync AI — Phase 3 Configuration
import os


def _csv_env(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]

# ── API Keys ──
OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY", "")
IQAIR_KEY = os.getenv("IQAIR_KEY", "")
TOMTOM_KEY = os.getenv("TOMTOM_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ── JWT Auth ──
ENV_PROD = os.getenv("ENV_PROD", "false").lower() == "true"
JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-change-me")

if ENV_PROD and JWT_SECRET == "dev-only-change-me":
    import logging
    logging.getLogger(__name__).warning("CRITICAL: JWT_SECRET is still default in production!")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "1"))

# ── Database ──
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./securesync.db")
AUTO_CREATE_SCHEMA = os.getenv("AUTO_CREATE_SCHEMA", "true").lower() == "true"

# ── CORS ──
CORS_ORIGINS = _csv_env(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
)

# ── OTP Controls ──
OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "5"))
OTP_SEND_WINDOW_MINUTES = int(os.getenv("OTP_SEND_WINDOW_MINUTES", "15"))
OTP_SEND_LIMIT_PER_WINDOW = int(os.getenv("OTP_SEND_LIMIT_PER_WINDOW", "5"))
OTP_VERIFY_WINDOW_MINUTES = int(os.getenv("OTP_VERIFY_WINDOW_MINUTES", "15"))
OTP_VERIFY_LIMIT_PER_WINDOW = int(os.getenv("OTP_VERIFY_LIMIT_PER_WINDOW", "10"))
ENABLE_DEBUG_OTP = os.getenv("ENABLE_DEBUG_OTP", "false").lower() == "true"
ENABLE_PHASE2_MOCK_OTP = os.getenv("ENABLE_PHASE2_MOCK_OTP", "true").lower() == "true"
PHASE2_MOCK_OTP_CODE = os.getenv("PHASE2_MOCK_OTP_CODE", "123456")
PREMIUM_SIGNAL_CACHE_TTL_MINUTES = int(os.getenv("PREMIUM_SIGNAL_CACHE_TTL_MINUTES", "30"))
ENABLE_POSTGIS_ZONE_RISK = os.getenv("ENABLE_POSTGIS_ZONE_RISK", "true").lower() == "true"
POSTGIS_ZONE_RISK_BLEND = float(os.getenv("POSTGIS_ZONE_RISK_BLEND", "0.35"))
POSTGIS_HOTSPOT_RADIUS_METERS = int(os.getenv("POSTGIS_HOTSPOT_RADIUS_METERS", "2200"))

# ── Provider Integrations ──
ENABLE_TWILIO_SMS = os.getenv("ENABLE_TWILIO_SMS", "false").lower() == "true"
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_SMS_FROM = os.getenv("TWILIO_SMS_FROM", "")

ENABLE_WHATSAPP_NOTIFICATIONS = os.getenv("ENABLE_WHATSAPP_NOTIFICATIONS", "false").lower() == "true"
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

ENABLE_RAZORPAY_WEBHOOK = os.getenv("ENABLE_RAZORPAY_WEBHOOK", "false").lower() == "true"
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

ENABLE_KAFKA_EVENTS = os.getenv("ENABLE_KAFKA_EVENTS", "false").lower() == "true"
KAFKA_BOOTSTRAP_SERVERS = _csv_env("KAFKA_BOOTSTRAP_SERVERS", "localhost:29092")
KAFKA_TOPIC_PREFIX = os.getenv("KAFKA_TOPIC_PREFIX", "securesync")

# ── Redis (Rate Limits + Cache) ──
ENABLE_REDIS_RATE_LIMIT = os.getenv("ENABLE_REDIS_RATE_LIMIT", "false").lower() == "true"
ENABLE_REDIS_CACHE = os.getenv("ENABLE_REDIS_CACHE", "false").lower() == "true"
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_CACHE_TTL_SECONDS = int(os.getenv("REDIS_CACHE_TTL_SECONDS", "30"))
REDIS_KEY_PREFIX = os.getenv("REDIS_KEY_PREFIX", "securesync")

# ── Zone Coordinates (lat, lon) ──
ZONES = {
    "Zone 4": {"lat": 13.0125, "lon": 80.2241, "city": "South Chennai"},
    "Zone 1": {"lat": 13.0827, "lon": 80.2707, "city": "Central Chennai"},
    "Zone 2": {"lat": 17.3850, "lon": 78.4867, "city": "Hyderabad"},
    "Zone 3": {"lat": 28.6139, "lon": 77.2090, "city": "Delhi"},
    "Zone 5": {"lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "Zone 6": {"lat": 12.9716, "lon": 77.5946, "city": "Bengaluru"},
}

# Default zone for backwards compatibility
CHENNAI_ZONE4 = ZONES["Zone 4"]

# ── Trigger Monitor ──
TRIGGER_INTERVAL_MINUTES = 1        # 1 min for demo responsiveness
DEMO_RANDOM_PULSE_ENABLED = True    # 5% random pulse when no real events
CACHE_TTL_SECONDS = 300             # 5 min cache for weather data

# ── Premium Formula Defaults (per Policy Reference §4) ──
BASE_RATE = 50          # ₹50/week fixed base (Policy §4.2)
HOURLY_RATE = 102       # ₹102/hr EPH — Zomato CEO disclosure, Jan 2026
MIN_PREMIUM_BASIC = 49  # Basic floor (Policy §2.1)
MAX_PREMIUM_BASIC = 75  # Basic ceiling
MIN_PREMIUM_PREMIUM = 105  # Premium floor
MAX_PREMIUM_PREMIUM = 260  # Premium ceiling
MIN_PREMIUM = 49        # Absolute floor
MAX_PAYOUT_BASIC_WEEKLY = 816     # ₹816 per week (Policy §2.1)
MAX_PAYOUT_PREMIUM_WEEKLY = 4080  # ₹4,080 per week (Policy §2.1)
MAX_SINGLE_PAYOUT = 816           # ₹816 max single event (8hr full day)
TARGET_LOSS_RATIO = 0.65          # 65% target (Policy §4.5)

# ── Fraud Thresholds (per Policy Reference §6) ──
FRAUD_AUTO_APPROVE = 0.30
FRAUD_SOFT_FLAG = 0.65
MAX_CLAIMS_PER_WEEK = 5
COORDINATED_SURGE_WINDOW_MINUTES = 8
COORDINATED_SURGE_THRESHOLD = 40
