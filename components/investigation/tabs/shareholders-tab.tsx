"use client";

import React from "react";
import { Users, Activity, PieChart, Zap, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScripDetail } from "@/lib/api";
import { Card, SectionHeader, DataTable } from "./shared";

export interface ShareholdersTabProps {
  detail: ScripDetail;
  shBreakdown: any;
  windowDays: number;
  onSelectPan: (pan: string) => void;
}

export function ShareholdersTab({
  detail,
  shBreakdown,
  windowDays,
  onSelectPan,
}: ShareholdersTabProps) {
  const unique_pans_t = detail.shareholders?.unique_pans_holding_t ?? null;
  const unique_pans_180 = detail.shareholders?.unique_pans_holding_180 ?? null;
  const unique_pans_diff =
    unique_pans_t != null && unique_pans_180 != null
      ? unique_pans_t - unique_pans_180
      : null;
  const unique_pans_pct_diff =
    unique_pans_diff != null && unique_pans_180 != null && unique_pans_180 > 0
      ? Number(((unique_pans_diff / unique_pans_180) * 100).toFixed(1))
      : null;

  const avg_pans_15d = detail.shareholders?.avg_trading_pans_15d ?? null;
  const avg_pans_180d = detail.shareholders?.avg_trading_pans_180d ?? null;
  const avg_pans_diff =
    avg_pans_15d != null && avg_pans_180d != null
      ? avg_pans_15d - avg_pans_180d
      : null;
  const avg_pans_pct_diff =
    avg_pans_diff != null && avg_pans_180d != null && avg_pans_180d > 0
      ? Number(((avg_pans_diff / avg_pans_180d) * 100).toFixed(1))
      : null;

  const promoter_pct_t: number | null =
    shBreakdown?.promoter_pct_t ?? detail.shareholders?.promoter_percent ?? null;
  const promoter_pct_180: number | null = shBreakdown?.promoter_pct_180 ?? null;
  const promoter_shares_t: number | null = shBreakdown?.promoter_shares_t ?? null;
  const promoter_shares_180: number | null = shBreakdown?.promoter_shares_180 ?? null;
  const promoter_pct_diff =
    promoter_pct_t != null && promoter_pct_180 != null
      ? Number((promoter_pct_t - promoter_pct_180).toFixed(2))
      : null;

  const top1_pct_t: number | null =
    shBreakdown?.top1_pct_t ?? detail.shareholders?.top_1pct_concentration ?? null;
  const top1_pct_180: number | null = shBreakdown?.top1_pct_180 ?? null;
  const top1_shares_t: number | null = shBreakdown?.top1_shares_t ?? null;
  const top1_shares_180: number | null = shBreakdown?.top1_shares_180 ?? null;
  const top1_pct_diff =
    top1_pct_t != null && top1_pct_180 != null
      ? Number((top1_pct_t - top1_pct_180).toFixed(2))
      : null;

  const total_shares_approx =
    promoter_pct_t != null && promoter_pct_t > 0 && promoter_shares_t != null
      ? Math.round(promoter_shares_t / (promoter_pct_t / 100))
      : null;
  const total_shares_approx_180 =
    promoter_pct_180 != null && promoter_pct_180 > 0 && promoter_shares_180 != null
      ? Math.round(promoter_shares_180 / (promoter_pct_180 / 100))
      : total_shares_approx;
  const public_shares_t =
    total_shares_approx != null && promoter_shares_t != null
      ? Math.max(0, total_shares_approx - promoter_shares_t)
      : null;
  const public_shares_180 =
    total_shares_approx_180 != null && promoter_shares_180 != null
      ? Math.max(0, total_shares_approx_180 - promoter_shares_180)
      : null;
  const public_pct_t =
    promoter_pct_t != null ? Number((100 - promoter_pct_t).toFixed(2)) : null;
  const public_pct_180 =
    promoter_pct_180 != null ? Number((100 - promoter_pct_180).toFixed(2)) : null;
  const public_pct_diff =
    public_pct_t != null && public_pct_180 != null
      ? Number((public_pct_t - public_pct_180).toFixed(2))
      : null;

  return (
    <div className="space-y-6">
      {/* Executive Direct KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Unique PANs (Day t)
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-blue-600" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {unique_pans_t ?? "—"}
            </span>
            <span
              className={cn(
                "text-xs font-bold font-mono px-2 py-0.5 rounded-md border",
                (unique_pans_diff ?? 0) >= 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              )}
            >
              {unique_pans_diff != null
                ? `${unique_pans_diff >= 0 ? "+" : ""}${unique_pans_diff}`
                : "—"}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Avg Trading PANs ({windowDays}D)
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-indigo-600" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {avg_pans_15d ?? "—"}
            </span>
            <span
              className={cn(
                "text-xs font-bold font-mono px-2 py-0.5 rounded-md border",
                (avg_pans_diff ?? 0) >= 0
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-slate-50 text-slate-700 border-slate-200"
              )}
            >
              {avg_pans_diff != null
                ? `${avg_pans_diff >= 0 ? "+" : ""}${avg_pans_diff}`
                : "—"}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Promoter Holding (Day t)
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
              <PieChart className="h-3.5 w-3.5 text-slate-700" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {promoter_pct_t != null ? `${promoter_pct_t}%` : "—"}
            </span>
            <span
              className={cn(
                "text-xs font-bold font-mono px-2 py-0.5 rounded-md border",
                (promoter_pct_diff ?? 0) >= 0
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )}
            >
              {promoter_pct_diff != null
                ? `${promoter_pct_diff >= 0 ? "+" : ""}${promoter_pct_diff}%`
                : "—"}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Top 1% Holding (Day t)
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-amber-600" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-900 font-mono tracking-tight">
              {top1_pct_t != null ? `${top1_pct_t}%` : "—"}
            </span>
            <span
              className={cn(
                "text-xs font-bold font-mono px-2 py-0.5 rounded-md border",
                (top1_pct_diff ?? 0) > 0
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-slate-50 text-slate-700 border-slate-200"
              )}
            >
              {top1_pct_diff != null
                ? `${top1_pct_diff >= 0 ? "+" : ""}${top1_pct_diff}%`
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* TABLE 1: Shareholder Structure & Equity Breakdown (Day t vs Day T-180) */}
      <Card>
        <SectionHeader
          icon={<PieChart className="w-4 h-4 text-blue-600" />}
          title="Shareholder Structure (Day t vs Day T-180)"
          subtitle="Holding distribution across Promoters, Top 1% large holders, and Public float"
          info="Compares shareholdings of promoters, top holders, and the public today versus 6 months ago."
        />
        <DataTable
          headers={[
            "Shareholder Category",
            "Shares on Day t",
            "Holding % (Day t)",
            "Shares on Day T-180",
            "Holding % (Day T-180)",
            "Net Change (Delta %)",
          ]}
          rows={[
            [
              <span
                key="name-p"
                className="font-bold text-slate-900 flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />{" "}
                Promoters & Promoter Group
              </span>,
              <span key="p-st" className="font-mono font-bold text-slate-900">
                {promoter_shares_t != null
                  ? promoter_shares_t.toLocaleString("en-IN")
                  : "—"}
              </span>,
              <div key="p-pt" className="flex items-center gap-2">
                <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${Math.min(100, promoter_pct_t ?? 0)}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-indigo-700">
                  {promoter_pct_t != null ? `${promoter_pct_t}%` : "—"}
                </span>
              </div>,
              <span key="p-s180" className="font-mono text-slate-700">
                {promoter_shares_180 != null
                  ? promoter_shares_180.toLocaleString("en-IN")
                  : "—"}
              </span>,
              <span key="p-p180" className="font-mono font-bold text-slate-700">
                {promoter_pct_180 != null ? `${promoter_pct_180}%` : "—"}
              </span>,
              <span
                key="p-diff"
                className={cn(
                  "font-mono font-bold px-2 py-0.5 rounded text-xs",
                  (promoter_pct_diff ?? 0) >= 0
                    ? "text-indigo-700 bg-indigo-50 border border-indigo-100"
                    : "text-amber-700 bg-amber-50 border border-amber-100"
                )}
              >
                {promoter_pct_diff != null
                  ? `${promoter_pct_diff >= 0 ? "+" : ""}${promoter_pct_diff}%`
                  : "—"}
              </span>,
            ],
            [
              <span
                key="name-top1"
                className="font-bold text-slate-900 flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />{" "}
                Top 1% Largest Shareholders
              </span>,
              <span key="top1-st" className="font-mono font-bold text-slate-900">
                {top1_shares_t != null
                  ? top1_shares_t.toLocaleString("en-IN")
                  : "—"}
              </span>,
              <div key="top1-pt" className="flex items-center gap-2">
                <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, top1_pct_t ?? 0)}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-amber-800">
                  {top1_pct_t != null ? `${top1_pct_t}%` : "—"}
                </span>
              </div>,
              <span key="top1-s180" className="font-mono text-slate-700">
                {top1_shares_180 != null
                  ? top1_shares_180.toLocaleString("en-IN")
                  : "—"}
              </span>,
              <span key="top1-p180" className="font-mono font-bold text-slate-700">
                {top1_pct_180 != null ? `${top1_pct_180}%` : "—"}
              </span>,
              <span
                key="top1-diff"
                className={cn(
                  "font-mono font-bold px-2 py-0.5 rounded text-xs",
                  (top1_pct_diff ?? 0) >= 0
                    ? "text-amber-800 bg-amber-50 border border-amber-200"
                    : "text-emerald-700 bg-emerald-50 border border-emerald-100"
                )}
              >
                {top1_pct_diff != null
                  ? `${top1_pct_diff >= 0 ? "+" : ""}${top1_pct_diff}%`
                  : "—"}
              </span>,
            ],
            [
              <span
                key="name-pub"
                className="font-bold text-slate-900 flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />{" "}
                Public & Non-Promoter Free Float
              </span>,
              <span key="pub-st" className="font-mono font-bold text-slate-900">
                {public_shares_t != null
                  ? public_shares_t.toLocaleString("en-IN")
                  : "—"}
              </span>,
              <div key="pub-pt" className="flex items-center gap-2">
                <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, public_pct_t ?? 0)}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-emerald-700">
                  {public_pct_t != null ? `${public_pct_t}%` : "—"}
                </span>
              </div>,
              <span key="pub-s180" className="font-mono text-slate-700">
                {public_shares_180 != null
                  ? public_shares_180.toLocaleString("en-IN")
                  : "—"}
              </span>,
              <span key="pub-p180" className="font-mono font-bold text-slate-700">
                {public_pct_180 != null ? `${public_pct_180}%` : "—"}
              </span>,
              <span
                key="pub-diff"
                className={cn(
                  "font-mono font-bold px-2 py-0.5 rounded text-xs",
                  (public_pct_diff ?? 0) >= 0
                    ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                    : "text-amber-700 bg-amber-50 border border-amber-100"
                )}
              >
                {public_pct_diff != null
                  ? `${public_pct_diff >= 0 ? "+" : ""}${public_pct_diff}%`
                  : "—"}
              </span>,
            ],
          ]}
        />
      </Card>

      {/* TABLE 2: PAN Holding & Trading Activity */}
      <Card>
        <SectionHeader
          icon={<Users className="w-4 h-4 text-indigo-600" />}
          title="PAN Holding & Trading Activity"
          subtitle={`Investors holding the stock (today vs. 6 months ago) and average daily traders (${windowDays}-day vs. 6-month average)`}
          info="Compares how many unique investors hold and trade the stock recently versus 6 months ago."
        />
        <DataTable
          headers={[
            "Metric",
            `Current (Today / ${windowDays}-Day Avg)`,
            "6 Months Ago / 6-Month Avg",
            "Change",
          ]}
          rows={[
            [
              <span key="r-hp" className="font-bold text-slate-900">
                Unique investors holding scrip (PANs)
              </span>,
              <span key="r-hpt" className="font-mono font-bold text-slate-900">
                {unique_pans_t != null ? `${unique_pans_t} PANs` : "—"}
              </span>,
              <span key="r-hp180" className="font-mono font-bold text-slate-700">
                {unique_pans_180 != null ? `${unique_pans_180} PANs` : "—"}
              </span>,
              <span
                key="r-hpdiff"
                className={cn(
                  "font-mono font-bold px-2 py-0.5 rounded text-xs",
                  (unique_pans_diff ?? 0) >= 0
                    ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                    : "text-rose-700 bg-rose-50 border border-rose-100"
                )}
              >
                {unique_pans_pct_diff != null
                  ? `${unique_pans_pct_diff >= 0 ? "+" : ""}${unique_pans_pct_diff}%`
                  : "—"}
              </span>,
            ],
            [
              <span key="r-tp" className="font-bold text-slate-900">
                Average daily trading investors (PANs)
              </span>,
              <span key="r-tpt" className="font-mono font-bold text-slate-900">
                {avg_pans_15d != null ? `${avg_pans_15d} PANs / day` : "—"}
              </span>,
              <span key="r-tp180" className="font-mono font-bold text-slate-700">
                {avg_pans_180d != null ? `${avg_pans_180d} PANs / day` : "—"}
              </span>,
              <span
                key="r-tpdiff"
                className={cn(
                  "font-mono font-bold px-2 py-0.5 rounded text-xs",
                  (avg_pans_diff ?? 0) >= 0
                    ? "text-indigo-700 bg-indigo-50 border border-indigo-100"
                    : "text-slate-700 bg-slate-100 border border-slate-200"
                )}
              >
                {avg_pans_pct_diff != null
                  ? `${avg_pans_pct_diff >= 0 ? "+" : ""}${avg_pans_pct_diff}%`
                  : "—"}
              </span>,
            ],
          ]}
        />
      </Card>

      {/* TABLE 3: Significant Shareholders Register (Holdings >= 1.00%) */}
      {shBreakdown?.major_shareholders && shBreakdown.major_shareholders.length > 0 && (
        <Card>
          <SectionHeader
            icon={<Users className="w-4 h-4 text-amber-600" />}
            title="Significant Shareholders Register (Holdings ≥ 1.00%)"
            subtitle="Detailed registry of major institutional, promoter, and individual block holders"
            info="Lists major shareholders holding at least 1% of the company, highlighting large stakes and pledged shares."
          />
          <DataTable
            alignments={["left", "left", "left", "right", "right", "right", "center"]}
            headers={[
              "Shareholder Legal Name",
              "Client PAN",
              "Category",
              "Shares Held",
              "% Equity",
              "Pledged Shares",
              "Status Flag",
            ]}
            rows={shBreakdown.major_shareholders.map((sh: any, idx: number) => {
              const pct = Number(sh.holding_pct || 0);
              const isPromoter = (sh.category || "").toUpperCase().includes("PROMOTER");
              const isSubstantial = pct >= 5.0;
              return [
                <span key={`name-${idx}`} className="font-bold text-slate-900">
                  {sh.name || sh.client_name}
                </span>,
                <button
                  type="button"
                  key={`pan-${idx}`}
                  onClick={() => sh.pan && onSelectPan(sh.pan)}
                  className="text-slate-800 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-mono font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors"
                  title="Click to view Client 360 profile"
                >
                  <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {sh.pan || "—"}
                </button>,
                <span
                  key={`cat-${idx}`}
                  className="font-medium text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded"
                >
                  {sh.category || "PUBLIC"}
                </span>,
                <span key={`sh-${idx}`} className="font-mono font-bold text-slate-900">
                  {Number(sh.shares || 0).toLocaleString("en-IN")}
                </span>,
                <span key={`pct-${idx}`} className="font-mono font-bold text-indigo-700">
                  {pct.toFixed(2)}%
                </span>,
                <span key={`pl-${idx}`} className="font-mono text-slate-600">
                  {sh.pledged_count ? Number(sh.pledged_count).toLocaleString("en-IN") : "0"}
                </span>,
                <span key={`flag-${idx}`} className="inline-flex items-center">
                  {isPromoter ? (
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100">
                      Promoter
                    </span>
                  ) : isSubstantial ? (
                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold text-[11px] border border-rose-200">
                      Substantial (≥ 5%)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
                      Standard
                    </span>
                  )}
                </span>,
              ];
            })}
          />
        </Card>
      )}
    </div>
  );
}
