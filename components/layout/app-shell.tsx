"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Binoculars, History, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Search, Settings, ShieldCheck, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const nav = [
  { key: "dashboard", href: "/", label: "Dashboard", icon: LayoutDashboard },
  { key: "alerts", href: "/", label: "Alerts", icon: ShieldCheck },
  { key: "watchlist", href: "/investigations/ALPHATECH", label: "Watchlist", icon: Binoculars },
  { key: "history", href: "/history", label: "History", icon: History },
  { key: "settings", href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className={cn("fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-slate-200 bg-white text-slate-900 shadow-sm transition-transform duration-200 lg:block", !sidebarOpen && "-translate-x-full")}>
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-base font-bold">PV Alert Surveillance</div>
            <div className="text-xs text-slate-500">Investigation Workspace</div>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50" aria-label="Hide navigation">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <nav className="space-y-1.5 p-3">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.key} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950", active && "bg-blue-50 text-blue-700 ring-1 ring-blue-100")}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className={cn("transition-[padding] duration-200", sidebarOpen ? "lg:pl-60" : "lg:pl-0")}>
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setSidebarOpen((open) => !open)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label={sidebarOpen ? "Hide navigation" : "Show navigation"}>
              {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </button>
            <div className="relative max-w-xl flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="pl-9" placeholder="Search symbol, ISIN, entity, broker..." />
            </div>
            <button className="rounded-xl border bg-white p-2"><Bell className="h-5 w-5 text-slate-600" /></button>
            <div className="hidden items-center gap-3 md:flex">
              <UserCircle className="h-9 w-9 text-slate-500" />
              <div>
                <div className="text-sm font-semibold">Sanskar</div>
                <div className="text-xs text-slate-500">Developer</div>
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
