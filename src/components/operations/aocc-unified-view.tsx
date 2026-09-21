"use client";

import { useState } from "react";
import type { OperationsSnapshot, UserDTO } from "@/lib/domain";
import { AuthorityControlCenter } from "@/components/authority/authority-control-center";
import { OperationsConsole } from "@/components/operations/operations-console";
import { Button } from "@/components/ui/button";
import { Building, Radio } from "lucide-react";

export function AoccUnifiedView({
  user,
  initialSnapshot,
}: {
  user: UserDTO;
  initialSnapshot: OperationsSnapshot;
}) {
  const [viewMode, setViewMode] = useState<"authority" | "atc">("authority");

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Floating Mode Switcher in top right corner */}
      <div className="fixed top-2.5 right-36 z-50 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 shadow-xl backdrop-blur-md">
        <Button
          size="sm"
          variant={viewMode === "authority" ? "default" : "ghost"}
          className={`h-7 px-2.5 text-xs font-semibold ${
            viewMode === "authority" ? "bg-primary text-primary-foreground shadow" : "text-slate-300"
          }`}
          onClick={() => setViewMode("authority")}
        >
          <Building className="h-3.5 w-3.5 mr-1.5" />
          Authority Center
        </Button>
        <Button
          size="sm"
          variant={viewMode === "atc" ? "default" : "ghost"}
          className={`h-7 px-2.5 text-xs font-semibold ${
            viewMode === "atc" ? "bg-primary text-primary-foreground shadow" : "text-slate-300"
          }`}
          onClick={() => setViewMode("atc")}
        >
          <Radio className="h-3.5 w-3.5 mr-1.5" />
          ATC Simulator
        </Button>
      </div>

      {viewMode === "authority" ? (
        <AuthorityControlCenter
          currentUser={user}
          initialSnapshot={initialSnapshot}
          onOpenConsole={() => setViewMode("atc")}
        />
      ) : (
        <OperationsConsole initialSnapshot={initialSnapshot} />
      )}
    </div>
  );
}
