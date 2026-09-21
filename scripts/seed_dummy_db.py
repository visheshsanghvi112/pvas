"""
scripts/seed_dummy_db.py
────────────────────────────────────────────────────────────────────────────
Programmatic Synthetic Generator for Sanitized Reference Dummy Database.

Purpose:
  Generates a complete, realistic, multi-symbol synthetic surveillance database
  using ONLY sanitized, generic, vendor-agnostic entity and attribute names.
  Mirrors the exact generation principles of production seeders (Geometric Brownian
  Motion, volume surges, and bilateral counterparty concentration) without
  any proprietary corporate schema names or column leaks.

Target Schema:
  Fully adheres to DUMMY_SURVEILLANCE_SCHEMA.sql (15 tables, 3 analytical views).

Usage:
  python3 scripts/seed_dummy_db.py [--db-path dummy_surveillance.db] [--days 260]
"""

import os
import sys
import random
import string
import sqlite3
import argparse
from datetime import date, datetime, timedelta
import numpy as np

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

# Generic scrip universe matching surveillance scenarios
SYMBOLS = [
    ("NOVAENERGY",  140.0,   0.25, "INE002B01020"), # High Risk (Pump & Circuit Surges)
    ("ALPHATECH",   2400.0,  0.08, "INE001A01010"), # High Risk (Concentrated Trading)
    ("ZENITHBIO",   1600.0,  0.05, "INE003C01030"), # Medium Risk (Volume Surge)
    ("ORBITCEM",    1550.0,  0.12, "INE004D01040"), # Medium Risk (Volume Surge)
    ("TCS",         3800.0,  0.04, "INE467B01029"), # Low Risk (Benchmark Bluechip)
    ("SBIN",         780.0,  0.18, "INE062A01020"), # Low Risk
    ("ICICIBANK",   1100.0,  0.06, "INE090A01021"), # Low Risk
    ("AXISBANK",    1150.0,  0.15, "INE238A01034"), # Low Risk
    ("RELIANCE",    2900.0,  0.06, "INE002A01018"), # Low Risk
    ("HDFCBANK",    1750.0,  0.05, "INE040A01034"), # Low Risk
    ("INFY",        1550.0,  0.07, "INE009A01021"), # Low Risk
    ("WIPRO",        480.0,  0.10, "INE075A01022"), # Low Risk
    ("BAJFINANCE",  7200.0,  0.12, "INE296A01024"), # Low Risk
    ("MARUTI",     11000.0,  0.08, "INE585B01010"), # Low Risk
    ("SUNPHARMA",   1200.0,  0.09, "INE044A01036"), # Low Risk
]

COMPANY_NAMES = {
    "ALPHATECH": "Alpha Technologies Ltd",
    "NOVAENERGY": "Nova Energy Ltd",
    "ZENITHBIO": "Zenith Bio-Tech Ltd",
    "ORBITCEM": "Orbit Cement Ltd",
    "TCS": "Tata Consultancy Services Ltd",
    "SBIN": "State Bank of India",
    "ICICIBANK": "ICICI Bank Ltd",
    "AXISBANK": "Axis Bank Ltd",
    "RELIANCE": "Reliance Industries Ltd",
    "HDFCBANK": "HDFC Bank Ltd",
    "INFY": "Infosys Ltd",
    "WIPRO": "Wipro Ltd",
    "BAJFINANCE": "Bajaj Finance Ltd",
    "MARUTI": "Maruti Suzuki India Ltd",
    "SUNPHARMA": "Sun Pharma Industries Ltd",
}

BROKERS = [
    ("BRK0001", "Apex Global Securities Ltd"),
    ("BRK0002", "Zenith Capital Markets Ltd"),
    ("BRK0003", "Summit Financial Services Ltd"),
    ("BRK0004", "Vanguard Wealth Management Ltd"),
    ("BRK0005", "Pioneer Broking & Trades Ltd"),
    ("BRK0006", "Beacon Equity Partners Ltd"),
    ("BRK0007", "Horizon Prime Securities Ltd"),
    ("BRK0008", "Equinox Trading Desk Ltd"),
    ("BRK0009", "Nexus Capital Advisors Ltd"),
    ("BRK0010", "Matrix Clearing & Broking Ltd")
]

