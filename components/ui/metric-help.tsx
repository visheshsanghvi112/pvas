import { metricHelp, type MetricHelpKey } from "@/lib/metric-help";
import { cn } from "@/lib/utils";

export function MetricHelp({ helpKey, className }: { helpKey?: MetricHelpKey; className?: string }) {
  if (!helpKey) return null;

  return (
    <span className={cn("group relative inline-flex", className)}>
      <button
        type="button"
        aria-label="Metric definition"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold leading-none text-slate-500"
      >
        *
      </button>
      <span className="pointer-events-none absolute left-1/2 top-6 z-30 hidden w-80 -translate-x-1/2 rounded-xl border bg-slate-950 p-3 text-left font-sans text-xs font-normal normal-case leading-relaxed tracking-normal text-white shadow-soft group-hover:block">
        {metricHelp[helpKey]}
      </span>
    </span>
  );
}
