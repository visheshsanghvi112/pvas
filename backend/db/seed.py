"""
backend/db/seed.py
────────────────────────────────────────────────────────────────────────────
Deterministic high-fidelity database seeder for PVASF.
Populates all 15 clean relational tables in surveillance.db:
  - 15 symbols with 260 trading days of historical OHLCV data (3,900 records)
  - Continuous Geometric Brownian Motion with realistic upper-circuit pump profile for NOVAENERGY (135.67 -> 274.74)
  - 500 deterministic client identities & demat accounts
  - 15-day multi-symbol participant daily trades (~2,900 records) & counterparty pairs (~800 records)
  - Accurate trade turnover valuation (matched_turnover = matched_qty * close_price), eliminating P&L distortions
  - 4 quarters of shareholding summaries & large shareholder registries across all 15 symbols
  - Corporate actions, dilution factors, and broker daily summaries
  - Initial system users and audit logs
  - Analytical surveillance views (v_daily_surveillance_summary, v_participant_conduct_ranking, v_counterparty_concentration)
"""

from __future__ import annotations

import math
import random
import string
import zlib
from datetime import date, datetime, timedelta
from typing import Any

import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.db.database import Base, SessionLocal, engine
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

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

OBSERVATION_DATE = date(2026, 8, 27)

# ── 15 Scrip Universe ────────────────────────────────────────────────────────
SYMBOLS = [
    ("NOVAENERGY", 140.0,  0.25, "INE752716A01", "Nova Energy Ltd",                   "PUMP"),
    ("ALPHATECH",  2400.0, 0.08, "INE001A01010", "Alpha Technologies Ltd",            "RALLY"),
    ("ZENITHBIO",  1600.0, 0.05, "INE003C01030", "Zenith Bio-Tech Ltd",               "NORMAL"),
    ("ORBITCEM",   1550.0, 0.12, "INE004D01040", "Orbit Cement Ltd",                  "NORMAL"),
    ("TCS",        3800.0, 0.04, "INE467B01029", "Tata Consultancy Services Ltd",     "BENCHMARK"),
    ("SBIN",        780.0, 0.18, "INE062A01020", "State Bank of India",               "BENCHMARK"),
    ("ICICIBANK",  1100.0, 0.06, "INE090A01021", "ICICI Bank Ltd",                    "BENCHMARK"),
    ("AXISBANK",   1150.0, 0.15, "INE238A01034", "Axis Bank Ltd",                     "BENCHMARK"),
    ("RELIANCE",   2900.0, 0.06, "INE002A01018", "Reliance Industries Ltd",           "BENCHMARK"),
    ("HDFCBANK",   1750.0, 0.05, "INE040A01034", "HDFC Bank Ltd",                     "BENCHMARK"),
    ("INFY",       1550.0, 0.07, "INE009A01021", "Infosys Ltd",                       "BENCHMARK"),
    ("WIPRO",       480.0, 0.10, "INE075A01022", "Wipro Ltd",                         "BENCHMARK"),
    ("BAJFINANCE", 7200.0, 0.12, "INE296A01024", "Bajaj Finance Ltd",                 "BENCHMARK"),
    ("MARUTI",    11000.0, 0.08, "INE585B01010", "Maruti Suzuki India Ltd",           "BENCHMARK"),
    ("SUNPHARMA",  1200.0, 0.09, "INE044A01036", "Sun Pharma Industries Ltd",         "BENCHMARK"),
]

COMPANY_NAMES = {sym[0]: sym[4] for sym in SYMBOLS}
ISIN_MAP = {sym[0]: sym[3] for sym in SYMBOLS}

BROKERS = [
    ("TM101", "Apex Global Securities Ltd"),
    ("TM102", "Zenith Capital Markets Ltd"),
    ("TM103", "Summit Financial Services Ltd"),
    ("TM104", "Vanguard Wealth Management Ltd"),
    ("TM105", "Pioneer Broking & Trades Ltd"),
    ("TM106", "Beacon Equity Partners Ltd"),
    ("TM107", "Horizon Prime Securities Ltd"),
    ("TM108", "Equinox Trading Desk Ltd"),
    ("TM109", "Nexus Capital Advisors Ltd"),
    ("TM110", "Matrix Clearing & Broking Ltd"),
]

FIRST_NAMES = [
    "Rahul", "Sunita", "Jayant", "Lokesh", "Vikram", "Aditi", "Aarav",
    "Meera", "Farhan", "Kavya", "Nikhil", "Pooja", "Arjun", "Deepa",
    "Harish", "Geeta", "Tarun", "Usha", "Yashvi", "Ananya"
]
LAST_NAMES = [
    "Gupta", "Trivedi", "Joshi", "Kapoor", "Sharma", "Agarwal", "Patel",
    "Mehta", "Iyer", "Singh", "Chatterjee", "Desai", "Rao", "Bose"
]
CITIES = ["Mumbai", "Ahmedabad", "Surat", "Delhi", "Jaipur", "Bengaluru", "Hyderabad", "Kolkata", "Pune", "Chennai"]

HOLIDAYS = {
    date(2025, 8, 15): "Independence Day",
    date(2025, 10, 2): "Mahatma Gandhi Jayanti",
    date(2025, 10, 21): "Diwali",
    date(2025, 12, 25): "Christmas",
    date(2026, 1, 26): "Republic Day",
    date(2026, 3, 6):  "Holi",
    date(2026, 4, 14): "Dr Ambedkar Jayanti",
    date(2026, 5, 1):  "Maharashtra Day",
    date(2026, 8, 15): "Independence Day",
}


