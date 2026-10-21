"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-5 shadow-2xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
          HTTP 404 — Not Found
        </span>

        <h1 className="text-xl font-extrabold text-slate-900 mt-3 mb-2 tracking-tight">
          Page or Scrip Not Found
        </h1>
        
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          The requested surveillance page, scrip route, or resource does not exist or has been relocated within the surveillance framework.
        </p>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <LayoutDashboard className="w-4 h-4 text-blue-400" />
            Surveillance Dashboard
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            Previous Page
          </Button>
        </div>
      </div>
    </div>
  );
}
