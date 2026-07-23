import os
import sys

# Ensure backend package can be imported properly
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers.surveillance import router as surveillance_router

app = FastAPI(
    title="Institutional Market Surveillance API",
    description="Multi-Asset Conduct, Compliance & Forensic Audit Suite API",
    version="2.4.0"
)

# Enable CORS for Next.js frontend (defaulting to http://localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(surveillance_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
