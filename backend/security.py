"""
backend/security.py
────────────────────────────────────────────────────────────────────────────
User Authentication, Password Hashing & Role-Based Access Control (RBAC).

How Security Works:
  1. Passwords: Encrypted using PBKDF2 with 100,000 rounds and random salt.
  2. Tokens: Signed with HMAC-SHA256 (expires in 24 hours).
  3. Roles:
     - Admin: Full access (change weights, upload EOD, manage users, delete cases).
     - Analyst: Surveillance officer (view scrips, create/edit cases, log notes).
     - Viewer: Read-only guest (can view scrips and charts, cannot edit).
"""

import hashlib
import hmac
import os
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.models import SysUser

DEFAULT_DEV_SECRET = "pvasf_surveillance_enterprise_secure_secret_2026"
SECRET_KEY = os.getenv("PVASF_SECRET_KEY", DEFAULT_DEV_SECRET)
ENV_MODE = os.getenv("PVASF_ENV", os.getenv("ENVIRONMENT", "development")).lower()

if ENV_MODE in ("production", "prod"):
    if not os.getenv("PVASF_SECRET_KEY") or SECRET_KEY == DEFAULT_DEV_SECRET:
        raise RuntimeError(
            "FATAL SECURITY FAILURE: PVASF_SECRET_KEY must be set to a cryptographically secure key in production."
        )

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """
    Encrypts a plain password using PBKDF2-HMAC-SHA256 with 100,000 iterations.
    Each password gets a unique random 16-byte salt so identical passwords produce different hashes.
    """
    iterations = 100_000
    if not salt:
        salt_bytes = os.urandom(16)
    else:
        salt_bytes = bytes.fromhex(salt)
    
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, iterations)
    return f"pbkdf2_sha256${iterations}${salt_bytes.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checks if a user's typed password matches the stored encrypted hash.
    Uses constant-time comparison (hmac.compare_digest) to protect against timing attacks.
    """
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
            # Fallback for legacy hashes during migration
            salt = SECRET_KEY.encode("utf-8")
            legacy_hash = hmac.new(salt, plain_password.encode("utf-8"), hashlib.sha256).hexdigest()
            return hmac.compare_digest(legacy_hash, hashed_password)
    except Exception:
        return False


def create_access_token(data: dict) -> str:
    """
    Creates a signed 24-hour session token containing the username and role.
    The client sends this token in the 'Authorization: Bearer <token>' header.
    """
    payload = data.copy()
    now = datetime.now(timezone.utc)
    payload["iat"] = now.timestamp()
    payload["exp"] = (now + timedelta(hours=TOKEN_EXPIRE_HOURS)).timestamp()
    raw_payload = json.dumps(payload, sort_keys=True)
    signature = hmac.new(SECRET_KEY.encode("utf-8"), raw_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    payload_hex = raw_payload.encode("utf-8").hex()
    return f"{payload_hex}.{signature}"


def decode_access_token(token: str) -> Optional[dict]:
    """
    Verifies that a token has a valid signature and has not expired.
    Returns the token payload (username, role) or None if invalid.
    """
    try:
        if "." not in token:
            return None
        payload_hex, signature = token.rsplit(".", 1)
        raw_payload = bytes.fromhex(payload_hex).decode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), raw_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(raw_payload)
        if payload.get("exp", 0) < datetime.now(timezone.utc).timestamp():
            return None
        return payload
    except Exception:
        return None


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> SysUser:
    """
    FastAPI dependency: Reads the token from the request header, validates it,
    and returns the active SysUser object from the database.
    """
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
    """
    RBAC Role Guard factory: Restricts endpoint access to specific user roles.
    Raises HTTP 403 Forbidden if the user's role is not in allowed_roles.
    """
    def role_checker(current_user: SysUser = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}. Your current role is '{current_user.role}'.",
            )
        return current_user
    return role_checker


# Role Guard shortcuts for FastAPI routes:
require_admin = require_role(["Admin"])                        # Only Admin
require_analyst = require_role(["Admin", "Analyst"])            # Admin or Analyst
require_viewer = require_role(["Admin", "Analyst", "Viewer"])   # Any logged-in user


