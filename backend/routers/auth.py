# SecureSync AI — Auth Router (Phase 3)
from datetime import timedelta
import random

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from database import get_db
import models
from pydantic import BaseModel
from services.auth_service import create_token, require_current_user
from services import redis_service
from services import otp_delivery_service
from utils.time_utils import utcnow
import config
import os

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])





class OTPRequest(BaseModel):
    phone: str = None
    phone_number: str = None  # Accept both formats from frontend


class OTPVerifyRequest(BaseModel):
    phone: str = None
    phone_number: str = None
    otp: str = None
    code: str = None  # Accept both formats


def _normalize_phone(phone_raw: str) -> str:
    phone = (phone_raw or "").replace("+91", "").replace(" ", "").strip()
    if not (phone.isdigit() and len(phone) == 10):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number format",
        )
    return phone


@router.post("/send-otp")
def send_otp(request: OTPRequest, http_request: Request, db: Session = Depends(get_db)):
    """Send OTP to phone number. Phase 2: mocks Twilio — stores code in DB."""
    phone = _normalize_phone(request.phone or request.phone_number or "")

    if config.ENABLE_REDIS_RATE_LIMIT:
        client_ip = (http_request.client.host if http_request.client else "unknown").replace(":", "_")
        allowed, retry_after, _count = redis_service.check_rate_limit(
            key=f"otp_send:{phone}:{client_ip}",
            limit=config.OTP_SEND_LIMIT_PER_WINDOW,
            window_seconds=config.OTP_SEND_WINDOW_MINUTES * 60,
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"OTP request limit exceeded. Retry after {retry_after}s.",
            )

    send_window_start = utcnow() - timedelta(minutes=config.OTP_SEND_WINDOW_MINUTES)
    recent_sends = (
        db.query(models.OTPSession)
        .filter(
            models.OTPSession.phone == phone,
            models.OTPSession.created_at >= send_window_start,
        )
        .count()
    )
    if recent_sends >= config.OTP_SEND_LIMIT_PER_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="OTP request limit exceeded. Please try again later.",
        )

    # Generate 6-digit code.
    code = str(random.randint(100000, 999999))

    # Store in DB
    otp_session = models.OTPSession(phone=phone, code=code)
    db.add(otp_session)
    db.commit()

    print(f"[Auth] OTP for {phone}: {code}")

    response = {
        "status": "success",
        "message": f"OTP sent to +91{phone}",
    }
    delivery_result = otp_delivery_service.send_otp_sms(phone=phone, code=code)
    response["delivery_provider"] = delivery_result.get("provider", "mock")
    if delivery_result.get("sid"):
        response["delivery_ref"] = delivery_result.get("sid")
    if config.ENABLE_DEBUG_OTP:
        response["debug_code"] = code
    return response


@router.post("/verify-otp")
def verify_otp(request: OTPVerifyRequest, http_request: Request, db: Session = Depends(get_db)):
    """Verify OTP and return JWT token."""
    phone = _normalize_phone(request.phone or request.phone_number or "")
    code = (request.otp or request.code or "").strip()
    mock_mode_enabled = config.ENABLE_PHASE2_MOCK_OTP
    is_mock_attempt = mock_mode_enabled

    if config.ENABLE_REDIS_RATE_LIMIT and not is_mock_attempt:
        client_ip = (http_request.client.host if http_request.client else "unknown").replace(":", "_")
        allowed, retry_after, _count = redis_service.check_rate_limit(
            key=f"otp_verify:{phone}:{client_ip}",
            limit=config.OTP_VERIFY_LIMIT_PER_WINDOW,
            window_seconds=config.OTP_VERIFY_WINDOW_MINUTES * 60,
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many OTP verification attempts. Retry after {retry_after}s.",
            )

    if not (code.isdigit() and len(code) == 6):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid code format",
        )

    if is_mock_attempt:
        # Mock mode: accept any 6-digit numeric OTP for demo/dev login flow.

        worker = db.query(models.Worker).filter(models.Worker.phone == phone).first()
        if not worker:
            worker = models.Worker(
                phone=phone,
                name="Partner",
                platform="unknown",
                zone="Zone 4",
                city="Unknown",
                score=82,
                hourly_rate=102,
                weekly_income=6120,
                is_verified=False,
            )
            db.add(worker)
            db.commit()
            db.refresh(worker)

        token = create_token(phone=phone, worker_id=worker.id)
        return {
            "status": "success",
            "token": token,
            "worker_id": worker.id,
            "is_new_user": worker.partner_id is None,
            "mock_auth": True,
        }

    verify_window_start = utcnow() - timedelta(minutes=config.OTP_VERIFY_WINDOW_MINUTES)
    recent_attempts = (
        db.query(models.OTPVerifyAttempt)
        .filter(
            models.OTPVerifyAttempt.phone == phone,
            models.OTPVerifyAttempt.created_at >= verify_window_start,
        )
        .count()
    )
    if recent_attempts >= config.OTP_VERIFY_LIMIT_PER_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP verification attempts",
        )

    otp_cutoff = utcnow() - timedelta(minutes=config.OTP_TTL_MINUTES)
    otp_session = (
        db.query(models.OTPSession)
        .filter(
            models.OTPSession.phone == phone,
            models.OTPSession.code == code,
            models.OTPSession.is_used == False,
            models.OTPSession.created_at >= otp_cutoff,
        )
        .order_by(models.OTPSession.created_at.desc())
        .first()
    )

    if not otp_session:
        db.add(models.OTPVerifyAttempt(phone=phone, success=False))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    otp_session.is_used = True
    db.add(models.OTPVerifyAttempt(phone=phone, success=True))
    db.commit()

    # Ensure each authenticated phone has a worker record.
    worker = db.query(models.Worker).filter(models.Worker.phone == phone).first()
    if not worker:
        worker = models.Worker(
            phone=phone,
            name="Partner",
            platform="unknown",
            zone="Zone 4",
            city="Unknown",
            score=82,
            hourly_rate=102,
            weekly_income=6120,
            is_verified=False,
        )
        db.add(worker)
        db.commit()
        db.refresh(worker)

    worker_id = worker.id

    worker_id = worker.id

    # Generate JWT
    token = create_token(phone=phone, worker_id=worker_id)

    return {
        "status": "success",
        "token": token,
        "worker_id": worker_id,
        "is_new_user": worker.partner_id is None,
    }






@router.get("/me")
def me(current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    worker_id = current_user.get("worker_id")
    phone = current_user.get("sub")
    worker = None
    if worker_id:
        worker = db.query(models.Worker).filter(models.Worker.id == worker_id).first()
    if worker is None and phone:
        worker = db.query(models.Worker).filter(models.Worker.phone == phone).first()

    if worker is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated worker not found in system (database was likely reset)."
        )

    return {
        "phone": phone,
        "worker_id": worker.id,
        "partner_id": worker.partner_id,
        "is_verified": bool(worker.is_verified),
        "name": worker.name
    }
