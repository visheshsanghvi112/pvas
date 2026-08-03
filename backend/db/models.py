"""
backend/db/models.py
────────────────────────────────────────────────────────────────────────────
SQLAlchemy ORM models mirroring the three Teradata tables.
Python 3.9 compatible — uses Optional[T] throughout.

Table mapping:
  DimExchClntDtls   → DIM_EXCH_CLNT_DTLS (DECL)  — exchange client accounts
  DimDepClntDtls    → DIM_DEP_CLNT_DTLS  (DDCL)  — depository client accounts
  FactTrades        → FACT_TRADES        (FTRD)   — trade fact table
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    BigInteger, Boolean, Date, DateTime, ForeignKey, Index,
    Integer, Numeric, SmallInteger, String, Time,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.database import Base


# ══════════════════════════════════════════════════════════════════════════════
#  DIM_EXCH_CLNT_DTLS  (DECL) — Client Exchange Accounts
# ══════════════════════════════════════════════════════════════════════════════

class DimExchClntDtls(Base):
    __tablename__ = "DIM_EXCH_CLNT_DTLS"

    # ── Mandatory core ────────────────────────────────────────────────────────
    Decl_Exch_Clnt_Token:     Mapped[int]            = mapped_column(BigInteger,  primary_key=True, index=True)
    Decl_Clnt_Token:          Mapped[int]            = mapped_column(BigInteger,  nullable=False, index=True)
    Decl_Exch_Token:          Mapped[int]            = mapped_column(SmallInteger,nullable=False)
    Decl_Seg_Token:           Mapped[int]            = mapped_column(SmallInteger,nullable=False)
    Decl_Exch_TM_Token:       Mapped[int]            = mapped_column(BigInteger,  nullable=False, index=True)
    Decl_Exch_Id:             Mapped[str]            = mapped_column(String(10),  nullable=False)
    Decl_Seg_Id:              Mapped[str]            = mapped_column(String(15),  nullable=False)
    Decl_TM_Id:               Mapped[str]            = mapped_column(String(15),  nullable=False, index=True)
    Decl_Clnt_Id:             Mapped[str]            = mapped_column(String(16),  nullable=False, index=True)
    Decl_Client_Code:         Mapped[str]            = mapped_column(String(40),  nullable=False)

    # ── KYC identifiers ───────────────────────────────────────────────────────
    Decl_Clnt_Pan:            Mapped[Optional[str]]  = mapped_column(String(25),  nullable=True, index=True)
    Decl_Clnt_Uid:            Mapped[Optional[str]]  = mapped_column(String(16),  nullable=True)
    Decl_Clnt_UCC:            Mapped[Optional[str]]  = mapped_column(String(10),  nullable=True)
    Decl_Clnt_Mapin:          Mapped[Optional[str]]  = mapped_column(String(10),  nullable=True)

    # ── Category ──────────────────────────────────────────────────────────────
    Decl_Clnt_Catg_Type:      Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)
    Decl_Clnt_Catg_Type_Desc: Mapped[Optional[str]]  = mapped_column(String(10),   nullable=True)

    # ── Name ──────────────────────────────────────────────────────────────────
    Decl_Clnt_Name:           Mapped[Optional[str]]  = mapped_column(String(250),  nullable=True)
    Decl_Frst_Name:           Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Decl_Mid_Name:            Mapped[Optional[str]]  = mapped_column(String(50),   nullable=True)
    Decl_Last_Name:           Mapped[Optional[str]]  = mapped_column(String(50),   nullable=True)
    Decl_Ftr_Hus_Name:        Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)

    # ── Status ────────────────────────────────────────────────────────────────
    Decl_Clnt_Stat:           Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)
    Decl_Clnt_Stat_Indc:      Mapped[Optional[str]]  = mapped_column(String(5),    nullable=True)

    # ── Depository / DP ───────────────────────────────────────────────────────
    Decl_Dep_Id:              Mapped[Optional[str]]  = mapped_column(String(10),  nullable=True)
    Decl_Dep_Name:            Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    Decl_Dp_Id:               Mapped[Optional[str]]  = mapped_column(String(16),  nullable=True)
    Decl_BO_Id:               Mapped[Optional[str]]  = mapped_column(String(16),  nullable=True)
    Decl_Micr_Code:           Mapped[Optional[str]]  = mapped_column(String(25),  nullable=True)
    Decl_Dp_Name:             Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)

    # ── Bank ──────────────────────────────────────────────────────────────────
    Decl_Bank_Name:           Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    Decl_Bank_Addr:           Mapped[Optional[str]]  = mapped_column(String(300), nullable=True)
    Decl_Bank_Acct_Num:       Mapped[Optional[str]]  = mapped_column(String(25),  nullable=True)
    Decl_Bank_Acct_Type:      Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)

    # ── Personal ──────────────────────────────────────────────────────────────
    Decl_Birth_Date:          Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Decl_Frst_Addr_Line:      Mapped[Optional[str]]  = mapped_column(String(300), nullable=True)
    Decl_Scnd_Addr_Line:      Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    Decl_Thrd_Addr_Line:      Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    Decl_City:                Mapped[Optional[str]]  = mapped_column(String(60),  nullable=True)
    Decl_State:               Mapped[Optional[str]]  = mapped_column(String(60),  nullable=True)
    Decl_Cntry:               Mapped[Optional[str]]  = mapped_column(String(30),  nullable=True)
    Decl_Pin:                 Mapped[Optional[str]]  = mapped_column(String(60),  nullable=True)

    # ── Contact ───────────────────────────────────────────────────────────────
    Decl_Frst_Tele_Num:       Mapped[Optional[str]]  = mapped_column(String(80),  nullable=True)
    Decl_Frst_Fax_Num:        Mapped[Optional[str]]  = mapped_column(String(80),  nullable=True)
    Decl_Frst_Mob_Num:        Mapped[Optional[str]]  = mapped_column(String(60),  nullable=True)
    Decl_Frst_Email_Id:       Mapped[Optional[str]]  = mapped_column(String(50),  nullable=True)
    Decl_Isd_Code:            Mapped[Optional[str]]  = mapped_column(String(5),   nullable=True)
    Decl_Std_Code:            Mapped[Optional[str]]  = mapped_column(String(10),  nullable=True)
    Decl_Clnt_Cnt_Num:        Mapped[Optional[int]]  = mapped_column(Integer,     nullable=True)

    # ── KYC metadata ──────────────────────────────────────────────────────────
    Decl_Agmt_Date:           Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Decl_Intro_Name:          Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    Decl_Intro_Mid_Name:      Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    Decl_Intro_Last_Name:     Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    Decl_Intro_Reltn:         Mapped[Optional[str]]  = mapped_column(String(30),  nullable=True)
    Decl_Intro_Clnt_Id:       Mapped[Optional[str]]  = mapped_column(String(16),  nullable=True)
    Decl_Othr_TM_Flag:        Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)
    Decl_UCC_Info_Date:       Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Decl_Qua_Desc:            Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    Decl_Occu_Desc:           Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)
    Decl_Non_Indv_Clnt_Name:  Mapped[Optional[str]]  = mapped_column(String(250), nullable=True)
    Decl_PAN_Decl_Obtd_Flag:  Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)
    Decl_PAN_Recv_Date:       Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # ── Sub-broker ────────────────────────────────────────────────────────────
    Decl_Sub_Broker_Id:           Mapped[Optional[str]] = mapped_column(String(16),  nullable=True)
    Decl_Sub_Broker_Name:         Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Decl_SubBroker_Reg_Num:  Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)

    # ── Family member ─────────────────────────────────────────────────────────
    Decl_Fam_Mbr_Acct_Type_Desc:  Mapped[Optional[str]] = mapped_column(String(30),  nullable=True)
    Decl_Fam_Mbr_Frst_Sett_Mode:  Mapped[Optional[str]] = mapped_column(String(20),  nullable=True)
    Decl_Fam_Mbr_Scnd_Sett_Mode:  Mapped[Optional[str]] = mapped_column(String(20),  nullable=True)
    Decl_Fam_Mbr_Thrd_Sett_Mode:  Mapped[Optional[str]] = mapped_column(String(20),  nullable=True)
    Decl_Fam_Mbr_Frth_Sett_Mode:  Mapped[Optional[str]] = mapped_column(String(20),  nullable=True)
    Decl_Fam_Frst_Mbr_Name:       Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Decl_Fam_Scnd_Mbr_Name:       Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Decl_Fam_Thrd_Mbr_Name:       Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Decl_Fam_Frth_Mbr_Name:       Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Decl_Othr_Frst_Mbr_Id:        Mapped[Optional[str]] = mapped_column(String(15),  nullable=True)
    Decl_Othr_Scnd_Mbr_Id:        Mapped[Optional[str]] = mapped_column(String(15),  nullable=True)
    Decl_Othr_Thrd_Mbr_Id:        Mapped[Optional[str]] = mapped_column(String(15),  nullable=True)
    Decl_Othr_Frth_Mbr_Id:        Mapped[Optional[str]] = mapped_column(String(15),  nullable=True)
    Decl_Bank_Cert_Obtd_Flag:      Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    Decl_Inprsn_Vrfy_Flag:         Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)

    # ── Identity docs ─────────────────────────────────────────────────────────
    Decl_Ward_Circle_Num:          Mapped[Optional[str]] = mapped_column(String(25),  nullable=True)
    Decl_Psprt_Num:                Mapped[Optional[str]] = mapped_column(String(25),  nullable=True)
    Decl_Psprt_Issue_Place:        Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    Decl_Psprt_Issue_Date:         Mapped[Optional[date]]= mapped_column(Date, nullable=True)
    Decl_Psprt_Expiry_Date:        Mapped[Optional[date]]= mapped_column(Date, nullable=True)
    Decl_Drvng_Lic_Num:            Mapped[Optional[str]] = mapped_column(String(25),  nullable=True)
    Decl_Drvng_Lic_Issue_Place:    Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    Decl_Drvng_Lic_Issue_Date:     Mapped[Optional[date]]= mapped_column(Date, nullable=True)
    Decl_Drvng_Lic_Expiry_Date:    Mapped[Optional[date]]= mapped_column(Date, nullable=True)
    Decl_Voter_Id_Num:             Mapped[Optional[str]] = mapped_column(String(25),  nullable=True)
    Decl_Voter_Id_Issue_Place:     Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    Decl_Voter_Id_Issue_Date:      Mapped[Optional[date]]= mapped_column(Date, nullable=True)
    Decl_Ratn_Card_Num:            Mapped[Optional[str]] = mapped_column(String(25),  nullable=True)
    Decl_Ratn_Card_Issue_Place:    Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    Decl_Ratn_Card_Issue_Date:     Mapped[Optional[date]]= mapped_column(Date, nullable=True)
    Decl_Mapin_Issue_Place:        Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    Decl_Mapin_Issue_Date:         Mapped[Optional[date]]= mapped_column(Date, nullable=True)
    Decl_Reg_Auth_Num:             Mapped[Optional[str]] = mapped_column(String(25),  nullable=True)
    Decl_Reg_Auth_Issue_Place:     Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    Decl_Reg_Auth_Issue_Date:      Mapped[Optional[date]]= mapped_column(Date, nullable=True)
    Decl_Reg_Auth_Desc:            Mapped[Optional[str]] = mapped_column(String(60),  nullable=True)

    # ── Contact persons ───────────────────────────────────────────────────────
    Decl_Frst_Cntct_Person_Name:   Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Decl_Frst_Cntct_Person_PAN:    Mapped[Optional[str]] = mapped_column(String(25),  nullable=True)
    Decl_Frst_Cntct_Desig_Desc:    Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    Decl_Frst_Cntct_Addr:          Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    Decl_Frst_Cntct_Tele_Num:      Mapped[Optional[str]] = mapped_column(String(80),  nullable=True)
    Decl_Frst_Cntct_Email_Id:      Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    Decl_Scnd_Cntct_Person_Name:   Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Decl_Scnd_Cntct_Person_PAN:    Mapped[Optional[str]] = mapped_column(String(25),  nullable=True)
    Decl_Scnd_Cntct_Desig_Desc:    Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    Decl_Scnd_Cntct_Addr:          Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    Decl_Scnd_Cntct_Tele_Num:      Mapped[Optional[str]] = mapped_column(String(80),  nullable=True)
    Decl_Scnd_Cntct_Email_Id:      Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    Decl_Thrd_Cntct_Person_Name:   Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Decl_Thrd_Cntct_Person_PAN:    Mapped[Optional[str]] = mapped_column(String(25),  nullable=True)
    Decl_Thrd_Cntct_Desig_Desc:    Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    Decl_Thrd_Cntct_Addr:          Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    Decl_Thrd_Cntct_Tele_Num:      Mapped[Optional[str]] = mapped_column(String(80),  nullable=True)
    Decl_Thrd_Cntct_Email_Id:      Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)

    # ── Record metadata ───────────────────────────────────────────────────────
    Decl_Rec_Date:            Mapped[date]           = mapped_column(Date, nullable=False)
    Decl_Clnt_Acct_Type:      Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)
    Decl_Clnt_Acct_Type_Desc: Mapped[Optional[str]]  = mapped_column(String(10),   nullable=True)
    Decl_Dmat_Acct_Num:       Mapped[Optional[str]]  = mapped_column(String(25),   nullable=True)
    Decl_Cdsl_Dep_Id:         Mapped[Optional[str]]  = mapped_column(String(10),   nullable=True)
    Decl_Cdsl_Dep_Name:       Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Decl_Cdsl_Dp_Id:          Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Decl_Cdsl_Bo_Id:          Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Decl_Cdsl_Dp_Name:        Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Decl_Reltn_Code:          Mapped[Optional[str]]  = mapped_column(String(15),   nullable=True)

    __table_args__ = (
        Index("ix_decl_pan", "Decl_Clnt_Pan"),
        Index("ix_decl_tm_clnt", "Decl_TM_Id", "Decl_Clnt_Id"),
    )


# ══════════════════════════════════════════════════════════════════════════════
#  DIM_DEP_CLNT_DTLS  (DDCL) — Client Depository Accounts
# ══════════════════════════════════════════════════════════════════════════════

class DimDepClntDtls(Base):
    __tablename__ = "DIM_DEP_CLNT_DTLS"

    Ddcl_Dep_Clnt_Token:          Mapped[int]            = mapped_column(BigInteger,   primary_key=True, index=True)
    Ddcl_Clnt_Token:              Mapped[int]            = mapped_column(BigInteger,   nullable=False, index=True)
    Ddcl_Dep_Token:               Mapped[int]            = mapped_column(SmallInteger, nullable=False)
    Ddcl_BP_Token:                Mapped[int]            = mapped_column(BigInteger,   nullable=False)
    Ddcl_BP_Id:                   Mapped[str]            = mapped_column(String(16),   nullable=False)
    Ddcl_Clnt_Id:                 Mapped[str]            = mapped_column(String(16),   nullable=False, index=True)

    Ddcl_Clnt_Pan:                Mapped[Optional[str]]  = mapped_column(String(30),   nullable=True, index=True)
    Ddcl_Clnt_Code:               Mapped[Optional[str]]  = mapped_column(String(40),   nullable=True)
    Ddcl_Clnt_Uniq_Id:            Mapped[Optional[str]]  = mapped_column(String(16),   nullable=True)
    Ddcl_Clnt_Mapin:              Mapped[Optional[str]]  = mapped_column(String(10),   nullable=True)
    Ddcl_Clnt_Catg_Type_Desc:     Mapped[Optional[str]]  = mapped_column(String(10),   nullable=True)
    Ddcl_Clnt_SubCatg_Type_Desc:  Mapped[Optional[str]]  = mapped_column(String(10),   nullable=True)
    Ddcl_Clnt_Acct_Type_Desc:     Mapped[Optional[str]]  = mapped_column(String(30),   nullable=True)
    Ddcl_Clnt_Catg_Type:          Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)
    Ddcl_Clnt_SubCatg_Type:       Mapped[Optional[int]]  = mapped_column(Integer,      nullable=True)
    Ddcl_Clnt_Acct_Type:          Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)
    Ddcl_Clnt_Name:               Mapped[Optional[str]]  = mapped_column(String(250),  nullable=True)
    Ddcl_Clnt_Shrt_Name:          Mapped[Optional[str]]  = mapped_column(String(20),   nullable=True)
    Ddcl_Ftr_Hus_Name:            Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Ddcl_Clnt_Stat_Desc:          Mapped[Optional[str]]  = mapped_column(String(10),   nullable=True)
    Ddcl_Clnt_Stat:               Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)
    Ddcl_Acct_Openng_Date:        Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Ddcl_Acct_Closr_Date:         Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Ddcl_Susp_Rson_Type_Desc:     Mapped[Optional[str]]  = mapped_column(String(10),   nullable=True)
    Ddcl_Micr_Code:               Mapped[Optional[str]]  = mapped_column(String(25),   nullable=True)
    Ddcl_Bank_Name:               Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Ddcl_Bank_Acct_Num:           Mapped[Optional[str]]  = mapped_column(String(25),   nullable=True)
    Ddcl_Bank_Acct_Type_Desc:     Mapped[Optional[str]]  = mapped_column(String(30),   nullable=True)
    Ddcl_Bank_Acct_Type:          Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)
    Ddcl_Birth_Date:              Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Ddcl_Minor_Birth_Date:        Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Ddcl_Sex:                     Mapped[Optional[str]]  = mapped_column(String(1),    nullable=True)
    Ddcl_Ntnlty_Desc:             Mapped[Optional[str]]  = mapped_column(String(10),   nullable=True)
    Ddcl_Frst_Addr_Line:          Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Ddcl_Scnd_Addr_Line:          Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Ddcl_Thrd_Addr_Line:          Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Ddcl_Frth_Addr_Line:          Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Ddcl_City:                    Mapped[Optional[str]]  = mapped_column(String(60),   nullable=True)
    Ddcl_State:                   Mapped[Optional[str]]  = mapped_column(String(60),   nullable=True)
    Ddcl_Cntry:                   Mapped[Optional[str]]  = mapped_column(String(30),   nullable=True)
    Ddcl_Pin:                     Mapped[Optional[str]]  = mapped_column(String(60),   nullable=True)
    Ddcl_Frst_Tele_Num:           Mapped[Optional[str]]  = mapped_column(String(80),   nullable=True)
    Ddcl_Frst_Fax_Num:            Mapped[Optional[str]]  = mapped_column(String(80),   nullable=True)
    Ddcl_Frst_Email_Id:           Mapped[Optional[str]]  = mapped_column(String(50),   nullable=True)
    Ddcl_Scnd_Hldr_Clnt_Token:    Mapped[Optional[int]]  = mapped_column(BigInteger,   nullable=True)
    Ddcl_Scnd_Hldr_Name:          Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Ddcl_Scnd_Hldr_Pan:           Mapped[Optional[str]]  = mapped_column(String(30),   nullable=True)
    Ddcl_Scnd_Hldr_Ftr_Hus_Name:  Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Ddcl_Thrd_Hldr_Clnt_Token:    Mapped[Optional[int]]  = mapped_column(BigInteger,   nullable=True)
    Ddcl_Thrd_Hldr_Name:          Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Ddcl_Thrd_Hldr_Pan:           Mapped[Optional[str]]  = mapped_column(String(30),   nullable=True)
    Ddcl_Thrd_Hldr_Ftr_Hus_Name:  Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Ddcl_Poa_Enbld_Indc:          Mapped[Optional[str]]  = mapped_column(String(2),    nullable=True)
    Ddcl_Occu_Desc:               Mapped[Optional[str]]  = mapped_column(String(100),  nullable=True)
    Ddcl_Regulatory_Reg_Num:            Mapped[Optional[str]]  = mapped_column(String(50),   nullable=True)
    Ddcl_RBI_Reg_Num:             Mapped[Optional[str]]  = mapped_column(String(50),   nullable=True)
    Ddcl_RBI_Aprvl_Date:          Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Ddcl_Frst_RBI_Ref_Num:        Mapped[Optional[str]]  = mapped_column(String(50),   nullable=True)
    Ddcl_BO_Exch_Id:              Mapped[Optional[str]]  = mapped_column(String(10),   nullable=True)
    Ddcl_BO_Clg_Corp_ID:          Mapped[Optional[str]]  = mapped_column(String(15),   nullable=True)
    Ddcl_BO_CM_Id:                Mapped[Optional[str]]  = mapped_column(String(15),   nullable=True)
    Ddcl_Exch_Clnt_Id:            Mapped[Optional[str]]  = mapped_column(String(15),   nullable=True)
    Ddcl_Rec_Date:                Mapped[date]           = mapped_column(Date, nullable=False)

    __table_args__ = (
        Index("ix_ddcl_pan",  "Ddcl_Clnt_Pan"),
        Index("ix_ddcl_clnt", "Ddcl_Clnt_Id"),
    )





# ══════════════════════════════════════════════════════════════════════════════
#  1.3 QUARTERLY SHAREHOLDING RESULTS (8 Enterprise Data Warehouse Tables)
# ══════════════════════════════════════════════════════════════════════════════

class FactMstrSharehldg(Base):
    """FACT_MSTR_SHAREHLDG (FMSH, 37 Columns) — Shareholding Master"""
    __tablename__ = "FACT_MSTR_SHAREHLDG"

    id:                            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    Fmsh_Exch_Token:               Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=1)
    Fmsh_Cmp_Token:                Mapped[int]           = mapped_column(BigInteger, nullable=False, index=True)
    Fmsh_Cmp_Name:                 Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Fmsh_Exch_Cmp_Token:           Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_Ind_Token:                Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    Fmsh_Trd_Prd_Token:            Mapped[int]           = mapped_column(BigInteger, nullable=False, default=1)
    Fmsh_Symbol:                   Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    Fmsh_Series:                   Mapped[Optional[str]] = mapped_column(String(2), nullable=True, default="EQ")
    Fmsh_Sec_Name:                 Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Fmsh_Rec_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fmsh_Nds_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fmsh_Qrtr_Id:                  Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_Qrtr_Num:                 Mapped[Optional[str]] = mapped_column(String(4), nullable=True, index=True)
    Fmsh_Letter_Date:              Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fmsh_Stamp_Date:               Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fmsh_As_on_Date:               Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    Fmsh_Notes:                    Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Fmsh_Status:                   Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="Replicated")
    Fmsh_Export_Date:              Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fmsh_Mn_Shldng_Rec_Cnt:        Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_VR_Shldng_Rec_Cnt:        Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_Promtr_Shldng_Rec_Cnt:    Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_Public_Shldng_Rec_Cnt:    Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_Lckd_In_Shldng_Rec_Cnt:   Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_DR_Dtls_Shldng_Rec_Cnt:   Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_DR_Hldrs_Rec_Cnt:         Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_Cnv_Sec_Rec_Cnt:          Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_Mn_ANO_Ind_Rec_Cnt:       Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_Mn_ANO_Frgn_Rec_Cnt:      Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_Mn_ANO_Inst_Rec_Cnt:      Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_Mn_ANO_NonInst_Rec_Cnt:   Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_VR_ANO_Ind_Rec_Cnt:       Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_VR_ANO_Frgn_Rec_Cnt:      Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_VR_ANO_Inst_Rec_Cnt:      Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_VR_ANO_NonInst_Rec_Cnt:   Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fmsh_Shldng_Rmrks:             Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fmsh_Rec_Date:                 Mapped[date]          = mapped_column(Date, nullable=False)


class FactMainShldng(Base):
    """FACT_MAIN_SHLDNG (FSHG, 30 Columns) — Main Shareholding Record"""
    __tablename__ = "FACT_MAIN_SHLDNG"

    id:                            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    Fshg_Txn_Id:                   Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Fshg_Exch_Token:               Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=1)
    Fshg_Cmp_Token:                Mapped[int]           = mapped_column(BigInteger, nullable=False, index=True)
    Fshg_Exch_Cmp_Token:           Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fshg_Trd_Prd_Token:            Mapped[int]           = mapped_column(BigInteger, nullable=False, default=1)
    Fshg_Symbol:                   Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    Fshg_Series:                   Mapped[Optional[str]] = mapped_column(String(2), nullable=True, default="EQ")
    Fshg_Rec_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fshg_Nds_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fshg_Qrtr_Num:                 Mapped[str]           = mapped_column(String(4), nullable=False, index=True)
    Fshg_Shldng_Date:              Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    Fshg_Lvl_Name:                 Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Fshg_Lvl_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fshg_Shldr_Desc:               Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fshg_Shldng_Catg_Type:         Mapped[int]           = mapped_column(SmallInteger, nullable=False) # 1=Promoter, 2=Public, 3=Custodian, 4=Others
    Fshg_Shldng_Sub_Catg_Type:     Mapped[int]           = mapped_column(SmallInteger, nullable=False)
    Fshg_Shldng_Grp_Type:          Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    Fshg_Shldng_Sub_Grp_Desc:      Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    Fshg_Shldr_Cnt:                Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fshg_Tot_Eq_Shares:            Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Fshg_Issd_Cap_Shares:          Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Fshg_Dmat_Shares:              Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Fshg_Dmat_Shares_Pct:          Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fshg_Tot_Shares_Pct:           Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fshg_Grd_Tot_Shares_Pct:       Mapped[Decimal]       = mapped_column(Numeric(10, 2), nullable=False)
    Fshg_Plge_Shares:              Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Fshg_Plge_Tot_Shares_Pct:      Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fshg_Frgn_Shldng_Shares:       Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Fshg_Frgn_Shldng_Pct:          Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fshg_Rec_Date:                 Mapped[date]          = mapped_column(Date, nullable=False)


class FactPromShldrDtls(Base):
    """FACT_PROM_SHLDR_DTLS (FPRH, 22 Columns) — Promoter Shareholder Details"""
    __tablename__ = "FACT_PROM_SHLDR_DTLS"

    id:                            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    Fprh_Txn_Id:                   Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Fprh_Exch_Token:               Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=1)
    Fprh_Cmp_Token:                Mapped[int]           = mapped_column(BigInteger, nullable=False, index=True)
    Fprh_Exch_Cmp_Token:           Mapped[int]           = mapped_column(Integer, nullable=False)
    Fprh_Trd_Prd_Token:            Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Fprh_Symbol:                   Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    Fprh_Series:                   Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    Fprh_Rec_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fprh_Nds_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fprh_Qrtr_Num:                 Mapped[str]           = mapped_column(String(4), nullable=False, index=True)
    Fprh_Shldng_Date:              Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fprh_Shldr_Desc:               Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fprh_Shldng_Catg_Type:         Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=1) # 1=Promoter
    Fprh_Shldng_Sub_Catg_Type:     Mapped[int]           = mapped_column(SmallInteger, nullable=False) # 1=Indian, 2=Foreign, 3=PAC
    Fprh_Shldng_Grp_Type:          Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    Fprh_Shldr_Name:               Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    Fprh_Tot_Shares:               Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Fprh_Tot_Shares_Pct:           Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fprh_Plge_Shares:              Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Fprh_Plge_Shares_Pct:          Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fprh_Plge_Grd_Tot_Share_Pct:   Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fprh_Rec_Date:                 Mapped[Optional[date]] = mapped_column(Date, nullable=True)


class FactPubShldrDtls(Base):
    """FACT_PUB_SHLDR_DTLS (FPUH, 19 Columns) — Public Shareholder Details"""
    __tablename__ = "FACT_PUB_SHLDR_DTLS"

    id:                            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    Fpuh_Txn_Id:                   Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Fpuh_Exch_Token:               Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=1)
    Fpuh_Cmp_Token:                Mapped[int]           = mapped_column(BigInteger, nullable=False, index=True)
    Fpuh_Exch_Cmp_Token:           Mapped[int]           = mapped_column(Integer, nullable=False)
    Fpuh_Trd_Prd_Token:            Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Fpuh_Symbol:                   Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    Fpuh_Series:                   Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    Fpuh_Rec_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fpuh_Nds_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fpuh_Qrtr_Num:                 Mapped[str]           = mapped_column(String(4), nullable=False, index=True)
    Fpuh_Shldng_Date:              Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fpuh_Shldr_Desc:               Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fpuh_Shldng_Catg_Type:         Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=2) # 2=Public
    Fpuh_Shldng_Sub_Catg_Type:     Mapped[int]           = mapped_column(SmallInteger, nullable=False) # 4=Institution, 5=Non-Institution
    Fpuh_Shldng_Grp_Type:          Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    Fpuh_Shldr_Name:               Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    Fpuh_Tot_Shares:               Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Fpuh_Tot_Shares_Pct:           Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fpuh_Rec_Date:                 Mapped[Optional[date]] = mapped_column(Date, nullable=True)


class FactDvrShldng(Base):
    """FACT_DVR_SHLDNG (FDVR, 25 Columns) — Differential Voting Rights Shareholding"""
    __tablename__ = "FACT_DVR_SHLDNG"

    id:                            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    Fdvr_Txn_Id:                   Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Fdvr_Exch_Token:               Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=1)
    Fdvr_Cmp_Token:                Mapped[int]           = mapped_column(BigInteger, nullable=False, index=True)
    Fdvr_Exch_Cmp_Token:           Mapped[int]           = mapped_column(Integer, nullable=False)
    Fdvr_Trd_Prd_Token:            Mapped[int]           = mapped_column(BigInteger, nullable=False, default=1)
    Fdvr_Symbol:                   Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    Fdvr_Series:                   Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    Fdvr_Rec_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fdvr_Nds_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fdvr_Qrtr_Num:                 Mapped[str]           = mapped_column(String(4), nullable=False)
    Fdvr_Shldng_Date:              Mapped[date]          = mapped_column(Date, nullable=False)
    Fdvr_Lvl_Name:                 Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Fdvr_Lvl_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fdvr_Shldr_Desc:               Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fdvr_Shldng_Catg_Type:         Mapped[int]           = mapped_column(SmallInteger, nullable=False)
    Fdvr_Shldng_Sub_Catg_Type:     Mapped[int]           = mapped_column(SmallInteger, nullable=False)
    Fdvr_Shldng_Grp_Type:          Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    Fdvr_Shldr_Sub_Grp_Desc:      Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    Fdvr_Tot_Shares:               Mapped[int]           = mapped_column(BigInteger, nullable=False, default=0)
    Fdvr_Cls_X_Shares:             Mapped[int]           = mapped_column(BigInteger, nullable=False, default=0)
    Fdvr_Cls_Y_Shares:             Mapped[int]           = mapped_column(BigInteger, nullable=False, default=0)
    Fdvr_Cls_Z_Shares:             Mapped[int]           = mapped_column(BigInteger, nullable=False, default=0)
    Fdvr_Tot_Shares_Pct:           Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fdvr_Grd_Tot_Shares_Pct:       Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fdvr_Rec_Date:                 Mapped[date]          = mapped_column(Date, nullable=False)


class FactDrHolding(Base):
    """FACT_DR_HOLDING (FDRH, 19 Columns) — Depository Receipts Details"""
    __tablename__ = "FACT_DR_HOLDING"

    id:                            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    Fdrh_Txn_Id:                   Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Fdrh_Exch_Token:               Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=1)
    Fdrh_Cmp_Token:                Mapped[int]           = mapped_column(BigInteger, nullable=False, index=True)
    Fdrh_Exch_Cmp_Token:           Mapped[int]           = mapped_column(Integer, nullable=False)
    Fdrh_Trd_Prd_Token:            Mapped[int]           = mapped_column(BigInteger, nullable=False, default=1)
    Fdrh_Symbol:                   Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    Fdrh_Series:                   Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    Fdrh_Rec_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fdrh_Nds_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Fdrh_Qrtr_Num:                 Mapped[str]           = mapped_column(String(4), nullable=False)
    Fdrh_DR_Catg:                  Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    Fdrh_Shldng_Date:              Mapped[date]          = mapped_column(Date, nullable=False)
    Fdrh_DR_Indc:                  Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Fdrh_DR_Type:                  Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    Fdrh_DR_Hdlr_Name:             Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    Fdrh_Outs_DR_Cnt:              Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fdrh_Outs_Unlyng_Shares:       Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Fdrh_Tot_Shares_Pct:           Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fdrh_Rec_Date:                 Mapped[Optional[date]] = mapped_column(Date, nullable=True)


class FactLkdinShldng(Base):
    """FACT_LKDIN_SHLDNG (FLKD, 17 Columns) — Locked-In Shareholding"""
    __tablename__ = "FACT_LKDIN_SHLDNG"

    id:                            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    Flkd_Txn_Id:                   Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Flkd_Exch_Token:               Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=1)
    Flkd_Cmp_Token:                Mapped[int]           = mapped_column(BigInteger, nullable=False, index=True)
    Flkd_Exch_Cmp_Token:           Mapped[int]           = mapped_column(Integer, nullable=False)
    Flkd_Trd_Prd_Token:            Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Flkd_Symbol:                   Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    Flkd_Series:                   Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    Flkd_Rec_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Flkd_Nds_Id:                   Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    Flkd_Qrtr_Num:                 Mapped[str]           = mapped_column(String(4), nullable=False)
    Flkd_Shldng_Date:              Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Flkd_Lkdin_Shldr_Catg:         Mapped[Optional[str]] = mapped_column(String(30), nullable=True) # PR=Promoter, PU=Public
    Flkd_Lkdin_Shldng_Catg_Type:   Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True) # 1=Promoter, 2=Public
    Flkd_Shdlr_Name:               Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    Flkd_Tot_Shares:               Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    Flkd_Tot_Shares_Pct:           Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Flkd_Rec_Date:                 Mapped[date]          = mapped_column(Date, nullable=False)


class FactCmpExchShldng(Base):
    """FACT_CMP_EXCH_SHLDNG (FCES, 5 Columns) — Company Exchange Shareholding Index"""
    __tablename__ = "FACT_CMP_EXCH_SHLDNG"

    id:                            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    Fces_Shldng_Date:              Mapped[date]          = mapped_column(Date, nullable=False, index=True)
    Fces_Cmp_Token:                Mapped[int]           = mapped_column(BigInteger, nullable=False, index=True)
    Fces_Trd_Prd_Token:            Mapped[int]           = mapped_column(BigInteger, nullable=False, default=1)
    Fces_Exch_Token:               Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=1)
    Fces_Rec_Date:                 Mapped[date]          = mapped_column(Date, nullable=False)


# ══════════════════════════════════════════════════════════════════════════════
#  1.5 CORPORATE ACTIONS & DILUTION FACTORS (2 Enterprise Data Warehouse Tables)
# ══════════════════════════════════════════════════════════════════════════════

class FactCorpActions(Base):
    """FACT_CORP_ACTIONS (FCAC, 49 Columns) — Corporate Actions & Announcements"""
    __tablename__ = "FACT_CORP_ACTIONS"

    id:                            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    Fcac_Exch_Token:               Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=1)
    Fcac_Cmp_Token:                Mapped[int]           = mapped_column(BigInteger, nullable=False, index=True)
    Fcac_Trd_Prd_Token:            Mapped[int]           = mapped_column(Integer, nullable=False, default=1)
    Fcac_Symbol:                   Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    Fcac_Series:                   Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default="EQ")
    Fcac_Ind_Token:                Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Fcac_Cmp_Id:                   Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    Fcac_Cmp_Name:                 Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    Fcac_Ind_Id:                   Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    Fcac_ISIN:                     Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    Fcac_Issd_Shares:              Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Fcac_Face_Val:                 Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Fcac_Listng_Date:              Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_Iss_Start_Date:           Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_Iss_End_Date:             Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_Corp_Action_Catg:         Mapped[Optional[str]] = mapped_column(String(30), nullable=True) # BN, DP, SS, ET, etc.
    Fcac_Corp_Action_Type:         Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True) # 1=Bonus, 3=Dividend, 6=Stock Split
    Fcac_Divnd_Prpse_Indc:         Mapped[Optional[str]] = mapped_column(String(1), nullable=True)
    Fcac_Intrm_Final_Flag:         Mapped[Optional[str]] = mapped_column(String(1), nullable=True)
    Fcac_Mod_Date:                 Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_Divnd_Pct:                Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fcac_Divnd_Val:                Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Fcac_Ex_Divnd_Date:            Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_Bonus_Ratio:              Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    Fcac_Ex_Bonus_Date:            Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_Rights_Ratio:             Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    Fcac_Ex_Rights_Date:           Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_Split_Ratio:              Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Fcac_Ex_Split_Date:            Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_Offer_Type_Indc:          Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    Fcac_Issue_Val:                Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Fcac_Arngmt_Schema:            Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fcac_Ex_Arngmt_Schema_Date:    Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_Paid_Up_Val:              Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Fcac_Prem_Val:                 Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Fcac_BC_Start_Date:            Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_BC_End_Date:              Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_CA_Rec_Date:              Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_ND_Start_Date:            Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_ND_End_Date:              Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcac_Divnd_Prpse:              Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fcac_Rights_Prpse:             Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fcac_Bonus_Prpse:              Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fcac_Int_Prpse:                Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fcac_Split_Prpse:              Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fcac_Agm_Prpse:                Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fcac_Egm_Prpse:                Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fcac_Other_Prpse:              Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    Fcac_Rec_Date:                 Mapped[date]          = mapped_column(Date, nullable=False, index=True)


class FactCaDilFctr(Base):
    """FACT_CA_DIL_FCTR (FCDF, 13 Columns) — Corporate Actions Dilution Factor"""
    __tablename__ = "FACT_CA_DIL_FCTR"

    id:                            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    Fcdf_Exch_Token:               Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=1)
    Fcdf_Cmp_Token:                Mapped[int]           = mapped_column(BigInteger, nullable=False, index=True)
    Fcdf_NSE_Trd_Prd_Token:        Mapped[int]           = mapped_column(Integer, nullable=False, default=1)
    Fcdf_BSE_Trd_Prd_Token:        Mapped[int]           = mapped_column(Integer, nullable=False, default=2)
    Fcdf_Symbol:                   Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    Fcdf_Corp_Action_Catg:         Mapped[Optional[str]] = mapped_column(String(30), nullable=True) # BN, DP, SS, ET
    Fcdf_Corp_Action_Type:         Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    Fcdf_Appl_From_Date:           Mapped[date]          = mapped_column(Date, nullable=False, index=True)
    Fcdf_Appl_To_Date:             Mapped[date]          = mapped_column(Date, nullable=False)
    Fcdf_Price_Adj_Factor:         Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True) # Dilution Factor e.g. 0.500000
    Fcdf_Process_Stat:             Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    Fcdf_Mod_Date:                 Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    Fcdf_Rec_Date:                 Mapped[Optional[date]] = mapped_column(Date, nullable=True)


# ══════════════════════════════════════════════════════════════════════════════
#  SYS_USERS & SYS_AUDIT_LOGS (Enterprise Security, RBAC & Audit Trail)
# ══════════════════════════════════════════════════════════════════════════════

class SysUser(Base):
    __tablename__ = "SYS_USERS"

    id:              Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    username:        Mapped[str]           = mapped_column(String(50), unique=True, nullable=False, index=True)
    email:           Mapped[str]           = mapped_column(String(100), unique=True, nullable=False)
    full_name:       Mapped[str]           = mapped_column(String(100), nullable=False)
    department:      Mapped[str]           = mapped_column(String(100), nullable=False, default="Market Conduct")
    hashed_password: Mapped[str]           = mapped_column(String(128), nullable=False)
    role:            Mapped[str]           = mapped_column(String(20), nullable=False, default="Analyst") # Admin, Analyst, Viewer
    is_active:       Mapped[bool]          = mapped_column(Boolean, nullable=False, default=True)
    created_at:      Mapped[datetime]      = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    last_login_at:   Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class SysAuditLog(Base):
    __tablename__ = "SYS_AUDIT_LOGS"

    id:         Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp:  Mapped[datetime]      = mapped_column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    username:   Mapped[str]           = mapped_column(String(50), nullable=False, index=True)
    role:       Mapped[str]           = mapped_column(String(20), nullable=False)
    action:     Mapped[str]           = mapped_column(String(50), nullable=False, index=True) # UPDATE_WEIGHTS, CHANGE_ROLE, LOGIN, VIEW_KYC
    target:     Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    details:    Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True, default="127.0.0.1")


# ══════════════════════════════════════════════════════════════════════════════
#  FORENSIC_CASES — Surveillance Case Dossier Management
# ══════════════════════════════════════════════════════════════════════════════

class ForensicCase(Base):
    """
    Persists forensic investigation dossiers opened by surveillance officers.

    Status lifecycle:
        Draft → Open Investigation → Pending Action → Closed

    Evidence items are stored as a JSON-encoded list in `evidence_json`
    (column-level JSON is not universally supported in SQLite + Teradata the
    same way, so we use a TEXT column and parse in the service layer).
    """
    __tablename__ = "FORENSIC_CASES"

    id:                    Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id:               Mapped[str]           = mapped_column(String(60),  unique=True, nullable=False, index=True)
    target_symbol:         Mapped[str]           = mapped_column(String(20),  nullable=False, index=True)
    title:                 Mapped[str]           = mapped_column(String(300), nullable=False)
    lead_officer:          Mapped[str]           = mapped_column(String(100), nullable=False)
    # Status: Draft | Open Investigation | Pending Action | Closed
    status:                Mapped[str]           = mapped_column(String(30),  nullable=False, default="Draft", index=True)
    # Priority: High | Medium | Low
    priority:              Mapped[str]           = mapped_column(String(10),  nullable=False, default="Medium")
    description:           Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    # JSON array of evidence objects: [{title, description, type}]
    evidence_json:         Mapped[Optional[str]] = mapped_column(String(5000), nullable=True)
    created_at:            Mapped[datetime]      = mapped_column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at:            Mapped[datetime]      = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    closed_at:             Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    # Officer who created the dossier (links to SysUser.username)
    created_by:            Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    __table_args__ = (
        Index("ix_fcases_symbol_status", "target_symbol", "status"),
    )


# ══════════════════════════════════════════════════════════════════════════════
#  2.1 TRADE AGGREGATE TABLES (3 Key Enterprise Warehouse Aggregate Tables)
# ══════════════════════════════════════════════════════════════════════════════

class AggSecDay(Base):
    """
    AGG_SEC_DAY (ASD, 83 Columns) — Aggregate Security Day
    Stores day-wise trading product level aggregates including Open, High, Low,
    Closing Price (30-min VWAP), Prev Close, Circuit Limits, and Wash Trades.
    """
    __tablename__ = "AGG_SEC_DAY"

    id:                            Mapped[int]               = mapped_column(Integer, primary_key=True, autoincrement=True)
    Asd_Date:                      Mapped[date]              = mapped_column(Date, nullable=False, index=True)
    Asd_Trd_Prd_Token:            Mapped[int]               = mapped_column(BigInteger, nullable=False, default=1)
    Asd_Lot_Qty:                   Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Asd_Exch_Token:               Mapped[int]               = mapped_column(SmallInteger, nullable=False, default=1)
    Asd_Seg_Token:                Mapped[int]               = mapped_column(SmallInteger, nullable=False, default=1)
    Asd_Sub_Seg_Code:              Mapped[int]               = mapped_column(SmallInteger, nullable=False, default=1)
    Asd_Cmp_Token:                Mapped[int]               = mapped_column(BigInteger, nullable=False, index=True)
    Asd_Symbol:                   Mapped[Optional[str]]     = mapped_column(String(10), nullable=True, index=True)
    Asd_Tot_Qty:                   Mapped[Decimal]           = mapped_column(Numeric(20, 3), nullable=False)
    Asd_Tot_Val:                   Mapped[Decimal]           = mapped_column(Numeric(20, 2), nullable=False)
    Asd_Tot_Cnt:                   Mapped[int]               = mapped_column(BigInteger, nullable=False)
    Asd_Tot_Wash_Qty:              Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Asd_Tot_Wash_Val:              Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Asd_Tot_Wash_Cnt:              Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Asd_Above_Ltp_Cnt:             Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Asd_Below_Ltp_Cnt:             Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Asd_At_Ltp_Cnt:                Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Asd_Pos_Cont_Val:              Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Asd_Neg_Cont_Val:              Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Asd_Open_Price:                Mapped[Decimal]           = mapped_column(Numeric(15, 6), nullable=False)
    Asd_Close_Price:               Mapped[Decimal]           = mapped_column(Numeric(15, 6), nullable=False, index=True)
    Asd_High_Price:                Mapped[Decimal]           = mapped_column(Numeric(15, 6), nullable=False)
    Asd_Low_Price:                 Mapped[Decimal]           = mapped_column(Numeric(15, 6), nullable=False)
    Asd_Last_Trd_Price:            Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Asd_Net_Mkt_Val:               Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Asd_Net_Mkt_Qty:               Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Asd_Tick_Price:                Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Asd_Low_Crct_Pct:              Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Asd_Upp_Crct_Pct:              Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    Asd_Low_Crct_Price:            Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Asd_Upp_Crct_Price:            Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Asd_Prev_Close_Price:          Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Asd_52_Week_High_Price:        Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Asd_52_Week_Low_Price:         Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Asd_Prev_OI:                   Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Asd_OI:                        Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Asd_Chng_OI:                   Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Asd_Life_High_Price:           Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Asd_Life_Low_Price:            Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Asd_Sett_Price:                Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Asd_52_Week_High_Date:         Mapped[Optional[date]]    = mapped_column(Date, nullable=True)
    Asd_52_Week_Low_Date:          Mapped[Optional[date]]    = mapped_column(Date, nullable=True)
    Asd_Life_High_Date:            Mapped[Optional[date]]    = mapped_column(Date, nullable=True)
    Asd_Life_Low_Date:             Mapped[Optional[date]]    = mapped_column(Date, nullable=True)
    Asd_Face_Val:                  Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Asd_Issd_Cap_Shares:           Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Asd_Net_Mkt_Cap:               Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Asd_Weightage_Pct:             Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 5), nullable=True)
    Asd_Beta_Pct:                  Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 5), nullable=True)
    Asd_R_Sq_Pct:                  Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 5), nullable=True)
    Asd_Impact_Price:              Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Asd_Dma_Cnt:                   Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Asd_Dma_Qty:                   Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Asd_Dma_Val:                   Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Asd_Algo_Cnt:                  Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Asd_Algo_Qty:                  Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Asd_Algo_Val:                  Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)

    __table_args__ = (
        Index("ix_asd_symbol_date", "Asd_Symbol", "Asd_Date"),
    )


class AggClntSecDay(Base):
    """
    AGG_CLNT_SEC_DAY (ACSD, 31 Columns) — Aggregate Client Security Day
    Stores day-wise Client & Trading Product level aggregates including buy/sell
    volumes, buy/sell values, wash trades, and LTP contribution values.
    """
    __tablename__ = "AGG_CLNT_SEC_DAY"

    id:                            Mapped[int]               = mapped_column(Integer, primary_key=True, autoincrement=True)
    Acsd_Date:                     Mapped[date]              = mapped_column(Date, nullable=False, index=True)
    Acsd_Trd_Prd_Token:           Mapped[int]               = mapped_column(BigInteger, nullable=False, default=1)
    Acsd_Exch_Clnt_Token:          Mapped[int]               = mapped_column(BigInteger, nullable=False, index=True)
    Acsd_Clnt_Token:               Mapped[int]               = mapped_column(BigInteger, nullable=False, index=True)
    Acsd_Exch_Token:              Mapped[int]               = mapped_column(SmallInteger, nullable=False, default=1)
    Acsd_Seg_Token:               Mapped[int]               = mapped_column(SmallInteger, nullable=False, default=1)
    Acsd_Sub_Seg_Code:             Mapped[int]               = mapped_column(SmallInteger, nullable=False, default=1)
    Acsd_Cmp_Token:               Mapped[int]               = mapped_column(BigInteger, nullable=False, index=True)
    Acsd_Buy_Tot_Qty:              Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Acsd_Sell_Tot_Qty:             Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Acsd_Buy_Tot_Val:              Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Acsd_Sell_Tot_Val:             Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Acsd_Buy_Tot_Cnt:              Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Acsd_Sell_Tot_Cnt:             Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Acsd_Buy_Wash_Qty:             Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Acsd_Buy_Wash_Val:             Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Acsd_Buy_Wash_Cnt:             Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Acsd_Sell_Wash_Qty:            Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Acsd_Sell_Wash_Val:            Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Acsd_Sell_Wash_Cnt:            Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Acsd_Buy_Aggr_Qty:             Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Acsd_Sell_Aggr_Qty:            Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Acsd_Above_Ltp_Cnt:            Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Acsd_Below_Ltp_Cnt:            Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Acsd_At_Ltp_Cnt:               Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Acsd_Pos_Cont_Val:             Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Acsd_Neg_Cont_Val:             Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Acsd_Buy_Turnover_Val:         Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Acsd_Sell_Turnover_Val:        Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)

    __table_args__ = (
        Index("ix_acsd_clnt_date", "Acsd_Exch_Clnt_Token", "Acsd_Date"),
        Index("ix_acsd_cmp_date",  "Acsd_Cmp_Token", "Acsd_Date"),
    )


class AggPanPairDay(Base):
    """
    AGG_PAN_PAIR_DAY (APPD, 60 Columns) — Aggregate PAN Pair Day
    Stores day-wise concentration of buyer-seller PAN pairs, counterparty trade counts,
    volume, value, positive/negative price contributions, and high/low hits.
    """
    __tablename__ = "AGG_PAN_PAIR_DAY"

    id:                            Mapped[int]               = mapped_column(Integer, primary_key=True, autoincrement=True)
    Appd_Date:                     Mapped[date]              = mapped_column(Date, nullable=False, index=True)
    Appd_Exch_Token:              Mapped[int]               = mapped_column(SmallInteger, nullable=False, default=1)
    Appd_Seg_Token:               Mapped[int]               = mapped_column(SmallInteger, nullable=False, default=1)
    Appd_Sub_Seg_Code:             Mapped[int]               = mapped_column(SmallInteger, nullable=False, default=1)
    Appd_Cmp_Token:                Mapped[int]               = mapped_column(BigInteger, nullable=False, index=True)
    Appd_Trd_Prd_Token:            Mapped[int]               = mapped_column(BigInteger, nullable=False, default=1)
    Appd_Sess_type:                Mapped[int]               = mapped_column(SmallInteger, nullable=False, default=2)
    Appd_Lot_Qty:                  Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Appd_Exch_TM_Token:            Mapped[int]               = mapped_column(BigInteger, nullable=False, index=True)
    Appd_TM_Token:                 Mapped[int]               = mapped_column(BigInteger, nullable=False)
    Appd_Exch_Clnt_Token:          Mapped[int]               = mapped_column(BigInteger, nullable=False, index=True)
    Appd_Clnt_Token:               Mapped[int]               = mapped_column(BigInteger, nullable=False, index=True)
    Appd_Clnt_Catg_Type:           Mapped[Optional[int]]     = mapped_column(SmallInteger, nullable=True)
    Appd_Trdr_Token:               Mapped[Optional[int]]     = mapped_column(Integer, nullable=True)
    Appd_CP_Token:                 Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Appd_CTCL_Ref:                 Mapped[Optional[str]]     = mapped_column(String(20), nullable=True)
    Appd_CTCL_Zone:                Mapped[Optional[int]]     = mapped_column(SmallInteger, nullable=True)
    Appd_CTCL_Pin:                 Mapped[Optional[int]]     = mapped_column(Integer, nullable=True)
    Appd_CTCL_State:               Mapped[Optional[int]]     = mapped_column(SmallInteger, nullable=True)
    Appd_Inet_DMA_Flag:            Mapped[Optional[int]]     = mapped_column(SmallInteger, nullable=True)
    Appd_Algo_Flag:                Mapped[Optional[int]]     = mapped_column(SmallInteger, nullable=True)
    Appd_Cpty_TM_Token:            Mapped[int]               = mapped_column(BigInteger, nullable=False)
    Appd_Cpty_Exch_TM_Token:       Mapped[int]               = mapped_column(BigInteger, nullable=False, index=True)
    Appd_Cpty_Clnt_Token:          Mapped[int]               = mapped_column(BigInteger, nullable=False, index=True)
    Appd_Cpty_Exch_Clnt_Token:     Mapped[int]               = mapped_column(BigInteger, nullable=False, index=True)
    Appd_Cpty_Clnt_Catg_Type:      Mapped[Optional[int]]     = mapped_column(SmallInteger, nullable=True)
    Appd_Cpty_Trdr_Token:          Mapped[Optional[int]]     = mapped_column(Integer, nullable=True)
    Appd_Cpty_CP_Token:            Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Appd_CPty_CTCL_Ref:            Mapped[Optional[str]]     = mapped_column(String(20), nullable=True)
    Appd_Cpty_CTCL_Zone:           Mapped[Optional[int]]     = mapped_column(SmallInteger, nullable=True)
    Appd_Cpty_CTCL_Pin:            Mapped[Optional[int]]     = mapped_column(Integer, nullable=True)
    Appd_Cpty_CTCL_State:          Mapped[Optional[int]]     = mapped_column(SmallInteger, nullable=True)
    Appd_Cpty_Inet_DMA_Flag:       Mapped[Optional[int]]     = mapped_column(SmallInteger, nullable=True)
    Appd_Cpty_Algo_Flag:           Mapped[Optional[int]]     = mapped_column(SmallInteger, nullable=True)
    Appd_Buy_Tot_Qty:              Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Appd_Sell_Tot_Qty:             Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Appd_Buy_Tot_Val:              Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Appd_Sell_Tot_Val:             Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Appd_Buy_Tot_Cnt:              Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Appd_Sell_Tot_Cnt:             Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Appd_Pos_Contri:               Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Appd_Neg_Contri:               Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Appd_Pos_Contri_Instc_Cnt:     Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Appd_Neg_Contri_Instc_Cnt:     Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Appd_Pos_Contri_Qty:           Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Appd_Neg_Contri_Qty:           Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Appd_Pos_Contri_Val:           Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Appd_Neg_Contri_Val:           Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Appd_Sell_Pos_Contri:          Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Appd_Buy_Neg_Contri:           Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Appd_Sell_Pos_Contri_Cnt:      Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Appd_Buy_Neg_Contri_Cnt:       Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Appd_Sell_Pos_Contri_Qty:      Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Appd_Buy_Neg_Contri_Qty:       Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Appd_Sell_Pos_Contri_Val:      Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Appd_Buy_Neg_Contri_Val:       Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 2), nullable=True)
    Appd_High_Hit_Cnt:             Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Appd_Low_Hit_Cnt:              Mapped[Optional[int]]     = mapped_column(BigInteger, nullable=True)
    Appd_High_Contri:              Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Appd_Low_Contri:               Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)

    __table_args__ = (
        Index("ix_appd_pair_date", "Appd_Exch_Clnt_Token", "Appd_Cpty_Exch_Clnt_Token", "Appd_Date"),
        Index("ix_appd_cmp_date",  "Appd_Cmp_Token", "Appd_Date"),
    )


