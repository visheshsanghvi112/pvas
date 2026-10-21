"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  UserCircle,
  Users,
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Maximize2,
  Minimize2,
  PieChart,
  FileText,
  FileDown,
  FileSpreadsheet,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { TradingDatePicker } from "@/components/ui/trading-date-picker";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  ParameterRadarChart,
  SurveillanceStatisticalDeck,
  AnomalyEventMatrixChart,
  CombinedMarketChart,
  InfoTooltip
} from "@/components/investigation/charts";
import {
  fetchScripDetail,
  fetchScripParticipants,
  fetchClient360,
  fetchShareholdingBreakdown,
  fetchCorporateActions,
  fetchAvailableTradingDates,
  downloadScripExcel,
  type ScripDetail,
  type ParticipantAudit,
  type ClientDetail,
  type ExchangeScope
} from "@/lib/api";

import { useUser } from "@/lib/user-context";
import { SurveillanceDossierPdf } from "@/components/investigation/surveillance-dossier-pdf";

const TABS = ["Overview", "Shareholders", "Corporate Actions", "Participants"] as const;
type TabType = typeof TABS[number];


function DataTable({
  headers,
  rows,
  alignments,
  colWidths,
  minWidth = "min-w-full",
  className,
}: {
  headers: (string | React.ReactNode)[];
  rows: (string | React.ReactNode)[][];
  alignments?: ("left" | "right" | "center")[];
  colWidths?: string[];
  minWidth?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className={cn("w-full text-xs border-collapse", minWidth)}>
        {colWidths && (
          <colgroup>
            {colWidths.map((w, idx) => (
              <col key={idx} style={{ width: w }} />
            ))}
          </colgroup>
        )}
        <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold">
          <tr>
            {headers.map((h, i) => {
              const align = alignments?.[i] || "left";
              return (
                <th
                  key={i}
                  className={cn(
                    "px-3 py-2.5 text-xs font-semibold text-slate-700 whitespace-nowrap",
                    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
                  )}
                >
                  {h}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-6 text-center text-slate-400 italic font-medium">
                No records found
              </td>
            </tr>
          ) : (
            rows.map((r, ri) => (
              <tr key={ri} className="hover:bg-slate-50/70 transition-colors">
                {r.map((cell, ci) => {
                  const align = alignments?.[ci] || "left";
                  return (
                    <td
                      key={ci}
                      className={cn(
                        "px-3 py-2.5 text-slate-700 font-medium align-middle",
                        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
                      )}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon,
  info,
  onExpand,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  info?: string;
  onExpand?: () => void;
}) {
  return (
    <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-slate-600 shrink-0">{icon}</span>}
        <div>
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-semibold text-slate-900 leading-snug">{title}</h3>
            {info && <InfoTooltip text={info} />}
          </div>
          {subtitle && <p className="text-xs text-slate-500 font-normal leading-normal mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          title="Expand Chart to Fullscreen"
          className="opacity-70 hover:opacity-100 transition-all duration-200 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/90 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/60 shadow-2xs text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs">Fullscreen</span>
        </button>
      )}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex flex-col group relative overflow-hidden transition-all duration-200 hover:border-slate-300", className)}>
      {children}
    </div>
  );
}

export function InvestigationWorkspace({ symbol }: { symbol: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlAsOfDate = searchParams?.get("asOfDate") || "";
  const urlWindowDays = searchParams?.get("windowDays") ? Number(searchParams.get("windowDays")) : 15;
  const urlExchange = (searchParams?.get("exchange") as ExchangeScope) || "ALL";

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(urlAsOfDate);
  const [windowDays] = useState<number>(urlWindowDays);
  const [exchange] = useState<ExchangeScope>(urlExchange);
  const [toastAlert, setToastAlert] = useState<{ show: boolean; msg: string }>({ show: false, msg: "" });
  
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);

  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [autoPrintPdf, setAutoPrintPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [expandedChart, setExpandedChart] = useState<{
    title: string;
    subtitle?: string;
    chart: React.ReactNode;
  } | null>(null);

  // Initialize available dates
  useEffect(() => {
    async function loadDates() {
      const dates = await fetchAvailableTradingDates();
      if (dates && dates.length > 0) {
        setAvailableDates(dates);
        
        const targetDate = urlAsOfDate || dates[0];
        if (urlAsOfDate && !dates.includes(urlAsOfDate)) {
          // Auto-correct to nearest previous valid trading date, or earliest archive session
          const nearest = (dates.find((d) => d <= urlAsOfDate) || dates[dates.length - 1]) ?? dates[0];
          setToastAlert({ 
            show: true, 
            msg: `${urlAsOfDate} is a non-trading day. Automatically loaded the last active session (${nearest}).`
          });
          setSelectedDate(nearest);
          
          // Update URL without reload to reflect corrected date
          const newParams = new URLSearchParams(searchParams?.toString() || "");
          newParams.set("asOfDate", nearest);
          newParams.delete("exchange");
          router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
        } else {
          setSelectedDate(targetDate);
          if (searchParams?.has("exchange")) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete("exchange");
            router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
          }
        }
      }
    }
    loadDates();
  }, [urlAsOfDate, router, pathname, searchParams]);

  const [detail, setDetail] = useState<ScripDetail | null>(null);
  const [participants, setParticipants] = useState<ParticipantAudit | null>(null);
  const [client360, setClient360] = useState<ClientDetail | null>(null);
  const [shBreakdown, setShBreakdown] = useState<any>(null);
  const [corpActions, setCorpActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPan, setSelectedPan] = useState<string | null>(null);

  // Keyboard shortcut: ESC exits Fullscreen mode, closes expanded chart modal, or closes Client 360 drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedPan) {
          setSelectedPan(null);
        } else if (expandedChart) {
          setExpandedChart(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, expandedChart, selectedPan]);

  // Lock body scroll when Client 360 drawer, expanded chart, or PDF dossier is active
  useEffect(() => {
    if (selectedPan || expandedChart || isDossierOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [selectedPan, expandedChart, isDossierOpen]);

  useEffect(() => {
    // If dates are loading and selectedDate has not been initialized yet, wait for initialization
    if (!selectedDate && availableDates.length > 0) return;
    let isCancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setParticipants(null);
      setShBreakdown(null);
      setCorpActions([]);
      try {
        const [d, p, sh, ca] = await Promise.all([
          fetchScripDetail(symbol, selectedDate || undefined, windowDays, exchange),
          fetchScripParticipants(symbol, selectedDate || undefined, windowDays).catch(() => null),
          fetchShareholdingBreakdown(symbol).catch(() => null),
          fetchCorporateActions(symbol).catch(() => [])
        ]);
        if (!isCancelled) {
          setDetail(d);
          setParticipants(p ?? null);
          setShBreakdown(sh ?? null);
          setCorpActions(ca ?? []);
        }
      } catch (e: any) {
        if (!isCancelled) {
          console.error("Failed to load investigation workspace data", e);
          setError(e?.message || "Failed to load. Ensure backend is running.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      isCancelled = true;
    };
  }, [symbol, selectedDate, windowDays, exchange]);

  useEffect(() => {
    if (selectedPan) {
      fetchClient360(selectedPan)
        .then((c) => setClient360(c))
        .catch(() => setClient360(null));
    } else {
      setClient360(null);
    }
  }, [selectedPan]);


  // Date Navigation Helpers
  const dateIndex = useMemo(() => {
    if (!selectedDate || availableDates.length === 0) return 0;
    const idx = availableDates.indexOf(selectedDate);
    return idx >= 0 ? idx : 0;
  }, [selectedDate, availableDates]);

  const windowStartDate = useMemo(() => {
    if (availableDates.length === 0) return selectedDate;
    const startIdx = Math.min(availableDates.length - 1, dateIndex + windowDays - 1);
    return availableDates[startIdx] || selectedDate;
  }, [availableDates, dateIndex, windowDays, selectedDate]);

  // Check for significant calendar gaps (> 15 calendar days) in the scrip history
  const historyGap = useMemo(() => {
    if (!detail?.history || detail.history.length < 2) return null;
    let maxGapDays = 0;
    let gapStart = "";
    let gapEnd = "";
    for (let i = 1; i < detail.history.length; i++) {
      const d1 = new Date(detail.history[i - 1].date);
      const d2 = new Date(detail.history[i].date);
      const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > maxGapDays) {
        maxGapDays = diffDays;
        gapStart = detail.history[i - 1].date;
        gapEnd = detail.history[i].date;
      }
    }
    if (maxGapDays > 15) {
      return { days: maxGapDays, start: gapStart, end: gapEnd };
    }
    return null;
  }, [detail?.history]);

  // Map calibrated model weights and points contributions from detail.score_breakdown
  const scoreBreakdownMap = useMemo(() => {
    const map: Record<string, { weight: number; contribution: number; score: number }> = {};
    (detail?.score_breakdown || []).forEach((item) => {
      map[item.label] = { weight: item.weight, contribution: item.contribution, score: item.score };
    });
    return map;
  }, [detail?.score_breakdown]);

  const activeWeights = useMemo(() => ({
    price_rise: scoreBreakdownMap["Price Rise"]?.weight ?? 20,
    price_z: scoreBreakdownMap["Price Z"]?.weight ?? 20,
    volume_z: scoreBreakdownMap["Volume Z"]?.weight ?? 20,
    band_persistence: scoreBreakdownMap["Band Persistence"]?.weight ?? 20,
    new_high: scoreBreakdownMap["180 Day New High"]?.weight ?? 20,
  }), [scoreBreakdownMap]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-500">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Loading Scrip Analysis Workspace…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-2xl p-6 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Scrip Investigation Unavailable
          </h3>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed font-mono">
            {error ?? `Scrip ${symbol} could not be loaded.`}
          </p>
          <div className="pt-2 border-t border-slate-100 flex justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Return to Alerts Watchlist
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { metrics, history, risk, company } = detail;

  const canGoNext = dateIndex > 0;
  const canGoPrev = dateIndex < availableDates.length - 1;

  /** Snap a date string to the nearest available trading date and update URL */
  const snapToTradingDate = (raw: string) => {
    if (!raw) return;
    let finalDate = raw;
    
    if (!availableDateSet.has(raw)) {
      finalDate = (availableDates.find((d) => d <= raw) || availableDates[availableDates.length - 1]) ?? raw;
    }
    
    setSelectedDate(finalDate);
    
    const newParams = new URLSearchParams(searchParams?.toString() || "");
    newParams.set("asOfDate", finalDate);
    newParams.delete("exchange");
    router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
  };

  const handlePrevDay = () => {
    if (canGoPrev && availableDates[dateIndex + 1]) {
      snapToTradingDate(availableDates[dateIndex + 1]);
    }
  };

  const handleNextDay = () => {
    if (canGoNext && availableDates[dateIndex - 1]) {
      snapToTradingDate(availableDates[dateIndex - 1]);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parseInt(parts[2], 10)} ${months[mIdx] || parts[1]} ${parts[0]}`;
    }
    return dateStr;
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      await downloadScripExcel(symbol, selectedDate || undefined, windowDays, exchange);
    } catch (err) {
      console.error("Failed to download Excel dossier:", err);
      setToastAlert({ show: true, msg: "Failed to download Excel report. Please verify backend connection." });
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleTriggerPdf = (autoPrint: boolean = false) => {
    setAutoPrintPdf(autoPrint);
    setIsDossierOpen(true);
  };



  return (
    <div className={cn(
      "flex flex-col h-full bg-slate-50 min-w-0 transition-all duration-300",
      isFullscreen && "fixed inset-0 z-50 h-screen w-screen bg-slate-100 p-0 overflow-hidden animate-in fade-in zoom-in-95"
    )}>

      {/* ── UNIFIED HERO COMMAND HEADER & NAV BAR ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
        {/* Top Header & Metric Strip (Hidden in Fullscreen Mode) */}
        {!isFullscreen && (
          <div className="px-5 pt-3.5 pb-2.5 space-y-2.5">
            {/* Row 1: Company + Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href="/"
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-300 text-xs font-bold transition-all shadow-2xs"
                  title="Back to Surveillance Overview"
                >
                  ← Watchlist
                </Link>
                <h1 className="text-xl font-extrabold text-slate-900 leading-none">{company}</h1>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  {detail.symbol}
                </span>
                {detail.isin && (
                  <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    ISIN: {detail.isin}
                  </span>
                )}
                <RiskBadge risk={risk} />
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  Risk Score: <strong className="font-mono text-slate-900 font-bold">{metrics.final_score.toFixed(1)}</strong>
                  <span className="text-slate-400 font-normal ml-1">/ Cutoff ≥ {detail.threshold ?? 60}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={downloadingExcel}
                  className="h-8 text-xs font-bold px-3.5 rounded-xl border border-emerald-300/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors disabled:opacity-50"
                  title="Download Multi-Sheet Excel Dossier (.xlsx)"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{downloadingExcel ? "Excel…" : "Download Excel"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerPdf(true)}
                  className="h-8 text-xs font-bold px-3.5 rounded-xl border border-blue-300/80 bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  title="Download A4 PDF Dossier (Instant Print / Save as PDF)"
                >
                  <FileDown className="h-3.5 w-3.5 text-blue-600" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerPdf(false)}
                  className="h-8 text-xs font-semibold px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  title="Preview Full Dossier"
                >
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Row 2: Observation Date Selection & 15D Analysis Window Indicator Bar */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
                    Observation Date:
                  </span>
                  <TradingDatePicker
                    availableDates={availableDates}
                    selectedDate={selectedDate}
                    onDateChange={(d) => snapToTradingDate(d)}
                    size="sm"
                  />
                </div>

                {/* Quick Day Shifters */}
                <div className="flex items-center rounded-xl border border-slate-300/80 bg-white overflow-hidden text-xs font-semibold text-slate-700 divide-x divide-slate-200 shadow-2xs">
                  <button
                    onClick={handlePrevDay}
                    disabled={!canGoPrev}
                    className="flex items-center gap-1 px-2.5 py-1 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Shift to Previous Trading Day"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <button
                    onClick={handleNextDay}
                    disabled={!canGoNext}
                    className="flex items-center gap-1 px-2.5 py-1 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Shift to Next Trading Day"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Window Range Badge & Baseline Depth Indicator */}
              <div className="flex items-center gap-2 flex-wrap">
                {detail.history && detail.history.length < 170 && (
                  <div
                    className="flex items-center gap-1.5 bg-blue-50 border border-blue-200/90 rounded-xl px-2.5 py-1 text-xs text-blue-900 font-semibold shadow-2xs"
                    title={`Dataset contains ${detail.history.length} trading sessions on or before ${selectedDate}. Baseline lookback metrics are evaluated over the available ${detail.history.length}-session archive.`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span>
                      Baseline Depth:{" "}
                      <strong className="font-mono font-bold text-blue-950">
                        {detail.history.length} Sessions
                      </strong>{" "}
                      <span className="text-[10px] text-blue-700 font-medium">(&lt; 180D archive)</span>
                    </span>
                  </div>
                )}

                {historyGap && (
                  <div
                    className="flex items-center gap-1.5 bg-rose-50 border border-rose-200/90 rounded-xl px-2.5 py-1 text-xs text-rose-900 font-semibold shadow-2xs"
                    title={`Feed Notice: A ${historyGap.days}-day calendar gap exists between ${historyGap.start} and ${historyGap.end} in the provided market archive. The 15 evaluated sessions span non-contiguous periods.`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span>
                      Feed Gap:{" "}
                      <strong className="font-mono font-bold text-rose-950">
                        {historyGap.days}d ({formatDateDisplay(historyGap.start)} → {formatDateDisplay(historyGap.end)})
                      </strong>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/90 rounded-xl px-2.5 py-1 text-xs text-amber-950 font-semibold shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>
                    15D Analysis Window:{" "}
                    <strong className="font-mono font-bold text-amber-950">
                      {formatDateDisplay(windowStartDate)} → {formatDateDisplay(selectedDate)}
                    </strong>
                    <span className="ml-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300/80">
                      {windowDays} Days
                    </span>
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Integrated Tab Bar at Bottom Edge */}
        <div className="flex items-center justify-between px-5 py-2 bg-slate-50/90 border-t border-slate-100 overflow-x-auto shrink-0">
          <div className="bg-slate-200/70 p-1 rounded-xl inline-flex gap-1 border border-slate-200/90 shadow-2xs">
            {TABS.map((tab) => {
              const isTabActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center gap-1.5 group relative",
                    isTabActive
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-medium"
                  )}
                >
                  <span>{tab}</span>

                  {/* Inline Fullscreen trigger on Hover */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFullscreen(!isFullscreen);
                    }}
                    title={isFullscreen ? "Exit Fullscreen (ESC)" : `Expand ${tab} to Fullscreen`}
                    className={cn(
                      "inline-flex items-center justify-center p-1 rounded-md transition-all duration-200",
                      "opacity-60 hover:opacity-100 hover:bg-slate-200/80 text-slate-500 hover:text-blue-700",
                      isFullscreen && isTabActive && "opacity-100 bg-blue-100 text-blue-700"
                    )}
                  >
                    {isFullscreen && isTabActive ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {isFullscreen && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">{detail.symbol}</span>
              <span className="text-slate-400">·</span>
              <span>Fullscreen Mode</span>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-200 px-1.5 py-0.5 rounded">ESC to exit</span>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className={cn(
        "flex-1 overflow-y-auto p-5 space-y-5 min-w-0 mx-auto w-full transition-all",
        isFullscreen ? "max-w-none px-8 py-6" : "max-w-7xl"
      )}>

        {/* TAB: OVERVIEW */}
        {activeTab === "Overview" && (
          <div className="space-y-6">


            {/* 5-Parameter Risk Radar Signature Command Card */}
            <Card className="bg-gradient-to-br from-white via-slate-50/60 to-blue-50/20 border-slate-200/90 shadow-xs">
              <SectionHeader
                icon={<Activity className="w-4.5 h-4.5 text-blue-600" />}
                title="5-Parameter Risk Radar Profile & Intelligence Signature"
                subtitle="Comprehensive 0–5 parameter score radar mapped against Risk Thresholds"
                onExpand={() => setExpandedChart({
                  title: "5-Parameter Risk Radar Profile & Intelligence Signature",
                  subtitle: "Comprehensive 0–5 parameter score radar mapped against Risk Thresholds",
                  chart: <ParameterRadarChart metrics={metrics} weights={activeWeights} />
                })}
              />
              <div className="p-4 md:p-5">
                <ParameterRadarChart metrics={metrics} weights={activeWeights} />
              </div>
            </Card>

            {/* Unified Price, Volume & DMA Surveillance Analysis Chart */}
            <Card className="group border-slate-200/90 shadow-xs overflow-hidden">
              <SectionHeader
                icon={<TrendingUp className="w-4.5 h-4.5 text-indigo-600" />}
                title="Unified Price, Volume & DMA Analysis"
                subtitle="Dual-axis market chart with 20 DMA, 50 DMA, traded volume, and 15-day analysis window"
                onExpand={() => setExpandedChart({
                  title: "Unified Price, Volume & DMA Analysis",
                  subtitle: "Dual-axis market chart with 20 DMA, 50 DMA, traded volume, and 15-day analysis window",
                  chart: <CombinedMarketChart history={history} metrics={metrics} isExpanded={true} />
                })}
              />
              <div className="p-4 md:p-5">
                <CombinedMarketChart history={history} metrics={metrics} />
              </div>
            </Card>

            {/* 3-Pillar Core Surveillance Statistical Deck (Preserves all 180D Price, Return Z-Score, and Volume Z-Score metrics) */}
            <SurveillanceStatisticalDeck history={history} metrics={metrics} weights={activeWeights} />

            <div className="space-y-4">
              {/* Days in past 15 the scrip hit 180-day high & 90% of price band */}
              <Card>
                <SectionHeader
                  icon={<Zap className="w-4 h-4 text-amber-600" />}
                  title="Number of days in past 15 days the scrip hit 180-day high & 90% of price band"
                  subtitle="Breakout frequency and price band persistence counts over the 15-day analysis window"
                  onExpand={() => setExpandedChart({
                    title: "Number of days in past 15 days the scrip hit 180-day high & 90% of price band",
                    subtitle: "Breakout frequency and price band persistence counts over the 15-day analysis window",
                    chart: <AnomalyEventMatrixChart history={history} metrics={metrics} bandPercent={detail?.price_band ?? 0.05} isExpanded={true} />
                  })}
                />
                <div className="p-4 md:p-5">
                  <AnomalyEventMatrixChart history={history} metrics={metrics} bandPercent={detail?.price_band ?? 0.05} />
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB: SHAREHOLDERS (Framework Spec §5.2 & §5.3) */}
        {activeTab === "Shareholders" && (
          <div className="space-y-6">
            {(() => {
              const unique_pans_t = detail.shareholders?.unique_pans_holding_t ?? detail.shareholders?.unique_pans_15d ?? null;
              const unique_pans_180 = detail.shareholders?.unique_pans_holding_180 ?? detail.shareholders?.unique_pans_180d ?? null;
              const unique_pans_diff = (unique_pans_t != null && unique_pans_180 != null) ? unique_pans_t - unique_pans_180 : null;
              const unique_pans_pct_diff = (unique_pans_diff != null && unique_pans_180 != null && unique_pans_180 > 0) ? Number(((unique_pans_diff / unique_pans_180) * 100).toFixed(1)) : null;

              const avg_pans_15d = detail.shareholders?.avg_trading_pans_15d ?? detail.shareholders?.unique_pans_15d ?? null;
              const avg_pans_180d = detail.shareholders?.avg_trading_pans_180d ?? detail.shareholders?.unique_pans_180d ?? null;
              const avg_pans_diff = (avg_pans_15d != null && avg_pans_180d != null) ? avg_pans_15d - avg_pans_180d : null;
              const avg_pans_pct_diff = (avg_pans_diff != null && avg_pans_180d != null && avg_pans_180d > 0) ? Number(((avg_pans_diff / avg_pans_180d) * 100).toFixed(1)) : null;

              const promoter_pct_t: number | null = shBreakdown?.promoter_pct_t ?? detail.shareholders?.promoter_percent ?? null;
              const promoter_pct_180: number | null = shBreakdown?.promoter_pct_180 ?? null;
              const promoter_shares_t: number | null = shBreakdown?.promoter_shares_t ?? null;
              const promoter_shares_180: number | null = shBreakdown?.promoter_shares_180 ?? null;
              const promoter_pct_diff = (promoter_pct_t != null && promoter_pct_180 != null) ? Number((promoter_pct_t - promoter_pct_180).toFixed(2)) : null;

              const top1_pct_t: number | null = shBreakdown?.top1_pct_t ?? detail.shareholders?.top_1pct_concentration ?? null;
              const top1_pct_180: number | null = shBreakdown?.top1_pct_180 ?? null;
              const top1_shares_t: number | null = shBreakdown?.top1_shares_t ?? null;
              const top1_shares_180: number | null = shBreakdown?.top1_shares_180 ?? null;
              const top1_pct_diff = (top1_pct_t != null && top1_pct_180 != null) ? Number((top1_pct_t - top1_pct_180).toFixed(2)) : null;

              const total_shares_approx = (promoter_pct_t != null && promoter_pct_t > 0 && promoter_shares_t != null) ? Math.round(promoter_shares_t / (promoter_pct_t / 100)) : null;
              const public_shares_t = (total_shares_approx != null && promoter_shares_t != null) ? Math.max(0, total_shares_approx - promoter_shares_t) : null;
              const public_shares_180 = (total_shares_approx != null && promoter_shares_180 != null) ? Math.max(0, total_shares_approx - promoter_shares_180) : null;
              const public_pct_t = promoter_pct_t != null ? Number((100 - promoter_pct_t).toFixed(2)) : null;
              const public_pct_180 = promoter_pct_180 != null ? Number((100 - promoter_pct_180).toFixed(2)) : null;
              const public_pct_diff = (public_pct_t != null && public_pct_180 != null) ? Number((public_pct_t - public_pct_180).toFixed(2)) : null;

              return (
                <>
                  {/* Executive Direct KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unique PANs (Day t)</span>
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                          <Users className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{unique_pans_t ?? "—"}</span>
                        <span className={cn(
                          "text-xs font-bold font-mono px-2 py-0.5 rounded-md border",
                          (unique_pans_diff ?? 0) >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                          {unique_pans_diff != null ? `${unique_pans_diff >= 0 ? "+" : ""}${unique_pans_diff}` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Trading PANs (15D)</span>
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                          <Activity className="h-3.5 w-3.5 text-indigo-600" />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{avg_pans_15d ?? "—"}</span>
                        <span className={cn(
                          "text-xs font-bold font-mono px-2 py-0.5 rounded-md border",
                          (avg_pans_diff ?? 0) >= 0 ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-700 border-slate-200"
                        )}>
                          {avg_pans_diff != null ? `${avg_pans_diff >= 0 ? "+" : ""}${avg_pans_diff}` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Promoter Holding (Day t)</span>
                        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                          <PieChart className="h-3.5 w-3.5 text-slate-700" />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{promoter_pct_t != null ? `${promoter_pct_t}%` : "—"}</span>
                        <span className={cn(
                          "text-xs font-bold font-mono px-2 py-0.5 rounded-md border",
                          (promoter_pct_diff ?? 0) >= 0 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {promoter_pct_diff != null ? `${promoter_pct_diff >= 0 ? "+" : ""}${promoter_pct_diff}%` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top 1% Holding (Day t)</span>
                        <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                          <Zap className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-amber-900 font-mono tracking-tight">{top1_pct_t != null ? `${top1_pct_t}%` : "—"}</span>
                        <span className={cn(
                          "text-xs font-bold font-mono px-2 py-0.5 rounded-md border",
                          (top1_pct_diff ?? 0) > 0 ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-slate-50 text-slate-700 border-slate-200"
                        )}>
                          {top1_pct_diff != null ? `${top1_pct_diff >= 0 ? "+" : ""}${top1_pct_diff}%` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* TABLE 1: Shareholder Structure & Equity Breakdown (Day t vs Day T-180) */}
                  <Card>
                    <SectionHeader
                      icon={<PieChart className="w-4 h-4 text-blue-600" />}
                      title="Shareholder Structure (Day t vs Day T-180)"
                      subtitle="Holding distribution across Promoters, Top 1% large holders, and Public float"
                      info="Compares shares held by promoters and top 1% shareholders on day t & day T-180."
                    />
                    <DataTable
                      headers={[
                        "Shareholder Category",
                        "Shares on Day t",
                        "Holding % (Day t)",
                        "Shares on Day T-180",
                        "Holding % (Day T-180)",
                        "Net Change (Delta %)"
                      ]}
                      rows={[
                        [
                          <span key="name-p" className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" /> Promoters & Promoter Group
                          </span>,
                          <span key="p-st" className="font-mono font-bold text-slate-900">{promoter_shares_t != null ? promoter_shares_t.toLocaleString("en-IN") : "—"}</span>,
                          <div key="p-pt" className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, promoter_pct_t ?? 0)}%` }} />
                            </div>
                            <span className="font-mono font-bold text-indigo-700">{promoter_pct_t != null ? `${promoter_pct_t}%` : "—"}</span>
                          </div>,
                          <span key="p-s180" className="font-mono text-slate-700">{promoter_shares_180 != null ? promoter_shares_180.toLocaleString("en-IN") : "—"}</span>,
                          <span key="p-p180" className="font-mono font-bold text-slate-700">{promoter_pct_180 != null ? `${promoter_pct_180}%` : "—"}</span>,
                          <span key="p-diff" className={cn("font-mono font-bold px-2 py-0.5 rounded text-xs", (promoter_pct_diff ?? 0) >= 0 ? "text-indigo-700 bg-indigo-50 border border-indigo-100" : "text-amber-700 bg-amber-50 border border-amber-100")}>
                            {promoter_pct_diff != null ? `${promoter_pct_diff >= 0 ? "+" : ""}${promoter_pct_diff}%` : "—"}
                          </span>,
                        ],
                        [
                          <span key="name-top1" className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" /> Top 1% Largest Shareholders
                          </span>,
                          <span key="top1-st" className="font-mono font-bold text-slate-900">{top1_shares_t != null ? top1_shares_t.toLocaleString("en-IN") : "—"}</span>,
                          <div key="top1-pt" className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, top1_pct_t ?? 0)}%` }} />
                            </div>
                            <span className="font-mono font-bold text-amber-800">{top1_pct_t != null ? `${top1_pct_t}%` : "—"}</span>
                          </div>,
                          <span key="top1-s180" className="font-mono text-slate-700">{top1_shares_180 != null ? top1_shares_180.toLocaleString("en-IN") : "—"}</span>,
                          <span key="top1-p180" className="font-mono font-bold text-slate-700">{top1_pct_180 != null ? `${top1_pct_180}%` : "—"}</span>,
                          <span key="top1-diff" className={cn("font-mono font-bold px-2 py-0.5 rounded text-xs", (top1_pct_diff ?? 0) >= 0 ? "text-amber-800 bg-amber-50 border border-amber-200" : "text-emerald-700 bg-emerald-50 border border-emerald-100")}>
                            {top1_pct_diff != null ? `${top1_pct_diff >= 0 ? "+" : ""}${top1_pct_diff}%` : "—"}
                          </span>,
                        ],
                        [
                          <span key="name-pub" className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> Public & Non-Promoter Free Float
                          </span>,
                          <span key="pub-st" className="font-mono font-bold text-slate-900">{public_shares_t != null ? public_shares_t.toLocaleString("en-IN") : "—"}</span>,
                          <div key="pub-pt" className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, public_pct_t ?? 0)}%` }} />
                            </div>
                            <span className="font-mono font-bold text-emerald-700">{public_pct_t != null ? `${public_pct_t}%` : "—"}</span>
                          </div>,
                          <span key="pub-s180" className="font-mono text-slate-700">{public_shares_180 != null ? public_shares_180.toLocaleString("en-IN") : "—"}</span>,
                          <span key="pub-p180" className="font-mono font-bold text-slate-700">{public_pct_180 != null ? `${public_pct_180}%` : "—"}</span>,
                          <span key="pub-diff" className={cn("font-mono font-bold px-2 py-0.5 rounded text-xs", (public_pct_diff ?? 0) >= 0 ? "text-emerald-700 bg-emerald-50 border border-emerald-100" : "text-amber-700 bg-amber-50 border border-amber-100")}>
                            {public_pct_diff != null ? `${public_pct_diff >= 0 ? "+" : ""}${public_pct_diff}%` : "—"}
                          </span>,
                        ],
                      ]}
                    />
                  </Card>

                  {/* TABLE 2: PAN Delivery Demographics & Trading Counts */}
                  <Card>
                    <SectionHeader
                      icon={<Users className="w-4 h-4 text-indigo-600" />}
                      title="PAN Delivery Demographics & Trading Activity"
                      subtitle="Unique PAN holding counts (Day t vs T-180) & average daily trading counts (15D vs 180D)"
                      info="Tracks unique PAN-holders in scrip on day t & T-180 and average unique PANs trading in past 15 days & 180 days."
                    />
                    <DataTable
                      headers={[
                        "Demographic Parameter",
                        "Current Observation (Day t / 15D)",
                        "Historical Baseline (Day T-180 / 180D)",
                        "Net Change (Delta)"
                      ]}
                      rows={[
                        [
                          <span key="r-hp" className="font-bold text-slate-900">Unique PAN-holders holding scrip (Day t vs Day T-180)</span>,
                          <span key="r-hpt" className="font-mono font-bold text-slate-900">{unique_pans_t != null ? `${unique_pans_t} PANs` : "—"}</span>,
                          <span key="r-hp180" className="font-mono font-bold text-slate-700">{unique_pans_180 != null ? `${unique_pans_180} PANs` : "—"}</span>,
                          <span key="r-hpdiff" className={cn("font-mono font-bold px-2 py-0.5 rounded text-xs", (unique_pans_diff ?? 0) >= 0 ? "text-emerald-700 bg-emerald-50 border border-emerald-100" : "text-rose-700 bg-rose-50 border border-rose-100")}>
                            {unique_pans_pct_diff != null ? `${unique_pans_pct_diff >= 0 ? "+" : ""}${unique_pans_pct_diff}%` : "—"}
                          </span>,
                        ],
                        [
                          <span key="r-tp" className="font-bold text-slate-900">Average unique PANs trading in scrip (15D vs 180D Avg)</span>,
                          <span key="r-tpt" className="font-mono font-bold text-slate-900">{avg_pans_15d != null ? `${avg_pans_15d} PANs / day` : "—"}</span>,
                          <span key="r-tp180" className="font-mono font-bold text-slate-700">{avg_pans_180d != null ? `${avg_pans_180d} PANs / day` : "—"}</span>,
                          <span key="r-tpdiff" className={cn("font-mono font-bold px-2 py-0.5 rounded text-xs", (avg_pans_diff ?? 0) >= 0 ? "text-indigo-700 bg-indigo-50 border border-indigo-100" : "text-slate-700 bg-slate-100 border border-slate-200")}>
                            {avg_pans_pct_diff != null ? `${avg_pans_pct_diff >= 0 ? "+" : ""}${avg_pans_pct_diff}%` : "—"}
                          </span>,
                        ],
                      ]}
                    />
                  </Card>

                  {/* TABLE 3: Significant Shareholders Register (Holdings >= 1.00%) */}
                  {shBreakdown?.major_shareholders && shBreakdown.major_shareholders.length > 0 && (
                    <Card>
                      <SectionHeader
                        icon={<Users className="w-4 h-4 text-amber-600" />}
                        title="Significant Shareholders Register (Holdings ≥ 1.00%)"
                        subtitle="Detailed registry of major institutional, promoter, and individual block holders"
                        info="Entities holding 1% or more of paid-up equity capital. Highlights substantial holders (>= 5%) and pledged positions."
                      />
                      <DataTable
                        alignments={["left", "left", "left", "right", "right", "right", "center"]}
                        headers={[
                          "Shareholder Legal Name",
                          "Client PAN",
                          "Category",
                          "Shares Held",
                          "% Equity",
                          "Pledged Shares",
                          "Status Flag"
                        ]}
                        rows={shBreakdown.major_shareholders.map((sh: any, idx: number) => {
                          const pct = Number(sh.holding_pct || 0);
                          const isPromoter = (sh.category || "").toUpperCase().includes("PROMOTER");
                          const isSubstantial = pct >= 5.0;
                          return [
                            <span key={`name-${idx}`} className="font-bold text-slate-900">{sh.name || sh.client_name}</span>,
                            <button
                              type="button"
                              key={`pan-${idx}`}
                              onClick={() => sh.pan && setSelectedPan(sh.pan)}
                              className="text-slate-800 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-mono font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors"
                              title="Click to view Client 360 profile"
                            >
                              <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {sh.pan || "—"}
                            </button>,
                            <span key={`cat-${idx}`} className="font-medium text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {sh.category || "PUBLIC"}
                            </span>,
                            <span key={`sh-${idx}`} className="font-mono font-bold text-slate-900">
                              {Number(sh.shares || 0).toLocaleString("en-IN")}
                            </span>,
                            <span key={`pct-${idx}`} className="font-mono font-bold text-indigo-700">
                              {pct.toFixed(2)}%
                            </span>,
                            <span key={`pl-${idx}`} className="font-mono text-slate-600">
                              {sh.pledged_count ? Number(sh.pledged_count).toLocaleString("en-IN") : "0"}
                            </span>,
                            <span key={`flag-${idx}`} className="inline-flex items-center">
                              {isPromoter ? (
                                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100">
                                  Promoter
                                </span>
                              ) : isSubstantial ? (
                                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold text-[11px] border border-rose-200">
                                  Substantial (≥ 5%)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
                                  Standard
                                </span>
                              )}
                            </span>
                          ];
                        })}
                      />
                    </Card>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* TAB: CORPORATE ACTIONS */}
        {activeTab === "Corporate Actions" && (
          <div className="space-y-5">
            <Card className="border-slate-200/90 shadow-xs overflow-hidden">
              <SectionHeader
                icon={<FileText className="w-4.5 h-4.5 text-blue-600" />}
                title="Corporate Actions & Material Disclosures (Past 15 Days)"
                subtitle="Dividends, bonus issues, stock splits, rights issues, and material disclosures recorded during the observation window"
              />
              {corpActions && corpActions.length > 0 ? (
                <DataTable
                  headers={[
                    "Record Date",
                    "Ex-Date",
                    "Category",
                    "Announcement Details / Purpose",
                    "Ratio / Value",
                    "Dilution Factor"
                  ]}
                  rows={corpActions.map((ca, idx) => [
                    <span key={`rec-${idx}`} className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">{ca.record_date}</span>,
                    <span key={`ex-${idx}`} className="font-mono text-xs font-semibold text-slate-600">{ca.ex_date || "—"}</span>,
                    <span key={`cat-${idx}`} className="font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-md">{ca.category}</span>,
                    <span key={`p-${idx}`} className="font-medium text-slate-900 leading-snug">{ca.purpose}</span>,
                    <span key={`r-${idx}`} className="font-mono text-xs font-semibold text-slate-700">{ca.ratio_value || ca.bonus_ratio || "—"}</span>,
                    <span key={`d-${idx}`} className="font-mono font-bold text-slate-700">{ca.dilution_factor ? `${ca.dilution_factor}×` : "1.00×"}</span>,
                  ])}
                />
              ) : (
                <div className="p-12 text-center text-slate-500 bg-slate-50/50 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">No Corporate Actions Recorded in Past 15 Days</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    No dividend, bonus issue, stock split, or board meeting actions recorded for {symbol} during the 15-day analysis window.
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB: PARTICIPANTS (Possible Suspects — Framework Spec §5.4) */}
        {activeTab === "Participants" && (
          <div className="space-y-5">
            {!participants && (
              <Card>
                <div className="p-8 text-sm text-slate-500 text-center">
                  Participant audit data not available for this scrip.
                </div>
              </Card>
            )}
            {participants && (() => {
              const allLtp = participants.ltp_contributors || [];
              const posList = participants.pos_ltp_contributors && participants.pos_ltp_contributors.length > 0
                ? participants.pos_ltp_contributors
                : allLtp.filter(p => (p.pos_val ?? (p.net_val && p.net_val > 0 ? p.net_val : 0)) > 0 || (p.contribution && p.contribution > 0));

              const negList = participants.neg_ltp_contributors && participants.neg_ltp_contributors.length > 0
                ? participants.neg_ltp_contributors
                : allLtp.filter(p => (p.neg_val ?? (p.net_val && p.net_val < 0 ? Math.abs(p.net_val) : 0)) > 0 || (p.contribution && p.contribution < 0));

              const panNameMap: Record<string, string> = {};
              for (const p of participants.ltp_contributors || []) {
                if (p.participant && p.name) panNameMap[p.participant] = p.name;
              }
              for (const p of participants.pos_ltp_contributors || []) {
                if (p.participant && p.name) panNameMap[p.participant] = p.name;
              }
              for (const p of participants.neg_ltp_contributors || []) {
                if (p.participant && p.name) panNameMap[p.participant] = p.name;
              }
              for (const p of participants.volume_share || []) {
                if (p.participant && p.name) panNameMap[p.participant] = p.name;
              }
              for (const p of participants.profit_makers || []) {
                if (p.participant && p.name) panNameMap[p.participant] = p.name;
              }
              for (const p of participants.reversal_pairs || []) {
                if (p.pan1 && p.name1) panNameMap[p.pan1] = p.name1;
                if (p.pan2 && p.name2) panNameMap[p.pan2] = p.name2;
              }

              return (
                <>
                  {/* Row 1: Two Dedicated LTP Contribution Tables (Gross Positive & Gross Negative) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Gross Positive LTP Contribution Table */}
                    <Card>
                      <SectionHeader
                        icon={<TrendingUp className="w-4 h-4 text-slate-600" />}
                        title="Gross Positive LTP Contribution"
                        subtitle="Aggressive buy orders driving upward price momentum (+₹)"
                        info="Measures how much each participant's aggressive buy orders pushed the traded price higher across the 15-day window."
                      />
                      {posList.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          No significant positive price pushers detected in the observation window.
                        </div>
                      ) : (
                        <DataTable
                          minWidth="min-w-[500px]"
                          colWidths={["35%", "21%", "22%", "22%"]}
                          alignments={["left", "left", "right", "right"]}
                          headers={[
                            <span key="h-name" className="whitespace-nowrap">PAN Holder Name</span>,
                            <span key="h-pan" className="inline-flex items-center gap-1 whitespace-nowrap">Client PAN</span>,
                            <span key="h-pos" className="inline-flex items-center gap-1 whitespace-nowrap">LTP Push (+₹) <InfoTooltip text="Total rupee value of price increases directly caused by this entity's buy orders hitting the ask." /></span>,
                            <span key="h-cont" className="inline-flex items-center gap-1 whitespace-nowrap">Contribution % <InfoTooltip text="Share of the stock's total upward price movement caused by this entity's orders." /></span>
                          ]}
                          rows={posList.map((p) => {
                            const posVal = p.pos_val ?? (p.net_val && p.net_val > 0 ? p.net_val : 0);
                            const contPct = Math.abs(Number(p.contribution || 0));
                            const displayName = p.name || panNameMap[p.participant] || "Unknown Entity";

                            return [
                              <span key="name" className="font-semibold text-slate-900 truncate max-w-[170px] sm:max-w-[210px] xl:max-w-[240px] block" title={displayName}>{displayName}</span>,
                              <button
                                type="button"
                                key={p.participant}
                                onClick={() => setSelectedPan(p.participant)}
                                className="text-slate-800 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-mono font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors"
                                title="Click to view Client 360 profile"
                              >
                                <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {p.participant}
                              </button>,
                              <span key="pos" className="font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                                +₹{Number(posVal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>,
                              <div key="bar" className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                                <div className="w-7 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200 shrink-0">
                                  <div
                                    className="bg-slate-700 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, contPct)}%` }}
                                  />
                                </div>
                                <span className="font-mono font-semibold text-slate-900 tabular-nums text-xs min-w-[42px] text-right">
                                  +{contPct.toFixed(2)}%
                                </span>
                              </div>,
                            ];
                          })}
                        />
                      )}
                    </Card>

                    {/* Gross Negative LTP Contribution Table */}
                    <Card>
                      <SectionHeader
                        icon={<TrendingDown className="w-4 h-4 text-slate-600" />}
                        title="Gross Negative LTP Contribution"
                        subtitle="Aggressive sell orders dampening price or hitting bids (-₹)"
                        info="Measures how much each participant's aggressive sell orders pulled or suppressed the traded price downwards across the 15-day window."
                      />
                      {negList.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          No significant negative price suppressors detected in the observation window.
                        </div>
                      ) : (
                        <DataTable
                          minWidth="min-w-[500px]"
                          colWidths={["35%", "21%", "22%", "22%"]}
                          alignments={["left", "left", "right", "right"]}
                          headers={[
                            <span key="h-name" className="whitespace-nowrap">PAN Holder Name</span>,
                            <span key="h-pan" className="inline-flex items-center gap-1 whitespace-nowrap">Client PAN</span>,
                            <span key="h-neg" className="inline-flex items-center gap-1 whitespace-nowrap">LTP Pull (-₹) <InfoTooltip text="Total rupee value of price drops directly caused by this entity's sell orders hitting the bid." /></span>,
                            <span key="h-cont" className="inline-flex items-center gap-1 whitespace-nowrap">Contribution % <InfoTooltip text="Share of the stock's total downward price pressure caused by this entity's orders." /></span>
                          ]}
                          rows={negList.map((p) => {
                            const negVal = p.neg_val ?? (p.net_val && p.net_val < 0 ? Math.abs(p.net_val) : 0);
                            const contPct = Math.abs(Number(p.contribution || 0));
                            const displayName = p.name || panNameMap[p.participant] || "Unknown Entity";

                            return [
                              <span key="name" className="font-semibold text-slate-900 truncate max-w-[170px] sm:max-w-[210px] xl:max-w-[240px] block" title={displayName}>{displayName}</span>,
                              <button
                                type="button"
                                key={p.participant}
                                onClick={() => setSelectedPan(p.participant)}
                                className="text-slate-800 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-mono font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors"
                                title="Click to view Client 360 profile"
                              >
                                <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {p.participant}
                              </button>,
                              <span key="neg" className="font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                                -₹{Number(negVal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>,
                              <div key="bar" className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                                <div className="w-7 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200 shrink-0">
                                  <div
                                    className="bg-slate-700 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, contPct)}%` }}
                                  />
                                </div>
                                <span className="font-mono font-semibold text-slate-900 tabular-nums text-xs min-w-[42px] text-right">
                                  -{contPct.toFixed(2)}%
                                </span>
                              </div>,
                            ];
                          })}
                        />
                      )}
                    </Card>
                  </div>

                  {/* Row 2: Concentrated Volume Share & Counterparty Concentration */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Concentrated Volume Share */}
                    <Card>
                      <SectionHeader
                        title="Concentrated Volume Share"
                        subtitle="Top 5 participants by volume"
                        info="Highlights the top entities by total trading volume over the 15-day window to detect cornering of the stock's floating shares."
                      />
                      <DataTable
                        minWidth="min-w-[500px]"
                        colWidths={["35%", "21%", "22%", "22%"]}
                        alignments={["left", "left", "right", "right"]}
                        headers={[
                          <span key="h-name" className="whitespace-nowrap">PAN Holder Name</span>,
                          <span key="h-volpan" className="inline-flex items-center gap-1 whitespace-nowrap">Client PAN</span>,
                          <span key="h-vol" className="inline-flex items-center gap-1 whitespace-nowrap">Volume <InfoTooltip text="Total number of shares bought and sold by this participant during the 15-day period." /></span>,
                          <span key="h-volpct" className="inline-flex items-center gap-1 whitespace-nowrap">Share % <InfoTooltip text="Percentage of the stock's total market volume traded by this single participant." /></span>
                        ]}
                        rows={participants.volume_share.map((p) => {
                          const displayName = p.name || panNameMap[p.participant] || "Unknown Entity";
                          return [
                            <span key="name" className="font-semibold text-slate-900 truncate max-w-[170px] sm:max-w-[210px] xl:max-w-[240px] block" title={displayName}>{displayName}</span>,
                            <button
                              type="button"
                              key={p.participant}
                              onClick={() => setSelectedPan(p.participant)}
                              className="text-slate-800 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-mono font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors"
                              title="Click to view Client 360 profile"
                            >
                              <UserCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              {p.participant}
                            </button>,
                            <span key="vol" className="font-mono text-xs font-semibold text-slate-800 whitespace-nowrap tabular-nums">
                              {Number(p.volume || 0).toLocaleString("en-IN")}
                            </span>,
                            <div key="bar" className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                              <div className="w-7 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200 shrink-0">
                                <div
                                  className="bg-slate-700 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, Math.max(0, Number(p.share_pct || 0)))}%` }}
                                />
                              </div>
                              <span className="font-mono font-semibold text-slate-900 tabular-nums text-xs min-w-[42px] text-right">{Number(p.share_pct || 0).toFixed(2)}%</span>
                            </div>,
                          ];
                        })}
                      />
                    </Card>

                    {/* Counterparty Concentration */}
                    <Card>
                      <SectionHeader
                        title="Counterparty Concentration"
                        subtitle="Top 5 bilateral trading pairs by volume"
                        info="Tracks trades matched directly between specific buyer-seller pairs. High concentration indicates potential circular or synchronized trading."
                      />
                      {participants.counterparty_pairs.length > 0 ? (
                        <DataTable
                          minWidth="min-w-[480px]"
                          colWidths={["56%", "22%", "22%"]}
                          alignments={["left", "right", "right"]}
                          headers={[
                            <span key="h-cppair" className="inline-flex items-center gap-1 whitespace-nowrap">Matched Entities & PANs <InfoTooltip text="Buyer and seller accounts that frequently traded shares with each other." /></span>,
                            <span key="h-cpvol" className="inline-flex items-center gap-1 whitespace-nowrap">Volume <InfoTooltip text="Total volume of shares exchanged directly between this buyer and seller pair." /></span>,
                            <span key="h-cppct" className="inline-flex items-center gap-1 whitespace-nowrap">Share % <InfoTooltip text="Percentage of total market volume generated by trades between this specific pair." /></span>
                          ]}
                          rows={participants.counterparty_pairs.map((p) => {
                            const pairParts = p.pair.split(" <-> ");
                            const p1 = p.pan1 || pairParts[0] || p.pair;
                            const p2 = p.pan2 || pairParts[1] || "";
                            const n1 = p.name1 || panNameMap[p1] || p1;
                            const n2 = p.name2 || panNameMap[p2] || p2;
                            return [
                              <div key={p.pair} className="flex flex-col gap-1 py-1">
                                {/* Entity Names */}
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 leading-snug">
                                  <span className="truncate max-w-[150px] sm:max-w-[190px] xl:max-w-[240px]" title={n1}>{n1}</span>
                                  <span className="text-slate-400 font-bold shrink-0">⇄</span>
                                  <span className="truncate max-w-[150px] sm:max-w-[190px] xl:max-w-[240px]" title={n2}>{n2}</span>
                                </div>
                                {/* PAN Badges */}
                                <div className="inline-flex items-center gap-1 font-mono text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPan(p1)}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                    title={`Click to view Client 360 profile for ${p1}`}
                                  >
                                    <UserCircle className="w-3 h-3 text-slate-400 shrink-0" />
                                    {p1}
                                  </button>
                                  <span className="text-slate-300 font-bold">⇄</span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPan(p2)}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                    title={`Click to view Client 360 profile for ${p2}`}
                                  >
                                    <UserCircle className="w-3 h-3 text-slate-400 shrink-0" />
                                    {p2}
                                  </button>
                                </div>
                              </div>,
                              <span key="vol" className="font-mono text-xs font-semibold text-slate-800 whitespace-nowrap tabular-nums">
                                {Number(p.volume || 0).toLocaleString("en-IN")}
                              </span>,
                              <span key="pct" className="font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                                {Number(p.share_pct || 0).toFixed(2)}%
                              </span>,
                            ];
                          })}
                        />
                      ) : (
                        <div className="py-7 px-4 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                          <Users className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                          <div className="text-xs font-semibold text-slate-700">Bilateral Trade Matches Not Supplied</div>
                          <div className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                            Bilateral matching extract was not delivered by the exchange for {detail.symbol} (available for acute circuit scrips SKMEGGPROD & GUJRAFFIA). Individual conduct (LTP Push/Pull, Volume Dominance, and Net P&L) is fully tracked from genuine client logs.
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>


                  {/* Row 3: Net P&L — Top Beneficiaries */}
                  <Card>
                    <SectionHeader
                      title="Net P&L — Top Trading Beneficiaries"
                      subtitle="Net realized & unrealized gainers/position holders in 15D window"
                      info="Net trading profit or loss (sells minus buys plus current holdings valued at latest close) over the 15-day window to identify who made money."
                    />
                    <DataTable
                      minWidth="min-w-[600px]"
                      colWidths={["30%", "18%", "20%", "16%", "16%"]}
                      alignments={["left", "left", "right", "right", "right"]}
                      headers={[
                        <span key="h-name" className="whitespace-nowrap">PAN Holder Name</span>,
                        <span key="h-pnlpan" className="inline-flex items-center gap-1 whitespace-nowrap">Client PAN</span>,
                        <span key="h-pnl" className="inline-flex items-center gap-1 whitespace-nowrap">Net P&L (₹) <InfoTooltip text="Total profit or loss generated by this participant during the 15-day observation window." /></span>,
                        <span key="h-bvol" className="inline-flex items-center gap-1 whitespace-nowrap">Buy Vol <InfoTooltip text="Total shares bought by this participant during the 15-day window." /></span>,
                        <span key="h-svol" className="inline-flex items-center gap-1 whitespace-nowrap">Sell Vol <InfoTooltip text="Total shares sold by this participant during the 15-day window." /></span>
                      ]}
                      rows={participants.profit_makers.map((p) => {
                        const pnlVal = Number(p.net_pnl || 0);
                        const isPos = pnlVal >= 0;
                        const absVal = Math.abs(pnlVal);
                        const formattedAmt = absVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        let macroLabel = "";
                        if (absVal >= 10000000) {
                          macroLabel = `${isPos ? "+" : "-"}₹${(absVal / 10000000).toFixed(2)} Cr`;
                        } else if (absVal >= 100000) {
                          macroLabel = `${isPos ? "+" : "-"}₹${(absVal / 100000).toFixed(2)} L`;
                        }
                        const displayName = p.name || panNameMap[p.participant] || "Unknown Entity";

                        return [
                          <span key="name" className="font-semibold text-slate-900 truncate max-w-[170px] sm:max-w-[210px] xl:max-w-[250px] block" title={displayName}>{displayName}</span>,
                          <button
                            type="button"
                            key={p.participant}
                            onClick={() => setSelectedPan(p.participant)}
                            className="text-slate-800 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-mono font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors"
                            title="Click to view Client 360 profile"
                          >
                            <UserCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {p.participant}
                          </button>,
                          <div key="pnl" className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap tabular-nums">
                            <span className={cn(
                              "font-mono text-xs font-bold",
                              isPos ? "text-emerald-700" : "text-rose-600"
                            )}>
                              {isPos ? `+₹${formattedAmt}` : `-₹${formattedAmt}`}
                            </span>
                            {macroLabel && (
                              <span className={cn(
                                "text-[10px] font-extrabold px-1.5 py-0.2 rounded border font-sans",
                                isPos ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
                              )}>
                                {macroLabel}
                              </span>
                            )}
                          </div>,
                          <span key="bvol" className="font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">{Number(p.buy_volume || 0).toLocaleString("en-IN")}</span>,
                          <span key="svol" className="font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">{Number(p.sell_volume || 0).toLocaleString("en-IN")}</span>,
                        ];
                      })}
                    />
                  </Card>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── CLIENT 360° INTELLIGENCE DRAWER ── */}
      {selectedPan && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px]"
            onClick={() => setSelectedPan(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <UserCircle className="w-5 h-5 text-blue-600" />
                Client 360 Intelligence Profile
              </div>
              <button
                onClick={() => setSelectedPan(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!client360 ? (
              <div className="p-6 text-sm text-slate-500 flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                Loading verified client KYC details…
              </div>
            ) : (
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Legal Entity KYC</div>
                  {client360.name && (
                    <div className="text-base font-extrabold text-slate-900 mb-1">{client360.name}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-black text-slate-800 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{client360.pan}</div>
                    {client360.category && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.5 rounded border border-blue-200">
                        {client360.category}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-2">Client ID: {client360.clnt_id} · Trading Member: {client360.tm_id}</div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5">
                  <div className="text-xs text-slate-700 font-bold mb-2 border-b border-slate-100 pb-1">
                    Beneficiary Owner (BO) Depository Accounts ({client360.depository_accounts.length})
                  </div>
                  <div className="text-xs space-y-1.5 font-mono">
                    {client360.depository_accounts.length === 0
                      ? <div className="text-slate-400">No depository accounts linked.</div>
                      : client360.depository_accounts.map((da, i) => (
                          <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="font-bold text-slate-800">{da.dp_id} / {da.client_id}</span>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded",
                              da.status?.toUpperCase().includes("ACTIVE") ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {da.status}
                            </span>
                          </div>
                        ))
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Fullscreen High-Definition Chart Modal */}
      {/* HIGH-RES FULLSCREEN CHART MODAL */}
      {expandedChart && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 truncate">{expandedChart.title}</h2>
                    <span className="shrink-0 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                      {symbol}
                    </span>
                  </div>
                  {expandedChart.subtitle && (
                    <p className="text-xs text-slate-500 font-normal truncate mt-0.5">{expandedChart.subtitle}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-400 font-mono hidden md:inline">Press ESC to close</span>
                <button
                  onClick={() => setExpandedChart(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs border border-slate-200"
                  title="Close Fullscreen View"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Modal Content - Direct Clean High-Res Canvas */}
            <div className="p-6 md:p-8 flex-1 bg-white overflow-y-auto">
              {expandedChart.chart}
            </div>
          </div>
        </div>
      )}
      
      {/* Non-Trading Day Toast Notification */}
      <Toast 
        show={toastAlert.show} 
        message={toastAlert.msg} 
        onClose={() => setToastAlert({ ...toastAlert, show: false })} 
        type="warning" 
      />

      {/* Comprehensive Surveillance Dossier PDF Modal & Print Container */}
      <SurveillanceDossierPdf
        detail={detail}
        shBreakdown={shBreakdown}
        corpActions={corpActions}
        participants={participants}
        selectedDate={selectedDate}
        windowDays={windowDays}
        exchange={exchange}
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        currentUser={currentUser}
        autoPrint={autoPrintPdf}
      />
    </div>
  );
}
