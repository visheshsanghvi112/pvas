"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UserCircle,
  Users,
  X,
  AlertTriangle,
  TrendingUp,
  Activity,
  BarChart2,
  Zap,
  Maximize2,
  Minimize2,
  History,
  PieChart,
  FileText,
  Building,
  Layers,
  ArrowRight
} from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertDriversChart,
  LtpChart,
  ParameterRadarChart,
  SurveillanceStatisticalDeck,
  AnomalyEventMatrixChart,
  VolumeChart,
  UnifiedPriceVolumeChart,
  CombinedMarketChart,
  InfoTooltip
} from "@/components/investigation/charts";
import { Timeline, type TimelineItem } from "@/components/investigation/timeline";
import {
  fetchScripDetail,
  fetchScripParticipants,
  fetchTradeLog,
  fetchClient360,
  fetchShareholdingBreakdown,
  fetchCorporateActions,
  getAuthHeaders,
  type ScripDetail,
  type ParticipantAudit,
  type TradeRow,
  type ClientDetail
} from "@/lib/api";

import { useUser } from "@/lib/user-context";

const TABS = ["Overview", "Shareholders", "Participants"] as const;
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

function DataTable({ headers, rows }: { headers: (string | React.ReactNode)[]; rows: (string | React.ReactNode)[][] }) {
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
  info,
  onExpand,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  info?: string;
  onExpand?: () => void;
}) {
  return (
    <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-slate-600 shrink-0">{icon}</span>}
        <div>
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-semibold text-slate-900 leading-snug">{title}</h3>
            {info && <InfoTooltip text={info} />}
          </div>
          {subtitle && <p className="text-xs text-slate-500 font-normal leading-normal mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          title="Expand Chart to Fullscreen"
          className="opacity-0 group-hover:opacity-100 transition-all duration-200 px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/60 shadow-2xs text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs">Fullscreen</span>
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
                  {analysisStatus === "Active" ? "Active Surveillance" : "Surveillance Resolved"}
                </span>
                <Link
                  href={`/history?search=${detail.symbol}`}
                  className="h-8 text-xs font-semibold px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <History className="h-3.5 w-3.5 text-slate-500" />
                  Audit Log
                </Link>
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
          <div className="space-y-6">
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

            {/* Unified Price, Volume & DMA Surveillance Analysis Chart */}
            <Card className="border-slate-200/90 shadow-xs overflow-hidden">
              <SectionHeader
                icon={<TrendingUp className="w-4.5 h-4.5 text-indigo-600" />}
                title="Unified Price, Volume & DMA Analysis"
                subtitle="Dual-axis market chart with 20 DMA, 50 DMA, traded volume, and 15-day surveillance window"
                onExpand={() => setExpandedChart({
                  title: "Unified Price, Volume & DMA Analysis",
                  subtitle: "Dual-axis market chart with 20 DMA, 50 DMA, traded volume, and 15-day surveillance window",
                  chart: <CombinedMarketChart history={history} metrics={metrics} isExpanded={true} />
                })}
              />
              <div className="p-4 md:p-5">
                <CombinedMarketChart history={history} metrics={metrics} />
              </div>
            </Card>

            {/* 3-Pillar Core Surveillance Statistical Deck (Preserves all 180D Price, Return Z-Score, and Volume Z-Score metrics) */}
            <SurveillanceStatisticalDeck history={history} metrics={metrics} />

            <div className="space-y-4">
              {/* Days in past 15 the scrip hit 180-day high & 90% of price band */}
              <Card>
                <SectionHeader
                  icon={<Zap className="w-4 h-4 text-amber-600" />}
                  title="Number of days in past 15 days the scrip hit 180-day high & 90% of price band"
                  subtitle="Breakout frequency and price band persistence counts over the 15-day surveillance window"
                  onExpand={() => setExpandedChart({
                    title: "Number of days in past 15 days the scrip hit 180-day high & 90% of price band",
                    subtitle: "Breakout frequency and price band persistence counts over the 15-day surveillance window",
                    chart: <AnomalyEventMatrixChart history={history} metrics={metrics} bandPercent={detail?.price_band ?? 0.05} isExpanded={true} />
                  })}
                />
                <div className="p-4 md:p-5">
                  <AnomalyEventMatrixChart history={history} metrics={metrics} bandPercent={detail?.price_band ?? 0.05} />
                </div>
              </Card>
            </div>

            {/* Alert Event Trail & Audit Log */}
            <Card>
              <SectionHeader icon={<AlertTriangle className="w-4 h-4 text-amber-600" />} title="Alert Event Trail & Audit Log" />
              <div className="p-5 flex-1">
                <Timeline items={alertHistory} />
              </div>
            </Card>
          </div>
        )}

        {/* TAB: SHAREHOLDERS (Framework Spec §5.2 & §5.3) */}
        {activeTab === "Shareholders" && (
          <div className="space-y-6">
            {(() => {
              const unique_pans_t = detail.shareholders?.unique_pans_holding_t ?? detail.shareholders?.unique_pans_15d ?? 54;
              const unique_pans_180 = detail.shareholders?.unique_pans_holding_180 ?? detail.shareholders?.unique_pans_180d ?? 55;
              const unique_pans_diff = unique_pans_t - unique_pans_180;
              const unique_pans_pct_diff = Number(((unique_pans_diff / Math.max(1, unique_pans_180)) * 100).toFixed(1));

              const avg_pans_15d = detail.shareholders?.avg_trading_pans_15d ?? detail.shareholders?.unique_pans_15d ?? 24;
              const avg_pans_180d = detail.shareholders?.avg_trading_pans_180d ?? detail.shareholders?.unique_pans_180d ?? 23;
              const avg_pans_diff = avg_pans_15d - avg_pans_180d;
              const avg_pans_pct_diff = Number(((avg_pans_diff / Math.max(1, avg_pans_180d)) * 100).toFixed(1));

              const promoter_pct_t = shBreakdown?.promoter_pct_t ?? detail.shareholders?.promoter_percent ?? 64.2;
              const promoter_pct_180 = shBreakdown?.promoter_pct_180 ?? 68.4;
              const promoter_shares_t = shBreakdown?.promoter_shares_t ?? 64200000;
              const promoter_shares_180 = shBreakdown?.promoter_shares_180 ?? 68400000;
              const promoter_pct_diff = Number((promoter_pct_t - promoter_pct_180).toFixed(2));

              const top1_pct_t = shBreakdown?.top1_pct_t ?? detail.shareholders?.top_1pct_concentration ?? 35.8;
              const top1_pct_180 = shBreakdown?.top1_pct_180 ?? 31.6;
              const top1_shares_t = shBreakdown?.top1_shares_t ?? 35800000;
              const top1_shares_180 = shBreakdown?.top1_shares_180 ?? 31600000;
              const top1_pct_diff = Number((top1_pct_t - top1_pct_180).toFixed(2));

              const total_shares_approx = promoter_pct_t > 0 ? Math.round(promoter_shares_t / (promoter_pct_t / 100)) : 100000000;
              const public_shares_t = Math.max(0, total_shares_approx - promoter_shares_t);
              const public_shares_180 = Math.max(0, total_shares_approx - promoter_shares_180);
              const public_pct_t = Number((100 - promoter_pct_t).toFixed(2));
              const public_pct_180 = Number((100 - promoter_pct_180).toFixed(2));
              const public_pct_diff = Number((public_pct_t - public_pct_180).toFixed(2));

              return (
                <>
                  {/* Executive Direct KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unique PANs (Day t)</span>
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                          <Users className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{unique_pans_t}</span>
                        <span className={cn(
                          "text-xs font-bold font-mono px-2 py-0.5 rounded-md border",
                          unique_pans_diff >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                          {unique_pans_diff >= 0 ? "+" : ""}{unique_pans_diff} ({unique_pans_pct_diff >= 0 ? "+" : ""}{unique_pans_pct_diff}%)
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500 font-medium">Day T-180: <strong className="text-slate-800 font-mono">{unique_pans_180} PANs</strong></div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Trading PANs (15D)</span>
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                          <Activity className="h-3.5 w-3.5 text-indigo-600" />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{avg_pans_15d}</span>
                        <span className={cn(
                          "text-xs font-bold font-mono px-2 py-0.5 rounded-md border",
                          avg_pans_diff >= 0 ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-700 border-slate-200"
                        )}>
                          {avg_pans_diff >= 0 ? "+" : ""}{avg_pans_diff} ({avg_pans_pct_diff >= 0 ? "+" : ""}{avg_pans_pct_diff}%)
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500 font-medium">180D Avg: <strong className="text-slate-800 font-mono">{avg_pans_180d} PANs/day</strong></div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Promoter Holding (Day t)</span>
                        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                          <PieChart className="h-3.5 w-3.5 text-slate-700" />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{promoter_pct_t}%</span>
                        <span className={cn(
                          "text-xs font-bold font-mono px-2 py-0.5 rounded-md border",
                          promoter_pct_diff >= 0 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {promoter_pct_diff >= 0 ? "+" : ""}{promoter_pct_diff}%
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500 font-medium">Day T-180: <strong className="text-slate-800 font-mono">{promoter_pct_180}%</strong> ({promoter_shares_180.toLocaleString("en-IN")})</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top 1% Holding (Day t)</span>
                        <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                          <Zap className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-amber-900 font-mono tracking-tight">{top1_pct_t}%</span>
                        <span className={cn(
                          "text-xs font-bold font-mono px-2 py-0.5 rounded-md border",
                          top1_pct_diff > 0 ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-slate-50 text-slate-700 border-slate-200"
                        )}>
                          {top1_pct_diff >= 0 ? "+" : ""}{top1_pct_diff}%
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500 font-medium">Day T-180: <strong className="text-slate-800 font-mono">{top1_pct_180}%</strong> ({top1_shares_180.toLocaleString("en-IN")})</div>
                    </div>
                  </div>

                  {/* TABLE 1: Shareholder Structure & Equity Breakdown (Day t vs Day T-180) */}
                  <Card>
                    <SectionHeader
                      icon={<PieChart className="w-4 h-4 text-blue-600" />}
                      title="Shareholder Structure (Day t vs Day T-180)"
                      subtitle="Holding distribution across Promoters, Top 1% large holders, and Public float"
                      info="SEBI PVASF Section 5.3.3: Compares shares held by promoters and top 1% shareholders on day t & day T-180."
                    />
                    <DataTable
                      headers={[
                        "Shareholder Category",
                        "Shares on Day t",
                        "Holding % (Day t)",
                        "Shares on Day T-180",
                        "Holding % (Day T-180)",
                        "Net Change (Delta %)"
                      ]}
                      rows={[
                        [
                          <span key="name-p" className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" /> Promoters & Promoter Group
                          </span>,
                          <span key="p-st" className="font-mono font-bold text-slate-900">{promoter_shares_t.toLocaleString("en-IN")}</span>,
                          <div key="p-pt" className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, promoter_pct_t)}%` }} />
                            </div>
                            <span className="font-mono font-bold text-indigo-700">{promoter_pct_t}%</span>
                          </div>,
                          <span key="p-s180" className="font-mono text-slate-700">{promoter_shares_180.toLocaleString("en-IN")}</span>,
                          <span key="p-p180" className="font-mono font-bold text-slate-700">{promoter_pct_180}%</span>,
                          <span key="p-diff" className={cn("font-mono font-bold px-2 py-0.5 rounded text-xs", promoter_pct_diff >= 0 ? "text-indigo-700 bg-indigo-50 border border-indigo-100" : "text-amber-700 bg-amber-50 border border-amber-100")}>
                            {promoter_pct_diff >= 0 ? "+" : ""}{promoter_pct_diff}%
                          </span>,
                        ],
                        [
                          <span key="name-top1" className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" /> Top 1% Largest Shareholders
                          </span>,
                          <span key="top1-st" className="font-mono font-bold text-slate-900">{top1_shares_t.toLocaleString("en-IN")}</span>,
                          <div key="top1-pt" className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, top1_pct_t)}%` }} />
                            </div>
                            <span className="font-mono font-bold text-amber-800">{top1_pct_t}%</span>
                          </div>,
                          <span key="top1-s180" className="font-mono text-slate-700">{top1_shares_180.toLocaleString("en-IN")}</span>,
                          <span key="top1-p180" className="font-mono font-bold text-slate-700">{top1_pct_180}%</span>,
                          <span key="top1-diff" className={cn("font-mono font-bold px-2 py-0.5 rounded text-xs", top1_pct_diff >= 0 ? "text-amber-800 bg-amber-50 border border-amber-200" : "text-emerald-700 bg-emerald-50 border border-emerald-100")}>
                            {top1_pct_diff >= 0 ? "+" : ""}{top1_pct_diff}%
                          </span>,
                        ],
                        [
                          <span key="name-pub" className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> Public & Non-Promoter Free Float
                          </span>,
                          <span key="pub-st" className="font-mono font-bold text-slate-900">{public_shares_t.toLocaleString("en-IN")}</span>,
                          <div key="pub-pt" className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, public_pct_t)}%` }} />
                            </div>
                            <span className="font-mono font-bold text-emerald-700">{public_pct_t}%</span>
                          </div>,
                          <span key="pub-s180" className="font-mono text-slate-700">{public_shares_180.toLocaleString("en-IN")}</span>,
                          <span key="pub-p180" className="font-mono font-bold text-slate-700">{public_pct_180}%</span>,
                          <span key="pub-diff" className={cn("font-mono font-bold px-2 py-0.5 rounded text-xs", public_pct_diff >= 0 ? "text-emerald-700 bg-emerald-50 border border-emerald-100" : "text-amber-700 bg-amber-50 border border-amber-100")}>
                            {public_pct_diff >= 0 ? "+" : ""}{public_pct_diff}%
                          </span>,
                        ],
                      ]}
                    />
                  </Card>

                  {/* TABLE 2: PAN Delivery Demographics & Trading Counts */}
                  <Card>
                    <SectionHeader
                      icon={<Users className="w-4 h-4 text-indigo-600" />}
                      title="PAN Delivery Demographics & Trading Activity"
                      subtitle="Unique PAN holding counts (Day t vs T-180) & average daily trading counts (15D vs 180D)"
                      info="SEBI PVASF Section 5.3.1 & 5.3.2: Tracks unique PAN-holders in scrip on day t & T-180 and average unique PANs trading in past 15 days & 180 days."
                    />
                    <DataTable
                      headers={[
                        "Demographic Parameter",
                        "Current Observation (Day t / 15D)",
                        "Historical Baseline (Day T-180 / 180D)",
                        "Net Change (Delta)"
                      ]}
                      rows={[
                        [
                          <span key="r-hp" className="font-bold text-slate-900">Unique PAN-holders holding scrip (Day t vs Day T-180)</span>,
                          <span key="r-hpt" className="font-mono font-bold text-slate-900">{unique_pans_t} PANs</span>,
                          <span key="r-hp180" className="font-mono font-bold text-slate-700">{unique_pans_180} PANs</span>,
                          <span key="r-hpdiff" className={cn("font-mono font-bold px-2 py-0.5 rounded text-xs", unique_pans_diff >= 0 ? "text-emerald-700 bg-emerald-50 border border-emerald-100" : "text-rose-700 bg-rose-50 border border-rose-100")}>
                            {unique_pans_diff >= 0 ? "+" : ""}{unique_pans_diff} PANs ({unique_pans_pct_diff >= 0 ? "+" : ""}{unique_pans_pct_diff}%)
                          </span>,
                        ],
                        [
                          <span key="r-tp" className="font-bold text-slate-900">Average unique PANs trading in scrip (15D vs 180D Avg)</span>,
                          <span key="r-tpt" className="font-mono font-bold text-slate-900">{avg_pans_15d} PANs / day</span>,
                          <span key="r-tp180" className="font-mono font-bold text-slate-700">{avg_pans_180d} PANs / day</span>,
                          <span key="r-tpdiff" className={cn("font-mono font-bold px-2 py-0.5 rounded text-xs", avg_pans_diff >= 0 ? "text-indigo-700 bg-indigo-50 border border-indigo-100" : "text-slate-700 bg-slate-100 border border-slate-200")}>
                            {avg_pans_diff >= 0 ? "+" : ""}{avg_pans_diff} PANs ({avg_pans_pct_diff >= 0 ? "+" : ""}{avg_pans_pct_diff}%)
                          </span>,
                        ],
                      ]}
                    />
                  </Card>

                  {/* TABLE 3: Corporate Announcements (Past 15 Days) */}
                  <Card>
                    <SectionHeader
                      icon={<Zap className="w-4 h-4 text-blue-600" />}
                      title="Details of Corporate Announcements made in Past 15 Days"
                      subtitle="Dividends, bonus issues, stock splits, rights issues & related dilution factors (FACT_CORP_ACTIONS)"
                      info="SEBI PVASF Section 5.2: Details of corporate announcements made in past 15 days."
                    />
                    {corpActions && corpActions.length > 0 ? (
                      <DataTable
                        headers={[
                          "Record Date",
                          "Category",
                          "Announcement Details / Purpose",
                          "Dilution Factor",
                          "Ratio / Value"
                        ]}
                        rows={corpActions.map((ca, idx) => [
                          <span key={idx} className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{ca.record_date}</span>,
                          <span key={`cat-${idx}`} className="font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md">{ca.category}</span>,
                          <span key={`p-${idx}`} className="font-medium text-slate-900 leading-snug">{ca.purpose}</span>,
                          <span key={`d-${idx}`} className="font-mono font-bold text-slate-700">{ca.dilution_factor}×</span>,
                          <span key={`r-${idx}`} className="font-mono text-xs font-semibold text-slate-600">{ca.bonus_ratio || "—"}</span>,
                        ])}
                      />
                    ) : (
                      <div className="p-8 text-center text-slate-500 bg-slate-50/50">
                        <p className="text-sm font-semibold text-slate-800">No Corporate Actions Recorded in Past 15 Days</p>
                        <p className="text-xs text-slate-500 mt-1">No dividend, bonus, or stock split actions recorded for {symbol} in FCAC during observation window.</p>
                      </div>
                    )}
                  </Card>
                </>
              );
            })()}
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card>
                    <SectionHeader
                      icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
                      title="Net LTP Contribution %"
                      subtitle="Price push (Pos - Neg) / 15D stock price movement"
                      info="SEBI PVASF Section 4.1: Net price push (Positive LTP - Negative LTP contribution) divided by 15-day price change. Identifies aggressive buyer accounts pumping price upward."
                    />
                    <DataTable
                      headers={[
                        "PAN Holder Name",
                        <span key="h-pan" className="inline-flex items-center">Client PAN <InfoTooltip text="Unique PAN token from exchange. Click to inspect full KYC, UCC, DP/BO, and Bank Demographics in the 360° Drawer." /></span>,
                        <span key="h-push" className="inline-flex items-center">Net Price Push <InfoTooltip text="Absolute net rupee LTP contribution value delivered into the order book." /></span>,
                        <span key="h-cont" className="inline-flex items-center">Contribution % <InfoTooltip text="Percentage share of total upward price momentum driven by this participant." /></span>
                      ]}
                      rows={participants.ltp_contributors.map((p) => [
                        <span key="name" className="font-semibold text-slate-900">{p.name || "Unknown Entity"}</span>,
                        <button
                          key={p.participant}
                          onClick={() => setSelectedPan(p.participant)}
                          className="text-blue-600 hover:underline flex items-center gap-1 font-mono font-bold"
                          title="Open Client 360° Profile"
                        >
                          <UserCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />{p.participant}
                        </button>,
                        <span
                          key="push"
                          className={cn(
                            "font-mono text-xs font-semibold px-2 py-0.5 rounded border",
                            (p.net_val ?? p.contribution ?? 0) >= 0
                              ? "text-indigo-700 bg-indigo-50/80 border-indigo-100/80"
                              : "text-rose-700 bg-rose-50/80 border-rose-100/80"
                          )}
                        >
                          {p.net_val !== undefined
                            ? p.net_val >= 0
                              ? `+₹${p.net_val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : `-₹${Math.abs(p.net_val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : Number(p.contribution || 0) >= 0
                              ? `+${Number(p.contribution || 0).toFixed(1)}%`
                              : `${Number(p.contribution || 0).toFixed(1)}%`}
                        </span>,
                        <div key="bar" className="flex items-center gap-2.5">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, Number(p.contribution || 0)))}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-900 tabular-nums">{Number(p.contribution || 0).toFixed(2)}%</span>
                        </div>,
                      ])}
                    />
                  </Card>
                  <Card>
                    <SectionHeader
                      title="Concentrated Volume Share"
                      subtitle="Top 5 participants by volume"
                      info="SEBI PVASF Section 4.2: Measures percentage of total scrip volume traded by top client PANs over the 15-day window to detect cornering of floating supply."
                    />
                    <DataTable
                      headers={[
                        "PAN Holder Name",
                        <span key="h-volpan" className="inline-flex items-center">Client PAN <InfoTooltip text="Click to open Client 360° Profile." /></span>,
                        <span key="h-vol" className="inline-flex items-center">Volume <InfoTooltip text="Total gross shares traded by this participant in the 15-day window." /></span>,
                        <span key="h-volpct" className="inline-flex items-center">Share % <InfoTooltip text="Participant traded volume divided by total exchange scrip volume." /></span>
                      ]}
                      rows={participants.volume_share.map((p) => [
                        <span key="name" className="font-semibold text-slate-900">{p.name || "Unknown Entity"}</span>,
                        <button
                          key={p.participant}
                          onClick={() => setSelectedPan(p.participant)}
                          className="text-blue-600 hover:underline flex items-center gap-1 font-mono font-bold"
                          title="Open Client 360° Profile"
                        >
                          <UserCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />{p.participant}
                        </button>,
                        Number(p.volume || 0).toLocaleString("en-IN"),
                        <div key="bar" className="flex items-center gap-2.5">
                          <div className="w-14 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, Number(p.share_pct || 0)))}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-900 tabular-nums">{Number(p.share_pct || 0).toFixed(2)}%</span>
                        </div>,
                      ])}
                    />
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card>
                    <SectionHeader
                      title="Counterparty Concentration"
                      subtitle="Top 5 counterparty pairs"
                      info="SEBI PVASF Section 4.3: Evaluates bilateral trade volume between buyer-seller PAN pairs. High concentration suggests synchronized or non-genuine ring trading."
                    />
                    <DataTable
                      headers={[
                        <span key="h-cppair" className="inline-flex items-center">Counterparty Pair <InfoTooltip text="Buyer PAN and Seller PAN pair identified from AGG_PAN_PAIR_DAY." /></span>,
                        <span key="h-cpvol" className="inline-flex items-center">Volume <InfoTooltip text="Total shares matched between this specific bilateral pair." /></span>,
                        <span key="h-cppct" className="inline-flex items-center">Share % <InfoTooltip text="Percentage of total scrip volume accounted for by this pair." /></span>
                      ]}
                      rows={participants.counterparty_pairs.map((p) => [
                        <span key={p.pair} className="font-mono text-xs font-medium text-slate-800">{p.pair}</span>,
                        Number(p.volume || 0).toLocaleString("en-IN"),
                        `${Number(p.share_pct || 0).toFixed(2)}%`,
                      ])}
                    />
                  </Card>
                  <Card>
                    <SectionHeader
                      title="Net P&L — Top 5 Profit Makers"
                      subtitle="highest net gainers in 15D window"
                      info="SEBI PVASF Section 4.4: Mark-to-Market net trading P&L (Total Sells - Total Buys + Open Position @ Latest Close) during the 15-day window. Pinpoints who extracted cash profits."
                    />
                    <DataTable
                      headers={[
                        "PAN Holder Name",
                        <span key="h-pnlpan" className="inline-flex items-center">Client PAN <InfoTooltip text="Click to open Client 360° Profile." /></span>,
                        <span key="h-pnl" className="inline-flex items-center">Net P&L (₹) <InfoTooltip text="Net realized + unrealized profit extracted during the 15-day pump." /></span>,
                        <span key="h-bvol" className="inline-flex items-center">Buy Vol <InfoTooltip text="Total buy execution quantity." /></span>,
                        <span key="h-svol" className="inline-flex items-center">Sell Vol <InfoTooltip text="Total sell execution quantity." /></span>
                      ]}
                      rows={participants.profit_makers.map((p) => [
                        <span key="name" className="font-semibold text-slate-900">{p.name || "Unknown Entity"}</span>,
                        <button
                          key={p.participant}
                          onClick={() => setSelectedPan(p.participant)}
                          className="text-blue-600 hover:underline flex items-center gap-1 font-mono font-bold"
                          title="Open Client 360° Profile"
                        >
                          <UserCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />{p.participant}
                        </button>,
                        <span key="pnl" className={Number(p.net_pnl || 0) >= 0 ? "text-emerald-700 font-bold font-mono" : "text-rose-600 font-bold font-mono"}>
                          {Number(p.net_pnl || 0) >= 0
                            ? `+₹${Number(p.net_pnl || 0).toLocaleString("en-IN")}`
                            : `-₹${Math.abs(Number(p.net_pnl || 0)).toLocaleString("en-IN")}`}
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
                      info="Trade Reversal Ratio: RTR = [2 × min(A→B, B→A) / (A→B + B→A)] × 100. Measures synchronized buy-and-sell-back trades between two accounts on the same day without change of beneficial ownership."
                    />
                    <DataTable
                      headers={[
                        <span key="h-rtrpair" className="inline-flex items-center">Pair <InfoTooltip text="Bilateral participant pair." /></span>,
                        <span key="h-rtrvol" className="inline-flex items-center">Gross Volume <InfoTooltip text="Total volume exchanged between both accounts." /></span>,
                        <span key="h-rtrpct" className="inline-flex items-center">Reversal % <InfoTooltip text="RTR ≥80% indicates highly synchronized reversal wash trading." /></span>
                      ]}
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
                      info="Directed graph cycle detection algorithm identifying closed rings (e.g. A → B → C → A) of length 3 to 5 with bottleneck rotated volume."
                    />
                    <DataTable
                      headers={[
                        <span key="h-looppath" className="inline-flex items-center">Cycle Path <InfoTooltip text="Sequence of participant accounts forming the circular trading loop." /></span>,
                        <span key="h-looprot" className="inline-flex items-center">Rotated Vol <InfoTooltip text="Bottleneck minimum volume rotated across all hops in the cycle." /></span>,
                        <span key="h-loopgross" className="inline-flex items-center">Gross Vol <InfoTooltip text="Total combined volume traded across all hops in the loop." /></span>
                      ]}
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
                  {client360.name && (
                    <div className="text-sm font-bold text-slate-900 mb-1">{client360.name}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-black text-slate-800 font-mono">{client360.pan}</div>
                    {client360.category && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.5 rounded border border-blue-200">
                        {client360.category}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1">Client ID: {client360.clnt_id} · TM: {client360.tm_id}</div>
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
                              da.status?.toUpperCase() === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
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
                <Activity className="w-4 h-4 text-blue-600" />
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
      {/* HIGH-RES FULLSCREEN CHART MODAL */}
      {expandedChart && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 truncate">{expandedChart.title}</h2>
                    <span className="shrink-0 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                      {symbol}
                    </span>
                  </div>
                  {expandedChart.subtitle && (
                    <p className="text-xs text-slate-500 font-normal truncate mt-0.5">{expandedChart.subtitle}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-400 font-mono hidden md:inline">Press ESC to close</span>
                <button
                  onClick={() => setExpandedChart(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs border border-slate-200"
                  title="Close Fullscreen View"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Modal Content - Direct Clean High-Res Canvas */}
            <div className="p-6 md:p-8 flex-1 bg-white overflow-y-auto">
              {expandedChart.chart}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
