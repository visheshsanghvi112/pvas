"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { RadarChart as MuiRadarChart } from '@mui/x-charts/RadarChart';
import type { HighlightItemIdentifier } from '@mui/x-charts/models';
import Box from '@mui/material/Box';

import {
  Bar,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  ReferenceArea,
} from "recharts";
import type { PricePoint } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  BarChart2,
  Zap,
  Info,
  Check,
  X,
} from "lucide-react";

import { InfoTooltip } from "@/components/ui/info-tooltip";
export { InfoTooltip };

/** Format volume values into M/K strings */
function formatVolumeNum(val: number): string {
  if (val == null || isNaN(val) || !isFinite(val)) return "0";
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${Math.round(abs).toLocaleString("en-IN")}`;
}

/** Compute simple moving average for a numeric array. Returns null for insufficient data. */
function computeMA(values: number[], period: number): (number | null)[] {
  if (!values || !values.length || period <= 0) return [];
  return values.map((_, i) => {
    if (i < period - 1) return null;
    const slice = values.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => {
      const num = Number(b);
      return a + (isFinite(num) ? num : 0);
    }, 0);
    return Math.round((sum / period) * 100) / 100;
  });
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
  isExpanded: _isExpanded = false
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

  const historyDays = history.length;
  const isFull180 = historyDays >= 170;

  const dayRecords = history.map((h, i) => {
    const lookbackStart = Math.max(0, i - 180);
    const lookbackSlice = history.slice(lookbackStart, i);
    const high = Number(h.high) || Number(h.close) || 0;
    const prevHigh = lookbackSlice.length > 0
      ? Math.max(...lookbackSlice.map((p) => {
          const val = Number(p.high);
          return isFinite(val) && val > 0 ? val : (Number(p.close) || 0);
        }))
      : (Number(history[0]?.high) || Number(history[0]?.close) || 0);
    const prevClose = i > 0 ? (Number(history[i - 1]?.close) || Number(h.close) || 1) : (Number(h.close) || 1);
    const highPct = prevClose > 0 && isFinite(high) ? ((high - prevClose) / prevClose) : 0;
    return {
      hit180High: i > 0 && high > prevHigh,
      hitPriceBand: highPct >= bandThresholdFraction,
    };
  });

  const last15 = dayRecords.slice(-15);
  const total180Hits = metrics?.new_high_days ?? last15.filter((d) => d.hit180High).length;
  const totalBandHits = metrics?.band_hit_days ?? last15.filter((d) => d.hitPriceBand).length;
  const displayBandPct = bandPercent > 1 ? bandPercent : Math.round(bandPercent * 100);

  const peakStatLabel = isFull180 ? "Hit 180-day high" : `Hit ${historyDays}-day high`;
  const peakStatSub = isFull180
    ? "Days in past 15 where the scrip's intraday high exceeded its prior 180-day peak"
    : `Days in past 15 where the scrip exceeded its prior peak across available ${historyDays} sessions`;

  const Stat = ({
    count, label, sub, color, score, scoreTooltip
  }: { count: number; label: string; sub: string; color: "rose" | "amber"; score?: number; scoreTooltip?: string }) => {
    const isAlert = count >= 3;
    const colorMap = {
      rose: {
        num: isAlert ? "text-rose-700" : "text-slate-800",
        bg: isAlert ? "bg-rose-50/80 border-rose-200" : "bg-slate-50 border-slate-200",
        dot: isAlert ? "bg-rose-500" : "bg-slate-300",
        badge: isAlert ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-slate-100 text-slate-700 border-slate-200",
      },
      amber: {
        num: isAlert ? "text-amber-700" : "text-slate-800",
        bg: isAlert ? "bg-amber-50/80 border-amber-200" : "bg-slate-50 border-slate-200",
        dot: isAlert ? "bg-amber-400" : "bg-slate-300",
        badge: isAlert ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-slate-100 text-slate-700 border-slate-200",
      },
    }[color];

    return (
      <div className={cn("flex-1 border rounded-xl p-4 space-y-2", colorMap.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full shrink-0", colorMap.dot)} />
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</span>
          </div>
          {score !== undefined && (
            <span
              className={cn("text-[10px] font-bold px-2 py-0.5 rounded border font-mono", colorMap.badge)}
              title={scoreTooltip}
            >
              Score {score}/5 pts
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold font-mono", colorMap.num)}>{count}</span>
          <span className="text-xs font-medium text-slate-500">/ 15 days</span>
        </div>
        <div className="text-xs text-slate-500 leading-normal flex items-center justify-between">
          <span>{sub}</span>
          {scoreTooltip && <InfoTooltip text={scoreTooltip} />}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Stat
        count={total180Hits}
        label={peakStatLabel}
        sub={peakStatSub}
        color="rose"
        score={metrics?.new_high_score}
        scoreTooltip="Score based on new highs: 0 days (0 pts), 1–4 days (1 pt), 5–9 days (3 pts), 10 or more days (5 pts)."
      />
      <Stat
        count={totalBandHits}
        label="Hit ≥90% of price band"
        sub={`Days in past 15 where the scrip moved ≥90% of its ${displayBandPct}% daily exchange price band`}
        color="amber"
        score={metrics?.band_score}
        scoreTooltip="Score based on circuit hits: 0–2 days (0 pts), 3–5 days (1 pt), 6–9 days (3 pts), 10 or more days (5 pts)."
      />
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
  weights,
}: {
  metrics?: {
    price_rise_pct?: number;
    price_z?: number;
    volume_z?: number;
    band_hit_days?: number;
    new_high_days?: number;
    final_score?: number;
  };
  weights?: {
    price_rise?: number;
    price_z?: number;
    volume_z?: number;
    band_persistence?: number;
    new_high?: number;
  };
}) {
  const [highlightedItem, setHighlightedItem] =
    useState<HighlightItemIdentifier<'radar'> | null>(null);
  const fillArea = true;

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

  const sPrice = scorePriceRise(Number(metrics.price_rise_pct) || 0);
  const sPriceZ = scoreZ(Number(metrics.price_z) || 0);
  const sVolZ = scoreZ(Number(metrics.volume_z) || 0);
  const sBand = scoreBand(Number(metrics.band_hit_days) || 0);
  const sHigh = scoreNewHigh(Number(metrics.new_high_days) || 0);

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
    metrics: ['Price Rise', 'Price Z-Score', 'Volume Z-Score', 'Band Persistence', '180D New Highs'],
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
    { label: "Price Rise", score: sPrice, rawVal: `${Number(metrics.price_rise_pct || 0) >= 0 ? "+" : ""}${Number(metrics.price_rise_pct || 0).toFixed(1)}%`, wt: weights?.price_rise ?? 20 },
    { label: "Price Z-Score", score: sPriceZ, rawVal: `${Number(metrics.price_z || 0).toFixed(2)}σ`, wt: weights?.price_z ?? 20 },
    { label: "Volume Z-Score", score: sVolZ, rawVal: `${Number(metrics.volume_z || 0).toFixed(2)}σ`, wt: weights?.volume_z ?? 20 },
  ];

  const rightCards = [
    { label: "Price Band Persistence", score: sBand, rawVal: `${metrics.band_hit_days || 0}d`, wt: weights?.band_persistence ?? 20 },
    { label: "180D New High Breakout", score: sHigh, rawVal: `${metrics.new_high_days || 0}d`, wt: weights?.new_high ?? 20 },
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
            const compositeScore = metrics.final_score != null && isFinite(Number(metrics.final_score))
              ? Number(metrics.final_score)
              : Math.round((sPrice + sPriceZ + sVolZ + sBand + sHigh) * 4.0);
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
  const clean = String(d).split("T")[0];
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const mIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const yr = parts[0].length === 4 ? parts[0].slice(-2) : parts[0];
    return `${day} ${months[mIdx] || parts[1]} '${yr}`;
  }
  return String(d);
};

const CustomScreenerTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (!data) return null;

    const closeVal = typeof data.close === 'number' && isFinite(data.close) ? data.close : null;
    const dailyReturnVal = typeof data.dailyReturn === 'number' && isFinite(data.dailyReturn) ? data.dailyReturn : null;

    return (
      <div className="rounded-xl border border-slate-300/90 bg-white/98 backdrop-blur-md px-3.5 py-2.5 shadow-2xl min-w-[210px] text-left font-sans pointer-events-none select-none">
        {/* Date + Circuit Limit Flag */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
          <span className="text-slate-700 font-bold text-xs font-mono">
            {formatTooltipDate(label || data.date)}
          </span>
          {data.isBandHit && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
              Upper Circuit
            </span>
          )}
        </div>

        {/* Close Price + Daily Return */}
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-slate-950 font-black text-base font-mono">
            ₹{closeVal != null ? closeVal.toFixed(2) : "--"}
          </span>
          {dailyReturnVal != null && (
            <span className={cn(
              "text-[11px] font-bold font-mono px-1.5 py-0.2 rounded",
              dailyReturnVal >= 0 ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" : "bg-rose-50 text-rose-800 border border-rose-200/60"
            )}>
              {dailyReturnVal >= 0 ? "+" : ""}{dailyReturnVal.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="space-y-1.5 text-[11px] font-mono border-t border-slate-100 pt-1.5 text-slate-700">
          {(data.open != null || data.high != null || data.low != null) && (
            <div className="flex items-center justify-between text-slate-600 text-[10px] bg-slate-50/90 px-2 py-1 rounded-md border border-slate-100">
              <span><strong className="text-slate-700 font-semibold">O:</strong> ₹{typeof data.open === 'number' && isFinite(data.open) ? data.open.toFixed(1) : "--"}</span>
              <span className="text-slate-300">•</span>
              <span><strong className="text-slate-700 font-semibold">H:</strong> ₹{typeof data.high === 'number' && isFinite(data.high) ? data.high.toFixed(1) : "--"}</span>
              <span className="text-slate-300">•</span>
              <span><strong className="text-slate-700 font-semibold">L:</strong> ₹{typeof data.low === 'number' && isFinite(data.low) ? data.low.toFixed(1) : "--"}</span>
            </div>
          )}
          {typeof data.dma20 === 'number' && isFinite(data.dma20) && (
            <div className="flex items-center justify-between text-sky-900 font-semibold">
              <span className="font-sans flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
                20 DMA:
              </span>
              <span>₹{data.dma20.toFixed(2)}</span>
            </div>
          )}
          {typeof data.dma50 === 'number' && isFinite(data.dma50) && (
            <div className="flex items-center justify-between text-amber-900 font-semibold">
              <span className="font-sans flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
                50 DMA:
              </span>
              <span>₹{data.dma50.toFixed(2)}</span>
            </div>
          )}
          {typeof data.bbUpper === 'number' && typeof data.bbLower === 'number' && isFinite(data.bbUpper) && isFinite(data.bbLower) && (
            <div className="flex items-center justify-between text-indigo-900 font-medium text-[10px]">
              <span className="font-sans">BB [±2σ]:</span>
              <span>₹{data.bbLower.toFixed(0)} - ₹{data.bbUpper.toFixed(0)}</span>
            </div>
          )}
          {data.volume != null && (
            <div className="flex items-center justify-between text-blue-900 font-semibold pt-1 border-t border-slate-100">
              <span className="font-sans text-[10px] text-slate-500 font-normal">Vol:</span>
              <span className="flex items-center gap-1">
                <span>{formatVolumeNum(data.volume)}</span>
                {typeof data.deliveryPct === 'number' && isFinite(data.deliveryPct) && (
                  <span className="text-slate-500 font-normal text-[10px] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/80">
                    D: {data.deliveryPct}%
                  </span>
                )}
              </span>
            </div>
          )}
          {/* Helpful Subtitle Guide */}
          <div className="text-[9px] text-slate-400 font-sans pt-1 border-t border-slate-100 text-center flex items-center justify-center gap-1">
            <span>DMA = Moving Avg</span>
            {data.deliveryPct != null && (
              <>
                <span>•</span>
                <span>D: = Delivery %</span>
              </>
            )}
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
              <span className="px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold shrink-0 mt-0.5">Upper Circuit</span>
              <div>
                Triggered when price rises &ge;90% of the daily exchange upper circuit limit (feeds Metric 4).
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
  history = [],
  metrics,
  isExpanded = false
}: {
  history?: PricePoint[];
  metrics?: any;
  isExpanded?: boolean;
}) {
  // Surveillance Timeframes: "15D" | "1M" | "3M" | "6M" | "Max" (default "6M" / 180D Baseline)
  const [timeframe, setTimeframe] = useState<"15D" | "1M" | "3M" | "6M" | "Max">("6M");

  // Visual Chart Controls: Price, 20 DMA, 50 DMA, Volume, and 15D Surveillance Window (all ON by default as per PVASF §5.1.1)
  const [showPrice, setShowPrice] = useState(true);
  const [show20DMA, setShow20DMA] = useState(true);
  const [show50DMA, setShow50DMA] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [show15DWindow, setShow15DWindow] = useState(true);

  // Active hover point state for real-time crosshair HUD tracker
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  // Precompute moving averages, delivery %, and volume within 180D baseline
  const processedData = useMemo(() => {
    if (!history || history.length === 0) return [];
    const sorted = [...history].sort((a, b) => (String(a.date) > String(b.date) ? 1 : -1));

    return sorted.map((pt, idx, arr) => {
      const close = Number(pt.close) || 0;
      const volume = Number(pt.volume) || 0;
      const high = Number(pt.high) || close;
      const low = Number(pt.low) || close;
      const open = Number(pt.open) || close;

      // 20 DMA (§5.1.1): only valid if at least 20 trading sessions exist
      let dma20 = pt.ma20;
      if (dma20 == null && idx >= 19) {
        const s20 = arr.slice(idx - 19, idx + 1);
        dma20 = s20.reduce((acc, p) => acc + (Number(p.close) || 0), 0) / 20;
      } else if (idx < 19 && pt.ma20 == null) {
        dma20 = undefined; // Do not fabricate a fake 20 DMA on day 3
      }

      // 50 DMA (§5.1.1): only valid if at least 50 trading sessions exist
      let dma50 = pt.ma50;
      if (dma50 == null && idx >= 49) {
        const s50 = arr.slice(idx - 49, idx + 1);
        dma50 = s50.reduce((acc, p) => acc + (Number(p.close) || 0), 0) / 50;
      } else if (idx < 49 && pt.ma50 == null) {
        dma50 = undefined; // Do not fabricate a fake 50 DMA on day 5
      }

      // Daily Return %
      const prevClose = idx > 0 ? (Number(arr[idx - 1].close) || close) : close;
      const dailyReturn = (idx > 0 && prevClose > 0 && isFinite(close)) ? ((close - prevClose) / prevClose) * 100 : 0;

      // True sliding lookback window (up to 180 prior sessions)
      const lookbackSlice = arr.slice(Math.max(0, idx - 180), idx);
      const lookbackDays = lookbackSlice.length;
      const priorHigh = lookbackDays > 0 ? Math.max(...lookbackSlice.map((p) => {
        const h = Number(p.high);
        return isFinite(h) && h > 0 ? h : (Number(p.close) || 0);
      })) : 0;

      const isBreakout = idx > 0 && high > priorHigh;
      const isGenuine180High = isBreakout && lookbackDays >= 170;
      const isEarlyPeak = isBreakout && lookbackDays < 170;

      // Real Deliverable Volume % if available in market feed
      const deliveryPct = (pt as any).delivery_pct != null && isFinite(Number((pt as any).delivery_pct))
        ? Number((pt as any).delivery_pct)
        : undefined;

      return {
        date: String(pt.date),
        close,
        high,
        low,
        open,
        volume,
        deliveryPct,
        dailyReturn,
        is180High: idx >= Math.max(0, arr.length - 15) && isGenuine180High,
        isNewHigh: idx >= Math.max(0, arr.length - 15) && isEarlyPeak,
        lookbackDays,
        dma20: dma20 != null && isFinite(Number(dma20)) ? Number(Number(dma20).toFixed(2)) : undefined,
        dma50: dma50 != null && isFinite(Number(dma50)) ? Number(Number(dma50).toFixed(2)) : undefined,
      };
    });
  }, [history]);

  // Sliced data according to surveillance timeframe
  const displayData = useMemo(() => {
    if (processedData.length === 0) return [];
    if (timeframe === "15D") return processedData.slice(-15);
    if (timeframe === "1M") return processedData.slice(-22);
    if (timeframe === "3M") return processedData.slice(-65);
    if (timeframe === "6M") return processedData.slice(-180);
    return processedData;
  }, [processedData, timeframe]);

  // Latest active data point for fallback when not hovering
  const latestPoint = displayData.length > 0 ? displayData[displayData.length - 1] : null;
  const activeStats = hoveredPoint || latestPoint;

  // First baseline point for timeframe % change calculation
  const basePoint = displayData.length > 0 ? displayData[0] : null;
  const priceChangePct = (basePoint && activeStats && typeof basePoint.close === 'number' && basePoint.close > 0 && typeof activeStats.close === 'number' && isFinite(activeStats.close))
    ? ((activeStats.close - basePoint.close) / basePoint.close) * 100
    : 0;

  // Dynamic price bounds encompassing ALL active series: close, low, high, and visible DMAs
  const priceMin = useMemo(() => {
    const vals: number[] = [];
    displayData.forEach(d => {
      if (typeof d.close === 'number' && isFinite(d.close) && d.close > 0) vals.push(d.close);
      if (typeof d.low === 'number' && isFinite(d.low) && d.low > 0) vals.push(d.low);
      if (show20DMA && typeof d.dma20 === 'number' && isFinite(d.dma20) && d.dma20 > 0) vals.push(d.dma20);
      if (show50DMA && typeof d.dma50 === 'number' && isFinite(d.dma50) && d.dma50 > 0) vals.push(d.dma50);
    });
    if (!vals.length) return 0;
    return Math.max(0, Math.floor(Math.min(...vals) * 0.94));
  }, [displayData, show20DMA, show50DMA]);

  const priceMax = useMemo(() => {
    const vals: number[] = [];
    displayData.forEach(d => {
      if (typeof d.close === 'number' && isFinite(d.close) && d.close > 0) vals.push(d.close);
      if (typeof d.high === 'number' && isFinite(d.high) && d.high > 0) vals.push(d.high);
      if (show20DMA && typeof d.dma20 === 'number' && isFinite(d.dma20) && d.dma20 > 0) vals.push(d.dma20);
      if (show50DMA && typeof d.dma50 === 'number' && isFinite(d.dma50) && d.dma50 > 0) vals.push(d.dma50);
    });
    if (!vals.length) return 100;
    const calcMax = Math.ceil(Math.max(...vals) * 1.06);
    return calcMax <= priceMin ? priceMin + 10 : calcMax;
  }, [displayData, show20DMA, show50DMA, priceMin]);

  // Dynamic volume bound (anchored to bottom 30% of canvas)
  const volMax = useMemo(() => {
    const vols = displayData.map(d => d.volume).filter(v => typeof v === 'number' && isFinite(v) && v > 0);
    if (!vols.length) return 100000;
    return Math.max(100, Math.ceil(Math.max(...vols) * 3.4));
  }, [displayData]);

  // 15-Day Surveillance Window Coordinates
  const win15Start = displayData.length >= 15 ? displayData[displayData.length - 15].date : displayData[0]?.date;
  const win15End = displayData.length > 0 ? displayData[displayData.length - 1].date : "";

  const formatDateTick = (d: string) => {
    if (!d) return "";
    const clean = String(d).split("T")[0];
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const mIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (timeframe === "15D" || timeframe === "1M" || timeframe === "3M") {
        return `${day} ${months[mIdx] || parts[1]}`;
      }
      return `${months[mIdx] || parts[1]} '${parts[0].length === 4 ? parts[0].slice(-2) : parts[0]}`;
    }
    return String(d);
  };

  const hasAnomaly = (metrics?.final_score ?? metrics?.risk_score ?? metrics?.score ?? 0) >= 60.0 || metrics?.risk === "High";

  if (!history || history.length === 0) {
    return (
      <div className="w-full h-[400px] flex flex-col items-center justify-center text-slate-400 text-xs font-semibold gap-2">
        <BarChart2 className="w-8 h-8 text-slate-300" />
        <span>No surveillance price/volume history available.</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3.5 min-w-0 font-sans">
      {/* ------------------------------------------------------------- */}
      {/* Top Header Bar: Surveillance Timeframes (Left) + Tools (Right) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        {/* Left: Timeframe Segment Control */}
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {(["15D", "1M", "3M", "6M", "Max"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-3.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer select-none",
                timeframe === tf
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              )}
            >
              {tf === "15D" ? "15D (Window)" : tf === "6M" ? "6M (180D Baseline)" : tf}
            </button>
          ))}
        </div>

        {/* Right: 15D Surveillance Window Toggle & Anomaly Alert */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasAnomaly && timeframe !== "15D" && (
            <button
              type="button"
              onClick={() => setTimeframe("15D")}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
              title="Click to zoom into the 15-day manipulation window"
            >
              <Zap className="w-3.5 h-3.5 text-rose-600" />
              <span>Pump Anomaly Detected</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShow15DWindow(!show15DWindow)}
            className={cn(
              "px-3.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer select-none",
              show15DWindow
                ? "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
            )}
            title="Toggle 15-Day Surveillance Window Highlight"
          >
            <span className={cn("w-2 h-2 rounded-full", show15DWindow ? "bg-amber-600" : "bg-slate-300")} />
            <span>15D Window</span>
          </button>
          <ChartGuideButton />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Real-time Live Stats Subheader (Crosshair Tracker) */}
      {/* ------------------------------------------------------------- */}
      {activeStats && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs font-medium">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-slate-500 font-semibold font-mono">
              {formatTooltipDate(activeStats.date)}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Price:</span>
              <span className="font-bold text-slate-900 text-sm">
                ₹{typeof activeStats.close === 'number' && isFinite(activeStats.close) ? activeStats.close.toFixed(2) : "--"}
              </span>
              {isFinite(priceChangePct) && (
                <span className={cn(
                  "text-[11px] font-bold px-1.5 py-0.2 rounded font-mono ml-0.5",
                  priceChangePct >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                )}>
                  {priceChangePct >= 0 ? "+" : ""}{priceChangePct.toFixed(2)}%
                </span>
              )}
            </div>

            {typeof activeStats.dma20 === 'number' && isFinite(activeStats.dma20) && show20DMA && (
              <div className="flex items-center gap-1 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                <span className="font-semibold text-sky-900">20 DMA:</span>
                <span className="font-bold text-slate-800">₹{activeStats.dma20.toFixed(2)}</span>
              </div>
            )}

            {typeof activeStats.dma50 === 'number' && isFinite(activeStats.dma50) && show50DMA && (
              <div className="flex items-center gap-1 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-[#d97706]" />
                <span className="font-semibold text-amber-900">50 DMA:</span>
                <span className="font-bold text-slate-800">₹{activeStats.dma50.toFixed(2)}</span>
              </div>
            )}
          </div>

          {activeStats.volume != null && showVolume && (
            <div className="flex items-center gap-1.5 text-slate-600 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#60a5fa]" />
              <span className="font-semibold text-blue-900">Vol:</span>
              <span className="font-bold text-slate-800 font-mono">
                {formatVolumeNum(activeStats.volume)}
              </span>
              {typeof activeStats.deliveryPct === 'number' && isFinite(activeStats.deliveryPct) && (
                <span className="text-[11px] text-slate-500 font-normal">
                  (D: {activeStats.deliveryPct}%)
                </span>
              )}
            </div>
          )}
        </div>
      )}


      {/* ------------------------------------------------------------- */}
      {/* Main Dual-Axis Chart Canvas */}
      {/* ------------------------------------------------------------- */}
      <div className={cn("w-full min-w-0 overflow-hidden", isExpanded ? "h-[540px]" : "h-[390px] md:h-[430px]")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayData}
            margin={{ top: 15, right: 65, left: 15, bottom: 10 }}
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
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            {/* X-Axis */}
            <XAxis
              dataKey="date"
              tickFormatter={formatDateTick}
              stroke="#cbd5e1"
              tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={false}
              minTickGap={35}
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
              stroke="#cbd5e1"
              tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              width={60}
              label={{
                value: "Volume",
                angle: -90,
                position: "insideLeft",
                fill: "#1e293b",
                fontSize: 12,
                fontWeight: 700,
                offset: 10
              }}
            />

            {/* Right Y-Axis: Price on NSE */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[priceMin, priceMax]}
              tickFormatter={(p) => `₹${Math.round(p).toLocaleString("en-IN")}`}
              stroke="#cbd5e1"
              tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              width={60}
              label={{
                value: "Price on NSE",
                angle: 90,
                position: "insideRight",
                fill: "#1e293b",
                fontSize: 12,
                fontWeight: 700,
                offset: 20
              }}
            />

            <Tooltip
              content={<CustomScreenerTooltip />}
              isAnimationActive={false}
              wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 100 }}
              cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }}
            />

            {/* 15-Day Surveillance Window Highlight */}
            {show15DWindow && win15Start && win15End && win15Start !== win15End && timeframe !== "15D" && (
              <ReferenceArea
                yAxisId="right"
                x1={win15Start}
                x2={win15End}
                y1={priceMin}
                y2={priceMax}
                fill="#fef3c7"
                fillOpacity={0.45}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeWidth={1.5}
              />
            )}

            {/* Volume Bars (Left Axis - Soft Institutional Blue) */}
            {showVolume && (
              <Bar
                yAxisId="left"
                dataKey="volume"
                fill="#93c5fd"
                stroke="#60a5fa"
                strokeWidth={0.5}
                fillOpacity={0.85}
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
                strokeWidth={2.0}
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
                strokeWidth={2.0}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}

            {/* Price on NSE Line (Right Axis - High Contrast Indigo) */}
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
      {/* Bottom Interactive Legend Checkbox Bar (High Contrast) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-3 border-t border-slate-200 text-xs font-bold text-slate-800">
        {/* Price on NSE Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-800 hover:text-indigo-900 transition-colors">
          <input
            type="checkbox"
            checked={showPrice}
            onChange={(e) => setShowPrice(e.target.checked)}
            className="sr-only"
          />
          <span className={cn(
            "w-4 h-4 rounded flex items-center justify-center border transition-all",
            showPrice ? "bg-[#4338ca] border-[#312e81] text-white shadow-2xs" : "border-slate-300 bg-white"
          )}>
            {showPrice && <Check className="w-3 h-3 stroke-[3]" />}
          </span>
          <span>Price on NSE</span>
        </label>

        {/* 20 DMA Toggle (§5.1.1) */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-800 hover:text-sky-900 transition-colors">
          <input
            type="checkbox"
            checked={show20DMA}
            onChange={(e) => setShow20DMA(e.target.checked)}
            className="sr-only"
          />
          <span className={cn(
            "w-4 h-4 rounded flex items-center justify-center border transition-all",
            show20DMA ? "bg-[#0284c7] border-[#0369a1] text-white shadow-2xs" : "border-slate-300 bg-white"
          )}>
            {show20DMA && <Check className="w-3 h-3 stroke-[3]" />}
          </span>
          <span>20 DMA</span>
        </label>

        {/* 50 DMA Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-800 hover:text-amber-900 transition-colors">
          <input
            type="checkbox"
            checked={show50DMA}
            onChange={(e) => setShow50DMA(e.target.checked)}
            className="sr-only"
          />
          <span className={cn(
            "w-4 h-4 rounded flex items-center justify-center border transition-all",
            show50DMA ? "bg-[#d97706] border-[#b45309] text-white shadow-2xs" : "border-slate-300 bg-white"
          )}>
            {show50DMA && <Check className="w-3 h-3 stroke-[3]" />}
          </span>
          <span>50 DMA</span>
        </label>

        {/* Volume Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-800 hover:text-blue-900 transition-colors">
          <input
            type="checkbox"
            checked={showVolume}
            onChange={(e) => setShowVolume(e.target.checked)}
            className="sr-only"
          />
          <span className={cn(
            "w-4 h-4 rounded flex items-center justify-center border transition-all",
            showVolume ? "bg-[#60a5fa] border-[#3b82f6] text-white shadow-2xs" : "border-slate-300 bg-white"
          )}>
            {showVolume && <Check className="w-3 h-3 stroke-[3]" />}
          </span>
          <span>Volume</span>
        </label>

        {/* 15D Surveillance Window Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-800 hover:text-amber-900 transition-colors">
          <input
            type="checkbox"
            checked={show15DWindow}
            onChange={(e) => setShow15DWindow(e.target.checked)}
            className="sr-only"
          />
          <span className={cn(
            "w-4 h-4 rounded flex items-center justify-center border transition-all",
            show15DWindow ? "bg-[#f59e0b] border-[#d97706] text-white shadow-2xs" : "border-slate-300 bg-white"
          )}>
            {show15DWindow && <Check className="w-3 h-3 stroke-[3]" />}
          </span>
          <span>15D Analysis Window</span>
        </label>
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
  weights,
}: {
  history?: PricePoint[];
  metrics?: any;
  weights?: {
    price_rise?: number;
    price_z?: number;
    volume_z?: number;
    band_persistence?: number;
    new_high?: number;
  };
}) {
  if (!history || history.length === 0) return null;

  // 1. Price Growth Metrics (PVASF 2.1)
  const startPrice = Number(history[0]?.close) || 1;
  const currentPrice = Number(history[history.length - 1]?.close) || startPrice;
  const netGainPct = startPrice > 0 ? Math.round(((currentPrice - startPrice) / startPrice) * 1000) / 10 : 0;
  const priceRisePct = metrics?.price_rise_pct ?? (metrics?.["Price Rise %"] ?? netGainPct);
  const highVals = history.map((h) => Number(h.high) || Number(h.close) || 0).filter(v => v > 0);
  const max180High = highVals.length > 0 ? Math.max(...highVals) : currentPrice;
  const last15HighVals = history.slice(-15).map((h) => Number(h.high) || Number(h.close) || 0).filter(v => v > 0);
  const max15High = last15HighVals.length > 0 ? Math.max(...last15HighVals) : currentPrice;
  const isHighRiskGain = priceRisePct >= 75.0;
  const priceRiseScore = metrics?.price_rise_score ?? (metrics?.["Price Rise Score"] ?? (priceRisePct > 150 ? 5 : priceRisePct > 75 ? 3 : priceRisePct >= 15 ? 1 : 0));

  // 2. Price Return & Momentum Z-Score Metrics (PVASF 2.2)
  const returns = history.map((h, i) => {
    if (i === 0) return 0;
    const prev = Number(history[i - 1]?.close) || 1;
    const curr = Number(h.close) || prev;
    return prev > 0 ? ((curr - prev) / prev) * 100 : 0;
  });
  const validReturns = returns.filter((r) => typeof r === "number" && isFinite(r));
  const rolling15Returns = computeMA(validReturns, 15);

  // Authoritative rolling 15-day return distribution baseline from backend metrics
  const mean180Return = metrics?.price_mean != null && isFinite(Number(metrics.price_mean))
    ? Number(metrics.price_mean)
    : (validReturns.length > 0 ? validReturns.reduce((a, b) => a + b, 0) / validReturns.length : 0);
  const stdDevReturn = metrics?.price_std != null && Number(metrics.price_std) > 0 && isFinite(Number(metrics.price_std))
    ? Number(metrics.price_std)
    : (validReturns.length > 0 ? Math.sqrt(validReturns.reduce((a, b) => a + Math.pow(b - mean180Return, 2), 0) / validReturns.length) || 1 : 1);
  const zAlertReturn = metrics?.price_threshold_95 != null && isFinite(Number(metrics.price_threshold_95))
    ? Number(metrics.price_threshold_95)
    : Math.round((mean180Return + 1.645 * stdDevReturn) * 100) / 100;
  const zCriticalReturn = metrics?.price_threshold_99 != null && isFinite(Number(metrics.price_threshold_99))
    ? Number(metrics.price_threshold_99)
    : Math.round((mean180Return + 2.33 * stdDevReturn) * 100) / 100;
  const zExtremeReturn = metrics?.price_threshold_999 != null && isFinite(Number(metrics.price_threshold_999))
    ? Number(metrics.price_threshold_999)
    : Math.round((mean180Return + 3.09 * stdDevReturn) * 100) / 100;

  const enrichedReturns = history.map((h, i) => {
    const dailyRet = validReturns[i] ?? 0;
    const ma15 = rolling15Returns[i] != null ? rolling15Returns[i]! : dailyRet;
    const zScore = stdDevReturn > 0 ? Math.round(((ma15 - mean180Return) / stdDevReturn) * 100) / 100 : 0;
    return { ...h, dailyReturn: dailyRet, rolling15dReturn: ma15, zScore };
  });
  const last15Returns = enrichedReturns.slice(-15);
  const latest15MeanReturn = last15Returns.length > 0 ? last15Returns.reduce((a, b) => a + b.dailyReturn, 0) / last15Returns.length : 0;
  const returnSurgeMultiple = mean180Return > 0 && isFinite(mean180Return)
    ? Math.round((latest15MeanReturn / mean180Return) * 10) / 10
    : (latest15MeanReturn > 0 ? 5.0 : 1.0);
  const abnormalMoveDays = last15Returns.filter((d) => d.zScore >= 1.645).length;
  const criticalMoveDays = last15Returns.filter((d) => d.zScore >= 2.33).length;
  const priceZVal = metrics?.price_z != null && isFinite(Number(metrics.price_z))
    ? Number(metrics.price_z)
    : (enrichedReturns[enrichedReturns.length - 1]?.zScore || 0);
  const priceZScore = metrics?.price_z_score ?? (metrics?.["Price Z Score"] ?? (priceZVal >= 3.09 ? 5 : priceZVal >= 2.33 ? 3 : priceZVal >= 1.645 ? 1 : 0));

  // 3. Volume & Liquidity Burst Metrics (PVASF 2.3)
  const volumes = history.map((h) => Number(h.volume) || 0);
  const validVolumes = volumes.filter((v) => typeof v === "number" && isFinite(v));
  const rolling15Vol = computeMA(validVolumes, 15);

  // Authoritative rolling 15-day volume distribution baseline from backend metrics
  const meanVol180 = metrics?.volume_mean != null && isFinite(Number(metrics.volume_mean))
    ? Number(metrics.volume_mean)
    : (validVolumes.length > 0 ? validVolumes.reduce((a, b) => a + b, 0) / validVolumes.length : 0);
  const stdDevVol = metrics?.volume_std != null && Number(metrics.volume_std) > 0 && isFinite(Number(metrics.volume_std))
    ? Number(metrics.volume_std)
    : (validVolumes.length > 0 ? Math.sqrt(validVolumes.reduce((a, b) => a + Math.pow(b - meanVol180, 2), 0) / validVolumes.length) || 1 : 1);
  const zVolAlert = metrics?.volume_threshold_95 != null && isFinite(Number(metrics.volume_threshold_95))
    ? Number(metrics.volume_threshold_95)
    : Math.round(meanVol180 + 1.645 * stdDevVol);
  const zVolCritical = metrics?.volume_threshold_99 != null && isFinite(Number(metrics.volume_threshold_99))
    ? Number(metrics.volume_threshold_99)
    : Math.round(meanVol180 + 2.33 * stdDevVol);
  const zVolExtreme = metrics?.volume_threshold_999 != null && isFinite(Number(metrics.volume_threshold_999))
    ? Number(metrics.volume_threshold_999)
    : Math.round(meanVol180 + 3.09 * stdDevVol);

  const enrichedVol = history.map((h, i) => {
    const vol = validVolumes[i] ?? 0;
    const ma15 = rolling15Vol[i] || vol;
    const zScore = stdDevVol > 0 ? Math.round(((ma15 - meanVol180) / stdDevVol) * 100) / 100 : 0;
    const surgeRatio = ma15 > 0 ? Math.round((vol / ma15) * 10) / 10 : 1;
    return { ...h, volume: vol, rolling15d: ma15, surgeRatio, zScore };
  });
  const last15Vol = enrichedVol.slice(-15);
  const latest15Vol = last15Vol.length > 0 ? last15Vol.reduce((a, b) => a + b.volume, 0) / last15Vol.length : 0;
  const volSurgeMultiple = meanVol180 > 0 && isFinite(meanVol180) ? Math.round((latest15Vol / meanVol180) * 10) / 10 : 1.0;
  const volSpikeDays = last15Vol.filter((d) => d.surgeRatio >= 1.5).length;
  const volumeZVal = metrics?.volume_z != null && isFinite(Number(metrics.volume_z))
    ? Number(metrics.volume_z)
    : (enrichedVol[enrichedVol.length - 1]?.zScore || 0);
  const volumeZScore = metrics?.volume_z_score ?? (metrics?.["Volume Z Score"] ?? (volumeZVal >= 3.09 ? 5 : volumeZVal >= 2.33 ? 3 : volumeZVal >= 1.645 ? 1 : 0));

  const historyDays = history.length;
  const isFull180 = historyDays >= 170;
  const baselineLabel = isFull180 ? "Closing Price (T-180)" : `Baseline Close (T-${historyDays})`;
  const baselineTooltip = isFull180
    ? "The closing price 180 trading days (~6 months) ago, used as the baseline for Price Rise calculation against historical baseline."
    : `Earliest available closing price in current dataset (${historyDays} sessions ago on ${history[0]?.date}). Lookback is adjusted to available depth.`;
  const obsSubtitle = isFull180
    ? "Observation: 15-Day High vs T-180 Baseline"
    : `Observation: 15-Day High vs T-${historyDays} Baseline (${historyDays}d available)`;

  return (
    <div className="space-y-4">
      {/* Card 1: Price Rise */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              Price Rise
              <InfoTooltip text={`Compares price growth over the last 15 days against the baseline price from 6 months ago (accounts for ${weights?.price_rise ?? 20}% of total risk score).`} />
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {weights?.price_rise ?? 20}% of Score
            </span>
            {!isFull180 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200" title={`Historical depth is ${historyDays} sessions, which is less than the standard 180 trading sessions.`}>
                ⚠️ {historyDays}d History
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {obsSubtitle}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              {baselineLabel}
              <InfoTooltip text={baselineTooltip} />
            </span>
            <span className="font-extrabold font-mono text-slate-900 text-base mt-1 block">
              ₹{startPrice.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Current Closing Price
              <InfoTooltip text={`Latest closing price on observation day T, showing total percentage change from T-${historyDays} baseline.`} />
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-extrabold font-mono text-blue-700 text-base">
                ₹{currentPrice.toFixed(2)}
              </span>
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono",
                netGainPct >= 75 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}>
                {netGainPct >= 0 ? "+" : ""}{netGainPct}% C-C
              </span>
            </div>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              15-Day Peak High
              <InfoTooltip text={`Highest intraday price reached during the 15-day observation window, used as numerator in the PVASF §2.1 Price Rise formula. ${isFull180 ? "180-day" : `${historyDays}-day`} overall high is ₹${max180High.toFixed(2)}.`} />
            </span>
            <span className="font-extrabold font-mono text-rose-700 text-base mt-1 block">
              ₹{max15High.toFixed(2)}
            </span>
            {max180High > max15High ? (
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5" title={`Historical peak outside observation window`}>
                {isFull180 ? "180d" : `${historyDays}d`} Peak: ₹{max180High.toFixed(2)}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                Equals {isFull180 ? "180d" : `${historyDays}d`} Peak
              </span>
            )}
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Price Rise Severity & Score
              <InfoTooltip text={`PVASF §2.1 formula: (15-Day Peak High ₹${max15High.toFixed(2)} − Baseline Close ₹${startPrice.toFixed(2)}) / Baseline Close ₹${startPrice.toFixed(2)} × 100 = ${priceRisePct >= 0 ? "+" : ""}${Number(priceRisePct).toFixed(2)}%. Scoring: <15% (0 pts), 15–75% (1 pt), 76–150% (3 pts), >150% (5 pts).`} />
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("font-extrabold font-mono text-base", isHighRiskGain ? "text-rose-700" : "text-slate-900")}>
                {priceRisePct >= 0 ? "+" : ""}{Number(priceRisePct).toFixed(2)}%
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
              <InfoTooltip text={`Measures how unusually fast the stock's price moved over the last 15 days compared to normal 6-month fluctuations (accounts for ${weights?.price_z ?? 20}% of total risk score).`} />
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {weights?.price_z ?? 20}% of Score
            </span>
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono",
              priceZScore >= 3 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"
            )}>
              Z = {priceZVal.toFixed(2)}σ (Score {priceZScore}/5)
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Close-to-Close (C-C) Price Movement
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Historical Baseline (μ, σ)
              <InfoTooltip text={`Average daily return (μ = ${mean180Return.toFixed(2)}%) and standard deviation (σ = ${stdDevReturn.toFixed(2)}%) across rolling 15-day windows over the past 6 months.`} />
            </span>
            <span className="font-extrabold font-mono text-slate-900 text-base mt-1 block">
              μ = {mean180Return.toFixed(2)}% <span className="text-xs font-normal text-slate-500 font-mono">(σ = {stdDevReturn.toFixed(2)}%)</span>
            </span>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Current 15-Day Average (X̄)
              <InfoTooltip text="Average daily percentage price change over the most recent 15 trading days." />
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
              <InfoTooltip text="Abnormal move scoring: top 5% of moves (1 pt), top 1% (3 pts), and top 0.1% extreme moves (5 pts)." />
            </span>
            <div className="flex items-center gap-1.5 flex-wrap mt-1 font-mono text-[11px] font-bold">
              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="95th Percentile (Z ≥ 1.645, Score 1/5)">
                ≥{zAlertReturn}% (95th)
              </span>
              <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" title="99th Percentile (Z ≥ 2.33, Score 3/5)">
                ≥{zCriticalReturn}% (99th)
              </span>
              <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200" title="99.9th Percentile (Z ≥ 3.09, Score 5/5)">
                ≥{zExtremeReturn}% (99.9th)
              </span>
            </div>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Outlier Days (Z ≥ 1.645σ)
              <InfoTooltip text="Number of days in the 15-day window where the daily price move spiked into the top 5% of historical moves." />
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
              <InfoTooltip text={`Measures how unusually high the trading volume was over the last 15 days compared to normal 6-month trading (accounts for ${weights?.volume_z ?? 20}% of total risk score).`} />
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
              {weights?.volume_z ?? 20}% of Score
            </span>
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono",
              volumeZScore >= 3 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-cyan-50 text-cyan-700 border-cyan-200"
            )}>
              Z = {volumeZVal.toFixed(2)}σ (Score {volumeZScore}/5)
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Sustained 15-Day Traded Volume Analysis
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Historical Baseline (μ, σ)
              <InfoTooltip text={`Average daily volume (μ = ${formatVolumeNum(meanVol180)}) and standard deviation (σ = ${formatVolumeNum(stdDevVol)}) across rolling 15-day windows over the past 6 months.`} />
            </span>
            <span className="font-extrabold font-mono text-slate-900 text-base mt-1 block">
              μ = {formatVolumeNum(meanVol180)} <span className="text-xs font-normal text-slate-500 font-mono">(σ = {formatVolumeNum(stdDevVol)})</span>
            </span>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Current 15-Day Average (X̄)
              <InfoTooltip text="Average daily shares traded over the most recent 15 trading days." />
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
              Statistical Thresholds
              <InfoTooltip text="Volume surge scoring: top 5% of volume days (1 pt), top 1% (3 pts), and top 0.1% extreme spikes (5 pts)." />
            </span>
            <div className="flex items-center gap-1.5 flex-wrap mt-1 font-mono text-[11px] font-bold">
              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="95th Percentile (Z ≥ 1.645, Score 1/5)">
                ≥{formatVolumeNum(zVolAlert)} (95th)
              </span>
              <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" title="99th Percentile (Z ≥ 2.33, Score 3/5)">
                ≥{formatVolumeNum(zVolCritical)} (99th)
              </span>
              <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200" title="99.9th Percentile (Z ≥ 3.09, Score 5/5)">
                ≥{formatVolumeNum(zVolExtreme)} (99.9th)
              </span>
            </div>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              Volume Surge Days
              <InfoTooltip text="Number of days in the 15-day window where trading volume spiked at least 1.5 times above recent average volume." />
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
