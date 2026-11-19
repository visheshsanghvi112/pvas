"""
tests/test_core_logic_fixes.py
────────────────────────────────────────────────────────────────────────────
Targeted regression suite verifying core engine math, caching, time-travel
scoping, dilution parity, band fallback, and defensive guards.
Uses the session-isolated sandbox DB from tests/conftest.py.
"""
from datetime import date, timedelta
import os
import pandas as pd
import numpy as np
import pytest

from pv_alert_surveillance import (
    SurveillanceConfig,
    SurveillanceEngine,
    clean_historical_data,
)
import backend.services.surveillance_service as ss_mod
from backend.services.surveillance_service import EODSurveillanceService
from backend.db.database import SessionLocal
from backend.db.models import (
    ClientIdentityMaster,
    PriceDilutionFactor,
    ShareholdingSummary,
    LargeShareholdersRegistry,
    CorporateEventsFeed,
)


def _make_ohlcv(ticker: str, days: int, start_price: float = 100.0, daily_pct: float = 0.01) -> pd.DataFrame:
    dates = [date(2025, 1, 1) + timedelta(days=i) for i in range(days)]
    closes = [round(start_price * ((1.0 + daily_pct) ** i), 2) for i in range(days)]
    return pd.DataFrame({
        "Ticker": [ticker] * days,
        "Date": dates,
        "Open": closes,
        "High": [round(c * 1.01, 2) for c in closes],
        "Low": [round(c * 0.99, 2) for c in closes],
        "Close": closes,
        "Volume": [10000 + (i * 50) for i in range(days)],
    })


def test_clean_historical_data_excludes_zero_close():
    df = pd.DataFrame({
        "Ticker": ["AAA", "AAA", "AAA"],
        "Date": ["2025-01-01", "2025-01-02", "2025-01-03"],
        "Open": [10.0, 0.0, 12.0],
        "High": [10.5, 0.0, 12.5],
        "Low": [9.5, 0.0, 11.5],
        "Close": [10.0, 0.0, 12.0],
        "Volume": [1000, 500, 1200],
    })
    cleaned = clean_historical_data(df)
    assert len(cleaned) == 2
    assert (cleaned["Close"] > 0).all()


def test_missing_circuit_limits_fall_back_to_quantile_band():
    # Construct 30 days of ~10% daily high moves without circuit limit metadata
    df = _make_ohlcv("NOCIRC", days=30, start_price=100.0, daily_pct=0.02)
    df["High"] = df["Close"] * 1.10
    df["UpperCircuitLimit"] = 0.0
    df["PrevClose"] = 0.0
    df = EODSurveillanceService._assign_empirical_band(df)

    assert df["Band"].isna().all(), "Missing circuit bounds must stay NaN instead of 0.05"

    engine = SurveillanceEngine(SurveillanceConfig())
    _, _, resolved_band = engine.compute_daily_event_flags(df, recent_days=15)
    assert resolved_band >= 0.10, f"Expected quantile band >= 0.10, got {resolved_band}"


def test_occl_history_flags_match_core_metrics():
    svc = EODSurveillanceService()
    detail = svc.get_scrip_detail("OCCL", as_of_date="2025-06-11")
    m = detail["metrics"]
    last15 = detail["history"][-15:]

    assert sum(1 for pt in last15 if pt["is_band_hit"]) == m["band_hit_days"]
    assert sum(1 for pt in last15 if pt["is_new_high"]) == m["new_high_days"]


