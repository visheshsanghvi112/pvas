"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, SlidersHorizontal, RefreshCw, BarChart2, CheckCircle, PieChart } from "lucide-react";
import { AlertsTable } from "@/components/dashboard/alerts-table";
import { ScoreDistributionChart, RiskDonut } from "@/components/investigation/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { fetchWatchlist, type ScripSummary } from "@/lib/api";

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
    <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
      {/* Dashboard Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/70 p-5 shadow-sm md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
              <ShieldAlert className="h-4 w-4" />
              Institutional Market Surveillance Suite
            </div>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              Price-Volume Alert Workspace
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Real-time securities conduct surveillance evaluating price movement vs 6-month baselines, 15-day close-to-close Z-scores, volume spikes, upper circuit persistence, and participant concentration.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={loadData}
              variant="outline"
              disabled={loading}
              className="w-full gap-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 text-blue-600 ${loading ? "animate-spin" : ""}`} />
              Refresh Feed
            </Button>
          </div>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Scrips Tracked"
          value={loading ? "..." : String(scrips.length)}
          note="Active EOD baseline"
          tone="blue"
          helpKey="compositeScore"
          active={riskFilter === "All"}
          onClick={() => setRiskFilter("All")}
        />
        <MetricCard
          label="High Risk Scrips"
          value={loading ? "..." : String(highRiskCount)}
          note="Requires immediate audit"
          tone="red"
          active={riskFilter === "High"}
          onClick={() => setRiskFilter(riskFilter === "High" ? "All" : "High")}
        />
        <MetricCard
          label="Medium Risk Scrips"
          value={loading ? "..." : String(medRiskCount)}
          note="Review by EOD session"
          tone="amber"
          active={riskFilter === "Medium"}
          onClick={() => setRiskFilter(riskFilter === "Medium" ? "All" : "Medium")}
        />
        <MetricCard
          label="Low Risk / Normal"
          value={loading ? "..." : String(lowRiskCount)}
          note="Within normal bounds"
          tone="green"
          active={riskFilter === "Low"}
          onClick={() => setRiskFilter(riskFilter === "Low" ? "All" : "Low")}
        />
      </div>

      {/* Main Grid: Alerts Table & Analytics */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Left Column: Alerts Table */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Active Surveillance Watchlist
              </h2>
            </div>
            {riskFilter !== "All" && (
              <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                Filtered: {riskFilter} Risk
              </span>
            )}
          </div>

          <AlertsTable
            scrips={scrips}
            onStatusChange={handleStatusChange}
            selectedRiskFilter={riskFilter}
            onSelectRiskFilter={setRiskFilter}
          />
        </div>

        {/* Right Column: Score & Risk Analytics Charts */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="gap-2" helpKey="scoreDistribution">
                <BarChart2 className="h-4 w-4 text-blue-600" />
                Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreDistributionChart scrips={scrips} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="gap-2" helpKey="riskDistribution">
                <PieChart className="h-4 w-4 text-rose-600" />
                Risk Severity Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RiskDonut scrips={scrips} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
