"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  BarChart2,
  TrendingUp,
  Activity,
  Clock,
  Zap,
  Database,
  ChevronRight
} from "lucide-react";
import { AlertsTable } from "@/components/dashboard/alerts-table";
import { fetchWatchlist, type ScripSummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const [scrips, setScrips] = useState<ScripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>("All");
  const [lastRefresh, setLastRefresh] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    const data = await fetchWatchlist();
    setScrips(data);
    setLoading(false);
    setLastRefresh(
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  const highRiskCount = scrips.filter((s) => s.risk === "High").length;
  const medRiskCount = scrips.filter((s) => s.risk === "Medium").length;
  const lowRiskCount = scrips.filter((s) => s.risk === "Low").length;

  const handleStatusChange = (
    symbol: string,
    newStatus: "Open" | "Under review" | "Closed"
  ) => {
    setScrips((prev) =>
      prev.map((s) => (s.symbol === symbol ? { ...s, status: newStatus } : s))
    );
  };

  const topMover =
    scrips.length > 0
      ? [...scrips].sort((a, b) => b.price_rise_pct - a.price_rise_pct)[0]
      : null;

  const topVolume =
    scrips.length > 0
      ? [...scrips].sort((a, b) => b.volume_z - a.volume_z)[0]
      : null;

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* ── Page Header Bar (Crisp Light Theme) ── */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">
              Market Surveillance Dashboard
            </h1>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 h-8.5 px-3.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            {loading ? "Syncing..." : "Sync Teradata Data"}
          </button>
        </div>
      </header>

      {/* ── KPI Executive Summary Cards (Clickable Filter Controls) ── */}
      <div className="flex-shrink-0 bg-white/90 border-b border-slate-200/90 px-6 py-3.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Monitored Universe */}
          <button
            onClick={() => setRiskFilter("All")}
            className={cn(
              "text-left border rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-[0_2px_10px_-2px_rgba(15,23,42,0.06),0_1px_3px_-1px_rgba(15,23,42,0.04)] hover:shadow-md hover:-translate-y-0.5",
              riskFilter === "All"
                ? "bg-blue-50/80 border-blue-400/90 ring-2 ring-blue-500/20"
                : "bg-white border-slate-200/90 hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                Monitored Scrips
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                <BarChart2 className="h-3.5 w-3.5 text-slate-700" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 leading-none font-mono">
                {loading ? "—" : scrips.length}
              </span>
              <span className="text-xs font-semibold text-slate-500">Securities</span>
            </div>
            <div className="mt-2 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Database className="h-3 w-3 text-slate-400" /> 31,200 Teradata Trade Matches
            </div>
          </button>

          {/* Card 2: High Risk Critical Alerts */}
          <button
            onClick={() => setRiskFilter("High")}
            className={cn(
              "text-left border rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-[0_2px_10px_-2px_rgba(15,23,42,0.06),0_1px_3px_-1px_rgba(15,23,42,0.04)] hover:shadow-md hover:-translate-y-0.5",
              riskFilter === "High"
                ? "bg-rose-100/80 border-rose-400 ring-2 ring-rose-500/20"
                : "bg-rose-50/70 border-rose-200/90 hover:border-rose-300"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-rose-700 uppercase tracking-wider">
                High Risk Alerts
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600 leading-none font-mono">
                {loading ? "—" : highRiskCount}
              </span>
              <span className="text-xs font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                Score ≥ 15
              </span>
            </div>
            <div className="mt-2 text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <span>{medRiskCount} Medium (10–14)</span>
              <span className="text-slate-300">•</span>
              <span>{lowRiskCount} Normal</span>
            </div>
          </button>

          {/* Card 3: Top Price Mover */}
          <div className="bg-violet-50/70 border border-violet-200/90 rounded-2xl p-3.5 flex flex-col justify-between shadow-[0_2px_10px_-2px_rgba(15,23,42,0.06),0_1px_3px_-1px_rgba(15,23,42,0.04)] hover:border-violet-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-violet-700 uppercase tracking-wider">
                Top Price Surge
              </span>
              <div className="w-7 h-7 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-violet-600" />
              </div>
            </div>
            {topMover && !loading ? (
              <>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <Link
                    href={`/investigations/${topMover.symbol}`}
                    className="text-base font-black text-slate-900 hover:text-violet-700 hover:underline flex items-center gap-1 leading-none font-mono"
                  >
                    {topMover.symbol} <ChevronRight className="h-3.5 w-3.5 text-violet-500" />
                  </Link>
                  <span className="text-xs font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-md border border-rose-200">
                    +{topMover.price_rise_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                  <span>Price Z: <strong className="text-slate-900 font-mono">{topMover.price_z.toFixed(2)}σ</strong></span>
                  <span className="text-slate-400">vs T-180 Baseline</span>
                </div>
              </>
            ) : (
              <div className="mt-2 text-xs text-slate-400">Loading metrics...</div>
            )}
          </div>

          {/* Card 4: Top Volume Anomaly */}
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 flex flex-col justify-between shadow-[0_2px_10px_-2px_rgba(15,23,42,0.06),0_1px_3px_-1px_rgba(15,23,42,0.04)] hover:border-amber-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">
                Top Volume Surge
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-amber-600" />
              </div>
            </div>
            {topVolume && !loading ? (
              <>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <Link
                    href={`/investigations/${topVolume.symbol}`}
                    className="text-base font-black text-slate-900 hover:text-amber-700 hover:underline flex items-center gap-1 leading-none font-mono"
                  >
                    {topVolume.symbol} <ChevronRight className="h-3.5 w-3.5 text-amber-500" />
                  </Link>
                  <span className="text-xs font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200">
                    {topVolume.volume_z.toFixed(2)}σ Surge
                  </span>
                </div>
                <div className="mt-2 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                  <span>Circuit Hits: <strong className="text-slate-900 font-mono">{topVolume.band_hit_days} Days</strong></span>
                  <span className="text-slate-400">≥90% Upper Band</span>
                </div>
              </>
            ) : (
              <div className="mt-2 text-xs text-slate-400">Loading metrics...</div>
            )}
          </div>

        </div>
      </div>

      {/* ── Main Content: Watchlist Table Workspace (Clean Single Overflow Layout) ── */}
      <main className="flex-1 overflow-hidden flex flex-col bg-white">
        <AlertsTable
          scrips={scrips}
          onStatusChange={handleStatusChange}
          selectedRiskFilter={riskFilter}
          onRiskFilterChange={(newFilter) => setRiskFilter(newFilter)}
          loading={loading}
        />
      </main>
    </div>
  );
}
