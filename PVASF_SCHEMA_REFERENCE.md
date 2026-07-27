# PVASF Complete Table Schema Reference

**Purpose:** Full column-level schema reference for the three Teradata tables underpinning the PVASF system. This document is the definitive reference for the data engineering team to understand the complete structure of the tables we are working with.

> **Verification:** Column counts were extracted programmatically from Pydantic schema definitions (`backend/schemas/`) to ensure completeness.

---

## Table 1: `FACT_TRADES` (FTRD)

**Description:** Central fact table. One row per trade execution on the exchange. Primary source for all PVASF alert computation, participant analytics, and the trades execution log.

**Total Columns: 97** (27 base + 70 detail)

### Base Columns — Returned in all list/filter responses

| # | Column Name | Data Type | Description |
|---|---|---|---|
| 1 | `Ftrd_Trd_Date` | `DATE` | Calendar date of the trade |
| 2 | `Ftrd_Trd_Num` | `INTEGER` | Unique trade number (Primary Key) |
| 3 | `Ftrd_Symbol` | `VARCHAR` | NSE scrip symbol (e.g., `ALPHATECH`) |
| 4 | `Ftrd_Series` | `VARCHAR` | Series code (e.g., `EQ`, `BE`) |
| 5 | `Ftrd_Sub_Seg_Code` | `INTEGER` | Sub-segment: 1=EQ, 2=Futures, 3=Call, 4=Put |
| 6 | `Ftrd_Sess_Type` | `INTEGER` | Session: 1=Pre-Open, 2=Market, 3=Close |
| 7 | `Ftrd_Trd_Tmst` | `TIMESTAMP` | Full execution timestamp (HH:MM:SS.mmm precision) |
| 8 | `Ftrd_Trd_Price` | `DECIMAL` | Execution price |
| 9 | `Ftrd_Trd_Qty` | `DECIMAL` | Executed quantity |
| 10 | `Ftrd_Trd_Val` | `DECIMAL` | Total trade value (Price × Qty) |
| 11 | `Ftrd_Buy_Exch_TM_Token` | `INTEGER` | Buying Broker / Trading Member token |
| 12 | `Ftrd_Buy_Exch_Clnt_Token` | `INTEGER` | Buying Client exchange token (FK → DECL) |
| 13 | `Ftrd_Sell_Exch_TM_Token` | `INTEGER` | Selling Broker / Trading Member token |
| 14 | `Ftrd_Sell_Exch_Clnt_Token` | `INTEGER` | Selling Client exchange token (FK → DECL) |
| 15 | `Ftrd_Buy_Acct_Type` | `INTEGER` | Buy account type: 1=Client, 2=Proprietary, 3=Institutional |
| 16 | `Ftrd_Sell_Acct_Type` | `INTEGER` | Sell account type: 1=Client, 2=Proprietary, 3=Institutional |
| 17 | `Ftrd_Same_Broker_Wash_Flag` | `INTEGER` | 1 if buyer & seller are at the same broker (wash trade indicator) |
| 18 | `Ftrd_Diff_Broker_Wash_Flag` | `INTEGER` | 1 if wash trade detected across different brokers |
| 19 | `Ftrd_Buy_CTCL_Algo_Flag` | `INTEGER` | Buy side algo flag: 0=Algo, 1=Non-Algo |
| 20 | `Ftrd_Sell_CTCL_Algo_Flag` | `INTEGER` | Sell side algo flag: 0=Algo, 1=Non-Algo |
| 21 | `Ftrd_Buy_CTCL_Inet_DMA_Flag` | `INTEGER` | Buy side DMA / internet order flag |
| 22 | `Ftrd_Sell_CTCL_Inet_DMA_Flag` | `INTEGER` | Sell side DMA / internet order flag |
| 23 | `Ftrd_LTP_Chng_Indc` | `VARCHAR` | LTP change direction: `+` (up), `-` (down), `=` (unchanged) |
| 24 | `Ftrd_Last_Trd_Price` | `DECIMAL` | Last traded price immediately before this trade |
| 25 | `Ftrd_Init_Side_Type` | `INTEGER` | Initiator side: 1=Buy aggressive, 2=Sell aggressive |
| 26 | `Ftrd_Trd_Mod_Flag` | `INTEGER` | 1 if the trade record was modified post-execution |
| 27 | `Ftrd_Trd_Can_Flag` | `INTEGER` | 1 if the trade was cancelled |

