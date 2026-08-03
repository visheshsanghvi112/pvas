export const metricHelp = {
  compositeScore:
    "Every scrip is assigned a Scrip risk score. The scrips having score beyond a given threshold, shall form of watch-list for officers.",
  priceRise:
    "Price movement: Stocks movement compared to 6-months closing price. The price is to be adjusted for any Corporate action.",
  priceZ:
    "Zprice measures if the average price movement over the last 15 days (T to T-15) is statistically abnormal when compared directly to its typical 15-day price behaviour over the last 180 trading days.",
  volumeZ:
    "Zvol measures if the stock's trading volume over the last 15 days is statistically abnormal when compared directly to its typical 15-day volume behaviour over the last 6 months.",
  bandPersistence:
    "Price Band Persistence: frequency with which a scrip approaches (at least 90%) or hits its Upper Circuit over a rolling 15-day window. Persistence Count = days where Band Hit Condition is True.",
  highBreakout:
    "180-Day New High Breakout: It highlights number of times the stock has broken past its 6-month ceiling and built hit a brand new high in past 15 days.",
  rollingPrice:
    "Rolling 15-day average close-to-close price movement is compared against rolling 15-day windows over 180 trading days to establish normal behaviour.",
  rollingVolume:
    "Rolling 15-day average volume is compared against rolling 15-day volume windows over 180 trading days to establish normal behaviour.",
  currentVolume:
    "Volume: Total number of shares bought and sold in a particular stock during the period.",
  shareholding:
    "Shareholding output includes unique PAN holders on T day and T-180, average unique PAN trading over 15 and 180 days, promoter shares, and top 1% shareholder holdings.",
  ltpContribution:
    "Net LTP Contribution: Top unique PAN entities who contributed to price movement of the scrip over the past 15 days. Formula: Net LTP contribution of each entity (Acsd_Pos_Cont_Val - Acsd_Neg_Cont_Val) over 15 trading days / net LTP movement in scrip over 15 trading days.",
  volumeContributors:
    "Volume Share: It provides details of top unique PAN who significantly contributed to total volume of the scrip in past 15 days, beyond the given threshold.",
  counterparty:
    "Counterparty Concentration: It provides details of top unique PAN-counterparty PAN pair who significantly contributed to total volume of the scrip in past 15 days, beyond the given threshold.",
  profitMakers:
    "Top 5 Profit-makers are possible suspects shown after a scrip is flagged, alongside concentrated volume, LTP contribution, and counterparty concentration.",
  riskDistribution:
    "Shortlisted scrips are grouped by risk after the composite score crosses the configured threshold.",
  scoreDistribution:
    "Score distribution shows how current alerts are spread across composite scrip risk score buckets.",
  price:
    "Scrip master data includes daily closing, opening, high, and low prices. Price analysis uses the 180-day historical window.",
  average:
    "Mean is the normal level. N-day average volume is calculated by adding daily traded volume over the last N days and dividing by N."
} as const;

export type MetricHelpKey = keyof typeof metricHelp;
