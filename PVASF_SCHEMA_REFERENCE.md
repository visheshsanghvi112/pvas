# PVASF Complete Table Schema Reference

**Purpose:** Full column-level schema reference for the 19 enterprise database tables underpinning the PVASF system across the 3-Tier SEBI Data Warehouse architecture (Dimension Layer, Fact Execution Layer, and Aggregate Layer).

> **Architecture Note:** `FACT_TRADES` is retained in the system for microsecond execution logs, order numbers (`Ftrd_Buy_Ord_Num`), same-broker wash trade flags, and legal evidence in court proceedings. However, `FACT_TRADES` is **omitted from daily baseline OHLC/Close calculations** because official 30-minute VWAP Closing Prices and daily volume aggregates are provided directly by `AGG_SEC_DAY`.

---

## Table 1: `FACT_TRADES` (FTRD)

**Description:** Central trade execution match table. One row per execution match on the exchange. Used for millisecond timestamp correlation, order ID inspection, and pinning trade evidence into forensic dossiers.

**Total Columns: 123** (Matching Enterprise Data Warehouse PDM V10.0 Spec)

### Base Columns — Returned in all list/filter responses (27 Base Fields)

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

**Description:** Exchange client dimension table. One row per unique client per exchange per segment. Links trading activity (`FTRD`) back to a legal entity via PAN.

**Total Columns: 128** (Matching Enterprise Data Warehouse PDM V10.0 Spec)

### Column Highlights (128 Total Fields)

| Category | Key Fields Included | Description |
|---|---|---|
| **Core Tokens & Identifiers (1-14)** | `Decl_Exch_Clnt_Token`, `Decl_Clnt_Token`, `Decl_TM_Id`, `Decl_Clnt_Id`, `Decl_Client_Code`, `Decl_Clnt_Pan`, `Decl_Clnt_Uid`, `Decl_Clnt_UCC`, `Decl_Clnt_Mapin` | Primary tokens, Trading Member ID, Client Code, and legal PAN identity key (Join key to DDCL). |
| **Category & Personal Info (15-21)** | `Decl_Clnt_Catg_Type`, `Decl_Clnt_Catg_Type_Desc`, `Decl_Clnt_Name`, `Decl_Frst_Name`, `Decl_Mid_Name`, `Decl_Last_Name`, `Decl_Ftr_Hus_Name` | 18 Client category types (Individual, Corporate, FII, HUF, Bank, Mutual Fund, etc.) & legal names. |
| **Account Status & Depository (22-29)**| `Decl_Clnt_Stat`, `Decl_Clnt_Stat_Indc`, `Decl_Dep_Id`, `Decl_Dep_Name`, `Decl_Dp_Id`, `Decl_BO_Id`, `Decl_Micr_Code`, `Decl_Dp_Name` | Status (1=Active, 2=Suspended), DP/BO IDs, MICR codes. |
| **Bank Details (30-33)** | `Decl_Bank_Name`, `Decl_Bank_Addr`, `Decl_Bank_Acct_Num`, `Decl_Bank_Acct_Type` | Bank account numbers & type codes (Savings, Current, NRE). |
| **Demographics & Contact (34-48)** | `Decl_Birth_Date`, `Decl_Frst_Addr_Line`..`Frth_Addr_Line`, `Decl_City`, `Decl_State`, `Decl_Cntry`, `Decl_Pin`, `Decl_Frst_Tele_Num`, `Decl_Frst_Fax_Num`, `Decl_Frst_Mob_Num`, `Decl_Frst_Email_Id`, `Decl_Isd_Code`, `Decl_Std_Code` | Full address, contact numbers, email, DOB. |
| **KYC & Sub-Broker Info (49-64)** | `Decl_Agmt_Date`, `Decl_Intro_Name`, `Decl_Othr_TM_Flag`, `Decl_UCC_Info_Date`, `Decl_Qua_Desc`, `Decl_Occu_Desc`, `Decl_Sub_Broker_Id`, `Decl_Sub_Broker_Name`, `Decl_SubBroker_Reg_Num` | Introducer details, sub-broker regulatory registration, UCC dates. |
| **Family & Alternate Accounts (65-79)**| `Decl_Fam_Mbr_Acct_Type_Desc`, `Decl_Fam_Frst_Mbr_Name`..`Frth_Mbr_Name`, `Decl_Othr_Frst_Mbr_Id`..`Frth_Mbr_Id`, `Decl_Inprsn_Vrfy_Flag` | Family member settlement modes and in-person verification flags. |
| **Identity Documents (80-100)** | `Decl_Ward_Circle_Num`, `Decl_Psprt_Num`, `Decl_Drvng_Lic_Num`, `Decl_Voter_Id_Num`, `Decl_Ratn_Card_Num`, `Decl_Reg_Auth_Num` | Passport, Driving License, Voter ID, Ration Card & Registration Authority numbers/issue dates. |
| **Contact Persons (101-118)** | `Decl_Frst_Cntct_Person_Name`..`Thrd_Cntct_Person_Name`, PAN, Designation, Address, Phone, Email | 1st, 2nd, and 3rd designated contact persons for non-individual / corporate entities. |
| **Record Metadata & CDSL (119-128)** | `Decl_Rec_Date`, `Decl_Clnt_Acct_Type`, `Decl_Dmat_Acct_Num`, `Decl_Cdsl_Dep_Id`, `Decl_Cdsl_Dp_Id`, `Decl_Cdsl_Bo_Id`, `Decl_Reltn_Code` | CDSL depository details, record effective date, relation code. |

