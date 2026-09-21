"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Check,
  X,
  Search,
  KeyRound,
  RotateCcw,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Permission, Role } from "@/lib/domain";
import { rolePermissionMap as defaultRoleMap } from "@/lib/auth/permissions";

const DOMAIN_CATEGORIES = [
  { id: "flights", label: "Flights", description: "Flight schedules, routing, dispatch & cancellation" },
  { id: "atc", label: "ATC", description: "Radar traffic, sequencing, vectoring & emergency squawks" },
  { id: "ticketing", label: "Ticketing", description: "PNR reservation, e-ticket issuance, baggage & boarding" },
  { id: "ground", label: "Ground", description: "Gate allocation, ramp marshaling, pushback & fueling" },
  { id: "staff", label: "Staff", description: "Personnel clearance, verification, roles & credentials" },
  { id: "analytics", label: "Analytics", description: "Operational OTP, passenger volume & revenue telemetry" },
  { id: "settings", label: "Settings", description: "Aviation authority configuration & simulation clock" },
];

interface RoleDomainAccess {
  role: Role;
  roleName: string;
  isSuperAdmin?: boolean;
  flights: string;
  atc: string;
  ticketing: string;
  ground: string;
  staff: string;
  analytics: string;
  settings: string;
}

const HIGH_LEVEL_MATRIX: RoleDomainAccess[] = [
  {
    role: "SUPER_ADMIN",
    roleName: "Super Admin",
    isSuperAdmin: true,
    flights: "ALL",
    atc: "ALL",
    ticketing: "ALL",
    ground: "ALL",
    staff: "ALL",
    analytics: "ALL",
    settings: "ALL",
  },
  {
    role: "ADMIN",
    roleName: "System Admin",
    flights: "ALL",
    atc: "ALL",
    ticketing: "ALL",
    ground: "ALL",
    staff: "ALL",
    analytics: "ALL",
    settings: "Limited",
  },
  {
    role: "AIRPORT_ADMIN",
    roleName: "Airport Admin",
    flights: "Full",
    atc: "Full",
    ticketing: "Full",
    ground: "Full",
    staff: "Full",
    analytics: "Full",
    settings: "Limited",
  },
  {
    role: "ATC_CONTROLLER",
    roleName: "ATC Controller",
    flights: "View",
    atc: "Full",
    ticketing: "-",
    ground: "Limited",
    staff: "-",
    analytics: "Limited",
    settings: "-",
  },
  {
    role: "TICKETING_AGENT",
    roleName: "Ticketing Agent",
    flights: "View",
    atc: "-",
    ticketing: "Full",
    ground: "-",
    staff: "-",
    analytics: "Limited",
    settings: "-",
  },
  {
    role: "GROUND_OPERATOR",
    roleName: "Ground Operator",
    flights: "View",
    atc: "-",
    ticketing: "-",
    ground: "Full",
    staff: "-",
    analytics: "Limited",
    settings: "-",
  },
  {
    role: "SECURITY_OFFICER",
    roleName: "Security Officer",
    flights: "View",
    atc: "Limited",
    ticketing: "Verify",
    ground: "-",
    staff: "-",
    analytics: "-",
    settings: "-",
  },
  {
    role: "AIRLINE_OPERATOR",
    roleName: "Airline Operator",
    flights: "Full",
    atc: "-",
    ticketing: "Full",
    ground: "-",
    staff: "-",
    analytics: "Limited",
    settings: "-",
  },
  {
    role: "GATE_AGENT",
    roleName: "Gate Agent",
    flights: "View",
    atc: "-",
    ticketing: "Boarding",
    ground: "Gates",
    staff: "-",
    analytics: "-",
    settings: "-",
  },
];

