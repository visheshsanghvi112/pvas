import { AlertTriangle, Search } from "lucide-react";
import { AlertsTable } from "@/components/dashboard/alerts-table";
import { ScoreDistributionChart } from "@/components/investigation/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">PV Alert Surveillance</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Investigation Dashboard</h1>
          </div>
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input className="h-11 pl-9" placeholder="Search symbol, ISIN, PAN, broker..." />
          </div>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Alerts" value="12" tone="blue" helpKey="compositeScore" />
        <MetricCard label="High Risk" value="5" note="Immediate review" tone="red" />
        <MetricCard label="Medium Risk" value="4" note="Review by EOD" tone="amber" />
        <MetricCard label="Low Risk" value="3" note="Monitor watchlist" tone="green" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h2 className="text-lg font-semibold">Today&apos;s Watchlist</h2>
          </div>
          <AlertsTable />
        </div>
        <div className="grid gap-5">
          <Card>
            <CardHeader><CardTitle helpKey="scoreDistribution">Score Distribution</CardTitle></CardHeader>
            <CardContent><ScoreDistributionChart /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
