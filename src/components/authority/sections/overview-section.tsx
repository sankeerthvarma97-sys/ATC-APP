"use client";

import { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building,
  CheckCircle2,
  Clock,
  Filter,
  Gauge,
  Globe,
  Layers,
  Navigation,
  Plane,
  PlaneTakeoff,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Ticket,
  TrendingDown,
  TrendingUp,
  Users,
  Warehouse,
  Wind,
  Zap,
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

// 5 Core Indian & International Simulation Carriers
const PRIMARY_CARRIERS = [
  {
    id: "skyconnect",
    name: "SkyConnect Airlines",
    iata: "SC",
    icao: "SKY",
    badge: "SC · SKY",
    accentColor: "#38bdf8",
    bgGradient: "from-sky-950/40 via-sky-900/20 to-transparent",
    borderColor: "border-sky-500/30",
    textColor: "text-sky-400",
  },
  {
    id: "aerovista",
    name: "AeroVista",
    iata: "AV",
    icao: "AVS",
    badge: "AV · AVS",
    accentColor: "#34d399",
    bgGradient: "from-emerald-950/40 via-emerald-900/20 to-transparent",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-400",
  },
  {
    id: "bluehorizon",
    name: "Blue Horizon Air",
    iata: "BH",
    icao: "BHA",
    badge: "BH · BHA",
    accentColor: "#818cf8",
    bgGradient: "from-indigo-950/40 via-indigo-900/20 to-transparent",
    borderColor: "border-indigo-500/30",
    textColor: "text-indigo-400",
  },
  {
    id: "nova",
    name: "Nova Airways",
    iata: "NV",
    icao: "NVA",
    badge: "NV · NVA",
    accentColor: "#fbbf24",
    bgGradient: "from-amber-950/40 via-amber-900/20 to-transparent",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400",
  },
  {
    id: "indiansky",
    name: "IndianSky Airlines",
    iata: "IS",
    icao: "ISK",
    badge: "IS · ISK",
    accentColor: "#fb7185",
    bgGradient: "from-rose-950/40 via-rose-900/20 to-transparent",
    borderColor: "border-rose-500/30",
    textColor: "text-rose-400",
  },
];

// FIR & Airspace Sector Reference Profiles
const SECTOR_PROFILES: Record<
  string,
  {
    fir: string;
    firName: string;
    capacity: number;
    tmaFreq: string;
    rwyCap: string;
    holdWaypoint: string;
    arrivalRate: number;
    departureRate: number;
  }
> = {
  HYD: {
    fir: "VOMF",
    firName: "Chennai FIR / Hyderabad Sector",
    capacity: 42,
    tmaFreq: "119.200 MHz",
    rwyCap: "46 mvts/hr",
    holdWaypoint: "BOPOL",
    arrivalRate: 24,
    departureRate: 22,
  },
  BOM: {
    fir: "VABF",
    firName: "Mumbai FIR / Control Area",
    capacity: 50,
    tmaFreq: "120.500 MHz",
    rwyCap: "52 mvts/hr",
    holdWaypoint: "MUM",
    arrivalRate: 28,
    departureRate: 24,
  },
  DEL: {
    fir: "VIDF",
    firName: "Delhi FIR / Northern Sector",
    capacity: 56,
    tmaFreq: "125.900 MHz",
    rwyCap: "58 mvts/hr",
    holdWaypoint: "DRA",
    arrivalRate: 30,
    departureRate: 28,
  },
  BLR: {
    fir: "VOMF",
    firName: "Chennai FIR / Bangalore Sector",
    capacity: 44,
    tmaFreq: "118.800 MHz",
    rwyCap: "48 mvts/hr",
    holdWaypoint: "VIKRAM",
    arrivalRate: 25,
    departureRate: 23,
  },
  MAA: {
    fir: "VOMF",
    firName: "Chennai FIR / Coastal Sector",
    capacity: 38,
    tmaFreq: "124.900 MHz",
    rwyCap: "40 mvts/hr",
    holdWaypoint: "IDASO",
    arrivalRate: 20,
    departureRate: 20,
  },
  JFK: {
    fir: "KZNY",
    firName: "New York ARTCC / Area Sector",
    capacity: 62,
    tmaFreq: "128.300 MHz",
    rwyCap: "64 mvts/hr",
    holdWaypoint: "ROBER",
    arrivalRate: 34,
    departureRate: 30,
  },
};

type ViewTab = "tactical" | "otp" | "carriers" | "sectors";

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
  const [activeTab, setActiveTab] = useState<ViewTab>("tactical");
  const [selectedCarrierFilter, setSelectedCarrierFilter] = useState<string | null>(null);
  const [trafficSearch, setTrafficSearch] = useState<string>("");
  const [trafficCategory, setTrafficCategory] = useState<"all" | "airborne" | "ground" | "delayed">("all");

  const stationCode = activeAirport?.iata || "HYD";
  const sectorInfo = SECTOR_PROFILES[stationCode] || SECTOR_PROFILES.HYD;

  // Flight classification metrics
  const airborne = flights.filter((f) => f.altitudeFt > 0).length;
  const onGround = flights.filter((f) => f.altitudeFt === 0 && !["CANCELLED", "ARRIVED"].includes(f.status)).length;
  const delayedFlights = flights.filter((f) => f.status === "DELAYED" || f.riskScore > 65);
  const delayed = delayedFlights.length;
  const emergencies = flights.filter((f) => f.status === "EMERGENCY" || f.squawk === "7700" || f.squawk === "7600");
  const holdingFlights = flights.filter((f) => f.status === "HOLDING");

  // On-Time Performance (OTP) Engine
  const otpStats = useMemo(() => {
    const totalCount = flights.length;
    if (totalCount === 0) {
      return {
        otdRate: 95,
        otaRate: 92,
        slotCompliance: 98,
        avgDelayMin: 4,
        avgTurnaroundMin: 36,
        turnaroundBenchMin: 45,
        delayCauses: [
          { name: "Convective Weather & Wind", pct: 38, count: 0 },
          { name: "ATFM En-Route Spacing", pct: 30, count: 0 },
          { name: "Ground Turnaround & Ramp", pct: 20, count: 0 },
          { name: "Technical & Rotation Hold", pct: 12, count: 0 },
        ],
      };
    }

    const onTimeDepartures = flights.filter(
      (f) => f.status !== "DELAYED" && f.riskScore <= 65 && f.status !== "EMERGENCY",
    ).length;
    const otd = Math.min(100, Math.max(68, Math.round((onTimeDepartures / totalCount) * 100)));
    const ota = Math.min(100, Math.max(65, otd - 3));
    const slot = Math.min(99, Math.max(85, 100 - delayed * 2));
    const avgDelay = delayed > 0 ? Math.round(delayedFlights.reduce((acc, f) => acc + Math.max(12, f.riskScore * 0.4), 0) / delayed) : 4;
    const avgTurnaround = 36; // Benchmark standard ground dwell

    return {
      otdRate: otd,
      otaRate: ota,
      slotCompliance: slot,
      avgDelayMin: avgDelay,
      avgTurnaroundMin: avgTurnaround,
      turnaroundBenchMin: 45,
      delayCauses: [
        { name: "Convective Weather & Wind", pct: 38, count: Math.ceil(delayed * 0.38) },
        { name: "ATFM En-Route Spacing", pct: 30, count: Math.ceil(delayed * 0.3) },
        { name: "Ground Turnaround & Ramp", pct: 20, count: Math.ceil(delayed * 0.2) },
        { name: "Technical & Rotation Hold", pct: 12, count: Math.max(0, delayed - Math.ceil(delayed * 0.88)) },
      ],
    };
  }, [flights, delayed, delayedFlights]);

  // Carrier Dispatch & Fleet Matrix
  const carrierMatrix = useMemo(() => {
    return PRIMARY_CARRIERS.map((c) => {
      const cFlights = flights.filter((f) => {
        const cs = (f.callsign || "").toUpperCase();
        const al = (f.airline || "").toLowerCase();
        return cs.startsWith(c.iata) || cs.startsWith(c.icao) || al.includes(c.name.toLowerCase().split(" ")[0]);
      });

      const total = cFlights.length;
      const cAirborne = cFlights.filter((f) => f.altitudeFt > 0).length;
      const cGround = cFlights.filter((f) => f.altitudeFt === 0 && !["CANCELLED", "ARRIVED"].includes(f.status)).length;
      const cDelayed = cFlights.filter((f) => f.status === "DELAYED" || f.riskScore > 65).length;
      const onTimeRate = total > 0 ? Math.min(100, Math.max(60, Math.round(((total - cDelayed) / total) * 100))) : 96;
      const avgDelay = cDelayed > 0 ? 18 : 3;

      let grade = "A+";
      if (onTimeRate < 75) grade = "B";
      else if (onTimeRate < 85) grade = "B+";
      else if (onTimeRate < 92) grade = "A-";
      else if (onTimeRate < 96) grade = "A";

      return {
        ...c,
        total,
        airborne: cAirborne,
        onGround: cGround,
        delayed: cDelayed,
        onTimeRate,
        avgDelay,
        grade,
        flights: cFlights,
      };
    });
  }, [flights]);

  // Sector Load & Capacity Telemetry
  const sectorLoad = useMemo(() => {
    const stationFlights = flights.filter(
      (f) =>
        f.origin === stationCode ||
        f.destination === stationCode ||
        f.origin === activeAirport?.icao ||
        f.destination === activeAirport?.icao,
    );
    const activeCount = Math.max(stationFlights.length, airborne > 0 ? Math.ceil(airborne * 0.6) : 6);
    const loadPct = Math.min(100, Math.round((activeCount / sectorInfo.capacity) * 100));

    let congestionStatus: { label: string; tone: "success" | "info" | "warning" | "destructive" } = {
      label: "NOMINAL FLOW",
      tone: "success",
    };
    if (loadPct >= 92) {
      congestionStatus = { label: "SATURATED / SLOTS ACTIVE", tone: "destructive" };
    } else if (loadPct >= 80) {
      congestionStatus = { label: "HIGH VOLUME REGULATION", tone: "warning" };
    } else if (loadPct >= 65) {
      congestionStatus = { label: "OPTIMAL OPERATIONS", tone: "info" };
    }

    return {
      activeCount,
      loadPct,
      congestionStatus,
      stationFlights,
    };
  }, [flights, stationCode, activeAirport, airborne, sectorInfo]);

  // Filtered live traffic preview
  const filteredTraffic = useMemo(() => {
    return flights.filter((f) => {
      // Carrier filter
      if (selectedCarrierFilter) {
        const carrier = PRIMARY_CARRIERS.find((c) => c.id === selectedCarrierFilter);
        if (carrier) {
          const cs = (f.callsign || "").toUpperCase();
          const al = (f.airline || "").toLowerCase();
          const matches = cs.startsWith(carrier.iata) || cs.startsWith(carrier.icao) || al.includes(carrier.name.toLowerCase().split(" ")[0]);
          if (!matches) return false;
        }
      }

      // Category filter
      if (trafficCategory === "airborne" && f.altitudeFt === 0) return false;
      if (trafficCategory === "ground" && (f.altitudeFt > 0 || ["CANCELLED", "ARRIVED"].includes(f.status))) return false;
      if (trafficCategory === "delayed" && f.status !== "DELAYED" && f.riskScore <= 65) return false;

      // Text search
      if (trafficSearch.trim()) {
        const q = trafficSearch.toLowerCase().trim();
        const text = `${f.callsign} ${f.airline} ${f.origin} ${f.destination} ${f.aircraftType} ${f.gate || ""} ${f.runway || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [flights, selectedCarrierFilter, trafficCategory, trafficSearch]);

  // 14 Top Operational Summary Cards
  const topCards = [
    { title: "Active Flights", value: flights.length.toString(), detail: "Tracked in airspace", icon: Plane, section: "traffic" },
    { title: "Arrivals", value: metrics.arrivalsInWindow.toString(), detail: "Inbound stream", icon: Navigation, section: "traffic" },
    { title: "Departures", value: metrics.departuresInWindow.toString(), detail: "Outbound queue", icon: PlaneTakeoff, section: "traffic" },
    { title: "On Ground", value: onGround.toString(), detail: "Apron & taxiways", icon: Warehouse, section: "ground" },
    { title: "Airborne", value: airborne.toString(), detail: "En-route / approach", icon: Plane, section: "traffic" },
    { title: "Network OTP", value: `${otpStats.otdRate}%`, detail: "On-time departures", icon: Clock, tone: otpStats.otdRate >= 90 ? "normal" : "warning", section: "analytics" },
    { title: "Avg Delay", value: `${otpStats.avgDelayMin}m`, detail: "Network variance", icon: Activity, section: "analytics" },
    { title: "Available Gates", value: (metrics.availableGates ?? 18).toString(), detail: "Ready for arrival", icon: Warehouse, section: "gates" },
    { title: "Occupied Gates", value: (metrics.occupiedGates ?? 6).toString(), detail: "Turnaround active", icon: Warehouse, section: "gates" },
    { title: "Active ATC", value: (metrics.activeControllers ?? 4).toString(), detail: "Controllers on duty", icon: Radio, section: "atc" },
    { title: "Turnaround", value: `${otpStats.avgTurnaroundMin}m`, detail: "Avg dwell vs 45m", icon: Clock, section: "ground" },
    { title: "Today's Bookings", value: (metrics.totalBookings ?? 28).toString(), detail: "Confirmed reservations", icon: Ticket, section: "bookings" },
    { title: "Delayed Flights", value: delayed.toString(), detail: "Hold / congestion", icon: Clock, tone: delayed > 0 ? "warning" : "normal", section: "traffic" },
    { title: "Emergency Alerts", value: emergencies.length.toString(), detail: "Priority response", icon: AlertTriangle, tone: emergencies.length > 0 ? "critical" : "normal", section: "emergencies" },
  ];

  return (
    <div className="space-y-6">
      {/* National Command Center Top Header & Mode Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#090e17]/95 p-4 shadow-xl backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-950/40 text-sky-400 shadow-inner">
            <Globe className="h-5 w-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold uppercase tracking-wider text-slate-100">
                National Airspace Operations Command
              </h1>
              <Badge variant="outline" className="border-sky-500/40 bg-sky-950/30 font-mono text-[10px] text-sky-300">
                AOCC · LIVE
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span className="text-cyan-400 font-semibold">{stationCode} Hub</span>
              <span>·</span>
              <span>{sectorInfo.fir} FIR</span>
              <span>·</span>
              <span>{formatZulu(new Date().toISOString())}</span>
              <span>·</span>
              <span className="text-emerald-400">All Sectors Operational</span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 p-1 font-mono text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("tactical")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all shrink-0",
              activeTab === "tactical"
                ? "bg-sky-500 text-slate-950 shadow-md font-semibold"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Tactical Deck</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("otp")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all shrink-0",
              activeTab === "otp"
                ? "bg-sky-500 text-slate-950 shadow-md font-semibold"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>OTP Analytics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("carriers")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all shrink-0",
              activeTab === "carriers"
                ? "bg-sky-500 text-slate-950 shadow-md font-semibold"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
            )}
          >
            <Plane className="h-3.5 w-3.5" />
            <span>Carrier Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sectors")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all shrink-0",
              activeTab === "sectors"
                ? "bg-sky-500 text-slate-950 shadow-md font-semibold"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
            )}
          >
            <Gauge className="h-3.5 w-3.5" />
            <span>Sector Load</span>
          </button>
        </div>
      </div>

      {/* Critical Emergency Banner if Squawk 7700 or EMERGENCY Active */}
      {emergencies.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/50 bg-red-950/40 p-4 text-red-200 shadow-lg backdrop-blur-md animate-pulse">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-red-400 shrink-0" />
            <div>
              <div className="font-bold text-sm tracking-wide text-red-100 font-mono">
                SQUAWK 7700 / PRIORITY EMERGENCY BROADCAST ACTIVE ({emergencies.length} Aircraft)
              </div>
              <div className="text-xs text-red-300 mt-0.5">
                Immediate ATC radar vectoring and crash-fire rescue (CFR) alert protocol engaged for:{" "}
                {emergencies.map((e) => `${e.callsign} (${e.phase})`).join(", ")}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("emergencies")}
            className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition shrink-0 font-mono shadow"
          >
            Emergency Command →
          </button>
        </div>
      )}

      {/* 14 High-Density Operational Summary Cards */}
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

      {/* TAB 1: TACTICAL COMMAND DECK */}
      {activeTab === "tactical" && (
        <div className="space-y-6">
          {/* Dual Spotlight: Live OTP Performance & Aerodrome Sector Load */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Spotlight 1: Network On-Time Performance (OTP) Engine */}
            <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-4 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Network On-Time Performance (OTP)
                  </h3>
                </div>
                <Badge variant="outline" className="border-cyan-500/30 bg-cyan-950/30 text-cyan-300 font-mono text-[10px]">
                  STANDARD &le; 15m
                </Badge>
              </div>

              {/* OTP Key Rates */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-2.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">On-Time Dep (OTD)</div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-mono text-cyan-400">{otpStats.otdRate}%</span>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                      style={{ width: `${otpStats.otdRate}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-2.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">On-Time Arr (OTA)</div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-mono text-emerald-400">{otpStats.otaRate}%</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${otpStats.otaRate}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-2.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Slot Adherence</div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-mono text-sky-400">{otpStats.slotCompliance}%</span>
                    <Zap className="h-3.5 w-3.5 text-sky-400" />
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-sky-400 transition-all duration-500"
                      style={{ width: `${otpStats.slotCompliance}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Delay Attribution Progress Bars */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>ATFM & OPERATIONAL DELAY ATTRIBUTION</span>
                  <span>{delayed} Delayed Movements</span>
                </div>
                <div className="space-y-1.5">
                  {otpStats.delayCauses.map((c) => (
                    <div key={c.name} className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-mono text-slate-300">
                        <span className="truncate">{c.name}</span>
                        <span className="text-slate-400 font-semibold">{c.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                        <div
                          className="h-full rounded-full bg-slate-500 transition-all"
                          style={{
                            width: `${c.pct}%`,
                            backgroundColor:
                              c.pct > 35 ? "#38bdf8" : c.pct > 25 ? "#818cf8" : c.pct > 15 ? "#fbbf24" : "#94a3b8",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Spotlight 2: Aerodrome Sector Load & Capacity Gauge */}
            <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-4 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Sector Load & Capacity Gauge · {stationCode} Hub
                  </h3>
                </div>
                <Badge
                  variant={
                    sectorLoad.congestionStatus.tone === "destructive"
                      ? "destructive"
                      : sectorLoad.congestionStatus.tone === "warning"
                      ? "warning"
                      : "outline"
                  }
                  className="font-mono text-[10px]"
                >
                  {sectorLoad.congestionStatus.label}
                </Badge>
              </div>

              {/* Capacity Meter Bar */}
              <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3 space-y-2">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-400">Sector Traffic Density</span>
                  <span className="font-bold text-slate-100">
                    <span className="text-cyan-400">{sectorLoad.activeCount}</span> / {sectorInfo.capacity} Movements ({sectorLoad.loadPct}%)
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      sectorLoad.loadPct > 90
                        ? "bg-rose-500"
                        : sectorLoad.loadPct > 75
                        ? "bg-amber-400"
                        : "bg-emerald-400",
                    )}
                    style={{ width: `${sectorLoad.loadPct}%` }}
                  />
                  {/* Target markers */}
                  <div className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-slate-900/80" />
                  <div className="absolute top-0 bottom-0 left-[90%] w-0.5 bg-slate-900/80" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Nominal (0-75%)</span>
                  <span>Regulated (75-90%)</span>
                  <span>Saturated (90%+)</span>
                </div>
              </div>

              {/* Aerodrome Throughput & Subsystem Rates */}
              <div className="grid grid-cols-3 gap-2.5 font-mono text-xs">
                <div className="rounded border border-slate-800/80 bg-slate-900/40 p-2">
                  <div className="text-[10px] text-slate-400 uppercase">Runway Cap</div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">{sectorInfo.rwyCap}</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">CAT IIIb Ready</div>
                </div>

                <div className="rounded border border-slate-800/80 bg-slate-900/40 p-2">
                  <div className="text-[10px] text-slate-400 uppercase">TMA Acceptance</div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">{sectorInfo.arrivalRate} Arr/hr</div>
                  <div className="text-[10px] text-sky-400 mt-0.5">{sectorInfo.tmaFreq}</div>
                </div>

                <div className="rounded border border-slate-800/80 bg-slate-900/40 p-2">
                  <div className="text-[10px] text-slate-400 uppercase">Holding Stack</div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">{holdingFlights.length} Holding</div>
                  <div className="text-[10px] text-amber-400 mt-0.5">Fix: {sectorInfo.holdWaypoint}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Carrier Dispatch & Fleet Performance Matrix (Top 5 Carriers) */}
          <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Carrier Dispatch & Fleet Performance Matrix
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("carriers")}
                className="text-[11px] font-mono text-sky-400 hover:text-sky-300 hover:underline"
              >
                Deep Matrix →
              </button>
            </div>

            {/* Carriers Horizontal Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {carrierMatrix.map((carrier) => {
                const isSelected = selectedCarrierFilter === carrier.id;
                return (
                  <div
                    key={carrier.id}
                    onClick={() => setSelectedCarrierFilter(isSelected ? null : carrier.id)}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3 transition-all",
                      carrier.borderColor,
                      "bg-slate-900/60 hover:bg-slate-800/60",
                      isSelected && "ring-2 ring-sky-400 bg-slate-800/90",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-200 truncate">
                        {carrier.name}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] font-mono font-bold", carrier.textColor)}>
                        {carrier.badge}
                      </Badge>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Active / Total</div>
                        <div className="text-sm font-bold text-slate-100">
                          {carrier.airborne + carrier.onGround} <span className="text-[10px] text-slate-400">({carrier.total})</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">OTP Rate</div>
                        <div className={cn("text-sm font-bold", carrier.textColor)}>
                          {carrier.onTimeRate}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-slate-800/60 pt-2 text-[10px] font-mono text-slate-400">
                      <span>Air: {carrier.airborne} · Gnd: {carrier.onGround}</span>
                      <span className="font-semibold text-emerald-400">Grade {carrier.grade}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedCarrierFilter && (
              <div className="flex items-center justify-between rounded border border-sky-500/30 bg-sky-950/20 px-3 py-1.5 text-xs font-mono text-sky-300">
                <span>Filtering live radar by: {carrierMatrix.find((c) => c.id === selectedCarrierFilter)?.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCarrierFilter(null)}
                  className="text-slate-400 hover:text-white underline text-[11px]"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>

          {/* Main Grid: Live Traffic Preview + Operations Status + System Events */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Live Traffic Feed (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-sky-400" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                    Live Airspace Radar Preview
                  </h2>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search callsign, route..."
                      value={trafficSearch}
                      onChange={(e) => setTrafficSearch(e.target.value)}
                      className="rounded-md border border-slate-800 bg-slate-900/80 pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none w-44 font-mono"
                    />
                  </div>

                  <div className="flex items-center rounded-md border border-slate-800 bg-slate-900/80 p-0.5 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setTrafficCategory("all")}
                      className={cn(
                        "rounded px-2 py-0.5 transition",
                        trafficCategory === "all" ? "bg-sky-500 text-slate-950 font-semibold" : "text-slate-400 hover:text-slate-200",
                      )}
                    >
                      All ({flights.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrafficCategory("airborne")}
                      className={cn(
                        "rounded px-2 py-0.5 transition",
                        trafficCategory === "airborne" ? "bg-sky-500 text-slate-950 font-semibold" : "text-slate-400 hover:text-slate-200",
                      )}
                    >
                      Air ({airborne})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrafficCategory("ground")}
                      className={cn(
                        "rounded px-2 py-0.5 transition",
                        trafficCategory === "ground" ? "bg-sky-500 text-slate-950 font-semibold" : "text-slate-400 hover:text-slate-200",
                      )}
                    >
                      Gnd ({onGround})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrafficCategory("delayed")}
                      className={cn(
                        "rounded px-2 py-0.5 transition",
                        trafficCategory === "delayed" ? "bg-amber-500 text-slate-950 font-semibold" : "text-slate-400 hover:text-slate-200",
                      )}
                    >
                      Dly ({delayed})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate("traffic")}
                    className="text-xs font-mono text-sky-400 hover:text-sky-300 hover:underline shrink-0"
                  >
                    Radar Fullscreen →
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#090e17]/90 shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-900/60 font-mono text-[11px] text-slate-400 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Flight / Carrier</th>
                        <th className="py-2.5 px-3">Route</th>
                        <th className="py-2.5 px-3">Alt / Spd</th>
                        <th className="py-2.5 px-3">Squawk</th>
                        <th className="py-2.5 px-3">Gate / Rwy</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {filteredTraffic.slice(0, 8).map((f) => (
                        <tr
                          key={f.id}
                          onClick={() => onNavigate("traffic")}
                          className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-100 font-mono">{f.callsign}</div>
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
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5",
                                f.squawk === "7700" ? "bg-red-500/20 text-red-400 font-bold" : "text-slate-300",
                              )}
                            >
                              {f.squawk || "1200"}
                            </span>
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
                      {filteredTraffic.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-500 font-mono text-xs">
                            No flights match the current query and filters.
                          </td>
                        </tr>
                      )}
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
                    <span className="text-cyan-400 font-bold">{stationCode}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>09L/27R Active</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    CAT IIIb ILS · Wind 090/08kt
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
                      Live Incident & System Events
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
                  {events.length === 0 && (
                    <div className="py-4 text-center text-slate-500 font-mono text-xs">
                      No critical system events recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OTP & PUNCTUALITY ANALYTICS */}
      {activeTab === "otp" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left 2 Cols: Deep OTP Analytics & Delay Metrics */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                      National Flight Punctuality & Turnaround Index
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Departure and arrival punctuality tracked against standard 15-minute tolerance windows
                    </p>
                  </div>
                  <Badge variant="outline" className="border-sky-500/30 bg-sky-950/30 text-sky-300 font-mono text-xs">
                    IATA A-15 STANDARD
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <div className="text-[11px] font-mono text-slate-400 uppercase">On-Time Departure</div>
                    <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{otpStats.otdRate}%</div>
                    <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> +1.8% vs yesterday
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <div className="text-[11px] font-mono text-slate-400 uppercase">On-Time Arrival</div>
                    <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{otpStats.otaRate}%</div>
                    <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> +0.9% vs benchmark
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <div className="text-[11px] font-mono text-slate-400 uppercase">Average Delay</div>
                    <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{otpStats.avgDelayMin}m</div>
                    <div className="text-[10px] text-slate-400 mt-1">Across {delayed} delayed flights</div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <div className="text-[11px] font-mono text-slate-400 uppercase">Ground Turnaround</div>
                    <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">{otpStats.avgTurnaroundMin}m</div>
                    <div className="text-[10px] text-cyan-400 mt-1">Target: {otpStats.turnaroundBenchMin}m dwell</div>
                  </div>
                </div>

                {/* Delay Root-Cause Analysis Table */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                    Delay Root-Cause Attribution & Flow Management
                  </h4>
                  <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-800 bg-slate-900/80 font-mono text-[10px] text-slate-400 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Attribution Category</th>
                          <th className="py-2.5 px-3">Share (%)</th>
                          <th className="py-2.5 px-3">Impact Level</th>
                          <th className="py-2.5 px-3">Mitigation Protocol</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-200">Weather / Convective Turbulence</td>
                          <td className="py-2 px-3 text-cyan-400">38%</td>
                          <td className="py-2 px-3"><Badge variant="warning" className="text-[9px]">MODERATE</Badge></td>
                          <td className="py-2 px-3 text-slate-400">Dynamic reroute & alt holding stacks</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-200">ATFM En-Route Spacing & Flow</td>
                          <td className="py-2 px-3 text-indigo-400">30%</td>
                          <td className="py-2 px-3"><Badge variant="info" className="text-[9px]">MANAGED</Badge></td>
                          <td className="py-2 px-3 text-slate-400">Collaborative Trajectory Options (CTOP)</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-200">Ground Apron & Turnaround Dwell</td>
                          <td className="py-2 px-3 text-amber-400">20%</td>
                          <td className="py-2 px-3"><Badge variant="warning" className="text-[9px]">MONITORED</Badge></td>
                          <td className="py-2 px-3 text-slate-400">Pre-departure pushback sequencing queue</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-200">Maintenance & Technical Inspections</td>
                          <td className="py-2 px-3 text-rose-400">12%</td>
                          <td className="py-2 px-3"><Badge variant="outline" className="text-[9px]">LOW</Badge></td>
                          <td className="py-2 px-3 text-slate-400">Spare aircraft tail-swap dispatch</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Station Benchmark Comparison */}
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-5 shadow-lg space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                    Major Hub Benchmark Comparison
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Network OTP comparison across key aerodromes</p>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {[
                    { hub: "HYD", name: "Hyderabad RGIA", otp: 95.2, delay: "3.8m", status: "Optimal" },
                    { hub: "BLR", name: "Bangalore Kempegowda", otp: 93.6, delay: "4.2m", status: "Optimal" },
                    { hub: "MAA", name: "Chennai International", otp: 94.1, delay: "3.9m", status: "Optimal" },
                    { hub: "DEL", name: "Delhi Indira Gandhi", otp: 90.8, delay: "6.4m", status: "Regulated" },
                    { hub: "BOM", name: "Mumbai Chhatrapati Shivaji", otp: 88.4, delay: "8.1m", status: "Dense" },
                    { hub: "JFK", name: "New York Kennedy", otp: 86.5, delay: "9.2m", status: "Heavy" },
                  ].map((h) => (
                    <div
                      key={h.hub}
                      className={cn(
                        "rounded-lg border p-2.5 transition",
                        h.hub === stationCode
                          ? "border-cyan-500/50 bg-cyan-950/20"
                          : "border-slate-800/80 bg-slate-900/40",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">
                          {h.hub} · {h.name}
                        </span>
                        <span className="font-bold text-cyan-400">{h.otp}%</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Avg Delay: {h.delay}</span>
                        <span className={h.otp >= 92 ? "text-emerald-400" : "text-amber-400"}>{h.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CARRIER DISPATCH MATRIX */}
      {activeTab === "carriers" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                  National Carrier Dispatch & Fleet Performance Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete operational telemetry across SkyConnect, AeroVista, Blue Horizon, Nova, and IndianSky
                </p>
              </div>
              <Badge variant="outline" className="border-sky-500/30 bg-sky-950/30 text-sky-300 font-mono text-xs">
                5 AIRLINES TRACKED
              </Badge>
            </div>

            {/* Carrier Detailed Cards */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              {carrierMatrix.map((carrier) => (
                <div
                  key={carrier.id}
                  className={cn(
                    "rounded-xl border p-4 space-y-3 bg-slate-900/60 shadow-lg",
                    carrier.borderColor,
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-100 font-mono">{carrier.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{carrier.badge}</div>
                    </div>
                    <Badge variant="outline" className={cn("text-xs font-mono font-bold", carrier.textColor)}>
                      Grade {carrier.grade}
                    </Badge>
                  </div>

                  <div className="space-y-2 rounded-lg border border-slate-800/80 bg-slate-900/80 p-2.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">On-Time Rate</span>
                      <span className={cn("font-bold", carrier.textColor)}>{carrier.onTimeRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active Fleet</span>
                      <span className="text-slate-200">{carrier.airborne + carrier.onGround} Aircraft</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Airborne</span>
                      <span className="text-sky-300">{carrier.airborne} Flights</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">On Ground</span>
                      <span className="text-emerald-300">{carrier.onGround} Aircraft</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Delayed</span>
                      <span className={carrier.delayed > 0 ? "text-amber-400 font-bold" : "text-slate-400"}>
                        {carrier.delayed}
                      </span>
                    </div>
                  </div>

                  {/* Active Flight Callouts */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Assigned Movements:</div>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {carrier.flights.slice(0, 4).map((f) => (
                        <div
                          key={f.id}
                          onClick={() => onNavigate("traffic")}
                          className="flex items-center justify-between rounded border border-slate-800/60 bg-slate-900/40 px-2 py-1 text-[11px] font-mono hover:bg-slate-800/60 cursor-pointer"
                        >
                          <span className="font-semibold text-slate-200">{f.callsign}</span>
                          <span className="text-[10px] text-slate-400">{f.origin}&rarr;{f.destination}</span>
                        </div>
                      ))}
                      {carrier.flights.length === 0 && (
                        <div className="text-[10px] text-slate-500 font-mono py-1">No active movements.</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SECTOR CAPACITY & AIRSPACE FLOW */}
      {activeTab === "sectors" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Sector Deep Dive (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono">
                      {sectorInfo.fir} · {sectorInfo.firName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Air Traffic Management (ATM) sector workload, capacity envelopes, and acceptance rates
                    </p>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/30 text-emerald-300 font-mono text-xs">
                    RADAR SEPARATION: 5NM / 1000FT
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <div className="text-[10px] text-slate-400 uppercase">Sector Capacity Limit</div>
                    <div className="text-2xl font-bold text-slate-100 mt-1">{sectorInfo.capacity}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Aircraft / sector window</div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <div className="text-[10px] text-slate-400 uppercase">Current Sector Load</div>
                    <div className="text-2xl font-bold text-cyan-400 mt-1">{sectorLoad.activeCount}</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">{sectorLoad.loadPct}% Utilization</div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <div className="text-[10px] text-slate-400 uppercase">TMA Control Freq</div>
                    <div className="text-2xl font-bold text-sky-400 mt-1">{sectorInfo.tmaFreq.split(" ")[0]}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Primary Voice Channel</div>
                  </div>
                </div>

                {/* Multi-Sector Comparison */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                    National FIR & Airspace Sector Registry
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Object.entries(SECTOR_PROFILES).map(([iata, s]) => (
                      <div
                        key={iata}
                        className={cn(
                          "rounded-lg border p-3 font-mono text-xs transition",
                          iata === stationCode
                            ? "border-cyan-500/50 bg-cyan-950/20"
                            : "border-slate-800/80 bg-slate-900/50",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">
                            {iata} · {s.fir}
                          </span>
                          <span className="text-cyan-400 font-semibold">{s.capacity} Max Mvts</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 truncate">{s.firName}</div>
                        <div className="mt-2 flex items-center justify-between border-t border-slate-800/60 pt-2 text-[10px] text-slate-400">
                          <span>Hold Fix: {s.holdWaypoint}</span>
                          <span className="text-emerald-400">Rate: {s.arrivalRate} Arr / {s.departureRate} Dep</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Holding Stacks & Airspace Holding Monitor */}
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                      Airspace Holding Patterns
                    </h3>
                  </div>
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-950/30 text-amber-300 font-mono text-xs">
                    {holdingFlights.length} IN HOLD
                  </Badge>
                </div>

                <div className="space-y-2.5 font-mono text-xs">
                  {holdingFlights.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => onNavigate("traffic")}
                      className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 hover:bg-amber-950/30 cursor-pointer transition"
                    >
                      <div className="flex items-center justify-between font-bold text-amber-300">
                        <span>{h.callsign}</span>
                        <span>{h.altitudeFt.toLocaleString()} FT</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Fix: {sectorInfo.holdWaypoint}</span>
                        <span>Inbound course: {h.headingDeg}&deg;</span>
                      </div>
                    </div>
                  ))}
                  {holdingFlights.length === 0 && (
                    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-center text-slate-500 font-mono text-xs">
                      No aircraft currently in holding stacks. All approach streams flowing directly to final.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
