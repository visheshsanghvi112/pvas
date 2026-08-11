"""
backend/services/auth_service.py
────────────────────────────────────────────────────────────────────────────
Business logic layer for User Management, Auth, and Security Audit Logs.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.db.models import SysUser, SysAuditLog
from backend.security import hash_password, verify_password, create_access_token


class AuthService:

    def __init__(self, db: Session) -> None:
        self._db = db

    def log_audit(
        self,
        username: str,
        role: str,
        action: str,
        target: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: str = "127.0.0.1"
    ) -> SysAuditLog:
        """Records an immutable security audit event."""
        log = SysAuditLog(
            timestamp=datetime.utcnow(),
            username=username,
            role=role,
            action=action,
            target=target,
            details=details,
            ip_address=ip_address
        )
        self._db.add(log)
        self._db.commit()
        self._db.refresh(log)
        return log

    def authenticate(self, username: str, password: str, ip_address: str = "127.0.0.1") -> Optional[Dict[str, Any]]:
        """Authenticates user and returns user info + access token."""
        user = self._db.query(SysUser).filter(SysUser.username == username, SysUser.is_active == True).first()
        if not user or not verify_password(password, user.hashed_password):
            self.log_audit(
                username=username,
                role="Unknown",
                action="LOGIN_FAILED",
                target="AUTH_GATE",
                details="Invalid username or password credentials",
                ip_address=ip_address
            )
            return None

        # Update last login timestamp
        user.last_login_at = datetime.utcnow()
        self._db.commit()

        self.log_audit(
            username=user.username,
            role=user.role,
            action="LOGIN_SUCCESS",
            target="AUTH_GATE",
            details=f"User {user.full_name} logged in successfully",
            ip_address=ip_address
        )

        token = create_access_token({"sub": user.username, "role": user.role, "id": user.id})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "department": user.department,
            }
        }

    def list_users(self) -> List[SysUser]:
        """Returns list of all registered system users."""
        return self._db.query(SysUser).order_by(SysUser.id.asc()).all()

    def create_user(
        self,
        username: str,
        email: str,
        full_name: str,
        department: str,
        password: str,
        role: str,
        admin_username: str,
        admin_role: str,
    ) -> SysUser:
        """Creates a new user account (Admin only)."""
        valid_roles = {"Admin", "Analyst", "Viewer"}
        if role not in valid_roles:
            raise ValueError(f"Invalid role '{role}'. Must be one of: {', '.join(valid_roles)}")

        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters long")

        existing = self._db.query(SysUser).filter(
            (SysUser.username == username) | (SysUser.email == email)
        ).first()
        if existing:
            raise ValueError("Username or email already registered")

        hashed = hash_password(password)
        user = SysUser(
            username=username,
            email=email,
            full_name=full_name,
            department=department,
            hashed_password=hashed,
            role=role,
            is_active=True,
            created_at=datetime.utcnow()
        )
        self._db.add(user)
        self._db.commit()
        self._db.refresh(user)

        self.log_audit(
            username=admin_username,
            role=admin_role,
            action="CREATE_USER",
            target=username,
            details=f"Created user {full_name} ({email}) with role '{role}' in department '{department}'"
        )
        return user

    def update_user_role(
        self,
        user_id: int,
        new_role: str,
        admin_username: str,
        admin_role: str
    ) -> Optional[SysUser]:
        """Updates role of a target user (Admin only with self-demotion lockout protection)."""
        valid_roles = {"Admin", "Analyst", "Viewer"}
        if new_role not in valid_roles:
            raise ValueError(f"Invalid role '{new_role}'. Must be one of: {', '.join(valid_roles)}")

        user = self._db.query(SysUser).filter(SysUser.id == user_id).first()
        if not user:
            return None

        # Lockout check: if demoting an Admin, ensure at least one other active Admin remains
        if user.role == "Admin" and new_role != "Admin":
            active_admin_count = self._db.query(SysUser).filter(
                SysUser.role == "Admin", SysUser.is_active == True
            ).count()
            if active_admin_count <= 1:
                raise ValueError("Cannot demote the last remaining active Admin user in the system.")

        old_role = user.role
        user.role = new_role
        self._db.commit()
        self._db.refresh(user)

        self.log_audit(
            username=admin_username,
            role=admin_role,
            action="UPDATE_USER_ROLE",
            target=user.username,
            details=f"Role changed from '{old_role}' to '{new_role}' for user {user.full_name}"
        )
        return user

    def toggle_user_active(
        self,
        user_id: int,
        admin_username: str,
        admin_role: str
    ) -> Optional[SysUser]:
        """Toggles user active/inactive status (Admin only with lockout protection)."""
        user = self._db.query(SysUser).filter(SysUser.id == user_id).first()
        if not user:
            return None

        # Lockout check: if deactivating an active Admin, ensure at least one other active Admin remains
        if user.role == "Admin" and user.is_active:
            active_admin_count = self._db.query(SysUser).filter(
                SysUser.role == "Admin", SysUser.is_active == True
            ).count()
            if active_admin_count <= 1:
                raise ValueError("Cannot deactivate the last remaining active Admin user in the system.")

        user.is_active = not user.is_active
        self._db.commit()
        self._db.refresh(user)

        status_str = "Activated" if user.is_active else "Deactivated"
        self.log_audit(
            username=admin_username,
            role=admin_role,
            action="TOGGLE_USER_STATUS",
            target=user.username,
            details=f"{status_str} account for user {user.full_name}"
        )
        return user

    def get_audit_logs(self, limit: int = 100) -> List[SysAuditLog]:
        """Returns latest security audit trail logs."""
        return self._db.query(SysAuditLog).order_by(desc(SysAuditLog.timestamp)).limit(limit).all()
