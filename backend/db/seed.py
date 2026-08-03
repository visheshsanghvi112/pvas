"""
backend/db/seed.py
────────────────────────────────────────────────────────────────────────────
Generates realistic synthetic surveillance data for all 3 Teradata tables.

Scale:
  - 500 DIM_EXCH_CLNT_DTLS rows (clients at exchange)
  - 500 DIM_DEP_CLNT_DTLS rows (same clients at depository, cross-linked)
  - 5,000+ FACT_TRADES rows spanning 260 trading days

Realism guarantees:
  - Ftrd_Trd_Num: first 8 digits = YYYYMMDD of trade date (NSE convention)
  - Ftrd_Trd_Val = Ftrd_Trd_Qty × Ftrd_Trd_Price (computed exactly)
  - FK consistency: all Clnt_Token references resolve to real DECL rows
  - ~5% of trades have Same_Broker_Wash_Flag=1 (surveillance signal)
  - ~15% of trades have Algo flags set (algo trading signal)
  - Price ranges per symbol match the existing PV surveillance engine scrips
  - ~10% of trades have DMA internet flag set
  - Trades span last 260 days with realistic intraday timestamps (09:15–15:30 IST)
"""

import random
import string
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from backend.db.models import (
    DimExchClntDtls, DimDepClntDtls, FactTrades,
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


def _build_fact_trade(
    trd_date: date,
    seq: int,
    symbol: str,
    base_price: float,
    volatility: float,
    series: str,
    sub_seg: int,
    buy_client: dict,
    sell_client: dict,
    cmp_token: int,
    prd_token: int,
    exch_token: int,
    seg_token: int,
    is_wash: bool,
    is_algo: bool,
    is_dma: bool,
    ltp_prev: float,
) -> FactTrades:
    trd_time    = _rand_time_intraday()
    trd_tmst    = datetime.combine(trd_date, trd_time)
    trd_price   = _rand_price(base_price, volatility)
    qty         = Decimal(str(round(random.randint(50, 5000) / 1.0, 3)))
    trd_val     = (trd_price * qty).quantize(Decimal("0.01"))

    buy_ord_price = trd_price * Decimal(str(random.uniform(0.995, 1.005)))
    sell_ord_price = trd_price * Decimal(str(random.uniform(0.995, 1.005)))
    ltp_float   = float(trd_price)
    ltp_indc    = "U" if ltp_float > ltp_prev else ("D" if ltp_float < ltp_prev else "N")

    # Algo/DMA flags
    buy_algo_flag  = 0 if is_algo else 1
    sell_algo_flag = 0 if is_algo else 1
    buy_inet_flag  = 1 if is_dma else None
    sell_inet_flag = 1 if is_dma else None

    # Order book depth (simulated)
    bid_price = trd_price * Decimal("0.998")
    ask_price = trd_price * Decimal("1.002")
    bid_qty   = Decimal(str(random.randint(500, 10000)))
    ask_qty   = Decimal(str(random.randint(500, 10000)))

    sess_type = 2  # Market open by default; some pre-open/close
    if random.random() < 0.02:
        sess_type = 1
    elif random.random() < 0.03:
        sess_type = 3

    acct_type = random.choices([1, 2, 3], weights=[70, 20, 10])[0]

    ca_catg_pool = ["30-CLIENT", "20-OWN", "70-MF", "80-FII", "11-FI-SD", "60-DFI"]
    ca_catg = random.choice(ca_catg_pool)

    trd_num = _make_trd_num(trd_date, seq)
    buy_ord_num  = trd_num - random.randint(1, 999)
    sell_ord_num = trd_num - random.randint(1, 999)

    init_side = random.choice([1, 2])  # 1=buy initiator, 2=sell initiator

    diff_price = float(buy_ord_price) - float(sell_ord_price)

    return FactTrades(
        Ftrd_Trd_Date            = trd_date,
        Ftrd_Trd_Num             = trd_num,
        Ftrd_Exch_Token          = exch_token,
        Ftrd_Seg_Token           = seg_token,
        Ftrd_Sess_Type           = sess_type,
        Ftrd_Trd_Tmst            = trd_tmst,
        Ftrd_Trd_Time            = trd_time,
        Ftrd_Cmp_Token           = cmp_token,
        Ftrd_Buy_Exch_TM_Token   = buy_client["tm_token"],
        Ftrd_Buy_Trdr_Token      = buy_client["tm_token"] + 1,
        Ftrd_Buy_Exch_Clnt_Token = buy_client["token"],
        Ftrd_Sell_Exch_TM_Token  = sell_client["tm_token"],
        Ftrd_Sell_Trdr_Token     = sell_client["tm_token"] + 1,
        Ftrd_Sell_Exch_Clnt_Token= sell_client["token"],
        Ftrd_Trd_Prd_Token       = prd_token,
        Ftrd_Symbol              = symbol,
        Ftrd_Series              = series,
        Ftrd_Sub_Seg_Code        = sub_seg,
        Ftrd_Lot_Qty             = Decimal("1.000"),
        Ftrd_Tick_Price          = Decimal("0.050000"),
        Ftrd_Exch_Trd_Prd_Num   = prd_token % 100000,
        Ftrd_Trd_Qty             = qty,
        Ftrd_Trd_Price           = trd_price,
        Ftrd_Trd_Val             = trd_val,
        Ftrd_Buy_Ord_Num         = buy_ord_num,
        Ftrd_Buy_Acct_Type       = acct_type,
        Ftrd_Buy_CA_Catg         = ca_catg,
        Ftrd_Buy_CP_Token        = None,
        Ftrd_Buy_CP_Flag         = "N",
        Ftrd_Buy_CTCL_Ref        = f"CTCL{str(seq).zfill(10)}B",
        Ftrd_Buy_IP_Addr         = f"10.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}",
        Ftrd_Sell_Ord_Num        = sell_ord_num,
        Ftrd_Sell_Acct_Type      = acct_type,
        Ftrd_Sell_CA_Catg        = ca_catg,
        Ftrd_Sell_CP_Token       = None,
        Ftrd_Sell_CP_Flag        = "N",
        Ftrd_Sell_CTCL_Ref       = f"CTCL{str(seq).zfill(10)}S",
        Ftrd_Sell_IP_Addr        = f"10.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}",
        Ftrd_Buy_Ord_Tmst        = trd_tmst - timedelta(seconds=random.randint(1, 300)),
        Ftrd_Buy_Ord_Price       = buy_ord_price.quantize(Decimal("0.000001")),
        Ftrd_Buy_Ord_Qty         = qty + Decimal(str(random.randint(0, 500))),
        Ftrd_Buy_Trig_Price      = None,
        Ftrd_Buy_Book_Type       = 1,
        Ftrd_Buy_Price_Type      = 1 if float(buy_ord_price) > 0 else 2,
        Ftrd_Buy_Mkt_Flag        = "N",
        Ftrd_Buy_Stop_Flag       = "N",
        Ftrd_Buy_Time_Type       = 1,   # Day
        Ftrd_Buy_Trig_Type       = 0,   # Not triggered
        Ftrd_Buy_FOK_Flag        = "0",
        Ftrd_Buy_Qty_Type        = 3,   # NONE
        Ftrd_Buy_Ord_Type        = 4,   # None
        Ftrd_Sell_Ord_Tmst       = trd_tmst - timedelta(seconds=random.randint(1, 300)),
        Ftrd_Sell_Ord_Price      = sell_ord_price.quantize(Decimal("0.000001")),
        Ftrd_Sell_Ord_Qty        = qty + Decimal(str(random.randint(0, 500))),
        Ftrd_Sell_Trig_Price     = None,
        Ftrd_Sell_Book_Type      = 1,
        Ftrd_Sell_Price_Type     = 1,
        Ftrd_Sell_MKt_Flag       = "N",
        Ftrd_Sell_Stop_Flag      = "N",
        Ftrd_Sell_Time_Type      = 1,
        Ftrd_Sell_Trig_Type      = 0,
        Ftrd_Sell_FOK_Flag       = "0",
        Ftrd_Sell_Qty_Type       = 3,
        Ftrd_Sell_Ord_Type       = 4,
        Ftrd_Buy_Spread_Indc     = None,
        Ftrd_Sell_Spread_Indc    = None,
        Ftrd_Buy_Spread_Flag     = 0,
        Ftrd_Sell_Spread_Flag    = 0,
        Ftrd_Trd_Mod_Flag        = 0,
        Ftrd_Trd_Can_Flag        = 0,
        Ftrd_Buy_Orig_Clnt_Id    = None,
        Ftrd_BOrig_Exch_Clnt_Token = None,
        Ftrd_Buy_Orig_Cp_Flag    = None,
        Ftrd_Buy_Orig_Cp_Id      = None,
        Ftrd_Buy_Orig_CP_Token   = None,
        Ftrd_Sell_Orig_Clnt_Id   = None,
        Ftrd_SOrig_Exch_Clnt_Token = None,
        Ftrd_Sell_Orig_Cp_Flag   = None,
        Ftrd_Sell_Orig_Cp_Id     = None,
        Ftrd_Sell_Orig_CP_Token  = None,
        Ftrd_Init_Side_Type      = init_side,
        Ftrd_Init_Clnt_Token     = buy_client["clnt_token"] if init_side == 1 else sell_client["clnt_token"],
        Ftrd_Same_Broker_Wash_Flag = 1 if is_wash else 0,
        Ftrd_Diff_Broker_Wash_Flag = 0,
        Ftrd_Buy_Sell_Diff_Time  = None,
        Ftrd_Buy_Sell_Diff_Price = Decimal(f"{diff_price:.6f}"),
        Ftrd_Buy_Sell_Diff_Qty   = Decimal("0.000"),
        Ftrd_Last_Trd_Price      = trd_price,
        Ftrd_LTP_Chng_Indc       = ltp_indc,
        Ftrd_Buy_CTCL_Inet_DMA_Flag = buy_inet_flag,
        Ftrd_Buy_CTCL_Algo_Flag  = buy_algo_flag,
        Ftrd_Buy_CTCL_Pin        = None,
        Ftrd_Buy_CTCL_State      = None,
        Ftrd_Buy_CTCL_Zone       = None,
        Ftrd_Sell_CTCL_Inet_DMA_Flag = sell_inet_flag,
        Ftrd_Sell_CTCL_Algo_Flag = sell_algo_flag,
        Ftrd_Sell_CTCL_Pin       = None,
        Ftrd_Sell_CTCL_State     = None,
        Ftrd_Sell_CTCL_Zone      = None,
        Ftrd_Best_Bid_Price      = bid_price.quantize(Decimal("0.000001")),
        Ftrd_Best_Ask_Price      = ask_price.quantize(Decimal("0.000001")),
        Ftrd_Best_Bid_Qty        = bid_qty,
        Ftrd_Best_Ask_Qty        = ask_qty,
        Ftrd_Best_Bid_Ord_Cnt    = random.randint(3, 50),
        Ftrd_Best_Ask_Ord_Cnt    = random.randint(3, 50),
        Ftrd_Bid_Pdg_Ord_Cnt     = random.randint(10, 200),
        Ftrd_Ask_Pdg_Ord_Cnt     = random.randint(10, 200),
        Ftrd_Bid_Pdg_Ord_Qty     = Decimal(str(random.randint(5000, 100000))),
        Ftrd_Ask_Pdg_Ord_Qty     = Decimal(str(random.randint(5000, 100000))),
        Ftrd_Bid_Pdg_Ord_Val     = (bid_price * Decimal("50000")).quantize(Decimal("0.01")),
        Ftrd_Ask_Pdg_Ord_Val     = (ask_price * Decimal("50000")).quantize(Decimal("0.01")),
        Ftrd_Buy_Prev_Rmng_Qty   = None,
        Ftrd_Sell_Prev_Rmng_Qty  = None,
        Ftrd_Last_Estd_Hi_Price  = (trd_price * Decimal("1.10")).quantize(Decimal("0.000001")),
        Ftrd_Last_Estd_Low_Price = (trd_price * Decimal("0.90")).quantize(Decimal("0.000001")),
        Ftrd_Hi_Hit_Flag         = None,
        Ftrd_Low_Hit_Flag        = None,
        Ftrd_Last_Hi_Trd_Num     = None,
        Ftrd_Last_Low_Trd_Num    = None,
        FTRD_BUY_ALGO_ID         = f"ALGO{str(seq % 20).zfill(4)}" if is_algo else None,
        FTRD_SELL_ALGO_ID        = f"ALGO{str(seq % 20).zfill(4)}" if is_algo else None,
        FTRD_BUY_ALGO_CATG_TYPE  = 1 if is_algo else None,
        FTRD_SELL_ALGO_CATG_TYPE = 1 if is_algo else None,
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
        r_seed = random.Random(abs(hash(sym)))
        cmp_token = 1000 + idx + 1
        
        # Quarter Q1, Q2, Q3, Q4 shareholding records
        for q_idx, q_num in enumerate(["Q1", "Q2", "Q3", "Q4"]):
            as_date = date(2026, 3 * (q_idx + 1), 31 if q_idx in [0, 3] else 30)
            promoter_pct = Decimal(str(round(r_seed.uniform(48.0, 72.0), 2)))
            public_pct = Decimal(str(round(100.0 - float(promoter_pct), 2)))
            pledge_pct = Decimal(str(round(r_seed.choice([0.0, 0.0, 1.25, 2.5]), 2)))
            
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
        catg_code, action_title, action_desc = ann_templates[idx % len(ann_templates)]
        ex_date = date.today() - timedelta(days=r_seed.randint(10, 60))
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
    """Seed all tables if FACT_TRADES is empty."""
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

    print("[seed] Generating FACT_TRADES rows …")
    trading_dates = _trading_dates(260)

    sym_meta: dict[str, dict] = {}
    for idx, (sym, base, vol, series) in enumerate(SYMBOLS):
        sym_meta[sym] = {
            "base": base, "vol": vol, "series": series,
            "cmp_token": 400_000 + idx,
            "prd_token": 600_000 + idx,
            "exch_token": 1,
            "seg_token": 1,
            "sub_seg": 1,
        }

    client_tokens = [c["token"] for c in CLIENTS]
    trade_rows = []
    global_seq = 1
    ltp_map: dict[str, float] = {sym: meta["base"] for sym, meta in sym_meta.items()}

    TRADES_PER_SYMBOL_PER_DAY = 8

    for trd_date in trading_dates:
        for sym, meta in sym_meta.items():
            for _ in range(TRADES_PER_SYMBOL_PER_DAY):
                is_wash = random.random() < 0.05
                is_algo = random.random() < 0.15
                is_dma  = random.random() < 0.10

                buy_client  = CLIENTS[random.randint(0, len(CLIENTS) - 1)]
                if is_wash:
                    same_tm_clients = [c for c in CLIENTS if c["tm_id"] == buy_client["tm_id"]]
                    sell_client = random.choice(same_tm_clients)
                else:
                    sell_client = CLIENTS[random.randint(0, len(CLIENTS) - 1)]

                t = _build_fact_trade(
                    trd_date   = trd_date,
                    seq        = global_seq,
                    symbol     = sym,
                    base_price = meta["base"],
                    volatility = meta["vol"],
                    series     = meta["series"],
                    sub_seg    = meta["sub_seg"],
                    buy_client = buy_client,
                    sell_client= sell_client,
                    cmp_token  = meta["cmp_token"],
                    prd_token  = meta["prd_token"],
                    exch_token = meta["exch_token"],
                    seg_token  = meta["seg_token"],
                    is_wash    = is_wash,
                    is_algo    = is_algo,
                    is_dma     = is_dma,
                    ltp_prev   = ltp_map[sym],
                )
                ltp_map[sym] = float(t.Ftrd_Trd_Price)
                trade_rows.append(t)
                global_seq += 1

                if len(trade_rows) >= 2000:
                    db.bulk_save_objects(trade_rows)
                    db.commit()
                    trade_rows.clear()

    if trade_rows:
        db.bulk_save_objects(trade_rows)
        db.commit()

    print("[seed] Generating AGG_SEC_DAY rows …")
    from sqlalchemy import func
    asd_query = db.query(
        FactTrades.Ftrd_Symbol.label("symbol"),
        FactTrades.Ftrd_Trd_Date.label("date"),
        FactTrades.Ftrd_Cmp_Token.label("cmp_token"),
        FactTrades.Ftrd_Trd_Prd_Token.label("prd_token"),
        func.min(FactTrades.Ftrd_Trd_Price).label("low_p"),
        func.max(FactTrades.Ftrd_Trd_Price).label("high_p"),
        func.avg(FactTrades.Ftrd_Trd_Price).label("close_p"),
        func.sum(FactTrades.Ftrd_Trd_Qty).label("tot_qty"),
        func.sum(FactTrades.Ftrd_Trd_Val).label("tot_val"),
        func.count(FactTrades.Ftrd_Trd_Num).label("tot_cnt"),
        func.sum(FactTrades.Ftrd_Same_Broker_Wash_Flag).label("wash_cnt")
    ).group_by(FactTrades.Ftrd_Symbol, FactTrades.Ftrd_Trd_Date, FactTrades.Ftrd_Cmp_Token, FactTrades.Ftrd_Trd_Prd_Token).all()

    asd_objects = []
    for r in asd_query:
        c_price = Decimal(str(round(float(r.close_p or 0), 2)))
        h_price = Decimal(str(round(float(r.high_p or 0), 2)))
        l_price = Decimal(str(round(float(r.low_p or 0), 2)))
        prev_close = Decimal(str(round(float(r.close_p or 0) * 0.98, 2)))
        asd_objects.append(AggSecDay(
            Asd_Date=r.date,
            Asd_Symbol=r.symbol,
            Asd_Cmp_Token=r.cmp_token,
            Asd_Trd_Prd_Token=r.prd_token,
            Asd_Open_Price=l_price,
            Asd_High_Price=h_price,
            Asd_Low_Price=l_price,
            Asd_Close_Price=c_price,
            Asd_Prev_Close_Price=prev_close,
            Asd_Tot_Qty=Decimal(str(r.tot_qty or 0)),
            Asd_Tot_Val=Decimal(str(r.tot_val or 0)),
            Asd_Tot_Cnt=r.tot_cnt,
            Asd_Tot_Wash_Qty=Decimal(str((r.wash_cnt or 0) * 100.0)),
            Asd_Tot_Wash_Cnt=r.wash_cnt or 0,
            Asd_Low_Crct_Price=Decimal(str(round(float(prev_close) * 0.90, 2))),
            Asd_Upp_Crct_Price=Decimal(str(round(float(prev_close) * 1.10, 2))),
            Asd_52_Week_High_Price=Decimal(str(round(float(h_price) * 1.15, 2))),
            Asd_52_Week_Low_Price=Decimal(str(round(float(l_price) * 0.85, 2))),
        ))
        if len(asd_objects) >= 1000:
            db.bulk_save_objects(asd_objects)
            db.commit()
            asd_objects.clear()
    if asd_objects:
        db.bulk_save_objects(asd_objects)
        db.commit()

    print("[seed] Generating AGG_CLNT_SEC_DAY rows …")
    acsd_query = db.query(
        FactTrades.Ftrd_Trd_Date.label("date"),
        FactTrades.Ftrd_Cmp_Token.label("cmp_token"),
        FactTrades.Ftrd_Buy_Exch_Clnt_Token.label("clnt_token"),
        func.sum(FactTrades.Ftrd_Trd_Qty).label("buy_qty"),
        func.sum(FactTrades.Ftrd_Trd_Val).label("buy_val"),
        func.count(FactTrades.Ftrd_Trd_Num).label("buy_cnt")
    ).group_by(FactTrades.Ftrd_Trd_Date, FactTrades.Ftrd_Cmp_Token, FactTrades.Ftrd_Buy_Exch_Clnt_Token).all()

    acsd_objects = []
    for r in acsd_query:
        b_qty = float(r.buy_qty or 0)
        b_val = float(r.buy_val or 0)
        acsd_objects.append(AggClntSecDay(
            Acsd_Date=r.date,
            Acsd_Cmp_Token=r.cmp_token,
            Acsd_Exch_Clnt_Token=r.clnt_token,
            Acsd_Clnt_Token=r.clnt_token,
            Acsd_Buy_Tot_Qty=Decimal(str(round(b_qty, 2))),
            Acsd_Sell_Tot_Qty=Decimal(str(round(b_qty * 0.8, 2))),
            Acsd_Buy_Tot_Val=Decimal(str(round(b_val, 2))),
            Acsd_Sell_Tot_Val=Decimal(str(round(b_val * 0.8, 2))),
            Acsd_Buy_Tot_Cnt=r.buy_cnt,
            Acsd_Pos_Cont_Val=Decimal(str(round(b_val * 0.05, 2))),
            Acsd_Neg_Cont_Val=Decimal(str(round(b_val * 0.015, 2))),
        ))
        if len(acsd_objects) >= 1000:
            db.bulk_save_objects(acsd_objects)
            db.commit()
            acsd_objects.clear()
    if acsd_objects:
        db.bulk_save_objects(acsd_objects)
        db.commit()

    print("[seed] Generating AGG_PAN_PAIR_DAY rows …")
    appd_query = db.query(
        FactTrades.Ftrd_Trd_Date.label("date"),
        FactTrades.Ftrd_Cmp_Token.label("cmp_token"),
        FactTrades.Ftrd_Buy_Exch_Clnt_Token.label("buy_clnt"),
        FactTrades.Ftrd_Sell_Exch_Clnt_Token.label("sell_clnt"),
        FactTrades.Ftrd_Buy_Exch_TM_Token.label("tm_token"),
        FactTrades.Ftrd_Sell_Exch_TM_Token.label("cpty_tm_token"),
        func.sum(FactTrades.Ftrd_Trd_Qty).label("pair_qty"),
        func.sum(FactTrades.Ftrd_Trd_Val).label("pair_val"),
        func.count(FactTrades.Ftrd_Trd_Num).label("pair_cnt")
    ).group_by(FactTrades.Ftrd_Trd_Date, FactTrades.Ftrd_Cmp_Token, FactTrades.Ftrd_Buy_Exch_Clnt_Token, FactTrades.Ftrd_Sell_Exch_Clnt_Token, FactTrades.Ftrd_Buy_Exch_TM_Token, FactTrades.Ftrd_Sell_Exch_TM_Token).all()

    appd_objects = []
    for r in appd_query:
        p_qty = float(r.pair_qty or 0)
        p_val = float(r.pair_val or 0)
        appd_objects.append(AggPanPairDay(
            Appd_Date=r.date,
            Appd_Cmp_Token=r.cmp_token,
            Appd_Exch_Clnt_Token=r.buy_clnt,
            Appd_Clnt_Token=r.buy_clnt,
            Appd_Exch_TM_Token=r.tm_token,
            Appd_TM_Token=r.tm_token,
            Appd_Cpty_Exch_Clnt_Token=r.sell_clnt,
            Appd_Cpty_Clnt_Token=r.sell_clnt,
            Appd_Cpty_Exch_TM_Token=r.cpty_tm_token,
            Appd_Cpty_TM_Token=r.cpty_tm_token,
            Appd_Buy_Tot_Qty=Decimal(str(round(p_qty, 2))),
            Appd_Buy_Tot_Val=Decimal(str(round(p_val, 2))),
            Appd_Buy_Tot_Cnt=r.pair_cnt,
            Appd_Pos_Contri=Decimal(str(round(p_val * 0.02, 2))),
        ))
        if len(appd_objects) >= 1000:
            db.bulk_save_objects(appd_objects)
            db.commit()
            appd_objects.clear()
    if appd_objects:
        db.bulk_save_objects(appd_objects)
        db.commit()

    count_decl = db.query(DimExchClntDtls).count()
    count_ddcl = db.query(DimDepClntDtls).count()
    count_ftrd = db.query(FactTrades).count()
    count_fmsh = db.query(FactMstrSharehldg).count()
    count_fshg = db.query(FactMainShldng).count()
    count_fcac = db.query(FactCorpActions).count()
    count_usr  = db.query(SysUser).count()
    count_log  = db.query(SysAuditLog).count()
    count_case = db.query(ForensicCase).count()
    count_asd  = db.query(AggSecDay).count()
    count_acsd = db.query(AggClntSecDay).count()
    count_appd = db.query(AggPanPairDay).count()

    print(f"[seed] Done. DECL={count_decl}, DDCL={count_ddcl}, FTRD={count_ftrd}, ASD={count_asd}, ACSD={count_acsd}, APPD={count_appd}")
    return {
        "status": "seeded",
        "DIM_EXCH_CLNT_DTLS": count_decl,
        "DIM_DEP_CLNT_DTLS":  count_ddcl,
        "FACT_TRADES":        count_ftrd,
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