const DETAILED_PERMISSIONS: { id: Permission; category: string }[] = [
  { id: "SUPER_ADMIN_ALL_ACCESS", category: "System Authority" },
  { id: "VIEW_DASHBOARD", category: "Core Access" },
  { id: "VIEW_FLIGHTS", category: "Flights" },
  { id: "CREATE_FLIGHT", category: "Flights" },
  { id: "EDIT_FLIGHT", category: "Flights" },
  { id: "CANCEL_FLIGHT", category: "Flights" },
  { id: "VIEW_FLIGHT_STATUS", category: "Flights" },
  { id: "VIEW_TRAFFIC", category: "ATC" },
  { id: "CONTROL_ATC", category: "ATC" },
  { id: "SEND_ATC_COMMAND", category: "ATC" },
  { id: "VIEW_AIRCRAFT_POSITION", category: "ATC" },
  { id: "MANAGE_AIRLINES", category: "Fleet" },
  { id: "MANAGE_AIRCRAFT", category: "Fleet" },
  { id: "MANAGE_GATES", category: "Infrastructure" },
  { id: "MANAGE_RUNWAYS", category: "Infrastructure" },
  { id: "MANAGE_TERMINALS", category: "Infrastructure" },
  { id: "VIEW_BOOKINGS", category: "Ticketing" },
  { id: "CREATE_BOOKING", category: "Ticketing" },
  { id: "MODIFY_BOOKING", category: "Ticketing" },
  { id: "CANCEL_BOOKING", category: "Ticketing" },
  { id: "VIEW_PASSENGERS", category: "Ticketing" },
  { id: "CHECK_IN_PASSENGER", category: "Ticketing" },
  { id: "BOARD_PASSENGER", category: "Ticketing" },
  { id: "VERIFY_TICKET", category: "Ticketing" },
  { id: "VIEW_TICKET", category: "Ticketing" },
  { id: "CREATE_TICKET", category: "Ticketing" },
  { id: "MANAGE_BAGGAGE", category: "Ground" },
  { id: "MANAGE_GROUND_OPERATIONS", category: "Ground" },
  { id: "MANAGE_STAFF", category: "Administration" },
  { id: "CREATE_STAFF", category: "Administration" },
  { id: "EDIT_STAFF", category: "Administration" },
  { id: "VERIFY_STAFF", category: "Administration" },
  { id: "SUSPEND_STAFF", category: "Administration" },
  { id: "MANAGE_ROLES", category: "Administration" },
  { id: "MANAGE_PERMISSIONS", category: "Administration" },
  { id: "ASSIGN_ROLES", category: "Administration" },
  { id: "ASSIGN_PERMISSIONS", category: "Administration" },
  { id: "VIEW_ANALYTICS", category: "Intelligence" },
  { id: "VIEW_AUDIT_LOGS", category: "Intelligence" },
  { id: "MANAGE_EMERGENCIES", category: "Safety" },
  { id: "MANAGE_SYSTEM_SETTINGS", category: "System" },
  { id: "MANAGE_SIMULATOR", category: "System" },
];

