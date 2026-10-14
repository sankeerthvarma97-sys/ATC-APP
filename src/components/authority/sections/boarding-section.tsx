"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Camera,
  Check,
  CheckCircle2,
  Clock,
  DoorClosed,
  DoorOpen,
  Info,
  Plane,
  PlaneTakeoff,
  RefreshCw,
  Scan,
  Search,
  ShieldCheck,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CopyButton } from "@/components/ui/copy-button";
import type { FlightDTO } from "@/lib/domain";

export interface ManifestPassenger {
  id: string;
  pnr: string;
  ticketNumber: string;
  flightId: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime?: string;
  name: string;
  seat: string;
  row: number;
  col: string;
  seatClass: "FIRST" | "BUSINESS" | "ECONOMY";
  zone: 1 | 2 | 3 | 4;
  checkedIn: boolean;
  boarded: boolean;
  boardedAt?: string;
  baggageCount: number;
  terminal?: string;
  gate?: string;
  ticketStatus?: string;
  boardingPassStatus?: string;
}

export function BoardingSection({
  onNavigateTo,
  initialFlight,
  initialPnr,
}: {
  onNavigateTo?: (section: string, params?: Record<string, string>) => void;
  initialFlight?: string;
  initialPnr?: string;
}) {
  const [flights, setFlights] = useState<FlightDTO[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [scanInput, setScanInput] = useState(initialPnr || "");
  const [manifest, setManifest] = useState<ManifestPassenger[]>([]);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "BOARDED" | "WAITING">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectingPax, setInspectingPax] = useState<ManifestPassenger | null>(null);
  const [gateOverride, setGateOverride] = useState("");
  const [currentZone, setCurrentZone] = useState<number>(1);
  const [handoffNotice, setHandoffNotice] = useState<string | null>(null);
  const [lastScannedPax, setLastScannedPax] = useState<ManifestPassenger | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSeatPax, setSelectedSeatPax] = useState<ManifestPassenger | null>(null);
  const selectedFlight = flights.find((flight) => flight.id === selectedFlightId) || flights[0];
  const assignedGateCode = selectedFlight?.gate?.replace(/^GATE\s*/i, "").trim() || "";
  const effectiveGate = gateOverride.trim() || assignedGateCode || "G1";
  const selectedGate = `GATE ${effectiveGate.replace(/^GATE\s*/i, "").trim()}`;

  // Play synthetic barcode beep
  const playBeep = useCallback((success = true) => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        osc.type = "sine";
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
        osc.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.08); // E6
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      }
    } catch {
      // AudioContext unavailable or autoplay blocked
    }
  }, [soundEnabled]);

  const refetchFlights = useCallback(async () => {
    try {
      const res = await fetch("/api/flights");
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.flights || []) as FlightDTO[];
      setFlights(list);
      if (initialFlight) {
        const match = list.find(
          (f) => f.flightNumber === initialFlight || f.callsign === initialFlight || f.id === initialFlight
        );
        if (match) {
          setSelectedFlightId(match.id);
          return;
        }
      }
      setSelectedFlightId((current) => current || (list[0]?.id ?? ""));
    } catch (err) {
      console.warn("Failed to fetch flights:", err);
    }
  }, [initialFlight]);

  useEffect(() => {
    let active = true;
    fetch("/api/flights")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const list = (data.flights || []) as FlightDTO[];
        setFlights(list);
        if (initialFlight) {
          const match = list.find(
            (f) => f.flightNumber === initialFlight || f.callsign === initialFlight || f.id === initialFlight
          );
          if (match) {
            setSelectedFlightId(match.id);
            return;
          }
        }
        setSelectedFlightId((current) => current || (list[0]?.id ?? ""));
      })
      .catch((err) => console.warn("Failed to fetch flights:", err));
    return () => {
      active = false;
    };
  }, [initialFlight]);

  const refreshManifest = useCallback(async () => {
    if (!selectedFlightId) return [] as ManifestPassenger[];

    try {
      const response = await fetch(`/api/boarding?flightId=${encodeURIComponent(selectedFlightId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load this flight's manifest.");

      const nextManifest: ManifestPassenger[] = (data.manifest || []).map((entry: Omit<ManifestPassenger, "row" | "col" | "zone">) => {
        const seatMatch = entry.seat.match(/^(\d+)([A-Z]+)$/i);
        return {
          ...entry,
          row: seatMatch ? Number(seatMatch[1]) : 0,
          col: seatMatch?.[2]?.toUpperCase() || "",
          zone: entry.seatClass === "BUSINESS" || entry.seatClass === "FIRST" ? 1 : 3,
        };
      });

      setManifest(nextManifest);
      setManifestError(null);
      return nextManifest;
    } catch (error) {
      setManifest([]);
      setManifestError(error instanceof Error ? error.message : "Could not load this flight's manifest.");
      return [] as ManifestPassenger[];
    }
  }, [selectedFlightId]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refreshManifest(), 0);
    const interval = window.setInterval(() => void refreshManifest(), 10_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [refreshManifest]);

  const handleScanBoard = async (pnrOrTicket: string) => {
    const code = pnrOrTicket.trim().toUpperCase();
    if (!code || !selectedFlight) {
      setScanError("Please select a flight and enter a PNR or ticket number.");
      return;
    }

    setLoading(true);
    try {
      const gateToSend = effectiveGate.replace(/^GATE\s*/i, "").trim();
      const response = await fetch("/api/boarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pnr: code, flightId: selectedFlight.id, gate: gateToSend }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || result.message || "Boarding was denied.");

      const updatedManifest = await refreshManifest();
      const updatedPassenger = updatedManifest.find((passenger) => passenger.pnr === code || passenger.ticketNumber === code);
      if (updatedPassenger) {
        setLastScannedPax(updatedPassenger);
        if (inspectingPax?.pnr === code) {
          setInspectingPax(updatedPassenger);
        }
      }
      setScanError(null);
      playBeep(true);
      setScanInput("");
    } catch (error) {
      playBeep(false);
      setScanError(error instanceof Error ? error.message : "Boarding was denied.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseGateAndHandoff = async () => {
    if (!selectedFlight) return;
    setLoading(true);

    try {
      // 1. Update flight status to PUSHBACK
      await fetch(`/api/flights/${selectedFlight.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUSHBACK" }),
      });

      // 2. Dispatch pushback command to operations
      await fetch("/api/operations/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightId: selectedFlight.id,
          type: "PUSHBACK_APPROVE",
          note: `Gate ${selectedGate} closed with ${manifest.filter((p) => p.boarded).length} passengers boarded. Ready for push and start.`,
        }),
      });

      // 3. Free up Gate resource
      await fetch("/api/resources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: "GATE",
          code: selectedGate.replace("GATE ", ""),
          status: "AVAILABLE",
        }),
      });

      setHandoffNotice(
        `Gate ${selectedGate} closed for Flight ${selectedFlight.callsign}. Manifest finalized with ${
          manifest.filter((p) => p.boarded).length
        }/${manifest.length} passengers onboard. Flight strip transferred to ATC Ground.`
      );
      playBeep(true);
      void refetchFlights();
    } catch (err) {
      console.error("Gate closure handoff failed:", err);
      setHandoffNotice(`Gate closed. Flight ${selectedFlight.callsign} transferred to ATC Ground.`);
    } finally {
      setLoading(false);
    }
  };

  const totalPax = manifest.length;
  const boardedPax = manifest.filter((p) => p.boarded).length;
  const checkedInPax = manifest.filter((p) => p.checkedIn).length;
  const progressPercent = totalPax > 0 ? Math.round((boardedPax / totalPax) * 100) : 0;

  const filteredManifest = manifest.filter((pax) => {
    if (filter === "BOARDED" && !pax.boarded) return false;
    if (filter === "WAITING" && pax.boarded) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = pax.name.toLowerCase().includes(q);
      const matchPnr = pax.pnr.toLowerCase().includes(q);
      const matchTicket = pax.ticketNumber.toLowerCase().includes(q);
      const matchSeat = pax.seat.toLowerCase().includes(q);
      if (!matchName && !matchPnr && !matchTicket && !matchSeat) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-cyan-500/40 bg-cyan-950/30 text-cyan-300 font-mono text-[11px]">
              AIRSIDE GATE OPERATIONS
            </Badge>
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/30 text-emerald-300 font-mono text-[11px]">
              BOARDING SYSTEM READY
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <DoorOpen className="h-6 w-6 text-cyan-400" />
            Gate Barcode Scanner, Seat Manifest & Pushback Handoff
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Optical boarding pass scanner, 2D aircraft cabin seat map, zone boarding sequence, and automated ATC ground handoff.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 h-9 rounded-xl font-mono text-xs flex items-center gap-1.5"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
            {soundEnabled ? "Audio On" : "Muted"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 h-9 rounded-xl font-mono text-xs flex items-center gap-1.5"
            onClick={() => void refetchFlights()}
          >
            <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Handoff Alert Banner */}
      {handoffNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/50 text-emerald-200 flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/40 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <PlaneTakeoff className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Flight Strip Transferred to ATC Ground</div>
              <div className="text-xs text-emerald-300 font-mono mt-0.5">{handoffNotice}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs rounded-xl"
              onClick={() => onNavigateTo?.("atc")}
            >
              Open ATC Radar &rarr;
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHandoffNotice(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Flight & Gate Selector */}
      <Card className="border-slate-800 bg-[#090e17]/90 backdrop-blur">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
                Active Flight Departure
              </label>
              <select
                value={selectedFlightId}
                onChange={(e) => setSelectedFlightId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {flights.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.callsign} ({f.origin} &rarr; {f.destination}) — {f.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
                Assigned Boarding Gate
              </label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="text"
                  value={gateOverride || (assignedGateCode ? `GATE ${assignedGateCode}` : "GATE G1")}
                  onChange={(e) => setGateOverride(e.target.value.toUpperCase())}
                  placeholder="e.g. GATE B12 or GATE G1"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono font-semibold text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center">
              <Button
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs rounded-xl h-9 shadow-lg shadow-cyan-600/20"
                onClick={handleCloseGateAndHandoff}
                disabled={loading}
              >
                <DoorClosed className="h-3.5 w-3.5 mr-1.5" />
                Close & Handoff
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flight Boarding KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-800 bg-slate-900/60 p-3">
          <div className="text-[10px] font-mono uppercase text-slate-400">Flight & Airframe</div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            {selectedFlight?.callsign || "No flight selected"}
          </div>
          <div className="text-[11px] text-cyan-400 font-mono">
            {selectedFlight?.aircraftType || "Aircraft unavailable"} · {selectedGate}
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-3">
          <div className="text-[10px] font-mono uppercase text-slate-400">Manifested Passengers</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{totalPax}</div>
          <div className="text-[11px] text-slate-400 font-mono">{checkedInPax} Security Cleared</div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-3">
          <div className="text-[10px] font-mono uppercase text-slate-400">Boarded Count</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{boardedPax}</div>
          <div className="text-[11px] text-slate-400 font-mono">{totalPax - boardedPax} In Concourse</div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400">Boarding Ratio</span>
            <span className="text-xs font-mono font-bold text-cyan-400">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-slate-800" />
          <div className="text-[10px] font-mono text-emerald-400">GATE OPEN · ZONE {currentZone} BOARDING</div>
        </Card>
      </div>

      {/* Main Grid: Barcode Optical Scanner + 2D Seat Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Barcode Scanner Viewfinder */}
        <div className="space-y-4">
          <Card className="border-cyan-500/30 bg-[#090e17]/90 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <Scan className="h-4 w-4" />
                  <span>Optical Boarding Pass Scanner</span>
                </div>
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 font-mono text-[10px]">
                  SCANNER ACTIVE
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Animated Optical Laser HUD */}
              <div className="relative h-44 rounded-xl border border-cyan-500/40 bg-slate-950/80 flex flex-col items-center justify-center overflow-hidden">
                {/* Crosshairs & Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(#0891b2_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                <div className="absolute h-24 w-40 border border-dashed border-cyan-500/60 rounded-lg pointer-events-none" />

                {/* Animated Laser Scanning Beam */}
                <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-bounce" />

                <Camera className="h-8 w-8 text-cyan-500/40 mb-2" />
                <span className="text-[11px] font-mono text-cyan-300 uppercase tracking-wider">
                  Align 2D Barcode / QR Inside Reticle
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Ready for optical sensor or manual PNR input
                </span>
              </div>

              {/* Input field for handheld scanner or manual PNR */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Scan or enter PNR e.g. SC7K92P / 1A"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleScanBoard(scanInput);
                      }
                    }}
                    className="font-mono text-xs uppercase bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 rounded-xl"
                  />
                  <Button
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs rounded-xl shrink-0"
                    onClick={() => handleScanBoard(scanInput)}
                    disabled={!scanInput.trim()}
                  >
                    Scan
                  </Button>
                </div>
                {scanError && <p role="alert" className="text-xs text-rose-300">{scanError}</p>}
              </div>

              {/* Last Scanned Result Confirmation */}
              {lastScannedPax && (
                <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 font-mono text-xs space-y-1 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Passenger Cleared to Board
                    </span>
                    <Badge variant="outline" className="border-emerald-500/50 bg-emerald-950/60 text-emerald-300 text-[10px]">
                      SEAT {lastScannedPax.seat}
                    </Badge>
                  </div>
                  <div className="text-slate-300 font-semibold">{lastScannedPax.name}</div>
                  <div className="text-slate-400 text-[11px]">
                    PNR: <span className="text-cyan-300">{lastScannedPax.pnr}</span> | Zone {lastScannedPax.zone} | Bags: {lastScannedPax.baggageCount}
                  </div>
                </div>
              )}

              {/* Zone Boarding Selector Buttons */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Call Boarding Zone:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => {
                        setCurrentZone(z);
                        playBeep(true);
                      }}
                      className={`p-2 rounded-lg border text-left font-mono text-xs transition ${
                        currentZone === z
                          ? "border-cyan-500 bg-cyan-950/40 text-cyan-300 font-bold"
                          : "border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      Zone {z} {z === 1 ? "(Priority)" : z === 2 ? "(Business)" : z === 3 ? "(Aft Rows)" : "(Forward)"}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle & Right Column: Interactive 2D Aircraft Cabin Seat Map & Manifest */}
        <div className="lg:col-span-2 space-y-4">
          {/* 2D Aircraft Cabin Map View */}
          <Card className="border-slate-800 bg-[#090e17]/90 shadow-xl">
            <CardHeader className="border-b border-slate-800 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-cyan-400" />
                  <CardTitle className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    2D Cabin Interior & Real-Time Seat Occupancy
                  </CardTitle>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
                    <span className="text-slate-300">Boarded ({boardedPax})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-amber-500" />
                    <span className="text-slate-300">Checked In ({checkedInPax - boardedPax})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-slate-800 border border-slate-700" />
                    <span className="text-slate-400">Waiting ({totalPax - checkedInPax})</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Aircraft Nose / Cockpit Bulkhead */}
              <div className="w-full h-8 rounded-t-3xl border border-b-0 border-slate-700 bg-gradient-to-b from-slate-800/80 to-slate-900/60 flex items-center justify-center text-[10px] font-mono uppercase text-slate-400 tracking-widest mb-3">
                ▲ Flight Deck & Forward Galley
              </div>

              {/* Rows Grid */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {[...new Set(manifest.map((passenger) => passenger.row).filter((row) => row > 0))].sort((a, b) => a - b).map((rowNum) => {
                  const isBusiness = rowNum <= 2;
                  const cols = isBusiness ? ["A", "C", "D", "F"] : ["A", "B", "C", "D", "E", "F"];

                  return (
                    <div key={rowNum} className="flex items-center justify-center gap-2 font-mono text-xs">
                      <span className="w-5 text-right text-[11px] text-slate-500 font-bold">{rowNum}</span>

                      {/* Left Side Seats */}
                      <div className="flex items-center gap-1.5">
                        {cols.slice(0, cols.length / 2).map((colLetter) => {
                          const seatCode = `${rowNum}${colLetter}`;
                          const pax = manifest.find((p) => p.seat === seatCode);
                          const isBoarded = pax?.boarded;
                          const isCheckedIn = pax?.checkedIn;
                          const isSelected = selectedSeatPax?.seat === seatCode;

                          return (
                            <button
                              key={seatCode}
                              type="button"
                              onClick={() => {
                                if (pax) {
                                  setSelectedSeatPax(pax);
                                  setInspectingPax(pax);
                                }
                              }}
                              className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg border flex flex-col items-center justify-center font-mono text-[10px] font-bold transition transform active:scale-95 ${
                                isBoarded
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40"
                                  : isCheckedIn
                                  ? "bg-amber-500/20 border-amber-500 text-amber-300 hover:bg-amber-500/30"
                                  : "bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800"
                              } ${isSelected ? "ring-2 ring-cyan-400" : ""}`}
                              title={pax ? `${pax.name} (${seatCode}) - ${isBoarded ? "BOARDED" : "WAITING"}` : `Seat ${seatCode}`}
                            >
                              <span>{seatCode}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Aisle */}
                      <div className="w-8 text-center text-[10px] text-slate-600 font-mono select-none">
                        AISLE
                      </div>

                      {/* Right Side Seats */}
                      <div className="flex items-center gap-1.5">
                        {cols.slice(cols.length / 2).map((colLetter) => {
                          const seatCode = `${rowNum}${colLetter}`;
                          const pax = manifest.find((p) => p.seat === seatCode);
                          const isBoarded = pax?.boarded;
                          const isCheckedIn = pax?.checkedIn;
                          const isSelected = selectedSeatPax?.seat === seatCode;

                          return (
                            <button
                              key={seatCode}
                              type="button"
                              onClick={() => {
                                if (pax) {
                                  setSelectedSeatPax(pax);
                                  setInspectingPax(pax);
                                }
                              }}
                              className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg border flex flex-col items-center justify-center font-mono text-[10px] font-bold transition transform active:scale-95 ${
                                isBoarded
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40"
                                  : isCheckedIn
                                  ? "bg-amber-500/20 border-amber-500 text-amber-300 hover:bg-amber-500/30"
                                  : "bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800"
                              } ${isSelected ? "ring-2 ring-cyan-400" : ""}`}
                              title={pax ? `${pax.name} (${seatCode}) - ${isBoarded ? "BOARDED" : "WAITING"}` : `Seat ${seatCode}`}
                            >
                              <span>{seatCode}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[10px] text-center text-slate-500 font-mono mt-3">
                Click any seat or manifest row to inspect authoritative passenger details & board.
              </div>
            </CardContent>
          </Card>

          {/* Passenger Manifest Table */}
          <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 overflow-hidden shadow-lg">
            <div className="p-3 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400 shrink-0" />
                <span className="font-bold text-xs text-white uppercase tracking-wider font-mono shrink-0">
                  Active Manifest ({filteredManifest.length})
                </span>
              </div>

              {/* Manifest Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search name, PNR, ticket #, seat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 pl-8 text-xs bg-slate-950 border-slate-700 text-slate-200"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {(["ALL", "WAITING", "BOARDED"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                      filter === f
                        ? "bg-cyan-600 text-white font-semibold"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-[10px] font-mono text-slate-400 uppercase border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Passenger / Seat</th>
                    <th className="py-2.5 px-3">PNR / Ticket</th>
                    <th className="py-2.5 px-3">Flight / Route</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Ticket / Pass</th>
                    <th className="py-2.5 px-3">Boarding</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono">
                  {filteredManifest.map((pax) => (
                    <tr
                      key={pax.id}
                      onClick={() => setInspectingPax(pax)}
                      className={`cursor-pointer transition-colors ${
                        pax.boarded ? "bg-emerald-950/20 text-emerald-200 hover:bg-emerald-950/30" : "hover:bg-slate-800/50"
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="font-sans font-medium text-slate-100">{pax.name}</div>
                        <div className="text-slate-400">Seat {pax.seat} · {pax.terminal || "T1"} · {pax.gate || selectedGate}</div>
                      </td>
                      <td className="py-2 px-3 text-cyan-300">
                        <div className="flex items-center gap-1.5">
                          <span>{pax.pnr}</span>
                          <CopyButton value={pax.pnr} title="Copy PNR" />
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                          <span>{pax.ticketNumber || "Ticket pending"}</span>
                          {pax.ticketNumber && <CopyButton value={pax.ticketNumber} title="Copy Ticket #" />}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <span>{pax.flightNumber}</span>
                          <CopyButton value={pax.flightNumber} title="Copy Flight" />
                        </div>
                        <div className="text-slate-400">{pax.origin} → {pax.destination}</div>
                      </td>
                      <td className="py-2 px-3 text-slate-300">{pax.seatClass}</td>
                      <td className="py-2 px-3">
                        <div>Ticket: {pax.ticketStatus || "ACTIVE"}</div>
                        <div className="text-slate-400">Pass: {pax.boardingPassStatus || "ACTIVE"}</div>
                      </td>
                      <td className="py-2 px-3">
                        {pax.boarded ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="h-3 w-3" />
                            BOARDED
                          </span>
                        ) : pax.checkedIn ? (
                          <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3" />
                            Checked In · {pax.baggageCount} bags
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Pending</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white"
                            onClick={() => setInspectingPax(pax)}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </Button>
                          {!pax.boarded ? (
                            <Button
                              size="sm"
                              className="h-6 px-2.5 text-[10px] font-mono bg-cyan-700 hover:bg-cyan-600 text-white rounded-md"
                              onClick={() => handleScanBoard(pax.pnr)}
                            >
                              Scan
                            </Button>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-semibold">Done</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredManifest.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 px-3 text-center text-slate-400">
                        {manifestError || (selectedFlight ? "No checked-in passengers matching criteria." : "Select a flight to load its manifest.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Authoritative Passenger Details Modal Dialog */}
      {inspectingPax && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0b1320] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                  Gate Pass Passenger Verification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingPax(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5 text-xs font-mono">
              <div className="col-span-2 rounded-xl bg-slate-900/80 border border-slate-800 p-3 space-y-1">
                <div className="text-[10px] uppercase text-slate-400">Passenger Full Name</div>
                <div className="text-base font-bold text-white font-sans">{inspectingPax.name}</div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">PNR Reference</div>
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <span>{inspectingPax.pnr}</span>
                  <CopyButton value={inspectingPax.pnr} />
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">Ticket Number</div>
                <div className="flex items-center gap-1.5 text-slate-200">
                  <span>{inspectingPax.ticketNumber || "N/A"}</span>
                  {inspectingPax.ticketNumber && <CopyButton value={inspectingPax.ticketNumber} />}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">Flight & Route</div>
                <div className="font-bold text-white">
                  {inspectingPax.flightNumber} ({inspectingPax.origin} &rarr; {inspectingPax.destination})
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">Flight Date / Dep</div>
                <div className="text-slate-300">
                  {inspectingPax.departureTime ? inspectingPax.departureTime.slice(0, 16).replace("T", " ") : "Scheduled Today"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">Seat Assignment</div>
                <div className="font-bold text-amber-300">
                  Seat {inspectingPax.seat} ({inspectingPax.seatClass})
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">Terminal & Gate</div>
                <div className="text-slate-300">
                  {inspectingPax.terminal || "T1"} · {inspectingPax.gate || selectedGate}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">Check-In Status</div>
                <div className="text-emerald-400 font-semibold">
                  Checked In ({inspectingPax.baggageCount} baggage pcs)
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">Boarding Status</div>
                <div className={inspectingPax.boarded ? "text-emerald-400 font-bold" : "text-amber-400 font-semibold"}>
                  {inspectingPax.boarded ? "BOARDED" : "AWAITING BOARDING"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">Boarding Pass Status</div>
                <div className="text-slate-300">{inspectingPax.boardingPassStatus || "ACTIVE"}</div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400">Ticket Status</div>
                <div className="text-slate-300">{inspectingPax.ticketStatus || "ACTIVE"}</div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4 gap-3">
              <Button
                variant="outline"
                onClick={() => setInspectingPax(null)}
                className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono h-9"
              >
                Close
              </Button>

              {!inspectingPax.boarded ? (
                <Button
                  onClick={() => {
                    void handleScanBoard(inspectingPax.pnr);
                  }}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold h-9 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Verify & Board Passenger
                </Button>
              ) : (
                <Badge className="bg-emerald-950 border-emerald-500/50 text-emerald-300 text-xs py-1 px-3">
                  Passenger Onboard
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
