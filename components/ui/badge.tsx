import { cn } from "@/lib/utils";

const variants = {
  High: "bg-red-50 text-red-700 ring-red-100",
  Medium: "bg-orange-50 text-orange-700 ring-orange-100",
  Low: "bg-teal-50 text-teal-700 ring-teal-100"
};

export function RiskBadge({ risk }: { risk: keyof typeof variants }) {
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold ring-1", variants[risk])}>{risk}</span>;
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700", className)} {...props} />;
}
