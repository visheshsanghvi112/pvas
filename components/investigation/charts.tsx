"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  ReferenceLine,
  ReferenceArea,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { PricePoint, ScripSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded border border-slate-200 bg-white p-2.5 text-xs shadow-xl font-mono">
        <p className="font-bold text-slate-800 mb-1 font-sans">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500">{entry.name}:</span>
            <span className="font-bold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/** Compute simple moving average for a numeric array. Returns null for insufficient data. */
function computeMA(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    const slice = values.slice(i - period + 1, i + 1);
    return Math.round((slice.reduce((a, b) => a + b, 0) / period) * 100) / 100;
  });
}

/**
 * 180-Day Price Chart (Module 2).
 * Shows Close price, 20-Day MA, 50-Day MA.
 * Computes MAs client-side if backend did not return them.
 * Highlights the last 15 trading days (the PVASF "recent window").
 */
export function PriceChart({ history = [] }: { history?: PricePoint[] }) {
  if (!history || history.length === 0)
    return <div className="text-slate-500 text-xs p-4">No price data available.</div>;

  const closes = history.map((h) => h.close);
  const computedMA20 = computeMA(closes, 20);
  const computedMA50 = computeMA(closes, 50);

  const enriched = history.map((h, i) => ({
    ...h,
    ma20: h.ma20 ?? computedMA20[i],
    ma50: h.ma50 ?? computedMA50[i],
  }));

  // Highlight the last 15 days (PVASF recent observation window)
  const recentStart = enriched.length >= 15 ? enriched[enriched.length - 15].date : enriched[0]?.date;
  const recentEnd = enriched[enriched.length - 1]?.date;

  // 180-Day Peak High level across the historical window
  const max180High = Math.max(...history.map((h) => h.high ?? h.close));

  return (
    <div className="w-full min-w-0 h-[260px] overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={enriched} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} domain={["auto", "auto"]} width={50} />
          <Tooltip content={<CustomTooltip />} />
          {/* 15-day recent window highlight */}
          {recentStart && recentEnd && (
            <ReferenceArea x1={recentStart} x2={recentEnd} fill="#fef08a" fillOpacity={0.25}
              label={{ value: "15D Window", position: "insideTopLeft", fontSize: 9, fill: "#92400e" }} />
          )}
          {max180High > 0 && (
            <ReferenceLine y={max180High} stroke="#e11d48" strokeDasharray="3 3"
              label={{ value: `180D High (₹${max180High})`, position: "insideTopRight", fontSize: 9, fill: "#e11d48" }} />
          )}
          <Line dataKey="close" name="Close (₹)" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
          <Line dataKey="ma20" name="MA-20" stroke="#059669" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />
          <Line dataKey="ma50" name="MA-50" stroke="#d97706" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Volume bar chart (Module 2).
 */
export function VolumeChart({ history = [] }: { history?: PricePoint[] }) {
  if (!history || history.length === 0)
    return <div className="text-slate-500 text-xs p-4">No volume data available.</div>;
  return (
    <div className="w-full min-w-0 h-[200px] overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={history} margin={{ top: 5, right: 15, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} width={55} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v)} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="volume" name="Volume" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Rolling 15-Day Average Volume (Module 2 — Section 5 of PVASF spec).
 * Shows volume bars with the rolling 15D average as an overlay line.
 */
export function RollingVolumeChart({ history = [] }: { history?: PricePoint[] }) {
  if (!history || history.length === 0)
    return <div className="text-slate-500 text-xs p-4">No volume data available.</div>;

  const volumes = history.map((h) => h.volume);
  const rolling15 = computeMA(volumes, 15);

  const enriched = history.map((h, i) => ({
    ...h,
    rolling15d: rolling15[i],
  }));

  return (
    <div className="w-full min-w-0 h-[200px] overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={enriched} margin={{ top: 5, right: 15, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} width={55} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v)} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="volume" name="Volume" fill="#93c5fd" radius={[2, 2, 0, 0]} />
          <Line dataKey="rolling15d" name="15D Avg Vol" stroke="#1d4ed8" strokeWidth={2} dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * LTP Upward Contribution Chart (Module 3 — Section 4.1).
 * Per PVASF spec: only buy-aggressive / upward (+) LTP moves count.
 * Negative contributors are filtered out.
 */
export function LtpChart({ ltpContributors = [] }: { ltpContributors?: Array<{ participant: string; contribution: number }> }) {
  const upwardOnly = (ltpContributors ?? []).filter((p) => p.contribution > 0);
  if (upwardOnly.length === 0)
    return <div className="text-slate-500 text-xs p-4">No upward LTP contributors in this window.</div>;

  return (
    <div className="w-full min-w-0 h-[220px] overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={upwardOnly} layout="vertical" margin={{ top: 5, right: 25, left: 0, bottom: 5 }}>
          <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} unit="%" domain={[0, "auto"]} />
          <YAxis dataKey="participant" type="category" stroke="#475569" tick={{ fontSize: 10 }} width={80} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="contribution" name="LTP Contribution %" fill="#2563eb" radius={[0, 5, 5, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Alert Drivers (Score Breakdown) Chart — Overview tab.
 * Shows the weighted contribution of each PVASF parameter to the final score.
 * Domain 0-100 so contribution is visually proportional.
 */
export function AlertDriversChart({ breakdown = [] }: { breakdown?: Array<{ label: string; score: number; weight: number; contribution: number }> }) {
  if (!breakdown || breakdown.length === 0)
    return <div className="text-slate-500 text-xs p-4">No score breakdown available.</div>;

  const PARAM_METADATA: Record<string, { color: string; bg: string; border: string; bar: string }> = {
    "Price Rise": { color: "text-blue-700", bg: "bg-blue-50/60", border: "border-blue-200", bar: "bg-blue-600" },
    "Price Z": { color: "text-indigo-700", bg: "bg-indigo-50/60", border: "border-indigo-200", bar: "bg-indigo-600" },
    "Volume Z": { color: "text-cyan-700", bg: "bg-cyan-50/60", border: "border-cyan-200", bar: "bg-cyan-600" },
    "Band Persistence": { color: "text-amber-700", bg: "bg-amber-50/60", border: "border-amber-200", bar: "bg-amber-600" },
    "180 Day New High": { color: "text-rose-700", bg: "bg-rose-50/60", border: "border-rose-200", bar: "bg-rose-600" },
  };

  return (
    <div className="w-full space-y-3">
      {breakdown.map((b) => {
        const meta = PARAM_METADATA[b.label] || { color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200", bar: "bg-slate-600" };
        const contribution = Math.round((b.weight * b.score) / 5 * 10) / 10;
        const pctFill = (b.score / 5) * 100;

        return (
          <div key={b.label} className={cn("p-3 rounded-xl border flex flex-col gap-2 transition-colors", meta.bg, meta.border)}>
            <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
              <span className={cn("font-bold text-sm", meta.color)}>{b.label}</span>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-slate-500">Weight: <strong>{b.weight}%</strong></span>
                <span className="text-slate-500">Score: <strong>{b.score}/5</strong></span>
                <span className={cn("font-bold text-sm", meta.color)}>+{contribution} pts</span>
              </div>
            </div>
            <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
              <div
                className={cn("h-2 rounded-full transition-all duration-500", meta.bar)}
                style={{ width: `${Math.max(pctFill, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Risk Donut — Dashboard right panel.
 */
export function RiskDonut({ scrips = [] }: { scrips?: ScripSummary[] }) {
  const high = scrips.filter((s) => s.risk === "High").length;
  const med = scrips.filter((s) => s.risk === "Medium").length;
  const low = scrips.filter((s) => s.risk === "Low").length;

  const data = [
    { risk: "High (≥75)", count: high, fill: "#e11d48" },
    { risk: "Medium (60-74)", count: med, fill: "#d97706" },
    { risk: "Low (<60)", count: low, fill: "#059669" },
  ];

  if (scrips.length === 0) return <div className="text-slate-500 text-xs p-4">No data available.</div>;

  return (
    <div className="w-full min-w-0 h-[220px] overflow-hidden flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="risk" innerRadius={50} outerRadius={75} paddingAngle={4}>
            {data.map((entry) => (
              <Cell key={entry.risk} fill={entry.fill} stroke="#ffffff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Score Distribution Chart — Dashboard right panel.
 * Buckets aligned to PVASF thresholds: <60 (Low), 60-74 (Medium), ≥75 (High).
 */
export function ScoreDistributionChart({ scrips = [] }: { scrips?: ScripSummary[] }) {
  if (scrips.length === 0) return <div className="text-slate-500 text-xs p-4">No data available.</div>;

  const buckets = [
    { bucket: "< 60 (Low)", count: 0, fill: "#059669" },
    { bucket: "60–74 (Med)", count: 0, fill: "#d97706" },
    { bucket: "≥ 75 (High)", count: 0, fill: "#e11d48" },
  ];

  scrips.forEach((s) => {
    if (s.score >= 75) buckets[2].count++;
    else if (s.score >= 60) buckets[1].count++;
    else buckets[0].count++;
  });

  return (
    <div className="w-full min-w-0 h-[220px] overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="bucket" stroke="#94a3b8" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 11 }} width={30} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Scrips" radius={[5, 5, 0, 0]}>
            {buckets.map((b) => (
              <Cell key={b.bucket} fill={b.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