---

## Table 3: `DIM_DEP_CLNT_DTLS` (DDCL)

**Description:** Depository client dimension table. One row per Beneficiary Owner (BO) account at NSDL or CDSL. Used to cross-reference holdings and joint account holders.

**Total Columns: 63** (Matching Enterprise Data Warehouse PDM V10.0 Spec)

### Complete Column Specification (63 Fields)

| # | Field Name | Data Type | Description |
|---|---|---|---|
| 1 | `Ddcl_Dep_Clnt_Token` | `BigInt` | Primary Key — Client Depository Token |
| 2 | `Ddcl_Clnt_Token` | `BigInt` | De-Duped Client Token |
| 3 | `Ddcl_Dep_Token` | `ByteInt` | Depository Token (1=NSDL, 2=CDSL) |
| 4 | `Ddcl_BP_Token` | `BigInt` | Business Partners Token |
| 5 | `Ddcl_BP_Id` | `Char(16)` | Depository Participant ID (Business Partners) |
| 6 | `Ddcl_Clnt_Id` | `Char(16)` | Client ID / Beneficiary Owner Account ID |
| 7 | `Ddcl_Clnt_Pan` | `Varchar(30)` | **PAN Number of Client — Primary Identity Join Key to DECL** |
| 8 | `Ddcl_Clnt_Code` | `Char(40)` | Client Code at Depository |
| 9 | `Ddcl_Clnt_Uniq_Id` | `Char(16)` | Unique ID of Client |
| 10 | `Ddcl_Clnt_Mapin` | `Char(10)` | MAPIN ID for Client |
| 11 | `Ddcl_Clnt_Catg_Type_Desc` | `Varchar(10)` | Client Category Type Description (Individual, FII, etc.) |
| 12 | `Ddcl_Clnt_SubCatg_Type_Desc` | `Varchar(10)` | Client Sub Category Type Description (HUF, Promoter, etc.) |
| 13 | `Ddcl_Clnt_Acct_Type_Desc` | `Varchar(30)` | Client Account Type Description |
| 14 | `Ddcl_Clnt_Catg_Type` | `ByteInt` | Client Category Type Code |
| 15 | `Ddcl_Clnt_SubCatg_Type` | `Int` | Client Sub Category Type Code |
| 16 | `Ddcl_Clnt_Acct_Type` | `ByteInt` | Client Account Type Code |
| 17 | `Ddcl_Clnt_Name` | `Varchar(250)` | Full Name of Client |
| 18 | `Ddcl_Clnt_Shrt_Name` | `Varchar(20)` | Short Name of Client |
| 19 | `Ddcl_Ftr_Hus_Name` | `Varchar(100)` | Client Father or Husband Name |
| 20 | `Ddcl_Clnt_Stat_Desc` | `Varchar(10)` | Client Account Status Description |
| 21 | `Ddcl_Clnt_Stat` | `ByteInt` | Client Account Status Code |
| 22 | `Ddcl_Acct_Openng_Date` | `Date` | Account Opening Date |
| 23 | `Ddcl_Acct_Closr_Date` | `Date` | Account Closing Date |
| 24 | `Ddcl_Susp_Rson_Type_Desc` | `Varchar(10)` | Suspended Reason Type Description |
| 25 | `Ddcl_Micr_Code` | `Varchar(25)` | MICR Code of the Bank |
| 26 | `Ddcl_Bank_Name` | `Varchar(100)` | Full Name of Bank |
| 27 | `Ddcl_Bank_Acct_Num` | `Varchar(25)` | Bank Account Number |
| 28 | `Ddcl_Bank_Acct_Type_Desc` | `Varchar(30)` | Bank Account Type Description |
| 29 | `Ddcl_Bank_Acct_Type` | `ByteInt` | Bank Account Type Code |
| 30 | `Ddcl_Birth_Date` | `Date` | Date of Birth of Client |
| 31 | `Ddcl_Minor_Birth_Date` | `Date` | Minor Date of Birth |
| 32 | `Ddcl_Sex` | `Char(1)` | Gender / Sex |
| 33 | `Ddcl_Ntnlty_Desc` | `Varchar(10)` | Nationality Description |
| 34 | `Ddcl_Frst_Addr_Line` | `Varchar(100)` | First Address Line of Client |
| 35 | `Ddcl_Scnd_Addr_Line` | `Varchar(100)` | Second Address Line of Client |
| 36 | `Ddcl_Thrd_Addr_Line` | `Varchar(100)` | Third Address Line of Client |
| 37 | `Ddcl_Frth_Addr_Line` | `Varchar(100)` | Fourth Address Line of Client |
| 38 | `Ddcl_City` | `Varchar(60)` | City |
| 39 | `Ddcl_State` | `Varchar(60)` | State |
| 40 | `Ddcl_Cntry` | `Varchar(30)` | Country |
| 41 | `Ddcl_Pin` | `Varchar(60)` | PIN Code of Client Address |
| 42 | `Ddcl_Frst_Tele_Num` | `Varchar(80)` | First Telephone Number of Client |
| 43 | `Ddcl_Frst_Fax_Num` | `Varchar(80)` | First Fax Number of Client |
| 44 | `Ddcl_Frst_Email_Id` | `Varchar(50)` | First Email Id of Client |
| 45 | `Ddcl_Scnd_Hldr_Clnt_Token` | `BigInt` | Second Holder Client Token |
| 46 | `Ddcl_Scnd_Hldr_Name` | `Varchar(100)` | Second Holder Name |
| 47 | `Ddcl_Scnd_Hldr_Pan` | `Varchar(30)` | Second Holder PAN |
| 48 | `Ddcl_Scnd_Hldr_Ftr_Hus_Name` | `Varchar(100)` | Second Holder Father / Husband Name |
| 49 | `Ddcl_Thrd_Hldr_Clnt_Token` | `BigInt` | Third Holder Client Token |
| 50 | `Ddcl_Thrd_Hldr_Name` | `Varchar(100)` | Third Holder Name |
| 51 | `Ddcl_Thrd_Hldr_Pan` | `Varchar(30)` | Third Holder PAN |
| 52 | `Ddcl_Thrd_Hldr_Ftr_Hus_Name` | `Varchar(100)` | Third Holder Father / Husband Name |
| 53 | `Ddcl_Poa_Enbld_Indc` | `Char(2)` | Power of Attorney Available Indicator |
| 54 | `Ddcl_Occu_Desc` | `Varchar(100)` | Occupation Description |
| 55 | `Ddcl_Regulatory_Reg_Num` | `Varchar(50)` | Regulatory Registration Number |
| 56 | `Ddcl_RBI_Reg_Num` | `Char(50)` | RBI Registration Number |
| 57 | `Ddcl_RBI_Aprvl_Date` | `Date` | RBI Approval Date |
| 58 | `Ddcl_Frst_RBI_Ref_Num` | `Varchar(50)` | First RBI Reference Number |
| 59 | `Ddcl_BO_Exch_Id` | `Char(10)` | BO's Stock Exchange ID |
| 60 | `Ddcl_BO_Clg_Corp_ID` | `Char(15)` | BO's Clearing Corporation ID |
| 61 | `Ddcl_BO_CM_Id` | `Char(15)` | BO's Clearing Member ID |
| 62 | `Ddcl_Exch_Clnt_Id` | `Char(15)` | BO's Trading ID (FK → DECL.Decl_Clnt_Id) |
| 63 | `Ddcl_Rec_Date` | `Date` | Record Insert Date |