def test_dilution_summary_and_detail_date_consistency():
    sym = "TEST_DIL_SYM"
    db = SessionLocal()
    try:
        db.add_all([
            PriceDilutionFactor(
                symbol=sym,
                split_multiplier=0.5,
                valid_from_date=date(2025, 3, 1),
                valid_thru_date=date(2025, 5, 31),
            ),
            PriceDilutionFactor(
                symbol=sym,
                split_multiplier=0.25,
                valid_from_date=date(2025, 6, 1),
                valid_thru_date=date(2025, 12, 31),
            ),
        ])
        db.commit()

        svc = EODSurveillanceService()
        assert svc._load_all_dilution_factors("2025-02-15").get(sym, 1.0) == 1.0
        assert svc._get_dilution_multiplier(sym, "2025-02-15") == 1.0

        assert svc._load_all_dilution_factors("2025-04-15")[sym] == 0.5
        assert svc._get_dilution_multiplier(sym, "2025-04-15") == 0.5

        assert svc._load_all_dilution_factors("2025-06-15")[sym] == 0.25
        assert svc._get_dilution_multiplier(sym, "2025-06-15") == 0.25
    finally:
        db.query(PriceDilutionFactor).filter(PriceDilutionFactor.symbol == sym).delete()
        db.commit()
        db.close()


def test_load_eod_csv_invalidates_caches_and_supports_25_rows(tmp_path, monkeypatch):
    monkeypatch.setattr(ss_mod, "CACHE_DIR", str(tmp_path))
    stale_file = tmp_path / "stale_summary.json"
    stale_file.write_text('[{"ticker": "STALE"}]')

    svc = EODSurveillanceService()
    svc._summary_cache["dummy_key"] = [{"ticker": "STALE"}]
    svc._cached_trading_dates = ["1999-01-01"]

    # Build a valid 25-day CSV (between old hardcoded 30 threshold and canonical recent+5=20)
    df = _make_ohlcv("MIN25", days=25, start_price=50.0, daily_pct=0.04)
    df["Date"] = pd.date_range("2025-01-01", periods=25, freq="B").strftime("%Y-%m-%d")
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    res = svc.load_eod_csv(csv_bytes, "upload.csv")
    assert res["status"] == "SUCCESS"
    assert not os.path.exists(stale_file), "Disk summary cache should be invalidated on CSV upload"
    assert "dummy_key" not in svc._summary_cache
    assert svc._ticker_set == {"MIN25"}
    assert any(s["ticker"] == "MIN25" for s in res["scrips"]), "25-row ticker should be scored in summary"


def test_shareholding_chronological_sort_and_as_of_date_scoping():
    sym = "TEST_SH_SYM"
    db = SessionLocal()
    try:
        # Insert Q4 FY25 (Apr 2025) and Q1 FY26 (Jul 2025): lexicographically Q4 FY25 > Q1 FY26!
        db.add_all([
            ShareholdingSummary(
                symbol=sym,
                quarter_code="Q4 FY25",
                filing_date=date(2025, 4, 15),
                category_type="PROMOTER_GROUP",
                total_shares_count=1000,
                holding_percentage=50.0,
                unique_holding_pans=10,
            ),
            ShareholdingSummary(
                symbol=sym,
                quarter_code="Q1 FY26",
                filing_date=date(2025, 7, 15),
                category_type="PROMOTER_GROUP",
                total_shares_count=1200,
                holding_percentage=60.0,
                unique_holding_pans=12,
            ),
            CorporateEventsFeed(
                symbol=sym,
                isin="INE999A01010",
                action_category="BONUS",
                announcement_purpose="Early announcement",
                announcement_date=date(2025, 4, 10),
            ),
            CorporateEventsFeed(
                symbol=sym,
                isin="INE999A01010",
                action_category="SPLIT",
                announcement_purpose="Future announcement",
                announcement_date=date(2025, 8, 1),
            ),
        ])
        db.commit()

        svc = EODSurveillanceService()
        # Full timeline: Q1 FY26 (60%) must be latest even though "Q4 FY25" sorts higher alphabetically
        sh_all = svc.get_scrip_shareholding_breakdown(sym)
        assert sh_all["promoter_pct_t"] == 60.0
        assert sh_all["promoter_pct_180"] == 50.0

        # Time-travel to June 1: Q1 FY26 (July) and August announcement must be hidden
        sh_june = svc.get_scrip_shareholding_breakdown(sym, as_of_date="2025-06-01")
        assert sh_june["promoter_pct_t"] == 50.0
        assert sh_june["promoter_pct_180"] is None
        assert len(sh_june["quarterly_history"]) == 1

        ca_june = svc.get_scrip_corporate_actions(sym, as_of_date="2025-06-01")
        assert len(ca_june) == 1
        assert ca_june[0]["category"] == "BONUS"

        ann_june = svc._get_announcements(sym, as_of_date="2025-06-01")
        assert len(ann_june) == 1
        assert ann_june[0]["category"] == "BONUS"
    finally:
        db.query(ShareholdingSummary).filter(ShareholdingSummary.symbol == sym).delete()
        db.query(LargeShareholdersRegistry).filter(LargeShareholdersRegistry.symbol == sym).delete()
        db.query(CorporateEventsFeed).filter(CorporateEventsFeed.symbol == sym).delete()
        db.commit()
        db.close()


