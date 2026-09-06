"use client";

import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  show: boolean;
  message: React.ReactNode;
  onClose: () => void;
  type?: "warning" | "info" | "error" | "success";
  duration?: number;
}

export function Toast({ show, message, onClose, type = "warning", duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const bgColors = {
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    error: "bg-rose-50 border-rose-200 text-rose-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  };

  const iconColors = {
    warning: "text-amber-500",
    info: "text-blue-500",
    error: "text-rose-500",
    success: "text-emerald-500",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm", bgColors[type])}>
        <AlertTriangle className={cn("w-5 h-5 shrink-0", iconColors[type])} />
        <div className="text-sm font-medium leading-snug flex-1">
          {message}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-black/5 rounded-md transition-colors shrink-0"
        >
          <X className="w-4 h-4 opacity-70" />
        </button>
      </div>
    </div>
  );
}
