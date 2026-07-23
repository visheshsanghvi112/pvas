"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Binoculars,
  History,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  X,
  TrendingUp,
  AlertTriangle,
  GitCompare,
  UserCheck,
  Menu,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchWatchlist, uploadEodFile, type ScripSummary } from "@/lib/api";
import { useUser, type UserRole } from "@/lib/user-context";

const nav = [
  { key: "dashboard", href: "/", label: "Dashboard", icon: LayoutDashboard },
  { key: "watchlist", href: "/investigations/ALPHATECH", label: "Scrip Analysis", icon: Binoculars },
  { key: "compare", href: "/compare", label: "Compare Scrips", icon: GitCompare },
  { key: "history", href: "/history", label: "Analysis History", icon: History },
  { key: "settings", href: "/settings", label: "Administration & Config", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, setUserRole, isAdmin } = useUser();

  // Mobile sidebar state (default closed on mobile)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Desktop sidebar collapsed state
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ScripSummary[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Notifications state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  // Profile menu state
  const [profileOpen, setProfileOpen] = useState(false);

  // Auto-close mobile sidebar when route changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans flex flex-col">
      {/* Top Banner */}
      <div className="bg-slate-900 px-4 py-1.5 text-xs text-slate-300 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">PVASF ENGINE ONLINE</span>
          <span className="hidden md:inline text-slate-400">| Price-Volume Alert Surveillance Framework v2.4</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload EOD File
          </button>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Role: <strong className="text-white">{currentUser.role}</strong></span>
        </div>
      </div>

      <div className="flex flex-1 relative">
        {/* Mobile Backdrop Overlay */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          />
        )}

        {/* Sidebar (Mobile sliding drawer + Desktop fixed sidebar) */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 bg-white text-slate-900 border-r border-slate-200 shadow-lg lg:shadow-none transition-all duration-300 flex flex-col",
            // Mobile styling
            mobileSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
            // Desktop styling
            desktopCollapsed ? "lg:w-16" : "lg:w-64"
          )}
        >
          {/* Logo & Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <Link href="/" className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                PV
              </div>
              {(!desktopCollapsed || mobileSidebarOpen) && (
                <div className="transition-opacity duration-200">
                  <div className="text-sm font-bold tracking-wider text-slate-900 uppercase">PVASF Suite</div>
                  <div className="text-[11px] text-blue-600 font-mono">Market Conduct AI</div>
                </div>
              )}
            </Link>

            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={() => setDesktopCollapsed(!desktopCollapsed)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors hidden lg:block"
              aria-label="Toggle Desktop Navigation"
            >
              {desktopCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                (item.key === "watchlist" && pathname.startsWith("/investigations"));

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-150",
                    active
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200/80 shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  )}
                  title={desktopCollapsed ? item.label : undefined}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", active ? "text-blue-600" : "text-slate-500")} />
                  {(!desktopCollapsed || mobileSidebarOpen) && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          {(!desktopCollapsed || mobileSidebarOpen) && (
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Engine Status</span>
                  <span className="text-emerald-600 font-bold">READY</span>
                </div>
                <div className="mt-1 text-slate-500 font-mono text-[10px]">Statistical Cutoff: 10.0</div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <div
          className={cn(
            "flex-1 flex flex-col transition-all duration-300 min-w-0",
            desktopCollapsed ? "lg:pl-16" : "lg:pl-64"
          )}
        >
          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 py-3 md:px-6">
            <div className="flex items-center justify-between gap-3">
              {/* Mobile Drawer Trigger */}
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 lg:hidden shrink-0"
                aria-label="Open Mobile Menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Search Bar */}
              <div className="relative max-w-lg flex-1" ref={searchRef}>
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 pr-8 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500"
                  placeholder="Search scrip symbol, ISIN, PAN..."
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Search Dropdown */}
                {searchOpen && (
                  <div className="absolute top-12 left-0 right-0 z-50 rounded-xl border border-slate-200 bg-white shadow-2xl p-2 max-h-80 overflow-y-auto">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                      Matching Surveillance Scrips ({searchResults.length})
                    </div>
                    {searchResults.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">No scrips matched &quot;{searchQuery}&quot;</div>
                    ) : (
                      searchResults.map((item) => (
                        <button
                          key={item.symbol}
                          onClick={() => handleSelectSymbol(item.symbol)}
                          className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{item.symbol}</span>
                              <span className="text-xs text-slate-500">₹{item.latest_close}</span>
                            </div>
                            <div className="text-xs text-slate-500">{item.company || item.isin}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-rose-600">↑ {item.price_rise_pct}%</span>
                            <span className="text-xs px-2 py-0.5 rounded font-bold bg-slate-100 border border-slate-200">
                              {item.score} pts
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Header Right Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  onClick={() => setUploadModalOpen(true)}
                  variant="outline"
                  className="hidden md:flex items-center gap-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs"
                >
                  <Upload className="h-3.5 w-3.5 text-blue-600" />
                  <span>Ingest EOD</span>
                </Button>

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-sm text-slate-900">Notifications</span>
                        <span className="text-xs text-blue-600 font-semibold">2 New</span>
                      </div>
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="rounded-lg bg-rose-50 border border-rose-100 p-2.5 text-rose-900">
                          <div className="font-semibold flex items-center gap-1.5 text-rose-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            ALPHATECH Alert Triggered
                          </div>
                          <div className="text-[11px] mt-1 text-rose-800/80">Volume Z-Score reached 5.9σ with 12 Upper Circuit Hits.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Role Switcher Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="h-7 w-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      {currentUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                      <div className="text-[10px] text-blue-600 font-semibold leading-none">{currentUser.role}</div>
                    </div>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
                      <div className="text-xs font-bold text-slate-900 px-2 py-1 border-b border-slate-100">
                        Switch Active Role (RBAC Simulation)
                      </div>
                      <div className="mt-2 space-y-1">
                        {(["Admin", "Analyst", "Viewer"] as UserRole[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              setUserRole(r);
                              setProfileOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors text-left",
                              currentUser.role === r
                                ? "bg-blue-50 text-blue-700 font-bold"
                                : "text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <span>{r} Role</span>
                            {currentUser.role === r && <UserCheck className="h-3.5 w-3.5 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Page Container */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-slate-50 max-w-full overflow-x-hidden">{children}</main>
        </div>
      </div>

      {/* EOD Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" />
                Ingest Teradata EOD Extract
              </h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload a structured daily EOD CSV or Excel dataset. The PVASF engine will automatically compute 180-day baseline statistics, price/volume Z-scores, upper band persistence, and participant audit trails.
              </p>

              <label className="flex flex-col items-center justify-center h-36 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-slate-100/50 cursor-pointer transition-colors">
                <Upload className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-semibold text-slate-800">Click to upload CSV / XLSX</span>
                <span className="text-xs text-slate-500 mt-1">Accepts Teradata standard exports</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              {uploading && (
                <div className="flex items-center justify-center gap-2 text-sm text-blue-600 py-2">
                  <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Running PVASF statistical calculations...
                </div>
              )}

              {uploadMsg && (
                <div
                  className={cn(
                    "rounded-xl p-3 text-xs font-semibold border",
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
