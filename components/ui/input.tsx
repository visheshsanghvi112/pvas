import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-offset-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary", className)}
      {...props}
    />
  );
}
