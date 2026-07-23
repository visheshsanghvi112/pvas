export const alerts = [
  { symbol: "ALPHATECH", company: "AlphaTech Systems Ltd", sector: "IT Services", priceRise: 38.4, volumeZ: 5.9, score: 91, risk: "High" as const, status: "Open" },
  { symbol: "NOVAENERGY", company: "Nova Energy Products", sector: "Power Equipment", priceRise: 24.8, volumeZ: 4.2, score: 78, risk: "High" as const, status: "Under review" },
  { symbol: "ZENITHBIO", company: "Zenith Biolabs", sector: "Pharma", priceRise: 17.2, volumeZ: 3.1, score: 64, risk: "Medium" as const, status: "Open" },
  { symbol: "ORBITCEM", company: "Orbit Cement Works", sector: "Cement", priceRise: 9.7, volumeZ: 2.0, score: 42, risk: "Low" as const, status: "Closed" }
];

export const riskDistribution = [
  { risk: "High", count: 5, fill: "#e11d48" },
  { risk: "Medium", count: 4, fill: "#d97706" },
  { risk: "Low", count: 3, fill: "#059669" }
];

export const scoreDistribution = [
  { bucket: "40-55", count: 3 },
  { bucket: "56-70", count: 4 },
  { bucket: "71-85", count: 6 },
  { bucket: "86-100", count: 5 }
];

export const alertDrivers = [
  { metric: "Price", score: 5 },
  { metric: "P-Z", score: 5 },
  { metric: "V-Z", score: 5 },
  { metric: "Band", score: 5 },
  { metric: "High", score: 3 }
];

export const kpis = [
  { label: "Alerts Today", value: "42", delta: "+18% vs avg" },
  { label: "High Risk", value: "11", delta: "6 pending assignment" },
  { label: "Investigations", value: "128", delta: "30-day rolling" },
  { label: "Avg Closure", value: "2.8d", delta: "-0.4d improved" }
];

export const priceSeries = Array.from({ length: 180 }, (_, index) => {
  const base = 118 + index * 0.42 + Math.sin(index / 8) * 4;
  const surge = index > 138 ? (index - 138) * 1.8 : 0;
  return {
    day: `D-${179 - index}`,
    price: Number((base + surge).toFixed(2)),
    ma20: Number((base + surge * 0.55).toFixed(2)),
    ma50: Number((base - 4 + surge * 0.28).toFixed(2))
  };
});

export const volumeSeries = Array.from({ length: 90 }, (_, index) => {
  const spike = index > 70 ? (index - 70) * 85000 : 0;
  return {
    day: `D-${89 - index}`,
    volume: Math.round(420000 + Math.sin(index / 5) * 80000 + spike),
    zScore: Number((1.1 + Math.max(0, index - 68) * 0.21).toFixed(2))
  };
});

export const rollingComparison = Array.from({ length: 60 }, (_, index) => ({
  day: `D-${59 - index}`,
  price15: Number((1.2 + Math.sin(index / 7) * 0.45 + Math.max(0, index - 42) * 0.12).toFixed(2)),
  price180: Number((0.74 + Math.sin(index / 11) * 0.12).toFixed(2)),
  volume15: Math.round(640000 + Math.sin(index / 6) * 90000 + Math.max(0, index - 44) * 72000),
  volume180: Math.round(510000 + Math.sin(index / 10) * 28000)
}));

export const bandEvents = [
  { metric: "Band hits", days: 12 },
  { metric: "180D highs", days: 7 },
  { metric: "No event", days: 1 }
];

export const corporateEvents = [
  { date: "2026-07-18", title: "Clarification sought on price movement", type: "Exchange query" },
  { date: "2026-07-15", title: "Board meeting intimation for strategic partnership", type: "Announcement" },
  { date: "2026-07-08", title: "Preferential allotment approved in principle", type: "Corporate action" },
  { date: "2026-06-30", title: "Large order win reported by management", type: "Disclosure" }
];

export const participants = [
  { broker: "Kaveri Securities", clientGroup: "Group A-17", buyVolume: "18.2L", sellVolume: "4.1L", concentration: "22.4%" },
  { broker: "Metro Broking", clientGroup: "Group C-04", buyVolume: "12.7L", sellVolume: "9.8L", concentration: "16.8%" },
  { broker: "Northline Capital", clientGroup: "Group F-29", buyVolume: "10.4L", sellVolume: "2.2L", concentration: "13.5%" },
  { broker: "Veda Wealth", clientGroup: "Group B-12", buyVolume: "8.9L", sellVolume: "7.1L", concentration: "10.1%" }
];

export const ltpContribution = [
  { participant: "PAN A", contribution: 34 },
  { participant: "PAN B", contribution: 21 },
  { participant: "PAN C", contribution: 17 },
  { participant: "PAN D", contribution: 11 },
  { participant: "Others", contribution: 17 }
];

export const counterpartyPairs = [
  { pair: "PAN A ↔ PAN B", share: "18.4%", volume: "14.8L" },
  { pair: "PAN A ↔ PAN C", share: "11.6%", volume: "9.3L" },
  { pair: "PAN B ↔ PAN D", share: "8.9%", volume: "7.1L" }
];

export const profitMakers = [
  { entity: "Aarav Trading LLP", realized: "₹2.84 Cr", unrealized: "₹1.12 Cr", relation: "Common address cluster" },
  { entity: "Bluepeak Investments", realized: "₹1.96 Cr", unrealized: "₹0.74 Cr", relation: "Funding trail overlap" },
  { entity: "M K Holdings", realized: "₹1.42 Cr", unrealized: "₹0.51 Cr", relation: "Connected mobile number" },
  { entity: "Shivam HUF", realized: "₹0.88 Cr", unrealized: "₹0.33 Cr", relation: "Introducer match" },
  { entity: "Ridgeway Capital", realized: "₹0.71 Cr", unrealized: "₹0.18 Cr", relation: "Trade timing correlation" }
];

export const remarks = [
  { date: "2026-07-20 10:30", officer: "Sanskar", text: "Initial review indicates synchronized accumulation during upper price band sessions." },
  { date: "2026-07-19 16:10", officer: "A. Rao", text: "Requested broker-level KYC linkage report for top five buying clients." }
];
