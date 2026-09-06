-- ======================================================================================
-- PRICE-VOLUME ALERT SURVEILLANCE FRAMEWORK (PVASF)
-- ENTERPRISE RELATIONAL DATABASE SCHEMA DEFINITION & ARCHITECTURE GUIDE
-- ======================================================================================
-- Database Target: SQLite 3.35+ / PostgreSQL 14+ / ANSI SQL Compliant
-- Version: 2.4.0 (Production Master Schema)
-- Generated: August 2026
--
-- ARCHITECTURAL OVERVIEW:
-- The PVASF warehouse comprises 18 tables organized across 5 functional layers:
--
--  LAYER 1: MARKET EOD TRADING & PRICE AGGREGATES
--    - AGG_SEC_DAY        : Security-level daily OHLCV, Circuit Bands, Moving Averages, & Volatility.
--    - AGG_CLNT_SEC_DAY   : Client (PAN) daily trade summary, Aggressor Qty, LTP Contribution, & Net P&L.
--    - AGG_PAN_PAIR_DAY   : Bilateral counterparty matched pair trade volumes & reversal metrics (RTR).
--
--  LAYER 2: ENTITY & DEPOSITORY REGISTRY (MASTER DIMENSIONS)
--    - DIM_EXCH_CLNT_DTLS : Exchange client master registry (PAN, UCC, Trading Member, Terminals).
--    - DIM_DEP_CLNT_DTLS  : Depository client accounts (DP ID, Client ID, BO Status, Joint Holders).
--
--  LAYER 3: SHAREHOLDING PATTERNS & OWNERSHIP CONCENTRATION
--    - FACT_MAIN_SHLDNG     : Quarterly shareholding breakdown (Promoter, Public, Non-Promoter Non-Public).
--    - FACT_PROM_SHLDR_DTLS : Promoter individual/group entity holdings, pledged shares & encumbrances.
--    - FACT_PUB_SHLDR_DTLS  : Public institutional and non-institutional holdings (Top 1% concentration).
--    - FACT_MSTR_SHAREHLDG  : Master filing metadata, record counts, and submission timestamps.
--    - FACT_CMP_EXCH_SHLDNG : Company cross-exchange listing and trade period tokens.
--    - FACT_DR_HOLDING      : Depository Receipt (GDR/ADR) underlying shareholdings.
--    - FACT_DVR_SHLDNG      : Differential Voting Rights (DVR) class shares (Class X, Y, Z).
--    - FACT_LKDIN_SHLDNG    : Locked-in equity shares (Pre-IPO, ESOP, Promoter lock-in schedules).
--
--  LAYER 4: CORPORATE ACTIONS & DILUTION ADJUSTMENTS
--    - FACT_CORP_ACTIONS : Corporate action announcements (Splits, Bonus, Rights, Dividends, AGMs).
--    - FACT_CA_DIL_FCTR  : Mathematical dilution and price adjustment factor coefficients.
--
--  LAYER 5: SURVEILLANCE OPERATIONS, AUDITING & ACCESS CONTROL
--    - FORENSIC_CASES  : Active surveillance alerts, investigation workflows, priorities, & notes.
--    - SYS_AUDIT_LOGS  : Regulatory audit trail recording system actions, logouts, & mark-safe events.
--    - SYS_USERS       : User authentication, roles (Analyst, Senior Investigator, Admin), & access.
-- ======================================================================================

PRAGMA foreign_keys = ON;


-- ======================================================================================
-- LAYER 1: MARKET EOD TRADING & PRICE AGGREGATES
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 1.1: AGG_SEC_DAY (Security Daily OHLCV & Market Summary)
-- Purpose: Primary time-series table feeding Core Surveillance Metrics 1–5:
--          - Price Rise % (§2.1) via Asd_Close_Price vs T-180 baseline
--          - Price Z-Score (§2.2) via Close-to-Close returns
--          - Volume Z-Score (§2.3) via Asd_Tot_Qty vs 180D baseline mean
--          - Upper Circuit Persistence (§2.4) via Asd_High_Price & Asd_Upp_Crct_Price
--          - 180-Day New High Breakout Frequency (§2.5) via Asd_High_Price vs rolling peak
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS AGG_SEC_DAY (
	id INTEGER NOT NULL, 
	"Asd_Date" DATE NOT NULL, 
	"Asd_Trd_Prd_Token" BIGINT NOT NULL, 
	"Asd_Lot_Qty" NUMERIC(20, 3), 
	"Asd_Exch_Token" SMALLINT NOT NULL, 
	"Asd_Seg_Token" SMALLINT NOT NULL, 
	"Asd_Sub_Seg_Code" SMALLINT NOT NULL, 
	"Asd_Cmp_Token" BIGINT NOT NULL, 
	"Asd_Symbol" VARCHAR(10), 
	"Asd_Tot_Qty" NUMERIC(20, 3) NOT NULL, 
	"Asd_Tot_Val" NUMERIC(20, 2) NOT NULL, 
	"Asd_Tot_Cnt" BIGINT NOT NULL, 
	"Asd_Tot_Wash_Qty" NUMERIC(20, 3), 
	"Asd_Tot_Wash_Val" NUMERIC(20, 2), 
	"Asd_Tot_Wash_Cnt" BIGINT, 
	"Asd_Above_Ltp_Cnt" BIGINT, 
	"Asd_Below_Ltp_Cnt" BIGINT, 
	"Asd_At_Ltp_Cnt" BIGINT, 
	"Asd_Pos_Cont_Val" NUMERIC(20, 2), 
	"Asd_Neg_Cont_Val" NUMERIC(20, 2), 
	"Asd_Open_Price" NUMERIC(15, 6) NOT NULL, 
	"Asd_Close_Price" NUMERIC(15, 6) NOT NULL, 
	"Asd_High_Price" NUMERIC(15, 6) NOT NULL, 
	"Asd_Low_Price" NUMERIC(15, 6) NOT NULL, 
	"Asd_Last_Trd_Price" NUMERIC(15, 6), 
	"Asd_Net_Mkt_Val" NUMERIC(20, 3), 
	"Asd_Net_Mkt_Qty" NUMERIC(20, 2), 
	"Asd_Tick_Price" NUMERIC(15, 6), 
	"Asd_Low_Crct_Pct" NUMERIC(10, 2), 
	"Asd_Upp_Crct_Pct" NUMERIC(10, 2), 
	"Asd_Low_Crct_Price" NUMERIC(15, 6), 
	"Asd_Upp_Crct_Price" NUMERIC(15, 6), 
	"Asd_Prev_Close_Price" NUMERIC(15, 6), 
	"Asd_52_Week_High_Price" NUMERIC(15, 6), 
	"Asd_52_Week_Low_Price" NUMERIC(15, 6), 
	"Asd_Prev_OI" NUMERIC(20, 3), 
	"Asd_OI" NUMERIC(20, 3), 
	"Asd_Chng_OI" NUMERIC(20, 3), 
	"Asd_Life_High_Price" NUMERIC(15, 6), 
	"Asd_Life_Low_Price" NUMERIC(15, 6), 
	"Asd_Sett_Price" NUMERIC(15, 6), 
	"Asd_52_Week_High_Date" DATE, 
	"Asd_52_Week_Low_Date" DATE, 
	"Asd_Life_High_Date" DATE, 
	"Asd_Life_Low_Date" DATE, 
	"Asd_Face_Val" NUMERIC(20, 2), 
	"Asd_Issd_Cap_Shares" NUMERIC(20, 2), 
	"Asd_Net_Mkt_Cap" NUMERIC(20, 2), 
	"Asd_Weightage_Pct" NUMERIC(10, 5), 
	"Asd_Beta_Pct" NUMERIC(10, 5), 
	"Asd_R_Sq_Pct" NUMERIC(10, 5), 
	"Asd_Impact_Price" NUMERIC(15, 6), 
	"Asd_Dma_Cnt" BIGINT, 
	"Asd_Dma_Qty" NUMERIC(20, 3), 
	"Asd_Dma_Val" NUMERIC(20, 2), 
	"Asd_Algo_Cnt" BIGINT, 
	"Asd_Algo_Qty" NUMERIC(20, 3), 
	"Asd_Algo_Val" NUMERIC(20, 2), 
	PRIMARY KEY (id)
);

