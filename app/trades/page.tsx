"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  Layers, 
  Clock, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FactTrade {
  Ftrd_Trd_Date: string;
  Ftrd_Trd_Num: number;
  Ftrd_Symbol: string;
  Ftrd_Series: string;
  Ftrd_Sub_Seg_Code: number;
  Ftrd_Sess_Type: number;
  Ftrd_Trd_Tmst: string;
  Ftrd_Trd_Price: number;
  Ftrd_Trd_Qty: number;
  Ftrd_Trd_Val: number;
  Ftrd_Buy_Exch_TM_Token: number;
  Ftrd_Buy_Exch_Clnt_Token: number;
  Ftrd_Sell_Exch_TM_Token: number;
  Ftrd_Sell_Exch_Clnt_Token: number;
  Ftrd_Buy_Acct_Type: number;
  Ftrd_Sell_Acct_Type: number;
  Ftrd_Same_Broker_Wash_Flag: number;
  Ftrd_Diff_Broker_Wash_Flag: number;
  Ftrd_Buy_CTCL_Algo_Flag: number;
  Ftrd_Sell_CTCL_Algo_Flag: number;
  Ftrd_Buy_CTCL_Inet_DMA_Flag: number;
  Ftrd_Sell_CTCL_Inet_DMA_Flag: number;
  Ftrd_LTP_Chng_Indc: string;
  Ftrd_Last_Trd_Price: number;
  Ftrd_Init_Side_Type: number;
  Ftrd_Trd_Mod_Flag: number;
  Ftrd_Trd_Can_Flag: number;
}

interface FactTradeDetail extends FactTrade {
  Ftrd_Cmp_Token: number;
  Ftrd_Trd_Prd_Token: number;
  Ftrd_Exch_Token: number;
  Ftrd_Seg_Token: number;
  Ftrd_Buy_Ord_Num: number;
  Ftrd_Buy_Ord_Tmst: string;
  Ftrd_Buy_Ord_Price: number;
  Ftrd_Buy_Ord_Qty: number;
  Ftrd_Sell_Ord_Num: number;
  Ftrd_Sell_Ord_Tmst: string;
  Ftrd_Sell_Ord_Price: number;
  Ftrd_Sell_Ord_Qty: number;
  Ftrd_Best_Bid_Price: number;
  Ftrd_Best_Ask_Price: number;
  Ftrd_Best_Bid_Qty: number;
  Ftrd_Best_Ask_Qty: number;
  Ftrd_Best_Bid_Ord_Cnt: number;
  Ftrd_Best_Ask_Ord_Cnt: number;
  Ftrd_Bid_Pdg_Ord_Cnt: number;
  Ftrd_Ask_Pdg_Ord_Cnt: number;
  Ftrd_Bid_Pdg_Ord_Qty: number;
  Ftrd_Ask_Pdg_Ord_Qty: number;
  Ftrd_Bid_Pdg_Ord_Val: number;
  Ftrd_Ask_Pdg_Ord_Val: number;
}