---

## Grand Total Summary

---

## 1.3 Quarterly Shareholding Results Tables (8 Tables, 174 Columns)

### Table 4: `FACT_MSTR_SHAREHLDG` (FMSH) — 37 Columns
| Field Name | Type | Req'd | Description |
|---|---|---|---|
| `Fmsh_Exch_Token` | ByteInt | Y | Exchange Token |
| `Fmsh_Cmp_Token` | BigInt | Y | De-Duped Company Token |
| `Fmsh_Cmp_Name` | Varchar(100) | N | Company Name |
| `Fmsh_Exch_Cmp_Token` | Int | N | Token for Company listed in Exchange |
| `Fmsh_Ind_Token` | SmallInt | N | Token for Industry |
| `Fmsh_Trd_Prd_Token` | BigInt | Y | Token for Trading Product |
| `Fmsh_Symbol` | Char(10) | N | Symbol of the Company |
| `Fmsh_Series` | Char(2) | N | Series of the Trading Product |
| `Fmsh_Sec_Name` | Varchar(100) | N | Security Name |
| `Fmsh_Rec_Id` | Char(25) | N | Record Type / ID |
| `Fmsh_Nds_Id` | Char(25) | N | NDS ID (NSE) |
| `Fmsh_Qrtr_Id` | Int | N | Quarter ID |
| `Fmsh_Qrtr_Num` | Char(4) | N | Quarter Number (Q1/Q2/Q3/Q4) |
| `Fmsh_Letter_Date` | Date | N | Letter Date |
| `Fmsh_Stamp_Date` | Date | N | Stamp Date |
| `Fmsh_As_on_Date` | Date | N | Distribution Schedule Record Date |
| `Fmsh_Notes` | Varchar(100) | N | Shareholding Notes |
| `Fmsh_Status` | Varchar(20) | N | Replication Status |
| `Fmsh_Export_Date` | Date | N | Export Date |
| `Fmsh_Mn_Shldng_Rec_Cnt` | Int | N | Main Shareholding Record Count |
| `Fmsh_VR_Shldng_Rec_Cnt` | Int | N | DVR Shareholding Record Count |
| `Fmsh_Promtr_Shldng_Rec_Cnt` | Int | N | Promoter Shareholding Record Count |
| `Fmsh_Public_Shldng_Rec_Cnt` | Int | N | Public Shareholding Record Count |
| `Fmsh_Lckd_In_Shldng_Rec_Cnt` | Int | N | Locked-In Shareholding Record Count |
| `Fmsh_DR_Dtls_Shldng_Rec_Cnt` | Int | N | DR Details Record Count |
| `Fmsh_DR_Hldrs_Rec_Cnt` | Int | N | DR Holders Record Count |
| `Fmsh_Cnv_Sec_Rec_Cnt` | Int | N | Convertible Securities Record Count |
| `Fmsh_Mn_ANO_Ind_Rec_Cnt` | Int | N | Any Other Indian Record Count |
| `Fmsh_Mn_ANO_Frgn_Rec_Cnt` | Int | N | Any Other Foreign Record Count |
| `Fmsh_Mn_ANO_Inst_Rec_Cnt` | Int | N | Any Other Institutional Record Count |
| `Fmsh_Mn_ANO_NonInst_Rec_Cnt` | Int | N | Any Other Non-Institutional Record Count |
| `Fmsh_VR_ANO_Ind_Rec_Cnt` | Int | N | VR Any Other Indian Count |
| `Fmsh_VR_ANO_Frgn_Rec_Cnt` | Int | N | VR Any Other Foreign Count |
| `Fmsh_VR_ANO_Inst_Rec_Cnt` | Int | N | VR Any Other Institutional Count |
| `Fmsh_VR_ANO_NonInst_Rec_Cnt` | Int | N | VR Any Other Non-Institutional Count |
| `Fmsh_Shldng_Rmrks` | Varchar(50) | N | Shareholding Remarks |
| `Fmsh_Rec_Date` | Date | Y | Record Date |

