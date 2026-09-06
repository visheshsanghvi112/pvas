export const metricHelp = {
  compositeScore:
    "Overall risk score from 0 to 100 combining all 5 anomaly checks. Stocks scoring 15 or higher are flagged for review.",
  priceRise:
    "How much the stock's highest price in the last 15 days grew compared to its price 6 months ago.",
  priceZ:
    "Checks if recent daily price gains are abnormally faster than 95% of the stock's normal 6-month behavior.",
  volumeZ:
    "Checks if recent trading volume is an abnormal spike compared to typical 6-month daily activity.",
  bandPersistence:
    "Counts how many days in the last 15 days the stock touched or neared its upper circuit limit.",
  highBreakout:
    "Counts how many days in the last 15 days the stock set fresh 6-month record high prices.",
  rollingPrice:
    "15-day average price movement compared against typical 6-month movement patterns.",
  rollingVolume:
    "15-day average daily volume compared against typical 6-month volume levels.",
  currentVolume:
    "Total number of shares traded in the stock during this period.",
  shareholding:
    "Breakdown of promoter ownership, public float, and top shareholder concentration.",
  ltpContribution:
    "Identifies individual traders (PANs) whose aggressive market orders pushed or pulled the price the most.",
  volumeContributors:
    "Identifies top individual traders responsible for the highest percentage of total traded volume.",
  counterparty:
    "Identifies pairs of traders who repeatedly traded back and forth with each other.",
  profitMakers:
    "Top participants who extracted the largest trading profits during the rally.",
  riskDistribution:
    "Groups evaluated stocks into High, Medium, and Low risk tiers based on composite scores.",
  scoreDistribution:
    "Shows the distribution of stocks across anomaly score ranges from 0 to 100.",
  price:
    "Daily Open, High, Low, and Close market prices.",
  average:
    "Historical baseline average used to detect abnormal spikes in price or volume."
} as const;

export type MetricHelpKey = keyof typeof metricHelp;
