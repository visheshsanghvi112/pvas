"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { PricePoint, ScripSummary } from "@/lib/api";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 font-mono">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500">{entry.name}:</span>
            <span className="font-bold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function PriceChart({ history = [] }: { history?: PricePoint[] }) {
  const data = history.length > 0 ? history : Array.from({ length: 180 }, (_, index) => {
    const base = 118 + index * 0.42 + Math.sin(index / 8) * 4;
    const surge = index > 138 ? (index - 138) * 1.8 : 0;
    return {
      date: `D-${179 - index}`,
      close: Number((base + surge).toFixed(2)),
      ma20: Number((base + surge * 0.55).toFixed(2)),
      ma50: Number((base - 4 + surge * 0.28).toFixed(2))
    };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
        <Tooltip content={<CustomTooltip />} />
        <Line dataKey="close" name="Close Price (₹)" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
        <Line dataKey="ma20" name="20-Day MA" stroke="#059669" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
        <Line dataKey="ma50" name="50-Day MA" stroke="#d97706" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function VolumeChart({ history = [] }: { history?: PricePoint[] }) {
  const data = history.length > 0 ? history : Array.from({ length: 180 }, (_, index) => ({
    date: `D-${179 - index}`,
    volume: Math.round(420000 + Math.sin(index / 5) * 80000 + (index > 150 ? (index - 150) * 85000 : 0))
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="volume" name="Traded Volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LtpChart({ ltpContributors = [] }: { ltpContributors?: Array<{ participant: string; contribution: number }> }) {
  const data = ltpContributors.length > 0 ? ltpContributors : [
    { participant: "PAN A", contribution: 34.2 },
    { participant: "PAN B", contribution: 22.8 },
    { participant: "PAN C", contribution: 16.5 },
    { participant: "PAN D", contribution: 11.4 },
    { participant: "Others", contribution: 15.1 }
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} unit="%" />
        <YAxis dataKey="participant" type="category" stroke="#475569" tick={{ fontSize: 11 }} width={110} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="contribution" name="LTP Contribution %" fill="#2563eb" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskDonut({ scrips = [] }: { scrips?: ScripSummary[] }) {
  let high = scrips.filter(s => s.risk === "High").length;
  let med = scrips.filter(s => s.risk === "Medium").length;
  let low = scrips.filter(s => s.risk === "Low").length;

  if (scrips.length === 0) {
    high = 5;
    med = 4;
    low = 3;
  }

  const data = [
    { risk: "High", count: high, fill: "#e11d48" },
    { risk: "Medium", count: med, fill: "#d97706" },
    { risk: "Low", count: low, fill: "#059669" }
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="risk" innerRadius={55} outerRadius={80} paddingAngle={4}>
          {data.map((entry) => (
            <Cell key={entry.risk} fill={entry.fill} stroke="#ffffff" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ScoreDistributionChart({ scrips = [] }: { scrips?: ScripSummary[] }) {
  const buckets = [
    { bucket: "30-50", count: 0 },
    { bucket: "51-70", count: 0 },
    { bucket: "71-85", count: 0 },
    { bucket: "86-100", count: 0 }
  ];

  if (scrips.length > 0) {
    scrips.forEach((s) => {
      if (s.score <= 50) buckets[0].count++;
      else if (s.score <= 70) buckets[1].count++;
      else if (s.score <= 85) buckets[2].count++;
      else buckets[3].count++;
    });
  } else {
    buckets[0].count = 3;
    buckets[1].count = 4;
    buckets[2].count = 6;
    buckets[3].count = 5;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={buckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="bucket" stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="Scrips" fill="#2563eb" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AlertDriversChart({ breakdown = [] }: { breakdown?: Array<{ label: string; score: number }> }) {
  const data = breakdown.length > 0 ? breakdown : [
    { label: "Price Rise", score: 5 },
    { label: "Price Z", score: 5 },
    { label: "Volume Z", score: 5 },
    { label: "Band Hits", score: 5 },
    { label: "180D High", score: 3 }
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 5]} stroke="#94a3b8" tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="score" name="Parameter Rating (0-5)" fill="#4f46e5" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RollingPriceChart({ history = [] }: { history?: PricePoint[] }) {
  const data = Array.from({ length: 60 }, (_, index) => ({
    day: `D-${59 - index}`,
    price15: Number((1.2 + Math.sin(index / 7) * 0.45 + Math.max(0, index - 42) * 0.12).toFixed(2)),
    price180: Number((0.74 + Math.sin(index / 11) * 0.12).toFixed(2))
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 10 }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Line dataKey="price15" name="15-Day Close Avg" stroke="#db2777" strokeWidth={2.5} dot={false} />
        <Line dataKey="price180" name="180-Day Close Baseline" stroke="#64748b" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RollingVolumeChart() {
  const data = Array.from({ length: 60 }, (_, index) => ({
    day: `D-${59 - index}`,
    volume15: Math.round(640000 + Math.sin(index / 6) * 90000 + Math.max(0, index - 44) * 72000),
    volume180: Math.round(510000 + Math.sin(index / 10) * 28000)
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 10 }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Line dataKey="volume15" name="15-Day Rolling Volume" stroke="#0891b2" strokeWidth={2.5} dot={false} />
        <Line dataKey="volume180" name="180-Day Baseline Volume" stroke="#64748b" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BandEventsChart({ bandHits = 12, newHighs = 7 }: { bandHits?: number; newHighs?: number }) {
  const data = [
    { metric: "Upper Band Hits", days: bandHits },
    { metric: "180D Highs", days: newHighs },
    { metric: "Normal Sessions", days: Math.max(0, 15 - bandHits) }
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
        <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} domain={[0, 15]} />
        <YAxis dataKey="metric" type="category" stroke="#475569" tick={{ fontSize: 11 }} width={120} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="days" name="Days in 15D Window" fill="#0284c7" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OwnershipChangeChart() {
  const data = [
    { holder: "Promoter Group", t180: 54, t: 52 },
    { holder: "Top 1% Concentrated", t180: 65, t: 60 }
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="holder" stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}%`} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="t180" name="T-180 Baseline" fill="#94a3b8" radius={[6, 6, 0, 0]} />
        <Bar dataKey="t" name="Current T Share" fill="#2563eb" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PanHolderChart() {
  const data = [
    { period: "Baseline (T-180)", holders: 80 },
    { period: "Current (T)", holders: 123 }
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="period" stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="holders" name="Unique PAN Trading" fill="#059669" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
