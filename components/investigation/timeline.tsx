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
    <div className="relative space-y-6 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {items.map((item, index) => (
        <div key={`${item.date}-${index}`} className="relative group">
          {/* Timeline Dot */}
          <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-xs group-hover:scale-125 transition-transform" />

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-mono">{item.date}</span>
              {item.type && (
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-100">
                  {item.type}
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-slate-900">
              {item.title ?? item.officer}
            </div>
            {(item.text ?? item.type) && (
              <div className="mt-1 text-xs text-slate-600 leading-relaxed">
                {item.text ?? item.type}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
