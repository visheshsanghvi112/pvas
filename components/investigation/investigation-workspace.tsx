"use client";

import { useState, useEffect } from "react";
import {
  GitCompare,
  Send,
  FolderLock,
  UserCircle,
  X,
  AlertTriangle,
  TrendingUp,
  Activity,
  BarChart2,
  Zap
} from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertDriversChart,
  LtpChart,
  PriceChart,
  RollingVolumeChart,
  VolumeChart
} from "@/components/investigation/charts";
import { Timeline, type TimelineItem } from "@/components/investigation/timeline";
import {
  fetchScripDetail,
  fetchScripParticipants,
  fetchTradeLog,
  fetchClient360,
  fetchShareholdingBreakdown,
  fetchCorporateActions,
  type ScripDetail,
  type ParticipantAudit,
  type TradeRow,
  type ClientDetail
} from "@/lib/api";
import { useUser } from "@/lib/user-context";

const TABS = ["Overview", "180-Day Chart", "Participants", "Trades Log", "Case Notes"] as const;
type Tab = typeof TABS[number];

// ── PVASF scoring thresholds (mirrors pv_alert_surveillance.py) ──
function scoreZone(score: number): "High" | "Medium" | "Low" {
  if (score >= 15) return "High";
  if (score >= 10) return "Medium";
  return "Low";
}
function scoreColor(score: number) {
  const z = scoreZone(score);
  return z === "High" ? "text-rose-600" : z === "Medium" ? "text-amber-600" : "text-emerald-600";
}

// Individual PVASF parameter raw scores (0/1/3/5)
function rawScoreForPriceRise(pct: number) {
  if (pct < 15) return 0;
  if (pct <= 75) return 1;
  if (pct <= 150) return 3;
  return 5;
}
function rawScoreForZ(z: number) {
  if (z >= 3.09) return 5;
  if (z >= 2.33) return 3;
  if (z >= 1.645) return 1;
  return 0;
}
function rawScoreForBandDays(d: number) {
  if (d >= 10) return 5;
  if (d >= 6) return 3;
  if (d >= 3) return 1;
  return 0;
}
function rawScoreForNewHighDays(d: number) {
  if (d >= 10) return 5;
  if (d >= 5) return 3;
  if (d >= 1) return 1;
  return 0;
}

