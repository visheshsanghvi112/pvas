"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { History, Search, Download, Filter, RefreshCw, FolderLock, ShieldCheck, UserCheck, Clock } from "lucide-react";
import { RiskBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/api";

const BASE_HOST = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : "http://127.0.0.1:8000";

type ActiveTab = "cases" | "audit";

interface CaseHistoryItem {
  id: number;
  case_id: string;
  symbol: string;
  title: string;
  status: string;
  risk: "High" | "Medium" | "Low";
  opened: string;
  outcome: string;
}

interface AuditLogItem {
  id: number;
  timestamp: string;
  username: string;
  role: string;
  action: string;
  target: string;
  details: string;
  ip_address: string;
}

function HistoryPageContent() {
  const searchParams = useSearchParams();
  const querySearch = searchParams.get("search");

  const [activeTab, setActiveTab] = useState<ActiveTab>("cases");
  const [caseHistory, setCaseHistory] = useState<CaseHistoryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(querySearch || "");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    if (querySearch) {
      setSearchTerm(querySearch);
    }
  }, [querySearch]);

  useEffect(() => {
    loadAllHistory();
  }, []);

  async function loadAllHistory() {
    setLoading(true);
    await Promise.all([fetchCasesHistory(), fetchAuditLogs()]);
    setLoading(false);
  }

  async function fetchCasesHistory() {
    try {
      const res = await fetch(`${BASE_HOST}/api/v1/cases/`, { headers: getAuthHeaders() });
      if (res.ok) {
        const cases = await res.json();
        const mapped: CaseHistoryItem[] = cases.map((c: any) => ({
          id: c.id,
          case_id: c.case_id,
          symbol: c.target_symbol || c.case_id,
          title: c.title || `${c.target_symbol} Surveillance Case`,
          status: c.status || "Open Investigation",
          risk: (c.priority as "High" | "Medium" | "Low") || "High",
          opened: (c.created_at || "").split("T")[0] || "2026-08-01",
          outcome: c.description || "Dossier under regulatory review.",
        }));
        setCaseHistory(mapped);
      }
    } catch (e) {
      console.error("Failed to load case history", e);
    }
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch(`${BASE_HOST}/api/v1/auth/audit-logs?limit=200`, { headers: getAuthHeaders() });
      if (res.ok) {
        const logs = await res.json();
        setAuditLogs(logs);
      }
    } catch (e) {
      console.error("Failed to load audit logs", e);
    }
  }

  // Filtered Case History
  const filteredCases = caseHistory.filter((item) => {
    const matchesSearch =
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.outcome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Audit Logs
  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || log.action === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = "";
    if (activeTab === "cases") {
      csvContent = "data:text/csv;charset=utf-8," +
        "Scrip Symbol,Case Title,Status,Priority,Opened Date,Audit Outcome\n" +
        filteredCases.map(c => `"${c.symbol}","${c.title}","${c.status}","${c.risk}","${c.opened}","${c.outcome.replace(/"/g, '""')}"`).join("\n");
    } else {
      csvContent = "data:text/csv;charset=utf-8," +
        "Timestamp,Username,Role,Action,Target,Details,IP Address\n" +
        filteredLogs.map(l => `"${l.timestamp}","${l.username}","${l.role}","${l.action}","${l.target}","${l.details.replace(/"/g, '""')}","${l.ip_address}"`).join("\n");
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PVASF_${activeTab === "cases" ? "Case_History" : "System_Audit_Log"}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans">
      {/* ── Page Header Bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-blue-600" />
            Audit Trail & History Log
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadAllHistory} className="h-8.5 gap-1.5 text-xs font-bold rounded-xl cursor-pointer bg-white border-slate-200">
            <RefreshCw className={cn("h-3.5 w-3.5 text-slate-500", loading && "animate-spin")} /> Refresh Log
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="gap-1.5 border-slate-200 bg-white text-xs font-bold text-slate-700 h-8.5 rounded-xl cursor-pointer">
            <Download className="h-3.5 w-3.5 text-blue-600" />
            Export History (CSV)
          </Button>
        </div>
      </div>

      {/* ── Main Work Area ── */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Tab Segment Switcher */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setActiveTab("cases"); setSearchTerm(""); setStatusFilter("All"); }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeTab === "cases"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                )}
              >
                <FolderLock className="h-3.5 w-3.5" />
                Case Investigation History ({caseHistory.length})
              </button>

              <button
                onClick={() => { setActiveTab("audit"); setSearchTerm(""); setStatusFilter("All"); }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeTab === "audit"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                Security & System Audit Logs ({auditLogs.length})
              </button>
            </div>
          </div>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-blue-600" />
                  {activeTab === "cases" ? "Surveillance Case History" : "Immutable System Audit Trail"}
                  <span className="text-xs font-normal text-slate-500">
                    ({activeTab === "cases" ? filteredCases.length : filteredLogs.length} records)
                  </span>
                </CardTitle>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={activeTab === "cases" ? "Search scrips or titles..." : "Search user, action, details..."}
                      className="h-8.5 pl-8 text-xs w-56 rounded-xl"
                    />
                  </div>

                  {activeTab === "cases" && (
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-8.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Open Investigation">Open Investigation</option>
                      <option value="Pending Action">Pending Action</option>
                      <option value="Draft">Draft</option>
                      <option value="Closed">Closed</option>
                    </select>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {activeTab === "cases" ? (
                  /* Case History Table */
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5">Scrip Symbol</th>
                        <th className="px-5 py-3.5">Investigation Title</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5">Priority</th>
                        <th className="px-5 py-3.5">Opened Date</th>
                        <th className="px-5 py-3.5">Audit Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-xs">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-sans">
                            Loading surveillance case history...
                          </td>
                        </tr>
                      ) : filteredCases.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-sans">
                            No case history records found matching filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredCases.map((row, idx) => (
                          <tr key={`${row.symbol}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4 font-sans font-bold">
                              <Link href={`/analysis/${row.symbol}`} className="text-blue-600 hover:underline font-mono">
                                {row.symbol}
                              </Link>
                            </td>
                            <td className="px-5 py-4 font-sans text-slate-900 font-medium">{row.title}</td>
                            <td className="px-5 py-4 font-sans">
                              <span className={cn(
                                "rounded-lg border px-2.5 py-1 text-[11px] font-bold",
                                row.status === "Open Investigation" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                row.status === "Pending Action" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                row.status === "Closed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                "bg-slate-100 text-slate-600 border-slate-200"
                              )}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-sans">
                              <RiskBadge risk={row.risk} />
                            </td>
                            <td className="px-5 py-4 text-slate-500">{row.opened}</td>
                            <td className="px-5 py-4 font-sans text-slate-700 leading-relaxed max-w-md">{row.outcome}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  /* System Audit Logs Table */
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5">Timestamp</th>
                        <th className="px-5 py-3.5">Officer</th>
                        <th className="px-5 py-3.5">Role</th>
                        <th className="px-5 py-3.5">Action</th>
                        <th className="px-5 py-3.5">Target</th>
                        <th className="px-5 py-3.5">Details</th>
                        <th className="px-5 py-3.5">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-xs">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-sans">
                            Loading security audit logs...
                          </td>
                        </tr>
                      ) : filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-sans">
                            No security audit records found.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                            <td className="px-5 py-3.5 font-sans font-bold text-slate-900">{log.username}</td>
                            <td className="px-5 py-3.5 font-sans">
                              <span className={cn(
                                "text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                                log.role === "Admin" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                log.role === "Analyst" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                "bg-slate-100 text-slate-600 border-slate-200"
                              )}>
                                {log.role}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-sans">
                              <span className="font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100 text-xs">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-bold text-slate-800">{log.target}</td>
                            <td className="px-5 py-3.5 font-sans text-slate-600 max-w-sm leading-normal">{log.details}</td>
                            <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">{log.ip_address}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading audit trail...</div>}>
      <HistoryPageContent />
    </Suspense>
  );
}
