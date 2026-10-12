-- ======================================================================================
-- PRICE-VOLUME ALERT SURVEILLANCE FRAMEWORK (PVASF)
-- RELATIONAL DATABASE SCHEMA & DATA SPECIFICATION
-- ======================================================================================
-- Aligned directly with: PVASF_CORE_SPEC.md
-- Target Dialect: SQLite 3.35+ / PostgreSQL 14+ / ANSI SQL Compliant
-- Design Principle: Standardized, Non-Proprietary Relational Data Model
-- Purpose: Complete data specification guide for data custodians to supply
--          the exact data points required by the PVASF Surveillance Engine.
--
-- ======================================================================================
-- FRAMEWORK MODULES & SPECIFICATION REFERENCE (PVASF_CORE_SPEC.md)
-- ======================================================================================
--  MODULE 1: Client KYC & Demat Account Registry (PVASF_CORE_SPEC §4 & §5.3)
--    * client_identity_master      : Legal entity KYC records (PAN, Entity Type, City, Risk Grade)
--    * client_demat_accounts       : Depository BO accounts, DP IDs, Joint holders, POA status
--
--  MODULE 2: Scrip Master & Daily Market Prices (PVASF_CORE_SPEC §1 & §2 - Shortlisting Metrics)
--    * daily_market_eod            : Consolidated OHLCV, Circuit Price Bands, Traded Value, 52W stats
--    * market_baseline_stats       : Rolling 180-day baseline statistics (Mean, Std Dev, 180D High)
--
--  MODULE 3: Participant Level Metrics - Identifying Suspects (PVASF_CORE_SPEC §4)
--    * participant_daily_trades    : LTP Contribution (§4.1), Volume Share (§4.2), Aggressive Orders
--
--  MODULE 4: Counterparty Concentration & Circular Trading (PVASF_CORE_SPEC §4.3)
--    * counterparty_trade_pairs    : Matched Buyer-Seller Pairs, Circular Trading Rings, Same-Broker Wash
--
--  MODULE 5: Shareholder Statistics (PVASF_CORE_SPEC §5.3)
--    * shareholding_summary        : Promoter %, Top 1% Public %, General Public Float %, Pledged Shares %
--    * large_shareholders_registry : Specific entity breakdown for Promoters and Top 1% Shareholders
--
--  MODULE 6: Corporate Announcements & Price Adjustments (PVASF_CORE_SPEC §2.1.1 & §5.2)
--    * corporate_events_feed       : Announcements for Bonus, Splits, Dividends, Board Meetings
--    * price_dilution_factors      : Historical dilution multipliers for split/bonus baseline adjustment
--
--  MODULE 7: Market Trading Calendar & Broker Totals (PVASF_CORE_SPEC §1 & §2)
--    * trading_session_calendar    : Trading days vs holidays for 15-day and 180-day rolling windows
--    * broker_daily_summary        : Broker-level daily volume and internal cross-trade totals
--
--  MODULE 8: Scrip Scoring, Alert Watchlist & Audit Trail (PVASF_CORE_SPEC §3 & §5)
--    * surveillance_alert_cases    : Scrip Risk Score, Shortlisted Watchlist, Investigation Dashboard
--    * portal_user_accounts        : System user authentication and Role-Based Access Control (RBAC)
--    * compliance_audit_logs       : Regulatory audit trail of officer investigations and mark-safe events
--
-- ======================================================================================
-- DATA REQUIREMENT SUMMARY (ALIGNED TO PVASF_CORE_SPEC.md)
-- ======================================================================================
--  Module Name                      | Target Table               | Frequency | PVASF Core Spec Metric
--  ---------------------------------+----------------------------+-----------+-------------------------------------
--  Scrip Master & Daily Market Data | daily_market_eod           | Daily EOD | §2.1 Price Rise, §2.4 Bands, §2.5 Highs
--  Historical Baseline Statistics   | market_baseline_stats      | Daily/Wk  | §2.2 Price Z-Score, §2.3 Volume Z-Score
--  Participant Trading Conduct      | participant_daily_trades   | Daily EOD | §4.1 LTP Contribution, §4.2 Volume Share
--  Counterparty Trading Pairs       | counterparty_trade_pairs   | Daily EOD | §4.3 Counterparty Concentration
--  Shareholder Statistics           | shareholding_summary       | Quarterly | §5.3 Shareholder Concentration
--  Large Shareholder Registry       | large_shareholders_registry| Quarterly | §5.3.3 Promoter & Top 1% Breakdown
--  Corporate Announcements          | corporate_events_feed      | Daily/AdH | §5.2 Announcements, §2.1 Dilution
--  Price Dilution Adjustment        | price_dilution_factors     | Ad-hoc    | §2.1.1 Baseline Price Normalization
--  Market Trading Calendar          | trading_session_calendar   | Annual/Mo | §1.2 & §2 15-Day / 180-Day Windows
--  Broker Member Summary            | broker_daily_summary       | Daily EOD | Member-level volume concentration
--  Client KYC Master Registry       | client_identity_master     | Monthly   | §4 & §5.3 Connected Group Tracking
--  Client Demat Account Master      | client_demat_accounts      | Monthly   | Depository BO accounts & POA links
-- ======================================================================================

PRAGMA foreign_keys = ON;

