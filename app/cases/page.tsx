"use client";

import { useState, useEffect } from "react";
import {
  FolderLock,
  Plus,
  Search,
  Clock,
  UserCheck,
  FileText,
  ShieldAlert,
  Pin,
  CheckCircle2,
  X,
  Calendar,
  ChevronRight,
  Eye,
  AlertCircle,
  Filter,
  Check,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EvidenceItem {
  title: string;
  description: string;
  type: string;
}

interface CaseItem {
  id: number;
  case_id: string;
  target_symbol: string;
  title: string;
  lead_officer: string;
  status: "Draft" | "Open Investigation" | "Pending Action" | "Closed";
  priority: "High" | "Medium" | "Low";
  description?: string;
  evidence?: EvidenceItem[];
  pinned_evidence_count?: number;
  created_at: string;
  updated_at?: string;
}

const statusStyles: Record<string, string> = {
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

const API_BASE = "http://127.0.0.1:8000/api/v1/cases";

export default function ForensicCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  // New Case Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCaseId, setNewCaseId] = useState("");
  const [newSymbol, setNewSymbol] = useState("ALPHATECH");
  const [newTitle, setNewTitle] = useState("");
  const [newOfficer, setNewOfficer] = useState("Surveillance Officer #104");
  const [newPriority, setNewPriority] = useState<"High" | "Medium" | "Low">("High");
  const [newDescription, setNewDescription] = useState("");
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    fetchCases();
  }, []);

  async function fetchCases() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/`);
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (e) {
      console.error("Failed to load forensic cases", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCaseDetail(caseId: string) {
    try {
      const res = await fetch(`${API_BASE}/${caseId}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedCase(detail);
      }
    } catch (e) {
      console.error("Failed to fetch case detail", e);
    }
  }

  async function updateStatus(caseId: string, newStatus: string) {
    try {
      const res = await fetch(`${API_BASE}/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (selectedCase?.case_id === caseId) {
          setSelectedCase(updated);
        }
        fetchCases();
      }
    } catch (e) {
      console.error("Failed to update case status", e);
    }
  }

  async function handleCreateCase(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!newSymbol || !newTitle) {
      setCreateError("Target symbol and title are required.");
      return;
    }

    const generatedId = newCaseId || `CASE-${new Date().getFullYear()}-${newSymbol.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const res = await fetch(`${API_BASE}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: generatedId,
          target_symbol: newSymbol.toUpperCase(),
          title: newTitle,
          lead_officer: newOfficer,
          status: "Open Investigation",
          priority: newPriority,
          description: newDescription,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewCaseId("");
        setNewTitle("");
        setNewDescription("");
        fetchCases();
      } else {
        const err = await res.json();
        setCreateError(err.detail || "Failed to create case dossier.");
      }
    } catch (e) {
      setCreateError("Server error while creating case.");
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

  const openCount = cases.filter((c) => c.status === "Open Investigation").length;
  const pendingCount = cases.filter((c) => c.status === "Pending Action").length;
  const closedCount = cases.filter((c) => c.status === "Closed").length;

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans">
      {/* ── Page Header Bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FolderLock className="h-4.5 w-4.5 text-blue-600" />
            Forensic Case & Investigation Dossier Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Persisted in `FORENSIC_CASES` table. Aggregate trade evidence, manage investigative workflows, and track regulatory proceedings.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 h-8.5 px-4 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> New Forensic Case Dossier
        </button>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2.5 pr-6 border-r border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileText className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 leading-none">{cases.length}</div>
              <div className="text-xs text-slate-400 mt-0.5">Total Dossiers</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pr-6 border-r border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <div className="text-base font-bold text-rose-600 leading-none">{openCount}</div>
              <div className="text-xs text-slate-400 mt-0.5">Active Investigations</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pr-6 border-r border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <div className="text-base font-bold text-amber-600 leading-none">{pendingCount}</div>
              <div className="text-xs text-slate-400 mt-0.5">Pending Action</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-base font-bold text-emerald-600 leading-none">{closedCount}</div>
              <div className="text-xs text-slate-400 mt-0.5">Closed Cases</div>
            </div>
          </div>
        </div>

        {/* Status Filter & Search Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {["ALL", "Open Investigation", "Pending Action", "Closed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                  statusFilter === st ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              placeholder="Search case ID, symbol, title..."
              className="bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Cases Workspace Area ── */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-semibold">
                  <th className="px-4 py-3">Case ID</th>
                  <th className="px-4 py-3">Security</th>
                  <th className="px-4 py-3">Investigation Title</th>
                  <th className="px-4 py-3">Lead Officer</th>
                  <th className="px-4 py-3 text-center">Pinned Evidence</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Loading persistent cases from database...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No case dossiers match search filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.case_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">{c.case_id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{c.target_symbol}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{c.title}</td>
                      <td className="px-4 py-3 text-slate-600">{c.lead_officer}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-700">
                          <Pin className="h-3 w-3 text-blue-600" /> {c.pinned_evidence_count ?? c.evidence?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 font-bold">
                          <span className={cn("h-2 w-2 rounded-full", priorityDot[c.priority])} />
                          {c.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider", statusStyles[c.status])}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => fetchCaseDetail(c.case_id)}
                          className="flex items-center gap-1 ml-auto text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded cursor-pointer transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> Review Dossier
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Case Detail Dossier Modal / Drawer ── */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600">{selectedCase.case_id}</span>
                  <span className={cn("px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider", statusStyles[selectedCase.status])}>
                    {selectedCase.status}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">{selectedCase.title}</h2>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400">Target Security:</span> <strong className="text-slate-900">{selectedCase.target_symbol}</strong>
              </div>
              <div>
                <span className="text-slate-400">Lead Officer:</span> <strong className="text-slate-900">{selectedCase.lead_officer}</strong>
              </div>
              <div>
                <span className="text-slate-400">Priority Level:</span> <strong className="text-slate-900">{selectedCase.priority}</strong>
              </div>
              <div>
                <span className="text-slate-400">Date Opened:</span> <strong className="text-slate-900">{selectedCase.created_at?.split("T")[0]}</strong>
              </div>
            </div>

            {/* Case Summary Description */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Investigative Summary & Findings</span>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                {selectedCase.description || "Detailed case findings and investigative notes logged by lead officer."}
              </p>
            </div>

            {/* Pinned Evidence Dossier Items */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Pin className="h-3.5 w-3.5 text-blue-600" /> Pinned Forensic Evidence ({selectedCase.evidence?.length || 0})
              </span>
              <div className="space-y-2">
                {selectedCase.evidence && selectedCase.evidence.length > 0 ? (
                  selectedCase.evidence.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{item.title}</div>
                        <div className="text-slate-500 text-[11px]">{item.description}</div>
                      </div>
                      <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">
                        {item.type}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg text-center">
                    No evidence items attached to this dossier yet.
                  </div>
                )}
              </div>
            </div>

            {/* Status Advancement Workflow Buttons */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Advance Workflow Status:</span>
              <div className="flex gap-2">
                {selectedCase.status !== "Open Investigation" && (
                  <button
                    onClick={() => updateStatus(selectedCase.case_id, "Open Investigation")}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 cursor-pointer"
                  >
                    Open Investigation
                  </button>
                )}
                {selectedCase.status !== "Pending Action" && (
                  <button
                    onClick={() => updateStatus(selectedCase.case_id, "Pending Action")}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 cursor-pointer"
                  >
                    Pending Action
                  </button>
                )}
                {selectedCase.status !== "Closed" && (
                  <button
                    onClick={() => updateStatus(selectedCase.case_id, "Closed")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
                  >
                    Close Case Dossier
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── New Case Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" /> Create Forensic Case Dossier
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-3">
              {createError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg text-xs font-semibold">
                  {createError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Target Security Symbol</label>
                <Input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} placeholder="e.g. ALPHATECH" className="h-8.5 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Investigation Title</label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Circular Wash Trading Audit" className="h-8.5 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Lead Surveillance Officer</label>
                <Input value={newOfficer} onChange={(e) => setNewOfficer(e.target.value)} placeholder="Surveillance Officer #104" className="h-8.5 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-md h-8.5 px-3 text-xs font-semibold outline-none"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Initial Findings & Summary</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe initial anomaly signals and trade evidence..."
                  rows={3}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="h-8.5 text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white h-8.5 text-xs font-semibold cursor-pointer">
                  Create Dossier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
