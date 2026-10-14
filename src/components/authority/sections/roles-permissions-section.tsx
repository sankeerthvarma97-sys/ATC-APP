"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  FileKey,
  Key,
  Lock,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Permission, Role } from "@/lib/domain";

const ALL_PERMISSIONS: { id: Permission; category: string; description: string }[] = [
  { id: "VIEW_DASHBOARD", category: "Core Access", description: "Access Authority overview dashboard & operational metrics" },
  { id: "VIEW_TRAFFIC", category: "Core Access", description: "Monitor active sector radar & ground movements" },
  { id: "CREATE_FLIGHT", category: "Flight & Fleet", description: "Dispatch new scheduled and charter flights" },
  { id: "EDIT_FLIGHT", category: "Flight & Fleet", description: "Update flight schedule, route, or equipment" },
  { id: "CANCEL_FLIGHT", category: "Flight & Fleet", description: "Authorize operational flight cancellation" },
  { id: "MANAGE_AIRLINES", category: "Flight & Fleet", description: "Manage airline registrations and operating slots" },
  { id: "MANAGE_AIRCRAFT", category: "Flight & Fleet", description: "Manage fleet airframes, tail numbers, and maintenance" },
  { id: "MANAGE_GATES", category: "Airfield Infrastructure", description: "Allocate aircraft gates, jet bridges, and ramp stands" },
  { id: "MANAGE_RUNWAYS", category: "Airfield Infrastructure", description: "Open/close runways, change configurations, set ILS category" },
  { id: "MANAGE_STAFF", category: "Administration & HR", description: "Hire, suspend, and update personnel credentials" },
  { id: "VERIFY_STAFF", category: "Administration & HR", description: "Authorize security clearances and issue airside badges" },
  { id: "MANAGE_ROLES", category: "Administration & HR", description: "Assign and reconfigure staff departmental roles" },
  { id: "MANAGE_PERMISSIONS", category: "Administration & HR", description: "Configure system-wide RBAC permission bindings" },
  { id: "CREATE_BOOKING", category: "Ticketing & Passenger", description: "Book passenger tickets and assign aircraft seats" },
  { id: "MODIFY_BOOKING", category: "Ticketing & Passenger", description: "Change seat assignments, baggage, or itinerary" },
  { id: "CANCEL_BOOKING", category: "Ticketing & Passenger", description: "Process passenger booking cancellations & refunds" },
  { id: "VERIFY_TICKET", category: "Ticketing & Passenger", description: "Scan and authorize ticket validity at security & gate" },
  { id: "CHECK_IN_PASSENGER", category: "Ticketing & Passenger", description: "Check in passengers and print digital boarding passes" },
  { id: "BOARD_PASSENGER", category: "Ticketing & Passenger", description: "Authorize boarding pass scan and close gate manifest" },
  { id: "CONTROL_ATC", category: "Air Traffic Control", description: "Issue radar vectors, speed, altitude, and takeoff clearances" },
  { id: "MANAGE_GROUND_OPERATIONS", category: "Apron & Ramp", description: "Coordinate pushback tugs, fueling, and baggage sorting" },
  { id: "MANAGE_EMERGENCIES", category: "Safety & Crisis", description: "Declare emergency squawks and dispatch fire & rescue foam trucks" },
  { id: "VIEW_ANALYTICS", category: "Intelligence & Logs", description: "Inspect OTP (on-time performance) and revenue telemetry" },
  { id: "VIEW_AUDIT_LOGS", category: "Intelligence & Logs", description: "Access immutable security and operational audit trail" },
  { id: "MANAGE_SYSTEM_SETTINGS", category: "Intelligence & Logs", description: "Adjust simulation clock speed, environment, and DB parameters" },
];

import { rolePermissionMap } from "@/lib/auth/permissions";

