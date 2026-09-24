"use client";

import {
  Activity,
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Cpu,
  DollarSign,
  FileText,
  Key,
  Luggage,
  Navigation,
  Plane,
  QrCode,
  Radio,
  Receipt,
  Settings,
  Shield,
  Ticket,
  Users,
  Warehouse,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface NavSectionCategory {
  title: string;
  items: {
    id: string;
    label: string;
    icon: typeof Plane;
    badge?: string;
    badgeVariant?: "default" | "secondary" | "destructive" | "warning" | "success" | "outline";
  }[];
}

export const navigationCategories: NavSectionCategory[] = [
  {
    title: "CONTROL CENTER",
    items: [
      { id: "overview", label: "Overview", icon: Activity },
      { id: "traffic", label: "Live Traffic", icon: Navigation },
      { id: "atc", label: "ATC Operations", icon: Radio },
      { id: "ground", label: "Ground Operations", icon: Luggage },
      { id: "emergencies", label: "Emergencies", icon: AlertTriangle, badge: "Alert", badgeVariant: "destructive" },
      { id: "weather", label: "Weather", icon: Wind },
    ],
  },
  {
    title: "24/7 SIMULATION ENGINE",
    items: [
      { id: "simulation", label: "Simulation Ops", icon: Cpu, badge: "24/7", badgeVariant: "success" },
      { id: "virtual-staff", label: "Virtual Staff (2,000)", icon: Users, badge: "2,000", badgeVariant: "secondary" },
    ],
  },
  {
    title: "AIRFIELD INFRASTRUCTURE",
    items: [
      { id: "airports", label: "Airports", icon: Compass },
      { id: "runways", label: "Runways", icon: Navigation },
      { id: "gates", label: "Gates", icon: Warehouse },
    ],
  },
  {
    title: "FLEET & FLIGHTS",
    items: [
      { id: "flights", label: "Flights", icon: Plane },
      { id: "airlines", label: "Airlines", icon: Building },
      { id: "aircraft", label: "Aircraft", icon: Plane },
    ],
  },
  {
    title: "PASSENGER & TICKETING",
    items: [
      { id: "ticketing", label: "Ticketing & Booking", icon: Ticket },
      { id: "bookings", label: "Bookings", icon: Calendar },
      { id: "passengers", label: "Passengers", icon: Users },
      { id: "checkin", label: "Check-in Desk", icon: CheckCircle2 },
      { id: "verification", label: "Ticket Verification", icon: QrCode },
      { id: "boarding", label: "Gate Boarding", icon: Key },
    ],
  },
  {
    title: "ACCOUNTS & FINANCE",
    items: [
      { id: "finance", label: "Finance & Treasury", icon: DollarSign, badge: "₹10 Cr", badgeVariant: "success" },
      { id: "finance-accounts", label: "Company Accounts", icon: Building },
      { id: "finance-ledger", label: "Financial Ledger", icon: FileText },
      { id: "finance-expenses", label: "Company Expenses", icon: Receipt },
      { id: "finance-payroll", label: "Payroll & Salary", icon: Users, badge: "24/7", badgeVariant: "secondary" },
      { id: "finance-calendar", label: "Payroll Calendar", icon: Calendar },
      { id: "finance-wallet", label: "Wallet Activity", icon: QrCode },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { id: "staff", label: "Staff Directory", icon: Users },
      { id: "departments", label: "Departments", icon: Building },
      { id: "roles", label: "Roles & RBAC", icon: Shield },
      { id: "analytics", label: "Analytics", icon: Activity },
      { id: "audit", label: "Audit Logs", icon: FileText },
      { id: "settings", label: "System Settings", icon: Settings },
    ],
  },
];

export function AuthoritySidebar({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapsed,
  emergencyCount = 0,
}: {
  activeSection: string;
  onSelectSection: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  emergencyCount?: number;
}) {
  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-slate-800 bg-[#070b13] transition-all duration-200 select-none z-30 shrink-0",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Collapse Toggle Button */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="absolute -right-3 top-4 grid h-6 w-6 place-items-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 hover:text-white shadow-md z-40"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
        {navigationCategories.map((cat) => (
          <div key={cat.title} className="space-y-1">
            {!collapsed && (
              <div className="px-2 py-1 text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
                {cat.title}
              </div>
            )}
            <div className="space-y-0.5">
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const badgeText = item.id === "emergencies" && emergencyCount > 0 ? `${emergencyCount}` : item.badge;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectSection(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex w-full items-center rounded-lg text-xs font-medium transition-all group",
                      collapsed ? "justify-center p-2.5" : "justify-between px-2.5 py-2",
                      isActive
                        ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100",
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive ? "text-sky-400" : "text-slate-400 group-hover:text-slate-200",
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!collapsed && badgeText && (
                      <Badge
                        variant={item.badgeVariant || (isActive ? "default" : "secondary")}
                        className="text-[10px] h-4 px-1.5 font-mono"
                      >
                        {badgeText}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {!collapsed && (
        <div className="border-t border-slate-800/80 p-3 text-[11px] text-slate-400 bg-slate-950/30 font-mono">
          <div>AOCC SIMULATOR v2.0</div>
          <div className="text-[10px] text-slate-400">Integrated Aviation Suite</div>
        </div>
      )}
    </aside>
  );
}
