"use client";

import { useState, useEffect } from "react";
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
  UserPlus,
  Pencil,
  FileText,
  KeyRound,
  LogIn,
  LogOut,
  X,
  Search,
  Activity,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricHelp } from "@/components/ui/metric-help";
import { useUser, type UserRole, type UserProfile } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { saveModelWeights } from "@/lib/api";

const scoreRows = [
  ["Price Rise", ["Under 15%", "15% - 75%", "76% - 150%", "> 150%"], "priceRise" as const],
  ["Price Z", ["< 1.645", "≥ 1.645", "≥ 2.33", "≥ 3.09"], "priceZ" as const],
  ["Volume Z", ["< 1.645", "≥ 1.645", "≥ 2.33", "≥ 3.09"], "volumeZ" as const],
  ["Band Hits", ["0 - 2 days", "3 - 5 days", "6 - 9 days", "≥ 10 days"], "bandPersistence" as const],
  ["180D Highs", ["0 days", "1 - 5 days", "5 - 9 days", "≥ 10 days"], "highBreakout" as const]
] as const;

const SETTING_TABS = ["Model Configuration", "User Management", "Security Audit Trail"] as const;
type SettingTab = typeof SETTING_TABS[number];

function RolePill({ role }: { role: UserRole }) {
  const styles = {
    Admin: "bg-blue-50 text-blue-700 border-blue-200",
    Analyst: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Viewer: "bg-slate-100 text-slate-600 border-slate-200"
  };
  return (
    <span className={cn("rounded-md border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", styles[role])}>
      {role}
    </span>
  );
}

