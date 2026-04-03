# SecureSync AI — JWT Auth Service
from datetime import timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import config
from utils.time_utils import utcnow

security = HTTPBearer(auto_error=False)


def create_token(phone: str, worker_id: int = None) -> str:
    """Create a JWT token with phone and optional worker_id."""
    payload = {
        "sub": phone,
        "worker_id": worker_id,
        "iat": utcnow(),
        "exp": utcnow() + timedelta(hours=config.JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Optional auth dependency. Returns decoded token payload or None."""
    if credentials is None:
        return None
    payload = decode_token(credentials.credentials)
    return payload


async def require_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Strict auth dependency for protected routes."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization token",
        )

    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return payload
