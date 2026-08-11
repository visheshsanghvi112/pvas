"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  GitCompare,
  Search,
  X,
  Filter,
  Download,
  ShieldAlert,
  Zap,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScripSummary } from "@/lib/api";

type SortField =
  | "score"
  | "price_rise_pct"
  | "price_z"
  | "volume_z"
  | "symbol"
  | "band_hit_days"
  | "new_high_days";
type SortOrder = "asc" | "desc";

interface AlertsTableProps {
  scrips: ScripSummary[];
  onStatusChange?: (symbol: string, newStatus: "Open" | "Under review" | "Closed") => void;
  selectedRiskFilter?: string;
  onRiskFilterChange?: (newFilter: string) => void;
  loading?: boolean;
}

const riskColors: Record<string, string> = {
  High: "bg-rose-100 text-rose-800 border-rose-200",
  Medium: "bg-amber-100 text-amber-800 border-amber-200",
  Low: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const riskDot: Record<string, string> = {
  High: "bg-rose-500 risk-high-dot",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
};

function SortIcon({ field, current, order }: { field: string; current: string; order: SortOrder }) {
  if (field !== current) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return order === "asc"
    ? <ArrowUp className="h-3 w-3 text-blue-500" />
    : <ArrowDown className="h-3 w-3 text-blue-500" />;
}

export function AlertsTable({
  scrips,
  onStatusChange,
  selectedRiskFilter = "All",
  onRiskFilterChange,
  loading = false,
}: AlertsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Filters State
  const [riskTab, setRiskTab] = useState<string>(selectedRiskFilter);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [filterPriceSpike, setFilterPriceSpike] = useState(false);
  const [filterPriceZ, setFilterPriceZ] = useState(false);
  const [filterVolZ, setFilterVolZ] = useState(false);
  const [filterCircuitHits, setFilterCircuitHits] = useState(false);
  const [filterNewHighs, setFilterNewHighs] = useState(false);

  // Sync riskTab with parent prop when parent changes
  useEffect(() => {
    setRiskTab(selectedRiskFilter);
  }, [selectedRiskFilter]);

  const handleRiskTabChange = (level: string) => {
    setRiskTab(level);
    if (onRiskFilterChange) {
      onRiskFilterChange(level);
    }
  };

  const filtered = scrips.filter((s) => {
    // 1. Full-text search
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.company && s.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.isin && s.isin.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Risk filter
    const matchesRisk = riskTab === "All" || s.risk === riskTab;

    // 3. Case status filter
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;

    // 4. Anomaly criteria filters
    const matchesPriceSpike = !filterPriceSpike || s.price_rise_pct >= 15;
    const matchesPriceZ = !filterPriceZ || s.price_z >= 1.645;
    const matchesVolZ = !filterVolZ || s.volume_z >= 1.645;
    const matchesCircuit = !filterCircuitHits || s.band_hit_days >= 3;
    const matchesHighs = !filterNewHighs || s.new_high_days >= 1;

    return (
      matchesSearch &&
      matchesRisk &&
      matchesStatus &&
      matchesPriceSpike &&
      matchesPriceZ &&
      matchesVolZ &&
      matchesCircuit &&
      matchesHighs
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA: string | number = a[sortField] ?? 0;
    let valB: string | number = b[sortField] ?? 0;
    if (typeof valA === "string") {
      valA = valA.toLowerCase();
      valB = (valB as string).toLowerCase();
    }
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    handleRiskTabChange("All");
    setStatusFilter("All");
    setFilterPriceSpike(false);
    setFilterPriceZ(false);
    setFilterVolZ(false);
    setFilterCircuitHits(false);
    setFilterNewHighs(false);
  };

  const exportCSV = () => {
    const headers = [
      "Symbol",
      "Company",
      "ISIN",
      "Risk",
      "PVASF_Score",
      "Price_Rise_Pct",
      "Price_Z_Score",
      "Volume_Z_Score",
      "Circuit_Hit_Days",
      "New_180D_Highs",
      "Status",
    ];

    const rows = sorted.map((s) => [
      s.symbol,
      `"${s.company || s.symbol}"`,
      s.isin || "",
      s.risk,
      s.score,
      s.price_rise_pct.toFixed(2),
      s.price_z.toFixed(2),
      s.volume_z.toFixed(2),
      s.band_hit_days,
      s.new_high_days,
      s.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `pvasf_surveillance_alerts_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ThCell = ({
    field,
    label,
    align = "left",
    minWidth,
  }: {
    field: SortField;
    label: string;
    align?: "left" | "right";
    minWidth?: number;
  }) => (
    <th
      className={cn(
        "px-4 py-3 cursor-pointer select-none whitespace-nowrap group",
        align === "right" && "text-right"
      )}
      style={minWidth ? { minWidth } : undefined}
      onClick={() => handleSort(field)}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors",
          align === "right" && "justify-end"
        )}
      >
        {label}
        <SortIcon field={field} current={sortField} order={sortOrder} />
      </div>
    </th>
  );

  const hasActiveFilters =
    searchTerm ||
    riskTab !== "All" ||
    statusFilter !== "All" ||
    filterPriceSpike ||
    filterPriceZ ||
    filterVolZ ||
    filterCircuitHits ||
    filterNewHighs;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* ── Top Fixed Control Panel ── */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
        {/* Row 1: Search + Risk Level Tabs + Export */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 w-full sm:w-80 shadow-xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search symbol, company name or ISIN..."
              className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Risk Level Segmented Buttons */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium text-slate-600">
            {["All", "High", "Medium", "Low"].map((level) => (
              <button
                key={level}
                onClick={() => handleRiskTabChange(level)}
                className={cn(
                  "px-3 py-1 rounded-md transition-all cursor-pointer",
                  riskTab === level
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "hover:text-slate-900"
                )}
              >
                {level === "All" ? "All Risk Levels" : `${level} Risk`}
              </button>
            ))}
          </div>

          {/* Actions: Export CSV + Reset */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> Reset Filters
              </button>
            )}
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors shadow-xs cursor-pointer"
              title="Export compliance alert report as CSV"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Row 2: Anomaly Filter Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
              <Filter className="h-3 w-3" /> Anomaly Triggers:
            </span>

            <button
              onClick={() => setFilterPriceSpike(!filterPriceSpike)}
              className={cn(
                "px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 cursor-pointer",
                filterPriceSpike
                  ? "bg-slate-900 border-slate-900 text-white font-semibold shadow-xs"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <TrendingUp className="h-3 w-3 text-slate-400" /> Price Spike ≥ 15%
            </button>

            <button
              onClick={() => setFilterPriceZ(!filterPriceZ)}
              className={cn(
                "px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 cursor-pointer",
                filterPriceZ
                  ? "bg-slate-900 border-slate-900 text-white font-semibold shadow-xs"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Zap className="h-3 w-3 text-slate-400" /> Price Z ≥ 1.65σ
            </button>

            <button
              onClick={() => setFilterVolZ(!filterVolZ)}
              className={cn(
                "px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 cursor-pointer",
                filterVolZ
                  ? "bg-slate-900 border-slate-900 text-white font-semibold shadow-xs"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <BarChart2 className="h-3 w-3 text-slate-400" /> Volume Z ≥ 1.65σ
            </button>

            <button
              onClick={() => setFilterCircuitHits(!filterCircuitHits)}
              className={cn(
                "px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 cursor-pointer",
                filterCircuitHits
                  ? "bg-slate-900 border-slate-900 text-white font-semibold shadow-xs"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <ShieldAlert className="h-3 w-3 text-slate-400" /> Circuit Hits ≥ 3d
            </button>

            <button
              onClick={() => setFilterNewHighs(!filterNewHighs)}
              className={cn(
                "px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 cursor-pointer",
                filterNewHighs
                  ? "bg-slate-900 border-slate-900 text-white font-semibold shadow-xs"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <CheckCircle2 className="h-3 w-3 text-slate-400" /> 180D Breakouts ≥ 1d
            </button>
          </div>

          {/* Status Dropdown Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium text-xs">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 rounded-md px-2 py-1 outline-none text-xs font-semibold cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Under review">Under Review</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table Scroll Container (Single Scroll Container) ── */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full border-collapse" style={{ minWidth: 960 }}>
          <thead className="sticky top-0 z-20 shadow-2xs">
            <tr className="bg-slate-50/95 backdrop-blur-xs text-slate-700 text-xs font-bold border-y border-slate-200">
              <th className="px-4 py-3 text-left sticky left-0 bg-slate-50 z-30 shadow-[1px_0_0_0_#e2e8f0]" style={{ minWidth: 200 }}>
                <div
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort("symbol")}
                >
                  Security Master
                  <SortIcon field="symbol" current={sortField} order={sortOrder} />
                </div>
              </th>
              <ThCell field="score" label="PVASF Score" minWidth={120} />
              <ThCell field="price_rise_pct" label="Price Rise %" minWidth={115} />
              <ThCell field="price_z" label="Price Z-Score" minWidth={115} />
              <ThCell field="volume_z" label="Volume Z-Score" minWidth={120} />
              <ThCell field="band_hit_days" label="Circuit Hits" minWidth={100} />
              <ThCell field="new_high_days" label="180D New Highs" minWidth={120} />
              <th className="px-4 py-3 text-xs font-bold text-slate-700" style={{ minWidth: 110 }}>
                Case Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-700" style={{ minWidth: 120 }}>
                Action Workspace
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 animate-pulse">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className={cn("px-4 py-3.5", j === 0 && "sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e2e8f0]")}>
                      <div className="h-4 bg-slate-100 rounded" style={{ width: j === 0 ? 120 : 60 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <div className="text-slate-600 font-semibold text-sm">No scrips match the active surveillance filter criteria.</div>
                  <p className="text-xs text-slate-400 mt-1">Try resetting the anomaly triggers or clearing the search text.</p>
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                    >
                      <X className="h-3 w-3" /> Reset All Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              sorted.map((alert, idx) => (
                <tr
                  key={alert.symbol}
                  className={cn(
                    "border-b border-slate-100 transition-colors hover:bg-slate-50/80",
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  )}
                >
                  {/* Security Master */}
                  <td className={cn("px-4 py-3.5 sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0]", idx % 2 === 0 ? "bg-white" : "bg-slate-50/90")}>
                    <div className="flex items-center gap-2.5">
                      <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", riskDot[alert.risk] || "bg-slate-300")} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/analysis/${alert.symbol}`}
                            className="font-bold text-sm text-blue-700 hover:text-blue-900 hover:underline tracking-tight"
                          >
                            {alert.symbol}
                          </Link>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            EQ
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-500 truncate max-w-[180px] mt-0.5" title={`${alert.company || alert.symbol} (${alert.isin || ''})`}>
                          {alert.company || `${alert.symbol} Ltd`}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* PVASF Score */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-bold w-7 text-right tabular-nums",
                        alert.score >= 15 ? "text-rose-600" : alert.score >= 10 ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {alert.score}
                      </span>
                      <div className="flex-1 w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            alert.score >= 15 ? "bg-rose-500" : alert.score >= 10 ? "bg-amber-400" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min((alert.score / 100) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className={cn(
                      "inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                      riskColors[alert.risk] || "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      {alert.risk} Risk
                    </div>
                  </td>

                  {/* Price Rise % */}
                  <td className="px-4 py-3.5">
                    <div className={cn(
                      "text-sm font-bold tabular-nums",
                      alert.price_rise_pct >= 15 ? "text-rose-600" : alert.price_rise_pct > 0 ? "text-slate-800" : "text-emerald-600"
                    )}>
                      {alert.price_rise_pct > 0 ? "+" : ""}{alert.price_rise_pct.toFixed(1)}%
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">vs T‑180 Baseline</div>
                  </td>

                  {/* Price Z */}
                  <td className="px-4 py-3.5">
                    <div className="text-sm font-bold tabular-nums text-slate-800 font-mono">
                      {alert.price_z.toFixed(2)}σ
                    </div>
                    <div className="text-[11px] mt-0.5 font-medium">
                      {alert.price_z >= 1.645 ? (
                        <span className="text-rose-600 font-semibold">⚠ Significant</span>
                      ) : (
                        <span className="text-slate-400">Normal</span>
                      )}
                    </div>
                  </td>

                  {/* Volume Z */}
                  <td className="px-4 py-3.5">
                    <div className="text-sm font-bold tabular-nums text-slate-800 font-mono">
                      {alert.volume_z.toFixed(2)}σ
                    </div>
                    <div className="text-[11px] mt-0.5 font-medium">
                      {alert.volume_z >= 1.645 ? (
                        <span className="text-rose-600 font-semibold">⚠ Surge</span>
                      ) : (
                        <span className="text-slate-400">Normal</span>
                      )}
                    </div>
                  </td>

                  {/* Circuit Hits */}
                  <td className="px-4 py-3.5">
                    <div className="text-sm font-bold tabular-nums text-slate-800 font-mono">
                      {alert.band_hit_days} {alert.band_hit_days === 1 ? "day" : "days"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">≥90% Band</div>
                  </td>

                  {/* New Highs */}
                  <td className="px-4 py-3.5">
                    <div className="text-sm font-bold tabular-nums text-slate-800 font-mono">
                      {alert.new_high_days} {alert.new_high_days === 1 ? "day" : "days"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">180D Breakout</div>
                  </td>

                  {/* Status Dropdown */}
                  <td className="px-4 py-3.5">
                    <select
                      value={alert.status}
                      onChange={(e) =>
                        onStatusChange &&
                        onStatusChange(alert.symbol, e.target.value as "Open" | "Under review" | "Closed")
                      }
                      className={cn(
                        "rounded-lg border text-xs font-semibold px-2.5 py-1.5 outline-none cursor-pointer transition-colors",
                        alert.status === "Open"
                          ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                          : alert.status === "Under review"
                          ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      )}
                    >
                      <option value="Open">Open</option>
                      <option value="Under review">Under Review</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>

                  {/* Action Buttons */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/analysis/${alert.symbol}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-extrabold text-xs hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-2xs group-hover:border-slate-300"
                        title="Open Scrip Analysis Workspace"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Analyze Scrip
                      </Link>
                      <Link
                        href="/compare"
                        className="flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                        title="Compare Scrip"
                      >
                        <GitCompare className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Table Footer Fixed Bar ── */}
      <div className="flex-shrink-0 px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <span className="font-bold text-slate-800">{sorted.length}</span> of <span className="font-bold text-slate-800">{scrips.length}</span> security alerts
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-rose-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> High Risk: {sorted.filter(s => s.risk === "High").length}
          </span>
          <span className="flex items-center gap-1 text-amber-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Medium Risk: {sorted.filter(s => s.risk === "Medium").length}
          </span>
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal: {sorted.filter(s => s.risk === "Low").length}
          </span>
        </div>
      </div>
    </div>
  );
}
