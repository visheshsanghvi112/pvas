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
    BigInteger, Date, DateTime, ForeignKey, Index,
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
    Decl_SubBroker_Sebi_Reg_Num:  Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)

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

    # ── Relationships ─────────────────────────────────────────────────────────
    buy_trades:  Mapped[List["FactTrades"]] = relationship(
        "FactTrades", foreign_keys="FactTrades.Ftrd_Buy_Exch_Clnt_Token",
        back_populates="buy_client",
    )
    sell_trades: Mapped[List["FactTrades"]] = relationship(
        "FactTrades", foreign_keys="FactTrades.Ftrd_Sell_Exch_Clnt_Token",
        back_populates="sell_client",
    )

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
    Ddcl_SEBI_Reg_Num:            Mapped[Optional[str]]  = mapped_column(String(50),   nullable=True)
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
#  FACT_TRADES  (FTRD) — Trade Fact Table
# ══════════════════════════════════════════════════════════════════════════════

class FactTrades(Base):
    __tablename__ = "FACT_TRADES"

    # ── Composite PK (matching Teradata spec) ─────────────────────────────────
    Ftrd_Trd_Date:              Mapped[date]    = mapped_column(Date,       primary_key=True, nullable=False)
    Ftrd_Cmp_Token:             Mapped[int]     = mapped_column(Integer,    primary_key=True, nullable=False, index=True)
    Ftrd_Trd_Prd_Token:         Mapped[int]     = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    Ftrd_Exch_Token:            Mapped[int]     = mapped_column(SmallInteger, primary_key=True, nullable=False)
    Ftrd_Seg_Token:             Mapped[int]     = mapped_column(SmallInteger, primary_key=True, nullable=False)
    Ftrd_Trd_Num:               Mapped[int]     = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)

    # ── Trade metadata ────────────────────────────────────────────────────────
    Ftrd_Sess_Type:             Mapped[int]     = mapped_column(SmallInteger, nullable=False)
    Ftrd_Trd_Tmst:              Mapped[datetime]= mapped_column(DateTime,    nullable=False, index=True)
    Ftrd_Trd_Time:              Mapped[Optional[time]] = mapped_column(Time, nullable=True)

    # ── FK tokens ─────────────────────────────────────────────────────────────
    Ftrd_Buy_Exch_TM_Token:     Mapped[int]     = mapped_column(BigInteger, nullable=False, index=True)
    Ftrd_Buy_Trdr_Token:        Mapped[int]     = mapped_column(Integer,    nullable=False)
    Ftrd_Buy_Exch_Clnt_Token:   Mapped[int]     = mapped_column(
        BigInteger,
        ForeignKey("DIM_EXCH_CLNT_DTLS.Decl_Exch_Clnt_Token", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    Ftrd_Sell_Exch_TM_Token:    Mapped[int]     = mapped_column(BigInteger, nullable=False, index=True)
    Ftrd_Sell_Trdr_Token:       Mapped[int]     = mapped_column(Integer,    nullable=False)
    Ftrd_Sell_Exch_Clnt_Token:  Mapped[int]     = mapped_column(
        BigInteger,
        ForeignKey("DIM_EXCH_CLNT_DTLS.Decl_Exch_Clnt_Token", ondelete="RESTRICT"),
        nullable=False, index=True,
    )

    # ── Instrument ────────────────────────────────────────────────────────────
    Ftrd_Symbol:                Mapped[str]              = mapped_column(String(10),       nullable=False, index=True)
    Ftrd_Series:                Mapped[Optional[str]]    = mapped_column(String(2),        nullable=True)
    Ftrd_Sub_Seg_Code:          Mapped[int]              = mapped_column(SmallInteger,     nullable=False)
    Ftrd_Lot_Qty:               Mapped[Optional[Decimal]]= mapped_column(Numeric(20, 3),  nullable=True)
    Ftrd_Tick_Price:            Mapped[Optional[Decimal]]= mapped_column(Numeric(15, 6),  nullable=True)
    Ftrd_Exch_Trd_Prd_Num:     Mapped[Optional[int]]    = mapped_column(Integer,          nullable=True)

    # ── Trade core ────────────────────────────────────────────────────────────
    Ftrd_Trd_Qty:               Mapped[Decimal] = mapped_column(Numeric(20, 3), nullable=False)
    Ftrd_Trd_Price:             Mapped[Decimal] = mapped_column(Numeric(15, 6), nullable=False)
    Ftrd_Trd_Val:               Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)

    # ── Buy order ─────────────────────────────────────────────────────────────
    Ftrd_Buy_Ord_Num:           Mapped[int]              = mapped_column(BigInteger,  nullable=False)
    Ftrd_Buy_Acct_Type:         Mapped[int]              = mapped_column(SmallInteger, nullable=False)
    Ftrd_Buy_CA_Catg:           Mapped[Optional[str]]    = mapped_column(String(30),  nullable=True)
    Ftrd_Buy_CP_Token:          Mapped[Optional[int]]    = mapped_column(BigInteger,  nullable=True)
    Ftrd_Buy_CP_Flag:           Mapped[Optional[str]]    = mapped_column(String(1),   nullable=True)
    Ftrd_Buy_CTCL_Ref:          Mapped[Optional[str]]    = mapped_column(String(20),  nullable=True)
    Ftrd_Buy_IP_Addr:           Mapped[Optional[str]]    = mapped_column(String(40),  nullable=True)
    Ftrd_Buy_Ord_Tmst:          Mapped[datetime]         = mapped_column(DateTime,    nullable=False)
    Ftrd_Buy_Ord_Price:         Mapped[Decimal]          = mapped_column(Numeric(15, 6), nullable=False)
    Ftrd_Buy_Ord_Qty:           Mapped[Decimal]          = mapped_column(Numeric(20, 3), nullable=False)
    Ftrd_Buy_Trig_Price:        Mapped[Optional[Decimal]]= mapped_column(Numeric(15, 6), nullable=True)
    Ftrd_Buy_Book_Type:         Mapped[int]              = mapped_column(SmallInteger, nullable=False)
    Ftrd_Buy_Price_Type:        Mapped[int]              = mapped_column(SmallInteger, nullable=False)
    Ftrd_Buy_Mkt_Flag:          Mapped[str]              = mapped_column(String(1),   nullable=False)
    Ftrd_Buy_Stop_Flag:         Mapped[Optional[str]]    = mapped_column(String(1),   nullable=True)
    Ftrd_Buy_Time_Type:         Mapped[int]              = mapped_column(SmallInteger, nullable=False)
    Ftrd_Buy_Trig_Type:         Mapped[int]              = mapped_column(SmallInteger, nullable=False)
    Ftrd_Buy_FOK_Flag:          Mapped[str]              = mapped_column(String(1),   nullable=False)
    Ftrd_Buy_Qty_Type:          Mapped[int]              = mapped_column(SmallInteger, nullable=False)
    Ftrd_Buy_Ord_Type:          Mapped[int]              = mapped_column(SmallInteger, nullable=False)

    # ── Sell order ────────────────────────────────────────────────────────────
    Ftrd_Sell_Ord_Num:          Mapped[int]              = mapped_column(BigInteger,   nullable=False)
    Ftrd_Sell_Acct_Type:        Mapped[int]              = mapped_column(SmallInteger, nullable=False)
    Ftrd_Sell_CA_Catg:          Mapped[Optional[str]]    = mapped_column(String(30),   nullable=True)
    Ftrd_Sell_CP_Token:         Mapped[Optional[int]]    = mapped_column(BigInteger,   nullable=True)
    Ftrd_Sell_CP_Flag:          Mapped[Optional[str]]    = mapped_column(String(1),    nullable=True)
    Ftrd_Sell_CTCL_Ref:         Mapped[Optional[str]]    = mapped_column(String(20),   nullable=True)
    Ftrd_Sell_IP_Addr:          Mapped[Optional[str]]    = mapped_column(String(40),   nullable=True)
    Ftrd_Sell_Ord_Tmst:         Mapped[datetime]         = mapped_column(DateTime,     nullable=False)
    Ftrd_Sell_Ord_Price:        Mapped[Decimal]          = mapped_column(Numeric(15, 6), nullable=False)
    Ftrd_Sell_Ord_Qty:          Mapped[Decimal]          = mapped_column(Numeric(20, 3), nullable=False)
    Ftrd_Sell_Trig_Price:       Mapped[Optional[Decimal]]= mapped_column(Numeric(15, 6), nullable=True)
    Ftrd_Sell_Book_Type:        Mapped[int]              = mapped_column(SmallInteger,  nullable=False)
    Ftrd_Sell_Price_Type:       Mapped[int]              = mapped_column(SmallInteger,  nullable=False)
    Ftrd_Sell_MKt_Flag:         Mapped[str]              = mapped_column(String(1),     nullable=False)
    Ftrd_Sell_Stop_Flag:        Mapped[Optional[str]]    = mapped_column(String(1),     nullable=True)
    Ftrd_Sell_Time_Type:        Mapped[int]              = mapped_column(SmallInteger,  nullable=False)
    Ftrd_Sell_Trig_Type:        Mapped[int]              = mapped_column(SmallInteger,  nullable=False)
    Ftrd_Sell_FOK_Flag:         Mapped[str]              = mapped_column(String(1),     nullable=False)
    Ftrd_Sell_Qty_Type:         Mapped[int]              = mapped_column(SmallInteger,  nullable=False)
    Ftrd_Sell_Ord_Type:         Mapped[int]              = mapped_column(SmallInteger,  nullable=False)

    # ── Spread / flags ────────────────────────────────────────────────────────
    Ftrd_Buy_Spread_Indc:       Mapped[Optional[str]]    = mapped_column(String(1),    nullable=True)
    Ftrd_Sell_Spread_Indc:      Mapped[Optional[str]]    = mapped_column(String(1),    nullable=True)
    Ftrd_Buy_Spread_Flag:       Mapped[int]              = mapped_column(SmallInteger,  nullable=False, default=0)
    Ftrd_Sell_Spread_Flag:      Mapped[int]              = mapped_column(SmallInteger,  nullable=False, default=0)
    Ftrd_Trd_Mod_Flag:          Mapped[int]              = mapped_column(SmallInteger,  nullable=False, default=0)
    Ftrd_Trd_Can_Flag:          Mapped[int]              = mapped_column(SmallInteger,  nullable=False, default=0)

    # ── Original client refs ──────────────────────────────────────────────────
    Ftrd_Buy_Orig_Clnt_Id:      Mapped[Optional[str]]    = mapped_column(String(16),   nullable=True)
    Ftrd_BOrig_Exch_Clnt_Token: Mapped[Optional[int]]    = mapped_column(BigInteger,   nullable=True)
    Ftrd_Buy_Orig_Cp_Flag:      Mapped[Optional[str]]    = mapped_column(String(1),    nullable=True)
    Ftrd_Buy_Orig_Cp_Id:        Mapped[Optional[str]]    = mapped_column(String(12),   nullable=True)
    Ftrd_Buy_Orig_CP_Token:     Mapped[Optional[int]]    = mapped_column(BigInteger,   nullable=True)
    Ftrd_Sell_Orig_Clnt_Id:     Mapped[Optional[str]]    = mapped_column(String(16),   nullable=True)
    Ftrd_SOrig_Exch_Clnt_Token: Mapped[Optional[int]]    = mapped_column(BigInteger,   nullable=True)
    Ftrd_Sell_Orig_Cp_Flag:     Mapped[Optional[str]]    = mapped_column(String(1),    nullable=True)
    Ftrd_Sell_Orig_Cp_Id:       Mapped[Optional[str]]    = mapped_column(String(12),   nullable=True)
    Ftrd_Sell_Orig_CP_Token:    Mapped[Optional[int]]    = mapped_column(BigInteger,   nullable=True)

    # ── Initiator / wash ──────────────────────────────────────────────────────
    Ftrd_Init_Side_Type:        Mapped[int]  = mapped_column(SmallInteger, nullable=False)
    Ftrd_Init_Clnt_Token:       Mapped[int]  = mapped_column(BigInteger,   nullable=False, index=True)
    Ftrd_Same_Broker_Wash_Flag: Mapped[int]  = mapped_column(SmallInteger, nullable=False, default=0, index=True)
    Ftrd_Diff_Broker_Wash_Flag: Mapped[int]  = mapped_column(SmallInteger, nullable=False, default=0)

    # ── Diff fields ───────────────────────────────────────────────────────────
    Ftrd_Buy_Sell_Diff_Time:    Mapped[Optional[str]]     = mapped_column(String(20),    nullable=True)
    Ftrd_Buy_Sell_Diff_Price:   Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6),nullable=True)
    Ftrd_Buy_Sell_Diff_Qty:     Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3),nullable=True)

    # ── LTP ───────────────────────────────────────────────────────────────────
    Ftrd_Last_Trd_Price:        Mapped[Decimal] = mapped_column(Numeric(15, 6), nullable=False)
    Ftrd_LTP_Chng_Indc:         Mapped[str]     = mapped_column(String(1),      nullable=False)

    # ── CTCL flags (buy) ──────────────────────────────────────────────────────
    Ftrd_Buy_CTCL_Inet_DMA_Flag: Mapped[Optional[int]]   = mapped_column(SmallInteger, nullable=True)
    Ftrd_Buy_CTCL_Algo_Flag:     Mapped[Optional[int]]   = mapped_column(SmallInteger, nullable=True, index=True)
    Ftrd_Buy_CTCL_Pin:           Mapped[Optional[int]]   = mapped_column(Integer,      nullable=True)
    Ftrd_Buy_CTCL_State:         Mapped[Optional[int]]   = mapped_column(SmallInteger, nullable=True)
    Ftrd_Buy_CTCL_Zone:          Mapped[Optional[int]]   = mapped_column(SmallInteger, nullable=True)

    # ── CTCL flags (sell) ─────────────────────────────────────────────────────
    Ftrd_Sell_CTCL_Inet_DMA_Flag: Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)
    Ftrd_Sell_CTCL_Algo_Flag:     Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True, index=True)
    Ftrd_Sell_CTCL_Pin:           Mapped[Optional[int]]  = mapped_column(Integer,      nullable=True)
    Ftrd_Sell_CTCL_State:         Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)
    Ftrd_Sell_CTCL_Zone:          Mapped[Optional[int]]  = mapped_column(SmallInteger, nullable=True)

    # ── Order book depth ──────────────────────────────────────────────────────
    Ftrd_Best_Bid_Price:         Mapped[Decimal] = mapped_column(Numeric(15, 6), nullable=False)
    Ftrd_Best_Ask_Price:         Mapped[Decimal] = mapped_column(Numeric(15, 6), nullable=False)
    Ftrd_Best_Bid_Qty:           Mapped[Decimal] = mapped_column(Numeric(20, 3), nullable=False)
    Ftrd_Best_Ask_Qty:           Mapped[Decimal] = mapped_column(Numeric(20, 3), nullable=False)
    Ftrd_Best_Bid_Ord_Cnt:       Mapped[int]     = mapped_column(BigInteger,     nullable=False)
    Ftrd_Best_Ask_Ord_Cnt:       Mapped[int]     = mapped_column(BigInteger,     nullable=False)
    Ftrd_Bid_Pdg_Ord_Cnt:        Mapped[int]     = mapped_column(BigInteger,     nullable=False)
    Ftrd_Ask_Pdg_Ord_Cnt:        Mapped[int]     = mapped_column(BigInteger,     nullable=False)
    Ftrd_Bid_Pdg_Ord_Qty:        Mapped[Decimal] = mapped_column(Numeric(20, 3), nullable=False)
    Ftrd_Ask_Pdg_Ord_Qty:        Mapped[Decimal] = mapped_column(Numeric(20, 3), nullable=False)
    Ftrd_Bid_Pdg_Ord_Val:        Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    Ftrd_Ask_Pdg_Ord_Val:        Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)

    # ── Remaining qty / band ──────────────────────────────────────────────────
    Ftrd_Buy_Prev_Rmng_Qty:      Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Ftrd_Sell_Prev_Rmng_Qty:     Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 3), nullable=True)
    Ftrd_Last_Estd_Hi_Price:     Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Ftrd_Last_Estd_Low_Price:    Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    Ftrd_Hi_Hit_Flag:            Mapped[Optional[str]]     = mapped_column(String(1),      nullable=True)
    Ftrd_Low_Hit_Flag:           Mapped[Optional[str]]     = mapped_column(String(1),      nullable=True)
    Ftrd_Last_Hi_Trd_Num:        Mapped[Optional[int]]     = mapped_column(BigInteger,     nullable=True)
    Ftrd_Last_Low_Trd_Num:       Mapped[Optional[int]]     = mapped_column(BigInteger,     nullable=True)

    # ── Algo IDs ──────────────────────────────────────────────────────────────
    FTRD_BUY_ALGO_ID:            Mapped[Optional[str]]     = mapped_column(String(50),  nullable=True)
    FTRD_SELL_ALGO_ID:           Mapped[Optional[str]]     = mapped_column(String(50),  nullable=True)
    FTRD_BUY_ALGO_CATG_TYPE:     Mapped[Optional[int]]     = mapped_column(Integer,     nullable=True)
    FTRD_SELL_ALGO_CATG_TYPE:    Mapped[Optional[int]]     = mapped_column(Integer,     nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    buy_client:  Mapped["DimExchClntDtls"] = relationship(
        "DimExchClntDtls",
        foreign_keys=[Ftrd_Buy_Exch_Clnt_Token],
        back_populates="buy_trades",
    )
    sell_client: Mapped["DimExchClntDtls"] = relationship(
        "DimExchClntDtls",
        foreign_keys=[Ftrd_Sell_Exch_Clnt_Token],
        back_populates="sell_trades",
    )

    __table_args__ = (
        Index("ix_ftrd_symbol_date", "Ftrd_Symbol", "Ftrd_Trd_Date"),
        Index("ix_ftrd_wash",        "Ftrd_Same_Broker_Wash_Flag", "Ftrd_Trd_Date"),
        Index("ix_ftrd_buy_tm",      "Ftrd_Buy_Exch_TM_Token",  "Ftrd_Trd_Date"),
        Index("ix_ftrd_sell_tm",     "Ftrd_Sell_Exch_TM_Token", "Ftrd_Trd_Date"),
    )
