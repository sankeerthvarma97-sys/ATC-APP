"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  FileText,
  Luggage,
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

export function BookingsSection({
  onNavigateToCheckin,
}: {
  onNavigateToCheckin?: (pnr: string) => void;
}) {
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewTicket, setViewTicket] = useState<BookingDTO | null>(null);

  async function fetchBookings() {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
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
      try {
        const res = await fetch("/api/bookings");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setBookings(data.bookings || []);
        }
      } catch {
        // fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
    return (
      !q ||
      b.pnr.toLowerCase().includes(q) ||
      (b.passengerName && b.passengerName.toLowerCase().includes(q)) ||
      (b.flightNumber && b.flightNumber.toLowerCase().includes(q)) ||
      b.origin?.toLowerCase().includes(q) ||
      b.destination?.toLowerCase().includes(q)
    );
  });

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
            Confirmed passenger bookings across all authorized simulation flights.
          </p>
        </div>

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

      {/* Bookings Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#090e17]/90 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/80 font-mono text-[11px] text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-3">PNR</th>
                <th className="py-3 px-3">Passenger</th>
                <th className="py-3 px-3">Flight / Route</th>
                <th className="py-3 px-3">Seat / Class</th>
                <th className="py-3 px-3">Fare</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Check-in</th>
                <th className="py-3 px-3">Boarding</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
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
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No matching bookings found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
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
                        variant={b.paymentStatus === "SUCCESSFUL" ? "success" : "destructive"}
                        className="text-[10px]"
                      >
                        {b.paymentStatus}
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
                        {b.checkInStatus !== "CHECKED_IN" && onNavigateToCheckin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigateToCheckin(b.pnr)}
                            className="h-7 px-2 text-[11px] border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40"
                          >
                            Check-in
                          </Button>
                        )}
                        {b.bookingStatus !== "CANCELLED" && (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* E-TICKET POPUP MODAL */}
      {viewTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-xl border border-sky-500/30 bg-[#090d16] p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider font-semibold">
                  {viewTicket.airline} · Electronic Ticket
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
                  <span className="text-slate-400 text-[10px]">BOOKING STATUS</span>
                  <div className="font-bold text-emerald-400 mt-0.5">{viewTicket.bookingStatus}</div>
                </div>
              </div>

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
                Close E-Ticket
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