### Table 5: `FACT_MAIN_SHLDNG` (FSHG) — 30 Columns
| Field Name | Type | Req'd | Description |
|---|---|---|---|
| `Fshg_Txn_Id` | Varchar(100) | N | Transaction ID |
| `Fshg_Exch_Token` | ByteInt | Y | Exchange Token |
| `Fshg_Cmp_Token` | BigInt | Y | De-Duped Company Token |
| `Fshg_Exch_Cmp_Token` | Int | N | Exchange Company Token |
| `Fshg_Trd_Prd_Token` | BigInt | Y | Trading Product Token |
| `Fshg_Symbol` | Char(10) | N | Symbol |
| `Fshg_Series` | Char(2) | N | Series |
| `Fshg_Rec_Id` | Char(25) | N | Record ID |
| `Fshg_Nds_Id` | Char(25) | N | NDS ID |
| `Fshg_Qrtr_Num` | Char(4) | Y | Quarter Number |
| `Fshg_Shldng_Date` | Date | N | Shareholding Date |
| `Fshg_Lvl_Name` | Varchar(100) | N | Shareholding Level Name |
| `Fshg_Lvl_Id` | Char(25) | N | Level ID |
| `Fshg_Shldr_Desc` | Varchar(50) | N | Shareholder Info Description |
| `Fshg_Shldng_Catg_Type` | ByteInt | Y | 1=Promoter, 2=Public, 3=Custodian, 4=Others |
| `Fshg_Shldng_Sub_Catg_Type` | ByteInt | Y | Sub Category Code |
| `Fshg_Shldng_Grp_Type` | ByteInt | N | Group Type (Individual, HUF, FII, etc.) |
| `Fshg_Shldng_Sub_Grp_Desc` | Varchar(200) | N | Sub Group Description |
| `Fshg_Shldr_Cnt` | Int | N | Number of Shareholders |
| `Fshg_Tot_Eq_Shares` | BigInt | N | Total Number of Shares |
| `Fshg_Issd_Cap_Shares` | BigInt | N | Total Issued Shares |
| `Fshg_Dmat_Shares` | BigInt | N | Number of Shares in Demat form |
| `Fshg_Dmat_Shares_Pct` | Numeric(10,2) | N | Demat Shares % |
| `Fshg_Tot_Shares_Pct` | Numeric(10,2) | N | Total Shares % |
| `Fshg_Grd_Tot_Shares_Pct` | Numeric(10,2) | Y | Grand Total Shares % |
| `Fshg_Plge_Shares` | BigInt | N | Number of Pledged Shares |
| `Fshg_Plge_Tot_Shares_Pct` | Numeric(10,2) | N | Pledged Shares % |
| `Fshg_Frgn_Shldng_Shares` | BigInt | N | Foreign Shareholding Shares |
| `Fshg_Frgn_Shldng_Pct` | Numeric(10,2) | N | Foreign Shareholding % |
| `Fshg_Rec_Date` | Date | Y | Record Date |