### Detail Columns — Returned in single-record / full-detail endpoints

| # | Column Name | Data Type | Description |
|---|---|---|---|
| 28 | `Ftrd_Cmp_Token` | `INTEGER` | Company / security token |
| 29 | `Ftrd_Trd_Prd_Token` | `INTEGER` | Product token (instrument type) |
| 30 | `Ftrd_Exch_Token` | `INTEGER` | Exchange internal token |
| 31 | `Ftrd_Seg_Token` | `INTEGER` | Segment token (e.g., Cash Market, F&O) |
| 32 | `Ftrd_Trd_Time` | `TIME` | Time component of trade (HH:MM:SS) |
| 33 | `Ftrd_Buy_Trdr_Token` | `INTEGER` | Buying trader / terminal token |
| 34 | `Ftrd_Sell_Trdr_Token` | `INTEGER` | Selling trader / terminal token |
| 35 | `Ftrd_Lot_Qty` | `DECIMAL` | Lot size for the instrument |
| 36 | `Ftrd_Tick_Price` | `DECIMAL` | Minimum price tick size |
| 37 | `Ftrd_Buy_Ord_Num` | `INTEGER` | Buy order number |
| 38 | `Ftrd_Buy_CA_Catg` | `VARCHAR` | Buy client account category code |
| 39 | `Ftrd_Buy_CP_Flag` | `VARCHAR` | Buy counter-party flag |
| 40 | `Ftrd_Buy_CTCL_Ref` | `VARCHAR` | Buy CTCL / broker reference number |
| 41 | `Ftrd_Buy_IP_Addr` | `VARCHAR` | Buy side originating IP address |
| 42 | `Ftrd_Buy_Ord_Tmst` | `TIMESTAMP` | Buy order placement timestamp |
| 43 | `Ftrd_Buy_Ord_Price` | `DECIMAL` | Buy order placed price |
| 44 | `Ftrd_Buy_Ord_Qty` | `DECIMAL` | Buy order placed quantity |
| 45 | `Ftrd_Buy_Trig_Price` | `DECIMAL` | Buy stop-loss trigger price |
| 46 | `Ftrd_Buy_Book_Type` | `INTEGER` | Buy order book type |
| 47 | `Ftrd_Buy_Price_Type` | `INTEGER` | Buy price type: Limit / Market |
| 48 | `Ftrd_Buy_Mkt_Flag` | `VARCHAR` | Buy market order flag |
| 49 | `Ftrd_Buy_Stop_Flag` | `VARCHAR` | Buy stop-loss order flag |
| 50 | `Ftrd_Buy_Time_Type` | `INTEGER` | Buy time-in-force type (Day / IOC / etc.) |
| 51 | `Ftrd_Buy_Trig_Type` | `INTEGER` | Buy trigger type |
| 52 | `Ftrd_Buy_FOK_Flag` | `VARCHAR` | Buy Fill-or-Kill flag |
| 53 | `Ftrd_Buy_Qty_Type` | `INTEGER` | Buy quantity type |
| 54 | `Ftrd_Buy_Ord_Type` | `INTEGER` | Buy order type (Regular / Special) |
| 55 | `Ftrd_Sell_Ord_Num` | `INTEGER` | Sell order number |
| 56 | `Ftrd_Sell_CA_Catg` | `VARCHAR` | Sell client account category code |
| 57 | `Ftrd_Sell_CP_Flag` | `VARCHAR` | Sell counter-party flag |
| 58 | `Ftrd_Sell_CTCL_Ref` | `VARCHAR` | Sell CTCL / broker reference number |
| 59 | `Ftrd_Sell_IP_Addr` | `VARCHAR` | Sell side originating IP address |
| 60 | `Ftrd_Sell_Ord_Tmst` | `TIMESTAMP` | Sell order placement timestamp |
| 61 | `Ftrd_Sell_Ord_Price` | `DECIMAL` | Sell order placed price |
| 62 | `Ftrd_Sell_Ord_Qty` | `DECIMAL` | Sell order placed quantity |
| 63 | `Ftrd_Sell_Trig_Price` | `DECIMAL` | Sell stop-loss trigger price |
| 64 | `Ftrd_Sell_Book_Type` | `INTEGER` | Sell order book type |
| 65 | `Ftrd_Sell_Price_Type` | `INTEGER` | Sell price type: Limit / Market |
| 66 | `Ftrd_Sell_MKt_Flag` | `VARCHAR` | Sell market order flag |
| 67 | `Ftrd_Sell_Stop_Flag` | `VARCHAR` | Sell stop-loss order flag |
| 68 | `Ftrd_Sell_Time_Type` | `INTEGER` | Sell time-in-force type |
| 69 | `Ftrd_Sell_Trig_Type` | `INTEGER` | Sell trigger type |
| 70 | `Ftrd_Sell_FOK_Flag` | `VARCHAR` | Sell Fill-or-Kill flag |
| 71 | `Ftrd_Sell_Qty_Type` | `INTEGER` | Sell quantity type |
| 72 | `Ftrd_Sell_Ord_Type` | `INTEGER` | Sell order type (Regular / Special) |
| 73 | `Ftrd_Buy_Spread_Indc` | `VARCHAR` | Buy spread order indicator |
| 74 | `Ftrd_Sell_Spread_Indc` | `VARCHAR` | Sell spread order indicator |
| 75 | `Ftrd_Buy_Spread_Flag` | `INTEGER` | Buy spread flag |
| 76 | `Ftrd_Sell_Spread_Flag` | `INTEGER` | Sell spread flag |
| 77 | `Ftrd_Init_Clnt_Token` | `INTEGER` | Initiating client token (aggressor side) |
| 78 | `Ftrd_Buy_Sell_Diff_Price` | `DECIMAL` | Price difference between buy and sell orders |
| 79 | `Ftrd_Buy_Sell_Diff_Qty` | `DECIMAL` | Quantity difference between buy and sell orders |
| 80 | `Ftrd_Best_Bid_Price` | `DECIMAL` | Best bid price at the moment of trade |
| 81 | `Ftrd_Best_Ask_Price` | `DECIMAL` | Best ask price at the moment of trade |
| 82 | `Ftrd_Best_Bid_Qty` | `DECIMAL` | Best bid quantity |
| 83 | `Ftrd_Best_Ask_Qty` | `DECIMAL` | Best ask quantity |
| 84 | `Ftrd_Best_Bid_Ord_Cnt` | `INTEGER` | Order count at best bid level |
| 85 | `Ftrd_Best_Ask_Ord_Cnt` | `INTEGER` | Order count at best ask level |
| 86 | `Ftrd_Bid_Pdg_Ord_Cnt` | `INTEGER` | Total pending bid order count |
| 87 | `Ftrd_Ask_Pdg_Ord_Cnt` | `INTEGER` | Total pending ask order count |
| 88 | `Ftrd_Bid_Pdg_Ord_Qty` | `DECIMAL` | Total pending bid order quantity |
| 89 | `Ftrd_Ask_Pdg_Ord_Qty` | `DECIMAL` | Total pending ask order quantity |
| 90 | `Ftrd_Bid_Pdg_Ord_Val` | `DECIMAL` | Total pending bid order value |
| 91 | `Ftrd_Ask_Pdg_Ord_Val` | `DECIMAL` | Total pending ask order value |
| 92 | `Ftrd_Last_Estd_Hi_Price` | `DECIMAL` | Last estimated equilibrium high price |
| 93 | `Ftrd_Last_Estd_Low_Price` | `DECIMAL` | Last estimated equilibrium low price |
| 94 | `FTRD_BUY_ALGO_ID` | `VARCHAR` | Buy side algorithm identifier |
| 95 | `FTRD_SELL_ALGO_ID` | `VARCHAR` | Sell side algorithm identifier |
| 96 | `FTRD_BUY_ALGO_CATG_TYPE` | `INTEGER` | Buy algo category type code |
| 97 | `FTRD_SELL_ALGO_CATG_TYPE` | `INTEGER` | Sell algo category type code |

