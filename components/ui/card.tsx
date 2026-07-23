import { cn } from "@/lib/utils";
import { MetricHelp } from "@/components/ui/metric-help";
import type { MetricHelpKey } from "@/lib/metric-help";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-slate-200 bg-card text-card-foreground shadow-sm", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, helpKey, children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { helpKey?: MetricHelpKey }) {
  return (
    <h3 className={cn("flex items-center text-base font-semibold tracking-tight", className)} {...props}>
      {children}
      <MetricHelp helpKey={helpKey} />
    </h3>
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}
