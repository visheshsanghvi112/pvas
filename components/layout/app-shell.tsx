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
  FolderLock,
  GitCompare,
  ChevronDown,
  LayoutDashboard,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchWatchlist, fetchCases, type ScripSummary, type CaseRecord } from "@/lib/api";
import { useUser, type UserRole } from "@/lib/user-context";

// Alert polling interval: refresh every 5 minutes
const ALERT_POLL_INTERVAL_MS = 5 * 60 * 1000;

const nav = [
  { key: "dashboard", href: "/", label: "Dashboard", icon: LayoutDashboard },
  { key: "compare", href: "/compare", label: "Compare", icon: GitCompare },
  { key: "cases", href: "/cases", label: "Cases", icon: FolderLock },
  { key: "history", href: "/history", label: "History", icon: History },
  { key: "settings", href: "/settings", label: "Admin", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, setUserRole, logout } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ScripSummary[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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
    (scrips: ScripSummary[], cases: CaseRecord[]): AlertItem[] => {
      const now = new Date();
      const caseMap = new Map<string, CaseRecord>();
      cases.forEach((c) => {
        if (c.status !== "Closed") {
          caseMap.set(c.target_symbol, c);
        }
      });

      const alertItems: AlertItem[] = [];

      // Process all scrips and build alerts from live surveillance metrics & linked cases
      scrips.forEach((s) => {
        const openCase = caseMap.get(s.symbol);
        const hasZFlag = Math.abs(s.price_z) >= 1.645 || Math.abs(s.volume_z) >= 1.645;
        const isHigh = s.risk === "High" || (openCase && openCase.priority === "High");
        const isMedium =
          s.risk === "Medium" ||
          (openCase && openCase.priority === "Medium") ||
          s.watchlist ||
          hasZFlag;

        if (isHigh || isMedium) {
          const alertId = openCase ? `case-${openCase.id}` : `wl-${s.symbol}`;
          const caseTitle = openCase?.title
            ? `${s.symbol} — ${openCase.title}`
            : `${s.symbol} — ${s.risk} Risk Surveillance Alert`;
          const caseIdStr = openCase ? `Case ${openCase.case_id} (${openCase.status}) · ` : "";
          const metricStr = `Risk: ${s.risk} · Score: ${s.score.toFixed(0)} · Price Z: ${s.price_z >= 0 ? "+" : ""}${s.price_z.toFixed(2)}σ · Vol Z: ${s.volume_z >= 0 ? "+" : ""}${s.volume_z.toFixed(2)}σ`;

          alertItems.push({
            id: alertId,
            symbol: s.symbol,
            title: caseTitle,
            description: `${caseIdStr}${metricStr}`,
            time: openCase?.created_at
              ? new Date(openCase.created_at).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : now.toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
            read: readIds.has(alertId),
            type: isHigh ? "high" : "medium",
            source: openCase ? "case" : "watchlist",
          });
        }
      });

      // Include any open cases that were not matched in scrips loop
      const processedSymbols = new Set(alertItems.map((a) => a.symbol));
      cases.forEach((c) => {
        if (c.status !== "Closed" && !processedSymbols.has(c.target_symbol)) {
          alertItems.push({
            id: `case-${c.id}`,
            symbol: c.target_symbol,
            title: `${c.target_symbol} — ${c.title || c.case_id}`,
            description: `Case ${c.case_id} · ${c.status} · Priority: ${c.priority}`,
            time: c.created_at
              ? new Date(c.created_at).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Today",
            read: readIds.has(`case-${c.id}`),
            type: c.priority === "High" ? "high" : "medium",
            source: "case",
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
      const [cases, scrips] = await Promise.all([fetchCases(), fetchWatchlist()]);
      setAlerts(buildAlerts(scrips, cases));
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

  // Debounced search
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
    router.push(`/analysis/${symbol}`);
  };

  const userInitials = currentUser.name.slice(0, 2).toUpperCase();

  return (
    <div className="app-root" style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs" style={{ zIndex: 50 }}>
        <div className="flex items-center justify-between px-5 py-0 relative" style={{ height: "56px" }}>

          {/* Left Brand Logo & Title */}
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center text-white font-black text-xs shadow-xs group-hover:scale-105 transition-transform">
              PV
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                PVASF <span className="font-semibold text-slate-500 text-xs hidden sm:inline">Surveillance Framework</span>
              </h1>
              <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-1.5 py-0.5 rounded-md">
                v2.4 Live
              </span>
            </div>
          </Link>

          <div className="flex-1" />

          {/* Right Header Controls (Notifications + Profile Dropdown) */}
          <div className="flex items-center gap-3.5">
            {/* Notifications */}
            <div className="relative" data-dropdown="notifications">
            <button
              onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
              className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Surveillance Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-rose-600 rounded-full border-2 border-white shadow-xs animate-pulse">
                  {unreadCount}
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
                style={{ width: 30, height: 30, background: "#1e293b", fontSize: 11 }}
              >
                {userInitials}
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
                style={{ top: "calc(100% + 8px)", width: 220, zIndex: 200 }}
              >
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-500">{currentUser.department}</div>
                  <div className="text-[10px] font-extrabold text-blue-600 mt-1 uppercase tracking-wider">{currentUser.role} privileges</div>
                </div>

                {/* Navigation Options inside User Menu */}
                <div className="p-1.5 space-y-0.5 border-b border-slate-100">
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

                <div className="p-1.5">
                  <button
                    onClick={() => { logout(); setProfileOpen(false); }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Logout Session
                  </button>
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
    </div>
  );
}
