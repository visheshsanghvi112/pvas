"use client";

import React from "react";
import { TrendingUp, TrendingDown, Users, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/investigation/charts";
import type { ScripDetail, ParticipantAudit } from "@/lib/api";
import { Card, SectionHeader, DataTable } from "./shared";

export interface ParticipantsTabProps {
  symbol: string;
  detail: ScripDetail;
  participants: ParticipantAudit | null;
  windowDays: number;
  onSelectPan: (pan: string) => void;
}

export function ParticipantsTab({
  symbol,
  detail,
  participants,
  windowDays,
  onSelectPan,
}: ParticipantsTabProps) {
  if (!participants) {
    return (
      <div className="space-y-5">
        <Card>
          <div className="p-8 text-sm text-slate-500 text-center">
            Participant audit data not available for this scrip.
          </div>
        </Card>
      </div>
    );
  }

  const allLtp = participants.ltp_contributors || [];
  const posList =
    participants.pos_ltp_contributors && participants.pos_ltp_contributors.length > 0
      ? participants.pos_ltp_contributors
      : allLtp.filter(
          (p) =>
            (p.pos_val ?? (p.net_val && p.net_val > 0 ? p.net_val : 0)) > 0 ||
            (p.contribution && p.contribution > 0)
        );

  const negList =
    participants.neg_ltp_contributors && participants.neg_ltp_contributors.length > 0
      ? participants.neg_ltp_contributors
      : allLtp.filter(
          (p) =>
            (p.neg_val ?? (p.net_val && p.net_val < 0 ? Math.abs(p.net_val) : 0)) > 0 ||
            (p.contribution && p.contribution < 0)
        );

  const panNameMap: Record<string, string> = {};
  for (const p of participants.ltp_contributors || []) {
    if (p.participant && p.name) panNameMap[p.participant] = p.name;
  }
  for (const p of participants.pos_ltp_contributors || []) {
    if (p.participant && p.name) panNameMap[p.participant] = p.name;
  }
  for (const p of participants.neg_ltp_contributors || []) {
    if (p.participant && p.name) panNameMap[p.participant] = p.name;
  }
  for (const p of participants.volume_share || []) {
    if (p.participant && p.name) panNameMap[p.participant] = p.name;
  }
  for (const p of participants.profit_makers || []) {
    if (p.participant && p.name) panNameMap[p.participant] = p.name;
  }
  for (const p of participants.reversal_pairs || []) {
    if (p.pan1 && p.name1) panNameMap[p.pan1] = p.name1;
    if (p.pan2 && p.name2) panNameMap[p.pan2] = p.name2;
  }

  const scripPriceRise =
    participants.scrip_15d_price_change ??
    (detail?.metrics?.price_rise_pct != null
      ? Number(detail.metrics.price_rise_pct.toFixed(2))
      : null);

  return (
    <div className="space-y-5">
      {/* Row 1: Two Dedicated LTP Contribution Tables (Gross Positive & Gross Negative) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gross Positive LTP Contribution Table */}
        <Card>
          <SectionHeader
            icon={<TrendingUp className="w-4 h-4 text-slate-600" />}
            title="Gross Positive LTP Contribution"
            subtitle="Aggressive buy orders driving upward price momentum (+₹)"
            info={`Measures how much each participant's aggressive buy orders pushed the traded price higher across the ${windowDays}-day window.`}
          />
          {scripPriceRise && scripPriceRise > 0.05 && (
            <div className="mx-5 mb-3 px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 flex items-center gap-1.5 text-xs text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
              <span>
                15-Day Net Scrip Rise:{" "}
                <strong className="font-mono text-emerald-950 font-bold">
                  +₹{scripPriceRise.toFixed(2)}
                </strong>
              </span>
            </div>
          )}
          {posList.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No significant positive price pushers detected in the observation window.
            </div>
          ) : (
            <DataTable
              minWidth="min-w-[500px]"
              colWidths={["35%", "21%", "22%", "22%"]}
              alignments={["left", "left", "right", "right"]}
              headers={[
                <span key="h-name" className="whitespace-nowrap">
                  PAN Holder Name
                </span>,
                <span key="h-pan" className="inline-flex items-center gap-1 whitespace-nowrap">
                  Client PAN
                </span>,
                <span key="h-pos" className="inline-flex items-center gap-1 whitespace-nowrap">
                  LTP Push (+₹){" "}
                  <InfoTooltip text="Total rupee value of price increases directly caused by this entity's buy orders hitting the ask." />
                </span>,
                <span key="h-cont" className="inline-flex items-center gap-1 whitespace-nowrap">
                  LTP Contribution %{" "}
                  <InfoTooltip text="Share of total 15-day price rise driven by this participant's aggressive buy orders: (Entity Push ÷ 15-Day Net Scrip Rise) × 100." />
                </span>,
              ]}
              rows={posList.map((p) => {
                const posVal = p.pos_val ?? (p.net_val && p.net_val > 0 ? p.net_val : 0);
                const movePct =
                  p.scrip_movement_contribution_pct != null
                    ? Math.abs(Number(p.scrip_movement_contribution_pct))
                    : null;
                const primaryPct =
                  movePct !== null ? movePct : Math.abs(Number(p.contribution || 0));
                const displayName =
                  p.name || panNameMap[p.participant] || "Unknown Entity";

                return [
                  <span
                    key="name"
                    className="font-semibold text-slate-900 truncate max-w-[170px] sm:max-w-[210px] xl:max-w-[240px] block"
                    title={displayName}
                  >
                    {displayName}
                  </span>,
                  <button
                    type="button"
                    key={p.participant}
                    onClick={() => onSelectPan(p.participant)}
                    className="text-slate-800 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-mono font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors"
                    title="Click to view Client 360 profile"
                  >
                    <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {p.participant}
                  </button>,
                  <span
                    key="pos"
                    className="font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums"
                  >
                    +₹
                    {Number(posVal || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>,
                  <div
                    key="bar"
                    className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap"
                  >
                    <div className="w-7 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200 shrink-0">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, primaryPct)}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-slate-900 tabular-nums text-xs min-w-[44px] text-right">
                      +{primaryPct.toFixed(2)}%
                    </span>
                  </div>,
                ];
              })}
            />
          )}
        </Card>

        {/* Gross Negative LTP Contribution Table */}
        <Card>
          <SectionHeader
            icon={<TrendingDown className="w-4 h-4 text-slate-600" />}
            title="Gross Negative LTP Contribution"
            subtitle="Aggressive sell orders dampening price or hitting bids (-₹)"
            info={`Measures how much each participant's aggressive sell orders pulled or suppressed the traded price downwards across the ${windowDays}-day window.`}
          />
          {scripPriceRise && scripPriceRise > 0.05 && (
            <div className="mx-5 mb-3 px-3 py-1.5 rounded-lg bg-rose-50/70 border border-rose-200/60 flex items-center gap-1.5 text-xs text-rose-800">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
              <span>
                15-Day Net Scrip Rise:{" "}
                <strong className="font-mono text-rose-950 font-bold">
                  +₹{scripPriceRise.toFixed(2)}
                </strong>
              </span>
            </div>
          )}
          {negList.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No significant negative price suppressors detected in the observation window.
            </div>
          ) : (
            <DataTable
              minWidth="min-w-[500px]"
              colWidths={["35%", "21%", "22%", "22%"]}
              alignments={["left", "left", "right", "right"]}
              headers={[
                <span key="h-name" className="whitespace-nowrap">
                  PAN Holder Name
                </span>,
                <span key="h-pan" className="inline-flex items-center gap-1 whitespace-nowrap">
                  Client PAN
                </span>,
                <span key="h-neg" className="inline-flex items-center gap-1 whitespace-nowrap">
                  LTP Pull (-₹){" "}
                  <InfoTooltip text="Total rupee value of price drops directly caused by this entity's sell orders hitting the bid." />
                </span>,
                <span key="h-cont" className="inline-flex items-center gap-1 whitespace-nowrap">
                  LTP Pull %{" "}
                  <InfoTooltip text="Share of price decline driven by this participant's aggressive sell orders: (Entity Pull ÷ 15-Day Net Scrip Rise) × 100." />
                </span>,
              ]}
              rows={negList.map((p) => {
                const negVal =
                  p.neg_val ?? (p.net_val && p.net_val < 0 ? Math.abs(p.net_val) : 0);
                const movePct =
                  p.scrip_movement_contribution_pct != null
                    ? Math.abs(Number(p.scrip_movement_contribution_pct))
                    : null;
                const primaryPct =
                  movePct !== null ? movePct : Math.abs(Number(p.contribution || 0));
                const displayName =
                  p.name || panNameMap[p.participant] || "Unknown Entity";

                return [
                  <span
                    key="name"
                    className="font-semibold text-slate-900 truncate max-w-[170px] sm:max-w-[210px] xl:max-w-[240px] block"
                    title={displayName}
                  >
                    {displayName}
                  </span>,
                  <button
                    type="button"
                    key={p.participant}
                    onClick={() => onSelectPan(p.participant)}
                    className="text-slate-800 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-mono font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors"
                    title="Click to view Client 360 profile"
                  >
                    <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {p.participant}
                  </button>,
                  <span
                    key="neg"
                    className="font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums"
                  >
                    -₹
                    {Number(negVal || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>,
                  <div
                    key="bar"
                    className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap"
                  >
                    <div className="w-7 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200 shrink-0">
                      <div
                        className="bg-rose-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, primaryPct)}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-slate-900 tabular-nums text-xs min-w-[44px] text-right">
                      -{primaryPct.toFixed(2)}%
                    </span>
                  </div>,
                ];
              })}
            />
          )}
        </Card>
      </div>

      {/* Row 2: Concentrated Volume Share & Counterparty Concentration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Concentrated Volume Share */}
        <Card>
          <SectionHeader
            title="Concentrated Volume Share"
            subtitle="Top 5 participants by volume"
            info={`Highlights the top entities by total trading volume over the ${windowDays}-day window to detect cornering of the stock's floating shares.`}
          />
          <DataTable
            minWidth="min-w-[500px]"
            colWidths={["35%", "21%", "22%", "22%"]}
            alignments={["left", "left", "right", "right"]}
            headers={[
              <span key="h-name" className="whitespace-nowrap">
                PAN Holder Name
              </span>,
              <span key="h-volpan" className="inline-flex items-center gap-1 whitespace-nowrap">
                Client PAN
              </span>,
              <span key="h-vol" className="inline-flex items-center gap-1 whitespace-nowrap">
                Volume{" "}
                <InfoTooltip
                  text={`Total number of shares bought and sold by this participant during the ${windowDays}-day period.`}
                />
              </span>,
              <span key="h-volpct" className="inline-flex items-center gap-1 whitespace-nowrap">
                Share %{" "}
                <InfoTooltip text="Percentage of the stock's total market volume traded by this single participant." />
              </span>,
            ]}
            rows={participants.volume_share.map((p) => {
              const displayName =
                p.name || panNameMap[p.participant] || "Unknown Entity";
              return [
                <span
                  key="name"
                  className="font-semibold text-slate-900 truncate max-w-[170px] sm:max-w-[210px] xl:max-w-[240px] block"
                  title={displayName}
                >
                  {displayName}
                </span>,
                <button
                  type="button"
                  key={p.participant}
                  onClick={() => onSelectPan(p.participant)}
                  className="text-slate-800 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-mono font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors"
                  title="Click to view Client 360 profile"
                >
                  <UserCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {p.participant}
                </button>,
                <span
                  key="vol"
                  className="font-mono text-xs font-semibold text-slate-800 whitespace-nowrap tabular-nums"
                >
                  {Number(p.volume || 0).toLocaleString("en-IN")}
                </span>,
                <div
                  key="bar"
                  className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap"
                >
                  <div className="w-7 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200 shrink-0">
                    <div
                      className="bg-slate-700 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, Number(p.share_pct || 0)))}%`,
                      }}
                    />
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums text-xs min-w-[42px] text-right">
                    {Number(p.share_pct || 0).toFixed(2)}%
                  </span>
                </div>,
              ];
            })}
          />
        </Card>

        {/* Counterparty Concentration */}
        <Card>
          <SectionHeader
            title="Counterparty Concentration"
            subtitle="Top 5 bilateral trading pairs by volume"
            info="Tracks trades matched directly between specific buyer-seller pairs. High concentration indicates potential circular or synchronized trading."
          />
          {participants.counterparty_pairs.length > 0 ? (
            <DataTable
              minWidth="min-w-[480px]"
              colWidths={["56%", "22%", "22%"]}
              alignments={["left", "right", "right"]}
              headers={[
                <span key="h-cppair" className="inline-flex items-center gap-1 whitespace-nowrap">
                  Matched Entities & PANs{" "}
                  <InfoTooltip text="Buyer and seller accounts that frequently traded shares with each other." />
                </span>,
                <span key="h-cpvol" className="inline-flex items-center gap-1 whitespace-nowrap">
                  Volume{" "}
                  <InfoTooltip text="Total volume of shares exchanged directly between this buyer and seller pair." />
                </span>,
                <span key="h-cppct" className="inline-flex items-center gap-1 whitespace-nowrap">
                  Share %{" "}
                  <InfoTooltip text="Percentage of total market volume generated by trades between this specific pair." />
                </span>,
              ]}
              rows={participants.counterparty_pairs.map((p) => {
                const pairParts = p.pair.split(" <-> ");
                const p1 = p.pan1 || pairParts[0] || p.pair;
                const p2 = p.pan2 || pairParts[1] || "";
                const n1 = p.name1 || panNameMap[p1] || p1;
                const n2 = p.name2 || panNameMap[p2] || p2;
                return [
                  <div key={p.pair} className="flex flex-col gap-1 py-1">
                    {/* Entity Names */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 leading-snug">
                      <span
                        className="truncate max-w-[150px] sm:max-w-[190px] xl:max-w-[240px]"
                        title={n1}
                      >
                        {n1}
                      </span>
                      <span className="text-slate-400 font-bold shrink-0">⇄</span>
                      <span
                        className="truncate max-w-[150px] sm:max-w-[190px] xl:max-w-[240px]"
                        title={n2}
                      >
                        {n2}
                      </span>
                    </div>
                    {/* PAN Badges */}
                    <div className="inline-flex items-center gap-1 font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={() => onSelectPan(p1)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title={`Click to view Client 360 profile for ${p1}`}
                      >
                        <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {p1}
                      </button>
                      <span className="text-slate-300 font-bold">⇄</span>
                      <button
                        type="button"
                        onClick={() => onSelectPan(p2)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title={`Click to view Client 360 profile for ${p2}`}
                      >
                        <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {p2}
                      </button>
                    </div>
                  </div>,
                  <span
                    key="vol"
                    className="font-mono text-xs font-semibold text-slate-800 whitespace-nowrap tabular-nums"
                  >
                    {Number(p.volume || 0).toLocaleString("en-IN")}
                  </span>,
                  <span
                    key="pct"
                    className="font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums"
                  >
                    {Number(p.share_pct || 0).toFixed(2)}%
                  </span>,
                ];
              })}
            />
          ) : (
            <div className="py-7 px-4 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <Users className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <div className="text-xs font-semibold text-slate-700">
                Bilateral Trade Matches Not Supplied
              </div>
              <div className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Bilateral matching extract was not supplied for {detail.symbol} in the current
                trade pair feed. Individual conduct (LTP Push/Pull, Volume Dominance, and Net
                P&amp;L) is still tracked from participant trade logs.
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Realized P&L — Top Beneficiaries */}
      <Card>
        <SectionHeader
          title="Realized P&L — Top Trading Beneficiaries"
          subtitle={`Top cash gainers with closed/matched trades (bought & sold) in ${windowDays}D window`}
          info={`Identifies participants who both bought and sold shares during the ${windowDays}-day window and extracted net cash trading profits. Long-term position accumulators who have not sold are excluded to eliminate false positives.`}
        />
        <DataTable
          minWidth="min-w-[600px]"
          colWidths={["30%", "18%", "20%", "16%", "16%"]}
          alignments={["left", "left", "right", "right", "right"]}
          headers={[
            <span key="h-name" className="whitespace-nowrap">
              PAN Holder Name
            </span>,
            <span key="h-pnlpan" className="inline-flex items-center gap-1 whitespace-nowrap">
              Client PAN
            </span>,
            <span key="h-pnl" className="inline-flex items-center gap-1 whitespace-nowrap">
              Realized P&L (₹){" "}
              <InfoTooltip
                text={`Net cash profit realized on matched buy and sell trades during the ${windowDays}-day observation window.`}
              />
            </span>,
            <span key="h-bvol" className="inline-flex items-center gap-1 whitespace-nowrap">
              Buy Vol{" "}
              <InfoTooltip
                text={`Total shares bought by this participant during the ${windowDays}-day window.`}
              />
            </span>,
            <span key="h-svol" className="inline-flex items-center gap-1 whitespace-nowrap">
              Sell Vol{" "}
              <InfoTooltip
                text={`Total shares sold by this participant during the ${windowDays}-day window.`}
              />
            </span>,
          ]}
          rows={participants.profit_makers.map((p) => {
            const pnlVal = Number(p.net_pnl || 0);
            const isPos = pnlVal >= 0;
            const absVal = Math.abs(pnlVal);
            const formattedAmt = absVal.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            let macroLabel = "";
            if (absVal >= 10000000) {
              macroLabel = `${isPos ? "+" : "-"}₹${(absVal / 10000000).toFixed(2)} Cr`;
            } else if (absVal >= 100000) {
              macroLabel = `${isPos ? "+" : "-"}₹${(absVal / 100000).toFixed(2)} L`;
            }
            const displayName =
              p.name || panNameMap[p.participant] || "Unknown Entity";

            return [
              <span
                key="name"
                className="font-semibold text-slate-900 truncate max-w-[170px] sm:max-w-[210px] xl:max-w-[250px] block"
                title={displayName}
              >
                {displayName}
              </span>,
              <button
                type="button"
                key={p.participant}
                onClick={() => onSelectPan(p.participant)}
                className="text-slate-800 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-mono font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors"
                title="Click to view Client 360 profile"
              >
                <UserCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                {p.participant}
              </button>,
              <div
                key="pnl"
                className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap tabular-nums"
              >
                <span
                  className={cn(
                    "font-mono text-xs font-bold",
                    isPos ? "text-emerald-700" : "text-rose-600"
                  )}
                >
                  {isPos ? `+₹${formattedAmt}` : `-₹${formattedAmt}`}
                </span>
                {macroLabel && (
                  <span
                    className={cn(
                      "text-[10px] font-extrabold px-1.5 py-0.2 rounded border font-sans",
                      isPos
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    )}
                  >
                    {macroLabel}
                  </span>
                )}
              </div>,
              <span
                key="bvol"
                className="font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums"
              >
                {Number(p.buy_volume || 0).toLocaleString("en-IN")}
              </span>,
              <span
                key="svol"
                className="font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums"
              >
                {Number(p.sell_volume || 0).toLocaleString("en-IN")}
              </span>,
            ];
          })}
        />
      </Card>
    </div>
  );
}