const ROLES_LIST: { id: Role; label: string; desc: string }[] = [
  { id: "SUPER_ADMIN", label: "Super Admin", desc: "Unrestricted operational & system authority" },
  { id: "ADMIN", label: "System Administrator", desc: "Full administrative access across all sectors" },
  { id: "AIRPORT_ADMIN", label: "Airport Authority Admin", desc: "Aerodrome oversight and executive command" },
  { id: "OPERATIONS_MANAGER", label: "Operations Manager", desc: "Shift supervisor across all airport concourses" },
  { id: "SUPERVISOR", label: "Concourse Supervisor", desc: "Day of operation coordinator" },
  { id: "ATC", label: "Air Traffic Control", desc: "Air traffic control operator" },
  { id: "ATC_CONTROLLER", label: "ATC Tower Controller", desc: "Local control, runway separation, and takeoffs" },
  { id: "SENIOR_ATC_CONTROLLER", label: "Senior ATC Controller", desc: "Senior controller & TRACON supervisor" },
  { id: "PILOT", label: "Airline Pilot / Captain", desc: "Cockpit flight plan execution and radio response" },
  { id: "FLIGHT_DISPATCHER", label: "Flight Dispatcher", desc: "Flight planning, fuel reserve, and payload clearance" },
  { id: "GROUND", label: "Ground Controller", desc: "Apron servicing, pushback, and tug routing" },
  { id: "GROUND_OPERATOR", label: "Ground Operator", desc: "Aircraft marshaling, baggage loading, and chocks" },
  { id: "AIRLINE_OPERATOR", label: "Airline Operator", desc: "Airline operations and fleet dispatch" },
  { id: "TICKETING_AGENT", label: "Ticketing Agent", desc: "Passenger booking, seat selection, and e-tickets" },
  { id: "GATE_AGENT", label: "Gate Agent", desc: "Boarding call, scanner verification, and gate close" },
  { id: "SECURITY_OFFICER", label: "Security Officer", desc: "Credential check, screening, and threat response" },
  { id: "BAGGAGE_STAFF", label: "Baggage Staff", desc: "Baggage handling and reconciliation" },
  { id: "MAINTENANCE_STAFF", label: "Maintenance Staff", desc: "Runway friction tests, lighting, and airframe repairs" },
  { id: "SIMULATOR_OPERATOR", label: "Simulator Operator", desc: "Educational flight simulation coordinator" },
  { id: "ANALYST", label: "Operations Analyst", desc: "Telemetry, metrics, and safety analytics" },
  { id: "VIEWER", label: "Observer / Viewer", desc: "Read-only situational awareness display" },
];

export function RolesPermissionsSection() {
  const [selectedRole, setSelectedRole] = useState<Role>("SUPER_ADMIN");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const hasPermission = (role: Role, perm: Permission): boolean => {
    return rolePermissionMap[role]?.includes(perm) ?? false;
  };

  const categories = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.category)));

  const filteredPermissions = ALL_PERMISSIONS.filter((p) => {
    const matchesSearch =
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === "ALL" || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const currentRoleInfo = ROLES_LIST.find((r) => r.id === selectedRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Roles & Granular RBAC Permissions
          </h2>
          <p className="text-sm text-muted-foreground">
            Explore the 16 operational simulation roles and 25 server-enforced security permission flags.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
          25 Enforced Permissions &bull; 16 Roles
        </Badge>
      </div>

      {/* Role Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {ROLES_LIST.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card/70 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              }`}
            >
              {role.label}
            </button>
          );
        })}
      </div>

      {/* Selected Role Summary */}
      {currentRoleInfo && (
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-bold">{currentRoleInfo.label}</CardTitle>
                  <CardDescription className="text-xs">{currentRoleInfo.desc}</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                ID: {currentRoleInfo.id}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Search & Filter Controls */}
      <Card className="border-border/60 bg-card/80">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permission or capability..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm bg-background"
              />
            </div>
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Permission Key</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Enforced Capability & Description</th>
                <th className="py-2.5 px-3 text-right">Status for {currentRoleInfo?.label}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {filteredPermissions.map((perm) => {
                const granted = hasPermission(selectedRole, perm.id);
                return (
                  <tr key={perm.id} className={granted ? "hover:bg-muted/30" : "bg-muted/10 opacity-70"}>
                    <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                      {perm.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-[10px]">
                        {perm.category}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {perm.description}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {granted ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <Check className="h-4 w-4" />
                          AUTHORIZED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400/80 font-mono">
                          <X className="h-4 w-4" />
                          DENIED
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