export default function PermissionMatrixPage() {
  const [roleMap, setRoleMap] = useState<Record<Role, Permission[]>>(() => ({
    ...defaultRoleMap,
  }));
  const [activeTab, setActiveTab] = useState<"domain" | "granular">("domain");
  const [selectedRole, setSelectedRole] = useState<Role>("ATC_CONTROLLER");
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const togglePermission = (role: Role, perm: Permission) => {
    if (role === "SUPER_ADMIN") {
      setNotification("Protected system owner account cannot be modified or removed.");
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    setRoleMap((prev) => {
      const current = prev[role] || [];
      const has = current.includes(perm);
      const nextPerms = has ? current.filter((p) => p !== perm) : [...current, perm];
      return {
        ...prev,
        [role]: nextPerms,
      };
    });

    setNotification(`Permission ${perm} updated for ${role}.`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070b13] text-slate-100 p-6 space-y-6">
      {/* Notification */}
      {notification && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-sm font-mono text-cyan-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-cyan-400" />
            <span>{notification}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="text-cyan-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/access-management"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Staff Access Directory
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono text-slate-400">RBAC Matrix</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-cyan-400" />
            Airport Authority Permission Matrix
          </h1>
          <p className="text-sm text-slate-400">
            Interactive multi-role access control matrix across operational domains. Permanent system owner permissions are cryptographically locked.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("domain")}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono transition ${
                activeTab === "domain"
                  ? "bg-cyan-600 text-white font-semibold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Domain Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("granular")}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono transition ${
                activeTab === "granular"
                  ? "bg-cyan-600 text-white font-semibold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Granular Inspector
            </button>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition"
          >
            Control Center
          </Link>
        </div>
      </div>

      {/* DOMAIN MATRIX TAB */}
      {activeTab === "domain" && (
        <div className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    Operational Domain Authorization Overview
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 font-mono">
                    High-level access categorization by departmental boundary and system scope.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-amber-500/40 bg-amber-950/20 text-amber-300 font-mono text-xs">
                  SUPER_ADMIN: ALL ACCESS LOCKED
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/80 text-xs font-mono uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Role</th>
                      {DOMAIN_CATEGORIES.map((cat) => (
                        <th key={cat.id} className="px-4 py-3.5 text-center font-mono">
                          {cat.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {HIGH_LEVEL_MATRIX.map((row) => (
                      <tr
                        key={row.role}
                        className={`hover:bg-slate-800/30 transition-colors ${
                          row.isSuperAdmin ? "bg-amber-950/15 border-l-2 border-l-amber-500" : ""
                        }`}
                      >
                        <td className="px-5 py-4 font-bold text-white flex items-center gap-2">
                          {row.roleName}
                          {row.isSuperAdmin && (
                            <span title="Permanent System Owner (Protected)">
                              <Lock className="h-3.5 w-3.5 text-amber-400" />
                            </span>
                          )}
                        </td>

                        {/* Flights */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded font-semibold text-xs ${
                              row.flights === "ALL"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                                : row.flights === "Full"
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                                : row.flights === "View"
                                ? "bg-cyan-950/60 text-cyan-300 border border-cyan-500/40"
                                : "text-slate-600"
                            }`}
                          >
                            {row.flights}
                          </span>
                        </td>

                        {/* ATC */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded font-semibold text-xs ${
                              row.atc === "ALL"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                                : row.atc === "Full"
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                                : row.atc === "Limited"
                                ? "bg-purple-950/60 text-purple-300 border border-purple-500/40"
                                : "text-slate-600"
                            }`}
                          >
                            {row.atc}
                          </span>
                        </td>

                        {/* Ticketing */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded font-semibold text-xs ${
                              row.ticketing === "ALL"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                                : row.ticketing === "Full"
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                                : row.ticketing === "Boarding" || row.ticketing === "Verify"
                                ? "bg-blue-950/60 text-blue-300 border border-blue-500/40"
                                : "text-slate-600"
                            }`}
                          >
                            {row.ticketing}
                          </span>
                        </td>

                        {/* Ground */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded font-semibold text-xs ${
                              row.ground === "ALL"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                                : row.ground === "Full"
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                                : row.ground === "Gates"
                                ? "bg-cyan-950/60 text-cyan-300 border border-cyan-500/40"
                                : "text-slate-600"
                            }`}
                          >
                            {row.ground}
                          </span>
                        </td>

                        {/* Staff */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded font-semibold text-xs ${
                              row.staff === "ALL"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                                : row.staff === "Full"
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                                : "text-slate-600"
                            }`}
                          >
                            {row.staff}
                          </span>
                        </td>

                        {/* Analytics */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded font-semibold text-xs ${
                              row.analytics === "ALL"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                                : row.analytics === "Full"
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                                : row.analytics === "Limited"
                                ? "bg-slate-800 text-slate-300 border border-slate-700"
                                : "text-slate-600"
                            }`}
                          >
                            {row.analytics}
                          </span>
                        </td>

                        {/* Settings */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded font-semibold text-xs ${
                              row.settings === "ALL"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                                : row.settings === "Limited"
                                ? "bg-slate-800 text-slate-300 border border-slate-700"
                                : "text-slate-600"
                            }`}
                          >
                            {row.settings}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GRANULAR INSPECTOR TAB */}
      {activeTab === "granular" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Roles Selector Sidebar */}
          <Card className="border-slate-800 bg-slate-900/60 lg:col-span-1">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-white">Select Role</CardTitle>
              <CardDescription className="text-xs text-slate-400 font-mono">
                Inspect and modify active role bindings
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {Object.keys(defaultRoleMap).map((roleKey) => {
                const r = roleKey as Role;
                const isSelected = selectedRole === r;
                const isSuper = r === "SUPER_ADMIN";
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition text-left ${
                      isSelected
                        ? "bg-cyan-600 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isSuper && <Lock className="h-3 w-3 text-amber-400" />}
                      {r}
                    </span>
                    <Badge variant="outline" className="border-slate-700 text-[10px] py-0 px-1.5">
                      {roleMap[r]?.length || 0}
                    </Badge>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Permissions Matrix for Selected Role */}
          <Card className="border-slate-800 bg-slate-900/60 lg:col-span-3">
            <CardHeader className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-white font-mono">
                    {selectedRole}
                  </CardTitle>
                  {selectedRole === "SUPER_ADMIN" && (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-950/30 text-amber-300 font-mono text-xs">
                      PERMANENT ALL ACCESS
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Toggle individual operational capabilities. Modifying values immediately binds to session RBAC checks.
                </CardDescription>
              </div>

              <div className="w-full sm:w-64">
                <Input
                  placeholder="Filter permissions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-xs text-slate-200 rounded-lg"
                />
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {DETAILED_PERMISSIONS.filter((p) =>
                  p.id.toLowerCase().includes(search.toLowerCase()) ||
                  p.category.toLowerCase().includes(search.toLowerCase()),
                ).map((perm) => {
                  const isChecked =
                    selectedRole === "SUPER_ADMIN" ||
                    roleMap[selectedRole]?.includes(perm.id);

                  return (
                    <div
                      key={perm.id}
                      onClick={() => togglePermission(selectedRole, perm.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none ${
                        isChecked
                          ? "border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950/30"
                          : "border-slate-800/80 bg-slate-950/40 hover:bg-slate-800/30 opacity-70"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-1.5">
                          {perm.id}
                          {selectedRole === "SUPER_ADMIN" && (
                            <Lock className="h-3 w-3 text-amber-400" />
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{perm.category}</span>
                      </div>

                      <div
                        className={`grid h-6 w-6 place-items-center rounded-lg border text-xs font-bold transition ${
                          isChecked
                            ? "border-cyan-500 bg-cyan-500 text-slate-950"
                            : "border-slate-700 bg-slate-900 text-transparent"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