-- --------------------------------------------------------------------------------------
-- Table 1.2: AGG_CLNT_SEC_DAY (Client Daily Trading & LTP Contribution Summary)
-- Purpose: Quantifies participant conduct per PVASF §4:
--          - Positive & Negative LTP Contribution (§4.1) via Acsd_Pos_Cont_Val & Acsd_Neg_Cont_Val
--          - Concentrated Volume Dominance (§4.2) via Acsd_Buy_Tot_Qty + Acsd_Sell_Tot_Qty
--          - Mark-to-Market Net Trading P&L (§4.4) via Acsd_Sell_Tot_Val - Acsd_Buy_Tot_Val
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS AGG_CLNT_SEC_DAY (
	id INTEGER NOT NULL, 
	"Acsd_Date" DATE NOT NULL, 
	"Acsd_Trd_Prd_Token" BIGINT NOT NULL, 
	"Acsd_Exch_Clnt_Token" BIGINT NOT NULL, 
	"Acsd_Clnt_Token" BIGINT NOT NULL, 
	"Acsd_Exch_Token" SMALLINT NOT NULL, 
	"Acsd_Seg_Token" SMALLINT NOT NULL, 
	"Acsd_Sub_Seg_Code" SMALLINT NOT NULL, 
	"Acsd_Cmp_Token" BIGINT NOT NULL, 
	"Acsd_Buy_Tot_Qty" NUMERIC(20, 3), 
	"Acsd_Sell_Tot_Qty" NUMERIC(20, 3), 
	"Acsd_Buy_Tot_Val" NUMERIC(20, 2), 
	"Acsd_Sell_Tot_Val" NUMERIC(20, 2), 
	"Acsd_Buy_Tot_Cnt" BIGINT, 
	"Acsd_Sell_Tot_Cnt" BIGINT, 
	"Acsd_Buy_Wash_Qty" NUMERIC(20, 3), 
	"Acsd_Buy_Wash_Val" NUMERIC(20, 2), 
	"Acsd_Buy_Wash_Cnt" BIGINT, 
	"Acsd_Sell_Wash_Qty" NUMERIC(20, 3), 
	"Acsd_Sell_Wash_Val" NUMERIC(20, 2), 
	"Acsd_Sell_Wash_Cnt" BIGINT, 
	"Acsd_Buy_Aggr_Qty" NUMERIC(20, 3), 
	"Acsd_Sell_Aggr_Qty" NUMERIC(20, 3), 
	"Acsd_Above_Ltp_Cnt" BIGINT, 
	"Acsd_Below_Ltp_Cnt" BIGINT, 
	"Acsd_At_Ltp_Cnt" BIGINT, 
	"Acsd_Pos_Cont_Val" NUMERIC(20, 2), 
	"Acsd_Neg_Cont_Val" NUMERIC(20, 2), 
	"Acsd_Buy_Turnover_Val" NUMERIC(20, 2), 
	"Acsd_Sell_Turnover_Val" NUMERIC(20, 2), 
	PRIMARY KEY (id)
);

-- --------------------------------------------------------------------------------------
-- Table 1.3: AGG_PAN_PAIR_DAY (Bilateral Matched Pair Daily Trading Aggregates)
-- Purpose: Evaluates Counterparty Concentration (§4.3) and detects circular trading rings:
--          - Appd_Buy_Tot_Qty vs Appd_Sell_Tot_Qty between Buyer (PAN1) and Seller (PAN2)
--          - Reversal Trade Ratio: RTR = 2 * min(A->B, B->A) / Gross Volume
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS AGG_PAN_PAIR_DAY (
	id INTEGER NOT NULL, 
	"Appd_Date" DATE NOT NULL, 
	"Appd_Exch_Token" SMALLINT NOT NULL, 
	"Appd_Seg_Token" SMALLINT NOT NULL, 
	"Appd_Sub_Seg_Code" SMALLINT NOT NULL, 
	"Appd_Cmp_Token" BIGINT NOT NULL, 
	"Appd_Trd_Prd_Token" BIGINT NOT NULL, 
	"Appd_Sess_type" SMALLINT NOT NULL, 
	"Appd_Lot_Qty" NUMERIC(20, 3), 
	"Appd_Exch_TM_Token" BIGINT NOT NULL, 
	"Appd_TM_Token" BIGINT NOT NULL, 
	"Appd_Exch_Clnt_Token" BIGINT NOT NULL, 
	"Appd_Clnt_Token" BIGINT NOT NULL, 
	"Appd_Clnt_Catg_Type" SMALLINT, 
	"Appd_Trdr_Token" INTEGER, 
	"Appd_CP_Token" BIGINT, 
	"Appd_CTCL_Ref" VARCHAR(20), 
	"Appd_CTCL_Zone" SMALLINT, 
	"Appd_CTCL_Pin" INTEGER, 
	"Appd_CTCL_State" SMALLINT, 
	"Appd_Inet_DMA_Flag" SMALLINT, 
	"Appd_Algo_Flag" SMALLINT, 
	"Appd_Cpty_TM_Token" BIGINT NOT NULL, 
	"Appd_Cpty_Exch_TM_Token" BIGINT NOT NULL, 
	"Appd_Cpty_Clnt_Token" BIGINT NOT NULL, 
	"Appd_Cpty_Exch_Clnt_Token" BIGINT NOT NULL, 
	"Appd_Cpty_Clnt_Catg_Type" SMALLINT, 
	"Appd_Cpty_Trdr_Token" INTEGER, 
	"Appd_Cpty_CP_Token" BIGINT, 
	"Appd_CPty_CTCL_Ref" VARCHAR(20), 
	"Appd_Cpty_CTCL_Zone" SMALLINT, 
	"Appd_Cpty_CTCL_Pin" INTEGER, 
	"Appd_Cpty_CTCL_State" SMALLINT, 
	"Appd_Cpty_Inet_DMA_Flag" SMALLINT, 
	"Appd_Cpty_Algo_Flag" SMALLINT, 
	"Appd_Buy_Tot_Qty" NUMERIC(20, 3), 
	"Appd_Sell_Tot_Qty" NUMERIC(20, 3), 
	"Appd_Buy_Tot_Val" NUMERIC(20, 2), 
	"Appd_Sell_Tot_Val" NUMERIC(20, 2), 
	"Appd_Buy_Tot_Cnt" BIGINT, 
	"Appd_Sell_Tot_Cnt" BIGINT, 
	"Appd_Pos_Contri" NUMERIC(15, 6), 
	"Appd_Neg_Contri" NUMERIC(15, 6), 
	"Appd_Pos_Contri_Instc_Cnt" BIGINT, 
	"Appd_Neg_Contri_Instc_Cnt" BIGINT, 
	"Appd_Pos_Contri_Qty" NUMERIC(20, 3), 
	"Appd_Neg_Contri_Qty" NUMERIC(20, 3), 
	"Appd_Pos_Contri_Val" NUMERIC(20, 2), 
	"Appd_Neg_Contri_Val" NUMERIC(20, 2), 
	"Appd_Sell_Pos_Contri" NUMERIC(15, 6), 
	"Appd_Buy_Neg_Contri" NUMERIC(15, 6), 
	"Appd_Sell_Pos_Contri_Cnt" BIGINT, 
	"Appd_Buy_Neg_Contri_Cnt" BIGINT, 
	"Appd_Sell_Pos_Contri_Qty" NUMERIC(20, 3), 
	"Appd_Buy_Neg_Contri_Qty" NUMERIC(20, 3), 
	"Appd_Sell_Pos_Contri_Val" NUMERIC(20, 2), 
	"Appd_Buy_Neg_Contri_Val" NUMERIC(20, 2), 
	"Appd_High_Hit_Cnt" BIGINT, 
	"Appd_Low_Hit_Cnt" BIGINT, 
	"Appd_High_Contri" NUMERIC(15, 6), 
	"Appd_Low_Contri" NUMERIC(15, 6), 
	PRIMARY KEY (id)
);