### Table 6: `FACT_PROM_SHLDR_DTLS` (FPRH) — 22 Columns
| Field Name | Type | Req'd | Description |
|---|---|---|---|
| `Fprh_Txn_Id` | Varchar(100) | N | Transaction ID |
| `Fprh_Exch_Token` | ByteInt | Y | Exchange Token |
| `Fprh_Cmp_Token` | BigInt | Y | Company Token |
| `Fprh_Exch_Cmp_Token` | Int | Y | Exchange Company Token |
| `Fprh_Trd_Prd_Token` | BigInt | N | Trading Product Token |
| `Fprh_Symbol` | Char(10) | N | Symbol |
| `Fprh_Series` | Char(2) | N | Series |
| `Fprh_Rec_Id` | Char(25) | N | Record ID |
| `Fprh_Nds_Id` | Char(25) | N | NDS ID |
| `Fprh_Qrtr_Num` | Char(4) | Y | Quarter Number |
| `Fprh_Shldng_Date` | Date | N | Shareholding Date |
| `Fprh_Shldr_Desc` | Varchar(50) | N | Shareholder Info |
| `Fprh_Shldng_Catg_Type` | ByteInt | Y | 1=Promoter |
| `Fprh_Shldng_Sub_Catg_Type` | ByteInt | Y | 1=Indian, 2=Foreign, 3=PAC |
| `Fprh_Shldng_Grp_Type` | ByteInt | N | Group Type Code |
| `Fprh_Shldr_Name` | Varchar(200) | N | Name of Promoter Shareholder |
| `Fprh_Tot_Shares` | BigInt | N | Number of Shares |
| `Fprh_Tot_Shares_Pct` | Numeric(10,2) | N | Shareholding % |
| `Fprh_Plge_Shares` | BigInt | N | Pledged Shares Count |
| `Fprh_Plge_Shares_Pct` | Numeric(10,2) | N | Pledged Shares % |
| `Fprh_Plge_Grd_Tot_Share_Pct` | Numeric(10,2) | N | Pledged % of Total |
| `Fprh_Rec_Date` | Date | N | Record Date |

### Table 7: `FACT_PUB_SHLDR_DTLS` (FPUH) — 19 Columns
| Field Name | Type | Req'd | Description |
|---|---|---|---|
| `Fpuh_Txn_Id` | Varchar(100) | N | Transaction ID |
| `Fpuh_Exch_Token` | ByteInt | Y | Exchange Token |
| `Fpuh_Cmp_Token` | BigInt | Y | Company Token |
| `Fpuh_Exch_Cmp_Token` | Int | Y | Exchange Company Token |
| `Fpuh_Trd_Prd_Token` | BigInt | N | Trading Product Token |
| `Fpuh_Symbol` | Char(10) | N | Symbol |
| `Fpuh_Series` | Char(2) | N | Series |
| `Fpuh_Rec_Id` | Char(25) | N | Record ID |
| `Fpuh_Nds_Id` | Char(25) | N | NDS ID |
| `Fpuh_Qrtr_Num` | Char(4) | Y | Quarter Number |
| `Fpuh_Shldng_Date` | Date | N | Shareholding Date |
| `Fpuh_Shldr_Desc` | Varchar(50) | N | Shareholder Info |
| `Fpuh_Shldng_Catg_Type` | ByteInt | Y | 2=Public |
| `Fpuh_Shldng_Sub_Catg_Type` | ByteInt | Y | 4=Institution, 5=Non-Institution |
| `Fpuh_Shldng_Grp_Type` | ByteInt | N | Group Type (Mutual Funds, FII, Retail, etc.) |
| `Fpuh_Shldr_Name` | Varchar(200) | N | Name of Public Shareholder |
| `Fpuh_Tot_Shares` | BigInt | N | Number of Shares |
| `Fpuh_Tot_Shares_Pct` | Numeric(10,2) | N | Shareholding % |
| `Fpuh_Rec_Date` | Date | N | Record Date |

### Table 8: `FACT_DVR_SHLDNG` (FDVR) — 25 Columns
(Differential Voting Rights Shareholding details per company per exchange).

### Table 9: `FACT_DR_HOLDING` (FDRH) — 19 Columns
(Depository Receipts ADR/GDR holdings per company).

### Table 10: `FACT_LKDIN_SHLDNG` (FLKD) — 17 Columns
(Locked-in shareholding records for promoters & public shareholders).

### Table 11: `FACT_CMP_EXCH_SHLDNG` (FCES) — 5 Columns
(Company Exchange Shareholding availability index).

---

## 1.5 Corporate Actions & Announcements Tables (2 Tables, 62 Columns)

