"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, SlidersHorizontal, RefreshCw, BarChart2, CheckCircle, PieChart, Activity, TrendingUp } from "lucide-react";
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
    <div className="mx-auto w-full max-w-[1600px] flex flex-col gap-2.5 p-2 sm:p-4 lg:h-[calc(100vh-4.5rem)] min-h-0">
      {/* Dense Market Overview Strip */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 pb-2 px-1 gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 text-blue-700 font-bold uppercase tracking-widest text-[10px] shrink-0">
            <Activity className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
            <span className="hidden sm:inline">Market Surveillance Command Center</span>
            <span className="sm:hidden">Command Center</span>
          </div>
          <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
          <div className="flex flex-wrap gap-2 text-xs font-mono items-center">
            <div className="text-[11px] text-slate-600">Scrips: <strong className="text-slate-900">{loading ? "..." : scrips.length}</strong></div>
            <div className="flex items-center gap-1 text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
              High: <strong className="font-black">{loading ? "..." : highRiskCount}</strong>
            </div>
            <div className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px]">
              Med: <strong className="font-bold">{loading ? "..." : medRiskCount}</strong>
            </div>
            <div className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
              Normal: <strong>{loading ? "..." : lowRiskCount}</strong>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between w-full md:w-auto gap-3 shrink-0">
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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px] gap-3 flex-1 min-h-0">
        
        {/* Left Column: Watchlist Data Grid */}
        <div className="flex flex-col bg-white border border-slate-200 rounded shadow-sm overflow-hidden min-h-[400px] lg:min-h-0">
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
          <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
            <AlertsTable
              scrips={scrips}
              onStatusChange={handleStatusChange}
              selectedRiskFilter={riskFilter}
            />
          </div>
        </div>

        {/* Right Column: Executive Surveillance KPI Cards & Anomaly Highlights */}
        <div className="flex flex-col gap-2.5 min-h-0 overflow-y-auto pr-0.5">
          
          {/* KPI Card 1: Risk Severity & Watchlist Summary */}
          <div className="bg-white border border-slate-200 rounded shadow-xs p-3 space-y-2.5">
            <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
                Alert Risk Breakdown
              </span>
              <span className="text-[9px] font-mono text-slate-400">PVASF v2.4</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-rose-50/70 border border-rose-200 rounded p-2 text-center">
                <div className="text-[9px] font-bold uppercase text-rose-700">High Risk</div>
                <div className="text-lg font-black text-rose-700 font-mono mt-0.5">{loading ? "..." : highRiskCount}</div>
                <div className="text-[8px] font-mono text-rose-500">score ≥75</div>
              </div>
              <div className="bg-amber-50/70 border border-amber-200 rounded p-2 text-center">
                <div className="text-[9px] font-bold uppercase text-amber-700">Med Risk</div>
                <div className="text-lg font-black text-amber-700 font-mono mt-0.5">{loading ? "..." : medRiskCount}</div>
                <div className="text-[8px] font-mono text-amber-500">60 - 74</div>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded p-2 text-center">
                <div className="text-[9px] font-bold uppercase text-emerald-700">Normal</div>
                <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">{loading ? "..." : lowRiskCount}</div>
                <div className="text-[8px] font-mono text-emerald-500">&lt;60</div>
              </div>
            </div>
          </div>

          {/* KPI Card 2: Anomaly Mover Highlights */}
          <div className="bg-white border border-slate-200 rounded shadow-xs p-3 space-y-2.5">
            <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
              Anomaly Highlights (15D Window)
            </div>

            {loading || scrips.length === 0 ? (
              <div className="text-[10px] text-slate-400 font-mono py-2">Loading highlights…</div>
            ) : (
              <div className="space-y-2 text-xs">
                {/* Max Price Rise */}
                {(() => {
                  const maxRise = [...scrips].sort((a, b) => b.price_rise_pct - a.price_rise_pct)[0];
                  return maxRise ? (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2">
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Max Price Rise (vs T-180)</div>
                        <div className="font-bold text-slate-900">{maxRise.symbol}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-rose-600 font-mono">+{maxRise.price_rise_pct.toFixed(1)}%</div>
                        <div className="text-[9px] text-slate-400 font-mono">15D Peak</div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Max Circuit Hits */}
                {(() => {
                  const maxBand = [...scrips].sort((a, b) => b.band_hit_days - a.band_hit_days)[0];
                  return maxBand ? (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2">
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Max Circuit Band Persistence</div>
                        <div className="font-bold text-slate-900">{maxBand.symbol}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-blue-700 font-mono">{maxBand.band_hit_days} Days</div>
                        <div className="text-[9px] text-slate-400 font-mono">≥90% Circuit</div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Max Volume Z */}
                {(() => {
                  const maxVolZ = [...scrips].sort((a, b) => b.volume_z - a.volume_z)[0];
                  return maxVolZ ? (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2">
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Max Volume Z-Score</div>
                        <div className="font-bold text-slate-900">{maxVolZ.symbol}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-violet-700 font-mono">{maxVolZ.volume_z.toFixed(2)}σ</div>
                        <div className="text-[9px] text-slate-400 font-mono">Volume Surge</div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* KPI Card 3: Engine Architecture Status */}
          <div className="bg-white border border-slate-200 rounded shadow-xs p-3 space-y-2">
            <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="flex items-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5 text-emerald-600" />
                Surveillance Architecture
              </span>
              <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 font-bold px-1.5 rounded">ONLINE</span>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between items-center text-slate-600">
                <span>Baseline Window:</span>
                <span className="font-bold text-slate-900">180 Trading Days</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Observation Window:</span>
                <span className="font-bold text-slate-900">15 Trading Days</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Warehouse Engine:</span>
                <span className="font-bold text-slate-900">Teradata DWBIS</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Active Core Rules:</span>
                <span className="font-bold text-blue-700">5 PV Metrics</span>
              </div>
            </div>
          </div>

          {/* KPI Card 4: Quick Action Shortcuts */}
          <div className="bg-slate-900 text-white rounded shadow-xs p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5">
              Surveillance Workflows
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
              <a href="/compare" className="bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white p-2 rounded text-center transition-colors">
                Compare Scrips
              </a>
              <a href="/cases" className="bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white p-2 rounded text-center transition-colors">
                Case Dossiers
              </a>
              <a href="/" className="bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white p-2 rounded text-center transition-colors">
                Watchlist Triage
              </a>
              <a href="/settings" className="bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white p-2 rounded text-center transition-colors">
                Metric Weights
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