-- ======================================================================================
-- LAYER 2: ENTITY & DEPOSITORY REGISTRY (MASTER DIMENSIONS)
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 2.1: DIM_EXCH_CLNT_DTLS (Exchange Client Master Dimension)
-- Purpose: Authoritative KYC and client identity mapping:
--          - Decl_Clnt_Pan  : Income Tax Permanent Account Number (PAN)
--          - Decl_Clnt_Name : Declared Legal Entity / Individual Name
--          - Decl_TM_Id     : Registered Trading Member (Broker) ID
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS DIM_EXCH_CLNT_DTLS (
	"Decl_Exch_Clnt_Token" BIGINT NOT NULL, 
	"Decl_Clnt_Token" BIGINT NOT NULL, 
	"Decl_Exch_Token" SMALLINT NOT NULL, 
	"Decl_Seg_Token" SMALLINT NOT NULL, 
	"Decl_Exch_TM_Token" BIGINT NOT NULL, 
	"Decl_Exch_Id" VARCHAR(10) NOT NULL, 
	"Decl_Seg_Id" VARCHAR(15) NOT NULL, 
	"Decl_TM_Id" VARCHAR(15) NOT NULL, 
	"Decl_Clnt_Id" VARCHAR(16) NOT NULL, 
	"Decl_Client_Code" VARCHAR(40) NOT NULL, 
	"Decl_Clnt_Pan" VARCHAR(25), 
	"Decl_Clnt_Uid" VARCHAR(16), 
	"Decl_Clnt_UCC" VARCHAR(10), 
	"Decl_Clnt_Mapin" VARCHAR(10), 
	"Decl_Clnt_Catg_Type" SMALLINT, 
	"Decl_Clnt_Catg_Type_Desc" VARCHAR(10), 
	"Decl_Clnt_Name" VARCHAR(250), 
	"Decl_Frst_Name" VARCHAR(100), 
	"Decl_Mid_Name" VARCHAR(50), 
	"Decl_Last_Name" VARCHAR(50), 
	"Decl_Ftr_Hus_Name" VARCHAR(100), 
	"Decl_Clnt_Stat" SMALLINT, 
	"Decl_Clnt_Stat_Indc" VARCHAR(5), 
	"Decl_Dep_Id" VARCHAR(10), 
	"Decl_Dep_Name" VARCHAR(100), 
	"Decl_Dp_Id" VARCHAR(16), 
	"Decl_BO_Id" VARCHAR(16), 
	"Decl_Micr_Code" VARCHAR(25), 
	"Decl_Dp_Name" VARCHAR(100), 
	"Decl_Bank_Name" VARCHAR(100), 
	"Decl_Bank_Addr" VARCHAR(300), 
	"Decl_Bank_Acct_Num" VARCHAR(25), 
	"Decl_Bank_Acct_Type" SMALLINT, 
	"Decl_Birth_Date" DATE, 
	"Decl_Frst_Addr_Line" VARCHAR(300), 
	"Decl_Scnd_Addr_Line" VARCHAR(100), 
	"Decl_Thrd_Addr_Line" VARCHAR(100), 
	"Decl_City" VARCHAR(60), 
	"Decl_State" VARCHAR(60), 
	"Decl_Cntry" VARCHAR(30), 
	"Decl_Pin" VARCHAR(60), 
	"Decl_Frst_Tele_Num" VARCHAR(80), 
	"Decl_Frst_Fax_Num" VARCHAR(80), 
	"Decl_Frst_Mob_Num" VARCHAR(60), 
	"Decl_Frst_Email_Id" VARCHAR(50), 
	"Decl_Isd_Code" VARCHAR(5), 
	"Decl_Std_Code" VARCHAR(10), 
	"Decl_Clnt_Cnt_Num" INTEGER, 
	"Decl_Agmt_Date" DATE, 
	"Decl_Intro_Name" VARCHAR(100), 
	"Decl_Intro_Mid_Name" VARCHAR(100), 
	"Decl_Intro_Last_Name" VARCHAR(100), 
	"Decl_Intro_Reltn" VARCHAR(30), 
	"Decl_Intro_Clnt_Id" VARCHAR(16), 
	"Decl_Othr_TM_Flag" SMALLINT, 
	"Decl_UCC_Info_Date" DATE, 
	"Decl_Qua_Desc" VARCHAR(100), 
	"Decl_Occu_Desc" SMALLINT, 
	"Decl_Non_Indv_Clnt_Name" VARCHAR(250), 
	"Decl_PAN_Decl_Obtd_Flag" SMALLINT, 
	"Decl_PAN_Recv_Date" DATE, 
	"Decl_Sub_Broker_Id" VARCHAR(16), 
	"Decl_Sub_Broker_Name" VARCHAR(100), 
	"Decl_SubBroker_Reg_Num" VARCHAR(50), 
	"Decl_Fam_Mbr_Acct_Type_Desc" VARCHAR(30), 
	"Decl_Fam_Mbr_Frst_Sett_Mode" VARCHAR(20), 
	"Decl_Fam_Mbr_Scnd_Sett_Mode" VARCHAR(20), 
	"Decl_Fam_Mbr_Thrd_Sett_Mode" VARCHAR(20), 
	"Decl_Fam_Mbr_Frth_Sett_Mode" VARCHAR(20), 
	"Decl_Fam_Frst_Mbr_Name" VARCHAR(100), 
	"Decl_Fam_Scnd_Mbr_Name" VARCHAR(100), 
	"Decl_Fam_Thrd_Mbr_Name" VARCHAR(100), 
	"Decl_Fam_Frth_Mbr_Name" VARCHAR(100), 
	"Decl_Othr_Frst_Mbr_Id" VARCHAR(15), 
	"Decl_Othr_Scnd_Mbr_Id" VARCHAR(15), 
	"Decl_Othr_Thrd_Mbr_Id" VARCHAR(15), 
	"Decl_Othr_Frth_Mbr_Id" VARCHAR(15), 
	"Decl_Bank_Cert_Obtd_Flag" SMALLINT, 
	"Decl_Inprsn_Vrfy_Flag" SMALLINT, 
	"Decl_Ward_Circle_Num" VARCHAR(25), 
	"Decl_Psprt_Num" VARCHAR(25), 
	"Decl_Psprt_Issue_Place" VARCHAR(50), 
	"Decl_Psprt_Issue_Date" DATE, 
	"Decl_Psprt_Expiry_Date" DATE, 
	"Decl_Drvng_Lic_Num" VARCHAR(25), 
	"Decl_Drvng_Lic_Issue_Place" VARCHAR(50), 
	"Decl_Drvng_Lic_Issue_Date" DATE, 
	"Decl_Drvng_Lic_Expiry_Date" DATE, 
	"Decl_Voter_Id_Num" VARCHAR(25), 
	"Decl_Voter_Id_Issue_Place" VARCHAR(50), 
	"Decl_Voter_Id_Issue_Date" DATE, 
	"Decl_Ratn_Card_Num" VARCHAR(25), 
	"Decl_Ratn_Card_Issue_Place" VARCHAR(50), 
	"Decl_Ratn_Card_Issue_Date" DATE, 
	"Decl_Mapin_Issue_Place" VARCHAR(50), 
	"Decl_Mapin_Issue_Date" DATE, 
	"Decl_Reg_Auth_Num" VARCHAR(25), 
	"Decl_Reg_Auth_Issue_Place" VARCHAR(50), 
	"Decl_Reg_Auth_Issue_Date" DATE, 
	"Decl_Reg_Auth_Desc" VARCHAR(60), 
	"Decl_Frst_Cntct_Person_Name" VARCHAR(100), 
	"Decl_Frst_Cntct_Person_PAN" VARCHAR(25), 
	"Decl_Frst_Cntct_Desig_Desc" VARCHAR(50), 
	"Decl_Frst_Cntct_Addr" VARCHAR(300), 
	"Decl_Frst_Cntct_Tele_Num" VARCHAR(80), 
	"Decl_Frst_Cntct_Email_Id" VARCHAR(50), 
	"Decl_Scnd_Cntct_Person_Name" VARCHAR(100), 
	"Decl_Scnd_Cntct_Person_PAN" VARCHAR(25), 
	"Decl_Scnd_Cntct_Desig_Desc" VARCHAR(50), 
	"Decl_Scnd_Cntct_Addr" VARCHAR(300), 
	"Decl_Scnd_Cntct_Tele_Num" VARCHAR(80), 
	"Decl_Scnd_Cntct_Email_Id" VARCHAR(50), 
	"Decl_Thrd_Cntct_Person_Name" VARCHAR(100), 
	"Decl_Thrd_Cntct_Person_PAN" VARCHAR(25), 
	"Decl_Thrd_Cntct_Desig_Desc" VARCHAR(50), 
	"Decl_Thrd_Cntct_Addr" VARCHAR(300), 
	"Decl_Thrd_Cntct_Tele_Num" VARCHAR(80), 
	"Decl_Thrd_Cntct_Email_Id" VARCHAR(50), 
	"Decl_Rec_Date" DATE NOT NULL, 
	"Decl_Clnt_Acct_Type" SMALLINT, 
	"Decl_Clnt_Acct_Type_Desc" VARCHAR(10), 
	"Decl_Dmat_Acct_Num" VARCHAR(25), 
	"Decl_Cdsl_Dep_Id" VARCHAR(10), 
	"Decl_Cdsl_Dep_Name" VARCHAR(100), 
	"Decl_Cdsl_Dp_Id" VARCHAR(100), 
	"Decl_Cdsl_Bo_Id" VARCHAR(100), 
	"Decl_Cdsl_Dp_Name" VARCHAR(100), 
	"Decl_Reltn_Code" VARCHAR(15), 
	PRIMARY KEY ("Decl_Exch_Clnt_Token")
);

