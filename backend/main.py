import os
import sys

# Ensure backend package can be imported properly
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.surveillance import router as surveillance_router
from backend.routers.trade_matches import router as trade_matches_router
from backend.routers.clients import router as clients_router
from backend.routers.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: initialise database schema and seed synthetic data if empty.
    Teardown: connection cleanup handled automatically.
    """
    from backend.db.database import init_db, SessionLocal
    from backend.db.seed import seed_database
    from backend.db.models import SysUser, DailyMarketEod

    print("[startup] Initialising database schema …")
    init_db()

    db = SessionLocal()
    try:
        has_user = db.query(SysUser.id).first() is not None
        has_eod = db.query(DailyMarketEod.record_id).first() is not None
        if not has_user or not has_eod:
            summary = seed_database(db)
            print(f"[startup] Seed summary: {summary}")
        else:
            print("[startup] Database already seeded and operational.")
    except Exception as e:
        print(f"[startup] Database initialization check: {e}")
        try:
            summary = seed_database(db)
            print(f"[startup] Seed summary: {summary}")
        except Exception as seed_err:
            print(f"[startup] Seed error fallback: {seed_err}")
    finally:
        db.close()

    yield  # application runs here


app = FastAPI(
    title="Institutional Market Surveillance API",
    description=(
        "Price-Volume Alert Surveillance Framework (PVASF) API. "
        "Backed by Institutional Relational Surveillance Database. "
        "Endpoints: /api/v1/surveillance/* | /api/v1/trades/* | /api/v1/clients/pan/*"
    ),
    version="2.5.0",
    lifespan=lifespan,
)

# Standard CORS configuration restricted to authorized origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8005",
        "http://127.0.0.1:8005",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# ── Routers ─────────────────────────────────────────────────────────────────
app.include_router(surveillance_router)
app.include_router(trade_matches_router)
app.include_router(clients_router)
app.include_router(auth_router)

if __name__ == "__main__":
    import uvicorn
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    port = int(os.environ.get("BACKEND_PORT", os.environ.get("PORT", "8005")))
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        reload_dirs=[backend_dir],
        reload_includes=["*.py"],
        reload_excludes=[".next/*", "node_modules/*", "*.db", "*.json", ".pytest_cache/*", ".git/*"]
    )