def _make_pan(seed_key: str) -> str:
    r = random.Random(seed_key)
    a5 = "".join(r.choices(string.ascii_uppercase, k=5))
    d4 = "".join(r.choices(string.digits, k=4))
    a1 = r.choice(string.ascii_uppercase)
    return f"{a5}{d4}{a1}"


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


def _get_trading_days(n_days: int = 260) -> list[date]:
    dates = []
    curr = OBSERVATION_DATE
    while len(dates) < n_days:
        if curr.weekday() < 5 and curr not in HOLIDAYS:
            dates.append(curr)
        curr -= timedelta(days=1)
    return sorted(dates)


# ══════════════════════════════════════════════════════════════════════════════
#  Analytical Surveillance Views DDL
# ══════════════════════════════════════════════════════════════════════════════

VIEWS_DDL = """
CREATE VIEW IF NOT EXISTS v_daily_surveillance_summary AS
SELECT 
    d.symbol,
    d.trade_date,
    d.close_price,
    d.prev_close_price,
    ROUND(((d.close_price - COALESCE(d.prev_close_price, d.close_price)) / NULLIF(d.prev_close_price, 0)) * 100.0, 2) AS price_change_pct,
    d.total_traded_quantity,
    d.total_traded_value,
    d.upper_circuit_limit,
    d.lower_circuit_limit,
    CASE WHEN d.close_price >= d.upper_circuit_limit THEN 1 ELSE 0 END AS is_upper_circuit_hit,
    d.baseline_volume_mean,
    d.baseline_volume_std
FROM daily_market_eod d;

CREATE VIEW IF NOT EXISTS v_participant_conduct_ranking AS
SELECT 
    p.symbol,
    p.trade_date,
    p.client_pan,
    p.client_legal_name,
    p.trading_member_id,
    p.buy_quantity,
    p.sell_quantity,
    p.buy_turnover_value,
    p.sell_turnover_value,
    p.gross_positive_ltp_value,
    p.gross_negative_ltp_value,
    (p.gross_positive_ltp_value - p.gross_negative_ltp_value) AS net_ltp_impact,
    p.same_broker_wash_quantity,
    p.client_category
FROM participant_daily_trades p;

CREATE VIEW IF NOT EXISTS v_counterparty_concentration AS
SELECT 
    c.symbol,
    c.trade_date,
    c.buyer_pan,
    c.buyer_legal_name,
    c.seller_pan,
    c.seller_legal_name,
    c.buyer_tm_id,
    c.seller_tm_id,
    c.matched_quantity,
    c.matched_turnover_value,
    c.pairwise_ltp_push_value,
    c.is_same_broker_wash,
    c.algo_execution_flag
FROM counterparty_trade_pairs c;
"""


