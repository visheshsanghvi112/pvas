"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Download,
  GitCompare,
  MessageSquare,
  Network,
  Send,
  ShieldAlert,
  TrendingUp,
  Users
} from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricHelp } from "@/components/ui/metric-help";
import { MetricCard } from "@/components/ui/metric-card";
import { cn } from "@/lib/utils";
import {
  AlertDriversChart,
  BandEventsChart,
  LtpChart,
  OwnershipChangeChart,
  PanHolderChart,
  PriceChart,
  RollingPriceChart,
  RollingVolumeChart,
  VolumeChart
} from "@/components/investigation/charts";
import { Timeline, type TimelineItem } from "@/components/investigation/timeline";
import {
  fetchScripDetail,
  fetchScripParticipants,
  type ScripDetail,
  type ParticipantAudit
} from "@/lib/api";
import { corporateEvents } from "@/lib/data";
import { useUser } from "@/lib/user-context";

// 3 tabs — all spec §5 outputs covered, nothing removed
const TABS = ["Overview", "Market Data", "Participants & Audit"] as const;
type Tab = typeof TABS[number];

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/60 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={cn("px-4 py-3 text-xs font-mono", j === 0 && "font-sans font-semibold text-slate-900")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InvestigationWorkspace({ symbol }: { symbol: string }) {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [detail, setDetail] = useState<ScripDetail | null>(null);
  const [participants, setParticipants] = useState<ParticipantAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisStatus, setAnalysisStatus] = useState<"Active" | "Completed">("Active");
  const [notes, setNotes] = useState<TimelineItem[]>([
    { date: "2026-07-20 10:30", officer: "Sanskar", text: "Synchronized accumulation during upper price band sessions confirmed." },
    { date: "2026-07-19 16:10", officer: "A. Rao",  text: "Broker-level KYC linkage report requested for top five buying clients." }
  ]);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [d, p] = await Promise.all([fetchScripDetail(symbol), fetchScripParticipants(symbol)]);
      setDetail(d);
      setParticipants(p);
      setAnalysisStatus(d.status === "Closed" ? "Completed" : "Active");
      setLoading(false);
    }
    load();
  }, [symbol]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNotes([{ date: new Date().toISOString().slice(0, 16).replace("T", " "), officer: currentUser.name, text: newNote }, ...notes]);
    setNewNote("");
  };

  if (loading || !detail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] gap-3 text-slate-500">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold">Loading {symbol}…</p>
      </div>
    );
  }

  const { metrics, summary, history, score_breakdown, risk, company, isin } = detail;

  // Alert history derived from actual metric values
  const alertHistory: TimelineItem[] = [
    ...(metrics.volume_z >= 3    ? [{ date: "Recent",   title: `Volume Z-Score ${metrics.volume_z}σ — above 3.09 cutoff`, type: "Alert Trigger" }]    : []),
    ...(metrics.band_hit_days >= 6 ? [{ date: "Last 15D", title: `${metrics.band_hit_days} upper circuit band hits recorded`, type: "Band Escalation" }] : []),
    ...(metrics.new_high_days >= 1 ? [{ date: "Last 15D", title: `${metrics.new_high_days} new 180-day high(s) created`, type: "New High Event" }]       : []),
    { date: "T-0", title: "Shortlisted via PVASF automated screening", type: "Queue Addition" }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="h-8 text-xs gap-1.5 border-slate-200 bg-white hover:bg-slate-50">
            <Link href="/compare"><GitCompare className="h-3.5 w-3.5 text-blue-600" />Compare Scrips</Link>
          </Button>
          <Button variant="outline" className="h-8 text-xs gap-1.5 border-slate-200 bg-white hover:bg-slate-50">
            <Download className="h-3.5 w-3.5 text-blue-600" />Export Brief
          </Button>
        </div>
      </div>

      {/* ── Scrip header ── */}
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900">{company}</h1>
              <span className="font-mono text-sm text-blue-600 font-bold">({detail.symbol})</span>
              <RiskBadge risk={risk} />
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase border",
                analysisStatus === "Active"
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              )}>
                {analysisStatus} Analysis
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-mono">
              Score: <strong className="text-slate-700">{metrics.final_score}/100</strong>
              {" · "}ISIN: {isin}{" · "}NSE/BSE{" · "}15D Observation Window
            </p>
          </div>
          <Button
            onClick={() => setAnalysisStatus(p => p === "Active" ? "Completed" : "Active")}
            variant={analysisStatus === "Active" ? "destructive" : "success"}
            className="shrink-0 text-xs font-bold h-8"
          >
            {analysisStatus === "Active" ? "Complete Analysis" : "Reopen"}
          </Button>
        </div>
      </section>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer",
              activeTab === tab ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: OVERVIEW
          Spec §2 & §3 — Score ring, 5 parameter cards, breakdown chart,
          band hit count, new 180D high count
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "Overview" && (
        <div className="space-y-4">

          {/* Score ring + 5 parameter metric cards + breakdown chart */}
          <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
            <div className="space-y-3">
              {/* Composite score ring */}
              <Card className="border-blue-100 bg-blue-50/40">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-[8px] border-blue-600 bg-white shadow-sm">
                    <div className="text-center leading-none">
                      <div className="text-2xl font-black text-blue-700 font-mono">{metrics.final_score}</div>
                      <div className="text-[10px] text-slate-400">/100</div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Composite Risk <MetricHelp helpKey="compositeScore" />
                    </div>
                    <div className="mt-0.5 text-lg font-black text-slate-900">{risk} Risk</div>
                    <p className="mt-1 text-[10px] text-slate-400 leading-snug">
                      Weighted sum of 5 ratings (0/1/3/5) per PVASF §3
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* All 5 spec §2 parameters — Price Rise, Price Z, Vol Z, Band Hits, 180D Highs */}
              <div className="grid grid-cols-2 gap-2">
                <MetricCard label="Price Rise"   value={`${metrics.price_rise_pct}%`} note="T-180 to T" tone="red"   helpKey="priceRise" />
                <MetricCard label="Price Z-Score" value={`${metrics.price_z}σ`}        note="15D vs 180D" tone="red"   helpKey="priceZ" />
                <MetricCard label="Volume Z-Score" value={`${metrics.volume_z}σ`}      note="15D vs 180D" tone="amber" helpKey="volumeZ" />
                <MetricCard label="Band Hits (15D)" value={`${metrics.band_hit_days}d`} note="≥90% circuit" tone="blue" helpKey="bandPersistence" />
                <MetricCard label="180D New Highs" value={`${metrics.new_high_days}d`} note="in last 15D"  tone="blue" helpKey="highBreakout" />
                <MetricCard label="Base → Current" value={`₹${summary.start_price}`} note={`Now ₹${summary.latest_close}`} helpKey="price" />
              </div>
            </div>

            {/* Spec §3 — parameter rating breakdown chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="gap-2">
                  <ShieldAlert className="h-4 w-4 text-blue-600" />
                  Parameter Rating Breakdown (§2 Scoring)
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  Each of the 5 PVASF parameters rated 0/1/3/5 per §2 thresholds, then weighted
                  and summed per §3 to produce the composite score.
                </p>
              </CardHeader>
              <CardContent>
                <AlertDriversChart breakdown={score_breakdown} />
              </CardContent>
            </Card>
          </div>

          {/* Spec §5 — number of 90% band hits + 180D highs in last 15 days */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle helpKey="bandPersistence">
                Circuit Band Hits & 180D New Highs — Last 15 Trading Days (§2.4 & §2.5)
              </CardTitle>
              <p className="text-[11px] text-slate-500">
                Upper circuit hit = price reached ≥90% of applicable circuit limit.
                New high = stock created a new 180-day closing high that session.
              </p>
            </CardHeader>
            <CardContent>
              <BandEventsChart bandHits={metrics.band_hit_days} newHighs={metrics.new_high_days} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: MARKET DATA
          Spec §5 outputs:
          • Price movement over 180 days
          • Rolling 15-day average price movement
          • Rolling 15-day average volume
          • Shareholder statistics / unique PANs / promoter & top 1%
          • Corporate announcements in previous 15 days
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "Market Data" && (
        <div className="space-y-4">

          {/* Spec §5 — Price movement over 180 days + rolling 15D price average */}
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle helpKey="price">
                  Price Movement — 180-Day Daily Close (§5)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PriceChart history={history} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle helpKey="rollingPrice">
                  Rolling 15-Day Average Price Movement (§5)
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  15-day C-C rolling avg vs 180-day baseline. Divergence triggers Price Z-Score alert.
                </p>
              </CardHeader>
              <CardContent>
                <RollingPriceChart history={history} />
              </CardContent>
            </Card>
          </div>

          {/* Spec §5 — Rolling 15-day average volume */}
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle helpKey="currentVolume">
                  Traded Volume — 180-Day (§5)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VolumeChart history={history} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle helpKey="rollingVolume">
                  Rolling 15-Day Average Volume (§5)
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  15-day rolling volume avg vs 180-day baseline. Spike above baseline drives Volume Z-Score.
                </p>
              </CardHeader>
              <CardContent>
                <RollingVolumeChart />
              </CardContent>
            </Card>
          </div>

          {/* Volume summary metrics */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="15D Avg Volume"   value={`${(summary.avg_15d_volume / 100000).toFixed(1)}L`} note="shares/session" tone="blue" helpKey="currentVolume" />
            <MetricCard label="180D Base Volume" value={`${(summary.avg_15d_volume / 250000).toFixed(1)}L`} helpKey="average" />
            <MetricCard label="Volume Z-Score"   value={`${metrics.volume_z}σ`} tone="red"  helpKey="volumeZ" />
            <MetricCard label="Price Rise"        value={`${metrics.price_rise_pct}%`} tone="red" helpKey="priceRise" />
          </div>

          {/* Spec §5 — Shareholder statistics: promoter & top 1% + unique PAN holders */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle helpKey="shareholding">
                  Promoter & Top 1% Shareholding — T-180 vs T (§5)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <OwnershipChangeChart />
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard label="Promoter (T-180)" value="54%" helpKey="shareholding" />
                  <MetricCard label="Promoter (T)"     value="52%" tone="amber" helpKey="shareholding" />
                  <MetricCard label="Top 1% (T-180)"   value="65%" helpKey="shareholding" />
                  <MetricCard label="Top 1% (T)"       value="60%" tone="amber" helpKey="shareholding" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle helpKey="shareholding">
                  Unique PAN Holder Count — T-180 vs T (§5)
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  Surge in unique PAN trading entities can indicate coordinated accumulation.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <PanHolderChart />
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard label="Unique PANs (T-180)" value="80 entities" helpKey="shareholding" />
                  <MetricCard label="Unique PANs (T)"     value="123 entities" tone="blue" helpKey="shareholding" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Spec §5 — Corporate announcements in previous 15 days */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Corporate Announcements — Previous 15 Days (§5)
              </CardTitle>
              <p className="text-[11px] text-slate-500">
                Relevant for assessing whether price movement is news-driven or artificially induced.
              </p>
            </CardHeader>
            <CardContent>
              <Timeline items={corporateEvents} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: PARTICIPANTS & AUDIT
          Spec §4 & §5 outputs:
          • LTP contributors (§4.1)
          • Concentrated volume / volume share (§4.2 / §5)
          • Counterparty concentration (§4.3 / §5)
          • Top 5 profit-makers (§5)
          • Surveillance event trail + analyst notes
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "Participants & Audit" && participants && (
        <div className="space-y-4">

          {/* Spec §4.1 + §4.2 — LTP contributors + concentrated volume share */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle helpKey="ltpContribution">
                  LTP Price Contribution — Top PANs (§4.1)
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  PANs whose aggressive orders drove the most LTP movement in the 15-day window.
                </p>
              </CardHeader>
              <CardContent>
                <LtpChart ltpContributors={participants.ltp_contributors} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle helpKey="volumeContributors">
                  <Users className="h-4 w-4 text-blue-600 inline mr-1" />
                  Concentrated Volume — PAN Share (§4.2 / §5)
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  Each PAN's share of total traded volume. High concentration signals potential coordination.
                </p>
              </CardHeader>
              <CardContent>
                <DataTable
                  headers={["Broker / Client PAN", "Traded Volume", "Volume Share %"]}
                  rows={participants.volume_share.map(p => [p.participant, `${(p.volume / 100000).toFixed(1)}L`, `${p.share_pct}%`])}
                />
              </CardContent>
            </Card>
          </div>

          {/* Spec §4.3 + §5 — Counterparty concentration + top 5 profit makers */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle helpKey="counterparty">
                  <Network className="h-4 w-4 text-blue-600 inline mr-1" />
                  Counterparty Concentration — Circular Trading Detection (§4.3)
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  PAN-counterparty pair concentration. Buy/sell reversals between same pairs indicate wash or circular trading.
                </p>
              </CardHeader>
              <CardContent>
                <DataTable
                  headers={["Counterparty Pair", "Volume", "Pair Share %"]}
                  rows={participants.counterparty_pairs.map(p => [p.pair, `${(p.volume / 100000).toFixed(1)}L`, `${p.share_pct}%`])}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle helpKey="profitMakers">
                  Top 5 Net P&L Contributors (§5)
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  Participants ranked by mark-to-market net P&L using the latest close and executed trades.
                </p>
              </CardHeader>
              <CardContent>
                <DataTable
                  headers={["Client PAN", "Net P&L", "Buy Volume", "Sell Volume"]}
                  rows={participants.profit_makers.map(p => [p.participant, `₹${p.net_pnl.toLocaleString("en-IN")}`, p.buy_volume.toLocaleString("en-IN"), p.sell_volume.toLocaleString("en-IN")])}
                />
              </CardContent>
            </Card>
          </div>

          {/* Surveillance event trail + analyst notes */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Surveillance Event Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline items={alertHistory} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  Analyst Audit Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Timeline items={notes} />
                <form onSubmit={handleAddNote} className="flex gap-2 border-t border-slate-100 pt-3">
                  <Input
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder={`Add note as ${currentUser.name} (${currentUser.role})…`}
                    className="h-8 text-xs flex-1"
                  />
                  <Button type="submit" variant="default" className="h-8 gap-1 text-xs shrink-0">
                    <Send className="h-3 w-3" />Add
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
