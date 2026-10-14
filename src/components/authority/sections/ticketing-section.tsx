"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Luggage,
  Percent,
  Plane,
  QrCode,
  Search,
  Tag,
  User,
  X,
} from "lucide-react";
import type { BookingDTO, FlightDTO, PassengerCategory, SeatDTO } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshButton } from "@/components/ui/refresh-button";
import { cn } from "@/lib/utils";

export function TicketingSection({
  flights: initialFlights,
  onBookingSuccess,
  onNavigateTo,
}: {
  flights?: FlightDTO[];
  onBookingSuccess?: (booking: BookingDTO) => void;
  onNavigateTo?: (section: string) => void;
}) {
  const [fetchedFlights, setFetchedFlights] = useState<FlightDTO[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Search state - defaults to today in Indian Standard Time (Asia/Kolkata, UTC+05:30)
  const [fromAirport, setFromAirport] = useState("HYD");
  const [toAirport, setToAirport] = useState("BOM");
  const [travelDate, setTravelDate] = useState(() => {
    const ist = new Date(Date.now() + 330 * 60_000);
    return ist.toISOString().slice(0, 10);
  });
  const [nowTimestamp] = useState(() => Date.now());
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
  const [nationality] = useState("Indian");
  const [idNumber, setIdNumber] = useState("P9821411");
  const [baggageCount, setBaggageCount] = useState(1);

  // Booking & confirmation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingDTO | null>(null);

  // Special Fare & Coupon discount states
  const [passengerCategory, setPassengerCategory] = useState<PassengerCategory>("GENERAL");
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    description: string;
    category: PassengerCategory;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Dynamic search function querying backend database/memory
  const searchFlights = useCallback(async (orig = fromAirport, dest = toAirport, selectedDate = travelDate) => {
    setIsSearching(true);
    setBookingError(null);
    try {
      const params = new URLSearchParams();
      if (orig && orig !== "ALL") params.set("from", orig);
      if (dest && dest !== "ALL") params.set("to", dest);
      if (selectedDate) params.set("date", selectedDate);
      params.set("bookableOnly", "true");
      params.set("pageSize", "50");

      const res = await fetch(`/api/flights?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.flights) {
          setFetchedFlights(data.flights);
        }
      }
    } catch (err) {
      console.warn("Flight search error:", err);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  }, [fromAirport, toAirport, travelDate]);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      await Promise.resolve();
      if (!cancelled) {
        await searchFlights(fromAirport, toAirport, travelDate);
      }
    };
    void loadData();

    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.activeSection === "ticketing") {
        void searchFlights(fromAirport, toAirport, travelDate);
      }
    };
    window.addEventListener("aocc:refresh", handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("aocc:refresh", handleRefresh);
    };
  }, [searchFlights, fromAirport, toAirport, travelDate]);

  const flights = (initialFlights && initialFlights.length > 0) ? initialFlights : fetchedFlights;

  // Filter flights by search criteria and travel date
  const matchingFlights = flights.filter((f) => {
    const matchOrigin = !fromAirport || fromAirport === "ALL" || f.origin.toUpperCase() === fromAirport.toUpperCase();
    const matchDest = !toAirport || toAirport === "ALL" || f.destination.toUpperCase() === toAirport.toUpperCase();

    // Travel Date in Indian Standard Time (Asia/Kolkata)
    let matchDate = true;
    if (travelDate && f.departureTime) {
      const flightIstDate = new Date(new Date(f.departureTime).getTime() + 330 * 60_000)
        .toISOString()
        .slice(0, 10);
      matchDate = flightIstDate === travelDate;
    }

    // Bookability guard: Only future SCHEDULED or BOARDING flights
    const isBookableStatus = f.status === "SCHEDULED" || f.status === "BOARDING";
    const isFuture = f.departureTime ? new Date(f.departureTime).getTime() > nowTimestamp : true;

    return matchOrigin && matchDest && matchDate && isBookableStatus && isFuture;
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

  async function handleApplyCoupon(codeToApply?: string) {
    const code = (codeToApply || couponCodeInput).trim().toUpperCase();
    if (!code) {
      setCouponError("Please enter a coupon code.");
      return;
    }
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          baseFare: fareAmount,
          passengerCategory,
          seatClass: travelClass,
          passengerEmail: email,
        }),
      });
      const data = await res.json();
      if (!data.valid) {
        setCouponError(data.error || "Coupon could not be applied.");
        setAppliedCoupon(null);
      } else if (data.couponApplied) {
        setAppliedCoupon({
          code: data.couponApplied.code,
          discountAmount: data.discountAmount,
          description: data.couponApplied.description,
          category: data.couponApplied.category,
        });
        setCouponCodeInput(data.couponApplied.code);
        setCouponError(null);
      }
    } catch (err: unknown) {
      setCouponError(err instanceof Error ? err.message : "Validation failed.");
    } finally {
      setValidatingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCodeInput("");
    setCouponError(null);
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
          couponCode: appliedCoupon?.code,
          passengerCategory,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Booking failed");
      }

      setConfirmedBooking(data.booking);
      // Decrement available seat count dynamically in local state
      setFetchedFlights((prev) =>
        prev.map((f) =>
          f.id === selectedFlight.id
            ? { ...f, availableSeats: Math.max(0, (f.availableSeats ?? 10) - 1) }
            : f
        )
      );
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
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Simulated Flight Booking Engine
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
              Hub Policy: HYD Locked
            </Badge>
            <Badge variant="outline" className="text-[10px] text-sky-300 border-sky-500/30">
              Live Database Active
            </Badge>
            <RefreshButton
              onRefresh={() => searchFlights(fromAirport, toAirport)}
              isRefreshing={isSearching}
              size="sm"
              variant="cyan"
              label="Refresh Flights"
              tooltip="Refresh real-time flight availability and fares"
              showStatusIndicator
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase">From (Origin)</label>
            <select
              value={fromAirport}
              onChange={(e) => {
                setFromAirport(e.target.value);
                searchFlights(e.target.value, toAirport);
              }}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-sky-300 outline-none"
            >
              <option value="HYD">Hyderabad (HYD) — AOCC Hub</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase">To (Destination)</label>
            <select
              value={toAirport}
              onChange={(e) => {
                setToAirport(e.target.value);
                searchFlights(fromAirport, e.target.value);
              }}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-emerald-300 outline-none"
            >
              <option value="ALL">All Domestic Destinations</option>
              <option value="BOM">Mumbai (BOM) — CSMIA</option>
              <option value="DEL">Delhi (DEL) — IGI Airport</option>
              <option value="BLR">Bengaluru (BLR) — Kempegowda</option>
              <option value="MAA">Chennai (MAA) — Chennai Int&apos;l</option>
              <option value="CCU">Kolkata (CCU) — NSCBI Airport</option>
              <option value="COK">Kochi (COK) — Cochin Int&apos;l</option>
              <option value="GOI">Goa (GOI) — Dabolim Int&apos;l</option>
              <option value="PNQ">Pune (PNQ) — Pune Airport</option>
              <option value="AMD">Ahmedabad (AMD) — SVPIA</option>
              <option value="JAI">Jaipur (JAI) — Jaipur Int&apos;l</option>
              <option value="VTZ">Visakhapatnam (VTZ) — Vizag Int&apos;l</option>
              <option value="TIR">Tirupati (TIR) — Tirupati Int&apos;l</option>
              <option value="LKO">Lucknow (LKO) — CCSIA</option>
              <option value="BBI">Bhubaneswar (BBI) — BPIA</option>
              <option value="GAU">Guwahati (GAU) — LGBI Airport</option>
              <option value="PAT">Patna (PAT) — Jayprakash Narayan</option>
              <option value="IXC">Chandigarh (IXC) — SBS Airport</option>
              <option value="TRV">Thiruvananthapuram (TRV)</option>
              <option value="NAG">Nagpur (NAG) — Dr. Ambedkar</option>
              <option value="SXR">Srinagar (SXR) — Sheikh ul-Alam</option>
              <option value="IXB">Bagdogra (IXB) — Siliguri</option>
              <option value="IDR">Indore (IDR) — Devi Ahilya</option>
              <option value="VNS">Varanasi (VNS) — Lal Bahadur</option>
              <option value="ATQ">Amritsar (ATQ) — Guru Ram Dass</option>
              <option value="IXR">Ranchi (IXR) — Birsa Munda</option>
              <option value="BDQ">Vadodara (BDQ) — Vadodara</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase">Departure Date</label>
            <Input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="mt-1 bg-slate-900 border-slate-700 text-xs font-mono h-[38px] text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase">Travel Class</label>
            <select
              value={travelClass}
              onChange={(e) => setTravelClass(e.target.value as "ECONOMY" | "BUSINESS")}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none h-[38px]"
            >
              <option value="ECONOMY">Economy Class</option>
              <option value="BUSINESS">Business Class</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              disabled={isSearching}
              onClick={() => searchFlights(fromAirport, toAirport)}
              className="w-full bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs h-[38px] flex items-center justify-center gap-1.5"
            >
              {isSearching ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  <span>Search Flights</span>
                </>
              )}
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

            {/* Flight Timings & Baggage Association Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-b border-slate-800 text-xs font-mono">
              <div>
                <div className="text-slate-400 text-[10px]">SCHEDULED DEPARTURE (IST)</div>
                <div className="font-bold text-sky-300 mt-0.5">
                  {confirmedBooking.departureTime ? new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata", hour12: false }).format(new Date(confirmedBooking.departureTime)) : "--:--"} IST
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">ESTIMATED ARRIVAL (IST)</div>
                <div className="font-bold text-emerald-300 mt-0.5">
                  {confirmedBooking.arrivalTime ? new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata", hour12: false }).format(new Date(confirmedBooking.arrivalTime)) : "--:--"} IST
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">BAGGAGE ALLOWANCE</div>
                <div className="font-bold text-purple-300 mt-0.5">
                  {confirmedBooking.baggageAllowanceKg || 15} kg Checked · 7 kg Cabin
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">BAGGAGE TAG & STATUS</div>
                <div className="font-bold text-amber-300 mt-0.5 flex items-center gap-1.5">
                  <span>{confirmedBooking.baggageTag || `BAG-${confirmedBooking.pnr}-1`}</span>
                  <Badge className="bg-emerald-950 border-emerald-500 text-emerald-300 text-[9px] px-1 py-0">
                    {confirmedBooking.baggageStatus || "CHECKED"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded bg-white text-black font-mono text-xs font-bold">
                  <QrCode className="h-8 w-8" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono leading-relaxed">
                  <div className="text-emerald-400 font-semibold">Digital Security Barcode Verified</div>
                  <div className="text-slate-400">{confirmedBooking.qrCode?.slice(0, 45)}...</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {onNavigateTo && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigateTo("baggage")}
                    className="border-purple-500/40 text-purple-300 hover:bg-purple-950/40 text-xs font-mono"
                  >
                    <Luggage className="h-3.5 w-3.5 mr-1 text-purple-400" />
                    Verify at Baggage Counter
                  </Button>
                )}
                <div className="text-right font-mono">
                  <div className="text-[10px] text-slate-400">TOTAL FARE PAID (SIMULATED)</div>
                  <div className="text-lg font-bold text-emerald-400">₹{confirmedBooking.fare?.toLocaleString()}</div>
                  {confirmedBooking.couponCode && (
                    <div className="text-[10px] text-emerald-300 font-semibold flex items-center justify-end gap-1 mt-0.5">
                      <Tag className="w-3 h-3 text-emerald-400" />
                      Coupon {confirmedBooking.couponCode} applied (-₹{confirmedBooking.couponDiscount?.toLocaleString()})
                    </div>
                  )}
                </div>
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

          {hasSearched && matchingFlights.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[#090e17]/90 p-8 text-center animate-in fade-in">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-sky-400 mb-3 border border-slate-700">
                <Plane className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No Scheduled Flights Found</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                No active flights currently match the route from {fromAirport} to {toAirport === "ALL" ? "the selected destinations" : toAirport}.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setToAirport("ALL");
                    searchFlights(fromAirport, "ALL");
                  }}
                  className="text-xs border-slate-700 bg-slate-900 text-sky-300 hover:bg-slate-800 hover:text-white"
                >
                  View All Departures from Hyderabad
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setToAirport("BOM");
                    searchFlights(fromAirport, "BOM");
                  }}
                  className="text-xs border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Reset Route (HYD → BOM)
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {matchingFlights.map((f) => {
                const isSelected = selectedFlight?.id === f.id;
                const totalCap = (f.economyCapacity || 150) + (f.businessCapacity || 20) + (f.firstCapacity || 0);
                const depTimeFormatted = f.departureTime
                  ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata", hour12: false }).format(new Date(f.departureTime))
                  : "--:--";
                const arrTimeFormatted = f.arrivalTime
                  ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata", hour12: false }).format(new Date(f.arrivalTime))
                  : "--:--";

                const depDate = f.departureTime ? new Date(f.departureTime) : null;
                const arrDate = f.arrivalTime ? new Date(f.arrivalTime) : null;
                let durationText = "";
                let isNextDay = false;
                if (depDate && arrDate) {
                  const diffMs = arrDate.getTime() - depDate.getTime();
                  if (diffMs > 0) {
                    const totalMins = Math.floor(diffMs / 60000);
                    const h = Math.floor(totalMins / 60);
                    const m = totalMins % 60;
                    durationText = `${h}h ${m}m`;
                  }
                  // Check calendar day difference in IST (+5:30)
                  const depIstDay = new Date(depDate.getTime() + 330 * 60_000).getUTCDate();
                  const arrIstDay = new Date(arrDate.getTime() + 330 * 60_000).getUTCDate();
                  isNextDay = arrIstDay !== depIstDay;
                } else if (f.durationMin) {
                  const h = Math.floor(f.durationMin / 60);
                  const m = f.durationMin % 60;
                  durationText = `${h}h ${m}m`;
                }

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
                        <div className="text-base font-bold font-mono text-white flex items-center gap-2">
                          <span>{f.flightNumber || f.callsign}</span>
                          <span className="text-[11px] font-normal text-slate-400 font-sans">{f.flightName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={f.status === "BOARDING" ? "default" : "outline"}
                          className={cn(
                            "text-[10px] font-mono",
                            f.status === "BOARDING" ? "bg-amber-500 text-black border-amber-400" : "text-sky-300 border-sky-500/30"
                          )}
                        >
                          {f.status}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-xs">
                          {f.aircraftType}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 font-mono">
                      <div>
                        <div className="text-lg font-bold text-sky-300">{f.origin}</div>
                        <div className="text-xs text-slate-200 font-semibold">{depTimeFormatted} IST</div>
                        <div className="text-[10px] text-slate-400">Gate {f.gate || "B12"}</div>
                        {f.status === "DELAYED" && (
                          <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                            Rev: Est. Dep Delay
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-300 font-bold">{durationText || "1h 35m"}</span>
                        <ArrowRight className="h-4 w-4 text-slate-500 my-0.5" />
                        <span className="text-[10px] text-emerald-400">Non-stop</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-300">{f.destination}</div>
                        <div className="text-xs text-slate-200 font-semibold flex items-center justify-end gap-1">
                          <span>{arrTimeFormatted} IST</span>
                          {isNextDay && (
                            <Badge className="bg-amber-950/80 border-amber-500/50 text-amber-300 text-[9px] px-1 py-0 h-4 font-mono font-bold">
                              +1 Day
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">Term {f.terminal || "T1"}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 text-xs font-mono">
                      <div>
                        <span className="text-slate-400">Fare: </span>
                        <span className="font-bold text-emerald-400">₹{f.economyFare?.toLocaleString() || "4,500"}</span>
                        <span className="text-slate-500 text-[10px] ml-1.5">
                          ({f.availableSeats ?? totalCap} / {totalCap} seats left)
                        </span>
                      </div>
                      <div>
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          className="h-7 text-[11px] px-2.5"
                        >
                          {isSelected ? "Selected" : "Select Flight"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

              {/* Passenger Category / Concession Gating */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase flex items-center justify-between">
                  <span>Passenger Concession Category</span>
                  <span className="text-[10px] text-sky-400 font-sans">Special Fares Available</span>
                </label>
                <select
                  value={passengerCategory}
                  onChange={(e) => {
                    const cat = e.target.value as PassengerCategory;
                    setPassengerCategory(cat);
                    if (appliedCoupon && appliedCoupon.category !== "GENERAL" && appliedCoupon.category !== cat) {
                      handleRemoveCoupon();
                    }
                  }}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none"
                >
                  <option value="GENERAL">General Public Adult</option>
                  <option value="STUDENT">Student Concession (ID Required at Check-in)</option>
                  <option value="ARMED_FORCES">Armed Forces & Paramilitary (Service ID)</option>
                  <option value="SENIOR_CITIZEN">Senior Citizen (60+ Years)</option>
                  <option value="STAFF">Airline & Airport Operations Staff</option>
                </select>
              </div>

              {/* Special Fare Coupon & Promo Code Section */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-sky-400" />
                    Special Fare / Coupon Code
                  </span>
                  {appliedCoupon && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      Discount Applied
                    </Badge>
                  )}
                </div>

                {!appliedCoupon ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        placeholder="e.g. AOCC-STUDENT-2026"
                        className="bg-slate-950 border-slate-700 text-white font-mono uppercase text-xs h-9"
                      />
                      <Button
                        type="button"
                        onClick={() => handleApplyCoupon()}
                        disabled={validatingCoupon || !couponCodeInput.trim()}
                        className="bg-sky-600 hover:bg-sky-500 text-white text-xs px-3.5 h-9"
                      >
                        {validatingCoupon ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>

                    {couponError && (
                      <div className="text-[11px] text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{couponError}</span>
                      </div>
                    )}

                    {/* Quick Test Coupon Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400">Quick Test:</span>
                      {[
                        { code: "AOCC-STUDENT-2026", label: "15% Student", cat: "STUDENT" },
                        { code: "AOCC-DEFENCE-2026", label: "20% Defence", cat: "ARMED_FORCES" },
                        { code: "AOCC-FLYSAFE-2026", label: "₹500 Flat", cat: "GENERAL" },
                      ].map((cpn) => (
                        <button
                          key={cpn.code}
                          type="button"
                          onClick={() => {
                            setPassengerCategory(cpn.cat as PassengerCategory);
                            setCouponCodeInput(cpn.code);
                            handleApplyCoupon(cpn.code);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 border border-slate-700 hover:border-sky-500 text-sky-300 hover:text-white transition-colors"
                        >
                          {cpn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded bg-emerald-950/30 border border-emerald-500/40">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded">
                        <Percent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          <span>{appliedCoupon.code}</span>
                          <span className="text-emerald-400 font-semibold">
                            -₹{appliedCoupon.discountAmount.toLocaleString("en-IN")} OFF
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">{appliedCoupon.description}</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveCoupon}
                      title="Remove Coupon"
                      className="h-6 w-6 text-slate-400 hover:text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
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
                {appliedCoupon && appliedCoupon.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Coupon Concession ({appliedCoupon.code})</span>
                    <span>-₹{appliedCoupon.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm">
                  <span className="text-sky-300">Total Simulated Charge</span>
                  <span className="text-emerald-400">
                    ₹{Math.max(450, fareAmount + 450 - (appliedCoupon?.discountAmount || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedSeat}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {isSubmitting
                    ? "Processing Simulated Transaction..."
                    : `Confirm Booking & Issue PNR (₹${Math.max(450, fareAmount + 450 - (appliedCoupon?.discountAmount || 0)).toLocaleString()})`}
                </Button>
                <p className="text-[10px] text-center text-slate-400 font-mono mt-1.5">
                  Educational Simulation Mode · Authoritative Discount Verified
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