### Table 12: `FACT_CORP_ACTIONS` (FCAC) — 49 Columns
| Field Name | Type | Req'd | Description |
|---|---|---|---|
| `Fcac_Exch_Token` | ByteInt | Y | Exchange Token |
| `Fcac_Cmp_Token` | BigInt | Y | Company Token |
| `Fcac_Trd_Prd_Token` | Int | Y | Trading Product Token |
| `Fcac_Symbol` | Char(10) | N | Symbol of Company |
| `Fcac_Series` | Char(10) | N | Series |
| `Fcac_Ind_Token` | Int | N | Industry Token |
| `Fcac_Cmp_Id` | Varchar(10) | N | Company ID |
| `Fcac_Cmp_Name` | Varchar(100) | N | Company Name |
| `Fcac_Ind_Id` | Varchar(10) | N | Industry / Sector Code |
| `Fcac_ISIN` | Char(12) | N | ISIN Code |
| `Fcac_Issd_Shares` | Numeric(20,2) | N | Issued Shares |
| `Fcac_Face_Val` | Numeric(20,2) | N | Face Value |
| `Fcac_Listng_Date` | Date | N | Listing Date |
| `Fcac_Iss_Start_Date` | Date | N | Issue Start Date |
| `Fcac_Iss_End_Date` | Date | N | Issue End Date |
| `Fcac_Corp_Action_Catg` | Varchar(30) | N | BN=Bonus, DP=Dividend, SS=Split, etc. |
| `Fcac_Corp_Action_Type` | ByteInt | N | 1=Bonus, 2=Consolidation, 3=Dividend, 4=Rights, 6=Stock Split |
| `Fcac_Divnd_Prpse_Indc` | Char(1) | N | Dividend Purpose Indicator |
| `Fcac_Intrm_Final_Flag` | Char(1) | N | Interim / Final Flag |
| `Fcac_Mod_Date` | Date | N | Modified Date |
| `Fcac_Divnd_Pct` | Numeric(10,2) | N | Dividend Percentage |
| `Fcac_Divnd_Val` | Numeric(20,2) | N | Dividend Value (INR) |
| `Fcac_Ex_Divnd_Date` | Date | N | Ex-Dividend Date |
| `Fcac_Bonus_Ratio` | Varchar(15) | N | Bonus Ratio (e.g. `1:1`) |
| `Fcac_Ex_Bonus_Date` | Date | N | Ex-Bonus Date |
| `Fcac_Rights_Ratio` | Varchar(15) | N | Rights Ratio |
| `Fcac_Ex_Rights_Date` | Date | N | Ex-Rights Date |
| `Fcac_Split_Ratio` | Numeric(10,2) | N | Split Ratio |
| `Fcac_Ex_Split_Date` | Date | N | Ex-Split Date |
| `Fcac_Offer_Type_Indc` | Char(2) | N | Offer Type Indicator |
| `Fcac_Issue_Val` | Numeric(20,2) | N | Issue Value |
| `Fcac_Arngmt_Schema` | Varchar(50) | N | Scheme of Arrangement (Merger/Takeover) |
| `Fcac_Ex_Arngmt_Schema_Date` | Date | N | Ex-Scheme Date |
| `Fcac_Paid_Up_Val` | Numeric(20,2) | N | Paid-Up Value |
| `Fcac_Prem_Val` | Numeric(20,2) | N | Premium Value |
| `Fcac_BC_Start_Date` | Date | N | Book Closure Start Date |
| `Fcac_BC_End_Date` | Date | N | Book Closure End Date |
| `Fcac_CA_Rec_Date` | Date | N | Corporate Action Record Date |
| `Fcac_ND_Start_Date` | Date | N | No-Delivery Start Date |
| `Fcac_ND_End_Date` | Date | N | No-Delivery End Date |
| `Fcac_Divnd_Prpse` | Varchar(50) | N | Dividend Purpose Description |
| `Fcac_Rights_Prpse` | Varchar(50) | N | Rights Purpose Description |
| `Fcac_Bonus_Prpse` | Varchar(50) | N | Bonus Purpose Description |
| `Fcac_Int_Prpse` | Varchar(50) | N | Interest Purpose |
| `Fcac_Split_Prpse` | Varchar(50) | N | Split Purpose Description |
| `Fcac_Agm_Prpse` | Varchar(50) | N | AGM Purpose Description |
| `Fcac_Egm_Prpse` | Varchar(50) | N | EGM Purpose Description |
| `Fcac_Other_Prpse` | Varchar(50) | N | Other Purpose Description |
| `Fcac_Rec_Date` | Date | Y | Record Date |

### Table 13: `FACT_CA_DIL_FCTR` (FCDF) — 13 Columns
| Field Name | Type | Req'd | Description |
|---|---|---|---|
| `Fcdf_Exch_Token` | ByteInt | Y | Exchange Token |
| `Fcdf_Cmp_Token` | BigInt | Y | Company Token |
| `Fcdf_NSE_Trd_Prd_Token` | Int | Y | NSE Trading Product Token |
| `Fcdf_BSE_Trd_Prd_Token` | Int | Y | BSE Trading Product Token |
| `Fcdf_Symbol` | Char(10) | N | Symbol |
| `Fcdf_Corp_Action_Catg` | Varchar(30) | N | Corporate Action Category |
| `Fcdf_Corp_Action_Type` | ByteInt | N | Action Type Code |
| `Fcdf_Appl_From_Date` | Date | Y | Applicable From Date |
| `Fcdf_Appl_To_Date` | Date | Y | Applicable Till Date |
| `Fcdf_Price_Adj_Factor` | Numeric(15,6) | N | Dilution / Price Adjustment Factor |
| `Fcdf_Process_Stat` | ByteInt | N | Processed Status |
| `Fcdf_Mod_Date` | Date | N | Modified Date |
| `Fcdf_Rec_Date` | Date | N | Record Date |

