"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GitCompare, ArrowRight, ShieldAlert, BarChart2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/ui/badge";
import { MetricHelp } from "@/components/ui/metric-help";
import { fetchWatchlist, fetchScripDetail, type ScripSummary, type ScripDetail } from "@/lib/api";
import { PriceChart, VolumeChart } from "@/components/investigation/charts";

export default function ComparePage() {
  const [allScrips, setAllScrips] = useState<ScripSummary[]>([]);
  const [scrip1Symbol, setScrip1Symbol] = useState("ALPHATECH");
  const [scrip2Symbol, setScrip2Symbol] = useState("NOVAENERGY");

  const [detail1, setDetail1] = useState<ScripDetail | null>(null);
  const [detail2, setDetail2] = useState<ScripDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScrips() {
      const watchlist = await fetchWatchlist();
      setAllScrips(watchlist);
    }
    loadScrips();
  }, []);

  useEffect(() => {
    async function loadDetails() {
      setLoading(true);
      const [d1, d2] = await Promise.all([
        fetchScripDetail(scrip1Symbol),
        fetchScripDetail(scrip2Symbol)
      ]);
      setDetail1(d1);
      setDetail2(d2);
      setLoading(false);
    }
    loadDetails();
  }, [scrip1Symbol, scrip2Symbol]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <GitCompare className="h-4 w-4" />
            Comparative Surveillance Audit
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Scrip Analysis Comparison</h1>
          <p className="mt-1 text-xs text-slate-500">Side-by-side surveillance metric comparison, statistical Z-scores, and price-volume baselines.</p>
        </div>

        {/* Scrip Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs">
            <span className="text-xs font-bold text-slate-500 px-2">Scrip A:</span>
            <select
              value={scrip1Symbol}
              onChange={(e) => setScrip1Symbol(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none"
            >
              {allScrips.map((s) => (
                <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.company}</option>
              ))}
            </select>
          </div>

          <span className="text-xs font-bold text-slate-400">VS</span>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs">
            <span className="text-xs font-bold text-slate-500 px-2">Scrip B:</span>
            <select
              value={scrip2Symbol}
              onChange={(e) => setScrip2Symbol(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none"
            >
              {allScrips.map((s) => (
                <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.company}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading || !detail1 || !detail2 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500 gap-2">
          <div className="h-7 w-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">Loading comparative surveillance parameters...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Side-by-side Overview Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Scrip 1 Card */}
            <Card className="border-blue-200 bg-blue-50/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Scrip A</span>
                    <h2 className="text-2xl font-black text-slate-900">{detail1.symbol}</h2>
                    <p className="text-xs text-slate-500">{detail1.company}</p>
                  </div>
                  <RiskBadge risk={detail1.risk} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-sans font-semibold text-slate-500">Composite Score</div>
                    <div className="mt-1 text-2xl font-black text-blue-700">{detail1.metrics.final_score}/100</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-sans font-semibold text-slate-500">Price Rise %</div>
                    <div className="mt-1 text-2xl font-black text-rose-600">↑ {detail1.metrics.price_rise_pct}%</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-sans font-semibold text-slate-500">Volume Z-Score</div>
                    <div className="mt-1 text-xl font-bold text-amber-700">{detail1.metrics.volume_z}σ</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-sans font-semibold text-slate-500">Upper Circuit Hits</div>
                    <div className="mt-1 text-xl font-bold text-blue-700">{detail1.metrics.band_hit_days} days</div>
                  </div>
                </div>

                <Button asChild variant="outline" className="w-full text-xs">
                  <Link href={`/investigations/${detail1.symbol}`}>
                    Analyse {detail1.symbol} Details <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Scrip 2 Card */}
            <Card className="border-indigo-200 bg-indigo-50/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Scrip B</span>
                    <h2 className="text-2xl font-black text-slate-900">{detail2.symbol}</h2>
                    <p className="text-xs text-slate-500">{detail2.company}</p>
                  </div>
                  <RiskBadge risk={detail2.risk} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-sans font-semibold text-slate-500">Composite Score</div>
                    <div className="mt-1 text-2xl font-black text-indigo-700">{detail2.metrics.final_score}/100</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-sans font-semibold text-slate-500">Price Rise %</div>
                    <div className="mt-1 text-2xl font-black text-rose-600">↑ {detail2.metrics.price_rise_pct}%</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-sans font-semibold text-slate-500">Volume Z-Score</div>
                    <div className="mt-1 text-xl font-bold text-amber-700">{detail2.metrics.volume_z}σ</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-sans font-semibold text-slate-500">Upper Circuit Hits</div>
                    <div className="mt-1 text-xl font-bold text-indigo-700">{detail2.metrics.band_hit_days} days</div>
                  </div>
                </div>

                <Button asChild variant="outline" className="w-full text-xs">
                  <Link href={`/investigations/${detail2.symbol}`}>
                    Analyse {detail2.symbol} Details <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Comparative Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Side-by-Side Metric Comparison Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-sans">Surveillance Metric</th>
                      <th className="py-3 px-4 font-sans text-blue-700">{detail1.symbol} (Scrip A)</th>
                      <th className="py-3 px-4 font-sans text-indigo-700">{detail2.symbol} (Scrip B)</th>
                      <th className="py-3 px-4 font-sans">Variance / Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3.5 px-4 font-sans font-bold text-slate-900">Composite Risk Score</td>
                      <td className="py-3.5 px-4 font-bold">{detail1.metrics.final_score} pts</td>
                      <td className="py-3.5 px-4 font-bold">{detail2.metrics.final_score} pts</td>
                      <td className="py-3.5 px-4 font-bold text-blue-700">
                        {Math.abs(detail1.metrics.final_score - detail2.metrics.final_score).toFixed(1)} pts
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-sans font-bold text-slate-900">6-Month Price Rise %</td>
                      <td className="py-3.5 px-4 text-rose-600 font-bold">↑ {detail1.metrics.price_rise_pct}%</td>
                      <td className="py-3.5 px-4 text-rose-600 font-bold">↑ {detail2.metrics.price_rise_pct}%</td>
                      <td className="py-3.5 px-4 font-bold">
                        {Math.abs(detail1.metrics.price_rise_pct - detail2.metrics.price_rise_pct).toFixed(1)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-sans font-bold text-slate-900">Volume Z-Score</td>
                      <td className="py-3.5 px-4 text-amber-700 font-bold">{detail1.metrics.volume_z}σ</td>
                      <td className="py-3.5 px-4 text-amber-700 font-bold">{detail2.metrics.volume_z}σ</td>
                      <td className="py-3.5 px-4 font-bold">
                        {Math.abs(detail1.metrics.volume_z - detail2.metrics.volume_z).toFixed(2)}σ
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-sans font-bold text-slate-900">Price Z-Score</td>
                      <td className="py-3.5 px-4 font-bold">{detail1.metrics.price_z}σ</td>
                      <td className="py-3.5 px-4 font-bold">{detail2.metrics.price_z}σ</td>
                      <td className="py-3.5 px-4 font-bold">
                        {Math.abs(detail1.metrics.price_z - detail2.metrics.price_z).toFixed(2)}σ
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-sans font-bold text-slate-900">Upper Circuit Band Hits</td>
                      <td className="py-3.5 px-4 font-bold">{detail1.metrics.band_hit_days} days</td>
                      <td className="py-3.5 px-4 font-bold">{detail2.metrics.band_hit_days} days</td>
                      <td className="py-3.5 px-4 font-bold">
                        {Math.abs(detail1.metrics.band_hit_days - detail2.metrics.band_hit_days)} days
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Charts Comparison */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">{detail1.symbol} - Price Movement Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <PriceChart history={detail1.history} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">{detail2.symbol} - Price Movement Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <PriceChart history={detail2.history} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