---

## Table 2: `DIM_EXCH_CLNT_DTLS` (DECL)

**Description:** Exchange client dimension table. One row per unique client per exchange per segment. Links trading activity (FTRD) back to a legal entity via PAN.

**Total Columns: 44** (21 base + 23 detail)

### Base Columns — Returned in all list responses

| # | Column Name | Data Type | Description |
|---|---|---|---|
| 1 | `Decl_Exch_Clnt_Token` | `INTEGER` | Primary key — unique client token on exchange (FK target from FTRD) |
| 2 | `Decl_Clnt_Token` | `INTEGER` | Internal global client token |
| 3 | `Decl_TM_Id` | `VARCHAR` | Trading Member (Broker) ID |
| 4 | `Decl_Clnt_Id` | `VARCHAR` | Unique client ID assigned by the broker |
| 5 | `Decl_Client_Code` | `VARCHAR` | Exchange-assigned client code |
| 6 | `Decl_Clnt_Pan` | `VARCHAR` | **PAN — primary identity key; join key to DDCL** |
| 7 | `Decl_Clnt_Name` | `VARCHAR` | Client full name |
| 8 | `Decl_Frst_Name` | `VARCHAR` | First name |
| 9 | `Decl_Last_Name` | `VARCHAR` | Last name |
| 10 | `Decl_Clnt_Catg_Type` | `INTEGER` | Category code: Individual, Corporate, FII, etc. |
| 11 | `Decl_Clnt_Catg_Type_Desc` | `VARCHAR` | Category description |
| 12 | `Decl_Clnt_Stat` | `INTEGER` | Account status: 1=Active, 2=Suspended |
| 13 | `Decl_Clnt_Stat_Indc` | `VARCHAR` | Status description |
| 14 | `Decl_City` | `VARCHAR` | Registered city |
| 15 | `Decl_State` | `VARCHAR` | Registered state |
| 16 | `Decl_Cntry` | `VARCHAR` | Country |
| 17 | `Decl_Frst_Email_Id` | `VARCHAR` | Primary email address |
| 18 | `Decl_Frst_Mob_Num` | `VARCHAR` | Primary mobile number |
| 19 | `Decl_Rec_Date` | `DATE` | Record effective date |
| 20 | `Decl_Exch_Id` | `VARCHAR` | Exchange identifier (e.g., `NSE`) |
| 21 | `Decl_Seg_Id` | `VARCHAR` | Segment identifier (e.g., `CM`, `FO`) |

