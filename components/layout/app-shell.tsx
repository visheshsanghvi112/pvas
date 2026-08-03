"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchWatchlist, type ScripSummary } from "@/lib/api";
import { useUser, type UserRole } from "@/lib/user-context";

const nav = [
  { key: "dashboard", href: "/", label: "Dashboard", icon: LayoutDashboard },
  { key: "compare", href: "/compare", label: "Compare", icon: GitCompare },
  { key: "cases", href: "/cases", label: "Cases", icon: FolderLock },
  { key: "guide", href: "/guide", label: "Guide", icon: BookOpen },
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
    router.push(`/investigations/${symbol}`);
  };

  const userInitials = currentUser.name.slice(0, 2).toUpperCase();

  return (
    <div className="app-root" style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm" style={{ zIndex: 50 }}>
        <div className="flex items-center gap-4 px-5 py-0" style={{ height: "56px" }}>

          {/* Logo / Title */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-sm group-hover:bg-blue-700 transition-colors">
              PV
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-900 tracking-tight leading-none">PVASF</div>
              <div className="text-[10px] font-medium text-slate-400 leading-none mt-0.5">Market Conduct Engine</div>
            </div>
          </Link>

          <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 shrink-0">
            {nav.map(({ key, href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", active ? "text-blue-400" : "text-slate-400")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Scrip Search Bar */}
          <div ref={searchRef} className="relative w-64 md:w-72">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search symbol, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setSearchOpen(true)}
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {searchOpen && searchResults.length > 0 && (
              <div
                className="absolute left-0 right-0 mt-1.5 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden py-1"
                style={{ zIndex: 200 }}
              >
                {searchResults.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => handleSelectSymbol(item.symbol)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 font-mono">{item.symbol}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{item.company}</div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-xs font-bold text-slate-700">₹{item.latest_close.toFixed(2)}</div>
                      <div className={cn("text-[10px] font-semibold", item.price_rise_pct > 0 ? "text-rose-600" : "text-emerald-600")}>
                        {item.price_rise_pct > 0 ? "+" : ""}{item.price_rise_pct}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" data-dropdown="notifications">
            <button
              onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
              className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 border-2 border-white" />
            </button>

            {notificationsOpen && (
              <div
                className="absolute right-0 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
                style={{ top: "calc(100% + 8px)", width: 320, zIndex: 200 }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="font-semibold text-sm text-slate-900">Alerts</span>
                  <span className="text-xs text-slate-400 font-medium">1 unread</span>
                </div>
                <div className="divide-y divide-slate-50">
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">ALPHATECH — Wash Trade Flag</div>
                      <div className="text-xs text-slate-500 mt-0.5">32% volume concentration across 4 PANs detected.</div>
                      <div className="text-xs text-slate-400 mt-1">Today, 3:12 PM</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative" data-dropdown="profile">
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
              className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div
                className="flex items-center justify-center rounded-full text-white font-bold text-xs"
                style={{ width: 30, height: 30, background: "#1e293b", fontSize: 11 }}
              >
                {userInitials}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-slate-900 leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 leading-tight">{currentUser.role}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden md:block" />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
                style={{ top: "calc(100% + 8px)", width: 200, zIndex: 200 }}
              >
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-sm font-semibold text-slate-900">{currentUser.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{currentUser.department}</div>
                  <div className="text-[11px] font-bold text-blue-600 mt-1 uppercase tracking-wider">{currentUser.role} PRIVILEGE</div>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => { logout(); setProfileOpen(false); }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Logout Session
                  </button>
                </div>
              </div>
            )}
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
