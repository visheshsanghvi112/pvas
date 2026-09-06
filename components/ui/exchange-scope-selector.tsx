"use client";

import React from "react";
import { Globe, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExchangeScope = "ALL" | "NSE" | "BSE";

export interface ExchangeScopeSelectorProps {
  selected: ExchangeScope;
  onChange: (scope: ExchangeScope) => void;
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const EXCHANGE_OPTIONS: Array<{
  id: ExchangeScope;
  label: string;
  shortLabel: string;
  subLabel?: string;
  dotColor?: string;
  icon?: React.ReactNode;
}> = [
  {
    id: "ALL",
    label: "Consolidated (Avg)",
    shortLabel: "Consolidated",
    subLabel: "NSE + BSE",
    icon: <Globe className="w-3.5 h-3.5 text-blue-600" />,
  },
  {
    id: "NSE",
    label: "NSE",
    shortLabel: "NSE",
    subLabel: "Primary Cash",
    dotColor: "bg-blue-500",
  },
  {
    id: "BSE",
    label: "BSE",
    shortLabel: "BSE",
    subLabel: "Cash / SME",
    dotColor: "bg-amber-500",
  },
];

export function ExchangeScopeSelector({
  selected = "ALL",
  onChange,
  className,
  size = "md",
  showLabel = true,
}: ExchangeScopeSelectorProps) {
  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      {showLabel && (
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
          Exchange:
        </span>
      )}

      <div
        className={cn(
          "inline-flex items-center rounded-xl border border-slate-300/80 bg-white p-0.5 shadow-2xs text-xs font-semibold text-slate-600 divide-x divide-slate-200/80",
          size === "sm" ? "text-[11px]" : "text-xs"
        )}
      >
        {EXCHANGE_OPTIONS.map((opt) => {
          const isSelected = selected === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "group relative flex items-center gap-1.5 rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap",
                size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5",
                isSelected
                  ? "bg-slate-900 text-white font-bold shadow-xs z-10"
                  : "hover:bg-slate-50 hover:text-slate-900"
              )}
              title={
                opt.id === "ALL"
                  ? "Consolidated Market Surveillance (Blended VWAP & Combined Volumes across NSE + BSE)"
                  : opt.id === "NSE"
                  ? "Isolate NSE-specific Order Volumes & Price Limits"
                  : "Isolate BSE-specific Order Volumes & Price Limits"
              }
            >
              {opt.icon && (
                <span className={cn(isSelected ? "text-blue-300" : "text-blue-600")}>
                  {opt.icon}
                </span>
              )}
              {opt.dotColor && (
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    opt.dotColor,
                    isSelected && "ring-1 ring-white"
                  )}
                />
              )}

              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
