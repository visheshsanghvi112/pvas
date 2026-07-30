"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GitCompare, ArrowRight, BarChart2, Activity } from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { fetchWatchlist, fetchScripDetail, type ScripSummary, type ScripDetail } from "@/lib/api";
import { PriceChart } from "@/components/investigation/charts";

const METRICS = [
  { key: "final_score", label: "PVASF Score", format: (v: number) => `${v}/100`, color: "text-blue-700" },
  { key: "price_rise_pct", label: "Price Rise %", format: (v: number) => `+${v.toFixed(1)}%`, color: "text-rose-600" },
  { key: "volume_z", label: "Volume Z-Score", format: (v: number) => `${v.toFixed(2)}σ`, color: "text-amber-700" },
  { key: "price_z", label: "Price Z-Score", format: (v: number) => `${v.toFixed(2)}σ`, color: "text-violet-700" },
  { key: "band_hit_days", label: "Circuit Hits", format: (v: number) => `${v} days`, color: "text-blue-700" },
  { key: "new_high_days", label: "180D New Highs", format: (v: number) => `${v} days`, color: "text-teal-700" },
];

function MetricCard({ detail, accent }: { detail: ScripDetail; accent: "blue" | "indigo" }) {
  const borderColor = accent === "blue" ? "border-blue-200" : "border-indigo-200";
  const labelColor = accent === "blue" ? "text-blue-600" : "text-indigo-600";
  const label = accent === "blue" ? "Scrip A" : "Scrip B";

  return (
    <div className={`bg-white rounded-xl border-2 ${borderColor} p-5`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className={`text-xs font-bold ${labelColor} uppercase tracking-wider mb-1`}>{label}</div>
          <div className="text-2xl font-black text-slate-900">{detail.symbol}</div>
          <div className="text-xs text-slate-400 mt-0.5">{detail.company || "Listed Security"}</div>
        </div>
        <RiskBadge risk={detail.risk} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {METRICS.map(({ key, label: ml, format, color }) => (
          <div key={key} className="bg-slate-50 rounded-lg border border-slate-100 p-3">
            <div className="text-xs text-slate-400 font-medium mb-1">{ml}</div>
            <div className={`text-lg font-black ${color}`}>
              {format((detail.metrics as any)[key] ?? 0)}
            </div>
          </div>
        ))}
      </div>

      <Link
        href={`/investigations/${detail.symbol}`}
        className="mt-4 flex items-center justify-center gap-2 w-full h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        Open Full Analysis <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function ComparePage() {
  const [allScrips, setAllScrips] = useState<ScripSummary[]>([]);
  const [scrip1Symbol, setScrip1Symbol] = useState("ALPHATECH");
  const [scrip2Symbol, setScrip2Symbol] = useState("NOVAENERGY");
  const [detail1, setDetail1] = useState<ScripDetail | null>(null);
  const [detail2, setDetail2] = useState<ScripDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWatchlist().then(setAllScrips);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchScripDetail(scrip1Symbol), fetchScripDetail(scrip2Symbol)])
      .then(([d1, d2]) => { setDetail1(d1); setDetail2(d2); })
      .finally(() => setLoading(false));
  }, [scrip1Symbol, scrip2Symbol]);

  return (
    <div className="flex flex-col h-full">

      {/* Page Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-blue-600" />
            Comparative Scrip Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Side-by-side surveillance metric comparison, Z-scores, and price-volume baselines.
          </p>
        </div>

        {/* Scrip Selectors */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-blue-600">Scrip A:</span>
            <select
              value={scrip1Symbol}
              onChange={(e) => setScrip1Symbol(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-900 outline-none min-w-[140px]"
            >
              {allScrips.map((s) => (
                <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.company}</option>
              ))}
            </select>
          </div>

          <div className="text-sm font-bold text-slate-400">vs</div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-indigo-600">Scrip B:</span>
            <select
              value={scrip2Symbol}
              onChange={(e) => setScrip2Symbol(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-900 outline-none min-w-[140px]"
            >
              {allScrips.map((s) => (
                <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.company}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        {loading || !detail1 || !detail2 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-slate-500">
            <div className="h-7 w-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
            <p className="text-sm font-medium">Loading comparison data...</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-7xl mx-auto">

            {/* Side-by-Side Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <MetricCard detail={detail1} accent="blue" />
              <MetricCard detail={detail2} accent="indigo" />
            </div>

            {/* Comparison Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-800 px-5 py-3 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-white">Side-by-Side Metric Comparison</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Metric</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-blue-600">{detail1.symbol} (A)</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-indigo-600">{detail2.symbol} (B)</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      label: "PVASF Score",
                      v1: `${detail1.metrics.final_score} pts`,
                      v2: `${detail2.metrics.final_score} pts`,
                      diff: `${Math.abs(detail1.metrics.final_score - detail2.metrics.final_score)} pts`,
                    },
                    {
                      label: "Price Rise (15D vs T-180)",
                      v1: `+${detail1.metrics.price_rise_pct}%`,
                      v2: `+${detail2.metrics.price_rise_pct}%`,
                      diff: `${Math.abs(detail1.metrics.price_rise_pct - detail2.metrics.price_rise_pct).toFixed(1)}%`,
                    },
                    {
                      label: "Volume Z-Score",
                      v1: `${detail1.metrics.volume_z}σ`,
                      v2: `${detail2.metrics.volume_z}σ`,
                      diff: `${Math.abs(detail1.metrics.volume_z - detail2.metrics.volume_z).toFixed(2)}σ`,
                    },
                    {
                      label: "Price Z-Score",
                      v1: `${detail1.metrics.price_z}σ`,
                      v2: `${detail2.metrics.price_z}σ`,
                      diff: `${Math.abs(detail1.metrics.price_z - detail2.metrics.price_z).toFixed(2)}σ`,
                    },
                    {
                      label: "Upper Circuit Hits",
                      v1: `${detail1.metrics.band_hit_days} days`,
                      v2: `${detail2.metrics.band_hit_days} days`,
                      diff: `${Math.abs(detail1.metrics.band_hit_days - detail2.metrics.band_hit_days)} days`,
                    },
                    {
                      label: "180D New High Breakouts",
                      v1: `${detail1.metrics.new_high_days} days`,
                      v2: `${detail2.metrics.new_high_days} days`,
                      diff: `${Math.abs(detail1.metrics.new_high_days - detail2.metrics.new_high_days)} days`,
                    },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">{row.label}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-blue-700 font-mono">{row.v1}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-indigo-700 font-mono">{row.v2}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 font-mono">{row.diff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Price Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { detail: detail1, accent: "blue" },
                { detail: detail2, accent: "indigo" },
              ].map(({ detail, accent }) => (
                <div key={detail.symbol} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                    <Activity className={`h-4 w-4 ${accent === "blue" ? "text-blue-600" : "text-indigo-600"}`} />
                    <span className="text-sm font-semibold text-slate-800">
                      {detail.symbol} — Price Movement
                    </span>
                  </div>
                  <div className="p-4">
                    <PriceChart history={detail.history} />
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
