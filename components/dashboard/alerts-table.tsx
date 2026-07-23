"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Search, Eye, GitCompare } from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricHelp } from "@/components/ui/metric-help";
import { cn } from "@/lib/utils";
import type { ScripSummary } from "@/lib/api";

type SortField = "score" | "price_rise_pct" | "volume_z" | "symbol" | "band_hit_days";
type SortOrder = "asc" | "desc";

interface AlertsTableProps {
  scrips: ScripSummary[];
  onStatusChange?: (symbol: string, newStatus: "Open" | "Under review" | "Closed") => void;
  selectedRiskFilter?: string;
  onSelectRiskFilter?: (risk: string) => void;
}

export function AlertsTable({
  scrips,
  onStatusChange,
  selectedRiskFilter = "All",
  onSelectRiskFilter
}: AlertsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Filtering
  const filtered = scrips.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.company && s.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.isin && s.isin.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRisk = selectedRiskFilter === "All" || s.risk === selectedRiskFilter;
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;

    return matchesSearch && matchesRisk && matchesStatus;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField] ?? 0;
    let valB = b[sortField] ?? 0;
    if (typeof valA === "string") {
      valA = (valA as string).toLowerCase();
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

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter table by symbol, ISIN, company..."
            className="h-9 pl-9 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {/* Status Filter Pills */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs">
            {["All", "Open", "Under review", "Closed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-semibold transition-colors",
                  statusFilter === st ? "bg-white text-slate-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Risk Filter Pills */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs">
            {["All", "High", "Medium", "Low"].map((rk) => (
              <button
                key={rk}
                onClick={() => onSelectRiskFilter && onSelectRiskFilter(rk)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-semibold transition-colors",
                  selectedRiskFilter === rk ? "bg-white text-slate-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {rk}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="space-y-3 md:hidden">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm">
            No surveillance alerts matched your search and filter criteria.
          </div>
        ) : (
          sorted.map((alert) => (
            <article key={alert.symbol} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/investigations/${alert.symbol}`} className="text-base font-bold text-slate-900 transition-colors hover:text-blue-600">
                    {alert.symbol}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{alert.company || "Listed Scrip"}</p>
                </div>
                <RiskBadge risk={alert.risk} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 font-mono text-xs">
                <div><div className="text-[10px] font-sans font-semibold text-slate-500">Score</div><div className="mt-1 text-base font-extrabold text-slate-900">{alert.score}<span className="text-[10px] text-slate-400">/100</span></div></div>
                <div><div className="text-[10px] font-sans font-semibold text-slate-500">Price rise</div><div className="mt-1 text-base font-bold text-rose-600">↑ {alert.price_rise_pct}%</div></div>
                <div><div className="text-[10px] font-sans font-semibold text-slate-500">Volume Z</div><div className="mt-1 text-base font-bold text-amber-700">{alert.volume_z}σ</div></div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <select
                  value={alert.status}
                  onChange={(e) => onStatusChange?.(alert.symbol, e.target.value as "Open" | "Under review" | "Closed")}
                  className={cn("min-w-0 rounded-lg border px-2 py-1.5 text-xs font-semibold outline-none", alert.status === "Open" ? "border-rose-200 bg-rose-50 text-rose-700" : alert.status === "Under review" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}
                >
                  <option value="Open">Open</option><option value="Under review">Under review</option><option value="Closed">Closed</option>
                </select>
                <div className="flex items-center gap-1.5">
                  <Button asChild variant="outline" className="h-8 px-2.5 text-xs"><Link href={`/investigations/${alert.symbol}`}><Eye className="mr-1 h-3.5 w-3.5 text-blue-600" />Analyse</Link></Button>
                  <Button asChild variant="ghost" className="h-8 px-2"><Link href="/compare" aria-label={`Compare ${alert.symbol}`}><GitCompare className="h-3.5 w-3.5" /></Link></Button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-[700px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 cursor-pointer hover:text-slate-900" onClick={() => handleSort("symbol")}>
                <div className="flex items-center gap-1.5">
                  Scrip & Security
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-4 cursor-pointer hover:text-slate-900" onClick={() => handleSort("score")}>
                <div className="flex items-center gap-1">
                  Risk Score <MetricHelp helpKey="compositeScore" />
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-4 cursor-pointer hover:text-slate-900" onClick={() => handleSort("price_rise_pct")}>
                <div className="flex items-center gap-1">
                  Price Rise % <MetricHelp helpKey="priceRise" />
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-4 cursor-pointer hover:text-slate-900" onClick={() => handleSort("volume_z")}>
                <div className="flex items-center gap-1">
                  Vol Z <MetricHelp helpKey="volumeZ" />
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-4 cursor-pointer hover:text-slate-900" onClick={() => handleSort("band_hit_days")}>
                <div className="flex items-center gap-1">
                  Band Hits <MetricHelp helpKey="bandPersistence" />
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Risk Level</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-xs">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-slate-500 font-sans">
                  No surveillance alerts matched your search and filter criteria.
                </td>
              </tr>
            ) : (
              sorted.map((alert) => (
                <tr key={alert.symbol} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-4 py-4 font-sans">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/investigations/${alert.symbol}`}
                        className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1"
                      >
                        {alert.symbol}
                      </Link>
                    </div>
                    <div className="text-xs text-slate-500 font-sans">{alert.company || "Listed Scrip"}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900">{alert.score}</span>
                      <span className="text-[10px] text-slate-400">/100</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-bold text-rose-600">
                    ↑ {alert.price_rise_pct}%
                  </td>
                  <td className="px-4 py-4 font-bold text-amber-700">
                    {alert.volume_z}σ
                  </td>
                  <td className="px-4 py-4 font-bold text-blue-700">
                    {alert.band_hit_days}d
                  </td>
                  <td className="px-4 py-4 font-sans">
                    <select
                      value={alert.status}
                      onChange={(e) =>
                        onStatusChange &&
                        onStatusChange(alert.symbol, e.target.value as "Open" | "Under review" | "Closed")
                      }
                      className={cn(
                        "rounded-lg border px-2 py-1 text-xs font-semibold outline-none cursor-pointer",
                        alert.status === "Open"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : alert.status === "Under review"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}
                    >
                      <option value="Open">Open</option>
                      <option value="Under review">Under review</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 font-sans">
                    <RiskBadge risk={alert.risk} />
                  </td>
                  <td className="px-4 py-4 text-right font-sans">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button asChild variant="outline" className="h-8 px-2.5 text-xs gap-1 border-slate-200 hover:bg-slate-100">
                        <Link href={`/investigations/${alert.symbol}`}>
                          <Eye className="h-3.5 w-3.5 text-blue-600" />
                          Analyse
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" className="h-8 px-2 text-xs text-slate-600 hover:bg-slate-100">
                        <Link href={`/compare`}>
                          <GitCompare className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
