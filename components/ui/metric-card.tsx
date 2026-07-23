import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { MetricHelp } from "@/components/ui/metric-help";
import type { MetricHelpKey } from "@/lib/metric-help";

export function MetricCard({
  label,
  value,
  note,
  helpKey,
  tone = "slate",
  onClick,
  active = false
}: {
  label: string;
  value: string;
  note?: string;
  helpKey?: MetricHelpKey;
  tone?: "slate" | "blue" | "amber" | "red" | "green";
  onClick?: () => void;
  active?: boolean;
}) {
  const tones = {
    slate: "text-slate-900",
    blue: "text-blue-700 font-black",
    amber: "text-amber-700 font-black",
    red: "text-rose-700 font-black",
    green: "text-emerald-700 font-black"
  };

  const borders = {
    slate: "border-slate-200 bg-white",
    blue: "border-blue-200 bg-blue-50/50",
    amber: "border-amber-200 bg-amber-50/50",
    red: "border-rose-200 bg-rose-50/50",
    green: "border-emerald-200 bg-emerald-50/50"
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
        active ? "ring-2 ring-blue-500 border-blue-500 shadow-md" : "",
        borders[tone]
      )}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span className="flex items-center">
            {label}
            <MetricHelp helpKey={helpKey} />
          </span>
        </div>
        <div className={cn("mt-2 text-3xl font-extrabold tracking-tight font-mono", tones[tone])}>{value}</div>
        {note ? <div className="mt-2 text-xs text-slate-500 font-medium">{note}</div> : null}
      </CardContent>
    </Card>
  );
}
