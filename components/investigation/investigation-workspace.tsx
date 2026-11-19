"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  AlertTriangle,
  Maximize2,
  Minimize2,
  FileDown,
  FileSpreadsheet,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { TradingDatePicker } from "@/components/ui/trading-date-picker";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
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
  type ExchangeScope,
} from "@/lib/api";
import { useUser } from "@/lib/user-context";
import { SurveillanceDossierPdf } from "@/components/investigation/surveillance-dossier-pdf";
import {
  OverviewTab,
  ShareholdersTab,
  AnnouncementsTab,
  CorporateActionsTab,
  ParticipantsTab,
  DataTable,
  SectionHeader,
  Card,
} from "@/components/investigation/tabs";
import { Client360Drawer } from "@/components/investigation/client-360-drawer";
import { FullscreenChartModal } from "@/components/investigation/fullscreen-chart-modal";

// Re-export UI primitives for backward compatibility
export { DataTable, SectionHeader, Card };

const TABS = [
  "Overview",
  "Shareholders",
  "Corporate Announcements",
  "Corporate Actions",
  "Participants",
] as const;
type TabType = typeof TABS[number];

export function InvestigationWorkspace({ symbol }: { symbol: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlAsOfDate = searchParams?.get("asOfDate") || "";
  const urlWindowDays = searchParams?.get("windowDays")
    ? Number(searchParams.get("windowDays"))
    : 15;
  const urlExchange = (searchParams?.get("exchange") as ExchangeScope) || "ALL";

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(urlAsOfDate);
  const [windowDays] = useState<number>(urlWindowDays);
  const [exchange] = useState<ExchangeScope>(urlExchange);
  const [toastAlert, setToastAlert] = useState<{ show: boolean; msg: string }>({
    show: false,
    msg: "",
  });

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
          const nearest =
            (dates.find((d) => d <= urlAsOfDate) || dates[dates.length - 1]) ?? dates[0];
          setToastAlert({
            show: true,
            msg: `${urlAsOfDate} is a non-trading day. Automatically loaded the last active session (${nearest}).`,
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
          fetchScripParticipants(symbol, selectedDate || undefined, windowDays).catch(
            () => null
          ),
          fetchShareholdingBreakdown(symbol, selectedDate || undefined).catch(() => null),
          fetchCorporateActions(symbol, selectedDate || undefined).catch(() => []),
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
  }, [symbol, selectedDate, windowDays, exchange, availableDates.length]);

  useEffect(() => {
    if (selectedPan) {
      setClient360(null);
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
    const map: Record<
      string,
      { weight: number; contribution: number; score: number }
    > = {};
    (detail?.score_breakdown || []).forEach((item) => {
      map[item.label] = {
        weight: item.weight,
        contribution: item.contribution,
        score: item.score,
      };
    });
    return map;
  }, [detail?.score_breakdown]);

  const activeWeights = useMemo(
    () => ({
      price_rise: scoreBreakdownMap["Price Rise"]?.weight ?? 20,
      price_z: scoreBreakdownMap["Price Z"]?.weight ?? 20,
      volume_z: scoreBreakdownMap["Volume Z"]?.weight ?? 20,
      band_persistence: scoreBreakdownMap["Band Persistence"]?.weight ?? 20,
      new_high: scoreBreakdownMap["180 Day New High"]?.weight ?? 20,
    }),
    [scoreBreakdownMap]
  );

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
      finalDate =
        (availableDates.find((d) => d <= raw) ||
          availableDates[availableDates.length - 1]) ??
        raw;
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
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
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
      setToastAlert({
        show: true,
        msg: "Failed to download Excel report. Please verify backend connection.",
      });
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleTriggerPdf = (autoPrint: boolean = false) => {
    setAutoPrintPdf(autoPrint);
    setIsDossierOpen(true);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-slate-50 min-w-0 transition-all duration-300",
        isFullscreen &&
          "fixed inset-0 z-50 h-screen w-screen bg-slate-100 p-0 overflow-hidden animate-in fade-in zoom-in-95"
      )}
    >
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
                <h1 className="text-xl font-extrabold text-slate-900 leading-none">
                  {company}
                </h1>
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
                  Risk Score:{" "}
                  <strong className="font-mono text-slate-900 font-bold">
                    {metrics.final_score.toFixed(1)}
                  </strong>
                  <span className="text-slate-400 font-normal ml-1">
                    / Cutoff ≥ {detail.threshold ?? 60}
                  </span>
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
                  onClick={() => handleTriggerPdf(false)}
                  className="h-8 text-xs font-bold px-3.5 rounded-xl border border-blue-300/80 bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  title="Preview and Export Comprehensive Surveillance Dossier (PDF)"
                >
                  <FileDown className="h-3.5 w-3.5 text-blue-600" />
                  <span>Export Dossier (PDF)</span>
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
                      <span className="text-[10px] text-blue-700 font-medium">
                        (&lt; 180D archive)
                      </span>
                    </span>
                  </div>
                )}

                {historyGap && (
                  <div
                    className="flex items-center gap-1.5 bg-rose-50 border border-rose-200/90 rounded-xl px-2.5 py-1 text-xs text-rose-900 font-semibold shadow-2xs"
                    title={`Feed Notice: A ${historyGap.days}-day calendar gap exists between ${historyGap.start} and ${historyGap.end} in the provided market archive. The ${windowDays} evaluated sessions span non-contiguous periods.`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span>
                      Feed Gap:{" "}
                      <strong className="font-mono font-bold text-rose-950">
                        {historyGap.days}d ({formatDateDisplay(historyGap.start)} →{" "}
                        {formatDateDisplay(historyGap.end)})
                      </strong>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/90 rounded-xl px-2.5 py-1 text-xs text-amber-950 font-semibold shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>
                    {windowDays}D Analysis Window:{" "}
                    <strong className="font-mono font-bold text-amber-950">
                      {formatDateDisplay(windowStartDate)} →{" "}
                      {formatDateDisplay(selectedDate)}
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
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center gap-1.5",
                    isTabActive
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-medium"
                  )}
                >
                  <span>{tab}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={
                isFullscreen
                  ? "Exit Fullscreen (ESC)"
                  : "Expand Workspace to Fullscreen"
              }
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs",
                isFullscreen
                  ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
              )}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Exit Fullscreen</span>
                  <span className="text-[10px] text-slate-400 font-mono bg-slate-200/80 px-1 py-0.5 rounded">
                    ESC
                  </span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Expand Workspace</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div
        className={cn(
          "flex-1 overflow-y-auto p-5 space-y-5 min-w-0 mx-auto w-full transition-all",
          isFullscreen ? "max-w-none px-8 py-6" : "max-w-7xl"
        )}
      >
        {activeTab === "Overview" && (
          <OverviewTab
            detail={detail}
            metrics={metrics}
            history={history}
            activeWeights={activeWeights}
            windowDays={windowDays}
            onExpandChart={setExpandedChart}
          />
        )}

        {activeTab === "Shareholders" && (
          <ShareholdersTab
            detail={detail}
            shBreakdown={shBreakdown}
            windowDays={windowDays}
            onSelectPan={setSelectedPan}
          />
        )}

        {activeTab === "Corporate Announcements" && (
          <AnnouncementsTab
            symbol={symbol}
            announcements={detail.announcements}
            windowDays={windowDays}
          />
        )}

        {activeTab === "Corporate Actions" && (
          <CorporateActionsTab
            symbol={symbol}
            corpActions={corpActions}
            windowDays={windowDays}
          />
        )}

        {activeTab === "Participants" && (
          <ParticipantsTab
            symbol={symbol}
            detail={detail}
            participants={participants}
            windowDays={windowDays}
            onSelectPan={setSelectedPan}
          />
        )}
      </div>

      {/* ── CLIENT 360° INTELLIGENCE DRAWER ── */}
      <Client360Drawer
        selectedPan={selectedPan}
        client360={client360}
        onClose={() => setSelectedPan(null)}
      />

      {/* HIGH-RES FULLSCREEN CHART MODAL */}
      <FullscreenChartModal
        expandedChart={expandedChart}
        symbol={symbol}
        onClose={() => setExpandedChart(null)}
      />

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