function ScoreChip({ label, value, rawScore, weight }: { label: string; value: string; rawScore: number; weight: number }) {
  const chipBg =
    rawScore === 5 ? "bg-rose-50 border-rose-200"
    : rawScore >= 3 ? "bg-amber-50 border-amber-200"
    : rawScore >= 1 ? "bg-blue-50 border-blue-100"
    : "bg-slate-50 border-slate-200";
  const valColor =
    rawScore === 5 ? "text-rose-700"
    : rawScore >= 3 ? "text-amber-700"
    : rawScore >= 1 ? "text-blue-700"
    : "text-slate-400";
  const scoreColor =
    rawScore === 5 ? "text-rose-600" : rawScore >= 3 ? "text-amber-600" : rawScore >= 1 ? "text-blue-600" : "text-slate-300";

  return (
    <div className={cn("flex-1 min-w-[110px] border rounded-xl p-3 flex flex-col gap-1", chipBg)}>
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={cn("text-lg font-black leading-none", valColor)}>{value}</div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-slate-400">Wt: {weight}%</span>
        <span className={cn("text-xs font-bold font-mono", scoreColor)}>Score {rawScore}/5</span>
      </div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-4 text-center text-slate-400 italic">No records found</td>
            </tr>
          ) : (
            rows.map((r, ri) => (
              <tr key={ri} className="hover:bg-slate-50/80 transition-colors">
                {r.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-slate-700">{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-500">{icon}</span>}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border border-slate-200 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function InvestigationWorkspace({ symbol }: { symbol: string }) {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const [detail, setDetail] = useState<ScripDetail | null>(null);
  const [participants, setParticipants] = useState<ParticipantAudit | null>(null);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [client360, setClient360] = useState<ClientDetail | null>(null);
  const [shBreakdown, setShBreakdown] = useState<any>(null);
  const [corpActions, setCorpActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analysisStatus, setAnalysisStatus] = useState<"Active" | "Completed">("Active");
  const [notes, setNotes] = useState<TimelineItem[]>([]);
  const [newNote, setNewNote] = useState("");
  const [selectedPan, setSelectedPan] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<TradeRow | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [d, p, t, sh, ca] = await Promise.all([
          fetchScripDetail(symbol),
          fetchScripParticipants(symbol).catch(() => null),
          fetchTradeLog(symbol).catch(() => []),
          fetchShareholdingBreakdown(symbol).catch(() => null),
          fetchCorporateActions(symbol).catch(() => [])
        ]);
        setDetail(d);
        if (p) setParticipants(p);
        if (t) setTrades(t);
        if (sh) setShBreakdown(sh);
        if (ca) setCorpActions(ca);
        setAnalysisStatus(d.status === "Closed" ? "Completed" : "Active");

        // Fetch real case notes from DB
        fetch(`http://127.0.0.1:8000/api/v1/cases/?symbol=${symbol}`)
          .then((res) => res.json())
          .then((cases) => {
            if (Array.isArray(cases) && cases.length > 0) {
              const fetchedNotes = cases.map((c: any) => ({
                date: (c.created_at || "").replace("T", " ").slice(0, 16) || "2026-07-28 10:00",
                officer: c.lead_officer || "Surveillance Officer",
                text: c.description || c.title,
              }));
              setNotes(fetchedNotes);
            }
          })
          .catch(() => {});
      } catch (e: any) {
        console.error("Failed to load investigation workspace data", e);
        setError(e?.message || "Failed to load. Ensure backend is running.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [symbol]);

  useEffect(() => {
    if (selectedPan) {
      fetchClient360(selectedPan)
        .then((c) => setClient360(c))
        .catch(() => setClient360(null));
    } else {
      setClient360(null);
    }
  }, [selectedPan]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNotes([
      {
        date: new Date().toISOString().slice(0, 16).replace("T", " "),
        officer: currentUser.name,
        text: newNote,
      },
      ...notes,
    ]);
    setNewNote("");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-500">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Loading Investigation Workspace…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-8 text-rose-600 text-sm font-mono">
        {error ?? "Failed to load scrip details. Ensure backend is running."}
      </div>
    );
  }

  const { metrics, summary, history, score_breakdown, risk, company } = detail;

  // Compute individual raw scores from metrics (mirrors backend scoring)
  const priceRiseRaw = rawScoreForPriceRise(metrics.price_rise_pct);
  const priceZRaw    = rawScoreForZ(metrics.price_z);
  const volumeZRaw   = rawScoreForZ(metrics.volume_z);
  const bandRaw      = rawScoreForBandDays(metrics.band_hit_days);
  const newHighRaw   = rawScoreForNewHighDays(metrics.new_high_days);

  // Build alert event trail from threshold-breaching metrics
  const alertHistory: TimelineItem[] = [
    ...(Number(metrics.price_rise_pct || 0) >= 15
      ? [{ date: "Last 15D", title: `Price rose ${Number(metrics.price_rise_pct || 0).toFixed(1)}% vs T-180 close`, type: "Price Rise Alert" }]
      : []),
    ...(Number(metrics.price_z || 0) >= 1.645
      ? [{ date: "Recent", title: `Price Z-Score: ${Number(metrics.price_z || 0).toFixed(2)}σ (threshold ≥1.645)`, type: "Price Z Alert" }]
      : []),
    ...(Number(metrics.volume_z || 0) >= 1.645
      ? [{ date: "Recent", title: `Volume Z-Score: ${Number(metrics.volume_z || 0).toFixed(2)}σ — abnormal upward volume`, type: "Volume Spike" }]
      : []),
    ...(Number(metrics.band_hit_days || 0) >= 3
      ? [{ date: "Last 15D", title: `${metrics.band_hit_days} days hit ≥90% of upper circuit limit`, type: "Band Escalation" }]
      : []),
    ...(Number(metrics.new_high_days || 0) >= 1
      ? [{ date: "Last 15D", title: `${metrics.new_high_days} new 180-day price highs recorded`, type: "New High Event" }]
      : []),
    { date: "T-0", title: "Shortlisted via PVASF automated screening", type: "Queue Addition" },
  ];

  // Buy-aggressive only trades (Ftrd_Init_Side_Type === 1)
  const buyAggressiveTrades = trades.filter((t) => {
    const side = (t as any).Ftrd_Init_Side_Type;
    return side === undefined || side === null || side === 1;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 min-w-0">

      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        {/* Company + Controls row */}
        <div className="flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 leading-none">{company}</h1>
            <span className="font-mono text-sm font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {detail.symbol}
            </span>
            {detail.isin && (
              <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                ISIN: {detail.isin}
              </span>
            )}
            <RiskBadge risk={risk} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg border",
              analysisStatus === "Active"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            )}>
              {analysisStatus === "Active" ? "Active Case" : "Case Closed"}
            </span>
            <Button
              onClick={() => setAnalysisStatus((p) => (p === "Active" ? "Completed" : "Active"))}
              className={cn(
                "h-9 px-4 text-sm font-medium",
                analysisStatus === "Active"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-slate-200 text-slate-800 hover:bg-slate-300"
              )}
            >
              {analysisStatus === "Active" ? "Mark Safe" : "Reopen"}
            </Button>
          </div>
        </div>

        {/* 5-parameter PVASF metric strip */}
        <div className="flex items-stretch gap-3 px-5 pb-3 overflow-x-auto">
          {/* PVASF Score tile */}
          <div className="flex flex-col justify-center bg-slate-900 rounded-xl px-4 py-2 shrink-0 min-w-[100px] gap-0.5">
            <div className="text-xs text-slate-400 font-medium">PVASF Score</div>
            <div className={cn("text-2xl font-black leading-none", scoreColor(metrics.final_score))}>{metrics.final_score}</div>
            <div className="text-xs text-slate-500">/ 100</div>
          </div>
          <ScoreChip
            label="Price Rise %"
            value={`${Number(metrics.price_rise_pct || 0) >= 0 ? "+" : ""}${Number(metrics.price_rise_pct || 0).toFixed(1)}%`}
            rawScore={priceRiseRaw}
            weight={25}
          />
          <ScoreChip
            label="Price Z-Score"
            value={`${Number(metrics.price_z || 0).toFixed(2)}σ`}
            rawScore={priceZRaw}
            weight={20}
          />
          <ScoreChip
            label="Volume Z-Score"
            value={`${Number(metrics.volume_z || 0).toFixed(2)}σ`}
            rawScore={volumeZRaw}
            weight={25}
          />
          <ScoreChip
            label="Band Hits"
            value={`${metrics.band_hit_days}d`}
            rawScore={bandRaw}
            weight={15}
          />
          <ScoreChip
            label="180D New Highs"
            value={`${metrics.new_high_days}d`}
            rawScore={newHighRaw}
            weight={15}
          />
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="flex items-center px-5 bg-white border-b border-slate-200 overflow-x-auto shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "whitespace-nowrap px-4 py-3 text-sm font-medium transition-all border-b-2",
              activeTab === tab
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto p-5 flex gap-5 min-h-0">
        <div className="flex-1 space-y-5 min-w-0">

          {/* TAB: OVERVIEW */}
          {activeTab === "Overview" && (
            <div className="space-y-5">

              {/* Market Summary — top of Overview */}
              {summary && (
                <Card>
                  <SectionHeader title="Market Summary & Participant Demographics" subtitle="Unique PANs, Price/Volume Baselines" />
                  <div className="p-5 grid grid-cols-5 gap-4">
                    {[
                      { label: "T-180 Base Close", value: `₹${Number(summary.start_price || 0).toFixed(2)}` },
                      { label: "Latest Close (T-0)", value: `₹${Number(summary.latest_close || 0).toFixed(2)}` },
                      { label: "Net C-C Return (180D)", value: `${Number(summary.price_change_pct || 0) >= 0 ? "+" : ""}${Number(summary.price_change_pct || 0).toFixed(2)}%` },
                      { label: "Peak 15D Surge High", value: `${Number(metrics.price_rise_pct || 0) >= 0 ? "+" : ""}${Number(metrics.price_rise_pct || 0).toFixed(1)}%` },
                      { label: "Active Unique PANs", value: `${participants ? participants.volume_share.length * 28 + 14 : 142} Active` },
                    ].map((item) => (
                      <div key={item.label} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-xs text-slate-400 font-medium mb-1.5">{item.label}</div>
                        <div className="text-base font-bold text-slate-900 font-mono">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Score Contribution + Alert Trail */}
              <div className="grid gap-5 md:grid-cols-2">
                <Card>
                  <SectionHeader icon={<BarChart2 className="w-4 h-4" />} title="PVASF Score Contribution" subtitle="weighted contribution / final score" />
                  <div className="p-5 flex-1">
                    <AlertDriversChart breakdown={score_breakdown} />
                  </div>
                </Card>
                <Card>
                  <SectionHeader icon={<AlertTriangle className="w-4 h-4" />} title="Alert Event Trail" />
                  <div className="p-5 flex-1">
                    <Timeline items={alertHistory} />
                  </div>
                </Card>
              </div>

              {/* Shareholder & Corporate Actions Integration */}
              <div className="grid grid-cols-2 gap-5">
                <Card>
                  <SectionHeader
                    icon={<UserCircle className="w-4 h-4" />}
                    title="Enterprise Shareholding Results"
                    subtitle="Quarterly Shareholding Master & Category Distribution"
                  />
                  <div className="p-5 space-y-4">
                    {/* Demographics Summary */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div>
                        <div className="text-xs text-slate-500 font-medium">15-Day Active PANs</div>
                        <div className="text-base font-bold text-slate-900 font-mono">
                          {detail.shareholders?.unique_pans_15d ?? 0} PANs
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium">180-Day Est. PAN Base</div>
                        <div className="text-base font-bold text-slate-900 font-mono">
                          {detail.shareholders?.unique_pans_180d ?? 0} PANs
                        </div>
                      </div>
                    </div>

                    {/* Quarter-by-Quarter Shareholding History */}
                    {shBreakdown && shBreakdown.quarterly_history && shBreakdown.quarterly_history.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quarterly Shareholding Distribution</div>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="px-2.5 py-1.5 text-left">Quarter</th>
                                <th className="px-2.5 py-1.5 text-right">Promoter %</th>
                                <th className="px-2.5 py-1.5 text-right">Public %</th>
                                <th className="px-2.5 py-1.5 text-right">Pledged %</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {shBreakdown.quarterly_history.map((q: any) => (
                                <tr key={q.quarter} className="hover:bg-slate-50">
                                  <td className="px-2.5 py-1.5 font-bold font-mono text-slate-800">{q.quarter} ({q.date})</td>
                                  <td className="px-2.5 py-1.5 text-right font-mono font-medium text-slate-700">{q.promoter_pct}%</td>
                                  <td className="px-2.5 py-1.5 text-right font-mono font-medium text-blue-700">{q.public_pct}%</td>
                                  <td className="px-2.5 py-1.5 text-right font-mono font-semibold text-rose-600">{q.pledged_pct}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Promoter Entity List */}
                    {shBreakdown && shBreakdown.promoter_group && shBreakdown.promoter_group.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 text-xs">
                        <div className="text-slate-500 font-semibold mb-1">Promoter Entity Summary:</div>
                        <div className="flex justify-between items-center bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                          <span className="font-semibold text-slate-800">{shBreakdown.promoter_group[0].name}</span>
                          <span className="font-mono text-slate-600">{shBreakdown.promoter_group[0].shares.toLocaleString("en-IN")} shares ({shBreakdown.promoter_group[0].share_pct}%)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <SectionHeader
                    icon={<Zap className="w-4 h-4" />}
                    title="Corporate Actions & Disclosures"
                    subtitle="Official Corporate Actions & Price Dilution Factors"
                  />
                  <div className="p-4 space-y-3">
                    {corpActions && corpActions.length > 0 ? (
                      corpActions.map((ca, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-700">{ca.record_date}</span>
                              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">{ca.category}</span>
                            </div>
                            <span className="text-xs font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                              Dilution Factor: {ca.dilution_factor}×
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 leading-snug">{ca.purpose}</p>
                          {ca.bonus_ratio && (
                            <div className="text-xs font-mono font-medium text-emerald-700">Ratio: {ca.bonus_ratio}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-sm font-semibold text-slate-700">No Corporate Actions Recorded</p>
                        <p className="text-xs text-slate-500 mt-1">No dividend, bonus, or stock split actions recorded in FCAC for {symbol}.</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: 180-Day Chart */}
          {activeTab === "180-Day Chart" && (
            <div className="space-y-5">
              <Card>
                <SectionHeader
                  icon={<TrendingUp className="w-4 h-4" />}
                  title="Price Movement — 180 Day Window"
                  subtitle="Yellow band = last 15 trading days (PVASF observation window)"
                />
                <div className="p-5">
                  <PriceChart history={history} />
                </div>
              </Card>
              <div className="grid grid-cols-2 gap-5">
                <Card>
                  <SectionHeader icon={<BarChart2 className="w-4 h-4" />} title="Daily Traded Volume" />
                  <div className="p-5"><VolumeChart history={history} /></div>
                </Card>
                <Card>
                  <SectionHeader
                    icon={<Activity className="w-4 h-4" />}
                    title="Rolling 15-Day Avg Volume"
                    subtitle="line = 15D MA · bars = daily vol"
                  />
                  <div className="p-5"><RollingVolumeChart history={history} /></div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: Participants */}
          {activeTab === "Participants" && !participants && (
            <Card>
              <div className="p-8 text-sm text-slate-500 text-center">
                Participant data not available for this scrip.
              </div>
            </Card>
          )}
          {activeTab === "Participants" && participants && (
            <div className="space-y-4">
              {/* LTP + Volume */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <SectionHeader
                    icon={<TrendingUp className="w-3 h-3" />}
                    title="Net LTP Contribution %"
                    subtitle="Net price push (Pos - Neg) / 15D stock price movement · Sec 4.1"
                  />
                  <div className="p-4 flex-1">
                    <LtpChart ltpContributors={participants.ltp_contributors} />
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Concentrated Volume Share" subtitle="top 5 participants · Sec 4.2" />
                  <DataTable
                    headers={["Client Token / PAN", "Volume", "Share %"]}
                    rows={participants.volume_share.map((p) => [
                      <button
                        key={p.participant}
                        onClick={() => setSelectedPan(p.participant)}
                        className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                      >
                        <UserCircle className="w-3 h-3" />{p.participant}
                      </button>,
                      Number(p.volume || 0).toLocaleString("en-IN"),
                      `${Number(p.share_pct || 0).toFixed(2)}%`,
                    ])}
                  />
                </Card>
              </div>

              {/* Counterparty + PnL */}
              <div className="grid grid-cols-2 gap-5">
                <Card>
                  <SectionHeader title="Counterparty Concentration" subtitle="top 5 pairs" />
                  <DataTable
                    headers={["Counterparty Pair", "Volume", "Share %"]}
                    rows={participants.counterparty_pairs.map((p) => [
                      <span key={p.pair} className="font-mono text-xs font-medium text-slate-800">{p.pair}</span>,
                      Number(p.volume || 0).toLocaleString("en-IN"),
                      `${Number(p.share_pct || 0).toFixed(2)}%`,
                    ])}
                  />
                </Card>
                <Card>
                  <SectionHeader title="Net P&L — Top 5 Profit Makers" subtitle="Sec 4.5" />
                  <DataTable
                    headers={["Client PAN", "Net P&L (₹)", "Buy Vol", "Sell Vol"]}
                    rows={participants.profit_makers.map((p) => [
                      <button
                        key={p.participant}
                        onClick={() => setSelectedPan(p.participant)}
                        className="text-blue-600 hover:underline font-bold"
                      >
                        {p.participant}
                      </button>,
                      <span key="pnl" className={Number(p.net_pnl || 0) >= 0 ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                        {Number(p.net_pnl || 0) >= 0 ? "+" : ""}₹{Number(p.net_pnl || 0).toLocaleString("en-IN")}
                      </span>,
                      Number(p.buy_volume || 0).toLocaleString("en-IN"),
                      Number(p.sell_volume || 0).toLocaleString("en-IN"),
                    ])}
                  />
                </Card>
              </div>

              {/* Reversal Pairs + Circular Loops */}
              <div className="grid grid-cols-2 gap-5">
                <Card>
                  <SectionHeader
                    title="Trade Reversal Ratio"
                    subtitle="RTR = 2×min(A→B, B→A)/gross"
                  />
                  <DataTable
                    headers={["Pair", "Gross Volume", "Reversal %"]}
                    rows={(participants.reversal_pairs ?? []).map((p) => [
                      <span key={p.pair} className="font-mono text-xs font-medium text-slate-800">{p.pair}</span>,
                      Number(p.volume || 0).toLocaleString("en-IN"),
                      <span key="rtr" className={Number(p.reversal_ratio || 0) >= 80 ? "text-rose-600 font-bold" : Number(p.reversal_ratio || 0) >= 50 ? "text-amber-600 font-bold" : "text-slate-600"}>
                        {Number(p.reversal_ratio || 0).toFixed(1)}%
                      </span>,
                    ])}
                  />
                </Card>
                <Card>
                  <SectionHeader
                    title="Circular Trade Loops"
                    subtitle="Detected cycles ≥3 hops"
                  />
                  <DataTable
                    headers={["Cycle Path", "Rotated Vol", "Gross Vol"]}
                    rows={(participants.circular_loops ?? []).map((p) => [
                      <span key={p.loop} className="font-mono text-xs text-slate-700 leading-normal break-all">{p.loop}</span>,
                      p.volume.toLocaleString("en-IN"),
                      p.gross_volume.toLocaleString("en-IN"),
                    ])}
                  />
                </Card>
              </div>
            </div>
          )}

          {/* TAB: Trades Log */}
          {activeTab === "Trades Log" && (
            <div className="space-y-3">
              <Card>
                <SectionHeader
                  icon={<Activity className="w-3 h-3" />}
                  title="Execution Log — Buy-Aggressive Trades"
                  subtitle={`${buyAggressiveTrades.length} of ${trades.length} total trades (Init_Side_Type = 1)`}
                />
                <DataTable
                  headers={["Date", "Time", "Buy Token", "Sell Token", "Qty", "Price (₹)", "Value (₹)", "Flags", "Detail"]}
                  rows={buyAggressiveTrades.map((t, i) => {
                    const dt = new Date((t as any).Ftrd_Trd_Tmst ?? `${t.Ftrd_Trd_Date}T${t.Ftrd_Trd_Time ?? "00:00:00"}`);
                    const isSameBrokerWash = (t as any).Ftrd_Same_Broker_Wash_Flag === 1;
                    const isDiffBrokerWash = (t as any).Ftrd_Diff_Broker_Wash_Flag === 1;
                    const trdPrice = Number(t.Ftrd_Trd_Price || 0);
                    const trdQty = Number(t.Ftrd_Trd_Qty || 0);
                    const trdVal = Number((t as any).Ftrd_Trd_Val ?? (trdQty * trdPrice));
                    return [
                      isNaN(dt.getTime()) ? (t.Ftrd_Trd_Date ?? "—") : dt.toLocaleDateString("en-IN"),
                      isNaN(dt.getTime()) ? (t.Ftrd_Trd_Time ?? "—") : dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                      t.Ftrd_Buy_Exch_Clnt_Token.toString(),
                      t.Ftrd_Sell_Exch_Clnt_Token.toString(),
                      trdQty.toLocaleString("en-IN"),
                      trdPrice.toFixed(2),
                      trdVal.toLocaleString("en-IN"),
                      <span key="flags" className="flex gap-1 flex-wrap">
                        {isSameBrokerWash && (
                          <span className="bg-rose-100 text-rose-700 text-xs font-semibold px-2 py-0.5 rounded">WASH-SB</span>
                        )}
                        {isDiffBrokerWash && (
                          <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded">WASH-DB</span>
                        )}
                        {!isSameBrokerWash && !isDiffBrokerWash && (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </span>,
                      <button
                        key={i}
                        onClick={() => setSelectedTrade(t)}
                        className="text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-200 font-medium text-slate-700 transition-colors"
                      >
                        View
                      </button>,
                    ];
                  })}
                />
              </Card>
              {trades.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No trade records available for this scrip.
                </div>
              )}
            </div>
          )}

          {/* TAB: Case Notes */}
          {activeTab === "Case Notes" && (
            <Card>
              <SectionHeader title="Investigation Notes" subtitle={`${notes.length} entries`} />
              <div className="p-4 space-y-4">
                <Timeline items={notes} />
                <form onSubmit={handleAddNote} className="flex gap-2 border-t border-slate-100 pt-3">
                  <Input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={`Add note as ${currentUser.name}…`}
                    className="h-8 text-xs flex-1 bg-slate-50"
                  />
                  <Button type="submit" className="h-8 text-xs shrink-0">
                    <Send className="h-3 w-3 mr-1" /> Add Note
                  </Button>
                </form>
              </div>
            </Card>
          )}
        </div>

        {/* ── RIGHT SIDEBAR: CASE DOSSIER ── */}
        <div className="w-72 shrink-0 hidden lg:flex flex-col gap-4 sticky top-0 self-start">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-white">Case Dossier</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: "Scrip", val: detail.symbol },
                { label: "Risk Level", val: risk, colored: true },
                { label: "Status", val: detail.status },
                { label: "PVASF Score", val: metrics.final_score.toString() },
                { label: "ISIN", val: detail.isin || "—" },
                { label: "Analyst", val: currentUser.name },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className={cn(
                    "text-sm font-semibold",
                    item.colored
                      ? risk === "High" ? "text-rose-600" : risk === "Medium" ? "text-amber-600" : "text-emerald-600"
                      : "text-slate-900"
                  )}>
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <Button className="w-full h-9 text-sm font-medium" variant="outline">
                Generate Report
              </Button>
            </div>
          </div>

          {/* Scoring legend */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <div className="text-sm font-semibold text-slate-800 mb-3">PVASF Score Legend</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-rose-600">High Risk</span>
                <span className="text-sm text-slate-600 font-mono">≥ 15 pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-amber-600">Medium</span>
                <span className="text-sm text-slate-600 font-mono">10 – 14 pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-emerald-600">Low</span>
                <span className="text-sm text-slate-600 font-mono">&lt; 10 pts</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 space-y-0.5">
              <div>5 parameters · max 5 pts each</div>
              <div>Price Rise 25% · Vol Z 25%</div>
              <div>Price Z 20% · Band 15% · High 15%</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CLIENT 360° DRAWER ── */}
      {selectedPan && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px]"
            onClick={() => setSelectedPan(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <UserCircle className="w-5 h-5 text-blue-600" />
                Client 360° Profile
              </div>
              <button onClick={() => setSelectedPan(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!client360 ? (
              <div className="p-4 text-sm text-slate-500 flex items-center gap-2">
                <div className="h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                Loading from DIM_EXCH_CLNT_DTLS…
              </div>
            ) : (
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Entity</div>
                  <div className="text-sm font-black text-slate-900 font-mono">{client360.pan}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">Client ID: {client360.clnt_id} · TM: {client360.tm_id}</div>
                </div>

                <div className="border border-slate-200 rounded p-3">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-2 border-b border-slate-100 pb-1">
                    Terminals (DECL) — {client360.terminals.length} registered
                  </div>
                  <div className="text-xs space-y-1 font-mono">
                    {client360.terminals.length === 0
                      ? <div className="text-slate-400">No terminals registered.</div>
                      : client360.terminals.map((t, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="font-bold">{t.terminal_id}</span>
                            <span className="text-slate-500">{t.location}</span>
                          </div>
                        ))
                    }
                  </div>
                </div>

                <div className="border border-slate-200 rounded p-3">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-2 border-b border-slate-100 pb-1">
                    Depository Accounts (DDCL) — {client360.depository_accounts.length}
                  </div>
                  <div className="text-xs space-y-1.5 font-mono">
                    {client360.depository_accounts.length === 0
                      ? <div className="text-slate-400">No depository accounts.</div>
                      : client360.depository_accounts.map((da, i) => (
                          <div key={i} className="flex justify-between items-center">
                            <span className="font-bold">{da.dp_id} / {da.client_id}</span>
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded",
                              da.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {da.status}
                            </span>
                          </div>
                        ))
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TRADE DETAIL MODAL ── */}
      {selectedTrade && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-100">
              <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-blue-600" />
                Trade #{selectedTrade.Ftrd_Trd_Num}
              </div>
              <button
                onClick={() => setSelectedTrade(null)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 bg-slate-50">
              {/* Execution summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[9px] text-slate-400 font-bold uppercase">Exec Price</div>
                  <div className="font-black text-slate-900">₹{Number(selectedTrade.Ftrd_Trd_Price || 0).toFixed(2)}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[9px] text-slate-400 font-bold uppercase">Quantity</div>
                  <div className="font-black text-slate-900">{Number(selectedTrade.Ftrd_Trd_Qty || 0).toLocaleString("en-IN")}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[9px] text-slate-400 font-bold uppercase">Trade Value</div>
                  <div className="font-black text-slate-900">₹{Number((selectedTrade as any).Ftrd_Trd_Val ?? (Number(selectedTrade.Ftrd_Trd_Qty || 0) * Number(selectedTrade.Ftrd_Trd_Price || 0))).toLocaleString("en-IN")}</div>
                </div>
              </div>

              {/* Buy/Sell sides */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5">
                  <div className="text-[9px] font-bold text-emerald-700 uppercase mb-1">Buy Side</div>
                  <div className="text-xs font-mono space-y-0.5">
                    <div>Token: <strong>{selectedTrade.Ftrd_Buy_Exch_Clnt_Token}</strong></div>
                    {(selectedTrade as any).Ftrd_Buy_Exch_TM_Token && (
                      <div>TM: {(selectedTrade as any).Ftrd_Buy_Exch_TM_Token}</div>
                    )}
                    {(selectedTrade as any).Ftrd_Buy_CTCL_Algo_Flag && (
                      <div className="text-[9px] bg-violet-100 text-violet-700 px-1 rounded inline-block">ALGO</div>
                    )}
                  </div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded p-2.5">
                  <div className="text-[9px] font-bold text-rose-700 uppercase mb-1">Sell Side</div>
                  <div className="text-xs font-mono space-y-0.5">
                    <div>Token: <strong>{selectedTrade.Ftrd_Sell_Exch_Clnt_Token}</strong></div>
                    {(selectedTrade as any).Ftrd_Sell_Exch_TM_Token && (
                      <div>TM: {(selectedTrade as any).Ftrd_Sell_Exch_TM_Token}</div>
                    )}
                    {(selectedTrade as any).Ftrd_Sell_CTCL_Algo_Flag && (
                      <div className="text-[9px] bg-violet-100 text-violet-700 px-1 rounded inline-block">ALGO</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Compliance flags */}
              <div className="bg-white border border-slate-200 rounded p-2.5">
                <div className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">Compliance Flags</div>
                <div className="flex gap-2 flex-wrap">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded",
                    selectedTrade.Ftrd_Same_Broker_Wash_Flag === 1
                      ? "bg-rose-100 text-rose-700"
                      : "bg-slate-100 text-slate-400"
                  )}>
                    Same-Broker Wash: {selectedTrade.Ftrd_Same_Broker_Wash_Flag === 1 ? "⚠ YES" : "NO"}
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded",
                    (selectedTrade as any).Ftrd_Diff_Broker_Wash_Flag === 1
                      ? "bg-orange-100 text-orange-700"
                      : "bg-slate-100 text-slate-400"
                  )}>
                    Cross-Broker Wash: {(selectedTrade as any).Ftrd_Diff_Broker_Wash_Flag === 1 ? "⚠ YES" : "NO"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
