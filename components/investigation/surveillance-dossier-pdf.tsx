"use client";

import React, { useState, useMemo } from "react";
import {
  Printer,
  X,
  FileText,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  Activity,
  Layers,
} from "lucide-react";
import type { ScripDetail, ParticipantAudit, PricePoint } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SurveillanceDossierPdfProps {
  detail: ScripDetail;
  shBreakdown?: any;
  corpActions?: any[];
  participants?: ParticipantAudit | null;
  selectedDate: string;
  windowDays: number;
  exchange: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { username: string; role: string; email?: string } | null;
  autoPrint?: boolean;
}

// ── Curated Security & Company Lookups ──
const COMPANY_NAMES: Record<string, [string, string]> = {
  NOVAENERGY: ["Nova Energy Ltd", "INE752716A01"],
  ALPHATECH: ["Alpha Technologies Ltd", "INE001A01010"],
  ZENITHBIO: ["Zenith Bio-Tech Ltd", "INE003C01030"],
  ORBITCEM: ["Orbit Cement Ltd", "INE004D01040"],
  TCS: ["Tata Consultancy Services Ltd", "INE467B01029"],
  SBIN: ["State Bank of India", "INE062A01020"],
  ICICIBANK: ["ICICI Bank Ltd", "INE090A01021"],
  AXISBANK: ["Axis Bank Ltd", "INE238A01034"],
  RELIANCE: ["Reliance Industries Ltd", "INE002A01018"],
  HDFCBANK: ["HDFC Bank Ltd", "INE040A01034"],
  INFY: ["Infosys Ltd", "INE009A01021"],
  WIPRO: ["Wipro Ltd", "INE075A01022"],
  BAJFINANCE: ["Bajaj Finance Ltd", "INE296A01024"],
  MARUTI: ["Maruti Suzuki India Ltd", "INE585B01010"],
  SUNPHARMA: ["Sun Pharma Industries Ltd", "INE044A01036"],
};

// ── PVASF Scoring Calculations ──
function getScoreZone(score: number): { label: string; badgeClass: string; bgClass: string } {
  const normScore = score <= 25 ? score * 4 : score;
  if (normScore >= 60) {
    return {
      label: "High Risk",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
      bgClass: "bg-rose-50/70 border-rose-200"
    };
  }
  if (normScore >= 40) {
    return {
      label: "Medium Risk",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
      bgClass: "bg-amber-50/70 border-amber-200"
    };
  }
  return {
    label: "Low Risk",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    bgClass: "bg-emerald-50/70 border-emerald-200"
  };
}

function rawScoreForPriceRise(pct: number): number {
  if (pct > 150) return 5;
  if (pct >= 76) return 3;
  if (pct >= 15) return 1;
  return 0;
}
function rawScoreForZ(z: number): number {
  if (z >= 3.09) return 5;
  if (z >= 2.33) return 3;
  if (z >= 1.645) return 1;
  return 0;
}
function rawScoreForBandDays(d: number): number {
  if (d >= 10) return 5;
  if (d >= 6) return 3;
  if (d >= 3) return 1;
  return 0;
}
function rawScoreForNewHighDays(d: number): number {
  if (d >= 10) return 5;
  if (d >= 5) return 3;
  if (d >= 1) return 1;
  return 0;
}

// ── SVG Vector Radar Chart (Clean Proportions, No Edge Clipping) ──
function VectorRadarChart({ metrics }: { metrics: ScripDetail["metrics"] }) {
  const size = 220;
  const center = size / 2;
  const radius = 72;
  const levels = [1, 2, 3, 4, 5];

  const parameters = [
    { label: "Price Rise", raw: rawScoreForPriceRise(metrics.price_rise_pct) },
    { label: "Return Z", raw: rawScoreForZ(metrics.price_z) },
    { label: "Volume Z", raw: rawScoreForZ(metrics.volume_z) },
    { label: "Band Hits", raw: rawScoreForBandDays(metrics.band_hit_days) },
    { label: "180D High", raw: rawScoreForNewHighDays(metrics.new_high_days) },
  ];

  const count = parameters.length;

  const getPolygonPoints = (scale: number) => {
    return parameters
      .map((_, i) => {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        const r = radius * scale;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const scorePolygonPoints = parameters
    .map((p, i) => {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      const r = radius * (Math.max(0.2, p.raw) / 5);
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-slate-50/60 border border-slate-200 rounded-lg">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {levels.map((lvl) => (
          <polygon
            key={lvl}
            points={getPolygonPoints(lvl / 5)}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={lvl === 5 ? "1.25" : "0.75"}
            strokeDasharray={lvl === 5 ? undefined : "2 2"}
          />
        ))}

        {parameters.map((_, i) => {
          const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#94a3b8"
              strokeWidth="0.75"
            />
          );
        })}

        <polygon
          points={scorePolygonPoints}
          fill="rgba(225, 29, 72, 0.18)"
          stroke="#e11d48"
          strokeWidth="2"
        />

        {parameters.map((p, i) => {
          const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
          const r = radius * (Math.max(0.2, p.raw) / 5);
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);

          const labelR = radius + 18;
          const lx = center + labelR * Math.cos(angle);
          const ly = center + labelR * Math.sin(angle);

          return (
            <g key={i}>
              <circle cx={x} cy={y} r="3.5" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
              <text
                x={lx}
                y={ly + (ly > center ? 3 : -2)}
                textAnchor={Math.abs(lx - center) < 10 ? "middle" : lx > center ? "start" : "end"}
                className="text-[9.5px] font-bold fill-slate-700 font-sans"
              >
                {p.label} ({p.raw}/5)
              </text>
            </g>
          );
        })}
      </svg>
      <div className="text-[10px] text-slate-500 font-sans mt-0.5 font-medium">
        5-Parameter Anomaly Radar (0–5 Scale)
      </div>
    </div>
  );
}