def test_get_scrip_participants_empty_eod_and_none_trades_safe():
    svc = EODSurveillanceService()
    svc.current_trades_df = None  # type: ignore[assignment]
    res = svc.get_scrip_participants("DOES_NOT_EXIST_XYZ", as_of_date="2025-06-11")
    assert res["ticker"] == "DOES_NOT_EXIST_XYZ"
    assert res["ltp_contributors"] == []
    assert res["profit_makers"] == []


def test_excel_exporter_marks_band_hits_from_history():
    import openpyxl
    from backend.services.excel_exporter import build_surveillance_dossier_excel

    svc = EODSurveillanceService()
    detail = svc.get_scrip_detail("OCCL", as_of_date="2025-06-11", window_days=15)
    buf = build_surveillance_dossier_excel(detail, selected_date="2025-06-11", window_days=15)
    wb = openpyxl.load_workbook(buf)
    ws = wb["Market_Dynamics"]
    yes_rows = [row[8].value for row in ws.iter_rows(min_row=7, max_col=9) if row[8].value == "Yes"]
    assert len(yes_rows) == detail["metrics"]["band_hit_days"] == 4


def test_daily_band_nan_inside_recent_window_falls_back_per_row():
    df = _make_ohlcv("NANBAND", days=30, start_price=100.0, daily_pct=0.01)
    df["Band"] = 0.05
    # Force two 5% upper-circuit hits in the recent 15d window whose Band cell is NaN
    for idx in (-3, -2):
        prev_c = float(df.loc[df.index[idx - 1], "Close"])
        df.loc[df.index[idx], "High"] = round(prev_c * 1.05, 2)
        df.loc[df.index[idx], "Band"] = np.nan

    engine = SurveillanceEngine(SurveillanceConfig())
    is_band_hit, _, _ = engine.compute_daily_event_flags(df, band_percent=0.05, recent_days=15)
    assert is_band_hit.iloc[-3] is np.bool_(True) or bool(is_band_hit.iloc[-3]) is True
    assert bool(is_band_hit.iloc[-2]) is True
    assert int(is_band_hit.iloc[-15:].sum()) >= 2


