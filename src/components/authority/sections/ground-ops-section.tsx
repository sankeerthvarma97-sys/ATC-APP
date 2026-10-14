"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplets,
  Fuel,
  HardHat,
  Luggage,
  Plane,
  RefreshCw,
  Truck,
  Utensils,
  Zap,
  ShieldCheck,
  Volume2,
  VolumeX,
  Gauge,
  Sparkles,
  Navigation,
  Compass,
  Car,
  Layers,
  ArrowUpRight,
  Lock,
  Unlock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { FlightDTO } from "@/lib/domain";

export interface RampTurnaroundFlight {
  id: string;
  flightNumber: string;
  airline: string;
  aircraftType: string;
  origin: string;
  destination: string;
  gate: string;
  status: string;
  phase: string;
  gpuConnected: boolean;
  fuelCurrentKg: number;
  fuelTargetKg: number;
  fuelPct: number;
  baggageLoaded: number;
  baggageTotal: number;
  baggagePct: number;
  cateringPct: number;
  chocksInserted: boolean;
  tugStatus: "STANDBY" | "EN_ROUTE" | "CONNECTED" | "PUSHING";
  assignedTaxiway?: string;
  taxiSequence?: number;
  followMeEscort?: string;
  readyForPushback: boolean;
  pushbackCleared: boolean;
  taxiCleared?: boolean;
}

export interface ApronVehicle {
  id: string;
  callsign: string;
  type: "FOLLOW_ME" | "DE_ICER" | "FRICTION_TESTER" | "SWEEPER";
  status: "IDLE" | "ESCORTING" | "EN_ROUTE" | "STANDBY";
  assignedFlight?: string;
  location: string;
}

const STATION_TAXIWAYS: Record<string, { taxiways: string[]; holdingPoints: string[] }> = {
  HYD: {
    taxiways: ["TWY A (Alpha)", "TWY B (Bravo)", "TWY C (Charlie)", "TWY N (Nov)", "TWY P (Papa)"],
    holdingPoints: ["Holding Point 09L A1", "Holding Point 09L A2", "Holding Point 09R B1"],
  },
  BOM: {
    taxiways: ["TWY A (Alpha)", "TWY B (Bravo)", "TWY S (Sierra)", "TWY N (Nov)"],
    holdingPoints: ["Holding Point 09 A1", "Holding Point 27 S2", "Holding Point 14 B1"],
  },
  DEL: {
    taxiways: ["TWY Z (Zulu)", "TWY E (Echo)", "TWY K (Kilo)", "TWY W (Whiskey)"],
    holdingPoints: ["Holding Point 10 Z1", "Holding Point 28 E3", "Holding Point 29 K2"],
  },
  BLR: {
    taxiways: ["TWY A (Alpha)", "TWY B (Bravo)", "TWY N (North)", "TWY S (South)"],
    holdingPoints: ["Holding Point 09L A1", "Holding Point 09R B1"],
  },
  MAA: {
    taxiways: ["TWY A (Alpha)", "TWY B (Bravo)", "TWY C (Charlie)"],
    holdingPoints: ["Holding Point 07 A1", "Holding Point 25 B2"],
  },
  JFK: {
    taxiways: ["TWY A (Alpha)", "TWY B (Bravo)", "TWY K (Kilo)", "TWY YA"],
    holdingPoints: ["Holding Point 04L K1", "Holding Point 04R A2"],
  },
};

const INITIAL_VEHICLES: ApronVehicle[] = [
  { id: "veh-fm1", callsign: "FM-01", type: "FOLLOW_ME", status: "STANDBY", location: "Apron Stand B1" },
  { id: "veh-fm2", callsign: "FM-02", type: "FOLLOW_ME", status: "IDLE", location: "Apron Stand A4" },
  { id: "veh-di1", callsign: "DI-01", type: "DE_ICER", status: "STANDBY", location: "De-icing Pad South" },
  { id: "veh-ft1", callsign: "FT-01", type: "FRICTION_TESTER", status: "IDLE", location: "Fire Station 1" },
  { id: "veh-sw1", callsign: "SW-01", type: "SWEEPER", status: "STANDBY", location: "Maintenance Yard" },
];

