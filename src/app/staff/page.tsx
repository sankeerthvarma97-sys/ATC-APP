import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  Activity,
  ArrowRight,
  Building,
  CheckCircle2,
  Clock,
  Compass,
  Key,
  Luggage,
  Plane,
  Radio,
  Shield,
  ShieldAlert,
  Ticket,
  Users,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function StaffOverviewPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff");
  }

  const role = user.role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "ADMIN" || role === "AIRPORT_ADMIN" || isSuperAdmin;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-[#0c1424] to-slate-900 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-cyan-500/40 bg-cyan-950/30 text-cyan-300 font-mono text-xs">
              AIRPORT OPERATIONAL CLEARANCE
            </Badge>
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/30 text-emerald-300 font-mono text-xs">
              ON DUTY
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome, {user.name}
          </h1>
          <p className="text-sm text-slate-400 font-mono">
            Role: <span className="text-cyan-300 font-semibold">{user.role}</span> | Account: <span className="text-slate-300">{user.email}</span> | Shift: <span className="text-slate-300">{user.shift || "ALL"}</span>
          </p>
        </div>

        {isAdmin && (
          <div className="shrink-0">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 hover:bg-amber-900/40 px-4 py-3 text-sm font-semibold text-amber-300 transition shadow-lg shadow-amber-950/30"
            >
              <Shield className="h-4 w-4" />
              Access Authority Control Center
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Available Operational Modules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            Authorized Operational Consoles
          </h2>
          <span className="text-xs font-mono text-slate-500">
            Dynamically resolved from RBAC directory
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* ATC Console */}
          {(isAdmin || role === "ATC" || role === "ATC_CONTROLLER" || role === "SENIOR_ATC_CONTROLLER" || role === "SIMULATOR_OPERATOR") && (
            <Card className="border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Radio className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-cyan-500/30 bg-cyan-950/20 text-cyan-300 text-[10px] font-mono">
                    AIR TRAFFIC CONTROL
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-white mt-2">ATC & Radar Station</CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Live flight radar, runway separation, heading/altitude vectors, and emergency declarations.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Link
                  href="/staff/atc"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 py-2 text-xs font-semibold text-cyan-300 transition"
                >
                  Enter ATC Console
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Ticketing Console */}
          {(isAdmin || role === "TICKETING_AGENT" || role === "PASSENGER_SERVICES" as Role || role === "SUPERVISOR") && (
            <Card className="border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-purple-500/30 bg-purple-950/20 text-purple-300 text-[10px] font-mono">
                    PASSENGER SERVICES
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-white mt-2">Ticketing & Check-in Desk</CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Create reservations, manage PNRs, assign seats, process check-in, and scan digital boarding passes.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Link
                  href="/staff/ticketing"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 py-2 text-xs font-semibold text-purple-300 transition"
                >
                  Enter Ticketing Desk
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Gate Agent Console */}
          {(isAdmin || role === "GATE_AGENT" || role === "TICKETING_AGENT") && (
            <Card className="border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Key className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-blue-500/30 bg-blue-950/20 text-blue-300 text-[10px] font-mono">
                    GATE OPS
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-white mt-2">Gate Boarding Scanner</CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Scan boarding passes, verify manifests, track zone boarding, and close departure gates.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Link
                  href="/staff/gate"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 py-2 text-xs font-semibold text-blue-300 transition"
                >
                  Open Boarding Desk
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Ground Operations Console */}
          {(isAdmin || role === "GROUND" || role === "GROUND_OPERATOR" || role === "OPERATIONS_MANAGER") && (
            <Card className="border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Luggage className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-950/20 text-amber-300 text-[10px] font-mono">
                    APRON & RAMP
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-white mt-2">Ground Operations</CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Coordinate pushback tugs, fueling trucks, aircraft marshaling, and turnaround servicing.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Link
                  href="/staff/ground"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 py-2 text-xs font-semibold text-amber-300 transition"
                >
                  Enter Ground Station
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Airline Fleet Console */}
          {(isAdmin || role === "AIRLINE_OPERATOR" || role === "FLIGHT_DISPATCHER") && (
            <Card className="border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Building className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-[10px] font-mono">
                    AIRLINE FLEET
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-white mt-2">Airline Fleet & Dispatch</CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Register airlines, inspect airframe tail numbers, file flight plans, and dispatch schedules.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Link
                  href="/staff/airline"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 py-2 text-xs font-semibold text-emerald-300 transition"
                >
                  Manage Fleet
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Security Officer Console */}
          {(isAdmin || role === "SECURITY_OFFICER") && (
            <Card className="border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-red-500/30 bg-red-950/20 text-red-300 text-[10px] font-mono">
                    AIRPORT SECURITY
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-white mt-2">Security & Verification</CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Airside credential verification, boarding pass fraud validation, and emergency lockdown.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Link
                  href="/staff/security"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 py-2 text-xs font-semibold text-red-300 transition"
                >
                  Enter Security Post
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Baggage Sorting Console */}
          {(isAdmin || role === "BAGGAGE_STAFF") && (
            <Card className="border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    <Luggage className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-teal-500/30 bg-teal-950/20 text-teal-300 text-[10px] font-mono">
                    BAGGAGE HANDLING
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-white mt-2">Baggage Sortation & Transit</CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Barcode belt sorting, aircraft loading manifests, and carousel reconciliation.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Link
                  href="/staff/baggage"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 py-2 text-xs font-semibold text-teal-300 transition"
                >
                  Open Baggage Desk
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Maintenance Console */}
          {(isAdmin || role === "MAINTENANCE_STAFF") && (
            <Card className="border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-orange-500/30 bg-orange-950/20 text-orange-300 text-[10px] font-mono">
                    AIRFIELD ENGINEERING
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-white mt-2">Runway & Airframe Maintenance</CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Runway friction checks, lighting repairs, gate jet-bridge maintenance, and tech logs.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Link
                  href="/staff/maintenance"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 py-2 text-xs font-semibold text-orange-300 transition"
                >
                  Engineering Log
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Pilot Console */}
          {(isAdmin || role === "PILOT") && (
            <Card className="border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Plane className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-sky-500/30 bg-sky-950/20 text-sky-300 text-[10px] font-mono">
                    FLIGHT CREW
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-white mt-2">Cockpit Flight Deck</CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Flight route inspection, METAR weather, waypoint coordinates, and ATC clearances.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Link
                  href="/staff/pilot"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 py-2 text-xs font-semibold text-sky-300 transition"
                >
                  Enter Flight Deck
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