def test_shareholding_multi_quarter_dedup_and_t180_selection():
    sym = "TEST_SH_MULTI"
    pan = "TSTSH0001A"
    db = SessionLocal()
    try:
        db.add(
            ClientIdentityMaster(
                client_pan=pan,
                client_legal_name="Alpha Promoter",
                entity_type="PROMOTER",
                registration_date=date(2020, 1, 1),
            )
        )
        db.flush()
        db.add_all([
            ShareholdingSummary(
                symbol=sym, quarter_code="Q2 FY25", filing_date=date(2024, 10, 15),
                category_type="PROMOTER_GROUP", total_shares_count=1000,
                holding_percentage=45.0, unique_holding_pans=100,
            ),
            ShareholdingSummary(
                symbol=sym, quarter_code="Q3 FY25", filing_date=date(2025, 1, 15),
                category_type="PROMOTER_GROUP", total_shares_count=1100,
                holding_percentage=48.0, unique_holding_pans=110,
            ),
            ShareholdingSummary(
                symbol=sym, quarter_code="Q4 FY25", filing_date=date(2025, 4, 15),
                category_type="PROMOTER_GROUP", total_shares_count=1150,
                holding_percentage=50.0, unique_holding_pans=115,
            ),
            ShareholdingSummary(
                symbol=sym, quarter_code="Q1 FY26", filing_date=date(2025, 7, 15),
                category_type="PROMOTER_GROUP", total_shares_count=1200,
                holding_percentage=55.0, unique_holding_pans=120,
            ),
            LargeShareholdersRegistry(
                symbol=sym, quarter_code="Q4 FY25",
                holder_category="PROMOTER", holder_legal_name="Alpha Promoter",
                holder_pan=pan, shares_held=500, holding_percentage=50.0,
            ),
            LargeShareholdersRegistry(
                symbol=sym, quarter_code="Q1 FY26",
                holder_category="PROMOTER", holder_legal_name="Alpha Promoter",
                holder_pan=pan, shares_held=600, holding_percentage=55.0,
            ),
        ])
        db.commit()

        svc = EODSurveillanceService()
        breakdown = svc.get_scrip_shareholding_breakdown(sym, as_of_date="2025-07-15")
        assert len(breakdown["promoter_group"]) == 1, "Must only return latest quarter promoters without duplication"
        assert len(breakdown["major_shareholders"]) == 1, "Must only return latest quarter major holders without duplication"
        assert breakdown["promoter_group"][0]["quarter"] == "Q1 FY26"
        assert breakdown["promoter_pct_t"] == 55.0
        # Target T-180 from 2025-07-15 is 2025-01-16 -> Q3 FY25 (48.0%), not oldest Q2 FY25 (45.0%)
        assert breakdown["promoter_pct_180"] == 48.0
    finally:
        db.query(LargeShareholdersRegistry).filter(LargeShareholdersRegistry.symbol == sym).delete()
        db.query(ShareholdingSummary).filter(ShareholdingSummary.symbol == sym).delete()
        db.query(ClientIdentityMaster).filter(ClientIdentityMaster.client_pan == pan).delete()
        db.commit()
        db.close()


def test_summary_and_detail_resolve_early_dates_consistently():
    svc = EODSurveillanceService()
    avail = svc.get_available_trading_dates()
    assert avail, "Expected trading dates in sandbox DB"

    # 1. Pre-archive date clamps to avail[-1] (1 session < 20 required) consistently
    assert svc.get_scrips_summary(as_of_date="1999-01-01") == []
    with pytest.raises(ValueError, match="Only 1 trading days available"):
        svc.get_scrip_detail("OCCL", as_of_date="1999-01-01")

    # 2. Weekend date ("2025-06-08" Sunday) snaps identically to prior Friday ("2025-06-06")
    summary_sun = {s["symbol"]: s for s in svc.get_scrips_summary(as_of_date="2025-06-08")}
    summary_fri = {s["symbol"]: s for s in svc.get_scrips_summary(as_of_date="2025-06-06")}
    assert "OCCL" in summary_sun and summary_sun["OCCL"]["risk_score"] == summary_fri["OCCL"]["risk_score"]
    detail_sun = svc.get_scrip_detail("OCCL", as_of_date="2025-06-08")
    assert detail_sun["history"][-1]["date"] == "2025-06-06"
    assert round(detail_sun["metrics"]["final_score"], 2) == summary_sun["OCCL"]["risk_score"]

    # 3. Future date clamps identically to latest trading date avail[0]
    summary_fut = {s["symbol"]: s for s in svc.get_scrips_summary(as_of_date="2099-01-01")}
    summary_lat = {s["symbol"]: s for s in svc.get_scrips_summary(as_of_date=avail[0])}
    assert summary_fut == summary_lat
    first_sym = avail[0] and list(summary_fut.keys())[0]
    detail_fut = svc.get_scrip_detail(first_sym, as_of_date="2099-01-01")
    detail_lat = svc.get_scrip_detail(first_sym, as_of_date=avail[0])
    assert detail_fut["history"][-1]["date"] == detail_lat["history"][-1]["date"]
    assert round(detail_fut["metrics"]["final_score"], 2) == summary_fut[first_sym]["risk_score"]


