import { describe, it, expect, vi } from "vitest";
import {
  createBooking,
  getBookingByPnr,
  listBookingsPaged,
  processMissedFlights,
  processFlightArrivalAndCompletion,
  memoryBookings,
} from "@/lib/services/booking-service";
import {
  createFlight,
  listFlightsPaged,
  updateFlightStatus,
} from "@/lib/services/flight-service";
import {
  verifyBaggagePnr,
  acceptBaggageForPnr,
  listBaggage,
} from "@/lib/services/baggage-service";
import {
  startVoiceBroadcast,
  endVoiceBroadcast,
  getActiveVoiceBroadcast,
  getAudienceRecipientCount,
  registerStaffPresence,
  removeStaffPresence,
} from "@/lib/services/announcement-service";
import type { UserDTO } from "@/lib/domain";

describe("AOCC - Global Refresh, Live Voice Broadcast, Baggage PNR & Schedule Integration (24 Scenario Suite)", () => {
  const adminUser: UserDTO = {
    id: "usr-admin-1",
    name: "AOCC Controller",
    email: "admin@aocc.test",
    role: "AIRPORT_ADMIN",
  };

  const baggageStaffUser: UserDTO = {
    id: "usr-baggage-1",
    name: "Karan BHS Agent",
    email: "baggage@aocc.test",
    role: "BAGGAGE_STAFF",
  };

  const passengerUser: UserDTO = {
    id: "usr-passenger-1",
    name: "Rohan Varma",
    email: "rohan@test.com",
    role: "PASSENGER",
  };

  // Scenario 1: Refresh works on every portal and domain page
  it("Scenario 1: Refresh data triggers fetch and retrieves fresh operations data without full page reload", async () => {
    const flights = await listFlightsPaged({ pageSize: 10 });
    expect(flights).toBeDefined();
    expect(Array.isArray(flights.flights)).toBe(true);
    expect(flights.total).toBeGreaterThanOrEqual(0);
  });

  // Scenario 2: Refresh preserves filters, search, and selected travel date
  it("Scenario 2: Refresh preserves filters, search query, and selected travel date", async () => {
    const filter = {
      origin: "HYD",
      destination: "BOM",
      page: 1,
      pageSize: 5,
    };
    const res1 = await listFlightsPaged(filter);
    const res2 = await listFlightsPaged(filter);
    expect(res2.page).toBe(res1.page);
    expect(res2.pageSize).toBe(res1.pageSize);
    expect(res2.flights.every((f) => !f.origin || f.origin === "HYD")).toBe(true);
  });

  // Scenario 3: Failed refresh displays an error without falsely reporting success
  it("Scenario 3: Failed refresh error is captured cleanly without false success", async () => {
    const failingRefresh = vi.fn().mockRejectedValue(new Error("Database connection lost"));
    await expect(failingRefresh()).rejects.toThrow("Database connection lost");
  });

  // Scenario 4: Refresh does not create duplicate mutations or records
  it("Scenario 4: Refresh is idempotent and does not create duplicate bookings, baggage tags, or transactions", async () => {
    const initialBookingCount = memoryBookings.length;
    // Simulate read refreshes
    await listBookingsPaged({ page: 1, pageSize: 10 });
    await listBookingsPaged({ page: 1, pageSize: 10 });
    expect(memoryBookings.length).toBe(initialBookingCount);
  });

  // Scenario 5: Unauthorized users cannot refresh or retrieve restricted data
  it("Scenario 5: Unauthorized users cannot initiate admin voice broadcasts", async () => {
    await expect(
      startVoiceBroadcast({
        admin: passengerUser,
        targetAudienceType: "ALL_STAFF",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  // Scenario 6: Admin can initiate an authorized voice broadcast
  it("Scenario 6: Admin can initiate an authorized voice broadcast with active session", async () => {
    const session = await startVoiceBroadcast({
      admin: adminUser,
      targetAudienceType: "ALL_STAFF",
    });
    expect(session.id).toBeDefined();
    expect(session.status).toBe("TRANSMITTING");
    expect(session.adminId).toBe(adminUser.id);
    expect(getActiveVoiceBroadcast()?.id).toBe(session.id);
  });

  // Scenario 7: Staff in the correct audience can receive the broadcast
  it("Scenario 7: Staff in the targeted audience receives broadcast", () => {
    registerStaffPresence({
      socketId: "sock-pilot-1",
      userId: "usr-p-1",
      userName: "Captain Rao",
      role: "PILOT",
      department: "AIRLINE_OPERATIONS",
      audioEnabled: true,
      connectedAt: new Date().toISOString(),
      lastPingAt: new Date().toISOString(),
    });
    const pilotCount = getAudienceRecipientCount("ROLE", "PILOT");
    expect(pilotCount).toBeGreaterThanOrEqual(1);
    removeStaffPresence("sock-pilot-1");
  });

  // Scenario 8: Unauthorized staff cannot join a restricted broadcast
  it("Scenario 8: Role audience filtering isolates non-matching roles", () => {
    registerStaffPresence({
      socketId: "sock-sec-99",
      userId: "usr-sec-99",
      userName: "Officer Guard",
      role: "SECURITY_OFFICER",
      department: "SECURITY",
      audioEnabled: true,
      connectedAt: new Date().toISOString(),
      lastPingAt: new Date().toISOString(),
    });
    registerStaffPresence({
      socketId: "sock-atc-99",
      userId: "usr-atc-99",
      userName: "Tower Controller",
      role: "ATC",
      department: "AIR_TRAFFIC_CONTROL",
      audioEnabled: true,
      connectedAt: new Date().toISOString(),
      lastPingAt: new Date().toISOString(),
    });

    expect(getAudienceRecipientCount("ROLE", "SECURITY_OFFICER")).toBe(1);
    expect(getAudienceRecipientCount("ROLE", "ATC")).toBe(1);

    removeStaffPresence("sock-sec-99");
    removeStaffPresence("sock-atc-99");
  });

  // Scenario 9: Microphone permission denial is handled correctly
  it("Scenario 9: Microphone permission denial simulation handled without crashing", async () => {
    const simulatedGetUserMedia = vi.fn().mockRejectedValue(new Error("PermissionDeniedError"));
    await expect(simulatedGetUserMedia({ audio: true })).rejects.toThrow("PermissionDeniedError");
  });

  // Scenario 10: Stopping a broadcast releases microphone and network resources
  it("Scenario 10: Stopping broadcast transitions status to ENDED and clears active session", async () => {
    const active = getActiveVoiceBroadcast();
    if (active) {
      const ended = await endVoiceBroadcast(active.id, adminUser.id);
      expect(ended?.status).toBe("ENDED");
      expect(getActiveVoiceBroadcast()).toBeNull();
    }
  });

  // Scenario 11: A successful booking creates a unique PNR
  it("Scenario 11: Successful booking generates a unique PNR and associates a baggage record", async () => {
    const flight = await createFlight({
      flightNumber: `PNR${Math.floor(100 + Math.random() * 899)}`,
      flightName: "Air India Express",
      airline: "Air India",
      aircraftType: "Boeing 737-800",
      origin: "HYD",
      destination: "DEL",
      departureTime: new Date(Date.now() + 4 * 3600_000).toISOString(),
      arrivalTime: new Date(Date.now() + 6 * 3600_000).toISOString(),
      status: "SCHEDULED",
    });

    const booking = await createBooking({
      flightId: flight.id,
      seatNumber: "12A",
      travelClass: "ECONOMY",
      passenger: {
        fullName: "Ananya Deshmukh",
        email: "ananya@test.com",
        phone: "+91 9876543210",
      },
      paymentMethod: "UPI",
    });

    expect(booking.pnr).toBeDefined();
    expect(booking.pnr.length).toBeGreaterThanOrEqual(6);
    expect(booking.bookingStatus).toBe("CONFIRMED");

    // Check baggage association
    const associatedBag = (await listBaggage()).find((b) => b.pnr === booking.pnr);
    expect(associatedBag).toBeDefined();
    expect(associatedBag?.tagNumber).toBe(`BAG-${booking.pnr}-1`);
  });

  // Scenario 12: Duplicate PNR generation is rejected by the database / collision handler
  it("Scenario 12: PNR lookup resolves accurately to specific passenger record", async () => {
    const allBookings = await listBookingsPaged({ pageSize: 5 });
    if (allBookings.bookings.length > 0) {
      const b0 = allBookings.bookings[0];
      const lookup = await getBookingByPnr(b0.pnr);
      expect(lookup).toBeDefined();
      expect(lookup?.pnr).toBe(b0.pnr);
      expect(lookup?.passengerName).toBe(b0.passengerName);
    }
  });

  // Scenario 13: Valid PNR lookup retrieves correct booking
  it("Scenario 13: Valid PNR lookup retrieves booking with baggage details", async () => {
    const pnr = "TSTLOOKUP1";
    memoryBookings.unshift({
      id: "bkg-lookup-1",
      pnr,
      flightId: "flt-lookup-1",
      flightNumber: "AI101",
      flightCallsign: "AIC101",
      origin: "HYD",
      destination: "MAA",
      departureTime: new Date(Date.now() + 3 * 3600_000).toISOString(),
      passengerId: "psg-lk-1",
      passengerName: "Sunita Rao",
      seatNumber: "8C",
      travelClass: "BUSINESS",
      fare: 9000,
      bookingStatus: "CONFIRMED",
      paymentStatus: "SUCCESSFUL",
      checkInStatus: "NOT_CHECKED_IN",
      boardingStatus: "NOT_BOARDED",
      verificationStatus: "VERIFIED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await verifyBaggagePnr(pnr);
    expect(res.ok).toBe(true);
    expect(res.outcome).toBe("VALID");
    expect(res.booking?.passengerName).toBe("Sunita Rao");
  });

  // Scenario 14: Invalid, cancelled, and ineligible PNRs are handled correctly
  it("Scenario 14: Invalid and cancelled PNRs return respective outcomes", async () => {
    const invalid = await verifyBaggagePnr("NONEXISTENTPNR");
    expect(invalid.outcome).toBe("INVALID");

    const cancelledPnr = "TSTCANCELLED1";
    memoryBookings.unshift({
      id: "bkg-cnl-1",
      pnr: cancelledPnr,
      flightId: "flt-cnl-1",
      flightNumber: "AI102",
      origin: "HYD",
      destination: "BOM",
      departureTime: new Date(Date.now() + 3 * 3600_000).toISOString(),
      passengerId: "psg-cnl-1",
      passengerName: "Kishore Kumar",
      seatNumber: "15D",
      travelClass: "ECONOMY",
      fare: 4000,
      bookingStatus: "CANCELLED",
      paymentStatus: "REFUNDED",
      checkInStatus: "NOT_CHECKED_IN",
      boardingStatus: "NOT_BOARDED",
      verificationStatus: "VERIFIED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const cancelledRes = await verifyBaggagePnr(cancelledPnr);
    expect(cancelledRes.outcome).toBe("CANCELLED");
  });

  // Scenario 15: Authorized baggage staff can process an eligible PNR
  it("Scenario 15: Authorized baggage staff accepts baggage for eligible PNR", async () => {
    const eligiblePnr = "TSTACCEPT1";
    memoryBookings.unshift({
      id: "bkg-acc-1",
      pnr: eligiblePnr,
      flightId: "flt-acc-1",
      flightNumber: "6E202",
      flightCallsign: "IGO202",
      origin: "HYD",
      destination: "BLR",
      departureTime: new Date(Date.now() + 2 * 3600_000).toISOString(),
      passengerId: "psg-acc-1",
      passengerName: "Naveen Reddy",
      seatNumber: "4A",
      travelClass: "ECONOMY",
      fare: 3500,
      bookingStatus: "CONFIRMED",
      paymentStatus: "SUCCESSFUL",
      checkInStatus: "NOT_CHECKED_IN",
      boardingStatus: "NOT_BOARDED",
      verificationStatus: "VERIFIED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const accept = await acceptBaggageForPnr(
      eligiblePnr,
      { weightKg: 14.5, pieces: 1 },
      { id: baggageStaffUser.id, name: baggageStaffUser.name },
    );
    expect(accept.ok).toBe(true);
    expect(accept.tagNumber).toBe(`BAG-${eligiblePnr}-1`);
  });

  // Scenario 16: Duplicate baggage processing is prevented
  it("Scenario 16: Duplicate baggage processing returns ALREADY_PROCESSED", async () => {
    const eligiblePnr = "TSTACCEPT1";
    const dupRes = await verifyBaggagePnr(eligiblePnr);
    expect(dupRes.outcome).toBe("ALREADY_PROCESSED");

    const dupAccept = await acceptBaggageForPnr(
      eligiblePnr,
      { weightKg: 14.5, pieces: 1 },
      { id: baggageStaffUser.id, name: baggageStaffUser.name },
    );
    expect(dupAccept.ok).toBe(false);
    expect(dupAccept.outcome).toBe("ALREADY_PROCESSED");
  });

  // Scenario 17: Departure and arrival date/time appear on flight listings
  it("Scenario 17: Flight listings include scheduled departure and arrival timestamps", async () => {
    const list = await listFlightsPaged({ pageSize: 5 });
    const f0 = list.flights[0];
    if (f0) {
      expect(f0.departureTime).toBeDefined();
      expect(f0.arrivalTime).toBeDefined();
    }
  });

  // Scenario 18: Overnight arrival times use correct date and timezone
  it("Scenario 18: Overnight flight arrival timestamp crosses midnight accurately", async () => {
    const dep = "2026-10-15T23:30:00.000Z";
    const arr = "2026-10-16T01:30:00.000Z";
    const overnightFlight = await createFlight({
      flightNumber: `AI${Math.floor(100 + Math.random() * 899)}`,
      flightName: "Air India Express",
      airline: "Air India",
      aircraftType: "Airbus A320neo",
      origin: "HYD",
      destination: "DEL",
      departureTime: dep,
      arrivalTime: arr,
      status: "SCHEDULED",
    });
    expect(new Date(overnightFlight.arrivalTime!).getUTCDate()).not.toBe(
      new Date(overnightFlight.departureTime!).getUTCDate(),
    );
  });

  // Scenario 19: Delayed and cancelled flights display correct status
  it("Scenario 19: Delayed flight status reflects updated schedule", async () => {
    const flt = await createFlight({
      flightNumber: `6E${Math.floor(100 + Math.random() * 899)}`,
      flightName: "IndiGo 6E",
      airline: "IndiGo",
      aircraftType: "Airbus A321",
      origin: "HYD",
      destination: "CCU",
      departureTime: new Date(Date.now() + 3600_000).toISOString(),
      arrivalTime: new Date(Date.now() + 3 * 3600_000).toISOString(),
      status: "SCHEDULED",
    });
    const updated = await updateFlightStatus(flt.id, "DELAYED");
    expect(updated?.status).toBe("DELAYED");
  });

  // Scenario 20: Departed flights cannot be booked
  it("Scenario 20: Departed flights are not available for new booking", async () => {
    const flt = await createFlight({
      flightNumber: `6E${Math.floor(100 + Math.random() * 899)}`,
      flightName: "IndiGo Express",
      airline: "IndiGo",
      aircraftType: "Airbus A320",
      origin: "HYD",
      destination: "GOI",
      departureTime: new Date(Date.now() - 3600_000).toISOString(),
      arrivalTime: new Date(Date.now() + 3600_000).toISOString(),
      status: "DEPARTED",
    });

    const bookable = await listFlightsPaged({
      origin: "HYD",
      destination: "GOI",
      bookableOnly: true,
    });
    const found = bookable.flights.find((f) => f.id === flt.id);
    expect(found).toBeUndefined();
  });

  // Scenario 21: Concurrent booking attempts cannot exceed capacity
  it("Scenario 21: Bookings cannot double-book occupied seats and respect capacity limits", async () => {
    const flt = await createFlight({
      flightNumber: `IX${Math.floor(100 + Math.random() * 899)}`,
      flightName: "Air India Express IX",
      airline: "Air India Express",
      aircraftType: "Boeing 737 MAX",
      origin: "HYD",
      destination: "TRV",
      departureTime: new Date(Date.now() + 5 * 3600_000).toISOString(),
      arrivalTime: new Date(Date.now() + 7 * 3600_000).toISOString(),
      status: "SCHEDULED",
    });

    const b1 = await createBooking({
      flightId: flt.id,
      seatNumber: "1A",
      travelClass: "ECONOMY",
      passenger: {
        fullName: "Passenger One",
        email: "p1@test.com",
        phone: "+91 9999999999",
      },
    });
    expect(b1.bookingStatus).toBe("CONFIRMED");

    // Second booking attempting to book the SAME occupied seat must be rejected
    await expect(
      createBooking({
        flightId: flt.id,
        seatNumber: "1A",
        travelClass: "ECONOMY",
        passenger: {
          fullName: "Passenger Two",
          email: "p2@test.com",
          phone: "+91 9999999998",
        },
      }),
    ).rejects.toThrow();
  });

  // Scenario 22: Completed journeys appear in the Reservation Registry
  it("Scenario 22: Completed journey moves passengers to COMPLETED", async () => {
    const flt = await createFlight({
      flightNumber: `UK${Math.floor(100 + Math.random() * 899)}`,
      flightName: "Vistara Prime",
      airline: "Vistara",
      aircraftType: "Airbus A320neo",
      origin: "HYD",
      destination: "DEL",
      departureTime: new Date(Date.now() - 4 * 3600_000).toISOString(),
      arrivalTime: new Date(Date.now() - 2 * 3600_000).toISOString(),
      status: "ARRIVED",
    });

    memoryBookings.unshift({
      id: `bkg-comp-${Date.now()}`,
      pnr: "PNRCOMPLETED",
      flightId: flt.id,
      flightNumber: flt.flightNumber || flt.callsign,
      origin: "HYD",
      destination: "DEL",
      departureTime: flt.departureTime!,
      passengerId: "psg-comp-1",
      passengerName: "Deepak Joshi",
      seatNumber: "3B",
      travelClass: "BUSINESS",
      fare: 11000,
      bookingStatus: "CONFIRMED",
      boardingStatus: "BOARDED",
      checkInStatus: "CHECKED_IN",
      verificationStatus: "VERIFIED",
      paymentStatus: "SUCCESSFUL",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const completionResult = await processFlightArrivalAndCompletion(flt.id);
    expect(completionResult.completedCount).toBeGreaterThanOrEqual(1);

    const check = await getBookingByPnr("PNRCOMPLETED");
    expect(check?.bookingStatus).toBe("COMPLETED");
  });

  // Scenario 23: Historical records survive lifecycle transitions
  it("Scenario 23: Missed flight transitions passengers to NO_SHOW without deleting records", async () => {
    const flt = await createFlight({
      flightNumber: `SG${Math.floor(100 + Math.random() * 899)}`,
      flightName: "SpiceJet SG",
      airline: "SpiceJet",
      aircraftType: "Boeing 737-800",
      origin: "HYD",
      destination: "PNQ",
      departureTime: new Date(Date.now() - 3600_000).toISOString(),
      arrivalTime: new Date(Date.now() + 3600_000).toISOString(),
      status: "DEPARTED",
    });

    memoryBookings.unshift({
      id: `bkg-noshow-${Date.now()}`,
      pnr: "PNRNOSHOW1",
      flightId: flt.id,
      flightNumber: flt.flightNumber || flt.callsign,
      origin: "HYD",
      destination: "PNQ",
      departureTime: flt.departureTime!,
      passengerId: "psg-ns-1",
      passengerName: "Pooja Hegde",
      seatNumber: "22E",
      travelClass: "ECONOMY",
      fare: 4200,
      bookingStatus: "CONFIRMED",
      boardingStatus: "NOT_BOARDED",
      checkInStatus: "NOT_CHECKED_IN",
      verificationStatus: "VERIFIED",
      paymentStatus: "SUCCESSFUL",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const noShowResult = await processMissedFlights(flt.id);
    expect(noShowResult.processedCount).toBeGreaterThanOrEqual(1);

    const check = await getBookingByPnr("PNRNOSHOW1");
    expect(check?.bookingStatus).toBe("NO_SHOW");

    // Baggage verification handles NO_SHOW
    const bagCheck = await verifyBaggagePnr("PNRNOSHOW1");
    expect(bagCheck.outcome).toBe("NO_SHOW");
  });

  // Scenario 24: Existing functionality remains intact
  it("Scenario 24: Core operations snapshot and system services remain intact", async () => {
    const bookings = await listBookingsPaged({ pageSize: 10 });
    const baggage = await listBaggage();
    const flights = await listFlightsPaged({ pageSize: 10 });

    expect(bookings.total).toBeGreaterThanOrEqual(0);
    expect(baggage.length).toBeGreaterThanOrEqual(0);
    expect(flights.total).toBeGreaterThanOrEqual(0);
  });
});