const FALLBACK_GROUND_FLIGHTS: RampTurnaroundFlight[] = [
  {
    id: "flt-sc101",
    flightNumber: "SC101",
    airline: "SkyConnect Airlines",
    aircraftType: "Airbus A320neo",
    origin: "HYD",
    destination: "BOM",
    gate: "B12",
    status: "BOARDING",
    phase: "Turnaround servicing",
    gpuConnected: true,
    fuelCurrentKg: 9500,
    fuelTargetKg: 10000,
    fuelPct: 95,
    baggageLoaded: 128,
    baggageTotal: 135,
    baggagePct: 94,
    cateringPct: 100,
    chocksInserted: true,
    tugStatus: "CONNECTED",
    readyForPushback: false,
    pushbackCleared: false,
    assignedTaxiway: "TWY A (Alpha)",
  },
  {
    id: "flt-av201",
    flightNumber: "AV201",
    airline: "AeroVista",
    aircraftType: "Boeing 737-800",
    origin: "HYD",
    destination: "DEL",
    gate: "A4",
    status: "SCHEDULED",
    phase: "Turnaround servicing",
    gpuConnected: true,
    fuelCurrentKg: 6200,
    fuelTargetKg: 10000,
    fuelPct: 62,
    baggageLoaded: 75,
    baggageTotal: 140,
    baggagePct: 53,
    cateringPct: 80,
    chocksInserted: true,
    tugStatus: "EN_ROUTE",
    readyForPushback: false,
    pushbackCleared: false,
    assignedTaxiway: "TWY B (Bravo)",
  },
  {
    id: "flt-bh301",
    flightNumber: "BH301",
    airline: "Blue Horizon Air",
    aircraftType: "Airbus A320",
    origin: "HYD",
    destination: "GOI",
    gate: "C2",
    status: "SCHEDULED",
    phase: "Cabin cleaning & refueling",
    gpuConnected: false,
    fuelCurrentKg: 3500,
    fuelTargetKg: 11000,
    fuelPct: 31,
    baggageLoaded: 20,
    baggageTotal: 155,
    baggagePct: 12,
    cateringPct: 40,
    chocksInserted: true,
    tugStatus: "STANDBY",
    readyForPushback: false,
    pushbackCleared: false,
    assignedTaxiway: "TWY A (Alpha)",
  },
  {
    id: "flt-is101",
    flightNumber: "IS101",
    airline: "IndianSky Airlines",
    aircraftType: "Boeing 777-200ER",
    origin: "HYD",
    destination: "BLR",
    gate: "A10",
    status: "PUSHBACK",
    phase: "Pushback in progress",
    gpuConnected: false,
    fuelCurrentKg: 9800,
    fuelTargetKg: 9800,
    fuelPct: 100,
    baggageLoaded: 120,
    baggageTotal: 120,
    baggagePct: 100,
    cateringPct: 100,
    chocksInserted: false,
    tugStatus: "PUSHING",
    readyForPushback: true,
    pushbackCleared: true,
    assignedTaxiway: "TWY P (Papa)",
  },
];

