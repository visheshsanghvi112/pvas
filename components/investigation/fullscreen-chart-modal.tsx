"use client";

import React from "react";
import { Maximize2, X } from "lucide-react";

export interface FullscreenChartModalProps {
  expandedChart: {
    title: string;
    subtitle?: string;
    chart: React.ReactNode;
  } | null;
  symbol: string;
  onClose: () => void;
}

export function FullscreenChartModal({
  expandedChart,
  symbol,
  onClose,
}: FullscreenChartModalProps) {
  if (!expandedChart) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {expandedChart.title}
                </h2>
                <span className="shrink-0 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                  {symbol}
                </span>
              </div>
              {expandedChart.subtitle && (
                <p className="text-xs text-slate-500 font-normal truncate mt-0.5">
                  {expandedChart.subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              Press ESC to close
            </span>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs border border-slate-200"
              title="Close Fullscreen View"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Modal Content - Direct Clean High-Res Canvas */}
        <div className="p-6 md:p-8 flex-1 bg-white overflow-y-auto">
          {expandedChart.chart}
        </div>
      </div>
    </div>
  );
}
