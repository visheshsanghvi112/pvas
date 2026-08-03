"""
backend/db/database.py
────────────────────────────────────────────────────────────────────────────
Database engine and session factory.

The DATABASE_URL environment variable controls the backend:
  - Not set  → defaults to SQLite (surveillance.db) — used during development
  - Set to a Teradata JDBC/ODBC URL → production Teradata environment

Teradata migration path (future):
  export DATABASE_URL="teradatasql://user:pass@host/mydb"
  Replace get_engine() with teradatasql dialect and nothing else changes.
"""

import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

# ── Connection string ─────────────────────────────────────────────────────────
_DEFAULT_DB_PATH = Path(__file__).parent / "surveillance.db"
DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    f"sqlite:///{_DEFAULT_DB_PATH}"
)

# ── Engine ────────────────────────────────────────────────────────────────────
connect_args: dict = {}
if DATABASE_URL.startswith("sqlite"):
    # SQLite needs check_same_thread=False for FastAPI's thread-pool
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    # Pool settings suitable for both SQLite and Teradata
    pool_pre_ping=True,
    echo=False,          # Set to True for SQL debugging
)

# Enable FK enforcement for SQLite
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Base class for ORM models ─────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── FastAPI dependency ────────────────────────────────────────────────────────
def get_db():
    """Yield a SQLAlchemy session; automatically closed on request teardown."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Schema initialisation helper ──────────────────────────────────────────────
def init_db() -> None:
    """Create all tables (no-op if they already exist)."""
    # Import models so SQLAlchemy registers them on Base.metadata
    from backend.db import models  # noqa: F401 — side-effect import
    Base.metadata.create_all(bind=engine)


def reset_database() -> None:
    """Drop all existing tables and recreate all 19 system tables clean."""
    from backend.db import models  # noqa: F401 — side-effect import
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

