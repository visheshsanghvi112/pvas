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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: initialise the SQLite database schema and seed synthetic data.
    Teardown: nothing required for SQLite (connection pooling handles it).

    Teradata migration note: swap backend/db/database.py connection string
    and seed.py with live Teradata queries — zero changes needed here.
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
        "Endpoints: /api/v1/surveillance/* | /api/v1/trades/* | /api/v1/clients/*"
    ),
    version="2.5.0",
    lifespan=lifespan,
)

# Enable CORS for Next.js frontend (defaulting to http://localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Existing surveillance router (unchanged) ──────────────────────────────────
app.include_router(surveillance_router)

# ── New Teradata-schema-backed routers ────────────────────────────────────────
app.include_router(fact_trades_router)
app.include_router(clients_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
