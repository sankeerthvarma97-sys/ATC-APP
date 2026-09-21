"use client";

import {
  Activity,
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  Navigation,
  Plane,
  Radio,
  Shield,
  Ticket,
  Users,
  Warehouse,
  Wind,
} from "lucide-react";
import type { AirportDTO, AirportMetrics, FlightDTO, OperationalEventDTO } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatZulu, titleCase } from "@/lib/utils";
import { AiBriefingDrawer } from "@/components/ai/ai-briefing-drawer";

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, "destructive" | "warning" | "info" | "success" | "secondary" | "outline"> = {
    EMERGENCY: "destructive",
    HOLDING: "warning",
    APPROACH: "info",
    AIRBORNE: "success",
    DEPARTING: "success",
    BOARDING: "info",
    PUSHBACK: "secondary",
    SCHEDULED: "outline",
    LANDED: "outline",
    ARRIVED: "success",
    DELAYED: "warning",
    CANCELLED: "destructive",
  };
  return <Badge variant={variant[status] || "outline"}>{titleCase(status)}</Badge>;
}

export function OverviewSection({
  flights,
  events,
  metrics,
  activeAirport,
  onNavigate,
}: {
  flights: FlightDTO[];
  events: OperationalEventDTO[];
  metrics: AirportMetrics;
  activeAirport?: AirportDTO;
  onNavigate: (sectionId: string) => void;
}) {
  const airborne = flights.filter((f) => f.altitudeFt > 0).length;
  const onGround = flights.filter((f) => f.altitudeFt === 0 && !["CANCELLED", "ARRIVED"].includes(f.status)).length;
  const delayed = flights.filter((f) => f.status === "DELAYED" || f.riskScore > 65).length;
  const emergencies = flights.filter((f) => f.status === "EMERGENCY").length;

  const topCards = [
    { title: "Active Flights", value: flights.length.toString(), detail: "Tracked in airspace", icon: Plane, section: "traffic" },
    { title: "Arrivals", value: metrics.arrivalsInWindow.toString(), detail: "Inbound stream", icon: Navigation, section: "traffic" },
    { title: "Departures", value: metrics.departuresInWindow.toString(), detail: "Outbound queue", icon: Navigation, section: "traffic" },
    { title: "Aircraft on Ground", value: onGround.toString(), detail: "Apron & taxiways", icon: Warehouse, section: "ground" },
    { title: "Aircraft Airborne", value: airborne.toString(), detail: "En-route / approach", icon: Plane, section: "traffic" },
    { title: "Available Gates", value: (metrics.availableGates ?? 18).toString(), detail: "Ready for arrival", icon: Warehouse, section: "gates" },
    { title: "Occupied Gates", value: (metrics.occupiedGates ?? 6).toString(), detail: "Turnaround active", icon: Warehouse, section: "gates" },
    { title: "Active ATC", value: (metrics.activeControllers ?? 4).toString(), detail: "Controllers on duty", icon: Radio, section: "atc" },
    { title: "Ground Staff", value: (metrics.activeGroundStaff ?? 12).toString(), detail: "Ramp & servicing", icon: Users, section: "ground" },
    { title: "Today's Bookings", value: (metrics.totalBookings ?? 28).toString(), detail: "Confirmed reservations", icon: Ticket, section: "bookings" },
    { title: "Today's Passengers", value: (metrics.todayPassengers ?? 340).toString(), detail: "Manifested travelers", icon: Users, section: "passengers" },
    { title: "Delayed Flights", value: delayed.toString(), detail: "Hold / congestion", icon: Clock, tone: delayed > 0 ? "warning" : "normal", section: "traffic" },
    { title: "Emergency Alerts", value: emergencies.toString(), detail: "Priority response", icon: AlertTriangle, tone: emergencies > 0 ? "critical" : "normal", section: "emergencies" },
  ];

  return (
    <div className="space-y-6">
      {/* 13 Top Operational Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-7">
        {topCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card
              key={c.title}
              onClick={() => onNavigate(c.section)}
              className={cn(
                "cursor-pointer border-slate-800 bg-[#090e17]/80 hover:border-sky-500/40 hover:bg-[#0c1422] transition-all",
                c.tone === "critical" && "border-red-500/50 bg-red-950/20",
                c.tone === "warning" && "border-amber-500/50 bg-amber-950/20",
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
                <CardTitle className="text-[11px] font-medium text-slate-400 truncate">{c.title}</CardTitle>
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400",
                    c.tone === "critical" && "text-red-400",
                    c.tone === "warning" && "text-amber-400",
                  )}
                />
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-xl font-bold font-mono text-slate-100">{c.value}</div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{c.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Tactical Command & Network Briefing */}
      <AiBriefingDrawer portalName="National Operations & Network Command" defaultFocus="airport" />

      {/* Main Grid: Live Traffic Preview + Airport/Staff Status + Events */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Traffic Feed (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                Live Traffic Radar Preview
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("traffic")}
              className="text-xs font-mono text-sky-400 hover:text-sky-300 hover:underline"
            >
              View All Flights →
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#090e17]/90 shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/60 font-mono text-[11px] text-slate-400 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Flight / Airline</th>
                    <th className="py-2.5 px-3">Route</th>
                    <th className="py-2.5 px-3">Alt / Spd</th>
                    <th className="py-2.5 px-3">Gate / Rwy</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {flights.slice(0, 7).map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => onNavigate("traffic")}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-100">{f.callsign}</div>
                        <div className="text-[11px] text-slate-400">{f.airline} · {f.aircraftType}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span className="text-sky-300">{f.origin}</span> → <span className="text-emerald-300">{f.destination}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <div>{f.altitudeFt.toLocaleString()} ft</div>
                        <div className="text-slate-400">{f.speedKt} kt</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <div>Gate {f.gate || "—"}</div>
                        <div className="text-slate-400">Rwy {f.runway || "—"}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={f.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Airport Operational Status Matrix */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div
              onClick={() => onNavigate("runways")}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:border-cyan-500/40 cursor-pointer transition"
            >
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                <span>Runways</span>
                <span className="text-cyan-400 font-bold">{activeAirport?.iata || "HYD"}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {activeAirport?.iata === "JFK"
                    ? "04L/22R & 13L"
                    : activeAirport?.iata === "BOM"
                    ? "09/27 Active"
                    : activeAirport?.iata === "DEL"
                    ? "10/28 & 11/29"
                    : activeAirport?.iata === "BLR"
                    ? "09L/27R Active"
                    : "09L/27R Active"}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {activeAirport?.iata === "JFK"
                  ? "CAT IIIb ILS · Wind 040/12kt"
                  : activeAirport?.iata === "BOM"
                  ? "CAT II ILS · Wind 260/14kt"
                  : activeAirport?.iata === "DEL"
                  ? "CAT IIIb ILS · Wind 290/06kt"
                  : "CAT IIIb ILS · Wind 090/08kt"}
              </div>
            </div>

            <div
              onClick={() => onNavigate("atc")}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:border-cyan-500/40 cursor-pointer transition"
            >
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                <span>ATC Tower</span>
                <span className="text-sky-400 font-bold">RADAR</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                <Radio className="h-3.5 w-3.5" />
                <span>Station Operational</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {metrics.activeControllers ?? 4} Controllers Active · Airspace Clear
              </div>
            </div>

            <div
              onClick={() => onNavigate("ground")}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:border-cyan-500/40 cursor-pointer transition"
            >
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                <span>Ground Control</span>
                <span className="text-emerald-400 font-bold">RAMP</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Apron Clear</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {metrics.availableGates ?? 18} Gates Free · {metrics.occupiedGates ?? 6} Occupied
              </div>
            </div>

            <div
              onClick={() => onNavigate("weather")}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:border-cyan-500/40 cursor-pointer transition"
            >
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                <span>Weather</span>
                <span className="text-amber-400 font-bold">METAR</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Wind className="h-3.5 w-3.5 text-sky-400" />
                <span>CAVOK · {activeAirport?.city || "Station"}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                QNH 1013 · Elev {activeAirport?.elevationFt ?? 2024}ft · Vis 10km+
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Staff Status + System Events */}
        <div className="space-y-6">
          {/* Staff Status Card */}
          <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Staffing & Deployment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("staff")}
                className="text-[11px] font-mono text-sky-400 hover:underline"
              >
                Manage Staff →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="rounded border border-slate-800/80 bg-slate-900/60 p-2">
                <div className="text-slate-400 text-[10px]">ON-DUTY STAFF</div>
                <div className="text-lg font-bold text-emerald-400">18</div>
              </div>
              <div className="rounded border border-slate-800/80 bg-slate-900/60 p-2">
                <div className="text-slate-400 text-[10px]">VERIFIED CREW</div>
                <div className="text-lg font-bold text-sky-400">24</div>
              </div>
              <div className="rounded border border-slate-800/80 bg-slate-900/60 p-2">
                <div className="text-slate-400 text-[10px]">PENDING VERIFICATION</div>
                <div className="text-lg font-bold text-amber-400">1</div>
              </div>
              <div className="rounded border border-slate-800/80 bg-slate-900/60 p-2">
                <div className="text-slate-400 text-[10px]">SUSPENDED / OFFLINE</div>
                <div className="text-lg font-bold text-slate-400">0</div>
              </div>
            </div>
          </div>

          {/* System Events Feed */}
          <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  System Events
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("audit")}
                className="text-[11px] font-mono text-sky-400 hover:underline"
              >
                Audit Log →
              </button>
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 text-xs">
              {events.slice(0, 8).map((evt) => (
                <div
                  key={evt.id}
                  className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-2.5 transition-colors hover:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-200 truncate">{evt.title}</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                      {formatZulu(evt.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{evt.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