-- --------------------------------------------------------------------------------------
-- Table 2.2: DIM_DEP_CLNT_DTLS (Depository Client Master Dimension)
-- Purpose: Beneficiary ownership and demat account structures across NSDL & CDSL
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS DIM_DEP_CLNT_DTLS (
	"Ddcl_Dep_Clnt_Token" BIGINT NOT NULL, 
	"Ddcl_Clnt_Token" BIGINT NOT NULL, 
	"Ddcl_Dep_Token" SMALLINT NOT NULL, 
	"Ddcl_BP_Token" BIGINT NOT NULL, 
	"Ddcl_BP_Id" VARCHAR(16) NOT NULL, 
	"Ddcl_Clnt_Id" VARCHAR(16) NOT NULL, 
	"Ddcl_Clnt_Pan" VARCHAR(30), 
	"Ddcl_Clnt_Code" VARCHAR(40), 
	"Ddcl_Clnt_Uniq_Id" VARCHAR(16), 
	"Ddcl_Clnt_Mapin" VARCHAR(10), 
	"Ddcl_Clnt_Catg_Type_Desc" VARCHAR(10), 
	"Ddcl_Clnt_SubCatg_Type_Desc" VARCHAR(10), 
	"Ddcl_Clnt_Acct_Type_Desc" VARCHAR(30), 
	"Ddcl_Clnt_Catg_Type" SMALLINT, 
	"Ddcl_Clnt_SubCatg_Type" INTEGER, 
	"Ddcl_Clnt_Acct_Type" SMALLINT, 
	"Ddcl_Clnt_Name" VARCHAR(250), 
	"Ddcl_Clnt_Shrt_Name" VARCHAR(20), 
	"Ddcl_Ftr_Hus_Name" VARCHAR(100), 
	"Ddcl_Clnt_Stat_Desc" VARCHAR(10), 
	"Ddcl_Clnt_Stat" SMALLINT, 
	"Ddcl_Acct_Openng_Date" DATE, 
	"Ddcl_Acct_Closr_Date" DATE, 
	"Ddcl_Susp_Rson_Type_Desc" VARCHAR(10), 
	"Ddcl_Micr_Code" VARCHAR(25), 
	"Ddcl_Bank_Name" VARCHAR(100), 
	"Ddcl_Bank_Acct_Num" VARCHAR(25), 
	"Ddcl_Bank_Acct_Type_Desc" VARCHAR(30), 
	"Ddcl_Bank_Acct_Type" SMALLINT, 
	"Ddcl_Birth_Date" DATE, 
	"Ddcl_Minor_Birth_Date" DATE, 
	"Ddcl_Sex" VARCHAR(1), 
	"Ddcl_Ntnlty_Desc" VARCHAR(10), 
	"Ddcl_Frst_Addr_Line" VARCHAR(100), 
	"Ddcl_Scnd_Addr_Line" VARCHAR(100), 
	"Ddcl_Thrd_Addr_Line" VARCHAR(100), 
	"Ddcl_Frth_Addr_Line" VARCHAR(100), 
	"Ddcl_City" VARCHAR(60), 
	"Ddcl_State" VARCHAR(60), 
	"Ddcl_Cntry" VARCHAR(30), 
	"Ddcl_Pin" VARCHAR(60), 
	"Ddcl_Frst_Tele_Num" VARCHAR(80), 
	"Ddcl_Frst_Fax_Num" VARCHAR(80), 
	"Ddcl_Frst_Email_Id" VARCHAR(50), 
	"Ddcl_Scnd_Hldr_Clnt_Token" BIGINT, 
	"Ddcl_Scnd_Hldr_Name" VARCHAR(100), 
	"Ddcl_Scnd_Hldr_Pan" VARCHAR(30), 
	"Ddcl_Scnd_Hldr_Ftr_Hus_Name" VARCHAR(100), 
	"Ddcl_Thrd_Hldr_Clnt_Token" BIGINT, 
	"Ddcl_Thrd_Hldr_Name" VARCHAR(100), 
	"Ddcl_Thrd_Hldr_Pan" VARCHAR(30), 
	"Ddcl_Thrd_Hldr_Ftr_Hus_Name" VARCHAR(100), 
	"Ddcl_Poa_Enbld_Indc" VARCHAR(2), 
	"Ddcl_Occu_Desc" VARCHAR(100), 
	"Ddcl_Regulatory_Reg_Num" VARCHAR(50), 
	"Ddcl_RBI_Reg_Num" VARCHAR(50), 
	"Ddcl_RBI_Aprvl_Date" DATE, 
	"Ddcl_Frst_RBI_Ref_Num" VARCHAR(50), 
	"Ddcl_BO_Exch_Id" VARCHAR(10), 
	"Ddcl_BO_Clg_Corp_ID" VARCHAR(15), 
	"Ddcl_BO_CM_Id" VARCHAR(15), 
	"Ddcl_Exch_Clnt_Id" VARCHAR(15), 
	"Ddcl_Rec_Date" DATE NOT NULL, 
	PRIMARY KEY ("Ddcl_Dep_Clnt_Token")
);


