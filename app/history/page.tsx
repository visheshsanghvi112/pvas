"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { History, Search, Download, Filter, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/api";

const BASE_HOST = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : (typeof window !== "undefined" ? "" : "http://127.0.0.1:8000");

interface AuditLogItem {
  id: number;
  timestamp: string;
  username: string;
  role: string;
  action: string;
  target?: string | null;
  details?: string | null;
  ip_address?: string | null;
}

function HistoryPageContent() {
  const searchParams = useSearchParams();
  const querySearch = searchParams.get("search");

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(querySearch || "");
  const [actionFilter, setActionFilter] = useState("All");

  useEffect(() => {
    if (querySearch) {
      setSearchTerm(querySearch);
    }
  }, [querySearch]);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  async function fetchAuditLogs() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_HOST}/api/v1/auth/audit-logs?limit=200`, { headers: getAuthHeaders() });
      if (res.ok) {
        const logs = await res.json();
        setAuditLogs(logs);
      }
    } catch (e) {
      console.error("Failed to load audit logs", e);
    } finally {
      setLoading(false);
    }
  }

  // Filtered Audit Logs
  const filteredLogs = auditLogs.filter((log) => {
    const q = (searchTerm || "").toLowerCase();
    const matchesSearch =
      (log.username || "").toLowerCase().includes(q) ||
      (log.action || "").toLowerCase().includes(q) ||
      (log.details || "").toLowerCase().includes(q) ||
      (log.target || "").toLowerCase().includes(q);
    const matchesAction = actionFilter === "All" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  // Export CSV
  const handleExportCSV = () => {
    const csvContent = "Timestamp,Username,Role,Action,Target,Details,IP Address\n" +
      filteredLogs.map(l => `"${l.timestamp || ""}","${l.username || ""}","${l.role || ""}","${l.action || ""}","${(l.target || "").replace(/"/g, '""')}","${(l.details || "").replace(/"/g, '""')}","${l.ip_address || ""}"`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PVASF_System_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const uniqueActions = Array.from(new Set(auditLogs.map((l) => l.action))).filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans">
      {/* ── Page Header Bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-blue-600" />
            Immutable Security & System Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically sealed system audit trail logging calibration updates, model weight changes, and surveillance actions (compliance_audit_logs).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAuditLogs} className="h-8.5 gap-1.5 text-xs font-bold rounded-xl cursor-pointer bg-white border-slate-200">
            <RefreshCw className={cn("h-3.5 w-3.5 text-slate-500", loading && "animate-spin")} /> Refresh Log
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="gap-1.5 border-slate-200 bg-white text-xs font-bold text-slate-700 h-8.5 rounded-xl cursor-pointer">
            <Download className="h-3.5 w-3.5 text-blue-600" />
            Export Audit Log (CSV)
          </Button>
        </div>
      </div>

      {/* ── Main Work Area ── */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  System Audit Trail
                  <span className="text-xs font-normal text-slate-500">
                    ({filteredLogs.length} records)
                  </span>
                </CardTitle>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search officer, action, details..."
                      className="h-8.5 pl-8 text-xs w-60 rounded-xl"
                    />
                  </div>

                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="h-8.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="All">All Actions</option>
                    {uniqueActions.map((act) => (
                      <option key={act} value={act}>{act}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
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
                          No security audit records found matching criteria.
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
