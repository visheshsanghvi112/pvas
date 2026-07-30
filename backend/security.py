"""
backend/security.py
────────────────────────────────────────────────────────────────────────────
Enterprise security, password hashing, token validation, and RBAC middleware.
"""

import hashlib
import hmac
import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.models import SysUser, SysAuditLog

SECRET_KEY = os.getenv("PVASF_SECRET_KEY", "pvasf_surveillance_enterprise_secure_secret_2026")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    """Hashes password securely with SHA-256 + secret salt."""
    salt = SECRET_KEY.encode("utf-8")
    return hmac.new(salt, password.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against stored hash."""
    return hmac.compare_digest(hash_password(plain_password), hashed_password)


def create_access_token(data: dict) -> str:
    """Generates a secure signed session token."""
    payload = data.copy()
    payload["exp"] = (datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)).timestamp()
    raw_payload = json.dumps(payload, sort_keys=True)
    signature = hmac.new(SECRET_KEY.encode("utf-8"), raw_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    # Simple token: payload_hex.signature
    payload_hex = raw_payload.encode("utf-8").hex()
    return f"{payload_hex}.{signature}"


def decode_access_token(token: str) -> Optional[dict]:
    """Validates and decodes signed session token."""
    try:
        if "." not in token:
            return None
        payload_hex, signature = token.rsplit(".", 1)
        raw_payload = bytes.fromhex(payload_hex).decode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), raw_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(raw_payload)
        if payload.get("exp", 0) < datetime.utcnow().timestamp():
            return None
        return payload
    except Exception:
        return None


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> SysUser:
    """Dependency to extract and validate the active authenticated user."""
    auth_token = token
    if not auth_token and authorization and authorization.startswith("Bearer "):
        auth_token = authorization.split(" ", 1)[1]

    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(auth_token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )

    user = db.query(SysUser).filter(SysUser.username == payload["sub"], SysUser.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account deactivated or not found.",
        )
    return user


def require_role(allowed_roles: list[str]):
    """Role-Based Access Control (RBAC) dependency factory."""
    def role_checker(current_user: SysUser = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}. Your role is '{current_user.role}'.",
            )
        return current_user
    return role_checker


require_admin = require_role(["Admin"])
require_analyst = require_role(["Admin", "Analyst"])
