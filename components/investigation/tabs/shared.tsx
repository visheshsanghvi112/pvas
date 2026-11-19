"use client";

import React from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/investigation/charts";

export function DataTable({
  headers,
  rows,
  alignments,
  colWidths,
  minWidth = "min-w-full",
  className,
}: {
  headers: (string | React.ReactNode)[];
  rows: (string | React.ReactNode)[][];
  alignments?: ("left" | "right" | "center")[];
  colWidths?: string[];
  minWidth?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className={cn("w-full text-xs border-collapse", minWidth)}>
        {colWidths && (
          <colgroup>
            {colWidths.map((w, idx) => (
              <col key={idx} style={{ width: w }} />
            ))}
          </colgroup>
        )}
        <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold">
          <tr>
            {headers.map((h, i) => {
              const align = alignments?.[i] || "left";
              return (
                <th
                  key={i}
                  className={cn(
                    "px-3 py-2.5 text-xs font-semibold text-slate-700 whitespace-nowrap",
                    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
                  )}
                >
                  {h}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-6 text-center text-slate-400 italic font-medium">
                No records found
              </td>
            </tr>
          ) : (
            rows.map((r, ri) => (
              <tr key={ri} className="hover:bg-slate-50/70 transition-colors">
                {r.map((cell, ci) => {
                  const align = alignments?.[ci] || "left";
                  return (
                    <td
                      key={ci}
                      className={cn(
                        "px-3 py-2.5 text-slate-700 font-medium align-middle",
                        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
                      )}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  info,
  onExpand,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  info?: string;
  onExpand?: () => void;
}) {
  return (
    <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-slate-600 shrink-0">{icon}</span>}
        <div>
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-semibold text-slate-900 leading-snug">{title}</h3>
            {info && <InfoTooltip text={info} />}
          </div>
          {subtitle && <p className="text-xs text-slate-500 font-normal leading-normal mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          title="Expand Chart to Fullscreen"
          className="opacity-70 hover:opacity-100 transition-all duration-200 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/90 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/60 shadow-2xs text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs">Fullscreen</span>
        </button>
      )}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex flex-col group relative overflow-hidden transition-all duration-200 hover:border-slate-300", className)}>
      {children}
    </div>
  );
}
