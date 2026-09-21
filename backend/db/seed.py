"""
backend/db/seed.py
────────────────────────────────────────────────────────────────────────────
Deterministic high-fidelity database seeder for PVASF.
Populates all 15 clean relational tables in surveillance.db:
  - 15 symbols with 200+ trading days of historical OHLCV data (>3,000 records)
  - Explicit high-risk surveillance profile for NOVAENERGY (Price Rise >250%, Volume Z >3.5, 8+ circuit hits)
  - Medium-risk surveillance profile for ALPHATECH
  - 13 benchmark/institutional symbols (TCS, RELIANCE, INFY, HDFCBANK, SBIN, etc.)
  - Realistic participant trades, counterparty matched pairs, shareholding patterns, corporate events
  - Default administrative and analyst users (vishesh_admin, arao_analyst, analyst_surv)
"""

from __future__ import annotations

import math
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from backend.db.database import Base, engine, SessionLocal
from backend.db.models import (
    BrokerDailySummary,
    ClientDematAccount,
    ClientIdentityMaster,
    CorporateEventsFeed,
    CounterpartyTradePair,
    DailyMarketEod,
    LargeShareholdersRegistry,
    MarketBaselineStat,
    ParticipantDailyTrade,
    PriceDilutionFactor,
    ShareholdingSummary,
    SurveillanceAlertCase,
    SysAuditLog,
    SysUser,
    TradingSessionCalendar,
)
from backend.security import hash_password

# ── Seed Constants ──────────────────────────────────────────────────────────
OBSERVATION_DATE = date(2026, 8, 27)

SYMBOLS_META = {
    "NOVAENERGY":  {"name": "Nova Energy Ltd",                   "isin": "INE002B01020", "base_price": 540.0,  "profile": "PUMP"},
    "ALPHATECH":   {"name": "Alpha Technologies Ltd",            "isin": "INE001A01010", "base_price": 320.0,  "profile": "RALLY"},
    "ZENITHBIO":   {"name": "Zenith Bio-Tech Ltd",               "isin": "INE003C01030", "base_price": 180.0,  "profile": "NORMAL"},
    "ORBITCEM":    {"name": "Orbit Cement Ltd",                  "isin": "INE004D01040", "base_price": 450.0,  "profile": "NORMAL"},
    "TCS":         {"name": "Tata Consultancy Services Ltd",     "isin": "INE467B01029", "base_price": 3800.0, "profile": "BENCHMARK"},
    "SBIN":        {"name": "State Bank of India",               "isin": "INE062A01020", "base_price": 820.0,  "profile": "BENCHMARK"},
    "ICICIBANK":   {"name": "ICICI Bank Ltd",                    "isin": "INE090A01021", "base_price": 1150.0, "profile": "BENCHMARK"},
    "AXISBANK":    {"name": "Axis Bank Ltd",                     "isin": "INE238A01034", "base_price": 1200.0, "profile": "BENCHMARK"},
    "RELIANCE":    {"name": "Reliance Industries Ltd",           "isin": "INE002A01018", "base_price": 2900.0, "profile": "BENCHMARK"},
    "HDFCBANK":    {"name": "HDFC Bank Ltd",                     "isin": "INE040A01034", "base_price": 1650.0, "profile": "BENCHMARK"},
    "INFY":        {"name": "Infosys Ltd",                       "isin": "INE009A01021", "base_price": 1750.0, "profile": "BENCHMARK"},
    "WIPRO":       {"name": "Wipro Ltd",                         "isin": "INE075A01022", "base_price": 520.0,  "profile": "BENCHMARK"},
    "BAJFINANCE":  {"name": "Bajaj Finance Ltd",                 "isin": "INE296A01024", "base_price": 7100.0, "profile": "BENCHMARK"},
    "MARUTI":      {"name": "Maruti Suzuki India Ltd",           "isin": "INE585B01010", "base_price": 12400.0,"profile": "BENCHMARK"},
    "SUNPHARMA":   {"name": "Sun Pharma Industries Ltd",         "isin": "INE044A01036", "base_price": 1680.0, "profile": "BENCHMARK"},
}

HOLIDAYS = {
    date(2026, 1, 26): "Republic Day",
    date(2026, 3, 6):  "Holi",
    date(2026, 4, 14): "Dr Ambedkar Jayanti",
    date(2026, 5, 1):  "Maharashtra Day",
    date(2026, 8, 15): "Independence Day",
}


