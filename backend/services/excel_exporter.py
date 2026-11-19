import io
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side





# ── Typography & Palette (Institutional / Bloomberg-grade) ──
FONT_NAME = "Calibri"

FONT_TITLE = Font(name=FONT_NAME, size=13, bold=True, color="FFFFFF")
FONT_SUBTITLE = Font(name=FONT_NAME, size=9.5, italic=True, color="94A3B8")
FONT_SEC_HEADER = Font(name=FONT_NAME, size=10.5, bold=True, color="0F172A")
FONT_TH = Font(name=FONT_NAME, size=9.5, bold=True, color="FFFFFF")
FONT_BOLD = Font(name=FONT_NAME, size=9.5, bold=True, color="0F172A")
FONT_REGULAR = Font(name=FONT_NAME, size=9.5, color="1E293B")
FONT_MUTED = Font(name=FONT_NAME, size=8.5, color="64748B")

FONT_KPI_VAL = Font(name=FONT_NAME, size=14, bold=True, color="0F172A")
FONT_KPI_LBL = Font(name=FONT_NAME, size=8.5, bold=True, color="475569")

# Soft, refined fills (no harsh saturated colors)
FILL_NAVY = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
FILL_TH = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
FILL_SUBHEADER = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
FILL_ZEBRA = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
FILL_CARD = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
FILL_WHITE = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

FILL_ALERT_RED = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
FONT_ALERT_RED = Font(name=FONT_NAME, size=9.0, bold=True, color="991B1B")

FILL_ALERT_AMBER = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
FONT_ALERT_AMBER = Font(name=FONT_NAME, size=9.0, bold=True, color="92400E")

FILL_ALERT_GREEN = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
FONT_ALERT_GREEN = Font(name=FONT_NAME, size=9.0, bold=True, color="166534")

BORDER_SUBTLE = Side(border_style="thin", color="E2E8F0")
BORDER_CELL = Border(left=BORDER_SUBTLE, right=BORDER_SUBTLE, top=BORDER_SUBTLE, bottom=BORDER_SUBTLE)
BORDER_TOP_DOUBLE = Border(top=Side(border_style="thin", color="CBD5E1"), bottom=Side(border_style="double", color="1E293B"))

ALIGN_LEFT = Alignment(horizontal="left", vertical="center")
ALIGN_RIGHT = Alignment(horizontal="right", vertical="center")
ALIGN_CENTER = Alignment(horizontal="center", vertical="center")

# Number formats
FMT_CURRENCY = "₹#,##0.00"
FMT_PERCENT = "0.00%"
FMT_INT = "#,##0"
FMT_DECIMAL = "0.00"
FMT_DATE = "YYYY-MM-DD"


def _format_sheet(ws, explicit_widths: Dict[str, float]):
    """Enforces visible gridlines and sets human-friendly column widths."""
    ws.views.sheetView[0].showGridLines = True
    for col_letter, width in explicit_widths.items():
        ws.column_dimensions[col_letter].width = width


def _raw_score_price(pct: float) -> int:
    if pct > 150: return 5
    if pct > 75: return 3
    if pct >= 15: return 1
    return 0

def _raw_score_z(z: float) -> int:
    if z >= 3.09: return 5
    if z >= 2.33: return 3
    if z >= 1.645: return 1
    return 0

def _raw_score_band(d: int) -> int:
    if d >= 10: return 5
    if d >= 6: return 3
    if d >= 3: return 1
    return 0

def _raw_score_high(d: int) -> int:
    if d >= 10: return 5
    if d >= 5: return 3
    if d >= 1: return 1
    return 0


