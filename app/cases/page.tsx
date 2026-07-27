"use client";

import { useState } from "react";
import { 
  FolderLock, 
  Plus, 
  Search, 
  Clock, 
  UserCheck, 
  FileText, 
  ShieldAlert, 
  ChevronRight,
  Pin,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CaseItem {
  id: string;
  target_symbol: string;
  title: string;
  lead_officer: string;
  status: "Draft" | "Open Investigation" | "Pending Action" | "Closed";
  created_at: string;
  pinned_evidence_count: number;
  priority: "High" | "Medium" | "Low";
}

export default function ForensicCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([
    {
      id: "CASE-2026-ALPHATECH-001",
      target_symbol: "ALPHATECH",
      title: "Self-Matched Wash Trade Network & LTP Ramping Investigation",
      lead_officer: "Surveillance Officer #104",
      status: "Open Investigation",
      created_at: "2026-07-20",
      pinned_evidence_count: 5,
      priority: "High"
    },
    {
      id: "CASE-2026-NOVAENERGY-004",
      target_symbol: "NOVAENERGY",
      title: "Upper Circuit Persistence & Promoter Holding Shift Audit",
      lead_officer: "Surveillance Officer #212",
      status: "Pending Action",
      created_at: "2026-07-18",
      pinned_evidence_count: 3,
      priority: "High"
    },
    {
      id: "CASE-2026-ORBITCEM-009",
      target_symbol: "ORBITCEM",
      title: "Spoofing & Pending Order Book Imbalance Audit",
      lead_officer: "HFT Specialist #402",
      status: "Open Investigation",
      created_at: "2026-07-15",
      pinned_evidence_count: 4,
      priority: "Medium"
    },
    {
      id: "CASE-2026-SBIN-012",
      target_symbol: "SBIN",
      title: "Close-to-Close Volume Z-Score Anomaly Review",
      lead_officer: "Surveillance Officer #104",
      status: "Closed",
      created_at: "2026-07-10",
      pinned_evidence_count: 2,
      priority: "Low"
    }
  ]);

  const [search, setSearch] = useState("");
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  const filtered = cases.filter(
    (c) =>
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.target_symbol.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderLock className="h-6 w-6 text-primary" />
            Forensic Case Workspace & Investigation Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregate evidence, build chronological investigation timelines, and manage regulatory case dossiers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" className="h-9 px-3 text-xs">
            <Plus className="h-4 w-4 mr-1" /> New Case Dossier
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Cases</span>
          <div className="text-2xl font-bold text-foreground">{cases.length} Dossiers</div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-1">
          <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Active Investigations</span>
          <div className="text-2xl font-bold text-red-500">
            {cases.filter((c) => c.status === "Open Investigation").length} Active
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-1">
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Pending Action</span>
          <div className="text-2xl font-bold text-amber-500">
            {cases.filter((c) => c.status === "Pending Action").length} Pending
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-1">
          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Closed Cases</span>
          <div className="text-2xl font-bold text-emerald-500">
            {cases.filter((c) => c.status === "Closed").length} Completed
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases by ID, Security, or Title..."
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
                <th className="px-4 py-3">Case ID</th>
                <th className="px-4 py-3">Target Security</th>
                <th className="px-4 py-3">Investigation Title</th>
                <th className="px-4 py-3">Lead Officer</th>
                <th className="px-4 py-3 text-center">Pinned Evidence</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-muted-foreground">
                    {c.id}
                  </td>
                  <td className="px-4 py-3 font-bold text-foreground">
                    {c.target_symbol}
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium max-w-md truncate">
                    {c.title}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.lead_officer}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs">
                      <Pin className="h-3 w-3 text-primary" /> {c.pinned_evidence_count} items
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      c.status === "Open Investigation" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      c.status === "Pending Action" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                      "bg-emerald-500/10 text-emerald-500"
                    }`}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" className="h-8 text-xs px-3" onClick={() => setSelectedCase(c)}>
                      Open Dossier
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Dossier Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <FolderLock className="h-5 w-5 text-primary" />
                  {selectedCase.id}: {selectedCase.target_symbol}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Lead Officer: {selectedCase.lead_officer} | Created: {selectedCase.created_at}
                </p>
              </div>
              <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedCase(null)}>
                ✕
              </Button>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Case Summary & Title</h4>
              <p className="text-sm font-medium text-foreground">{selectedCase.title}</p>
            </div>

            <div className="bg-muted/40 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Pin className="h-4 w-4 text-primary" />
                Pinned Evidence Gallery ({selectedCase.pinned_evidence_count} Items)
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-card p-3 rounded border border-border">
                  <span className="font-semibold text-foreground block">180d Price Spike Chart</span>
                  <span className="text-muted-foreground text-[11px]">+124.5% surge with upper circuit hits</span>
                </div>
                <div className="bg-card p-3 rounded border border-border">
                  <span className="font-semibold text-foreground block">Wash Trade Summary</span>
                  <span className="text-muted-foreground text-[11px]">1,250,000 shares same-broker matches</span>
                </div>
                <div className="bg-card p-3 rounded border border-border">
                  <span className="font-semibold text-foreground block">Joint Demat Account Proof</span>
                  <span className="text-muted-foreground text-[11px]">Shared bank account HDFC-9845***</span>
                </div>
                <div className="bg-card p-3 rounded border border-border">
                  <span className="font-semibold text-foreground block">Order Book Depth Log</span>
                  <span className="text-muted-foreground text-[11px]">54.2x Pending Spoofing Volume</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" className="h-8 text-xs px-3" onClick={() => setSelectedCase(null)}>
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
