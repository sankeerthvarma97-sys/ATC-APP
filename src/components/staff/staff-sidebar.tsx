"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  Key,
  LogOut,
  Luggage,
  Navigation,
  Plane,
  QrCode,
  Radio,
  Settings,
  Shield,
  ShieldAlert,
  Ticket,
  Users,
  Warehouse,
  Wind,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Role, UserDTO } from "@/lib/domain";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Plane;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "warning";
}

export function StaffSidebar({
  user,
  collapsed,
  onToggleCollapsed,
}: {
  user: UserDTO;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();
  const role = user.role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "ADMIN" || role === "AIRPORT_ADMIN" || isSuperAdmin;

  // Build role-specific navigation items
  const navItems: NavItem[] = [
    { href: "/staff", label: "Dashboard", icon: Activity },
  ];

  // ATC Controller modules
  if (
    isAdmin ||
    role === "ATC" ||
    role === "ATC_CONTROLLER" ||
    role === "SENIOR_ATC_CONTROLLER" ||
    role === "SIMULATOR_OPERATOR"
  ) {
    navItems.push(
      { href: "/staff/atc", label: "ATC & Radar", icon: Radio },
    );
  }

  // Ticketing & Passenger Agent modules
  if (
    isAdmin ||
    role === "TICKETING_AGENT" ||
    role === "PASSENGER_SERVICES" as Role ||
    role === "SUPERVISOR"
  ) {
    navItems.push(
      { href: "/staff/ticketing", label: "Ticketing Desk", icon: Ticket },
    );
  }

  // Gate Agent modules
  if (
    isAdmin ||
    role === "GATE_AGENT" ||
    role === "TICKETING_AGENT"
  ) {
    navItems.push(
      { href: "/staff/gate", label: "Gate Boarding", icon: Key },
    );
  }

  // Ground Operations modules
  if (
    isAdmin ||
    role === "GROUND" ||
    role === "GROUND_OPERATOR" ||
    role === "OPERATIONS_MANAGER"
  ) {
    navItems.push(
      { href: "/staff/ground", label: "Ground Ops", icon: Luggage },
    );
  }

  // Airline Operator / Dispatcher modules
  if (
    isAdmin ||
    role === "AIRLINE_OPERATOR" ||
    role === "FLIGHT_DISPATCHER"
  ) {
    navItems.push(
      { href: "/staff/airline", label: "Airline Fleet", icon: Building },
    );
  }

  // Security Officer modules
  if (isAdmin || role === "SECURITY_OFFICER") {
    navItems.push(
      { href: "/staff/security", label: "Security & Screening", icon: ShieldAlert },
    );
  }

  // Baggage Staff modules
  if (isAdmin || role === "BAGGAGE_STAFF") {
    navItems.push(
      { href: "/staff/baggage", label: "Baggage Sorting", icon: Luggage },
    );
  }

  // Maintenance modules
  if (isAdmin || role === "MAINTENANCE_STAFF") {
    navItems.push(
      { href: "/staff/maintenance", label: "Maintenance", icon: Wrench },
    );
  }

  // Pilot modules
  if (isAdmin || role === "PILOT") {
    navItems.push(
      { href: "/staff/pilot", label: "Cockpit / Pilot", icon: Plane },
    );
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-slate-800 bg-[#070b13] transition-all duration-200 z-30 shrink-0",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Collapse Toggle */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="absolute -right-3 top-4 grid h-6 w-6 place-items-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 hover:text-white shadow-md z-40"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Header Info */}
      <div className="p-4 border-b border-slate-800/80">
        {!collapsed ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                STAFF OPERATIONS PORTAL
              </span>
            </div>
            <div className="text-sm font-bold text-white truncate">{user.name}</div>
            <Badge variant="outline" className="border-cyan-500/40 bg-cyan-950/30 text-cyan-300 text-[10px] font-mono">
              {user.role}
            </Badge>
          </div>
        ) : (
          <div className="flex justify-center">
            <Shield className="h-6 w-6 text-cyan-400" />
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        {!collapsed && (
          <div className="px-2 py-1 text-[10px] font-mono font-semibold tracking-wider text-slate-500 uppercase">
            AUTHORIZED MODULES
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group",
                isActive
                  ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50",
                collapsed && "justify-center px-0",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300",
                )}
              />
              {!collapsed && (
                <span className="truncate flex-1">{item.label}</span>
              )}
            </Link>
          );
        })}

        {/* Link to Admin Portal if authorized */}
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-800/80">
            {!collapsed && (
              <div className="px-2 py-1 text-[10px] font-mono font-semibold tracking-wider text-amber-400/80 uppercase">
                ADMINISTRATION
              </div>
            )}
            <Link
              href="/admin"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30",
                collapsed && "justify-center px-0",
              )}
              title={collapsed ? "Authority Control Center" : undefined}
            >
              <Shield className="h-4 w-4 text-amber-400 shrink-0" />
              {!collapsed && <span className="truncate font-semibold">Authority Control Center</span>}
            </Link>
          </div>
        )}
      </div>

      {/* Footer / Sign Out */}
      <div className="p-3 border-t border-slate-800/80">
        <Link
          href="/api/auth/signout"
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition",
            collapsed && "justify-center px-0",
          )}
          title="Sign Out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Link>
      </div>
    </aside>
  );
}
