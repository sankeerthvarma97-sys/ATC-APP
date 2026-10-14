"use client";

import { useState, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Compass,
  Gauge,
  Layers,
  Maximize2,
  Navigation,
  Radio,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
  Shield,
  ShieldAlert,
  Plane,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FlightDTO } from "@/lib/domain";

// Distance calculation between two lat/lon points in Nautical Miles
function calcDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 60;
  const dLon = (lon2 - lon1) * 60 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

export function PrimaryFlightDisplay({
  flight,
  allFlights = [],
  onSelectFlight,
}: {
  flight?: FlightDTO;
  allFlights?: FlightDTO[];
  onSelectFlight?: (flightId: string) => void;
}) {
  // Autopilot settings (Mode Control Panel - MCP)
  const [apEngaged, setApEngaged] = useState(true);
  const [athrEngaged, setAthrEngaged] = useState(true);
  const [fdEngaged, setFdEngaged] = useState(true);
  const [apprMode, setApprMode] = useState(true); // ILS Approach Mode
  const [tcasMode, setTcasMode] = useState<"TA_RA" | "TA_ONLY" | "STBY">("TA_RA");
  const [targetSpeed, setTargetSpeed] = useState(250);
  const [targetAltitude, setTargetAltitude] = useState(24000);
  const [targetHeading, setTargetHeading] = useState(90);
  const [baroMode, setBaroMode] = useState<"STD" | "QNH">("STD");

  // Telemetry with fallbacks
  const speed = flight?.speedKt ?? 245;
  const altitude = flight?.altitudeFt ?? 18400;
  const heading = flight?.headingDeg ?? 85;
  const vspeed = flight?.verticalSpeedFpm ?? 1200;
  const callsign = flight?.callsign ?? "SC101";
  const squawk = flight?.squawk ?? "4721";
  const runway = flight?.runway || "09L";

  // Pitch angle (approx: 1000 fpm ~= 2.5 deg pitch)
  const pitchDeg = Math.max(-20, Math.min(25, (vspeed / 1000) * 2.5 + (speed < 180 ? 4 : 2)));
  // Bank angle calculated from heading delta
  const bankDeg = Math.max(-30, Math.min(30, (targetHeading - heading) * 0.8));
  // Mach number calculation
  const mach = (speed / 580).toFixed(2);

  // Speed tape ticks (speed +/- 50 kts)
  const speedTicks = useMemo(() => {
    const center = Math.round(speed / 10) * 10;
    const ticks: number[] = [];
    for (let s = center + 50; s >= center - 50; s -= 10) {
      if (s >= 0) ticks.push(s);
    }
    return ticks;
  }, [speed]);

  // Altitude tape ticks (altitude +/- 800 ft)
  const altTicks = useMemo(() => {
    const center = Math.round(altitude / 100) * 100;
    const ticks: number[] = [];
    for (let a = center + 800; a >= center - 800; a -= 200) {
      if (a >= 0) ticks.push(a);
    }
    return ticks;
  }, [altitude]);

  // Compass ticks (heading +/- 60 deg)
  const compassTicks = useMemo(() => {
    const center = Math.round(heading / 10) * 10;
    const ticks: { deg: number; label: string }[] = [];
    for (let d = center - 60; d <= center + 60; d += 10) {
      const norm = (d + 360) % 360;
      let label = `${Math.floor(norm / 10)}`;
      if (norm === 0) label = "N";
      else if (norm === 90) label = "E";
      else if (norm === 180) label = "S";
      else if (norm === 270) label = "W";
      ticks.push({ deg: norm, label });
    }
    return ticks;
  }, [heading]);

  // ==========================================
  // ILS Localizer & Glideslope Deviation Engine
  // ==========================================
  const ilsTelemetry = useMemo(() => {
    const isApproachPhase =
      flight?.status === "APPROACH" ||
      altitude < 5000 ||
      apprMode;

    if (!isApproachPhase) {
      return {
        active: false,
        locDots: 0,
        gsDots: 0,
        locCaptured: false,
        gsCaptured: false,
        runwayHeading: 92,
        ilsFreq: "110.30",
      };
    }

    // Runway inbound course (e.g. 092 deg for RWY 09L)
    const runwayHeading = runway.startsWith("27") ? 272 : 92;
    const headingError = ((heading - runwayHeading + 180) % 360) - 180;
    // Localizer deviation clamped between -2.5 and +2.5 dots
    const locDots = Math.max(-2.5, Math.min(2.5, headingError / 5));

    // Glideslope 3-degree descent profile: target altitude = dist * 318 ft/NM
    // Approx glide path: if vspeed is ~ -750 fpm at 140kt, on slope
    const targetVs = -750;
    const vsError = vspeed - targetVs;
    // Glideslope deviation clamped between -2.5 (fly down) and +2.5 (fly up)
    const gsDots = Math.max(-2.5, Math.min(2.5, vsError / 300));

    const locCaptured = Math.abs(locDots) < 1.2;
    const gsCaptured = Math.abs(gsDots) < 1.2;

    return {
      active: true,
      locDots,
      gsDots,
      locCaptured,
      gsCaptured,
      runwayHeading,
      ilsFreq: "110.30",
    };
  }, [flight, altitude, apprMode, heading, runway, vspeed]);

  // ==========================================
  // TCAS II Resolution Advisory (RA/TA) Engine
  // ==========================================
  const tcasTelemetry = useMemo(() => {
    if (tcasMode === "STBY" || !flight || allFlights.length <= 1) {
      return {
        level: "CLEAR" as const,
        closestTarget: null,
        resolutionText: "TCAS STANDBY / CLEAR",
        requiredVsMin: 0,
        requiredVsMax: 0,
        threatDistanceNm: 99,
        threatAltDelta: 0,
      };
    }

    // Find nearest airborne traffic
    let nearestDist = 999;
    let nearestTraffic: FlightDTO | null = null;

    for (const other of allFlights) {
      if (other.id === flight.id) continue;
      const d = calcDistanceNm(flight.latitude, flight.longitude, other.latitude, other.longitude);
      if (d < nearestDist) {
        nearestDist = d;
        nearestTraffic = other;
      }
    }

    if (!nearestTraffic || nearestDist > 8.0) {
      return {
        level: "CLEAR" as const,
        closestTarget: null,
        resolutionText: "TCAS TA/RA ACTIVE · CLEAR",
        requiredVsMin: 0,
        requiredVsMax: 0,
        threatDistanceNm: nearestDist,
        threatAltDelta: 0,
      };
    }

    const altDelta = nearestTraffic.altitudeFt - altitude;
    const absAltDelta = Math.abs(altDelta);

    // RESOLUTION ADVISORY (RA): distance < 3.2 NM and altitude separation < 900 ft
    if (tcasMode === "TA_RA" && nearestDist < 3.5 && absAltDelta < 900) {
      // Determine climb or descend advisory
      const shouldClimb = altDelta <= 0; // Other is below or level -> CLIMB
      return {
        level: "RA" as const,
        closestTarget: nearestTraffic,
        resolutionText: shouldClimb ? "CLIMB, CLIMB NOW! (+1500 FPM)" : "DESCEND, DESCEND NOW! (-1500 FPM)",
        requiredVsMin: shouldClimb ? 1500 : -3500,
        requiredVsMax: shouldClimb ? 3500 : -1500,
        threatDistanceNm: nearestDist,
        threatAltDelta: altDelta,
      };
    }

    // TRAFFIC ADVISORY (TA): distance < 6.0 NM and altitude separation < 1500 ft
    if (nearestDist < 6.0 && absAltDelta < 1500) {
      return {
        level: "TA" as const,
        closestTarget: nearestTraffic,
        resolutionText: `TRAFFIC, TRAFFIC · ${nearestTraffic.callsign} (${nearestDist.toFixed(1)} NM, ${altDelta >= 0 ? "+" : ""}${altDelta} FT)`,
        requiredVsMin: 0,
        requiredVsMax: 0,
        threatDistanceNm: nearestDist,
        threatAltDelta: altDelta,
      };
    }

    return {
      level: "CLEAR" as const,
      closestTarget: nearestTraffic,
      resolutionText: "TCAS MONITORING · AIRSPACE CLEAR",
      requiredVsMin: 0,
      requiredVsMax: 0,
      threatDistanceNm: nearestDist,
      threatAltDelta: altDelta,
    };
  }, [flight, allFlights, tcasMode, altitude]);

  return (
    <Card className="border border-slate-800 bg-slate-950/90 text-slate-100 shadow-2xl backdrop-blur overflow-hidden">
      {/* Cockpit Top Bar / Flight Mode Annunciator (FMA) */}
      <CardHeader className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold text-white tracking-wide">
                PRIMARY FLIGHT DISPLAY (PFD) &bull; GLASS COCKPIT HUD
              </CardTitle>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
                EFIS / ADS-B OUT & IN
              </Badge>
              {ilsTelemetry.active && (
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] font-mono animate-pulse">
                  ILS {ilsTelemetry.ilsFreq} &bull; RWY {runway}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Aircraft: <span className="text-white font-bold">{callsign}</span> ({flight?.aircraftType || "B789"}) &bull; Squawk:{" "}
              <span className="text-cyan-400 font-bold">{squawk}</span> &bull; Phase:{" "}
              <span className="text-emerald-400 font-semibold">{flight?.phase || "Cruising"}</span>
            </p>
          </div>
        </div>

        {/* Flight Selection Dropdown */}
        {allFlights.length > 0 && onSelectFlight && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Select Aircraft:</span>
            <select
              value={flight?.id || ""}
              onChange={(e) => onSelectFlight(e.target.value)}
              aria-label="Select Aircraft for Primary Flight Display"
              className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              {allFlights.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.callsign} - {f.origin}&rarr;{f.destination} ({f.altitudeFt}ft, {f.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* FMA Banner (Flight Mode Annunciator) */}
        <div className="grid grid-cols-5 gap-1.5 p-1.5 rounded-lg bg-black/80 border border-slate-800 text-center font-mono text-xs select-none">
          <div className="p-1 rounded bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">AUTO-THROTTLE</div>
            <div className={`font-bold ${athrEngaged ? "text-emerald-400" : "text-slate-500"}`}>
              {athrEngaged ? "SPEED" : "ARM"}
            </div>
          </div>
          <div className="p-1 rounded bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">ROLL / LOC</div>
            <div className={cn("font-bold", ilsTelemetry.locCaptured ? "text-cyan-300" : "text-emerald-400")}>
              {ilsTelemetry.locCaptured ? "LOC CAP" : "LNAV"}
            </div>
          </div>
          <div className="p-1 rounded bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">PITCH / G/S</div>
            <div className={cn("font-bold", ilsTelemetry.gsCaptured ? "text-cyan-300" : "text-emerald-400")}>
              {ilsTelemetry.gsCaptured
                ? "G/S CAP"
                : Math.abs(altitude - targetAltitude) < 200
                ? "ALT CRZ"
                : "VNAV PATH"}
            </div>
          </div>
          <div className="p-1 rounded bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">APPROACH CAPABILITY</div>
            <div className="font-bold text-cyan-400">
              {ilsTelemetry.active ? "ILS CAT IIIb DUAL" : "RNAV / RNP 0.3"}
            </div>
          </div>
          <div className="p-1 rounded bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">COMMAND</div>
            <div className={`font-bold ${apEngaged ? "text-emerald-400" : "text-amber-400"}`}>
              {apEngaged ? "CMD 1 / FD" : "MANUAL"}
            </div>
          </div>
        </div>

        {/* TCAS Resolution / Traffic Advisory Alert Banner if Active */}
        {tcasTelemetry.level !== "CLEAR" && (
          <div
            className={cn(
              "flex items-center justify-between rounded-lg p-2.5 font-mono text-xs shadow-lg animate-pulse",
              tcasTelemetry.level === "RA"
                ? "border-2 border-red-500 bg-red-950/80 text-red-100"
                : "border border-amber-500/60 bg-amber-950/60 text-amber-200",
            )}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className={cn("h-4 w-4 shrink-0", tcasTelemetry.level === "RA" ? "text-red-400" : "text-amber-400")} />
              <span className="font-bold tracking-wider">
                {tcasTelemetry.level === "RA" ? "TCAS RESOLUTION ADVISORY (RA): " : "TCAS TRAFFIC ADVISORY (TA): "}
                {tcasTelemetry.resolutionText}
              </span>
            </div>
            {tcasTelemetry.level === "RA" && (
              <Badge className="bg-red-600 text-white font-bold text-[10px] animate-bounce">
                AVOIDANCE ACTIVE
              </Badge>
            )}
          </div>
        )}

        {/* The Avionics Display Instrument Bezel */}
        <div className="relative mx-auto max-w-2xl h-[420px] rounded-2xl border-4 border-slate-800 bg-black overflow-hidden shadow-[inset_0_0_25px_rgba(0,0,0,0.9)] select-none">
          {/* ================= ADI: Attitude Director Indicator (Horizon + Pitch) ================= */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {/* Rotating Horizon Disk for Bank Angle */}
            <div
              className="relative w-[700px] h-[700px] transition-transform duration-300 ease-out"
              style={{
                transform: `rotate(${-bankDeg}deg)`,
              }}
            >
              {/* Pitch Shift layer */}
              <div
                className="absolute inset-0 transition-transform duration-200 ease-out"
                style={{
                  transform: `translateY(${pitchDeg * 8}px)`,
                }}
              >
                {/* Sky (Blue) */}
                <div className="w-full h-[350px] bg-gradient-to-b from-[#0284c7] to-[#38bdf8]" />
                {/* Horizon Line */}
                <div className="w-full h-1 bg-white shadow-[0_0_6px_#fff]" />
                {/* Ground (Brown) */}
                <div className="w-full h-[350px] bg-gradient-to-b from-[#78350f] to-[#451a03]" />

                {/* Pitch Ladder Marks */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono text-[10px] text-white">
                  {/* +20 deg */}
                  <div className="absolute top-[190px] flex items-center gap-2">
                    <span className="font-bold">20</span>
                    <div className="w-16 h-0.5 bg-white border-b-2 border-white" />
                    <span className="font-bold">20</span>
                  </div>
                  {/* +10 deg */}
                  <div className="absolute top-[270px] flex items-center gap-2">
                    <span className="font-bold">10</span>
                    <div className="w-24 h-0.5 bg-white" />
                    <span className="font-bold">10</span>
                  </div>
                  {/* +5 deg */}
                  <div className="absolute top-[310px] flex items-center gap-2">
                    <div className="w-12 h-0.5 bg-white/70" />
                  </div>
                  {/* -5 deg */}
                  <div className="absolute top-[390px] flex items-center gap-2">
                    <div className="w-12 h-0.5 border-t border-dashed border-white/70" />
                  </div>
                  {/* -10 deg */}
                  <div className="absolute top-[430px] flex items-center gap-2">
                    <span className="font-bold">10</span>
                    <div className="w-24 h-0.5 border-t border-dashed border-white" />
                    <span className="font-bold">10</span>
                  </div>
                  {/* -20 deg */}
                  <div className="absolute top-[510px] flex items-center gap-2">
                    <span className="font-bold">20</span>
                    <div className="w-16 h-0.5 border-t-2 border-dashed border-white" />
                    <span className="font-bold">20</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Flight Director (FD) Crosshair Guidance (Magenta Bars) */}
          {fdEngaged && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Pitch Bar */}
              <div
                className="absolute w-44 h-1 bg-fuchsia-500/90 shadow-[0_0_8px_#d946ef] transition-transform duration-200"
                style={{
                  transform: `translateY(${Math.max(-40, Math.min(40, -pitchDeg * 2))}px)`,
                }}
              />
              {/* Roll Bar */}
              <div
                className="absolute h-44 w-1 bg-fuchsia-500/90 shadow-[0_0_8px_#d946ef] transition-transform duration-200"
                style={{
                  transform: `translateX(${Math.max(-40, Math.min(40, (targetHeading - heading) * 1.5))}px)`,
                }}
              />
            </div>
          )}

          {/* Fixed Boresight Crosshair / Aircraft Symbol */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative flex items-center">
              {/* Left Wing */}
              <div className="w-14 h-2 bg-amber-400 border border-black shadow-[0_0_4px_#fbbf24]" />
              <div className="w-2 h-4 bg-amber-400 border border-black shadow-[0_0_4px_#fbbf24]" />
              {/* Center Dot */}
              <div className="mx-6 w-3 h-3 rounded-full bg-amber-400 border border-black shadow-[0_0_6px_#fbbf24]" />
              {/* Right Wing */}
              <div className="w-2 h-4 bg-amber-400 border border-black shadow-[0_0_4px_#fbbf24]" />
              <div className="w-14 h-2 bg-amber-400 border border-black shadow-[0_0_4px_#fbbf24]" />
            </div>

            {/* Bank Angle Pointer Arc */}
            <div className="absolute top-4 flex flex-col items-center">
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-amber-400 shadow-[0_0_8px_#fbbf24]" />
              <div className="text-[10px] font-mono text-amber-300 font-bold mt-1">
                {Math.round(bankDeg)}°
              </div>
            </div>
          </div>

          {/* ================= ILS Localizer (LOC) Horizontal Scale ================= */}
          {ilsTelemetry.active && (
            <div className="absolute bottom-20 inset-x-0 flex flex-col items-center pointer-events-none font-mono">
              <div className="relative w-48 flex items-center justify-between px-2">
                {/* 5 Dots Scale */}
                <div className="h-1.5 w-1.5 rounded-full border border-white/60 bg-transparent" />
                <div className="h-1.5 w-1.5 rounded-full border border-white/60 bg-transparent" />
                <div className="h-2 w-0.5 bg-white/80" /> {/* Center */}
                <div className="h-1.5 w-1.5 rounded-full border border-white/60 bg-transparent" />
                <div className="h-1.5 w-1.5 rounded-full border border-white/60 bg-transparent" />

                {/* Localizer Deviation Diamond Pointer (Magenta) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 transition-transform duration-200"
                  style={{
                    left: `calc(50% + ${ilsTelemetry.locDots * 36}px - 6px)`,
                  }}
                >
                  <div className="h-3 w-3 rotate-45 border border-white bg-fuchsia-500 shadow-[0_0_8px_#d946ef]" />
                </div>
              </div>
              <span className="text-[9px] text-cyan-300 font-bold mt-1">
                LOC: {ilsTelemetry.locCaptured ? "CAPTURED" : "ARMED"} &bull; CRS {ilsTelemetry.runwayHeading}°
              </span>
            </div>
          )}

          {/* ================= ILS Glideslope (G/S) Vertical Scale ================= */}
          {ilsTelemetry.active && (
            <div className="absolute right-36 inset-y-0 my-auto h-48 flex flex-col justify-between items-center pointer-events-none font-mono">
              {/* 5 Vertical Dots Scale */}
              <div className="h-1.5 w-1.5 rounded-full border border-white/60 bg-transparent" />
              <div className="h-1.5 w-1.5 rounded-full border border-white/60 bg-transparent" />
              <div className="w-2 h-0.5 bg-white/80" /> {/* Center */}
              <div className="h-1.5 w-1.5 rounded-full border border-white/60 bg-transparent" />
              <div className="h-1.5 w-1.5 rounded-full border border-white/60 bg-transparent" />

              {/* Glideslope Deviation Diamond Pointer (Magenta) */}
              <div
                className="absolute left-1/2 -translate-x-1/2 transition-transform duration-200"
                style={{
                  top: `calc(50% - ${ilsTelemetry.gsDots * 36}px - 6px)`,
                }}
              >
                <div className="h-3 w-3 rotate-45 border border-white bg-fuchsia-500 shadow-[0_0_8px_#d946ef]" />
              </div>
            </div>
          )}

          {/* ================= Left: Airspeed Tape ================= */}
          <div className="absolute left-0 top-0 bottom-16 w-24 bg-black/75 border-r border-slate-700/80 flex flex-col justify-between pointer-events-none font-mono">
            {/* Target Speed Bug Top Banner */}
            <div className="p-1 bg-slate-900 border-b border-slate-700 text-center text-[10px] text-fuchsia-400 font-bold">
              SEL {targetSpeed}
            </div>

            {/* Rolling Airspeed Ticks */}
            <div className="relative flex-1 flex flex-col justify-around py-4 overflow-hidden">
              {speedTicks.map((s) => (
                <div key={s} className="flex items-center justify-between px-2 text-xs">
                  <span className={s === Math.round(speed / 10) * 10 ? "text-white font-bold" : "text-slate-400"}>
                    {s}
                  </span>
                  <div className={`h-0.5 ${s % 20 === 0 ? "w-3 bg-white" : "w-1.5 bg-slate-500"}`} />
                </div>
              ))}

              {/* Current Speed Indicator Box (Pointer) */}
              <div className="absolute inset-y-0 right-0 my-auto h-8 w-20 bg-slate-900/95 border-2 border-white rounded-l flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                <span className="text-base font-bold text-white tracking-wider">{Math.round(speed)}</span>
              </div>
            </div>

            {/* Mach & V-Speeds Bottom Banner */}
            <div className="p-1 bg-slate-900 border-t border-slate-700 text-center text-[10px] text-slate-300 font-bold">
              M {mach} &bull; GS {Math.round(speed * 1.05)}
            </div>
          </div>

          {/* ================= Right: Altimeter & VSI Tape ================= */}
          <div className="absolute right-0 top-0 bottom-16 w-32 bg-black/75 border-l border-slate-700/80 flex flex-col justify-between pointer-events-none font-mono">
            {/* Target Altitude Bug */}
            <div className="p-1 bg-slate-900 border-b border-slate-700 text-center text-[10px] text-fuchsia-400 font-bold">
              SEL {targetAltitude} FT
            </div>

            {/* Rolling Altitude Ticks */}
            <div className="relative flex-1 flex flex-col justify-around py-4 overflow-hidden">
              {altTicks.map((a) => (
                <div key={a} className="flex items-center justify-between px-2 text-xs">
                  <div className={`h-0.5 ${a % 1000 === 0 ? "w-3 bg-white" : "w-1.5 bg-slate-500"}`} />
                  <span className={a % 1000 === 0 ? "text-white font-bold" : "text-slate-400"}>
                    {a}
                  </span>
                </div>
              ))}

              {/* Current Altitude Indicator Box (Pointer) */}
              <div className="absolute inset-y-0 left-0 my-auto h-8 w-24 bg-slate-900/95 border-2 border-emerald-400 rounded-r flex items-center justify-center shadow-[0_0_10px_rgba(52,211,153,0.4)]">
                <span className="text-base font-bold text-emerald-300 tracking-wider">
                  {Math.round(altitude)}
                </span>
              </div>
            </div>

            {/* Baro QNH Setting */}
            <div className="p-1 bg-slate-900 border-t border-slate-700 text-center text-[10px] text-cyan-300 font-bold">
              {baroMode === "STD" ? "STD 29.92" : "QNH 1013 HPA"}
            </div>
          </div>

          {/* ================= Bottom: Horizontal Situation Compass Rose ================= */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-black/90 border-t border-slate-700 flex items-center justify-between px-6 pointer-events-none font-mono">
            {/* Digital Heading Indicator */}
            <div className="text-xs">
              <span className="text-slate-400 text-[9px] block">MAG HDG</span>
              <span className="text-lg font-bold text-cyan-300">
                {String(Math.round(heading)).padStart(3, "0")}°
              </span>
            </div>

            {/* Rolling Compass Ticks */}
            <div className="flex-1 flex items-center justify-around px-4">
              {compassTicks.map((t, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className={`h-2 ${t.label.length === 1 ? "w-0.5 bg-amber-400" : "w-0.5 bg-slate-500"}`} />
                  <span
                    className={`text-[10px] font-bold ${
                      t.label === "N" ? "text-red-400" : t.label.length === 1 ? "text-amber-300" : "text-slate-400"
                    }`}
                  >
                    {t.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Target Selected Heading */}
            <div className="text-xs text-right">
              <span className="text-slate-400 text-[9px] block">SEL HDG</span>
              <span className="text-base font-bold text-fuchsia-400">
                {String(targetHeading).padStart(3, "0")}°
              </span>
            </div>
          </div>
        </div>

        {/* Mode Control Panel (MCP) Tactical Autopilot Knobs */}
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 uppercase text-[10px] block">Autopilot & Guidance:</span>
            <Button
              size="sm"
              variant={apEngaged ? "default" : "outline"}
              onClick={() => setApEngaged(!apEngaged)}
              className={`h-7 px-3 text-[11px] font-bold ${
                apEngaged ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "border-slate-700 text-slate-400"
              }`}
            >
              AP 1 {apEngaged ? "ENGAGED" : "OFF"}
            </Button>
            <Button
              size="sm"
              variant={athrEngaged ? "default" : "outline"}
              onClick={() => setAthrEngaged(!athrEngaged)}
              className={`h-7 px-3 text-[11px] font-bold ${
                athrEngaged ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "border-slate-700 text-slate-400"
              }`}
            >
              A/THR {athrEngaged ? "ARMED" : "OFF"}
            </Button>
            <Button
              size="sm"
              variant={fdEngaged ? "default" : "outline"}
              onClick={() => setFdEngaged(!fdEngaged)}
              className={`h-7 px-3 text-[11px] font-bold ${
                fdEngaged ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "border-slate-700 text-slate-400"
              }`}
            >
              FD {fdEngaged ? "ON" : "OFF"}
            </Button>
            <Button
              size="sm"
              variant={apprMode ? "default" : "outline"}
              onClick={() => setApprMode(!apprMode)}
              className={`h-7 px-3 text-[11px] font-bold ${
                apprMode ? "bg-fuchsia-600 hover:bg-fuchsia-500 text-white" : "border-slate-700 text-slate-400"
              }`}
            >
              APP/ILS {apprMode ? "ARMED" : "OFF"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTcasMode(tcasMode === "TA_RA" ? "TA_ONLY" : tcasMode === "TA_ONLY" ? "STBY" : "TA_RA")}
              className={`h-7 px-2.5 text-[10px] font-bold border-slate-700 ${
                tcasMode === "TA_RA" ? "text-emerald-400" : tcasMode === "TA_ONLY" ? "text-amber-400" : "text-slate-500"
              }`}
            >
              TCAS: {tcasMode}
            </Button>
          </div>

          {/* Tactical Selectors */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">SPD BUG:</span>
              <input
                type="number"
                aria-label="Target Airspeed Bug in Knots"
                value={targetSpeed}
                onChange={(e) => setTargetSpeed(Number(e.target.value))}
                step={5}
                min={120}
                max={350}
                className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center text-fuchsia-400 font-bold focus:outline-none focus:border-fuchsia-500"
              />
              <span className="text-[10px] text-slate-500">KT</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">ALT BUG:</span>
              <input
                type="number"
                aria-label="Target Altitude Bug in Feet"
                value={targetAltitude}
                onChange={(e) => setTargetAltitude(Number(e.target.value))}
                step={1000}
                min={1000}
                max={45000}
                className="w-20 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center text-fuchsia-400 font-bold focus:outline-none focus:border-fuchsia-500"
              />
              <span className="text-[10px] text-slate-500">FT</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">HDG BUG:</span>
              <input
                type="number"
                aria-label="Target Heading Bug in Degrees"
                value={targetHeading}
                onChange={(e) => setTargetHeading(Number(e.target.value))}
                step={5}
                min={0}
                max={359}
                className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center text-fuchsia-400 font-bold focus:outline-none focus:border-fuchsia-500"
              />
              <span className="text-[10px] text-slate-500">°</span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setBaroMode(baroMode === "STD" ? "QNH" : "STD")}
              className="h-7 px-2 text-[10px] border-slate-700 text-cyan-300 hover:text-white"
            >
              BARO: {baroMode}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
