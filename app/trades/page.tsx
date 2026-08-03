"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Search, 
  RefreshCw, 
  BarChart2, 
  Users, 
  ArrowUpDown,
  Layers
} from "lucide-react";
import { 
  fetchSecurityAggregates, 
  fetchClientAggregates, 
  fetchPanPairAggregates, 
  type AggSecDay, 
  type AggClntSecDay, 
  type AggPanPairDay 
} from "@/lib/api";

type AggregateMode = "AGG_SEC_DAY" | "AGG_CLNT_SEC_DAY" | "AGG_PAN_PAIR_DAY";

export default function TradeExplorerPage() {
  const [aggMode, setAggMode] = useState<AggregateMode>("AGG_SEC_DAY");
  const [secAggs, setSecAggs] = useState<AggSecDay[]>([]);
  const [clntAggs, setClntAggs] = useState<AggClntSecDay[]>([]);
  const [panAggs, setPanAggs] = useState<AggPanPairDay[]>([]);

  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    loadAggregates();
  }, [symbol, sortDir, aggMode]);

  async function loadAggregates() {
    setLoading(true);
    try {
      if (aggMode === "AGG_SEC_DAY") {
        const targetSym = symbol.trim() ? symbol.trim().toUpperCase() : "ALPHATECH";
        const data = await fetchSecurityAggregates(targetSym);
        setSecAggs(data);
      } else if (aggMode === "AGG_CLNT_SEC_DAY") {
        const data = await fetchClientAggregates();
        setClntAggs(data);
      } else if (aggMode === "AGG_PAN_PAIR_DAY") {
        const data = await fetchPanPairAggregates();
        setPanAggs(data);
      }
    } catch (e) {
      console.error("Failed to load trade aggregates", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Page Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Trade Aggregate Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily trade summaries, 30-minute VWAP closing prices, client volume shares, and buyer-seller PAN pair concentrations (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">AGG_SEC_DAY</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">AGG_CLNT_SEC_DAY</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">AGG_PAN_PAIR_DAY</code>).
          </p>
        </div>
        <button
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          onClick={() => loadAggregates()}
        >
          <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
          Refresh
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <div className="space-y-4 max-w-full">

          {/* Aggregate Mode Navigation Tabs */}
          <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm flex items-center gap-1">
            <button
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                aggMode === "AGG_SEC_DAY"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setAggMode("AGG_SEC_DAY")}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Security Daily VWAP & OHLC (AGG_SEC_DAY)
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                aggMode === "AGG_CLNT_SEC_DAY"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setAggMode("AGG_CLNT_SEC_DAY")}
            >
              <Users className="h-3.5 w-3.5" />
              Client Security Volume & LTP Push (AGG_CLNT_SEC_DAY)
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                aggMode === "AGG_PAN_PAIR_DAY"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setAggMode("AGG_PAN_PAIR_DAY")}
            >
              <Layers className="h-3.5 w-3.5" />
              Counterparty PAN Pair Matrix (AGG_PAN_PAIR_DAY)
            </button>
          </div>

          {/* Filter Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  placeholder={aggMode === "AGG_SEC_DAY" ? "Filter by Symbol e.g. ALPHATECH" : "Search Security Aggregate"}
                  className="w-full h-10 pl-9 pr-4 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadAggregates()}
                />
              </div>

              <button
                className="w-full h-10 flex items-center justify-between gap-2 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
              >
                <span className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  {sortDir === "desc" ? "Newest Date First" : "Oldest Date First"}
                </span>
              </button>
            </div>
          </div>

          {/* Aggregate Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {aggMode === "AGG_SEC_DAY" && (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Symbol</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Open (₹)</th>
                      <th className="px-4 py-3 text-right">High (₹)</th>
                      <th className="px-4 py-3 text-right">Low (₹)</th>
                      <th className="px-4 py-3 text-right">30-Min VWAP Close (₹)</th>
                      <th className="px-4 py-3 text-right">Total Volume</th>
                      <th className="px-4 py-3 text-right">52W High / Low</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading AGG_SEC_DAY aggregates...</td></tr>
                    ) : secAggs.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No daily security aggregates found.</td></tr>
                    ) : (
                      secAggs.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-900">{row.Asd_Symbol}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.Asd_Date}</td>
                          <td className="px-4 py-3 text-right font-mono">₹{row.Asd_Open_Price?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-600">₹{row.Asd_High_Price?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-rose-600">₹{row.Asd_Low_Price?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">₹{row.Asd_Close_Price?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono">{row.Asd_Tot_Qty?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">₹{row.Asd_High_52W} / ₹{row.Asd_Low_52W}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {aggMode === "AGG_CLNT_SEC_DAY" && (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Company Token</th>
                      <th className="px-4 py-3">Client Token</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Buy Volume</th>
                      <th className="px-4 py-3 text-right">Sell Volume</th>
                      <th className="px-4 py-3 text-right">Pos Contrib (+ LTP)</th>
                      <th className="px-4 py-3 text-right">Neg Contrib (- LTP)</th>
                      <th className="px-4 py-3 text-right">Net Contrib (Pos - Neg)</th>
                      <th className="px-4 py-3 text-right">Wash Trade Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Loading AGG_CLNT_SEC_DAY aggregates...</td></tr>
                    ) : clntAggs.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No client security aggregates found.</td></tr>
                    ) : (
                      clntAggs.map((row, idx) => {
                        const pos = row.Acsd_Pos_Cont_Val || 0;
                        const neg = row.Acsd_Neg_Cont_Val || 0;
                        const net = row.Acsd_Net_Cont_Val ?? (pos - neg);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.Acsd_Cmp_Token}</td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{row.Acsd_Clnt_Token}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.Acsd_Date}</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600">{row.Acsd_Tot_Buy_Qty?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono text-rose-600">{row.Acsd_Tot_Sell_Qty?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600 font-medium">+{pos}</td>
                            <td className="px-4 py-3 text-right font-mono text-rose-600 font-medium">-{neg}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-violet-700">{net > 0 ? `+${net.toFixed(2)}` : net.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-mono text-rose-600">{row.Acsd_Wash_Trd_Qty || 0}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {aggMode === "AGG_PAN_PAIR_DAY" && (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Cmp Token</th>
                      <th className="px-4 py-3">Buyer Token</th>
                      <th className="px-4 py-3">Seller Token</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Matched Trd Qty</th>
                      <th className="px-4 py-3 text-right">Matched Trd Val (₹)</th>
                      <th className="px-4 py-3 text-right">Pos Contrib</th>
                      <th className="px-4 py-3 text-right">Neg Contrib</th>
                      <th className="px-4 py-3 text-right">Net Pair Contrib</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Loading AGG_PAN_PAIR_DAY matrix...</td></tr>
                    ) : panAggs.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No PAN pair matrix records found.</td></tr>
                    ) : (
                      panAggs.map((row, idx) => {
                        const pos = row.Appd_Pos_Contri || 0;
                        const neg = row.Appd_Neg_Contri || 0;
                        const net = row.Appd_Net_Contri ?? (pos - neg);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.Appd_Cmp_Token}</td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-600">{row.Appd_Buy_Clnt_Token}</td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-rose-600">{row.Appd_Sell_Clnt_Token}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.Appd_Date}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{row.Appd_Tot_Trd_Qty?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono text-blue-700">₹{row.Appd_Tot_Trd_Val?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600">+{pos}</td>
                            <td className="px-4 py-3 text-right font-mono text-rose-600">-{neg}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-violet-700">{net > 0 ? `+${net.toFixed(2)}` : net.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Summary */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex items-center justify-between">
              <div>
                Displaying pre-aggregated summary rows from <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{aggMode}</code>
              </div>
              <div className="font-semibold text-slate-700">
                {aggMode === "AGG_SEC_DAY" ? secAggs.length : aggMode === "AGG_CLNT_SEC_DAY" ? clntAggs.length : panAggs.length} Total Records
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
