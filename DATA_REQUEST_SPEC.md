# PVASF — Enterprise Data Request Specification
## Price-Volume Alert Surveillance Framework

| Section | Period | Field Name | Variable Name | Example | Description | Calculation / Source |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Daily Market OHLCV & Price Trends** | 180 Days | Scrip Symbol | `symbol` | NOVAENERGY | Unique exchange ticker for the scrip | Precalculated |
| | | Trade Date | `trade_date` | 2026-08-27 | EOD date for which the record applies | Precalculated |
| | | ISIN | `isin` | INE752716A01 | International Securities Identification Number | Precalculated |
| | | Company Legal Name | `company_name` | Nova Energy Ltd | Official listed corporate entity name | Precalculated |
| | | Day Open Price | `open_price` | 264.91 | Official opening price on trade date | Precalculated |
| | | Day High Price | `day_high_price` | 274.86 | Intraday highest traded price on trade date | Precalculated |
| | | Day Low Price | `day_low_price` | 263.59 | Intraday lowest traded price on trade date | Precalculated |
| | | Close Price | `close_price` | 274.74 | Official 30-min VWAP closing price on trade date | Precalculated |
| | | Previous Close Price | `prev_close_price` | 261.77 | Official closing price of immediately preceding trading day | Precalculated |
| | | Total Traded Quantity | `total_traded_quantity` | 1971401 | Total shares traded in the scrip on trade date | Precalculated |
| | | Total Traded Turnover | `total_traded_value` | 541622710.74 | Total rupee value transacted in the scrip on trade date | Precalculated |
| | | Upper Circuit Limit | `upper_circuit_limit` | 274.86 | Maximum permissible intraday price set by exchange for trade date | Precalculated |
| | | Lower Circuit Limit | `lower_circuit_limit` | 248.68 | Minimum permissible intraday price set by exchange for trade date | Precalculated |
| | | 52-Week High Price | `week_52_high_price` | 274.74 | Highest price in last 52 weeks; fallback when full 180-day history is unavailable | Precalculated |
| | | 52-Week Low Price | `week_52_low_price` | 137.00 | Lowest price in last 52 weeks | Precalculated |
| | | Closing Price (T-180) | `base_price_180d` | 140.53 | Closing price 180 trading days prior to trade date; denominator for Price Rise % | Backend |
| | | Volume Baseline Mean | `baseline_volume_mean` | 288547.36 | Rolling mean of 15-day avg volume over 180 trading days | Backend |
| | | Volume Baseline Std Dev | `baseline_volume_std` | 459243.93 | Rolling σ of 15-day avg volume over 180 trading days | Backend |
| | | 180-Day Return Baseline Mean | `return_mean_180d` | 0.0014 | Rolling mean of daily return percentages over 180 trading days | Backend |
| | | 180-Day Return Baseline Std Dev | `return_std_180d` | 0.0215 | Rolling σ of daily return percentages over 180 trading days | Backend |
| | | 180-Day Peak High Price | `peak_high_180d` | 268.50 | Highest traded price over rolling 180 trading days prior to trade date | Backend |
| **Participant Trading & LTP Impact** | 15 Days | Scrip Symbol | `symbol` | NOVAENERGY | Unique exchange ticker for the scrip | Precalculated |
| | | Trade Date | `trade_date` | 2026-08-27 | EOD date for which the record applies | Precalculated |
| | | Client PAN | `client_pan` | HWFTM1488X | Unique income-tax PAN of the participant | Precalculated |
| | | Client Legal Name | `client_legal_name` | Rahul Gupta | Registered name of the participant as per KYC | Precalculated |
| | | Trading Member ID | `trading_member_id` | TM101 | Broker / trading member through whom trades were executed | Precalculated |
| | | Client Category | `client_category` | INDIVIDUAL | Category of client (INDIVIDUAL, CORPORATE, PROMOTER, HNI, FPI) | Precalculated |
| | | Buy Quantity | `buy_quantity` | 85000 | Total shares purchased by this participant on trade date | Precalculated |
| | | Sell Quantity | `sell_quantity` | 12000 | Total shares sold by this participant on trade date | Precalculated |
| | | Buy Turnover Value | `buy_turnover_value` | 23352900.00 | Total rupee value of purchases by this participant on trade date | Precalculated |
| | | Sell Turnover Value | `sell_turnover_value` | 3296880.00 | Total rupee value of sales by this participant on trade date | Precalculated |
| | | Buy Trade Count | `buy_trade_count` | 142 | Total number of buy trade executions on trade date | Precalculated |
| | | Sell Trade Count | `sell_trade_count` | 28 | Total number of sell trade executions on trade date | Precalculated |
| | | Aggressor Buy Quantity | `aggressor_buy_quantity` | 75000 | Volume where participant was the price-initiating buyer | Precalculated |
| | | Gross Positive LTP Value | `gross_positive_ltp_value` | 4808097.78 | Cumulative rupee value of upward price pushes by this participant | Precalculated |
| | | Gross Negative LTP Value | `gross_negative_ltp_value` | 120500.00 | Cumulative rupee value of downward price pushes by this participant | Precalculated |
| **Counterparty Trading & Matched Pairs** | 15 Days | Scrip Symbol | `symbol` | NOVAENERGY | Unique exchange ticker for the scrip | Precalculated |
| | | Trade Date | `trade_date` | 2026-08-27 | EOD date for which the record applies | Precalculated |
| | | Buyer PAN | `buyer_pan` | CVXUL2488S | PAN of the buying entity in the matched pair | Precalculated |
| | | Buyer Legal Name | `buyer_legal_name` | Lokesh Joshi | Registered name of the buyer as per KYC | Precalculated |
| | | Seller PAN | `seller_pan` | HWFTM1488X | PAN of the selling entity in the matched pair | Precalculated |
| | | Seller Legal Name | `seller_legal_name` | Rahul Gupta | Registered name of the seller as per KYC | Precalculated |
| | | Buyer Broker ID | `buyer_tm_id` | TM101 | Trading member ID of buying broker | Precalculated |
| | | Seller Broker ID | `seller_tm_id` | TM101 | Trading member ID of selling broker | Precalculated |
| | | Matched Quantity | `matched_quantity` | 67617 | Total shares transacted between this buyer-seller pair on trade date | Precalculated |
| | | Matched Turnover Value | `matched_turnover_value` | 18577094.58 | Total rupee value of matched trades between this pair on trade date | Precalculated |
| | | Pairwise LTP Push Value (Logic 1) | `pairwise_ltp_push_value` | 0.32 | Optional / Ignored in current engine (saved in DB for audit, not used in risk scoring or UI) | Precalculated |
| | | Pairwise LTP Push Value (Logic 2) | `pairwise_ltp_push_value_logic_2` | 0.45 | Alternative push logic / Ignored in current engine (saved in DB for audit, not used in risk scoring or UI) | Precalculated |
| | | Reverse Matched Quantity | `reverse_matched_quantity` | 64236 | Volume executed in reverse direction (B sells to A) across window | Precalculated |
| **Shareholding** | 180 Days | Scrip Symbol | `symbol` | NOVAENERGY | Unique exchange ticker for the scrip | Precalculated |
| | | Quarter Code | `quarter_code` | Q127 | Statutory filing quarter code in QMYY format | Precalculated |
| | | Filing Date | `filing_date` | 2026-06-30 | Date on which the shareholding pattern was filed | Precalculated |
| | | Category Type | `category_type` | PROMOTER_GROUP | Float categorization (PROMOTER_GROUP, TOP_1_PCT_PUBLIC, GENERAL_PUBLIC_FLOAT) | Precalculated |
| | | Total Shares Count | `total_shares_count` | 58450000 | Number of shares held by this category | Precalculated |
| | | Holding Percentage | `holding_percentage` | 58.45 | Percentage of total issued capital held by this category | Precalculated |
| | | Pledged Shares Percentage | `pledged_shares_percentage` | 12.50 | Encumbered or pledged shares percentage of float | Precalculated |
| | | Unique Holding PANs | `unique_holding_pans` | 14 | Count of distinct PAN holders within this category | Precalculated |
| | | Avg Daily Trading PANs | `avg_daily_trading_pans` | 24 | Average number of unique PANs trading this scrip per day in the quarter | Precalculated |
| | | Substantial Holder PAN | `holder_pan` | AAACP9876K | Unique PAN of holder owning >= 1.00% of voting equity | Precalculated |
| | | Substantial Holder Legal Name | `holder_legal_name` | Nova Energy Promoter Trust | Registered KYC legal name of substantial shareholder | Precalculated |
| | | Substantial Holder Category | `holder_category` | PROMOTER | Classification (PROMOTER, INSTITUTIONAL_DII, INSTITUTIONAL_FPI, PUBLIC_INDIVIDUAL) | Precalculated |
| | | Substantial Shares Held | `shares_held` | 42000000 | Total voting shares held by this substantial entity | Precalculated |
| | | Substantial Pledged Shares Count | `pledged_shares_count` | 5250000 | Count of shares encumbered or pledged by this holder | Precalculated |
| **Corporate Actions** | 15 Days | Scrip Symbol | `symbol` | NOVAENERGY | Unique exchange ticker for the scrip | Precalculated |
| | | ISIN | `isin` | INE752716A01 | International Securities Identification Number | Precalculated |
| | | Announcement Date | `announcement_date` | 2026-08-20 | Date on which the corporate action was publicly disclosed | Precalculated |
| | | Record Date | `record_date` | 2026-08-26 | Official shareholder entitlement record date | Precalculated |
| | | Ex-Date | `ex_date` | 2026-08-25 | Date from which the adjusted price takes effect | Precalculated |
| | | Action Category | `action_category` | BONUS | Type of corporate action (BONUS, SPLIT, DIVIDEND, RIGHTS, BOARD_MEETING, AGM) | Precalculated |
| | | Announcement Details | `announcement_purpose` | Board approves 1:1 Bonus Issue of Equity Shares | Detailed announcement narrative | Precalculated |
| | | Ratio or Value | `ratio_or_value` | 1:1 | Raw ratio or rupee value as announced (e.g. 1:1, ₹5.00) | Precalculated |
| | | Dilution Factor | `dilution_factor` | 0.500000 | Price adjustment multiplier | Precalculated (Future Scope) |
| **Trading Calendar** | 180 Days | Calendar Date | `calendar_date` | 2026-08-27 | The date being classified as a trading or non-trading day | Precalculated |
| | | Is Trading Day | `is_trading_day` | TRUE | Whether a regular exchange trading session occurred on this date | Precalculated |
| | | Holiday Name | `holiday_name` | NULL | Official exchange holiday designation string | Precalculated |
| | | Is Special Auction | `is_special_auction` | FALSE | Whether a special call auction session was active on this date | Precalculated |
| **Client Details** | Master Record | Client PAN | `client_pan` | HWFTM1488X | Permanent Account Number of trading client | Precalculated |
| | | Client Legal Name | `client_legal_name` | Rahul Gupta | Full registered entity name as per KYC records | Precalculated |
| **Alert Settings** | - | Price Rise Weight | `w1` | 20.0 | Scoring weight applied to the Price Rise % metric (out of 100%) | Admin Config |
| | | Price Z-Score Weight | `w2` | 20.0 | Scoring weight applied to the Price Z-Score metric (out of 100%) | Admin Config |
| | | Volume Z-Score Weight | `w3` | 20.0 | Scoring weight applied to the Volume Z-Score metric (out of 100%) | Admin Config |
| | | Band Hit Days Weight | `w4` | 20.0 | Scoring weight applied to the Upper Circuit Persistence metric (out of 100%) | Admin Config |
| | | New High Breakout Weight | `w5` | 20.0 | Scoring weight applied to the 180-Day New High Breakout metric (out of 100%) | Admin Config |
| | | Shortlist Threshold | `shortlist_threshold` | 60.0 | Minimum composite score for a scrip to be added to the watchlist | Admin Config |
