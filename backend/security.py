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


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """
    Hashes password using PBKDF2-HMAC-SHA256 with 100,000 iterations and per-password salting.
    Format stored: pbkdf2_sha256$iterations$salt_hex$hash_hex
    """
    iterations = 100_000
    if not salt:
        salt_bytes = os.urandom(16)
    else:
        salt_bytes = bytes.fromhex(salt)
    
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, iterations)
    return f"pbkdf2_sha256${iterations}${salt_bytes.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against stored hash with PBKDF2 or legacy format fallback."""
    try:
        if hashed_password.startswith("pbkdf2_sha256$"):
            parts = hashed_password.split("$")
            if len(parts) != 4:
                return False
            _, iterations_str, salt_hex, expected_hash_hex = parts
            iterations = int(iterations_str)
            salt_bytes = bytes.fromhex(salt_hex)
            key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt_bytes, iterations)
            return hmac.compare_digest(key.hex(), expected_hash_hex)
        else:
            # Fallback verification for legacy SHA256-HMAC hashes during migration
            salt = SECRET_KEY.encode("utf-8")
            legacy_hash = hmac.new(salt, plain_password.encode("utf-8"), hashlib.sha256).hexdigest()
            return hmac.compare_digest(legacy_hash, hashed_password)
    except Exception:
        return False


def create_access_token(data: dict) -> str:
    """Generates a secure signed session token with HMAC-SHA256 signature and expiration."""
    payload = data.copy()
    now = datetime.utcnow()
    payload["iat"] = now.timestamp()
    payload["exp"] = (now + timedelta(hours=TOKEN_EXPIRE_HOURS)).timestamp()
    raw_payload = json.dumps(payload, sort_keys=True)
    signature = hmac.new(SECRET_KEY.encode("utf-8"), raw_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    payload_hex = raw_payload.encode("utf-8").hex()
    return f"{payload_hex}.{signature}"


def decode_access_token(token: str) -> Optional[dict]:
    """Validates signature and expiry of token."""
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
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}. Your current role is '{current_user.role}'.",
            )
        return current_user
    return role_checker


# Role Hierarchy:
# Admin   -> Full superuser (Weights, EOD upload, User Management, Case Deletion, Audit Logs)
# Analyst -> Surveillance Investigator (Read all, Create/Update Cases, Pin Evidence)
# Viewer  -> Read-Only Observer (Read all scrips, charts, trade logs, clients, cases)
require_admin = require_role(["Admin"])
require_analyst = require_role(["Admin", "Analyst"])
require_viewer = require_role(["Admin", "Analyst", "Viewer"])

