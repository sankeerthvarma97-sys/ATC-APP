"use client";

import { useState, useCallback } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RefreshButtonProps {
  onRefresh?: () => Promise<unknown> | void;
  isRefreshing?: boolean;
  label?: string;
  tooltip?: string;
  size?: "xs" | "sm" | "default";
  variant?: "outline" | "ghost" | "cyan" | "subtle";
  className?: string;
  showStatusIndicator?: boolean;
}

export function RefreshButton({
  onRefresh,
  isRefreshing: externalRefreshing,
  label = "Refresh",
  tooltip = "Refresh current view data from source",
  size = "sm",
  variant = "subtle",
  className,
  showStatusIndicator = false,
}: RefreshButtonProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);

  const loading = Boolean(externalRefreshing || internalLoading);

  const handleClick = useCallback(async () => {
    if (loading || !onRefresh) return;

    setInternalLoading(true);
    setFeedback(null);
    try {
      await onRefresh();
      setFeedback("success");
      setTimeout(() => setFeedback(null), 2500);
    } catch (err) {
      console.warn("Refresh failed:", err);
      setFeedback("error");
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setInternalLoading(false);
    }
  }, [loading, onRefresh]);

  const sizeClasses = {
    xs: "h-7 px-2 text-[11px] gap-1",
    sm: "h-8 px-2.5 text-xs gap-1.5",
    default: "h-9 px-3 text-xs gap-2",
  };

  const variantClasses = {
    subtle: "border border-slate-700/80 bg-slate-800/60 text-slate-300 hover:bg-slate-700/80 hover:text-white hover:border-slate-600 shadow-sm",
    outline: "border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white",
    ghost: "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60",
    cyan: "border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]",
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title={tooltip}
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-mono font-medium transition-all duration-150 select-none",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      >
        <RotateCw
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            loading && "animate-spin text-cyan-400"
          )}
        />
        {label && <span className="truncate">{loading ? "Refreshing..." : label}</span>}
      </button>

      {showStatusIndicator && feedback && (
        <span
          className={cn(
            "absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono px-1.5 py-0.2 rounded border whitespace-nowrap pointer-events-none transition-opacity",
            feedback === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/80 border-red-500/40 text-red-300"
          )}
        >
          {feedback === "success" ? "Updated" : "Sync Failed"}
        </span>
      )}
    </div>
  );
}
