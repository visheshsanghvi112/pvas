"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitCompare,
  ArrowRight,
  BarChart2,
  Zap,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  Layers,
  FolderLock,
  Eye,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowUpRight
} from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchWatchlist,
  fetchScripDetail,
  fetchScripParticipants,
  type ScripSummary,
  type ScripDetail
} from "@/lib/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import { cn } from "@/lib/utils";

// ── PVASF Framework Parameter Calculator ──
function rawScorePriceRise(pct: number) {
  if (pct < 15) return 0;
  if (pct <= 75) return 1;
  if (pct <= 150) return 3;
  return 5;
}
function rawScoreZ(z: number) {
  if (z >= 3.09) return 5;
  if (z >= 2.33) return 3;
  if (z >= 1.645) return 1;
  return 0;
}
function rawScoreBand(d: number) {
  if (d >= 10) return 5;
  if (d >= 6) return 3;
  if (d >= 3) return 1;
  return 0;
}
function rawScoreHighs(d: number) {
  if (d >= 10) return 5;
  if (d >= 5) return 3;
  if (d >= 1) return 1;
  return 0;
}

const FRAMEWORK_PARAMS = [
  {
    name: "Price Rise % vs T-180 Baseline",
    weightPct: 25,
    key: "price_rise_pct",
    format: (v: number) => `+${v.toFixed(1)}%`,
    threshold: "≥ 15%",
    calc: rawScorePriceRise,
  },
  {
    name: "Price Z-Score (σ)",
    weightPct: 20,
    key: "price_z",
    format: (v: number) => `${v.toFixed(2)}σ`,
    threshold: "≥ 1.645σ",
    calc: rawScoreZ,
  },
  {
    name: "Volume Z-Score (σ)",
    weightPct: 25,
    key: "volume_z",
    format: (v: number) => `${v.toFixed(2)}σ`,
    threshold: "≥ 1.645σ",
    calc: rawScoreZ,
  },
  {
    name: "Upper Circuit Band Hit Days",
    weightPct: 15,
    key: "band_hit_days",
    format: (v: number) => `${v} days`,
    threshold: "≥ 3 days",
    calc: rawScoreBand,
  },
  {
    name: "180-Day New High Breakout Days",
    weightPct: 15,
    key: "new_high_days",
    format: (v: number) => `${v} days`,
    threshold: "≥ 1 day",
    calc: rawScoreHighs,
  },
];

type CompareTab = "scoring" | "trajectory" | "participants";