export default function SettingsPage() {
  const {
    currentUser,
    canEditSettings,
    isAdmin,
    login,
    logout,
    usersList,
    refreshUsers,
    auditLogs,
    refreshAuditLogs,
    updateUserRoleApi,
    toggleUserActiveApi,
    createUserApi,
  } = useUser();

  const [activeTab, setActiveTab] = useState<SettingTab>("Model Configuration");

  // Weights state
  const [wPriceRise, setWPriceRise] = useState(25);
  const [wPriceZ, setWPriceZ] = useState(20);
  const [wVolumeZ, setWVolumeZ] = useState(25);
  const [wBand, setWBand] = useState(15);
  const [wHigh, setWHigh] = useState(15);

  // Thresholds state
  const [watchlistScore, setWatchlistScore] = useState(15);

  // Save & Modal states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // New user form state
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newDepartment, setNewDepartment] = useState("Market Conduct");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("Analyst");
  const [createError, setCreateError] = useState("");

  // Audit search filter
  const [auditSearch, setAuditSearch] = useState("");

  useEffect(() => {
    refreshUsers();
    refreshAuditLogs();
  }, []);

  const handleSaveWeights = async (e: React.FormEvent) => {
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
    refreshAuditLogs();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const ok = await login(loginUsername, loginPassword);
    if (ok) {
      setShowLoginModal(false);
    } else {
      setLoginError("Invalid username or password credentials.");
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!newUsername || !newEmail || !newFullName || !newPassword) {
      setCreateError("Please fill out all required user details.");
      return;
    }
    const ok = await createUserApi({
      username: newUsername,
      email: newEmail,
      full_name: newFullName,
      department: newDepartment,
      password: newPassword,
      role: newRole,
    });
    if (ok) {
      setShowCreateUserModal(false);
      setNewUsername("");
      setNewEmail("");
      setNewFullName("");
      setNewPassword("");
    } else {
      setCreateError("Failed to create user. Ensure username and email are unique.");
    }
  };

  const filteredAuditLogs = auditLogs.filter(
    (l) =>
      l.username.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.details.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans">
      {/* ── Page Header Bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="h-4.5 w-4.5 text-blue-600" />
            Administration, User Access & Security Audit
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage model parameters, user accounts in SYS_USERS, and immutable audit logs in SYS_AUDIT_LOGS.
          </p>
        </div>

        {/* User Account Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200 rounded-lg px-3 py-1.5">
            <div className={cn("h-2 w-2 rounded-full", isAdmin ? "bg-emerald-500" : "bg-amber-500")} />
            <span className="text-xs text-slate-500">Authenticated:</span>
            <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
            <RolePill role={currentUser.role} />
          </div>

          <button
            onClick={() => setShowLoginModal(true)}
            className="flex items-center gap-1.5 h-8.5 px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs cursor-pointer"
          >
            <LogIn className="h-3.5 w-3.5" />
            Switch User / Login
          </button>
        </div>
      </div>

      {/* ── Main Work Area ── */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-5">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex gap-2">
              {SETTING_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer",
                    activeTab === tab
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {tab === "Model Configuration" ? (
                    <Gauge className="h-3.5 w-3.5" />
                  ) : tab === "User Management" ? (
                    <Users className="h-3.5 w-3.5" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "User Management" && isAdmin && (
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" /> Add Surveillance Officer
              </button>
            )}
          </div>

          {/* Admin Restriction Alert Banner */}
          {!canEditSettings && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">Administrator Privileges Required</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Model modifications and user account role management are restricted to <strong>Admin</strong> users.
                  You are logged in as <strong>{currentUser.role}</strong>. Authenticate as an Admin to enable editing.
                </p>
              </div>
            </div>
          )}

          {/* ─── TAB 1: MODEL CONFIGURATION ─────────────────────────────────────── */}
          {activeTab === "Model Configuration" && (
            <form onSubmit={handleSaveWeights} className="space-y-5">
              {saveSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 shadow-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  Model weights and parameters updated successfully and recorded in SYS_AUDIT_LOGS!
                </div>
              )}

              {/* Alert Cutoffs Card & Weight Sliders */}
              <div className="grid gap-5 xl:grid-cols-2">
                <Card className="bg-white border-slate-200 shadow-xs">
                  <CardHeader className="flex-row items-center gap-2.5 space-y-0 border-b border-slate-100 pb-3">
                    <Gauge className="h-4 w-4 text-blue-600" />
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Alert Eligibility & Risk Cutoffs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-600">
                        Watchlist Cutoff Score (0 – 100)
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={watchlistScore}
                        disabled={!canEditSettings}
                        onChange={(e) => setWatchlistScore(Number(e.target.value))}
                        className="h-8.5 text-xs font-bold"
                      />
                    </label>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Active Baseline Engine</span>
                      <div className="text-xs text-slate-700 bg-slate-100 p-2 rounded-md font-mono">
                        180D Baseline • 15D Obs
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Score Matrix Breakdown */}
                <Card className="bg-white border-slate-200 shadow-xs">
                  <CardHeader className="flex-row items-center gap-2.5 space-y-0 border-b border-slate-100 pb-3">
                    <Database className="h-4 w-4 text-indigo-600" />
                    <CardTitle className="text-sm font-bold text-slate-900">
                      PVASF Parameter Scoring Matrix
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2 text-xs">
                    {scoreRows.map(([name, bands]) => (
                      <div key={name} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-700 w-24">{name}</span>
                        <div className="flex gap-1">
                          {bands.map((b, i) => {
                            const pts = [0, 1, 3, 5][i];
                            return (
                              <span key={b} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                                {b} ({pts}pt)
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* 5 Core Metric Weights Control Card */}
              <Card className="bg-white border-slate-200 shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                    <CardTitle className="text-sm font-bold text-slate-900">
                      5 Core Metric Weight Parameters (%)
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Total Weight:</span>
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded border",
                      (wPriceRise + wPriceZ + wVolumeZ + wBand + wHigh) === 100
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    )}>
                      {wPriceRise + wPriceZ + wVolumeZ + wBand + wHigh}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                  <label className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Price Rise (w1)</span>
                      <span className="font-bold text-blue-600">{wPriceRise}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={wPriceRise}
                      disabled={!canEditSettings}
                      onChange={(e) => setWPriceRise(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Price Z-Score (w2)</span>
                      <span className="font-bold text-blue-600">{wPriceZ}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={wPriceZ}
                      disabled={!canEditSettings}
                      onChange={(e) => setWPriceZ(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Volume Z-Score (w3)</span>
                      <span className="font-bold text-blue-600">{wVolumeZ}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={wVolumeZ}
                      disabled={!canEditSettings}
                      onChange={(e) => setWVolumeZ(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Band Persistence (w4)</span>
                      <span className="font-bold text-blue-600">{wBand}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={wBand}
                      disabled={!canEditSettings}
                      onChange={(e) => setWBand(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>180D New High (w5)</span>
                      <span className="font-bold text-blue-600">{wHigh}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={wHigh}
                      disabled={!canEditSettings}
                      onChange={(e) => setWHigh(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </label>
                </CardContent>
              </Card>

              {canEditSettings && (
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button type="submit" disabled={saving} className="bg-slate-900 text-white hover:bg-blue-600 text-xs font-semibold h-9 px-4 cursor-pointer">
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {saving ? "Saving..." : "Save Model Parameters"}
                  </Button>
                </div>
              )}
            </form>
          )}

          {/* ─── TAB 2: USER MANAGEMENT (SYS_USERS) ─────────────────────────────── */}
          {activeTab === "User Management" && (
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-blue-600" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Registered Surveillance Officers & Personnel (`SYS_USERS`)
                  </CardTitle>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {usersList.length} Active Accounts
                </span>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Officer Name</th>
                      <th className="px-4 py-3">Username & Email</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {usersList.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{user.name}</td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-slate-800">{user.username}</div>
                          <div className="text-[11px] text-slate-400">{user.email}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{user.department}</td>
                        <td className="px-4 py-3">
                          {isAdmin ? (
                            <select
                              value={user.role}
                              onChange={(e) => user.id && updateUserRoleApi(user.id, e.target.value as UserRole)}
                              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                            >
                              <option value="Admin">Admin</option>
                              <option value="Analyst">Analyst</option>
                              <option value="Viewer">Viewer</option>
                            </select>
                          ) : (
                            <RolePill role={user.role} />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              user.is_active !== false
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            )}
                          >
                            {user.is_active !== false ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => user.id && toggleUserActiveApi(user.id)}
                              className={cn(
                                "text-xs font-semibold px-2.5 py-1 rounded border cursor-pointer transition-colors",
                                user.is_active !== false
                                  ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                                  : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              )}
                            >
                              {user.is_active !== false ? "Deactivate" : "Activate"}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* ─── TAB 3: SECURITY AUDIT TRAIL (SYS_AUDIT_LOGS) ───────────────────── */}
          {activeTab === "Security Audit Trail" && (
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-purple-600" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Immutable Security & Access Audit Trail (`SYS_AUDIT_LOGS`)
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search logs..."
                    className="bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400 w-36"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Timestamp (UTC)</th>
                      <th className="px-4 py-3">User & Role</th>
                      <th className="px-4 py-3">Action Event</th>
                      <th className="px-4 py-3">Target Entity</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3 text-right">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                          No audit logs match search filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-bold text-slate-900">{log.username}</span>{" "}
                            <span className="text-[10px] text-slate-400 font-sans">({log.role})</span>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-purple-700">{log.action}</td>
                          <td className="px-4 py-2.5 text-slate-700">{log.target}</td>
                          <td className="px-4 py-2.5 text-slate-600 font-sans">{log.details}</td>
                          <td className="px-4 py-2.5 text-right text-slate-400">{log.ip_address}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* ── Login Modal ── */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-600" /> Authenticate Surveillance Account
              </h2>
              <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {loginError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Username</label>
                <Input
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="e.g. vishesh_admin"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  className="h-9 text-xs"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-500 space-y-2">
                <div className="font-semibold text-slate-700">Select Login Account:</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setLoginUsername("vishesh_admin"); setLoginPassword("vishesh123"); }}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-500 rounded text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer transition-colors"
                  >
                    Admin (Vishesh)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginUsername("arao_analyst"); setLoginPassword("arao123"); }}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-500 rounded text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer transition-colors"
                  >
                    Analyst (A. Rao)
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowLoginModal(false)} className="h-8.5 text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="bg-slate-900 text-white hover:bg-blue-600 h-8.5 text-xs font-semibold cursor-pointer">
                  Log In & Authenticate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" /> Add Surveillance Officer Account
              </h2>
              <button onClick={() => setShowCreateUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-3">
              {createError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg text-xs font-semibold">
                  {createError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Full Officer Name</label>
                <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="e.g. Ramesh Kumar" className="h-8.5 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Username</label>
                <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. rkumar_analyst" className="h-8.5 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email Address</label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="rkumar@surveillance.gov" className="h-8.5 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Department</label>
                <Input value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} placeholder="Market Conduct" className="h-8.5 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Initial Password</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Set secure password" className="h-8.5 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Role Privilege</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-white border border-slate-300 rounded-md h-8.5 px-3 text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value="Admin">Admin</option>
                  <option value="Analyst">Analyst</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateUserModal(false)} className="h-8.5 text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="bg-slate-900 text-white hover:bg-blue-600 h-8.5 text-xs font-semibold cursor-pointer">
                  Create User Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