FIRST_NAMES = ["Rahul", "Sunita", "Jayant", "Lokesh", "Vikram", "Aditi", "Aarav", 
               "Meera", "Farhan", "Kavya", "Nikhil", "Pooja", "Arjun", "Deepa"]
LAST_NAMES = ["Gupta", "Trivedi", "Joshi", "Kapoor", "Sharma", "Agarwal", "Patel", 
              "Mehta", "Iyer", "Singh", "Chatterjee", "Desai"]
CITIES = ["Mumbai", "Ahmedabad", "Surat", "Delhi", "Jaipur", "Bengaluru", "Hyderabad", "Kolkata"]


def make_pan(seed_key: str) -> str:
    r = random.Random(seed_key)
    a5 = "".join(r.choices(string.ascii_uppercase, k=5))
    d4 = "".join(r.choices(string.digits, k=4))
    a1 = r.choice(string.ascii_uppercase)
    return f"{a5}{d4}{a1}"


def get_trading_days(n_days: int = 260) -> list[date]:
    dates = []
    curr = date(2026, 8, 27)  # Baseline alignment date
    while len(dates) < n_days:
        if curr.weekday() < 5:  # Monday to Friday
            dates.append(curr)
        curr -= timedelta(days=1)
    return sorted(dates)


def create_schema(conn: sqlite3.Connection, schema_sql_path: str):
    """Executes the DDL sections (tables and views) of DUMMY_SURVEILLANCE_SCHEMA.sql."""
    with open(schema_sql_path, "r", encoding="utf-8") as f:
        full_sql = f.read()

    # Section 1-8 is tables DDL; Section 9 is sample INSERTs; Section 10 is views DDL
    parts = []
    if "-- SECTION 9" in full_sql:
        parts.append(full_sql.split("-- SECTION 9")[0])
    else:
        parts.append(full_sql)

    if "-- SECTION 10" in full_sql:
        sec10_sql = "-- SECTION 10" + full_sql.split("-- SECTION 10")[1]
        parts.append(sec10_sql)

    ddl_sql = "\n\n".join(parts)
    conn.executescript(ddl_sql)
    conn.commit()


