import React from "react";
import { cn } from "@/lib/utils";
import { MetricHelp } from "@/components/ui/metric-help";
import type { MetricHelpKey } from "@/lib/metric-help";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-sm transition-all duration-200 hover:shadow-md min-w-0 overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-5 md:p-6 border-b border-slate-100 min-w-0", className)} {...props} />;
}

export function CardTitle({ className, helpKey, children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { helpKey?: MetricHelpKey }) {
  return (
    <h3 className={cn("flex items-center text-base font-bold tracking-tight text-slate-900 min-w-0", className)} {...props}>
      {children}
      <MetricHelp helpKey={helpKey} />
    </h3>
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 md:p-6 min-w-0 overflow-hidden", className)} {...props} />;
}
