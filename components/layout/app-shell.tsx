"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Settings,
  Upload,
  X,
  AlertTriangle,
  FolderLock,
  GitCompare,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchWatchlist, uploadEodFile, type ScripSummary } from "@/lib/api";
import { useUser, type UserRole } from "@/lib/user-context";

const nav = [
  { key: "dashboard", href: "/", label: "Dashboard" },
  { key: "compare", href: "/compare", label: "Compare", icon: GitCompare },
  { key: "cases", href: "/cases", label: "Cases", icon: FolderLock },
  { key: "settings", href: "/settings", label: "Admin", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, setUserRole } = useUser();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ScripSummary[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Notifications & Profile state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await fetchWatchlist(searchQuery);
      setSearchResults(results);
      setSearchOpen(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSymbol = (symbol: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(`/investigations/${symbol}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg(null);
    try {
      const res = await uploadEodFile(file);
      if (res.error) {
        setUploadMsg({ type: "error", text: res.error });
      } else {
        setUploadMsg({
          type: "success",
          text: `Successfully ingested ${res.total_rows} EOD records across ${res.total_scrips} scrips!`
        });
        setTimeout(() => {
          setUploadModalOpen(false);
          setUploadMsg(null);
          router.refresh();
        }, 1500);
      }
    } catch {
      setUploadMsg({ type: "error", text: "Failed to upload file." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans flex flex-col max-w-full overflow-x-hidden">
      {/* Top Banner - System Status */}
      <div className="relative z-[60] flex flex-wrap min-h-6 items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-1 text-[10px] text-slate-300 font-mono uppercase tracking-wider gap-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white">SYSTEM READY</span>
          </div>
          <span className="hidden sm:inline text-slate-500">| PVASF Engine v2.4</span>
        </div>
        <div className="flex items-center gap-3 text-[9px] sm:text-[10px]">
          <span className="text-slate-500">Last EOD Run: <span className="text-slate-300 font-mono">2026-07-23 18:45 IST</span></span>
        </div>
      </div>

      {/* Dense Top Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-3 sm:px-4 py-2 gap-2 sm:gap-4">
          
          {/* Logo & Search Area */}
          <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <div className="h-8 w-8 bg-slate-900 text-white font-black text-sm flex items-center justify-center rounded shadow-sm group-hover:bg-blue-700 transition-colors">
                PV
              </div>
            </Link>

            {/* Global Search */}
            <div className="relative flex-1 max-w-full sm:max-w-xs md:max-w-md" ref={searchRef}>
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-8 pr-7 bg-slate-100 border-transparent hover:border-slate-300 text-slate-900 text-xs placeholder:text-slate-500 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded w-full"
                placeholder="Search Scrip (Symbol/ISIN) or PAN..."
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}

              {/* Search Dropdown */}
              {searchOpen && (
                <div className="absolute top-9 left-0 right-0 z-50 rounded border border-slate-200 bg-white shadow-xl max-h-80 overflow-y-auto">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                    Surveillance Scrips ({searchResults.length})
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">No matches found.</div>
                  ) : (
                    searchResults.map((item) => (
                      <button
                         key={item.symbol}
                         onClick={() => handleSelectSymbol(item.symbol)}
                         className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      >
                         <div>
                           <div className="flex items-center gap-2">
                             <span className="font-bold text-sm text-slate-900">{item.symbol}</span>
                             <span className="text-xs text-slate-500 font-mono">₹{item.latest_close.toFixed(2)}</span>
                           </div>
                           <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{item.company || item.isin}</div>
                         </div>
                         <div className="flex flex-col items-end gap-0.5">
                           <span className="text-[11px] font-bold text-rose-600">↑ {item.price_rise_pct}%</span>
                           <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-bold bg-rose-50 text-rose-700 border border-rose-100">
                             Risk: {item.score}
                           </span>
                         </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links & Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-sm font-medium shrink-0 overflow-x-auto">
            <nav className="flex items-center gap-1 overflow-x-auto shrink-0">
              {nav.map((item) => {
                const active = pathname === item.href || (item.key === 'dashboard' && pathname === '/');
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap",
                      active 
                        ? "bg-slate-900 text-white font-semibold" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    {item.icon && <item.icon className="h-3.5 w-3.5" />}
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block"></div>

            {/* Ingest Button */}
            <Button
              onClick={() => setUploadModalOpen(true)}
              variant="outline"
              className="h-7 px-2 text-[11px] font-semibold border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Upload className="h-3 w-3 text-blue-600" />
              <span className="hidden sm:inline">Ingest EOD</span>
            </Button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-9 z-50 w-80 rounded border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="font-bold text-xs text-slate-900 pb-2 border-b border-slate-100 mb-2">
                    Active Alerts
                  </div>
                  <div className="space-y-1">
                    <div className="rounded border border-rose-100 bg-rose-50 p-2 text-rose-900 cursor-pointer hover:bg-rose-100/50">
                      <div className="font-semibold text-xs flex items-center gap-1.5 text-rose-700">
                        <AlertTriangle className="h-3 w-3" />
                        ALPHATECH: Wash Trade Trigger
                      </div>
                      <div className="text-[10px] mt-0.5 text-rose-800/80">32% volume concentration among 4 PANs.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 rounded p-1 hover:bg-slate-100 transition-colors ml-1"
              >
                <div className="h-6 w-6 rounded bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-9 z-50 w-48 rounded border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">
                    Role Simulation
                  </div>
                  {(["Admin", "Analyst", "Viewer"] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setUserRole(r);
                        setProfileOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between rounded px-2 py-1.5 text-xs transition-colors text-left",
                        currentUser.role === r
                          ? "bg-slate-100 text-slate-900 font-bold"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span>{r}</span>
                      {currentUser.role === r && <UserCheck className="h-3.5 w-3.5 text-slate-700" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Page Container - Removed lateral padding for edge-to-edge dense grids */}
      <main className="flex-1 w-full min-w-0 bg-slate-50 p-2 sm:p-4 md:p-6 overflow-x-hidden">
        {children}
      </main>

      {/* EOD Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600" />
                Ingest EOD Extract
              </h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center h-28 rounded border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                <Upload className="h-6 w-6 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700">Select CSV / XLSX File</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              {uploading && (
                <div className="text-[11px] font-semibold text-blue-600 text-center animate-pulse">
                  Processing statistics...
                </div>
              )}

              {uploadMsg && (
                <div
                  className={cn(
                    "rounded px-3 py-2 text-xs font-semibold border",
                    uploadMsg.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  )}
                >
                  {uploadMsg.text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
