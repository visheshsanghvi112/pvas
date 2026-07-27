"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Search, Eye, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScripSummary } from "@/lib/api";

type SortField = "score" | "price_rise_pct" | "price_z" | "volume_z" | "symbol" | "band_hit_days" | "new_high_days";
type SortOrder = "asc" | "desc";

interface AlertsTableProps {
  scrips: ScripSummary[];
  onStatusChange?: (symbol: string, newStatus: "Open" | "Under review" | "Closed") => void;
  selectedRiskFilter?: string;
}

export function AlertsTable({
  scrips,
  onStatusChange,
  selectedRiskFilter = "All",
}: AlertsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Filtering
  const filtered = scrips.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.company && s.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.isin && s.isin.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRisk = selectedRiskFilter === "All" || s.risk === selectedRiskFilter;

    return matchesSearch && matchesRisk;
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
    <div className="flex flex-col h-full bg-white">
      {/* Quick Search */}
      <div className="flex items-center px-2 py-1.5 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
        <Search className="h-3 w-3 text-slate-400 mr-2" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by symbol, ISIN, company..."
          className="bg-transparent border-none outline-none text-xs w-full text-slate-900 placeholder:text-slate-400 font-mono"
        />
      </div>

      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-7 z-10 shadow-sm border-b border-slate-200">
          <tr>
            <th className="px-3 py-1.5 cursor-pointer hover:text-slate-900 w-[200px]" onClick={() => handleSort("symbol")}>
              <div className="flex items-center gap-1">
                Scrip &amp; Security <ArrowUpDown className="h-2.5 w-2.5" />
              </div>
            </th>
            <th className="px-3 py-1.5 cursor-pointer hover:text-slate-900" onClick={() => handleSort("score")}>
              <div className="flex items-center gap-1">
                Score <ArrowUpDown className="h-2.5 w-2.5" />
              </div>
            </th>
            <th className="px-3 py-1.5 cursor-pointer hover:text-slate-900" onClick={() => handleSort("price_rise_pct")}>
              <div className="flex items-center gap-1">
                Price Rise % <ArrowUpDown className="h-2.5 w-2.5" />
              </div>
            </th>
            <th className="px-3 py-1.5 cursor-pointer hover:text-slate-900" onClick={() => handleSort("price_z")}>
              <div className="flex items-center gap-1">
                Price Z <ArrowUpDown className="h-2.5 w-2.5" />
              </div>
            </th>
            <th className="px-3 py-1.5 cursor-pointer hover:text-slate-900" onClick={() => handleSort("volume_z")}>
              <div className="flex items-center gap-1">
                Vol Z <ArrowUpDown className="h-2.5 w-2.5" />
              </div>
            </th>
            <th className="px-3 py-1.5 cursor-pointer hover:text-slate-900" onClick={() => handleSort("band_hit_days")}>
              <div className="flex items-center gap-1">
                Band Hits <ArrowUpDown className="h-2.5 w-2.5" />
              </div>
            </th>
            <th className="px-3 py-1.5 cursor-pointer hover:text-slate-900" onClick={() => handleSort("new_high_days")}>
              <div className="flex items-center gap-1">
                New Highs <ArrowUpDown className="h-2.5 w-2.5" />
              </div>
            </th>
            <th className="px-3 py-1.5">Status</th>
            <th className="px-3 py-1.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-slate-500 font-sans text-xs">
                No surveillance alerts matched.
              </td>
            </tr>
          ) : (
            sorted.map((alert) => (
              <tr key={alert.symbol} className={cn(
                "transition-colors group border-b border-slate-100",
                alert.risk === "High" ? "hover:bg-rose-50/60 bg-rose-50/20" : alert.risk === "Medium" ? "hover:bg-amber-50/60" : "hover:bg-blue-50/50"
              )}>
                <td className="px-3 py-2 font-sans">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0 shadow-xs",
                      alert.risk === "High" ? "bg-rose-600 animate-pulse" : alert.risk === "Medium" ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                    <div>
                      <Link
                        href={`/investigations/${alert.symbol}`}
                        className="font-bold text-sm text-blue-700 hover:underline hover:text-blue-900"
                      >
                        {alert.symbol}
                      </Link>
                      <div className="text-[10px] text-slate-500 truncate max-w-[150px]" title={alert.company || alert.isin}>
                        {alert.company || alert.isin || "Listed Scrip"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "font-extrabold text-sm font-mono w-10 text-right",
                      alert.score >= 75 ? "text-rose-600" : alert.score >= 60 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {alert.score}
                    </div>
                    <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                      <div
                        className={cn(
                          "h-1.5 rounded-full",
                          alert.score >= 75 ? "bg-rose-600" : alert.score >= 60 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(alert.score, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="text-rose-600 font-bold">↑ {alert.price_rise_pct}%</div>
                  <div className="text-[10px] text-slate-400 font-mono">15D vs T-180</div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="font-bold text-violet-700">{alert.price_z.toFixed(2)}σ</div>
                  <div className="text-[10px] text-slate-400 font-mono">Price Z</div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="text-amber-700 font-bold">{alert.volume_z.toFixed(2)}σ</div>
                  <div className="text-[10px] text-slate-400 font-mono">Vol Z</div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="text-blue-700 font-bold">{alert.band_hit_days}d</div>
                  <div className="text-[10px] text-slate-400 font-mono">Upper Circuit</div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="text-teal-700 font-bold">{alert.new_high_days}d</div>
                  <div className="text-[10px] text-slate-400 font-mono">180D High</div>
                </td>
                <td className="px-3 py-1.5">
                  <select
                    value={alert.status}
                    onChange={(e) =>
                      onStatusChange &&
                      onStatusChange(alert.symbol, e.target.value as "Open" | "Under review" | "Closed")
                    }
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer",
                      alert.status === "Open"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : alert.status === "Under review"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    )}
                  >
                    <option value="Open">OPEN</option>
                    <option value="Under review">REVIEW</option>
                    <option value="Closed">CLOSED</option>
                  </select>
                </td>
                <td className="px-3 py-1.5 text-right font-sans">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/investigations/${alert.symbol}`} className="p-1 hover:bg-slate-200 rounded text-blue-700" title="Analyse Workspace">
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <Link href={`/compare`} className="p-1 hover:bg-slate-200 rounded text-slate-600" title="Compare">
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
  );
}
