import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { MetricHelp } from "@/components/ui/metric-help";
import type { MetricHelpKey } from "@/lib/metric-help";

export function MetricCard({
  label,
  value,
  note,
  helpKey,
  tone = "slate"
}: {
  label: string;
  value: string;
  note?: string;
  helpKey?: MetricHelpKey;
  tone?: "slate" | "blue" | "amber" | "red" | "green";
}) {
  const tones = {
    slate: "text-slate-950",
    blue: "text-blue-700",
    amber: "text-orange-600",
    red: "text-red-600",
    green: "text-teal-700"
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center text-xs font-semibold text-slate-500">
          {label}
          <MetricHelp helpKey={helpKey} />
        </div>
        <div className={cn("mt-2 text-3xl font-bold tracking-tight", tones[tone])}>{value}</div>
        {note ? <div className="mt-2 text-sm text-slate-500">{note}</div> : null}
      </CardContent>
    </Card>
  );
}
