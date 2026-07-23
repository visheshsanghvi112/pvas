"use client";

import { useState } from "react";
import {
  BellRing,
  Database,
  Gauge,
  SlidersHorizontal,
  Save,
  RotateCcw,
  CheckCircle2,
  Lock,
  Users,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserCog,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricHelp } from "@/components/ui/metric-help";
import { useUser, type UserRole } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { saveModelWeights } from "@/lib/api";

const scoreRows = [
  ["Price Rise", ["Under 15%", "15% - 75%", "76% - 150%", "> 150%"], "priceRise" as const],
  ["Price Z", ["< 1.645", "≥ 1.645", "≥ 2.33", "≥ 3.09"], "priceZ" as const],
  ["Volume Z", ["< 1.645", "≥ 1.645", "≥ 2.33", "≥ 3.09"], "volumeZ" as const],
  ["Band Hits", ["0 - 2 days", "3 - 5 days", "6 - 9 days", "≥ 10 days"], "bandPersistence" as const],
  ["180D Highs", ["0 days", "1 - 5 days", "5 - 9 days", "≥ 10 days"], "highBreakout" as const]
] as const;

const TEAM_MEMBERS = [
  { name: "Sanskar", email: "sanskar@surveillance.gov", role: "Admin" as UserRole, dept: "Market Conduct & Compliance", active: true },
  { name: "A. Rao", email: "a.rao@surveillance.gov", role: "Analyst" as UserRole, dept: "Quantitative Surveillance", active: true },
  { name: "V. Sanghvi", email: "v.sanghvi@surveillance.gov", role: "Analyst" as UserRole, dept: "Price Manipulation Cell", active: true },
  { name: "Audit User", email: "audit@surveillance.gov", role: "Viewer" as UserRole, dept: "Internal Audit", active: true }
];

const SETTING_TABS = ["Model Configuration", "User Management"] as const;
type SettingTab = typeof SETTING_TABS[number];

function RolePill({ role }: { role: UserRole }) {
  const styles = {
    Admin: "bg-blue-50 text-blue-700 border-blue-200",
    Analyst: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Viewer: "bg-slate-100 text-slate-600 border-slate-200"
  };
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", styles[role])}>
      {role}
    </span>
  );
}

