"""
backend/routers/auth.py
────────────────────────────────────────────────────────────────────────────
FastAPI router for Security, Authentication, User Management, and Audit Logs.
"""

import time
from collections import defaultdict
from threading import Lock
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.models import SysUser
from backend.security import get_current_user, require_admin
from backend.services.auth_service import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["Security & Auth"])


class LoginRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter for login attempts.
    Permits up to 10 failed login attempts per IP per 60-second window.
    Locks out repeated attackers for 60 seconds without requiring external caches.
    """
    def __init__(self, max_attempts: int = 10, window_seconds: int = 60, lockout_seconds: int = 60):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.lockout_seconds = lockout_seconds
        self._attempts: dict[str, list[float]] = defaultdict(list)
        self._lockouts: dict[str, float] = {}
        self._lock = Lock()

    def check_rate_limit(self, ip: str) -> None:
        now = time.time()
        with self._lock:
            if ip in self._lockouts:
                remaining = int(self._lockouts[ip] - now)
                if remaining > 0:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Too many failed login attempts. Please wait {remaining} seconds before trying again."
                    )
                del self._lockouts[ip]

    def record_failure(self, ip: str) -> None:
        now = time.time()
        with self._lock:
            self._attempts[ip] = [t for t in self._attempts[ip] if now - t < self.window_seconds]
            self._attempts[ip].append(now)
            if len(self._attempts[ip]) >= self.max_attempts:
                self._lockouts[ip] = now + self.lockout_seconds
                self._attempts[ip].clear()

    def record_success(self, ip: str) -> None:
        with self._lock:
            self._attempts.pop(ip, None)
            self._lockouts.pop(ip, None)


_rate_limiter = LoginRateLimiter(max_attempts=25, window_seconds=60, lockout_seconds=30)


def _get_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreateRequest(BaseModel):
    username: str
    email: str
    full_name: str
    department: str = "Market Conduct"
    password: str
    role: str = "Analyst"

class UserRoleUpdateRequest(BaseModel):
    role: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    full_name: str
    department: str
    role: str
    is_active: bool

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: str
    username: str
    role: str
    action: str
    target: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login", summary="Authenticate user & obtain access token")
def login(
    req: LoginRequest,
    request: Request,
    svc: AuthService = Depends(_get_service)
):
    ip = request.client.host if request.client else "127.0.0.1"
    _rate_limiter.check_rate_limit(ip)

    auth_result = svc.authenticate(req.username, req.password, ip_address=ip)
    if not auth_result:
        _rate_limiter.record_failure(ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    _rate_limiter.record_success(ip)
    return auth_result


@router.get("/me", summary="Get active logged-in user profile", response_model=UserResponse)
def get_me(current_user: SysUser = Depends(get_current_user)):
    return current_user


@router.get("/users", summary="List all system users (Admin only)", response_model=List[UserResponse])
def list_users(
    svc: AuthService = Depends(_get_service),
    admin_user: SysUser = Depends(require_admin)
):
    return svc.list_users()


@router.post("/users", summary="Register new surveillance team user (Admin only)", response_model=UserResponse)
def create_user(
    req: UserCreateRequest,
    svc: AuthService = Depends(_get_service),
    admin_user: SysUser = Depends(require_admin)
):
    try:
        user = svc.create_user(
            username=req.username,
            email=req.email,
            full_name=req.full_name,
            department=req.department,
            password=req.password,
            role=req.role,
            admin_username=admin_user.username,
            admin_role=admin_user.role
        )
        return user
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create user: {e}")


@router.put("/users/{user_id}/role", summary="Update user role (Admin only)", response_model=UserResponse)
def update_user_role(
    user_id: int,
    req: UserRoleUpdateRequest,
    svc: AuthService = Depends(_get_service),
    admin_user: SysUser = Depends(require_admin)
):
    user = svc.update_user_role(
        user_id=user_id,
        new_role=req.role,
        admin_username=admin_user.username,
        admin_role=admin_user.role
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}/toggle", summary="Toggle user active/inactive status (Admin only)", response_model=UserResponse)
def toggle_user_active(
    user_id: int,
    svc: AuthService = Depends(_get_service),
    admin_user: SysUser = Depends(require_admin)
):
    user = svc.toggle_user_active(
        user_id=user_id,
        admin_username=admin_user.username,
        admin_role=admin_user.role
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/audit-logs", summary="Get security & access audit logs")
def get_audit_logs(
    limit: int = 100,
    svc: AuthService = Depends(_get_service),
    current_user: SysUser = Depends(get_current_user)
):
    logs = svc.get_audit_logs(limit)
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "username": l.username,
            "role": l.role,
            "action": l.action,
            "target": l.target or "N/A",
            "details": l.details or "N/A",
            "ip_address": l.ip_address or "127.0.0.1"
        }
        for l in logs
    ]
