# SecureSync AI — FastAPI Application (Phase 2 Optimized)
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from routers import auth, workers, dashboard, policies, payments, integrations
import models
from database import engine, SessionLocal
import config
from services import trigger_service
import logging
from utils.time_utils import utcnow

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _normalize_legacy_money_values(db):
    """Upgrade legacy rupee-stored values to paise in-place for existing dev DBs."""
    worker_updates = 0
    for worker in db.query(models.Worker).all():
        changed = False
        if worker.hourly_rate_paise is not None and worker.hourly_rate_paise <= 1000:
            worker.hourly_rate_paise = int(round(float(worker.hourly_rate_paise) * 100))
            changed = True
        if worker.weekly_income_paise is not None and worker.weekly_income_paise <= 50000:
            worker.weekly_income_paise = int(round(float(worker.weekly_income_paise) * 100))
            changed = True
        if changed:
            worker_updates += 1

    policy_updates = 0
    for policy in db.query(models.Policy).all():
        # max payout is the strongest signal of legacy rupee-scale policy data.
        if policy.max_payout_per_event_paise is not None and policy.max_payout_per_event_paise <= 5000:
            policy.max_payout_per_event_paise = int(round(float(policy.max_payout_per_event_paise) * 100))
            if policy.premium_amount_paise is not None:
                policy.premium_amount_paise = int(round(float(policy.premium_amount_paise) * 100))
            policy_updates += 1

    payout_updates = 0
    status_updates = 0
    status_aliases = {
        "pending": "Processing",
        "rejected": "Failed",
        "processing": "Processing",
        "initiated": "Initiated",
        "credited": "Credited",
        "held": "Held",
        "failed": "Failed",
    }
    for payout in db.query(models.Payout).all():
        changed = False
        if payout.amount_paise is not None and payout.amount_paise <= 5000:
            payout.amount_paise = int(round(float(payout.amount_paise) * 100))
            changed = True

        status_key = (payout.status or "initiated").strip().lower()
        normalized_status = status_aliases.get(status_key)
        if normalized_status and payout.status != normalized_status:
            payout.status = normalized_status
            status_updates += 1
            changed = True

        if payout.status_updated_at is None:
            payout.status_updated_at = payout.date or utcnow()
            changed = True

        if changed:
            payout_updates += 1

    if worker_updates or policy_updates or payout_updates:
        logger.info(
            "[Startup] Legacy normalization applied: workers=%s policies=%s payouts=%s status_updates=%s",
            worker_updates,
            policy_updates,
            payout_updates,
            status_updates,
        )
        db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Database init
    if config.AUTO_CREATE_SCHEMA:
        models.Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            worker_count = db.query(models.Worker).count()
            if worker_count == 0:
                logger.info("[Startup] Seeding Rajan Kumar (SW-982341)")
                from seed_data import MOCK_PARTNERS
                demo = MOCK_PARTNERS.get("SW-982341", {})
                seed_worker = models.Worker(
                    partner_id="SW-982341", name=demo.get("name", "Rajan Kumar"),
                    platform=demo.get("platform", "swiggy"), zone=demo.get("zone", "Zone 4"), city=demo.get("city", "South Chennai"),
                    latitude=demo.get("lat", 13.0125), longitude=demo.get("lon", 80.2241), score=demo.get("score", 92),
                    partner_since=demo.get("tenure", "March 2023"), tenure_months=demo.get("tenure_months", 36),
                    hourly_rate=demo.get("hourly_rate", 102), weekly_income=demo.get("weekly_income", 6120), is_verified=True,
                )
                db.add(seed_worker); db.commit()

            _normalize_legacy_money_values(db)
        finally:
            db.close()
    else:
        logger.info("[Startup] AUTO_CREATE_SCHEMA disabled. Expecting Alembic-managed schema.")
    
    # Startup: Monitor
    trigger_service.start_monitor()
    yield
    
    # Shutdown: Monitor stop
    if hasattr(trigger_service, "scheduler") and trigger_service.scheduler.running:
        trigger_service.scheduler.shutdown(wait=False)
        logger.info("[Shutdown] Trigger monitor stopped")

app = FastAPI(title="SecureSync AI API", lifespan=lifespan)

# --- Middlewares ---
# 1. CORS for Vite integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# 2. Gzip compression (saves ~75% data for payload-heavy history/summary)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# --- Global Exception Handler (Crash Protection) ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Server Error at {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "Neural engine processing error. Try again shortly.", "path": request.url.path}
    )

# --- Routers ---
app.include_router(auth.router)
app.include_router(workers.router)
app.include_router(dashboard.router)
app.include_router(policies.router)
app.include_router(payments.router)
app.include_router(integrations.router)

@app.get("/")
async def root():
    return {"status": "ok", "message": "SecureSync AI Neural API v2.0", "triggers": 8, "zones": len(config.ZONES)}

@app.get("/api/v1/health")
async def health():
    """Readiness probe: checks DB connectivity, scheduler state, and JWT config."""
    checks = {}

    # DB connectivity probe
    try:
        db = SessionLocal()
        db.execute(__import__('sqlalchemy').text('SELECT 1'))
        db.close()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)[:80]}"

    # Neural monitor health
    checks["trigger_monitor"] = "running" if (
        hasattr(trigger_service, "scheduler") and trigger_service.scheduler.running
    ) else "stopped"

    # JWT sanity (secret is not the dev default in prod)
    checks["jwt_config"] = "hardened" if config.JWT_SECRET != "dev-only-change-me" else "warn:using_dev_secret"

    # Redis
    checks["redis"] = "enabled" if config.ENABLE_REDIS_CACHE or config.ENABLE_REDIS_RATE_LIMIT else "disabled"

    overall = "healthy" if checks["database"] == "ok" else "degraded"
    return {
        "status": overall,
        "version": "4.2.0-alpha",
        "engine": "FastAPI/Uvicorn",
        "zones": len(config.ZONES),
        "checks": checks,
    }
