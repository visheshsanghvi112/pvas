"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, SlidersHorizontal, RefreshCw, BarChart2, CheckCircle, PieChart, Activity } from "lucide-react";
import { AlertsTable } from "@/components/dashboard/alerts-table";
import { ScoreDistributionChart, RiskDonut } from "@/components/investigation/charts";
import { fetchWatchlist, type ScripSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [scrips, setScrips] = useState<ScripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>("All");

  const loadData = async () => {
    setLoading(true);
    const data = await fetchWatchlist();
    setScrips(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = (symbol: string, newStatus: "Open" | "Under review" | "Closed") => {
    setScrips((prev) =>
      prev.map((s) => (s.symbol === symbol ? { ...s, status: newStatus } : s))
    );
  };

  const highRiskCount = scrips.filter((s) => s.risk === "High").length;
  const medRiskCount = scrips.filter((s) => s.risk === "Medium").length;
  const lowRiskCount = scrips.filter((s) => s.risk === "Low").length;

  return (
    <div className="mx-auto w-full max-w-[1600px] flex flex-col gap-2 h-[calc(100vh-4rem)]">
      {/* Dense Market Overview Strip */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-blue-700 font-bold uppercase tracking-widest text-[10px]">
            <Activity className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
            Market Surveillance Command Center
          </div>
          <div className="h-4 w-px bg-slate-300"></div>
          <div className="flex gap-4 text-xs font-mono items-center">
            <div>Total EOD Scrips: <strong className="text-slate-900">{loading ? "..." : scrips.length}</strong></div>
            <div className="flex items-center gap-1 text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
              High Risk: <strong className="font-black">{loading ? "..." : highRiskCount}</strong>
            </div>
            <div className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">
              Med Risk: <strong className="font-bold">{loading ? "..." : medRiskCount}</strong>
            </div>
            <div className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
              Normal: <strong>{loading ? "..." : lowRiskCount}</strong>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Engine: <span className="text-slate-700 font-bold">Teradata DWBIS</span></span>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase bg-slate-900 text-white px-2.5 py-1 rounded hover:bg-blue-700 transition-colors shadow-xs"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Sync Data
          </button>
        </div>
      </div>

      {/* Main Grid: Alerts Table & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-2 flex-1 min-h-0">
        
        {/* Left Column: Watchlist Data Grid */}
        <div className="flex flex-col bg-white border border-slate-200 rounded shadow-sm overflow-hidden min-h-0">
          <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between shrink-0">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              Surveillance Watchlist
            </div>
            {/* Risk Filters */}
            <div className="flex bg-white rounded border border-slate-200 overflow-hidden text-[10px] font-bold">
              {["All", "High", "Medium", "Low"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRiskFilter(r)}
                  className={cn(
                    "px-2 py-0.5 border-r border-slate-200 last:border-0 hover:bg-slate-50 uppercase",
                    riskFilter === r ? "bg-blue-50 text-blue-700" : "text-slate-500"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            <AlertsTable
              scrips={scrips}
              onStatusChange={handleStatusChange}
              selectedRiskFilter={riskFilter}
            />
          </div>
        </div>

        {/* Right Column: Risk Heatmap / Analytics */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="bg-white border border-slate-200 rounded shadow-sm flex flex-col flex-1 min-h-0">
            <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <BarChart2 className="h-3 w-3 text-blue-600" />
              Score Distribution
            </div>
            <div className="p-3 flex-1 min-h-0 overflow-hidden">
              <ScoreDistributionChart scrips={scrips} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded shadow-sm flex flex-col flex-1 min-h-0">
            <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <PieChart className="h-3 w-3 text-rose-600" />
              Risk Heatmap
            </div>
            <div className="p-3 flex-1 min-h-0 flex items-center justify-center">
              <RiskDonut scrips={scrips} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
