"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Search,
  X,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ScripSummary, type ExchangeScope } from "@/lib/api";
import { InfoTooltip } from "@/components/ui/info-tooltip";

type SortField =
  | "score"
  | "price_rise_pct"
  | "price_z"
  | "volume_z"
  | "symbol"
  | "band_hit_days"
  | "new_high_days";

type SortOrder = "asc" | "desc";

export interface AlertsTableProps {
  scrips: ScripSummary[];
  selectedRiskFilter?: string;
  onRiskFilterChange?: (filter: string) => void;
  loading?: boolean;
  asOfDate?: string;
  windowDays?: number;
  exchange?: ExchangeScope;
  threshold?: number;
}

const RISK_DOT: Record<string, string> = {
  High: "bg-rose-500 ring-2 ring-rose-200",
  Medium: "bg-amber-500 ring-2 ring-amber-200",
  Low: "bg-emerald-500 ring-2 ring-emerald-200",
};

export function AlertsTable({
  scrips,
  selectedRiskFilter = "High",
  onRiskFilterChange,
  loading = false,
  asOfDate,
  windowDays = 15,
  exchange: _exchange = "ALL",
  threshold,
}: AlertsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [riskTab, setRiskTab] = useState<string>(selectedRiskFilter);

  // Trigger filters
  const [filterPriceSpike, setFilterPriceSpike] = useState(false);
  const [filterPriceZ, setFilterPriceZ] = useState(false);
  const [filterVolZ, setFilterVolZ] = useState(false);
  const [filterCircuitHits, setFilterCircuitHits] = useState(false);
  const [filterNewHighs, setFilterNewHighs] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setRiskTab(selectedRiskFilter);
  }, [selectedRiskFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    riskTab,
    filterPriceSpike,
    filterPriceZ,
    filterVolZ,
    filterCircuitHits,
    filterNewHighs,
    sortField,
    sortOrder,
    pageSize,
  ]);

  const handleRiskTabChange = (level: string) => {
    setRiskTab(level);
    onRiskFilterChange?.(level);
  };

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return scrips.filter((s) => {
      const matchQuery =
        !q ||
        s.symbol.toLowerCase().includes(q) ||
        (s.company && s.company.toLowerCase().includes(q)) ||
        (s.isin && s.isin.toLowerCase().includes(q));

      const matchRisk = riskTab === "All" || s.risk === riskTab;
      const matchPriceSpike = !filterPriceSpike || s.price_rise_pct >= 15;
      const matchPriceZ = !filterPriceZ || s.price_z >= 1.645;
      const matchVolZ = !filterVolZ || s.volume_z >= 1.645;
      const matchCircuitHits = !filterCircuitHits || s.band_hit_days >= 3;
      const matchNewHighs = !filterNewHighs || s.new_high_days >= 1;

      return (
        matchQuery &&
        matchRisk &&
        matchPriceSpike &&
        matchPriceZ &&
        matchVolZ &&
        matchCircuitHits &&
        matchNewHighs
      );
    });
  }, [
    scrips,
    searchTerm,
    riskTab,
    filterPriceSpike,
    filterPriceZ,
    filterVolZ,
    filterCircuitHits,
    filterNewHighs,
  ]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const rawA = a[sortField];
      const rawB = b[sortField];
      if (rawA == null && rawB == null) return 0;
      if (rawA == null) return 1;
      if (rawB == null) return -1;
      if (typeof rawA === "string" || typeof rawB === "string") {
        const sa = String(rawA).toLowerCase();
        const sb = String(rawB).toLowerCase();
        if (sa < sb) return sortOrder === "asc" ? -1 : 1;
        if (sa > sb) return sortOrder === "asc" ? 1 : -1;
        return 0;
      }
      const numA = Number(rawA) || 0;
      const numB = Number(rawB) || 0;
      if (numA < numB) return sortOrder === "asc" ? -1 : 1;
      if (numA > numB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortOrder]);

  const total = sorted.length;
  const effPageSize = pageSize === 0 ? total : pageSize;
  const totalPages = Math.max(1, Math.ceil(total / (effPageSize || 1)));
  const startIdx = pageSize === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIdx = pageSize === 0 ? total : Math.min(startIdx + pageSize, total);
  const page = sorted.slice(startIdx, endIdx);

  const pageNums = (cur: number, tot: number) => {
    if (tot <= 7) return Array.from({ length: tot }, (_, i) => i + 1);
    if (cur <= 4) return [1, 2, 3, 4, 5, "…", tot];
    if (cur >= tot - 3) return [1, "…", tot - 4, tot - 3, tot - 2, tot - 1, tot];
    return [1, "…", cur - 1, cur, cur + 1, "…", tot];
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    riskTab !== "All" ||
    filterPriceSpike ||
    filterPriceZ ||
    filterVolZ ||
    filterCircuitHits ||
    filterNewHighs;

  const resetFilters = () => {
    setSearchTerm("");
    handleRiskTabChange("All");
    setFilterPriceSpike(false);
    setFilterPriceZ(false);
    setFilterVolZ(false);
    setFilterCircuitHits(false);
    setFilterNewHighs(false);
  };

  const exportCSV = () => {
    const hdrs = [
      "Symbol",
      "Company",
      "ISIN",
      "Risk",
      "PVASF_Score",
      "Price_Rise_Pct",
      "Price_Z",
      "Volume_Z",
      "Circuit_Hits",
      "New_Highs",
    ];
    const rows = sorted.map((s) => [
      s.symbol,
      `"${(s.company || s.symbol).replace(/"/g, '""')}"`,
      s.isin || "",
      s.risk,
      s.score,
      s.price_rise_pct != null ? s.price_rise_pct.toFixed(2) : "0.00",
      s.price_z != null ? s.price_z.toFixed(2) : "0.00",
      s.volume_z != null ? s.volume_z.toFixed(2) : "0.00",
      s.band_hit_days || 0,
      s.new_high_days || 0,
    ]);
    
    const csvContent = [hdrs.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `pvasf_alerts_${asOfDate || new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const effThreshold = threshold ?? scrips[0]?.threshold ?? 60;
  const mediumThreshold = Math.max(10, Math.round(effThreshold * 0.6));

  const riskCards = [
    {
      key: "High",
      label: "High Risk",
      count: scrips.filter((s) => s.risk === "High").length,
      subtitle: `Alert Score ≥ ${effThreshold}`,
      dot: "bg-rose-400",
      activeCardClass: "bg-rose-50/50 border-rose-300 ring-2 ring-rose-400/20 shadow-xs",
      activeBadge: "bg-rose-100/90 text-rose-800 border-rose-200/80",
      activeBar: "bg-rose-400",
      titleColor: "text-rose-900",
    },
    {
      key: "Medium",
      label: "Medium",
      count: scrips.filter((s) => s.risk === "Medium").length,
      subtitle: `Alert Score ${mediumThreshold}–${effThreshold - 1}`,
      dot: "bg-amber-400",
      activeCardClass: "bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/20 shadow-xs",
      activeBadge: "bg-amber-100/90 text-amber-800 border-amber-200/80",
      activeBar: "bg-amber-400",
      titleColor: "text-amber-900",
    },
    {
      key: "Low",
      label: "Low",
      count: scrips.filter((s) => s.risk === "Low").length,
      subtitle: `Alert Score < ${mediumThreshold}`,
      dot: "bg-emerald-400",
      activeCardClass: "bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs",
      activeBadge: "bg-emerald-100/90 text-emerald-800 border-emerald-200/80",
      activeBar: "bg-emerald-400",
      titleColor: "text-emerald-900",
    },
    {
      key: "All",
      label: "All Risks",
      count: scrips.length,
      subtitle: "Total Securities",
      dot: "bg-slate-400",
      activeCardClass: "bg-slate-50 border-slate-300 ring-2 ring-slate-400/20 shadow-xs",
      activeBadge: "bg-slate-200/80 text-slate-800 border-slate-300",
      activeBar: "bg-slate-600",
      titleColor: "text-slate-900",
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white text-slate-900">
      
      {/* ── Risk Summary Cards (Decent Height) ── */}
      <div className="flex-shrink-0 border-b border-slate-200/80 bg-slate-50/40 px-5 py-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {riskCards.map((c) => {
            const isActive = riskTab === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => handleRiskTabChange(c.key)}
                className={cn(
                  "group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer min-h-[88px] sm:min-h-[96px]",
                  isActive
                    ? cn(c.activeCardClass, "shadow-xs")
                    : "bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs hover:-translate-y-0.5"
                )}
              >
                {/* Top Row: Dot + Label + Status Tag */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0 transition-all",
                        isActive ? cn(c.dot, "ring-2 ring-white/80") : "bg-slate-300"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs sm:text-[13px] font-bold tracking-wide uppercase",
                        isActive ? c.titleColor : "text-slate-600 group-hover:text-slate-900"
                      )}
                    >
                      {c.label}
                    </span>
                  </div>
                  {isActive ? (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
                        c.activeBadge
                      )}
                    >
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Filter
                    </span>
                  )}
                </div>

                {/* Bottom Row: Big Number + Subtitle */}
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
                    {c.count}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-500">
                    {c.subtitle}
                  </span>
                </div>

                {/* Bottom subtle active indicator line */}
                {isActive && (
                  <span
                    className={cn(
                      "absolute bottom-0 left-3 right-3 h-0.5 rounded-full",
                      c.activeBar
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Controls Toolbar ── */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50/70 px-5 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2.5 bg-white border border-slate-300/80 rounded-xl px-3.5 h-10 w-72 sm:w-80 shadow-2xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search symbol, company or ISIN..."
                className="w-full bg-transparent border-none outline-none text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Triggers Bar */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider select-none mr-0.5">
                Triggers:
              </span>
              <TriggerPill
                active={filterPriceSpike}
                onClick={() => setFilterPriceSpike(!filterPriceSpike)}
                label="Price ≥ 15%"
                info="Filters for stocks that gained 15% or more over their 6-month baseline price."
              />
              <TriggerPill
                active={filterPriceZ}
                onClick={() => setFilterPriceZ(!filterPriceZ)}
                label="Price Z ≥ 1.65σ"
                info="Filters for stocks whose recent price climb is unusually sharp compared to their normal 6-month history."
              />
              <TriggerPill
                active={filterVolZ}
                onClick={() => setFilterVolZ(!filterVolZ)}
                label="Vol Z ≥ 1.65σ"
                info="Filters for stocks experiencing a sudden volume surge far above their typical daily activity."
              />
              <TriggerPill
                active={filterCircuitHits}
                onClick={() => setFilterCircuitHits(!filterCircuitHits)}
                label="Circuit ≥ 3d"
                info="Filters for stocks that touched or neared their maximum daily price limit on 3 or more days."
              />
              <TriggerPill
                active={filterNewHighs}
                onClick={() => setFilterNewHighs(!filterNewHighs)}
                label="180D Highs ≥ 1"
                info="Filters for stocks that broke past their previous 6-month record high at least once in the past 15 days."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer transition-colors underline underline-offset-2 px-2"
              >
                Reset filters
              </button>
            )}
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="flex-1 overflow-auto bg-slate-50/30">
        <table className="w-full border-collapse" style={{ minWidth: 920 }}>
          <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
            <tr>
              <th
                className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap select-none cursor-pointer hover:text-slate-900 transition-colors sticky left-0 z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]"
                style={{ width: "22%" }}
                onClick={() => handleSort("symbol")}
              >
                <span className="inline-flex items-center gap-1.5">
                  Security
                  <InfoTooltip text="Stock ticker symbol, company name, and ISIN code." />
                  <SortIcon field="symbol" current={sortField} order={sortOrder} />
                </span>
              </th>

              <ThSort
                field="score"
                label="PVASF Score"
                info={`Composite surveillance risk score (0–100) combining price rally, momentum, volume burst, circuit hits, and new 6-month highs. Scores ${effThreshold} and above are shortlisted as High Risk.`}
                width="15%"
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <ThSort
                field="price_rise_pct"
                label="Price Rise %"
                info="Highest price reached in the past 15 days compared to where the stock stood 6 months ago, adjusted for splits or bonus shares."
                width="13%"
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <ThSort
                field="price_z"
                label="Price Z"
                info="Measures how unusual the stock's recent price climb is compared to its normal 6-month fluctuations. Values above 1.65 indicate an abnormal spike."
                width="12%"
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <ThSort
                field="volume_z"
                label="Volume Z"
                info="Measures how unusual the stock's recent trading volume is compared to its normal 6-month turnover. Values above 1.65 indicate a heavy volume surge."
                width="12%"
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <ThSort
                field="band_hit_days"
                label="Circuit Hits"
                info="Number of days in the past 15 sessions where the stock hit or came within 90% of its daily upper circuit limit."
                width="9%"
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <ThSort
                field="new_high_days"
                label="180D Highs"
                info="Number of days in the past 15 sessions where the stock broke past its previous 6-month record to set a fresh high."
                width="9%"
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
              />

              <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap select-none" style={{ width: "8%" }}>
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-slate-200">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 rounded bg-slate-200" style={{ width: j === 0 ? 140 : 64 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : page.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center bg-white border-b border-slate-200">
                  <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <div className="text-slate-700 font-bold text-sm">
                    {asOfDate && (new Date(asOfDate).getDay() === 0 || new Date(asOfDate).getDay() === 6)
                      ? "Weekend Selected (Market Closed)"
                      : "No scrips match filters"}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {asOfDate && (new Date(asOfDate).getDay() === 0 || new Date(asOfDate).getDay() === 6)
                      ? "Selected observation date falls on a weekend non-trading session. Use the date picker above to inspect a preceding trading session."
                      : "Try resetting the search keyword or risk filters"}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 cursor-pointer"
                    >
                      Reset filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              page.map((s) => (
                <tr
                  key={s.symbol}
                  className="transition-colors duration-75 border-b border-slate-200 hover:bg-slate-50/80 bg-white group"
                >
                  {/* Security (Sticky Column) */}
                  <td className="px-5 py-4 sticky left-0 bg-white group-hover:bg-slate-50/90 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                    <div className="flex items-start gap-2.5">
                      <div className={cn("w-2.5 h-2.5 rounded-full mt-1 shrink-0", RISK_DOT[s.risk] || "bg-slate-300")} />
                      <div className="min-w-0">
                        <Link
                          href={`/analysis/${s.symbol}?${new URLSearchParams({
                            ...(asOfDate ? { asOfDate } : {}),
                            ...(windowDays ? { windowDays: String(windowDays) } : {}),
                          }).toString()}`}
                          className="font-bold text-sm text-slate-900 hover:text-blue-600 hover:underline leading-tight transition-colors"
                        >
                          {s.symbol}
                        </Link>
                        <div className="text-xs text-slate-500 truncate max-w-[200px] mt-0.5" title={s.company || s.symbol}>
                          {s.company || s.symbol}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* PVASF Score */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black tabular-nums text-slate-900">{Number(s.score || 0).toFixed(1)}</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            s.risk === "High" ? "bg-rose-500" : s.risk === "Medium" ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min((Number(s.score || 0) / 100) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded leading-tight uppercase tracking-wider",
                        s.risk === "High"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : s.risk === "Medium"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      )}
                    >
                      {s.risk}
                    </span>
                  </td>

                  {/* Price Rise */}
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {Number(s.price_rise_pct || 0) > 0 ? "+" : ""}
                      {Number(s.price_rise_pct || 0).toFixed(1)}%
                    </span>
                  </td>

                  {/* Price Z */}
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {Number(s.price_z || 0).toFixed(2)}σ
                    </span>
                  </td>

                  {/* Volume Z */}
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {Number(s.volume_z || 0).toFixed(2)}σ
                    </span>
                  </td>

                  {/* Circuit Hits */}
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {s.band_hit_days}
                    </span>
                    <span className="text-xs text-slate-500 font-normal ml-1">days</span>
                  </td>

                  {/* 180D Highs */}
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {s.new_high_days}
                    </span>
                    <span className="text-xs text-slate-500 font-normal ml-1">days</span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/analysis/${s.symbol}?${new URLSearchParams({
                        ...(asOfDate ? { asOfDate } : {}),
                        ...(windowDays ? { windowDays: String(windowDays) } : {}),
                      }).toString()}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Analyze</span>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 px-5 py-2.5 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-slate-900 font-bold">{total > 0 ? startIdx + 1 : 0}–{endIdx}</strong> of{" "}
            <strong className="text-slate-900 font-bold">{total}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1.5">
            Rows per page:
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white border border-slate-300 text-slate-800 font-semibold rounded-md px-2 py-0.5 text-xs outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={0}>All</option>
            </select>
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <strong className="text-slate-700">{scrips.filter((r) => r.risk === "High").length}</strong> High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <strong className="text-slate-700">{scrips.filter((r) => r.risk === "Medium").length}</strong> Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <strong className="text-slate-700">{scrips.filter((r) => r.risk === "Low").length}</strong> Low
          </span>
        </div>

        {pageSize > 0 && totalPages > 1 ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-1 mx-1">
              {pageNums(currentPage, totalPages).map((p, i) =>
                typeof p === "number" ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={cn(
                      "h-6 min-w-[24px] px-1.5 rounded-md text-xs font-bold transition-all border",
                      currentPage === p
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {p}
                  </button>
                ) : (
                  <span key={i} className="px-0.5 text-slate-400 text-xs">
                    …
                  </span>
                )
              )}
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { InfoTooltip } from "@/components/ui/info-tooltip";

function SortIcon({ field, current, order }: { field: string; current: string; order: SortOrder }) {
  if (field !== current) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return order === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
  );
}

function ThSort({
  field,
  label,
  info,
  width,
  sortField,
  sortOrder,
  onSort,
}: {
  field: SortField;
  label: string;
  info?: string;
  width?: string;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap select-none cursor-pointer hover:text-slate-900 transition-colors"
      style={{ width }}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        {info && <InfoTooltip text={info} />}
        <SortIcon field={field} current={sortField} order={sortOrder} />
      </span>
    </th>
  );
}

function TriggerPill({
  active,
  onClick,
  label,
  info,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  info?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "px-2.5 py-1 rounded-md border text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
          active
            ? "bg-slate-900 border-slate-900 text-white font-semibold shadow-xs"
            : "bg-white border-slate-300/80 text-slate-600 hover:border-slate-400 hover:text-slate-800"
        )}
      >
        {label}
      </button>
      {info && <InfoTooltip text={info} />}
    </div>
  );
}