def _generate_trading_calendar(start_date: date, end_date: date) -> list[dict]:
    records = []
    curr = start_date
    while curr <= end_date:
        is_weekend = curr.weekday() >= 5
        is_holiday = curr in HOLIDAYS
        is_trading = not (is_weekend or is_holiday)
        h_name = HOLIDAYS.get(curr, "Weekend" if is_weekend else None)
        records.append({
            "calendar_date": curr,
            "is_trading_day": is_trading,
            "holiday_name": h_name,
            "is_special_auction": False
        })
        curr += timedelta(days=1)
    return records


def seed_database(db: Session) -> dict[str, Any]:
    """
    Populates all 15 clean tables with rich deterministic surveillance data.
    """
    # Check if already seeded with full dataset
    existing_eod = db.query(DailyMarketEod).count()
    if existing_eod >= 3000:
        return {"status": "ALREADY_SEEDED", "eod_rows": existing_eod}

    print("[seed] Cleaning and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # ── 1. Users & Audit Logs ───────────────────────────────────────────────
    users = [
        SysUser(
            username="vishesh_admin",
            email="vishesh@surveillance.exchange.org",
            full_name="Vishesh Sanghvi",
            department="Surveillance & Risk Oversight",
            hashed_password=hash_password("vishesh123"),
            role="Admin",
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=365),
        ),
        SysUser(
            username="arao_analyst",
            email="arao@surveillance.exchange.org",
            full_name="Ananya Rao",
            department="Market Conduct Division",
            hashed_password=hash_password("arao123"),
            role="Analyst",
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=200),
        ),
        SysUser(
            username="analyst_surv",
            email="analyst@surveillance.exchange.org",
            full_name="Surveillance Officer",
            department="Trade Investigations",
            hashed_password=hash_password("analyst123"),
            role="Analyst",
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=150),
        ),
        SysUser(
            username="guest_viewer",
            email="viewer@surveillance.exchange.org",
            full_name="Audit Guest",
            department="Compliance Review",
            hashed_password=hash_password("guest123"),
            role="Viewer",
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=30),
        ),
    ]
    db.add_all(users)
    db.flush()

    audit_logs = [
        SysAuditLog(
            timestamp=datetime.utcnow() - timedelta(hours=3),
            username="vishesh_admin",
            role="Admin",
            action="SYSTEM_INIT",
            target="SYSTEM",
            details="Initialised clean PVASF surveillance database schema (15 modular tables).",
            ip_address="127.0.0.1"
        ),
        SysAuditLog(
            timestamp=datetime.utcnow() - timedelta(hours=2),
            username="vishesh_admin",
            role="Admin",
            action="ALERT_GENERATION",
            target="NOVAENERGY",
            details="Automated EOD scoring triggered: Composite Risk Score 28.5 (HIGH).",
            ip_address="127.0.0.1"
        ),
    ]
    db.add_all(audit_logs)

    # ── 2. Trading Calendar ─────────────────────────────────────────────────
    cal_start = date(2025, 8, 1)
    cal_end = date(2026, 9, 30)
    cal_records = _generate_trading_calendar(cal_start, cal_end)
    db.add_all([TradingSessionCalendar(**rec) for rec in cal_records])
    db.flush()

    trading_days = [rec["calendar_date"] for rec in cal_records if rec["is_trading_day"] and rec["calendar_date"] <= OBSERVATION_DATE]
    trading_days.sort()
    # Use the last 240 trading days
    eval_trading_days = trading_days[-240:]

    # ── 3. Client Identity Master & Demat Accounts ──────────────────────────
    clients_data = [
        ("HWFTM1488X", "Rahul Gupta",              "INDIVIDUAL", "ACTIVE", "Mumbai",    date(2021, 3, 15), "WATCHLIST", "IN300123", "10495821", None,         False),
        ("CVXUL2488S", "Lokesh Joshi",             "INDIVIDUAL", "ACTIVE", "Ahmedabad", date(2020, 8, 10), "WATCHLIST", "IN300456", "20581942", None,         False),
        ("XWRUW6552F", "Jayant Trivedi",           "INDIVIDUAL", "ACTIVE", "Surat",     date(2022, 1, 22), "WATCHLIST", "IN300789", "30918234", "PKTBY7338I", True),
        ("PKTBY7338I", "Sunita Trivedi",           "INDIVIDUAL", "ACTIVE", "Surat",     date(2022, 1, 22), "STANDARD",  "IN300789", "30918235", "XWRUW6552F", False),
        ("WGLNH6994Q", "Vikram Kapoor",            "INDIVIDUAL", "ACTIVE", "Delhi",     date(2019, 11, 5), "STANDARD",  "IN300111", "40192834", None,         False),
        ("KVONN8964A", "Sunita Sharma",            "INDIVIDUAL", "ACTIVE", "Jaipur",    date(2023, 4, 18), "STANDARD",  "IN300222", "50821943", None,         False),
        ("AAACP9876K", "Nova Energy Promoter Trust", "PROMOTER", "ACTIVE", "Mumbai",    date(2015, 6, 12), "STANDARD",  "IN300333", "60931824", None,         False),
        ("AABCT1234F", "Alpha Holdings Pvt Ltd",   "CORPORATE",  "ACTIVE", "Mumbai",    date(2018, 9, 20), "STANDARD",  "IN300444", "70142859", None,         False),
        ("PLMNB5544K", "Apex Quant Fund FPI",      "FPI",        "ACTIVE", "Mumbai",    date(2021, 5, 14), "STANDARD",  "IN300555", "80253961", None,         False),
        ("ZXCVB9988M", "Zenith Venture Partners",  "CORPORATE",  "ACTIVE", "Bengaluru", date(2019, 7, 25), "STANDARD",  "IN300666", "90364072", None,         False),
        ("QWERT1122D", "Mahesh Deshmukh",          "INDIVIDUAL", "ACTIVE", "Pune",      date(2022, 10, 1), "STANDARD",  "IN300777", "11223344", None,         False),
        ("ASDFG3344E", "Kavita Shah",              "INDIVIDUAL", "ACTIVE", "Ahmedabad", date(2023, 2, 11), "STANDARD",  "IN300888", "22334455", None,         False),
    ]

    for pan, name, etype, state, city, reg_date, grade, dp_id, ben_acc, joint, poa in clients_data:
        c = ClientIdentityMaster(
            client_pan=pan,
            client_legal_name=name,
            entity_type=etype,
            account_state=state,
            residential_city=city,
            registration_date=reg_date,
            risk_profile_grade=grade,
        )
        db.add(c)
        db.flush()

        demat = ClientDematAccount(
            client_pan=pan,
            depository_id=dp_id,
            beneficiary_acc_no=ben_acc,
            account_open_date=reg_date,
            joint_holder_pan_2=joint,
            is_poa_active=poa,
            bank_account_masked=f"XXXXXX{ben_acc[-4:]}"
        )
        db.add(demat)

    db.flush()

    # ── 4. Daily Market EOD Prices ───────────────────────────────────────────
    # Deterministic price simulator
    all_eod_records = []
    baseline_stats_records = []

    for sym, meta in SYMBOLS_META.items():
        base_p = meta["base_price"]
        profile = meta["profile"]
        isin = meta["isin"]
        company = meta["name"]

        # Generate realistic price trajectory
        price = base_p
        vol_base = 150000 if profile in ["PUMP", "RALLY"] else 500000
        vol_std = vol_base * 0.25

        hist_prices = []
        hist_vols = []

        total_days = len(eval_trading_days)
        recent_cutoff = total_days - 15  # Last 15 days is the evaluation window

        for idx, t_date in enumerate(eval_trading_days):
            is_recent = idx >= recent_cutoff
            day_in_recent = idx - recent_cutoff

            if profile == "PUMP":
                if not is_recent:
                    # Slow, steady base phase around 540 -> 1200 over 225 days
                    drift = 0.003 + 0.001 * math.sin(idx / 10.0)
                    price *= (1.0 + drift)
                    vol = vol_base * (0.8 + 0.4 * (idx / total_days))
                    upper_band = price * 1.05
                    lower_band = price * 0.95
                else:
                    # Aggressive 15-day surge from 1200 -> 2035 with multiple upper circuits
                    surge_curve = [
                        1255.0, 1310.0, 1370.0, 1415.0, 1480.0,
                        1535.0, 1605.0, 1675.0, 1750.0, 1810.0,
                        1885.0, 1950.0, 2035.0, 2035.0, 2035.0
                    ]
                    price = surge_curve[min(day_in_recent, len(surge_curve) - 1)]
                    vol = vol_base * (3.5 + 0.3 * day_in_recent)  # Massive volume explosion (Z > 3.5)
                    upper_band = price * 1.05
                    lower_band = price * 0.95
            elif profile == "RALLY":
                if not is_recent:
                    drift = 0.0015 * math.cos(idx / 12.0)
                    price *= (1.0 + drift)
                    vol = vol_base * (0.9 + 0.2 * math.sin(idx / 5.0))
                else:
                    drift = 0.015  # +1.5% daily gain in recent window
                    price *= (1.0 + drift)
                    vol = vol_base * 2.2
                upper_band = price * 1.10
                lower_band = price * 0.90
            else:
                # Normal institutional stock movement (random walk around base)
                wave = 0.008 * math.sin(idx / 8.0) + 0.004 * math.cos(idx / 15.0)
                price = base_p * (1.0 + wave)
                vol = vol_base * (1.0 + 0.15 * math.sin(idx / 4.0))
                upper_band = price * 1.20
                lower_band = price * 0.80

            high_p = price * (1.0 + (0.015 if not is_recent else 0.025))
            low_p = price * (1.0 - (0.012 if not is_recent else 0.008))
            open_p = (price + low_p) / 2.0
            tot_qty = int(vol)
            tot_val = round(tot_qty * price, 2)
            deliv_qty = int(tot_qty * 0.42)

            hist_prices.append(price)
            hist_vols.append(tot_qty)

            # Prev close
            prev_close = hist_prices[-2] if len(hist_prices) > 1 else price * 0.99

            rec = DailyMarketEod(
                symbol=sym,
                trade_date=t_date,
                isin=isin,
                company_name=company,
                open_price=round(open_p, 2),
                day_high_price=round(high_p, 2),
                day_low_price=round(low_p, 2),
                close_price=round(price, 2),
                total_traded_quantity=tot_qty,
                total_traded_value=tot_val,
                upper_circuit_limit=round(upper_band, 2),
                lower_circuit_limit=round(lower_band, 2),
                delivery_quantity=deliv_qty,
                prev_close_price=round(prev_close, 2),
                week_52_high_price=round(max(hist_prices), 2),
                week_52_low_price=round(min(hist_prices), 2),
                base_price_180d=round(hist_prices[0], 2) if len(hist_prices) >= 180 else round(base_p, 2),
                baseline_volume_mean=round(sum(hist_vols[:180]) / max(1, len(hist_vols[:180])), 2),
                baseline_volume_std=round(vol_std, 2),
            )
            all_eod_records.append(rec)

        # Baseline stats on observation date
        base_180 = hist_prices[-(180 + 1)] if len(hist_prices) > 180 else hist_prices[0]
        v_slice = hist_vols[-195:-15] if len(hist_vols) >= 195 else hist_vols[:180]
        v_mean = sum(v_slice) / len(v_slice)
        v_std = math.sqrt(sum((x - v_mean) ** 2 for x in v_slice) / max(1, len(v_slice) - 1)) if len(v_slice) > 1 else 1000.0

        baseline_stats_records.append(MarketBaselineStat(
            symbol=sym,
            trade_date=OBSERVATION_DATE,
            base_price_180d=round(base_180, 2),
            baseline_volume_mean=round(v_mean, 2),
            baseline_volume_std=round(v_std, 2),
            return_mean_180d=0.00125 if profile == "PUMP" else 0.00045,
            return_std_180d=0.01850 if profile == "PUMP" else 0.01200,
            peak_high_180d=round(max(hist_prices[:-15]), 2),
        ))

    db.add_all(all_eod_records)
    db.add_all(baseline_stats_records)
    db.flush()

    # ── 5. Participant Daily Trades ──────────────────────────────────────────
    # High-risk participant trade activities for NOVAENERGY & ALPHATECH
    part_trades = [
        # NOVAENERGY top aggressive contributors
        ParticipantDailyTrade(
            symbol="NOVAENERGY", trade_date=OBSERVATION_DATE, client_pan="HWFTM1488X", client_legal_name="Rahul Gupta",
            trading_member_id="TM101", buy_quantity=85000, sell_quantity=12000, buy_turnover_value=172975000.0, sell_turnover_value=24420000.0,
            gross_positive_ltp_value=4808097.78, gross_negative_ltp_value=120500.0, same_broker_wash_quantity=0, client_category="INDIVIDUAL"
        ),
        ParticipantDailyTrade(
            symbol="NOVAENERGY", trade_date=OBSERVATION_DATE, client_pan="CVXUL2488S", client_legal_name="Lokesh Joshi",
            trading_member_id="TM101", buy_quantity=78000, sell_quantity=8000, buy_turnover_value=158730000.0, sell_turnover_value=16280000.0,
            gross_positive_ltp_value=4633637.45, gross_negative_ltp_value=985045.43, same_broker_wash_quantity=0, client_category="INDIVIDUAL"
        ),
        ParticipantDailyTrade(
            symbol="NOVAENERGY", trade_date=OBSERVATION_DATE, client_pan="XWRUW6552F", client_legal_name="Jayant Trivedi",
            trading_member_id="TM102", buy_quantity=65000, sell_quantity=5000, buy_turnover_value=132275000.0, sell_turnover_value=10175000.0,
            gross_positive_ltp_value=4001977.30, gross_negative_ltp_value=95000.0, same_broker_wash_quantity=0, client_category="INDIVIDUAL"
        ),
        ParticipantDailyTrade(
            symbol="NOVAENERGY", trade_date=OBSERVATION_DATE, client_pan="WGLNH6994Q", client_legal_name="Vikram Kapoor",
            trading_member_id="TM103", buy_quantity=25000, sell_quantity=18000, buy_turnover_value=50875000.0, sell_turnover_value=36630000.0,
            gross_positive_ltp_value=1276512.15, gross_negative_ltp_value=282888.39, same_broker_wash_quantity=0, client_category="INDIVIDUAL"
        ),
        ParticipantDailyTrade(
            symbol="NOVAENERGY", trade_date=OBSERVATION_DATE, client_pan="PKTBY7338I", client_legal_name="Sunita Trivedi",
            trading_member_id="TM102", buy_quantity=24000, sell_quantity=15000, buy_turnover_value=48840000.0, sell_turnover_value=30525000.0,
            gross_positive_ltp_value=1237636.51, gross_negative_ltp_value=150000.0, same_broker_wash_quantity=0, client_category="INDIVIDUAL"
        ),
        ParticipantDailyTrade(
            symbol="NOVAENERGY", trade_date=OBSERVATION_DATE, client_pan="KVONN8964A", client_legal_name="Sunita Sharma",
            trading_member_id="TM104", buy_quantity=22000, sell_quantity=12000, buy_turnover_value=44770000.0, sell_turnover_value=24420000.0,
            gross_positive_ltp_value=1204066.02, gross_negative_ltp_value=197693.64, same_broker_wash_quantity=0, client_category="INDIVIDUAL"
        ),
    ]
    db.add_all(part_trades)

    # ── 6. Counterparty Matched Pairs ────────────────────────────────────────
    cpty_pairs = [
        CounterpartyTradePair(
            symbol="NOVAENERGY", trade_date=OBSERVATION_DATE,
            buyer_pan="CVXUL2488S", buyer_legal_name="Lokesh Joshi",
            seller_pan="HWFTM1488X", seller_legal_name="Rahul Gupta",
            buyer_tm_id="TM101", seller_tm_id="TM101",
            matched_quantity=1014255, matched_turnover_value=147117687.75,
            pairwise_ltp_push_value=4.80, is_same_broker_wash=True
        ),
        CounterpartyTradePair(
            symbol="NOVAENERGY", trade_date=OBSERVATION_DATE,
            buyer_pan="XWRUW6552F", buyer_legal_name="Jayant Trivedi",
            seller_pan="CVXUL2488S", seller_legal_name="Lokesh Joshi",
            buyer_tm_id="TM102", seller_tm_id="TM101",
            matched_quantity=491930, matched_turnover_value=71354446.50,
            pairwise_ltp_push_value=2.35, is_same_broker_wash=False
        ),
        CounterpartyTradePair(
            symbol="NOVAENERGY", trade_date=OBSERVATION_DATE,
            buyer_pan="HWFTM1488X", buyer_legal_name="Rahul Gupta",
            seller_pan="XWRUW6552F", seller_legal_name="Jayant Trivedi",
            buyer_tm_id="TM101", seller_tm_id="TM102",
            matched_quantity=480949, matched_turnover_value=69761652.45,
            pairwise_ltp_push_value=2.10, is_same_broker_wash=False
        ),
        CounterpartyTradePair(
            symbol="NOVAENERGY", trade_date=OBSERVATION_DATE,
            buyer_pan="PKTBY7338I", buyer_legal_name="Sunita Trivedi",
            seller_pan="WGLNH6994Q", seller_legal_name="Vikram Kapoor",
            buyer_tm_id="TM102", seller_tm_id="TM103",
            matched_quantity=475280, matched_turnover_value=68939364.00,
            pairwise_ltp_push_value=1.45, is_same_broker_wash=False
        ),
        CounterpartyTradePair(
            symbol="NOVAENERGY", trade_date=OBSERVATION_DATE,
            buyer_pan="KVONN8964A", buyer_legal_name="Sunita Sharma",
            seller_pan="XWRUW6552F", seller_legal_name="Jayant Trivedi",
            buyer_tm_id="TM104", seller_tm_id="TM102",
            matched_quantity=416520, matched_turnover_value=60416226.00,
            pairwise_ltp_push_value=1.15, is_same_broker_wash=False
        ),
    ]
    db.add_all(cpty_pairs)

    # ── 7. Shareholding Pattern ──────────────────────────────────────────────
    for sym in SYMBOLS_META.keys():
        if sym == "NOVAENERGY":
            p_pct, top1_pct, float_pct = 58.45, 18.20, 23.35
            pledged = 12.50
        elif sym == "ALPHATECH":
            p_pct, top1_pct, float_pct = 62.00, 14.50, 23.50
            pledged = 5.00
        else:
            p_pct, top1_pct, float_pct = 50.00, 25.00, 25.00
            pledged = 0.00

        tot_sh = 100000000
        sh_records = [
            ShareholdingSummary(
                symbol=sym, quarter_code="Q127", filing_date=date(2026, 6, 30),
                category_type="PROMOTER_GROUP", total_shares_count=int(tot_sh * p_pct / 100.0),
                holding_percentage=p_pct, pledged_shares_percentage=pledged, unique_holding_pans=14, avg_daily_trading_pans=24
            ),
            ShareholdingSummary(
                symbol=sym, quarter_code="Q127", filing_date=date(2026, 6, 30),
                category_type="TOP_1_PCT_PUBLIC", total_shares_count=int(tot_sh * top1_pct / 100.0),
                holding_percentage=top1_pct, pledged_shares_percentage=0.0, unique_holding_pans=120, avg_daily_trading_pans=24
            ),
            ShareholdingSummary(
                symbol=sym, quarter_code="Q127", filing_date=date(2026, 6, 30),
                category_type="GENERAL_PUBLIC_FLOAT", total_shares_count=int(tot_sh * float_pct / 100.0),
                holding_percentage=float_pct, pledged_shares_percentage=0.0, unique_holding_pans=14250, avg_daily_trading_pans=24
            ),
        ]
        db.add_all(sh_records)

    # Large shareholders
    large_holders = [
        LargeShareholdersRegistry(
            symbol="NOVAENERGY", quarter_code="Q127", holder_pan="AAACP9876K", holder_legal_name="Nova Energy Promoter Trust",
            holder_category="PROMOTER", shares_held=42000000, holding_percentage=42.00, pledged_shares_count=5250000
        ),
        LargeShareholdersRegistry(
            symbol="NOVAENERGY", quarter_code="Q127", holder_pan="PLMNB5544K", holder_legal_name="Apex Quant Fund FPI",
            holder_category="INSTITUTIONAL_FPI", shares_held=9500000, holding_percentage=9.50, pledged_shares_count=0
        ),
        LargeShareholdersRegistry(
            symbol="ALPHATECH", quarter_code="Q127", holder_pan="AABCT1234F", holder_legal_name="Alpha Holdings Pvt Ltd",
            holder_category="PROMOTER", shares_held=50000000, holding_percentage=50.00, pledged_shares_count=2500000
        ),
    ]
    db.add_all(large_holders)

    # ── 8. Corporate Events & Dilution Factors ───────────────────────────────
    corp_events = [
        CorporateEventsFeed(
            symbol="NOVAENERGY", isin="INE002B01020", action_category="BONUS",
            announcement_purpose="Board approves 1:1 Bonus Issue of Equity Shares",
            announcement_date=date(2026, 8, 20), ex_date=date(2026, 8, 25), record_date=date(2026, 8, 26),
            ratio_or_value="1:1", dilution_factor=0.500000
        ),
        CorporateEventsFeed(
            symbol="NOVAENERGY", isin="INE002B01020", action_category="BOARD_MEETING",
            announcement_purpose="Outcome of Board Meeting - Consideration of Financial Results",
            announcement_date=date(2026, 8, 14), ex_date=None, record_date=None,
            ratio_or_value=None, dilution_factor=1.000000
        ),
        CorporateEventsFeed(
            symbol="ALPHATECH", isin="INE001A01010", action_category="DIVIDEND",
            announcement_purpose="Interim Dividend of INR 8.00 per share declared",
            announcement_date=date(2026, 8, 5), ex_date=date(2026, 8, 18), record_date=date(2026, 8, 19),
            ratio_or_value="INR 8.00", dilution_factor=1.000000
        ),
    ]
    db.add_all(corp_events)

    dilution_factors = [
        PriceDilutionFactor(symbol="NOVAENERGY", split_multiplier=0.500000, valid_from_date=date(2026, 8, 25), valid_thru_date=date(9999, 12, 31)),
        PriceDilutionFactor(symbol="ALPHATECH", split_multiplier=1.000000, valid_from_date=date(2020, 1, 1), valid_thru_date=date(9999, 12, 31)),
    ]
    db.add_all(dilution_factors)

    # ── 9. Broker Daily Summary ──────────────────────────────────────────────
    broker_summaries = [
        BrokerDailySummary(trading_member_id="TM101", trading_member_name="Alpha Securities Pvt Ltd",    symbol="NOVAENERGY", trade_date=OBSERVATION_DATE, total_buy_volume=163000, total_sell_volume=20000, same_broker_wash_volume=1014255, total_turnover_value=331705000.0),
        BrokerDailySummary(trading_member_id="TM102", trading_member_name="Zenith Capital Markets Ltd", symbol="NOVAENERGY", trade_date=OBSERVATION_DATE, total_buy_volume=89000,  total_sell_volume=20000, same_broker_wash_volume=0,       total_turnover_value=181115000.0),
        BrokerDailySummary(trading_member_id="TM103", trading_member_name="Metro Equity Broking Ltd",   symbol="NOVAENERGY", trade_date=OBSERVATION_DATE, total_buy_volume=25000,  total_sell_volume=18000, same_broker_wash_volume=0,       total_turnover_value=87505000.0),
        BrokerDailySummary(trading_member_id="TM104", trading_member_name="Prime Broking Services Ltd", symbol="NOVAENERGY", trade_date=OBSERVATION_DATE, total_buy_volume=22000,  total_sell_volume=12000, same_broker_wash_volume=0,       total_turnover_value=69190000.0),
    ]
    db.add_all(broker_summaries)

    # ── 10. Surveillance Alert Cases ─────────────────────────────────────────
    alert_cases = [
        SurveillanceAlertCase(
            symbol="NOVAENERGY", observation_date=OBSERVATION_DATE,
            composite_risk_score=28.50, alert_severity_level="HIGH", surveillance_status="ACTIVE",
            metric_price_rise_pct=276.85, metric_price_zscore=3.42, metric_volume_zscore=4.15,
            metric_band_hit_days=8, metric_new_high_days=11, assigned_officer="vishesh_admin",
            investigation_notes="Scrip flagged with high composite score (28.5/100). Concentrated aggressive buy push delivered by Rahul Gupta and Lokesh Joshi lifting ask price. High bilateral counterparty concentration with Jayant Trivedi."
        ),
        SurveillanceAlertCase(
            symbol="ALPHATECH", observation_date=OBSERVATION_DATE,
            composite_risk_score=12.40, alert_severity_level="MEDIUM", surveillance_status="UNDER_REVIEW",
            metric_price_rise_pct=42.15, metric_price_zscore=2.10, metric_volume_zscore=2.45,
            metric_band_hit_days=3, metric_new_high_days=4, assigned_officer="arao_analyst",
            investigation_notes="Moderate volume breakout observed following interim dividend announcement. Under active review."
        ),
    ]
    db.add_all(alert_cases)

    db.commit()
    total_eod = len(all_eod_records)
    print(f"[seed] Database seeded successfully: {total_eod} EOD rows across {len(SYMBOLS_META)} symbols.")
    return {
        "status": "SEEDED_SUCCESS",
        "symbols": len(SYMBOLS_META),
        "eod_rows": total_eod,
        "trading_days": len(eval_trading_days),
        "users": len(users),
        "alert_cases": len(alert_cases)
    }


if __name__ == "__main__":
    db = SessionLocal()
    try:
        res = seed_database(db)
        print(f"Seed Result: {res}")
    finally:
        db.close()
