"use client";

import Link from "next/link";
import { 
  ShieldAlert, 
  TrendingUp, 
  BarChart2, 
  Users, 
  Layers, 
  Database, 
  CheckCircle2, 
  ArrowRight,
  FileText,
  Activity,
  ArrowDown
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SystemGuidePage() {
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-auto font-sans">

      {/* Header Banner */}
      <div className="bg-slate-900 text-white px-8 py-10 border-b border-slate-800 shadow-sm flex-shrink-0">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-lg">
              PV
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Price-Volume Alert Surveillance Framework (PVASF)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete End-to-End System Overview & Sequential Module Guide
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pt-2">
            This guide explains the entire market surveillance project from end-of-day data ingestion to statistical anomaly scoring, risk ranking, and forensic investigation.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto p-8 space-y-8 w-full flex-1">

        {/* System Summary */}
        <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-sm space-y-2">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-200" />
            System Purpose & High-Level Goal
          </h2>
          <p className="text-xs text-blue-100 leading-relaxed">
            PVASF is an automated surveillance system that screens listed stock trading activity every evening. It identifies artificial price inflation, volume pumps, circular trading loops, and volatility outliers to shortlist high-risk stocks for regulatory review.
          </p>
        </div>

        {/* ── MODULE 1 ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">1</span>
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Module 1</span>
                <h3 className="text-base font-extrabold text-slate-900">EOD Market Data Ingestion & Summary Aggregates</h3>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Tables: AGG_SEC_DAY, AGG_CLNT_SEC_DAY, AGG_PAN_PAIR_DAY
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div>
              <strong className="text-slate-900 font-semibold">What it does: </strong>
              Every evening after trading closes, the system ingests pre-aggregated summary data for all stocks, trading clients, and buyer-seller pairs.
            </div>
            <div>
              <strong className="text-slate-900 font-semibold">How it works: </strong>
              Rather than processing multi-terabyte raw trade match streams, the system queries three pre-computed Teradata summary tables:
              <ul className="list-disc list-inside mt-1.5 space-y-1 font-medium text-slate-700">
                <li><code className="text-blue-600 bg-slate-100 px-1 py-0.5 rounded">AGG_SEC_DAY</code>: Stores official 30-minute VWAP Closing Prices (<code className="text-blue-600 font-bold">Asd_Close_Price</code>), daily OHLC, total volumes, and 52-week High/Low limits.</li>
                <li><code className="text-blue-600 bg-slate-100 px-1 py-0.5 rounded">AGG_CLNT_SEC_DAY</code>: Stores client daily buy/sell volumes, positive/negative LTP push (<code className="text-blue-600 font-bold">Acsd_Pos_Cont_Val</code> / <code className="text-rose-600 font-bold">Acsd_Neg_Cont_Val</code>), and Net LTP Contribution.</li>
                <li><code className="text-blue-600 bg-slate-100 px-1 py-0.5 rounded">AGG_PAN_PAIR_DAY</code>: Stores buyer-seller PAN pair matched volumes, positive/negative pair LTP push (<code className="text-blue-600 font-bold">Appd_Pos_Contri</code> / <code className="text-rose-600 font-bold">Appd_Neg_Contri</code>), and trading concentration scores.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowDown className="h-5 w-5 text-slate-300" />
        </div>

        {/* ── MODULE 2 ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">2</span>
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Module 2</span>
                <h3 className="text-base font-extrabold text-slate-900">180-Day Rolling Statistical Baseline</h3>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Window: T-180 to T
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div>
              <strong className="text-slate-900 font-semibold">What it does: </strong>
              Establishes a 6-month historical "normal" baseline for every stock to compare against current 15-day activity.
            </div>
            <div>
              <strong className="text-slate-900 font-semibold">How it works: </strong>
              Calculates rolling mean (average) and standard deviation (volatility) over the preceding 180 trading days to compute statistical Z-Scores for price changes and volume spikes.
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowDown className="h-5 w-5 text-slate-300" />
        </div>

        {/* ── MODULE 3 ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-cyan-600 text-white font-extrabold text-xs flex items-center justify-center">3</span>
              <div>
                <span className="text-[11px] font-bold text-cyan-600 uppercase tracking-wider">Module 3</span>
                <h3 className="text-base font-extrabold text-slate-900">Five Anomaly Parameter Scoring Engine</h3>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Score Range: 0 to 5 Points Each
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            During the 15-day observation window, every stock is scored across 5 specific anomaly tests:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
              <div className="text-xs font-bold text-slate-900">1. Price Rise %</div>
              <p className="text-[11px] text-slate-500">Max 15D price growth vs T-180 closing price.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
              <div className="text-xs font-bold text-slate-900">2. Price Z-Score</div>
              <p className="text-[11px] text-slate-500">Statistical price volatility deviation.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
              <div className="text-xs font-bold text-slate-900">3. Volume Z-Score</div>
              <p className="text-[11px] text-slate-500">Statistical liquidity volume surge.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
              <div className="text-xs font-bold text-slate-900">4. Circuit Hits</div>
              <p className="text-[11px] text-slate-500">Days trading at Upper/Lower limit bands.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
              <div className="text-xs font-bold text-slate-900">5. 180D New Highs</div>
              <p className="text-[11px] text-slate-500">Days breaking 6-month peak price levels.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowDown className="h-5 w-5 text-slate-300" />
        </div>

        {/* ── MODULE 4 ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center">4</span>
              <div>
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Module 4</span>
                <h3 className="text-base font-extrabold text-slate-900">Risk Classification & Officer Watchlist Cockpit</h3>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Route: / (Dashboard)
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div>
              <strong className="text-slate-900 font-semibold">What it does: </strong>
              Computes a final Composite Anomaly Score (0 to 100) and categorizes stocks into risk tiers:
              <ul className="list-disc list-inside mt-1.5 space-y-1 font-medium text-slate-700">
                <li><span className="text-rose-700 font-bold">High Risk (Score &ge; 75)</span>: Immediate priority regulatory review.</li>
                <li><span className="text-amber-700 font-bold">Medium Risk (Score 60 to 74)</span>: Secondary surveillance monitoring.</li>
                <li><span className="text-emerald-700 font-bold">Low Risk (Score &lt; 60)</span>: Baseline standard monitoring.</li>
              </ul>
            </div>
            <div>
              <strong className="text-slate-900 font-semibold">Officer Assignment: </strong>
              Watchlisted high-risk stocks are automatically distributed alphabetically to surveillance officers based on their allotted letter ranges (e.g., Officer A receives scrips starting with A–C).
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowDown className="h-5 w-5 text-slate-300" />
        </div>

        {/* ── MODULE 5 ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center">5</span>
              <div>
                <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Module 5</span>
                <h3 className="text-base font-extrabold text-slate-900">Side-by-Side Comparison & Cross-Scrip Group Audit</h3>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Route: /compare
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div>
              <strong className="text-slate-900 font-semibold">What it does: </strong>
              Allows officers to compare two watchlisted stocks side-by-side to analyze price trends and audit shared participant PAN groups.
            </div>
            <div>
              <strong className="text-slate-900 font-semibold">Key Audit: </strong>
              Detects if the same trading clients or buyer-seller groups are actively trading in multiple pump stocks at the same time.
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowDown className="h-5 w-5 text-slate-300" />
        </div>

        {/* ── MODULE 6 ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">6</span>
              <div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Module 6</span>
                <h3 className="text-base font-extrabold text-slate-900">Forensic Investigation, Participant Audit & Case Management</h3>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Routes: /investigations/[symbol], /cases
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div>
              <strong className="text-slate-900 font-semibold">What it does: </strong>
              Provides full forensic audit tools for an individual stock and manages regulatory investigation dossiers.
            </div>
            <div>
              <strong className="text-slate-900 font-semibold">Forensic Tools: </strong>
              <ul className="list-disc list-inside mt-1.5 space-y-1 font-medium text-slate-700">
                <li><strong className="text-slate-900">LTP Contribution</strong>: Audits buy-aggressive trades pushing the price upward.</li>
                <li><strong className="text-slate-900">Concentrated Volume Share</strong>: Identifies top 5 trading clients.</li>
                <li><strong className="text-slate-900">Circular Trade Loops</strong>: Detects multi-hop trading rings.</li>
                <li><strong className="text-slate-900">Case Management</strong>: Saves evidence, case notes, and officer decisions into official dossiers (<code className="text-emerald-600 bg-slate-100 px-1 py-0.5 rounded">FORENSIC_CASES</code>).</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Navigation Box */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold">Ready to explore the live system?</h3>
            <p className="text-xs text-slate-400 mt-0.5">Jump directly to the Watchlist Dashboard or Trade Explorer.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl">
                Open Watchlist Cockpit &rarr;
              </Button>
            </Link>
            <Link href="/trades">
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold px-4 py-2 rounded-xl">
                Open Trade Explorer
              </Button>
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
