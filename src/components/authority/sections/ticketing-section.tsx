"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  CreditCard,
  Luggage,
  Plane,
  QrCode,
  Search,
  ShieldCheck,
  Ticket,
  User,
  X,
} from "lucide-react";
import type { BookingDTO, FlightDTO, SeatDTO } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TicketingSection({
  flights,
  onBookingSuccess,
}: {
  flights: FlightDTO[];
  onBookingSuccess?: (booking: BookingDTO) => void;
}) {
  // Search state
  const [fromAirport, setFromAirport] = useState("HYD");
  const [toAirport, setToAirport] = useState("BOM");
  const [travelClass, setTravelClass] = useState<"ECONOMY" | "BUSINESS">("ECONOMY");

  // Selection states
  const [selectedFlight, setSelectedFlight] = useState<FlightDTO | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [flightSeats, setFlightSeats] = useState<SeatDTO[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Passenger state
  const [fullName, setFullName] = useState("Demo Passenger");
  const [email, setEmail] = useState("passenger@sim.test");
  const [phone, setPhone] = useState("+91 98765 00000");
  const [dob, setDob] = useState("1995-08-20");
  const [gender, setGender] = useState("Male");
  const [nationality, setNationality] = useState("Indian");
  const [idNumber, setIdNumber] = useState("P9821411");
  const [baggageCount, setBaggageCount] = useState(1);

  // Booking & confirmation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingDTO | null>(null);

  // Filter flights by search criteria
  const matchingFlights = flights.filter((f) => {
    const matchOrigin = !fromAirport || f.origin.toUpperCase() === fromAirport.toUpperCase();
    const matchDest = !toAirport || f.destination.toUpperCase() === toAirport.toUpperCase();
    return matchOrigin && matchDest;
  });

  async function handleSelectFlight(flight: FlightDTO) {
    setSelectedFlight(flight);
    setSelectedSeat(null);
    setConfirmedBooking(null);
    setBookingError(null);
    setLoadingSeats(true);

    try {
      const res = await fetch(`/api/flights/${flight.id}`);
      if (res.ok) {
        const data = await res.json();
        setFlightSeats(data.seats || []);
      }
    } catch {
      // fallback
    } finally {
      setLoadingSeats(false);
    }
  }

  async function handleBookFlight(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlight || !selectedSeat) {
      setBookingError("Please select an available seat from the seat map.");
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightId: selectedFlight.id,
          seatNumber: selectedSeat,
          travelClass,
          passenger: {
            fullName,
            email,
            phone,
            dateOfBirth: dob,
            gender,
            nationality,
            idNumber,
          },
          baggageCount,
          paymentMethod: "SIMULATED_CARD",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Booking failed");
      }

      setConfirmedBooking(data.booking);
      if (onBookingSuccess) onBookingSuccess(data.booking);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Booking transaction failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const fareAmount =
    travelClass === "BUSINESS"
      ? (selectedFlight?.businessFare ?? 8500)
      : (selectedFlight?.economyFare ?? 4500);

  return (
    <div className="space-y-6">
      {/* 1. FLIGHT SEARCH BAR */}
      <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-5 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
          <Search className="h-4 w-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Simulated Flight Booking Engine
          </h2>
          <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/30">
            Database Flights Only
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase">From (Origin)</label>
            <select
              value={fromAirport}
              onChange={(e) => setFromAirport(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-sky-300 outline-none"
            >
              <option value="HYD">Hyderabad (HYD)</option>
              <option value="BOM">Mumbai (BOM)</option>
              <option value="DEL">Delhi (DEL)</option>
              <option value="BLR">Bengaluru (BLR)</option>
              <option value="MAA">Chennai (MAA)</option>
              <option value="CCU">Kolkata (CCU)</option>
              <option value="COK">Kochi (COK)</option>
              <option value="GOI">Goa (GOI)</option>
              <option value="PNQ">Pune (PNQ)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase">To (Destination)</label>
            <select
              value={toAirport}
              onChange={(e) => setToAirport(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-emerald-300 outline-none"
            >
              <option value="BOM">Mumbai (BOM)</option>
              <option value="HYD">Hyderabad (HYD)</option>
              <option value="DEL">Delhi (DEL)</option>
              <option value="BLR">Bengaluru (BLR)</option>
              <option value="MAA">Chennai (MAA)</option>
              <option value="CCU">Kolkata (CCU)</option>
              <option value="DXB">Dubai (DXB)</option>
              <option value="SIN">Singapore (SIN)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase">Travel Class</label>
            <select
              value={travelClass}
              onChange={(e) => setTravelClass(e.target.value as "ECONOMY" | "BUSINESS")}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none"
            >
              <option value="ECONOMY">Economy Class</option>
              <option value="BUSINESS">Business Class</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              className="w-full bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs h-9"
            >
              Search Database Flights
            </Button>
          </div>
        </div>
      </div>

      {/* CONFIRMED E-TICKET DISPLAY */}
      {confirmedBooking && (
        <div className="rounded-xl border border-emerald-500/40 bg-[#07130f] p-6 shadow-2xl text-slate-100 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-emerald-500/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Booking Confirmed · E-Ticket Issued</h3>
                <p className="text-xs text-emerald-300 font-mono">
                  PNR: <span className="text-white font-bold text-sm">{confirmedBooking.pnr}</span> · SIMULATED TRANSACTION SUCCESSFUL
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmedBooking(null);
                setSelectedFlight(null);
                setSelectedSeat(null);
              }}
              className="text-xs border-slate-700"
            >
              Book Another Flight
            </Button>
          </div>

          {/* Airline Style E-Ticket Box */}
          <div className="mt-6 rounded-xl border border-slate-800 bg-[#090e17] p-6 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs uppercase font-mono tracking-wider text-sky-400 font-semibold">
                  {confirmedBooking.airline}
                </div>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  {confirmedBooking.flightNumber || confirmedBooking.flightCallsign}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-slate-400">ELECTRONIC TICKET</div>
                <div className="text-xs font-mono font-bold text-slate-200">{confirmedBooking.ticketNumber}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-800 text-xs font-mono">
              <div>
                <div className="text-slate-400 text-[10px]">PASSENGER</div>
                <div className="font-bold text-white mt-0.5">{confirmedBooking.passengerName}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">ROUTE</div>
                <div className="font-bold text-sky-300 mt-0.5">
                  {confirmedBooking.origin} → {confirmedBooking.destination}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">SEAT / CLASS</div>
                <div className="font-bold text-emerald-400 mt-0.5">
                  {confirmedBooking.seatNumber} ({confirmedBooking.travelClass})
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">TERMINAL / GATE</div>
                <div className="font-bold text-white mt-0.5">
                  {confirmedBooking.terminal || "T1"} · Gate {confirmedBooking.gate || "B12"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded bg-white text-black font-mono text-xs font-bold">
                  <QrCode className="h-8 w-8" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono leading-relaxed">
                  <div>Digital Security Barcode Verified</div>
                  <div className="text-slate-400">{confirmedBooking.qrCode?.slice(0, 40)}...</div>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-[10px] text-slate-400">TOTAL FARE PAID (SIMULATED)</div>
                <div className="text-lg font-bold text-emerald-400">₹{confirmedBooking.fare?.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MATCHING FLIGHT RESULTS */}
      {!confirmedBooking && (
        <div className="space-y-4">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Available Flights ({matchingFlights.length} Found)</span>
            <span>Select a flight to view live seat map</span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {matchingFlights.map((f) => {
              const isSelected = selectedFlight?.id === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => handleSelectFlight(f)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 transition-all",
                    isSelected
                      ? "border-sky-500 bg-sky-950/20 shadow-[0_0_16px_rgba(56,189,248,0.2)]"
                      : "border-slate-800 bg-[#090e17]/80 hover:border-slate-700 hover:bg-[#0c1422]",
                  )}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div>
                      <div className="text-xs text-sky-400 font-medium">{f.airline}</div>
                      <div className="text-base font-bold font-mono text-white">{f.flightNumber || f.callsign}</div>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {f.aircraftType}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-3 font-mono">
                    <div>
                      <div className="text-lg font-bold text-sky-300">{f.origin}</div>
                      <div className="text-[10px] text-slate-400">Gate {f.gate || "B12"}</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400">1h 40m</span>
                      <ArrowRight className="h-4 w-4 text-slate-500 my-0.5" />
                      <span className="text-[10px] text-emerald-400">Non-stop</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-300">{f.destination}</div>
                      <div className="text-[10px] text-slate-400">Term {f.terminal || "T1"}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 text-xs font-mono">
                    <div>
                      <span className="text-slate-400">Economy: </span>
                      <span className="font-bold text-emerald-400">₹{f.economyFare?.toLocaleString() || "4,500"}</span>
                      <span className="text-slate-500 text-[10px] ml-1.5">({f.availableSeats ?? 168} left)</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Business: </span>
                      <span className="font-bold text-sky-400">₹{f.businessFare?.toLocaleString() || "8,500"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE SEAT MAP & PASSENGER CHECKOUT */}
      {selectedFlight && !confirmedBooking && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-in fade-in">
          {/* Interactive Seat Map */}
          <div className="rounded-xl border border-slate-800 bg-[#090e17]/95 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Select Seat for {selectedFlight.flightNumber || selectedFlight.callsign}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedFlight.origin} → {selectedFlight.destination} · {travelClass}
                </p>
              </div>
              {selectedSeat && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Selected</span>
                  <span className="font-bold font-mono text-emerald-400 text-sm">Seat {selectedSeat}</span>
                </div>
              )}
            </div>

            {/* Seat Legend */}
            <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-slate-400 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-sky-400/60 bg-sky-950/40" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-emerald-500" />
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-slate-800 text-slate-600" />
                <span>Occupied</span>
              </div>
            </div>

            {/* Airplane Fuselage Graphic & Seat Rows */}
            <div className="relative mx-auto max-w-sm rounded-3xl border-2 border-slate-800 bg-slate-950/60 p-4 shadow-inner">
              <div className="text-center font-mono text-[10px] text-slate-400 uppercase tracking-widest pb-3">
                ▲ FRONT / COCKPIT ▲
              </div>

              {loadingSeats ? (
                <div className="py-16 text-center text-xs text-slate-500">Loading seat map...</div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                  {/* Rows 1-3 Business Class (2-2 configuration) */}
                  <div className="text-[10px] font-mono text-sky-400 uppercase border-b border-slate-800/80 pb-1">
                    Business Cabin (Rows 1-3)
                  </div>
                  {[1, 2, 3].map((row) => (
                    <div key={row} className="flex items-center justify-between px-4">
                      <div className="flex gap-2">
                        {["A", "C"].map((col) => {
                          const seatNum = `${row}${col}`;
                          const seatObj = flightSeats.find((s) => s.seatNumber === seatNum);
                          const isOccupied = seatObj?.status === "OCCUPIED" || seatObj?.status === "RESERVED";
                          const isSelected = selectedSeat === seatNum;

                          return (
                            <button
                              key={seatNum}
                              type="button"
                              disabled={isOccupied}
                              onClick={() => setSelectedSeat(seatNum)}
                              className={cn(
                                "h-8 w-8 rounded text-[11px] font-mono font-bold transition-all",
                                isOccupied && "bg-slate-800/80 text-slate-600 cursor-not-allowed",
                                isSelected && "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30",
                                !isOccupied && !isSelected && "border border-sky-500/40 bg-sky-950/40 text-sky-300 hover:bg-sky-500 hover:text-black",
                              )}
                            >
                              {seatNum}
                            </button>
                          );
                        })}
                      </div>

                      <span className="text-[10px] font-mono text-slate-400">AISLE</span>

                      <div className="flex gap-2">
                        {["D", "F"].map((col) => {
                          const seatNum = `${row}${col}`;
                          const seatObj = flightSeats.find((s) => s.seatNumber === seatNum);
                          const isOccupied = seatObj?.status === "OCCUPIED" || seatObj?.status === "RESERVED";
                          const isSelected = selectedSeat === seatNum;

                          return (
                            <button
                              key={seatNum}
                              type="button"
                              disabled={isOccupied}
                              onClick={() => setSelectedSeat(seatNum)}
                              className={cn(
                                "h-8 w-8 rounded text-[11px] font-mono font-bold transition-all",
                                isOccupied && "bg-slate-800/80 text-slate-600 cursor-not-allowed",
                                isSelected && "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30",
                                !isOccupied && !isSelected && "border border-sky-500/40 bg-sky-950/40 text-sky-300 hover:bg-sky-500 hover:text-black",
                              )}
                            >
                              {seatNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Rows 4-15 Economy Class (3-3 configuration) */}
                  <div className="text-[10px] font-mono text-slate-400 uppercase border-b border-slate-800/80 pt-3 pb-1">
                    Economy Cabin (Rows 4-15)
                  </div>
                  {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((row) => (
                    <div key={row} className="flex items-center justify-between px-2">
                      <div className="flex gap-1.5">
                        {["A", "B", "C"].map((col) => {
                          const seatNum = `${row}${col}`;
                          const seatObj = flightSeats.find((s) => s.seatNumber === seatNum);
                          const isOccupied = seatObj?.status === "OCCUPIED" || seatObj?.status === "RESERVED";
                          const isSelected = selectedSeat === seatNum;

                          return (
                            <button
                              key={seatNum}
                              type="button"
                              disabled={isOccupied}
                              onClick={() => setSelectedSeat(seatNum)}
                              className={cn(
                                "h-7 w-7 rounded text-[10px] font-mono font-bold transition-all",
                                isOccupied && "bg-slate-800/80 text-slate-600 cursor-not-allowed",
                                isSelected && "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30",
                                !isOccupied && !isSelected && "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-sky-500 hover:text-black",
                              )}
                            >
                              {col}
                            </button>
                          );
                        })}
                      </div>

                      <span className="text-[9px] font-mono text-slate-400">{row}</span>

                      <div className="flex gap-1.5">
                        {["D", "E", "F"].map((col) => {
                          const seatNum = `${row}${col}`;
                          const seatObj = flightSeats.find((s) => s.seatNumber === seatNum);
                          const isOccupied = seatObj?.status === "OCCUPIED" || seatObj?.status === "RESERVED";
                          const isSelected = selectedSeat === seatNum;

                          return (
                            <button
                              key={seatNum}
                              type="button"
                              disabled={isOccupied}
                              onClick={() => setSelectedSeat(seatNum)}
                              className={cn(
                                "h-7 w-7 rounded text-[10px] font-mono font-bold transition-all",
                                isOccupied && "bg-slate-800/80 text-slate-600 cursor-not-allowed",
                                isSelected && "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30",
                                !isOccupied && !isSelected && "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-sky-500 hover:text-black",
                              )}
                            >
                              {col}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center font-mono text-[10px] text-slate-400 uppercase tracking-widest pt-3">
                ▼ BACK / GALLEY ▼
              </div>
            </div>
          </div>

          {/* Passenger Details & Simulated Payment Checkout Form */}
          <div className="rounded-xl border border-slate-800 bg-[#090e17]/95 p-5 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <User className="h-4 w-4 text-sky-400" />
                Passenger Details & Simulated Checkout
              </h3>
              <p className="text-[11px] text-slate-400">
                Complete required manifest details. Concurrency-safe booking guarantee.
              </p>
            </div>

            <form onSubmit={handleBookFlight} className="space-y-3.5">
              {bookingError && (
                <div className="rounded border border-red-500/40 bg-red-950/40 p-2.5 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{bookingError}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase">Passenger Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="mt-1 bg-slate-900 border-slate-700 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Phone Number</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Date of Birth</label>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Passport / ID</label>
                  <Input
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Baggage Selection */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase">Check-in Baggage</label>
                <div className="mt-1 flex items-center gap-3">
                  {[0, 1, 2].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBaggageCount(b)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono transition-all",
                        baggageCount === b
                          ? "border-sky-500 bg-sky-950/40 text-sky-300"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200",
                      )}
                    >
                      <Luggage className="h-3.5 w-3.5" />
                      <span>{b === 0 ? "Cabin Only" : `${b} Piece (${b * 15} kg)`}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fare Summary & Simulated Payment */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Selected Seat</span>
                  <span className="text-white font-bold">{selectedSeat || "None Selected"}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Base Airfare ({travelClass})</span>
                  <span className="text-white">₹{fareAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Simulated Fuel & Taxes</span>
                  <span className="text-white">₹450</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm">
                  <span className="text-sky-300">Total Simulated Charge</span>
                  <span className="text-emerald-400">₹{(fareAmount + 450).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedSeat}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <CreditCard className="h-4 w-4" />
                  {isSubmitting
                    ? "Processing Simulated Transaction..."
                    : `Confirm Booking & Issue PNR (₹${(fareAmount + 450).toLocaleString()})`}
                </Button>
                <p className="text-[10px] text-center text-slate-400 font-mono mt-1.5">
                  Educational Simulation Mode · No actual payment processed
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
