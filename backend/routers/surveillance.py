from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.services.surveillance_service import EODSurveillanceService
from backend.security import get_current_user, require_admin, require_analyst
from backend.db.models import SysUser
from backend.db.database import get_db
from backend.services.auth_service import AuthService

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
def get_watchlist(
    search: str = Query("", description="Search ticker symbol"),
    current_user: SysUser = Depends(get_current_user)
):
    scrips = service.get_watchlist()
    if search:
        scrips = [s for s in scrips if search.lower() in s["ticker"].lower()]
    return scrips


@router.get("/scrips")
@legacy_router.get("/scrips")
def get_scrips(
    search: str = Query("", description="Search ticker symbol"),
    current_user: SysUser = Depends(get_current_user)
):
    scrips = service.get_scrips_summary()
    if search:
        scrips = [s for s in scrips if search.lower() in s["ticker"].lower()]
    return scrips


@router.get("/scrip/{scrip_id}")
@legacy_router.get("/scrip/{scrip_id}")
def get_scrip_detail(
    scrip_id: str,
    current_user: SysUser = Depends(get_current_user)
):
    try:
        return service.get_scrip_detail(scrip_id.upper())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/scrip/{scrip_id}/participants")
def get_scrip_participants(
    scrip_id: str,
    current_user: SysUser = Depends(get_current_user)
):
    try:
        return service.get_scrip_participants(scrip_id.upper())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/scrip/{scrip_id}/shareholding-breakdown")
def get_scrip_shareholding_breakdown(
    scrip_id: str,
    current_user: SysUser = Depends(get_current_user)
):
    return service.get_scrip_shareholding_breakdown(scrip_id.upper())


@router.get("/scrip/{scrip_id}/corporate-actions")
def get_scrip_corporate_actions(
    scrip_id: str,
    current_user: SysUser = Depends(get_current_user)
):
    return service.get_scrip_corporate_actions(scrip_id.upper())


@router.post("/weights")
def update_weights(
    payload: Dict[str, Any],
    admin_user: SysUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    weights = payload.get("weights", {})
    threshold = payload.get("threshold", None)
    config = service.update_weights(weights, threshold)
    
    # Security Audit Trail logging
    auth_svc = AuthService(db)
    auth_svc.log_audit(
        username=admin_user.username,
        role=admin_user.role,
        action="UPDATE_MODEL_WEIGHTS",
        target="SURVEILLANCE_MODEL_CONFIG",
        details=f"Updated alert thresholds ({threshold}) and model weights ({weights})"
    )

    return {
        "status": "SUCCESS",
        "weights": config.weights,
        "threshold": config.threshold
    }


@router.post("/upload-eod")
@legacy_router.post("/upload-eod")
async def upload_eod(
    file: UploadFile = File(...),
    admin_user: SysUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    res = service.load_eod_csv(contents, file.filename)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    
    # Security Audit Trail logging
    auth_svc = AuthService(db)
    auth_svc.log_audit(
        username=admin_user.username,
        role=admin_user.role,
        action="UPLOAD_EOD_DATA",
        target=file.filename,
        details=f"Uploaded EOD trade file containing {res.get('processed_records', 0)} records"
    )

    return res
