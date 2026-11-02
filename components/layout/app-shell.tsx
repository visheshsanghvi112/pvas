"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Settings,
  X,
  AlertTriangle,
  ChevronDown,
  LayoutDashboard,
  TrendingUp,
  History,
  User,
  LogIn,
  LogOut,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchWatchlist, type ScripSummary } from "@/lib/api";
import { useUser } from "@/lib/user-context";

// Alert polling interval: refresh every 5 minutes
const ALERT_POLL_INTERVAL_MS = 5 * 60 * 1000;

const nav = [
  { key: "dashboard", href: "/", label: "Dashboard", icon: LayoutDashboard },
  { key: "history", href: "/history", label: "History", icon: History },
  { key: "settings", href: "/settings", label: "Admin", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, isLoginModalOpen, openLoginModal, closeLoginModal } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ScripSummary[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // ── Alert / Notification Types ────────────────────────────────────────────
  interface AlertItem {
    id: string;
    symbol: string;
    title: string;
    description: string;
    time: string;
    read: boolean;
    type: "high" | "medium" | "watchlist";
    source: "watchlist" | "case";
  }

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  // Track read state separately so polling doesn't reset already-read items
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pvasf_read_notifications");
        if (saved) return new Set(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to load read notification IDs from localStorage", e);
      }
    }
    return new Set();
  });

  const saveReadIds = (newSet: Set<string>) => {
    setReadIds(newSet);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pvasf_read_notifications", JSON.stringify(Array.from(newSet)));
      } catch (e) {
        console.warn("Failed to save read notification IDs to localStorage", e);
      }
    }
  };

  const buildAlerts = useCallback(
    (scrips: ScripSummary[]): AlertItem[] => {
      const now = new Date();
      const alertItems: AlertItem[] = [];

      // Process all scrips and build alerts from live surveillance metrics
      scrips.forEach((s) => {
        const hasZFlag = Math.abs(s.price_z) >= 1.645 || Math.abs(s.volume_z) >= 1.645;
        const isHigh = s.risk === "High";
        const isMedium = s.risk === "Medium" || s.watchlist || hasZFlag;

        if (isHigh || isMedium) {
          const alertId = `wl-${s.symbol}`;
          const alertTitle = `${s.symbol} — ${s.risk} Risk Surveillance Alert`;
          const scoreVal = Number(s.score || 0);
          const priceZVal = Number(s.price_z || 0);
          const volZVal = Number(s.volume_z || 0);
          const metricStr = `Risk: ${s.risk} · Score: ${scoreVal.toFixed(0)} · Price Z: ${priceZVal >= 0 ? "+" : ""}${priceZVal.toFixed(2)}σ · Vol Z: ${volZVal >= 0 ? "+" : ""}${volZVal.toFixed(2)}σ`;

          alertItems.push({
            id: alertId,
            symbol: s.symbol,
            title: alertTitle,
            description: metricStr,
            time: now.toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            read: readIds.has(alertId),
            type: isHigh ? "high" : "medium",
            source: "watchlist",
          });
        }
      });

      // Sort: unread first, then high priority before medium priority
      alertItems.sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        const typePriority = { high: 0, medium: 1, watchlist: 2 };
        return (typePriority[a.type] ?? 2) - (typePriority[b.type] ?? 2);
      });

      return alertItems;
    },
    [readIds]
  );

  const loadAlerts = useCallback(async () => {
    try {
      const scrips = await fetchWatchlist();
      setAlerts(buildAlerts(scrips));
    } catch (err) {
      console.warn("[PVASF] Notification load failed:", err);
      // Do not clear existing alerts on transient network errors
    }
  }, [buildAlerts]);

  // Load on mount, then poll every 5 min
  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, ALERT_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const handleAlertClick = (alertItem: AlertItem) => {
    const newReadIds = new Set(readIds);
    newReadIds.add(alertItem.id);
    saveReadIds(newReadIds);
    setAlerts((prev) => prev.map((a) => (a.id === alertItem.id ? { ...a, read: true } : a)));
    setNotificationsOpen(false);
    router.push(`/analysis/${alertItem.symbol}`);
  };

  const handleMarkAllRead = () => {
    const allIds = new Set(alerts.map((a) => a.id));
    saveReadIds(allIds);
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      const target = event.target as Element;
      if (!target.closest("[data-dropdown='notifications']")) setNotificationsOpen(false);
      if (!target.closest("[data-dropdown='profile']")) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut: Focus search on ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search for quick header lookup
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await fetchWatchlist(searchQuery.trim());
        setSearchResults(results.slice(0, 8));
        setSearchOpen(true);
      } catch (err) {
        console.warn("[PVASF] Search lookup failed:", err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSymbol = (symbol: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(`/analysis/${symbol}`);
  };

  const userInitials = currentUser.name.slice(0, 2).toUpperCase();

  return (
    <div className="app-root" style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs" style={{ zIndex: 50 }}>
        <div className="flex items-center justify-between px-5 py-0 relative" style={{ height: "56px" }}>

          {/* Left: Branding (No Engine subtitle) */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
                PV
              </div>
              <span className="font-extrabold text-sm text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors hidden sm:block">
                Price Volume Surveillance
              </span>
            </Link>
          </div>

          {/* Center: Global Quick-Search Bar (Clean, centered, proper width) */}
          <div className="flex-1 flex justify-center min-w-[160px] max-w-sm lg:max-w-md mx-2 sm:mx-4">
            <div ref={searchRef} className="relative w-full">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                  placeholder="Search scrip (e.g. BINANIIND)..."
                  className="w-full h-9 pl-9 pr-10 sm:pr-14 text-xs bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200/90 focus:border-blue-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 placeholder:text-slate-400 font-medium shadow-2xs"
                />
                <div className="absolute right-2.5 flex items-center gap-1.5">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchOpen(false); }}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-3xs pointer-events-none">
                      <span className="text-[9px]">⌘</span>K
                    </kbd>
                  )}
                </div>
              </div>

              {/* Autocomplete Dropdown */}
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 divide-y divide-slate-100 max-h-80 overflow-y-auto animate-in fade-in-0 zoom-in-95">
                  <div className="px-3.5 py-2 bg-slate-50/90 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Matching Scrips</span>
                    <span className="font-mono text-slate-500 font-normal">{searchResults.length} found</span>
                  </div>
                  {searchResults.map((scrip) => (
                    <button
                      key={scrip.symbol}
                      type="button"
                      onClick={() => handleSelectSymbol(scrip.symbol)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-blue-50/60 text-left transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-extrabold text-xs text-slate-900 font-mono group-hover:text-blue-600 transition-colors">
                          {scrip.symbol}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-[240px]">
                          {scrip.company || scrip.ticker || "Listed Scrip"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-bold text-slate-900">
                          {scrip.latest_close != null ? `₹${Number(scrip.latest_close).toFixed(2)}` : "—"}
                        </div>
                        <span className={cn(
                          "text-[9.5px] font-extrabold uppercase px-1.5 py-0.2 rounded border font-sans inline-block mt-0.5",
                          (scrip.risk_score ?? scrip.score ?? 0) >= 60
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}>
                          Score {Math.round(scrip.risk_score ?? scrip.score ?? 0)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Controls: Navigation + Notifications + Profile */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Primary Desktop Navigation Pills (Moved to Right Side) */}
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Vertical divider */}
            <div className="h-5 w-px bg-slate-200 hidden md:block mx-0.5" />
            {/* Notifications */}
            <div className="relative" data-dropdown="notifications">
            <button
              onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
              className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Surveillance Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-rose-600 rounded-full border-2 border-white shadow-xs">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div
                className="absolute right-0 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
                style={{ top: "calc(100% + 8px)", width: 340, zIndex: 200 }}
              >
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Surveillance Alerts</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-medium">
                      No active surveillance flags
                    </div>
                  ) : (
                    alerts.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleAlertClick(item)}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer",
                          item.read ? "bg-white opacity-60 hover:bg-slate-50" : "bg-blue-50/30 hover:bg-blue-50/70"
                        )}
                      >
                        <div className={cn(
                          "mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border shadow-2xs",
                          item.type === "high"
                            ? "bg-rose-100 text-rose-600 border-rose-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        )}>
                          {item.source === "watchlist"
                            ? <TrendingUp className="h-3.5 w-3.5" />
                            : <AlertTriangle className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 truncate">{item.title}</span>
                            {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shrink-0" />}
                          </div>
                          <div className="text-[11px] font-medium text-slate-600 mt-1 leading-snug">
                            {item.description}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-slate-400 font-semibold">{item.time}</span>
                            <span className={cn(
                              "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                              item.source === "watchlist"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-purple-50 text-purple-600"
                            )}>
                              {item.source === "watchlist" ? "Alert" : "Case"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Dropdown Navigation Menu */}
          <div className="relative" data-dropdown="profile">
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
              className="flex items-center gap-2.5 h-10 px-3 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
            >
              <div
                className="flex items-center justify-center rounded-full text-white font-bold text-xs shadow-xs"
                style={{ width: 30, height: 30, background: currentUser.id === 0 ? "#64748b" : "#1e293b", fontSize: 11 }}
              >
                {currentUser.id === 0 ? <User className="h-4 w-4" /> : userInitials}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-slate-500 font-medium leading-tight">{currentUser.role}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden py-1"
                style={{ top: "calc(100% + 8px)", width: 230, zIndex: 200 }}
              >
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                      currentUser.role === "Admin" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                      currentUser.role === "Analyst" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                      "bg-slate-100 text-slate-600 border border-slate-200"
                    )}>
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{currentUser.department}</div>
                </div>

                {/* Account Action Buttons */}
                <div className="p-2 border-b border-slate-100 space-y-1">
                  {currentUser.id === 0 ? (
                    <button
                      onClick={() => { setProfileOpen(false); openLoginModal(); }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Sign In / Switch Account
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { setProfileOpen(false); openLoginModal(); }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                        Switch Account
                      </button>
                      <button
                        onClick={() => { logout(); setProfileOpen(false); }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </>
                  )}
                </div>

                {/* Navigation Options inside User Menu */}
                <div className="p-1.5 space-y-0.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Workspace Modules</div>
                  {nav.map(({ key, href, label, icon: Icon }) => {
                    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                    return (
                      <Link
                        key={key}
                        href={href}
                        onClick={() => setProfileOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                          active
                            ? "bg-slate-900 text-white font-bold"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", active ? "text-blue-400" : "text-slate-500")} />
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto bg-slate-50">
        {children}
      </main>

      {/* ── Global Login & Account Switcher Modal ── */}
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
    </div>
  );
}

function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { login, logout } = useUser();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset form and errors when modal opens
  useEffect(() => {
    if (isOpen) {
      setError("");
      setUsername("");
      setPassword("");
    }
  }, [isOpen]);

  // Lock body scrolling while Login modal is open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) {
      onClose();
    } else {
      setError("Invalid username or password credentials.");
    }
  };

  const handleQuickSwitch = async (u: string, p: string) => {
    setError("");
    setLoading(true);
    const ok = await login(u, p);
    setLoading(false);
    if (ok) {
      onClose();
    } else {
      setError("Quick sign-in failed.");
    }
  };

  const handleSwitchToGuest = () => {
    logout();
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Sign In / Switch User
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Select an officer identity or enter credentials</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Quick Demo Switcher */}
          <div className="space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">1-Click Identity Switcher</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSwitch("vishesh_admin", "vishesh123")}
                className="p-3 rounded-2xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-left transition-all group cursor-pointer shadow-2xs"
              >
                <div className="text-xs font-extrabold text-blue-900 flex items-center justify-between">
                  <span>Vishesh</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-600 text-white">Admin</span>
                </div>
                <div className="text-[11px] text-blue-700/80 font-medium mt-0.5">Full System Access</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSwitch("arao_analyst", "arao123")}
                className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-all group cursor-pointer shadow-2xs"
              >
                <div className="text-xs font-extrabold text-emerald-900 flex items-center justify-between">
                  <span>A. Rao</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">Analyst</span>
                </div>
                <div className="text-[11px] text-emerald-700/80 font-medium mt-0.5">Surveillance Officer</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSwitch("guest_viewer", "guest123")}
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all group cursor-pointer shadow-2xs"
              >
                <div className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                  <span>Audit User</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">Viewer</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">Internal Audit</div>
              </button>

              <button
                type="button"
                onClick={handleSwitchToGuest}
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all group cursor-pointer shadow-2xs"
              >
                <div className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                  <span>Guest User</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-600">Guest</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">Read Only</div>
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">or sign in with password</span>
          </div>

          {/* Manual Login Form */}
          <form onSubmit={handleManualLogin} className="space-y-3 pt-2">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g. vishesh_admin)"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium outline-none focus:border-blue-600 transition-all shadow-2xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium outline-none focus:border-blue-600 transition-all shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-blue-600 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Authenticating..." : "Sign In to Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
