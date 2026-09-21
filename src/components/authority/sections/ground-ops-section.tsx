"use client";

import { useState, useEffect, useCallback } from "react";
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
  readyForPushback: boolean;
  pushbackCleared: boolean;
}

const FALLBACK_GROUND_FLIGHTS: RampTurnaroundFlight[] = [
  {
    id: "flt-sc101",
    flightNumber: "SC101",
    airline: "SkyConnect",
    aircraftType: "A320neo",
    origin: "DEL",
    destination: "BOM",
    gate: "A1",
    status: "BOARDING",
    phase: "Gate boarding active",
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
  },
  {
    id: "flt-av201",
    flightNumber: "AV201",
    airline: "AeroVista",
    aircraftType: "B737-800",
    origin: "BOM",
    destination: "DEL",
    gate: "B3",
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
  },
  {
    id: "flt-bh301",
    flightNumber: "BH301",
    airline: "Blue Horizon",
    aircraftType: "A321",
    origin: "BLR",
    destination: "GOI",
    gate: "C2",
    status: "SCHEDULED",
    phase: "Pax disembarked, cleaning",
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
  },
  {
    id: "flt-jbu431",
    flightNumber: "JBU431",
    airline: "JetBlue",
    aircraftType: "A320",
    origin: "KJFK",
    destination: "KMCO",
    gate: "T5-18",
    status: "PUSHBACK",
    phase: "Ramp release requested",
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
  },
];

