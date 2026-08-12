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
  Zap,
  Maximize2,
  Minimize2
} from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertDriversChart,
  LtpChart,
  ParameterRadarChart,
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
  fetchCases,
  getAuthHeaders,
  type ScripDetail,
  type ParticipantAudit,
  type TradeRow,
  type ClientDetail
} from "@/lib/api";

import { useUser } from "@/lib/user-context";

const TABS = ["Overview", "Participants", "Case Notes"] as const;
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
  return (
    <div className="flex-1 min-w-[115px] bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-col justify-between gap-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs hover:border-slate-300 shadow-2xs">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="text-lg font-extrabold text-slate-900 font-mono leading-none tracking-tight my-0.5">{value}</div>
      <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
        <span className="text-[11px] font-medium text-slate-400">Wt: {weight}%</span>
        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">Score {rawScore}/5</span>
      </div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3.5 py-2.5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3.5 py-4 text-center text-slate-400 italic font-medium">No records found</td>
            </tr>
          ) : (
            rows.map((r, ri) => (
              <tr key={ri} className="hover:bg-blue-50/30 transition-colors">
                {r.map((cell, ci) => (
                  <td key={ci} className="px-3.5 py-2.5 text-slate-700 font-medium">{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon,
  onExpand,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onExpand?: () => void;
}) {
  return (
    <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-slate-600">{icon}</span>}
        <div>
          <h3 className="text-xs font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-[11px] font-medium text-slate-500">{subtitle}</p>}
        </div>
      </div>

      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          title="Expand Chart to Fullscreen"
          className="opacity-0 group-hover:opacity-100 transition-all duration-200 px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/60 shadow-2xs text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px]">Fullscreen</span>
        </button>
      )}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("group border border-slate-200/90 bg-white rounded-2xl shadow-[0_2px_10px_-2px_rgba(15,23,42,0.06),0_1px_3px_-1px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] transition-all duration-200 flex flex-col overflow-hidden relative", className)}>
      {children}
    </div>
  );
}

export function InvestigationWorkspace({ symbol }: { symbol: string }) {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedChart, setExpandedChart] = useState<{
    title: string;
    subtitle?: string;
    chart: React.ReactNode;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (expandedChart) {
          setExpandedChart(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, expandedChart]);

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
        const [d, p, t, sh, ca, cases] = await Promise.all([
          fetchScripDetail(symbol),
          fetchScripParticipants(symbol).catch(() => null),
          fetchTradeLog(symbol).catch(() => []),
          fetchShareholdingBreakdown(symbol).catch(() => null),
          fetchCorporateActions(symbol).catch(() => []),
          // Bug fix: use centralized fetchCases() instead of raw hardcoded fetch
          fetchCases().catch(() => [])
        ]);
        setDetail(d);
        if (p) setParticipants(p);
        if (t) setTrades(t);
        if (sh) setShBreakdown(sh);
        if (ca) setCorpActions(ca);
        setAnalysisStatus(d.status === "Closed" ? "Completed" : "Active");

        // Map case records for this symbol into timeline notes
        const symbolCases = cases.filter((c: any) => c.target_symbol === symbol);
        if (symbolCases.length > 0) {
          const fetchedNotes = symbolCases.map((c: any) => ({
            date: (c.created_at || "").replace("T", " ").slice(0, 16) || "Today",
            officer: c.lead_officer || "Surveillance Officer",
            text: c.description || c.title,
          }));
          setNotes(fetchedNotes);
        }
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

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const noteText = newNote.trim();
    const optimisticNote = {
      date: new Date().toISOString().slice(0, 16).replace("T", " "),
      officer: currentUser.name,
      text: noteText,
    };

    // Optimistic update: show immediately in UI
    setNotes((prev) => [optimisticNote, ...prev]);
    setNewNote("");

    // Persist to backend as a new Case record with auth headers
    try {
      const baseHost = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : "http://127.0.0.1:8000";
      await fetch(`${baseHost}/api/v1/cases/`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          target_symbol: symbol,
          title: `Case Note — ${symbol}`,
          lead_officer: currentUser.name,
          status: "Draft",
          priority: "Low",
          description: noteText,
        }),
      });
    } catch (err) {
      console.warn("[InvestigationWorkspace] Failed to persist note to backend:", err);
      // Note already shown in UI via optimistic update; user is not blocked
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-500">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Loading Scrip Analysis Workspace…</p>
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
    <div className={cn(
      "flex flex-col h-full bg-slate-50 min-w-0 transition-all duration-300",
      isFullscreen && "fixed inset-0 z-50 h-screen w-screen bg-slate-100 p-0 overflow-hidden animate-in fade-in zoom-in-95"
    )}>

      {/* ── UNIFIED HERO COMMAND HEADER & NAV BAR ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
        {/* Top Header & Metric Strip (Hidden in Fullscreen Mode) */}
        {!isFullscreen && (
          <div className="px-5 pt-4 pb-3 space-y-3">
            {/* Row 1: Company + Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-extrabold text-slate-900 leading-none">{company}</h1>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  {detail.symbol}
                </span>
                {detail.isin && (
                  <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
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
                    "h-8 text-xs font-semibold px-3.5",
                    analysisStatus === "Active"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                  )}
                >
                  {analysisStatus === "Active" ? "Mark Safe" : "Reopen"}
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* Integrated Tab Bar at Bottom Edge */}
        <div className="flex items-center justify-between px-5 py-2 bg-slate-50/90 border-t border-slate-100 overflow-x-auto shrink-0">
          <div className="bg-slate-200/70 p-1 rounded-xl inline-flex gap-1 border border-slate-200/90 shadow-2xs">
            {TABS.map((tab) => {
              const isTabActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center gap-1.5 group relative",
                    isTabActive
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-medium"
                  )}
                >
                  <span>{tab}</span>

                  {/* Inline Fullscreen trigger on Hover */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFullscreen(!isFullscreen);
                    }}
                    title={isFullscreen ? "Exit Fullscreen (ESC)" : `Expand ${tab} to Fullscreen`}
                    className={cn(
                      "inline-flex items-center justify-center p-1 rounded-md transition-all duration-200",
                      "opacity-0 group-hover:opacity-100 hover:bg-slate-200/80 text-slate-500 hover:text-blue-700",
                      isFullscreen && isTabActive && "opacity-100 bg-blue-100 text-blue-700"
                    )}
                  >
                    {isFullscreen && isTabActive ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {isFullscreen && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">{detail.symbol}</span>
              <span className="text-slate-400">·</span>
              <span>Fullscreen Mode</span>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-200 px-1.5 py-0.5 rounded">ESC to exit</span>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className={cn(
        "flex-1 overflow-y-auto p-5 space-y-5 min-w-0 mx-auto w-full transition-all",
        isFullscreen ? "max-w-none px-8 py-6" : "max-w-7xl"
      )}>

        {/* TAB: OVERVIEW */}
        {activeTab === "Overview" && (
          <div className="space-y-5">
            {/* 5-Parameter Risk Radar Signature Command Card */}
            <Card className="bg-gradient-to-br from-white via-slate-50/60 to-blue-50/20 border-slate-200/90 shadow-xs">
              <SectionHeader
                icon={<Activity className="w-4.5 h-4.5 text-blue-600" />}
                title="5-Parameter Risk Radar Profile & Intelligence Signature"
                subtitle="Comprehensive 0–5 parameter score radar mapped against Risk Thresholds"
                onExpand={() => setExpandedChart({
                  title: "5-Parameter Risk Radar Profile & Intelligence Signature",
                  subtitle: "Comprehensive 0–5 parameter score radar mapped against Risk Thresholds",
                  chart: <ParameterRadarChart metrics={metrics} />
                })}
              />
              <div className="p-4 md:p-5">
                <ParameterRadarChart metrics={metrics} />
              </div>
            </Card>

            {/* Market Summary */}
            {summary && (
              <Card>
                <SectionHeader title="Market Summary & Price-Volume Baselines" subtitle="Rolling 15-Day vs 180-Day Price & Volume Dynamics" />
                <div className="p-4 md:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {[
                    { label: "T-180 Base Close", value: `₹${Number(summary.start_price || 0).toFixed(2)}` },
                    { label: "Latest Close (T-0)", value: `₹${Number(summary.latest_close || 0).toFixed(2)}` },
                    { label: "Net C-C Return (180D)", value: `${Number(summary.price_change_pct || 0) >= 0 ? "+" : ""}${Number(summary.price_change_pct || 0).toFixed(2)}%` },
                    { label: "Peak 15D Surge High", value: `${Number(metrics.price_rise_pct || 0) >= 0 ? "+" : ""}${Number(metrics.price_rise_pct || 0).toFixed(1)}%` },
                    { label: "Active Unique PANs (15D)", value: detail.shareholders?.unique_pans_15d != null ? `${detail.shareholders.unique_pans_15d} Active` : "—" },
                  ].map((item) => (
                    <div key={item.label} className="bg-slate-50/80 border border-slate-200/90 hover:bg-white hover:border-slate-300 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all">
                      <div className="text-xs text-slate-500 font-semibold mb-1">{item.label}</div>
                      <div className="text-base font-bold text-slate-900 font-mono tracking-tight">{item.value}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Score Contribution + Alert Trail */}
            <div className="grid gap-5 md:grid-cols-2">
              <Card>
                <SectionHeader
                  icon={<BarChart2 className="w-4 h-4" />}
                  title="PVASF Score Contribution"
                  subtitle="weighted contribution / final score"
                  onExpand={() => setExpandedChart({
                    title: "PVASF Score Contribution",
                    subtitle: "Weighted parameter contribution to final score",
                    chart: <AlertDriversChart breakdown={score_breakdown} />
                  })}
                />
                <div className="p-5 flex-1">
                  <AlertDriversChart breakdown={score_breakdown} />
                </div>
              </Card>
              <Card>
                <SectionHeader icon={<AlertTriangle className="w-4 h-4" />} title="Alert Event Trail & Audit Log" />
                <div className="p-5 flex-1">
                  <Timeline items={alertHistory} />
                </div>
              </Card>
            </div>

            {/* 180-Day Price Movement Chart */}
            <Card>
              <SectionHeader
                icon={<TrendingUp className="w-4 h-4" />}
                title="Price Movement — 180 Day Window"
                subtitle="Yellow band = last 15 trading days (PVASF observation window)"
                onExpand={() => setExpandedChart({
                  title: "Price Movement — 180 Day Window",
                  subtitle: "Yellow band = last 15 trading days (PVASF observation window)",
                  chart: <PriceChart history={history} isExpanded={true} />
                })}
              />
              <div className="p-5">
                <PriceChart history={history} />
              </div>
            </Card>

            {/* Volume Dynamics */}
            <div className="grid grid-cols-2 gap-5">
              <Card>
                <SectionHeader
                  icon={<BarChart2 className="w-4 h-4" />}
                  title="Daily Traded Volume"
                  onExpand={() => setExpandedChart({
                    title: "Daily Traded Volume",
                    subtitle: "Daily traded shares / contracts volume history with anomaly highlighting",
                    chart: <VolumeChart history={history} isExpanded={true} />
                  })}
                />
                <div className="p-5"><VolumeChart history={history} /></div>
              </Card>
              <Card>
                <SectionHeader
                  icon={<Activity className="w-4 h-4" />}
                  title="Rolling 15-Day Avg Volume"
                  subtitle="line = 15D MA · bars = daily vol"
                  onExpand={() => setExpandedChart({
                    title: "Rolling 15-Day Avg Volume",
                    subtitle: "line = 15D MA · bars = daily vol",
                    chart: <RollingVolumeChart history={history} isExpanded={true} />
                  })}
                />
                <div className="p-5"><RollingVolumeChart history={history} /></div>
              </Card>
            </div>

            {/* Corporate Actions & Disclosures */}
            <Card>
              <SectionHeader
                icon={<Zap className="w-4 h-4" />}
                title="Corporate Announcements & Disclosures"
                subtitle="Official Corporate Actions, Dividends, Stock Splits & Dilution Factors in past 15 days"
              />
              <div className="p-5 space-y-4">
                {corpActions && corpActions.length > 0 ? (
                  corpActions.map((ca, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md">{ca.record_date}</span>
                          <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">{ca.category}</span>
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                          Dilution Factor: {ca.dilution_factor}×
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{ca.purpose}</p>
                      {ca.bonus_ratio && (
                        <div className="text-xs font-mono font-medium text-slate-700">Ratio: {ca.bonus_ratio}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-sm font-semibold text-slate-700">No Corporate Actions Recorded in Past 15 Days</p>
                    <p className="text-xs text-slate-500 mt-1">No dividend, bonus, or stock split actions recorded for {symbol} in FCAC during observation window.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Shareholder Demographics */}
            <Card>
              <SectionHeader
                icon={<UserCircle className="w-4 h-4" />}
                title="Shareholder Demographics & Distribution"
                subtitle="Unique PAN count on Day t vs T-180 and Promoter / Top 1% Shareholding"
              />
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">15-Day Active PANs</div>
                    <div className="text-lg font-bold text-slate-900 font-mono">
                      {detail.shareholders?.unique_pans_15d ?? 0} PANs
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">180-Day Est. PAN Base</div>
                    <div className="text-lg font-bold text-slate-900 font-mono">
                      {detail.shareholders?.unique_pans_180d ?? 0} PANs
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Promoter Group Holding</div>
                    <div className="text-lg font-bold text-blue-700 font-mono">
                      {shBreakdown?.quarterly_history?.[0]?.promoter_pct ?? "54.2"}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Pledged Shares %</div>
                    <div className="text-lg font-bold text-rose-600 font-mono">
                      {shBreakdown?.quarterly_history?.[0]?.pledged_pct ?? "0.0"}%
                    </div>
                  </div>
                </div>

                {shBreakdown && shBreakdown.quarterly_history && shBreakdown.quarterly_history.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quarterly Shareholding Master History</div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2.5 text-left">Quarter</th>
                            <th className="px-3.5 py-2.5 text-right">Promoter %</th>
                            <th className="px-3.5 py-2.5 text-right">Public %</th>
                            <th className="px-3.5 py-2.5 text-right">Pledged Shares %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {shBreakdown.quarterly_history.map((q: any) => (
                            <tr key={q.quarter} className="hover:bg-slate-50">
                              <td className="px-3.5 py-2 font-bold font-mono text-slate-800">{q.quarter} ({q.date})</td>
                              <td className="px-3.5 py-2 text-right font-mono font-medium text-slate-700">{q.promoter_pct}%</td>
                              <td className="px-3.5 py-2 text-right font-mono font-medium text-blue-700">{q.public_pct}%</td>
                              <td className="px-3.5 py-2 text-right font-mono font-semibold text-rose-600">{q.pledged_pct}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {shBreakdown && shBreakdown.promoter_group && shBreakdown.promoter_group.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 text-xs">
                    <div className="text-slate-500 font-semibold mb-2">Promoter Entity Summary:</div>
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
                      <span className="font-bold text-slate-800">{shBreakdown.promoter_group[0].name}</span>
                      <span className="font-mono text-slate-700 font-semibold">{shBreakdown.promoter_group[0].shares.toLocaleString("en-IN")} shares ({shBreakdown.promoter_group[0].share_pct}%)</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* TAB: PARTICIPANTS (Possible Suspects — Framework Spec §5.4) */}
        {activeTab === "Participants" && (
          <div className="space-y-5">
            {!participants ? (
              <Card>
                <div className="p-8 text-sm text-slate-500 text-center">
                  Participant audit data not available for this scrip.
                </div>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-5">
                  <Card>
                    <SectionHeader
                      icon={<TrendingUp className="w-4 h-4" />}
                      title="Net LTP Contribution % (Sec 4.1)"
                      subtitle="Net price push (Pos - Neg) / 15D stock price movement"
                      onExpand={() => setExpandedChart({
                        title: "Net LTP Contribution % (Sec 4.1)",
                        subtitle: "Net price push (Pos - Neg) / 15D stock price movement",
                        chart: <LtpChart ltpContributors={participants.ltp_contributors} />
                      })}
                    />
                    <div className="p-4 flex-1">
                      <LtpChart ltpContributors={participants.ltp_contributors} />
                    </div>
                  </Card>
                  <Card>
                    <SectionHeader title="Concentrated Volume Share (Sec 4.2)" subtitle="top 5 participants by volume" />
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

                <div className="grid grid-cols-2 gap-5">
                  <Card>
                    <SectionHeader title="Counterparty Concentration (Sec 4.3)" subtitle="top 5 counterparty pairs" />
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
                    <SectionHeader title="Net P&L — Top 5 Profit Makers" subtitle="highest net gainers in 15D window" />
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

                <div className="grid grid-cols-2 gap-5">
                  <Card>
                    <SectionHeader
                      title="Trade Reversal Ratio (RTR)"
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
              </>
            )}
          </div>
        )}



        {/* TAB: CASE NOTES */}
        {activeTab === "Case Notes" && (
          <div className="space-y-5">
            {/* Case Dossier Card */}
            <Card>
              <SectionHeader icon={<FolderLock className="w-4 h-4" />} title="Case Dossier & Investigation Summary" subtitle="Regulatory surveillance profile & metadata" />
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "Scrip", val: detail.symbol },
                    { label: "Risk Level", val: risk, colored: true },
                    { label: "Status", val: detail.status },
                    { label: "PVASF Score", val: metrics.final_score.toString() },
                    { label: "ISIN", val: detail.isin || "—" },
                    { label: "Analyst", val: currentUser.name },
                  ].map((item) => (
                    <div key={item.label} className="bg-slate-50 border border-slate-200/90 p-3 rounded-xl">
                      <div className="text-xs font-semibold text-slate-500 mb-1">{item.label}</div>
                      <div className={cn(
                        "text-base font-bold font-mono",
                        item.colored
                          ? risk === "High" ? "text-rose-600 font-extrabold" : risk === "Medium" ? "text-amber-600 font-extrabold" : "text-emerald-600 font-extrabold"
                          : "text-slate-900"
                      )}>
                        {item.val}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex justify-end">
                  <Button className="h-9 px-5 text-xs font-extrabold rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-2xs" variant="outline">
                    Generate Report
                  </Button>
                </div>
              </div>
            </Card>

            {/* Timeline Notes */}
            <Card>
              <SectionHeader title="Officer Investigation Notes & Timeline" subtitle={`${notes.length} log entries recorded`} />
              <div className="p-5 space-y-4">
                <Timeline items={notes} />
                <form onSubmit={handleAddNote} className="flex gap-2 border-t border-slate-100 pt-4">
                  <Input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={`Add investigation note as ${currentUser.name}…`}
                    className="h-9 text-xs flex-1 bg-slate-50"
                  />
                  <Button type="submit" className="h-9 text-xs shrink-0 px-4">
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Add Note
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        )}
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
                Client 360 Intelligence
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
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Entity Details</div>
                  <div className="text-sm font-black text-slate-900 font-mono">{client360.pan}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">Client ID: {client360.clnt_id} · TM: {client360.tm_id}</div>
                </div>

                <div className="border border-slate-200 rounded p-3">
                  <div className="text-xs text-slate-700 font-bold mb-2 border-b border-slate-100 pb-1">
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
                  <div className="text-xs text-slate-700 font-bold mb-2 border-b border-slate-100 pb-1">
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
                  <div className="text-xs text-slate-500 font-semibold mb-0.5">Exec Price</div>
                  <div className="font-bold text-slate-900 font-mono">₹{Number(selectedTrade.Ftrd_Trd_Price || 0).toFixed(2)}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-xs text-slate-500 font-semibold mb-0.5">Quantity</div>
                  <div className="font-bold text-slate-900 font-mono">{Number(selectedTrade.Ftrd_Trd_Qty || 0).toLocaleString("en-IN")}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-xs text-slate-500 font-semibold mb-0.5">Trade Value</div>
                  <div className="font-bold text-slate-900 font-mono">₹{Number((selectedTrade as any).Ftrd_Trd_Val ?? (Number(selectedTrade.Ftrd_Trd_Qty || 0) * Number(selectedTrade.Ftrd_Trd_Price || 0))).toLocaleString("en-IN")}</div>
                </div>
              </div>

              {/* Buy/Sell sides */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5">
                  <div className="text-xs font-bold text-emerald-800 mb-1">Buy Side</div>
                  <div className="text-xs font-mono space-y-0.5">
                    <div>Token: <strong>{selectedTrade.Ftrd_Buy_Exch_Clnt_Token}</strong></div>
                    {(selectedTrade as any).Ftrd_Buy_Exch_TM_Token && (
                      <div>TM: {(selectedTrade as any).Ftrd_Buy_Exch_TM_Token}</div>
                    )}
                    {(selectedTrade as any).Ftrd_Buy_CTCL_Algo_Flag && (
                      <div className="text-[10px] bg-violet-100 text-violet-700 px-1 rounded inline-block font-semibold">Algo</div>
                    )}
                  </div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded p-2.5">
                  <div className="text-xs font-bold text-rose-800 mb-1">Sell Side</div>
                  <div className="text-xs font-mono space-y-0.5">
                    <div>Token: <strong>{selectedTrade.Ftrd_Sell_Exch_Clnt_Token}</strong></div>
                    {(selectedTrade as any).Ftrd_Sell_Exch_TM_Token && (
                      <div>TM: {(selectedTrade as any).Ftrd_Sell_Exch_TM_Token}</div>
                    )}
                    {(selectedTrade as any).Ftrd_Sell_CTCL_Algo_Flag && (
                      <div className="text-[10px] bg-violet-100 text-violet-700 px-1 rounded inline-block font-semibold">Algo</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Compliance flags */}
              <div className="bg-white border border-slate-200 rounded p-2.5">
                <div className="text-xs font-bold text-slate-700 mb-1.5">Compliance Flags</div>
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

      {/* Fullscreen High-Definition Chart Modal */}
      {expandedChart && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/90">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">{expandedChart.title}</h2>
                  {expandedChart.subtitle && (
                    <p className="text-xs text-slate-500 font-medium">{expandedChart.subtitle}</p>
                  )}
                </div>
                <span className="ml-2 text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg">
                  {symbol}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">Press ESC to close</span>
                <button
                  onClick={() => setExpandedChart(null)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="Close Fullscreen View"
                >
                  <X className="w-4.5 h-4.5" />
                  <span className="text-xs font-extrabold">Close</span>
                </button>
              </div>
            </div>

            {/* Modal Content - Expanded High-Res Canvas */}
            <div className="p-6 md:p-8 flex-1 bg-slate-50/50 flex flex-col justify-center items-center min-h-[480px]">
              <div className="w-full h-[520px] bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex items-center justify-center overflow-hidden">
                {expandedChart.chart}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
