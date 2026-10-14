"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Compass,
  Download,
  Eye,
  FastForward,
  FileText,
  Flame,
  Gauge,
  History,
  Layers,
  Navigation,
  Pause,
  Plane,
  Play,
  Radio,
  RefreshCw,
  Rewind,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Volume2,
  Wind,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateInvestigationReport,
  getReplayScenarioById,
  listReplayScenarios,
  sampleAircraftTelemetry,
  type IncidentInvestigationReport,
  type ReplayIncidentScenario,
  type TrajectoryBreadcrumb,
} from "@/lib/services/radar-replay-service";
import { cn } from "@/lib/utils";

export function RadarReplaySection({ activeStation = "HYD" }: { activeStation?: string }) {
  const scenarios = useMemo(() => listReplayScenarios(), []);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0].id);

  const scenario = useMemo(
    () => getReplayScenarioById(selectedScenarioId) || scenarios[0],
    [selectedScenarioId, scenarios],
  );

  const [currentSecond, setCurrentSecond] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedAircraftCallsign, setSelectedAircraftCallsign] = useState<string>(
    scenario.aircraft[0]?.callsign || "",
  );
  const [showReport, setShowReport] = useState<boolean>(false);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentSecond((prev) => {
        const next = prev + playbackSpeed;
        if (next >= scenario.durationSeconds) {
          setIsPlaying(false);
          return scenario.durationSeconds;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, scenario.durationSeconds]);

  // Sample current aircraft telemetry
  const sampledAircraft = useMemo(() => {
    return scenario.aircraft.map((ac) => ({
      callsign: ac.callsign,
      aircraftType: ac.aircraftType,
      airline: ac.airline,
      squawk: ac.squawk,
      route: ac.route,
      telemetry: sampleAircraftTelemetry(ac.track, currentSecond),
      fullTrack: ac.track,
    }));
  }, [scenario, currentSecond]);

  const activeAircraft = useMemo(() => {
    return (
      sampledAircraft.find((a) => a.callsign === selectedAircraftCallsign) ||
      sampledAircraft[0]
    );
  }, [sampledAircraft, selectedAircraftCallsign]);

  // Chart data for altitude profile
  const chartData = useMemo(() => {
    const track = activeAircraft?.fullTrack || [];
    return track.map((pt) => ({
      second: pt.secondOffset,
      time: pt.timestampZulu.slice(3, 8),
      altitude: pt.altitudeFt,
      speed: pt.speedKt,
      verticalSpeed: pt.verticalSpeedFpm,
    }));
  }, [activeAircraft]);

  const report = useMemo<IncidentInvestigationReport>(() => {
    return generateInvestigationReport(scenario.id);
  }, [scenario]);

  // Formatter for time display
  const currentZulu = activeAircraft?.telemetry.timestampZulu || "12:00:00Z";

  return (
    <div className="space-y-6">
      {/* Header & Scenario Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            ADS-B 4D Radar Replay & Incident Reconstruction
          </h2>
          <p className="text-sm text-muted-foreground">
            Multi-target 4D historical trajectory playback, Blackbox FDR flight telemetry, and ICAO Annex 13 incident analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedScenarioId}
            onChange={(e) => {
              const nextId = e.target.value;
              setSelectedScenarioId(nextId);
              setCurrentSecond(0);
              setIsPlaying(false);
              const nextScenario = scenarios.find((s) => s.id === nextId) || scenarios[0];
              setSelectedAircraftCallsign(nextScenario.aircraft[0]?.callsign || "");
            }}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.severity === "CRITICAL" ? "🔴 " : s.severity === "WARNING" ? "🟡 " : "🟢 "}
                {s.title}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReport(!showReport)}
            className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold"
          >
            <FileText className="h-3.5 w-3.5" />
            {showReport ? "Close Report" : "Safety Report"}
          </Button>
        </div>
      </div>

      {/* Incident Safety Alert Banner if Critical */}
      {scenario.severity === "CRITICAL" && (
        <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-200">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold uppercase tracking-wider block text-red-300">
                CRITICAL AIRSPACE INCIDENT RECONSTRUCTION
              </span>
              <span>{scenario.description}</span>
            </div>
          </div>
          <Badge variant="destructive" className="shrink-0 text-xs font-mono">
            CPA: {scenario.cpaDistanceNm} NM / {scenario.cpaAltitudeFt} FT
          </Badge>
        </div>
      )}

      {/* Main Radar Replay Canvas & FDR Telemetry Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Scope Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60 bg-card/90 overflow-hidden">
            <CardHeader className="py-2.5 px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-mono font-semibold text-foreground">
                  ADS-B PRIMARY RADAR REPLAY &bull; {scenario.airportCode} TERMINAL SECTOR
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-muted-foreground">TIME:</span>
                <span className="font-bold text-primary">{currentZulu}</span>
                <span className="text-muted-foreground">
                  (+{Math.round(currentSecond)}s / {scenario.durationSeconds}s)
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0 relative">
              {/* SVG 4D Radar Display */}
              <div className="h-[440px] w-full bg-slate-950 relative flex items-center justify-center overflow-hidden select-none">
                <svg className="w-full h-full" viewBox="0 0 600 440">
                  <defs>
                    <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Range Rings: 5, 10, 15, 20 NM */}
                  <circle cx="300" cy="220" r="60" fill="none" stroke="#0369a1" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
                  <circle cx="300" cy="220" r="120" fill="none" stroke="#0369a1" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
                  <circle cx="300" cy="220" r="180" fill="none" stroke="#0369a1" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
                  <circle cx="300" cy="220" r="210" fill="url(#radarSweep)" stroke="#0284c7" strokeWidth="1.5" opacity="0.6" />

                  {/* Crosshairs & Heading ticks */}
                  <line x1="300" y1="10" x2="300" y2="430" stroke="#0369a1" strokeWidth="0.8" opacity="0.3" />
                  <line x1="10" y1="220" x2="590" y2="220" stroke="#0369a1" strokeWidth="0.8" opacity="0.3" />

                  {/* Airport Center Marker */}
                  <circle cx="300" cy="220" r="4" fill="#38bdf8" />
                  <text x="308" y="218" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    HYD (VOHS)
                  </text>

                  {/* Runway 09L/27R Extended Centerline */}
                  <line x1="180" y1="220" x2="420" y2="220" stroke="#e0f2fe" strokeWidth="2.5" opacity="0.6" />

                  {/* Waypoint BOPOL */}
                  <polygon points="420,150 425,160 415,160" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="430" y="158" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    BOPOL
                  </text>

                  {/* Aircraft Trajectories and Current Blips */}
                  {sampledAircraft.map((ac) => {
                    const isSelected = ac.callsign === selectedAircraftCallsign;
                    const tele = ac.telemetry;

                    // Project lat/lon to radar SVG space (approximate projection relative to airport 17.24, 78.43)
                    const x = 300 + (tele.longitude - 78.43) * 600;
                    const y = 220 - (tele.latitude - 17.24) * 600;

                    const isRa = tele.tcasState === "RESOLUTION_ADVISORY";
                    const isTa = tele.tcasState === "TRAFFIC_ADVISORY";

                    // Breadcrumb trail up to current second
                    const trailPoints = ac.fullTrack
                      .filter((pt) => pt.secondOffset <= currentSecond)
                      .map((pt) => {
                        const tx = 300 + (pt.longitude - 78.43) * 600;
                        const ty = 220 - (pt.latitude - 17.24) * 600;
                        return `${tx},${ty}`;
                      })
                      .join(" ");

                    return (
                      <g
                        key={ac.callsign}
                        className="cursor-pointer"
                        onClick={() => setSelectedAircraftCallsign(ac.callsign)}
                      >
                        {/* Historical Trail Ribbon */}
                        {trailPoints && (
                          <polyline
                            points={trailPoints}
                            fill="none"
                            stroke={isSelected ? "#00f0ff" : "#38bdf8"}
                            strokeWidth={isSelected ? "2" : "1.2"}
                            strokeDasharray="4,2"
                            opacity={isSelected ? "0.8" : "0.5"}
                          />
                        )}

                        {/* TCAS Conflict Halo */}
                        {isRa && (
                          <circle
                            cx={x}
                            cy={y}
                            r="24"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2"
                            className="animate-ping"
                          />
                        )}
                        {isTa && (
                          <circle
                            cx={x}
                            cy={y}
                            r="20"
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="1.5"
                          />
                        )}

                        {/* Target Blip Triangle */}
                        <g transform={`translate(${x}, ${y}) rotate(${tele.headingDeg})`}>
                          <polygon
                            points="0,-9 6,7 -6,7"
                            fill={isRa ? "#ef4444" : isTa ? "#f59e0b" : isSelected ? "#00f0ff" : "#38bdf8"}
                          />
                        </g>

                        {/* Radar Secondary Data Block */}
                        <g transform={`translate(${x + 10}, ${y - 18})`}>
                          <rect
                            x="-2"
                            y="-10"
                            width="70"
                            height="34"
                            fill="#020617"
                            fillOpacity="0.85"
                            stroke={isSelected ? "#00f0ff" : "#1e293b"}
                            strokeWidth="1"
                            rx="2"
                          />
                          <text x="2" y="2" fill="#f8fafc" fontSize="10" fontFamily="monospace" fontWeight="bold">
                            {ac.callsign}
                          </text>
                          <text x="2" y="12" fill={isRa ? "#ef4444" : "#38bdf8"} fontSize="9" fontFamily="monospace">
                            FL{Math.round(tele.altitudeFt / 100)} {tele.verticalSpeedFpm > 0 ? "▲" : tele.verticalSpeedFpm < 0 ? "▼" : "—"} {tele.speedKt}
                          </text>
                          <text x="2" y="21" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                            {ac.aircraftType.slice(0, 4)} {ac.squawk}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>

                {/* Radar Overlay Watermark */}
                <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-500">
                  RANGE: 20 NM &bull; SWEEP: ADS-B 1.0 SEC &bull; TCAS II V7.1
                </div>

                {/* Conflict Alert Legend */}
                {scenario.cpaDistanceNm && (
                  <div className="absolute top-3 right-3 p-2 rounded bg-slate-900/90 border border-slate-700/80 text-[10px] font-mono space-y-0.5">
                    <div className="text-slate-400 uppercase font-bold">Closest Approach:</div>
                    <div className="text-emerald-400 font-bold">
                      DIST: {scenario.cpaDistanceNm} NM | ALT: {scenario.cpaAltitudeFt} FT
                    </div>
                  </div>
                )}
              </div>

              {/* Time Scrubber Timeline Bar */}
              <div className="p-4 border-t border-border/50 bg-card/60 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">00:00:00Z</span>
                  <span className="font-bold text-foreground">
                    SCRUBBER: {Math.round((currentSecond / scenario.durationSeconds) * 100)}% &bull;{" "}
                    {currentZulu}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(
                      new Date("2026-10-11T12:00:00Z").getTime() + scenario.durationSeconds * 1000,
                    )
                      .toISOString()
                      .slice(11, 19)}
                    Z
                  </span>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max={scenario.durationSeconds}
                  step="1"
                  value={currentSecond}
                  onChange={(e) => setCurrentSecond(Number(e.target.value))}
                  className="w-full accent-primary h-2 cursor-pointer bg-muted rounded-lg"
                />

                {/* Transport Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => setCurrentSecond(0)}
                      title="Reset to Beginning"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => setCurrentSecond((prev) => Math.max(0, prev - 10))}
                      title="Step Back 10s"
                    >
                      <Rewind className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs font-semibold gap-1"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-3 w-3" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" /> Play 4D Track
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        setCurrentSecond((prev) =>
                          Math.min(scenario.durationSeconds, prev + 10),
                        )
                      }
                      title="Step Forward 10s"
                    >
                      <FastForward className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Speed Multipliers */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-muted-foreground mr-1">SPEED:</span>
                    {[1, 2, 5, 15, 30].map((spd) => (
                      <Button
                        key={spd}
                        variant={playbackSpeed === spd ? "default" : "outline"}
                        size="sm"
                        className="h-6 px-1.5 text-[10px] font-mono font-bold"
                        onClick={() => setPlaybackSpeed(spd)}
                      >
                        {spd}x
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recharts Altitude Profile Timeline */}
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="py-2.5 px-4 border-b border-border/50">
              <CardTitle className="text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Flight Profile & Descent Trajectory ({activeAircraft?.callsign})
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Current Alt: {activeAircraft?.telemetry.altitudeFt} FT
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} unit="ft" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      fontSize: "11px",
                      fontFamily: "monospace",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="altitude"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                    name="Altitude (ft)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Blackbox FDR Flight Data Recorder HUD */}
        <div className="space-y-4">
          <Card className="border-border/60 bg-card/90">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" />
                  Blackbox FDR Telemetry HUD
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs text-primary">
                  {activeAircraft?.callsign}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Synchronized flight data recorder readout sampled from ADS-B transponder data blocks.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Aircraft Switcher if multiple in scenario */}
              {scenario.aircraft.length > 1 && (
                <div className="flex items-center gap-1.5 p-1 rounded bg-muted/40 border border-border/50">
                  {scenario.aircraft.map((ac) => (
                    <Button
                      key={ac.callsign}
                      size="sm"
                      variant={selectedAircraftCallsign === ac.callsign ? "default" : "ghost"}
                      className="flex-1 text-xs h-7 font-mono font-bold"
                      onClick={() => setSelectedAircraftCallsign(ac.callsign)}
                    >
                      {ac.callsign} ({ac.aircraftType.slice(0, 4)})
                    </Button>
                  ))}
                </div>
              )}

              {/* Digital Flight Instruments Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-background border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">CALIBRATED AIRSPEED</span>
                  <span className="text-lg font-bold text-foreground">
                    {activeAircraft?.telemetry.speedKt}{" "}
                    <span className="text-xs font-normal text-muted-foreground">KIAS</span>
                  </span>
                </div>

                <div className="p-2.5 rounded bg-background border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">PRESSURE ALTITUDE</span>
                  <span className="text-lg font-bold text-primary">
                    {activeAircraft?.telemetry.altitudeFt}{" "}
                    <span className="text-xs font-normal text-muted-foreground">FT</span>
                  </span>
                </div>

                <div className="p-2.5 rounded bg-background border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">VERTICAL SPEED</span>
                  <span
                    className={cn(
                      "text-lg font-bold",
                      (activeAircraft?.telemetry.verticalSpeedFpm || 0) > 0
                        ? "text-emerald-400"
                        : (activeAircraft?.telemetry.verticalSpeedFpm || 0) < 0
                        ? "text-amber-400"
                        : "text-foreground",
                    )}
                  >
                    {activeAircraft?.telemetry.verticalSpeedFpm > 0 ? "+" : ""}
                    {activeAircraft?.telemetry.verticalSpeedFpm}{" "}
                    <span className="text-xs font-normal text-muted-foreground">FPM</span>
                  </span>
                </div>

                <div className="p-2.5 rounded bg-background border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">MAGNETIC TRACK</span>
                  <span className="text-lg font-bold text-foreground">
                    {activeAircraft?.telemetry.headingDeg}°
                  </span>
                </div>

                <div className="p-2.5 rounded bg-background border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">PITCH / ROLL ATTITUDE</span>
                  <span className="text-sm font-bold text-foreground">
                    P: {activeAircraft?.telemetry.pitchDeg}° | R: {activeAircraft?.telemetry.rollDeg}°
                  </span>
                </div>

                <div className="p-2.5 rounded bg-background border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">ENGINE N1 & FUEL</span>
                  <span className="text-sm font-bold text-foreground">
                    {activeAircraft?.telemetry.n1Percent}% N1 | {activeAircraft?.telemetry.fuelFlowKgh} kg/h
                  </span>
                </div>
              </div>

              {/* Flight Mode Annunciator & TCAS Status */}
              <div className="p-3 rounded bg-muted/40 border border-border/60 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">TCAS AVIONICS:</span>
                  <Badge
                    variant={
                      activeAircraft?.telemetry.tcasState === "RESOLUTION_ADVISORY"
                        ? "destructive"
                        : activeAircraft?.telemetry.tcasState === "TRAFFIC_ADVISORY"
                        ? "warning"
                        : "outline"
                    }
                    className="text-[10px] font-bold"
                  >
                    {activeAircraft?.telemetry.tcasState}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">FLIGHT PHASE:</span>
                  <span className="text-foreground font-semibold">{activeAircraft?.telemetry.phase}</span>
                </div>
              </div>

              {/* Radio Clearance Log at this second */}
              {activeAircraft?.telemetry.atcClearance && (
                <div className="p-3 rounded bg-primary/10 border border-primary/30 space-y-1">
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                    <Radio className="h-3 w-3" />
                    Synchronized ATC Radio Transmission
                  </span>
                  <p className="text-xs font-mono text-foreground italic leading-relaxed">
                    &ldquo;{activeAircraft?.telemetry.atcClearance}&rdquo;
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Safety Incident Report Modal / Drawer */}
      {showReport && (
        <Card className="border-border/60 bg-card/95 shadow-lg">
          <CardHeader className="py-3 px-4 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                ICAO Annex 13 Safety Incident Investigation Report ({report.investigationRef})
              </CardTitle>
              <CardDescription className="text-xs">
                Official reconstruction summary, minimum separation breach analysis, and systemic safety recommendations.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {report.severity}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs font-mono">
            {/* Closest Point of Approach Box */}
            <div className="p-3 rounded bg-muted/40 border border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground block">CLOSEST HORIZONTAL SEP</span>
                <span className="text-sm font-bold text-foreground">
                  {report.closestPointOfApproach.horizontalSeparationNm} NM (Min: 5.0 NM)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">CLOSEST VERTICAL SEP</span>
                <span className="text-sm font-bold text-foreground">
                  {report.closestPointOfApproach.verticalSeparationFt} FT (Min: 1,000 FT)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">ICAO STANDARD COMPLIANT</span>
                <Badge
                  variant={report.closestPointOfApproach.icaoStandardMet ? "outline" : "destructive"}
                  className="text-[10px] mt-0.5"
                >
                  {report.closestPointOfApproach.icaoStandardMet ? "STANDARD MET" : "SEPARATION LOSS"}
                </Badge>
              </div>
            </div>

            {/* Findings & Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="font-bold text-foreground text-xs uppercase tracking-wider block">
                  Safety Findings:
                </span>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                  {report.safetyFindings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-primary text-xs uppercase tracking-wider block">
                  Recommendations:
                </span>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                  {report.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
