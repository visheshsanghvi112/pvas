"use client";

import { useState } from "react";
import { Building2, LineChart, MessageSquare, Network, PieChart, ShieldAlert, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricHelp } from "@/components/ui/metric-help";
import { MetricCard } from "@/components/ui/metric-card";
import { cn } from "@/lib/utils";
import { AlertDriversChart, BandEventsChart, LtpChart, OwnershipChangeChart, PanHolderChart, PriceChart, RollingPriceChart, RollingVolumeChart, VolumeChart } from "@/components/investigation/charts";
import { Timeline } from "@/components/investigation/timeline";
import { corporateEvents, counterpartyPairs, participants, profitMakers, remarks } from "@/lib/data";

const tabs = ["Overview", "Price Analysis", "Volume Analysis", "Shareholding", "Corporate", "Participants", "Remarks", "History"];

const scoreBreakdown = [
  { label: "Price Rise", score: 5, weight: 25, contribution: 25 },
  { label: "Price Z", score: 5, weight: 20, contribution: 20 },
  { label: "Volume Z", score: 5, weight: 25, contribution: 25 },
  { label: "Band Persistence", score: 5, weight: 15, contribution: 15 },
  { label: "180 Day New High", score: 2, weight: 15, contribution: 6 }
];

function ScoreRing() {
  return (
    <Card className="border-blue-100 bg-blue-50/80 text-slate-950">
      <CardContent className="flex items-center gap-5 p-5">
        <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-[10px] border-blue-500 bg-white">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-700">91</div>
            <div className="text-xs text-slate-500">/100</div>
          </div>
        </div>
        <div>
          <div className="flex items-center text-xs font-semibold text-slate-500">Composite Score <MetricHelp helpKey="compositeScore" /></div>
          <div className="mt-2 text-2xl font-bold">High Risk</div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600">
            {scoreBreakdown.map((item) => (
              <span key={item.label}>{item.label}: {item.contribution}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CounterpartyGraph() {
  return (
    <div className="relative min-h-64 overflow-hidden rounded-xl border bg-slate-50 p-6">
      {[
        ["PAN A", "left-8 top-8 bg-rose-100 text-rose-700"],
        ["PAN B", "right-10 top-16 bg-blue-100 text-blue-700"],
        ["PAN C", "left-24 bottom-10 bg-amber-100 text-amber-700"],
        ["PAN D", "right-20 bottom-8 bg-emerald-100 text-emerald-700"]
      ].map(([label, className]) => (
        <div key={label} className={cn("absolute rounded-full px-4 py-2 text-sm font-bold ring-1 ring-white", className)}>{label}</div>
      ))}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 420 260" aria-hidden="true">
        <path d="M92 58 C170 30 245 42 330 82" stroke="#0f172a" strokeWidth="2" fill="none" strokeDasharray="5 5" />
        <path d="M330 82 C292 162 218 196 126 214" stroke="#0f172a" strokeWidth="2" fill="none" strokeDasharray="5 5" />
        <path d="M126 214 C92 152 74 104 92 58" stroke="#0f172a" strokeWidth="2" fill="none" strokeDasharray="5 5" />
        <path d="M330 82 C350 132 342 178 306 214" stroke="#0f172a" strokeWidth="2" fill="none" strokeDasharray="5 5" />
      </svg>
    </div>
  );
}

function SimpleTable({ rows }: { rows: string[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <tbody className="divide-y">
        {rows.map((row) => (
          <tr key={row.join("-")}>
            {row.map((cell, index) => (
              <td key={cell} className={cn("py-3", index === 0 && "font-semibold text-slate-950", index > 0 && "text-slate-600")}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function InvestigationWorkspace({ symbol }: { symbol: string }) {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{symbol} Industries</h1>
              <Badge className="bg-red-50 text-red-700 ring-1 ring-red-100">High Risk</Badge>
              <Badge>Open Investigation</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">Score: <span className="font-bold text-slate-950">91</span> · ISIN INE742A01018 · NSE/BSE cash segment · T+0 alert queue</p>
          </div>
          <Button>Close Investigation</Button>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto rounded-xl border bg-white p-1.5 shadow-soft">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn("whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors", activeTab === tab ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100")}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
            <div className="space-y-4">
              <ScoreRing />
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Price Rise" value="155%" tone="red" helpKey="priceRise" />
                <MetricCard label="Price Z" value="4.8σ" tone="red" helpKey="priceZ" />
                <MetricCard label="Volume Z" value="5.9σ" tone="amber" helpKey="volumeZ" />
                <MetricCard label="Band Hits" value="12" tone="blue" helpKey="bandPersistence" />
                <MetricCard label="180 Day New High" value="7" tone="blue" helpKey="highBreakout" />
              </div>
            </div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Score Drivers</CardTitle>
                <p className="text-sm text-slate-500">A scrip is evaluated against five score parameters. If the Composite Scrip Score exceeds the threshold, the scrip is shortlisted for watch-list.</p>
              </CardHeader>
              <CardContent><AlertDriversChart /></CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "Price Analysis" && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
            <Card><CardHeader><CardTitle className="gap-2" helpKey="price"><LineChart className="h-5 w-5" /> 180-Day Price</CardTitle></CardHeader><CardContent><PriceChart /></CardContent></Card>
            <Card><CardHeader><CardTitle helpKey="rollingPrice">15 Day vs 180 Day C-C Avg</CardTitle></CardHeader><CardContent><RollingPriceChart /></CardContent></Card>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Price Rise" value="155%" tone="red" helpKey="priceRise" />
              <MetricCard label="Current Price" value="₹226.40" note="+6.8% intraday" />
              <MetricCard label="180 Day Price" value="₹88.70" helpKey="price" />
              <MetricCard label="Highest Price" value="₹231.80" tone="blue" helpKey="highBreakout" />
            </div>
            <Card><CardHeader><CardTitle helpKey="bandPersistence">Band / High Count</CardTitle></CardHeader><CardContent><BandEventsChart /></CardContent></Card>
          </div>
        </div>
      )}

      {activeTab === "Volume Analysis" && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            <Card><CardHeader><CardTitle helpKey="currentVolume">Volume</CardTitle></CardHeader><CardContent><VolumeChart /></CardContent></Card>
            <Card><CardHeader><CardTitle helpKey="rollingVolume">15 Day vs 180 Day Average</CardTitle></CardHeader><CardContent><RollingVolumeChart /></CardContent></Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Current Volume" value="24.8L" tone="blue" helpKey="currentVolume" />
            <MetricCard label="15 Day Average" value="8.4L" helpKey="average" />
            <MetricCard label="180 Day Average" value="5.1L" helpKey="average" />
            <MetricCard label="Z Score" value="5.9" tone="red" helpKey="volumeZ" />
          </div>
        </div>
      )}

      {activeTab === "Shareholding" && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle helpKey="shareholding">Ownership Change</CardTitle>
              </CardHeader>
              <CardContent><OwnershipChangeChart /></CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle helpKey="shareholding">Unique PAN Holders</CardTitle>
              </CardHeader>
              <CardContent><PanHolderChart /></CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Promoter" value="54% → 52%" tone="amber" helpKey="shareholding" />
            <MetricCard label="Top 1%" value="65% → 60%" helpKey="shareholding" />
            <MetricCard label="Unique PAN T" value="123" tone="blue" helpKey="shareholding" />
            <MetricCard label="Unique PAN T-180" value="80" helpKey="shareholding" />
          </div>
        </div>
      )}

      {activeTab === "Corporate" && (
        <Card><CardHeader><CardTitle className="gap-2"><Building2 className="h-5 w-5" /> Corporate Timeline</CardTitle></CardHeader><CardContent><Timeline items={corporateEvents} /></CardContent></Card>
      )}

      {activeTab === "Participants" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card><CardHeader><CardTitle className="gap-2" helpKey="volumeContributors"><Users className="h-5 w-5" /> Volume Contributors</CardTitle></CardHeader><CardContent><SimpleTable rows={participants.map((p) => [p.clientGroup, p.buyVolume, p.concentration])} /></CardContent></Card>
          <Card><CardHeader><CardTitle helpKey="ltpContribution">LTP Contribution</CardTitle></CardHeader><CardContent><LtpChart /></CardContent></Card>
          <Card><CardHeader><CardTitle className="gap-2" helpKey="counterparty"><Network className="h-5 w-5" /> Counterparty Network</CardTitle></CardHeader><CardContent><CounterpartyGraph /></CardContent></Card>
          <Card><CardHeader><CardTitle helpKey="counterparty">Counterparty Pairs</CardTitle></CardHeader><CardContent><SimpleTable rows={counterpartyPairs.map((p) => [p.pair, p.volume, p.share])} /></CardContent></Card>
          <Card><CardHeader><CardTitle helpKey="profitMakers">Top Profit Makers</CardTitle></CardHeader><CardContent><SimpleTable rows={profitMakers.map((p, i) => [`#${i + 1} ${p.entity}`, p.realized, p.relation])} /></CardContent></Card>
        </div>
      )}

      {activeTab === "Remarks" && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Officer Remarks</CardTitle></CardHeader><CardContent className="space-y-5"><Timeline items={remarks} /><Input placeholder="Add officer comment..." /><Button>Save Remark</Button></CardContent></Card>
      )}

      {activeTab === "History" && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" /> Previous Alerts</CardTitle></CardHeader><CardContent><Timeline items={[{ date: "Yesterday", title: "Volume z-score crossed 3.0", type: "Medium risk alert" }, { date: "Monday", title: "Second upper band session", type: "Watchlist escalation" }, { date: "Friday", title: "Unusual delivery concentration", type: "Initial alert" }]} /></CardContent></Card>
      )}
    </div>
  );
}
