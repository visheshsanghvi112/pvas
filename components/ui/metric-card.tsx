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
    blue: "text-blue-600 font-black",
    amber: "text-amber-600 font-black",
    red: "text-rose-600 font-black",
    green: "text-emerald-600 font-black"
  };

  const borderAccents = {
    slate: "border-t-slate-400",
    blue: "border-t-blue-500",
    amber: "border-t-amber-500",
    red: "border-t-rose-500",
    green: "border-t-emerald-500"
  };

  const bgStyles = {
    slate: "bg-white hover:bg-slate-50/80 border-slate-200",
    blue: "bg-white hover:bg-blue-50/40 border-slate-200",
    amber: "bg-white hover:bg-amber-50/40 border-slate-200",
    red: "bg-white hover:bg-rose-50/40 border-slate-200",
    green: "bg-white hover:bg-emerald-50/40 border-slate-200"
  };

  const badgeDots = {
    slate: "bg-slate-400",
    blue: "bg-blue-500 shadow-blue-500/50 shadow-sm",
    amber: "bg-amber-500 shadow-amber-500/50 shadow-sm",
    red: "bg-rose-500 shadow-rose-500/50 shadow-sm animate-pulse",
    green: "bg-emerald-500 shadow-emerald-500/50 shadow-sm"
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 border-t-4",
        borderAccents[tone],
        bgStyles[tone],
        active ? "ring-2 ring-blue-500 border-blue-500 shadow-md bg-blue-50/20" : "shadow-xs hover:shadow-md"
      )}
    >
      <CardContent className="p-4 md:p-5 min-w-0">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 tracking-wide">
          <span className="flex items-center gap-1.5 truncate">
            <span className={cn("h-2 w-2 rounded-full shrink-0", badgeDots[tone])} />
            <span className="truncate">{label}</span>
            <MetricHelp helpKey={helpKey} />
          </span>
          {active && (
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              Active
            </span>
          )}
        </div>
        <div className={cn("mt-2.5 text-3xl md:text-4xl font-black tracking-tight font-mono", tones[tone])}>
          {value}
        </div>
        {note ? (
          <div className="mt-2 text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <span>{note}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