-- ======================================================================================
-- LAYER 3: SHAREHOLDING PATTERNS & OWNERSHIP CONCENTRATION
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 3.1: FACT_MAIN_SHLDNG (Quarterly Ownership Pattern Summary)
-- Purpose: Primary ownership breakdown per PVASF §5.3.3:
--          - Promoter & Promoter Group Holding %
--          - Public Shareholding %
--          - Non-Promoter Non-Public Holding %
--          - Pledged / Encumbered Shares %
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS FACT_MAIN_SHLDNG (
	id INTEGER NOT NULL, 
	"Fshg_Txn_Id" VARCHAR(100), 
	"Fshg_Exch_Token" SMALLINT NOT NULL, 
	"Fshg_Cmp_Token" BIGINT NOT NULL, 
	"Fshg_Exch_Cmp_Token" INTEGER, 
	"Fshg_Trd_Prd_Token" BIGINT NOT NULL, 
	"Fshg_Symbol" VARCHAR(10), 
	"Fshg_Series" VARCHAR(2), 
	"Fshg_Rec_Id" VARCHAR(25), 
	"Fshg_Nds_Id" VARCHAR(25), 
	"Fshg_Qrtr_Num" VARCHAR(4) NOT NULL, 
	"Fshg_Shldng_Date" DATE, 
	"Fshg_Lvl_Name" VARCHAR(100), 
	"Fshg_Lvl_Id" VARCHAR(25), 
	"Fshg_Shldr_Desc" VARCHAR(50), 
	"Fshg_Shldng_Catg_Type" SMALLINT NOT NULL, 
	"Fshg_Shldng_Sub_Catg_Type" SMALLINT NOT NULL, 
	"Fshg_Shldng_Grp_Type" SMALLINT, 
	"Fshg_Shldng_Sub_Grp_Desc" VARCHAR(200), 
	"Fshg_Shldr_Cnt" INTEGER, 
	"Fshg_Tot_Eq_Shares" BIGINT, 
	"Fshg_Issd_Cap_Shares" BIGINT, 
	"Fshg_Dmat_Shares" BIGINT, 
	"Fshg_Dmat_Shares_Pct" NUMERIC(10, 2), 
	"Fshg_Tot_Shares_Pct" NUMERIC(10, 2), 
	"Fshg_Grd_Tot_Shares_Pct" NUMERIC(10, 2) NOT NULL, 
	"Fshg_Plge_Shares" BIGINT, 
	"Fshg_Plge_Tot_Shares_Pct" NUMERIC(10, 2), 
	"Fshg_Frgn_Shldng_Shares" BIGINT, 
	"Fshg_Frgn_Shldng_Pct" NUMERIC(10, 2), 
	"Fshg_Rec_Date" DATE NOT NULL, 
	PRIMARY KEY (id)
);

-- --------------------------------------------------------------------------------------
-- Table 3.2: FACT_PROM_SHLDR_DTLS (Promoter & Promoter Group Entity Holdings)
-- Purpose: Granular breakdown of promoter insiders, PACs, and pledged share ratios
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS FACT_PROM_SHLDR_DTLS (
	id INTEGER NOT NULL, 
	"Fprh_Txn_Id" VARCHAR(100), 
	"Fprh_Exch_Token" SMALLINT NOT NULL, 
	"Fprh_Cmp_Token" BIGINT NOT NULL, 
	"Fprh_Exch_Cmp_Token" INTEGER NOT NULL, 
	"Fprh_Trd_Prd_Token" BIGINT, 
	"Fprh_Symbol" VARCHAR(10), 
	"Fprh_Series" VARCHAR(2), 
	"Fprh_Rec_Id" VARCHAR(25), 
	"Fprh_Nds_Id" VARCHAR(25), 
	"Fprh_Qrtr_Num" VARCHAR(4) NOT NULL, 
	"Fprh_Shldng_Date" DATE, 
	"Fprh_Shldr_Desc" VARCHAR(50), 
	"Fprh_Shldng_Catg_Type" SMALLINT NOT NULL, 
	"Fprh_Shldng_Sub_Catg_Type" SMALLINT NOT NULL, 
	"Fprh_Shldng_Grp_Type" SMALLINT, 
	"Fprh_Shldr_Name" VARCHAR(200), 
	"Fprh_Tot_Shares" BIGINT, 
	"Fprh_Tot_Shares_Pct" NUMERIC(10, 2), 
	"Fprh_Plge_Shares" BIGINT, 
	"Fprh_Plge_Shares_Pct" NUMERIC(10, 2), 
	"Fprh_Plge_Grd_Tot_Share_Pct" NUMERIC(10, 2), 
	"Fprh_Rec_Date" DATE, 
	PRIMARY KEY (id)
);

-- --------------------------------------------------------------------------------------
-- Table 3.3: FACT_PUB_SHLDR_DTLS (Public & Institutional Shareholding Details)
-- Purpose: Quantifies floating supply cornering and top 1% public concentration
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS FACT_PUB_SHLDR_DTLS (
	id INTEGER NOT NULL, 
	"Fpuh_Txn_Id" VARCHAR(100), 
	"Fpuh_Exch_Token" SMALLINT NOT NULL, 
	"Fpuh_Cmp_Token" BIGINT NOT NULL, 
	"Fpuh_Exch_Cmp_Token" INTEGER NOT NULL, 
	"Fpuh_Trd_Prd_Token" BIGINT, 
	"Fpuh_Symbol" VARCHAR(10), 
	"Fpuh_Series" VARCHAR(2), 
	"Fpuh_Rec_Id" VARCHAR(25), 
	"Fpuh_Nds_Id" VARCHAR(25), 
	"Fpuh_Qrtr_Num" VARCHAR(4) NOT NULL, 
	"Fpuh_Shldng_Date" DATE, 
	"Fpuh_Shldr_Desc" VARCHAR(50), 
	"Fpuh_Shldng_Catg_Type" SMALLINT NOT NULL, 
	"Fpuh_Shldng_Sub_Catg_Type" SMALLINT NOT NULL, 
	"Fpuh_Shldng_Grp_Type" SMALLINT, 
	"Fpuh_Shldr_Name" VARCHAR(200), 
	"Fpuh_Tot_Shares" BIGINT, 
	"Fpuh_Tot_Shares_Pct" NUMERIC(10, 2), 
	"Fpuh_Rec_Date" DATE, 
	PRIMARY KEY (id)
);

