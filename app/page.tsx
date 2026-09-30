"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { AlertsTable, InfoTooltip } from "@/components/dashboard/alerts-table";
import { TradingDatePicker } from "@/components/ui/trading-date-picker";
import { type ExchangeScope } from "@/components/ui/exchange-scope-selector";
import { Toast } from "@/components/ui/toast";
import { fetchWatchlist, fetchAvailableTradingDates, fetchModelWeights, type ScripSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const urlAsOfDate = searchParams?.get("asOfDate") || "";
  const urlWindowDays = searchParams?.get("windowDays") ? Number(searchParams.get("windowDays")) : 15;
  const urlExchange = (searchParams?.get("exchange") as ExchangeScope) || "ALL";

  const [scrips, setScrips] = useState<ScripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>("High");
  const [toastAlert, setToastAlert] = useState<{ show: boolean; msg: string }>({ show: false, msg: "" });
  const [threshold, setThreshold] = useState<number>(60);

  // Market Date & Surveillance Window State
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(urlAsOfDate);
  const [windowDays, setWindowDays] = useState<number>(urlWindowDays);
  const [exchange, setExchange] = useState<ExchangeScope>(urlExchange);
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);

  // Initialize available dates from surveillance warehouse
  useEffect(() => {
    async function loadDates() {
      const dates = await fetchAvailableTradingDates();
      if (dates && dates.length > 0) {
        setAvailableDates(dates);
        
        const targetDate = urlAsOfDate || dates[0];
        if (urlAsOfDate && !dates.includes(urlAsOfDate)) {
          // Auto-correct to nearest previous valid trading date
          const nearest = dates.find((d) => d <= urlAsOfDate) || dates[0];
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

  // Load active calibrated threshold from surveillance warehouse
  useEffect(() => {
    async function loadWeights() {
      try {
        const data = await fetchModelWeights();
        if (data && data.threshold != null) {
          setThreshold(data.threshold);
        }
      } catch (e) {
        console.warn("[Dashboard] Could not fetch active model weights:", e);
      }
    }
    loadWeights();
  }, []);

  // Fetch watchlist data whenever selectedDate, windowDays, or exchange changes
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWatchlist(undefined, selectedDate || undefined, windowDays, exchange);
      setScrips(data);
    } catch (err) {
      console.error("[Dashboard] Failed to load watchlist:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, windowDays, exchange]);

  useEffect(() => {
    if (selectedDate || availableDates.length === 0) {
      loadData();
    }
  }, [selectedDate, availableDates.length, loadData]);


  // ── Date Navigation Helpers ──
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

  const canGoNext = dateIndex > 0;
  const canGoPrev = dateIndex < availableDates.length - 1;
  const handlePrevDay = () => {
    if (canGoPrev) setSelectedDate(availableDates[dateIndex + 1]);
  };
  const handleNextDay = () => {
    if (canGoNext) setSelectedDate(availableDates[dateIndex - 1]);
  };

  /** Snap a date string to the nearest available trading date and update URL */
  const snapToTradingDate = (raw: string) => {
    if (!raw) return;
    let finalDate = raw;
    
    if (!availableDateSet.has(raw)) {
      finalDate = availableDates.find((d) => d <= raw) || availableDates[0];
    }
    
    setSelectedDate(finalDate);
    
    const newParams = new URLSearchParams(searchParams?.toString() || "");
    newParams.set("asOfDate", finalDate);
    router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
  };

  const fmtShort = (d: string) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans overflow-hidden">

      {/* ── Observation Date Command Bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-5 py-2.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">

          {/* Custom Trading Date Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider select-none inline-flex items-center gap-1">
              Observation Date:
              <InfoTooltip text="The trading day being analyzed. Recent activity leading up to this date is compared against 6 months of historical data." />
            </span>
            <TradingDatePicker
              availableDates={availableDates}
              selectedDate={selectedDate}
              onDateChange={(d) => snapToTradingDate(d)}
            />
          </div>

          {/* Day shift navigation buttons */}
          <div className="flex items-center rounded-xl border border-slate-300/80 bg-white overflow-hidden text-xs font-semibold text-slate-700 divide-x divide-slate-200 shadow-2xs">
            <button
              onClick={handlePrevDay}
              disabled={!canGoPrev}
              className="flex items-center gap-1 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Previous Trading Day (T-1)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev Day</span>
            </button>
            <button
              onClick={handleNextDay}
              disabled={!canGoNext}
              className="flex items-center gap-1 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Next Trading Day (T+1)"
            >
              <span>Next Day</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Spacer pushes window badge right */}
          <div className="flex-1" />

          {/* Active Watchlist Cutoff Threshold Badge */}
          <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-200 rounded-lg px-3 py-1.5 text-[12px] text-blue-900 font-semibold select-none shadow-2xs">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Watchlist Cutoff:{" "}
              <strong className="font-mono text-blue-950 font-bold">Score ≥ {threshold}</strong>
            </span>
            <InfoTooltip
              text={`Calibrated triage threshold. Only scrips with a weighted composite PVASF risk score ≥ ${threshold} are shortlisted on this watchlist.`}
              align="right"
            />
          </div>

          {/* 15D analysis window readout */}
          <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-1.5 text-[12px] text-amber-900 font-semibold select-none">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-mono">
              {fmtShort(windowStartDate)}&nbsp;→&nbsp;{fmtShort(selectedDate)}
            </span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-300/70 rounded px-1.5 py-px inline-flex items-center gap-1">
              15D Analysis Window
              <InfoTooltip
                text="Recent 15 trading days being examined and compared against the 6-month historical baseline."
                align="right"
              />
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Watchlist Table ── */}
      <main className="flex-1 overflow-hidden flex flex-col bg-white">
        <AlertsTable
          scrips={scrips}
          selectedRiskFilter={riskFilter}
          onRiskFilterChange={(f) => setRiskFilter(f)}
          loading={loading}
          asOfDate={selectedDate}
          windowDays={windowDays}
          exchange={exchange}
          threshold={threshold}
        />
      </main>
      {/* Non-Trading Day Toast Notification */}
      <Toast 
        show={toastAlert.show} 
        message={toastAlert.msg} 
        onClose={() => setToastAlert({ ...toastAlert, show: false })} 
        type="warning" 
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