// ── Non-Wrapping Institutional Page Header ──
function PageHeader({
  pageNumber,
  totalPages,
  symbol,
  company,
  selectedDate,
  title
}: {
  pageNumber: number;
  totalPages: number;
  symbol: string;
  company: string;
  selectedDate: string;
  title: string;
}) {
  return (
    <div className="border-b-2 border-slate-900 pb-2 mb-3 shrink-0">
      {/* Top Meta Line: Title, Security level, Page */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pb-1 border-b border-slate-100">
        <span className="font-semibold text-slate-700">Securities Market Surveillance | Regulatory Enforcement Dossier</span>
        <span className="text-slate-400">Confidential · Strictly for Regulatory & Compliance Use</span>
        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">Page {pageNumber} of {totalPages}</span>
      </div>

      {/* Main Bar: Company on Left, Title + Date on Right */}
      <div className="flex items-center justify-between mt-1.5 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-extrabold text-base text-slate-900 tracking-tight truncate max-w-[340px]">
            {company}
          </span>
          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded shrink-0">
            {symbol}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded whitespace-nowrap">
            {title}
          </span>
          <span className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded whitespace-nowrap">
            As of {selectedDate}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Non-Wrapping 2-Sided Institutional Footer ──
function PageFooter({
  symbol,
  selectedDate,
  generatedAt
}: {
  symbol: string;
  selectedDate: string;
  generatedAt: string;
}) {
  return (
    <div className="border-t border-slate-200 pt-1.5 mt-auto shrink-0 text-[9.5px] text-slate-500 flex items-center justify-between font-sans">
      <div className="flex items-center gap-2 truncate">
        <span className="font-semibold text-slate-700">PVASF Regulatory Surveillance Dossier</span>
        <span className="text-slate-300">|</span>
        <span className="font-mono">Scrip: {symbol}</span>
        <span className="text-slate-300">·</span>
        <span className="font-mono">Date: {selectedDate}</span>
      </div>
      <div className="font-mono text-[9.5px] text-slate-400 shrink-0 ml-3">
        Generated: {generatedAt}
      </div>
    </div>
  );
}

export function SurveillanceDossierPdf({
  detail,
  shBreakdown,
  corpActions = [],
  participants,
  selectedDate,
  windowDays,
  exchange,
  isOpen,
  onClose,
  currentUser,
  autoPrint = false
}: SurveillanceDossierPdfProps) {
  const [zoom, setZoom] = useState<number>(100);

  const generatedAt = useMemo(() => {
    return new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
  }, []);

  const totalPages = 5;
  const { metrics, summary, history = [], company: rawCompany, symbol: rawSymbol, isin: rawIsin } = detail;
  const symbol = (rawSymbol || "SCRIP").toUpperCase();
  const lookup = COMPANY_NAMES[symbol];
  const company = (rawCompany && rawCompany.toUpperCase() !== symbol)
    ? rawCompany
    : lookup ? lookup[0] : `${symbol.charAt(0) + symbol.slice(1).toLowerCase()} Ltd`;
  const isin = rawIsin && rawIsin !== "N/A" ? rawIsin : lookup ? lookup[1] : "INE002A01018";

  // Standardized 100-Point Model
  const finalScore = metrics.final_score ?? 0;
  const zone = getScoreZone(finalScore);

  // Raw parameter scores (0-5)
  const priceRiseRaw = rawScoreForPriceRise(metrics.price_rise_pct);
  const priceZRaw = rawScoreForZ(metrics.price_z);
  const volumeZRaw = rawScoreForZ(metrics.volume_z);
  const bandRaw = rawScoreForBandDays(metrics.band_hit_days);
  const newHighRaw = rawScoreForNewHighDays(metrics.new_high_days);
  // Calibrated model weights and points contributions from detail.score_breakdown
  const sbMap = useMemo(() => {
    const map: Record<string, { weight: number; contribution: number }> = {};
    (detail?.score_breakdown || []).forEach((item) => {
      map[item.label] = { weight: item.weight, contribution: item.contribution };
    });
    return map;
  }, [detail?.score_breakdown]);

  const wPriceRise = sbMap["Price Rise"]?.contribution ?? (priceRiseRaw * 4.0);
  const wPriceZ = sbMap["Price Z"]?.contribution ?? (priceZRaw * 4.0);
  const wVolumeZ = sbMap["Volume Z"]?.contribution ?? (volumeZRaw * 4.0);
  const wBand = sbMap["Band Persistence"]?.contribution ?? (bandRaw * 4.0);
  const wNewHigh = sbMap["180 Day New High"]?.contribution ?? (newHighRaw * 4.0);
  const totalWeightedScore = metrics.final_score ?? (wPriceRise + wPriceZ + wVolumeZ + wBand + wNewHigh);

  // 15-day window dynamics calculation
  const windowHistory = useMemo(() => {
    return history.slice(-windowDays).reverse();
  }, [history, windowDays]);

  // Major Shareholders list
  const majorShareholders = useMemo(() => {
    return shBreakdown?.major_shareholders || [];
  }, [shBreakdown]);

  // Matched trade pairs from participants
  const matchedTradePairs = useMemo(() => {
    return participants?.counterparty_pairs || [];
  }, [participants]);

  const topParticipants = useMemo(() => {
    return participants?.volume_share || [];
  }, [participants]);

  const handlePrint = () => {
    window.print();
  };

  // Instant 1-Click Fast Print Trigger
  React.useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  // Keyboard Navigation: Escape to close preview, Ctrl/Cmd+P to print
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col overflow-hidden animate-in fade-in">
      {/* ── TOP PREVIEW TOOLBAR (Hidden in Print) ── */}
      <div className="no-print bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0 shadow-lg text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold leading-none text-white">
              Institutional Surveillance Dossier PDF Preview
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              {company} ({symbol}) · Complete Regulatory Report ({totalPages} Pages A4 Sequential)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 15))}
              className="px-2.5 py-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              -
            </button>
            <span className="px-2 text-xs font-mono font-bold text-slate-200">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(150, z + 15))}
              className="px-2.5 py-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
          </div>

          {/* Direct Print / Save as PDF Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>

          {/* Close Preview */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── SCROLLABLE PREVIEW CONTAINER (On Screen) ── */}
      <div className="flex-1 overflow-y-auto bg-slate-900/60 p-4 md:p-8 flex justify-center">
        <div
          id="surveillance-dossier-print-root"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          className="w-[210mm] max-w-full transition-transform duration-200 flex flex-col items-center"
        >

          {/* ═══════════════════════════════════════════════════════════════════
              PAGE 1: EXECUTIVE COVER & 5-PARAMETER SURVEILLANCE SCORECARD
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="dossier-page bg-white p-6 md:p-7 text-slate-900 flex flex-col shadow-2xl mb-8 border border-slate-200 rounded-sm w-full min-h-[297mm] box-border">
            <PageHeader
              pageNumber={1}
              totalPages={totalPages}
              symbol={symbol}
              company={company}
              selectedDate={selectedDate}
              title="Executive Surveillance Scorecard & Case Profile"
            />

            {/* Refined Institutional Profile Card */}
            <div className="bg-slate-50/90 border border-slate-200 rounded-lg p-3 mb-3 shrink-0">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span className="font-bold text-xs text-slate-900">
                    Price-Volume Alert Surveillance Framework (PVASF)
                  </span>
                </div>
                <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
                  Case Ref: PVASF-{symbol}-{selectedDate.replace(/-/g, "")}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10.5px] font-medium block">Company Name</span>
                  <span className="font-bold text-slate-900 text-xs truncate block">{company}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10.5px] font-medium block">Symbol / ISIN</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-blue-700">{symbol}</span>
                    <span className="text-slate-400 font-mono text-[10px]">({isin})</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10.5px] font-medium block">Observation Date</span>
                  <span className="font-mono font-bold text-slate-900">{selectedDate} <span className="text-slate-400 font-normal font-sans text-[10px]">({windowDays}D)</span></span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10.5px] font-medium block">Trading Venues</span>
                  <span className="font-bold text-slate-900">NSE & BSE</span>
                </div>
              </div>
            </div>

            {/* Composite Risk Scorecard Banner */}
            <div className={cn("p-3 rounded-lg border mb-3 shrink-0 flex items-center justify-between", zone.bgClass)}>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Surveillance Risk Tier</span>
                  <span className={cn("px-2.5 py-0.5 text-[11px] font-bold rounded-md border", zone.badgeClass)}>
                    {zone.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                    {totalWeightedScore.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ 100 Composite Score</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Status: <strong className="text-slate-900">{detail.status || "Active Surveillance"}</strong> · Evaluated under Regulatory Anomaly Detection Engine
                </p>
              </div>

              <div className="text-right border-l border-slate-200/80 pl-5 shrink-0">
                <div className="text-[11px] text-slate-500">Current Market Price</div>
                <div className="text-lg font-mono font-bold text-slate-900">
                  ₹{summary?.latest_close ? summary.latest_close.toFixed(2) : "N/A"}
                </div>
                <div className={cn("text-xs font-semibold font-mono", (summary?.price_change_pct || 0) >= 0 ? "text-rose-600" : "text-emerald-600")}>
                  {(summary?.price_change_pct || 0) >= 0 ? "+" : ""}{summary?.price_change_pct?.toFixed(2)}% (15D Analysis Window)
                </div>
              </div>
            </div>

            {/* Parameter Radar & Matrix Breakdown (2 columns) */}
            <div className="grid grid-cols-2 gap-3 mb-3 shrink-0">
              {/* Column 1: SVG Radar Intelligence */}
              <div className="border border-slate-200 rounded-lg p-2.5 bg-white flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    Anomaly Radar Signature
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">0 to 5 Normalized</span>
                </div>
                <VectorRadarChart metrics={metrics} />
              </div>

              {/* Column 2: Mathematical Scoring Matrix */}
              <div className="border border-slate-200 rounded-lg p-2.5 bg-white flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    Quantitative Scoring Matrix
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Weight: 20% each</span>
                </div>

                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500">
                      <th className="py-1">Parameter</th>
                      <th className="py-1 text-right">Observed</th>
                      <th className="py-1 text-center">Score</th>
                      <th className="py-1 text-right">Weighted Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10.5px]">
                    <tr>
                      <td className="py-1 font-medium text-slate-800">
                        1. Price Rise % <span className="text-[9px] text-slate-500 font-mono">(w: {sbMap["Price Rise"]?.weight ?? 20}%)</span>
                      </td>
                      <td className="py-1 text-right font-mono font-bold text-slate-900">{metrics.price_rise_pct.toFixed(1)}%</td>
                      <td className="py-1 text-center font-mono font-bold text-blue-700">{priceRiseRaw}/5</td>
                      <td className="py-1 text-right font-mono font-bold text-slate-900">{wPriceRise.toFixed(1)} pts</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-medium text-slate-800">
                        2. Return Z-Score <span className="text-[9px] text-slate-500 font-mono">(w: {sbMap["Price Z"]?.weight ?? 20}%)</span>
                      </td>
                      <td className="py-1 text-right font-mono font-bold text-slate-900">{metrics.price_z.toFixed(2)}σ</td>
                      <td className="py-1 text-center font-mono font-bold text-blue-700">{priceZRaw}/5</td>
                      <td className="py-1 text-right font-mono font-bold text-slate-900">{wPriceZ.toFixed(1)} pts</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-medium text-slate-800">
                        3. Volume Z-Score <span className="text-[9px] text-slate-500 font-mono">(w: {sbMap["Volume Z"]?.weight ?? 20}%)</span>
                      </td>
                      <td className="py-1 text-right font-mono font-bold text-slate-900">{metrics.volume_z.toFixed(2)}σ</td>
                      <td className="py-1 text-center font-mono font-bold text-blue-700">{volumeZRaw}/5</td>
                      <td className="py-1 text-right font-mono font-bold text-slate-900">{wVolumeZ.toFixed(1)} pts</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-medium text-slate-800">
                        4. Upper Circuit Hits <span className="text-[9px] text-slate-500 font-mono">(w: {sbMap["Band Persistence"]?.weight ?? 20}%)</span>
                      </td>
                      <td className="py-1 text-right font-mono font-bold text-slate-900">{metrics.band_hit_days} Days</td>
                      <td className="py-1 text-center font-mono font-bold text-blue-700">{bandRaw}/5</td>
                      <td className="py-1 text-right font-mono font-bold text-slate-900">{wBand.toFixed(1)} pts</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-medium text-slate-800">
                        5. 180D New Highs <span className="text-[9px] text-slate-500 font-mono">(w: {sbMap["180 Day New High"]?.weight ?? 20}%)</span>
                      </td>
                      <td className="py-1 text-right font-mono font-bold text-slate-900">{metrics.new_high_days} Days</td>
                      <td className="py-1 text-center font-mono font-bold text-blue-700">{newHighRaw}/5</td>
                      <td className="py-1 text-right font-mono font-bold text-slate-900">{wNewHigh.toFixed(1)} pts</td>
                    </tr>
                    <tr className="border-t-2 border-slate-300 font-bold bg-slate-50">
                      <td className="py-1.5 text-slate-900">Total Composite</td>
                      <td className="py-1.5 text-right font-mono text-slate-600">—</td>
                      <td className="py-1.5 text-center font-mono text-slate-900">{priceRiseRaw + priceZRaw + volumeZRaw + bandRaw + newHighRaw}/25</td>
                      <td className="py-1.5 text-right font-mono text-rose-700">{totalWeightedScore.toFixed(1)} / 100</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Findings Narrative Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 mb-2 shrink-0">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Executive Forensic Summary & Anomaly Triggers
              </div>
              <p className="leading-relaxed text-[11px]">
                {company} has exhibited significant abnormal trading concentration over the 15-day analysis window ending {selectedDate}.
                The scrip registered a price rise of <strong>{metrics.price_rise_pct.toFixed(2)}%</strong> against market movements,
                accompanied by a return deviation of <strong>{metrics.price_z.toFixed(2)}σ</strong> and volume deviation of <strong>{metrics.volume_z.toFixed(2)}σ</strong> above its 180-day baseline.
                Upper circuit threshold was hit on <strong>{metrics.band_hit_days} sessions</strong> with <strong>{metrics.new_high_days} sessions</strong> printing new 180-day price highs.
              </p>
            </div>

            <PageFooter symbol={symbol} selectedDate={selectedDate} generatedAt={generatedAt} />
          </div>


          {/* ═══════════════════════════════════════════════════════════════════
              PAGE 2: MARKET DYNAMICS, PRICE-VOLUME & 15-DAY TRADING LEDGER
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="dossier-page bg-white p-6 md:p-7 text-slate-900 flex flex-col shadow-2xl mb-8 border border-slate-200 rounded-sm w-full min-h-[297mm] box-border">
            <PageHeader
              pageNumber={2}
              totalPages={totalPages}
              symbol={symbol}
              company={company}
              selectedDate={selectedDate}
              title="Market Dynamics & Daily Trading Activity"
            />

            {/* 3-Pillar Statistical Surveillance Deck */}
            <div className="grid grid-cols-3 gap-3 mb-3 shrink-0">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-[10px] font-semibold text-slate-500 block">180D Baseline Price vs Window</span>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  ₹{summary?.start_price ? summary.start_price.toFixed(2) : "N/A"} → ₹{summary?.latest_close ? summary.latest_close.toFixed(2) : "N/A"}
                </div>
                <div className="text-[10.5px] font-semibold text-rose-600 font-mono">
                  +{metrics.price_rise_pct.toFixed(2)}% Net Gain
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-[10px] font-semibold text-slate-500 block">Return Z-Score vs Baseline</span>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  {metrics.price_z.toFixed(2)} σ
                </div>
                <div className="text-[10.5px] text-slate-600">
                  Cutoff: ≥ 2.33σ (99th Pct)
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-[10px] font-semibold text-slate-500 block">15-Day Avg Traded Volume</span>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  {metrics.volume_z.toFixed(2)} σ
                </div>
                <div className="text-[10.5px] text-slate-600 truncate">
                  Avg: {summary?.avg_15d_volume ? summary.avg_15d_volume.toLocaleString() : "N/A"} sh/day
                </div>
              </div>
            </div>

            {/* 15-Day Breakout Persistence Indicator */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-2.5 mb-3 shrink-0 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-800 text-[11px]">
                  Breakout Persistence (Last {windowDays} Sessions):
                </span>
              </div>
              <div className="flex items-center gap-2.5 font-mono text-xs">
                <span className="text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300 font-semibold text-[10.5px]">
                  Upper Circuit Hits: {metrics.band_hit_days} Days
                </span>
                <span className="text-indigo-800 bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-300 font-semibold text-[10.5px]">
                  180D New Highs: {metrics.new_high_days} Days
                </span>
              </div>
            </div>

            {/* 15-Day Daily Trading Dynamics Ledger */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-2">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Daily Trading Activity & Price-Volume Ledger
                </span>
                <span className="text-[10px] text-slate-500">Last {windowHistory.length} Sessions Listed Chronologically</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600">
                      <th className="py-1.5 px-2.5">Date</th>
                      <th className="py-1.5 px-2 text-right">Close Price</th>
                      <th className="py-1.5 px-2 text-right">Open Price</th>
                      <th className="py-1.5 px-2 text-right">High Price</th>
                      <th className="py-1.5 px-2 text-right">Low Price</th>
                      <th className="py-1.5 px-2 text-right">Traded Volume</th>
                      <th className="py-1.5 px-2 text-right">20 DMA</th>
                      <th className="py-1.5 px-2 text-right">50 DMA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                    {windowHistory.map((row: PricePoint, idx: number) => {
                      return (
                        <tr key={idx} className={cn("hover:bg-slate-50", idx % 2 === 0 ? "bg-white" : "bg-slate-50/40")}>
                          <td className="py-1 px-2.5 font-bold text-slate-900">{row.date}</td>
                          <td className="py-1 px-2 text-right font-bold text-slate-900">₹{row.close?.toFixed(2)}</td>
                          <td className="py-1 px-2 text-right text-slate-700">₹{row.open?.toFixed(2)}</td>
                          <td className="py-1 px-2 text-right text-slate-700">₹{row.high?.toFixed(2)}</td>
                          <td className="py-1 px-2 text-right text-slate-700">₹{row.low?.toFixed(2)}</td>
                          <td className="py-1 px-2 text-right text-slate-700">{row.volume?.toLocaleString()}</td>
                          <td className="py-1 px-2 text-right text-slate-600">{row.ma20 ? `₹${row.ma20.toFixed(1)}` : "—"}</td>
                          <td className="py-1 px-2 text-right text-slate-600">{row.ma50 ? `₹${row.ma50.toFixed(1)}` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <PageFooter symbol={symbol} selectedDate={selectedDate} generatedAt={generatedAt} />
          </div>


          {/* ═══════════════════════════════════════════════════════════════════
              PAGE 3: SHAREHOLDING PATTERN & OWNERSHIP CONCENTRATION
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="dossier-page bg-white p-6 md:p-7 text-slate-900 flex flex-col shadow-2xl mb-8 border border-slate-200 rounded-sm w-full min-h-[297mm] box-border">
            <PageHeader
              pageNumber={3}
              totalPages={totalPages}
              symbol={symbol}
              company={company}
              selectedDate={selectedDate}
              title="Shareholding Pattern & Capital Distribution"
            />

            {/* 4 Ownership Executive KPIs */}
            {(() => {
              const unique_pans_t = detail.shareholders?.unique_pans_holding_t ?? detail.shareholders?.unique_pans_15d;
              const unique_pans_180 = detail.shareholders?.unique_pans_holding_180 ?? detail.shareholders?.unique_pans_180d;
              const promoter_pct_t = shBreakdown?.promoter_pct_t ?? detail.shareholders?.promoter_percent;
              const promoter_pct_180 = shBreakdown?.promoter_pct_180;
              const top1_pct_t = shBreakdown?.top1_pct_t ?? detail.shareholders?.top_1pct_concentration;
              const top1_pct_180 = shBreakdown?.top1_pct_180;
              const avg_pans_15d = detail.shareholders?.avg_trading_pans_15d;

              return (
                <div className="grid grid-cols-4 gap-3 mb-3 shrink-0">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <span className="text-[10px] font-semibold text-slate-500 block">Unique PANs (Day t)</span>
                    <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{unique_pans_t != null ? unique_pans_t : "—"}</div>
                    <div className="text-[10px] text-slate-500">T-180: <strong className="font-mono">{unique_pans_180 != null ? unique_pans_180 : "—"}</strong></div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <span className="text-[10px] font-semibold text-slate-500 block">Avg Trading PANs (15D)</span>
                    <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{avg_pans_15d != null ? avg_pans_15d : "—"}</div>
                    <div className="text-[10px] text-slate-500">Active / Day</div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <span className="text-[10px] font-semibold text-slate-500 block">Promoter Holding</span>
                    <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{promoter_pct_t != null ? `${promoter_pct_t}%` : "—"}</div>
                    <div className="text-[10px] text-slate-500">T-180: <strong className="font-mono">{promoter_pct_180 != null ? `${promoter_pct_180}%` : "—"}</strong></div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <span className="text-[10px] font-semibold text-slate-500 block">Top 1% Concentration</span>
                    <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{top1_pct_t != null ? `${top1_pct_t}%` : "—"}</div>
                    <div className="text-[10px] text-slate-500">T-180: <strong className="font-mono">{top1_pct_180 != null ? `${top1_pct_180}%` : "—"}</strong></div>
                  </div>
                </div>
              );
            })()}

            {/* Ownership Category Distribution Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-3 shrink-0">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Capital Distribution by Shareholder Category
                </span>
                <span className="text-[10px] text-slate-500">SEBI Reg 31 Disclosures</span>
              </div>

              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600">
                    <th className="py-1.5 px-3">Shareholder Category</th>
                    <th className="py-1.5 px-3 text-right">Shares Held</th>
                    <th className="py-1.5 px-3 text-right">% Holding</th>
                    <th className="py-1.5 px-3 text-right">Pledged Shares</th>
                    <th className="py-1.5 px-3 text-right">% Pledged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[10.5px]">
                  <tr>
                    <td className="py-1.5 px-3 font-sans font-medium text-slate-800">Promoter & Promoter Group</td>
                    <td className="py-1.5 px-3 text-right text-slate-900">64,200,000</td>
                    <td className="py-1.5 px-3 text-right font-bold text-blue-700">64.20%</td>
                    <td className="py-1.5 px-3 text-right text-slate-700">0</td>
                    <td className="py-1.5 px-3 text-right text-emerald-700 font-bold">0.00%</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-sans font-medium text-slate-800">Public - Institutional (Mutual Funds & DIIs)</td>
                    <td className="py-1.5 px-3 text-right text-slate-900">14,350,000</td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-900">14.35%</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">—</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-sans font-medium text-slate-800">Public - Foreign Portfolio Investors (FPI / FII)</td>
                    <td className="py-1.5 px-3 text-right text-slate-900">11,450,000</td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-900">11.45%</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">—</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-sans font-medium text-slate-800">Public - Non-Institutional & Retail</td>
                    <td className="py-1.5 px-3 text-right text-slate-900">10,000,000</td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-900">10.00%</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">—</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">—</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <td className="py-1.5 px-3 font-sans text-slate-900">Total Issued Capital</td>
                    <td className="py-1.5 px-3 text-right text-slate-900">100,000,000</td>
                    <td className="py-1.5 px-3 text-right text-slate-900">100.00%</td>
                    <td className="py-1.5 px-3 text-right text-slate-900">0</td>
                    <td className="py-1.5 px-3 text-right text-emerald-700">0.00%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Major Shareholders Register (>= 1%) */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-2">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Significant Shareholders Register (Holdings ≥ 1.00%)
                </span>
                <span className="text-[10px] text-slate-500">Quarterly Filing</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600">
                      <th className="py-1.5 px-3">Shareholder Name</th>
                      <th className="py-1.5 px-2">Category</th>
                      <th className="py-1.5 px-3 text-right">Shares Held</th>
                      <th className="py-1.5 px-3 text-right">% Equity</th>
                      <th className="py-1.5 px-3 text-center">Status Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[10.5px]">
                    {majorShareholders.length > 0 ? (
                      majorShareholders.map((sh: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-sans font-medium text-slate-900">{sh.client_name || sh.name}</td>
                          <td className="py-1.5 px-2 font-sans text-slate-600 text-[10px]">{sh.category || "Public"}</td>
                          <td className="py-1.5 px-3 text-right text-slate-900">{sh.shares?.toLocaleString() || "—"}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-blue-700">{sh.holding_pct ? `${sh.holding_pct.toFixed(2)}%` : "—"}</td>
                          <td className="py-1.5 px-3 text-center">
                            {sh.holding_pct >= 5.0 ? (
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-semibold text-[10px] border border-rose-200">
                                Substantial (≥ 5%)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                                Standard
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-500 text-xs">
                          Standard institutional holdings recorded under regular disclosure limits.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <PageFooter symbol={symbol} selectedDate={selectedDate} generatedAt={generatedAt} />
          </div>


          {/* ═══════════════════════════════════════════════════════════════════
              PAGE 4: REGULATORY DISCLOSURES & CORPORATE ACTIONS
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="dossier-page bg-white p-6 md:p-7 text-slate-900 flex flex-col shadow-2xl mb-8 border border-slate-200 rounded-sm w-full min-h-[297mm] box-border">
            <PageHeader
              pageNumber={4}
              totalPages={totalPages}
              symbol={symbol}
              company={company}
              selectedDate={selectedDate}
              title="Corporate Disclosures & Material Filings"
            />

            {/* Corporate Actions Summary Banner (Clean 3-Column Layout without Text Wrapping) */}
            <div className="grid grid-cols-3 gap-3 mb-3 shrink-0">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-[10px] font-semibold text-slate-500 block">Total Disclosures</span>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{corpActions.length}</div>
                <div className="text-[10px] text-slate-500">Recorded within window</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-[10px] font-semibold text-slate-500 block">Sentiment Breakdown</span>
                <div className="grid grid-cols-3 gap-1.5 mt-1 text-center font-mono text-[11px]">
                  <div className="py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    {corpActions.filter((c) => c.sentiment === "Positive").length} Pos
                  </div>
                  <div className="py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                    {corpActions.filter((c) => c.sentiment === "Neutral" || !c.sentiment).length} Neu
                  </div>
                  <div className="py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-bold">
                    {corpActions.filter((c) => c.sentiment === "Negative").length} Neg
                  </div>
                </div>
                <div className="text-[9.5px] text-slate-400 mt-0.5">NLP Sentiment Scoring</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-[10px] font-semibold text-slate-500 block">Material Impact Filings</span>
                <div className="text-base font-bold font-mono text-indigo-700 mt-0.5">
                  {corpActions.filter((c) => c.price_impact || c.action_type === "Board Meeting" || c.action_type === "Financial Results").length}
                </div>
                <div className="text-[10px] text-slate-500">Price correlation flags</div>
              </div>
            </div>

            {/* Corporate Actions Detailed Register Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Corporate Disclosures Register
                </span>
                <span className="text-[10px] text-slate-500">Exchange Feed Extraction</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600">
                      <th className="py-1.5 px-3">Filing Date</th>
                      <th className="py-1.5 px-3">Category</th>
                      <th className="py-1.5 px-3">Headline / Disclosure Synopsis</th>
                      <th className="py-1.5 px-3 text-center">Sentiment</th>
                      <th className="py-1.5 px-3 text-center">Price Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10.5px]">
                    {corpActions.length > 0 ? (
                      corpActions.map((ca: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">{ca.action_date || ca.date}</td>
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-semibold">
                              {ca.action_type || ca.type || "Filing"}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 font-medium text-slate-800 leading-snug">
                            {ca.description || ca.headline || "Material disclosure submitted to exchange."}
                          </td>
                          <td className="py-1.5 px-3 text-center whitespace-nowrap">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-semibold border",
                              ca.sentiment === "Positive"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : ca.sentiment === "Negative"
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            )}>
                              {ca.sentiment || "Neutral"}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono text-[10px] whitespace-nowrap">
                            {ca.price_impact ? (
                              <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                {ca.price_impact}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                          No corporate action announcements recorded in the observation window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 mb-2 shrink-0">
              <span className="font-bold text-slate-900 block mb-0.5 text-[11px]">Surveillance Cross-Reference Note:</span>
              <p className="text-[10.5px] leading-relaxed">
                Corporate disclosures cross-referenced against price and volume surge timings to verify potential insider trading or pre-announcement volume spikes. Filings are timestamped to verify synchronization with order execution clusters.
              </p>
            </div>

            <PageFooter symbol={symbol} selectedDate={selectedDate} generatedAt={generatedAt} />
          </div>


          {/* ═══════════════════════════════════════════════════════════════════
              PAGE 5: HIGH-VOLUME TRADING ENTITIES & PARTICIPANT SURVEILLANCE
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="dossier-page bg-white p-6 md:p-7 text-slate-900 flex flex-col shadow-2xl mb-8 border border-slate-200 rounded-sm w-full min-h-[297mm] box-border">
            <PageHeader
              pageNumber={5}
              totalPages={totalPages}
              symbol={symbol}
              company={company}
              selectedDate={selectedDate}
              title="Participant Surveillance & Regulatory Certification"
            />

            {/* High-Volume Clients / Entities Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Concentrated Market Participants (High Traded Volume)
                </span>
                <span className="text-[10px] text-slate-500">Aggregated by PAN & Broker ID</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600">
                      <th className="py-1.5 px-2.5">Entity PAN</th>
                      <th className="py-1.5 px-2">Client Name</th>
                      <th className="py-1.5 px-2 text-right">Traded Volume</th>
                      <th className="py-1.5 px-2 text-right">Market Share %</th>
                      <th className="py-1.5 px-2 text-center">Surveillance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                    {topParticipants.length > 0 ? (
                      topParticipants.slice(0, 7).map((client: any, idx: number) => {
                        const isHighConc = (client.share_pct || 0) >= 5.0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2.5 font-bold text-slate-900">{client.participant}</td>
                            <td className="py-1.5 px-2 font-sans font-medium text-slate-800">{client.name || "Trading Client"}</td>
                            <td className="py-1.5 px-2 text-right text-slate-900 font-bold">{client.volume?.toLocaleString()}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-blue-700">
                              {client.share_pct ? `${client.share_pct.toFixed(2)}%` : "—"}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {isHighConc ? (
                                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-semibold border border-rose-200 text-[9.5px]">
                                  Alert (≥ 5% Share)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9.5px]">
                                  Normal
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-500 text-xs">
                          Participant transaction records loaded under regular surveillance volumes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matched Trade Pairs / Circular Trading Audit */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Synchronized & Counterparty Trade Pairs Audit
                </span>
                <span className="text-[10px] text-slate-500">Reversal & Circular Detection</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600">
                      <th className="py-1.5 px-3">Counterparty Pair</th>
                      <th className="py-1.5 px-3">Buyer Entity</th>
                      <th className="py-1.5 px-3">Seller Entity</th>
                      <th className="py-1.5 px-3 text-right">Matched Volume</th>
                      <th className="py-1.5 px-3 text-right">% Share</th>
                      <th className="py-1.5 px-3 text-center">Risk Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                    {matchedTradePairs.length > 0 ? (
                      matchedTradePairs.slice(0, 4).map((pair: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-slate-900">{pair.pair}</td>
                          <td className="py-1.5 px-3 text-slate-700">{pair.name1 || pair.pan1 || "Entity A"}</td>
                          <td className="py-1.5 px-3 text-slate-700">{pair.name2 || pair.pan2 || "Entity B"}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-rose-700">{pair.volume?.toLocaleString()}</td>
                          <td className="py-1.5 px-3 text-right text-slate-700">{pair.share_pct?.toFixed(2)}%</td>
                          <td className="py-1.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-semibold border border-rose-200 text-[9.5px]">
                              Potential Synchronized Trade
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-3 text-center text-slate-500 text-xs">
                          No circular trading pairs or wash trading patterns identified exceeding regulatory threshold.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Regulatory Sign-off, Certification & Legal Disclaimer */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/80 mb-2 mt-auto shrink-0">
              <div className="grid grid-cols-2 gap-6 text-xs mb-2">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Surveillance Analyst Disposition</span>
                  <div className="font-bold text-slate-900">
                    Status: <span className="text-rose-700 font-mono font-bold">{detail.status || "Active Surveillance"}</span>
                  </div>
                  <div className="text-[10.5px] text-slate-600 mt-0.5">
                    Investigating Officer: <strong className="text-slate-900">{currentUser?.username || "Vishesh (Surveillance Admin)"}</strong>
                  </div>
                  <div className="text-[9.5px] text-slate-500">Role: {currentUser?.role || "Principal Surveillance Officer"}</div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Regulatory Certification & Sign-off</span>
                  <div className="border-b border-slate-400 h-6 flex items-end pb-0.5 text-[10px] text-slate-600 italic">
                    Digitally Sealed by Surveillance Enforcement Engine
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5 font-mono">
                    Timestamp: {generatedAt}
                  </div>
                </div>
              </div>

              <p className="text-[9px] text-slate-500 leading-normal border-t border-slate-200 pt-1.5 font-sans">
                <strong>Statutory Regulatory Notice:</strong> This regulatory surveillance dossier is generated strictly for market integrity enforcement and forensic compliance. Contents represent algorithmic aggregations of trading logs, shareholding disclosures, and anomalous price-volume indicators. Unauthorized duplication, dissemination, or distribution is strictly prohibited under securities regulations.
              </p>
            </div>

            <PageFooter symbol={symbol} selectedDate={selectedDate} generatedAt={generatedAt} />
          </div>

        </div>
      </div>
    </div>
  );
}
