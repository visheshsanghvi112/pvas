"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderLock,
  Plus,
  Search,
  X,
  Eye,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ChevronRight,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/api";
import { useUser } from "@/lib/user-context";

const BASE_HOST = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : "http://127.0.0.1:8000";
const API_BASE = `${BASE_HOST}/api/v1/cases`;

interface CaseItem {
  id: number;
  case_id: string;
  target_symbol: string;
  title: string;
  lead_officer: string;
  status: "Draft" | "Open Investigation" | "Pending Action" | "Closed";
  priority: "High" | "Medium" | "Low";
  description?: string;
  created_at: string;
}

const statusBadgeStyles: Record<string, string> = {
  "Open Investigation": "bg-rose-50 text-rose-700 border-rose-200",
  "Pending Action": "bg-amber-50 text-amber-700 border-amber-200",
  "Draft": "bg-slate-100 text-slate-600 border-slate-200",
  "Closed": "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const priorityDot: Record<string, string> = {
  High: "bg-rose-500",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
};

export default function ForensicCasesPage() {
  const { currentUser } = useUser();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Simple Create Case Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState("ALPHATECH");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"High" | "Medium" | "Low">("High");
  const [newDescription, setNewDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCases();
  }, []);

  async function fetchCases() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (e) {
      console.error("Failed to load cases", e);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(caseId: string, newStatus: string) {
    try {
      const res = await fetch(`${API_BASE}/${caseId}`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchCases();
      }
    } catch (e) {
      console.error("Failed to update case status", e);
    }
  }

  async function handleCreateCase(e: React.FormEvent) {
    e.preventDefault();
    if (!newSymbol || !newTitle) return;

    setSubmitting(true);
    const caseId = `CASE-${new Date().getFullYear()}-${newSymbol.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const res = await fetch(`${API_BASE}/`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          case_id: caseId,
          target_symbol: newSymbol.toUpperCase(),
          title: newTitle,
          lead_officer: currentUser.name || "Surveillance Officer",
          status: "Open Investigation",
          priority: newPriority,
          description: newDescription,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle("");
        setNewDescription("");
        fetchCases();
      }
    } catch (e) {
      console.error("Error creating case", e);
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = cases.filter((c) => {
    const matchesSearch =
      c.case_id.toLowerCase().includes(search.toLowerCase()) ||
      c.target_symbol.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans">
      {/* ── Single Integrated Header Bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <FolderLock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              Forensic Cases
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                {cases.length} Dossiers
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scrip or case ID..."
              className="h-8.5 pl-8 text-xs w-56 rounded-xl bg-slate-50"
            />
          </div>

          {/* Direct Create Case Button */}
          <Button
            onClick={() => setShowCreateModal(true)}
            className="h-8.5 gap-1.5 text-xs font-bold rounded-xl cursor-pointer bg-slate-900 text-white hover:bg-blue-600 transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" /> New Case Dossier
          </Button>
        </div>
      </div>

      {/* ── Main Work Area ── */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-4">

          {/* Status Filter Segment Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-1.5">
              {[
                { key: "ALL", label: `All Cases (${cases.length})` },
                { key: "Open Investigation", label: `Active (${cases.filter(c => c.status === "Open Investigation").length})` },
                { key: "Pending Action", label: `Pending (${cases.filter(c => c.status === "Pending Action").length})` },
                { key: "Closed", label: `Closed (${cases.filter(c => c.status === "Closed").length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    statusFilter === tab.key
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cases Table */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Target Security</th>
                      <th className="px-5 py-3.5">Case Dossier</th>
                      <th className="px-5 py-3.5">Priority</th>
                      <th className="px-5 py-3.5">Workflow Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                          Loading cases from database...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                          No forensic cases found.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((c) => (
                        <tr key={c.case_id} className="hover:bg-slate-50 transition-colors">
                          {/* Target Security Symbol */}
                          <td className="px-5 py-4 font-sans">
                            <Link href={`/analysis/${c.target_symbol}`} className="font-extrabold text-sm text-blue-700 hover:underline font-mono block">
                              {c.target_symbol}
                            </Link>
                            <span className="text-[10px] font-mono text-slate-400">{c.case_id}</span>
                          </td>

                          {/* Investigation Title & Description */}
                          <td className="px-5 py-4 max-w-md">
                            <div className="font-bold text-slate-900 text-xs">{c.title}</div>
                            {c.description && (
                              <div className="text-slate-500 text-[11px] truncate mt-0.5">{c.description}</div>
                            )}
                          </td>

                          {/* Priority */}
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                              <span className={cn("h-2 w-2 rounded-full", priorityDot[c.priority])} />
                              {c.priority}
                            </span>
                          </td>

                          {/* Workflow Status Dropdown */}
                          <td className="px-5 py-4">
                            <select
                              value={c.status}
                              onChange={(e) => updateStatus(c.case_id, e.target.value)}
                              className={cn(
                                "rounded-lg border text-xs font-bold px-2.5 py-1 outline-none cursor-pointer transition-colors",
                                statusBadgeStyles[c.status] || "bg-slate-100 text-slate-700 border-slate-200"
                              )}
                            >
                              <option value="Open Investigation">Open Investigation</option>
                              <option value="Pending Action">Pending Action</option>
                              <option value="Closed">Closed</option>
                              <option value="Draft">Draft</option>
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/analysis/${c.target_symbol}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-2xs"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Analyze Scrip
                            </Link>
                          </td>
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

      {/* ── Direct Create Case Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FolderLock className="w-4 h-4 text-blue-600" /> New Forensic Case
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Scrip Symbol</label>
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. ALPHATECH"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold uppercase outline-none focus:border-blue-600 shadow-2xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Case Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Circular Trade & Price Spike Audit"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-blue-600 shadow-2xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none cursor-pointer"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Initial Findings / Notes</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief investigative notes..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="h-8.5 text-xs font-bold rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="h-8.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-xs">
                  {submitting ? "Creating..." : "Create Case"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