export default function SettingsPage() {
  const { currentUser, canEditSettings, isAdmin, setUserRole } = useUser();
  const [activeTab, setActiveTab] = useState<SettingTab>("Model Configuration");

  // Weights state
  const [wPriceRise, setWPriceRise] = useState(25);
  const [wPriceZ, setWPriceZ] = useState(20);
  const [wVolumeZ, setWVolumeZ] = useState(25);
  const [wBand, setWBand] = useState(15);
  const [wHigh, setWHigh] = useState(15);

  // Thresholds state
  const [watchlistScore, setWatchlistScore] = useState(60);
  const [highRiskScore, setHighRiskScore] = useState(75);
  const [criticalScore, setCriticalScore] = useState(90);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // User management role edit state
  const [teamRoles, setTeamRoles] = useState<UserRole[]>(TEAM_MEMBERS.map((m) => m.role));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditSettings) return;
    setSaving(true);
    setSaveSuccess(false);

    const weights = {
      price_rise: wPriceRise,
      price_z: wPriceZ,
      volume_z: wVolumeZ,
      band_persistence: wBand,
      new_high: wHigh
    };

    await saveModelWeights(weights, watchlistScore);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    if (!canEditSettings) return;
    setWPriceRise(25);
    setWPriceZ(20);
    setWVolumeZ(25);
    setWBand(15);
    setWHigh(15);
    setWatchlistScore(60);
    setHighRiskScore(75);
    setCriticalScore(90);
  };

  const totalWeight = wPriceRise + wPriceZ + wVolumeZ + wBand + wHigh;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">PVASF Engine Control</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Administration & Configuration</h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage model parameters, risk thresholds, and user access controls.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xs">
          <div className={cn("h-2 w-2 rounded-full", isAdmin ? "bg-emerald-500" : "bg-amber-400")} />
          <span className="font-semibold text-slate-600">Logged in as</span>
          <span className="font-bold text-slate-900">{currentUser.name}</span>
          <RolePill role={currentUser.role} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
        {SETTING_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all",
              activeTab === tab
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            {tab === "Model Configuration" ? <SlidersHorizontal className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
            {tab}
          </button>
        ))}
      </div>

      {/* Admin Lock Banner (non-admins only) */}
      {!canEditSettings && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
          <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Administrator Privileges Required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Model parameter modifications and user management are restricted to <strong>Admin</strong> accounts only.
              You are currently logged in as <strong>{currentUser.role}</strong>. Contact your system administrator for access.
            </p>
          </div>
        </div>
      )}

      {/* ─── TAB 1: MODEL CONFIGURATION ─────────────────────────────────────── */}
      {activeTab === "Model Configuration" && (
        <form onSubmit={handleSave} className="space-y-6">
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 shadow-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              Model weights and risk thresholds updated successfully on the PVASF surveillance engine!
            </div>
          )}

          {/* Alert Eligibility & Observation Windows */}
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <Gauge className="h-5 w-5 text-blue-600" />
                <CardTitle helpKey="compositeScore">Alert Eligibility Thresholds</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-2">
                  <span className="flex items-center text-xs font-semibold text-slate-600">
                    Watchlist Score Cutoff <MetricHelp helpKey="compositeScore" />
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={watchlistScore}
                    onChange={(e) => setWatchlistScore(Number(e.target.value))}
                    disabled={!canEditSettings}
                    className="h-10 text-sm font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </label>
                <label className="space-y-2">
                  <span className="flex items-center text-xs font-semibold text-slate-600">High Risk Threshold</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={highRiskScore}
                    onChange={(e) => setHighRiskScore(Number(e.target.value))}
                    disabled={!canEditSettings}
                    className="h-10 text-sm font-mono font-bold text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </label>
                <label className="space-y-2">
                  <span className="flex items-center text-xs font-semibold text-slate-600">Critical Score Threshold</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={criticalScore}
                    onChange={(e) => setCriticalScore(Number(e.target.value))}
                    disabled={!canEditSettings}
                    className="h-10 text-sm font-mono font-bold text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <Database className="h-5 w-5 text-blue-600" />
                <CardTitle>Observation Window Durations</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600">Alert Window</span>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue={15} min={1} max={60} disabled={!canEditSettings} className="h-10 font-mono disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-bold text-slate-500">days</span>
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600">Baseline History</span>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue={180} min={30} max={365} disabled={!canEditSettings} className="h-10 font-mono disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-bold text-slate-500">days</span>
                  </div>
                </label>
              </CardContent>
            </Card>
          </div>

          {/* Model Weights */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                <CardTitle helpKey="compositeScore">Statistical Parameter Weights</CardTitle>
              </div>
              <div className="text-xs font-mono">
                Total: <span className={totalWeight === 100 ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>{totalWeight}%</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: "Price Rise", help: "priceRise" as const, val: wPriceRise, set: setWPriceRise },
                  { label: "Price Z", help: "priceZ" as const, val: wPriceZ, set: setWPriceZ },
                  { label: "Volume Z", help: "volumeZ" as const, val: wVolumeZ, set: setWVolumeZ },
                  { label: "Band Persistence", help: "bandPersistence" as const, val: wBand, set: setWBand },
                  { label: "180D High", help: "highBreakout" as const, val: wHigh, set: setWHigh }
                ].map(({ label, help, val, set }) => (
                  <label key={label} className="space-y-2">
                    <span className="flex items-center text-xs font-semibold text-slate-600">
                      {label} Weight <MetricHelp helpKey={help} />
                    </span>
                    <Input
                      type="number"
                      value={val}
                      onChange={(e) => set(Number(e.target.value))}
                      disabled={!canEditSettings}
                      className="h-10 font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Score Bands Table */}
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <SlidersHorizontal className="h-5 w-5 text-blue-600" />
              <CardTitle>Metric Score Bands Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                    <tr>
                      {["Metric", "Rating 0", "Rating 1", "Rating 3", "Rating 5"].map((head) => (
                        <th key={head} className="px-4 py-3">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {scoreRows.map(([metric, options, helpKey]) => (
                      <tr key={metric}>
                        <td className="px-4 py-3 font-sans font-bold text-slate-900 flex items-center">
                          {metric}
                          <MetricHelp helpKey={helpKey} />
                        </td>
                        {options.map((value, i) => (
                          <td key={i} className="px-4 py-3">
                            <input
                              type="text"
                              defaultValue={value}
                              disabled={!canEditSettings}
                              className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Save / Reset */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button
              type="button"
              onClick={handleReset}
              variant="outline"
              disabled={!canEditSettings}
              className="gap-2 border-slate-200 bg-white text-xs text-slate-700 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 text-slate-400" />
              Reset Defaults
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={saving || !canEditSettings}
              className="gap-2 text-xs font-bold disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving Configuration..." : "Save & Apply Model"}
            </Button>
          </div>
        </form>
      )}

      {/* ─── TAB 2: USER MANAGEMENT ─────────────────────────────────────────── */}
      {activeTab === "User Management" && (
        <div className="space-y-6">
          {/* Role Permissions Reference */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                role: "Admin",
                icon: ShieldCheck,
                color: "border-blue-200 bg-blue-50",
                iconColor: "text-blue-600",
                perms: ["Modify model weights & thresholds", "Upload EOD data", "Manage users & roles", "Full read & write access"]
              },
              {
                role: "Analyst",
                icon: UserCheck,
                color: "border-emerald-200 bg-emerald-50",
                iconColor: "text-emerald-600",
                perms: ["Run analyses & view scrip details", "Add audit remarks & notes", "Export reports & history", "Read-only settings view"]
              },
              {
                role: "Viewer",
                icon: ShieldAlert,
                color: "border-slate-200 bg-slate-50",
                iconColor: "text-slate-500",
                perms: ["View dashboard & watchlist", "Read analysis reports", "Cannot modify any data", "Audit trail access only"]
              }
            ].map(({ role, icon: Icon, color, iconColor, perms }) => (
              <Card key={role} className={cn("border", color)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-5 w-5", iconColor)} />
                    <span className="font-bold text-slate-900">{role} Role</span>
                  </div>
                  <ul className="space-y-1">
                    {perms.map((p) => (
                      <li key={p} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Team Members Table */}
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle>Team Members & Access Control</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Officer</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Current Role</th>
                      <th className="px-4 py-3">Status</th>
                      {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {TEAM_MEMBERS.map((member, idx) => (
                      <tr key={member.email} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 font-sans">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {member.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-slate-500">{member.email}</td>
                        <td className="px-4 py-4 font-sans text-slate-600">{member.dept}</td>
                        <td className="px-4 py-4 font-sans">
                          {editingIndex === idx && isAdmin ? (
                            <select
                              value={teamRoles[idx]}
                              onChange={(e) => {
                                const updated = [...teamRoles];
                                updated[idx] = e.target.value as UserRole;
                                setTeamRoles(updated);
                              }}
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold outline-none"
                            >
                              {(["Admin", "Analyst", "Viewer"] as UserRole[]).map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          ) : (
                            <RolePill role={teamRoles[idx]} />
                          )}
                        </td>
                        <td className="px-4 py-4 font-sans">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-4 text-right font-sans">
                            {editingIndex === idx ? (
                              <Button
                                variant="default"
                                className="h-7 px-3 text-[11px]"
                                onClick={() => setEditingIndex(null)}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                className="h-7 px-3 text-[11px] border-slate-200 hover:bg-slate-100"
                                onClick={() => setEditingIndex(idx)}
                              >
                                <UserCog className="h-3 w-3 mr-1" />
                                Edit Role
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!isAdmin && (
                <p className="mt-3 text-center text-xs text-slate-400 font-semibold">
                  <Lock className="inline h-3.5 w-3.5 mr-1" />
                  Role management is restricted to Admin accounts.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