---

### Table 14: `FORENSIC_CASES` (CASES) — 13 Columns
| Field Name | Type | Req'd | Description |
|---|---|---|---|
| `id` | Integer | Y | Auto-increment Primary Key |
| `case_id` | Varchar(50) | Y | Unique Case Dossier ID string (e.g. `CASE-2026-ALPHATECH-001`) |
| `target_symbol` | Varchar(20) | Y | Target Security Symbol |
| `title` | Varchar(300) | Y | Investigation Dossier Subject & Title |
| `lead_officer` | Varchar(100) | Y | Assigned Lead Compliance / Surveillance Officer |
| `status` | Varchar(30) | Y | Workflow Status (`Draft`, `Open Investigation`, `Pending Action`, `Closed`) |
| `priority` | Varchar(10) | Y | Priority Triage Level (`High`, `Medium`, `Low`) |
| `description` | Text | N | Surveillance Officer Detailed Investigation Findings |
| `evidence_json` | Text | Y | JSON Array of Pinned Evidence Cards (Charts, Trade Logs, KYC Profiles) |
| `created_at` | DateTime | Y | Dossier Creation Timestamp |
| `updated_at` | DateTime | Y | Last Modified Timestamp |
| `closed_at` | DateTime | N | Investigation Completion Timestamp |
| `created_by` | Varchar(50) | N | User Identity of Dossier Creator |

---

### Table 15: `SYS_USERS` (USERS) — 9 Columns
| Field Name | Type | Req'd | Description |
|---|---|---|---|
| `id` | Integer | Y | Auto-increment Primary Key |
| `username` | Varchar(50) | Y | User Account Login Identifier |
| `email` | Varchar(100) | Y | User Email Address |
| `full_name` | Varchar(100) | Y | User Legal Full Name |
| `department` | Varchar(100) | N | Department / Unit Name |
| `hashed_password` | Varchar(128) | Y | Salted SHA-256 Hashed Password String |
| `role` | Varchar(20) | Y | RBAC Role (`Admin`, `Analyst`, `Viewer`) |
| `is_active` | Boolean | Y | Account Active Status Flag |
| `created_at` | DateTime | Y | User Registration Timestamp |

---

### Table 16: `SYS_AUDIT_LOGS` (LOGS) — 7 Columns
| Field Name | Type | Req'd | Description |
|---|---|---|---|
| `id` | Integer | Y | Auto-increment Primary Key |
| `timestamp` | DateTime | Y | Immutable Audit Log Event Timestamp |
| `username` | Varchar(50) | Y | User Account Executing Action |
| `role` | Varchar(20) | Y | User RBAC Role at Time of Event |
| `action` | Varchar(50) | Y | Security / System Action Code |
| `target` | Varchar(100) | Y | Target System Resource / Module |
| `details` | Varchar(255) | N | Event Details & Operational Metadata |

---

## 2.1 Trade Aggregate Tables (3 Key Enterprise Warehouse Aggregate Tables)

### Table 17: `AGG_SEC_DAY` (ASD) — 83 Columns
**Description:** Security level day-wise trading aggregate table. Stores official 30-minute VWAP Closing Price (`Asd_Close_Price`), OHLC price bars, 52-week High/Low, circuit limits, and daily wash trade summary totals.

| Field Name | Type | Req'd | Description |
|---|---|---|---|
| `Asd_Date` | Date | Y | Calendar Trading Date |
| `Asd_Cmp_Token` | BigInt | Y | Company / Security Token |
| `Asd_Symbol` | Varchar(10) | N | Security Symbol (e.g. `ALPHATECH`) |
| `Asd_Open_Price` | Decimal(15,6) | Y | Official Opening Price |
| `Asd_Close_Price` | Decimal(15,6) | Y | **Official 30-Min VWAP Closing Price** |
| `Asd_High_Price` | Decimal(15,6) | Y | Daily High Price |
| `Asd_Low_Price` | Decimal(15,6) | Y | Daily Low Price |
| `Asd_Prev_Close_Price` | Decimal(15,6) | Y | Previous Day Closing Price |
| `Asd_Tot_Qty` | Decimal(20,3) | Y | Total Daily Traded Volume Quantity |
| `Asd_Tot_Val` | Decimal(20,2) | Y | Total Daily Traded Turnover Value |
| `Asd_Tot_Wash_Qty` | Decimal(20,3) | N | Daily Wash Trade Total Quantity |
| `Asd_Low_Crct_Price` | Decimal(15,6) | Y | Lower Circuit Limit Ceiling |
| `Asd_Upp_Crct_Price` | Decimal(15,6) | Y | Upper Circuit Limit Ceiling |

---

