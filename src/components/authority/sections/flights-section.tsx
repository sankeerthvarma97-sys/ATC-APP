"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Plane,
  Search,
  Sliders,
  X,
} from "lucide-react";
import type { FlightDTO, FlightStatus } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { titleCase } from "@/lib/utils";

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

export function FlightsSection({
  flights: initialFlights,
  onRefresh,
}: {
  flights?: FlightDTO[];
  onRefresh?: () => void;
}) {
  const [fetchedFlights, setFetchedFlights] = useState<FlightDTO[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    fetch(`/api/flights?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((d) => {
        if (active && d.flights) {
          setFetchedFlights(d.flights);
          if (d.total !== undefined) setTotal(d.total);
          if (d.totalPages !== undefined) setTotalPages(d.totalPages);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedQuery]);

  const flights = fetchedFlights.length > 0 || debouncedQuery ? fetchedFlights : (initialFlights || []);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [flightName, setFlightName] = useState("SkyConnect 101");
  const [flightNumber, setFlightNumber] = useState("SC101");
  const [airline, setAirline] = useState("SkyConnect Airlines");
  const [aircraftType, setAircraftType] = useState("Airbus A320neo");
  const [origin, setOrigin] = useState("HYD");
  const [destination, setDestination] = useState("BOM");
  const [depTime, setDepTime] = useState(() => new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 16));
  const [arrTime, setArrTime] = useState(() => new Date(Date.now() + 160 * 60_000).toISOString().slice(0, 16));
  const [terminal, setTerminal] = useState("T1");
  const [gate, setGate] = useState("B12");
  const [runway, setRunway] = useState("09L");
  const [economyCap, setEconomyCap] = useState(150);
  const [businessCap, setBusinessCap] = useState(20);
  const [economyFare, setEconomyFare] = useState(4500);
  const [businessFare, setBusinessFare] = useState(8500);

  const filtered = flights.filter((f) => {
    const q = query.toLowerCase().trim();
    return (
      !q ||
      f.callsign.toLowerCase().includes(q) ||
      (f.flightNumber && f.flightNumber.toLowerCase().includes(q)) ||
      f.airline.toLowerCase().includes(q) ||
      f.origin.toLowerCase().includes(q) ||
      f.destination.toLowerCase().includes(q)
    );
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightName,
          flightNumber,
          airline,
          aircraftType,
          origin,
          destination,
          departureTime: new Date(depTime).toISOString(),
          arrivalTime: new Date(arrTime).toISOString(),
          terminal,
          gate,
          runway,
          economyCapacity: economyCap,
          businessCapacity: businessCap,
          firstCapacity: 0,
          economyFare,
          businessFare,
          firstFare: 15000,
          status: "SCHEDULED",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create flight");
      }

      setIsCreateOpen(false);
      onRefresh?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error creating flight");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateStatus(flightId: string, status: FlightStatus) {
    await fetch(`/api/flights/${flightId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onRefresh?.();
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#090e17]/90 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Plane className="h-4 w-4 text-sky-400" />
            Admin Flight Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create, publish, and control authorized simulation flights and schedules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search flights..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9 w-48 sm:w-64 bg-slate-900 border-slate-700 text-xs"
            />
          </div>

          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="h-9 bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Flight
          </Button>
        </div>
      </div>

      {/* Flight Directory Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#090e17]/90 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/80 font-mono text-[11px] text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-3">Flight / Number</th>
                <th className="py-3 px-3">Airline & Aircraft</th>
                <th className="py-3 px-3">Route</th>
                <th className="py-3 px-3">Departure & Gate</th>
                <th className="py-3 px-3">Available Seats</th>
                <th className="py-3 px-3">Fares (Eco / Biz)</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-mono">
                    <div className="font-bold text-slate-100">{f.flightNumber || f.callsign}</div>
                    <div className="text-[11px] text-slate-400">{f.flightName || f.callsign}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-200">{f.airline}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{f.aircraftType}</div>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <span className="text-sky-300 font-semibold">{f.origin}</span>
                    <span className="mx-1 text-slate-500">→</span>
                    <span className="text-emerald-300 font-semibold">{f.destination}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div className="text-slate-200">Terminal {f.terminal || "T1"} · Gate {f.gate || "—"}</div>
                    <div className="text-slate-400">Rwy {f.runway || "—"}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-200">
                    <span className="text-emerald-400 font-bold">{f.availableSeats ?? 168}</span>
                    <span className="text-slate-500"> / {(f.economyCapacity ?? 150) + (f.businessCapacity ?? 20)}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    ₹{f.economyFare?.toLocaleString()} / ₹{f.businessFare?.toLocaleString()}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={f.status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <select
                      value={f.status}
                      onChange={(e) => updateStatus(f.id, e.target.value as FlightStatus)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-mono text-slate-300 outline-none hover:border-sky-500"
                    >
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="BOARDING">Boarding</option>
                      <option value="PUSHBACK">Pushback</option>
                      <option value="TAXI_OUT">Taxi Out</option>
                      <option value="DEPARTING">Departing</option>
                      <option value="AIRBORNE">Airborne</option>
                      <option value="APPROACH">Approach</option>
                      <option value="ARRIVED">Arrived</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/60 px-4 py-3 font-mono text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <span className="font-bold text-slate-200">
              {filtered.length > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total || filtered.length)}
            </span>
            <span>of</span>
            <span className="font-bold text-slate-200">{total || filtered.length}</span>
            <span>flights</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2.5 text-xs font-mono border-slate-700 bg-slate-950 text-slate-300 disabled:opacity-40"
            >
              Previous
            </Button>

            <span className="px-2 font-bold text-sky-400">
              {page} / {totalPages || 1}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2.5 text-xs font-mono border-slate-700 bg-slate-950 text-slate-300 disabled:opacity-40"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* CREATE FLIGHT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-xl border border-sky-500/30 bg-[#090d16] p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-sky-400" />
                <h3 className="text-base font-semibold text-white">Create New Flight</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              {formError && (
                <div className="rounded border border-red-500/40 bg-red-950/40 p-2.5 text-xs text-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Flight Name</label>
                  <Input
                    value={flightName}
                    onChange={(e) => setFlightName(e.target.value)}
                    required
                    className="mt-1 bg-slate-900 border-slate-700 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Flight Number</label>
                  <Input
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                    required
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono text-sky-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Airline</label>
                  <select
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="SkyConnect Airlines">SkyConnect Airlines</option>
                    <option value="AeroVista">AeroVista</option>
                    <option value="Blue Horizon Air">Blue Horizon Air</option>
                    <option value="Nova Airways">Nova Airways</option>
                    <option value="IndianSky Simulation Airlines">IndianSky Simulation Airlines</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Aircraft Type</label>
                  <select
                    value={aircraftType}
                    onChange={(e) => setAircraftType(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="Airbus A320neo">Airbus A320neo (170 seats)</option>
                    <option value="Airbus A321neo">Airbus A321neo (204 seats)</option>
                    <option value="Boeing 737-800">Boeing 737-800 (178 seats)</option>
                    <option value="Boeing 787-9">Boeing 787-9 (263 seats)</option>
                    <option value="Boeing 777-200ER">Boeing 777-200ER (312 seats)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Origin (IATA)</label>
                  <Input
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                    required
                    maxLength={3}
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Destination (IATA)</label>
                  <Input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value.toUpperCase())}
                    required
                    maxLength={3}
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Departure Time</label>
                  <Input
                    type="datetime-local"
                    value={depTime}
                    onChange={(e) => setDepTime(e.target.value)}
                    required
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Arrival Time</label>
                  <Input
                    type="datetime-local"
                    value={arrTime}
                    onChange={(e) => setArrTime(e.target.value)}
                    required
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Terminal</label>
                  <Input
                    value={terminal}
                    onChange={(e) => setTerminal(e.target.value)}
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Gate</label>
                  <Input
                    value={gate}
                    onChange={(e) => setGate(e.target.value)}
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Runway</label>
                  <Input
                    value={runway}
                    onChange={(e) => setRunway(e.target.value)}
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Economy Seats</label>
                  <Input
                    type="number"
                    value={economyCap}
                    onChange={(e) => setEconomyCap(Number(e.target.value))}
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Business Seats</label>
                  <Input
                    type="number"
                    value={businessCap}
                    onChange={(e) => setBusinessCap(Number(e.target.value))}
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Economy Fare (₹)</label>
                  <Input
                    type="number"
                    value={economyFare}
                    onChange={(e) => setEconomyFare(Number(e.target.value))}
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Business Fare (₹)</label>
                  <Input
                    type="number"
                    value={businessFare}
                    onChange={(e) => setBusinessFare(Number(e.target.value))}
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="border-slate-700 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs"
                >
                  {isSubmitting ? "Creating..." : "Publish & Generate Seat Map"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