-- --------------------------------------------------------------------------------------
-- Table 3.4: FACT_MSTR_SHAREHLDG (Master Shareholding Patterns Filing Log)
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS FACT_MSTR_SHAREHLDG (
	id INTEGER NOT NULL, 
	"Fmsh_Exch_Token" SMALLINT NOT NULL, 
	"Fmsh_Cmp_Token" BIGINT NOT NULL, 
	"Fmsh_Cmp_Name" VARCHAR(100), 
	"Fmsh_Exch_Cmp_Token" INTEGER, 
	"Fmsh_Ind_Token" SMALLINT, 
	"Fmsh_Trd_Prd_Token" BIGINT NOT NULL, 
	"Fmsh_Symbol" VARCHAR(10), 
	"Fmsh_Series" VARCHAR(2), 
	"Fmsh_Sec_Name" VARCHAR(100), 
	"Fmsh_Rec_Id" VARCHAR(25), 
	"Fmsh_Nds_Id" VARCHAR(25), 
	"Fmsh_Qrtr_Id" INTEGER, 
	"Fmsh_Qrtr_Num" VARCHAR(4), 
	"Fmsh_Letter_Date" DATE, 
	"Fmsh_Stamp_Date" DATE, 
	"Fmsh_As_on_Date" DATE, 
	"Fmsh_Notes" VARCHAR(100), 
	"Fmsh_Status" VARCHAR(20), 
	"Fmsh_Export_Date" DATE, 
	"Fmsh_Mn_Shldng_Rec_Cnt" INTEGER, 
	"Fmsh_VR_Shldng_Rec_Cnt" INTEGER, 
	"Fmsh_Promtr_Shldng_Rec_Cnt" INTEGER, 
	"Fmsh_Public_Shldng_Rec_Cnt" INTEGER, 
	"Fmsh_Lckd_In_Shldng_Rec_Cnt" INTEGER, 
	"Fmsh_DR_Dtls_Shldng_Rec_Cnt" INTEGER, 
	"Fmsh_DR_Hldrs_Rec_Cnt" INTEGER, 
	"Fmsh_Cnv_Sec_Rec_Cnt" INTEGER, 
	"Fmsh_Mn_ANO_Ind_Rec_Cnt" INTEGER, 
	"Fmsh_Mn_ANO_Frgn_Rec_Cnt" INTEGER, 
	"Fmsh_Mn_ANO_Inst_Rec_Cnt" INTEGER, 
	"Fmsh_Mn_ANO_NonInst_Rec_Cnt" INTEGER, 
	"Fmsh_VR_ANO_Ind_Rec_Cnt" INTEGER, 
	"Fmsh_VR_ANO_Frgn_Rec_Cnt" INTEGER, 
	"Fmsh_VR_ANO_Inst_Rec_Cnt" INTEGER, 
	"Fmsh_VR_ANO_NonInst_Rec_Cnt" INTEGER, 
	"Fmsh_Shldng_Rmrks" VARCHAR(50), 
	"Fmsh_Rec_Date" DATE NOT NULL, 
	PRIMARY KEY (id)
);

-- --------------------------------------------------------------------------------------
-- Table 3.5: FACT_CMP_EXCH_SHLDNG (Company Cross-Exchange Listing & Trade Period Token Master)
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS FACT_CMP_EXCH_SHLDNG (
	id INTEGER NOT NULL, 
	"Fces_Shldng_Date" DATE NOT NULL, 
	"Fces_Cmp_Token" BIGINT NOT NULL, 
	"Fces_Trd_Prd_Token" BIGINT NOT NULL, 
	"Fces_Exch_Token" SMALLINT NOT NULL, 
	"Fces_Rec_Date" DATE NOT NULL, 
	PRIMARY KEY (id)
);

-- --------------------------------------------------------------------------------------
-- Table 3.6: FACT_LKDIN_SHLDNG (Locked-in Equity Shareholding Schedules)
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS FACT_LKDIN_SHLDNG (
	id INTEGER NOT NULL, 
	"Flkd_Txn_Id" VARCHAR(100), 
	"Flkd_Exch_Token" SMALLINT NOT NULL, 
	"Flkd_Cmp_Token" BIGINT NOT NULL, 
	"Flkd_Exch_Cmp_Token" INTEGER NOT NULL, 
	"Flkd_Trd_Prd_Token" BIGINT, 
	"Flkd_Symbol" VARCHAR(10), 
	"Flkd_Series" VARCHAR(2), 
	"Flkd_Rec_Id" VARCHAR(25), 
	"Flkd_Nds_Id" VARCHAR(25), 
	"Flkd_Qrtr_Num" VARCHAR(4) NOT NULL, 
	"Flkd_Shldng_Date" DATE, 
	"Flkd_Lkdin_Shldr_Catg" VARCHAR(30), 
	"Flkd_Lkdin_Shldng_Catg_Type" SMALLINT, 
	"Flkd_Shdlr_Name" VARCHAR(200), 
	"Flkd_Tot_Shares" BIGINT, 
	"Flkd_Tot_Shares_Pct" NUMERIC(10, 2), 
	"Flkd_Rec_Date" DATE NOT NULL, 
	PRIMARY KEY (id)
);

-- --------------------------------------------------------------------------------------
-- Table 3.7: FACT_DVR_SHLDNG (Differential Voting Rights DVR Equity Shares)
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS FACT_DVR_SHLDNG (
	id INTEGER NOT NULL, 
	"Fdvr_Txn_Id" VARCHAR(100), 
	"Fdvr_Exch_Token" SMALLINT NOT NULL, 
	"Fdvr_Cmp_Token" BIGINT NOT NULL, 
	"Fdvr_Exch_Cmp_Token" INTEGER NOT NULL, 
	"Fdvr_Trd_Prd_Token" BIGINT NOT NULL, 
	"Fdvr_Symbol" VARCHAR(10), 
	"Fdvr_Series" VARCHAR(2), 
	"Fdvr_Rec_Id" VARCHAR(25), 
	"Fdvr_Nds_Id" VARCHAR(25), 
	"Fdvr_Qrtr_Num" VARCHAR(4) NOT NULL, 
	"Fdvr_Shldng_Date" DATE NOT NULL, 
	"Fdvr_Lvl_Name" VARCHAR(100), 
	"Fdvr_Lvl_Id" VARCHAR(25), 
	"Fdvr_Shldr_Desc" VARCHAR(50), 
	"Fdvr_Shldng_Catg_Type" SMALLINT NOT NULL, 
	"Fdvr_Shldng_Sub_Catg_Type" SMALLINT NOT NULL, 
	"Fdvr_Shldng_Grp_Type" SMALLINT, 
	"Fdvr_Shldr_Sub_Grp_Desc" VARCHAR(200), 
	"Fdvr_Tot_Shares" BIGINT NOT NULL, 
	"Fdvr_Cls_X_Shares" BIGINT NOT NULL, 
	"Fdvr_Cls_Y_Shares" BIGINT NOT NULL, 
	"Fdvr_Cls_Z_Shares" BIGINT NOT NULL, 
	"Fdvr_Tot_Shares_Pct" NUMERIC(10, 2), 
	"Fdvr_Grd_Tot_Shares_Pct" NUMERIC(10, 2), 
	"Fdvr_Rec_Date" DATE NOT NULL, 
	PRIMARY KEY (id)
);

-- --------------------------------------------------------------------------------------
-- Table 3.8: FACT_DR_HOLDING (Depository Receipt GDR/ADR Underlying Shareholding Details)
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS FACT_DR_HOLDING (
	id INTEGER NOT NULL, 
	"Fdrh_Txn_Id" VARCHAR(100), 
	"Fdrh_Exch_Token" SMALLINT NOT NULL, 
	"Fdrh_Cmp_Token" BIGINT NOT NULL, 
	"Fdrh_Exch_Cmp_Token" INTEGER NOT NULL, 
	"Fdrh_Trd_Prd_Token" BIGINT NOT NULL, 
	"Fdrh_Symbol" VARCHAR(10), 
	"Fdrh_Series" VARCHAR(2), 
	"Fdrh_Rec_Id" VARCHAR(25), 
	"Fdrh_Nds_Id" VARCHAR(25), 
	"Fdrh_Qrtr_Num" VARCHAR(4) NOT NULL, 
	"Fdrh_DR_Catg" VARCHAR(30), 
	"Fdrh_Shldng_Date" DATE NOT NULL, 
	"Fdrh_DR_Indc" VARCHAR(100), 
	"Fdrh_DR_Type" SMALLINT, 
	"Fdrh_DR_Hdlr_Name" VARCHAR(200), 
	"Fdrh_Outs_DR_Cnt" INTEGER, 
	"Fdrh_Outs_Unlyng_Shares" BIGINT, 
	"Fdrh_Tot_Shares_Pct" NUMERIC(10, 2), 
	"Fdrh_Rec_Date" DATE, 
	PRIMARY KEY (id)
);