### Table 18: `AGG_CLNT_SEC_DAY` (ACSD) — 31 Columns
**Description:** Client & Security level day-wise trading aggregate table. Pre-calculates daily buy/sell traded volume, turnover value, wash trades, and price contributions for individual clients per security.

| Field Name | Type | Req'd | Description |
|---|---|---|---|
| `Acsd_Date` | Date | Y | Calendar Trading Date |
| `Acsd_Cmp_Token` | BigInt | Y | Company / Security Token |
| `Acsd_Exch_Clnt_Token` | BigInt | Y | Client Exchange Token (FK → DECL) |
| `Acsd_Buy_Tot_Qty` | Decimal(20,3) | N | Daily Total Buy Quantity |
| `Acsd_Sell_Tot_Qty` | Decimal(20,3) | N | Daily Total Sell Quantity |
| `Acsd_Buy_Tot_Val` | Decimal(20,2) | N | Daily Total Buy Value |
| `Acsd_Sell_Tot_Val` | Decimal(20,2) | N | Daily Total Sell Value |
| `Acsd_Pos_Cont_Val` | Decimal(20,2) | N | Positive Price Contribution Value (Upward LTP Push) |
| `Acsd_Neg_Cont_Val` | Decimal(20,2) | N | Negative Price Contribution Value (Downward LTP Push) |
| `Acsd_Buy_Wash_Qty` | Decimal(20,3) | N | Buy-Side Wash Trade Quantity |

---

### Table 19: `AGG_PAN_PAIR_DAY` (APPD) — 60 Columns
**Description:** Buyer-Seller PAN pair concentration table. Pre-aggregates daily trade counts, matched volume, turnover value, and price push metrics between counterparty client pairs per security.

| Field Name | Type | Req'd | Description |
|---|---|---|---|
| `Appd_Date` | Date | Y | Calendar Trading Date |
| `Appd_Cmp_Token` | BigInt | Y | Company / Security Token |
| `Appd_Exch_Clnt_Token` | BigInt | Y | Buyer Client Exchange Token (FK → DECL) |
| `Appd_Cpty_Exch_Clnt_Token` | BigInt | Y | Seller Counterparty Client Token (FK → DECL) |
| `Appd_Matched_Qty` | Decimal(20,3) | N | Total Matched Quantity Between Pair |
| `Appd_Matched_Val` | Decimal(20,2) | N | Total Matched Turnover Value Between Pair |
| `Appd_Pos_Contri` | Decimal(15,6) | N | Positive Price Push Contribution for Pair |
| `Appd_Neg_Contri` | Decimal(15,6) | N | Negative Price Push Contribution for Pair |

---

## Complete Physical & System Data Warehouse Scale Summary

| # | Table Name | Short Name | Full Column Count | Domain / Category |
|---|---|---|---|---|
| 1 | `FACT_TRADES` | FTRD | **123** | Trade Execution Facts |
| 2 | `DIM_EXCH_CLNT_DTLS` | DECL | **128** | Exchange Client Master |
| 3 | `DIM_DEP_CLNT_DTLS` | DDCL | **63** | Depository Client Master |
| 4 | `FACT_MSTR_SHAREHLDG` | FMSH | **37** | Shareholding Master |
| 5 | `FACT_MAIN_SHLDNG` | FSHG | **30** | Main Shareholding Record |
| 6 | `FACT_PROM_SHLDR_DTLS` | FPRH | **22** | Promoter Shareholder Details |
| 7 | `FACT_PUB_SHLDR_DTLS` | FPUH | **19** | Public Shareholder Details |
| 8 | `FACT_DVR_SHLDNG` | FDVR | **25** | Differential Voting Rights |
| 9 | `FACT_DR_HOLDING` | FDRH | **19** | Depository Receipts |
| 10 | `FACT_LKDIN_SHLDNG` | FLKD | **17** | Locked-In Shareholding |
| 11 | `FACT_CMP_EXCH_SHLDNG` | FCES | **5** | Company Exchange Shareholding Index |
| 12 | `FACT_CORP_ACTIONS` | FCAC | **49** | Corporate Actions & Announcements |
| 13 | `FACT_CA_DIL_FCTR` | FCDF | **13** | Corporate Actions Dilution Factor |
| 14 | `FORENSIC_CASES` | CASES | **13** | Forensic Case Dossier Persistence |
| 15 | `SYS_USERS` | USERS | **9** | Security User Management & RBAC |
| 16 | `SYS_AUDIT_LOGS` | LOGS | **7** | Immutable Security Audit Trail |
| 17 | `AGG_SEC_DAY` | ASD | **83** | Security Daily Aggregate & Closing Price |
| 18 | `AGG_CLNT_SEC_DAY` | ACSD | **31** | Client Security Daily Aggregate |
| 19 | `AGG_PAN_PAIR_DAY` | APPD | **60** | Counterparty PAN Pair Daily Aggregate |
| **Total** | **19 System Tables** | | **754 Columns** | **Complete Enterprise Physical Data Warehouse & Persistence Engine** |



