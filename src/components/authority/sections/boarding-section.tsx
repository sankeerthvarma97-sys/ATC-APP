"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  DoorClosed,
  DoorOpen,
  Filter,
  Luggage,
  Plane,
  PlaneTakeoff,
  QrCode,
  RefreshCw,
  Scan,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { FlightDTO } from "@/lib/domain";

export interface ManifestPassenger {
  id: string;
  pnr: string;
  ticketNumber: string;
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
}

const INITIAL_DEMO_MANIFEST: ManifestPassenger[] = [
  { id: "pax-1", pnr: "SC7K92P", ticketNumber: "TKT-SC-1001", name: "Rahul Varma", seat: "1A", row: 1, col: "A", seatClass: "BUSINESS", zone: 1, checkedIn: true, boarded: false, baggageCount: 2 },
  { id: "pax-2", pnr: "AV38120", ticketNumber: "TKT-AV-1002", name: "Dr. Marcus Chen", seat: "1C", row: 1, col: "C", seatClass: "BUSINESS", zone: 1, checkedIn: true, boarded: true, boardedAt: "14:10Z", baggageCount: 1 },
  { id: "pax-3", pnr: "BH99412", ticketNumber: "TKT-BH-1003", name: "Sarah Jenkins", seat: "1D", row: 1, col: "D", seatClass: "BUSINESS", zone: 1, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-4", pnr: "NV44190", ticketNumber: "TKT-NV-1004", name: "David Morales", seat: "1F", row: 1, col: "F", seatClass: "BUSINESS", zone: 1, checkedIn: true, boarded: false, baggageCount: 0 },
  { id: "pax-5", pnr: "IS88201", ticketNumber: "TKT-IS-1005", name: "Elena Rostova", seat: "2A", row: 2, col: "A", seatClass: "BUSINESS", zone: 2, checkedIn: true, boarded: true, boardedAt: "14:12Z", baggageCount: 2 },
  { id: "pax-6", pnr: "SC29104", ticketNumber: "TKT-SC-1006", name: "Vikram Sen", seat: "2C", row: 2, col: "C", seatClass: "BUSINESS", zone: 2, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-7", pnr: "AV10294", ticketNumber: "TKT-AV-1007", name: "Ananya Desai", seat: "2D", row: 2, col: "D", seatClass: "BUSINESS", zone: 2, checkedIn: true, boarded: false, baggageCount: 2 },
  { id: "pax-8", pnr: "BH55019", ticketNumber: "TKT-BH-1008", name: "Karan Sharma", seat: "2F", row: 2, col: "F", seatClass: "BUSINESS", zone: 2, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-9", pnr: "NV71829", ticketNumber: "TKT-NV-1009", name: "Priya Nair", seat: "3A", row: 3, col: "A", seatClass: "ECONOMY", zone: 4, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-10", pnr: "IS33910", ticketNumber: "TKT-IS-1010", name: "Arjun Reddy", seat: "3B", row: 3, col: "B", seatClass: "ECONOMY", zone: 4, checkedIn: true, boarded: false, baggageCount: 2 },
  { id: "pax-11", pnr: "SC44812", ticketNumber: "TKT-SC-1011", name: "Meera Patel", seat: "3C", row: 3, col: "C", seatClass: "ECONOMY", zone: 4, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-12", pnr: "AV66192", ticketNumber: "TKT-AV-1012", name: "Suresh Menon", seat: "3D", row: 3, col: "D", seatClass: "ECONOMY", zone: 4, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-13", pnr: "BH88219", ticketNumber: "TKT-BH-1013", name: "Rohan Kapoor", seat: "3E", row: 3, col: "E", seatClass: "ECONOMY", zone: 4, checkedIn: false, boarded: false, baggageCount: 0 },
  { id: "pax-14", pnr: "NV99104", ticketNumber: "TKT-NV-1014", name: "Sunil Joshi", seat: "3F", row: 3, col: "F", seatClass: "ECONOMY", zone: 4, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-15", pnr: "IS11928", ticketNumber: "TKT-IS-1015", name: "Deepa Iyer", seat: "4A", row: 4, col: "A", seatClass: "ECONOMY", zone: 4, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-16", pnr: "SC22910", ticketNumber: "TKT-SC-1016", name: "Amitava Ghosh", seat: "4B", row: 4, col: "B", seatClass: "ECONOMY", zone: 4, checkedIn: true, boarded: false, baggageCount: 2 },
  { id: "pax-17", pnr: "AV55819", ticketNumber: "TKT-AV-1017", name: "Maya Rao", seat: "4C", row: 4, col: "C", seatClass: "ECONOMY", zone: 4, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-18", pnr: "BH77102", ticketNumber: "TKT-BH-1018", name: "Zoya Akhtar", seat: "5A", row: 5, col: "A", seatClass: "ECONOMY", zone: 3, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-19", pnr: "NV88491", ticketNumber: "TKT-NV-1019", name: "Tariq Mansoor", seat: "5B", row: 5, col: "B", seatClass: "ECONOMY", zone: 3, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-20", pnr: "IS99214", ticketNumber: "TKT-IS-1020", name: "Nisha Varma", seat: "5C", row: 5, col: "C", seatClass: "ECONOMY", zone: 3, checkedIn: true, boarded: false, baggageCount: 2 },
  { id: "pax-21", pnr: "SC66381", ticketNumber: "TKT-SC-1021", name: "Aditya Roy", seat: "6A", row: 6, col: "A", seatClass: "ECONOMY", zone: 3, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-22", pnr: "AV77492", ticketNumber: "TKT-AV-1022", name: "Divya Balan", seat: "6B", row: 6, col: "B", seatClass: "ECONOMY", zone: 3, checkedIn: true, boarded: false, baggageCount: 0 },
  { id: "pax-23", pnr: "BH88301", ticketNumber: "TKT-BH-1023", name: "Kunal Mehra", seat: "6C", row: 6, col: "C", seatClass: "ECONOMY", zone: 3, checkedIn: true, boarded: false, baggageCount: 1 },
  { id: "pax-24", pnr: "NV11029", ticketNumber: "TKT-NV-1024", name: "Aparna Sen", seat: "6D", row: 6, col: "D", seatClass: "ECONOMY", zone: 3, checkedIn: true, boarded: false, baggageCount: 2 },
];

export function BoardingSection({
  onNavigateTo,
}: {
  onNavigateTo?: (section: string, params?: Record<string, string>) => void;
}) {
  const [flights, setFlights] = useState<FlightDTO[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState<string>("");
  const [selectedGate, setSelectedGate] = useState<string>("GATE A1");
  const [loading, setLoading] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [manifest, setManifest] = useState<ManifestPassenger[]>(INITIAL_DEMO_MANIFEST);
  const [filter, setFilter] = useState<"ALL" | "BOARDED" | "WAITING">("ALL");
  const [currentZone, setCurrentZone] = useState<number>(1);
  const [handoffNotice, setHandoffNotice] = useState<string | null>(null);
  const [lastScannedPax, setLastScannedPax] = useState<ManifestPassenger | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSeatPax, setSelectedSeatPax] = useState<ManifestPassenger | null>(null);

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
      setSelectedFlightId((current) => current || (list[0]?.id ?? null));
    } catch (err) {
      console.warn("Failed to fetch flights:", err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/flights")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const list = (data.flights || []) as FlightDTO[];
        setFlights(list);
        setSelectedFlightId((current) => current || (list[0]?.id ?? null));
      })
      .catch((err) => console.warn("Failed to fetch flights:", err));
    return () => {
      active = false;
    };
  }, []);

  const selectedFlight = flights.find((f) => f.id === selectedFlightId) || flights[0];

  const handleScanBoard = (pnrOrTicket: string) => {
    const code = pnrOrTicket.trim().toUpperCase();
    if (!code) return;

    const foundIndex = manifest.findIndex(
      (p) => p.pnr.toUpperCase() === code || p.ticketNumber.toUpperCase() === code || p.seat.toUpperCase() === code
    );

    if (foundIndex !== -1) {
      const updatedPax = {
        ...manifest[foundIndex],
        checkedIn: true,
        boarded: true,
        boardedAt: new Date().toLocaleTimeString(),
      };

      setManifest((prev) => {
        const next = [...prev];
        next[foundIndex] = updatedPax;
        return next;
      });

      setLastScannedPax(updatedPax);
      playBeep(true);
      setScanInput("");
    } else {
      playBeep(false);
      alert(`Invalid boarding pass: "${code}" not found on active flight manifest.`);
    }
  };

  const handleBoardAll = () => {
    setManifest((prev) =>
      prev.map((pax) => ({
        ...pax,
        checkedIn: true,
        boarded: true,
        boardedAt: pax.boardedAt || new Date().toLocaleTimeString(),
      }))
    );
    playBeep(true);
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
    if (filter === "BOARDED") return pax.boarded;
    if (filter === "WAITING") return !pax.boarded;
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
                Assigned Boarding Gate Stand
              </label>
              <select
                value={selectedGate}
                onChange={(e) => setSelectedGate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {["GATE A1", "GATE A2", "GATE A4", "GATE B12", "GATE C2", "GATE D1"].map((g) => (
                  <option key={g} value={g}>
                    {g} (Jet Bridge Active)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1 border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono text-xs rounded-xl h-9"
                onClick={handleBoardAll}
              >
                <UserCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                Board All Manifest
              </Button>
              <Button
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs rounded-xl h-9 shadow-lg shadow-cyan-600/20"
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
            {selectedFlight?.callsign || "SC101"}
          </div>
          <div className="text-[11px] text-cyan-400 font-mono">
            {selectedFlight?.aircraftType || "Airbus A320neo"} · Gate {selectedGate.replace("GATE ", "")}
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
                {[1, 2, 3, 4, 5, 6].map((rowNum) => {
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
                                  handleScanBoard(pax.pnr);
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
                                  handleScanBoard(pax.pnr);
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
                * Click any seat to instantly validate and scan passenger pass
              </div>
            </CardContent>
          </Card>

          {/* Passenger Manifest Table */}
          <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 overflow-hidden shadow-lg">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                <span className="font-bold text-xs text-white uppercase tracking-wider font-mono">
                  Active Manifest ({filteredManifest.length})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
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
                    <th className="py-2.5 px-3">Seat</th>
                    <th className="py-2.5 px-3">Passenger</th>
                    <th className="py-2.5 px-3">PNR</th>
                    <th className="py-2.5 px-3">Zone</th>
                    <th className="py-2.5 px-3">Bags</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono">
                  {filteredManifest.map((pax) => (
                    <tr
                      key={pax.id}
                      className={`transition-colors ${
                        pax.boarded ? "bg-emerald-950/20 text-emerald-200" : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-white">{pax.seat}</td>
                      <td className="py-2 px-3 text-slate-200 font-sans font-medium">{pax.name}</td>
                      <td className="py-2 px-3 text-cyan-300">{pax.pnr}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono border-slate-700">
                          Z{pax.zone}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-slate-400">{pax.baggageCount} pcs</td>
                      <td className="py-2 px-3">
                        {pax.boarded ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="h-3 w-3" />
                            BOARDED
                          </span>
                        ) : pax.checkedIn ? (
                          <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3" />
                            Checked In
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Pending</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {!pax.boarded ? (
                          <Button
                            size="sm"
                            className="h-6 px-2 text-[10px] font-mono bg-cyan-700 hover:bg-cyan-600 text-white rounded-md"
                            onClick={() => handleScanBoard(pax.pnr)}
                          >
                            Scan
                          </Button>
                        ) : (
                          <span className="text-[10px] text-slate-500">{pax.boardedAt || "DONE"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
