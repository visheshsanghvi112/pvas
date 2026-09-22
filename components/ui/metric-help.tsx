"use client";

import React, { useState, useEffect, useRef } from "react";
import { Info, X } from "lucide-react";
import { metricHelp, type MetricHelpKey } from "@/lib/metric-help";
import { cn } from "@/lib/utils";

export function MetricHelp({ helpKey, className }: { helpKey?: MetricHelpKey; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  if (!helpKey || !metricHelp[helpKey]) return null;

  return (
    <span
      ref={containerRef}
      className={cn("relative inline-flex items-center ml-1.5 cursor-pointer", className)}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }}
    >
      <button
        type="button"
        className={cn(
          "p-0.5 rounded transition-colors cursor-pointer focus:outline-none flex items-center justify-center",
          isOpen ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        )}
        aria-label="Toggle explanation"
      >
        <Info className="h-3.5 w-3.5 shrink-0" />
      </button>

      {isOpen && (
        <span
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-full mt-2 z-50 w-72 max-w-[calc(100vw-32px)] whitespace-normal break-words -translate-x-1/2 rounded-xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-md p-3 text-left font-sans text-xs font-normal normal-case leading-relaxed text-slate-100 shadow-[0_12px_28px_rgba(0,0,0,0.28),0_2px_8px_rgba(0,0,0,0.18)] transition-all animate-in fade-in-0 zoom-in-95 pointer-events-auto select-text"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-bold text-blue-400 text-[10px] uppercase tracking-wider block">Quick Explanation</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div>{metricHelp[helpKey]}</div>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900/95" />
        </span>
      )}
    </span>
  );
}
