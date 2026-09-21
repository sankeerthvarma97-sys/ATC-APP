"use client";

import { useState } from "react";
import type { UserDTO } from "@/lib/domain";
import { StaffSidebar } from "./staff-sidebar";
import { Shield, Radio, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StaffPortalShell({
  user,
  children,
}: {
  user: UserDTO;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070b13] text-slate-100 font-sans">
      <StaffSidebar
        user={user}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Operational Status Bar */}
        <header className="h-12 border-b border-slate-800 bg-[#070b13]/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
                AERODROME NETWORK ONLINE
              </span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-mono text-slate-400">
              STATION: HYD / RGIA
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-slate-400">
              <span>SHIFT: {user.shift || "CURRENT"}</span>
            </div>
            <Badge variant="outline" className="border-cyan-500/30 bg-cyan-950/20 text-cyan-300 font-mono text-xs">
              {user.email}
            </Badge>
          </div>
        </header>

        {/* Submodule Viewport */}
        <main className="flex-1 overflow-y-auto bg-[#070b13]">
          {children}
        </main>
      </div>
    </div>
  );
}