def test_trade_matches_exchange_filter_and_audit_logs_rbac():
    from fastapi.testclient import TestClient
    from backend.main import app

    client = TestClient(app)

    def _tok(username: str, password: str) -> dict:
        r = client.post("/api/v1/auth/login", json={"username": username, "password": password})
        assert r.status_code == 200, f"Login failed for {username}: {r.text}"
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    viewer_hdr = _tok("guest_viewer", "guest123")
    analyst_hdr = _tok("arao_analyst", "arao123")
    admin_hdr = _tok("vishesh_admin", "vishesh123")

    assert client.get("/api/v1/auth/audit-logs", headers=viewer_hdr).status_code == 403
    assert client.get("/api/v1/auth/audit-logs", headers=analyst_hdr).status_code == 200
    assert client.get("/api/v1/auth/audit-logs", headers=admin_hdr).status_code == 200

    bse_res = client.get("/api/v1/trades/?symbol=OCCL&exchange=BSE", headers=analyst_hdr)
    assert bse_res.status_code == 200
    assert bse_res.json()["data"] == []
    assert bse_res.json()["pagination"]["total"] == 0


def test_excel_custom_weights_and_corporate_actions():
    import openpyxl
    from backend.services.excel_exporter import build_surveillance_dossier_excel

    detail = {
        "ticker": "CUSTOMW",
        "symbol": "CUSTOMW",
        "company": "Custom Weights Corp",
        "isin": "INE000A01010",
        "risk": "High",
        "status": "Open",
        "threshold": 60,
        "summary": {
            "start_price": 100.0,
            "latest_close": 200.0,
            "price_change_pct": 100.0,
            "avg_15d_volume": 50000,
        },
        "metrics": {
            "price_rise_pct": 120.0,
            "price_z": 2.5,
            "volume_z": 1.0,
            "band_hit_days": 2,
            "new_high_days": 2,
            "price_rise_score": 3,
            "price_z_score": 3,
            "volume_z_score": 0,
            "band_score": 0,
            "new_high_score": 1,
            "final_score": 44.0,
        },
        "score_breakdown": [
            {"label": "Price Rise", "score": 3, "weight": 40, "contribution": 24.0},
            {"label": "Price Z", "score": 3, "weight": 30, "contribution": 18.0},
            {"label": "Volume Z", "score": 0, "weight": 10, "contribution": 0.0},
            {"label": "Band Persistence", "score": 0, "weight": 10, "contribution": 0.0},
            {"label": "180 Day New High", "score": 1, "weight": 10, "contribution": 2.0},
        ],
        "history": [],
        "shareholders": {},
    }
    corp_actions = [
        {
            "id": 1,
            "symbol": "CUSTOMW",
            "category": "SPLIT",
            "purpose": "Sub-division 1:2",
            "record_date": "2025-05-01",
            "ex_date": "2025-05-01",
            "ratio_value": "1:2",
            "dilution_factor": 0.5,
        }
    ]
    buf = build_surveillance_dossier_excel(
        detail,
        corp_actions=corp_actions,
        selected_date="2025-06-11",
        window_days=15,
    )
    wb = openpyxl.load_workbook(buf)
    ws1 = wb["Executive_Scorecard"]
    # Verify custom weights and formula scaling (E = weight fraction, F = =D{row}*(E{row}*20))
    wt_cells = [ws1.cell(row=r, column=5).value for r in range(15, 22)]
    assert 0.4 in wt_cells and 0.3 in wt_cells
    f_cells = [str(ws1.cell(row=r, column=6).value) for r in range(15, 22)]
    assert any("*(E" in f and "*20)" in f for f in f_cells)

    ws4 = wb["Corporate_Actions"]
    assert ws4.cell(row=7, column=1).value == "2025-05-01"
    assert ws4.cell(row=7, column=3).value == "SPLIT"
    assert ws4.cell(row=7, column=4).value == "Sub-division 1:2"
    assert ws4.cell(row=7, column=5).value == "1:2"
    assert ws4.cell(row=7, column=6).value == "0.50x"


