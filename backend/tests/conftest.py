from datetime import timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from database import get_db
from routers import auth, dashboard, integrations, payments, policies, workers
from services.auth_service import create_token
from utils.time_utils import utcnow


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    models.Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        models.Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    app = FastAPI()
    app.include_router(auth.router)
    app.include_router(workers.router)
    app.include_router(policies.router)
    app.include_router(dashboard.router)
    app.include_router(payments.router)
    app.include_router(integrations.router)

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def make_worker(db_session):
    def _make_worker(
        phone: str,
        partner_id: str,
        name: str = "Worker",
        zone: str = "Zone 4",
        city: str = "South Chennai",
    ):
        worker = models.Worker(
            phone=phone,
            partner_id=partner_id,
            name=name,
            platform="swiggy",
            zone=zone,
            city=city,
            latitude=13.0125,
            longitude=80.2241,
            score=82,
            partner_since="March 2023",
            tenure_months=12,
            hourly_rate=102,
            weekly_income=6120,
            is_verified=True,
        )
        db_session.add(worker)
        db_session.commit()
        db_session.refresh(worker)
        return worker

    return _make_worker


@pytest.fixture()
def auth_headers():
    def _auth_headers(worker: models.Worker):
        token = create_token(phone=worker.phone, worker_id=worker.id)
        return {"Authorization": f"Bearer {token}"}

    return _auth_headers


@pytest.fixture()
def make_policy(db_session):
    def _make_policy(worker: models.Worker, premium_amount: float = 47.0, tier: str = "Standard"):
        now = utcnow()
        policy = models.Policy(
            policy_ref=f"POL-{worker.id}-{int(now.timestamp())}",
            worker_id=worker.id,
            premium_amount=premium_amount,
            tier=tier,
            coverage_type=tier,
            max_payout_per_event=800 if tier == "Standard" else 1200,
            start_date=now,
            end_date=now + timedelta(days=7),
            is_active=True,
            status="active",
        )
        db_session.add(policy)
        db_session.commit()
        db_session.refresh(policy)
        return policy

    return _make_policy
