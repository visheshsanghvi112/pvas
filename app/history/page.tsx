"use client";

import { useState } from "react";
import Link from "next/link";
import { History, Search, Download, Filter } from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialHistory = [
  { symbol: "ALPHATECH", company: "AlphaTech Systems Ltd", status: "Open", risk: "High" as const, opened: "2026-07-20", outcome: "Synchronized upper band accumulation under audit" },
  { symbol: "NOVAENERGY", company: "Nova Energy Products", status: "Under review", risk: "High" as const, opened: "2026-07-19", outcome: "KYC linkage report requested from top 5 brokers" },
  { symbol: "TRIDENTEX", company: "Trident Exports", status: "Escalated", risk: "High" as const, opened: "2026-07-17", outcome: "Beneficial ownership linkage confirmed via MCA database" },
  { symbol: "AURUMFIN", company: "Aurum Finance", status: "Closed", risk: "Medium" as const, opened: "2026-07-18", outcome: "No manipulation established; price movement news-driven" },
  { symbol: "HELIOSMIN", company: "Helios Minerals", status: "Closed", risk: "Low" as const, opened: "2026-07-14", outcome: "Normal market order flow verified" },
  { symbol: "MICRODYN", company: "Microdyn Components", status: "Under review", risk: "High" as const, opened: "2026-07-12", outcome: "Awaiting clarification letter from compliance officer" }
];

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = initialHistory.filter((item) => {
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
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <History className="h-4 w-4" />
            Audit Trail & History
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Analysis History Log</h1>
          <p className="mt-1 text-xs text-slate-500">Archived surveillance analyses, broker queries, and final regulatory disposition outcomes.</p>
        </div>
        <Button variant="outline" className="gap-2 border-slate-200 bg-white text-xs text-slate-700">
          <Download className="h-4 w-4 text-blue-600" />
          Export History Log (CSV)
        </Button>
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
                <option value="Open">Open</option>
                <option value="Under review">Under review</option>
                <option value="Escalated">Escalated</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Scrip Symbol</th>
                  <th className="px-4 py-3.5">Company Name</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Risk Level</th>
                  <th className="px-4 py-3.5">Opened Date</th>
                  <th className="px-4 py-3.5">Audit Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {filtered.map((row) => (
                  <tr key={row.symbol} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-sans font-bold">
                      <Link href={`/investigations/${row.symbol}`} className="text-blue-600 hover:underline font-mono">
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
