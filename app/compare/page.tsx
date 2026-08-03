"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GitCompare, ArrowRight, BarChart2, Activity, Zap, AlertTriangle, ShieldCheck, UserCheck, Layers } from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { fetchWatchlist, fetchScripDetail, fetchScripParticipants, type ScripSummary, type ScripDetail } from "@/lib/api";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

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
    <div className={`bg-white rounded-xl border-2 ${borderColor} p-5 shadow-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className={`text-xs font-bold ${labelColor} mb-1`}>{label}</div>
          <div className="text-2xl font-bold text-slate-900">{detail.symbol}</div>
          <div className="text-xs text-slate-500 mt-0.5">{detail.company || "Listed Security"}</div>
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
        href={`/analysis/${detail.symbol}`}
        className="mt-4 flex items-center justify-center gap-2 w-full h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        Open Full Analysis <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// Normalized Comparative Price Chart (Rebased to 100% at T-180)
function NormalizedPriceOverlayChart({ d1, d2 }: { d1: ScripDetail; d2: ScripDetail }) {
  const h1 = d1.history || [];
  const h2 = d2.history || [];
  
  if (h1.length === 0 || h2.length === 0) return null;

  const base1 = h1[0].close || 1.0;
  const base2 = h2[0].close || 1.0;

  const chartData = h1.map((p1, idx) => {
    const p2 = h2[idx] || h2[h2.length - 1];
    return {
      date: p1.date,
      [d1.symbol]: Number(((p1.close / base1) * 100).toFixed(2)),
      [d2.symbol]: Number(((p2.close / base2) * 100).toFixed(2)),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} domain={["auto", "auto"]} unit="%" />
        <Tooltip
          contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none", color: "#fff" }}
          formatter={(val: any, name: any) => [`${val}%`, `${name} Normalized Price`]}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Line type="monotone" dataKey={d1.symbol} stroke="#2563eb" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey={d2.symbol} stroke="#6366f1" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function ComparePage() {
  const [allScrips, setAllScrips] = useState<ScripSummary[]>([]);
  const [scrip1Symbol, setScrip1Symbol] = useState("SBIN");
  const [scrip2Symbol, setScrip2Symbol] = useState("NOVAENERGY");
  const [detail1, setDetail1] = useState<ScripDetail | null>(null);
  const [detail2, setDetail2] = useState<ScripDetail | null>(null);
  const [sharedPans, setSharedPans] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWatchlist().then(setAllScrips);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchScripDetail(scrip1Symbol),
      fetchScripDetail(scrip2Symbol),
      fetchScripParticipants(scrip1Symbol),
      fetchScripParticipants(scrip2Symbol),
    ])
      .then(([d1, d2, p1, p2]) => {
        setDetail1(d1);
        setDetail2(d2);

        // Find shared participant PANs between Scrip A and Scrip B
        const pans1 = new Set((p1?.volume_share || []).map((x: any) => x.participant));
        const pans2 = (p2?.volume_share || []).map((x: any) => x.participant);
        const overlap = pans2.filter((pan: string) => pans1.has(pan));
        setSharedPans(overlap);
      })
      .finally(() => setLoading(false));
  }, [scrip1Symbol, scrip2Symbol]);

  // Automated Analyst Comparative Insights
  const getAnalystTakeaways = () => {
    if (!detail1 || !detail2) return [];
    const takeaways = [];

    const score1 = detail1.metrics.final_score;
    const score2 = detail2.metrics.final_score;

    if (score1 > score2) {
      takeaways.push({
        type: "warning",
        title: `Elevated Risk Discrepancy (${detail1.symbol} vs ${detail2.symbol})`,
        text: `${detail1.symbol} has a higher PVASF Risk Score (${score1}/100) compared to ${detail2.symbol} (${score2}/100), primarily driven by ${detail1.metrics.price_rise_pct > detail2.metrics.price_rise_pct ? "Price Rise surge (" + detail1.metrics.price_rise_pct + "%)" : "Circuit Persistence (" + detail1.metrics.band_hit_days + " days)"}.`
      });
    } else if (score2 > score1) {
      takeaways.push({
        type: "warning",
        title: `Elevated Risk Discrepancy (${detail2.symbol} vs ${detail1.symbol})`,
        text: `${detail2.symbol} exhibits higher risk parameters (${score2}/100) than ${detail1.symbol} (${score1}/100).`
      });
    } else {
      takeaways.push({
        type: "info",
        title: "Equivalent Surveillance Profile",
        text: `Both ${detail1.symbol} and ${detail2.symbol} present identical composite risk scores (${score1}/100).`
      });
    }

    if (detail1.metrics.volume_z >= 1.65 || detail2.metrics.volume_z >= 1.65) {
      const spiker = detail1.metrics.volume_z >= detail2.metrics.volume_z ? detail1.symbol : detail2.symbol;
      const zval = Math.max(detail1.metrics.volume_z, detail2.metrics.volume_z);
      takeaways.push({
        type: "alert",
        title: `Volume Spike Detected in ${spiker}`,
        text: `${spiker} displays abnormal trading volume volume Z-score (${zval}σ), indicating concentrated liquidity infusion.`
      });
    }

    if (sharedPans.length > 0) {
      takeaways.push({
        type: "danger",
        title: `Cross-Scrip Participant Concentration (${sharedPans.length} Shared PANs)`,
        text: `Identified ${sharedPans.length} active participant PAN(s) trading in both ${detail1.symbol} and ${detail2.symbol}. Potential cross-scrip group coordination.`
      });
    } else {
      takeaways.push({
        type: "success",
        title: "Independent Participant Bases",
        text: `No overlapping concentrated volume pushers detected between ${detail1.symbol} and ${detail2.symbol}.`
      });
    }

    return takeaways;
  };

  return (
    <div className="flex flex-col h-full">

      {/* Page Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-blue-600" />
            Comparative Surveillance Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Side-by-side surveillance metric comparison, normalized price overlay, and cross-scrip participant overlap audit.
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
            <p className="text-sm font-medium">Computing comparative analytics & participant overlap...</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-7xl mx-auto">

            {/* Automated Comparative Intelligence Takeaways */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Zap className="h-4 w-4 text-amber-500" />
                Automated Comparative Intelligence Takeaways
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {getAnalystTakeaways().map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                      t.type === "danger"
                        ? "bg-rose-50 border-rose-200 text-rose-900"
                        : t.type === "warning" || t.type === "alert"
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-blue-50 border-blue-200 text-blue-900"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {t.type === "danger" ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                      ) : t.type === "warning" ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                      )}
                      {t.title}
                    </div>
                    <p className="leading-relaxed opacity-90">{t.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Side-by-Side Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <MetricCard detail={detail1} accent="blue" />
              <MetricCard detail={detail2} accent="indigo" />
            </div>

            {/* Side-by-Side Comparison Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-semibold text-white">Side-by-Side Metric Breakdown</span>
                </div>
                <div className="text-xs text-slate-400">180D Baseline vs 15D Observation Horizon</div>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                    <th className="px-5 py-3 text-left">Metric Name</th>
                    <th className="px-5 py-3 text-left text-blue-700 font-bold">{detail1.symbol} (A)</th>
                    <th className="px-5 py-3 text-left text-indigo-700 font-bold">{detail2.symbol} (B)</th>
                    <th className="px-5 py-3 text-left text-slate-500">Difference / Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      label: "PVASF Risk Score",
                      v1: `${detail1.metrics.final_score} / 100`,
                      v2: `${detail2.metrics.final_score} / 100`,
                      diff: `${Math.abs(detail1.metrics.final_score - detail2.metrics.final_score)} pts`,
                    },
                    {
                      label: "Price Surge (15D vs T-180)",
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
                      label: "Upper Circuit Persistence",
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
                      <td className="px-5 py-3 font-semibold text-slate-800">{row.label}</td>
                      <td className="px-5 py-3 font-bold text-blue-700 font-mono">{row.v1}</td>
                      <td className="px-5 py-3 font-bold text-indigo-700 font-mono">{row.v2}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono">{row.diff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Normalized Relative Price Overlay Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-900">
                    Normalized Relative Price Surge Trajectory (T-180 Base = 100%)
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">Overlapping 180-Day Trend Overlay</span>
              </div>
              <NormalizedPriceOverlayChart d1={detail1} d2={detail2} />
            </div>

            {/* Shared Participant Overlap Audit */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-900">
                    Cross-Scrip Participant Overlap Audit (DECL Token Match)
                  </span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {sharedPans.length} Shared Participant(s)
                </span>
              </div>
              {sharedPans.length > 0 ? (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 space-y-2 text-xs">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Shared Client PANs Detected in Both Scrips:
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {sharedPans.map((pan) => (
                      <span key={pan} className="bg-white border border-rose-300 font-mono font-bold text-rose-800 px-3 py-1 rounded-md shadow-xs">
                        {pan}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
                  No overlapping concentrated volume pushers detected between {detail1.symbol} and {detail2.symbol}.
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
