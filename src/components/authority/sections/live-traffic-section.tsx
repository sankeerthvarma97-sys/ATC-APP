"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Compass,
  Gauge,
  Navigation,
  Plane,
  Radio,
  Search,
  Sliders,
  Warehouse,
  X,
} from "lucide-react";
import type { FlightCommandInput, FlightCommandType, FlightDTO, FlightStatus } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatZulu, titleCase } from "@/lib/utils";

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

export function LiveTrafficSection({
  flights: initialFlights,
  onSendCommand,
}: {
  flights?: FlightDTO[];
  onSendCommand?: (command: FlightCommandInput) => void;
}) {
  const [fetchedFlights, setFetchedFlights] = useState<FlightDTO[]>([]);

  useEffect(() => {
    let active = true;
    if (!initialFlights || initialFlights.length === 0) {
      fetch("/api/flights")
        .then((r) => r.json())
        .then((d) => {
          if (active && d.flights) setFetchedFlights(d.flights);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [initialFlights]);

  const flights = (initialFlights && initialFlights.length > 0) ? initialFlights : fetchedFlights;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(flights[0]?.id ?? null);
  const [commandNote, setCommandNote] = useState("");
  const [assignGateVal, setAssignGateVal] = useState("B12");
  const [assignRwyVal, setAssignRwyVal] = useState("09L");

  const filtered = flights.filter((f) => {
    const matchesStatus = statusFilter === "ALL" || f.status === statusFilter;
    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      f.callsign.toLowerCase().includes(q) ||
      (f.flightNumber && f.flightNumber.toLowerCase().includes(q)) ||
      f.airline.toLowerCase().includes(q) ||
      f.origin.toLowerCase().includes(q) ||
      f.destination.toLowerCase().includes(q) ||
      f.aircraftType.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const selectedFlight = flights.find((f) => f.id === selectedFlightId) ?? null;

  function triggerCommand(type: FlightCommandType, value?: string) {
    if (!selectedFlight) return;
    onSendCommand?.({
      flightId: selectedFlight.id,
      type,
      value,
      note: commandNote || `Issued from Traffic Board for ${selectedFlight.callsign}`,
    });
    setCommandNote("");
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#090e17]/90 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Filter by flight, airline, origin, dest, aircraft..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700 text-xs text-slate-100 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-mono whitespace-nowrap">Status:</span>
          {["ALL", "SCHEDULED", "BOARDING", "PUSHBACK", "AIRBORNE", "APPROACH", "HOLDING", "EMERGENCY"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-mono transition-colors whitespace-nowrap",
                statusFilter === st
                  ? "bg-sky-500 text-black font-semibold"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700",
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container: Table + Inspection Drawer */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Radar Table (2 cols on large) */}
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-slate-800 bg-[#090e17]/90 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-900/80 font-mono text-[11px] text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-3">Flight / Airline</th>
                  <th className="py-3 px-3">Aircraft</th>
                  <th className="py-3 px-3">Route</th>
                  <th className="py-3 px-3">Altitude / Speed</th>
                  <th className="py-3 px-3">Gate</th>
                  <th className="py-3 px-3">Runway</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No flights match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((f) => {
                    const isSelected = f.id === selectedFlightId;
                    return (
                      <tr
                        key={f.id}
                        onClick={() => setSelectedFlightId(f.id)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected ? "bg-sky-500/15 text-white" : "hover:bg-slate-800/50",
                          f.status === "EMERGENCY" && "bg-red-950/20 text-red-200",
                        )}
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            {f.flightNumber || f.callsign}
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />}
                          </div>
                          <div className="text-[11px] text-slate-400">{f.airline}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                          {f.aircraftType}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className="text-sky-300 font-semibold">{f.origin}</span>
                          <span className="mx-1 text-slate-500">→</span>
                          <span className="text-emerald-300 font-semibold">{f.destination}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <div>{f.altitudeFt.toLocaleString()} ft</div>
                          <div className="text-slate-400">{f.speedKt} kt · HDG {f.headingDeg}°</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">{f.gate || "—"}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{f.runway || "—"}</td>
                        <td className="py-3 px-3">
                          <StatusBadge status={f.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Flight Control Drawer */}
        <div className="rounded-xl border border-slate-800 bg-[#090e17]/95 p-4 shadow-lg space-y-4">
          {selectedFlight ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-mono text-slate-100">
                      {selectedFlight.flightNumber || selectedFlight.callsign}
                    </span>
                    <StatusBadge status={selectedFlight.status} />
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedFlight.airline} · {selectedFlight.aircraftType}
                  </div>
                </div>
              </div>

              {/* Flight Telemetry Matrix */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[10px] text-slate-400">ALTITUDE</div>
                  <div className="text-sm font-bold text-sky-400">
                    {selectedFlight.altitudeFt.toLocaleString()} FT
                  </div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[10px] text-slate-400">AIRSPEED</div>
                  <div className="text-sm font-bold text-slate-200">{selectedFlight.speedKt} KT</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[10px] text-slate-400">GATE / RUNWAY</div>
                  <div className="text-sm font-bold text-slate-200">
                    {selectedFlight.gate || "—"} / {selectedFlight.runway || "—"}
                  </div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[10px] text-slate-400">SQUAWK / RISK</div>
                  <div className="text-sm font-bold text-slate-200">
                    {selectedFlight.squawk} · R{selectedFlight.riskScore}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-300 font-mono bg-slate-900/40 p-2.5 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase">Operational Phase</div>
                <div className="mt-0.5 text-sky-300 font-medium">{selectedFlight.phase}</div>
              </div>

              {/* Clearance & Command Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                  Air Traffic Clearances & Actions
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerCommand("CLEAR_TAKEOFF")}
                    className="h-8 text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40"
                  >
                    Clear Takeoff
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerCommand("CLEAR_LANDING")}
                    className="h-8 text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40"
                  >
                    Clear Landing
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerCommand("HOLD")}
                    className="h-8 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/40"
                  >
                    Hold Position
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerCommand("RELEASE_HOLD")}
                    className="h-8 text-xs border-sky-500/40 text-sky-300 hover:bg-sky-950/40"
                  >
                    Release Hold
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerCommand("EXPEDITE")}
                    className="h-8 text-xs border-sky-500/40 text-sky-300 hover:bg-sky-950/40"
                  >
                    Expedite
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerCommand("DIVERT", "BOM")}
                    className="h-8 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/40"
                  >
                    Divert Flight
                  </Button>
                </div>

                {/* Emergency Controls */}
                <div className="pt-2">
                  {selectedFlight.status === "EMERGENCY" ? (
                    <Button
                      size="sm"
                      onClick={() => triggerCommand("RESOLVE_EMERGENCY")}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                    >
                      Resolve Emergency
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => triggerCommand("DECLARE_EMERGENCY")}
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Declare Simulated Emergency
                    </Button>
                  )}
                </div>

                {/* Quick Gate & Runway Re-assignment */}
                <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Gate"
                      value={assignGateVal}
                      onChange={(e) => setAssignGateVal(e.target.value)}
                      className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-100"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerCommand("ASSIGN_GATE", assignGateVal)}
                      className="h-7 px-2 text-[11px]"
                    >
                      Set Gate
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Rwy"
                      value={assignRwyVal}
                      onChange={(e) => setAssignRwyVal(e.target.value)}
                      className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-100"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerCommand("ASSIGN_RUNWAY", assignRwyVal)}
                      className="h-7 px-2 text-[11px]"
                    >
                      Set Rwy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              Select a flight from the traffic table to view operational telemetry and issue clearances.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
