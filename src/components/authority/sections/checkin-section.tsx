"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Luggage,
  Plane,
  QrCode,
  Search,
  Ticket,
  User,
} from "lucide-react";
import type { BoardingPassDTO, BookingDTO } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DigitalBoardingPass } from "@/components/passengers/digital-boarding-pass";

export function CheckinSection({
  initialPnr = "",
  onNavigateTo,
}: {
  initialPnr?: string;
  onNavigateTo?: (section: string) => void;
}) {
  const [pnr, setPnr] = useState(initialPnr || "SC7K92P");
  const [booking, setBooking] = useState<BookingDTO | null>(null);
  const [boardingPass, setBoardingPass] = useState<BoardingPassDTO | null>(null);
  const [baggageCount, setBaggageCount] = useState(1);
  const [baggageWeight, setBaggageWeight] = useState(15.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSearchBooking() {
    if (!pnr.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setBooking(null);
    setBoardingPass(null);

    try {
      const res = await fetch(`/api/bookings/${pnr.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Booking not found");
      }
      setBooking(data.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error locating booking");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    if (!booking) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pnr: booking.pnr,
          baggageCount,
          baggageWeightKg: baggageWeight,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Check-in failed");
      }

      setBoardingPass(data.boardingPass);
      setSuccessMsg("Check-in successful! Digital boarding pass has been issued.");
      setBooking((prev) => (prev ? { ...prev, checkInStatus: "CHECKED_IN" } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-5 shadow-xl">
        <div className="border-b border-slate-800 pb-3 mb-4">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-sky-400" />
            Passenger Check-in Terminal
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Lookup passenger booking by PNR, tag baggage, and issue official digital boarding passes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Enter 6 or 7 character PNR (e.g. SC7K92P)..."
              value={pnr}
              onChange={(e) => setPnr(e.target.value.toUpperCase())}
              className="pl-9 bg-slate-900 border-slate-700 font-mono text-sm uppercase text-sky-300 placeholder-slate-500"
            />
          </div>
          <Button
            onClick={handleSearchBooking}
            disabled={loading}
            className="bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs h-10 px-4"
          >
            {loading ? "Searching..." : "Lookup Booking"}
          </Button>
        </div>

        {error && (
          <div className="mt-3 rounded border border-red-500/40 bg-red-950/40 p-2.5 text-xs text-red-200">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mt-3 rounded border border-emerald-500/40 bg-emerald-950/40 p-2.5 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Booking Found & Check-in Controls */}
      {booking && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-in fade-in">
          {/* Passenger & Flight Summary Card */}
          <div className="rounded-xl border border-slate-800 bg-[#090e17]/95 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider font-semibold">
                  Manifest Match
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{booking.passengerName}</h3>
              </div>
              <Badge
                variant={booking.checkInStatus === "CHECKED_IN" ? "success" : "secondary"}
                className="font-mono text-xs"
              >
                {booking.checkInStatus === "CHECKED_IN" ? "Checked In" : "Not Checked In"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="rounded border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-slate-400 text-[10px]">FLIGHT</span>
                <div className="font-bold text-white mt-0.5">{booking.flightNumber || booking.flightCallsign}</div>
                <div className="text-slate-400 text-[10px]">{booking.airline}</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-slate-400 text-[10px]">ROUTE</span>
                <div className="font-bold text-sky-300 mt-0.5">
                  {booking.origin} → {booking.destination}
                </div>
                <div className="text-slate-400 text-[10px]">Terminal {booking.terminal || "T1"} · Gate {booking.gate || "B12"}</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-slate-400 text-[10px]">ALLOCATED SEAT</span>
                <div className="font-bold text-emerald-400 text-sm mt-0.5">Seat {booking.seatNumber}</div>
                <div className="text-slate-400 text-[10px]">{booking.travelClass} Class</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-slate-400 text-[10px]">CONTACT PHONE</span>
                <div className="font-bold text-white mt-0.5">{booking.passengerPhone || "—"}</div>
                <div className="text-slate-400 text-[10px] truncate">{booking.passengerEmail}</div>
              </div>
            </div>

            {/* Baggage Tagging Form */}
            {booking.checkInStatus !== "CHECKED_IN" && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-3">
                <div className="text-[11px] font-mono font-semibold text-slate-300 uppercase flex items-center gap-1.5">
                  <Luggage className="h-4 w-4 text-sky-400" />
                  Baggage Drop & Weigh-In
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Piece Count</label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={baggageCount}
                      onChange={(e) => setBaggageCount(Number(e.target.value))}
                      className="mt-1 bg-slate-900 border-slate-700 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Total Weight (kg)</label>
                    <Input
                      type="number"
                      step="0.5"
                      min={0}
                      max={100}
                      value={baggageWeight}
                      onChange={(e) => setBaggageWeight(Number(e.target.value))}
                      className="mt-1 bg-slate-900 border-slate-700 font-mono text-xs"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCheckIn}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 mt-2 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Seat & Issue Boarding Pass
                </Button>
              </div>
            )}
          </div>

          {/* Digital Boarding Pass Display */}
          <div>
            {boardingPass ? (
              <DigitalBoardingPass
                pass={boardingPass}
                onSimulateGateScan={() => onNavigateTo?.("boarding")}
              />
            ) : (
              <div className="grid min-h-[300px] place-items-center rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500 font-mono">
                Digital Boarding Pass will render here after completing passenger check-in.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
