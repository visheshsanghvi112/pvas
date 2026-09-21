"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Clock,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TradingDatePickerProps {
  availableDates: string[]; // e.g. ["2026-08-11", "2026-08-10", ...]
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function TradingDatePicker({
  availableDates = [],
  selectedDate,
  onDateChange,
  className,
  label,
  size = "md",
}: TradingDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view year & month from selectedDate or availableDates[0] or today
  const initialDateObj = useMemo(() => {
    const target = selectedDate || availableDates[0] || new Date().toISOString().slice(0, 10);
    const [y, m, d] = target.split("-").map(Number);
    return { year: y || 2026, month: (m || 8) - 1, day: d || 11 };
  }, [selectedDate, availableDates]);

  const [viewYear, setViewYear] = useState<number>(initialDateObj.year);
  const [viewMonth, setViewMonth] = useState<number>(initialDateObj.month);

  // Sync view when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split("-").map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [selectedDate]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const tradingDatesSet = useMemo(() => new Set(availableDates), [availableDates]);

  const latestDate = availableDates[0];
  const earliestDate = availableDates[availableDates.length - 1];
  const isLatest = selectedDate === latestDate;

  // Format selected date for button display: "11 Aug 2026"
  const formattedDisplay = useMemo(() => {
    if (!selectedDate) return "Select date";
    const [y, m, d] = selectedDate.split("-").map(Number);
    if (!y || !m || !d) return selectedDate;
    const dateObj = new Date(y, m - 1, d);
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
    const monthName = MONTH_NAMES[m - 1]?.slice(0, 3);
    return {
      full: `${dayName}, ${d} ${monthName} ${y}`,
      short: `${d} ${monthName} ${y}`,
      day: d,
      monthYear: `${monthName} ${y}`,
      dayOfWeek: dayName,
    };
  }, [selectedDate]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Generate calendar grid days for viewYear & viewMonth
  const calendarDays = useMemo(() => {
    const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDaysCount = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isTradingDay: boolean;
      isSelected: boolean;
      isLatest: boolean;
    }> = [];

    // Preceding month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthDaysCount - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: dNum,
        isCurrentMonth: false,
        isTradingDay: tradingDatesSet.has(dateStr),
        isSelected: dateStr === selectedDate,
        isLatest: dateStr === latestDate,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isTradingDay: tradingDatesSet.has(dateStr),
        isSelected: dateStr === selectedDate,
        isLatest: dateStr === latestDate,
      });
    }

    // Trailing month filler days to complete 6-row (42 cells) or 5-row grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isTradingDay: tradingDatesSet.has(dateStr),
        isSelected: dateStr === selectedDate,
        isLatest: dateStr === latestDate,
      });
    }

    return days;
  }, [viewYear, viewMonth, tradingDatesSet, selectedDate, latestDate]);

  const handleSelect = (dateStr: string) => {
    onDateChange(dateStr);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left select-none", className)}>
      {label && <label className="block text-[11px] font-bold text-slate-500 mb-1">{label}</label>}

      {/* ── Main Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group flex items-center justify-between gap-3 bg-white border border-slate-300 hover:border-slate-400 rounded-xl font-medium text-slate-800 transition-all duration-150 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
          size === "sm" ? "px-2.5 py-1 text-xs" : size === "lg" ? "px-4 py-2.5 text-sm" : "px-3.5 py-1.5 text-xs",
          isOpen && "border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>

          <div className="flex flex-col text-left">
            <span className="font-bold text-slate-900 text-xs tracking-tight">
              {typeof formattedDisplay === "object" ? formattedDisplay.short : formattedDisplay}
            </span>
          </div>
        </div>

        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-slate-400 transition-transform duration-200 group-hover:text-slate-600",
            isOpen && "rotate-180 text-blue-600"
          )}
        />
      </button>

      {/* ── Dropdown Calendar Popover ── */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="font-bold text-xs text-slate-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center py-1 text-[11px] font-bold text-slate-400">
            {WEEKDAY_NAMES.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center pt-1">
            {calendarDays.map((cd, i) => {
              const isAvailable = cd.isTradingDay;
              const isSelected = cd.isSelected;

              return (
                <button
                  key={i}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => handleSelect(cd.dateStr)}
                  className={cn(
                    "h-8 w-8 rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-all duration-100 mx-auto",
                    !cd.isCurrentMonth && "opacity-30",
                    isSelected
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 ring-2 ring-blue-600 ring-offset-1 z-10 cursor-default"
                      : isAvailable
                      ? "bg-slate-50/70 hover:bg-blue-50 hover:text-blue-700 text-slate-800 font-bold border border-slate-200/80 cursor-pointer"
                      : "text-slate-300 bg-transparent cursor-not-allowed font-normal"
                  )}
                  title={
                    isAvailable
                      ? `Trading Session: ${cd.dateStr}`
                      : `${cd.dateStr} (No trading session / holiday)`
                  }
                >
                  <span>{cd.dayNumber}</span>
                  {isAvailable && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Status */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{availableDates.length} Trading Days</span>
            </div>
            {earliestDate && latestDate && (
              <span className="text-[10px] text-slate-400 font-mono">
                {earliestDate} → {latestDate}
              </span>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
