"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Luggage,
  Plane,
  QrCode,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { BookingDTO } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshButton } from "@/components/ui/refresh-button";
import { cn } from "@/lib/utils";

export type RegistryCategory =
  | "ALL"
  | "UPCOMING"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

function formatIST(isoStr?: string): string {
  if (!isoStr) return "--:--";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "--:--";
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    hour12: false,
  }).format(d);
}

export function BookingsSection({
  onNavigateToCheckin,
}: {
  onNavigateToCheckin?: (pnr: string) => void;
}) {
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [category, setCategory] = useState<RegistryCategory>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewTicket, setViewTicket] = useState<BookingDTO | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function fetchBookings() {
    setLoading(true);
    try {
      const categoryParam = category !== "ALL" ? `&category=${category}` : "";
      const res = await fetch(
        `/api/bookings?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(debouncedQuery)}${categoryParam}`
      );
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        if (data.total !== undefined) setTotal(data.total);
        if (data.totalPages !== undefined) setTotalPages(data.totalPages);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const categoryParam = category !== "ALL" ? `&category=${category}` : "";
        const res = await fetch(
          `/api/bookings?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(debouncedQuery)}${categoryParam}`
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          setBookings(data.bookings || []);
          if (data.total !== undefined) setTotal(data.total);
          if (data.totalPages !== undefined) setTotalPages(data.totalPages);
        }
      } catch {
        // fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.activeSection === "bookings") {
        void fetchBookings();
      }
    };
    window.addEventListener("aocc:refresh", handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("aocc:refresh", handleRefresh);
    };
  }, [page, pageSize, debouncedQuery, category]);

  async function cancelBooking(pnr: string) {
    if (!confirm(`Are you sure you want to cancel booking ${pnr}?`)) return;
    try {
      const res = await fetch(`/api/bookings/${pnr}/cancel`, { method: "POST" });
      if (res.ok) {
        fetchBookings();
      }
    } catch {
      // ignore
    }
  }

  const filtered = bookings.filter((b) => {
    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      b.pnr.toLowerCase().includes(q) ||
      (b.passengerName && b.passengerName.toLowerCase().includes(q)) ||
      (b.flightNumber && b.flightNumber.toLowerCase().includes(q)) ||
      b.origin?.toLowerCase().includes(q) ||
      b.destination?.toLowerCase().includes(q);

    return matchesQuery;
  });

  const categories: { id: RegistryCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "ALL", label: "All Reservations", icon: FileText },
    { id: "UPCOMING", label: "Upcoming Bookings", icon: Calendar },
    { id: "ACTIVE", label: "Active / Checked-in", icon: QrCode },
    { id: "COMPLETED", label: "Completed Journeys", icon: CheckCircle2 },
    { id: "CANCELLED", label: "Cancelled", icon: Trash2 },
    { id: "NO_SHOW", label: "Missed Flights / No-show", icon: AlertCircle },
  ];

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#090e17]/90 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-400" />
            Bookings & Reservations Registry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Authoritative lifecycle records: upcoming bookings, checked-in passengers, completed journeys, and missed flights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RefreshButton
            onRefresh={fetchBookings}
            isRefreshing={loading}
            size="sm"
            variant="cyan"
            label="Refresh Registry"
            tooltip="Refresh reservations and completed journeys"
            showStatusIndicator
          />
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by PNR, passenger, flight..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9 w-64 bg-slate-900 border-slate-700 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategory(cat.id);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-medium transition-colors",
                isActive
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                  : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bookings Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#090e17]/90 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/80 font-mono text-[11px] text-slate-400 uppercase">
              {category === "COMPLETED" ? (
                <tr>
                  <th className="py-3 px-3">PNR</th>
                  <th className="py-3 px-3">Passenger</th>
                  <th className="py-3 px-3">Flight / Route</th>
                  <th className="py-3 px-3">Seat</th>
                  <th className="py-3 px-3">Actual Dep (IST)</th>
                  <th className="py-3 px-3">Actual Arr (IST)</th>
                  <th className="py-3 px-3">Completed At</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              ) : category === "NO_SHOW" ? (
                <tr>
                  <th className="py-3 px-3">PNR</th>
                  <th className="py-3 px-3">Passenger</th>
                  <th className="py-3 px-3">Flight / Route</th>
                  <th className="py-3 px-3">Scheduled Dep</th>
                  <th className="py-3 px-3">No-Show Reason</th>
                  <th className="py-3 px-3">Event Timestamp</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th className="py-3 px-3">PNR</th>
                  <th className="py-3 px-3">Passenger</th>
                  <th className="py-3 px-3">Flight / Route</th>
                  <th className="py-3 px-3">Seat / Class</th>
                  <th className="py-3 px-3">Fare</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Check-in</th>
                  <th className="py-3 px-3">Boarding</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Loading reservations...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No matching reservations found in category &quot;{category}&quot;.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const isCompleted = b.bookingStatus === "COMPLETED" || b.journeyStatus === "COMPLETED";
                  const isNoShow = b.bookingStatus === "NO_SHOW" || b.journeyStatus === "NO_SHOW";

                  if (category === "COMPLETED" || isCompleted) {
                    return (
                      <tr key={b.pnr} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-sky-400">
                          {b.pnr}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-100">{b.passengerName || "Traveler"}</div>
                          <div className="text-[11px] text-slate-400">{b.passengerPhone || b.passengerEmail}</div>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <div className="text-slate-200 font-bold">{b.flightNumber || b.flightCallsign}</div>
                          <div className="text-[11px] text-slate-400">
                            {b.origin} → {b.destination}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className="font-bold text-emerald-400">{b.seatNumber}</span>
                          <span className="text-slate-400 text-[11px] ml-1">({b.travelClass})</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">
                          {formatIST(b.actualDepartureTime || b.departureTime)}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-300 text-[11px]">
                          {formatIST(b.actualArrivalTime || b.completedAt)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                          {formatIST(b.completedAt || b.updatedAt)}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <Badge variant="success" className="text-[10px] bg-emerald-950/80 text-emerald-300 border-emerald-500/40">
                            COMPLETED
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewTicket(b)}
                            className="h-7 px-2 text-[11px] border-slate-700 text-sky-400 hover:bg-slate-800"
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  }

                  if (category === "NO_SHOW" || isNoShow) {
                    return (
                      <tr key={b.pnr} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-rose-400">
                          {b.pnr}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-100">{b.passengerName || "Traveler"}</div>
                          <div className="text-[11px] text-slate-400">{b.passengerPhone || b.passengerEmail}</div>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <div className="text-slate-200 font-bold">{b.flightNumber || b.flightCallsign}</div>
                          <div className="text-[11px] text-slate-400">
                            {b.origin} → {b.destination}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                          {formatIST(b.departureTime)}
                        </td>
                        <td className="py-3 px-3 font-mono text-rose-300 text-[11px]">
                          {b.noShowReason || "MISSED_DEPARTURE_CUTOFF"}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                          {formatIST(b.noShowAt || b.updatedAt)}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <Badge variant="destructive" className="text-[10px] bg-rose-950/80 text-rose-300 border-rose-500/40">
                            NO_SHOW
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewTicket(b)}
                            className="h-7 px-2 text-[11px] border-slate-700 text-slate-400 hover:bg-slate-800"
                          >
                            Audit Record
                          </Button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={b.pnr} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-sky-400">
                        {b.pnr}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-100">{b.passengerName || "Traveler"}</div>
                        <div className="text-[11px] text-slate-400">{b.passengerPhone || b.passengerEmail}</div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <div className="text-slate-200 font-bold">{b.flightNumber || b.flightCallsign}</div>
                        <div className="text-[11px] text-slate-400">
                          {b.origin} → {b.destination}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className="font-bold text-emerald-400">{b.seatNumber}</span>
                        <span className="text-slate-400 text-[11px] ml-1">({b.travelClass})</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-200">
                        ₹{b.fare?.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <Badge
                          variant={
                            b.bookingStatus === "CONFIRMED"
                              ? "success"
                              : b.bookingStatus === "CANCELLED"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {b.bookingStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <Badge
                          variant={b.checkInStatus === "CHECKED_IN" ? "success" : "secondary"}
                          className="text-[10px]"
                        >
                          {b.checkInStatus === "CHECKED_IN" ? "Checked In" : "Pending"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <Badge
                          variant={b.boardingStatus === "BOARDED" ? "success" : "outline"}
                          className="text-[10px]"
                        >
                          {b.boardingStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewTicket(b)}
                            className="h-7 px-2 text-[11px] border-slate-700 text-sky-400 hover:bg-slate-800"
                          >
                            Ticket
                          </Button>
                          {b.checkInStatus !== "CHECKED_IN" && b.bookingStatus === "CONFIRMED" && onNavigateToCheckin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onNavigateToCheckin(b.pnr)}
                              className="h-7 px-2 text-[11px] border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40"
                            >
                              Check-in
                            </Button>
                          )}
                          {b.bookingStatus !== "CANCELLED" && b.bookingStatus !== "COMPLETED" && b.bookingStatus !== "NO_SHOW" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelBooking(b.pnr)}
                              className="h-7 px-2 text-[11px] border-red-500/40 text-red-400 hover:bg-red-950/40"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/60 px-4 py-3 font-mono text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <span className="font-bold text-slate-200">
              {bookings.length > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total || bookings.length)}
            </span>
            <span>of</span>
            <span className="font-bold text-slate-200">{total || bookings.length}</span>
            <span>reservations</span>
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

      {/* E-TICKET / RESERVATION POPUP MODAL */}
      {viewTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-xl border border-sky-500/30 bg-[#090d16] p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider font-semibold">
                  {viewTicket.airline || "Air Carrier"} · Electronic Reservation Record
                </span>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  PNR: {viewTicket.pnr}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewTicket(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-slate-400 text-[10px]">PASSENGER</span>
                  <div className="font-bold text-slate-100 text-sm mt-0.5">{viewTicket.passengerName}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">FLIGHT</span>
                  <div className="font-bold text-sky-300 text-sm mt-0.5">
                    {viewTicket.flightNumber || viewTicket.flightCallsign}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-slate-400 text-[10px]">ORIGIN</span>
                  <div className="font-bold text-white mt-0.5">{viewTicket.origin}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">DESTINATION</span>
                  <div className="font-bold text-white mt-0.5">{viewTicket.destination}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">SEAT / CLASS</span>
                  <div className="font-bold text-emerald-400 mt-0.5">
                    {viewTicket.seatNumber} ({viewTicket.travelClass})
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-slate-400 text-[10px]">TERMINAL / GATE</span>
                  <div className="font-bold text-white mt-0.5">
                    {viewTicket.terminal || "T1"} · Gate {viewTicket.gate || "B12"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">RESERVATION STATUS</span>
                  <div className={cn(
                    "font-bold mt-0.5",
                    viewTicket.bookingStatus === "COMPLETED" ? "text-emerald-400" :
                    viewTicket.bookingStatus === "NO_SHOW" ? "text-rose-400" :
                    viewTicket.bookingStatus === "CANCELLED" ? "text-red-400" : "text-sky-300"
                  )}>
                    {viewTicket.bookingStatus}
                  </div>
                </div>
              </div>

              {/* Baggage Tag & Allowance */}
              <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-slate-400 text-[10px]">BAGGAGE TAG NUMBER</span>
                  <div className="font-bold text-amber-300 font-mono text-xs mt-0.5">
                    {viewTicket.baggageTag || `BAG-${viewTicket.pnr}-1`}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">BAGGAGE ALLOWANCE</span>
                  <div className="font-bold text-purple-300 text-xs mt-0.5">
                    {viewTicket.baggageAllowanceKg || 15} kg Checked Allowance
                  </div>
                </div>
              </div>

              {/* Extended Operational Audit Details */}
              {(viewTicket.actualDepartureTime || viewTicket.completedAt || viewTicket.noShowReason) && (
                <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-800 space-y-1 text-[11px]">
                  {viewTicket.actualDepartureTime && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Actual Departure:</span>
                      <span className="text-slate-200">{formatIST(viewTicket.actualDepartureTime)}</span>
                    </div>
                  )}
                  {viewTicket.actualArrivalTime && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Actual Arrival:</span>
                      <span className="text-emerald-300">{formatIST(viewTicket.actualArrivalTime)}</span>
                    </div>
                  )}
                  {viewTicket.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Journey Concluded:</span>
                      <span className="text-emerald-400">{formatIST(viewTicket.completedAt)}</span>
                    </div>
                  )}
                  {viewTicket.noShowReason && (
                    <div className="flex justify-between">
                      <span className="text-rose-400">No-Show Classification:</span>
                      <span className="text-rose-300">{viewTicket.noShowReason}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <div className="grid h-12 w-12 place-items-center rounded bg-white text-black font-mono">
                  <QrCode className="h-8 w-8" />
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  <span className="text-slate-300 font-semibold">Simulated Optical Barcode</span>
                  <div className="truncate max-w-[280px]">{viewTicket.qrCode || `AOCC|${viewTicket.pnr}`}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewTicket(null)}
                className="border-slate-700 text-xs"
              >
                Close Record
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