def seed_database(db: Session) -> dict[str, Any]:
    """
    Populates all 15 clean tables with complete, continuous, deterministic surveillance data.
    """
    print("[seed] Resetting and recreating all 15 clean tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Create analytical views
    with engine.connect() as conn:
        for stmt in VIEWS_DDL.strip().split(";"):
            cleaned = stmt.strip()
            if cleaned:
                conn.execute(text(cleaned))
        conn.commit()

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
            details="System computed EOD risk score: 28.5 (HIGH). Added to Active Surveillance Watchlist.",
            ip_address="127.0.0.1"
        ),
        SysAuditLog(
            timestamp=datetime.utcnow() - timedelta(hours=1),
            username="vishesh_admin",
            role="Admin",
            action="VIEW_DOSSIER",
            target="NOVAENERGY",
            details="Officer opened Single-Stock Forensic Investigation Workspace for NOVAENERGY.",
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

    num_trading_days = 260
    t_days = _get_trading_days(num_trading_days)
    print(f"[seed] Trading days generated: {len(t_days)} days from {t_days[0]} to {t_days[-1]}")

    # ── 3. Client Identity Master & Demat Accounts (500 Clients) ────────────
    print("[seed] Seeding client_identity_master and client_demat_accounts (500 clients)...")
    ring_clients = [
        ("HWFTM1488X", "Rahul Gupta",               "INDIVIDUAL", "Mumbai",    "WATCHLIST"),
        ("CVXUL2488S", "Lokesh Joshi",               "INDIVIDUAL", "Ahmedabad", "WATCHLIST"),
        ("XWRUW6552F", "Jayant Trivedi",             "INDIVIDUAL", "Surat",     "WATCHLIST"),
        ("PKTBY7338I", "Sunita Trivedi",             "INDIVIDUAL", "Surat",     "STANDARD"),
        ("WGLNH6994Q", "Vikram Kapoor",              "INDIVIDUAL", "Delhi",     "STANDARD"),
        ("KVONN8964A", "Sunita Sharma",              "INDIVIDUAL", "Jaipur",    "STANDARD"),
        ("AAACP9876K", "Nova Energy Promoter Trust", "PROMOTER",   "Mumbai",    "STANDARD"),
    ]

    clients = []
    for i in range(500):
        if i < len(ring_clients):
            pan, name, etype, city, grade = ring_clients[i]
        else:
            pan = _make_pan(f"CLIENT_SEED_{i:04d}")
            fn = random.choice(FIRST_NAMES)
            ln = random.choice(LAST_NAMES)
            name = f"{fn} {ln}"
            city = random.choice(CITIES)
            etype = "PROMOTER" if i == 6 else ("CORPORATE" if i % 8 == 0 else "INDIVIDUAL")
            grade = "HIGH_RISK" if i < 20 else ("WATCHLIST" if i < 50 else "STANDARD")

        reg_date = date(2020, 1, 1) + timedelta(days=i * 4)
        clients.append({
            "pan": pan,
            "name": name,
            "type": etype,
            "city": city,
            "grade": grade,
            "reg_date": reg_date
        })

    client_map = {cl["pan"]: cl for cl in clients}

    client_entities = [
        ClientIdentityMaster(
            client_pan=cl["pan"],
            client_legal_name=cl["name"],
            entity_type=cl["type"],
            account_state="ACTIVE",
            residential_city=cl["city"],
            registration_date=cl["reg_date"],
            risk_profile_grade=cl["grade"]
        )
        for cl in clients
    ]
    db.add_all(client_entities)
    db.flush()

    # Golden demat accounts from surveillance_schema.sql (exact DP IDs and BO account numbers)
    GOLDEN_DEMAT = {
        "HWFTM1488X": ("IN300123", "10495821", None,         False, "XXXXXX4819"),
        "CVXUL2488S": ("IN300456", "20581942", None,         False, "XXXXXX1029"),
        "XWRUW6552F": ("IN300789", "30918234", "PKTBY7338I", True,  "XXXXXX8821"),
        "PKTBY7338I": ("IN300789", "30918235", "XWRUW6552F", False, "XXXXXX8821"),
        "WGLNH6994Q": ("IN300111", "40192834", None,         False, "XXXXXX3391"),
        "KVONN8964A": ("IN300222", "50821943", None,         False, "XXXXXX7741"),
        "AAACP9876K": ("IN300001", "60000001", None,         False, "XXXXXX0001"),
    }
    demat_entities = []
    for idx, cl in enumerate(clients):
        if cl["pan"] in GOLDEN_DEMAT:
            dep_id, ben_acc, joint2, is_poa, bank_masked = GOLDEN_DEMAT[cl["pan"]]
        else:
            dep_id = f"IN300{str(100 + (idx % 25)).zfill(3)}"
            ben_acc = f"10{str(idx).zfill(6)}"
            joint2 = None
            is_poa = False
            bank_masked = f"XXXXXX{random.randint(1000, 9999)}"
        demat_entities.append(
            ClientDematAccount(
                client_pan=cl["pan"],
                depository_id=dep_id,
                beneficiary_acc_no=ben_acc,
                account_open_date=cl["reg_date"],
                joint_holder_pan_2=joint2,
                is_poa_active=is_poa,
                bank_account_masked=bank_masked
            )
        )
    db.add_all(demat_entities)
    db.flush()

    # ── 4. Daily Market EOD Prices & Baseline Statistics ─────────────────────
    print("[seed] Generating daily_market_eod and market_baseline_stats...")
    all_eod_records = []
    all_baseline_stats = []

    close_price_by_sym_date: dict[tuple[str, str], float] = {}

    for sym, base_price, vol_pct, isin, comp_name, profile in SYMBOLS:
        r_state = np.random.RandomState(zlib.crc32(sym.encode("utf-8")) % 10000)

        closes = np.zeros(num_trading_days)
        volumes = np.zeros(num_trading_days)
        closes[0] = base_price

        if profile == "PUMP":  # NOVAENERGY
            golden_15_closes = [142.05, 149.11, 156.47, 163.88, 171.42, 179.96, 188.35, 197.43, 207.21, 216.63, 227.00, 237.82, 249.38, 261.77, 274.74]
            golden_15_vols = [1773627, 2036939, 1425246, 1657804, 1950085, 1669326, 1745849, 1894577, 1923398, 2041329, 1695132, 1700065, 1856936, 1705959, 1971401]
            for day_i in range(1, 245):
                ret = r_state.normal(-0.0001, 0.004)
                closes[day_i] = round(closes[day_i - 1] * (1.0 + ret), 2)
            closes[245:] = golden_15_closes
            volumes[:245] = np.maximum(r_state.normal(150000, 10000, 245), 40000)
            volumes[245:] = golden_15_vols

        elif profile == "RALLY":  # ALPHATECH
            circuit_days = {246, 248, 250, 252, 254, 256, 258, 259}
            for day_i in range(1, num_trading_days):
                if day_i < 245:
                    ret = r_state.normal(0.0007, 0.008)
                else:
                    ret = 0.098 if day_i in circuit_days else r_state.uniform(0.008, 0.015)
                closes[day_i] = round(closes[day_i - 1] * (1.0 + ret), 2)

            volumes[:245] = np.maximum(r_state.normal(150000, 10000, 245), 50000)
            volumes[245:] = r_state.normal(1200000, 30000, 15)

        elif sym == "ZENITHBIO":
            circuit_days = {247, 250, 252, 255, 257, 259}
            for day_i in range(1, num_trading_days):
                if day_i < 245:
                    ret = r_state.normal(0.0006, 0.007)
                else:
                    ret = 0.055 if day_i in circuit_days else r_state.uniform(0.005, 0.012)
                closes[day_i] = round(closes[day_i - 1] * (1.0 + ret), 2)

            volumes[:245] = np.maximum(r_state.normal(140000, 10000, 245), 40000)
            volumes[245:] = r_state.normal(800000, 25000, 15)

        elif sym == "ORBITCEM":
            circuit_days = {257}
            for day_i in range(1, num_trading_days):
                if day_i < 245:
                    ret = r_state.normal(0.0003, 0.006)
                else:
                    ret = 0.114 if day_i in circuit_days else r_state.uniform(0.001, 0.006)
                closes[day_i] = round(closes[day_i - 1] * (1.0 + ret), 2)

            volumes[:245] = np.maximum(r_state.normal(150000, 10000, 245), 50000)
            volumes[245:] = r_state.normal(210000, 10000, 15)

        else:  # BENCHMARK BLUECHIPS
            for day_i in range(1, num_trading_days):
                ret = r_state.normal(0.0001, 0.006)
                closes[day_i] = round(closes[day_i - 1] * (1.0 + ret), 2)
            volumes = np.maximum(r_state.normal(300000, 25000, num_trading_days), 80000)

        hist_p: list[float] = []
        hist_v: list[int] = []

        for day_i, trd_date in enumerate(t_days):
            d_str = trd_date.strftime("%Y-%m-%d")
            c_price = float(closes[day_i])
            prev_c = float(closes[day_i - 1]) if day_i > 0 else c_price

            close_price_by_sym_date[(sym, d_str)] = c_price

            is_pump_window = (profile == "PUMP" and day_i >= 245)
            if is_pump_window:
                open_p = round(prev_c * 1.012, 2)
                upper_band = round(prev_c * 1.05, 2)
                lower_band = round(prev_c * 0.95, 2)
                high_p = max(c_price, upper_band)
                low_p = round(min(open_p, c_price) * 0.995, 2)
            else:
                open_p = round(prev_c * r_state.uniform(0.998, 1.002), 2)
                upper_band = round(prev_c * 1.05, 2)
                lower_band = round(prev_c * 0.95, 2)
                high_p = round(max(open_p, c_price) * r_state.uniform(1.0, 1.010), 2)
                low_p = round(min(open_p, c_price) * r_state.uniform(0.990, 1.0), 2)

            tot_qty = int(volumes[day_i])
            tot_val = round(tot_qty * c_price, 2)
            deliv_qty = int(tot_qty * (0.55 if is_pump_window else 0.42))

            hist_p.append(c_price)
            hist_v.append(tot_qty)

            base_180 = hist_p[max(0, len(hist_p) - 180)]
            v_slice = hist_v[max(0, len(hist_v) - 180):]
            v_mean = float(np.mean(v_slice))
            v_std = float(max(100.0, np.std(v_slice)))
            w52_high = max(hist_p)
            w52_low = min(hist_p)

            all_eod_records.append(
                DailyMarketEod(
                    symbol=sym,
                    trade_date=trd_date,
                    isin=isin,
                    company_name=comp_name,
                    open_price=open_p,
                    day_high_price=high_p,
                    day_low_price=low_p,
                    close_price=c_price,
                    total_traded_quantity=tot_qty,
                    total_traded_value=tot_val,
                    upper_circuit_limit=upper_band,
                    lower_circuit_limit=lower_band,
                    delivery_quantity=deliv_qty,
                    prev_close_price=prev_c,
                    week_52_high_price=round(w52_high, 2),
                    week_52_low_price=round(w52_low, 2),
                    base_price_180d=round(base_180, 2),
                    baseline_volume_mean=round(v_mean, 2),
                    baseline_volume_std=round(v_std, 2)
                )
            )

            if day_i >= 180:
                h_c = closes[day_i - 180:day_i]
                h_v = volumes[day_i - 180:day_i]
                r_diffs = np.diff(h_c) / h_c[:-1]
                all_baseline_stats.append(
                    MarketBaselineStat(
                        symbol=sym,
                        trade_date=trd_date,
                        base_price_180d=round(float(h_c[0]), 2),
                        baseline_volume_mean=round(float(np.mean(h_v)), 2),
                        baseline_volume_std=round(float(max(1.0, np.std(h_v))), 2),
                        return_mean_180d=round(float(np.mean(r_diffs)), 6),
                        return_std_180d=round(float(max(0.001, np.std(r_diffs))), 6),
                        peak_high_180d=round(float(np.max(h_c)), 2)
                    )
                )

    db.bulk_save_objects(all_eod_records)
    db.bulk_save_objects(all_baseline_stats)
    db.flush()
    print(f"[seed] Seeded {len(all_eod_records)} EOD market rows & {len(all_baseline_stats)} baseline statistics.")

    # ── 5. Participant Daily Trades & Counterparty Pairs ─────────────────────
    print("[seed] Generating multi-date participant_daily_trades and counterparty_trade_pairs across 15-day window...")
    recent_15_days = t_days[-15:]
    part_trades: list[ParticipantDailyTrade] = []
    cpty_pairs: list[CounterpartyTradePair] = []

    ring_pans = ["HWFTM1488X", "CVXUL2488S", "XWRUW6552F", "PKTBY7338I", "WGLNH6994Q", "KVONN8964A"]

    for sym, _, _, _, _, profile in SYMBOLS:
        active_client_subset = clients[:40]
        for trd_d in recent_15_days:
            d_str = trd_d.strftime("%Y-%m-%d")
            cp = close_price_by_sym_date.get((sym, d_str), 100.0)

            if sym == "NOVAENERGY":
                day_pans = list(ring_pans) + [cl["pan"] for cl in active_client_subset[6:14]]
            elif sym in ["ALPHATECH", "ZENITHBIO", "ORBITCEM"]:
                day_pans = [cl["pan"] for cl in active_client_subset[:12]]
            else:
                day_pans = [cl["pan"] for cl in random.sample(active_client_subset, 10)]

            day_idx = recent_15_days.index(trd_d)
            for idx_p, pan in enumerate(day_pans):
                cl_info = client_map[pan]
                brk_id = BROKERS[idx_p % len(BROKERS)][0]

                if sym == "NOVAENERGY" and pan in ring_pans:
                    b_qty = random.randint(45000, 110000)
                    s_qty = random.randint(30000, 95000)
                    b_val = round(b_qty * cp, 2)
                    s_val = round(s_qty * cp, 2)
                    # Exact golden per-share daily push distribution (summing to 4.80, 2.35, 2.10, 1.45, 1.15)
                    day_push_map = {
                        "CVXUL2488S": 0.32,
                        "XWRUW6552F": 0.16 if day_idx < 10 else 0.15,
                        "HWFTM1488X": 0.14,
                        "PKTBY7338I": 0.10 if day_idx < 10 else 0.09,
                        "KVONN8964A": 0.08 if day_idx < 10 else 0.07,
                    }
                    pos_push = day_push_map.get(pan, 0.0)
                    neg_push = 0.0  # Pure aggressive price pushers, no negative price suppressors
                    wash_q = int(min(b_qty, s_qty) * 0.70)
                else:
                    b_qty = random.randint(8000, 45000)
                    s_qty = random.randint(8000, 42000)
                    b_val = round(b_qty * cp, 2)
                    s_val = round(s_qty * cp, 2)
                    pos_push = round(b_val * 0.020, 2)
                    neg_push = round(s_val * 0.020, 2)
                    wash_q = 0

                part_trades.append(
                    ParticipantDailyTrade(
                        symbol=sym,
                        trade_date=trd_d,
                        client_pan=pan,
                        client_legal_name=cl_info["name"],
                        trading_member_id=brk_id,
                        buy_quantity=b_qty,
                        sell_quantity=s_qty,
                        buy_turnover_value=b_val,
                        sell_turnover_value=s_val,
                        gross_positive_ltp_value=pos_push,
                        gross_negative_ltp_value=neg_push,
                        same_broker_wash_quantity=wash_q,
                        buy_trade_count=random.randint(12, 85),
                        sell_trade_count=random.randint(8, 65),
                        aggressor_buy_quantity=int(b_qty * 0.65),
                        client_category=cl_info["type"]
                    )
                )

            # Counterparty matched trade pairs
            if sym == "NOVAENERGY":
                # Exact golden bilateral legs matching surveillance_schema.sql
                # Across the 15-day window, daily pushes sum to exact golden per-share points:
                # CVXUL2488S: 4.80 (40.51%), XWRUW6552F: 2.35 (19.83%), HWFTM1488X: 2.10 (17.72%),
                # PKTBY7338I: 1.45 (12.24%), KVONN8964A: 1.15 (9.70%)
                push_cvx = 0.32
                push_xwr = 0.16 if day_idx < 10 else 0.15
                push_hwf = 0.14
                push_pkt = 0.10 if day_idx < 10 else 0.09
                push_kvo = 0.08 if day_idx < 10 else 0.07

                bilateral_legs = [
                    ("CVXUL2488S", "HWFTM1488X", "TM101", "TM101", int(1014255 / 15), True, push_cvx),
                    ("XWRUW6552F", "CVXUL2488S", "TM102", "TM101", int(491930 / 15), False, push_xwr),
                    ("HWFTM1488X", "XWRUW6552F", "TM101", "TM102", int(480949 / 15), False, push_hwf),
                    ("PKTBY7338I", "WGLNH6994Q", "TM102", "TM103", int(475280 / 15), False, push_pkt),
                    ("KVONN8964A", "XWRUW6552F", "TM104", "TM102", int(416520 / 15), False, push_kvo),
                ]
            elif sym in ["ALPHATECH", "ZENITHBIO", "ORBITCEM"]:
                p0, p1, p2, p3 = day_pans[0], day_pans[1], day_pans[2], day_pans[3]
                bilateral_legs = [
                    (p0, p1, "TM101", "TM102", random.randint(120000, 250000), False, 1.20),
                    (p1, p2, "TM102", "TM103", random.randint(110000, 240000), False, 0.95),
                    (p2, p0, "TM103", "TM101", random.randint(105000, 230000), False, 0.80),
                    (p3, p1, "TM104", "TM102", random.randint(80000, 150000), False, 0.50),
                ]
            else:
                p0, p1 = day_pans[0], day_pans[1]
                p2, p3 = day_pans[2], day_pans[3]
                bilateral_legs = [
                    (p0, p1, "TM101", "TM102", random.randint(25000, 60000), False, 0.25),
                    (p2, p3, "TM103", "TM104", random.randint(20000, 50000), False, 0.20),
                    (p1, p0, "TM102", "TM101", random.randint(18000, 45000), False, 0.15),
                ]

            for leg in bilateral_legs:
                b_pan, s_pan, b_tm, s_tm, m_qty, same_brk, push = leg
                m_val = round(m_qty * cp, 2)
                b_name = client_map[b_pan]["name"]
                s_name = client_map[s_pan]["name"]

                cpty_pairs.append(
                    CounterpartyTradePair(
                        symbol=sym,
                        trade_date=trd_d,
                        buyer_pan=b_pan,
                        buyer_legal_name=b_name,
                        seller_pan=s_pan,
                        seller_legal_name=s_name,
                        buyer_tm_id=b_tm,
                        seller_tm_id=s_tm,
                        matched_quantity=m_qty,
                        matched_turnover_value=m_val,
                        pairwise_ltp_push_value=push,
                        reverse_matched_quantity=int(m_qty * 0.95),
                        is_same_broker_wash=same_brk,
                        algo_execution_flag=1 if sym == "ORBITCEM" else 0
                    )
                )

    db.bulk_save_objects(part_trades)
    db.bulk_save_objects(cpty_pairs)
    db.flush()
    print(f"[seed] Seeded {len(part_trades)} participant trades & {len(cpty_pairs)} counterparty pairs.")

    # ── 6. Shareholding Summary & Registry (4 Quarters across 15 Symbols) ────
    print("[seed] Seeding shareholding_summary and large_shareholders_registry...")
    quarters = [
        ("Q325", date(2025, 9, 30)),
        ("Q425", date(2025, 12, 31)),
        ("Q126", date(2026, 3, 31)),
        ("Q226", date(2026, 6, 30))
    ]

    sh_summary_records: list[ShareholdingSummary] = []
    large_holder_records: list[LargeShareholdersRegistry] = []

    for sym, _, _, _, _, _ in SYMBOLS:
        tot_cap = 100_000_000
        for q_code, q_date in quarters:
            if sym == "NOVAENERGY":
                # Golden values from surveillance_schema.sql (Q127 / 2026-06-30)
                prom_pct, top1_pct, float_pct = 58.45, 18.20, 23.35
                pledged_pct = 12.50
                nova_prom_shares = 58_450_000
                nova_prom_pledged = 5_250_000
                unique_prom_pans, avg_prom_pans = 14, 24
                unique_top1_pans, avg_top1_pans = 120, 24
                unique_float_pans, avg_float_pans = 14250, 24
            elif sym == "ALPHATECH":
                prom_pct, top1_pct, float_pct = 62.00, 16.50, 21.50
                pledged_pct = 6.00
                unique_prom_pans, avg_prom_pans = 4, 1
                unique_top1_pans, avg_top1_pans = 18, 12
                unique_float_pans, avg_float_pans = 42000, 850
            else:
                prom_pct, top1_pct, float_pct = 50.00, 25.00, 25.00
                pledged_pct = 0.00
                unique_prom_pans, avg_prom_pans = 4, 1
                unique_top1_pans, avg_top1_pans = 18, 12
                unique_float_pans, avg_float_pans = 42000, 850

            # Use Q127 as the primary quarter code for NOVAENERGY (golden spec)
            eff_q_code = "Q127" if sym == "NOVAENERGY" else q_code
            eff_q_date = date(2026, 6, 30) if sym == "NOVAENERGY" else q_date

            sh_summary_records.append(
                ShareholdingSummary(
                    symbol=sym, quarter_code=eff_q_code, filing_date=eff_q_date,
                    category_type="PROMOTER_GROUP",
                    total_shares_count=nova_prom_shares if sym == "NOVAENERGY" else int(tot_cap * prom_pct / 100),
                    holding_percentage=prom_pct,
                    pledged_shares_percentage=pledged_pct,
                    locked_in_shares_percentage=0.0,
                    unique_holding_pans=unique_prom_pans, avg_daily_trading_pans=avg_prom_pans
                )
            )
            sh_summary_records.append(
                ShareholdingSummary(
                    symbol=sym, quarter_code=eff_q_code, filing_date=eff_q_date,
                    category_type="TOP_1_PCT_PUBLIC",
                    total_shares_count=int(tot_cap * top1_pct / 100),
                    holding_percentage=top1_pct,
                    pledged_shares_percentage=0.0,
                    locked_in_shares_percentage=0.0,
                    unique_holding_pans=unique_top1_pans, avg_daily_trading_pans=avg_top1_pans
                )
            )
            sh_summary_records.append(
                ShareholdingSummary(
                    symbol=sym, quarter_code=eff_q_code, filing_date=eff_q_date,
                    category_type="GENERAL_PUBLIC_FLOAT",
                    total_shares_count=int(tot_cap * float_pct / 100),
                    holding_percentage=float_pct,
                    pledged_shares_percentage=0.0,
                    locked_in_shares_percentage=0.0,
                    unique_holding_pans=unique_float_pans, avg_daily_trading_pans=avg_float_pans
                )
            )

            # NOVAENERGY large shareholder: Nova Energy Promoter Trust (AAACP9876K)
            if sym == "NOVAENERGY":
                large_holder_records.append(
                    LargeShareholdersRegistry(
                        symbol=sym, quarter_code=eff_q_code,
                        holder_pan="AAACP9876K",
                        holder_legal_name="Nova Energy Promoter Trust",
                        holder_category="PROMOTER",
                        shares_held=42_000_000,
                        holding_percentage=42.00,
                        pledged_shares_count=nova_prom_pledged
                    )
                )
            else:
                large_holder_records.append(
                    LargeShareholdersRegistry(
                        symbol=sym, quarter_code=eff_q_code,
                        holder_pan=clients[0]["pan"], holder_legal_name=clients[0]["name"],
                        holder_category="PROMOTER",
                        shares_held=int(tot_cap * prom_pct / 100),
                        holding_percentage=prom_pct,
                        pledged_shares_count=int(tot_cap * prom_pct * pledged_pct / 10000)
                    )
                )
            large_holder_records.append(
                LargeShareholdersRegistry(
                    symbol=sym, quarter_code=eff_q_code,
                    holder_pan=clients[1]["pan"], holder_legal_name=clients[1]["name"],
                    holder_category="INSTITUTIONAL_DII",
                    shares_held=int(tot_cap * 0.08),
                    holding_percentage=8.00,
                    pledged_shares_count=0
                )
            )
            large_holder_records.append(
                LargeShareholdersRegistry(
                    symbol=sym, quarter_code=eff_q_code,
                    holder_pan=clients[2]["pan"], holder_legal_name=clients[2]["name"],
                    holder_category="INSTITUTIONAL_FPI",
                    shares_held=int(tot_cap * 0.055),
                    holding_percentage=5.50,
                    pledged_shares_count=0
                )
            )
            large_holder_records.append(
                LargeShareholdersRegistry(
                    symbol=sym, quarter_code=eff_q_code,
                    holder_pan=clients[3]["pan"], holder_legal_name=clients[3]["name"],
                    holder_category="PUBLIC_INDIVIDUAL",
                    shares_held=int(tot_cap * 0.04),
                    holding_percentage=4.00,
                    pledged_shares_count=0
                )
            )
            # Skip duplicate quarters for NOVAENERGY (golden spec has a single Q127 entry)
            if sym == "NOVAENERGY":
                break

    db.bulk_save_objects(sh_summary_records)
    db.bulk_save_objects(large_holder_records)
    db.flush()
    print(f"[seed] Seeded {len(sh_summary_records)} shareholding summaries & {len(large_holder_records)} large shareholder records.")

    # ── 7. Corporate Events & Price Dilution Factors ─────────────────────────
    print("[seed] Seeding corporate_events_feed and price_dilution_factors...")
    corp_events: list[CorporateEventsFeed] = []
    dilution_factors: list[PriceDilutionFactor] = []

    for sym, _, _, isin, _, _ in SYMBOLS:
        if sym == "NOVAENERGY":
            # Golden corporate actions from surveillance_schema.sql:
            # 1. Board Meeting - Outcome of Board Meeting (2026-08-14)
            corp_events.append(
                CorporateEventsFeed(
                    symbol=sym, isin=isin, action_category="BOARD_MEETING",
                    announcement_purpose="Outcome of Board Meeting - Financial Results",
                    announcement_date=date(2026, 8, 14),
                    ex_date=None, record_date=None, ratio_or_value=None, dilution_factor=1.000000
                )
            )
            # 2. Bonus 1:1 (ex 2026-08-25, record 2026-08-26)
            corp_events.append(
                CorporateEventsFeed(
                    symbol=sym, isin=isin, action_category="BONUS",
                    announcement_purpose="Board approves 1:1 Bonus Issue of Equity Shares",
                    announcement_date=date(2026, 8, 20),
                    ex_date=date(2026, 8, 25), record_date=date(2026, 8, 26),
                    ratio_or_value="1:1", dilution_factor=0.500000
                )
            )
            dilution_factors.append(
                PriceDilutionFactor(
                    symbol=sym, split_multiplier=0.500000,
                    valid_from_date=date(2026, 8, 25), valid_thru_date=date(9999, 12, 31)
                )
            )
        elif sym == "ALPHATECH":
            corp_events.append(
                CorporateEventsFeed(
                    symbol=sym, isin=isin, action_category="SPLIT",
                    announcement_purpose="Alpha Technologies Ltd Stock Split 10:1 (FV INR 10 to INR 1)",
                    announcement_date=date(2026, 1, 10),
                    ex_date=date(2026, 1, 25), record_date=date(2026, 1, 27),
                    ratio_or_value="10:1", dilution_factor=0.100000
                )
            )
            dilution_factors.append(
                PriceDilutionFactor(
                    symbol=sym, split_multiplier=0.100000,
                    valid_from_date=date(2026, 1, 25), valid_thru_date=date(9999, 12, 31)
                )
            )
        else:
            dilution_factors.append(
                PriceDilutionFactor(
                    symbol=sym, split_multiplier=1.000000,
                    valid_from_date=date(2025, 1, 1), valid_thru_date=date(9999, 12, 31)
                )
            )

    db.bulk_save_objects(corp_events)
    db.bulk_save_objects(dilution_factors)
    db.flush()
    print(f"[seed] Seeded {len(corp_events)} corporate events & {len(dilution_factors)} dilution factors.")

    # ── 8. Broker Daily Summary ──────────────────────────────────────────────
    print("[seed] Seeding broker_daily_summary across observation window...")
    broker_summaries: list[BrokerDailySummary] = []
    for tm_id, tm_name in BROKERS:
        for trd_d in recent_15_days:
            d_str = trd_d.strftime("%Y-%m-%d")
            for sym, _, _, _, _, _ in SYMBOLS[:6]:
                cp = close_price_by_sym_date.get((sym, d_str), 100.0)
                b_vol = random.randint(150000, 600000)
                s_vol = random.randint(140000, 580000)
                w_vol = random.randint(15000, 80000) if tm_id == "TM101" and sym == "NOVAENERGY" else 0
                tot_val = round((b_vol + s_vol) * cp, 2)
                broker_summaries.append(
                    BrokerDailySummary(
                        trading_member_id=tm_id,
                        trading_member_name=tm_name,
                        symbol=sym,
                        trade_date=trd_d,
                        total_buy_volume=b_vol,
                        total_sell_volume=s_vol,
                        same_broker_wash_volume=w_vol,
                        total_turnover_value=tot_val
                    )
                )

    db.bulk_save_objects(broker_summaries)
    db.flush()
    print(f"[seed] Seeded {len(broker_summaries)} broker daily summary records.")

    # ── 9. Surveillance Alert Cases ──────────────────────────────────────────
    print("[seed] Seeding surveillance_alert_cases...")
    alert_cases = [
        SurveillanceAlertCase(
            symbol="NOVAENERGY",
            observation_date=OBSERVATION_DATE,
            composite_risk_score=28.50,
            alert_severity_level="HIGH",
            surveillance_status="ACTIVE",
            metric_price_rise_pct=276.85,
            metric_price_zscore=3.42,
            metric_volume_zscore=4.15,
            metric_band_hit_days=8,
            metric_new_high_days=11,
            assigned_officer="vishesh_admin",
            investigation_notes="Scrip flagged with high composite score (28.5/100). Concentrated aggressive buy push delivered by Rahul Gupta and Lokesh Joshi lifting ask price. High bilateral counterparty concentration with Jayant Trivedi.",
            last_updated_time=datetime.utcnow()
        ),
        SurveillanceAlertCase(
            symbol="ALPHATECH",
            observation_date=OBSERVATION_DATE,
            composite_risk_score=78.50,
            alert_severity_level="HIGH",
            surveillance_status="ACTIVE",
            metric_price_rise_pct=28.40,
            metric_price_zscore=2.45,
            metric_volume_zscore=2.80,
            metric_band_hit_days=5,
            metric_new_high_days=8,
            assigned_officer="arao_analyst",
            investigation_notes="High-risk alert: Repeated circuit touches with promoter pledge leverage (12.5%) and concentrated bilateral trading.",
            last_updated_time=datetime.utcnow()
        ),
        SurveillanceAlertCase(
            symbol="ZENITHBIO",
            observation_date=OBSERVATION_DATE,
            composite_risk_score=56.00,
            alert_severity_level="MEDIUM",
            surveillance_status="ACTIVE",
            metric_price_rise_pct=14.20,
            metric_price_zscore=1.60,
            metric_volume_zscore=1.95,
            metric_band_hit_days=2,
            metric_new_high_days=4,
            assigned_officer="analyst_surv",
            investigation_notes="Medium risk alert: Elevated volume Z-score with moderate upper circuit persistence.",
            last_updated_time=datetime.utcnow()
        ),
        SurveillanceAlertCase(
            symbol="ORBITCEM",
            observation_date=OBSERVATION_DATE,
            composite_risk_score=52.00,
            alert_severity_level="MEDIUM",
            surveillance_status="ACTIVE",
            metric_price_rise_pct=18.10,
            metric_price_zscore=1.75,
            metric_volume_zscore=2.10,
            metric_band_hit_days=3,
            metric_new_high_days=5,
            assigned_officer="analyst_surv",
            investigation_notes="Medium risk alert: Upper circuit spike on single session with CTCL algorithmic execution pattern.",
            last_updated_time=datetime.utcnow()
        ),
    ]

    benchmark_scores = {
        "SBIN":       (22.50, 6.20, 0.85, 1.15, 0, 1),
        "AXISBANK":   (19.50, 5.40, 0.60, 0.95, 0, 1),
        "ICICIBANK":  (18.00, 4.10, 0.45, 0.80, 0, 0),
        "BAJFINANCE": (17.50, 4.80, 0.55, 0.85, 0, 1),
        "SUNPHARMA":  (16.00, 3.80, 0.50, 0.75, 0, 1),
        "WIPRO":      (15.00, 3.20, 0.40, 0.70, 0, 0),
        "INFY":       (14.50, 3.10, 0.35, 0.60, 0, 0),
        "HDFCBANK":   (13.00, 2.50, 0.25, 0.50, 0, 0),
        "TCS":        (12.00, 2.30, 0.20, 0.40, 0, 0),
        "RELIANCE":   (11.00, 1.80, 0.15, 0.30, 0, 0),
        "MARUTI":     (10.50, 1.50, 0.10, 0.25, 0, 0),
    }

    for sym, _, _, _, _, profile in SYMBOLS:
        if profile == "BENCHMARK":
            score, p_rise, p_z, v_z, b_hits, n_highs = benchmark_scores.get(sym, (12.0, 2.0, 0.2, 0.4, 0, 0))
            alert_cases.append(
                SurveillanceAlertCase(
                    symbol=sym,
                    observation_date=OBSERVATION_DATE,
                    composite_risk_score=score,
                    alert_severity_level="LOW",
                    surveillance_status="MONITORED",
                    metric_price_rise_pct=p_rise,
                    metric_price_zscore=p_z,
                    metric_volume_zscore=v_z,
                    metric_band_hit_days=b_hits,
                    metric_new_high_days=n_highs,
                    assigned_officer=None,
                    investigation_notes="Benchmark institutional security continuously observed under standard surveillance filters.",
                    last_updated_time=datetime.utcnow()
                )
            )

    db.bulk_save_objects(alert_cases)
    db.commit()
    print(f"[seed] Seeded {len(alert_cases)} surveillance alert cases.")

    print("[seed] Database seeding completed successfully with zero proprietary leaks.")
    return {
        "status": "SUCCESS",
        "daily_market_eod": len(all_eod_records),
        "participant_daily_trades": len(part_trades),
        "counterparty_trade_pairs": len(cpty_pairs),
        "client_identity_master": len(client_entities),
        "client_demat_accounts": len(demat_entities),
        "shareholding_summary": len(sh_summary_records),
        "large_shareholders_registry": len(large_holder_records),
        "corporate_events_feed": len(corp_events),
        "price_dilution_factors": len(dilution_factors),
        "broker_daily_summary": len(broker_summaries),
        "surveillance_alert_cases": len(alert_cases),
        "trading_session_calendar": len(cal_records),
        "market_baseline_stats": len(all_baseline_stats),
    }


if __name__ == "__main__":
    session = SessionLocal()
    try:
        res = seed_database(session)
        print("Result:", res)
    finally:
        session.close()
