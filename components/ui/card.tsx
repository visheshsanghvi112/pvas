import React from "react";
import { cn } from "@/lib/utils";
import { MetricHelp } from "@/components/ui/metric-help";
import type { MetricHelpKey } from "@/lib/metric-help";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white text-slate-950 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.06),0_1px_3px_-1px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-[0_6px_20px_-4px_rgba(15,23,42,0.08)] min-w-0 overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-4 md:p-5 border-b border-slate-200/80 bg-slate-50/70 min-w-0", className)} {...props} />;
}

export function CardTitle({ className, helpKey, children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { helpKey?: MetricHelpKey }) {
  return (
    <h3 className={cn("flex items-center text-sm md:text-base font-extrabold tracking-tight text-slate-900 min-w-0 gap-1.5", className)} {...props}>
      {children}
      <MetricHelp helpKey={helpKey} />
    </h3>
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 md:p-5 min-w-0 overflow-hidden", className)} {...props} />;
}