### Detail Columns — Returned in full profile / detail endpoints

| # | Column Name | Data Type | Description |
|---|---|---|---|
| 22 | `Decl_Exch_Token` | `INTEGER` | Exchange internal token |
| 23 | `Decl_Seg_Token` | `INTEGER` | Segment token |
| 24 | `Decl_Exch_TM_Token` | `INTEGER` | Trading Member token on exchange |
| 25 | `Decl_Clnt_Uid` | `VARCHAR` | Client universal ID (e.g., Aadhaar-linked) |
| 26 | `Decl_Clnt_UCC` | `VARCHAR` | Unique Client Code (UCC) |
| 27 | `Decl_Clnt_Mapin` | `VARCHAR` | MAPIN / SEBI registration number |
| 28 | `Decl_Mid_Name` | `VARCHAR` | Middle name |
| 29 | `Decl_Ftr_Hus_Name` | `VARCHAR` | Father's / Husband's name |
| 30 | `Decl_Birth_Date` | `DATE` | Date of birth |
| 31 | `Decl_Frst_Addr_Line` | `VARCHAR` | Address line 1 |
| 32 | `Decl_Scnd_Addr_Line` | `VARCHAR` | Address line 2 |
| 33 | `Decl_Thrd_Addr_Line` | `VARCHAR` | Address line 3 |
| 34 | `Decl_Pin` | `VARCHAR` | PIN / ZIP code |
| 35 | `Decl_Bank_Name` | `VARCHAR` | Registered bank name |
| 36 | `Decl_Bank_Acct_Type` | `INTEGER` | Bank account type code |
| 37 | `Decl_Agmt_Date` | `DATE` | Client agreement / KYC date |
| 38 | `Decl_Dep_Id` | `VARCHAR` | Depository ID (NSDL / CDSL) |
| 39 | `Decl_Dep_Name` | `VARCHAR` | Depository name |
| 40 | `Decl_Dp_Id` | `VARCHAR` | Depository Participant ID |
| 41 | `Decl_BO_Id` | `VARCHAR` | Beneficiary Owner account ID |
| 42 | `Decl_Clnt_Acct_Type` | `INTEGER` | Account type code |
| 43 | `Decl_Clnt_Acct_Type_Desc` | `VARCHAR` | Account type description |
| 44 | `Decl_Dmat_Acct_Num` | `VARCHAR` | Demat account number |

