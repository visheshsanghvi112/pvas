"""
tests/conftest.py
────────────────────────────────────────────────────────────────────────────
Pytest configuration ensuring test database isolation.
Copies backend/db/surveillance.db to a temporary sandbox database, sets
DATABASE_URL so FastAPI and SQLAlchemy operate exclusively on the sandbox copy,
and guarantees zero mutations to the live production database.
"""
import os
import sqlite3
import tempfile
import pytest

TEMP_DB_PATH = os.path.join(tempfile.gettempdir(), "pvasf_test_surveillance_isolated.db")
REAL_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "db", "surveillance.db"))

# Ensure DATABASE_URL is set before any backend modules are imported
if os.path.exists(REAL_DB_PATH):
    # Online copy using sqlite3 backup API to cleanly capture any WAL buffered state
    src = sqlite3.connect(REAL_DB_PATH)
    dst = sqlite3.connect(TEMP_DB_PATH)
    src.backup(dst)
    dst.close()
    src.close()

os.environ["DATABASE_URL"] = f"sqlite:///{TEMP_DB_PATH}"


@pytest.fixture(scope="session", autouse=True)
def isolate_and_cleanup_test_database():
    """Session-level fixture ensuring temporary test database cleanup on finish."""
    yield
    # Teardown: remove temporary test sandbox
    if os.path.exists(TEMP_DB_PATH):
        try:
            os.remove(TEMP_DB_PATH)
        except Exception:
            pass
    # Clean up any WAL/SHM artifacts of the temporary database
    for extra in (f"{TEMP_DB_PATH}-wal", f"{TEMP_DB_PATH}-shm"):
        if os.path.exists(extra):
            try:
                os.remove(extra)
            except Exception:
                pass
