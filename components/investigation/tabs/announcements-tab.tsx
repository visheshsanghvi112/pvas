"use client";

import React from "react";
import { Megaphone } from "lucide-react";
import { Card, SectionHeader, DataTable } from "./shared";

export interface AnnouncementsTabProps {
  symbol: string;
  announcements: any[] | null | undefined;
  windowDays: number;
}

export function AnnouncementsTab({
  symbol,
  announcements,
  windowDays,
}: AnnouncementsTabProps) {
  return (
    <div className="space-y-5">
      <Card className="border-slate-200/90 shadow-xs overflow-hidden">
        <SectionHeader
          icon={<Megaphone className="w-4.5 h-4.5 text-blue-600" />}
          title="Corporate Announcements"
          subtitle={`Details of corporate announcements made in past ${windowDays} days`}
          info={`Corporate announcements made by the company during the ${windowDays}-day observation window.`}
        />
        {announcements && announcements.length > 0 ? (
          <DataTable
            minWidth="min-w-[650px]"
            colWidths={["18%", "20%", "47%", "15%"]}
            alignments={["left", "left", "left", "center"]}
            headers={[
              <span key="h-adate" className="whitespace-nowrap">
                Date
              </span>,
              <span key="h-acat" className="whitespace-nowrap">
                Category
              </span>,
              <span key="h-atitle" className="whitespace-nowrap">
                Announcement Details
              </span>,
              <span key="h-astatus" className="whitespace-nowrap">
                Status
              </span>,
            ]}
            rows={announcements.map((a, idx) => [
              <span
                key={`adate-${idx}`}
                className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 whitespace-nowrap"
              >
                {a.date}
              </span>,
              <span
                key={`acat-${idx}`}
                className="font-bold text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-md whitespace-nowrap"
              >
                {a.category}
              </span>,
              <span
                key={`atitle-${idx}`}
                className="font-medium text-slate-900 leading-snug"
              >
                {a.title}
              </span>,
              <span
                key={`astatus-${idx}`}
                className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded whitespace-nowrap"
              >
                {a.status || "Verified"}
              </span>,
            ])}
          />
        ) : (
          <div className="p-12 text-center text-slate-500 bg-slate-50/50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
              <Megaphone className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              No Corporate Announcements in Past {windowDays} Days
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              No corporate announcements recorded for {symbol} during the{" "}
              {windowDays}-day observation window.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