-- ======================================================================================
-- MODULE 1: Client KYC & Demat Account Registry (PVASF_CORE_SPEC §4 & §5.3)
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 1.1: client_identity_master
-- Represents verified legal entities (Individual, Corporate, Promoter, FPI) trading on market.
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_identity_master (
    client_pan              VARCHAR(10)     NOT NULL PRIMARY KEY,
    client_legal_name       VARCHAR(250)    NOT NULL,
    entity_type             VARCHAR(30)     NOT NULL, -- 'INDIVIDUAL', 'CORPORATE', 'HUF', 'PROMOTER', 'FPI'
    account_state           VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED', 'DORMANT', 'CLOSED'
    residential_city        VARCHAR(100),
    registration_date       DATE            NOT NULL,
    risk_profile_grade      VARCHAR(10)     DEFAULT 'STANDARD' -- 'LOW', 'STANDARD', 'WATCHLIST', 'HIGH_RISK'
);

-- --------------------------------------------------------------------------------------
-- Table 1.2: client_demat_accounts
-- Depository beneficiary owner (BO) accounts linked to the legal entity PAN.
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_demat_accounts (
    account_id              INTEGER         PRIMARY KEY AUTOINCREMENT,
    client_pan              VARCHAR(10)     NOT NULL,
    depository_id           VARCHAR(16)     NOT NULL, -- NSDL / CDSL DP Registration Code
    beneficiary_acc_no      VARCHAR(20)     NOT NULL UNIQUE,
    account_open_date       DATE            NOT NULL,
    joint_holder_pan_2      VARCHAR(10),              -- Second Joint Account Holder (Connected entity)
    joint_holder_pan_3      VARCHAR(10),              -- Third Joint Account Holder
    is_poa_active           BOOLEAN         NOT NULL DEFAULT FALSE,
    bank_account_masked     VARCHAR(20),
    FOREIGN KEY (client_pan) REFERENCES client_identity_master (client_pan)
);

CREATE INDEX IF NOT EXISTS idx_demat_pan ON client_demat_accounts (client_pan);
CREATE INDEX IF NOT EXISTS idx_demat_joint2 ON client_demat_accounts (joint_holder_pan_2);

