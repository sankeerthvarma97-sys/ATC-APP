"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Gauge,
  Key,
  LogOut,
  Luggage,
  Navigation,
  Plane,
  Radio,
  Search,
  Shield,
  Ticket,
  Users,
  Warehouse,
  Wrench,
  Command,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserDTO } from "@/lib/domain";
import { AoccLogo } from "@/components/brand/aocc-logo";
import { AerospaceAmbientGrid } from "@/components/brand/aerospace-ambient-grid";
import { atcVoice } from "@/lib/services/voice-service";
import { CommandPaletteModal } from "./command-palette-modal";
import { NotificationCenterDrawer } from "./notification-center-drawer";

interface NavGroup {
  title: string;
  items: {
    href: string;
    label: string;
    icon: typeof Plane;
    badge?: string;
  }[];
}

export function AoccPortalShell({
  user,
  portalTitle,
  children,
}: {
  user: UserDTO;
  portalTitle?: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [zuluTime, setZuluTime] = useState("");
  const [unreadCount, setUnreadCount] = useState(2);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setAudioEnabled(atcVoice.isAudioActive());
    return atcVoice.subscribe((enabled) => setAudioEnabled(enabled));
  }, []);

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isAdmin = user.role === "ADMIN" || user.role === "AIRPORT_ADMIN" || isSuperAdmin;

  // Live Zulu clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setZuluTime(`${now.toISOString().slice(11, 19)}Z`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcuts (Cmd+K, G then D, G then F, G then T, G then B, G then S)
  useEffect(() => {
    let keySequence = "";
    let sequenceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K opens command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Escape closes open drawers/modals
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setNotificationsOpen(false);
        return;
      }

      // Ignore sequences if typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      if (e.key.toLowerCase() === "g") {
        keySequence = "g";
        if (sequenceTimer) clearTimeout(sequenceTimer);
        sequenceTimer = setTimeout(() => {
          keySequence = "";
        }, 1000);
        return;
      }

      if (keySequence === "g") {
        const nextKey = e.key.toLowerCase();
        keySequence = "";
        if (nextKey === "d") router.push(isAdmin ? "/admin" : "/staff");
        else if (nextKey === "f") router.push("/staff/atc");
        else if (nextKey === "t") router.push("/staff/atc");
        else if (nextKey === "b") router.push("/staff/ticketing");
        else if (nextKey === "s") router.push(isAdmin ? "/admin" : "/staff");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimer) clearTimeout(sequenceTimer);
    };
  }, [isAdmin, router]);

  // Grouped Navigation Items
  const navGroups: NavGroup[] = [
    {
      title: "AIRSPACE & COCKPIT",
      items: [
        { href: "/staff/atc", label: "Tower Radar (ATC)", icon: Radio, badge: "Live" },
        { href: "/staff/pilot", label: "Flight Deck & PFD", icon: Gauge, badge: "Cockpit" },
        ...(isAdmin ? [{ href: "/admin", label: "National Command", icon: Activity }] : []),
      ],
    },
    {
      title: "TERMINAL & PASSENGERS",
      items: [
        { href: "/staff/gate", label: "Gate & Turnstile HUD", icon: Key, badge: "Scanner" },
        { href: "/staff/ticketing", label: "Check-in & Boarding", icon: Ticket },
        { href: "/staff/security", label: "Security & Screening", icon: Shield },
      ],
    },
    {
      title: "RAMP & LOGISTICS",
      items: [
        { href: "/staff/ground", label: "Ground Turnaround", icon: Warehouse },
        { href: "/staff/baggage", label: "Baggage System (BHS)", icon: Luggage, badge: "CT 3D" },
        { href: "/staff/maintenance", label: "MRO Maintenance", icon: Wrench },
      ],
    },
  ];

  // Breadcrumbs computation
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, idx) => {
    const url = "/" + pathSegments.slice(0, idx + 1).join("/");
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    return { url, label };
  });

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#070b13] text-slate-100 font-sans select-none antialiased">
      {/* 24/7 Subtle Ambient Aerospace Grid Animation */}
      <AerospaceAmbientGrid />

      {/* Left Sidebar */}
      <aside
        className={`flex flex-col border-r border-slate-800 bg-[#070b13] transition-all duration-200 z-30 shrink-0 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-3.5 bg-slate-950/60">
          {!collapsed ? (
            <Link href={isAdmin ? "/admin" : "/staff"} className="flex items-center gap-2.5 group">
              <AoccLogo size={32} />
              <div>
                <span className="font-bold text-sm text-white tracking-wider block font-mono group-hover:text-cyan-400 transition-colors">
                  AOCC
                </span>
                <span className="text-[9px] text-slate-400 tracking-tight block font-mono">
                  OPERATIONS CONTROL
                </span>
              </div>
            </Link>
          ) : (
            <div className="mx-auto">
              <Link href={isAdmin ? "/admin" : "/staff"} title="AOCC Operations">
                <AoccLogo size={28} />
              </Link>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Modules */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 font-mono text-xs">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!collapsed && (
                <div className="px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition font-medium ${
                      isActive
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-cyan-400" : ""}`} />
                    {!collapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 border-cyan-500/30 text-cyan-400"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Badge in Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 font-mono text-xs">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="truncate">
                <div className="text-white font-bold text-[11px] truncate">{user.name}</div>
                <div className="text-[9px] text-cyan-400 font-bold">{user.role}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign out"
                className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-red-400 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign out"
                className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-800 bg-[#070b13]/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20 font-mono text-xs">
          {/* Breadcrumbs & Title */}
          <div className="flex items-center gap-2 text-slate-400 truncate">
            <span className="text-white font-bold tracking-wide">
              {portalTitle || (isAdmin ? "AOCC CONTROL CENTER" : "STAFF OPERATIONS")}
            </span>
            <span className="text-slate-600">/</span>
            {breadcrumbs.map((b, idx) => (
              <span key={b.url} className="flex items-center gap-2">
                <Link
                  href={b.url}
                  className={`hover:text-cyan-300 transition ${
                    idx === breadcrumbs.length - 1 ? "text-cyan-400 font-bold" : ""
                  }`}
                >
                  {b.label}
                </Link>
                {idx < breadcrumbs.length - 1 && <span className="text-slate-600">/</span>}
              </span>
            ))}
          </div>

          {/* Quick Search Button (Cmd+K) & Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 hover:border-cyan-500/40 text-slate-400 hover:text-slate-200 transition text-[11px]"
            >
              <Search className="h-3.5 w-3.5 text-cyan-400" />
              <span>Search flights, gates, PNR...</span>
              <kbd className="rounded bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Zulu Clock */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950 text-slate-300">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-bold text-white tracking-wider">{zuluTime || "12:00:00Z"}</span>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setNotificationsOpen(true)}
              aria-label="Open operational notifications"
              className="relative p-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white transition"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-[0_0_8px_#ef4444]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Submodule Content */}
        <main className="flex-1 overflow-y-auto bg-[#070b13] p-4 sm:p-6">{children}</main>

        {/* Bottom Persistent Status Bar */}
        <footer className="h-7 border-t border-slate-800/80 bg-slate-950 px-4 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE · REALTIME CONNECTED</span>
            </div>
            <span className="text-slate-700">|</span>
            <span>STATION: KJFK / VOHS</span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="hidden sm:inline">RADAR FEEDS: NORMAL</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => atcVoice.toggleAudio()}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition ${
                audioEnabled
                  ? "text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 border border-cyan-700/60 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                  : "text-slate-500 hover:text-slate-400 bg-slate-900 border border-slate-800"
              }`}
              title={audioEnabled ? "Mute ATC VHF Radio audio clearances" : "Unmute ATC VHF Radio audio clearances"}
            >
              {audioEnabled ? <Volume2 className="h-3 w-3 text-cyan-400" /> : <VolumeX className="h-3 w-3 text-slate-500" />}
              <span>ATC AUDIO: {audioEnabled ? "ON" : "MUTED"}</span>
            </button>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="text-slate-500 hidden sm:inline">API: 200 OK</span>
            <span className="text-slate-700">|</span>
            <span className="text-emerald-400">DB: HEALTHY</span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-500">v0.1.0 PROD</span>
          </div>
        </footer>
      </div>

      {/* Global Command Palette Modal */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Operational Notification Drawer */}
      <NotificationCenterDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
}
