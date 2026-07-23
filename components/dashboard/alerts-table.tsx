import Link from "next/link";
import { RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricHelp } from "@/components/ui/metric-help";
import { alerts } from "@/lib/data";

export function AlertsTable() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-soft">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-4 font-semibold">Symbol</th>
            <th className="px-5 py-4 font-semibold">Score <MetricHelp helpKey="compositeScore" /></th>
            <th className="px-5 py-4 font-semibold">Price <MetricHelp helpKey="priceRise" /></th>
            <th className="px-5 py-4 font-semibold">Vol Z <MetricHelp helpKey="volumeZ" /></th>
            <th className="px-5 py-4 font-semibold">Status</th>
            <th className="px-5 py-4 font-semibold">Risk</th>
            <th className="px-5 py-4 font-semibold"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {alerts.map((alert) => (
            <tr key={alert.symbol} className="hover:bg-slate-50">
              <td className="px-5 py-4 font-bold text-slate-950">{alert.symbol}</td>
              <td className="px-5 py-4 font-semibold">{alert.score}</td>
              <td className="px-5 py-4 font-semibold text-rose-600">↑ {alert.priceRise}%</td>
              <td className="px-5 py-4 font-semibold text-amber-700">{alert.volumeZ}σ</td>
              <td className="px-5 py-4 text-slate-500">{alert.status}</td>
              <td className="px-5 py-4"><RiskBadge risk={alert.risk} /></td>
              <td className="px-5 py-4">
                <Button asChild variant="outline" className="h-8 px-3">
                  <Link href={`/investigations/${alert.symbol}`}>Investigate</Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
