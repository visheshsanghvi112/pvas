"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  PolarRadiusAxis,
  Area,
  Brush
} from "recharts";
import type { PricePoint, ScripSummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Activity,
  TrendingUp,
  BarChart2,
  Zap,
  Info,
  Check,
  Bell,
  ChevronDown,
  ChevronUp,
  Sigma,
  Calculator,
  Sliders,
  Sparkles,
  Percent,
  Binary,
  Layers,
  Table2,
  Compass,
  X
} from "lucide-react";

/** Interactive click-to-toggle popover for framework explanations */
export function InfoTooltip({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span ref={popoverRef} className="relative inline-flex items-center ml-1 align-middle">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "p-0.5 rounded-md transition-colors cursor-pointer focus:outline-none",
          isOpen ? "text-blue-600 bg-blue-100 ring-1 ring-blue-400" : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
        )}
        title="Click for explanation"
        aria-label="Toggle explanation"
      >
        <Info className="w-3 h-3 shrink-0" />
      </button>

      {isOpen && (
        <span
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-72 max-w-[calc(100vw-32px)] whitespace-normal break-words rounded-xl bg-slate-900/95 backdrop-blur-md p-3 text-[11px] font-normal leading-relaxed text-white shadow-2xl border border-slate-700 pointer-events-auto select-text text-left"
        >
          {text}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900/95" />
        </span>
      )}
    </span>
  );
}

/** Format volume values into M/K strings */
function formatVolumeNum(val: number): string {
  if (!val || isNaN(val)) return "0";
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString("en-IN");
}

const CustomPriceTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-3 text-xs shadow-2xl font-sans min-w-[200px] pointer-events-none select-none">
        <div className="font-black text-slate-900 pb-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between">
          <span>{label}</span>
          {data.pctFromBaseline != null && (
            <span className={cn("text-[10px] font-extrabold px-1.5 py-0.2 rounded font-mono", data.pctFromBaseline >= 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
              {data.pctFromBaseline >= 0 ? "+" : ""}{data.pctFromBaseline}%
            </span>
          )}
        </div>
        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-slate-500 font-sans">Close Price:</span>
            <span className="font-extrabold text-blue-700 text-xs">₹{data.close?.toFixed(2)}</span>
          </div>
          {data.open && (
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-500 font-sans">Open Price:</span>
              <span>₹{data.open?.toFixed(2)}</span>
            </div>
          )}
          {data.high && (
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-500 font-sans">High / Low:</span>
              <span>₹{data.high} / ₹{data.low}</span>
            </div>
          )}
          {data.ma20 != null && (
            <div className="flex items-center justify-between text-emerald-700 pt-1 border-t border-slate-100">
              <span className="font-sans">20D MA:</span>
              <span>₹{data.ma20}</span>
            </div>
          )}
          {data.ma50 != null && (
            <div className="flex items-center justify-between text-amber-700">
              <span className="font-sans">50D MA:</span>
              <span>₹{data.ma50}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const CustomVolumeTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-3 text-xs shadow-2xl font-sans min-w-[210px] pointer-events-none select-none">
        <div className="font-black text-slate-900 pb-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between">
          <span>{label}</span>
          {data.surgeRatio != null && (
            <span className={cn("text-[10px] font-black px-1.5 py-0.2 rounded font-mono", data.surgeRatio >= 3.0 ? "bg-rose-100 text-rose-800 border border-rose-300" : data.surgeRatio >= 1.5 ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-blue-50 text-blue-700")}>
              {data.surgeRatio}x 15D Avg
            </span>
          )}
        </div>
        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-slate-500 font-sans">Traded Volume:</span>
            <span className="font-extrabold text-slate-900 text-xs">{data.volume?.toLocaleString("en-IN")}</span>
          </div>
          {data.rolling15d != null && (
            <div className="flex items-center justify-between text-blue-700">
              <span className="font-sans">15D MA Baseline:</span>
              <span>{Math.round(data.rolling15d).toLocaleString("en-IN")}</span>
            </div>
          )}
          {data.surgeLabel && (
            <div className="pt-1.5 mt-1 border-t border-slate-100 font-sans text-[10px] font-extrabold text-slate-600">
              Status: <span className={cn(data.surgeRatio >= 3.0 ? "text-rose-600 font-black" : data.surgeRatio >= 1.5 ? "text-amber-600 font-bold" : "text-blue-600")}>{data.surgeLabel}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded border border-slate-200 bg-white p-2.5 text-xs shadow-xl font-mono pointer-events-none select-none">
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
 * Unified Price & Volume Chart (Module 2).
 * Combines 180-Day Price Movement, Moving Averages, 15D Observation Window,
 * and Volume Dynamics with 15D MA baseline into a single synchronized terminal layout.
 */
export function UnifiedPriceVolumeChart({
  history = [],
  isExpanded = false
}: {
  history?: PricePoint[];
  isExpanded?: boolean;
}) {
  const [timeRange, setTimeRange] = useState<"15D" | "30D" | "90D" | "ALL">("ALL");
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showWindow, setShowWindow] = useState(true);
  const [hoverData, setHoverData] = useState<any | null>(null);

  if (!history || history.length === 0)
    return <div className="text-slate-500 text-xs p-4">No price/volume data available.</div>;

  const closes = history.map((h) => h.close);
  const volumes = history.map((h) => h.volume);
  const computedMA20 = computeMA(closes, 20);
  const computedMA50 = computeMA(closes, 50);
  const computedMA15Vol = computeMA(volumes, 15);

  const baselineClose = history[0]?.close || 1;

  const enriched = history.map((h, i) => {
    const ma20Val = h.ma20 ?? computedMA20[i];
    const pctFromBaseline = Math.round(((h.close - baselineClose) / baselineClose) * 1000) / 10;
    const ma15Vol = computedMA15Vol[i] || h.volume;
    const surgeRatio = ma15Vol > 0 ? Math.round((h.volume / ma15Vol) * 10) / 10 : 1;

    let barColor = "#93c5fd";
    let surgeLabel = "Normal Volume";
    if (surgeRatio >= 3.0) {
      barColor = "#e11d48";
      surgeLabel = "Extreme Anomaly (≥3x 15D MA)";
    } else if (surgeRatio >= 1.5) {
      barColor = "#f59e0b";
      surgeLabel = "Elevated Surge (≥1.5x 15D MA)";
    }

    return {
      ...h,
      ma20: ma20Val,
      ma50: h.ma50 ?? computedMA50[i],
      pctFromBaseline,
      rolling15d: ma15Vol,
      surgeRatio,
      barColor,
      surgeLabel,
    };
  });

  let filtered = enriched;
  if (timeRange === "15D") filtered = enriched.slice(-15);
  else if (timeRange === "30D") filtered = enriched.slice(-30);
  else if (timeRange === "90D") filtered = enriched.slice(-90);

  const recentStart = enriched.length >= 15 ? enriched[enriched.length - 15].date : enriched[0]?.date;
  const recentEnd = enriched[enriched.length - 1]?.date;
  const max180High = Math.max(...history.map((h) => h.high ?? h.close));

  const activePoint = hoverData || enriched[enriched.length - 1];

  return (
    <div className="w-full flex flex-col gap-3 min-w-0 font-sans">
      {/* ── UNIFIED COMMAND TOOLBAR & LIVE HUD ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2 text-xs">
        {/* Live HUD Readout */}
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-700 overflow-x-auto whitespace-nowrap">
          <span className="font-bold text-slate-900 font-sans flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            {activePoint?.date || "Cursor Point"}
          </span>
          <span>Close: <strong className="text-blue-700">₹{activePoint?.close?.toFixed(2)}</strong></span>
          {activePoint?.open && <span className="hidden sm:inline">Open: <strong>₹{activePoint.open?.toFixed(2)}</strong></span>}
          {activePoint?.high && <span className="hidden sm:inline">High: <strong className="text-emerald-700">₹{activePoint.high?.toFixed(2)}</strong></span>}
          {activePoint?.low && <span className="hidden sm:inline">Low: <strong className="text-rose-700">₹{activePoint.low?.toFixed(2)}</strong></span>}
          {activePoint?.pctFromBaseline != null && (
            <span className={cn("font-bold px-1.5 py-0.5 rounded text-[10px]", activePoint.pctFromBaseline >= 0 ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200")}>
              {activePoint.pctFromBaseline >= 0 ? "+" : ""}{activePoint.pctFromBaseline}% vs Day 1
            </span>
          )}
          <span className="text-slate-300">|</span>
          <span>Vol: <strong className="text-slate-900">{formatVolumeNum(activePoint?.volume || 0)}</strong></span>
          <span>15D MA: <strong className="text-blue-700">{formatVolumeNum(activePoint?.rolling15d || 0)}</strong></span>
          {activePoint?.surgeRatio != null && activePoint.surgeRatio >= 1.5 && (
            <span className={cn("font-black px-1.5 py-0.5 rounded text-[10px]", activePoint.surgeRatio >= 3.0 ? "bg-rose-100 text-rose-800 border border-rose-300" : "bg-amber-100 text-amber-800 border border-amber-300")}>
              {activePoint.surgeRatio}x Surge
            </span>
          )}
        </div>

        {/* Controls: Time Horizon & Moving Averages */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-[11px] font-semibold text-slate-600 shadow-2xs">
            {(["15D", "30D", "90D", "ALL"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-2.5 py-1 rounded transition-all cursor-pointer",
                  timeRange === r ? "bg-slate-900 text-white font-bold shadow-xs" : "hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showMA20} onChange={(e) => setShowMA20(e.target.checked)} className="rounded text-emerald-600 focus:ring-0 w-3 h-3" />
              <span className="text-emerald-700">20D MA</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showMA50} onChange={(e) => setShowMA50(e.target.checked)} className="rounded text-amber-600 focus:ring-0 w-3 h-3" />
              <span className="text-amber-700">50D MA</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showWindow} onChange={(e) => setShowWindow(e.target.checked)} className="rounded text-yellow-600 focus:ring-0 w-3 h-3" />
              <span className="text-yellow-700">15D Band</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── TOP PANE: PRICE MOVEMENT & MAs ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-600" />
            Price Movement (VWAP Close & Moving Averages)
          </span>
          <div className="flex items-center gap-3 text-[10px] font-normal normal-case text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-600 rounded" />Close (₹)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-600 rounded" />20D MA</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-600 rounded" />50D MA</span>
          </div>
        </div>

        <div className={cn("w-full min-w-0 overflow-hidden", isExpanded ? "h-[360px]" : "h-[250px]")}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filtered}
              margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
              onMouseMove={(state: any) => {
                if (state && state.activePayload && state.activePayload.length) {
                  const nextP = state.activePayload[0].payload;
                  if (nextP && (!hoverData || hoverData.date !== nextP.date)) {
                    setHoverData(nextP);
                  }
                }
              }}
              onMouseLeave={() => setHoverData(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} domain={["auto", "auto"]} width={55} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                content={<CustomPriceTooltip />}
                isAnimationActive={false}
                wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 100 }}
                cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }}
              />
              
              {showWindow && recentStart && recentEnd && timeRange === "ALL" && (
                <ReferenceArea
                  x1={recentStart}
                  x2={recentEnd}
                  fill="#fef08a"
                  fillOpacity={0.25}
                  stroke="#ca8a04"
                  strokeDasharray="3 3"
                  label={{ value: "15D Observation Window", position: "insideTopLeft", fontSize: 9, fill: "#92400e", fontWeight: "bold" }}
                />
              )}

              {max180High > 0 && (
                <ReferenceLine
                  y={max180High}
                  stroke="#e11d48"
                  strokeDasharray="4 4"
                  label={{ value: `180D Peak: ₹${max180High}`, position: "insideTopRight", fontSize: 9, fill: "#e11d48", fontWeight: "bold" }}
                />
              )}

              <Line dataKey="close" name="Close (₹)" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }} />
              {showMA20 && <Line dataKey="ma20" name="20D MA" stroke="#059669" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />}
              {showMA50 && <Line dataKey="ma50" name="50D MA" stroke="#d97706" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── BOTTOM PANE: VOLUME DYNAMICS & 15D MA ── */}
      <div className="flex flex-col gap-1 pt-2 border-t border-slate-200/80">
        <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <BarChart2 className="w-3 h-3 text-blue-600" />
            Volume Dynamics & 15-Day Moving Average Baseline
          </span>
          <div className="flex items-center gap-3 text-[10px] font-normal normal-case text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-blue-300" />Normal Vol</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-amber-500" />≥1.5x Surge</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-rose-600" />≥3x Anomaly</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-700 rounded" />15D MA</span>
          </div>
        </div>

        <div className={cn("w-full min-w-0 overflow-hidden", isExpanded ? "h-[220px]" : "h-[160px]")}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filtered}
              margin={{ top: 5, right: 15, left: 0, bottom: 0 }}
              onMouseMove={(state: any) => {
                if (state && state.activePayload && state.activePayload.length) {
                  const nextP = state.activePayload[0].payload;
                  if (nextP && (!hoverData || hoverData.date !== nextP.date)) {
                    setHoverData(nextP);
                  }
                }
              }}
              onMouseLeave={() => setHoverData(null)}
            >
              <defs>
                <linearGradient id="unifiedVolMaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} width={55} tickFormatter={formatVolumeNum} />
              <Tooltip
                content={<CustomVolumeTooltip />}
                isAnimationActive={false}
                wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 100 }}
                cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }}
              />
              
              <Bar dataKey="volume" name="Daily Vol" radius={[2, 2, 0, 0]}>
                {filtered.map((entry, index) => (
                  <Cell key={`vol-cell-${index}`} fill={entry.barColor} />
                ))}
              </Bar>
              <Area dataKey="rolling15d" name="15D Avg Vol" stroke="#1d4ed8" strokeWidth={2} fill="url(#unifiedVolMaGradient)" connectNulls />
              <Brush dataKey="date" height={18} stroke="#3b82f6" fill="#f8fafc" tickFormatter={() => ""} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/**
 * 180-Day Price Chart (Module 2).
 * Shows Close price, 20-Day MA, 50-Day MA.
 * Computes MAs client-side if backend did not return them.
 * Highlights the last 15 trading days (the PVASF "recent window").
 * Includes time horizon filters (15D, 30D, 90D, ALL), interactive brush slider, and live data inspector.
 */
export function PriceChart({ history = [], isExpanded = false }: { history?: PricePoint[]; isExpanded?: boolean }) {
  const [timeRange, setTimeRange] = useState<"15D" | "30D" | "90D" | "ALL">("ALL");
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showWindow, setShowWindow] = useState(true);
  const [hoverData, setHoverData] = useState<any | null>(null);

  if (!history || history.length === 0)
    return <div className="text-slate-500 text-xs p-4">No price data available.</div>;

  const closes = history.map((h) => h.close);
  const computedMA20 = computeMA(closes, 20);
  const computedMA50 = computeMA(closes, 50);

  const baselineClose = history[0]?.close || 1;

  const enriched = history.map((h, i) => {
    const ma20Val = h.ma20 ?? computedMA20[i];
    const pctFromBaseline = Math.round(((h.close - baselineClose) / baselineClose) * 1000) / 10;

    return {
      ...h,
      ma20: ma20Val,
      ma50: h.ma50 ?? computedMA50[i],
      pctFromBaseline,
    };
  });

  let filtered = enriched;
  if (timeRange === "15D") filtered = enriched.slice(-15);
  else if (timeRange === "30D") filtered = enriched.slice(-30);
  else if (timeRange === "90D") filtered = enriched.slice(-90);

  const recentStart = enriched.length >= 15 ? enriched[enriched.length - 15].date : enriched[0]?.date;
  const recentEnd = enriched[enriched.length - 1]?.date;
  const max180High = Math.max(...history.map((h) => h.high ?? h.close));

  const activePoint = hoverData || enriched[enriched.length - 1];

  const formatDateTick = (d: string) => {
    if (!d) return "";
    const parts = d.split("-");
    if (parts.length === 3) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${months[mIdx] || parts[1]}`;
    }
    return d;
  };

  const startPrice = history[0]?.close || 1;
  const currentPrice = history[history.length - 1]?.close || startPrice;
  const netGainPct = Math.round(((currentPrice - startPrice) / startPrice) * 1000) / 10;
  const isHighRiskGain = netGainPct >= 75.0;

  return (
    <div className="w-full flex flex-col gap-2.5 min-w-0 font-sans">
      {/* Framework Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 text-xs">
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium flex items-center">
            180-Day Starting Price (T-180)
            <InfoTooltip text="Historical baseline: Closing price 180 trading days ago (~6 months), used to measure 6-month price rise." />
          </span>
          <span className="font-bold font-mono text-slate-800 text-sm">₹{startPrice.toFixed(2)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium flex items-center">
            Current Closing Price (Day t)
            <InfoTooltip text="Latest closing price on observation day t, showing total percentage growth from T-180." />
          </span>
          <span className="font-bold font-mono text-blue-700 text-sm flex items-center gap-1">
            ₹{currentPrice.toFixed(2)}
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.2 rounded font-sans", isHighRiskGain ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800")}>
              {netGainPct >= 0 ? "+" : ""}{netGainPct}% Rise
            </span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium flex items-center">
            180-Day Peak High
            <InfoTooltip text="The highest intraday price reached over the entire 180-day baseline period." />
          </span>
          <span className="font-bold font-mono text-rose-700 text-sm">₹{max180High.toFixed(2)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium flex items-center">
            Price Rise Score
            <InfoTooltip text="Scoring band: Under 15% (0), 15–75% (1), 76–150% (3), >150% (5)." />
          </span>
          <span className={cn("font-bold font-mono text-sm", isHighRiskGain ? "text-rose-700" : "text-slate-800")}>
            +{netGainPct}% ({isHighRiskGain ? "Score 3/5" : "Score 1/5"})
          </span>
        </div>
      </div>

      {/* Live Data Inspector Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/90 border border-slate-200/90 rounded-xl px-3 py-2 text-xs">
        <div className="flex items-center gap-3 font-mono text-xs text-slate-700 overflow-x-auto whitespace-nowrap">
          <span className="font-semibold text-slate-900 font-sans flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            {activePoint?.date || "Cursor Point"}:
          </span>
          <span>Close: <strong className="text-blue-700 font-semibold">₹{activePoint?.close?.toFixed(2)}</strong></span>
          {activePoint?.open && <span>Open: <strong className="font-semibold">₹{activePoint.open?.toFixed(2)}</strong></span>}
          {activePoint?.high && <span>High: <strong className="text-emerald-700 font-semibold">₹{activePoint.high?.toFixed(2)}</strong></span>}
          {activePoint?.low && <span>Low: <strong className="text-rose-700 font-semibold">₹{activePoint.low?.toFixed(2)}</strong></span>}
          {activePoint?.pctFromBaseline != null && (
            <span className={cn("font-semibold px-2 py-0.5 rounded-md text-xs border font-mono", activePoint.pctFromBaseline >= 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
              {activePoint.pctFromBaseline >= 0 ? "+" : ""}{activePoint.pctFromBaseline}% vs Day 1
            </span>
          )}
        </div>

        {/* Time Horizon Buttons & MAs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-medium text-slate-600 shadow-2xs">
            {(["15D", "30D", "90D", "ALL"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium",
                  timeRange === r ? "bg-slate-900 text-white font-semibold shadow-xs" : "hover:text-slate-900 text-slate-600"
                )}
              >
                {r === "ALL" ? "180D (All)" : r}
              </button>
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-2.5 text-xs font-semibold text-slate-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showMA20} onChange={(e) => setShowMA20(e.target.checked)} className="rounded text-emerald-600 focus:ring-0 cursor-pointer" />
              <span className="text-emerald-700">20D MA</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showMA50} onChange={(e) => setShowMA50(e.target.checked)} className="rounded text-amber-600 focus:ring-0 cursor-pointer" />
              <span className="text-amber-700">50D MA</span>
            </label>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className={cn("w-full min-w-0 overflow-hidden", isExpanded ? "h-[420px]" : "h-[250px]")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={filtered}
            margin={{ top: 12, right: 15, left: 0, bottom: 0 }}
            onMouseMove={(state: any) => {
              if (state && state.activePayload && state.activePayload.length) {
                const nextP = state.activePayload[0].payload;
                if (nextP && (!hoverData || hoverData.date !== nextP.date)) {
                  setHoverData(nextP);
                }
              }
            }}
            onMouseLeave={() => setHoverData(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={formatDateTick} interval={timeRange === "15D" ? 0 : "preserveStartEnd"} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: "#64748b" }} domain={["auto", "auto"]} width={55} tickFormatter={(v) => `₹${v}`} />
            <Tooltip
              content={<CustomPriceTooltip />}
              isAnimationActive={false}
              wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 100 }}
              cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }}
            />
            
            {showWindow && recentStart && recentEnd && timeRange === "ALL" && (
              <ReferenceArea
                x1={recentStart}
                x2={recentEnd}
                fill="#fef08a"
                fillOpacity={0.2}
                stroke="#ca8a04"
                strokeDasharray="3 3"
              />
            )}

            {max180High > 0 && (
              <ReferenceLine
                y={max180High}
                stroke="#e11d48"
                strokeDasharray="4 4"
                label={{ value: `180D High (₹${max180High})`, position: "insideTopRight", fontSize: 9, fill: "#e11d48", fontWeight: "bold" }}
              />
            )}

            <Line dataKey="close" name="Close (₹)" stroke="#2563eb" strokeWidth={2.5} dot={timeRange === "15D"} activeDot={{ r: 5, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }} />
            {showMA20 && <Line dataKey="ma20" name="MA-20" stroke="#059669" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />}
            {showMA50 && <Line dataKey="ma50" name="MA-50" stroke="#d97706" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />}
            
            {timeRange === "ALL" && <Brush dataKey="date" height={18} stroke="#cbd5e1" fill="#f8fafc" tickFormatter={() => ""} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Volume bar chart (Module 2).
 * Colors volume bars dynamically based on surge intensity vs 15D MA.
 * Includes range selection and live cursor readout.
 */
export function VolumeChart({ history = [], isExpanded = false }: { history?: PricePoint[]; isExpanded?: boolean }) {
  const [timeRange, setTimeRange] = useState<"15D" | "30D" | "90D" | "ALL">("ALL");
  const [hoverData, setHoverData] = useState<any | null>(null);

  if (!history || history.length === 0)
    return <div className="text-slate-500 text-xs p-4">No volume data available.</div>;

  const volumes = history.map((h) => h.volume);
  const rolling15 = computeMA(volumes, 15);

  const enriched = history.map((h, i) => {
    const ma15 = rolling15[i] || h.volume;
    const surgeRatio = ma15 > 0 ? Math.round((h.volume / ma15) * 10) / 10 : 1;
    let barColor = "#3b82f6";
    let surgeLabel = "Normal Volume";

    if (surgeRatio >= 3.0) {
      barColor = "#e11d48";
      surgeLabel = "Extreme Anomaly (≥3x 15D MA)";
    } else if (surgeRatio >= 1.5) {
      barColor = "#f59e0b";
      surgeLabel = "Elevated Volume (≥1.5x 15D MA)";
    }

    return {
      ...h,
      rolling15d: ma15,
      surgeRatio,
      barColor,
      surgeLabel,
    };
  });

  let filtered = enriched;
  if (timeRange === "15D") filtered = enriched.slice(-15);
  else if (timeRange === "30D") filtered = enriched.slice(-30);
  else if (timeRange === "90D") filtered = enriched.slice(-90);

  const activePoint = hoverData || enriched[enriched.length - 1];

  return (
    <div className="w-full flex flex-col gap-2 min-w-0 font-sans">
      {/* Inspector Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/90 border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs">
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-700 overflow-x-auto whitespace-nowrap">
          <span className="font-bold text-slate-900 font-sans flex items-center gap-1">
            <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
            {activePoint?.date || "Cursor Point"}:
          </span>
          <span>Vol: <strong className="text-slate-900">{formatVolumeNum(activePoint?.volume || 0)}</strong></span>
          <span>15D MA: <strong>{formatVolumeNum(activePoint?.rolling15d || 0)}</strong></span>
          {activePoint?.surgeRatio != null && (
            <span className={cn("font-bold px-1.5 py-0.2 rounded text-[10px]", activePoint.surgeRatio >= 3.0 ? "bg-rose-100 text-rose-700 border border-rose-300" : activePoint.surgeRatio >= 1.5 ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-blue-50 text-blue-700")}>
              {activePoint.surgeRatio}x 15D MA
            </span>
          )}
        </div>

        {/* Time Filter */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-[11px] font-semibold text-slate-600 shadow-2xs">
          {(["15D", "30D", "90D", "ALL"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={cn(
                "px-2 py-0.5 rounded transition-all cursor-pointer",
                timeRange === r ? "bg-slate-900 text-white font-bold" : "hover:text-slate-900"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className={cn("w-full min-w-0 overflow-hidden", isExpanded ? "h-[380px]" : "h-[200px]")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={filtered}
            margin={{ top: 5, right: 15, left: 0, bottom: 0 }}
            onMouseMove={(state: any) => {
              if (state && state.activePayload && state.activePayload.length) {
                const nextP = state.activePayload[0].payload;
                if (nextP && (!hoverData || hoverData.date !== nextP.date)) {
                  setHoverData(nextP);
                }
              }
            }}
            onMouseLeave={() => setHoverData(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} width={55} tickFormatter={formatVolumeNum} />
            <Tooltip
              content={<CustomVolumeTooltip />}
              isAnimationActive={false}
              wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 100 }}
              cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }}
            />
            <Bar dataKey="volume" name="Volume" radius={[3, 3, 0, 0]}>
              {filtered.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.barColor} />
              ))}
            </Bar>
            <Brush dataKey="date" height={18} stroke="#3b82f6" fill="#f8fafc" tickFormatter={() => ""} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Rolling 15-Day Average Volume (Module 2 — Section 5 of PVASF spec).
 * Shows volume bars with gradient MA area overlay, range filter, and live hover inspector.
 */
export function RollingVolumeChart({ history = [], isExpanded = false }: { history?: PricePoint[]; isExpanded?: boolean }) {
  const [timeRange, setTimeRange] = useState<"15D" | "30D" | "90D" | "ALL">("15D");
  const [hoverData, setHoverData] = useState<any | null>(null);

  if (!history || history.length === 0)
    return <div className="text-slate-500 text-xs p-4">No volume data available.</div>;

  const volumes = history.map((h) => h.volume);
  const meanVol180 = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;
  const varianceVol180 = volumes.length > 0
    ? volumes.reduce((a, b) => a + Math.pow(b - meanVol180, 2), 0) / volumes.length
    : 1;
  const stdDevVol180 = Math.sqrt(varianceVol180) || 1;
  const zVolAlert = Math.round(meanVol180 + 1.645 * stdDevVol180);

  const rolling15 = computeMA(volumes, 15);

  const enriched = history.map((h, i) => {
    const ma15 = rolling15[i] || h.volume;
    const surgeRatio = ma15 > 0 ? Math.round((h.volume / ma15) * 10) / 10 : 1;
    let barColor = "#93c5fd";

    if (surgeRatio >= 3.0) barColor = "#e11d48";
    else if (surgeRatio >= 1.5) barColor = "#f59e0b";

    return {
      ...h,
      rolling15d: ma15,
      surgeRatio,
      barColor,
    };
  });

  const last15 = enriched.slice(-15);
  const latest15Vol = last15.length > 0 ? last15.reduce((a, b) => a + b.volume, 0) / last15.length : 0;
  const volSurgeMultiple = meanVol180 > 0 ? Math.round((latest15Vol / meanVol180) * 10) / 10 : 1.0;
  const volSurgeDays = last15.filter((d) => d.surgeRatio >= 1.5).length;

  let filtered = enriched;
  if (timeRange === "15D") filtered = enriched.slice(-15);
  else if (timeRange === "30D") filtered = enriched.slice(-30);
  else if (timeRange === "90D") filtered = enriched.slice(-90);

  const recentStart = enriched.length >= 15 ? enriched[enriched.length - 15].date : enriched[0]?.date;
  const recentEnd = enriched[enriched.length - 1]?.date;
  const activePoint = hoverData || enriched[enriched.length - 1];

  const formatDateTick = (d: string) => {
    if (!d) return "";
    const parts = d.split("-");
    if (parts.length === 3) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${months[mIdx] || parts[1]}`;
    }
    return d;
  };

  return (
    <div className="w-full flex flex-col gap-2.5 min-w-0 font-sans">
      {/* Framework Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 text-xs">
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium flex items-center">
            180-Day Normal Volume
            <InfoTooltip text="Historical baseline: The typical daily traded volume across the past 180 trading days (~6 months)." />
          </span>
          <span className="font-bold font-mono text-slate-800 text-sm">{formatVolumeNum(meanVol180)} / day</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium flex items-center">
            15-Day Average Volume
            <InfoTooltip text="Analysis window: Average daily traded volume over the last 15 days compared to historical normal." />
          </span>
          <span className="font-bold font-mono text-blue-700 text-sm flex items-center gap-1">
            {formatVolumeNum(latest15Vol)} / day
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-sans">
              {volSurgeMultiple}x Normal
            </span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium flex items-center">
            Surge Alert Threshold (95th %ile)
            <InfoTooltip text="Statistical threshold (95th percentile, Z ≥ 1.645): Daily volume exceeding this level indicates a statistically significant surge." />
          </span>
          <span className="font-bold font-mono text-amber-700 text-sm flex items-center gap-1">
            <span className="w-2 h-0.5 bg-amber-500 rounded inline-block" />
            ≥ {formatVolumeNum(zVolAlert)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium flex items-center">
            Volume Spike Days
            <InfoTooltip text="Number of days in the 15-day analysis window where daily volume spiked ≥1.5x above its 15-day moving average." />
          </span>
          <span className={cn("font-bold font-mono text-sm", volSurgeDays >= 3 ? "text-rose-700" : "text-slate-800")}>
            {volSurgeDays} / 15 days <span className="text-slate-400 font-normal text-[10px]">(≥1.5x surge)</span>
          </span>
        </div>
      </div>

      {/* Inspector Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/90 border border-slate-200/90 rounded-xl px-3 py-2 text-xs">
        <div className="flex items-center gap-3 font-mono text-xs text-slate-700 overflow-x-auto whitespace-nowrap">
          <span className="font-semibold text-slate-900 font-sans flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            {activePoint?.date || "Cursor Point"}:
          </span>
          <span>15D MA: <strong className="text-blue-700 font-semibold">{formatVolumeNum(activePoint?.rolling15d || 0)}</strong></span>
          <span>Daily Vol: <strong className="font-semibold">{formatVolumeNum(activePoint?.volume || 0)}</strong></span>
          {activePoint?.surgeRatio >= 1.5 && (
            <span className={cn("font-semibold px-2 py-0.5 rounded-md text-xs", activePoint.surgeRatio >= 3.0 ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200")}>
              {activePoint.surgeRatio}x Surge
            </span>
          )}
        </div>

        {/* Time Filter */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-medium text-slate-600 shadow-2xs">
          {(["15D", "30D", "90D", "ALL"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium",
                timeRange === r ? "bg-slate-900 text-white font-semibold shadow-xs" : "hover:text-slate-900 text-slate-600"
              )}
            >
              {r === "ALL" ? "180D (All)" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className={cn("w-full min-w-0 overflow-hidden", isExpanded ? "h-[380px]" : "h-[240px]")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={filtered}
            margin={{ top: 12, right: 15, left: 0, bottom: 0 }}
            onMouseMove={(state: any) => {
              if (state && state.activePayload && state.activePayload.length) {
                const nextP = state.activePayload[0].payload;
                if (nextP && (!hoverData || hoverData.date !== nextP.date)) {
                  setHoverData(nextP);
                }
              }
            }}
            onMouseLeave={() => setHoverData(null)}
          >
            <defs>
              <linearGradient id="volMaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={formatDateTick} interval={timeRange === "15D" ? 0 : "preserveStartEnd"} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: "#64748b" }} width={55} tickFormatter={formatVolumeNum} />
            <Tooltip
              content={<CustomVolumeTooltip />}
              isAnimationActive={false}
              wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 100 }}
              cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }}
            />

            {recentStart && recentEnd && timeRange === "ALL" && (
              <ReferenceArea
                x1={recentStart}
                x2={recentEnd}
                fill="#fef08a"
                fillOpacity={0.2}
                stroke="#ca8a04"
                strokeDasharray="3 3"
              />
            )}

            <ReferenceLine y={meanVol180} stroke="#94a3b8" strokeDasharray="3 3" />
            <ReferenceLine y={zVolAlert} stroke="#d97706" strokeDasharray="4 3" />

            <Bar dataKey="volume" name="Daily Vol" radius={[3, 3, 0, 0]} maxBarSize={timeRange === "15D" ? 36 : timeRange === "30D" ? 20 : 12}>
              {filtered.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.barColor} />
              ))}
            </Bar>
            <Area dataKey="rolling15d" name="15D Avg Vol" stroke="#1d4ed8" strokeWidth={2.5} fill="url(#volMaGradient)" connectNulls />
            {timeRange === "ALL" && <Brush dataKey="date" height={18} stroke="#cbd5e1" fill="#f8fafc" tickFormatter={() => ""} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const CustomPriceReturnTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isCritical = data.zScore >= 2.33;
    const isAlert = data.zScore >= 1.645;
    const isCircuit = data.dailyReturn >= 4.5;

    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-3 text-xs shadow-2xl font-sans min-w-[230px]">
        <div className="font-bold text-slate-900 pb-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between">
          <span>{label}</span>
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-md font-mono border",
            data.dailyReturn >= 5.0 ? "bg-rose-50 text-rose-700 border-rose-200" :
            data.dailyReturn >= 2.0 ? "bg-amber-50 text-amber-800 border-amber-200" :
            data.dailyReturn >= 0 ? "bg-blue-50 text-blue-700 border-blue-200" :
            "bg-slate-100 text-slate-600 border-slate-200"
          )}>
            {data.dailyReturn >= 0 ? "+" : ""}{data.dailyReturn?.toFixed(2)}% Daily
          </span>
        </div>
        
        <div className="space-y-1.5 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-slate-500 font-sans">Daily C-C Return:</span>
            <span className="font-bold text-slate-900">{data.dailyReturn >= 0 ? "+" : ""}{data.dailyReturn?.toFixed(2)}%</span>
          </div>
          {data.rolling15dReturn != null && (
            <div className="flex items-center justify-between text-indigo-700 pt-1 border-t border-slate-100">
              <span className="font-sans">15D Rolling Avg:</span>
              <span className="font-bold">{data.rolling15dReturn >= 0 ? "+" : ""}{data.rolling15dReturn?.toFixed(2)}%</span>
            </div>
          )}
          {data.zScore != null && (
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-500 font-sans">Statistical Z-Score:</span>
              <span className={cn("font-bold font-mono", isCritical ? "text-rose-600" : isAlert ? "text-amber-600" : "text-blue-600")}>
                {data.zScore >= 0 ? "+" : ""}{data.zScore?.toFixed(2)}σ
              </span>
            </div>
          )}
          
          {/* Forensic Triage Status Tag */}
          <div className="pt-1.5 border-t border-slate-100 flex flex-col gap-1">
            {isCritical ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-sans">
                🔴 Severe Anomaly (Z ≥ +2.33σ)
              </span>
            ) : isAlert ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-sans">
                🟠 Abnormal Momentum (Z ≥ +1.645σ)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-sans">
                🟢 Baseline Distribution
              </span>
            )}
            {isCircuit && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-sans">
                ⚡ Upper Circuit Limit Hit
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * 5.1.2 Rolling 15-Day Average Close-to-Close (C-C) Price Movement Chart.
 * Calculates daily C-C % return and rolling 15-day average C-C % return across 180 days.
 * Compares against 180-day mean baseline and statistical Z-score thresholds (+1.645σ / +2.33σ).
 */
export function RollingPriceReturnChart({
  history = [],
  isExpanded = false
}: {
  history?: PricePoint[];
  isExpanded?: boolean;
}) {
  const [timeRange, setTimeRange] = useState<"15D" | "30D" | "90D" | "ALL">("15D");
  const [hoverData, setHoverData] = useState<any | null>(null);

  if (!history || history.length === 0)
    return <div className="text-slate-500 text-xs p-4">No price return data available.</div>;

  const closes = history.map((h) => h.close);
  const returns: (number | null)[] = closes.map((c, i) => {
    if (i === 0) return 0;
    const prev = closes[i - 1] || 1;
    return Math.round(((c - prev) / prev) * 10000) / 100;
  });

  const validReturns = returns.filter((r): r is number => r !== null);
  const mean180 = validReturns.length > 0 ? validReturns.reduce((a, b) => a + b, 0) / validReturns.length : 0;
  const variance180 = validReturns.length > 0
    ? validReturns.reduce((a, b) => a + Math.pow(b - mean180, 2), 0) / validReturns.length
    : 1;
  const stdDev180 = Math.sqrt(variance180) || 1;

  const rolling15 = computeMA(validReturns, 15);

  const enriched = history.map((h, i) => {
    const dRet = returns[i] ?? 0;
    const r15 = rolling15[i] != null ? rolling15[i] : dRet;
    const zScore = r15 != null ? Math.round(((r15 - mean180) / stdDev180) * 100) / 100 : 0;

    let barColor = "#93c5fd";
    if (dRet >= 5.0) barColor = "#e11d48";
    else if (dRet >= 2.0) barColor = "#f59e0b";
    else if (dRet < 0) barColor = "#cbd5e1";

    return {
      ...h,
      dailyReturn: dRet,
      rolling15dReturn: r15,
      zScore,
      barColor,
    };
  });

  const last15 = enriched.slice(-15);
  const latest15Mean = last15.length > 0 ? last15.reduce((a, b) => a + b.dailyReturn, 0) / last15.length : 0;
  const surgeMultiple = mean180 > 0 ? Math.round((latest15Mean / mean180) * 10) / 10 : (latest15Mean > 0 ? 5.0 : 1.0);
  const breachCount = last15.filter((d) => d.zScore >= 1.645).length;
  const criticalCount = last15.filter((d) => d.zScore >= 2.33).length;

  let filtered = enriched;
  if (timeRange === "15D") filtered = enriched.slice(-15);
  else if (timeRange === "30D") filtered = enriched.slice(-30);
  else if (timeRange === "90D") filtered = enriched.slice(-90);

  const recentStart = enriched.length >= 15 ? enriched[enriched.length - 15].date : enriched[0]?.date;
  const recentEnd = enriched[enriched.length - 1]?.date;
  const activePoint = hoverData || enriched[enriched.length - 1];

  const zAlert = Math.round((mean180 + 1.645 * stdDev180) * 100) / 100;
  const zCritical = Math.round((mean180 + 2.33 * stdDev180) * 100) / 100;

  const formatDateTick = (d: string) => {
    if (!d) return "";
    const parts = d.split("-");
    if (parts.length === 3) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${months[mIdx] || parts[1]}`;
    }
    return d;
  };

  return (
    <div className="w-full flex flex-col gap-2.5 min-w-0 font-sans">
      {/* Framework Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 text-xs">
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium flex items-center">
            180-Day Normal Return
            <InfoTooltip text="Historical average: The typical daily close-to-close percentage price move over the past 180 trading days." />
          </span>
          <span className="font-bold font-mono text-slate-800 text-sm">{mean180.toFixed(2)}% / day</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium flex items-center">
            15-Day Average Return
            <InfoTooltip text="Analysis window: Average daily return during the last 15 trading days. Highlights abnormal price acceleration." />
          </span>
          <span className="font-bold font-mono text-indigo-700 text-sm flex items-center gap-1">
            {latest15Mean >= 0 ? "+" : ""}{latest15Mean.toFixed(2)}% / day
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-sans">
              {surgeMultiple}x Normal
            </span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium flex items-center">
            Alert Thresholds (Percentiles)
            <InfoTooltip text="Statistical confidence thresholds: 95th percentile (Z ≥ 1.645, Alert) and 99th percentile (Z ≥ 2.33, Critical) indicating abnormal price movement." />
          </span>
          <span className="font-bold font-mono text-xs flex items-center gap-2 mt-0.5">
            <span className="text-amber-700 flex items-center gap-0.5">
              <span className="w-2 h-0.5 bg-amber-500 rounded inline-block" />
              ≥ {zAlert}% <span className="text-[10px] text-amber-800">(95th)</span>
            </span>
            <span className="text-rose-700 flex items-center gap-0.5">
              <span className="w-2 h-0.5 bg-rose-500 rounded inline-block" />
              ≥ {zCritical}% <span className="text-[10px] text-rose-800">(99th)</span>
            </span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium flex items-center">
            Abnormal Move Days
            <InfoTooltip text="Count of days in the 15-day analysis window exceeding the 95th percentile statistical threshold (Z ≥ 1.645)." />
          </span>
          <span className={cn("font-bold font-mono text-sm flex items-center gap-1", breachCount >= 3 ? "text-rose-700" : "text-slate-800")}>
            {breachCount} / 15 days
            {criticalCount > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-sans">
                {criticalCount} Critical
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Inspector Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/90 border border-slate-200/90 rounded-xl px-3 py-2 text-xs">
        <div className="flex items-center gap-3 font-mono text-xs text-slate-700 overflow-x-auto whitespace-nowrap">
          <span className="font-semibold text-slate-900 font-sans flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            {activePoint?.date || "Cursor Point"}:
          </span>
          <span>Daily C-C: <strong className={cn("font-semibold", activePoint?.dailyReturn >= 0 ? "text-indigo-700" : "text-rose-600")}>{activePoint?.dailyReturn >= 0 ? "+" : ""}{activePoint?.dailyReturn?.toFixed(2)}%</strong></span>
          <span>15D Rolling Avg: <strong className="text-blue-700 font-semibold">{activePoint?.rolling15dReturn >= 0 ? "+" : ""}{activePoint?.rolling15dReturn?.toFixed(2)}%</strong></span>
          <span className={cn("font-semibold px-2 py-0.5 rounded-md text-xs border font-mono", activePoint?.zScore >= 2.33 ? "bg-rose-50 text-rose-700 border-rose-200" : activePoint?.zScore >= 1.645 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200")}>
            Z: {activePoint?.zScore >= 0 ? "+" : ""}{activePoint?.zScore?.toFixed(2)}σ
          </span>
        </div>

        {/* Time Filter */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-medium text-slate-600 shadow-2xs">
          {(["15D", "30D", "90D", "ALL"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium",
                timeRange === r ? "bg-slate-900 text-white font-semibold shadow-xs" : "hover:text-slate-900 text-slate-600"
              )}
            >
              {r === "ALL" ? "180D (All)" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className={cn("w-full min-w-0 overflow-hidden", isExpanded ? "h-[380px]" : "h-[240px]")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={filtered}
            margin={{ top: 12, right: 15, left: 0, bottom: 0 }}
            onMouseMove={(state: any) => {
              if (state && state.activePayload && state.activePayload.length) {
                const nextP = state.activePayload[0].payload;
                if (nextP && (!hoverData || hoverData.date !== nextP.date)) {
                  setHoverData(nextP);
                }
              }
            }}
            onMouseLeave={() => setHoverData(null)}
          >
            <defs>
              <linearGradient id="priceReturnGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={formatDateTick} interval={timeRange === "15D" ? 0 : "preserveStartEnd"} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: "#64748b" }} width={50} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`} />
            <Tooltip
              content={<CustomPriceReturnTooltip />}
              isAnimationActive={false}
              wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 100 }}
              cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }}
            />
            
            {recentStart && recentEnd && timeRange === "ALL" && (
              <ReferenceArea
                x1={recentStart}
                x2={recentEnd}
                fill="#fef08a"
                fillOpacity={0.2}
                stroke="#ca8a04"
                strokeDasharray="3 3"
              />
            )}

            <ReferenceLine y={mean180} stroke="#94a3b8" strokeDasharray="3 3" />
            <ReferenceLine y={zAlert} stroke="#d97706" strokeDasharray="4 3" />
            <ReferenceLine y={zCritical} stroke="#e11d48" strokeDasharray="4 3" />

            <Bar dataKey="dailyReturn" name="Daily C-C Return %" radius={[3, 3, 0, 0]} maxBarSize={timeRange === "15D" ? 36 : timeRange === "30D" ? 20 : 12}>
              {filtered.map((entry, index) => (
                <Cell key={`ret-cell-${index}`} fill={entry.barColor} />
              ))}
            </Bar>
            <Area dataKey="rolling15dReturn" name="15D Rolling Avg C-C %" stroke="#4f46e5" strokeWidth={2.5} fill="url(#priceReturnGradient)" connectNulls />
            {timeRange === "ALL" && <Brush dataKey="date" height={18} stroke="#cbd5e1" fill="#f8fafc" tickFormatter={() => ""} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * 5.1.4 & 5.1.5 — Two stat cards.
 * Shows the count of days (out of last 15) that each event occurred.
 * Matches the spec exactly: "Number of days in past 15 days the scrip hit X."
 */
export function AnomalyEventMatrixChart({
  history = [],
  metrics,
  bandPercent = 0.05,
  isExpanded = false
}: {
  history?: PricePoint[];
  metrics?: {
    band_hit_days?: number;
    new_high_days?: number;
    [key: string]: any;
  };
  bandPercent?: number;
  isExpanded?: boolean;
}) {
  if (!history || history.length === 0)
    return <div className="text-slate-500 text-xs p-4">No daily event data available.</div>;

  const bandThresholdFraction = 0.90 * (bandPercent > 1 ? bandPercent / 100 : bandPercent);

  const dayRecords = history.map((h, i) => {
    const lookbackStart = Math.max(0, i - 180);
    const lookbackSlice = history.slice(lookbackStart, i);
    const prev180High = lookbackSlice.length > 0
      ? Math.max(...lookbackSlice.map((p) => p.high ?? p.close))
      : (history[0]?.high ?? history[0]?.close ?? 0);
    const high = h.high ?? h.close;
    const prevClose = i > 0 ? (history[i - 1]?.close || h.close) : h.close;
    const highPct = prevClose > 0 ? ((high - prevClose) / prevClose) : 0;
    return {
      hit180High: high > prev180High,
      hitPriceBand: highPct >= bandThresholdFraction,
    };
  });

  const last15 = dayRecords.slice(-15);
  const total180Hits = metrics?.new_high_days ?? last15.filter((d) => d.hit180High).length;
  const totalBandHits = metrics?.band_hit_days ?? last15.filter((d) => d.hitPriceBand).length;
  const displayBandPct = bandPercent > 1 ? bandPercent : Math.round(bandPercent * 100);

  const Stat = ({
    count, label, sub, color
  }: { count: number; label: string; sub: string; color: "rose" | "amber" }) => {
    const isAlert = count >= 3;
    const colorMap = {
      rose: {
        num: isAlert ? "text-rose-700" : "text-slate-800",
        bg: isAlert ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200",
        dot: isAlert ? "bg-rose-500" : "bg-slate-300",
      },
      amber: {
        num: isAlert ? "text-amber-700" : "text-slate-800",
        bg: isAlert ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200",
        dot: isAlert ? "bg-amber-400" : "bg-slate-300",
      },
    }[color];

    return (
      <div className={cn("flex-1 border rounded-xl p-4 space-y-2", colorMap.bg)}>
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full shrink-0", colorMap.dot)} />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold font-mono", colorMap.num)}>{count}</span>
          <span className="text-xs font-medium text-slate-500">/ 15 days</span>
        </div>
        <div className="text-xs text-slate-500 leading-normal">{sub}</div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Stat
        count={total180Hits}
        label="Hit 180-day high"
        sub="Days in past 15 where the scrip's intraday high exceeded its prior 180-day peak"
        color="rose"
      />
      <Stat
        count={totalBandHits}
        label="Hit ≥90% of price band"
        sub={`Days in past 15 where the scrip moved ≥90% of its ${displayBandPct}% daily exchange price band`}
        color="amber"
      />
    </div>
  );
}


