"use client";

import { useState } from "react";
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { RadarChart as MuiRadarChart, type RadarSeries } from '@mui/x-charts/RadarChart';
import type { HighlightItemIdentifier } from '@mui/x-charts/models';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  ReferenceLine,
  ReferenceArea,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
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
 * Net LTP Contribution Chart (Module 3 — Section 4.1).
 * Per PVASF spec: calculates net LTP contribution (Pos - Neg) divided by 15-day stock price change.
 */
export function LtpChart({ ltpContributors = [] }: { ltpContributors?: Array<{ participant: string; contribution: number }> }) {
  if (!ltpContributors || ltpContributors.length === 0)
    return <div className="text-slate-500 text-xs p-4">No LTP contributors in this window.</div>;

  return (
    <div className="w-full min-w-0 h-[220px] overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ltpContributors} layout="vertical" margin={{ top: 5, right: 25, left: 0, bottom: 5 }}>
          <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} unit="%" domain={["auto", "auto"]} />
          <YAxis dataKey="participant" type="category" stroke="#475569" tick={{ fontSize: 10 }} width={80} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="contribution" name="Net LTP Contribution %" fill="#2563eb" radius={[0, 5, 5, 0]} />
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
    { risk: "High (≥15)", count: high, fill: "#e11d48" },
    { risk: "Medium (10–14)", count: med, fill: "#d97706" },
    { risk: "Low (<10)", count: low, fill: "#059669" },
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
    { bucket: "< 10 (Low)", count: 0, fill: "#059669" },
    { bucket: "10–14 (Med)", count: 0, fill: "#d97706" },
    { bucket: "≥ 15 (High)", count: 0, fill: "#e11d48" },
  ];

  scrips.forEach((s) => {
    if (s.score >= 15) buckets[2].count++;
    else if (s.score >= 10) buckets[1].count++;
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

/**
 * 5-Parameter PVASF Radar (Spider) Chart.
 * Maps Price Rise, Price Z-Score, Volume Z-Score, Band Persistence, 180D New Highs
 * on a 0 to 5 parameter score scale.
 */
export function ParameterRadarChart({
  metrics,
}: {
  metrics?: {
    price_rise_pct?: number;
    price_z?: number;
    volume_z?: number;
    band_hit_days?: number;
    new_high_days?: number;
    final_score?: number;
  };
}) {
  const [highlightedItem, setHighlightedItem] =
    useState<HighlightItemIdentifier<'radar'> | null>(null);
  const [fillArea, setFillArea] = useState<boolean>(true);

  if (!metrics) return <div className="text-slate-500 text-xs p-4">No metrics available.</div>;

  function scorePriceRise(r: number) {
    if (r > 150) return 5;
    if (r >= 76) return 3;
    if (r >= 15) return 1;
    return 0;
  }
  function scoreZ(z: number) {
    if (z >= 3.09) return 5;
    if (z >= 2.33) return 3;
    if (z >= 1.645) return 1;
    return 0;
  }
  function scoreBand(d: number) {
    if (d >= 10) return 5;
    if (d >= 6) return 3;
    if (d >= 3) return 1;
    return 0;
  }
  function scoreNewHigh(d: number) {
    if (d >= 10) return 5;
    if (d >= 5) return 3;
    if (d >= 1) return 1;
    return 0;
  }

  const sPrice = scorePriceRise(metrics.price_rise_pct || 0);
  const sPriceZ = scoreZ(metrics.price_z || 0);
  const sVolZ = scoreZ(metrics.volume_z || 0);
  const sBand = scoreBand(metrics.band_hit_days || 0);
  const sHigh = scoreNewHigh(metrics.new_high_days || 0);

  const series = [
    {
      id: 'scrip-score',
      label: 'Scrip Score',
      labelStr: 'Scrip Score',
      data: [sPrice, sPriceZ, sVolZ, sBand, sHigh],
      color: '#2563eb',
      valueFormatter: (v: number | null) => (v === null ? 'NaN' : `${v}/5 pts`),
    },
    {
      id: 'risk-threshold',
      label: 'Risk Threshold (3.0)',
      labelStr: 'Risk Threshold (3.0)',
      data: [3, 3, 3, 3, 3],
      color: '#d97706',
      valueFormatter: (v: number | null) => (v === null ? 'NaN' : `${v}/5 pts`),
    },
  ];

  const radar = {
    metrics: ['Price Rise', 'Price Z', 'Volume Z', 'Band Hits', '180D Highs'],
    max: 5,
  };

  const withOptions = (sList: typeof series) =>
    sList.map((item) => ({
      ...item,
      fillArea,
    }));

  const handleHighlightedSeries = (_event: any, newHighlightedSeries: string | null) => {
    setHighlightedItem(
      newHighlightedSeries !== null ? { seriesId: newHighlightedSeries } : null
    );
  };

  const leftCards = [
    { label: "Price Rise %", score: sPrice, rawVal: `${Number(metrics.price_rise_pct || 0) >= 0 ? "+" : ""}${Number(metrics.price_rise_pct || 0).toFixed(1)}%`, wt: 25 },
    { label: "Price Z-Score", score: sPriceZ, rawVal: `${Number(metrics.price_z || 0).toFixed(2)}σ`, wt: 20 },
    { label: "Volume Z-Score", score: sVolZ, rawVal: `${Number(metrics.volume_z || 0).toFixed(2)}σ`, wt: 25 },
  ];

  const rightCards = [
    { label: "Band Hits", score: sBand, rawVal: `${metrics.band_hit_days || 0}d`, wt: 15 },
    { label: "180D New Highs", score: sHigh, rawVal: `${metrics.new_high_days || 0}d`, wt: 15 },
  ];

  const renderParameterCard = (item: typeof leftCards[0]) => {
    const fillPct = (item.score / 5) * 100;
    const isHighScore = item.score >= 5;
    const isMidScore = item.score >= 3 && item.score < 5;
    return (
      <div
        key={item.label}
        className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-800">{item.label}</span>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
            Wt: {item.wt}%
          </span>
        </div>

        <div className="flex items-baseline justify-between my-2">
          <span className="text-xl font-black font-mono text-slate-900 tracking-tight">{item.rawVal}</span>
          <span
            className={cn(
              "text-xs font-extrabold px-2.5 py-0.5 rounded-md border font-mono shadow-2xs",
              isHighScore
                ? "bg-red-50 text-red-700 border-red-200"
                : isMidScore
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            )}
          >
            {item.score}/5 pts
          </span>
        </div>

        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isHighScore ? "bg-blue-600" : isMidScore ? "bg-amber-500" : "bg-emerald-500"
            )}
            style={{ width: `${Math.max(fillPct, 8)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <Stack spacing={2.5} sx={{ alignItems: 'center', width: '100%' }}>
      {/* MUI ToggleButtonGroup Top Controls */}
      <ToggleButtonGroup
        value={highlightedItem?.seriesId ?? null}
        exclusive
        onChange={handleHighlightedSeries}
        aria-label="highlighted series"
        fullWidth
        size="small"
      >
        {series.map((item) => (
          <ToggleButton
            key={item.id}
            value={item.id}
            aria-label={`series ${item.labelStr}`}
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.8rem' }}
          >
            {item.labelStr}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* 3-Column Centered Layout: Left 3 Cards | Center Large Radar Chart | Right Cards */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left Column: 3 Cards */}
        <div className="lg:col-span-3 space-y-3">
          {leftCards.map(renderParameterCard)}
        </div>

        {/* Center Column: Large Centered Radar Chart */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center min-h-[380px] bg-slate-50/50 rounded-2xl p-2 border border-slate-100">
          <Box sx={{ width: '100%', height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MuiRadarChart
              height={380}
              highlight="series"
              highlightedItem={highlightedItem}
              onHighlightChange={setHighlightedItem}
              series={withOptions(series)}
              radar={radar}
            />
          </Box>
        </div>

        {/* Right Column: 2 Cards + PVASF Risk Summary Tile */}
        <div className="lg:col-span-3 space-y-3">
          {rightCards.map(renderParameterCard)}

          {/* PVASF Risk Summary Indicator Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Risk Profile</span>
              <span className="text-[10px] font-bold bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                PVASF Engine
              </span>
            </div>
            <div className="mt-2 mb-1 flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-amber-400">
                {metrics.final_score ?? 84}<span className="text-xs font-bold text-slate-400">/100</span>
              </span>
              <span className="text-xs font-extrabold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                High Anomaly
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight mt-1">
              Elevated concentration across Price Z ({sPriceZ}/5) & Volume Z ({sVolZ}/5)
            </p>
          </div>
        </div>
      </div>

      {/* MUI Checkbox Fill Area Toggle */}
      <FormControlLabel
        checked={fillArea}
        control={
          <Checkbox onChange={(event) => setFillArea(event.target.checked)} />
        }
        label="fill area"
        labelPlacement="end"
        sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.85rem', fontWeight: 700, color: '#334155' } }}
      />
    </Stack>
  );
}
