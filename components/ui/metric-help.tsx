import React from "react";
import { HelpCircle } from "lucide-react";
import { metricHelp, type MetricHelpKey } from "@/lib/metric-help";
import { cn } from "@/lib/utils";

export function MetricHelp({ helpKey, className }: { helpKey?: MetricHelpKey; className?: string }) {
  if (!helpKey || !metricHelp[helpKey]) return null;

  return (
    <span className={cn("group relative inline-flex items-center ml-1.5 cursor-help", className)}>
      <HelpCircle className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-blue-600" />
      <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 z-50 hidden w-72 -translate-x-1/2 rounded-xl border border-slate-200 bg-slate-900 p-3 text-left font-sans text-xs font-normal normal-case leading-relaxed text-white shadow-2xl group-hover:block transition-all animate-in fade-in zoom-in-95">
        <span className="font-semibold text-blue-400 block mb-1">Metric Definition</span>
        {metricHelp[helpKey]}
      </span>
    </span>
  );
}