---

## Table 3: `DIM_DEP_CLNT_DTLS` (DDCL)

**Description:** Depository client dimension table. One row per Beneficiary Owner (BO) account at NSDL or CDSL. Used to cross-reference holdings and joint account holders.

**Total Columns: 45** (17 base + 28 detail)

### Base Columns — Returned in all list responses

| # | Column Name | Data Type | Description |
|---|---|---|---|
| 1 | `Ddcl_Dep_Clnt_Token` | `INTEGER` | Primary key — unique depository client token |
| 2 | `Ddcl_Clnt_Token` | `INTEGER` | Internal global client token |
| 3 | `Ddcl_Dep_Token` | `INTEGER` | Depository: 1=NSDL, 2=CDSL |
| 4 | `Ddcl_BP_Id` | `VARCHAR` | Business Partner / Depository Participant ID |
| 5 | `Ddcl_Clnt_Id` | `VARCHAR` | Client / Beneficiary Owner account ID |
| 6 | `Ddcl_Clnt_Pan` | `VARCHAR` | **PAN — primary identity key; join key to DECL** |
| 7 | `Ddcl_Clnt_Name` | `VARCHAR` | Client full name |
| 8 | `Ddcl_Clnt_Shrt_Name` | `VARCHAR` | Client short / display name |
| 9 | `Ddcl_Clnt_Catg_Type` | `INTEGER` | Category type code |
| 10 | `Ddcl_Clnt_Catg_Type_Desc` | `VARCHAR` | Category description |
| 11 | `Ddcl_Clnt_Stat` | `INTEGER` | Account status code |
| 12 | `Ddcl_Clnt_Stat_Desc` | `VARCHAR` | Account status description |
| 13 | `Ddcl_City` | `VARCHAR` | City |
| 14 | `Ddcl_Cntry` | `VARCHAR` | Country |
| 15 | `Ddcl_Frst_Email_Id` | `VARCHAR` | Primary email address |
| 16 | `Ddcl_Acct_Openng_Date` | `DATE` | Account opening date |
| 17 | `Ddcl_Rec_Date` | `DATE` | Record effective date |

### Detail Columns — Returned in full profile / detail endpoints

