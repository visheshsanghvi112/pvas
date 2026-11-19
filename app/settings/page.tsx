"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Gauge,
  SlidersHorizontal,
  Save,
  RotateCcw,
  CheckCircle2,
  Lock,
  Users,
  UserPlus,
  FileText,
  LogIn,
  LogOut,
  X,
  Scale,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUser, type UserRole } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { fetchModelWeights, saveModelWeights } from "@/lib/api";

const scoreRows = [
  ["Price Rise", ["Under 15%", "15% - 75%", "76% - 150%", "> 150%"], "priceRise" as const],
  ["Price Z", ["< 1.645", "≥ 1.645", "≥ 2.33", "≥ 3.09"], "priceZ" as const],
  ["Volume Z", ["< 1.645", "≥ 1.645", "≥ 2.33", "≥ 3.09"], "volumeZ" as const],
  ["Band Hits", ["0 - 2 days", "3 - 5 days", "6 - 9 days", "≥ 10 days"], "bandPersistence" as const],
  ["180D Highs", ["0 days", "1 - 4 days", "5 - 9 days", "≥ 10 days"], "highBreakout" as const]
] as const;

const SETTING_TABS = ["Model Configuration", "User Management"] as const;
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
    logout,
    openLoginModal,
    usersList,
    refreshUsers,
    refreshAuditLogs,
    updateUserRoleApi,
    toggleUserActiveApi,
    createUserApi,
  } = useUser();

  const [activeTab, setActiveTab] = useState<SettingTab>("Model Configuration");

  // Weights state
  const [wPriceRise, setWPriceRise] = useState(20);
  const [wPriceZ, setWPriceZ] = useState(20);
  const [wVolumeZ, setWVolumeZ] = useState(20);
  const [wBand, setWBand] = useState(20);
  const [wHigh, setWHigh] = useState(20);

  // Thresholds state
  const [watchlistScore, setWatchlistScore] = useState(60);

  // Save & Modal states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // New user form state
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newDepartment, setNewDepartment] = useState("Market Conduct");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("Analyst");
  const [createError, setCreateError] = useState("");

  const loadWeights = useCallback(async () => {
    try {
      const data = await fetchModelWeights();
      if (data && data.weights) {
        setWPriceRise(data.weights.price_rise ?? 20);
        setWPriceZ(data.weights.price_z ?? 20);
        setWVolumeZ(data.weights.volume_z ?? 20);
        setWBand(data.weights.band_persistence ?? 20);
        setWHigh(data.weights.new_high ?? 20);
      }
      if (data && data.threshold != null) {
        setWatchlistScore(data.threshold);
      }
    } catch (err) {
      console.error("Failed to load active model weights from server:", err);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      refreshUsers();
    }
    if (isAdmin || currentUser.role === "Analyst") {
      refreshAuditLogs();
    }
    loadWeights();
  }, [isAdmin, currentUser.role, refreshUsers, refreshAuditLogs, loadWeights]);

  // Handle Create User Modal ESC key & Body scroll lock
  useEffect(() => {
    if (!showCreateUserModal) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCreateUserModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCreateUserModal]);

  const handleResetDefaults = () => {
    setWPriceRise(20);
    setWPriceZ(20);
    setWVolumeZ(20);
    setWBand(20);
    setWHigh(20);
    setWatchlistScore(60);
    setValidationError("");
  };

  const handleAutoBalanceWeights = () => {
    const sum = wPriceRise + wPriceZ + wVolumeZ + wBand + wHigh;
    if (sum === 0) {
      setWPriceRise(20);
      setWPriceZ(20);
      setWVolumeZ(20);
      setWBand(20);
      setWHigh(20);
      setValidationError("");
      return;
    }
    const r1 = Math.round((wPriceRise / sum) * 100);
    const r2 = Math.round((wPriceZ / sum) * 100);
    const r3 = Math.round((wVolumeZ / sum) * 100);
    const r4 = Math.round((wBand / sum) * 100);
    const r5 = 100 - (r1 + r2 + r3 + r4);
    setWPriceRise(r1);
    setWPriceZ(r2);
    setWVolumeZ(r3);
    setWBand(r4);
    setWHigh(r5);
    setValidationError("");
  };

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditSettings) return;

    const totalWeight = wPriceRise + wPriceZ + wVolumeZ + wBand + wHigh;
    if (totalWeight !== 100) {
      setValidationError(`Total parameter weight must sum to exactly 100%. Currently: ${totalWeight}%. Please adjust the sliders or click "Auto-Balance to 100%".`);
      return;
    }

    setValidationError("");
    setSaving(true);
    setSaveSuccess(false);

    const weights = {
      price_rise: wPriceRise,
      price_z: wPriceZ,
      volume_z: wVolumeZ,
      band_persistence: wBand,
      new_high: wHigh
    };

    try {
      await saveModelWeights(weights, watchlistScore);
      setSaving(false);
      setSaveSuccess(true);
      refreshAuditLogs();
      await loadWeights();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaving(false);
      setValidationError(err?.message || "Failed to save model weights to server. Please check backend connection.");
      console.error("Failed to save model weights:", err);
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



  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans">
      {/* ── Page Header Bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="h-4.5 w-4.5 text-blue-600" />
            Admin & Model Settings
          </h1>
        </div>

        {/* User Account Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-1.5">
            <div className={cn("h-2 w-2 rounded-full", isAdmin ? "bg-emerald-500" : "bg-blue-500")} />
            <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
            <RolePill role={currentUser.role} />
          </div>

          {isAdmin ? (
            <button
              onClick={logout}
              className="flex items-center gap-1.5 h-8.5 px-3 rounded-xl bg-slate-100 text-rose-600 hover:bg-rose-50 border border-slate-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          ) : (
            <button
              onClick={openLoginModal}
              className="flex items-center gap-1.5 h-8.5 px-3.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In as Admin
            </button>
          )}
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
            <div className="space-y-5">
              <form onSubmit={handleSaveWeights} className="space-y-5">
                {saveSuccess && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 shadow-xs">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    Model weights and parameters updated successfully and recorded in audit log!
                  </div>
                )}

                {validationError && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 shadow-xs animate-in fade-in-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{validationError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoBalanceWeights}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 transition-colors shadow-2xs shrink-0 cursor-pointer"
                    >
                      Auto-Balance to 100%
                    </button>
                  </div>
                )}

                <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 py-3.5 px-5 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">
                          Model Scoring & Weight Calibration
                        </CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 flex items-center gap-1">
                        <span>Active Cutoff:</span>
                        <strong className="font-mono text-blue-900 font-bold">≥ {watchlistScore}</strong>
                      </span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500 font-medium">Total Weight:</span>
                        <span className={cn(
                          "font-bold px-2 py-0.5 rounded border text-xs",
                          (wPriceRise + wPriceZ + wVolumeZ + wBand + wHigh) === 100
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                          {wPriceRise + wPriceZ + wVolumeZ + wBand + wHigh}%
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-6">
                    {/* Watchlist Threshold Input Row */}
                    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex-wrap">
                      <div>
                        <div className="text-xs font-bold text-slate-900">Watchlist Triage Cutoff Score</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Threshold score for shortlisting scrips onto the Watchlist
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">Cutoff Score:</span>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={watchlistScore}
                          disabled={!canEditSettings || saving}
                          onChange={(e) => setWatchlistScore(Number(e.target.value))}
                          className="h-9 w-24 text-xs font-extrabold text-center rounded-xl bg-white border-slate-200"
                        />
                      </div>
                    </div>

                    {/* 5 Core Metric Weight Sliders Grid */}
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                          <span>Price Rise (w1)</span>
                          <span className="text-blue-600 font-mono text-sm">{wPriceRise}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={wPriceRise}
                          disabled={!canEditSettings || saving}
                          onChange={(e) => { setWPriceRise(Number(e.target.value)); setValidationError(""); }}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="text-[10px] text-slate-400 font-medium">Framework default: 20%</div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                          <span>Price Z-Score (w2)</span>
                          <span className="text-blue-600 font-mono text-sm">{wPriceZ}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={wPriceZ}
                          disabled={!canEditSettings || saving}
                          onChange={(e) => { setWPriceZ(Number(e.target.value)); setValidationError(""); }}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="text-[10px] text-slate-400 font-medium">Framework default: 20%</div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                          <span>Volume Z-Score (w3)</span>
                          <span className="text-blue-600 font-mono text-sm">{wVolumeZ}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={wVolumeZ}
                          disabled={!canEditSettings || saving}
                          onChange={(e) => { setWVolumeZ(Number(e.target.value)); setValidationError(""); }}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="text-[10px] text-slate-400 font-medium">Framework default: 20%</div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                          <span>Band Persistence (w4)</span>
                          <span className="text-blue-600 font-mono text-sm">{wBand}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={wBand}
                          disabled={!canEditSettings || saving}
                          onChange={(e) => { setWBand(Number(e.target.value)); setValidationError(""); }}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="text-[10px] text-slate-400 font-medium">Framework default: 20%</div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                          <span>180D New High (w5)</span>
                          <span className="text-blue-600 font-mono text-sm">{wHigh}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={wHigh}
                          disabled={!canEditSettings || saving}
                          onChange={(e) => { setWHigh(Number(e.target.value)); setValidationError(""); }}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="text-[10px] text-slate-400 font-medium">Framework default: 20%</div>
                      </div>
                    </div>
                  </CardContent>

                  {/* Footer Action Buttons Bar */}
                  {canEditSettings && (
                    <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleResetDefaults}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          title="Reset model parameters to default framework weights (20% each)"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                          Reset Defaults (20% each)
                        </button>

                        <button
                          type="button"
                          onClick={handleAutoBalanceWeights}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          title="Proportionally auto-balance weights to sum to 100%"
                        >
                          <Scale className="h-3.5 w-3.5 text-blue-600" />
                          Auto-Balance to 100%
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-blue-600 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {saving ? "Saving..." : "Save Model Parameters"}
                      </button>
                    </div>
                  )}
                </Card>
              </form>

              {/* Framework Scoring Thresholds Reference Table */}
              <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
                <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Framework Metric Scoring Matrix &amp; Tiers Reference (0–5 Points)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 font-bold text-slate-700">Surveillance Parameter</th>
                        <th className="py-2.5 px-4 text-center">0 Points (Normal)</th>
                        <th className="py-2.5 px-4 text-center">1 Point (Low Risk)</th>
                        <th className="py-2.5 px-4 text-center">3 Points (Medium Risk)</th>
                        <th className="py-2.5 px-4 text-center">5 Points (Severe Risk)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {scoreRows.map(([metric, tiers]) => (
                        <tr key={metric} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{metric}</td>
                          <td className="py-2.5 px-4 text-center text-slate-500 bg-slate-50/30">{tiers[0]}</td>
                          <td className="py-2.5 px-4 text-center text-blue-700 bg-blue-50/30">{tiers[1]}</td>
                          <td className="py-2.5 px-4 text-center text-amber-700 bg-amber-50/30 font-semibold">{tiers[2]}</td>
                          <td className="py-2.5 px-4 text-center text-rose-700 bg-rose-50/30 font-bold">{tiers[3]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
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
                  {isAdmin ? `${usersList.filter((u) => u.is_active !== false).length} Active / ${usersList.length} Total` : "Restricted"}
                </span>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {!isAdmin ? (
                  <div className="px-6 py-10 text-center text-xs text-slate-500">
                    User directory and role management require <strong>Admin</strong> privileges.
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>
          )}



        </div>
      </div>

      {/* ── Create User Modal ── */}
      {showCreateUserModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateUserModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
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
