"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  AlertTriangle,
  Clock,
  KeyRound,
  LogOut,
  Search,
} from "lucide-react";
import type { AirportDTO, UserDTO } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { AoccLogo } from "@/components/brand/aocc-logo";
import { PasswordChangeModal } from "@/components/employee/password-change-modal";
import { RefreshButton } from "@/components/ui/refresh-button";

export function AuthorityHeader({
  currentUser,
  activeAirport,
  airports,
  onSelectAirport,
  onOpenCommandPalette,
  emergencyCount = 0,
  onRefresh,
  isRefreshing,
}: {
  currentUser: UserDTO;
  activeAirport: AirportDTO;
  airports: AirportDTO[];
  onSelectAirport: (airport: AirportDTO) => void;
  onOpenCommandPalette: () => void;
  emergencyCount?: number;
  onRefresh?: () => Promise<unknown> | void;
  isRefreshing?: boolean;
}) {
  const [time, setTime] = useState({ zulu: "", local: "" });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const zulu = `${now.toISOString().slice(11, 19)}Z`;
      const local = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setTime({ zulu, local });
    }
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-800 bg-[#070b13]/95 px-4 backdrop-blur-md">
      {/* Left: Brand & Airport Context */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <AoccLogo size={32} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                AOCC AUTHORITY
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              CONTROL CENTER · PHASE 2
            </div>
          </div>
        </div>

        {/* Airport Selector Dropdown */}
        <div className="hidden md:flex items-center gap-2 border-l border-slate-800 pl-4">
          <span className="text-xs text-slate-400 font-medium">Station:</span>
          <select
            value={activeAirport?.iata || "HYD"}
            onChange={(e) => {
              const selected = airports.find((a) => a.iata === e.target.value);
              if (selected) onSelectAirport(selected);
            }}
            className="rounded border border-slate-700 bg-slate-900/90 px-2 py-1 text-xs font-mono text-sky-300 outline-none hover:border-sky-500 cursor-pointer"
          >
            {airports.map((a) => (
              <option key={a.iata} value={a.iata} className="bg-slate-900 text-slate-100">
                {a.iata} / {a.icao} — {a.city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Middle: Command Palette Quick Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 hover:border-sky-500/50 hover:text-slate-200 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span>Search flights, gates, PNR, modules...</span>
          </div>
          <kbd className="rounded border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Refresh, Clock, Emergencies, Profile & Logout */}
      <div className="flex items-center gap-3">
        {/* Global Domain Refresh Control */}
        <RefreshButton
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          size="xs"
          variant="cyan"
          label="Refresh"
          tooltip="Refresh all real-time operations, flights and dashboard telemetry (Alt+R)"
          showStatusIndicator
        />

        {/* Zulu Clock */}
        <div className="hidden sm:flex items-center gap-2 border border-slate-800 bg-slate-900/80 px-2.5 py-1 rounded text-xs font-mono">
          <Clock className="h-3.5 w-3.5 text-sky-400" />
          <span className="text-sky-300 font-semibold">{time.zulu || "00:00:00Z"}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">{time.local || "00:00"}</span>
        </div>

        {/* Emergency Alert Indicator */}
        {emergencyCount > 0 && (
          <div className="flex items-center gap-1.5 rounded border border-red-500/40 bg-red-950/60 px-2 py-1 text-xs text-red-300 animate-pulse font-mono font-medium">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span>{emergencyCount} ALERT</span>
          </div>
        )}

        {/* User Info & Controls */}
        <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-slate-200">{currentUser.name}</div>
            <div className="text-[10px] font-mono text-sky-400">{currentUser.role}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPasswordModalOpen(true)}
            className="h-8 px-2 text-xs border-slate-700 hover:bg-slate-800 text-sky-400 hover:text-sky-300"
            title="Change Account Password"
          >
            <KeyRound className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="h-8 px-2 text-xs border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </header>
  );
}
