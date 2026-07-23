import { RiskBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const history = [
  ["AURUMFIN", "Aurum Finance", "Closed", "Medium", "2026-07-18", "No manipulation established"],
  ["TRIDENTEX", "Trident Exports", "Escalated", "High", "2026-07-17", "Beneficial ownership linkage found"],
  ["HELIOSMIN", "Helios Minerals", "Closed", "Low", "2026-07-14", "News-driven movement"],
  ["MICRODYN", "Microdyn Components", "Under review", "High", "2026-07-12", "Awaiting broker responses"]
] as const;

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Investigation History</h1>
      <Card>
        <CardHeader><CardTitle>Previous Investigations</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr>{["Symbol", "Company", "Status", "Risk", "Opened", "Outcome"].map((h) => <th key={h} className="py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y">{history.map(([symbol, company, status, risk, opened, outcome]) => <tr key={symbol}><td className="py-4 font-bold">{symbol}</td><td>{company}</td><td>{status}</td><td><RiskBadge risk={risk} /></td><td>{opened}</td><td className="text-slate-500">{outcome}</td></tr>)}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