-- ======================================================================================
-- LAYER 4: CORPORATE ACTIONS & DILUTION ADJUSTMENTS
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 4.1: FACT_CORP_ACTIONS (Corporate Action Events & Announcements)
-- Purpose: Feeds Corporate Action Timeline overlays per PVASF §5.1.2:
--          - Stock Splits (Split Ratio, Ex-Split Date)
--          - Bonus Issues (Bonus Ratio, Ex-Bonus Date)
--          - Rights Offerings (Rights Ratio, Issue Price)
--          - Cash Dividends (Dividend Value, Ex-Dividend Date)
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS FACT_CORP_ACTIONS (
	id INTEGER NOT NULL, 
	"Fcac_Exch_Token" SMALLINT NOT NULL, 
	"Fcac_Cmp_Token" BIGINT NOT NULL, 
	"Fcac_Trd_Prd_Token" INTEGER NOT NULL, 
	"Fcac_Symbol" VARCHAR(10), 
	"Fcac_Series" VARCHAR(10), 
	"Fcac_Ind_Token" INTEGER, 
	"Fcac_Cmp_Id" VARCHAR(10), 
	"Fcac_Cmp_Name" VARCHAR(100), 
	"Fcac_Ind_Id" VARCHAR(10), 
	"Fcac_ISIN" VARCHAR(12), 
	"Fcac_Issd_Shares" NUMERIC(20, 2), 
	"Fcac_Face_Val" NUMERIC(20, 2), 
	"Fcac_Listng_Date" DATE, 
	"Fcac_Iss_Start_Date" DATE, 
	"Fcac_Iss_End_Date" DATE, 
	"Fcac_Corp_Action_Catg" VARCHAR(30), 
	"Fcac_Corp_Action_Type" SMALLINT, 
	"Fcac_Divnd_Prpse_Indc" VARCHAR(1), 
	"Fcac_Intrm_Final_Flag" VARCHAR(1), 
	"Fcac_Mod_Date" DATE, 
	"Fcac_Divnd_Pct" NUMERIC(10, 2), 
	"Fcac_Divnd_Val" NUMERIC(20, 2), 
	"Fcac_Ex_Divnd_Date" DATE, 
	"Fcac_Bonus_Ratio" VARCHAR(15), 
	"Fcac_Ex_Bonus_Date" DATE, 
	"Fcac_Rights_Ratio" VARCHAR(15), 
	"Fcac_Ex_Rights_Date" DATE, 
	"Fcac_Split_Ratio" NUMERIC(10, 2), 
	"Fcac_Ex_Split_Date" DATE, 
	"Fcac_Offer_Type_Indc" VARCHAR(2), 
	"Fcac_Issue_Val" NUMERIC(20, 2), 
	"Fcac_Arngmt_Schema" VARCHAR(50), 
	"Fcac_Ex_Arngmt_Schema_Date" DATE, 
	"Fcac_Paid_Up_Val" NUMERIC(20, 2), 
	"Fcac_Prem_Val" NUMERIC(20, 2), 
	"Fcac_BC_Start_Date" DATE, 
	"Fcac_BC_End_Date" DATE, 
	"Fcac_CA_Rec_Date" DATE, 
	"Fcac_ND_Start_Date" DATE, 
	"Fcac_ND_End_Date" DATE, 
	"Fcac_Divnd_Prpse" VARCHAR(50), 
	"Fcac_Rights_Prpse" VARCHAR(50), 
	"Fcac_Bonus_Prpse" VARCHAR(50), 
	"Fcac_Int_Prpse" VARCHAR(50), 
	"Fcac_Split_Prpse" VARCHAR(50), 
	"Fcac_Agm_Prpse" VARCHAR(50), 
	"Fcac_Egm_Prpse" VARCHAR(50), 
	"Fcac_Other_Prpse" VARCHAR(50), 
	"Fcac_Rec_Date" DATE NOT NULL, 
	PRIMARY KEY (id)
);

-- --------------------------------------------------------------------------------------
-- Table 4.2: FACT_CA_DIL_FCTR (Corporate Action Dilution Adjustment Factor)
-- Purpose: Normalizes pre-corporate action price & volume to prevent false positive alerts
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS FACT_CA_DIL_FCTR (
	id INTEGER NOT NULL, 
	"Fcdf_Exch_Token" SMALLINT NOT NULL, 
	"Fcdf_Cmp_Token" BIGINT NOT NULL, 
	"Fcdf_NSE_Trd_Prd_Token" INTEGER NOT NULL, 
	"Fcdf_BSE_Trd_Prd_Token" INTEGER NOT NULL, 
	"Fcdf_Symbol" VARCHAR(10), 
	"Fcdf_Corp_Action_Catg" VARCHAR(30), 
	"Fcdf_Corp_Action_Type" SMALLINT, 
	"Fcdf_Appl_From_Date" DATE NOT NULL, 
	"Fcdf_Appl_To_Date" DATE NOT NULL, 
	"Fcdf_Price_Adj_Factor" NUMERIC(15, 6), 
	"Fcdf_Process_Stat" SMALLINT, 
	"Fcdf_Mod_Date" DATE, 
	"Fcdf_Rec_Date" DATE, 
	PRIMARY KEY (id)
);


-- ======================================================================================
-- LAYER 5: SURVEILLANCE OPERATIONS, AUDITING & ACCESS CONTROL
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 5.1: FORENSIC_CASES (Active Investigation Workspace Cases)
-- Purpose: Records cases, risk ratings, regulatory findings, and case workflow
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS FORENSIC_CASES (
	id INTEGER NOT NULL, 
	case_id VARCHAR(60) NOT NULL, 
	target_symbol VARCHAR(20) NOT NULL, 
	title VARCHAR(300) NOT NULL, 
	lead_officer VARCHAR(100) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	priority VARCHAR(10) NOT NULL, 
	description VARCHAR(2000), 
	evidence_json VARCHAR(5000), 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	closed_at DATETIME, 
	created_by VARCHAR(50), 
	PRIMARY KEY (id)
);

-- --------------------------------------------------------------------------------------
-- Table 5.2: SYS_AUDIT_LOGS (Regulatory Surveillance Audit Trail)
-- Purpose: Immutable record of all system decisions, Mark Safe actions, and downloads
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS SYS_AUDIT_LOGS (
	id INTEGER NOT NULL, 
	timestamp DATETIME NOT NULL, 
	username VARCHAR(50) NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	action VARCHAR(50) NOT NULL, 
	target VARCHAR(100), 
	details VARCHAR(500), 
	ip_address VARCHAR(45), 
	PRIMARY KEY (id)
);

-- --------------------------------------------------------------------------------------
-- Table 5.3: SYS_USERS (Surveillance System User Management)
-- Purpose: Role-based access control (RBAC) and authentication
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS SYS_USERS (
	id INTEGER NOT NULL, 
	username VARCHAR(50) NOT NULL, 
	email VARCHAR(100) NOT NULL, 
	full_name VARCHAR(100) NOT NULL, 
	department VARCHAR(100) NOT NULL, 
	hashed_password VARCHAR(128) NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at DATETIME NOT NULL, 
	last_login_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (email)
);


