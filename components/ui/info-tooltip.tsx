"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InfoTooltipProps {
  text: string;
  className?: string;
  title?: string;
  placement?: string;
  align?: string;
}

export function InfoTooltip({
  text,
  className,
  title = "Explanation",
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    placeAbove: boolean;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(290, window.innerWidth - 24);

    // Check space below vs above
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 170 && rect.top > 170;

    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;
    const idealLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const clampedLeft = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, idealLeft));
    const arrowLeft = Math.max(14, Math.min(tooltipWidth - 14, rect.left + rect.width / 2 - clampedLeft));

    setCoords({
      top,
      left: clampedLeft,
      arrowLeft,
      placeAbove,
    });
  }, []);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    calculatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return; // Stay open if user explicitly clicked to pin
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleTooltipMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    if (isPinned) return;
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const toggleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOpen && isPinned) {
      setIsPinned(false);
      setIsOpen(false);
    } else {
      calculatePosition();
      setIsOpen(true);
      setIsPinned(true);
    }
  };

  // Close handlers
  useEffect(() => {
    if (!isOpen) return;

    calculatePosition();

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsPinned(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsPinned(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
      setIsPinned(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, calculatePosition]);

  return (
    <>
      <span
        className={cn("inline-flex items-center align-middle ml-1", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleClick}
          className={cn(
            "p-0.5 rounded transition-colors cursor-pointer focus:outline-none flex items-center justify-center",
            isOpen
              ? "text-blue-600 bg-blue-100 ring-1 ring-blue-300"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          )}
          aria-label="Toggle explanation"
          title="Click or hover for explanation"
        >
          <Info className="w-3.5 h-3.5 shrink-0" />
        </button>
      </span>

      {mounted &&
        isOpen &&
        coords &&
        createPortal(
          <div
            ref={tooltipRef}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: "290px",
              maxWidth: "calc(100vw - 24px)",
              transform: coords.placeAbove ? "translateY(-100%)" : undefined,
              zIndex: 99999,
            }}
            className="rounded-xl border border-slate-700/90 bg-slate-900/95 backdrop-blur-md p-3 text-[11px] font-normal normal-case leading-relaxed text-slate-100 shadow-[0_12px_28px_rgba(0,0,0,0.36),0_2px_8px_rgba(0,0,0,0.2)] animate-in fade-in-0 zoom-in-95 pointer-events-auto select-text text-left"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-800">
              <span className="font-bold text-blue-400 text-[10px] uppercase tracking-wider block">
                {title}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  setIsPinned(false);
                }}
                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="text-slate-200">{text}</div>

            {/* Pointer arrow aligned directly with the trigger icon */}
            <span
              style={{
                position: "absolute",
                left: `${coords.arrowLeft}px`,
                transform: "translateX(-50%)",
                ...(coords.placeAbove
                  ? { top: "100%", borderColor: "rgba(15, 23, 42, 0.95) transparent transparent transparent" }
                  : { bottom: "100%", borderColor: "transparent transparent rgba(15, 23, 42, 0.95) transparent" }),
                borderWidth: "5px",
                borderStyle: "solid",
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}
