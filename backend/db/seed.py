"""
backend/db/seed.py
────────────────────────────────────────────────────────────────────────────
Generates realistic synthetic surveillance data directly for aggregate daily tables.

Scale:
  - 500 DIM_EXCH_CLNT_DTLS rows (clients at exchange)
  - 500 DIM_DEP_CLNT_DTLS rows (same clients at depository, cross-linked)
  - AGG_SEC_DAY, AGG_CLNT_SEC_DAY, and AGG_PAN_PAIR_DAY rows spanning 260 trading days

Realism guarantees:
  - FK consistency: all Clnt_Token references resolve to real DECL rows
  - Aggregate wash counts and volume signals embedded directly
  - Price ranges per symbol match the existing PV surveillance engine scrips
  - Daily data spans last 260 trading days
"""

import random
import string
import zlib
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from backend.db.models import (
    DimExchClntDtls, DimDepClntDtls,
    FactMstrSharehldg, FactMainShldng, FactPromShldrDtls, FactPubShldrDtls,
    FactDvrShldng, FactDrHolding, FactLkdinShldng, FactCmpExchShldng,
    FactCorpActions, FactCaDilFctr,
    SysUser, SysAuditLog, ForensicCase,
    AggSecDay, AggClntSecDay, AggPanPairDay
)
from backend.security import hash_password

# ── Seed constants ────────────────────────────────────────────────────────────
RANDOM_SEED = 42
random.seed(RANDOM_SEED)

# NSE symbol universe matching the existing PV surveillance engine
SYMBOLS = [
    ("ALPHATECH",   2400.0,  0.08, "EQ"),
    ("NOVAENERGY",   140.0,  0.25, "EQ"),
    ("ZENITHBIO",   1600.0,  0.05, "EQ"),
    ("ORBITCEM",    1550.0,  0.12, "EQ"),
    ("TCS",         3800.0,  0.04, "EQ"),
    ("SBIN",         780.0,  0.18, "EQ"),
    ("ICICIBANK",   1100.0,  0.06, "EQ"),
    ("AXISBANK",    1150.0,  0.15, "EQ"),
    ("RELIANCE",    2900.0,  0.06, "EQ"),
    ("HDFCBANK",    1750.0,  0.05, "EQ"),
    ("INFY",        1550.0,  0.07, "EQ"),
    ("WIPRO",        480.0,  0.10, "EQ"),
    ("BAJFINANCE",  7200.0,  0.12, "EQ"),
    ("MARUTI",     11000.0,  0.08, "EQ"),
    ("SUNPHARMA",  1200.0,   0.09, "EQ"),
]

EXCHANGES = [(1, "NSE"), (2, "BSE")]
SEGMENTS  = [(1, "EQ"), (2, "FO")]
SUB_SEG_CODES = {1: "EQ", 2: "Futures", 3: "Call", 4: "Put"}

# 20 trading member (broker) IDs
TM_IDS = [f"TM{str(i).zfill(5)}" for i in range(1, 21)]

# 50 synthetic client IDs and PANs
def _make_pan(seed_str: str) -> str:
    """Generate a plausible-looking PAN (5 alpha + 4 digit + 1 alpha)."""
    r = random.Random(seed_str)
    alpha5 = "".join(r.choices(string.ascii_uppercase, k=5))
    digits4 = "".join(r.choices(string.digits, k=4))
    alpha1  = r.choice(string.ascii_uppercase)
    return f"{alpha5}{digits4}{alpha1}"

CLIENTS = []
for i in range(1, 501):
    clnt_id  = f"CL{str(i).zfill(8)}"
    pan      = _make_pan(clnt_id)
    tm_idx   = (i - 1) % len(TM_IDS)
    CLIENTS.append({
        "token": 100_000 + i,          # Decl_Exch_Clnt_Token
        "clnt_token": 200_000 + i,     # De-duped Decl_Clnt_Token
        "clnt_id": clnt_id,
        "pan": pan,
        "tm_id": TM_IDS[tm_idx],
        "tm_token": 300_000 + tm_idx,
    })

# Name pool
FIRST_NAMES  = ["Aarav", "Aditi", "Arjun", "Deepa", "Farhan", "Geeta",
                 "Harish", "Isha", "Jayant", "Kavya", "Lokesh", "Meera",
                 "Nikhil", "Pooja", "Rahul", "Sunita", "Tarun", "Usha",
                 "Vikram", "Yashvi"]
LAST_NAMES   = ["Agarwal", "Bose", "Chatterjee", "Desai", "Gupta",
                 "Iyer", "Joshi", "Kapoor", "Mehta", "Nair",
                 "Patel", "Rao", "Sharma", "Singh", "Trivedi"]
CITIES       = ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Hyderabad",
                 "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Surat"]
STATES       = ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Telangana",
                 "Maharashtra", "West Bengal", "Gujarat", "Rajasthan", "Gujarat"]
BANKS        = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank",
                 "Kotak Mahindra Bank", "Punjab National Bank", "Bank of Baroda"]
CATG_TYPES   = [1, 2, 3, 4, 6, 7, 8, 12]  # various category codes
CATG_DESCS   = {1: "Individual", 2: "Partnership", 3: "HUF", 4: "Corporate",
                6: "MutualFund", 7: "DFI", 8: "Bank", 12: "FII"}


def _trading_dates(days: int = 260) -> list[date]:
    """Return last `days` weekdays as a trading date series."""
    dates = []
    d = date.today()
    while len(dates) < days:
        if d.weekday() < 5:  # Mon–Fri
            dates.append(d)
        d -= timedelta(days=1)
    return list(reversed(dates))