def build_surveillance_dossier_excel(
    detail: Dict[str, Any],
    participants: Optional[Dict[str, Any]] = None,
    sh_breakdown: Optional[Dict[str, Any]] = None,
    corp_actions: Optional[List[Dict[str, Any]]] = None,
    selected_date: str = "",
    window_days: int = 15,
    exchange: str = "ALL"
) -> io.BytesIO:
    """
    Builds an executive-ready, institutional Excel workbook with Title Case formatting,
    exact mathematical scoring (out of 100), native Excel formulas, freeze panes,
    and balanced column proportions.
    """
    wb = openpyxl.Workbook()
    default_sheet = wb.active

    symbol = (detail.get("symbol") or detail.get("ticker") or detail.get("scrip") or "SCRIP").upper()
    
    # Resolve real company name and ISIN
    raw_company = detail.get("company")
    raw_isin = detail.get("isin")
    if not raw_company or not raw_isin or raw_company.upper() == symbol or raw_isin == "N/A":
        try:
            from backend.db.database import SessionLocal
            from backend.db.models import DailyMarketEod
            _db = SessionLocal()
            row = _db.query(DailyMarketEod.company_name, DailyMarketEod.isin).filter(
                DailyMarketEod.symbol == symbol
            ).first()
            if row:
                if not raw_company or raw_company.upper() == symbol:
                    raw_company = row[0]
                if not raw_isin or raw_isin == "N/A":
                    raw_isin = row[1]
            _db.close()
        except Exception:
            pass

    company = raw_company or f"{symbol.title()} Ltd"
    isin = raw_isin if raw_isin and raw_isin != "N/A" else "—"

    metrics = detail.get("metrics") or {}
    summary = detail.get("summary") or {}
    history = detail.get("history") or []
    
    raw_risk = detail.get("risk") or "Low"
    risk_title = raw_risk.title()

    raw_status = detail.get("status") or "Active"
    status_title = "Active Surveillance" if raw_status.lower() in ["active", "open"] else "Surveillance Resolved"

    raw_final_score = metrics.get("final_score", metrics.get("pvasf_score", 0.0))
    final_score = float(raw_final_score)

    as_of_date = selected_date or datetime.now().strftime("%Y-%m-%d")
    gen_time = datetime.now().strftime("%Y-%m-%d %H:%M UTC")

    # Resolve exchange scope description
    if exchange == "NSE":
        exch_desc = "NSE (National Stock Exchange)"
    elif exchange == "BSE":
        exch_desc = "BSE (Bombay Stock Exchange)"
    else:
        exch_desc = "Consolidated (NSE & BSE)"

    # ════════════════════════════════════════════════════════════════════════
    # SHEET 1: EXECUTIVE SCORECARD
    # ════════════════════════════════════════════════════════════════════════
    ws1 = wb.create_sheet(title="Executive_Scorecard")
    ws1.sheet_properties.tabColor = "1E293B"  # Navy tab
    ws1.freeze_panes = "A5"
    ws1.row_dimensions[1].height = 30
    ws1.row_dimensions[2].height = 18

    # Title Banner (Clean Title Case)
    ws1.merge_cells("A1:F1")
    t1 = ws1["A1"]
    t1.value = f"Market Surveillance Report: {company} ({symbol})"
    t1.font = FONT_TITLE
    t1.fill = FILL_NAVY
    t1.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    ws1.merge_cells("A2:F2")
    sub1 = ws1["A2"]
    sub1.value = f"Price-Volume Alert Surveillance Framework (PVASF)  ·  As of: {as_of_date}  ·  Generated: {gen_time}  ·  Confidential"
    sub1.font = FONT_SUBTITLE
    sub1.fill = FILL_NAVY
    sub1.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    # Section 1: Case & Security Profile
    ws1.row_dimensions[4].height = 20
    ws1.merge_cells("A4:F4")
    s1_hdr = ws1["A4"]
    s1_hdr.value = "1. Case & Security Profile"
    s1_hdr.font = FONT_SEC_HEADER
    s1_hdr.fill = FILL_SUBHEADER
    s1_hdr.alignment = ALIGN_LEFT

    meta_rows = [
        ("Company Name", company, "Observation Date", as_of_date, "Surveillance Status", status_title),
        ("Ticker Symbol", symbol, "Analysis Window", f"{window_days} Trading Days", "Case Reference", f"PVASF-{symbol}-{as_of_date.replace('-', '')}"),
        ("ISIN Code", isin, "Exchange Scope", exch_desc, "Report Timestamp", gen_time),
    ]
    cur_row = 5
    for r in meta_rows:
        ws1.row_dimensions[cur_row].height = 19
        for pair_idx, (col_lbl, col_val) in enumerate([(1, 2), (3, 4), (5, 6)]):
            lbl_text = r[pair_idx * 2]
            val_text = r[pair_idx * 2 + 1]

            c_lbl = ws1.cell(row=cur_row, column=col_lbl, value=lbl_text)
            c_lbl.font = FONT_BOLD
            c_lbl.fill = FILL_ZEBRA
            c_lbl.border = BORDER_CELL
            c_lbl.alignment = ALIGN_LEFT

            c_val = ws1.cell(row=cur_row, column=col_val, value=val_text)
            c_val.font = FONT_REGULAR
            c_val.border = BORDER_CELL
            c_val.alignment = ALIGN_LEFT
        cur_row += 1

    # Section 2: Executive Surveillance Summary
    cur_row = 9
    ws1.row_dimensions[cur_row].height = 20
    ws1.merge_cells(f"A{cur_row}:F{cur_row}")
    s2_hdr = ws1[f"A{cur_row}"]
    s2_hdr.value = "2. Executive Surveillance Summary"
    s2_hdr.font = FONT_SEC_HEADER
    s2_hdr.fill = FILL_SUBHEADER
    s2_hdr.alignment = ALIGN_LEFT

    cur_row = 10
    kpi_labels = ["Current Close", "6M Return (C-C)", f"{window_days}D Avg Volume", "Upper Circuit Hits", "Composite Score", "Surveillance Tier"]
    latest_close = float(summary.get("latest_close", detail.get("close", 0.0)))
    ret_pct = float(summary.get("price_change_pct", metrics.get("price_rise_pct", 0.0)))
    avg_vol = int(summary.get("avg_15d_volume", 0))
    band_hits = int(metrics.get("band_hit_days", 0))

    ws1.row_dimensions[cur_row].height = 20
    for c_idx, lbl in enumerate(kpi_labels, start=1):
        c = ws1.cell(row=cur_row, column=c_idx, value=lbl)
        c.font = FONT_TH
        c.fill = FILL_TH
        c.border = BORDER_CELL
        c.alignment = ALIGN_CENTER

    cur_row = 11
    ws1.row_dimensions[cur_row].height = 20
    c1 = ws1.cell(row=cur_row, column=1, value=latest_close)
    c1.font = FONT_BOLD
    c1.alignment = ALIGN_CENTER
    c1.number_format = FMT_CURRENCY
    c1.border = BORDER_CELL

    c2 = ws1.cell(row=cur_row, column=2, value=ret_pct / 100.0)
    c2.font = FONT_BOLD
    c2.alignment = ALIGN_CENTER
    c2.number_format = FMT_PERCENT
    c2.border = BORDER_CELL

    c3 = ws1.cell(row=cur_row, column=3, value=avg_vol)
    c3.font = FONT_BOLD
    c3.alignment = ALIGN_CENTER
    c3.number_format = FMT_INT
    c3.border = BORDER_CELL

    c4 = ws1.cell(row=cur_row, column=4, value=f"{band_hits} Sessions")
    c4.font = FONT_BOLD
    c4.alignment = ALIGN_CENTER
    c4.border = BORDER_CELL

    score_display = f"{final_score:.1f} / 100"
    c5 = ws1.cell(row=cur_row, column=5, value=score_display)
    c5.font = FONT_BOLD
    c5.alignment = ALIGN_CENTER
    c5.border = BORDER_CELL

    c6 = ws1.cell(row=cur_row, column=6, value=f"{risk_title} Risk")
    c6.font = FONT_BOLD
    c6.alignment = ALIGN_CENTER
    c6.border = BORDER_CELL
    if risk_title.lower() == "high":
        c6.fill = FILL_ALERT_RED
        c6.font = FONT_ALERT_RED
    elif risk_title.lower() == "medium":
        c6.fill = FILL_ALERT_AMBER
        c6.font = FONT_ALERT_AMBER
    else:
        c6.fill = FILL_ALERT_GREEN
        c6.font = FONT_ALERT_GREEN

    # Section 3: Quantitative Anomaly Scoring Matrix
    cur_row = 13
    ws1.row_dimensions[cur_row].height = 20
    ws1.merge_cells(f"A{cur_row}:F{cur_row}")
    s3_hdr = ws1[f"A{cur_row}"]
    s3_hdr.value = "3. Quantitative Anomaly Scoring Matrix"
    s3_hdr.font = FONT_SEC_HEADER
    s3_hdr.fill = FILL_SUBHEADER
    s3_hdr.alignment = ALIGN_LEFT

    cur_row = 14
    headers_score = ["Parameter", "Description", "Observed Value", "Score (0–5)", "Model Weight", "Weighted Score"]
    ws1.row_dimensions[cur_row].height = 20
    for c_idx, h in enumerate(headers_score, start=1):
        cell = ws1.cell(row=cur_row, column=c_idx, value=h)
        cell.font = FONT_TH
        cell.fill = FILL_TH
        cell.border = BORDER_CELL
        cell.alignment = ALIGN_RIGHT if c_idx >= 3 else ALIGN_LEFT
        cell = ws1.cell(row=cur_row, column=c_idx, value=h)
        cell.font = FONT_TH
        cell.fill = FILL_TH
        cell.border = BORDER_CELL
        cell.alignment = ALIGN_RIGHT if c_idx >= 3 else ALIGN_LEFT

    s_price = int(metrics.get("price_rise_score", _raw_score_price(float(metrics.get("price_rise_pct", 0.0)))))
    s_pz = int(metrics.get("price_z_score", _raw_score_z(float(metrics.get("price_z", 0.0)))))
    s_vz = int(metrics.get("volume_z_score", _raw_score_z(float(metrics.get("volume_z", 0.0)))))
    s_band = int(metrics.get("band_score", _raw_score_band(int(metrics.get("band_hit_days", 0)))))
    s_high = int(metrics.get("new_high_score", _raw_score_high(int(metrics.get("new_high_days", 0)))))

    sb_map = {
        str(item.get("label")): item
        for item in (detail.get("score_breakdown") or [])
        if isinstance(item, dict) and item.get("label")
    }
    def _wt_pct(label: str) -> float:
        return float(sb_map.get(label, {}).get("weight", 20.0))

    matrix_rows = [
        ("1. Price Rise %", "Peak high % over T-180 close", f"{float(metrics.get('price_rise_pct', 0.0)):.2f}%", s_price, _wt_pct("Price Rise") / 100.0),
        ("2. Return Z-Score", "Daily return deviation vs 180D baseline volatility", f"{float(metrics.get('price_z', 0.0)):.2f}σ", s_pz, _wt_pct("Price Z") / 100.0),
        ("3. Volume Z-Score", "Volume anomaly deviation vs 180D baseline", f"{float(metrics.get('volume_z', 0.0)):.2f}σ", s_vz, _wt_pct("Volume Z") / 100.0),
        ("4. Upper Circuit Hits", "Sessions touching upper circuit limit (≥90%)", f"{int(metrics.get('band_hit_days', 0))} Sessions", s_band, _wt_pct("Band Persistence") / 100.0),
        ("5. 180D New Highs", "Sessions establishing new 180-day price highs", f"{int(metrics.get('new_high_days', 0))} Sessions", s_high, _wt_pct("180 Day New High") / 100.0),
    ]

    start_score_row = cur_row + 1
    for r in matrix_rows:
        cur_row += 1
        ws1.row_dimensions[cur_row].height = 19
        ws1.cell(row=cur_row, column=1, value=r[0]).font = FONT_REGULAR
        ws1.cell(row=cur_row, column=1).border = BORDER_CELL

        ws1.cell(row=cur_row, column=2, value=r[1]).font = FONT_REGULAR
        ws1.cell(row=cur_row, column=2).border = BORDER_CELL

        c_obs = ws1.cell(row=cur_row, column=3, value=r[2])
        c_obs.font = FONT_BOLD
        c_obs.alignment = ALIGN_RIGHT
        c_obs.border = BORDER_CELL

        c_score = ws1.cell(row=cur_row, column=4, value=r[3])
        c_score.font = FONT_BOLD
        c_score.alignment = ALIGN_CENTER
        c_score.border = BORDER_CELL

        c_wt = ws1.cell(row=cur_row, column=5, value=r[4])
        c_wt.font = FONT_REGULAR
        c_wt.number_format = FMT_PERCENT
        c_wt.alignment = ALIGN_RIGHT
        c_wt.border = BORDER_CELL

        c_cont = ws1.cell(row=cur_row, column=6, value=f"=D{cur_row}*(E{cur_row}*20)")
        c_cont.font = FONT_BOLD
        c_cont.number_format = FMT_DECIMAL
        c_cont.alignment = ALIGN_RIGHT
        c_cont.border = BORDER_CELL

    # Total Score Summary Row
    cur_row += 1
    ws1.row_dimensions[cur_row].height = 20
    ws1.cell(row=cur_row, column=1, value="Total Composite Score").font = FONT_BOLD
    ws1.cell(row=cur_row, column=1).fill = FILL_ZEBRA
    ws1.cell(row=cur_row, column=1).border = BORDER_TOP_DOUBLE

    for c_idx in range(2, 4):
        cell = ws1.cell(row=cur_row, column=c_idx, value="—")
        cell.alignment = ALIGN_CENTER
        cell.font = FONT_BOLD
        cell.fill = FILL_ZEBRA
        cell.border = BORDER_TOP_DOUBLE

    cell_sum_wt = ws1.cell(row=cur_row, column=5, value=f"=SUM(E{start_score_row}:E{cur_row-1})")
    cell_sum_wt.font = FONT_BOLD
    cell_sum_wt.number_format = FMT_PERCENT
    cell_sum_wt.alignment = ALIGN_RIGHT
    cell_sum_wt.fill = FILL_ZEBRA
    cell_sum_wt.border = BORDER_TOP_DOUBLE

    cell_sum_score = ws1.cell(row=cur_row, column=6, value=f"=SUM(F{start_score_row}:F{cur_row-1})")
    cell_sum_score.font = FONT_BOLD
    cell_sum_score.number_format = FMT_DECIMAL
    cell_sum_score.alignment = ALIGN_RIGHT
    cell_sum_score.fill = FILL_ZEBRA
    cell_sum_score.border = BORDER_TOP_DOUBLE

    # Section 4: Surveillance Findings & Regulatory Disposition
    cur_row += 2
    ws1.row_dimensions[cur_row].height = 20
    ws1.merge_cells(f"A{cur_row}:F{cur_row}")
    s4_hdr = ws1[f"A{cur_row}"]
    s4_hdr.value = "4. Surveillance Findings & Case Disposition"
    s4_hdr.font = FONT_SEC_HEADER
    s4_hdr.fill = FILL_SUBHEADER
    s4_hdr.alignment = ALIGN_LEFT

    cur_row += 1
    computed_composite = (
        final_score
        if raw_final_score is not None
        else sum(r[3] * (r[4] * 20.0) for r in matrix_rows)
    )
    narrative_text = (
        f"{company} ({symbol}) was evaluated under the Price-Volume Alert Surveillance Framework (PVASF) "
        f"for observation date {as_of_date} across a {window_days}-day analysis window. The scrip demonstrated an abnormal net price "
        f"rise of +{float(metrics.get('price_rise_pct', 0.0)):.2f}%, accompanied by elevated return volatility (+{float(metrics.get('price_z', 0.0)):.2f}σ) "
        f"and trading volume deviation (+{float(metrics.get('volume_z', 0.0)):.2f}σ) relative to its 180-day baseline. Upper circuit thresholds were "
        f"touched on {int(metrics.get('band_hit_days', 0))} sessions, while {int(metrics.get('new_high_days', 0))} sessions marked new 180-day price highs. "
        f"Composite Alert Score: {computed_composite:.1f} / 100 ({risk_title} Risk). Granular trading activity, shareholding distribution, corporate disclosures, "
        f"and participant concentration records are provided in the subsequent tabs."
    )
    ws1.merge_cells(f"A{cur_row}:F{cur_row+1}")
    ws1.row_dimensions[cur_row].height = 22
    ws1.row_dimensions[cur_row + 1].height = 22
    c_nar = ws1[f"A{cur_row}"]
    c_nar.value = narrative_text
    c_nar.font = FONT_REGULAR
    c_nar.fill = FILL_CARD
    c_nar.alignment = Alignment(wrap_text=True, vertical="center")
    c_nar.border = BORDER_CELL

    _format_sheet(ws1, {"A": 24, "B": 38, "C": 18, "D": 16, "E": 16, "F": 18})

    # ════════════════════════════════════════════════════════════════════════
    # SHEET 2: MARKET DYNAMICS
    # ════════════════════════════════════════════════════════════════════════
    ws2 = wb.create_sheet(title="Market_Dynamics")
    ws2.sheet_properties.tabColor = "2563EB"  # Royal Blue tab
    ws2.freeze_panes = "A15"
    ws2.row_dimensions[1].height = 30
    ws2.merge_cells("A1:I1")
    t2 = ws2["A1"]
    t2.value = f"Market Dynamics & Daily Trading Activity: {company} ({symbol})"
    t2.font = FONT_TITLE
    t2.fill = FILL_NAVY
    t2.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    # Section 1: Core Price & Volume Baseline Parameters
    ws2.row_dimensions[3].height = 20
    ws2.merge_cells("A3:I3")
    s2_p_hdr = ws2["A3"]
    s2_p_hdr.value = "1. Baseline & Evaluation Window Parameters"
    s2_p_hdr.font = FONT_SEC_HEADER
    s2_p_hdr.fill = FILL_SUBHEADER
    s2_p_hdr.alignment = ALIGN_LEFT

    headers_mkt = ["Surveillance Parameter", "Observed Value", "Reference Benchmark", "Statistical Threshold", "Evaluation Horizon", "Parameter Status"]
    ws2.row_dimensions[4].height = 20
    for c_idx, h in enumerate(headers_mkt, start=1):
        cell = ws2.cell(row=4, column=c_idx, value=h)
        cell.font = FONT_TH
        cell.fill = FILL_TH
        cell.border = BORDER_CELL
        cell.alignment = ALIGN_RIGHT if c_idx == 2 else ALIGN_CENTER if c_idx in [4, 5, 6] else ALIGN_LEFT

    start_px = float(summary.get("start_price", 0.0))
    ret_pct = float(metrics.get("price_rise_pct", 0.0))
    pz = float(metrics.get("price_z", 0.0))
    vz = float(metrics.get("volume_z", 0.0))
    band_hits = int(metrics.get("band_hit_days", 0))
    new_highs = int(metrics.get("new_high_days", 0))

    mkt_rows = [
        ("180D Baseline Close", start_px, FMT_CURRENCY, "Base price at T-180", "Baseline Price", "180 Trading Days", "Reference"),
        ("Current Evaluation Close", latest_close, FMT_CURRENCY, "Latest EOD trading close", "Day t Price", "Day t EOD", "Monitored"),
        ("Cumulative Price Return", ret_pct / 100.0, FMT_PERCENT, "T-180 to Day t return", "≥ 15.0% Alert", f"{window_days} Trading Days", "Elevated Return" if ret_pct >= 15.0 else "Normal"),
        ("Daily Return Z-Score", f"{pz:.2f}σ", None, "Return volatility anomaly", "≥ 1.645σ (95% CI)", "180D Rolling Vol", "Statistically Significant" if pz >= 1.645 else "Normal"),
        ("Daily Volume Z-Score", f"{vz:.2f}σ", None, "Volume spike anomaly", "≥ 1.645σ (95% CI)", "180D Rolling Vol", "Volume Surge" if vz >= 1.645 else "Normal"),
        ("Upper Circuit Lock Sessions", band_hits, FMT_INT, "Touching upper price band", "≥ 3 Sessions Alert", f"{window_days} Trading Days", f"{band_hits} Hits" if band_hits >= 3 else "Normal"),
        ("180-Day New High Touches", new_highs, FMT_INT, "Multi-month high record", "≥ 1 Session", f"{window_days} Trading Days", f"{new_highs} Sessions" if new_highs >= 1 else "Normal")
    ]

    for m_idx, (p_name, p_val, p_fmt, p_bench, p_thresh, p_horiz, p_stat) in enumerate(mkt_rows, start=5):
        ws2.row_dimensions[m_idx].height = 19
        z_fill = FILL_WHITE if m_idx % 2 == 1 else FILL_ZEBRA

        ws2.cell(row=m_idx, column=1, value=p_name).font = FONT_BOLD if m_idx in [5, 6] else FONT_REGULAR
        ws2.cell(row=m_idx, column=1).fill = z_fill
        ws2.cell(row=m_idx, column=1).border = BORDER_CELL

        c_v = ws2.cell(row=m_idx, column=2, value=p_val)
        c_v.font = FONT_BOLD
        if p_fmt:
            c_v.number_format = p_fmt
        c_v.fill = z_fill
        c_v.border = BORDER_CELL
        c_v.alignment = ALIGN_RIGHT if isinstance(p_val, (int, float)) else ALIGN_CENTER

        ws2.cell(row=m_idx, column=3, value=p_bench).font = FONT_REGULAR
        ws2.cell(row=m_idx, column=3).fill = z_fill
        ws2.cell(row=m_idx, column=3).border = BORDER_CELL

        ws2.cell(row=m_idx, column=4, value=p_thresh).font = FONT_MUTED
        ws2.cell(row=m_idx, column=4).fill = z_fill
        ws2.cell(row=m_idx, column=4).border = BORDER_CELL
        ws2.cell(row=m_idx, column=4).alignment = ALIGN_CENTER

        ws2.cell(row=m_idx, column=5, value=p_horiz).font = FONT_MUTED
        ws2.cell(row=m_idx, column=5).fill = z_fill
        ws2.cell(row=m_idx, column=5).border = BORDER_CELL
        ws2.cell(row=m_idx, column=5).alignment = ALIGN_CENTER

        c_st = ws2.cell(row=m_idx, column=6, value=p_stat)
        c_st.font = FONT_BOLD if "Surge" in p_stat or "Significant" in p_stat or "Elevated" in p_stat else FONT_REGULAR
        c_st.fill = FILL_ALERT_RED if "Surge" in p_stat else FILL_ALERT_AMBER if ("Significant" in p_stat or "Elevated" in p_stat) else z_fill
        c_st.border = BORDER_CELL
        c_st.alignment = ALIGN_CENTER

    # Section 2: Ledger Table
    r_ledger = 13
    ws2.row_dimensions[r_ledger].height = 20
    ws2.merge_cells(f"A{r_ledger}:I{r_ledger}")
    s2_l_hdr = ws2[f"A{r_ledger}"]
    s2_l_hdr.value = "2. Daily Trading Activity Ledger & Moving Averages"
    s2_l_hdr.font = FONT_SEC_HEADER
    s2_l_hdr.fill = FILL_SUBHEADER
    s2_l_hdr.alignment = ALIGN_LEFT

    r_ledger += 1
    headers_ledger = ["Date", "Close Price", "Open Price", "High Price", "Low Price", "Traded Volume", "20 DMA", "50 DMA", "Upper Circuit Hit"]
    ws2.row_dimensions[r_ledger].height = 20
    for c_idx, h in enumerate(headers_ledger, start=1):
        cell = ws2.cell(row=r_ledger, column=c_idx, value=h)
        cell.font = FONT_TH
        cell.fill = FILL_TH
        cell.border = BORDER_CELL
        cell.alignment = ALIGN_RIGHT if c_idx in [2, 3, 4, 5, 6, 7, 8] else ALIGN_CENTER if c_idx in [1, 9] else ALIGN_LEFT

    window_history = history[-window_days:] if len(history) >= window_days else history
    start_ledger_row = r_ledger + 1
    for idx, p in enumerate(reversed(window_history)):
        r_ledger += 1
        ws2.row_dimensions[r_ledger].height = 19
        zebra_fill = FILL_WHITE if idx % 2 == 0 else FILL_ZEBRA

        close_val = p.get("close")
        open_val = p.get("open")
        high_val = p.get("high")
        low_val = p.get("low")
        vol_val = p.get("volume")
        ma20_val = p.get("ma20")
        ma50_val = p.get("ma50")
        is_band = bool(p.get("is_band_hit") if p.get("is_band_hit") is not None else p.get("band_hit"))

        c_d = ws2.cell(row=r_ledger, column=1, value=p.get("date", ""))
        c_d.font = FONT_REGULAR
        c_d.fill = zebra_fill
        c_d.border = BORDER_CELL
        c_d.alignment = ALIGN_CENTER

        c_c = ws2.cell(row=r_ledger, column=2, value=float(close_val) if close_val is not None else 0.0)
        c_c.font = FONT_BOLD
        c_c.number_format = FMT_CURRENCY
        c_c.fill = zebra_fill
        c_c.border = BORDER_CELL

        c_o = ws2.cell(row=r_ledger, column=3, value=float(open_val) if open_val is not None else 0.0)
        c_o.font = FONT_REGULAR
        c_o.number_format = FMT_CURRENCY
        c_o.fill = zebra_fill
        c_o.border = BORDER_CELL

        c_h = ws2.cell(row=r_ledger, column=4, value=float(high_val) if high_val is not None else 0.0)
        c_h.font = FONT_REGULAR
        c_h.number_format = FMT_CURRENCY
        c_h.fill = zebra_fill
        c_h.border = BORDER_CELL

        c_l = ws2.cell(row=r_ledger, column=5, value=float(low_val) if low_val is not None else 0.0)
        c_l.font = FONT_REGULAR
        c_l.number_format = FMT_CURRENCY
        c_l.fill = zebra_fill
        c_l.border = BORDER_CELL

        c_v = ws2.cell(row=r_ledger, column=6, value=int(vol_val) if vol_val is not None else 0)
        c_v.font = FONT_REGULAR
        c_v.number_format = FMT_INT
        c_v.fill = zebra_fill
        c_v.border = BORDER_CELL

        c_m20 = ws2.cell(row=r_ledger, column=7, value=float(ma20_val) if ma20_val is not None else 0.0)
        c_m20.font = FONT_REGULAR
        c_m20.number_format = FMT_CURRENCY
        c_m20.fill = zebra_fill
        c_m20.border = BORDER_CELL

        c_m50 = ws2.cell(row=r_ledger, column=8, value=float(ma50_val) if ma50_val is not None else 0.0)
        c_m50.font = FONT_REGULAR
        c_m50.number_format = FMT_CURRENCY
        c_m50.fill = zebra_fill
        c_m50.border = BORDER_CELL

        c_bh = ws2.cell(row=r_ledger, column=9, value="Yes" if is_band else "—")
        c_bh.font = FONT_ALERT_AMBER if is_band else FONT_REGULAR
        c_bh.alignment = ALIGN_CENTER
        c_bh.fill = FILL_ALERT_AMBER if is_band else zebra_fill
        c_bh.border = BORDER_CELL

    end_ledger_row = r_ledger
    r_ledger += 1
    ws2.row_dimensions[r_ledger].height = 20
    ws2.cell(row=r_ledger, column=1, value=f"{window_days}-Day Window Summary (Average / Total)").font = FONT_BOLD
    ws2.cell(row=r_ledger, column=1).fill = FILL_SUBHEADER
    ws2.cell(row=r_ledger, column=1).border = BORDER_TOP_DOUBLE

    c_avg_close = ws2.cell(row=r_ledger, column=2, value=f"=AVERAGE(B{start_ledger_row}:B{end_ledger_row})")
    c_avg_close.font = FONT_BOLD
    c_avg_close.number_format = FMT_CURRENCY
    c_avg_close.fill = FILL_SUBHEADER
    c_avg_close.border = BORDER_TOP_DOUBLE

    for c_i in range(3, 6):
        ws2.cell(row=r_ledger, column=c_i, value="—").alignment = ALIGN_CENTER
        ws2.cell(row=r_ledger, column=c_i).fill = FILL_SUBHEADER
        ws2.cell(row=r_ledger, column=c_i).border = BORDER_TOP_DOUBLE

    c_tot_vol = ws2.cell(row=r_ledger, column=6, value=f"=SUM(F{start_ledger_row}:F{end_ledger_row})")
    c_tot_vol.font = FONT_BOLD
    c_tot_vol.number_format = FMT_INT
    c_tot_vol.fill = FILL_SUBHEADER
    c_tot_vol.border = BORDER_TOP_DOUBLE

    for c_i in range(7, 10):
        ws2.cell(row=r_ledger, column=c_i, value="—").alignment = ALIGN_CENTER
        ws2.cell(row=r_ledger, column=c_i).fill = FILL_SUBHEADER
        ws2.cell(row=r_ledger, column=c_i).border = BORDER_TOP_DOUBLE

    _format_sheet(ws2, {"A": 14, "B": 14, "C": 14, "D": 14, "E": 14, "F": 17, "G": 14, "H": 14, "I": 16})

    # ════════════════════════════════════════════════════════════════════════
    # SHEET 3: SHAREHOLDING STRUCTURE
    # ════════════════════════════════════════════════════════════════════════
    ws3 = wb.create_sheet(title="Shareholding_Structure")
    ws3.sheet_properties.tabColor = "7C3AED"  # Purple tab
    ws3.freeze_panes = "A9"
    ws3.row_dimensions[1].height = 30
    ws3.merge_cells("A1:F1")
    t3 = ws3["A1"]
    t3.value = f"Shareholding Pattern & Capital Distribution: {company} ({symbol})"
    t3.font = FONT_TITLE
    t3.fill = FILL_NAVY
    t3.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    # Section 1: Ownership & Trading Concentration Metrics
    sh_stats = detail.get("shareholders") or {}
    ws3.row_dimensions[3].height = 20
    ws3.merge_cells("A3:F3")
    s3_kpi_hdr = ws3["A3"]
    s3_kpi_hdr.value = "1. Ownership & Trading Concentration Metrics"
    s3_kpi_hdr.font = FONT_SEC_HEADER
    s3_kpi_hdr.fill = FILL_SUBHEADER
    s3_kpi_hdr.alignment = ALIGN_LEFT

    headers_d = ["Demographic Parameter", "Observed Value", "Reference Benchmark Context"]
    ws3.row_dimensions[4].height = 20
    ws3.cell(row=4, column=1, value=headers_d[0]).font = FONT_TH
    ws3.cell(row=4, column=1).fill = FILL_TH
    ws3.cell(row=4, column=1).border = BORDER_CELL
    ws3.cell(row=4, column=1).alignment = ALIGN_LEFT

    ws3.cell(row=4, column=2, value=headers_d[1]).font = FONT_TH
    ws3.cell(row=4, column=2).fill = FILL_TH
    ws3.cell(row=4, column=2).border = BORDER_CELL
    ws3.cell(row=4, column=2).alignment = ALIGN_RIGHT

    ws3.merge_cells("C4:F4")
    c_ctx = ws3.cell(row=4, column=3, value=headers_d[2])
    c_ctx.font = FONT_TH
    c_ctx.fill = FILL_TH
    c_ctx.border = BORDER_CELL
    c_ctx.alignment = ALIGN_LEFT

    p_pct = float(sh_breakdown.get("promoter_pct_t", sh_stats.get("promoter_percent", 0.0))) if (sh_breakdown and isinstance(sh_breakdown, dict) and sh_breakdown.get("promoter_pct_t") is not None) else (float(sh_stats.get("promoter_percent", 0.0)) if sh_stats.get("promoter_percent") is not None else None)
    t1_pct = float(sh_breakdown.get("top1_pct_t", sh_stats.get("top_1pct_concentration", 0.0))) if (sh_breakdown and isinstance(sh_breakdown, dict) and sh_breakdown.get("top1_pct_t") is not None) else (float(sh_stats.get("top_1pct_concentration", 0.0)) if sh_stats.get("top_1pct_concentration") is not None else None)

    sh_kpis = [
        ("Unique Holding PANs (Day t)", sh_stats.get("unique_pans_holding_t"), FMT_INT, "Total distinct entity PANs holding equity on observation date"),
        ("Unique Holding PANs (Day T-180)", sh_stats.get("unique_pans_holding_180"), FMT_INT, "Historical benchmark shareholder count at start of evaluation window"),
        (f"Average Trading PANs ({window_days}D)", sh_stats.get("avg_trading_pans_15d"), FMT_INT, "Daily average distinct entity PANs transacting during surveillance window"),
        ("Promoter & Promoter Group Holding %", (p_pct / 100.0) if p_pct is not None else None, FMT_PERCENT, "Equity capital controlled by promoters and promoter group entities"),
        ("Top 1% Shareholder Concentration", (t1_pct / 100.0) if t1_pct is not None else None, FMT_PERCENT, "Proportion of total equity capital held by the top 1 percentile shareholders"),
    ]

    r_d = 4
    for idx, (lbl, val, fmt, ctx) in enumerate(sh_kpis, start=1):
        r_d += 1
        ws3.row_dimensions[r_d].height = 19
        z_fill = FILL_WHITE if idx % 2 == 1 else FILL_ZEBRA

        ws3.cell(row=r_d, column=1, value=lbl).font = FONT_REGULAR
        ws3.cell(row=r_d, column=1).fill = z_fill
        ws3.cell(row=r_d, column=1).border = BORDER_CELL

        c_v = ws3.cell(row=r_d, column=2, value=val if val is not None else "—")
        c_v.font = FONT_BOLD
        if val is not None:
            c_v.number_format = fmt
        c_v.fill = z_fill
        c_v.border = BORDER_CELL
        c_v.alignment = ALIGN_RIGHT if val is not None else ALIGN_CENTER

        ws3.merge_cells(f"C{r_d}:F{r_d}")
        c_c = ws3.cell(row=r_d, column=3, value=ctx)
        c_c.font = FONT_MUTED
        c_c.fill = z_fill
        c_c.border = BORDER_CELL
        c_c.alignment = ALIGN_LEFT

    # Section 2: Capital Distribution by Shareholder Category
    r_cat_hdr = r_d + 2
    ws3.row_dimensions[r_cat_hdr].height = 20
    ws3.merge_cells(f"A{r_cat_hdr}:F{r_cat_hdr}")
    s3_cat_hdr = ws3[f"A{r_cat_hdr}"]
    s3_cat_hdr.value = "2. Capital Distribution by Shareholder Category"
    s3_cat_hdr.font = FONT_SEC_HEADER
    s3_cat_hdr.fill = FILL_SUBHEADER

    r_sh_hdr = r_cat_hdr + 1
    headers_sh = ["Shareholder Category", "Shares Held", "% Holding", "Pledged Shares", "% Pledged", "Filing Horizon"]
    ws3.row_dimensions[r_sh_hdr].height = 20
    for c_idx, h in enumerate(headers_sh, start=1):
        cell = ws3.cell(row=r_sh_hdr, column=c_idx, value=h)
        cell.font = FONT_TH
        cell.fill = FILL_TH
        cell.border = BORDER_CELL
        cell.alignment = ALIGN_RIGHT if c_idx in [2, 3, 4, 5] else ALIGN_LEFT

    promoter_shares = sh_breakdown.get("promoter_shares_t") if (sh_breakdown and isinstance(sh_breakdown, dict)) else None
    has_sh_data = (p_pct is not None and p_pct > 0) or (promoter_shares is not None and promoter_shares > 0)

    if has_sh_data:
        if promoter_shares is not None and p_pct is not None and p_pct > 0:
            total_shares = int(promoter_shares / (p_pct / 100.0))
            public_shares = max(0, total_shares - promoter_shares)
            public_pct_val = round(100.0 - p_pct, 2)
        else:
            total_shares = None
            public_shares = None
            public_pct_val = round(100.0 - p_pct, 2) if p_pct is not None else None

        sh_categories = [
            ("Promoter & Promoter Group", promoter_shares, (p_pct / 100.0) if p_pct is not None else None, 0, 0.0, "Quarterly Filing"),
            ("Public & Non-Promoter", public_shares, (public_pct_val / 100.0) if public_pct_val is not None else None, None, None, "Quarterly Filing"),
        ]

        r_sh = r_sh_hdr
        start_sh_row = r_sh_hdr + 1
        for idx, r in enumerate(sh_categories, start=1):
            r_sh += 1
            ws3.row_dimensions[r_sh].height = 19
            zebra_fill = FILL_WHITE if idx % 2 == 1 else FILL_ZEBRA

            ws3.cell(row=r_sh, column=1, value=r[0]).font = FONT_REGULAR
            ws3.cell(row=r_sh, column=1).fill = zebra_fill
            ws3.cell(row=r_sh, column=1).border = BORDER_CELL

            c_shares = ws3.cell(row=r_sh, column=2, value=r[1] if r[1] is not None else "—")
            c_shares.font = FONT_REGULAR
            if r[1] is not None:
                c_shares.number_format = FMT_INT
            c_shares.fill = zebra_fill
            c_shares.border = BORDER_CELL

            c_pct = ws3.cell(row=r_sh, column=3, value=r[2] if r[2] is not None else "—")
            c_pct.font = FONT_BOLD
            if r[2] is not None:
                c_pct.number_format = FMT_PERCENT
            c_pct.fill = zebra_fill
            c_pct.border = BORDER_CELL

            c_pl = ws3.cell(row=r_sh, column=4, value=r[3] if r[3] is not None else "—")
            c_pl.font = FONT_REGULAR
            if r[3] is not None:
                c_pl.number_format = FMT_INT
            else:
                c_pl.alignment = ALIGN_CENTER
            c_pl.fill = zebra_fill
            c_pl.border = BORDER_CELL

            c_pl_pct = ws3.cell(row=r_sh, column=5, value=r[4] if r[4] is not None else "—")
            c_pl_pct.font = FONT_REGULAR
            if r[4] is not None:
                c_pl_pct.number_format = FMT_PERCENT
            else:
                c_pl_pct.alignment = ALIGN_CENTER
            c_pl_pct.fill = zebra_fill
            c_pl_pct.border = BORDER_CELL

            c_hz = ws3.cell(row=r_sh, column=6, value=r[5])
            c_hz.font = FONT_REGULAR
            c_hz.fill = zebra_fill
            c_hz.border = BORDER_CELL

        end_sh_row = r_sh
        r_sh += 1
        ws3.row_dimensions[r_sh].height = 20
        ws3.cell(row=r_sh, column=1, value="Total Issued Capital").font = FONT_BOLD
        ws3.cell(row=r_sh, column=1).fill = FILL_SUBHEADER
        ws3.cell(row=r_sh, column=1).border = BORDER_TOP_DOUBLE

        if total_shares is not None:
            c_tot_sh = ws3.cell(row=r_sh, column=2, value=f"=SUM(B{start_sh_row}:B{end_sh_row})")
            c_tot_sh.number_format = FMT_INT
        else:
            c_tot_sh = ws3.cell(row=r_sh, column=2, value="—")
        c_tot_sh.font = FONT_BOLD
        c_tot_sh.fill = FILL_SUBHEADER
        c_tot_sh.border = BORDER_TOP_DOUBLE

        c_tot_pct = ws3.cell(row=r_sh, column=3, value=1.0)
        c_tot_pct.font = FONT_BOLD
        c_tot_pct.number_format = FMT_PERCENT
        c_tot_pct.fill = FILL_SUBHEADER
        c_tot_pct.border = BORDER_TOP_DOUBLE

        ws3.cell(row=r_sh, column=4, value="—").alignment = ALIGN_CENTER
        ws3.cell(row=r_sh, column=4).font = FONT_BOLD
        ws3.cell(row=r_sh, column=4).fill = FILL_SUBHEADER
        ws3.cell(row=r_sh, column=4).border = BORDER_TOP_DOUBLE

        ws3.cell(row=r_sh, column=5, value="—").alignment = ALIGN_CENTER
        ws3.cell(row=r_sh, column=5).font = FONT_BOLD
        ws3.cell(row=r_sh, column=5).fill = FILL_SUBHEADER
        ws3.cell(row=r_sh, column=5).border = BORDER_TOP_DOUBLE

        ws3.cell(row=r_sh, column=6, value="Statutory Disclosure Standard").font = FONT_BOLD
        ws3.cell(row=r_sh, column=6).fill = FILL_SUBHEADER
        ws3.cell(row=r_sh, column=6).border = BORDER_TOP_DOUBLE
    else:
        r_sh = r_sh_hdr + 1
        ws3.row_dimensions[r_sh].height = 22
        ws3.merge_cells(f"A{r_sh}:F{r_sh}")
        c_no_sh = ws3[f"A{r_sh}"]
        c_no_sh.value = "No statutory shareholding filing records available for this scrip"
        c_no_sh.font = FONT_MUTED
        c_no_sh.alignment = ALIGN_CENTER
        c_no_sh.fill = FILL_WHITE
        c_no_sh.border = BORDER_CELL
        c_no_sh.border = BORDER_CELL

    # Significant Shareholders Register (>=1%)
    r_major = r_sh + 2
    ws3.row_dimensions[r_major].height = 20
    ws3.merge_cells(f"A{r_major}:E{r_major}")
    s3_maj_hdr = ws3[f"A{r_major}"]
    s3_maj_hdr.value = "3. Significant Shareholders Register (Holdings ≥ 1.00%)"
    s3_maj_hdr.font = FONT_SEC_HEADER
    s3_maj_hdr.fill = FILL_SUBHEADER

    r_major += 1
    headers_major = ["Shareholder Entity Name", "Category", "Shares Held", "% Equity", "Substantial Threshold Flag"]
    ws3.row_dimensions[r_major].height = 20
    for c_idx, h in enumerate(headers_major, start=1):
        cell = ws3.cell(row=r_major, column=c_idx, value=h)
        cell.font = FONT_TH
        cell.fill = FILL_TH
        cell.border = BORDER_CELL
        cell.alignment = ALIGN_RIGHT if c_idx in [3, 4] else ALIGN_CENTER if c_idx == 5 else ALIGN_LEFT

    major_list = sh_breakdown.get("major_shareholders", []) if (sh_breakdown and isinstance(sh_breakdown, dict)) else []
    if not major_list:
        r_major += 1
        ws3.row_dimensions[r_major].height = 20
        ws3.merge_cells(f"A{r_major}:E{r_major}")
        c_empty = ws3[f"A{r_major}"]
        c_empty.value = "Standard institutional holdings recorded under regular disclosure limits."
        c_empty.font = FONT_MUTED
        c_empty.alignment = ALIGN_CENTER
        c_empty.fill = FILL_CARD
        c_empty.border = BORDER_CELL
    else:
        for idx, sh in enumerate(major_list, start=r_major + 1):
            ws3.row_dimensions[idx].height = 19
            pct = float(sh.get("holding_pct", 0.0))
            is_sub = pct >= 5.0
            zebra_fill = FILL_WHITE if idx % 2 == 1 else FILL_ZEBRA

            ws3.cell(row=idx, column=1, value=sh.get("client_name") or sh.get("name") or "Shareholder").font = FONT_REGULAR
            ws3.cell(row=idx, column=1).fill = zebra_fill
            ws3.cell(row=idx, column=1).border = BORDER_CELL

            ws3.cell(row=idx, column=2, value=sh.get("category") or "Public").font = FONT_REGULAR
            ws3.cell(row=idx, column=2).fill = zebra_fill
            ws3.cell(row=idx, column=2).border = BORDER_CELL

            c_sh_held = ws3.cell(row=idx, column=3, value=int(sh.get("shares", 0)))
            c_sh_held.font = FONT_REGULAR
            c_sh_held.number_format = FMT_INT
            c_sh_held.fill = zebra_fill
            c_sh_held.border = BORDER_CELL

            c_sh_pct = ws3.cell(row=idx, column=4, value=pct / 100.0)
            c_sh_pct.font = FONT_BOLD
            c_sh_pct.number_format = FMT_PERCENT
            c_sh_pct.fill = zebra_fill
            c_sh_pct.border = BORDER_CELL

            c_flag = ws3.cell(row=idx, column=5, value="Substantial (≥ 5.0%)" if is_sub else "Standard")
            c_flag.font = FONT_ALERT_RED if is_sub else FONT_REGULAR
            c_flag.fill = FILL_ALERT_RED if is_sub else zebra_fill
            c_flag.alignment = ALIGN_CENTER
            c_flag.border = BORDER_CELL

    _format_sheet(ws3, {"A": 38, "B": 18, "C": 15, "D": 18, "E": 15, "F": 22})

    # ════════════════════════════════════════════════════════════════════════
    # SHEET 4: CORPORATE ACTIONS & ANNOUNCEMENTS
    # ════════════════════════════════════════════════════════════════════════
    ws4 = wb.create_sheet(title="Corporate_Actions")
    ws4.sheet_properties.tabColor = "059669"  # Emerald Green tab
    ws4.freeze_panes = "A7"
    ws4.row_dimensions[1].height = 30
    ws4.merge_cells("A1:F1")
    t4 = ws4["A1"]
    t4.value = f"Corporate Disclosures & Material Filings: {company} ({symbol})"
    t4.font = FONT_TITLE
    t4.fill = FILL_NAVY
    t4.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    ca_list = corp_actions or []
    ann_list = detail.get("announcements", []) or []

    # Section 1: Corporate Actions & Dilution Multipliers
    ws4.row_dimensions[4].height = 20
    ws4.merge_cells("A4:F4")
    s4_ca_hdr = ws4["A4"]
    s4_ca_hdr.value = "1. Corporate Actions & Dilution Multipliers"
    s4_ca_hdr.font = FONT_SEC_HEADER
    s4_ca_hdr.fill = FILL_SUBHEADER
    s4_ca_hdr.alignment = ALIGN_LEFT

    r_ca = 6
    headers_ca = ["Record Date", "Ex-Date", "Category", "Announcement Details / Purpose", "Ratio / Value", "Dilution Factor"]
    ws4.row_dimensions[r_ca].height = 20
    for c_idx, h in enumerate(headers_ca, start=1):
        cell = ws4.cell(row=r_ca, column=c_idx, value=h)
        cell.font = FONT_TH
        cell.fill = FILL_TH
        cell.border = BORDER_CELL
        cell.alignment = ALIGN_CENTER if c_idx in [1, 2, 5, 6] else ALIGN_LEFT

    if not ca_list:
        r_ca += 1
        ws4.row_dimensions[r_ca].height = 20
        ws4.merge_cells(f"A{r_ca}:F{r_ca}")
        for c_idx in range(1, 7):
            cell = ws4.cell(row=r_ca, column=c_idx)
            cell.font = FONT_MUTED
            cell.fill = FILL_WHITE
            cell.border = BORDER_CELL
            if c_idx == 1:
                cell.value = "No corporate actions or capital restructuring events recorded for this scrip."
                cell.alignment = ALIGN_CENTER
        r_ca_end = r_ca
    else:
        for idx, ca in enumerate(ca_list, start=r_ca + 1):
            r_ca_end = idx
            ws4.row_dimensions[idx].height = 20
            zebra_fill = FILL_WHITE if idx % 2 == 1 else FILL_ZEBRA
            dil_val = float(ca.get("dilution_factor") or 1.0)
            is_dilutive = abs(dil_val - 1.0) > 1e-6

            c_rec = ws4.cell(row=idx, column=1, value=ca.get("record_date") or "—")
            c_rec.font = FONT_REGULAR
            c_rec.fill = zebra_fill
            c_rec.border = BORDER_CELL
            c_rec.alignment = ALIGN_CENTER

            c_ex = ws4.cell(row=idx, column=2, value=ca.get("ex_date") or "—")
            c_ex.font = FONT_REGULAR
            c_ex.fill = zebra_fill
            c_ex.border = BORDER_CELL
            c_ex.alignment = ALIGN_CENTER

            c_cat = ws4.cell(row=idx, column=3, value=ca.get("category") or "GENERAL")
            c_cat.font = FONT_BOLD
            c_cat.fill = zebra_fill
            c_cat.border = BORDER_CELL
            c_cat.alignment = ALIGN_LEFT

            c_purp = ws4.cell(row=idx, column=4, value=ca.get("purpose") or "—")
            c_purp.font = FONT_REGULAR
            c_purp.fill = zebra_fill
            c_purp.border = BORDER_CELL
            c_purp.alignment = ALIGN_LEFT

            c_rat = ws4.cell(row=idx, column=5, value=ca.get("ratio_value") or ca.get("bonus_ratio") or "—")
            c_rat.font = FONT_REGULAR
            c_rat.fill = zebra_fill
            c_rat.border = BORDER_CELL
            c_rat.alignment = ALIGN_CENTER

            c_dil = ws4.cell(row=idx, column=6, value=f"{dil_val:.2f}x")
            c_dil.font = FONT_ALERT_AMBER if is_dilutive else FONT_REGULAR
            c_dil.fill = FILL_ALERT_AMBER if is_dilutive else zebra_fill
            c_dil.border = BORDER_CELL
            c_dil.alignment = ALIGN_CENTER

    # Section 2: 15-Day Corporate Announcements
    r_ann_hdr = r_ca_end + 2
    ws4.row_dimensions[r_ann_hdr].height = 20
    ws4.merge_cells(f"A{r_ann_hdr}:F{r_ann_hdr}")
    s4_ann_hdr = ws4[f"A{r_ann_hdr}"]
    s4_ann_hdr.value = "2. Corporate Announcements (15-Day Surveillance Window)"
    s4_ann_hdr.font = FONT_SEC_HEADER
    s4_ann_hdr.fill = FILL_SUBHEADER
    s4_ann_hdr.alignment = ALIGN_LEFT

    r_ann = r_ann_hdr + 1
    headers_ann = ["Announcement Date", "Category", "Filing Subject / Material Purpose", "Verification Status"]
    ws4.row_dimensions[r_ann].height = 20
    ws4.cell(row=r_ann, column=1, value=headers_ann[0]).font = FONT_TH
    ws4.cell(row=r_ann, column=1).fill = FILL_TH
    ws4.cell(row=r_ann, column=1).border = BORDER_CELL
    ws4.cell(row=r_ann, column=1).alignment = ALIGN_CENTER

    ws4.cell(row=r_ann, column=2, value=headers_ann[1]).font = FONT_TH
    ws4.cell(row=r_ann, column=2).fill = FILL_TH
    ws4.cell(row=r_ann, column=2).border = BORDER_CELL
    ws4.cell(row=r_ann, column=2).alignment = ALIGN_LEFT

    ws4.merge_cells(f"C{r_ann}:E{r_ann}")
    for c_i in range(3, 6):
        cell = ws4.cell(row=r_ann, column=c_i)
        cell.font = FONT_TH
        cell.fill = FILL_TH
        cell.border = BORDER_CELL
        if c_i == 3:
            cell.value = headers_ann[2]
            cell.alignment = ALIGN_LEFT

    ws4.cell(row=r_ann, column=6, value=headers_ann[3]).font = FONT_TH
    ws4.cell(row=r_ann, column=6).fill = FILL_TH
    ws4.cell(row=r_ann, column=6).border = BORDER_CELL
    ws4.cell(row=r_ann, column=6).alignment = ALIGN_CENTER

    if not ann_list:
        r_ann += 1
        ws4.row_dimensions[r_ann].height = 20
        ws4.merge_cells(f"A{r_ann}:F{r_ann}")
        for c_i in range(1, 7):
            cell = ws4.cell(row=r_ann, column=c_i)
            cell.font = FONT_MUTED
            cell.fill = FILL_WHITE
            cell.border = BORDER_CELL
            if c_i == 1:
                cell.value = "No corporate announcements filed during the 15-day surveillance window."
                cell.alignment = ALIGN_CENTER
    else:
        for idx, ann in enumerate(ann_list, start=r_ann + 1):
            r_ann_row = idx
            ws4.row_dimensions[r_ann_row].height = 20
            zebra_fill = FILL_WHITE if idx % 2 == 1 else FILL_ZEBRA

            c_d = ws4.cell(row=r_ann_row, column=1, value=ann.get("date") or "—")
            c_d.font = FONT_REGULAR
            c_d.fill = zebra_fill
            c_d.border = BORDER_CELL
            c_d.alignment = ALIGN_CENTER

            c_cat = ws4.cell(row=r_ann_row, column=2, value=ann.get("category") or "GENERAL")
            c_cat.font = FONT_BOLD
            c_cat.fill = zebra_fill
            c_cat.border = BORDER_CELL
            c_cat.alignment = ALIGN_LEFT

            ws4.merge_cells(f"C{r_ann_row}:E{r_ann_row}")
            for c_i in range(3, 6):
                cell = ws4.cell(row=r_ann_row, column=c_i)
                cell.font = FONT_REGULAR
                cell.fill = zebra_fill
                cell.border = BORDER_CELL
                if c_i == 3:
                    cell.value = ann.get("title") or "—"
                    cell.alignment = ALIGN_LEFT

            c_st = ws4.cell(row=r_ann_row, column=6, value=ann.get("status") or "Verified")
            c_st.font = FONT_REGULAR
            c_st.fill = zebra_fill
            c_st.border = BORDER_CELL
            c_st.alignment = ALIGN_CENTER

    _format_sheet(ws4, {"A": 16, "B": 16, "C": 20, "D": 48, "E": 16, "F": 16})

    # ════════════════════════════════════════════════════════════════════════
    # SHEET 5: PARTICIPANT SURVEILLANCE
    # ════════════════════════════════════════════════════════════════════════
    ws5 = wb.create_sheet(title="Participant_Surveillance")
    ws5.sheet_properties.tabColor = "DC2626"  # Rose Red tab
    ws5.freeze_panes = "A5"
    ws5.row_dimensions[1].height = 30
    ws5.merge_cells("A1:E1")
    t5 = ws5["A1"]
    t5.value = f"Participant Surveillance & Integrity Audit: {company} ({symbol})"
    t5.font = FONT_TITLE
    t5.fill = FILL_NAVY
    t5.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    # Top High-Volume Participants Table
    ws5.row_dimensions[3].height = 20
    ws5.merge_cells("A3:E3")
    s5_p_hdr = ws5["A3"]
    s5_p_hdr.value = "1. Concentrated Market Participants (High Volume)"
    s5_p_hdr.font = FONT_SEC_HEADER
    s5_p_hdr.fill = FILL_SUBHEADER

    r_part = 4
    headers_part = ["Entity PAN", "Client / Entity Name", "Traded Volume", "Market Share %", "Surveillance Status"]
    ws5.row_dimensions[r_part].height = 20
    for c_idx, h in enumerate(headers_part, start=1):
        cell = ws5.cell(row=r_part, column=c_idx, value=h)
        cell.font = FONT_TH
        cell.fill = FILL_TH
        cell.border = BORDER_CELL
        cell.alignment = ALIGN_RIGHT if c_idx in [3, 4] else ALIGN_CENTER if c_idx == 5 else ALIGN_LEFT

    volume_share = participants.get("volume_share", []) if (participants and isinstance(participants, dict)) else []
    if not volume_share:
        r_part += 1
        ws5.row_dimensions[r_part].height = 20
        ws5.merge_cells(f"A{r_part}:E{r_part}")
        c_empty = ws5[f"A{r_part}"]
        c_empty.value = "No individual participant exceeded statutory concentration limits during the window."
        c_empty.font = FONT_MUTED
        c_empty.alignment = ALIGN_CENTER
        c_empty.fill = FILL_WHITE
        c_empty.border = BORDER_CELL
    else:
        for idx, client in enumerate(volume_share, start=r_part + 1):
            ws5.row_dimensions[idx].height = 19
            sh_pct = float(client.get("share_pct", 0.0))
            is_alert = sh_pct >= 5.0
            zebra_fill = FILL_WHITE if idx % 2 == 1 else FILL_ZEBRA

            c_pan = ws5.cell(row=idx, column=1, value=client.get("participant", "PAN_UNKNOWN"))
            c_pan.font = FONT_REGULAR
            c_pan.fill = zebra_fill
            c_pan.border = BORDER_CELL
            c_pan.alignment = ALIGN_CENTER

            ws5.cell(row=idx, column=2, value=client.get("name") or "Market Participant").font = FONT_REGULAR
            ws5.cell(row=idx, column=2).fill = zebra_fill
            ws5.cell(row=idx, column=2).border = BORDER_CELL

            c_v = ws5.cell(row=idx, column=3, value=int(client.get("volume", 0)))
            c_v.font = FONT_REGULAR
            c_v.number_format = FMT_INT
            c_v.fill = zebra_fill
            c_v.border = BORDER_CELL

            c_sh = ws5.cell(row=idx, column=4, value=sh_pct / 100.0)
            c_sh.font = FONT_BOLD
            c_sh.number_format = FMT_PERCENT
            c_sh.fill = zebra_fill
            c_sh.border = BORDER_CELL

            c_fl = ws5.cell(row=idx, column=5, value="Alert (≥ 5.0% Volume Share)" if is_alert else "Normal")
            c_fl.font = FONT_ALERT_RED if is_alert else FONT_REGULAR
            c_fl.fill = FILL_ALERT_RED if is_alert else zebra_fill
            c_fl.alignment = ALIGN_CENTER
            c_fl.border = BORDER_CELL

    # Synchronized Counterparty Trade Pairs Table
    r_pairs = r_part + (len(volume_share) if volume_share else 1) + 2
    ws5.row_dimensions[r_pairs].height = 20
    ws5.merge_cells(f"A{r_pairs}:F{r_pairs}")
    s5_pr_hdr = ws5[f"A{r_pairs}"]
    s5_pr_hdr.value = "2. Synchronized & Counterparty Trade Pairs Audit"
    s5_pr_hdr.font = FONT_SEC_HEADER
    s5_pr_hdr.fill = FILL_SUBHEADER

    r_pairs += 1
    headers_pairs = ["Pair Identifier", "Counterparty A (Buyer)", "Counterparty B (Seller)", "Matched Traded Volume", "Pair Market Share %", "Risk Classification"]
    ws5.row_dimensions[r_pairs].height = 20
    for c_idx, h in enumerate(headers_pairs, start=1):
        cell = ws5.cell(row=r_pairs, column=c_idx, value=h)
        cell.font = FONT_TH
        cell.fill = FILL_TH
        cell.border = BORDER_CELL
        cell.alignment = ALIGN_RIGHT if c_idx in [4, 5] else ALIGN_CENTER if c_idx in [1, 6] else ALIGN_LEFT

    counter_pairs = participants.get("counterparty_pairs", []) if (participants and isinstance(participants, dict)) else []
    if not counter_pairs:
        r_pairs += 1
        ws5.row_dimensions[r_pairs].height = 20
        ws5.merge_cells(f"A{r_pairs}:F{r_pairs}")
        c_empty = ws5[f"A{r_pairs}"]
        c_empty.value = "No synchronized bilateral counterparty trading detected during surveillance window."
        c_empty.font = FONT_MUTED
        c_empty.alignment = ALIGN_CENTER
        c_empty.fill = FILL_WHITE
        c_empty.border = BORDER_CELL
    else:
        start_pair_row = r_pairs + 1
        for idx, pair in enumerate(counter_pairs, start=start_pair_row):
            ws5.row_dimensions[idx].height = 19
            sh_pct = float(pair.get("share_pct", 0.0))
            is_synced = sh_pct >= 3.0
            zebra_fill = FILL_WHITE if idx % 2 == 1 else FILL_ZEBRA

            c_p = ws5.cell(row=idx, column=1, value=pair.get("pair", f"PAIR-{idx:03d}"))
            c_p.font = FONT_REGULAR
            c_p.fill = zebra_fill
            c_p.border = BORDER_CELL
            c_p.alignment = ALIGN_CENTER

            ws5.cell(row=idx, column=2, value=pair.get("name1") or pair.get("pan1") or "Counterparty A").font = FONT_REGULAR
            ws5.cell(row=idx, column=2).fill = zebra_fill
            ws5.cell(row=idx, column=2).border = BORDER_CELL

            ws5.cell(row=idx, column=3, value=pair.get("name2") or pair.get("pan2") or "Counterparty B").font = FONT_REGULAR
            ws5.cell(row=idx, column=3).fill = zebra_fill
            ws5.cell(row=idx, column=3).border = BORDER_CELL

            c_mv = ws5.cell(row=idx, column=4, value=int(pair.get("volume", 0)))
            c_mv.font = FONT_BOLD
            c_mv.number_format = FMT_INT
            c_mv.fill = zebra_fill
            c_mv.border = BORDER_CELL

            c_ms = ws5.cell(row=idx, column=5, value=sh_pct / 100.0)
            c_ms.font = FONT_REGULAR
            c_ms.number_format = FMT_PERCENT
            c_ms.fill = zebra_fill
            c_ms.border = BORDER_CELL

            c_rf = ws5.cell(row=idx, column=6, value="Potential Synchronized Trade" if is_synced else "Inspection Clear")
            c_rf.font = FONT_ALERT_AMBER if is_synced else FONT_REGULAR
            c_rf.fill = FILL_ALERT_AMBER if is_synced else zebra_fill
            c_rf.alignment = ALIGN_CENTER
            c_rf.border = BORDER_CELL

        end_pair_row = r_pairs + len(counter_pairs)
        r_pair_tot = end_pair_row + 1
        ws5.row_dimensions[r_pair_tot].height = 20
        ws5.cell(row=r_pair_tot, column=1, value="Total Matched Trade Volume").font = FONT_BOLD
        ws5.cell(row=r_pair_tot, column=1).fill = FILL_SUBHEADER
        ws5.cell(row=r_pair_tot, column=1).border = BORDER_TOP_DOUBLE

        for c_i in range(2, 4):
            ws5.cell(row=r_pair_tot, column=c_i, value="—").alignment = ALIGN_CENTER
            ws5.cell(row=r_pair_tot, column=c_i).fill = FILL_SUBHEADER
            ws5.cell(row=r_pair_tot, column=c_i).border = BORDER_TOP_DOUBLE

        c_tot_pair_vol = ws5.cell(row=r_pair_tot, column=4, value=f"=SUM(D{start_pair_row}:D{end_pair_row})")
        c_tot_pair_vol.font = FONT_BOLD
        c_tot_pair_vol.number_format = FMT_INT
        c_tot_pair_vol.fill = FILL_SUBHEADER
        c_tot_pair_vol.border = BORDER_TOP_DOUBLE

        for c_i in range(5, 7):
            ws5.cell(row=r_pair_tot, column=c_i, value="—").alignment = ALIGN_CENTER
            ws5.cell(row=r_pair_tot, column=c_i).fill = FILL_SUBHEADER
            ws5.cell(row=r_pair_tot, column=c_i).border = BORDER_TOP_DOUBLE

    # Section 3: LTP Contribution — Price Impact Drivers
    r_ltp = (r_pair_tot if counter_pairs else r_pairs) + 2
    ws5.row_dimensions[r_ltp].height = 20
    ws5.merge_cells(f"A{r_ltp}:F{r_ltp}")
    s5_ltp_hdr = ws5[f"A{r_ltp}"]
    s5_ltp_hdr.value = "3. LTP Contribution — Price Impact Drivers"
    s5_ltp_hdr.font = FONT_SEC_HEADER
    s5_ltp_hdr.fill = FILL_SUBHEADER

    r_ltp += 1
    headers_ltp = ["Entity PAN", "Client / Entity Name", "Net LTP Impact (₹)", "Positive Push (₹)", "Negative Pull (₹)", "Price Rise Share %"]
    ws5.row_dimensions[r_ltp].height = 20
    for c_idx, h in enumerate(headers_ltp, start=1):
        cell = ws5.cell(row=r_ltp, column=c_idx, value=h)
        cell.font = FONT_TH
        cell.fill = FILL_TH
        cell.border = BORDER_CELL
        cell.alignment = ALIGN_RIGHT if c_idx in [3, 4, 5, 6] else ALIGN_LEFT

    pos_ltp = participants.get("pos_ltp_contributors", []) if (participants and isinstance(participants, dict)) else []
    neg_ltp = participants.get("neg_ltp_contributors", []) if (participants and isinstance(participants, dict)) else []
    combined_ltp = (pos_ltp[:5] if pos_ltp else []) + (neg_ltp[:5] if neg_ltp else [])

    if not combined_ltp:
        r_ltp += 1
        ws5.row_dimensions[r_ltp].height = 20
        ws5.merge_cells(f"A{r_ltp}:F{r_ltp}")
        c_emp = ws5[f"A{r_ltp}"]
        c_emp.value = "No concentrated LTP price drivers detected in evaluation window."
        c_emp.font = FONT_MUTED
        c_emp.alignment = ALIGN_CENTER
        c_emp.fill = FILL_WHITE
        c_emp.border = BORDER_CELL
    else:
        for idx, ltp in enumerate(combined_ltp, start=r_ltp + 1):
            r_ltp = idx
            ws5.row_dimensions[r_ltp].height = 19
            zebra_fill = FILL_WHITE if idx % 2 == 1 else FILL_ZEBRA
            net_val = float(ltp.get("net_val") or ltp.get("contribution") or 0.0)
            pos_val = float(ltp.get("pos_val") or 0.0)
            neg_val = float(ltp.get("neg_val") or 0.0)
            share_pct = ltp.get("scrip_movement_contribution_pct")

            c_pan = ws5.cell(row=r_ltp, column=1, value=ltp.get("participant", "PAN_UNKNOWN"))
            c_pan.font = FONT_REGULAR
            c_pan.fill = zebra_fill
            c_pan.border = BORDER_CELL
            c_pan.alignment = ALIGN_CENTER

            ws5.cell(row=r_ltp, column=2, value=ltp.get("name") or "Trading Entity").font = FONT_REGULAR
            ws5.cell(row=r_ltp, column=2).fill = zebra_fill
            ws5.cell(row=r_ltp, column=2).border = BORDER_CELL

            c_net = ws5.cell(row=r_ltp, column=3, value=net_val)
            c_net.font = FONT_BOLD
            c_net.number_format = FMT_CURRENCY
            c_net.fill = zebra_fill
            c_net.border = BORDER_CELL

            c_pos = ws5.cell(row=r_ltp, column=4, value=pos_val)
            c_pos.font = FONT_REGULAR
            c_pos.number_format = FMT_CURRENCY
            c_pos.fill = zebra_fill
            c_pos.border = BORDER_CELL

            c_neg = ws5.cell(row=r_ltp, column=5, value=neg_val)
            c_neg.font = FONT_REGULAR
            c_neg.number_format = FMT_CURRENCY
            c_neg.fill = zebra_fill
            c_neg.border = BORDER_CELL

            c_sh = ws5.cell(row=r_ltp, column=6, value=(float(share_pct) / 100.0) if share_pct is not None else "—")
            c_sh.font = FONT_BOLD
            if share_pct is not None:
                c_sh.number_format = FMT_PERCENT
            c_sh.fill = zebra_fill
            c_sh.border = BORDER_CELL

    # Section 4: Realized P&L — Top Trading Beneficiaries
    r_pnl = r_ltp + 2
    ws5.row_dimensions[r_pnl].height = 20
    ws5.merge_cells(f"A{r_pnl}:F{r_pnl}")
    s5_pnl_hdr = ws5[f"A{r_pnl}"]
    s5_pnl_hdr.value = "4. Realized P&L — Top Trading Beneficiaries"
    s5_pnl_hdr.font = FONT_SEC_HEADER
    s5_pnl_hdr.fill = FILL_SUBHEADER

    r_pnl += 1
    headers_pnl = ["Entity PAN", "Client / Entity Name", "Buy Volume", "Sell Volume", "Realized Cash P&L", "Trading Classification"]
    ws5.row_dimensions[r_pnl].height = 20
    for c_idx, h in enumerate(headers_pnl, start=1):
        cell = ws5.cell(row=r_pnl, column=c_idx, value=h)
        cell.font = FONT_TH
        cell.fill = FILL_TH
        cell.border = BORDER_CELL
        cell.alignment = ALIGN_RIGHT if c_idx in [3, 4, 5] else ALIGN_CENTER if c_idx == 6 else ALIGN_LEFT

    profit_makers = participants.get("profit_makers", []) if (participants and isinstance(participants, dict)) else []
    if not profit_makers:
        r_pnl += 1
        ws5.row_dimensions[r_pnl].height = 20
        ws5.merge_cells(f"A{r_pnl}:F{r_pnl}")
        c_emp = ws5[f"A{r_pnl}"]
        c_emp.value = "No closed round-trip profit beneficiaries identified during surveillance window."
        c_emp.font = FONT_MUTED
        c_emp.alignment = ALIGN_CENTER
        c_emp.fill = FILL_WHITE
        c_emp.border = BORDER_CELL
    else:
        for idx, pm in enumerate(profit_makers, start=r_pnl + 1):
            r_pnl = idx
            ws5.row_dimensions[r_pnl].height = 19
            zebra_fill = FILL_WHITE if idx % 2 == 1 else FILL_ZEBRA
            pnl_val = float(pm.get("net_pnl") or 0.0)

            c_pan = ws5.cell(row=r_pnl, column=1, value=pm.get("participant", "PAN_UNKNOWN"))
            c_pan.font = FONT_REGULAR
            c_pan.fill = zebra_fill
            c_pan.border = BORDER_CELL
            c_pan.alignment = ALIGN_CENTER

            ws5.cell(row=r_pnl, column=2, value=pm.get("name") or "Trading Entity").font = FONT_REGULAR
            ws5.cell(row=r_pnl, column=2).fill = zebra_fill
            ws5.cell(row=r_pnl, column=2).border = BORDER_CELL

            c_bv = ws5.cell(row=r_pnl, column=3, value=int(pm.get("buy_volume", 0)))
            c_bv.font = FONT_REGULAR
            c_bv.number_format = FMT_INT
            c_bv.fill = zebra_fill
            c_bv.border = BORDER_CELL

            c_sv = ws5.cell(row=r_pnl, column=4, value=int(pm.get("sell_volume", 0)))
            c_sv.font = FONT_REGULAR
            c_sv.number_format = FMT_INT
            c_sv.fill = zebra_fill
            c_sv.border = BORDER_CELL

            c_pnl = ws5.cell(row=r_pnl, column=5, value=pnl_val)
            c_pnl.font = FONT_BOLD
            c_pnl.number_format = FMT_CURRENCY
            c_pnl.fill = FILL_ALERT_GREEN if pnl_val > 0 else zebra_fill
            c_pnl.border = BORDER_CELL

            c_cls = ws5.cell(row=r_pnl, column=6, value="Net Cash Gainer" if pnl_val > 0 else "Neutral / Breakeven")
            c_cls.font = FONT_BOLD if pnl_val > 0 else FONT_REGULAR
            c_cls.fill = FILL_ALERT_GREEN if pnl_val > 0 else zebra_fill
            c_cls.border = BORDER_CELL
            c_cls.alignment = ALIGN_CENTER

    _format_sheet(ws5, {"A": 22, "B": 28, "C": 22, "D": 20, "E": 22, "F": 26})

    # Clean up workbook default empty sheet
    if default_sheet in wb.worksheets and len(wb.worksheets) > 1:
        wb.remove(default_sheet)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output