| # | Column Name | Data Type | Description |
|---|---|---|---|
| 18 | `Ddcl_BP_Token` | `INTEGER` | Business Partner / broker token |
| 19 | `Ddcl_Clnt_Code` | `VARCHAR` | Client code at the depository |
| 20 | `Ddcl_Clnt_Uniq_Id` | `VARCHAR` | Unique depository client identifier |
| 21 | `Ddcl_Clnt_Mapin` | `VARCHAR` | MAPIN registration number |
| 22 | `Ddcl_Clnt_SubCatg_Type` | `INTEGER` | Sub-category type code |
| 23 | `Ddcl_Clnt_SubCatg_Type_Desc` | `VARCHAR` | Sub-category description |
| 24 | `Ddcl_Clnt_Acct_Type` | `INTEGER` | Account type code |
| 25 | `Ddcl_Clnt_Acct_Type_Desc` | `VARCHAR` | Account type description |
| 26 | `Ddcl_Ftr_Hus_Name` | `VARCHAR` | Father's / Husband's name |
| 27 | `Ddcl_Sex` | `VARCHAR` | Gender |
| 28 | `Ddcl_Ntnlty_Desc` | `VARCHAR` | Nationality description |
| 29 | `Ddcl_Birth_Date` | `DATE` | Date of birth |
| 30 | `Ddcl_Frst_Addr_Line` | `VARCHAR` | Address line 1 |
| 31 | `Ddcl_Scnd_Addr_Line` | `VARCHAR` | Address line 2 |
| 32 | `Ddcl_State` | `VARCHAR` | State |
| 33 | `Ddcl_Pin` | `VARCHAR` | PIN code |
| 34 | `Ddcl_Frst_Tele_Num` | `VARCHAR` | Primary telephone number |
| 35 | `Ddcl_Bank_Name` | `VARCHAR` | Registered bank name |
| 36 | `Ddcl_Bank_Acct_Type` | `INTEGER` | Bank account type code |
| 37 | `Ddcl_Acct_Closr_Date` | `DATE` | Account closure date (NULL if currently active) |
| 38 | `Ddcl_Scnd_Hldr_Clnt_Token` | `INTEGER` | Second / joint account holder token |
| 39 | `Ddcl_Scnd_Hldr_Name` | `VARCHAR` | Second joint holder name |
| 40 | `Ddcl_Thrd_Hldr_Clnt_Token` | `INTEGER` | Third joint account holder token |
| 41 | `Ddcl_Thrd_Hldr_Name` | `VARCHAR` | Third joint holder name |
| 42 | `Ddcl_SEBI_Reg_Num` | `VARCHAR` | SEBI registration number (for institutional clients) |
| 43 | `Ddcl_BO_Exch_Id` | `VARCHAR` | Linked exchange identifier |
| 44 | `Ddcl_BO_CM_Id` | `VARCHAR` | Clearing Member ID |
| 45 | `Ddcl_Exch_Clnt_Id` | `VARCHAR` | Exchange client ID (FK → DECL.Decl_Clnt_Id) |

---

## Grand Total Summary

| Table | Base Columns | Detail Columns | **Total** |
|---|---|---|---|
| `FACT_TRADES` (FTRD) | 27 | 70 | **97** |
| `DIM_EXCH_CLNT_DTLS` (DECL) | 21 | 23 | **44** |
| `DIM_DEP_CLNT_DTLS` (DDCL) | 17 | 28 | **45** |
| **Grand Total** | | | **186** |

---

## Table Relationship Diagram

```
FACT_TRADES (FTRD)
    Ftrd_Buy_Exch_Clnt_Token  ──────►  DIM_EXCH_CLNT_DTLS (DECL)
    Ftrd_Sell_Exch_Clnt_Token ──────►  Decl_Exch_Clnt_Token [PK]
                                                  │
                                        Decl_Clnt_Pan ────►  DIM_DEP_CLNT_DTLS (DDCL)
                                                               Ddcl_Clnt_Pan [PK join]
```

The **PAN** (`Decl_Clnt_Pan` / `Ddcl_Clnt_Pan`) is the legal entity identifier that bridges:
- Exchange trade records (FTRD)
- KYC and broker account details (DECL)
- Depository holdings and joint account holders (DDCL)

This three-way join is the core of the **Client 360° Profile** and **Counterparty Concentration** modules.

---

*Schema extracted from Pydantic model definitions in `backend/schemas/`. All column name prefixes are table-specific: `Ftrd_` (FTRD), `Decl_` (DECL), `Ddcl_` (DDCL).*
