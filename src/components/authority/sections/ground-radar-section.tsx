"use client";

import { useState, useEffect, useRef } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Compass,
  Crosshair,
  Gauge,
  Navigation,
  Plane,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sliders,
  Sparkles,
  Truck,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FlightDTO } from "@/lib/domain";

interface GroundTarget {
  id: string;
  callsign: string;
  type: "AIRCRAFT" | "VEHICLE";
  aircraftModel?: string;
  x: number; // 0 to 100%
  y: number; // 0 to 100%
  speedKt: number;
  headingDeg: number;
  status: "PUSHBACK" | "TAXIING" | "HOLDING_SHORT" | "LINEUP_WAIT" | "TAKEOFF_ROLL" | "FINAL_APPROACH";
  assignedTaxiway: string;
  runwayConflict?: boolean;
}

export function GroundRadarSection({
  activeFlights = [],
}: {
  activeFlights?: FlightDTO[];
}) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [incursionActive, setIncursionActive] = useState(false);
  const [incursionDetails, setIncursionDetails] = useState<string | null>(null);
  const [stopBarsRed, setStopBarsRed] = useState(false);
  const [filterMode, setFilterMode] = useState<"ALL" | "AIRCRAFT" | "VEHICLES">("ALL");

  // Synthetic Ground targets
  const [targets, setTargets] = useState<GroundTarget[]>([
    {
      id: "tgt-1",
      callsign: "SC101",
      type: "AIRCRAFT",
      aircraftModel: "B789",
      x: 35,
      y: 72,
      speedKt: 14,
      headingDeg: 44,
      status: "TAXIING",
      assignedTaxiway: "TWY Alpha",
    },
    {
      id: "tgt-2",
      callsign: "AA1204",
      type: "AIRCRAFT",
      aircraftModel: "A321",
      x: 48,
      y: 52,
      speedKt: 0,
      headingDeg: 133,
      status: "HOLDING_SHORT",
      assignedTaxiway: "TWY Bravo (Hold RWY 04L)",
    },
    {
      id: "tgt-3",
      callsign: "BAW178",
      type: "AIRCRAFT",
      aircraftModel: "A350",
      x: 75,
      y: 28,
      speedKt: 135,
      headingDeg: 224,
      status: "FINAL_APPROACH",
      assignedTaxiway: "ILS RWY 22R Final (1.8 NM)",
    },
    {
      id: "tgt-4",
      callsign: "TUG-04",
      type: "VEHICLE",
      x: 22,
      y: 84,
      speedKt: 8,
      headingDeg: 310,
      status: "TAXIING",
      assignedTaxiway: "Apron Stand A2",
    },
    {
      id: "tgt-5",
      callsign: "ARFF-RED1",
      type: "VEHICLE",
      x: 60,
      y: 40,
      speedKt: 0,
      headingDeg: 90,
      status: "HOLDING_SHORT",
      assignedTaxiway: "ARFF Station East",
    },
  ]);

  // Audio alert tone generator
  const audioCtxRef = useRef<AudioContext | null>(null);

  const triggerIncursionAlarm = () => {
    if (!audioEnabled || typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      // Dual frequency pulsing alarm (800Hz / 1200Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.15);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // Audio fallback
    }
  };

  // Trigger simulated incursion
  const handleSimulateIncursion = () => {
    setIncursionActive(true);
    setIncursionDetails("AA1204 crossed Hold Short Bar into active RWY 04L during BAW178 Final Approach!");
    triggerIncursionAlarm();

    setTargets((prev) =>
      prev.map((t) => {
        if (t.callsign === "AA1204") {
          return {
            ...t,
            x: 52,
            y: 48,
            speedKt: 18,
            status: "LINEUP_WAIT",
            runwayConflict: true,
          };
        }
        return t;
      })
    );
  };

  // Issue Go-Around (Missed Approach) to resolve conflict
  const handleIssueGoAround = () => {
    setIncursionActive(false);
    setIncursionDetails(null);
    setTargets((prev) =>
      prev.map((t) => {
        if (t.callsign === "BAW178") {
          return {
            ...t,
            status: "FINAL_APPROACH",
            assignedTaxiway: "MISSED APPROACH &bull; Climbing to 3,000 ft",
          };
        }
        if (t.callsign === "AA1204") {
          return {
            ...t,
            x: 48,
            y: 52,
            status: "HOLDING_SHORT",
            runwayConflict: false,
          };
        }
        return t;
      })
    );
  };

  const filteredTargets = targets.filter((t) => {
    if (filterMode === "AIRCRAFT") return t.type === "AIRCRAFT";
    if (filterMode === "VEHICLES") return t.type === "VEHICLE";
    return true;
  });

  return (
    <Card className="border border-slate-800 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur overflow-hidden font-mono">
      {/* Header */}
      <CardHeader className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Crosshair className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold text-white tracking-wide">
                A-SMGCS / ASDE-X SURFACE MOVEMENT RADAR
              </CardTitle>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                LEVEL 4 SURVEILLANCE
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Airport Surface Detection Equipment &bull; Real-time taxiway tracking & runway incursion safety alerts.
            </CardDescription>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="h-7 text-xs border-slate-700 text-slate-300"
          >
            {audioEnabled ? <Volume2 className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5 mr-1" />}
            {audioEnabled ? "Audio Warning ON" : "Audio Muted"}
          </Button>

          <Button
            size="sm"
            variant={stopBarsRed ? "destructive" : "outline"}
            onClick={() => setStopBarsRed(!stopBarsRed)}
            className={`h-7 text-xs ${
              stopBarsRed ? "bg-red-600 text-white font-bold" : "border-slate-700 text-slate-300"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5 mr-1" />
            {stopBarsRed ? "STOP BARS: ACTIVE RED" : "Stop Bars: Normal"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Incursion Alert HUD Banner */}
        {incursionActive && (
          <div className="p-3 rounded-xl border border-red-500 bg-red-950/80 text-red-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse">
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <span className="font-bold text-sm tracking-wide text-white block">
                  🚨 CRITICAL: RUNWAY INCURSION DETECTED
                </span>
                <span className="text-xs text-red-300">{incursionDetails}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleIssueGoAround}
                className="h-8 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase shadow-[0_0_10px_#ef4444]"
              >
                <Siren className="h-4 w-4 mr-1" />
                COMMAND GO-AROUND (MISSED APPROACH)
              </Button>
            </div>
          </div>
        )}

        {/* Ground Radar Viewport Canvas Representation */}
        <div className="relative w-full h-[400px] rounded-xl border-2 border-emerald-900/60 bg-[#051109] overflow-hidden shadow-[inset_0_0_35px_rgba(16,185,129,0.15)] select-none">
          {/* Phosphor Grid Lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />

          {/* Compass Rose Ring */}
          <div className="absolute inset-0 m-auto w-[360px] h-[360px] rounded-full border border-emerald-500/10 pointer-events-none flex items-center justify-center">
            <div className="w-[280px] h-[280px] rounded-full border border-emerald-500/10" />
            <div className="w-[200px] h-[200px] rounded-full border border-emerald-500/15" />
          </div>

          {/* Runway 04L / 22R */}
          <div className="absolute top-[18%] left-[25%] w-[55%] h-12 bg-slate-800/90 border-y-2 border-emerald-400/60 rotate-[28deg] flex items-center justify-between px-3 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <span className="text-[11px] font-bold text-white bg-black/60 px-1 rounded">04L</span>
            <div className="flex-1 h-0.5 border-t-2 border-dashed border-white/60 mx-4" />
            <span className="text-[11px] font-bold text-white bg-black/60 px-1 rounded">22R</span>
          </div>

          {/* Runway 13L / 31R */}
          <div className="absolute top-[35%] left-[20%] w-[60%] h-10 bg-slate-800/80 border-y-2 border-emerald-400/40 -rotate-[35deg] flex items-center justify-between px-3">
            <span className="text-[10px] font-bold text-slate-300 bg-black/60 px-1 rounded">13L</span>
            <div className="flex-1 h-0.5 border-t-2 border-dashed border-white/40 mx-4" />
            <span className="text-[10px] font-bold text-slate-300 bg-black/60 px-1 rounded">31R</span>
          </div>

          {/* Taxiways (TWY Alpha, TWY Bravo) */}
          <div className="absolute top-[52%] left-[10%] w-[75%] h-3 bg-slate-900/90 border border-yellow-500/40 rotate-[28deg]" />
          <div className="absolute top-[42%] left-[42%] w-24 h-3 bg-slate-900/90 border border-yellow-500/40 -rotate-[60deg]" />

          {/* Illuminated Hold-Short Stop Bars */}
          <div
            className={`absolute top-[48%] left-[47%] w-10 h-1.5 rounded transition-all duration-300 ${
              stopBarsRed || incursionActive
                ? "bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse"
                : "bg-amber-400/80"
            }`}
          />

          {/* Terminal Apron Gates Area */}
          <div className="absolute bottom-4 left-6 p-2 rounded-lg bg-black/70 border border-slate-800 text-[10px] text-slate-400">
            <div className="text-emerald-400 font-bold mb-1">TERMINAL 1 APRON (STANDS A1-A4)</div>
            <div className="flex gap-2 text-slate-300">
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">A1: OCCUPIED</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">A2: TUG-04</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300">
                A3: AVAILABLE
              </span>
            </div>
          </div>

          {/* Active Moving Targets */}
          {filteredTargets.map((target) => (
            <div
              key={target.id}
              className={`absolute transition-all duration-700 flex flex-col items-center pointer-events-none ${
                target.runwayConflict ? "scale-110 z-20 animate-bounce" : "z-10"
              }`}
              style={{
                left: `${target.x}%`,
                top: `${target.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Target Symbol */}
              <div
                className={`grid place-items-center h-6 w-6 rounded-full border shadow-lg ${
                  target.runwayConflict
                    ? "bg-red-600 border-white text-white shadow-[0_0_15px_#ef4444]"
                    : target.type === "AIRCRAFT"
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-amber-500/20 border-amber-400 text-amber-300"
                }`}
                style={{
                  transform: `rotate(${target.headingDeg}deg)`,
                }}
              >
                {target.type === "AIRCRAFT" ? (
                  <Plane className="h-3.5 w-3.5" />
                ) : (
                  <Truck className="h-3.5 w-3.5" />
                )}
              </div>

              {/* Data Tag Block */}
              <div
                className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono leading-tight whitespace-nowrap border ${
                  target.runwayConflict
                    ? "bg-red-950/90 border-red-500 text-red-100 font-bold"
                    : "bg-black/85 border-slate-700 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="font-bold text-white">{target.callsign}</span>
                  <span className="text-[8px] text-emerald-400">{target.speedKt}KT</span>
                </div>
                <div className="text-[8px] text-slate-400">{target.assignedTaxiway}</div>
              </div>
            </div>
          ))}

          {/* Radar Sweep Arc Animation */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[380px] h-[380px] rounded-full border border-emerald-500/20 animate-spin [animation-duration:8s]" />
          </div>
        </div>

        {/* Bottom Tactical Controls & Incursion Drill Injector */}
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 uppercase text-[10px]">Filter Display:</span>
            <Button
              size="sm"
              variant={filterMode === "ALL" ? "default" : "outline"}
              onClick={() => setFilterMode("ALL")}
              className="h-6 px-2.5 text-[10px]"
            >
              All Targets
            </Button>
            <Button
              size="sm"
              variant={filterMode === "AIRCRAFT" ? "default" : "outline"}
              onClick={() => setFilterMode("AIRCRAFT")}
              className="h-6 px-2.5 text-[10px]"
            >
              Aircraft Only
            </Button>
            <Button
              size="sm"
              variant={filterMode === "VEHICLES" ? "default" : "outline"}
              onClick={() => setFilterMode("VEHICLES")}
              className="h-6 px-2.5 text-[10px]"
            >
              Vehicles Only
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {!incursionActive ? (
              <Button
                size="sm"
                onClick={handleSimulateIncursion}
                className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Simulate Runway Incursion Drill
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleIssueGoAround}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Clear Conflict & Reset Positions
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
