"""
backend/db/models.py
────────────────────────────────────────────────────────────────────────────
Declarative SQLAlchemy 2.0 ORM models for Price-Volume Alert Surveillance Framework.

Purely aligned with PVASF_CORE_SPEC.md and DATA_REQUEST_SPEC.md.
Standard, non-proprietary relational entities:
  1.  ClientIdentityMaster     (client_identity_master)
  2.  ClientDematAccount       (client_demat_accounts)
  3.  DailyMarketEod           (daily_market_eod)
  4.  MarketBaselineStat       (market_baseline_stats)
  5.  ParticipantDailyTrade    (participant_daily_trades)
  6.  CounterpartyTradePair    (counterparty_trade_pairs)
  7.  ShareholdingSummary      (shareholding_summary)
  8.  LargeShareholdersRegistry(large_shareholders_registry)
  9.  CorporateEventsFeed      (corporate_events_feed)
  10. PriceDilutionFactor      (price_dilution_factors)
  11. TradingSessionCalendar   (trading_session_calendar)
  12. BrokerDailySummary       (broker_daily_summary)
  13. SurveillanceAlertCase    (surveillance_alert_cases)
  14. SysUser                  (portal_user_accounts)
  15. SysAuditLog              (compliance_audit_logs)
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.database import Base


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 1: Client KYC & Demat Account Registry
# ══════════════════════════════════════════════════════════════════════════════

class ClientIdentityMaster(Base):
    __tablename__ = "client_identity_master"

    client_pan:         Mapped[str]           = mapped_column(String(10), primary_key=True)
    client_legal_name:  Mapped[str]           = mapped_column(String(250), nullable=False)
    entity_type:        Mapped[str]           = mapped_column(String(30), nullable=False)  # INDIVIDUAL, CORPORATE, PROMOTER, etc.
    account_state:      Mapped[str]           = mapped_column(String(20), nullable=False, default="ACTIVE")
    residential_city:   Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    registration_date:  Mapped[date]          = mapped_column(Date, nullable=False)
    risk_profile_grade: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default="STANDARD")

    demat_accounts:     Mapped[list[ClientDematAccount]] = relationship("ClientDematAccount", back_populates="client")


class ClientDematAccount(Base):
    __tablename__ = "client_demat_accounts"

    account_id:          Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_pan:          Mapped[str]           = mapped_column(String(10), ForeignKey("client_identity_master.client_pan"), nullable=False, index=True)
    depository_id:       Mapped[str]           = mapped_column(String(16), nullable=False)  # DP ID (e.g. IN300123)
    beneficiary_acc_no:  Mapped[str]           = mapped_column(String(20), nullable=False, unique=True)
    account_open_date:   Mapped[date]          = mapped_column(Date, nullable=False)
    joint_holder_pan_2:  Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    joint_holder_pan_3:  Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    is_poa_active:       Mapped[bool]          = mapped_column(Boolean, nullable=False, default=False)
    bank_account_masked: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    client:              Mapped[ClientIdentityMaster] = relationship("ClientIdentityMaster", back_populates="demat_accounts")


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 2: Daily Market Prices & Baseline Statistics
# ══════════════════════════════════════════════════════════════════════════════

class DailyMarketEod(Base):
    __tablename__ = "daily_market_eod"

    record_id:              Mapped[int]             = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol:                 Mapped[str]             = mapped_column(String(20), nullable=False, index=True)
    trade_date:             Mapped[date]            = mapped_column(Date, nullable=False, index=True)
    isin:                   Mapped[str]             = mapped_column(String(12), nullable=False)
    company_name:           Mapped[str]             = mapped_column(String(200), nullable=False, default="")
    open_price:             Mapped[float]           = mapped_column(Numeric(15, 2), nullable=False)
    day_high_price:         Mapped[float]           = mapped_column(Numeric(15, 2), nullable=False)
    day_low_price:          Mapped[float]           = mapped_column(Numeric(15, 2), nullable=False)
    close_price:            Mapped[float]           = mapped_column(Numeric(15, 2), nullable=False)
    total_traded_quantity:  Mapped[int]             = mapped_column(BigInteger, nullable=False)
    total_traded_value:     Mapped[float]           = mapped_column(Numeric(20, 2), nullable=False)
    upper_circuit_limit:    Mapped[float]           = mapped_column(Numeric(15, 2), nullable=False)
    lower_circuit_limit:    Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    delivery_quantity:      Mapped[Optional[int]]   = mapped_column(BigInteger, nullable=True)
    prev_close_price:       Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    week_52_high_price:     Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    week_52_low_price:      Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    base_price_180d:        Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    baseline_volume_mean:   Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    baseline_volume_std:    Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)

    __table_args__ = (
        UniqueConstraint("symbol", "trade_date", name="uk_market_symbol_date"),
    )


class MarketBaselineStat(Base):
    __tablename__ = "market_baseline_stats"

    stat_id:              Mapped[int]             = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol:               Mapped[str]             = mapped_column(String(20), nullable=False, index=True)
    trade_date:           Mapped[date]            = mapped_column(Date, nullable=False)
    base_price_180d:      Mapped[float]           = mapped_column(Numeric(15, 2), nullable=False)
    baseline_volume_mean: Mapped[float]           = mapped_column(Numeric(18, 2), nullable=False)
    baseline_volume_std:  Mapped[float]           = mapped_column(Numeric(18, 2), nullable=False)
    return_mean_180d:     Mapped[Optional[float]] = mapped_column(Numeric(12, 6), nullable=True, default=0.0)
    return_std_180d:      Mapped[Optional[float]] = mapped_column(Numeric(12, 6), nullable=True, default=0.02)
    peak_high_180d:       Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 3: Participant Level Metrics
# ══════════════════════════════════════════════════════════════════════════════

class ParticipantDailyTrade(Base):
    __tablename__ = "participant_daily_trades"

    trade_summary_id:          Mapped[int]             = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol:                    Mapped[str]             = mapped_column(String(20), nullable=False, index=True)
    trade_date:                Mapped[date]            = mapped_column(Date, nullable=False)
    client_pan:                Mapped[str]             = mapped_column(String(10), ForeignKey("client_identity_master.client_pan"), nullable=False, index=True)
    client_legal_name:         Mapped[Optional[str]]   = mapped_column(String(250), nullable=True)
    trading_member_id:         Mapped[Optional[str]]   = mapped_column(String(20), nullable=True)
    buy_quantity:              Mapped[int]             = mapped_column(BigInteger, nullable=False, default=0)
    sell_quantity:             Mapped[int]             = mapped_column(BigInteger, nullable=False, default=0)
    buy_turnover_value:        Mapped[float]           = mapped_column(Numeric(20, 2), nullable=False, default=0.0)
    sell_turnover_value:       Mapped[float]           = mapped_column(Numeric(20, 2), nullable=False, default=0.0)
    gross_positive_ltp_value:  Mapped[float]           = mapped_column(Numeric(20, 2), nullable=False, default=0.0)
    gross_negative_ltp_value:  Mapped[float]           = mapped_column(Numeric(20, 2), nullable=False, default=0.0)
    same_broker_wash_quantity: Mapped[Optional[int]]   = mapped_column(BigInteger, nullable=True, default=0)
    buy_trade_count:           Mapped[Optional[int]]   = mapped_column(BigInteger, nullable=True, default=0)
    sell_trade_count:          Mapped[Optional[int]]   = mapped_column(BigInteger, nullable=True, default=0)
    aggressor_buy_quantity:    Mapped[Optional[int]]   = mapped_column(BigInteger, nullable=True, default=0)
    client_category:           Mapped[Optional[str]]   = mapped_column(String(30), nullable=True, default="INDIVIDUAL")

    __table_args__ = (
        UniqueConstraint("symbol", "trade_date", "client_pan", name="uk_participant_sym_date_pan"),
    )


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 4: Counterparty Concentration & Bilateral Pairs
# ══════════════════════════════════════════════════════════════════════════════

class CounterpartyTradePair(Base):
    __tablename__ = "counterparty_trade_pairs"

    pair_match_id:            Mapped[int]             = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol:                   Mapped[str]             = mapped_column(String(20), nullable=False, index=True)
    trade_date:               Mapped[date]            = mapped_column(Date, nullable=False)
    buyer_pan:                Mapped[str]             = mapped_column(String(10), ForeignKey("client_identity_master.client_pan"), nullable=False, index=True)
    buyer_legal_name:         Mapped[Optional[str]]   = mapped_column(String(250), nullable=True)
    seller_pan:               Mapped[str]             = mapped_column(String(10), ForeignKey("client_identity_master.client_pan"), nullable=False, index=True)
    seller_legal_name:        Mapped[Optional[str]]   = mapped_column(String(250), nullable=True)
    buyer_tm_id:              Mapped[Optional[str]]   = mapped_column(String(20), nullable=True)
    seller_tm_id:             Mapped[Optional[str]]   = mapped_column(String(20), nullable=True)
    matched_quantity:         Mapped[int]             = mapped_column(BigInteger, nullable=False)
    matched_turnover_value:   Mapped[float]           = mapped_column(Numeric(20, 2), nullable=False)
    pairwise_ltp_push_value:  Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True, default=0.0)
    reverse_matched_quantity: Mapped[Optional[int]]   = mapped_column(BigInteger, nullable=True, default=0)
    is_same_broker_wash:      Mapped[bool]            = mapped_column(Boolean, nullable=False, default=False)
    algo_execution_flag:      Mapped[Optional[int]]   = mapped_column(SmallInteger, nullable=True, default=0)


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 5: Shareholder Statistics
# ══════════════════════════════════════════════════════════════════════════════

class ShareholdingSummary(Base):
    __tablename__ = "shareholding_summary"

    filing_id:                   Mapped[int]             = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol:                      Mapped[str]             = mapped_column(String(20), nullable=False, index=True)
    quarter_code:                Mapped[str]             = mapped_column(String(10), nullable=False)
    filing_date:                 Mapped[date]            = mapped_column(Date, nullable=False)
    category_type:               Mapped[str]             = mapped_column(String(40), nullable=False)  # PROMOTER_GROUP, TOP_1_PCT_PUBLIC, GENERAL_PUBLIC_FLOAT
    total_shares_count:          Mapped[int]             = mapped_column(BigInteger, nullable=False)
    holding_percentage:          Mapped[float]           = mapped_column(Numeric(6, 2), nullable=False)
    pledged_shares_percentage:   Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True, default=0.0)
    locked_in_shares_percentage: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True, default=0.0)
    unique_holding_pans:         Mapped[Optional[int]]   = mapped_column(Integer, nullable=True)
    avg_daily_trading_pans:      Mapped[Optional[int]]   = mapped_column(Integer, nullable=True, default=0)

    __table_args__ = (
        UniqueConstraint("symbol", "quarter_code", "category_type", name="uk_shldng_sym_qtr_cat"),
    )


class LargeShareholdersRegistry(Base):
    __tablename__ = "large_shareholders_registry"

    record_id:            Mapped[int]             = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol:               Mapped[str]             = mapped_column(String(20), nullable=False, index=True)
    quarter_code:         Mapped[str]             = mapped_column(String(10), nullable=False)
    holder_pan:           Mapped[str]             = mapped_column(String(10), ForeignKey("client_identity_master.client_pan"), nullable=False)
    holder_legal_name:    Mapped[str]             = mapped_column(String(250), nullable=False)
    holder_category:      Mapped[str]             = mapped_column(String(30), nullable=False)
    shares_held:          Mapped[int]             = mapped_column(BigInteger, nullable=False)
    holding_percentage:   Mapped[float]           = mapped_column(Numeric(6, 2), nullable=False)
    pledged_shares_count: Mapped[Optional[int]]   = mapped_column(BigInteger, nullable=True, default=0)


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 6: Corporate Events & Price Dilution Factors
# ══════════════════════════════════════════════════════════════════════════════

class CorporateEventsFeed(Base):
    __tablename__ = "corporate_events_feed"

    event_id:             Mapped[int]             = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol:               Mapped[str]             = mapped_column(String(20), nullable=False, index=True)
    isin:                 Mapped[str]             = mapped_column(String(12), nullable=False)
    action_category:      Mapped[str]             = mapped_column(String(40), nullable=False)  # BONUS, SPLIT, DIVIDEND, BOARD_MEETING
    announcement_purpose: Mapped[str]             = mapped_column(String(500), nullable=False)
    announcement_date:    Mapped[date]            = mapped_column(Date, nullable=False)
    ex_date:              Mapped[Optional[date]]  = mapped_column(Date, nullable=True)
    record_date:          Mapped[Optional[date]]  = mapped_column(Date, nullable=True)
    ratio_or_value:       Mapped[Optional[str]]   = mapped_column(String(50), nullable=True)
    dilution_factor:      Mapped[Optional[float]] = mapped_column(Numeric(8, 6), nullable=True, default=1.0)


class PriceDilutionFactor(Base):
    __tablename__ = "price_dilution_factors"

    factor_id:        Mapped[int]   = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol:           Mapped[str]   = mapped_column(String(20), nullable=False, index=True)
    split_multiplier: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False)
    valid_from_date:  Mapped[date]  = mapped_column(Date, nullable=False)
    valid_thru_date:  Mapped[date]  = mapped_column(Date, nullable=False, default=date(9999, 12, 31))


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 7: Market Trading Calendar & Broker Totals
# ══════════════════════════════════════════════════════════════════════════════

class TradingSessionCalendar(Base):
    __tablename__ = "trading_session_calendar"

    calendar_date:      Mapped[date]          = mapped_column(Date, primary_key=True)
    is_trading_day:     Mapped[bool]          = mapped_column(Boolean, nullable=False)
    holiday_name:       Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_special_auction: Mapped[bool]          = mapped_column(Boolean, nullable=False, default=False)


class BrokerDailySummary(Base):
    __tablename__ = "broker_daily_summary"

    broker_summary_id:       Mapped[int]   = mapped_column(Integer, primary_key=True, autoincrement=True)
    trading_member_id:       Mapped[str]   = mapped_column(String(20), nullable=False)
    trading_member_name:     Mapped[str]   = mapped_column(String(250), nullable=False)
    symbol:                  Mapped[str]   = mapped_column(String(20), nullable=False)
    trade_date:              Mapped[date]  = mapped_column(Date, nullable=False)
    total_buy_volume:        Mapped[int]   = mapped_column(BigInteger, nullable=False, default=0)
    total_sell_volume:       Mapped[int]   = mapped_column(BigInteger, nullable=False, default=0)
    same_broker_wash_volume: Mapped[int]   = mapped_column(BigInteger, nullable=False, default=0)
    total_turnover_value:    Mapped[float] = mapped_column(Numeric(20, 2), nullable=False, default=0.0)

    __table_args__ = (
        UniqueConstraint("trading_member_id", "symbol", "trade_date", name="uk_broker_sym_date"),
    )


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 8: Alert Cases, User Accounts & Compliance Audit Trail
# ══════════════════════════════════════════════════════════════════════════════

class SurveillanceAlertCase(Base):
    __tablename__ = "surveillance_alert_cases"

    case_reference_id:     Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol:                Mapped[str]           = mapped_column(String(20), nullable=False)
    observation_date:      Mapped[date]          = mapped_column(Date, nullable=False)
    composite_risk_score:  Mapped[float]         = mapped_column(Numeric(5, 2), nullable=False)
    alert_severity_level:  Mapped[str]           = mapped_column(String(15), nullable=False)  # LOW, MEDIUM, HIGH
    surveillance_status:   Mapped[str]           = mapped_column(String(20), nullable=False, default="ACTIVE")
    metric_price_rise_pct: Mapped[float]         = mapped_column(Numeric(8, 2), nullable=False)
    metric_price_zscore:   Mapped[float]         = mapped_column(Numeric(6, 2), nullable=False)
    metric_volume_zscore:  Mapped[float]         = mapped_column(Numeric(6, 2), nullable=False)
    metric_band_hit_days:  Mapped[int]           = mapped_column(Integer, nullable=False)
    metric_new_high_days:  Mapped[int]           = mapped_column(Integer, nullable=False)
    assigned_officer:      Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    investigation_notes:   Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_updated_time:     Mapped[datetime]      = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("symbol", "observation_date", name="uk_alert_sym_date"),
    )


class SysUser(Base):
    """System user accounts and RBAC roles."""
    __tablename__ = "portal_user_accounts"

    id:              Mapped[int]                = mapped_column("user_id", Integer, primary_key=True, autoincrement=True)
    username:        Mapped[str]                = mapped_column(String(50), unique=True, nullable=False, index=True)
    email:           Mapped[str]                = mapped_column(String(100), unique=True, nullable=False, default="")
    full_name:       Mapped[str]                = mapped_column(String(100), nullable=False, default="")
    department:      Mapped[str]                = mapped_column(String(100), nullable=False, default="Market Conduct")
    hashed_password: Mapped[str]                = mapped_column("password_hash", String(255), nullable=False)
    role:            Mapped[str]                = mapped_column("assigned_role", String(20), nullable=False, default="Viewer")
    is_active:       Mapped[bool]               = mapped_column("is_account_active", Boolean, nullable=False, default=True)
    created_at:      Mapped[datetime]           = mapped_column("created_timestamp", DateTime, nullable=False, default=datetime.utcnow)
    last_login_at:   Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class SysAuditLog(Base):
    """Regulatory compliance investigation audit logs."""
    __tablename__ = "compliance_audit_logs"

    id:         Mapped[int]           = mapped_column("log_id", Integer, primary_key=True, autoincrement=True)
    timestamp:  Mapped[datetime]      = mapped_column("log_timestamp", DateTime, nullable=False, default=datetime.utcnow, index=True)
    username:   Mapped[str]           = mapped_column(String(50), nullable=False, index=True)
    role:       Mapped[str]           = mapped_column(String(20), nullable=False, default="Analyst")
    action:     Mapped[str]           = mapped_column("action_code", String(100), nullable=False, index=True)
    target:     Mapped[Optional[str]] = mapped_column("target_entity", String(50), nullable=True)
    details:    Mapped[Optional[str]] = mapped_column("action_narrative", Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column("client_ip_address", String(45), nullable=True, default="127.0.0.1")
