import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive" | "success";
};

export function Button({ className, variant = "default", asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        variant === "default" && "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
        variant === "outline" && "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-950",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
        variant === "destructive" && "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
        variant === "success" && "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
        className
      )}
      {...props}
    />
  );
}