-- ======================================================================================
-- PRODUCTION PERFORMANCE INDEXES
-- ======================================================================================

CREATE INDEX IF NOT EXISTS idx_asd_symbol_date ON AGG_SEC_DAY (Asd_Symbol, Asd_Date);
CREATE INDEX IF NOT EXISTS idx_asd_date ON AGG_SEC_DAY (Asd_Date);
CREATE INDEX IF NOT EXISTS idx_asd_cmp_token ON AGG_SEC_DAY (Asd_Cmp_Token);
CREATE INDEX IF NOT EXISTS idx_acsd_date_cmp ON AGG_CLNT_SEC_DAY (Acsd_Date, Acsd_Cmp_Token);
CREATE INDEX IF NOT EXISTS idx_acsd_clnt_token ON AGG_CLNT_SEC_DAY (Acsd_Exch_Clnt_Token);
CREATE INDEX IF NOT EXISTS idx_appd_date_cmp ON AGG_PAN_PAIR_DAY (Appd_Date, Appd_Cmp_Token);
CREATE INDEX IF NOT EXISTS idx_appd_pair ON AGG_PAN_PAIR_DAY (Appd_Exch_Clnt_Token, Appd_Cpty_Exch_Clnt_Token);
CREATE INDEX IF NOT EXISTS idx_decl_pan ON DIM_EXCH_CLNT_DTLS (Decl_Clnt_Pan);
CREATE INDEX IF NOT EXISTS idx_decl_ucc ON DIM_EXCH_CLNT_DTLS (Decl_Clnt_UCC);
CREATE INDEX IF NOT EXISTS idx_decl_tm ON DIM_EXCH_CLNT_DTLS (Decl_TM_Id);
CREATE INDEX IF NOT EXISTS idx_ddcl_pan ON DIM_DEP_CLNT_DTLS (Ddcl_Clnt_Pan);
CREATE INDEX IF NOT EXISTS idx_ddcl_bpid_clntid ON DIM_DEP_CLNT_DTLS (Ddcl_BP_Id, Ddcl_Clnt_Id);
CREATE INDEX IF NOT EXISTS idx_fshg_symbol_date ON FACT_MAIN_SHLDNG (Fshg_Symbol, Fshg_Shldng_Date);
CREATE INDEX IF NOT EXISTS idx_fprh_symbol_date ON FACT_PROM_SHLDR_DTLS (Fprh_Symbol, Fprh_Shldng_Date);
CREATE INDEX IF NOT EXISTS idx_fpuh_symbol_date ON FACT_PUB_SHLDR_DTLS (Fpuh_Symbol, Fpuh_Shldng_Date);
CREATE INDEX IF NOT EXISTS idx_fcac_symbol ON FACT_CORP_ACTIONS (Fcac_Symbol);
CREATE INDEX IF NOT EXISTS idx_fcdf_symbol_date ON FACT_CA_DIL_FCTR (Fcdf_Symbol, Fcdf_Appl_From_Date, Fcdf_Appl_To_Date);
CREATE INDEX IF NOT EXISTS idx_cases_symbol ON FORENSIC_CASES (target_symbol);
CREATE INDEX IF NOT EXISTS idx_cases_status ON FORENSIC_CASES (status);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON SYS_AUDIT_LOGS (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_target ON SYS_AUDIT_LOGS (target);


-- ======================================================================================
-- SAMPLE REGULATORY SURVEILLANCE QUERIES
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Query 1: Extract 180-Day Baseline vs 15-Day Surveillance Window for Scrip Analysis
-- --------------------------------------------------------------------------------------
-- SELECT 
--     Asd_Date,
--     Asd_Close_Price,
--     Asd_High_Price,
--     Asd_Tot_Qty,
--     Asd_Tot_Val,
--     Asd_Upp_Crct_Price
-- FROM AGG_SEC_DAY
-- WHERE Asd_Symbol = 'NOVAENERGY'
--   AND Asd_Date BETWEEN '2026-02-01' AND '2026-08-27'
-- ORDER BY Asd_Date ASC;

-- --------------------------------------------------------------------------------------
-- Query 2: Extract Top Positive LTP Aggressors and Price Dampeners for 15-Day Pump
-- --------------------------------------------------------------------------------------
-- SELECT 
--     d.Decl_Clnt_Pan AS PAN,
--     d.Decl_Clnt_Name AS Entity_Name,
--     SUM(a.Acsd_Buy_Tot_Qty + a.Acsd_Sell_Tot_Qty) AS Total_Traded_Volume,
--     SUM(a.Acsd_Pos_Cont_Val) AS Positive_LTP_Push_INR,
--     SUM(a.Acsd_Neg_Cont_Val) AS Negative_LTP_Pull_INR,
--     SUM(a.Acsd_Sell_Tot_Val) - SUM(a.Acsd_Buy_Tot_Val) AS Cash_Extraction_INR
-- FROM AGG_CLNT_SEC_DAY a
-- JOIN DIM_EXCH_CLNT_DTLS d ON a.Acsd_Exch_Clnt_Token = d.Decl_Exch_Clnt_Token
-- JOIN AGG_SEC_DAY s ON a.Acsd_Cmp_Token = s.Asd_Cmp_Token AND a.Acsd_Date = s.Asd_Date
-- WHERE s.Asd_Symbol = 'NOVAENERGY'
--   AND a.Acsd_Date BETWEEN '2026-08-07' AND '2026-08-27'
-- GROUP BY d.Decl_Clnt_Pan, d.Decl_Clnt_Name
-- ORDER BY Positive_LTP_Push_INR DESC
-- LIMIT 10;

-- --------------------------------------------------------------------------------------
-- Query 3: Identify Concentrated Bilateral Trading Loops (PAN1 <-> PAN2)
-- --------------------------------------------------------------------------------------
-- SELECT 
--     p1.Decl_Clnt_Pan AS Buyer_PAN,
--     p2.Decl_Clnt_Pan AS Seller_PAN,
--     SUM(pair.Appd_Buy_Tot_Qty + pair.Appd_Sell_Tot_Qty) AS Gross_Matched_Volume,
--     COALESCE(SUM(pair.Appd_Buy_Tot_Val + pair.Appd_Sell_Tot_Val), 0.0) AS Gross_Matched_Turnover_INR,
--     ROUND(2.0 * MIN(SUM(pair.Appd_Buy_Tot_Qty), SUM(pair.Appd_Sell_Tot_Qty)) / 
--           MAX(1, SUM(pair.Appd_Buy_Tot_Qty + pair.Appd_Sell_Tot_Qty)) * 100.0, 2) AS Reversal_Trade_Ratio_RTR
-- FROM AGG_PAN_PAIR_DAY pair
-- JOIN DIM_EXCH_CLNT_DTLS p1 ON pair.Appd_Exch_Clnt_Token = p1.Decl_Exch_Clnt_Token
-- JOIN DIM_EXCH_CLNT_DTLS p2 ON pair.Appd_Cpty_Exch_Clnt_Token = p2.Decl_Exch_Clnt_Token
-- JOIN AGG_SEC_DAY s ON pair.Appd_Cmp_Token = s.Asd_Cmp_Token AND pair.Appd_Date = s.Asd_Date
-- WHERE s.Asd_Symbol = 'NOVAENERGY'
--   AND pair.Appd_Date BETWEEN '2026-08-07' AND '2026-08-27'
-- GROUP BY p1.Decl_Clnt_Pan, p2.Decl_Clnt_Pan
-- HAVING Gross_Matched_Volume > 100000
-- ORDER BY Gross_Matched_Volume DESC
-- LIMIT 10;