def test_get_scrip_participants_slices_window_when_as_of_date_none():
    svc = object.__new__(EODSurveillanceService)
    svc.config = SurveillanceConfig(recent_days=2)
    from pv_alert_surveillance import SurveillanceEngine
    from backend.services.market_calendar_service import MarketCalendarService
    svc.engine = SurveillanceEngine(svc.config)
    svc.calendar = MarketCalendarService()

    svc.current_df = _make_ohlcv("WINPART", days=4, start_price=100.0)
    svc.current_df["Volume"] = 1000
    svc.current_trades_df = pd.DataFrame([
        # Out-of-window day 1 (should be excluded even when as_of_date=None)
        {"Ticker": "WINPART", "Date": date(2025, 1, 1), "PAN": "PAN_OLD", "ClientName": "Old Trader", "BuyVolume": 900, "SellVolume": 0, "BuyValue": 90000.0, "SellValue": 0.0, "RealizedPnL": 0.0, "LTPContribution": 10.0, "PosContVal": 10.0, "NegContVal": 0.0, "CounterpartyPAN": "UNKNOWN"},
        # In-window days 3 & 4 (trailing 2 days)
        {"Ticker": "WINPART", "Date": date(2025, 1, 3), "PAN": "PAN_NEW", "ClientName": "Recent Trader", "BuyVolume": 400, "SellVolume": 0, "BuyValue": 40000.0, "SellValue": 0.0, "RealizedPnL": 0.0, "LTPContribution": 2.0, "PosContVal": 2.0, "NegContVal": 0.0, "CounterpartyPAN": "UNKNOWN"},
        {"Ticker": "WINPART", "Date": date(2025, 1, 4), "PAN": "PAN_NEW", "ClientName": "Recent Trader", "BuyVolume": 600, "SellVolume": 0, "BuyValue": 60000.0, "SellValue": 0.0, "RealizedPnL": 0.0, "LTPContribution": 3.0, "PosContVal": 3.0, "NegContVal": 0.0, "CounterpartyPAN": "UNKNOWN"},
    ])
    svc.current_pairs_df = pd.DataFrame([
        {"symbol": "WINPART", "trade_date": date(2025, 1, 1), "buyer_pan": "PAN_OLD", "seller_pan": "PAN_OTHER", "buyer_legal_name": "Old", "seller_legal_name": "Other", "matched_quantity": 500, "matched_turnover_value": 50000, "is_same_broker_wash": False},
        {"symbol": "WINPART", "trade_date": date(2025, 1, 4), "buyer_pan": "PAN_NEW", "seller_pan": "PAN_OTHER", "buyer_legal_name": "Recent", "seller_legal_name": "Other", "matched_quantity": 250, "matched_turnover_value": 25000, "is_same_broker_wash": False},
    ])

    res = svc.get_scrip_participants("WINPART", as_of_date=None, window_days=2)
    vol_pans = {v["participant"] for v in res["volume_share"]}
    assert "PAN_NEW" in vol_pans
    assert "PAN_OLD" not in vol_pans, "Out-of-window trades leaked when as_of_date=None"
    assert len(res["counterparty_pairs"]) == 1
    assert res["counterparty_pairs"][0]["volume"] == 250
    assert {res["counterparty_pairs"][0]["pan1"], res["counterparty_pairs"][0]["pan2"]} == {"PAN_NEW", "PAN_OTHER"}