def _rand_time_intraday() -> time:
    """Random time between 09:15 and 15:30 (NSE trading hours)."""
    start_min = 9 * 60 + 15
    end_min   = 15 * 60 + 30
    minutes   = random.randint(start_min, end_min)
    seconds   = random.randint(0, 59)
    micros    = random.randint(0, 999999)
    return time(minutes // 60, minutes % 60, seconds, micros)


def _rand_price(base: float, volatility: float) -> Decimal:
    pct = random.gauss(0, volatility * 0.5)
    price = base * (1 + pct)
    return Decimal(f"{max(price, 1.0):.6f}")


def _make_trd_num(trd_date: date, seq: int) -> int:
    """NSE trade number: 8-digit YYYYMMDD prefix + 9-digit sequence."""
    prefix = int(trd_date.strftime("%Y%m%d"))
    return prefix * 10**9 + seq


# ══════════════════════════════════════════════════════════════════════════════
#  Builder functions
# ══════════════════════════════════════════════════════════════════════════════

def _build_dim_exch_clnt(client: dict, idx: int) -> DimExchClntDtls:
    city_idx = idx % len(CITIES)
    fn   = random.choice(FIRST_NAMES)
    ln   = random.choice(LAST_NAMES)
    catg = random.choice(CATG_TYPES)
    exch_id, exch_name = random.choice(EXCHANGES)
    seg_id, _          = random.choice(SEGMENTS)

    return DimExchClntDtls(
        Decl_Exch_Clnt_Token    = client["token"],
        Decl_Clnt_Token         = client["clnt_token"],
        Decl_Exch_Token         = exch_id,
        Decl_Seg_Token          = seg_id,
        Decl_Exch_TM_Token      = client["tm_token"],
        Decl_Exch_Id            = exch_name,
        Decl_Seg_Id             = "EQ",
        Decl_TM_Id              = client["tm_id"],
        Decl_Clnt_Id            = client["clnt_id"],
        Decl_Client_Code        = f"N{client['tm_id']}{client['clnt_id']}",
        Decl_Clnt_Pan           = client["pan"],
        Decl_Clnt_UCC           = f"UCC{str(idx).zfill(7)}",
        Decl_Clnt_Catg_Type     = catg,
        Decl_Clnt_Catg_Type_Desc= CATG_DESCS.get(catg, "Other"),
        Decl_Clnt_Name          = f"{fn} {ln}",
        Decl_Frst_Name          = fn,
        Decl_Last_Name          = ln,
        Decl_Clnt_Stat          = 1,
        Decl_Clnt_Stat_Indc     = "ACTV",
        Decl_City               = CITIES[city_idx],
        Decl_State              = STATES[city_idx],
        Decl_Cntry              = "India",
        Decl_Pin                = str(random.randint(100000, 999999)),
        Decl_Frst_Mob_Num       = f"+91{random.randint(7000000000, 9999999999)}",
        Decl_Frst_Email_Id      = f"{fn.lower()}.{ln.lower()}{idx}@example.com",
        Decl_Bank_Name          = random.choice(BANKS),
        Decl_Bank_Acct_Type     = random.choice([1, 2]),
        Decl_Bank_Acct_Num      = str(random.randint(10**11, 10**12 - 1)),
        Decl_Agmt_Date          = date.today() - timedelta(days=random.randint(365, 3650)),
        Decl_Rec_Date           = date.today() - timedelta(days=random.randint(1, 365)),
        Decl_Clnt_Acct_Type     = 1,
        Decl_Clnt_Acct_Type_Desc= "Trading",
    )


def _build_dim_dep_clnt(client: dict, idx: int) -> DimDepClntDtls:
    fn   = random.choice(FIRST_NAMES)
    ln   = random.choice(LAST_NAMES)
    catg = random.choice(CATG_TYPES)
    dep_token = 1 if random.random() < 0.6 else 2   # 1=NSDL, 2=CDSL

    return DimDepClntDtls(
        Ddcl_Dep_Clnt_Token     = 500_000 + idx,
        Ddcl_Clnt_Token         = client["clnt_token"],  # cross-linked
        Ddcl_Dep_Token          = dep_token,
        Ddcl_BP_Token           = 700_000 + (idx % 50),
        Ddcl_BP_Id              = f"DP{str(idx % 50).zfill(6)}",
        Ddcl_Clnt_Id            = client["clnt_id"],
        Ddcl_Clnt_Pan           = client["pan"],
        Ddcl_Clnt_Code          = f"DEP{client['clnt_id']}",
        Ddcl_Clnt_Catg_Type     = catg,
        Ddcl_Clnt_Catg_Type_Desc= CATG_DESCS.get(catg, "Other"),
        Ddcl_Clnt_Name          = f"{fn} {ln}",
        Ddcl_Clnt_Shrt_Name     = f"{fn[0]}{ln[:3]}".upper(),
        Ddcl_Clnt_Stat          = 1,
        Ddcl_Clnt_Stat_Desc     = "Active",
        Ddcl_Sex                = random.choice(["M", "F"]),
        Ddcl_Ntnlty_Desc        = "Indian",
        Ddcl_City               = random.choice(CITIES),
        Ddcl_Cntry              = "India",
        Ddcl_Pin                = str(random.randint(100000, 999999)),
        Ddcl_Frst_Email_Id      = f"{fn.lower()}.{ln.lower()}{idx}@example.com",
        Ddcl_Frst_Tele_Num      = f"+91{random.randint(7000000000, 9999999999)}",
        Ddcl_Acct_Openng_Date   = date.today() - timedelta(days=random.randint(365, 4000)),
        Ddcl_Bank_Name          = random.choice(BANKS),
        Ddcl_Bank_Acct_Type     = random.choice([1, 2]),
        Ddcl_Bank_Acct_Num      = str(random.randint(10**11, 10**12 - 1)),
        Ddcl_Scnd_Hldr_Clnt_Token = None,
        Ddcl_Thrd_Hldr_Clnt_Token = None,
        Ddcl_BO_Exch_Id         = "NSE" if dep_token == 1 else "BSE",
        Ddcl_Rec_Date           = date.today() - timedelta(days=random.randint(1, 365)),
    )





def _seed_users(db: Session):
    """Seed initial SysUser accounts and audit log if empty."""
    if db.query(SysUser).count() == 0:
        users_to_seed = [
            SysUser(
                username="vishesh_admin",
                email="vishesh@surveillance.gov",
                full_name="Vishesh",
                department="Market Conduct & Compliance",
                hashed_password=hash_password("vishesh123"),
                role="Admin",
                is_active=True
            ),
            SysUser(
                username="arao_analyst",
                email="a.rao@surveillance.gov",
                full_name="A. Rao",
                department="Quantitative Surveillance",
                hashed_password=hash_password("arao123"),
                role="Analyst",
                is_active=True
            ),
            SysUser(
                username="vsanghvi_analyst",
                email="v.sanghvi@surveillance.gov",
                full_name="V. Sanghvi",
                department="Price Manipulation Cell",
                hashed_password=hash_password("vsanghvi123"),
                role="Analyst",
                is_active=True
            ),
            SysUser(
                username="audit_viewer",
                email="audit@surveillance.gov",
                full_name="Audit User",
                department="Internal Audit",
                hashed_password=hash_password("audit123"),
                role="Viewer",
                is_active=True
            ),
        ]
        db.bulk_save_objects(users_to_seed)
        db.commit()

        initial_logs = [
            SysAuditLog(
                timestamp=datetime.utcnow(),
                username="vishesh_admin",
                role="Admin",
                action="SYSTEM_INIT",
                target="SURVEILLANCE_ENGINE",
                details="Initialized PVASF Security & RBAC User Management tables",
                ip_address="127.0.0.1"
            )
        ]
        db.bulk_save_objects(initial_logs)
        db.commit()


def _seed_forensic_cases(db: Session):
    """Seed realistic sample forensic case dossiers if the table is empty."""
    if db.query(ForensicCase).first() is not None:
        return

    import json as _json
    now = datetime.utcnow()

    sample_cases = [
        {
            "case_id":        "CASE-2026-ALPHATECH-001",
            "target_symbol":  "ALPHATECH",
            "title":          "Self-Matched Wash Trade Network & LTP Ramping Investigation",
            "lead_officer":   "Surveillance Officer #104",
            "status":         "Open Investigation",
            "priority":       "High",
            "description":    (
                "Multiple same-broker wash trades detected across 15 trading sessions. "
                "Buy and sell orders placed within milliseconds by clients sharing the same TM ID. "
                "LTP artificially ramped by 22.4% over 5 days without fundamental catalyst."
            ),
            "evidence_json":  _json.dumps([
                {"title": "180D Price Spike Chart",     "description": "+124.5% surge with upper circuit hits",   "type": "Chart"},
                {"title": "Wash Trade Summary",         "description": "1,250,000 shares same-broker matches",   "type": "Trade Log"},
                {"title": "Joint Demat Account Proof",  "description": "Shared bank account HDFC-9845***",       "type": "KYC"},
                {"title": "Order Book Depth Log",       "description": "54.2x Pending Spoofing Volume",          "type": "Trade Log"},
                {"title": "LTP Ramping Timeline",       "description": "Tick-level LTP manipulation evidence",   "type": "Chart"},
            ]),
            "created_by":     "vishesh_admin",
            "created_at":     now.replace(day=max(1, now.day - 8)),
        },
        {
            "case_id":        "CASE-2026-NOVAENERGY-002",
            "target_symbol":  "NOVAENERGY",
            "title":          "Upper Circuit Persistence & Promoter Holding Shift Audit",
            "lead_officer":   "Surveillance Officer #212",
            "status":         "Pending Action",
            "priority":       "High",
            "description":    (
                "NOVAENERGY hit upper circuit on 11 of the last 15 trading days. "
                "Promoter holding dropped 4.2% over the same window, suggesting coordinated exit. "
                "Pending referral to Enforcement Division."
            ),
            "evidence_json":  _json.dumps([
                {"title": "Circuit Hit Calendar",        "description": "11/15 days at upper circuit (20%)",     "type": "Chart"},
                {"title": "Shareholding Change Report",  "description": "Promoter reduced from 68.4% to 64.2%", "type": "KYC"},
                {"title": "Participant Volume Share",    "description": "Top 3 clients = 78% of buy volume",     "type": "Trade Log"},
            ]),
            "created_by":     "vsanghvi_analyst",
            "created_at":     now.replace(day=max(1, now.day - 10)),
        },
        {
            "case_id":        "CASE-2026-ORBITCEM-003",
            "target_symbol":  "ORBITCEM",
            "title":          "Spoofing & Pending Order Book Imbalance Audit",
            "lead_officer":   "HFT Specialist #402",
            "status":         "Open Investigation",
            "priority":       "Medium",
            "description":    (
                "Large pending orders placed and cancelled within 50ms repeatedly over 3 days. "
                "Bid/ask imbalance consistently >10:1 before significant price moves. "
                "Classic spoofing signature detected by the algo-CTCL scanner."
            ),
            "evidence_json":  _json.dumps([
                {"title": "Order Cancel Rate Chart",     "description": "92% cancel rate on large bids",         "type": "Chart"},
                {"title": "CTCL Algo Log Extract",       "description": "ALGO0011 — 4,820 cancel events",        "type": "Trade Log"},
                {"title": "Order Book Depth Log",        "description": "54.2x Pending vs Executed ratio",       "type": "Trade Log"},
                {"title": "IP Address Trace",            "description": "Consistent source IP: 10.42.18.77",     "type": "KYC"},
            ]),
            "created_by":     "arao_analyst",
            "created_at":     now.replace(day=max(1, now.day - 13)),
        },
        {
            "case_id":        "CASE-2026-SBIN-004",
            "target_symbol":  "SBIN",
            "title":          "Close-to-Close Volume Z-Score Anomaly Review",
            "lead_officer":   "Surveillance Officer #104",
            "status":         "Closed",
            "priority":       "Low",
            "description":    (
                "Volume Z-score of +3.8 flagged on T-3. Subsequent investigation found volume spike "
                "correlated with a scheduled block deal disclosure. No manipulation evidence found."
            ),
            "evidence_json":  _json.dumps([
                {"title": "Volume Z-Score Chart",        "description": "Z = +3.8 on 2026-07-10",               "type": "Chart"},
                {"title": "Block Deal Disclosure",       "description": "Regulatory bulk deal filing verified",       "type": "General"},
            ]),
            "created_by":     "arao_analyst",
            "created_at":     now.replace(day=max(1, now.day - 18)),
            "closed_at":      now.replace(day=max(1, now.day - 5)),
        },
        {
            "case_id":        "CASE-2026-ZENITHBIO-005",
            "target_symbol":  "ZENITHBIO",
            "title":          "Circular Trading Ring — Intra-Day Price Coordination",
            "lead_officer":   "Surveillance Officer #212",
            "status":         "Draft",
            "priority":       "High",
            "description":    (
                "Three client PANs suspected of rotating buy/sell activity to maintain "
                "artificial price level. Circular loop detected by participant audit engine "
                "with gross volume 3.2× net volume."
            ),
            "evidence_json":  _json.dumps([
                {"title": "Circular Loop Report",        "description": "3-node loop: CL00000045→CL00000187→CL00000312", "type": "Trade Log"},
            ]),
            "created_by":     "vsanghvi_analyst",
            "created_at":     now.replace(day=max(1, now.day - 2)),
        },
    ]

    rows = []
    for c in sample_cases:
        kwargs = {k: v for k, v in c.items()}
        # updated_at = created_at for seed data
        kwargs.setdefault("updated_at", kwargs["created_at"])
        rows.append(ForensicCase(**kwargs))

    db.bulk_save_objects(rows)
    db.commit()
    print(f"[seed] Seeded {len(rows)} forensic case dossiers.")


def _seed_sh_and_ann(db: Session):
    if db.query(FactMainShldng).first() is not None:
        return
    print("[seed] Seeding Enterprise Shareholding Results (FMSH, FSHG, FPRH, FPUH) & Corporate Actions (FCAC, FCDF)...")
    
    mstr_rows = []
    main_rows = []
    prom_rows = []
    pub_rows = []
    ca_rows = []
    dil_rows = []

    ann_templates = [
        ("DP", "Dividend", "Board recommended interim dividend of INR 12 per share"),
        ("BN", "Bonus", "Board approved 1:1 bonus share issue"),
        ("SS", "Stock Split", "Sub-division of equity shares from Face Value INR 10 to INR 2"),
        ("ET", "Rights", "Rights issue declared at INR 450 per share")
    ]

    for idx, (sym, base, vol, series) in enumerate(SYMBOLS):
        r_seed = random.Random(zlib.crc32(sym.encode("utf-8")))
        cmp_token = 1000 + idx + 1
        
        # Quarter Q1, Q2, Q3, Q4 shareholding records
        for q_idx, q_num in enumerate(["Q1", "Q2", "Q3", "Q4"]):
            as_date = date(2026, 3 * (q_idx + 1), 31 if q_idx in [0, 3] else 30)
            
            if sym == "NOVAENERGY":
                # Promoter exit progression matching CASE-2026-NOVAENERGY-002 (-4.2% drop)
                prom_pcts = [68.40, 68.40, 68.00, 64.20]
                promoter_pct = Decimal(str(prom_pcts[q_idx]))
                pledge_pct = Decimal("2.50") if q_idx >= 2 else Decimal("0.00")
            elif sym == "ALPHATECH":
                promoter_pct = Decimal("65.00")
                pledge_pct = Decimal("12.50")  # Pledged shares financing price ramping
            elif sym == "ZENITHBIO":
                promoter_pct = Decimal("58.50")
                pledge_pct = Decimal("0.00")
            elif sym == "ORBITCEM":
                promoter_pct = Decimal("54.00")
                pledge_pct = Decimal("0.00")
            else:
                promoter_pct = Decimal("52.50")
                pledge_pct = Decimal("0.00")
                
            public_pct = Decimal(str(round(100.0 - float(promoter_pct), 2)))
            total_shares = 100_000_000
            prom_shares = int(total_shares * (float(promoter_pct) / 100.0))
            pub_shares = total_shares - prom_shares
            plge_shares = int(prom_shares * (float(pledge_pct) / 100.0))

            # 1. Master Shareholding
            mstr_rows.append(FactMstrSharehldg(
                Fmsh_Exch_Token=1,
                Fmsh_Cmp_Token=cmp_token,
                Fmsh_Cmp_Name=f"{sym} India Ltd",
                Fmsh_Trd_Prd_Token=1,
                Fmsh_Symbol=sym,
                Fmsh_Series=series,
                Fmsh_Qrtr_Num=q_num,
                Fmsh_As_on_Date=as_date,
                Fmsh_Mn_Shldng_Rec_Cnt=2,
                Fmsh_Promtr_Shldng_Rec_Cnt=1,
                Fmsh_Public_Shldng_Rec_Cnt=1,
                Fmsh_Rec_Date=as_date
            ))

            # 2. Main Shareholding — Promoter
            main_rows.append(FactMainShldng(
                Fshg_Exch_Token=1,
                Fshg_Cmp_Token=cmp_token,
                Fshg_Trd_Prd_Token=1,
                Fshg_Symbol=sym,
                Fshg_Series=series,
                Fshg_Qrtr_Num=q_num,
                Fshg_Shldng_Date=as_date,
                Fshg_Shldr_Desc="Promoter & Promoter Group",
                Fshg_Shldng_Catg_Type=1,
                Fshg_Shldng_Sub_Catg_Type=1,
                Fshg_Shldr_Cnt=4,
                Fshg_Tot_Eq_Shares=prom_shares,
                Fshg_Issd_Cap_Shares=total_shares,
                Fshg_Dmat_Shares=prom_shares,
                Fshg_Dmat_Shares_Pct=Decimal("100.00"),
                Fshg_Tot_Shares_Pct=promoter_pct,
                Fshg_Grd_Tot_Shares_Pct=promoter_pct,
                Fshg_Plge_Shares=plge_shares,
                Fshg_Plge_Tot_Shares_Pct=pledge_pct,
                Fshg_Rec_Date=as_date
            ))

            # 3. Main Shareholding — Public
            main_rows.append(FactMainShldng(
                Fshg_Exch_Token=1,
                Fshg_Cmp_Token=cmp_token,
                Fshg_Trd_Prd_Token=1,
                Fshg_Symbol=sym,
                Fshg_Series=series,
                Fshg_Qrtr_Num=q_num,
                Fshg_Shldng_Date=as_date,
                Fshg_Shldr_Desc="Public Shareholding",
                Fshg_Shldng_Catg_Type=2,
                Fshg_Shldng_Sub_Catg_Type=4,
                Fshg_Shldr_Cnt=12500,
                Fshg_Tot_Eq_Shares=pub_shares,
                Fshg_Issd_Cap_Shares=total_shares,
                Fshg_Dmat_Shares=pub_shares,
                Fshg_Dmat_Shares_Pct=Decimal("99.80"),
                Fshg_Tot_Shares_Pct=public_pct,
                Fshg_Grd_Tot_Shares_Pct=public_pct,
                Fshg_Rec_Date=as_date
            ))

            # 4. Promoter Details
            prom_rows.append(FactPromShldrDtls(
                Fprh_Exch_Token=1,
                Fprh_Cmp_Token=cmp_token,
                Fprh_Exch_Cmp_Token=cmp_token,
                Fprh_Symbol=sym,
                Fprh_Series=series,
                Fprh_Qrtr_Num=q_num,
                Fprh_Shldng_Date=as_date,
                Fprh_Shldr_Desc="Promoter Group",
                Fprh_Shldng_Catg_Type=1,
                Fprh_Shldng_Sub_Catg_Type=1,
                Fprh_Shldr_Name=f"{sym} Holdings Pvt Ltd",
                Fprh_Tot_Shares=prom_shares,
                Fprh_Tot_Shares_Pct=promoter_pct,
                Fprh_Plge_Shares=plge_shares,
                Fprh_Plge_Shares_Pct=pledge_pct,
                Fprh_Rec_Date=as_date
            ))

            # 5. Public Details
            pub_rows.append(FactPubShldrDtls(
                Fpuh_Exch_Token=1,
                Fpuh_Cmp_Token=cmp_token,
                Fpuh_Exch_Cmp_Token=cmp_token,
                Fpuh_Symbol=sym,
                Fpuh_Series=series,
                Fpuh_Qrtr_Num=q_num,
                Fpuh_Shldng_Date=as_date,
                Fpuh_Shldr_Desc="Institutional Public",
                Fpuh_Shldng_Catg_Type=2,
                Fpuh_Shldng_Sub_Catg_Type=4,
                Fpuh_Shldr_Name="Reliance Mutual Fund / LIC India",
                Fpuh_Tot_Shares=pub_shares,
                Fpuh_Tot_Shares_Pct=public_pct,
                Fpuh_Rec_Date=as_date
            ))

        # Corporate Actions for this symbol
        if sym == "SBIN":
            catg_code, action_title, action_desc = ("DP", "Dividend", "Board recommended interim dividend of INR 12 per share (Record Date T-20)")
            ex_date = date.today() - timedelta(days=20)
        elif sym == "TCS":
            catg_code, action_title, action_desc = ("BN", "Bonus Share Issue", "Board approved 1:1 bonus equity share issue")
            ex_date = date.today() - timedelta(days=45)
        elif sym == "INFY":
            catg_code, action_title, action_desc = ("SS", "Stock Split", "Sub-division of equity shares from Face Value INR 10 to INR 2")
            ex_date = date.today() - timedelta(days=60)
        elif sym == "RELIANCE":
            catg_code, action_title, action_desc = ("DP", "Dividend", "Board recommended final dividend of INR 10 per share")
            ex_date = date.today() - timedelta(days=15)
        else:
            catg_code, action_title, action_desc = ("DP", "General Announcement", f"General Corporate Announcement — {sym}")
            ex_date = date.today() - timedelta(days=30)

        ca_rows.append(FactCorpActions(
            Fcac_Exch_Token=1,
            Fcac_Cmp_Token=cmp_token,
            Fcac_Trd_Prd_Token=1,
            Fcac_Symbol=sym,
            Fcac_Series=series,
            Fcac_Cmp_Name=f"{sym} India Ltd",
            Fcac_Corp_Action_Catg=catg_code,
            Fcac_Corp_Action_Type=1 if catg_code == "BN" else 3 if catg_code == "DP" else 6,
            Fcac_Ex_Divnd_Date=ex_date if catg_code == "DP" else None,
            Fcac_Ex_Bonus_Date=ex_date if catg_code == "BN" else None,
            Fcac_Ex_Split_Date=ex_date if catg_code == "SS" else None,
            Fcac_Bonus_Ratio="1:1" if catg_code == "BN" else None,
            Fcac_Divnd_Pct=Decimal("120.00") if catg_code == "DP" else None,
            Fcac_Divnd_Val=Decimal("12.00") if catg_code == "DP" else None,
            Fcac_Divnd_Prpse=action_desc,
            Fcac_Rec_Date=ex_date
        ))

        # Dilution factor
        dil_rows.append(FactCaDilFctr(
            Fcdf_Exch_Token=1,
            Fcdf_Cmp_Token=cmp_token,
            Fcdf_NSE_Trd_Prd_Token=1,
            Fcdf_BSE_Trd_Prd_Token=2,
            Fcdf_Symbol=sym,
            Fcdf_Corp_Action_Catg=catg_code,
            Fcdf_Appl_From_Date=ex_date,
            Fcdf_Appl_To_Date=date(2026, 12, 31),
            Fcdf_Price_Adj_Factor=Decimal("0.500000") if catg_code in ["BN", "SS"] else Decimal("1.000000"),
            Fcdf_Rec_Date=ex_date
        ))

    db.bulk_save_objects(mstr_rows)
    db.bulk_save_objects(main_rows)
    db.bulk_save_objects(prom_rows)
    db.bulk_save_objects(pub_rows)
    db.bulk_save_objects(ca_rows)
    db.bulk_save_objects(dil_rows)
    db.commit()
    print(f"[seed] Seeded Shareholding & Corporate Action tables: FMSH={len(mstr_rows)}, FSHG={len(main_rows)}, FPRH={len(prom_rows)}, FPUH={len(pub_rows)}, FCAC={len(ca_rows)}, FCDF={len(dil_rows)}.")


# ══════════════════════════════════════════════════════════════════════════════
#  Main seeder
# ══════════════════════════════════════════════════════════════════════════════

def seed_database(db: Session) -> dict:
    """Seed all aggregate tables directly."""
    _seed_users(db)
    _seed_forensic_cases(db)
    _seed_sh_and_ann(db)

    if db.query(AggSecDay).first() is not None and db.query(AggSecDay).count() > 50:
        count_decl = db.query(DimExchClntDtls).count()
        count_ddcl = db.query(DimDepClntDtls).count()
        count_asd  = db.query(AggSecDay).count()
        count_acsd = db.query(AggClntSecDay).count()
        count_appd = db.query(AggPanPairDay).count()
        count_fmsh = db.query(FactMstrSharehldg).count()
        count_fshg = db.query(FactMainShldng).count()
        count_fcac = db.query(FactCorpActions).count()
        count_usr  = db.query(SysUser).count()
        count_log  = db.query(SysAuditLog).count()
        count_case = db.query(ForensicCase).count()
        return {
            "status": "already_seeded",
            "DIM_EXCH_CLNT_DTLS": count_decl,
            "DIM_DEP_CLNT_DTLS":  count_ddcl,
            "AGG_SEC_DAY":        count_asd,
            "AGG_CLNT_SEC_DAY":   count_acsd,
            "AGG_PAN_PAIR_DAY":   count_appd,
            "FACT_MSTR_SHAREHLDG": count_fmsh,
            "FACT_MAIN_SHLDNG": count_fshg,
            "FACT_CORP_ACTIONS": count_fcac,
            "SYS_USERS": count_usr,
            "SYS_AUDIT_LOGS": count_log,
            "FORENSIC_CASES": count_case
        }

    print("[seed] Generating DIM_EXCH_CLNT_DTLS rows …")
    decl_rows = [_build_dim_exch_clnt(c, i) for i, c in enumerate(CLIENTS, start=1)]
    db.bulk_save_objects(decl_rows)
    db.commit()

    print("[seed] Generating DIM_DEP_CLNT_DTLS rows …")
    ddcl_rows = [_build_dim_dep_clnt(c, i) for i, c in enumerate(CLIENTS, start=1)]
    db.bulk_save_objects(ddcl_rows)
    db.commit()

    print("[seed] Generating AGG_SEC_DAY, AGG_CLNT_SEC_DAY, AGG_PAN_PAIR_DAY rows …")
    trading_dates = _trading_dates(260)
    asd_objects = []
    acsd_objects = []
    appd_objects = []

    import numpy as np
    num_days = len(trading_dates)
    series_by_sym = {}

    for idx, (sym, base, ckt_lmt, series) in enumerate(SYMBOLS):
        r_state = np.random.RandomState(zlib.crc32(sym.encode("utf-8")) % 10000)

        close = np.zeros(num_days)
        high = np.zeros(num_days)
        low = np.zeros(num_days)
        open_p = np.zeros(num_days)
        volume = np.zeros(num_days)
        close[0] = base

        if sym == "ALPHATECH":
            circuit_days = {246, 248, 250, 252, 254, 256, 258, 259}
            for i in range(1, num_days):
                if i < 245:
                    ret = r_state.normal(0.0007, 0.008)
                else:
                    ret = 0.098 if i in circuit_days else r_state.uniform(0.008, 0.015)
                close[i] = round(close[i - 1] * (1.0 + ret), 2)
            volume[:245] = np.maximum(r_state.normal(150000, 10000, 245), 50000)
            volume[245:] = r_state.normal(1200000, 30000, 15)

        elif sym == "NOVAENERGY":
            circuit_days = {245, 246, 247, 249, 250, 251, 253, 254, 255, 257, 258}
            for i in range(1, num_days):
                if i < 245:
                    ret = r_state.normal(0.0005, 0.007)
                else:
                    ret = 0.048 if i in circuit_days else r_state.uniform(0.002, 0.008)
                close[i] = round(close[i - 1] * (1.0 + ret), 2)
            volume[:245] = np.maximum(r_state.normal(120000, 8000, 245), 40000)
            volume[245:] = r_state.normal(450000, 15000, 15)

        elif sym == "ZENITHBIO":
            circuit_days = {247, 250, 252, 255, 257, 259}
            for i in range(1, num_days):
                if i < 245:
                    ret = r_state.normal(0.0006, 0.007)
                else:
                    ret = 0.055 if i in circuit_days else r_state.uniform(0.005, 0.012)
                close[i] = round(close[i - 1] * (1.0 + ret), 2)
            volume[:245] = np.maximum(r_state.normal(140000, 10000, 245), 40000)
            volume[245:] = r_state.normal(800000, 25000, 15)

        elif sym == "ORBITCEM":
            circuit_days = {257}
            for i in range(1, num_days):
                if i < 245:
                    ret = r_state.normal(0.0003, 0.006)
                else:
                    ret = 0.114 if i in circuit_days else r_state.uniform(0.001, 0.006)
                close[i] = round(close[i - 1] * (1.0 + ret), 2)
            volume[:245] = np.maximum(r_state.normal(150000, 10000, 245), 50000)
            volume[245:] = r_state.normal(210000, 10000, 15)

        elif sym == "SBIN":
            for i in range(1, num_days):
                ret = r_state.normal(0.0001, 0.006)
                close[i] = round(close[i - 1] * (1.0 + ret), 2)
            volume[:245] = np.maximum(r_state.normal(150000, 10000, 245), 50000)
            volume[245:] = r_state.normal(320000, 15000, 15)

        elif sym == "ICICIBANK":
            for i in range(1, num_days):
                ret = r_state.normal(0.0001, 0.006)
                close[i] = round(close[i - 1] * (1.0 + ret), 2)
            volume[:245] = np.maximum(r_state.normal(150000, 10000, 245), 50000)
            volume[245:] = r_state.normal(240000, 12000, 15)

        elif sym == "AXISBANK":
            for i in range(1, num_days):
                ret = 0.025 if i == 255 else r_state.normal(0.0002, 0.006)
                close[i] = round(close[i - 1] * (1.0 + ret), 2)
            volume = np.maximum(r_state.normal(150000, 10000, num_days), 50000)

        else:
            for i in range(1, num_days):
                ret = r_state.normal(0.0001, 0.006)
                close[i] = round(close[i - 1] * (1.0 + ret), 2)
            volume = np.maximum(r_state.normal(150000, 10000, num_days), 50000)

        for i in range(num_days):
            prev_c = close[i - 1] if i > 0 else close[i]
            open_p[i] = round(prev_c * r_state.uniform(0.999, 1.001), 2)
            high[i] = max(close[i], open_p[i], round(close[i] * 1.004, 2))
            low[i] = min(close[i], open_p[i], round(close[i] * 0.996, 2))

        series_by_sym[sym] = {
            "cmp_token": 400_000 + idx,
            "prd_token": 600_000 + idx,
            "open": np.round(open_p, 2),
            "high": np.round(high, 2),
            "low": np.round(low, 2),
            "close": np.round(close, 2),
            "volume": np.int64(volume)
        }

    # Assign scrip-specific client pools from the 500 generated CLIENTS
    client_pool_by_sym = {}
    for idx, (sym, base, vol, series) in enumerate(SYMBOLS):
        if sym == "ALPHATECH":
            # 12 wash-trade clients (same TM00104) + 45 market clients
            client_pool_by_sym[sym] = CLIENTS[400:457]
        elif sym == "ZENITHBIO":
            # 3 circular ring clients + 38 market clients
            client_pool_by_sym[sym] = CLIENTS[460:500]
        elif sym == "NOVAENERGY":
            # 3 top buyer clients + 52 market clients
            client_pool_by_sym[sym] = CLIENTS[350:405]
        elif sym == "ORBITCEM":
            # Algo client + 35 market clients
            client_pool_by_sym[sym] = CLIENTS[300:336]
        else:
            # Large cap blue-chips get unique 180-240 client pools
            start_i = (idx * 25) % 250
            client_pool_by_sym[sym] = CLIENTS[start_i : start_i + 220]

    for d_idx, trd_date in enumerate(trading_dates):
        for sym, meta in series_by_sym.items():
            open_p = float(meta["open"][d_idx])
            high_p = float(meta["high"][d_idx])
            low_p = float(meta["low"][d_idx])
            close_p = float(meta["close"][d_idx])
            tot_qty = int(meta["volume"][d_idx])
            prev_close = float(meta["close"][d_idx - 1]) if d_idx > 0 else close_p
            tot_val = round(tot_qty * close_p, 2)
            tot_cnt = random.randint(200, 5000)
            wash_cnt = random.randint(15, 45) if sym == "ALPHATECH" else (random.randint(5, 15) if sym == "ZENITHBIO" else 0)

            asd_objects.append(AggSecDay(
                Asd_Date=trd_date,
                Asd_Symbol=sym,
                Asd_Cmp_Token=meta["cmp_token"],
                Asd_Trd_Prd_Token=meta["prd_token"],
                Asd_Open_Price=Decimal(str(open_p)),
                Asd_High_Price=Decimal(str(high_p)),
                Asd_Low_Price=Decimal(str(low_p)),
                Asd_Close_Price=Decimal(str(close_p)),
                Asd_Prev_Close_Price=Decimal(str(prev_close)),
                Asd_Tot_Qty=Decimal(str(tot_qty)),
                Asd_Tot_Val=Decimal(str(tot_val)),
                Asd_Tot_Cnt=tot_cnt,
                Asd_Tot_Wash_Qty=Decimal(str(wash_cnt * 5000 if sym == "ALPHATECH" else wash_cnt * 100)),
                Asd_Tot_Wash_Cnt=wash_cnt,
                Asd_Low_Crct_Price=Decimal(str(round(prev_close * 0.90, 2))),
                Asd_Upp_Crct_Price=Decimal(str(round(prev_close * 1.10, 2))),
                Asd_52_Week_High_Price=Decimal(str(round(high_p * 1.15, 2))),
                Asd_52_Week_Low_Price=Decimal(str(round(low_p * 0.85, 2))),
            ))

            pool = client_pool_by_sym[sym]
            # Sample active clients for this day (15-35 clients daily for large caps)
            num_active = min(len(pool), random.randint(12, 35))
            active_clients = random.sample(pool, num_active)

            for c in active_clients:
                b_qty = random.randint(500, 5000)
                b_val = round(b_qty * close_p, 2)
                acsd_objects.append(AggClntSecDay(
                    Acsd_Date=trd_date,
                    Acsd_Cmp_Token=meta["cmp_token"],
                    Acsd_Exch_Clnt_Token=c["token"],
                    Acsd_Clnt_Token=c["token"],
                    Acsd_Buy_Tot_Qty=Decimal(str(b_qty)),
                    Acsd_Sell_Tot_Qty=Decimal(str(round(b_qty * 0.8, 2))),
                    Acsd_Buy_Tot_Val=Decimal(str(b_val)),
                    Acsd_Sell_Tot_Val=Decimal(str(round(b_val * 0.8, 2))),
                    Acsd_Buy_Tot_Cnt=random.randint(5, 50),
                    Acsd_Pos_Cont_Val=Decimal(str(round(b_val * 0.05, 2))),
                    Acsd_Neg_Cont_Val=Decimal(str(round(b_val * 0.015, 2))),
                ))

            # Counterparty Pair Trades
            if sym == "ZENITHBIO":
                # 3-node circular loop
                c0, c1, c2 = pool[0], pool[1], pool[2]
                pairs = [(c0, c1), (c1, c2), (c2, c0)]
                for c_buy, c_sell in pairs:
                    p_qty = random.randint(1500, 3500)
                    p_val = round(p_qty * close_p, 2)
                    appd_objects.append(AggPanPairDay(
                        Appd_Date=trd_date,
                        Appd_Cmp_Token=meta["cmp_token"],
                        Appd_Exch_Clnt_Token=c_buy["token"],
                        Appd_Clnt_Token=c_buy["token"],
                        Appd_Exch_TM_Token=c_buy["tm_token"],
                        Appd_TM_Token=c_buy["tm_token"],
                        Appd_Cpty_Exch_Clnt_Token=c_sell["token"],
                        Appd_Cpty_Clnt_Token=c_sell["token"],
                        Appd_Cpty_Exch_TM_Token=c_sell["tm_token"],
                        Appd_Cpty_TM_Token=c_sell["tm_token"],
                        Appd_Buy_Tot_Qty=Decimal(str(p_qty)),
                        Appd_Buy_Tot_Val=Decimal(str(p_val)),
                        Appd_Buy_Tot_Cnt=random.randint(5, 25),
                        Appd_Pos_Contri=Decimal(str(round(p_val * 0.04, 2))),
                    ))
            elif sym == "ALPHATECH":
                # Same-broker wash trade pair (Same TM token 300104)
                c_buy, c_sell = pool[0], pool[1]
                p_qty = random.randint(3000, 8000)
                p_val = round(p_qty * close_p, 2)
                same_tm = 300104
                appd_objects.append(AggPanPairDay(
                    Appd_Date=trd_date,
                    Appd_Cmp_Token=meta["cmp_token"],
                    Appd_Exch_Clnt_Token=c_buy["token"],
                    Appd_Clnt_Token=c_buy["token"],
                    Appd_Exch_TM_Token=same_tm,
                    Appd_TM_Token=same_tm,
                    Appd_Cpty_Exch_Clnt_Token=c_sell["token"],
                    Appd_Cpty_Clnt_Token=c_sell["token"],
                    Appd_Cpty_Exch_TM_Token=same_tm,
                    Appd_Cpty_TM_Token=same_tm,
                    Appd_Buy_Tot_Qty=Decimal(str(p_qty)),
                    Appd_Buy_Tot_Val=Decimal(str(p_val)),
                    Appd_Buy_Tot_Cnt=random.randint(10, 40),
                    Appd_Pos_Contri=Decimal(str(round(p_val * 0.05, 2))),
                    Appd_Algo_Flag=0,
                ))
            elif sym == "ORBITCEM":
                # Spoofing & HFT CTCL Algo orders
                c_buy, c_sell = pool[0], pool[1] if len(pool) > 1 else pool[0]
                p_qty = random.randint(1000, 4000)
                p_val = round(p_qty * close_p, 2)
                appd_objects.append(AggPanPairDay(
                    Appd_Date=trd_date,
                    Appd_Cmp_Token=meta["cmp_token"],
                    Appd_Exch_Clnt_Token=c_buy["token"],
                    Appd_Clnt_Token=c_buy["token"],
                    Appd_Exch_TM_Token=c_buy["tm_token"],
                    Appd_TM_Token=c_buy["tm_token"],
                    Appd_Cpty_Exch_Clnt_Token=c_sell["token"],
                    Appd_Cpty_Clnt_Token=c_sell["token"],
                    Appd_Cpty_Exch_TM_Token=c_sell["tm_token"],
                    Appd_Cpty_TM_Token=c_sell["tm_token"],
                    Appd_Buy_Tot_Qty=Decimal(str(p_qty)),
                    Appd_Buy_Tot_Val=Decimal(str(p_val)),
                    Appd_Buy_Tot_Cnt=random.randint(8, 30),
                    Appd_Pos_Contri=Decimal(str(round(p_val * 0.03, 2))),
                    Appd_Algo_Flag=1,
                ))
            else:
                c_buy, c_sell = active_clients[0], active_clients[1] if len(active_clients) > 1 else active_clients[0]
                p_qty = random.randint(200, 1500)
                p_val = round(p_qty * close_p, 2)
                appd_objects.append(AggPanPairDay(
                    Appd_Date=trd_date,
                    Appd_Cmp_Token=meta["cmp_token"],
                    Appd_Exch_Clnt_Token=c_buy["token"],
                    Appd_Clnt_Token=c_buy["token"],
                    Appd_Exch_TM_Token=c_buy["tm_token"],
                    Appd_TM_Token=c_buy["tm_token"],
                    Appd_Cpty_Exch_Clnt_Token=c_sell["token"],
                    Appd_Cpty_Clnt_Token=c_sell["token"],
                    Appd_Cpty_Exch_TM_Token=c_sell["tm_token"],
                    Appd_Cpty_TM_Token=c_sell["tm_token"],
                    Appd_Buy_Tot_Qty=Decimal(str(p_qty)),
                    Appd_Buy_Tot_Val=Decimal(str(p_val)),
                    Appd_Buy_Tot_Cnt=random.randint(2, 10),
                    Appd_Pos_Contri=Decimal(str(round(p_val * 0.01, 2))),
                    Appd_Algo_Flag=0,
                ))

            if len(asd_objects) >= 1000:
                db.bulk_save_objects(asd_objects)
                db.bulk_save_objects(acsd_objects)
                db.bulk_save_objects(appd_objects)
                db.commit()
                asd_objects.clear()
                acsd_objects.clear()
                appd_objects.clear()

    if asd_objects:
        db.bulk_save_objects(asd_objects)
        db.bulk_save_objects(acsd_objects)
        db.bulk_save_objects(appd_objects)
        db.commit()

    count_decl = db.query(DimExchClntDtls).count()
    count_ddcl = db.query(DimDepClntDtls).count()
    count_fmsh = db.query(FactMstrSharehldg).count()
    count_fshg = db.query(FactMainShldng).count()
    count_fcac = db.query(FactCorpActions).count()
    count_usr  = db.query(SysUser).count()
    count_log  = db.query(SysAuditLog).count()
    count_case = db.query(ForensicCase).count()
    count_asd  = db.query(AggSecDay).count()
    count_acsd = db.query(AggClntSecDay).count()
    count_appd = db.query(AggPanPairDay).count()

    print(f"[seed] Done. DECL={count_decl}, DDCL={count_ddcl}, ASD={count_asd}, ACSD={count_acsd}, APPD={count_appd}")
    return {
        "status": "seeded",
        "DIM_EXCH_CLNT_DTLS": count_decl,
        "DIM_DEP_CLNT_DTLS":  count_ddcl,
        "AGG_SEC_DAY":        count_asd,
        "AGG_CLNT_SEC_DAY":   count_acsd,
        "AGG_PAN_PAIR_DAY":   count_appd,
        "FACT_MSTR_SHAREHLDG": count_fmsh,
        "FACT_MAIN_SHLDNG": count_fshg,
        "FACT_CORP_ACTIONS": count_fcac,
        "SYS_USERS": count_usr,
        "SYS_AUDIT_LOGS": count_log,
        "FORENSIC_CASES": count_case
    }

