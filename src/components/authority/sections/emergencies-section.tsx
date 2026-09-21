"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Flame,
  PhoneCall,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Truck,
  Users,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  Plane,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { FlightDTO } from "@/lib/domain";

export interface LiveEmergencyEvent {
  id: string;
  type: string;
  flightId: string;
  callsign: string;
  squawk: "7700" | "7600" | "7500";
  time: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  details: string;
  assignedRunway: string;
  arffDispatched: boolean;
  foamLaid: boolean;
  resolved: boolean;
}

const DRILL_SCENARIOS = [
  {
    type: "ENGINE FIRE / HYDRAULIC LOSS",
    squawk: "7700" as const,
    severity: "CRITICAL" as const,
    label: "Engine 2 Fire & Hydraulic Loss",
    details: "Uncontained fire warning on engine 2 with hydraulic system A pressure decay. Immediate priority landing clearance required.",
    defaultRunway: "04R",
  },
  {
    type: "RAPID DECOMPRESSION",
    squawk: "7700" as const,
    severity: "CRITICAL" as const,
    label: "Cabin Depressurization / Emergency Descent",
    details: "Loss of cabin differential pressure at FL320. Emergency descent to 10,000 feet initiated with passenger oxygen masks deployed.",
    defaultRunway: "04L",
  },
  {
    type: "NORDO / COMMUNICATIONS FAILURE",
    squawk: "7600" as const,
    severity: "HIGH" as const,
    label: "Complete VHF Radio Loss (NORDO)",
    details: "Total loss of primary and secondary VHF radio transceivers. Aircraft following standard lost-comms route; tower light gun signals ready.",
    defaultRunway: "31L",
  },
  {
    type: "MEDICAL CRITICAL IN-FLIGHT",
    squawk: "7700" as const,
    severity: "HIGH" as const,
    label: "Passenger Cardiac Arrest In-Flight",
    details: "CPR in progress onboard. Priority vector to nearest stand; advanced life support ambulance requested at gate stand.",
    defaultRunway: "04R",
  },
];

const INITIAL_EMERGENCIES: LiveEmergencyEvent[] = [
  {
    id: "emg-fdx901",
    type: "HYDRAULIC CAUTION / SQUAWK 7700",
    flightId: "flt-fdx901",
    callsign: "FDX901",
    squawk: "7700",
    time: "11:32Z",
    severity: "CRITICAL",
    details: "Hydraulic caution, priority return. Requesting runway 04R with ARFF crash tenders standing by.",
    assignedRunway: "04R",
    arffDispatched: true,
    foamLaid: true,
    resolved: false,
  },
];

