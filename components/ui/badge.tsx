import React from "react";
import { cn } from "@/lib/utils";

const riskVariants = {
  High: "bg-rose-100 text-rose-800 border-rose-200 ring-1 ring-rose-200",
  Medium: "bg-amber-100 text-amber-800 border-amber-200 ring-1 ring-amber-200",
  Low: "bg-emerald-100 text-emerald-800 border-emerald-200 ring-1 ring-emerald-200"
};

const dotColors = {
  High: "bg-rose-600 animate-pulse",
  Medium: "bg-amber-600",
  Low: "bg-emerald-600"
};

export function RiskBadge({ risk }: { risk: "High" | "Medium" | "Low" }) {
  const variantClass = riskVariants[risk] || riskVariants.Low;
  const dotClass = dotColors[risk] || dotColors.Low;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold tracking-wide uppercase", variantClass)}>
      <span className={cn("h-2 w-2 rounded-full", dotClass)} />
      {risk}
    </span>
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 transition-colors",
        className
      )}
      {...props}
    />
  );
}
