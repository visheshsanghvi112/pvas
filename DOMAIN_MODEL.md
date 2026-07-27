# Market Conduct & Surveillance Platform — Domain Model Specification
**Document Version**: 1.0.0  

---

## 1. Domain Entities & Business Definitions

The domain model abstracts raw data warehouse tables into pure, high-level business entities.

```
                  ┌────────────────────────┐
                  │    Security / Scrip    │
                  └───────────┬────────────┘
                              │ 1
                              │
                              │ *
                  ┌───────────▼────────────┐
                  │    Trade Execution     │
                  └───────┬─────────┬──────┘
             Buy Side *   │         │   * Sell Side
    ┌─────────────────────┘         └─────────────────────┐
    │                                                     │
┌───▼────────────────────┐                       ┌────────▼───────────────┐
│ Client Account (DECL)  │                       │ Client Account (DECL)  │
└───┬────────────────────┘                       └────────┬───────────────┘
    │ 1                                                   │ 1
    │                                                     │
    │ *                                                   │ *
┌───▼────────────────────┐                       ┌────────▼───────────────┐
│ Depository Acct (DDCL) │                       │ Depository Acct (DDCL) │
└────────────────────────┘                       └────────────────────────┘
```

---

## 2. Entity Specifications

### 2.1 Security / Scrip
- **Purpose**: Represents a publicly listed financial security traded on the exchange.
- **Primary Identifier**: `symbol` (e.g. `ALPHATECH`, `TCS`).
- **Source Data Tables**: `FACT_TRADES` (`Ftrd_Symbol`), `SCRIP_CIRCUIT_BANDS` (`Ticker`), `EOD_PRICE_VOLUME_HIST` (`Ticker`).
- **Key Domain Attributes**: `symbol`, `company_token`, `series`, `lot_size`, `tick_price`, `upper_circuit_limit`, `lower_circuit_limit`, `baseline_180d_close`, `baseline_180d_vol_mean`.
- **Lifecycle**: Active Trading $\rightarrow$ Suspended $\rightarrow$ Delisted.

### 2.2 Trade Execution
- **Purpose**: Represents a single matched transaction between a buyer and seller order on the exchange match engine.
- **Primary Identifier**: `trade_id` (`Ftrd_Trd_Num` + `Ftrd_Trd_Date`).
- **Source Data Tables**: `FACT_TRADES` (`FTRD`).
- **Key Domain Attributes**: `trade_id`, `execution_timestamp`, `price`, `quantity`, `monetary_value`, `buyer_member_id`, `seller_member_id`, `buyer_client_id`, `seller_client_id`, `initiator_side` (`BUY`/`SELL`), `is_same_broker_wash`, `is_cross_broker_wash`, `ltp_impact_direction` (`UP`/`DOWN`/`NONE`).
- **Lifecycle**: Executed $\rightarrow$ Settled (or Modified / Cancelled).

### 2.3 Client Account
- **Purpose**: Represents an investor or trader account registered with a Trading Member broker.
- **Primary Identifier**: `pan` (Permanent Account Number) for identity resolution; `client_token` for account instances.
- **Source Data Tables**: `DIM_EXCH_CLNT_DTLS` (`DECL`).
- **Key Domain Attributes**: `pan`, `client_id`, `client_code`, `legal_name`, `category` (`Individual`, `Corporate`, `FII`, `MutualFund`), `trading_member_id`, `status` (`Active`, `Suspended`), `registered_mobile`, `registered_email`, `bank_account_number`, `introducer_id`.
- **Lifecycle**: Registered $\rightarrow$ Active $\rightarrow$ Suspended $\rightarrow$ Closed.

### 2.4 Depository Demat Account
- **Purpose**: Represents the custody account holding physical/electronic shares at NSDL or CDSL depositories.
- **Primary Identifier**: `depository_client_token` (`Ddcl_Dep_Clnt_Token`).
- **Source Data Tables**: `DIM_DEP_CLNT_DTLS` (`DDCL`).
- **Key Domain Attributes**: `depository_type` (`NSDL`/`CDSL`), `dp_id`, `client_id`, `pan`, `account_opening_date`, `account_closure_date`, `joint_holder_1_pan`, `joint_holder_2_pan`, `poa_enabled_flag`.
- **Lifecycle**: Opened $\rightarrow$ Active $\rightarrow$ Suspended $\rightarrow$ Closed.

### 2.5 Trading Member / Broker
- **Purpose**: Exchange-registered brokerage firm executing trades on behalf of clients or proprietary accounts.
- **Primary Identifier**: `tm_id` (e.g. `TM00001`).
- **Source Data Tables**: `DIM_EXCH_CLNT_DTLS` (`Decl_TM_Id`), `FACT_TRADES` (`Ftrd_Buy_Exch_TM_Token`).
- **Key Domain Attributes**: `tm_id`, `tm_token`, `member_name`, `registered_terminals_count`, `active_states`.
- **Lifecycle**: Active Member $\rightarrow$ Suspended $\rightarrow$ Expelled.

### 2.6 Surveillance Alert
- **Purpose**: Automated anomaly trigger generated when a security or participant violates risk thresholds.
- **Primary Identifier**: `alert_id` (Generated e.g. `ALT-20260724-ALPHATECH`).
- **Source Data Tables**: Computed via `EODSurveillanceService` using `FACT_TRADES` aggregates.
- **Key Domain Attributes**: `alert_id`, `security_symbol`, `trigger_date`, `risk_score` ($0..100$), `risk_severity` (`HIGH`, `MEDIUM`, `LOW`), `price_rise_score`, `price_z_score`, `volume_z_score`, `circuit_hits_score`, `new_high_score`, `status` (`OPEN`, `UNDER_REVIEW`, `CLOSED`, `ESCALATED`), `assigned_analyst`.
- **Lifecycle**: Triggered $\rightarrow$ Open $\rightarrow$ Under Review $\rightarrow$ Escalated to Case (or Closed as False Positive).

### 2.7 Forensic Case
- **Purpose**: Legal and regulatory investigation dossier containing aggregated evidence, trade logs, and analyst notes.
- **Primary Identifier**: `case_id` (e.g. `CASE-2026-ALPHATECH-001`).
- **Source Data Tables**: Persisted in local case workspace database.
- **Key Domain Attributes**: `case_id`, `target_symbol`, `target_pans`, `assigned_officer`, `status` (`Draft`, `Open Investigation`, `Pending Action`, `Closed`), `created_timestamp`, `pinned_evidence`, `chronological_notes`.
- **Lifecycle**: Created $\rightarrow$ Investigation Open $\rightarrow$ Pending Regulatory Action $\rightarrow$ Closed.

### 2.8 CTCL Terminal & Execution Channel
- **Purpose**: Technical access terminal or software channel through which orders enter the exchange matching engine.
- **Primary Identifier**: `ctcl_ref` (Terminal ID).
- **Source Data Tables**: `FACT_TRADES` (`Ftrd_Buy_CTCL_Ref`, `Ftrd_Buy_IP_Addr`, `Ftrd_Buy_CTCL_Algo_Flag`).
- **Key Domain Attributes**: `ctcl_ref`, `ip_address`, `channel_type` (`MANUAL`, `INTERNET`, `DMA`, `ALGO`), `pin_code`, `state_code`, `algo_strategy_id`.
