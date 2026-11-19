"use client";

import React from "react";
import { UserCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientDetail } from "@/lib/api";

export interface Client360DrawerProps {
  selectedPan: string | null;
  client360: ClientDetail | null;
  onClose: () => void;
}

export function Client360Drawer({
  selectedPan,
  client360,
  onClose,
}: Client360DrawerProps) {
  if (!selectedPan) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <UserCircle className="w-5 h-5 text-blue-600" />
            Client 360 Intelligence Profile
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!client360 ? (
          <div className="p-6 text-sm text-slate-500 flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
            Loading verified client KYC details…
          </div>
        ) : (
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                Legal Entity KYC
              </div>
              {client360.name && (
                <div className="text-base font-extrabold text-slate-900 mb-1">
                  {client360.name}
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="text-xs font-black text-slate-800 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                  {client360.pan}
                </div>
                {client360.category && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.5 rounded border border-blue-200">
                    {client360.category}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-2">
                Client ID: {client360.clnt_id} · Trading Member: {client360.tm_id}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3.5">
              <div className="text-xs text-slate-700 font-bold mb-2 border-b border-slate-100 pb-1">
                Beneficiary Owner (BO) Depository Accounts (
                {client360.depository_accounts.length})
              </div>
              <div className="text-xs space-y-1.5 font-mono">
                {client360.depository_accounts.length === 0 ? (
                  <div className="text-slate-400">
                    No depository accounts linked.
                  </div>
                ) : (
                  client360.depository_accounts.map((da, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100"
                    >
                      <span className="font-bold text-slate-800">
                        {da.dp_id} / {da.client_id}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          da.status?.toUpperCase().includes("ACTIVE")
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        )}
                      >
                        {da.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