export function GroundOpsSection({
  flights: initialFlights,
  onNavigateTo,
}: {
  flights?: FlightDTO[];
  onNavigateTo?: (section: string) => void;
}) {
  const [tasks, setTasks] = useState<RampTurnaroundFlight[]>(FALLBACK_GROUND_FLIGHTS);
  const [selectedFlightId, setSelectedFlightId] = useState<string>(FALLBACK_GROUND_FLIGHTS[0].id);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Synthesize ground radio/chime audio
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
        // audio context blocked or unsupported
      }
    },
    [audioEnabled]
  );

  // Synchronize with live flight data
  useEffect(() => {
    async function loadLiveFlights() {
      try {
        const res = await fetch("/api/flights");
        if (res.ok) {
          const data = await res.json();
          const list: FlightDTO[] = data.flights || [];
          if (list.length > 0) {
            // Pick flights suitable for ramp servicing
            const rampFlights = list
              .filter(
                (f) =>
                  f.status === "SCHEDULED" ||
                  f.status === "BOARDING" ||
                  f.status === "PUSHBACK" ||
                  f.status === "LANDED"
              )
              .slice(0, 6)
              .map((f, idx) => {
                const targetKg = f.fuelKg > 0 ? f.fuelKg : 10000;
                const isBoardingOrReady = f.status === "BOARDING" || f.status === "PUSHBACK";
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
                  gpuConnected: f.status !== "PUSHBACK",
                  fuelCurrentKg: curKg,
                  fuelTargetKg: targetKg,
                  fuelPct,
                  baggageLoaded: loadedBags,
                  baggageTotal: totalBags,
                  baggagePct,
                  cateringPct: isBoardingOrReady ? 100 : 75,
                  chocksInserted: f.status !== "PUSHBACK",
                  tugStatus: (f.status === "PUSHBACK" ? "PUSHING" : isBoardingOrReady ? "CONNECTED" : "EN_ROUTE") as RampTurnaroundFlight["tugStatus"],
                  readyForPushback: fuelPct >= 100 && baggagePct >= 100 && isBoardingOrReady,
                  pushbackCleared: f.status === "PUSHBACK",
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
        // graceful fallback to state
      }
    }

    if (!initialFlights || initialFlights.length === 0) {
      loadLiveFlights();
    }
  }, [initialFlights, selectedFlightId]);

  const activeFlight = tasks.find((t) => t.id === selectedFlightId) || tasks[0];

  // Helper to update active flight fields
  const updateActiveFlight = (updater: (prev: RampTurnaroundFlight) => RampTurnaroundFlight) => {
    setTasks((prev) =>
      prev.map((item) => {
        if (item.id === activeFlight.id) {
          const updated = updater(item);
          // Auto-calculate ready status
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

  // Turnaround Action: Toggle GPU
  const handleToggleGpu = () => {
    playTone(activeFlight.gpuConnected ? 440 : 880, "sine");
    updateActiveFlight((prev) => {
      const next = !prev.gpuConnected;
      setActionNotice(next ? "Ground Power Unit (400Hz 115V AC) connected to aircraft." : "GPU disconnected. Aircraft switched to APU power.");
      return { ...prev, gpuConnected: next };
    });
  };

  // Turnaround Action: Add Fuel
  const handleAddFuel = () => {
    playTone(600, "triangle");
    updateActiveFlight((prev) => {
      const nextKg = Math.min(prev.fuelTargetKg, prev.fuelCurrentKg + 1500);
      const nextPct = Math.round((nextKg / prev.fuelTargetKg) * 100);
      setActionNotice(`Fuel hydrant pumped +1,500 kg Jet A-1. Current: ${nextKg.toLocaleString()} kg (${nextPct}%).`);
      return { ...prev, fuelCurrentKg: nextKg, fuelPct: nextPct };
    });
  };

  // Turnaround Action: Load Baggage
  const handleLoadBaggage = () => {
    playTone(700, "square", 0.08);
    updateActiveFlight((prev) => {
      const nextLoaded = Math.min(prev.baggageTotal, prev.baggageLoaded + 25);
      const nextPct = Math.round((nextLoaded / prev.baggageTotal) * 100);
      setActionNotice(`Belt loader container transferred +25 bags. Total loaded: ${nextLoaded}/${prev.baggageTotal} (${nextPct}%).`);
      return { ...prev, baggageLoaded: nextLoaded, baggagePct: nextPct };
    });
  };

  // Turnaround Action: Toggle Chocks
  const handleToggleChocks = () => {
    playTone(activeFlight.chocksInserted ? 520 : 740, "sine");
    updateActiveFlight((prev) => {
      const next = !prev.chocksInserted;
      setActionNotice(next ? "Wheel chocks inserted. Main landing gear locked." : "Wheel chocks removed. Ramp area clear for pushback.");
      return { ...prev, chocksInserted: next };
    });
  };

  // Turnaround Action: Toggle Tug
  const handleCycleTug = () => {
    playTone(400, "sine", 0.15);
    updateActiveFlight((prev) => {
      const nextStatus: RampTurnaroundFlight["tugStatus"] =
        prev.tugStatus === "STANDBY"
          ? "EN_ROUTE"
          : prev.tugStatus === "EN_ROUTE"
          ? "CONNECTED"
          : "CONNECTED";
      setActionNotice(`Towbarless Tug status updated: ${nextStatus}.`);
      return { ...prev, tugStatus: nextStatus };
    });
  };

  // Fast complete all ramp services
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
    setActionNotice("⚡ Expedited ramp servicing! Aircraft fully provisioned, GPU disconnected, chocks pulled, tug coupled.");
  };

  // Authorize Pushback & Towing
  const handleAuthorizePushback = async () => {
    playTone(1050, "sine", 0.3);
    setActionNotice(`🚀 Ground clearance approved! Dispatching pushback tug for ${activeFlight.flightNumber} at ${activeFlight.gate}.`);

    updateActiveFlight((prev) => ({
      ...prev,
      status: "PUSHBACK",
      phase: "Pushback in progress",
      tugStatus: "PUSHING",
      pushbackCleared: true,
    }));

    // Post to operations commands endpoint
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
    } catch {
      // handled gracefully
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <HardHat className="h-6 w-6 text-amber-400" />
            Ground Handling & Apron Ramp Operations Center
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Ramp turnaround services: GPU/ASU power, Jet A-1 fueling, BHS baggage reconciliation, chocks & pushback tug dispatch.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-xs font-mono text-slate-400 hover:text-white"
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4 text-emerald-400 mr-1.5" /> : <VolumeX className="h-4 w-4 text-slate-500 mr-1.5" />}
            {audioEnabled ? "Audio ON" : "Muted"}
          </Button>
          <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-950/20 font-mono text-xs">
            {tasks.length} Turnarounds Monitored
          </Badge>
        </div>
      </div>

      {/* Fleet Resource Availability Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase font-mono flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-amber-400" />
              Towbarless Tugs
            </span>
            <div className="text-xl font-bold font-mono text-white">8 / 10 Active</div>
            <div className="text-[10px] text-slate-500 font-mono">Goldhofer Ramp Units</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase font-mono flex items-center gap-1.5">
              <Fuel className="h-3.5 w-3.5 text-cyan-400" />
              Hydrant Dispensers
            </span>
            <div className="text-xl font-bold font-mono text-white">12 / 12 Standby</div>
            <div className="text-[10px] text-slate-500 font-mono">Jet A-1 Pressure 120 PSI</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase font-mono flex items-center gap-1.5">
              <Luggage className="h-3.5 w-3.5 text-purple-400" />
              Belt Loaders
            </span>
            <div className="text-xl font-bold font-mono text-white">14 / 16 Deployed</div>
            <div className="text-[10px] text-slate-500 font-mono">BHS High-Lift Conveyors</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase font-mono flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-blue-400" />
              De-Icing Trucks
            </span>
            <div className="text-xl font-bold font-mono text-white">6 / 6 Operational</div>
            <div className="text-[10px] text-slate-500 font-mono">Type IV Fluid Primed</div>
          </CardContent>
        </Card>
      </div>

      {/* Flight Turnaround Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800/80">
        {tasks.map((task) => {
          const isSelected = task.id === selectedFlightId;
          return (
            <button
              key={task.id}
              onClick={() => setSelectedFlightId(task.id)}
              className={`px-3 py-2 rounded-xl text-left transition flex items-center gap-3 shrink-0 border ${
                isSelected
                  ? "border-amber-500/60 bg-amber-950/30 ring-1 ring-amber-500/40 text-white"
                  : "border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold font-mono text-xs">{task.flightNumber}</span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                    {task.gate}
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{task.aircraftType}</span>
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

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Main Interactive Servicing Cockpit for Active Flight */}
      {activeFlight && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Aircraft Details & Pushback Authorization Banner */}
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl lg:col-span-1">
            <CardHeader className="pb-4 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold font-mono text-white flex items-center gap-2">
                    <Plane className="h-5 w-5 text-amber-400" />
                    {activeFlight.flightNumber}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs text-slate-400">
                    {activeFlight.airline} · {activeFlight.aircraftType}
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
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Routing</div>
                  <div className="font-bold text-sm text-white">
                    {activeFlight.origin} &rarr; {activeFlight.destination}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Assigned Stand</div>
                  <div className="font-bold text-sm text-amber-400">{activeFlight.gate}</div>
                </div>
              </div>

              {/* Pushback Readiness Checklist Summary */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Departure Checklist</span>
                  <span className={activeFlight.readyForPushback ? "text-emerald-400" : "text-amber-400"}>
                    {activeFlight.readyForPushback ? "ALL GREEN" : "PENDING"}
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Jet A-1 Fuel:</span>
                    <span className={activeFlight.fuelPct >= 100 ? "text-emerald-400" : "text-amber-400"}>
                      {activeFlight.fuelPct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Baggage Loaded:</span>
                    <span className={activeFlight.baggagePct >= 100 ? "text-emerald-400" : "text-amber-400"}>
                      {activeFlight.baggagePct}% ({activeFlight.baggageLoaded}/{activeFlight.baggageTotal})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Ground Power (GPU):</span>
                    <span className={!activeFlight.gpuConnected ? "text-emerald-400" : "text-amber-400"}>
                      {activeFlight.gpuConnected ? "CONNECTED" : "DISCONNECTED"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Wheel Chocks:</span>
                    <span className={!activeFlight.chocksInserted ? "text-emerald-400" : "text-amber-400"}>
                      {activeFlight.chocksInserted ? "INSERTED" : "REMOVED"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Pushback Tug:</span>
                    <span className={activeFlight.tugStatus === "CONNECTED" || activeFlight.tugStatus === "PUSHING" ? "text-emerald-400" : "text-amber-400"}>
                      {activeFlight.tugStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              {activeFlight.pushbackCleared ? (
                <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-center space-y-1">
                  <div className="text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> PUSHBACK IN PROGRESS
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Aircraft rolling back from {activeFlight.gate}. Handoff to ATC Ground.
                  </div>
                  {onNavigateTo && (
                    <Button
                      size="sm"
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs"
                      onClick={() => onNavigateTo("atc")}
                    >
                      Open ATC Radar Sequencing &rarr;
                    </Button>
                  )}
                </div>
              ) : activeFlight.readyForPushback ? (
                <Button
                  onClick={handleAuthorizePushback}
                  className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2"
                >
                  <Truck className="h-4 w-4" />
                  Authorize & Dispatch Pushback
                </Button>
              ) : (
                <Button
                  onClick={handleExpediteAll}
                  variant="outline"
                  className="w-full h-10 border-amber-500/40 bg-amber-950/20 hover:bg-amber-900/30 text-amber-300 font-mono text-xs flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Expedite All Ramp Services
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Right Two Columns: Interactive Servicing Stations */}
          <div className="lg:col-span-2 space-y-4">
            {/* Station 1: Jet A-1 Fueling Cockpit */}
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-cyan-400" />
                    Jet A-1 Aviation Fueling Hydrant Station
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-xs border-cyan-500/40 text-cyan-300">
                    {activeFlight.fuelPct}% Capacity
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-xs">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Current Onboard: {activeFlight.fuelCurrentKg.toLocaleString()} kg</span>
                  <span>Target Departure Load: {activeFlight.fuelTargetKg.toLocaleString()} kg</span>
                </div>
                <Progress value={activeFlight.fuelPct} className="h-2 bg-slate-800" />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">Hydrant Dispenser 04 · Flow: 800 kg/min</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={activeFlight.fuelPct >= 100}
                    onClick={handleAddFuel}
                    className="h-7 text-xs border-cyan-500/40 hover:bg-cyan-950/30 text-cyan-300"
                  >
                    +1,500 kg Jet A-1
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Station 2: Baggage Handling & Container Loader */}
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <Luggage className="h-4 w-4 text-purple-400" />
                    BHS Baggage Reconciliation & Forward/Aft Cargo Hold
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-xs border-purple-500/40 text-purple-300">
                    {activeFlight.baggageLoaded} / {activeFlight.baggageTotal} Bags
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-xs">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Loaded: {activeFlight.baggagePct}%</span>
                  <span>Manifest Reconciliation: Active</span>
                </div>
                <Progress value={activeFlight.baggagePct} className="h-2 bg-slate-800" />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">Belt Loader Unit BL-02 · ULD Containers</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={activeFlight.baggagePct >= 100}
                    onClick={handleLoadBaggage}
                    className="h-7 text-xs border-purple-500/40 hover:bg-purple-950/30 text-purple-300"
                  >
                    Load Container (+25 Bags)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Station 3: Ramp Safety, GPU, Chocks & Tug Coupling */}
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold font-mono text-white flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-amber-400" />
                  Ramp Ground Equipment & Pushback Coupling
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs pt-1">
                {/* GPU Card */}
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-400" /> Ground Power
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        activeFlight.gpuConnected ? "text-amber-300 border-amber-500/40" : "text-slate-500 border-slate-700"
                      }`}
                    >
                      {activeFlight.gpuConnected ? "CONNECTED" : "DISCONNECTED"}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleToggleGpu}
                    className="h-7 text-[11px] border-slate-700 hover:bg-slate-800"
                  >
                    {activeFlight.gpuConnected ? "Disconnect GPU" : "Connect GPU"}
                  </Button>
                </div>

                {/* Chocks Card */}
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" /> Wheel Chocks
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        activeFlight.chocksInserted ? "text-emerald-400 border-emerald-500/40" : "text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {activeFlight.chocksInserted ? "INSERTED" : "REMOVED"}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleToggleChocks}
                    className="h-7 text-[11px] border-slate-700 hover:bg-slate-800"
                  >
                    {activeFlight.chocksInserted ? "Pull Chocks" : "Insert Chocks"}
                  </Button>
                </div>

                {/* Pushback Tug Card */}
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Truck className="h-3 w-3 text-cyan-400" /> Pushback Tug
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        activeFlight.tugStatus === "CONNECTED" || activeFlight.tugStatus === "PUSHING"
                          ? "text-cyan-400 border-cyan-500/40"
                          : "text-slate-500 border-slate-700"
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
                    className="h-7 text-[11px] border-slate-700 hover:bg-slate-800"
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
  );
}