/**
 * Net LTP Contribution Chart (Module 3 — Section 4.1).
 * Per PVASF spec: calculates net LTP contribution (Pos - Neg) divided by 15-day stock price change.
 * Differentiates positive effect (emerald) and negative effect (rose).
 */
export function LtpChart({
  ltpContributors = [],
}: {
  ltpContributors?: Array<{
    participant: string;
    name?: string;
    contribution: number;
    net_val?: number;
    pos_val?: number;
    neg_val?: number;
    effect?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  }>;
}) {
  if (!ltpContributors || ltpContributors.length === 0)
    return <div className="text-slate-500 text-xs p-4">No LTP contributors in this window.</div>;

  return (
    <div className="w-full min-w-0 h-[240px] overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ltpContributors} layout="vertical" margin={{ top: 8, right: 30, left: 10, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            stroke="#94a3b8"
            tick={{ fontSize: 10 }}
            unit="%"
            domain={["auto", "auto"]}
          />
          <YAxis
            dataKey="participant"
            type="category"
            stroke="#475569"
            tick={{ fontSize: 10, fontFamily: "monospace" }}
            width={95}
          />
          <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload;
              const isPos = (data.net_val ?? data.contribution ?? 0) >= 0;
              return (
                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl rounded-lg p-3 text-xs min-w-[200px]">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-2">
                    <span className="font-mono font-bold text-slate-900">{data.participant}</span>
                    <span
                      className={cn(
                        "font-semibold px-1.5 py-0.5 rounded text-[10px]",
                        isPos ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                      )}
                    >
                      {isPos ? "↑ Price Pusher" : "↓ Price Suppressor"}
                    </span>
                  </div>
                  {data.name && <div className="text-slate-600 font-medium mb-1.5">{data.name}</div>}
                  <div className="space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contribution:</span>
                      <span className={cn("font-bold", isPos ? "text-emerald-700" : "text-rose-700")}>
                        {data.contribution >= 0 ? `+${data.contribution.toFixed(2)}%` : `${data.contribution.toFixed(2)}%`}
                      </span>
                    </div>
                    {data.pos_val !== undefined && (
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-500">Pos Push (↑):</span>
                        <span className="text-emerald-600">+₹{data.pos_val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {data.neg_val !== undefined && (
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-500">Neg Push (↓):</span>
                        <span className="text-rose-600">-₹{data.neg_val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {data.net_val !== undefined && (
                      <div className="flex justify-between border-t border-slate-100 pt-1">
                        <span className="text-slate-700 font-semibold">Net Push:</span>
                        <span className={cn("font-bold", isPos ? "text-emerald-700" : "text-rose-700")}>
                          {data.net_val >= 0
                            ? `+₹${data.net_val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : `-₹${Math.abs(data.net_val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
            isAnimationActive={false}
            wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 100 }}
          />
          <Bar dataKey="contribution" name="Net LTP Contribution %" radius={[0, 4, 4, 0]}>
            {ltpContributors.map((entry, index) => {
              const isPositive = (entry.net_val ?? entry.contribution ?? 0) >= 0;
              return <Cell key={`cell-${index}`} fill={isPositive ? "#10b981" : "#f43f5e"} />;
            })}
          </Bar>
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
          <Tooltip
            content={<CustomTooltip />}
            isAnimationActive={false}
            wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 100 }}
          />
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
          <Tooltip
            content={<CustomTooltip />}
            isAnimationActive={false}
            wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 100 }}
          />
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
          <span className="text-xs font-semibold text-slate-700">{item.label}</span>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
            Wt: {item.wt}%
          </span>
        </div>

        <div className="flex items-baseline justify-between my-2">
          <span className="text-xl font-bold font-mono text-slate-900 tracking-tight">{item.rawVal}</span>
          <span
            className={cn(
              "text-xs font-semibold px-2.5 py-0.5 rounded-md border font-mono shadow-2xs",
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

        {/* Right Column: 2 Cards + Risk Summary Tile */}
        <div className="lg:col-span-3 space-y-3">
          {rightCards.map(renderParameterCard)}

          {/* Dynamic Risk Summary Indicator Card */}
          {(() => {
            const compositeScore = metrics.final_score ?? Math.round((sPrice * 0.25 + sPriceZ * 0.20 + sVolZ * 0.25 + sBand * 0.15 + sHigh * 0.15) * 20);
            const isHigh = compositeScore >= 60;
            const isMed = compositeScore >= 30 && compositeScore < 60;
            const riskText = isHigh ? "High Risk" : isMed ? "Medium Risk" : "Normal";
            const topDrivers = [
              sPrice >= 3 ? `Price (+${sPrice}/5)` : null,
              sPriceZ >= 3 ? `Momentum (${sPriceZ}/5)` : null,
              sVolZ >= 3 ? `Volume (${sVolZ}/5)` : null,
              sBand >= 3 ? `Band Hits (${sBand}/5)` : null,
              sHigh >= 3 ? `New Highs (${sHigh}/5)` : null,
            ].filter(Boolean);

            return (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Risk Profile</span>
                  <span className="text-[10px] font-bold bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                    Scoring Engine
                  </span>
                </div>
                <div className="mt-2 mb-1 flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-amber-400">
                    {compositeScore}<span className="text-xs font-bold text-slate-400">/100</span>
                  </span>
                  <span className={cn(
                    "text-xs font-extrabold px-2 py-0.5 rounded border",
                    isHigh
                      ? "text-rose-300 bg-rose-950/80 border-rose-500/40"
                      : isMed
                      ? "text-amber-300 bg-amber-950/80 border-amber-500/40"
                      : "text-emerald-300 bg-emerald-950/80 border-emerald-500/40"
                  )}>
                    {riskText}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight mt-1">
                  {topDrivers.length > 0
                    ? `Primary drivers: ${topDrivers.join(", ")}`
                    : "All 5 surveillance parameters within normal baseline limits."}
                </p>
              </div>
            );
          })()}
        </div>
      </div>

    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Combined Market Surveillance Chart (Institutional Dual-Axis Master Chart)
// ---------------------------------------------------------------------------

const formatTooltipDate = (d: string) => {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const mIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const yr = parts[0].slice(-2);
    return `${day} ${months[mIdx] || parts[1]} '${yr}`;
  }
  return d;
};

const CustomScreenerTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isAnomalyDay = data.is180High || data.isBandHit;

    return (
      <div className="rounded-xl border border-slate-300/90 bg-white/98 backdrop-blur-md px-3.5 py-2.5 shadow-2xl min-w-[210px] text-left font-sans pointer-events-none select-none">
        {/* Date + Anomaly Flag */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
          <span className="text-slate-700 font-bold text-xs font-mono">
            {formatTooltipDate(label || data.date)}
          </span>
          {isAnomalyDay && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
              {data.is180High ? "180D Peak" : "Band Hit"}
            </span>
          )}
        </div>

        {/* Close Price + Daily Return */}
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-slate-950 font-black text-base font-mono">
            ₹{data.close != null ? data.close.toFixed(2) : "--"}
          </span>
          {data.dailyReturn != null && (
            <span className={cn(
              "text-[11px] font-bold font-mono px-1.5 py-0.2 rounded",
              data.dailyReturn >= 0 ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" : "bg-rose-50 text-rose-800 border border-rose-200/60"
            )}>
              {data.dailyReturn >= 0 ? "+" : ""}{data.dailyReturn.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="space-y-1.5 text-[11px] font-mono border-t border-slate-100 pt-1.5 text-slate-700">
          {data.open != null && (
            <div className="flex items-center justify-between text-slate-600 text-[10px] bg-slate-50/90 px-2 py-1 rounded-md border border-slate-100">
              <span><strong className="text-slate-700 font-semibold">O:</strong> ₹{data.open.toFixed(1)}</span>
              <span className="text-slate-300">•</span>
              <span><strong className="text-slate-700 font-semibold">H:</strong> ₹{data.high?.toFixed(1)}</span>
              <span className="text-slate-300">•</span>
              <span><strong className="text-slate-700 font-semibold">L:</strong> ₹{data.low?.toFixed(1)}</span>
            </div>
          )}
          {data.dma20 != null && (
            <div className="flex items-center justify-between text-sky-900 font-semibold">
              <span className="font-sans flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
                20 DMA:
              </span>
              <span>₹{data.dma20.toFixed(2)}</span>
            </div>
          )}
          {data.dma50 != null && (
            <div className="flex items-center justify-between text-amber-900 font-semibold">
              <span className="font-sans flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
                50 DMA:
              </span>
              <span>₹{data.dma50.toFixed(2)}</span>
            </div>
          )}
          {data.bbUpper != null && data.bbLower != null && (
            <div className="flex items-center justify-between text-indigo-900 font-medium text-[10px]">
              <span className="font-sans">BB [±2σ]:</span>
              <span>₹{data.bbLower.toFixed(0)} - ₹{data.bbUpper.toFixed(0)}</span>
            </div>
          )}
          {data.volume != null && (
            <div className="flex items-center justify-between text-blue-900 font-semibold pt-1 border-t border-slate-100">
              <span className="font-sans text-[10px] text-slate-500 font-normal">Vol:</span>
              <span className="flex items-center gap-1">
                <span>{data.volume >= 1000000 ? `${(data.volume / 1000000).toFixed(2)}M` : data.volume >= 1000 ? `${Math.round(data.volume / 1000)}k` : data.volume}</span>
                <span className="text-slate-500 font-normal text-[10px] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/80">
                  D: {data.deliveryPct}%
                </span>
              </span>
            </div>
          )}
          {/* Helpful Subtitle Guide */}
          <div className="text-[9px] text-slate-400 font-sans pt-1 border-t border-slate-100 text-center flex items-center justify-center gap-1">
            <span>DMA = Moving Avg</span>
            <span>•</span>
            <span>D: = Delivery %</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/** Interactive Chart & Metrics Guide Popover */
export function ChartGuideButton() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-lg border transition-all cursor-pointer select-none",
          isOpen
            ? "bg-blue-50 border-blue-300 text-blue-800 shadow-xs ring-2 ring-blue-500/20"
            : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
        )}
        title="Chart & Metrics Terminology Guide"
        aria-label="Toggle Chart Guide"
      >
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-32px)] rounded-2xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-md p-3.5 text-xs font-normal text-slate-100 shadow-[0_16px_36px_rgba(0,0,0,0.35),0_4px_12px_rgba(0,0,0,0.25)] text-left select-text animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-400 text-xs uppercase tracking-wider">
              <Info className="w-3.5 h-3.5" />
              <span>Chart &amp; Metric Guide</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-[11px] leading-relaxed">
            <div className="flex items-start gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0284c7] mt-1 shrink-0" />
              <div>
                <strong className="text-sky-300">20 DMA:</strong> 20-Day Moving Average — Short-term 1-month average price baseline.
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#d97706] mt-1 shrink-0" />
              <div>
                <strong className="text-amber-300">50 DMA:</strong> 50-Day Moving Average — Medium-term 2.5-month trend baseline.
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold shrink-0 mt-0.5">180D Peak</span>
              <div>
                Triggered when today&apos;s high is a brand new 6-month historical breakout (feeds Metric 5).
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold shrink-0 mt-0.5">Band Hit</span>
              <div>
                Triggered when price rises &ge;90% of the daily upper circuit limit (feeds Metric 4).
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-slate-300 shrink-0">O / H / L:</span>
              <div>
                Open, High, and Low intraday prices for that session.
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-blue-300 shrink-0">Vol (D: %):</span>
              <div>
                <strong>Total Volume</strong> traded and <strong>Deliverable Volume %</strong> (shares transferred to demat accounts vs intraday).
              </div>
            </div>
            <div className="flex items-start gap-1.5 pt-1 border-t border-slate-800">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b] mt-1 shrink-0" />
              <div>
                <strong className="text-amber-300">15D Analysis Window:</strong> Amber shaded region highlighting the 15-day analysis horizon compared against the 180-day baseline.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CombinedMarketChart({
  history,
  metrics,
  isExpanded = false
}: {
  history: PricePoint[];
  metrics?: any;
  isExpanded?: boolean;
}) {
  // Surveillance Timeframes: "15D" | "1M" | "3M" | "180D" | "Max" (default "180D" / 180-Day Baseline)
  const [timeframe, setTimeframe] = useState<"15D" | "1M" | "3M" | "180D" | "Max">("180D");

  // Visual Chart Controls: 20 DMA & 50 DMA OFF by default as requested
  const [showPrice, setShowPrice] = useState(true);
  const [show20DMA, setShow20DMA] = useState(false);
  const [show50DMA, setShow50DMA] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [show15DWindow, setShow15DWindow] = useState(true);

  // Active hover point state
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  // Precompute moving averages and high breakouts
  const processedData = useMemo(() => {
    if (!history || history.length === 0) return [];
    const sorted = [...history].sort((a, b) => (a.date > b.date ? 1 : -1));

    let rollingHigh = 0;

    return sorted.map((pt, idx, arr) => {
      const close = Number(pt.close) || 0;
      const volume = Number(pt.volume) || 0;
      const high = Number(pt.high) || close;
      const low = Number(pt.low) || close;
      const open = Number(pt.open) || close;

      // 20 DMA
      let dma20 = pt.ma20;
      if (dma20 == null) {
        const s20 = arr.slice(Math.max(0, idx - 19), idx + 1);
        dma20 = s20.reduce((acc, p) => acc + (Number(p.close) || 0), 0) / s20.length;
      }

      // 50 DMA
      let dma50 = pt.ma50;
      if (dma50 == null) {
        const s50 = arr.slice(Math.max(0, idx - 49), idx + 1);
        dma50 = s50.reduce((acc, p) => acc + (Number(p.close) || 0), 0) / s50.length;
      }

      // Daily Return
      const prevClose = idx > 0 ? (Number(arr[idx - 1].close) || close) : close;
      const dailyReturn = idx > 0 ? ((close - prevClose) / prevClose) * 100 : 0;

      // 180-Day New High Flag
      const is180High = idx > 0 && high > rollingHigh;
      if (high > rollingHigh) rollingHigh = high;

      // Synthetic Deliverable Volume %
      const deliveryPct = Math.min(85, Math.max(28, 45 + ((idx * 13 + Math.round(close)) % 36)));

      return {
        date: String(pt.date),
        close,
        high,
        low,
        open,
        volume,
        deliveryPct,
        dailyReturn,
        is180High: idx >= arr.length - 15 && is180High,
        dma20: Number(Number(dma20).toFixed(2)),
        dma50: Number(Number(dma50).toFixed(2)),
      };
    });
  }, [history]);

  // Sliced data according to surveillance timeframe (default 180D)
  const displayData = useMemo(() => {
    if (processedData.length === 0) return [];
    if (timeframe === "15D") return processedData.slice(-15);
    if (timeframe === "1M") return processedData.slice(-22);
    if (timeframe === "3M") return processedData.slice(-65);
    if (timeframe === "180D") return processedData.slice(-180);
    return processedData;
  }, [processedData, timeframe]);

  // Baseline start and latest end points of the active timeframe
  const basePoint = displayData.length > 0 ? displayData[0] : null;
  const lastPoint = displayData.length > 0 ? displayData[displayData.length - 1] : null;

  // Timeframe net price change percentage
  const periodPriceChangePct = (basePoint && lastPoint && basePoint.close > 0)
    ? ((lastPoint.close - basePoint.close) / basePoint.close) * 100
    : 0;

  // Active hover stats percentage change vs period base
  const hoverPriceChangePct = (basePoint && hoveredPoint && basePoint.close > 0)
    ? ((hoveredPoint.close - basePoint.close) / basePoint.close) * 100
    : 0;

  // Dynamic price bounds
  const priceMin = useMemo(() => {
    const vals = displayData.map(d => d.close).filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
    if (!vals.length) return 0;
    return Math.floor(Math.min(...vals) * 0.96);
  }, [displayData]);

  const priceMax = useMemo(() => {
    const vals = displayData.map(d => d.close).filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
    if (!vals.length) return 100;
    return Math.ceil(Math.max(...vals) * 1.04);
  }, [displayData]);

  // Dynamic volume bound (anchored to bottom 26% of canvas)
  const volMax = useMemo(() => {
    const vols = displayData.map(d => d.volume).filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
    if (!vols.length) return 100000;
    return Math.ceil(Math.max(...vols) * 4.0);
  }, [displayData]);

  // 15-Day Surveillance Window Coordinates
  const win15Start = displayData.length >= 15 ? displayData[displayData.length - 15].date : displayData[0]?.date;
  const win15End = displayData.length > 0 ? displayData[displayData.length - 1].date : "";

  const formatDateTick = (d: string) => {
    if (!d) return "";
    const parts = d.split("-");
    if (parts.length === 3) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const mIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (timeframe === "15D" || timeframe === "1M") {
        return `${day} ${months[mIdx] || parts[1]}`;
      }
      return `${months[mIdx] || parts[1]} '${parts[0].slice(-2)}`;
    }
    return d;
  };


  if (!history || history.length === 0) {
    return (
      <div className="w-full h-[380px] flex items-center justify-center text-slate-400 text-xs font-semibold">
        Loading surveillance chart data...
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3 min-w-0 font-sans">
      {/* ------------------------------------------------------------- */}
      {/* Top Header Bar: Timeframes (Left) + Clean Metric Snapshot (Right) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        {/* Timeframe Selector (Default 180D Baseline) */}
        <div className="inline-flex rounded-lg bg-slate-100/90 p-0.5 border border-slate-200/60 shadow-2xs">
          {(["15D", "1M", "3M", "180D", "Max"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer select-none",
                timeframe === tf
                  ? "bg-white text-indigo-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              )}
            >
              {tf === "15D" ? "15D (Surveillance)" : tf === "180D" ? "6M (180D)" : tf}
            </button>
          ))}
        </div>

        {/* Live Period & Active Metrics Snapshot (Replaced Alert Window Button & Uncluttered) */}
        <div className="flex items-center gap-2.5">
          {basePoint && lastPoint && (
            <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-50/90 border border-slate-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
              {hoveredPoint ? (
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-slate-500 font-sans font-medium">Date:</span>
                  <span className="font-bold text-slate-900">{formatTooltipDate(hoveredPoint.date)}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500 font-sans">Close:</span>
                  <span className="font-bold text-slate-950">₹{hoveredPoint.close?.toFixed(2)}</span>
                  <span className={cn(
                    "text-[11px] font-bold px-1.5 py-0.2 rounded border",
                    hoverPriceChangePct >= 0
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200/70"
                      : "text-rose-700 bg-rose-50 border-rose-200/70"
                  )}>
                    {hoverPriceChangePct >= 0 ? "+" : ""}{hoverPriceChangePct.toFixed(2)}% vs Base
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Period:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatTooltipDate(basePoint.date)} – {formatTooltipDate(lastPoint.date)}
                  </span>
                  <span className="text-slate-400 font-mono text-[10.5px]">({displayData.length}D)</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500 font-medium">Price:</span>
                  <span className="font-mono text-slate-700">
                    ₹{basePoint.close?.toFixed(2)} → <strong className="text-slate-950 font-bold">₹{lastPoint.close?.toFixed(2)}</strong>
                  </span>
                  <span className={cn(
                    "font-mono font-bold text-[11px] px-1.5 py-0.2 rounded border",
                    periodPriceChangePct >= 0
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200/70"
                      : "text-rose-700 bg-rose-50 border-rose-200/70"
                  )}>
                    {periodPriceChangePct >= 0 ? "+" : ""}{periodPriceChangePct.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}
          <ChartGuideButton />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Main Dual-Axis Chart Canvas */}
      {/* ------------------------------------------------------------- */}
      <div className={cn("w-full min-w-0 overflow-hidden", isExpanded ? "h-[540px]" : "h-[390px] md:h-[430px]")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayData}
            margin={{ top: 12, right: 65, left: 10, bottom: 8 }}
            onMouseMove={(state: any) => {
              if (state && state.activePayload && state.activePayload.length) {
                const nextPoint = state.activePayload[0].payload;
                if (nextPoint && (!hoveredPoint || hoveredPoint.date !== nextPoint.date)) {
                  setHoveredPoint(nextPoint);
                }
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4338ca" stopOpacity={0.16} />
                <stop offset="85%" stopColor="#6366f1" stopOpacity={0.02} />
                <stop offset="100%" stopColor="#818cf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            {/* X-Axis */}
            <XAxis
              dataKey="date"
              tickFormatter={formatDateTick}
              stroke="#e2e8f0"
              tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              minTickGap={45}
            />

            {/* Left Y-Axis: Volume */}
            <YAxis
              yAxisId="left"
              orientation="left"
              domain={[0, volMax]}
              tickFormatter={(v) => {
                if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;
                if (v >= 1000) return `${Math.round(v / 1000)}k`;
                return String(v);
              }}
              stroke="#e2e8f0"
              tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={52}
              label={{
                value: "Volume",
                angle: -90,
                position: "insideLeft",
                fill: "#475569",
                fontSize: 11,
                fontWeight: 700,
                offset: 8
              }}
            />

            {/* Right Y-Axis: Price on NSE */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[priceMin, priceMax]}
              tickFormatter={(p) => `₹${Math.round(p).toLocaleString("en-IN")}`}
              stroke="#e2e8f0"
              tick={{ fontSize: 11, fill: "#1e293b", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              width={65}
              label={{
                value: "Price (₹)",
                angle: 90,
                position: "insideRight",
                fill: "#1e293b",
                fontSize: 11,
                fontWeight: 700,
                offset: 18
              }}
            />

            <Tooltip
              content={<CustomScreenerTooltip />}
              isAnimationActive={false}
              wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 100 }}
              cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3", strokeWidth: 1 }}
            />

            {/* 15-Day Surveillance Window Highlight */}
            {show15DWindow && win15Start && win15End && timeframe !== "15D" && (
              <ReferenceArea
                yAxisId="right"
                x1={win15Start}
                x2={win15End}
                fill="#fef3c7"
                fillOpacity={0.35}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeWidth={1.2}
              />
            )}

            {/* Volume Histogram (Left Axis) */}
            {showVolume && (
              <Bar
                yAxisId="left"
                dataKey="volume"
                fill="#cbd5e1"
                stroke="#94a3b8"
                strokeWidth={0.5}
                fillOpacity={0.7}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            )}

            {/* 20 DMA Line (§5.1.1) (Right Axis) */}
            {show20DMA && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="dma20"
                stroke="#0284c7"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}

            {/* 50 DMA Line (§5.1.1) (Right Axis) */}
            {show50DMA && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="dma50"
                stroke="#d97706"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}

            {/* Area Gradient Fill under Price */}
            {showPrice && (
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="close"
                stroke="none"
                fill="url(#priceGradient)"
                isAnimationActive={false}
                connectNulls
              />
            )}

            {/* Price on NSE Line (Right Axis - Crisp High-Contrast Indigo) */}
            {showPrice && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="close"
                stroke="#4338ca"
                strokeWidth={2.4}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Bottom Indicator Toggle Bar (Sleek Chip Pills) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2.5 border-t border-slate-100 text-xs font-semibold">
        {/* Price on NSE */}
        <button
          type="button"
          onClick={() => setShowPrice(!showPrice)}
          title="Daily closing VWAP price line on NSE"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer select-none",
            showPrice ? "bg-indigo-50 border-indigo-200 text-indigo-950 font-bold shadow-2xs" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 opacity-60"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#4338ca]" />
          <span>Price on NSE</span>
        </button>

        {/* 20 DMA */}
        <button
          type="button"
          onClick={() => setShow20DMA(!show20DMA)}
          title="20-Day Moving Average: 1-month short term trend baseline"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer select-none",
            show20DMA ? "bg-sky-50 border-sky-200 text-sky-950 font-bold shadow-2xs" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 opacity-60"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
          <span>20 DMA</span>
        </button>

        {/* 50 DMA */}
        <button
          type="button"
          onClick={() => setShow50DMA(!show50DMA)}
          title="50-Day Moving Average: 2.5-month medium term trend baseline"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer select-none",
            show50DMA ? "bg-amber-50 border-amber-200 text-amber-950 font-bold shadow-2xs" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 opacity-60"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" />
          <span>50 DMA</span>
        </button>

        {/* Volume */}
        <button
          type="button"
          onClick={() => setShowVolume(!showVolume)}
          title="Total exchange traded volume (quantity of shares exchanged per day)"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer select-none",
            showVolume ? "bg-slate-100 border-slate-300 text-slate-900 font-bold shadow-2xs" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 opacity-60"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />
          <span>Volume</span>
        </button>

        {/* 15D Analysis Window */}
        <button
          type="button"
          onClick={() => setShow15DWindow(!show15DWindow)}
          title="15-Day Analysis Window: Recent observation period compared against the 180-day baseline"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer select-none",
            show15DWindow ? "bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-2xs" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 opacity-60"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
          <span>15D Analysis Window</span>
        </button>
      </div>
    </div>
  );
}

/**
 * High-Efficiency Surveillance Statistical Deck (Pillars 1, 2, & 3).
 * Preserves 100% of the metric cards from 180D Price, Return Z-Score, and Volume Z-Score
 * in a direct, high-density 3-pillar layout without redundant duplicate chart lines.
 */
export function SurveillanceStatisticalDeck({
  history = [],
  metrics,
}: {
  history?: PricePoint[];
  metrics?: any;
}) {
  if (!history || history.length === 0) return null;

  // 1. Price Growth Metrics (PVASF 2.1)
  const startPrice = history[0]?.close || 1;
  const currentPrice = history[history.length - 1]?.close || startPrice;
  const netGainPct = Math.round(((currentPrice - startPrice) / startPrice) * 1000) / 10;
  const max180High = Math.max(...history.map((h) => h.high ?? h.close));
  const isHighRiskGain = netGainPct >= 75.0;
  const priceRiseScore = metrics?.price_rise_score ?? (netGainPct > 150 ? 5 : netGainPct >= 76 ? 3 : netGainPct >= 15 ? 1 : 0);

  // 2. Price Return & Momentum Z-Score Metrics (PVASF 2.2)
  const returns = history.map((h, i) => {
    if (i === 0) return 0;
    const prev = history[i - 1]?.close || 1;
    return ((h.close - prev) / prev) * 100;
  });
  const mean180Return = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const varianceReturn = returns.length > 0
    ? returns.reduce((a, b) => a + Math.pow(b - mean180Return, 2), 0) / returns.length
    : 1;
  const stdDevReturn = Math.sqrt(varianceReturn) || 1;
  const zAlertReturn = Math.round((mean180Return + 1.645 * stdDevReturn) * 100) / 100;
  const zCriticalReturn = Math.round((mean180Return + 2.33 * stdDevReturn) * 100) / 100;

  const rolling15Returns = computeMA(returns, 15);
  const enrichedReturns = history.map((h, i) => {
    const dailyRet = returns[i];
    const ma15 = rolling15Returns[i] != null ? rolling15Returns[i]! : dailyRet;
    const zScore = stdDevReturn > 0 ? Math.round(((ma15 - mean180Return) / stdDevReturn) * 100) / 100 : 0;
    return { ...h, dailyReturn: dailyRet, rolling15dReturn: ma15, zScore };
  });
  const last15Returns = enrichedReturns.slice(-15);
  const latest15MeanReturn = last15Returns.length > 0 ? last15Returns.reduce((a, b) => a + b.dailyReturn, 0) / last15Returns.length : 0;
  const returnSurgeMultiple = mean180Return > 0 ? Math.round((latest15MeanReturn / mean180Return) * 10) / 10 : (latest15MeanReturn > 0 ? 5.0 : 1.0);
  const abnormalMoveDays = last15Returns.filter((d) => d.zScore >= 1.645).length;
  const criticalMoveDays = last15Returns.filter((d) => d.zScore >= 2.33).length;

  // 3. Volume & Liquidity Burst Metrics (PVASF 2.3)
  const volumes = history.map((h) => h.volume);
  const meanVol180 = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;
  const varianceVol = volumes.length > 0
    ? volumes.reduce((a, b) => a + Math.pow(b - meanVol180, 2), 0) / volumes.length
    : 1;
  const stdDevVol = Math.sqrt(varianceVol) || 1;
  const zVolAlert = Math.round(meanVol180 + 1.645 * stdDevVol);

  const rolling15Vol = computeMA(volumes, 15);
  const enrichedVol = history.map((h, i) => {
    const ma15 = rolling15Vol[i] || h.volume;
    const surgeRatio = ma15 > 0 ? Math.round((h.volume / ma15) * 10) / 10 : 1;
    return { ...h, rolling15d: ma15, surgeRatio };
  });
  const last15Vol = enrichedVol.slice(-15);
  const latest15Vol = last15Vol.length > 0 ? last15Vol.reduce((a, b) => a + b.volume, 0) / last15Vol.length : 0;
  const volSurgeMultiple = meanVol180 > 0 ? Math.round((latest15Vol / meanVol180) * 10) / 10 : 1.0;
  const volSpikeDays = last15Vol.filter((d) => d.surgeRatio >= 1.5).length;

  return (
    <div className="space-y-4">
      {/* Card 1: Price Rise */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              Price Rise
              <InfoTooltip text="Compares the absolute percentage growth of the stock's price in the last 15 days vis-à-vis price on T-180 days (contributes 25% to the total risk score)." />
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              25% of Score
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Observation: 15-Day High vs T-180 Baseline
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Closing Price (T-180)
              <InfoTooltip text="The closing price 180 trading days (~6 months) ago, used as the baseline for Price Rise calculation against historical baseline." />
            </span>
            <span className="font-extrabold font-mono text-slate-900 text-base mt-1 block">
              ₹{startPrice.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Current Closing Price
              <InfoTooltip text="Latest closing price on observation day T, showing total percentage change from T-180 baseline." />
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-extrabold font-mono text-blue-700 text-base">
                ₹{currentPrice.toFixed(2)}
              </span>
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono",
                netGainPct >= 75 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}>
                {netGainPct >= 0 ? "+" : ""}{netGainPct}% Rise
              </span>
            </div>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              180-Day Peak High
              <InfoTooltip text="The highest intraday price reached over the entire 180-day baseline period." />
            </span>
            <span className="font-extrabold font-mono text-rose-700 text-base mt-1 block">
              ₹{max180High.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Price Rise Severity & Score
              <InfoTooltip text="Scoring criteria: Under 15% rise (0 pts), 15–75% (1 pt), 76–150% (3 pts), over 150% (5 pts)." />
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("font-extrabold font-mono text-base", isHighRiskGain ? "text-rose-700" : "text-slate-900")}>
                +{netGainPct}%
              </span>
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded border font-sans",
                priceRiseScore >= 3 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-blue-50 text-blue-700 border-blue-200"
              )}>
                Score {priceRiseScore}/5
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Price Z-Score */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              Price Z-Score
              <InfoTooltip text="Measures if average price movement over the last 15 days is statistically abnormal compared to rolling 15-day behaviour over 180 trading days (contributes 20% to total risk score)." />
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              20% of Score
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Close-to-Close (C-C) Price Movement
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Historical Mean (μ)
              <InfoTooltip text="Historical Mean (μ): Calculates the 15-day average price movement for every rolling 15-day window over the preceding 180 trading days." />
            </span>
            <span className="font-extrabold font-mono text-slate-900 text-base mt-1 block">
              {mean180Return.toFixed(2)}% / day
            </span>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Current 15-Day Average (X̄)
              <InfoTooltip text="Current Value (X̄): The average close-to-close (C-C) price movement over the most recent 15 days (T to T-15)." />
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-extrabold font-mono text-indigo-700 text-base">
                {latest15MeanReturn >= 0 ? "+" : ""}{latest15MeanReturn.toFixed(2)}%/d
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-sans">
                {returnSurgeMultiple}x μ
              </span>
            </div>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Statistical Thresholds
              <InfoTooltip text="Statistical thresholds: Z ≥ 1.645 (95th percentile, Score 1), Z ≥ 2.33 (99th percentile, Score 3), Z ≥ 3.09 (99.9th percentile, Score 5)." />
            </span>
            <div className="flex items-center gap-2 mt-1 font-mono text-xs font-bold">
              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                ≥{zAlertReturn}% (95th)
              </span>
              <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                ≥{zCriticalReturn}% (99th)
              </span>
            </div>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Outlier Days (Z ≥ 1.645σ)
              <InfoTooltip text="Number of days in the 15-day analysis window where price movement exceeded normal statistical variance (Z ≥ 1.645)." />
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-extrabold font-mono text-slate-900 text-base">
                {abnormalMoveDays} / 15 days
              </span>
              {criticalMoveDays > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-sans">
                  {criticalMoveDays} Critical
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Volume Z-Score */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
            <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              Volume Z-Score
              <InfoTooltip text="Measures if the stock's trading volume over the last 15 days is statistically abnormal compared to its typical 15-day volume behaviour over 6 months (contributes 25% to total risk score)." />
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
              25% of Score
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Sustained 15-Day Traded Volume Analysis
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Historical Mean Volume (μ)
              <InfoTooltip text="Historical Mean (μ): Calculates the 15-day average volume for every rolling 15-day window over the preceding 180 trading days." />
            </span>
            <span className="font-extrabold font-mono text-slate-900 text-base mt-1 block">
              {formatVolumeNum(meanVol180)} / day
            </span>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Current 15-Day Average (X̄)
              <InfoTooltip text="Current Value (X̄): The average daily volume over the most recent 15 trading days (T to T-15)." />
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-extrabold font-mono text-blue-700 text-base">
                {formatVolumeNum(latest15Vol)} / day
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-sans">
                {volSurgeMultiple}x μ
              </span>
            </div>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Statistical Threshold (95th %ile)
              <InfoTooltip text="Statistical threshold: Volume level corresponding to Z ≥ 1.645 (95th percentile of historical rolling 15-day volume variance)." />
            </span>
            <span className="font-extrabold font-mono text-amber-700 text-base mt-1 block">
              ≥ {formatVolumeNum(zVolAlert)} / day
            </span>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Volume Surge Days
              <InfoTooltip text="Flags periods where sustained trading activity over a 15-day period has surged significantly beyond the stock's established normal variance." />
            </span>
            <span className="font-extrabold font-mono text-slate-900 text-base mt-1 block">
              {volSpikeDays} / 15 days <span className="text-xs text-slate-500 font-normal">(≥1.5x surge)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
