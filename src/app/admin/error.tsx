"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log isolated error to console
    console.error("Admin portal route error caught:", error);
  }, [error]);

  return (
    <div className="min-h-[500px] flex items-center justify-center p-6 bg-[#070b13] font-mono text-slate-100">
      <div className="max-w-md w-full p-6 rounded-2xl border border-red-500/30 bg-red-950/20 shadow-2xl text-center space-y-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div>
          <h2 className="text-base font-bold text-white tracking-wide">
            OPERATIONAL BOUNDARY FAULT
          </h2>
          <p className="text-xs text-red-300/80 mt-1">
            {error.message || "An isolated error occurred in the administration control view."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            size="sm"
            onClick={() => reset()}
            className="h-8 px-4 text-xs bg-red-600 hover:bg-red-500 text-white font-bold"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry View
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => (window.location.href = "/admin")}
            className="h-8 px-4 text-xs border-slate-700 text-slate-300 hover:text-white"
          >
            <Home className="h-3.5 w-3.5 mr-1.5" />
            Reload Admin
          </Button>
        </div>
      </div>
    </div>
  );
}
