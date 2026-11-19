"use client";

import React from "react";
import { Layers } from "lucide-react";
import { Card, SectionHeader, DataTable } from "./shared";

export interface CorporateActionsTabProps {
  symbol: string;
  corpActions: any[] | null | undefined;
  windowDays: number;
}

export function CorporateActionsTab({
  symbol,
  corpActions,
  windowDays,
}: CorporateActionsTabProps) {
  return (
    <div className="space-y-5">
      <Card className="border-slate-200/90 shadow-xs overflow-hidden">
        <SectionHeader
          icon={<Layers className="w-4.5 h-4.5 text-indigo-600" />}
          title="Corporate Actions"
          subtitle={`Dividends, bonus issues, stock splits, and rights issues in past ${windowDays} days`}
          info={`Corporate actions altering share capital or prices during the observation window.`}
        />
        {corpActions && corpActions.length > 0 ? (
          <DataTable
            minWidth="min-w-[650px]"
            headers={[
              "Record Date",
              "Ex-Date",
              "Category",
              "Action Details",
              "Ratio / Value",
              "Dilution Factor",
            ]}
            rows={corpActions.map((ca, idx) => [
              <span
                key={`rec-${idx}`}
                className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 whitespace-nowrap"
              >
                {ca.record_date}
              </span>,
              <span
                key={`ex-${idx}`}
                className="font-mono text-xs font-semibold text-slate-600 whitespace-nowrap"
              >
                {ca.ex_date || "—"}
              </span>,
              <span
                key={`cat-${idx}`}
                className="font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-md whitespace-nowrap"
              >
                {ca.category}
              </span>,
              <span
                key={`p-${idx}`}
                className="font-medium text-slate-900 leading-snug"
              >
                {ca.purpose}
              </span>,
              <span
                key={`r-${idx}`}
                className="font-mono text-xs font-semibold text-slate-700 whitespace-nowrap"
              >
                {ca.ratio_value || ca.bonus_ratio || "—"}
              </span>,
              <span
                key={`d-${idx}`}
                className="font-mono font-bold text-slate-700 whitespace-nowrap"
              >
                {ca.dilution_factor ? `${ca.dilution_factor}×` : "1.00×"}
              </span>,
            ])}
          />
        ) : (
          <div className="p-12 text-center text-slate-500 bg-slate-50/50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              No Corporate Actions in Past {windowDays} Days
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              No dividends, bonus issues, stock splits, or rights issues recorded for{" "}
              {symbol} during the {windowDays}-day analysis window.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
