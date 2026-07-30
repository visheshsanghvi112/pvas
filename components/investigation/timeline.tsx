import React from "react";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  date: string;
  title?: string;
  type?: string;
  officer?: string;
  text?: string;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {items.map((item, index) => (
        <div key={`${item.date}-${index}`} className="relative group">
          {/* Timeline Dot */}
          <div className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-xs group-hover:scale-110 transition-transform" />

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1 gap-2">
              <span className="font-mono font-medium text-slate-500">{item.date}</span>
              {item.type && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100 shrink-0">
                  {item.type}
                </span>
              )}
            </div>
            {item.title && (
              <div className="text-sm font-semibold text-slate-900 leading-snug">
                {item.title}
              </div>
            )}
            {item.officer && !item.title && (
              <div className="text-sm font-semibold text-slate-900">
                {item.officer}
              </div>
            )}
            {item.text && (
              <div className="mt-1 text-xs text-slate-600 leading-relaxed">
                {item.text}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
