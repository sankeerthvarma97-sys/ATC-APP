"use client";

import React from "react";
import { Check, Copy } from "lucide-react";
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

export interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  label?: string;
  showIcon?: boolean;
  stopPropagation?: boolean;
}

export function CopyButton({
  value,
  label,
  showIcon = true,
  stopPropagation = true,
  className,
  title,
  ...props
}: CopyButtonProps) {
  const { isCopied, copy } = useCopyToClipboard();

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    void copy(value);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title || (isCopied ? "Copied!" : `Copy ${label || value}`)}
      aria-label={isCopied ? "Copied to clipboard" : `Copy ${label || value} to clipboard`}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400",
        isCopied
          ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
          : "bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700/50",
        className
      )}
      {...props}
    >
      {showIcon && (
        isCopied ? (
          <Check className="h-3 w-3 text-emerald-400 shrink-0" />
        ) : (
          <Copy className="h-3 w-3 text-slate-400 hover:text-slate-200 shrink-0" />
        )
      )}
      {label && <span>{isCopied ? "Copied" : label}</span>}
      {!label && isCopied && <span className="text-[10px] text-emerald-400">Copied</span>}
    </button>
  );
}