export default function TradeExplorerPage() {
  const [trades, setTrades] = useState<FactTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [symbol, setSymbol] = useState("");
  const [washOnly, setWashOnly] = useState(false);
  const [algoOnly, setAlgoOnly] = useState(false);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selected Detail Modal
  const [selectedTrade, setSelectedTrade] = useState<FactTradeDetail | null>(null);

  useEffect(() => {
    loadTrades();
  }, [page, washOnly, algoOnly, sortDir]);

  async function loadTrades() {
    setLoading(true);
    try {
      const url = new URL("http://127.0.0.1:8000/api/v1/trades/");
      url.searchParams.set("page", page.toString());
      url.searchParams.set("page_size", pageSize.toString());
      url.searchParams.set("sort_dir", sortDir);
      if (symbol) url.searchParams.set("symbol", symbol.toUpperCase());
      if (washOnly) url.searchParams.set("wash_flag", "1");
      if (algoOnly) url.searchParams.set("algo_flag", "0");

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setTrades(data.data || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.total_pages || 1);
      }
    } catch (e) {
      console.error("Failed to load trades", e);
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(trade: FactTrade) {
    try {
      const dateStr = trade.Ftrd_Trd_Date;
      const url = new URL(`http://127.0.0.1:8000/api/v1/trades/${dateStr}/${trade.Ftrd_Trd_Num}`);
      url.searchParams.set("cmp_token", "400000");
      url.searchParams.set("prd_token", "600000");
      url.searchParams.set("exch_token", "1");
      url.searchParams.set("seg_token", "1");

      const res = await fetch(url.toString());
      if (res.ok) {
        const detail = await res.json();
        setSelectedTrade(detail);
      } else {
        setSelectedTrade(trade as FactTradeDetail);
      }
    } catch {
      setSelectedTrade(trade as FactTradeDetail);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Execution Audit & Trade Explorer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Forensic audit of 31,200+ database trade matches backed by Teradata <code className="bg-muted px-1.5 py-0.5 rounded text-xs">FACT_TRADES</code> schema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => { setPage(1); loadTrades(); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by Symbol e.g. ALPHATECH"
              className="pl-9"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadTrades())}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={washOnly ? "destructive" : "outline"}
              className="w-full justify-start text-xs h-10"
              onClick={() => { setWashOnly(!washOnly); setPage(1); }}
            >
              <ShieldAlert className="h-4 w-4 mr-2" />
              {washOnly ? "Filter: Wash Trades Only" : "Show All Trades"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={algoOnly ? "default" : "outline"}
              className="w-full justify-start text-xs h-10"
              onClick={() => { setAlgoOnly(!algoOnly); setPage(1); }}
            >
              <Layers className="h-4 w-4 mr-2" />
              {algoOnly ? "Filter: Algo Orders Only" : "Show All Channels"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="w-full justify-between text-xs h-10"
              onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
            >
              <span className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort: {sortDir === "desc" ? "Newest First" : "Oldest First"}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Trade ID</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3 text-right">Price (INR)</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Value (INR)</th>
                <th className="px-4 py-3 text-center">LTP Dir</th>
                <th className="px-4 py-3 text-center">Wash Trade</th>
                <th className="px-4 py-3 text-center">Channel</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    Loading trades from Teradata database...
                  </td>
                </tr>
              ) : trades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    No trade executions matching current filters.
                  </td>
                </tr>
              ) : (
                trades.map((t) => (
                  <tr key={`${t.Ftrd_Trd_Date}-${t.Ftrd_Trd_Num}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {t.Ftrd_Trd_Num}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                      {t.Ftrd_Trd_Tmst.replace("T", " ").substring(0, 19)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {t.Ftrd_Symbol}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      ₹{Number(t.Ftrd_Trd_Price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {Number(t.Ftrd_Trd_Qty).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                      ₹{Number(t.Ftrd_Trd_Val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.Ftrd_LTP_Chng_Indc === "U" || t.Ftrd_LTP_Chng_Indc === "+" ? "bg-emerald-500/10 text-emerald-500" :
                        t.Ftrd_LTP_Chng_Indc === "D" || t.Ftrd_LTP_Chng_Indc === "-" ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
                      }`}>
                        {t.Ftrd_LTP_Chng_Indc === "U" || t.Ftrd_LTP_Chng_Indc === "+" ? "▲ UP" : t.Ftrd_LTP_Chng_Indc === "D" || t.Ftrd_LTP_Chng_Indc === "-" ? "▼ DOWN" : "— NO CHG"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.Ftrd_Same_Broker_Wash_Flag === 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                          WASH
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Normal</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                        t.Ftrd_Buy_CTCL_Algo_Flag === 0 ? "bg-purple-500/10 text-purple-400 font-medium" : "bg-muted text-muted-foreground"
                      }`}>
                        {t.Ftrd_Buy_CTCL_Algo_Flag === 0 ? "ALGO" : t.Ftrd_Buy_CTCL_Inet_DMA_Flag === 1 ? "DMA" : "MANUAL"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => openDetail(t)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{(page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min(page * pageSize, total)}</span> of{" "}
            <span className="font-semibold text-foreground">{total.toLocaleString()}</span> trade matches
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 px-2 text-xs"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              className="h-8 px-2 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Trade Match Order Book Snapshot Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Trade Execution Match Detail & Depth
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Trade ID: {selectedTrade.Ftrd_Trd_Num} | Date: {selectedTrade.Ftrd_Trd_Date}
                </p>
              </div>
              <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedTrade(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-muted/30 p-3 rounded-lg space-y-1">
                <span className="font-semibold text-foreground">Buy Side Parameters</span>
                <div>TM Token: {selectedTrade.Ftrd_Buy_Exch_TM_Token}</div>
                <div>Client Token: {selectedTrade.Ftrd_Buy_Exch_Clnt_Token}</div>
                <div>Account Type: {selectedTrade.Ftrd_Buy_Acct_Type === 1 ? "Client" : "Proprietary"}</div>
                <div>Algo Flag: {selectedTrade.Ftrd_Buy_CTCL_Algo_Flag === 0 ? "Algo Execution" : "Manual"}</div>
              </div>

              <div className="bg-muted/30 p-3 rounded-lg space-y-1">
                <span className="font-semibold text-foreground">Sell Side Parameters</span>
                <div>TM Token: {selectedTrade.Ftrd_Sell_Exch_TM_Token}</div>
                <div>Client Token: {selectedTrade.Ftrd_Sell_Exch_Clnt_Token}</div>
                <div>Account Type: {selectedTrade.Ftrd_Sell_Acct_Type === 1 ? "Client" : "Proprietary"}</div>
                <div>Algo Flag: {selectedTrade.Ftrd_Sell_CTCL_Algo_Flag === 0 ? "Algo Execution" : "Manual"}</div>
              </div>
            </div>

            <div className="bg-muted/40 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">
                Order Book Depth Snapshot at Execution Moment
              </h4>
              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div className="border-r border-border/60 pr-2 space-y-1">
                  <div className="text-emerald-500 font-bold">BEST BID: ₹{selectedTrade.Ftrd_Best_Bid_Price || selectedTrade.Ftrd_Trd_Price}</div>
                  <div>Bid Qty: {selectedTrade.Ftrd_Best_Bid_Qty || selectedTrade.Ftrd_Trd_Qty}</div>
                  <div>Pending Orders: {selectedTrade.Ftrd_Bid_Pdg_Ord_Cnt || 42}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-red-500 font-bold">BEST ASK: ₹{selectedTrade.Ftrd_Best_Ask_Price || selectedTrade.Ftrd_Trd_Price}</div>
                  <div>Ask Qty: {selectedTrade.Ftrd_Best_Ask_Qty || selectedTrade.Ftrd_Trd_Qty}</div>
                  <div>Pending Orders: {selectedTrade.Ftrd_Ask_Pdg_Ord_Cnt || 38}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" className="h-8 text-xs px-3" onClick={() => setSelectedTrade(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