export function GroundOpsSection({
  flights: initialFlights,
  onNavigateTo,
  activeStation = "HYD",
}: {
  flights?: FlightDTO[];
  onNavigateTo?: (section: string) => void;
  activeStation?: string;
}) {
  const normStation = activeStation.toUpperCase();
  const stationInfo = useMemo(() => {
    return STATION_TAXIWAYS[normStation] || STATION_TAXIWAYS.HYD;
  }, [normStation]);

  const [tasks, setTasks] = useState<RampTurnaroundFlight[]>(FALLBACK_GROUND_FLIGHTS);
  const [vehicles, setVehicles] = useState<ApronVehicle[]>(INITIAL_VEHICLES);
  const [selectedFlightId, setSelectedFlightId] = useState<string>(FALLBACK_GROUND_FLIGHTS[0].id);
  const [activeTab, setActiveTab] = useState<"TURNAROUND" | "TAXI_QUEUE" | "VEHICLES">("TURNAROUND");
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Synthesize ground radio chime
  const playTone = useCallback(
    (freq: number, type: OscillatorType = "sine", duration = 0.12) => {
      if (!audioEnabled || typeof window === "undefined") return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // audio context
      }
    },
    [audioEnabled]
  );

  // Load flights from simulation
  useEffect(() => {
    async function loadLiveFlights() {
      try {
        const res = await fetch("/api/flights");
        if (res.ok) {
          const data = await res.json();
          const list: FlightDTO[] = data.flights || [];
          if (list.length > 0) {
            const rampFlights = list
              .filter(
                (f) =>
                  f.status === "SCHEDULED" ||
                  f.status === "BOARDING" ||
                  f.status === "PUSHBACK" ||
                  f.status === "TAXI_OUT" ||
                  f.status === "LANDED"
              )
              .slice(0, 6)
              .map((f, idx) => {
                const targetKg = f.fuelKg > 0 ? f.fuelKg : 10000;
                const isBoardingOrReady = f.status === "BOARDING" || f.status === "PUSHBACK" || f.status === "TAXI_OUT";
                const curKg = isBoardingOrReady ? targetKg : Math.round(targetKg * 0.7);
                const fuelPct = Math.round((curKg / targetKg) * 100);
                const econCap = f.economyCapacity ?? 150;
                const busCap = f.businessCapacity ?? 20;
                const totalBags = Math.round((econCap + busCap) * 0.85);
                const loadedBags = isBoardingOrReady ? totalBags : Math.round(totalBags * 0.65);
                const baggagePct = Math.round((loadedBags / totalBags) * 100);

                return {
                  id: f.id,
                  flightNumber: f.flightNumber || f.callsign,
                  airline: f.airline,
                  aircraftType: f.aircraftType,
                  origin: f.origin,
                  destination: f.destination,
                  gate: f.gate || `G-${idx + 1}`,
                  status: f.status,
                  phase: f.phase || "Ramp operations",
                  gpuConnected: f.status !== "PUSHBACK" && f.status !== "TAXI_OUT",
                  fuelCurrentKg: curKg,
                  fuelTargetKg: targetKg,
                  fuelPct,
                  baggageLoaded: loadedBags,
                  baggageTotal: totalBags,
                  baggagePct,
                  cateringPct: isBoardingOrReady ? 100 : 75,
                  chocksInserted: f.status !== "PUSHBACK" && f.status !== "TAXI_OUT",
                  tugStatus: (f.status === "PUSHBACK" ? "PUSHING" : isBoardingOrReady ? "CONNECTED" : "EN_ROUTE") as RampTurnaroundFlight["tugStatus"],
                  assignedTaxiway: stationInfo.taxiways[idx % stationInfo.taxiways.length],
                  readyForPushback: fuelPct >= 100 && baggagePct >= 100 && isBoardingOrReady,
                  pushbackCleared: f.status === "PUSHBACK" || f.status === "TAXI_OUT",
                  taxiCleared: f.status === "TAXI_OUT",
                };
              });

            if (rampFlights.length > 0) {
              setTasks(rampFlights);
              if (!rampFlights.some((r) => r.id === selectedFlightId)) {
                setSelectedFlightId(rampFlights[0].id);
              }
            }
          }
        }
      } catch {
        //
      }
    }

    if (!initialFlights || initialFlights.length === 0) {
      loadLiveFlights();
    }
  }, [initialFlights, selectedFlightId, stationInfo]);

  const activeFlight = tasks.find((t) => t.id === selectedFlightId) || tasks[0];

  const updateActiveFlight = (updater: (prev: RampTurnaroundFlight) => RampTurnaroundFlight) => {
    setTasks((prev) =>
      prev.map((item) => {
        if (item.id === activeFlight.id) {
          const updated = updater(item);
          const isReady =
            updated.fuelPct >= 100 &&
            updated.baggagePct >= 100 &&
            updated.cateringPct >= 100 &&
            !updated.gpuConnected &&
            !updated.chocksInserted &&
            updated.tugStatus === "CONNECTED";
          return { ...updated, readyForPushback: isReady };
        }
        return item;
      })
    );
  };

  const handleToggleGpu = () => {
    playTone(activeFlight.gpuConnected ? 440 : 880, "sine");
    updateActiveFlight((prev) => {
      const next = !prev.gpuConnected;
      setActionNotice(next ? "Ground Power Unit (400Hz 115V AC) connected." : "GPU disconnected. APU online.");
      return { ...prev, gpuConnected: next };
    });
  };

  const handleAddFuel = () => {
    playTone(600, "triangle");
    updateActiveFlight((prev) => {
      const nextKg = Math.min(prev.fuelTargetKg, prev.fuelCurrentKg + 1500);
      const nextPct = Math.round((nextKg / prev.fuelTargetKg) * 100);
      setActionNotice(`Hydrant dispenser fueled +1,500 kg Jet A-1 (${nextPct}%).`);
      return { ...prev, fuelCurrentKg: nextKg, fuelPct: nextPct };
    });
  };

  const handleLoadBaggage = () => {
    playTone(700, "square", 0.08);
    updateActiveFlight((prev) => {
      const nextLoaded = Math.min(prev.baggageTotal, prev.baggageLoaded + 25);
      const nextPct = Math.round((nextLoaded / prev.baggageTotal) * 100);
      setActionNotice(`Belt loader container transferred +25 bags (${nextPct}%).`);
      return { ...prev, baggageLoaded: nextLoaded, baggagePct: nextPct };
    });
  };

  const handleToggleChocks = () => {
    playTone(activeFlight.chocksInserted ? 520 : 740, "sine");
    updateActiveFlight((prev) => {
      const next = !prev.chocksInserted;
      setActionNotice(next ? "Main gear chocks inserted." : "Chocks pulled. Ramp clear for pushback.");
      return { ...prev, chocksInserted: next };
    });
  };

  const handleCycleTug = () => {
    playTone(400, "sine", 0.15);
    updateActiveFlight((prev) => {
      const nextStatus: RampTurnaroundFlight["tugStatus"] =
        prev.tugStatus === "STANDBY" ? "EN_ROUTE" : "CONNECTED";
      setActionNotice(`Towbarless Tug status: ${nextStatus}.`);
      return { ...prev, tugStatus: nextStatus };
    });
  };

  const handleExpediteAll = () => {
    playTone(900, "sine", 0.2);
    updateActiveFlight((prev) => ({
      ...prev,
      fuelCurrentKg: prev.fuelTargetKg,
      fuelPct: 100,
      baggageLoaded: prev.baggageTotal,
      baggagePct: 100,
      cateringPct: 100,
      gpuConnected: false,
      chocksInserted: false,
      tugStatus: "CONNECTED",
      readyForPushback: true,
    }));
    setActionNotice("⚡ All ramp servicing expedited! Chocks pulled, GPU stowed, aircraft ready.");
  };

  const handleAuthorizePushback = async () => {
    playTone(1050, "sine", 0.3);
    setActionNotice(`🚀 Ground clearance approved! Pushback tug active for ${activeFlight.flightNumber} at Stand ${activeFlight.gate}.`);

    updateActiveFlight((prev) => ({
      ...prev,
      status: "PUSHBACK",
      phase: "Pushback in progress",
      tugStatus: "PUSHING",
      pushbackCleared: true,
    }));

    try {
      await fetch("/api/operations/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightId: activeFlight.id,
          command: {
            type: "PUSHBACK_APPROVE",
            flightId: activeFlight.id,
            issuedBy: "GROUND-CONTROL",
            timestamp: new Date().toISOString(),
          },
        }),
      });

      await fetch(`/api/flights/${activeFlight.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PUSHBACK",
          phase: "Pushback in progress",
        }),
      });
    } catch {
      //
    }
  };

  const handleAuthorizeTaxi = async (flightId: string, twy: string) => {
    playTone(1200, "sine", 0.25);
    const target = tasks.find((t) => t.id === flightId);
    if (!target) return;

    setActionNotice(`✈️ Taxi clearance granted to ${target.flightNumber} via ${twy}. Ground crew disconnected.`);

    setTasks((prev) =>
      prev.map((t) =>
        t.id === flightId
          ? {
              ...t,
              status: "TAXI_OUT",
              phase: `Taxi via ${twy}`,
              taxiCleared: true,
              tugStatus: "STANDBY",
            }
          : t
      )
    );

    try {
      await fetch("/api/operations/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightId,
          command: {
            type: "TAXI_CLEARANCE",
            flightId,
            taxiway: twy,
            issuedBy: "GROUND-CONTROL",
            timestamp: new Date().toISOString(),
          },
        }),
      });

      await fetch(`/api/flights/${flightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "TAXI_OUT",
          phase: `Taxi via ${twy}`,
        }),
      });
    } catch {
      //
    }
  };

  const handleAssignFollowMe = (vehId: string, flightNumber: string) => {
    playTone(950, "sine", 0.15);
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehId
          ? { ...v, status: "ESCORTING", assignedFlight: flightNumber }
          : v
      )
    );
    setActionNotice(`🚗 Follow-Me car ${vehId} dispatched to escort ${flightNumber}.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleReleaseVehicle = (vehId: string) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehId
          ? { ...v, status: "IDLE", assignedFlight: undefined }
          : v
      )
    );
  };

  const taxiQueueFlights = useMemo(() => {
    return tasks.filter((t) => t.pushbackCleared || t.status === "PUSHBACK" || t.status === "TAXI_OUT");
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <HardHat className="h-6 w-6 text-amber-400" />
              Ground Handling & Apron Ramp Operations
            </h2>
            <Badge variant="outline" className="font-mono text-xs">
              STATION: {normStation}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Apron turnaround servicing, towbarless pushback dispatch, taxiway routing & Follow-Me vehicle escort.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-xs font-mono text-muted-foreground hover:text-foreground"
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4 text-emerald-400 mr-1.5" /> : <VolumeX className="h-4 w-4 text-muted-foreground mr-1.5" />}
            {audioEnabled ? "Radio Audio ON" : "Muted"}
          </Button>

          <div className="flex items-center gap-1 border border-border/80 rounded-lg p-0.5 bg-background">
            <button
              onClick={() => setActiveTab("TURNAROUND")}
              className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition ${
                activeTab === "TURNAROUND" ? "bg-amber-500 text-amber-950 font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Turnaround
            </button>
            <button
              onClick={() => setActiveTab("TAXI_QUEUE")}
              className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition ${
                activeTab === "TAXI_QUEUE" ? "bg-amber-500 text-amber-950 font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Taxi Queue ({taxiQueueFlights.length})
            </button>
            <button
              onClick={() => setActiveTab("VEHICLES")}
              className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition ${
                activeTab === "VEHICLES" ? "bg-amber-500 text-amber-950 font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Vehicles ({vehicles.length})
            </button>
          </div>
        </div>
      </div>

      {/* Fleet Resource Availability Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase font-mono flex items-center gap-1.5 font-medium">
              <Truck className="h-3.5 w-3.5 text-amber-400" />
              Towbarless Tugs
            </span>
            <div className="text-xl font-bold font-mono text-foreground">8 / 10 Active</div>
            <div className="text-[10px] text-muted-foreground font-mono">Goldhofer Apron Units</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase font-mono flex items-center gap-1.5 font-medium">
              <Fuel className="h-3.5 w-3.5 text-cyan-400" />
              Hydrant Dispensers
            </span>
            <div className="text-xl font-bold font-mono text-foreground">12 / 12 Standby</div>
            <div className="text-[10px] text-muted-foreground font-mono">Jet A-1 Pressure 120 PSI</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase font-mono flex items-center gap-1.5 font-medium">
              <Car className="h-3.5 w-3.5 text-purple-400" />
              Follow-Me Vehicles
            </span>
            <div className="text-xl font-bold font-mono text-foreground">
              {vehicles.filter((v) => v.status === "ESCORTING").length} / {vehicles.length} Escorting
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">Apron Marshalling Fleet</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase font-mono flex items-center gap-1.5 font-medium">
              <Navigation className="h-3.5 w-3.5 text-blue-400" />
              Active Taxiway Routes
            </span>
            <div className="text-xl font-bold font-mono text-foreground">
              {stationInfo.taxiways.length} Available
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">{normStation} Holding Points</div>
          </CardContent>
        </Card>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-muted-foreground hover:text-foreground text-xs">
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: RAMP TURNAROUND SERVICING */}
      {activeTab === "TURNAROUND" && (
        <div className="space-y-4">
          {/* Flight Turnaround Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/80">
            {tasks.map((task) => {
              const isSelected = task.id === selectedFlightId;
              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedFlightId(task.id)}
                  className={`px-3 py-2 rounded-xl text-left transition flex items-center gap-3 shrink-0 border ${
                    isSelected
                      ? "border-amber-500/60 bg-amber-500/15 ring-1 ring-amber-500/40 text-foreground"
                      : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card"
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold font-mono text-xs text-foreground">{task.flightNumber}</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                        {task.gate}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{task.aircraftType}</span>
                  </div>
                  <Badge
                    className={`text-[9px] font-mono ${
                      task.pushbackCleared
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : task.readyForPushback
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    }`}
                  >
                    {task.pushbackCleared ? "PUSHING" : task.readyForPushback ? "READY" : `${task.fuelPct}%`}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Active Flight Turnaround Cockpit */}
          {activeFlight && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Flight Summary & Action Cockpit */}
              <Card className="border-border/80 bg-card/80 backdrop-blur-xl lg:col-span-1">
                <CardHeader className="pb-4 border-b border-border/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
                        <Plane className="h-5 w-5 text-amber-400" />
                        {activeFlight.flightNumber}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs text-muted-foreground">
                        {activeFlight.airline} &bull; {activeFlight.aircraftType}
                      </CardDescription>
                    </div>
                    <Badge
                      className={`font-mono text-xs ${
                        activeFlight.pushbackCleared
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : activeFlight.readyForPushback
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      }`}
                    >
                      {activeFlight.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-2 text-foreground">
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/60">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Routing</div>
                      <div className="font-bold text-sm mt-0.5">{activeFlight.origin} &rarr; {activeFlight.destination}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/60">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Parking Stand</div>
                      <div className="font-bold text-sm text-amber-400 mt-0.5">Stand {activeFlight.gate}</div>
                    </div>
                  </div>

                  {/* Readiness Checklist */}
                  <div className="p-3 rounded-xl border border-border/60 bg-background/40 space-y-2">
                    <span className="text-[11px] font-bold text-foreground block">
                      Ramp Departure Readiness Checklist:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className={activeFlight.fuelPct >= 100 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                          {activeFlight.fuelPct >= 100 ? "✓" : "○"} Fuel: {activeFlight.fuelPct}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={activeFlight.baggagePct >= 100 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                          {activeFlight.baggagePct >= 100 ? "✓" : "○"} Bags: {activeFlight.baggagePct}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={!activeFlight.gpuConnected ? "text-emerald-400 font-bold" : "text-amber-400"}>
                          {!activeFlight.gpuConnected ? "✓ GPU Stowed" : "○ GPU Coupled"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={!activeFlight.chocksInserted ? "text-emerald-400 font-bold" : "text-amber-400"}>
                          {!activeFlight.chocksInserted ? "✓ Chocks Pulled" : "○ Chocks Locked"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pushback & Expedite Actions */}
                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={handleAuthorizePushback}
                      disabled={activeFlight.pushbackCleared}
                      className="w-full h-10 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg transition"
                    >
                      {activeFlight.pushbackCleared
                        ? "✓ Pushback Clearance Active"
                        : "Authorize Pushback & Towing"}
                    </Button>
                    <Button
                      onClick={handleExpediteAll}
                      variant="outline"
                      className="w-full h-8 text-[11px] border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                    >
                      ⚡ Fast Complete All Servicing
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Right 2 Columns: Servicing Stations */}
              <div className="lg:col-span-2 space-y-4">
                {/* Station 1: Jet A-1 Hydrant Refueling */}
                <Card className="border-border/80 bg-card/70">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-cyan-400" />
                        Jet A-1 Fuel Hydrant Dispenser
                      </CardTitle>
                      <Badge variant="outline" className="font-mono text-xs border-cyan-500/40 text-cyan-300">
                        {activeFlight.fuelCurrentKg.toLocaleString()} / {activeFlight.fuelTargetKg.toLocaleString()} kg
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Hydrant Pressure: 120 PSI Normal</span>
                      <span>Tank Uplift: {activeFlight.fuelPct}%</span>
                    </div>
                    <Progress value={activeFlight.fuelPct} className="h-2 bg-muted" />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground">Apron Hydrant Pit #4 &bull; Standard Flow 1,200 L/min</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={activeFlight.fuelPct >= 100}
                        onClick={handleAddFuel}
                        className="h-7 text-xs border-cyan-500/40 hover:bg-cyan-500/10 text-cyan-300"
                      >
                        Pump +1,500 kg
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Station 2: Baggage Loading */}
                <Card className="border-border/80 bg-card/70">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                        <Luggage className="h-4 w-4 text-purple-400" />
                        BHS Baggage Reconciliation & Cargo Hold
                      </CardTitle>
                      <Badge variant="outline" className="font-mono text-xs border-purple-500/40 text-purple-300">
                        {activeFlight.baggageLoaded} / {activeFlight.baggageTotal} Bags
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Loaded: {activeFlight.baggagePct}%</span>
                      <span>Manifest Status: Verified</span>
                    </div>
                    <Progress value={activeFlight.baggagePct} className="h-2 bg-muted" />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground">Belt Loader Unit BL-02 &bull; ULD Containers</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={activeFlight.baggagePct >= 100}
                        onClick={handleLoadBaggage}
                        className="h-7 text-xs border-purple-500/40 hover:bg-purple-500/10 text-purple-300"
                      >
                        Load Container (+25 Bags)
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Station 3: Ramp Equipment */}
                <Card className="border-border/80 bg-card/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-amber-400" />
                      Ramp Ground Equipment & Pushback Coupling
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs pt-1">
                    <div className="p-3 rounded-xl border border-border/80 bg-background/50 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px] flex items-center gap-1 font-semibold">
                          <Zap className="h-3 w-3 text-amber-400" /> Ground Power
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${activeFlight.gpuConnected ? "text-amber-300 border-amber-500/40" : "text-muted-foreground"}`}
                        >
                          {activeFlight.gpuConnected ? "CONNECTED" : "STOWED"}
                        </Badge>
                      </div>
                      <Button size="sm" variant="outline" onClick={handleToggleGpu} className="h-7 text-[11px]">
                        {activeFlight.gpuConnected ? "Disconnect GPU" : "Connect GPU"}
                      </Button>
                    </div>

                    <div className="p-3 rounded-xl border border-border/80 bg-background/50 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px] flex items-center gap-1 font-semibold">
                          <ShieldCheck className="h-3 w-3 text-emerald-400" /> Wheel Chocks
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${activeFlight.chocksInserted ? "text-emerald-400 border-emerald-500/40" : "text-amber-300 border-amber-500/40"}`}
                        >
                          {activeFlight.chocksInserted ? "INSERTED" : "REMOVED"}
                        </Badge>
                      </div>
                      <Button size="sm" variant="outline" onClick={handleToggleChocks} className="h-7 text-[11px]">
                        {activeFlight.chocksInserted ? "Pull Chocks" : "Insert Chocks"}
                      </Button>
                    </div>

                    <div className="p-3 rounded-xl border border-border/80 bg-background/50 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px] flex items-center gap-1 font-semibold">
                          <Truck className="h-3 w-3 text-cyan-400" /> Pushback Tug
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            activeFlight.tugStatus === "CONNECTED" || activeFlight.tugStatus === "PUSHING"
                              ? "text-cyan-400 border-cyan-500/40"
                              : "text-muted-foreground"
                          }`}
                        >
                          {activeFlight.tugStatus}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCycleTug}
                        disabled={activeFlight.tugStatus === "PUSHING"}
                        className="h-7 text-[11px]"
                      >
                        {activeFlight.tugStatus === "CONNECTED" ? "Tug Coupled" : "Dispatch Tug"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TAXIWAY CLEARANCES & SEQUENCING QUEUE */}
      {activeTab === "TAXI_QUEUE" && (
        <div className="space-y-4 font-mono">
          <Card className="border-border/80 bg-card/80">
            <CardHeader className="py-3 px-4 border-b border-border/80 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-amber-400" />
                  Departure Taxiway Sequencing & Holding Point Queue ({normStation})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Sequence post-pushback aircraft along apron taxiways to runway holding points.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">
                {taxiQueueFlights.length} In Ground Movement
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {taxiQueueFlights.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No aircraft currently in pushback or awaiting taxi clearance at {normStation}.
                </div>
              ) : (
                <div className="space-y-3">
                  {taxiQueueFlights.map((flt, idx) => {
                    const twy = flt.assignedTaxiway || stationInfo.taxiways[0];
                    return (
                      <div
                        key={flt.id}
                        className="p-3.5 rounded-xl border border-border/80 bg-background/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm">{flt.flightNumber}</span>
                              <Badge variant="outline" className="text-[10px]">
                                Stand {flt.gate}
                              </Badge>
                              <Badge
                                className={`text-[10px] ${
                                  flt.status === "TAXI_OUT"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                    : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                }`}
                              >
                                {flt.status}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {flt.airline} &bull; {flt.aircraftType} &bull; Route: {flt.origin} &rarr; {flt.destination}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <div className="text-right mr-2 hidden md:block">
                            <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Assigned Route</span>
                            <span className="text-xs font-bold text-cyan-300">{twy}</span>
                          </div>

                          {!flt.taxiCleared ? (
                            <Button
                              size="sm"
                              onClick={() => handleAuthorizeTaxi(flt.id, twy)}
                              className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
                            >
                              <ArrowRight className="h-3.5 w-3.5 mr-1" />
                              Clear Taxi via {twy.split(" ")[0]}
                            </Button>
                          ) : (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs py-1 px-2.5">
                              ✓ Taxiing to Runway Hold
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: APRON FOLLOW-ME & SERVICE VEHICLES */}
      {activeTab === "VEHICLES" && (
        <div className="space-y-4 font-mono">
          <Card className="border-border/80 bg-card/80">
            <CardHeader className="py-3 px-4 border-b border-border/80">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Car className="h-4 w-4 text-purple-400" />
                Apron Marshalling & Service Fleet ({normStation})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Follow-Me escort vehicles, de-icing tankers, and runway friction testers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vehicles.map((veh) => {
                  const isEscorting = veh.status === "ESCORTING";
                  return (
                    <div
                      key={veh.id}
                      className="p-3.5 rounded-xl border border-border/80 bg-background/60 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-base font-bold text-foreground">{veh.callsign}</span>
                          <span className="text-[10px] text-muted-foreground block font-semibold">{veh.type.replace(/_/g, " ")}</span>
                        </div>
                        <Badge
                          className={`text-[10px] ${
                            isEscorting
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {veh.status}
                        </Badge>
                      </div>

                      <div className="text-xs space-y-1 text-muted-foreground">
                        <div>Location: <strong className="text-foreground">{veh.location}</strong></div>
                        {veh.assignedFlight && (
                          <div>Escorting: <strong className="text-amber-400">{veh.assignedFlight}</strong></div>
                        )}
                      </div>

                      <div className="pt-1">
                        {isEscorting ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReleaseVehicle(veh.id)}
                            className="w-full h-7 text-xs border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                          >
                            Release to Standby
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const targetFlt = tasks[0]?.flightNumber || "SC101";
                              handleAssignFollowMe(veh.id, targetFlt);
                            }}
                            className="w-full h-7 text-xs border-border/80 hover:bg-muted"
                          >
                            Dispatch Escort
                          </Button>
                        )}
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
