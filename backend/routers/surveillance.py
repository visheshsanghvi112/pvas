from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from backend.services.surveillance_service import EODSurveillanceService

router = APIRouter(prefix="/api/v1/surveillance", tags=["EOD Price-Volume Surveillance"])
legacy_router = APIRouter(prefix="/api", tags=["Legacy Compatibility"])
service = EODSurveillanceService()


@router.get("/health")
@legacy_router.get("/health")
def health_check():
    return {
        "status": "ONLINE",
        "system": "Price-Volume (PV) Alert Surveillance Framework",
        "spec": "PVASF_CORE_SPEC.md (5 Core Statistical Metrics & Teradata Integration)"
    }


@router.get("/watchlist")
@legacy_router.get("/scrips")
def get_watchlist(search: str = Query("", description="Search ticker symbol")):
    scrips = service.get_scrips_summary()
    if search:
        scrips = [s for s in scrips if search.lower() in s["ticker"].lower()]
    return scrips


@router.get("/scrip/{scrip_id}")
@legacy_router.get("/scrip/{scrip_id}")
def get_scrip_detail(scrip_id: str):
    try:
        return service.get_scrip_detail(scrip_id.upper())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/scrip/{scrip_id}/participants")
def get_scrip_participants(scrip_id: str):
    try:
        return service.get_scrip_participants(scrip_id.upper())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/weights")
def update_weights(payload: Dict[str, Any]):
    weights = payload.get("weights", {})
    threshold = payload.get("threshold", None)
    config = service.update_weights(weights, threshold)
    return {
        "status": "SUCCESS",
        "weights": config.weights,
        "threshold": config.threshold
    }


@router.post("/upload-eod")
@legacy_router.post("/upload-eod")
async def upload_eod(file: UploadFile = File(...)):
    contents = await file.read()
    res = service.load_eod_csv(contents, file.filename)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res