export function EmergenciesSection() {
  const [events, setEvents] = useState<LiveEmergencyEvent[]>(INITIAL_EMERGENCIES);
  const [flights, setFlights] = useState<FlightDTO[]>([]);
  const [selectedFlightCallsign, setSelectedFlightCallsign] = useState<string>("AAL245");
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const [customDetails, setCustomDetails] = useState<string>("");
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [sirenPlaying, setSirenPlaying] = useState<boolean>(false);

  // Ingest live flights from simulation
  useEffect(() => {
    async function loadFlights() {
      try {
        const res = await fetch("/api/flights");
        if (res.ok) {
          const data = await res.json();
          const list: FlightDTO[] = data.flights || [];
          if (list.length > 0) {
            setFlights(list);
            const activeCallsign = list[0]?.callsign || "AAL245";
            setSelectedFlightCallsign((prev) => prev || activeCallsign);

            // Ingest any active emergency flights from db
            const dbEmergencies = list
              .filter((f) => f.status === "EMERGENCY" || f.squawk === "7700" || f.squawk === "7600")
              .map((f) => ({
                id: `emg-${f.id}`,
                type: f.phase || "AIRBORNE EMERGENCY",
                flightId: f.id,
                callsign: f.callsign,
                squawk: (f.squawk === "7600" ? "7600" : "7700") as "7700" | "7600",
                time: new Date().toLocaleTimeString(),
                severity: "CRITICAL" as const,
                details: `${f.airline} ${f.aircraftType} declared emergency. Altitude: ${f.altitudeFt} ft, Speed: ${f.speedKt} kt.`,
                assignedRunway: f.runway || "04R",
                arffDispatched: true,
                foamLaid: true,
                resolved: false,
              }));

            if (dbEmergencies.length > 0) {
              setEvents((prev) => {
                const map = new Map(prev.map((e) => [e.callsign, e]));
                dbEmergencies.forEach((e) => {
                  if (!map.has(e.callsign)) map.set(e.callsign, e);
                });
                return Array.from(map.values());
              });
            }
          }
        }
      } catch {
        // fallback
      }
    }

    loadFlights();
  }, []);

  // Web Audio Synthesizer: Siren & Alert Tones
  const playSiren = useCallback(
    (durationSeconds = 1.8) => {
      if (!audioEnabled || typeof window === "undefined") return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        setSirenPlaying(true);
        osc.type = "sawtooth";
        const now = ctx.currentTime;

        // Modulate siren wail (600Hz -> 950Hz -> 600Hz)
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(950, now + 0.45);
        osc.frequency.linearRampToValueAtTime(600, now + 0.9);
        osc.frequency.linearRampToValueAtTime(950, now + 1.35);
        osc.frequency.linearRampToValueAtTime(600, now + durationSeconds);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + durationSeconds);

        setTimeout(() => setSirenPlaying(false), durationSeconds * 1000);
      } catch {
        setSirenPlaying(false);
      }
    },
    [audioEnabled]
  );

  // Trigger Crisis Injection
  const handleInjectCrisis = async (e: React.FormEvent) => {
    e.preventDefault();
    const scenario = DRILL_SCENARIOS[selectedScenarioIndex];
    const targetFlight = flights.find((f) => f.callsign === selectedFlightCallsign);
    const flightId = targetFlight ? targetFlight.id : `flt-${selectedFlightCallsign.toLowerCase()}`;

    playSiren(2.2);

    const newEvent: LiveEmergencyEvent = {
      id: `emg-${Date.now()}`,
      type: scenario.type,
      flightId,
      callsign: selectedFlightCallsign,
      squawk: scenario.squawk,
      time: new Date().toLocaleTimeString(),
      severity: scenario.severity,
      details: customDetails || scenario.details,
      assignedRunway: scenario.defaultRunway,
      arffDispatched: true,
      foamLaid: true,
      resolved: false,
    };

    setEvents((prev) => [newEvent, ...prev]);
    setCustomDetails("");

    // Dispatch real command to operations backend
    try {
      await fetch("/api/operations/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightId,
          command: {
            type: "DECLARE_EMERGENCY",
            flightId,
            issuedBy: "CRISIS-COMMAND",
            note: scenario.details,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      // Update flight squawk and status
      await fetch(`/api/flights/${flightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "EMERGENCY",
          squawk: scenario.squawk,
        }),
      });
    } catch {
      // handled gracefully
    }
  };

  const toggleDispatchARFF = (id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, arffDispatched: !e.arffDispatched } : e))
    );
  };

  const handleResolveEmergency = async (event: LiveEmergencyEvent) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, resolved: true, arffDispatched: false } : e))
    );

    try {
      await fetch("/api/operations/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightId: event.flightId,
          command: {
            type: "RESOLVE_EMERGENCY",
            flightId: event.flightId,
            issuedBy: "CRISIS-COMMAND",
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch {
      //
    }
  };

  const activeIncidents = events.filter((e) => !e.resolved);

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Siren className={`h-6 w-6 text-rose-500 ${activeIncidents.length > 0 ? "animate-pulse" : ""}`} />
            Emergency Operations & ARFF Crisis Response Center
          </h2>
          <p className="text-xs text-slate-400">
            Distress squawk transponder monitoring, Category 10 ARFF foam tenders, runway isolation & tactical crisis drills.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-slate-400 hover:text-white"
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4 text-rose-400 mr-1.5" /> : <VolumeX className="h-4 w-4 text-slate-500 mr-1.5" />}
            {audioEnabled ? "Siren Audio ON" : "Siren Muted"}
          </Button>
          <Badge
            variant={activeIncidents.length > 0 ? "destructive" : "outline"}
            className={`text-xs ${activeIncidents.length > 0 ? "animate-pulse" : "text-slate-400"}`}
          >
            {activeIncidents.length} ACTIVE CRISIS INCIDENTS
          </Badge>
        </div>
      </div>

      {/* ARFF Fleet Readiness Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-rose-400" />
              ICAO ARFF Category
            </span>
            <div className="text-xl font-bold text-white">CATEGORY 10</div>
            <div className="text-[10px] text-slate-500">A380 / B777 Certified</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-rose-400" />
              Crash Foam Tenders
            </span>
            <div className="text-xl font-bold text-emerald-400">6 / 6 Operational</div>
            <div className="text-[10px] text-slate-500">Response &lt; 180s Runway End</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              AFFF Foam Stored
            </span>
            <div className="text-xl font-bold text-amber-300">34,000 Liters</div>
            <div className="text-[10px] text-slate-500">Discharge Rate: 6,000 L/min</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase flex items-center gap-1.5">
              <PhoneCall className="h-3.5 w-3.5 text-rose-400" />
              VHF Guard Channel
            </span>
            <div className="text-xl font-bold text-rose-400">121.500 MHz</div>
            <div className="text-[10px] text-slate-500">Continuous 24/7 Monitoring</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Crisis Injection Cockpit & Incident Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Crisis Scenario Injector Form */}
        <Card className="border-rose-500/40 bg-slate-900/90 backdrop-blur-xl shadow-2xl lg:col-span-1">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-rose-400" />
              Tactical Crisis Drill & Emergency Injector
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Trigger simulated emergency scenarios to evaluate airfield crash response.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <form onSubmit={handleInjectCrisis} className="space-y-3.5 text-xs">
              {/* Target Aircraft Selector */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">
                  Target Simulated Aircraft:
                </label>
                <select
                  value={selectedFlightCallsign}
                  onChange={(e) => setSelectedFlightCallsign(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-2.5 text-xs text-white focus:ring-1 focus:ring-rose-500"
                >
                  {flights.map((f) => (
                    <option key={f.id} value={f.callsign}>
                      {f.callsign} ({f.airline} · {f.aircraftType} · {f.status})
                    </option>
                  ))}
                  {!flights.some((f) => f.callsign === "AAL245") && (
                    <option value="AAL245">AAL245 (American Airlines B738)</option>
                  )}
                  {!flights.some((f) => f.callsign === "SC101") && (
                    <option value="SC101">SC101 (SkyConnect A320neo)</option>
                  )}
                </select>
              </div>

              {/* Scenario Type Radio Buttons */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1.5">
                  Distress Drill Scenario:
                </label>
                <div className="space-y-1.5">
                  {DRILL_SCENARIOS.map((sc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedScenarioIndex(idx)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex flex-col justify-between ${
                        selectedScenarioIndex === idx
                          ? "border-rose-500/60 bg-rose-950/30 text-white ring-1 ring-rose-500/40"
                          : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{sc.label}</span>
                        <Badge
                          variant="destructive"
                          className="text-[9px] py-0 px-1 font-mono"
                        >
                          SQUAWK {sc.squawk}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                        {sc.details}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Details Input */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">
                  Custom Incident Telemetry / Remarks:
                </label>
                <Input
                  value={customDetails}
                  onChange={(e) => setCustomDetails(e.target.value)}
                  placeholder="Optional custom notes (e.g. 154 souls onboard, 45 mins fuel remaining...)"
                  className="bg-slate-950/80 border-slate-800 text-xs text-white"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-950/40 transition flex items-center justify-center gap-2"
              >
                <Siren className="h-4 w-4" />
                Inject Emergency & Scramble ARFF
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right 2 Columns: Live Incident Roster & Staging Operations */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
            <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-rose-500" />
                Active Tactical Incident Roster ({events.length})
              </CardTitle>
              <span className="text-[10px] text-slate-500">
                Coordinated with ATC Tower & ARFF Station 1
              </span>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {events.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No emergency distress incidents active. Airfield is in Normal Operations state.
                </div>
              ) : (
                events.map((evt) => (
                  <div
                    key={evt.id}
                    className={`p-4 rounded-xl border transition ${
                      evt.resolved
                        ? "border-slate-800 bg-slate-950/40 opacity-70"
                        : "border-rose-500/50 bg-rose-950/20 shadow-md shadow-rose-950/20"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-rose-400" />
                        <span className="text-base font-bold text-white">{evt.callsign}</span>
                        <Badge
                          variant={evt.resolved ? "outline" : "destructive"}
                          className="text-[10px] font-mono"
                        >
                          SQUAWK {evt.squawk}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-slate-700">
                          {evt.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>Assigned RWY: <strong className="text-amber-300">{evt.assignedRunway}</strong></span>
                        <span className="text-slate-500">&bull;</span>
                        <span>{evt.time}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 py-3 leading-relaxed">
                      {evt.details}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">Crash Rescue:</span>
                        {evt.resolved ? (
                          <Badge className="bg-slate-800 text-slate-400 text-[10px]">
                            INCIDENT RESOLVED
                          </Badge>
                        ) : evt.arffDispatched ? (
                          <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40 text-[10px] animate-pulse">
                            6 ARFF TENDERS STAGED AT {evt.assignedRunway}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-400">
                            STANDBY AT STATION
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!evt.resolved && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleDispatchARFF(evt.id)}
                              className="h-7 text-xs border-slate-800 hover:bg-slate-800 text-slate-300"
                            >
                              {evt.arffDispatched ? "Recall ARFF" : "Scramble Tenders"}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleResolveEmergency(evt)}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                              Declare Safe & Resolve
                            </Button>
                          </>
                        )}
                        {evt.resolved && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Logged to Aviation Safety Board
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
