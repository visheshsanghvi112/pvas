import os
import sys

# Ensure backend package can be imported properly
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.surveillance import router as surveillance_router
from backend.routers.fact_trades import router as fact_trades_router
from backend.routers.clients import router as clients_router
from backend.routers.auth import router as auth_router
from backend.routers.cases import router as cases_router
from backend.routers.agg_trades import router as agg_trades_router, v1_router as agg_trades_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: initialise database schema and seed synthetic data.
    Teardown: connection cleanup handled automatically.
    """
    from backend.db.database import init_db, SessionLocal
    from backend.db.seed import seed_database

    print("[startup] Initialising database schema …")
    init_db()

    db = SessionLocal()
    try:
        summary = seed_database(db)
        print(f"[startup] Seed summary: {summary}")
    finally:
        db.close()

    yield  # application runs here


app = FastAPI(
    title="Institutional Market Surveillance API",
    description=(
        "Multi-Asset Conduct, Compliance & Forensic Audit Suite API. "
        "Backed by Regulatory DWBIS Teradata schema (SQLite dev mode). "
        "Endpoints: /api/v1/surveillance/* | /api/v1/trades/* | /api/v1/clients/* | /api/aggregates/* | /api/v1/agg-trades/*"
    ),
    version="2.5.0",
    lifespan=lifespan,
)

# Standard CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────
app.include_router(surveillance_router)
app.include_router(fact_trades_router)
app.include_router(clients_router)
app.include_router(auth_router)
app.include_router(cases_router)
app.include_router(agg_trades_router)
app.include_router(agg_trades_v1_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