-- ======================================================================================
-- MODULE 2: Scrip Master & Daily Market Prices (PVASF_CORE_SPEC §1 & §2)
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 2.1: daily_market_eod
-- Daily consolidated market data feeding Shortlisting Metrics: Price Rise (§2.1), Circuit Bands (§2.4), New Highs (§2.5)
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_market_eod (
    record_id               INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                  VARCHAR(20)     NOT NULL,
    trade_date              DATE            NOT NULL,
    isin                    CHAR(12)        NOT NULL,
    company_name            VARCHAR(200)    NOT NULL DEFAULT '', -- Registered corporate entity name
    open_price              DECIMAL(15, 2)  NOT NULL,
    day_high_price          DECIMAL(15, 2)  NOT NULL,
    day_low_price           DECIMAL(15, 2)  NOT NULL,
    close_price             DECIMAL(15, 2)  NOT NULL, -- Official 30-min VWAP consolidated close
    total_traded_quantity   BIGINT          NOT NULL, -- Combined volume (NSE + BSE)
    total_traded_value      DECIMAL(20, 2)  NOT NULL, -- Combined traded value (NSE + BSE)
    upper_circuit_limit     DECIMAL(15, 2)  NOT NULL, -- Statutory daily upper price band
    lower_circuit_limit     DECIMAL(15, 2),           -- Statutory daily lower price band
    delivery_quantity       BIGINT,                   -- Delivery quantity for Screener Delivery %
    prev_close_price        DECIMAL(15, 2),           -- Previous day consolidated close price
    week_52_high_price      DECIMAL(15, 2),           -- Rolling 52-week highest traded price
    week_52_low_price       DECIMAL(15, 2),           -- Rolling 52-week lowest traded price
    base_price_180d         DECIMAL(15, 2),           -- [Optional inline baseline] T-180 closing price adjusted for splits
    baseline_volume_mean    DECIMAL(18, 2),           -- [Optional inline baseline] 180-day baseline mean daily volume
    baseline_volume_std     DECIMAL(18, 2),           -- [Optional inline baseline] 180-day baseline volume std
    CONSTRAINT uk_market_symbol_date UNIQUE (symbol, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_market_sym_date ON daily_market_eod (symbol, trade_date);
CREATE INDEX IF NOT EXISTS idx_market_date ON daily_market_eod (trade_date);

-- --------------------------------------------------------------------------------------
-- Table 2.2: market_baseline_stats
-- Pre-calculated 180-day historical baseline metrics used for Z-score standardizations.
-- Provided for normalized enterprise database architectures.
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_baseline_stats (
    stat_id                 INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                  VARCHAR(20)     NOT NULL,
    trade_date              DATE            NOT NULL,
    base_price_180d         DECIMAL(15, 2)  NOT NULL, -- Closing price at T-180 (adjusted for splits)
    baseline_volume_mean    DECIMAL(18, 2)  NOT NULL, -- 180-day baseline mean daily volume (mu_V)
    baseline_volume_std     DECIMAL(18, 2)  NOT NULL, -- 180-day baseline volume standard deviation (sigma_V)
    return_mean_180d        DECIMAL(12, 6)  DEFAULT 0.0, -- 180-day baseline mean daily return (mu_R)
    return_std_180d         DECIMAL(12, 6)  DEFAULT 0.02, -- 180-day baseline return standard deviation (sigma_R)
    peak_high_180d          DECIMAL(15, 2),           -- 180-day rolling highest price peak
    FOREIGN KEY (symbol, trade_date) REFERENCES daily_market_eod (symbol, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_baseline_sym_date ON market_baseline_stats (symbol, trade_date);

-- ======================================================================================
-- MODULE 3: Participant Level Metrics - Identifying Suspects (PVASF_CORE_SPEC §4)
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 3.1: participant_daily_trades
-- Daily participant trade summaries for LTP Contribution (§4.1) and Volume Share (§4.2)
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS participant_daily_trades (
    trade_summary_id          INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    trade_date                DATE            NOT NULL,
    client_pan                VARCHAR(10)     NOT NULL,
    client_legal_name         VARCHAR(250),             -- Registered legal name from KYC records
    trading_member_id         VARCHAR(20),              -- Trading Member / Broker ID
    buy_quantity              BIGINT          NOT NULL DEFAULT 0,
    sell_quantity             BIGINT          NOT NULL DEFAULT 0,
    buy_turnover_value        DECIMAL(20, 2)  NOT NULL DEFAULT 0.00,
    sell_turnover_value       DECIMAL(20, 2)  NOT NULL DEFAULT 0.00,
    gross_positive_ltp_value  DECIMAL(20, 2)  NOT NULL DEFAULT 0.00, -- Buy orders lifting ask (+₹ price push)
    gross_negative_ltp_value  DECIMAL(20, 2)  NOT NULL DEFAULT 0.00, -- Sell orders hitting bid (-₹ price pull)
    same_broker_wash_quantity BIGINT          DEFAULT 0,             -- Quantity matched within same broker/account
    buy_trade_count           BIGINT          DEFAULT 0,             -- Number of executed buy trades
    sell_trade_count          BIGINT          DEFAULT 0,             -- Number of executed sell trades
    aggressor_buy_quantity    BIGINT          DEFAULT 0,             -- Buy volume executing as aggressive taker
    client_category           VARCHAR(30)     DEFAULT 'INDIVIDUAL',  -- 'INDIVIDUAL', 'CORPORATE', 'PROMOTER', 'HNI', 'FPI'
    CONSTRAINT uk_participant_sym_date_pan UNIQUE (symbol, trade_date, client_pan),
    FOREIGN KEY (client_pan) REFERENCES client_identity_master (client_pan)
);

CREATE INDEX IF NOT EXISTS idx_part_sym_date ON participant_daily_trades (symbol, trade_date);
CREATE INDEX IF NOT EXISTS idx_part_pan ON participant_daily_trades (client_pan);

-- ======================================================================================
-- MODULE 4: Counterparty Concentration & Circular Trading (PVASF_CORE_SPEC §4.3)
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 4.1: counterparty_trade_pairs
-- Matched buyer-seller pairs for detecting Circular Trading Rings and Wash Trades (§4.3)
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS counterparty_trade_pairs (
    pair_match_id             INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    trade_date                DATE            NOT NULL,
    buyer_pan                 VARCHAR(10)     NOT NULL,
    buyer_legal_name          VARCHAR(250),             -- Buyer legal entity name from KYC records
    seller_pan                VARCHAR(10)     NOT NULL,
    seller_legal_name         VARCHAR(250),             -- Seller legal entity name from KYC records
    buyer_tm_id               VARCHAR(20),
    seller_tm_id              VARCHAR(20),
    matched_quantity          BIGINT          NOT NULL,
    matched_turnover_value    DECIMAL(20, 2)  NOT NULL,
    pairwise_ltp_push_value   DECIMAL(15, 2)  DEFAULT 0.00, -- Gross upward price push contributed by trades between pair (Logic 1)
    pairwise_ltp_push_value_logic_2 DECIMAL(15, 2) DEFAULT 0.00, -- Depth sweep LTP push value (Logic 2)
    reverse_matched_quantity  BIGINT          DEFAULT 0,             -- Volume traded in reverse direction Seller -> Buyer (for RTR)
    is_same_broker_wash       BOOLEAN         NOT NULL DEFAULT FALSE, -- TRUE if buyer_tm_id == seller_tm_id
    algo_execution_flag       SMALLINT        DEFAULT 0,             -- 0=Manual, 1=Algo/HFT, 2=DMA
    FOREIGN KEY (buyer_pan) REFERENCES client_identity_master (client_pan),
    FOREIGN KEY (seller_pan) REFERENCES client_identity_master (client_pan)
);

CREATE INDEX IF NOT EXISTS idx_cpty_sym_date ON counterparty_trade_pairs (symbol, trade_date);
CREATE INDEX IF NOT EXISTS idx_cpty_buyer ON counterparty_trade_pairs (buyer_pan);
CREATE INDEX IF NOT EXISTS idx_cpty_seller ON counterparty_trade_pairs (seller_pan);

-- ======================================================================================
-- MODULE 5: Shareholder Statistics (PVASF_CORE_SPEC §5.3)
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 5.1: shareholding_summary
-- Quarterly ownership structure for Promoter & Top 1% concentration analysis (§5.3)
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shareholding_summary (
    filing_id                 INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    quarter_code              VARCHAR(10)     NOT NULL, -- 'Q126', 'Q226', 'Q326', 'Q426'
    filing_date               DATE            NOT NULL,
    category_type             VARCHAR(40)     NOT NULL, -- 'PROMOTER_GROUP', 'TOP_1_PCT_PUBLIC', 'GENERAL_PUBLIC_FLOAT'
    total_shares_count        BIGINT          NOT NULL,
    holding_percentage        DECIMAL(6, 2)   NOT NULL,
    pledged_shares_percentage DECIMAL(6, 2)   DEFAULT 0.00,
    locked_in_shares_percentage DECIMAL(6, 2)   DEFAULT 0.00, -- Pre-IPO or Promoter statutory lock-in
    unique_holding_pans       INTEGER,
    avg_daily_trading_pans    INTEGER         DEFAULT 0, -- Average unique trading PAN count per day
    CONSTRAINT uk_shldng_sym_qtr_cat UNIQUE (symbol, quarter_code, category_type)
);

CREATE INDEX IF NOT EXISTS idx_shldng_sym_date ON shareholding_summary (symbol, filing_date);

-- --------------------------------------------------------------------------------------
-- Table 5.2: large_shareholders_registry
-- Specific entity breakdown for Promoters and Top 1% public institutional/HNI holders.
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS large_shareholders_registry (
    record_id                 INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    quarter_code              VARCHAR(10)     NOT NULL,
    holder_pan                VARCHAR(10)     NOT NULL,
    holder_legal_name         VARCHAR(250)    NOT NULL,
    holder_category           VARCHAR(30)     NOT NULL, -- 'PROMOTER', 'INSTITUTIONAL_DII', 'INSTITUTIONAL_FPI', 'PUBLIC_INDIVIDUAL'
    shares_held               BIGINT          NOT NULL,
    holding_percentage        DECIMAL(6, 2)   NOT NULL,
    pledged_shares_count      BIGINT          DEFAULT 0,
    FOREIGN KEY (holder_pan) REFERENCES client_identity_master (client_pan)
);

CREATE INDEX IF NOT EXISTS idx_large_shldr_sym_qtr ON large_shareholders_registry (symbol, quarter_code);

-- ======================================================================================
-- MODULE 6: Corporate Announcements & Price Adjustments (PVASF_CORE_SPEC §2.1.1 & §5.2)
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 6.1: corporate_events_feed
-- Corporate announcements for baseline price normalization across splits and bonuses (§2.1.1 & §5.2)
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS corporate_events_feed (
    event_id                  INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    isin                      CHAR(12)        NOT NULL,
    action_category           VARCHAR(40)     NOT NULL, -- 'BONUS', 'SPLIT', 'DIVIDEND', 'RIGHTS', 'BOARD_MEETING', 'AGM'
    announcement_purpose      VARCHAR(500)    NOT NULL,
    announcement_date         DATE            NOT NULL,
    ex_date                   DATE,
    record_date               DATE,
    ratio_or_value            VARCHAR(50),              -- Execution ratio or dividend amount (e.g. '1:1', 'INR 4.50/sh')
    dilution_factor           DECIMAL(8, 6)   DEFAULT 1.000000 -- Price adjustment multiplier (e.g. 0.500000 for 1:1 bonus)
);

CREATE INDEX IF NOT EXISTS idx_corp_sym_date ON corporate_events_feed (symbol, announcement_date);

-- --------------------------------------------------------------------------------------
-- Table 6.2: price_dilution_factors
-- Multiplicative adjustment factors used to normalize historical baseline prices ($T-180$).
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_dilution_factors (
    factor_id                 INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    split_multiplier          DECIMAL(10, 6)  NOT NULL, -- e.g., 0.50 for 1:1 bonus, 0.10 for 10:1 split
    valid_from_date           DATE            NOT NULL,
    valid_thru_date           DATE            NOT NULL DEFAULT '9999-12-31'
);

CREATE INDEX IF NOT EXISTS idx_dilution_sym ON price_dilution_factors (symbol, valid_from_date);

-- ======================================================================================
-- MODULE 7: Market Trading Calendar & Broker Totals (PVASF_CORE_SPEC §1 & §2)
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 7.1: trading_session_calendar
-- Trading days and market holidays for rolling 15-day and 180-day window counting (§1.2 & §2)
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trading_session_calendar (
    calendar_date             DATE            PRIMARY KEY,
    is_trading_day            BOOLEAN         NOT NULL, -- TRUE if markets open; FALSE if holiday/weekend
    holiday_name              VARCHAR(100),
    is_special_auction        BOOLEAN         NOT NULL DEFAULT FALSE -- e.g., Diwali Muhurat Trading
);

-- --------------------------------------------------------------------------------------
-- Table 7.2: broker_daily_summary
-- Daily volume and internal cross volume aggregated by Trading Member (Broker).
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS broker_daily_summary (
    broker_summary_id         INTEGER         PRIMARY KEY AUTOINCREMENT,
    trading_member_id         VARCHAR(20)     NOT NULL,
    trading_member_name       VARCHAR(250)    NOT NULL,
    symbol                    VARCHAR(20)     NOT NULL,
    trade_date                DATE            NOT NULL,
    total_buy_volume          BIGINT          NOT NULL DEFAULT 0,
    total_sell_volume         BIGINT          NOT NULL DEFAULT 0,
    same_broker_wash_volume   BIGINT          NOT NULL DEFAULT 0,
    total_turnover_value      DECIMAL(20, 2)  NOT NULL DEFAULT 0.00,
    CONSTRAINT uk_broker_sym_date UNIQUE (trading_member_id, symbol, trade_date)
);

-- ======================================================================================
-- MODULE 8: Scrip Scoring, Alert Watchlist & Audit Trail (PVASF_CORE_SPEC §3 & §5)
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- Table 8.1: surveillance_alert_cases
-- System-generated alert cases with composite risk scores and investigation workflows.
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surveillance_alert_cases (
    case_reference_id         INTEGER         PRIMARY KEY AUTOINCREMENT,
    symbol                    VARCHAR(20)     NOT NULL,
    observation_date          DATE            NOT NULL,
    composite_risk_score      DECIMAL(5, 2)   NOT NULL, -- Score between 0.00 and 100.00
    alert_severity_level      VARCHAR(15)     NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH'
    surveillance_status       VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SAFE', 'ESCALATED', 'CLOSED'
    metric_price_rise_pct     DECIMAL(8, 2)   NOT NULL,
    metric_price_zscore       DECIMAL(6, 2)   NOT NULL,
    metric_volume_zscore      DECIMAL(6, 2)   NOT NULL,
    metric_band_hit_days      INTEGER         NOT NULL,
    metric_new_high_days      INTEGER         NOT NULL,
    assigned_officer          VARCHAR(50),
    investigation_notes       TEXT,
    last_updated_time         TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_alert_sym_date UNIQUE (symbol, observation_date)
);

-- --------------------------------------------------------------------------------------
-- Table 8.2: portal_user_accounts
-- User authentication and Role-Based Access Control (Admin, Analyst, Viewer).
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_user_accounts (
    user_id                   INTEGER         PRIMARY KEY AUTOINCREMENT,
    username                  VARCHAR(50)     NOT NULL UNIQUE,
    email                     VARCHAR(100)    NOT NULL UNIQUE,
    full_name                 VARCHAR(100)    NOT NULL DEFAULT '',
    department                VARCHAR(100)    NOT NULL DEFAULT 'Market Conduct',
    password_hash             VARCHAR(255)    NOT NULL,
    assigned_role             VARCHAR(20)     NOT NULL DEFAULT 'Viewer', -- 'Admin', 'Analyst', 'Viewer'
    is_account_active         BOOLEAN         NOT NULL DEFAULT TRUE,
    created_timestamp         TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    last_login_at             TIMESTAMP
);

-- --------------------------------------------------------------------------------------
-- Table 8.3: compliance_audit_logs
-- Immutable tamper-evident audit trail recording all user actions and workflow status changes.
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_audit_logs (
    log_id                    INTEGER         PRIMARY KEY AUTOINCREMENT,
    log_timestamp             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    username                  VARCHAR(50)     NOT NULL,
    role                      VARCHAR(20)     NOT NULL DEFAULT 'Analyst',
    action_code               VARCHAR(100)    NOT NULL, -- 'MARK_SAFE', 'RECALIBRATE_MODEL', 'EXPORT_REPORT'
    target_entity             VARCHAR(50),              -- e.g. Stock symbol or Config key
    action_narrative          TEXT            NOT NULL,
    client_ip_address         VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_audit_sym ON compliance_audit_logs (target_entity);
CREATE INDEX IF NOT EXISTS idx_audit_time ON compliance_audit_logs (log_timestamp);


-- ======================================================================================
-- MODULE 9: Working Case Study (NOVAENERGY Demonstration - PVASF_CORE_SPEC §2 to §5)
-- Demonstrates an active 15-day surveillance window for high-risk stock: 'NOVAENERGY'
-- ======================================================================================

-- 1. Insert Client Master Entities (Sanitized Fake PANs)
INSERT INTO client_identity_master (client_pan, client_legal_name, entity_type, account_state, residential_city, registration_date, risk_profile_grade) VALUES
('HWFTM1488X', 'Rahul Gupta', 'INDIVIDUAL', 'ACTIVE', 'Mumbai', '2021-03-15', 'WATCHLIST'),
('CVXUL2488S', 'Lokesh Joshi', 'INDIVIDUAL', 'ACTIVE', 'Ahmedabad', '2020-08-10', 'WATCHLIST'),
('XWRUW6552F', 'Jayant Trivedi', 'INDIVIDUAL', 'ACTIVE', 'Surat', '2022-01-22', 'WATCHLIST'),
('PKTBY7338I', 'Sunita Trivedi', 'INDIVIDUAL', 'ACTIVE', 'Surat', '2022-01-22', 'STANDARD'),
('WGLNH6994Q', 'Vikram Kapoor', 'INDIVIDUAL', 'ACTIVE', 'Delhi', '2019-11-05', 'STANDARD'),
('KVONN8964A', 'Sunita Sharma', 'INDIVIDUAL', 'ACTIVE', 'Jaipur', '2023-04-18', 'STANDARD'),
('AAACP9876K', 'Nova Energy Promoter Trust', 'PROMOTER', 'ACTIVE', 'Mumbai', '2015-06-12', 'STANDARD');

-- 2. Insert Client Demat Accounts
INSERT INTO client_demat_accounts (client_pan, depository_id, beneficiary_acc_no, account_open_date, joint_holder_pan_2, is_poa_active, bank_account_masked) VALUES
('HWFTM1488X', 'IN300123', '10495821', '2021-03-20', NULL, FALSE, 'XXXXXX4819'),
('CVXUL2488S', 'IN300456', '20581942', '2020-08-15', NULL, FALSE, 'XXXXXX1029'),
('XWRUW6552F', 'IN300789', '30918234', '2022-01-25', 'PKTBY7338I', TRUE, 'XXXXXX8821'),
('PKTBY7338I', 'IN300789', '30918235', '2022-01-25', 'XWRUW6552F', FALSE, 'XXXXXX8821'),
('WGLNH6994Q', 'IN300111', '40192834', '2019-11-10', NULL, FALSE, 'XXXXXX3391'),
('KVONN8964A', 'IN300222', '50821943', '2023-04-20', NULL, FALSE, 'XXXXXX7741'),
('AAACP9876K', 'IN300001', '60000001', '2015-06-15', NULL, FALSE, 'XXXXXX0001');

-- 3. Insert Trading Session Calendar
INSERT INTO trading_session_calendar (calendar_date, is_trading_day, holiday_name, is_special_auction) VALUES
('2026-08-14', TRUE, NULL, FALSE),
('2026-08-15', FALSE, 'Independence Day', FALSE),
('2026-08-16', FALSE, 'Sunday Weekend', FALSE),
('2026-08-17', TRUE, NULL, FALSE),
('2026-08-18', TRUE, NULL, FALSE),
('2026-08-19', TRUE, NULL, FALSE),
('2026-08-20', TRUE, NULL, FALSE),
('2026-08-21', TRUE, NULL, FALSE),
('2026-08-22', FALSE, 'Saturday Weekend', FALSE),
('2026-08-23', FALSE, 'Sunday Weekend', FALSE),
('2026-08-24', TRUE, NULL, FALSE),
('2026-08-25', TRUE, NULL, FALSE),
('2026-08-26', TRUE, NULL, FALSE),
('2026-08-27', TRUE, NULL, FALSE);

-- 4. Insert Daily Consolidated Market Data (15-Day Surge in 'NOVAENERGY')
INSERT INTO daily_market_eod (symbol, trade_date, isin, company_name, open_price, day_high_price, day_low_price, close_price, total_traded_quantity, total_traded_value, upper_circuit_limit, lower_circuit_limit, delivery_quantity, prev_close_price) VALUES
('NOVAENERGY', '2026-08-11', 'INE752716A01', 'Nova Energy Ltd', 1210.00, 1260.00, 1205.00, 1255.00, 45000,  55800000.00, 1270.00, 1140.00, 22000, 1200.00),
('NOVAENERGY', '2026-08-12', 'INE752716A01', 'Nova Energy Ltd', 1260.00, 1315.00, 1250.00, 1310.00, 68000,  88400000.00, 1317.00, 1190.00, 31000, 1255.00),
('NOVAENERGY', '2026-08-13', 'INE752716A01', 'Nova Energy Ltd', 1315.00, 1375.00, 1310.00, 1370.00, 89000, 121930000.00, 1375.50, 1240.00, 42000, 1310.00),
('NOVAENERGY', '2026-08-14', 'INE752716A01', 'Nova Energy Ltd', 1375.00, 1420.00, 1365.00, 1415.00, 115000, 161000000.00, 1438.00, 1300.00, 58000, 1370.00),
('NOVAENERGY', '2026-08-17', 'INE752716A01', 'Nova Energy Ltd', 1420.00, 1485.00, 1410.00, 1480.00, 142000, 207320000.00, 1485.75, 1340.00, 71000, 1415.00),
('NOVAENERGY', '2026-08-18', 'INE752716A01', 'Nova Energy Ltd', 1485.00, 1540.00, 1475.00, 1535.00, 160000, 243200000.00, 1554.00, 1400.00, 85000, 1480.00),
('NOVAENERGY', '2026-08-19', 'INE752716A01', 'Nova Energy Ltd', 1540.00, 1610.00, 1530.00, 1605.00, 175000, 278250000.00, 1611.75, 1450.00, 92000, 1535.00),
('NOVAENERGY', '2026-08-20', 'INE752716A01', 'Nova Energy Ltd', 1610.00, 1680.00, 1600.00, 1675.00, 190000, 313500000.00, 1685.25, 1520.00, 99000, 1605.00),
('NOVAENERGY', '2026-08-21', 'INE752716A01', 'Nova Energy Ltd', 1680.00, 1755.00, 1670.00, 1750.00, 210000, 361200000.00, 1758.75, 1590.00, 112000, 1675.00),
('NOVAENERGY', '2026-08-24', 'INE752716A01', 'Nova Energy Ltd', 1755.00, 1820.00, 1740.00, 1810.00, 230000, 411700000.00, 1837.50, 1660.00, 125000, 1750.00),
('NOVAENERGY', '2026-08-25', 'INE752716A01', 'Nova Energy Ltd', 1820.00, 1890.00, 1810.00, 1885.00, 255000, 474300000.00, 1900.50, 1710.00, 138000, 1810.00),
('NOVAENERGY', '2026-08-26', 'INE752716A01', 'Nova Energy Ltd', 1890.00, 1960.00, 1875.00, 1950.00, 280000, 539000000.00, 1979.25, 1790.00, 149000, 1885.00),
('NOVAENERGY', '2026-08-27', 'INE752716A01', 'Nova Energy Ltd', 1960.00, 2040.00, 1940.00, 2035.00, 310000, 623100000.00, 2047.50, 1850.00, 165000, 1950.00);

-- 5. Insert Baseline Statistics for 'NOVAENERGY'
INSERT INTO market_baseline_stats (symbol, trade_date, base_price_180d, baseline_volume_mean, baseline_volume_std, return_mean_180d, return_std_180d, peak_high_180d) VALUES
('NOVAENERGY', '2026-08-27', 540.00, 25000.00, 8500.00, 0.001250, 0.018500, 1250.00);

-- 6. Insert Participant Daily Trades (Aggressive Price Pushers / LTP Impact)
INSERT INTO participant_daily_trades (symbol, trade_date, client_pan, client_legal_name, trading_member_id, buy_quantity, sell_quantity, buy_turnover_value, sell_turnover_value, gross_positive_ltp_value, gross_negative_ltp_value, same_broker_wash_quantity, client_category) VALUES
('NOVAENERGY', '2026-08-27', 'HWFTM1488X', 'Rahul Gupta', 'TM101', 85000, 12000, 172975000.00, 24420000.00, 4808097.78,  0.00, 0, 'INDIVIDUAL'),
('NOVAENERGY', '2026-08-27', 'CVXUL2488S', 'Lokesh Joshi', 'TM101', 78000,  8000, 158730000.00, 16280000.00, 4633637.45,  0.00, 0, 'INDIVIDUAL'),
('NOVAENERGY', '2026-08-27', 'XWRUW6552F', 'Jayant Trivedi', 'TM102', 65000,  5000, 132275000.00, 10175000.00, 4001977.30,   0.00, 0, 'INDIVIDUAL'),
('NOVAENERGY', '2026-08-27', 'WGLNH6994Q', 'Vikram Kapoor', 'TM103', 25000, 18000,  50875000.00, 36630000.00, 1276512.15,  0.00, 0, 'INDIVIDUAL'),
('NOVAENERGY', '2026-08-27', 'PKTBY7338I', 'Sunita Trivedi', 'TM102', 24000, 15000,  48840000.00, 30525000.00, 1237636.51,  0.00, 0, 'INDIVIDUAL'),
('NOVAENERGY', '2026-08-27', 'KVONN8964A', 'Sunita Sharma', 'TM104', 22000, 12000,  44770000.00, 24420000.00, 1204066.02,  0.00, 0, 'INDIVIDUAL');

-- 7. Insert Counterparty Matched Pairs (Top bilateral pairs by matched volume)
INSERT INTO counterparty_trade_pairs (symbol, trade_date, buyer_pan, buyer_legal_name, seller_pan, seller_legal_name, buyer_tm_id, seller_tm_id, matched_quantity, matched_turnover_value, pairwise_ltp_push_value, is_same_broker_wash) VALUES
('NOVAENERGY', '2026-08-27', 'CVXUL2488S', 'Lokesh Joshi', 'HWFTM1488X', 'Rahul Gupta', 'TM101', 'TM101', 1014255, 147117687.75, 4.80, TRUE),
('NOVAENERGY', '2026-08-27', 'XWRUW6552F', 'Jayant Trivedi', 'CVXUL2488S', 'Lokesh Joshi', 'TM102', 'TM101',  491930,  71354446.50, 2.35, FALSE),
('NOVAENERGY', '2026-08-27', 'HWFTM1488X', 'Rahul Gupta', 'XWRUW6552F', 'Jayant Trivedi', 'TM101', 'TM102',  480949,  69761652.45, 2.10, FALSE),
('NOVAENERGY', '2026-08-27', 'PKTBY7338I', 'Sunita Trivedi', 'WGLNH6994Q', 'Vikram Kapoor', 'TM102', 'TM103',  475280,  68939364.00, 1.45, FALSE),
('NOVAENERGY', '2026-08-27', 'KVONN8964A', 'Sunita Sharma', 'XWRUW6552F', 'Jayant Trivedi', 'TM104', 'TM102',  416520,  60416226.00, 1.15, FALSE);

-- 8. Insert Shareholding Pattern (Promoter Group vs Float)
INSERT INTO shareholding_summary (symbol, quarter_code, filing_date, category_type, total_shares_count, holding_percentage, pledged_shares_percentage, unique_holding_pans, avg_daily_trading_pans) VALUES
('NOVAENERGY', 'Q127', '2026-06-30', 'PROMOTER_GROUP',       58450000, 58.45, 12.50,    14, 24),
('NOVAENERGY', 'Q127', '2026-06-30', 'TOP_1_PCT_PUBLIC',      18200000, 18.20,  0.00,   120, 24),
('NOVAENERGY', 'Q127', '2026-06-30', 'GENERAL_PUBLIC_FLOAT',  23350000, 23.35,  0.00, 14250, 24);

INSERT INTO large_shareholders_registry (symbol, quarter_code, holder_pan, holder_legal_name, holder_category, shares_held, holding_percentage, pledged_shares_count) VALUES
('NOVAENERGY', 'Q127', 'AAACP9876K', 'Nova Energy Promoter Trust', 'PROMOTER',          42000000, 42.00, 5250000),
('NOVAENERGY', 'Q127', 'CVXUL2488S', 'Lokesh Joshi',               'INSTITUTIONAL_DII',  8000000,  8.00,       0),
('NOVAENERGY', 'Q127', 'XWRUW6552F', 'Jayant Trivedi',             'INSTITUTIONAL_FPI',  5500000,  5.50,       0),
('NOVAENERGY', 'Q127', 'PKTBY7338I', 'Sunita Trivedi',             'PUBLIC_INDIVIDUAL',  4000000,  4.00,       0);

-- 9. Insert Corporate Action Announcements
INSERT INTO corporate_events_feed (symbol, isin, action_category, announcement_purpose, announcement_date, ex_date, record_date, ratio_or_value, dilution_factor) VALUES
('NOVAENERGY', 'INE752716A01', 'BONUS', 'Board approves 1:1 Bonus Issue of Equity Shares', '2026-08-20', '2026-08-25', '2026-08-26', '1:1', 0.500000),
('NOVAENERGY', 'INE752716A01', 'BOARD_MEETING', 'Outcome of Board Meeting - Financial Results', '2026-08-14', NULL, NULL, NULL, 1.000000);

-- 10. Insert Dilution Factors
INSERT INTO price_dilution_factors (symbol, split_multiplier, valid_from_date, valid_thru_date) VALUES
('NOVAENERGY', 0.500000, '2026-08-25', '9999-12-31');

-- 11. Insert Broker Daily Summary Seed Data
INSERT INTO broker_daily_summary (trading_member_id, trading_member_name, symbol, trade_date, total_buy_volume, total_sell_volume, same_broker_wash_volume, total_turnover_value) VALUES
('TM101', 'Alpha Securities Pvt Ltd',    'NOVAENERGY', '2026-08-27', 163000, 20000, 1014255, 331705000.00),
('TM102', 'Zenith Capital Markets Ltd', 'NOVAENERGY', '2026-08-27',  89000, 20000,       0, 181115000.00),
('TM103', 'Metro Equity Broking Ltd',   'NOVAENERGY', '2026-08-27',  25000, 18000,       0,  87505000.00),
('TM104', 'Prime Broking Services Ltd', 'NOVAENERGY', '2026-08-27',  22000, 12000,       0,  69190000.00);

-- 12. Insert System Surveillance Alert Case (Active High-Risk Case)
INSERT INTO surveillance_alert_cases (symbol, observation_date, composite_risk_score, alert_severity_level, surveillance_status, metric_price_rise_pct, metric_price_zscore, metric_volume_zscore, metric_band_hit_days, metric_new_high_days, assigned_officer, investigation_notes) VALUES
('NOVAENERGY', '2026-08-27', 28.50, 'HIGH', 'ACTIVE', 276.85, 3.42, 4.15, 8, 11, 'vishesh_admin', 'Scrip flagged with high composite score (28.5/100). Concentrated aggressive buy push delivered by Rahul Gupta and Lokesh Joshi lifting ask price. High bilateral counterparty concentration with Jayant Trivedi.');

-- 13. Insert System Users & Audit Logs
INSERT INTO portal_user_accounts (username, email, full_name, department, password_hash, assigned_role, is_account_active) VALUES
('vishesh_admin', 'vishesh@pvasf.gov.in', 'Vishesh Sanghvi', 'Surveillance & Risk Oversight', 'pbkdf2_sha256$100000$auth_salt$reference_hash_standard_audit', 'Admin', TRUE),
('arao_analyst',  'arao@pvasf.gov.in',    'Ananya Rao',      'Market Conduct Division',       'pbkdf2_sha256$100000$auth_salt$reference_hash_standard_audit', 'Analyst', TRUE),
('analyst_surv',  'surv@pvasf.gov.in',    'Surveillance Off','Trade Investigations',          'pbkdf2_sha256$100000$auth_salt$reference_hash_standard_audit', 'Analyst', TRUE),
('guest_viewer',  'guest@pvasf.gov.in',   'Audit Guest',     'Compliance Review',             'pbkdf2_sha256$100000$auth_salt$reference_hash_standard_audit', 'Viewer', TRUE);

INSERT INTO compliance_audit_logs (username, role, action_code, target_entity, action_narrative, client_ip_address) VALUES
('vishesh_admin', 'Admin', 'ALERT_GENERATION', 'NOVAENERGY', 'System computed EOD risk score: 28.5 (HIGH). Added to Active Surveillance Watchlist.', '127.0.0.1'),
('vishesh_admin', 'Admin', 'VIEW_DOSSIER', 'NOVAENERGY', 'Officer opened Single-Stock Forensic Investigation Workspace for NOVAENERGY.', '127.0.0.1');

-- ======================================================================================
-- ANALYTICAL SURVEILLANCE VIEWS
-- ======================================================================================

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

-- ======================================================================================
-- END OF SCHEMA
-- ======================================================================================