// Normalized Relative Price Chart (Rebased to 100% at T-180)
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
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} domain={["auto", "auto"]} unit="%" />
        <Tooltip
          contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", borderColor: "#e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", color: "#0f172a" }}
          formatter={(val: any, name: any) => [`${val}%`, `${name} Index`]}
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
  const [activeTab, setActiveTab] = useState<CompareTab>("scoring");

  useEffect(() => {
    fetchWatchlist().then(setAllScrips);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchScripDetail(scrip1Symbol),
      fetchScripDetail(scrip2Symbol),
      fetchScripParticipants(scrip1Symbol).catch(() => null),
      fetchScripParticipants(scrip2Symbol).catch(() => null),
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

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans">
      {/* ── Page Header Bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <GitCompare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900">Compare Scrips</h1>
            <p className="text-xs text-slate-500 font-medium">Head-to-head framework parameter scoring & participant overlap audit</p>
          </div>
        </div>

        {/* Scrip Selectors */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-xs font-extrabold text-blue-600">Scrip A:</span>
            <select
              value={scrip1Symbol}
              onChange={(e) => setScrip1Symbol(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 outline-none min-w-[130px] cursor-pointer"
            >
              {allScrips.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} ({s.score} pts)
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-bold text-slate-400">vs</span>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-xs font-extrabold text-indigo-600">Scrip B:</span>
            <select
              value={scrip2Symbol}
              onChange={(e) => setScrip2Symbol(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 outline-none min-w-[130px] cursor-pointer"
            >
              {allScrips.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} ({s.score} pts)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Work Area ── */}
      <div className="flex-1 overflow-auto p-6">
        {loading || !detail1 || !detail2 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-slate-500">
            <div className="h-7 w-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold">Computing PVASF comparative analytics...</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">

            {/* ── HEAD-TO-HEAD SCRIP HERO CARDS ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative">
              {/* Scrip A Card */}
              <div className="bg-white rounded-2xl border-2 border-blue-100 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        Scrip A
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-2 font-mono">{detail1.symbol}</h2>
                      <p className="text-xs text-slate-500">{detail1.company || "Listed Security"}</p>
                    </div>
                    <RiskBadge risk={detail1.risk} />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">PVASF Score</span>
                      <span className="font-extrabold text-blue-700 text-sm font-mono">{detail1.metrics.final_score} pts</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Price Rise</span>
                      <span className="font-extrabold text-rose-600 text-sm font-mono">+{detail1.metrics.price_rise_pct.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Volume Z</span>
                      <span className="font-extrabold text-slate-900 text-sm font-mono">{detail1.metrics.volume_z.toFixed(2)}σ</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <Link
                    href={`/analysis/${detail1.symbol}`}
                    className="flex-1 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold text-center hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Analyze {detail1.symbol}
                  </Link>
                  <Link
                    href={`/cases?search=${detail1.symbol}`}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-1"
                  >
                    <FolderLock className="w-3.5 h-3.5 text-blue-600" /> Cases
                  </Link>
                </div>
              </div>

              {/* Scrip B Card */}
              <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        Scrip B
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-2 font-mono">{detail2.symbol}</h2>
                      <p className="text-xs text-slate-500">{detail2.company || "Listed Security"}</p>
                    </div>
                    <RiskBadge risk={detail2.risk} />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">PVASF Score</span>
                      <span className="font-extrabold text-indigo-700 text-sm font-mono">{detail2.metrics.final_score} pts</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Price Rise</span>
                      <span className="font-extrabold text-rose-600 text-sm font-mono">+{detail2.metrics.price_rise_pct.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Volume Z</span>
                      <span className="font-extrabold text-slate-900 text-sm font-mono">{detail2.metrics.volume_z.toFixed(2)}σ</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <Link
                    href={`/analysis/${detail2.symbol}`}
                    className="flex-1 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold text-center hover:bg-indigo-600 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Analyze {detail2.symbol}
                  </Link>
                  <Link
                    href={`/cases?search=${detail2.symbol}`}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-1"
                  >
                    <FolderLock className="w-3.5 h-3.5 text-blue-600" /> Cases
                  </Link>
                </div>
              </div>
            </div>

            {/* ── SEGMENT TABS ── */}
            <div className="flex items-center border-b border-slate-200 gap-2 pb-2">
              <button
                onClick={() => setActiveTab("scoring")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeTab === "scoring"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                )}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                PVASF Parameter Scoring Breakdown
              </button>

              <button
                onClick={() => setActiveTab("trajectory")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeTab === "trajectory"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                )}
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Normalized Price Acceleration Trajectory
              </button>

              <button
                onClick={() => setActiveTab("participants")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeTab === "participants"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                )}
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                Shared Traders & Accounts ({sharedPans.length})
              </button>
            </div>

            {/* ── TAB CONTENT 1: SCORING BREAKDOWN ── */}
            {activeTab === "scoring" && (
              <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
                <CardHeader className="py-3.5 px-5 bg-white border-b border-slate-200 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                    <BarChart2 className="w-4 h-4 text-blue-600" />
                    Side-by-Side PVASF Framework Scoring Matrix
                  </CardTitle>
                  <span className="text-xs text-slate-500 font-mono">SEBI Cutoff = 15.0 Points</span>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3">Surveillance Parameter</th>
                          <th className="px-5 py-3 text-center">Weight %</th>
                          <th className="px-5 py-3 text-center">Trigger Cutoff</th>
                          <th className="px-5 py-3 font-mono font-bold text-blue-700">{detail1.symbol} (Scrip A)</th>
                          <th className="px-5 py-3 font-mono font-bold text-indigo-700">{detail2.symbol} (Scrip B)</th>
                          <th className="px-5 py-3 text-right">Parameter Variance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {FRAMEWORK_PARAMS.map((param) => {
                          const m1 = (detail1.metrics as any)[param.key] || 0;
                          const m2 = (detail2.metrics as any)[param.key] || 0;
                          const r1 = param.calc(m1);
                          const r2 = param.calc(m2);
                          const pts1 = ((r1 / 5) * param.weightPct).toFixed(1);
                          const pts2 = ((r2 / 5) * param.weightPct).toFixed(1);

                          return (
                            <tr key={param.key} className="hover:bg-slate-50 transition-colors font-sans">
                              <td className="px-5 py-3.5 font-bold text-slate-900">{param.name}</td>
                              <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-500">{param.weightPct}%</td>
                              <td className="px-5 py-3.5 text-center font-mono text-slate-400">{param.threshold}</td>
                              
                              {/* Scrip A */}
                              <td className="px-5 py-3.5 font-mono">
                                <span className="font-bold text-blue-700 text-sm">{param.format(m1)}</span>
                                <span className="text-[10px] text-slate-400 ml-2">({pts1} pts)</span>
                              </td>

                              {/* Scrip B */}
                              <td className="px-5 py-3.5 font-mono">
                                <span className="font-bold text-indigo-700 text-sm">{param.format(m2)}</span>
                                <span className="text-[10px] text-slate-400 ml-2">({pts2} pts)</span>
                              </td>

                              {/* Variance */}
                              <td className="px-5 py-3.5 text-right font-mono text-slate-600 font-bold">
                                {Math.abs(m1 - m2).toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Total Score Summary Row */}
                        <tr className="bg-slate-100/80 text-slate-900 font-bold font-sans border-t-2 border-slate-200">
                          <td colSpan={3} className="px-5 py-3.5 text-right text-xs uppercase tracking-wider text-slate-600">
                            Composite Risk Score:
                          </td>
                          <td className="px-5 py-3.5 font-mono text-base text-blue-700">
                            {detail1.metrics.final_score} / 100
                          </td>
                          <td className="px-5 py-3.5 font-mono text-base text-indigo-700">
                            {detail2.metrics.final_score} / 100
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-sm text-slate-700">
                            Δ {Math.abs(detail1.metrics.final_score - detail2.metrics.final_score).toFixed(1)} pts
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── TAB CONTENT 2: TRAJECTORY CHART ── */}
            {activeTab === "trajectory" && (
              <Card className="bg-white border-slate-200 shadow-xs">
                <CardHeader className="py-3.5 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Normalized Price Index Trajectory (T-180 Baseline = 100%)
                  </CardTitle>
                  <span className="text-xs text-slate-400 font-medium">180-Day Overlapping Performance Curve</span>
                </CardHeader>
                <CardContent className="p-5">
                  <NormalizedPriceOverlayChart d1={detail1} d2={detail2} />
                </CardContent>
              </Card>
            )}

            {/* ── TAB CONTENT 3: PARTICIPANT OVERLAP ── */}
            {activeTab === "participants" && (
              <Card className="bg-white border-slate-200 shadow-xs">
                <CardHeader className="py-3.5 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    Shared Traders Active in Both Securities
                  </CardTitle>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {sharedPans.length} Shared Trader(s)
                  </span>
                </CardHeader>
                <CardContent className="p-5">
                  {sharedPans.length > 0 ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2 text-xs">
                      <div className="font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        Shared Client PANs Active in Both Scrips:
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {sharedPans.map((pan) => (
                          <span key={pan} className="bg-white border border-rose-300 font-mono font-bold text-rose-800 px-3 py-1.5 rounded-xl shadow-2xs">
                            {pan}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      No overlapping concentrated volume pushers detected between {detail1.symbol} and {detail2.symbol}.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
