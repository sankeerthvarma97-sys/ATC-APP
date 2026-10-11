"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Compass,
  FileText,
  Key,
  Luggage,
  Navigation,
  PhoneCall,
  Plane,
  QrCode,
  Radio,
  Search,
  Settings,
  Shield,
  Ticket,
  Users,
  Warehouse,
  Wind,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface NavItem {
  id: string;
  label: string;
  category: string;
  icon: typeof Plane;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "warning" | "success" | "outline";
}

export const navItems: NavItem[] = [
  // Operational Command
  { id: "overview", label: "Overview", category: "Control Center", icon: Activity },
  { id: "traffic", label: "Live Traffic", category: "Control Center", icon: Navigation },
  { id: "atc", label: "ATC Operations", category: "Control Center", icon: Radio },
  { id: "ground", label: "Ground Operations", category: "Control Center", icon: Luggage },
  { id: "emergencies", label: "Emergencies", category: "Control Center", icon: AlertTriangle, badge: "Alerts", badgeVariant: "destructive" },
  { id: "weather", label: "Weather", category: "Control Center", icon: Wind },

  // Airfield Infrastructure
  { id: "airports", label: "Airports", category: "Airfield", icon: Compass },
  { id: "runways", label: "Runways", category: "Airfield", icon: Navigation },
  { id: "gates", label: "Gates", category: "Airfield", icon: Warehouse },

  // Fleet & Flights
  { id: "flights", label: "Flights", category: "Fleet & Flights", icon: Plane },
  { id: "airlines", label: "Airlines", category: "Fleet & Flights", icon: Building },
  { id: "aircraft", label: "Aircraft", category: "Fleet & Flights", icon: Plane },

  // Passenger & Ticketing
  { id: "ticketing", label: "Ticketing", category: "Ticketing & Passenger", icon: Ticket },
  { id: "bookings", label: "Bookings", category: "Ticketing & Passenger", icon: Calendar },
  { id: "passengers", label: "Passengers", category: "Ticketing & Passenger", icon: Users },
  { id: "checkin", label: "Check-in", category: "Ticketing & Passenger", icon: CheckCircle2 },
  { id: "verification", label: "Ticket Verification", category: "Ticketing & Passenger", icon: QrCode },
  { id: "boarding", label: "Boarding", category: "Ticketing & Passenger", icon: Key },

  // Accounts & Finance
  { id: "finance", label: "Finance & Treasury", category: "Accounts & Finance", icon: Activity, badge: "₹1,000B", badgeVariant: "success" },
  { id: "finance-salaries", label: "Salary Grades & Hikes", category: "Accounts & Finance", icon: Shield, badge: "INR", badgeVariant: "secondary" },
  { id: "finance-payroll", label: "Payroll Processing (24/7)", category: "Accounts & Finance", icon: Users, badge: "24/7", badgeVariant: "secondary" },
  { id: "finance-calendar", label: "Payroll Calendar", category: "Accounts & Finance", icon: Calendar },
  { id: "finance-ledger", label: "Financial Ledger", category: "Accounts & Finance", icon: FileText },
  { id: "finance-expenses", label: "Company Expenses", category: "Accounts & Finance", icon: FileText },
  { id: "finance-accounts", label: "Company Accounts", category: "Accounts & Finance", icon: Building },

  // Governance & Admin
  { id: "staff", label: "Staff", category: "Administration", icon: Users },
  { id: "departments", label: "Departments", category: "Administration", icon: Building },
  { id: "roles", label: "Roles & Permissions", category: "Administration", icon: Shield },
  { id: "analytics", label: "Analytics", category: "Administration", icon: Activity },
  { id: "audit", label: "Audit Logs", category: "Administration", icon: FileText },
  { id: "settings", label: "System Settings", category: "Administration", icon: Settings },
];

export function CommandPalette({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sectionId: string) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = navItems.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-4 pt-20 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-sky-500/30 bg-[#090d16] text-slate-100 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          <Search className="h-5 w-5 text-sky-400" />
          <input
            autoFocus
            type="text"
            placeholder="Search all 24 control center modules, flights, gates... (ESC to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm font-medium text-slate-100 placeholder-slate-500 outline-none"
          />
          <button
            onClick={onClose}
            type="button"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No matching modules or actions found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-800/80 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-7 w-7 place-items-center rounded bg-slate-800 text-sky-400 group-hover:bg-sky-500 group-hover:text-black transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-200 group-hover:text-white">
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-400">{item.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <Badge variant={item.badgeVariant || "secondary"} className="text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/40 px-4 py-2 text-[11px] text-slate-500">
          <span>Navigate with arrows or mouse</span>
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400">
              ESC
            </kbd>
            <span>to exit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
