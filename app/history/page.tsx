"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { History, Search, Download, Filter, RefreshCw } from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { getAuthHeaders } from "@/lib/api";

const BASE_HOST = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : "http://127.0.0.1:8000";

interface HistoryItem {
  symbol: string;
  company: string;
  status: string;
  risk: "High" | "Medium" | "Low";
  opened: string;
  outcome: string;
}

export default function HistoryPage() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_HOST}/api/v1/cases/`, { headers: getAuthHeaders() });
      if (res.ok) {
        const cases = await res.json();
        const mapped: HistoryItem[] = cases.map((c: any) => ({
          symbol: c.target_symbol || c.case_id,
          company: c.title || `${c.target_symbol} Surveillance Case`,
          status: c.status || "Open",
          risk: (c.priority as "High" | "Medium" | "Low") || "High",
          opened: (c.created_at || "").split("T")[0] || "2026-07-28",
          outcome: c.description || "Dossier under regulatory review.",
        }));
        setHistoryItems(mapped);
      }

    } catch (e) {
      console.error("Failed to load history from cases endpoint", e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = historyItems.filter((item) => {
    const matchesSearch =
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.outcome.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
            <History className="h-4 w-4" />
            Audit Trail & History
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Analysis History Log</h1>
          <p className="mt-1 text-xs text-slate-500">Archived surveillance analyses, broker queries, and final regulatory disposition outcomes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadHistory} className="h-8 gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Log
          </Button>
          <Button variant="outline" className="gap-2 border-slate-200 bg-white text-xs text-slate-700">
            <Download className="h-4 w-4 text-blue-600" />
            Export History Log (CSV)
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="gap-2">
              <Filter className="h-4 w-4 text-blue-600" />
              Surveillance Audit Log ({filtered.length})
            </CardTitle>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search history..."
                  className="h-9 pl-9 text-xs"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Open Investigation">Open Investigation</option>
                <option value="Pending Action">Pending Action</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Scrip Symbol</th>
                  <th className="px-4 py-3.5">Investigation Title</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Opened Date</th>
                  <th className="px-4 py-3.5">Audit Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Loading surveillance history from database...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No audit history records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, idx) => (
                    <tr key={`${row.symbol}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-sans font-bold">
                        <Link href={`/analysis/${row.symbol}`} className="text-blue-600 hover:underline font-mono">
                          {row.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-4 font-sans text-slate-900">{row.company}</td>
                      <td className="px-4 py-4 font-sans">
                        <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-sans">
                        <RiskBadge risk={row.risk} />
                      </td>
                      <td className="px-4 py-4 text-slate-500">{row.opened}</td>
                      <td className="px-4 py-4 font-sans text-slate-700 leading-relaxed max-w-md">{row.outcome}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