def test_shareholding_breakdown_sums_multiple_rows_per_quarter():
    sym = "TEST_SH_SUM"
    db = SessionLocal()
    try:
        db.add_all([
            ShareholdingSummary(
                symbol=sym,
                quarter_code="Q1FY26",
                filing_date=date(2025, 6, 15),
                category_type="PROMOTER_INDIAN",
                holding_percentage=30.0,
                pledged_shares_percentage=5.0,
                total_shares_count=3000,
            ),
            ShareholdingSummary(
                symbol=sym,
                quarter_code="Q1FY26",
                filing_date=date(2025, 6, 15),
                category_type="PROMOTER_FOREIGN",
                holding_percentage=22.5,
                pledged_shares_percentage=2.5,
                total_shares_count=2250,
            ),
            ShareholdingSummary(
                symbol=sym,
                quarter_code="Q1FY26",
                filing_date=date(2025, 6, 15),
                category_type="PUBLIC_INST",
                holding_percentage=47.5,
                pledged_shares_percentage=0.0,
                total_shares_count=4750,
            ),
        ])
        db.commit()

        svc = EODSurveillanceService()
        breakdown = svc.get_scrip_shareholding_breakdown(sym, as_of_date="2025-07-01")
        assert len(breakdown["quarterly_history"]) == 1
        q = breakdown["quarterly_history"][0]
        assert q["promoter_pct"] == pytest.approx(52.5, abs=0.01)
        assert q["pledged_pct"] == pytest.approx(7.5, abs=0.01)
        assert q["public_pct"] == pytest.approx(47.5, abs=0.01)
    finally:
        db.query(ShareholdingSummary).filter(ShareholdingSummary.symbol == sym).delete()
        db.commit()
        db.close()


def test_export_excel_resolves_observation_date_when_omitted():
    from fastapi.testclient import TestClient
    from backend.main import app

    client = TestClient(app)
    r = client.post("/api/v1/auth/login", json={"username": "guest_viewer", "password": "guest123"})
    assert r.status_code == 200
    tok = r.json()["access_token"]
    resp = client.get(
        "/api/v1/surveillance/scrip/OCCL/export-excel?window_days=15",
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert resp.status_code == 200
    disp = resp.headers.get("content-disposition", "")
    assert "PVASF_Surveillance_OCCL_" in disp
    assert "_EOD.xlsx" not in disp


def test_ltp_contribution_summary_and_spec_movement_pct():
    svc = EODSurveillanceService()
    res = svc.get_scrip_participants("SKMEGGPROD")
    assert res["ticker"] == "SKMEGGPROD"
    assert res["scrip_15d_price_change"] == pytest.approx(213.65, abs=0.05)
    assert res["total_market_pos_ltp"] == pytest.approx(1016.05, abs=0.05)
    assert res["total_market_neg_ltp"] == pytest.approx(958.60, abs=0.05)
    assert res["total_trades_count"] == 1770

    assert len(res["pos_ltp_contributors"]) >= 1
    top_pos = res["pos_ltp_contributors"][0]
    assert top_pos["participant"] == "ABNPP8622K"
    assert top_pos["pos_val"] == pytest.approx(31.40, abs=0.01)
    # Spec formula: 31.40 / 213.65 = 14.70%
    assert top_pos["scrip_movement_contribution_pct"] == pytest.approx(14.70, abs=0.05)
    # Market push share: 31.40 / 1016.05 = 3.09%
    assert top_pos["contribution"] == pytest.approx(3.09, abs=0.05)

    assert len(res["neg_ltp_contributors"]) >= 1
    top_neg = res["neg_ltp_contributors"][0]
    assert top_neg["participant"] == "ABNPP8622K"
    assert top_neg["neg_val"] == pytest.approx(32.25, abs=0.01)
    # Spec formula: 32.25 / 213.65 = 15.09%
    assert top_neg["scrip_movement_contribution_pct"] == pytest.approx(15.09, abs=0.05)
    # Market pull share: 32.25 / 958.60 = 3.36%
    assert top_neg["contribution"] == pytest.approx(3.36, abs=0.05)





