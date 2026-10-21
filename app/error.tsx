"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RotateCcw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client exceptions for auditing
    console.error("[PVASF Client Error Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-md w-full bg-white border border-rose-200/90 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-5 shadow-2xs">
          <AlertOctagon className="w-7 h-7" />
        </div>

        <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">
          Application Exception
        </span>

        <h1 className="text-xl font-extrabold text-slate-900 mt-3 mb-2 tracking-tight">
          Surveillance Workspace Error
        </h1>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed font-mono bg-slate-50 p-3 rounded-xl border border-slate-100 text-left break-words">
          {error?.message || "An unexpected system error occurred while rendering the workspace."}
        </p>

        {error?.digest && (
          <p className="text-[10px] text-slate-400 font-mono mb-6">
            Digest Code: {error.digest}
          </p>
        )}

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-blue-400" />
            Reload Workspace
          </Button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 text-slate-400" />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
