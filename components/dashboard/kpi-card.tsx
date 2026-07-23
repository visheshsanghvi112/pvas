import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-slate-500">{label}</div>
        <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
        <div className="mt-2 text-xs font-medium text-blue-600">{delta}</div>
      </CardContent>
    </Card>
  );
}