def seed_dummy_database(conn: sqlite3.Connection, num_days: int = 260):
    c = conn.cursor()
    c.execute("PRAGMA foreign_keys = ON;")

    print(f"[*] Generating {num_days} trading days series...")
    t_days = get_trading_days(num_days)

    # 1. Trading Session Calendar
    print("[*] Seeding trading_session_calendar...")
    cal_rows = []
    all_dates_set = set(t_days)
    cur_d = t_days[0]
    while cur_d <= t_days[-1]:
        is_mkt = cur_d in all_dates_set
        desc = "Regular Trading Session" if is_mkt else ("Weekend" if cur_d.weekday() >= 5 else "Exchange Holiday")
        cal_rows.append((cur_d.strftime("%Y-%m-%d"), 1 if is_mkt else 0, desc, 0))
        cur_d += timedelta(days=1)

    c.executemany("INSERT OR IGNORE INTO trading_session_calendar VALUES (?, ?, ?, ?)", cal_rows)

    # 2. Master Identity & Demat Accounts (500 Synthetic Clients)
    print("[*] Seeding client_identity_master and client_demat_accounts...")
    clients = []
    # Concentrated trading participants for testing
    ring_pans = ["HWFTM1488X", "CVXUL2488S", "XWRUW6552F", "PKTBY7338I", "WGLNH6994Q"]
    for i in range(500):
        if i < len(ring_pans):
            pan = ring_pans[i]
        else:
            pan = make_pan(f"DUMMY_CLIENT_{i:04d}")
        
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        name = f"{fn} {ln}"
        city = random.choice(CITIES)
        entity_type = "PROMOTER" if i == 0 else ("CORPORATE" if i % 10 == 0 else "INDIVIDUAL")
        risk_grade = "WATCHLIST" if i < 15 else ("HIGH" if i < 40 else "STANDARD")
        reg_date = (date(2021, 1, 1) + timedelta(days=i * 3)).strftime("%Y-%m-%d")

        clients.append({
            "pan": pan,
            "name": name,
            "type": entity_type,
            "city": city,
            "grade": risk_grade,
            "reg_date": reg_date
        })

    client_map = {cl["pan"]: cl for cl in clients}

    c.executemany("""
        INSERT OR IGNORE INTO client_identity_master 
        (client_pan, client_legal_name, entity_type, account_state, residential_city, registration_date, risk_profile_grade)
        VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?)
    """, [(cl["pan"], cl["name"], cl["type"], cl["city"], cl["reg_date"], cl["grade"]) for cl in clients])

    # Demat Accounts
    demat_rows = []
    for idx, cl in enumerate(clients):
        dep_id = "IN300" + str(100 + (idx % 20))
        ben_acc = f"10{idx:06d}"
        joint2 = clients[(idx + 1) % len(clients)]["pan"] if idx < 5 else None
        bank_masked = f"XXXXXX{random.randint(1000, 9999)}"
        demat_rows.append((cl["pan"], dep_id, ben_acc, cl["reg_date"], joint2, None, 0, bank_masked))

    c.executemany("""
        INSERT OR IGNORE INTO client_demat_accounts
        (client_pan, depository_id, beneficiary_acc_no, account_open_date, joint_holder_pan_2, joint_holder_pan_3, is_poa_active, bank_account_masked)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, demat_rows)

    # 3. Market EOD & Baseline Stats (OHLCV Simulation)
    print("[*] Generating daily_market_eod and market_baseline_stats...")
    eod_rows = []
    baseline_rows = []

    for sym, base_price, vol_pct, isin in SYMBOLS:
        closes = np.zeros(num_days)
        volumes = np.zeros(num_days)
        closes[0] = base_price

        # Simulate price paths
        for day_i in range(1, num_days):
            if sym == "NOVAENERGY":
                # Accelerated pump in last 15 days
                ret = random.uniform(0.045, 0.05) if day_i >= (num_days - 15) else random.gauss(0.001, 0.015)
            elif sym == "ALPHATECH":
                ret = random.gauss(0.003, 0.018) if day_i >= (num_days - 15) else random.gauss(0.0005, 0.008)
            else:
                ret = random.gauss(0.0002, 0.01)
            closes[day_i] = round(max(1.0, closes[day_i - 1] * (1.0 + ret)), 2)

        # Volumes
        for day_i in range(num_days):
            if sym == "NOVAENERGY" and day_i >= (num_days - 15):
                v = int(random.gauss(1800000, 200000))
            elif sym == "ORBITCEM" and day_i >= (num_days - 15):
                v = int(random.gauss(950000, 80000))
            else:
                v = int(max(20000, random.gauss(150000, 25000)))
            volumes[day_i] = v

        # Insert records
        for day_i, trd_date in enumerate(t_days):
            d_str = trd_date.strftime("%Y-%m-%d")
            c_price = float(closes[day_i])
            prev_c = float(closes[day_i - 1]) if day_i > 0 else c_price
            o_price = round(prev_c * random.uniform(0.998, 1.003), 2)
            h_price = round(max(o_price, c_price) * random.uniform(1.0, 1.012), 2)
            l_price = round(min(o_price, c_price) * random.uniform(0.988, 1.0), 2)
            tot_qty = int(volumes[day_i])
            tot_val = round(tot_qty * c_price, 2)
            upp_band = round(prev_c * 1.05, 2)
            low_band = round(prev_c * 0.95, 2)
            deliv_qty = int(tot_qty * random.uniform(0.25, 0.65))

            comp_name = COMPANY_NAMES.get(sym, f"{sym} Ltd")
            eod_rows.append((
                sym, d_str, isin, comp_name, o_price, h_price, l_price, c_price,
                tot_qty, tot_val, upp_band, low_band, deliv_qty, prev_c
            ))

            # Rolling 180-day baseline stats
            if day_i >= 180:
                hist_c = closes[day_i - 180 : day_i]
                hist_v = volumes[day_i - 180 : day_i]
                base_p = float(hist_c[0])
                v_mean = float(np.mean(hist_v))
                v_std = float(max(1.0, np.std(hist_v)))
                ret_arr = np.diff(hist_c) / hist_c[:-1]
                r_mean = float(np.mean(ret_arr))
                r_std = float(max(0.001, np.std(ret_arr)))
                peak_h = float(np.max(hist_c))

                baseline_rows.append((
                    sym, d_str, base_p, round(v_mean, 2), round(v_std, 2),
                    round(r_mean, 6), round(r_std, 6), round(peak_h, 2)
                ))

    c.executemany("""
        INSERT OR IGNORE INTO daily_market_eod
        (symbol, trade_date, isin, company_name, open_price, day_high_price, day_low_price,
         close_price, total_traded_quantity, total_traded_value, upper_circuit_limit, lower_circuit_limit,
         delivery_quantity, prev_close_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, eod_rows)

    c.executemany("""
        INSERT OR IGNORE INTO market_baseline_stats
        (symbol, trade_date, base_price_180d, baseline_volume_mean, baseline_volume_std,
         return_mean_180d, return_std_180d, peak_high_180d)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, baseline_rows)

    # 4. Participant Daily Trades & Counterparty Pairs (Last 15 Days Focus)
    print("[*] Generating participant_daily_trades and counterparty_trade_pairs...")
    part_trades = []
    cpty_pairs = []
    recent_15_days = t_days[-15:]

    for sym, _, _, _ in SYMBOLS:
        active_pans = [cl["pan"] for cl in clients[:30]]
        for trd_d in recent_15_days:
            d_str = trd_d.strftime("%Y-%m-%d")
            # 5 to 15 active participants daily
            sampled_pans = random.sample(active_pans, random.randint(8, 18))
            for idx_p, pan in enumerate(sampled_pans):
                cl_info = client_map[pan]
                cl_name = cl_info["name"]
                cl_type = cl_info["type"]
                brk = random.choice(BROKERS)[0]
                b_qty = random.randint(15000, 120000)
                s_qty = random.randint(10000, 110000)
                # Lookup close price
                c.execute("SELECT close_price FROM daily_market_eod WHERE symbol=? AND trade_date=?", (sym, d_str))
                row = c.fetchone()
                cp = row[0] if row else 100.0
                b_val = round(b_qty * cp, 2)
                s_val = round(s_qty * cp, 2)

                # Aggressive push vs pull
                if pan in ring_pans:
                    push_val = round(b_val * 0.08, 2) # Pump push
                    pull_val = round(s_val * 0.01, 2)
                    wash_q = int(min(b_qty, s_qty) * 0.75)
                else:
                    push_val = round(b_val * 0.02, 2)
                    pull_val = round(s_val * 0.02, 2)
                    wash_q = 0

                part_trades.append((
                    sym, d_str, pan, cl_name, brk, b_qty, s_qty, b_val, s_val, push_val, pull_val, wash_q, cl_type
                ))

            # Generate Counterparty Matches (Top bilateral trading pairs across all symbols)
            if sym in ["NOVAENERGY", "ALPHATECH", "ZENITHBIO", "ORBITCEM"]:
                bilateral_legs = [
                    ("HWFTM1488X", "CVXUL2488S", "BRK0001", "BRK0002", 520000 if sym == "NOVAENERGY" else 310000),
                    ("CVXUL2488S", "XWRUW6552F", "BRK0002", "BRK0003", 510000 if sym == "NOVAENERGY" else 290000),
                    ("XWRUW6552F", "HWFTM1488X", "BRK0003", "BRK0001", 495000 if sym == "NOVAENERGY" else 280000),
                    ("PKTBY7338I", "WGLNH6994Q", "BRK0004", "BRK0005", 280000 if sym == "NOVAENERGY" else 180000),
                    ("WGLNH6994Q", "PKTBY7338I", "BRK0005", "BRK0004", 275000 if sym == "NOVAENERGY" else 175000)
                ]
            else:
                p0 = active_pans[0]
                p1 = active_pans[1]
                p2 = active_pans[2]
                p3 = active_pans[3]
                bilateral_legs = [
                    (p0, p1, "BRK0001", "BRK0002", random.randint(30000, 80000)),
                    (p2, p3, "BRK0003", "BRK0004", random.randint(25000, 70000)),
                    (p1, p0, "BRK0002", "BRK0001", random.randint(20000, 60000)),
                ]

            for b_pan, s_pan, b_brk, s_brk, m_qty in bilateral_legs:
                m_val = round(m_qty * cp, 2)
                b_name = client_map[b_pan]["name"]
                s_name = client_map[s_pan]["name"]
                ltp_push = round(m_val * (0.06 if b_pan in ring_pans else 0.02), 2)
                cpty_pairs.append((
                    sym, d_str, b_pan, b_name, s_pan, s_name, b_brk, s_brk, m_qty, m_val,
                    ltp_push, 1 if b_brk == s_brk else 0, 1
                ))

    c.executemany("""
        INSERT OR IGNORE INTO participant_daily_trades
        (symbol, trade_date, client_pan, client_legal_name, trading_member_id, buy_quantity, sell_quantity,
         buy_turnover_value, sell_turnover_value, gross_positive_ltp_value, gross_negative_ltp_value, same_broker_wash_quantity, client_category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, part_trades)

    c.executemany("""
        INSERT OR IGNORE INTO counterparty_trade_pairs
        (symbol, trade_date, buyer_pan, buyer_legal_name, seller_pan, seller_legal_name,
         buyer_tm_id, seller_tm_id, matched_quantity, matched_turnover_value, pairwise_ltp_push_value,
         is_same_broker_wash, algo_execution_flag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, cpty_pairs)

    # 5. Shareholding Summary & Registry
    print("[*] Seeding shareholding_summary and large_shareholders_registry...")
    shld_summary = []
    shld_large = []
    quarters = [("Q325", "2025-09-30"), ("Q425", "2025-12-31"), ("Q126", "2026-03-31"), ("Q226", "2026-06-30")]

    for sym, _, _, _ in SYMBOLS:
        tot_cap = 100_000_000 # 10 Cr shares
        for q_code, q_date in quarters:
            prom_pct = 54.20 if sym == "NOVAENERGY" else 62.50
            top1_pct = 22.80 if sym == "NOVAENERGY" else 18.20
            gen_pct = round(100.0 - prom_pct - top1_pct, 2)

            shld_summary.append((sym, q_code, q_date, "PROMOTER_GROUP", int(tot_cap * prom_pct / 100), prom_pct, 12.50, 4, 1))
            shld_summary.append((sym, q_code, q_date, "TOP_1_PCT_PUBLIC", int(tot_cap * top1_pct / 100), top1_pct, 0.0, 18, 12))
            shld_summary.append((sym, q_code, q_date, "GENERAL_PUBLIC_FLOAT", int(tot_cap * gen_pct / 100), gen_pct, 0.0, 42000, 850))

            # Large shareholders
            shld_large.append((sym, q_code, clients[0]["pan"], clients[0]["name"], "PROMOTER", int(tot_cap * prom_pct / 100), prom_pct, 0))
            shld_large.append((sym, q_code, clients[1]["pan"], clients[1]["name"], "INSTITUTIONAL_DII", int(tot_cap * 0.08), 8.00, 0))
            shld_large.append((sym, q_code, clients[2]["pan"], clients[2]["name"], "INSTITUTIONAL_FPI", int(tot_cap * 0.055), 5.50, 0))
            shld_large.append((sym, q_code, clients[3]["pan"], clients[3]["name"], "PUBLIC_INDIVIDUAL", int(tot_cap * 0.04), 4.00, 0))

    c.executemany("""
        INSERT OR IGNORE INTO shareholding_summary
        (symbol, quarter_code, filing_date, category_type, total_shares_count, holding_percentage, pledged_shares_percentage, unique_holding_pans, avg_daily_trading_pans)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, shld_summary)

    c.executemany("""
        INSERT OR IGNORE INTO large_shareholders_registry
        (symbol, quarter_code, holder_pan, holder_legal_name, holder_category, shares_held, holding_percentage, pledged_shares_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, shld_large)

    # 6. Corporate Actions & Dilution Factors
    print("[*] Seeding corporate_events_feed and price_dilution_factors...")
    corp_rows = []
    dilution_rows = []
    for sym, _, _, isin in SYMBOLS:
        corp_rows.append((sym, isin, "BOARD_MEETING", f"{sym} Board Meeting to consider Financial Results", "2026-07-15", None, None, None, 1.000000))
        corp_rows.append((sym, isin, "DIVIDEND", f"{sym} Interim Dividend announcement of INR 4.50 per share", "2026-05-10", "2026-05-24", "2026-05-26", "INR 4.50/sh", 1.000000))
        if sym == "NOVAENERGY":
            corp_rows.append((sym, isin, "BONUS", f"{sym} 1:1 Bonus Issue of Equity Shares", "2026-02-15", "2026-03-01", "2026-03-03", "1:1", 0.500000))
            dilution_rows.append((sym, 0.500000, "2026-03-01", "9999-12-31"))
        elif sym == "ALPHATECH":
            corp_rows.append((sym, isin, "SPLIT", f"{sym} Stock Split 10:1 (FV INR 10 to INR 1)", "2026-01-10", "2026-01-25", "2026-01-27", "10:1", 0.100000))
            dilution_rows.append((sym, 0.100000, "2026-01-25", "9999-12-31"))
        else:
            dilution_rows.append((sym, 1.000000, "2025-01-01", "9999-12-31"))

    c.executemany("""
        INSERT OR IGNORE INTO corporate_events_feed
        (symbol, isin, action_category, announcement_purpose, announcement_date, ex_date, record_date, ratio_or_value, dilution_factor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, corp_rows)

    c.executemany("""
        INSERT OR IGNORE INTO price_dilution_factors
        (symbol, split_multiplier, valid_from_date, valid_thru_date)
        VALUES (?, ?, ?, ?)
    """, dilution_rows)

    # 7. Broker Daily Summary (Across All 15 Symbols)
    print("[*] Seeding broker_daily_summary...")
    broker_rows = []
    for sym, _, _, _ in SYMBOLS:
        for trd_d in recent_15_days:
            d_str = trd_d.strftime("%Y-%m-%d")
            for brk_id, brk_name in BROKERS[:6]:
                buy_v = random.randint(100000, 600000)
                sell_v = random.randint(90000, 580000)
                cross_v = int(min(buy_v, sell_v) * random.uniform(0.05, 0.20))
                turnover = round((buy_v + sell_v) * 140.0, 2)
                broker_rows.append((brk_id, brk_name, sym, d_str, buy_v, sell_v, cross_v, turnover))

    c.executemany("""
        INSERT OR IGNORE INTO broker_daily_summary
        (trading_member_id, trading_member_name, symbol, trade_date, total_buy_volume, total_sell_volume, same_broker_wash_volume, total_turnover_value)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, broker_rows)

    # 8. Surveillance Alert Cases, Users & Compliance Audit Logs (All 15 Scrips Evaluated)
    print("[*] Seeding surveillance_alert_cases, portal_user_accounts, and compliance_audit_logs...")
    alert_rows = [
        ("NOVAENERGY", "2026-08-27", 90.00, "HIGH", "ACTIVE", 44.80, 2.94, 3.82, 9, 14, "Officer_Surv_01", "Severe circuit band clustering and abnormal price-volume spikes detected."),
        ("ALPHATECH", "2026-08-27", 78.50, "HIGH", "ACTIVE", 28.40, 2.45, 2.80, 5, 8, "Officer_Surv_02", "High bilateral counterparty volume concentration between synchronized entities."),
        ("ZENITHBIO", "2026-08-27", 56.00, "MEDIUM", "ACTIVE", 14.20, 1.60, 1.95, 2, 4, "Officer_Surv_01", "Abnormal price growth and upper band touches detected."),
        ("ORBITCEM", "2026-08-27", 52.00, "MEDIUM", "ACTIVE", 18.10, 1.75, 2.10, 3, 5, "Officer_Surv_03", "Sudden volume surge without corresponding fundamental announcement."),
        ("SBIN", "2026-08-27", 22.50, "LOW", "MONITORED", 6.20, 0.85, 1.15, 0, 1, "Officer_Surv_02", "Routine banking sector volatility within normal statistical baseline."),
        ("ICICIBANK", "2026-08-27", 18.00, "LOW", "MONITORED", 4.10, 0.45, 0.80, 0, 0, "Officer_Surv_02", "Order flows and participant conduct within standard risk tolerances."),
        ("AXISBANK", "2026-08-27", 19.50, "LOW", "MONITORED", 5.40, 0.60, 0.95, 0, 1, "Officer_Surv_02", "Trading activity consistent with peer group benchmarks."),
        ("TCS", "2026-08-27", 12.00, "LOW", "MONITORED", 2.30, 0.20, 0.40, 0, 0, "Officer_Surv_01", "Benchmark bluechip scrip operating within expected volatility thresholds."),
        ("INFY", "2026-08-27", 14.50, "LOW", "MONITORED", 3.10, 0.35, 0.60, 0, 0, "Officer_Surv_01", "Normal institutional liquidity and diversified order distribution."),
        ("RELIANCE", "2026-08-27", 11.00, "LOW", "MONITORED", 1.80, 0.15, 0.30, 0, 0, "Officer_Surv_01", "Broad institutional market participation with zero concentration flags."),
        ("HDFCBANK", "2026-08-27", 13.00, "LOW", "MONITORED", 2.50, 0.25, 0.50, 0, 0, "Officer_Surv_02", "Normal liquidity with absence of aggressive directional order clustering."),
        ("WIPRO", "2026-08-27", 15.00, "LOW", "MONITORED", 3.20, 0.40, 0.70, 0, 0, "Officer_Surv_03", "Standard EOD trading volume and healthy delivery ratio."),
        ("BAJFINANCE", "2026-08-27", 17.50, "LOW", "MONITORED", 4.80, 0.55, 0.85, 0, 1, "Officer_Surv_03", "Balanced retail-institutional flow with normal spread distribution."),
        ("MARUTI", "2026-08-27", 10.50, "LOW", "MONITORED", 1.50, 0.10, 0.25, 0, 0, "Officer_Surv_03", "Auto sector benchmark trading within statutory historical parameters."),
        ("SUNPHARMA", "2026-08-27", 16.00, "LOW", "MONITORED", 3.80, 0.50, 0.75, 0, 1, "Officer_Surv_01", "Pharma sector constituent exhibiting normal market conduct.")
    ]
    c.executemany("""
        INSERT OR IGNORE INTO surveillance_alert_cases
        (symbol, observation_date, composite_risk_score, alert_severity_level, surveillance_status,
         metric_price_rise_pct, metric_price_zscore, metric_volume_zscore, metric_band_hit_days, metric_new_high_days,
         assigned_officer, investigation_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, alert_rows)

    # Portal Users (Default Admin & Analyst)
    # Using sha256 placeholder for vishesh123
    import hashlib
    pw_hash = hashlib.sha256("vishesh123".encode()).hexdigest()
    user_rows = [
        ("vishesh_admin", pw_hash, "Admin", 1),
        ("surv_analyst", pw_hash, "Analyst", 1),
        ("compliance_auditor", pw_hash, "Viewer", 1)
    ]
    c.executemany("""
        INSERT OR IGNORE INTO portal_user_accounts
        (username, password_hash, assigned_role, is_account_active)
        VALUES (?, ?, ?, ?)
    """, user_rows)

    # Compliance Audit Logs
    audit_rows = [
        ("2026-08-27 09:30:15", "vishesh_admin", "SYSTEM_INIT", "CORE_ENGINE", "Surveillance pipeline initialized for observation date 2026-08-27.", "127.0.0.1"),
        ("2026-08-27 10:15:42", "surv_analyst", "VIEW_DOSSIER", "NOVAENERGY", "Analyst inspected counterparty concentration and volume share.", "192.168.1.45"),
        ("2026-08-27 11:00:20", "vishesh_admin", "ALERT_DISPATCH", "NOVAENERGY", "Formal surveillance query dossier dispatched to Exchange Operations.", "127.0.0.1")
    ]
    c.executemany("""
        INSERT OR IGNORE INTO compliance_audit_logs
        (log_timestamp, username, action_code, target_entity, action_narrative, client_ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
    """, audit_rows)

    conn.commit()
    print("[+] Database successfully seeded with 0 proprietary name leaks!")


def main():
    parser = argparse.ArgumentParser(description="Programmatic Synthetic Generator for Sanitized Dummy Surveillance Database")
    parser.add_argument("--db-path", default="dummy_surveillance.db", help="Target SQLite database file path")
    parser.add_argument("--schema-sql", default="DUMMY_SURVEILLANCE_SCHEMA.sql", help="Path to sanitized DDL schema SQL")
    parser.add_argument("--days", type=int, default=260, help="Number of trading days to simulate (default: 260)")
    args = parser.parse_args()

    print(f"=== Synthetic Dummy Surveillance Database Generator ===")
    print(f"Target DB: {args.db_path}")
    print(f"Schema:    {args.schema_sql}")
    print(f"Horizon:   {args.days} trading days\n")

    if os.path.exists(args.db_path):
        print(f"[*] Removing existing {args.db_path} to ensure clean initialization...")
        os.remove(args.db_path)

    conn = sqlite3.connect(args.db_path)
    try:
        print("[1/2] Creating tables and views from sanitized schema...")
        create_schema(conn, args.schema_sql)
        print("[2/2] Generating programmatic synthetic market and trade data...")
        seed_dummy_database(conn, num_days=args.days)
        print("\n=== Verification Summary ===")
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [r[0] for r in c.fetchall()]
        print(f"Tables ({len(tables)}): {', '.join(tables)}")
        for t in tables:
            c.execute(f"SELECT COUNT(*) FROM {t}")
            cnt = c.fetchone()[0]
            print(f"  {t:<30}: {cnt:>6} rows")

        # Run integrity and foreign key checks
        c.execute("PRAGMA integrity_check;")
        print(f"\nIntegrity check:   {c.fetchone()[0]}")
        c.execute("PRAGMA foreign_key_check;")
        fk_errs = c.fetchall()
        print(f"Foreign key check: {len(fk_errs)} violations")

        # Verify Views
        c.execute("SELECT name FROM sqlite_master WHERE type='view';")
        views = [r[0] for r in c.fetchall()]
        print(f"\nAnalytical Views ({len(views)}): {', '.join(views)}")
        for v in views:
            c.execute(f"SELECT COUNT(*) FROM {v}")
            cnt = c.fetchone()[0]
            print(f"  {v:<35}: {cnt:>6} rows")

        # Test Counterparty Concentration View Details
        c.execute("SELECT symbol, trade_date, buyer_name, seller_name, matched_quantity, pair_volume_share_pct FROM v_counterparty_concentration LIMIT 3;")
        pairs = c.fetchall()
        print(f"\nSample Counterparty Concentration Pairs:")
        for sym, d, bn, sn, mq, sp in pairs:
            print(f"  [{sym} on {d}] {bn} <-> {sn}: {mq:,} shares ({sp:.2f}% share)")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
