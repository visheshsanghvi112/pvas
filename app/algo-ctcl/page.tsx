"use client";

import { useState, useEffect } from "react";
import { 
  Layers, 
  Search, 
  RefreshCw, 
  Zap, 
  ShieldAlert, 
  Sliders, 
  BarChart3, 
  CheckCircle2, 
  PieChart as PieIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AlgoScripSummary {
  symbol: string;
  algo_count: number;
  manual_count: number;
  dma_count: number;
  total_count: number;
  algo_pct: number;
  dma_pct: number;
  spoof_ratio: number;
}

export default function AlgoCtclPage() {
  const [algoData, setAlgoData] = useState<AlgoScripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAlgoBreakdown();
  }, []);

  async function loadAlgoBreakdown() {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/trades/analysis/algo-breakdown");
      if (res.ok) {
        const raw = await res.json();
        setAlgoData(raw.sort((a: AlgoScripSummary, b: AlgoScripSummary) => b.spoof_ratio - a.spoof_ratio));
      }
    } catch (e) {
      console.error("Failed to load algo breakdown", e);
    } finally {
      setLoading(false);
    }
  }

  function roundVal(n: number, decimals: number): number {
    return Number(n.toFixed(decimals));
  }

  const filtered = algoData.filter((item) =>
    item.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Order Book Depth & CTCL/Algo Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Algorithmic order flow analysis, quote spoofing ratios, HFT strategy cancellation tracking, and DMA channel monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 px-3 text-xs" onClick={loadAlgoBreakdown}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh Intelligence
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scrips Audited</span>
          <div className="text-2xl font-bold text-foreground">{algoData.length} Securities</div>
          <p className="text-xs text-muted-foreground">Active order book depth feeds</p>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-1">
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Avg Algo Execution Share</span>
          <div className="text-2xl font-bold text-purple-400">
            {roundVal(algoData.reduce((acc, i) => acc + i.algo_pct, 0) / (algoData.length || 1), 1)}%
          </div>
          <p className="text-xs text-muted-foreground">Automated strategy volume ratio</p>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-1">
          <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Max Spoofing Ratio Alert</span>
          <div className="text-2xl font-bold text-red-500">
            {algoData.length > 0 ? `${algoData[0].symbol} (${algoData[0].spoof_ratio}x)` : "None"}
          </div>
          <p className="text-xs text-muted-foreground">Pending volume vs executed ratio</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by Symbol e.g. ALPHATECH"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Security Symbol</th>
                <th className="px-4 py-3 text-right">Total Executions</th>
                <th className="px-4 py-3 text-right">Algo Matches</th>
                <th className="px-4 py-3 text-right">DMA Matches</th>
                <th className="px-4 py-3 text-right">Manual Matches</th>
                <th className="px-4 py-3 text-right">Algo Share %</th>
                <th className="px-4 py-3 text-right">DMA Share %</th>
                <th className="px-4 py-3 text-center">Spoof Ratio (Pending/Exec)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Analyzing CTCL order channels...
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.symbol} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {item.symbol}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {item.total_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-purple-400 font-semibold">
                      {item.algo_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-400">
                      {item.dma_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {item.manual_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-purple-400">
                      {item.algo_pct}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-blue-400">
                      {item.dma_pct}%
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        item.spoof_ratio > 40 ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                        item.spoof_ratio > 25 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {item.spoof_ratio}x
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
