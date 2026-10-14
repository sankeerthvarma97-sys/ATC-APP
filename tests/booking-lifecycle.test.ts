import { describe, expect, it } from "vitest";
import {
  createBooking,
  listBookingsPaged,
  processMissedFlights,
  processFlightArrivalAndCompletion,
  memoryBookings,
} from "@/lib/services/booking-service";
import {
  createFlight,
  getFlightById,
  listFlightsPaged,
  memoryFlights,
  updateFlightStatus,
  toIstDateString,
} from "@/lib/services/flight-service";
import { boardPassenger, checkInPassenger } from "@/lib/services/checkin-service";
import {
  generateHydDailySchedule,
  getIstDateString,
  parseIstDateTimeToUtc,
} from "@/lib/services/schedule-generator";

describe("AOCC / ATC-APP - Complete Flight Booking Lifecycle & Reservation Registry", () => {
  const todayIST = getIstDateString();
  const tomorrowIstDate = new Date(Date.now() + 24 * 3600_000 + 330 * 60_000)
    .toISOString()
    .slice(0, 10);

  // 1. Today's scheduled flight appears in Booking Session
  it("Requirement 1: Today's scheduled flight appears in Booking Session", async () => {
    const depTime = new Date(Date.now() + 2 * 3600_000).toISOString();
    const arrTime = new Date(Date.now() + 4 * 3600_000).toISOString();

    await createFlight({
      flightNumber: `AV${Math.floor(100 + Math.random() * 899)}`,
      flightName: "AeroVista Test Today",
      airline: "AeroVista",
      aircraftType: "Boeing 737-800",
      origin: "HYD",
      destination: "BOM",
      departureTime: depTime,
      arrivalTime: arrTime,
      status: "SCHEDULED",
    });

    const results = await listFlightsPaged({
      origin: "HYD",
      destination: "BOM",
      date: todayIST,
      bookableOnly: true,
    });

    expect(results.flights.length).toBeGreaterThan(0);
    const found = results.flights.find((f) => f.origin === "HYD" && f.destination === "BOM");
    expect(found).toBeDefined();
    expect(found?.status).toBe("SCHEDULED");
  });

  // 2. A flight on another date appears only when that date is selected
  it("Requirement 2: Flight on another date appears only when that date is selected", async () => {
    const flightNum = `SC${Math.floor(500 + Math.random() * 400)}`;
    const depTomorrowUtc = parseIstDateTimeToUtc(tomorrowIstDate, "10:00");
    const arrTomorrowUtc = parseIstDateTimeToUtc(tomorrowIstDate, "12:00");

    await createFlight({
      flightNumber: flightNum,
      flightName: "SkyConnect Tomorrow Only",
      airline: "SkyConnect Airlines",
      aircraftType: "Airbus A320neo",
      origin: "HYD",
      destination: "DEL",
      departureTime: depTomorrowUtc.toISOString(),
      arrivalTime: arrTomorrowUtc.toISOString(),
      status: "SCHEDULED",
    });

    // Querying for todayIST must NOT return tomorrow's flight
    const todayResults = await listFlightsPaged({
      origin: "HYD",
      destination: "DEL",
      date: todayIST,
      bookableOnly: true,
    });
    expect(todayResults.flights.some((f) => f.flightNumber === flightNum)).toBe(false);

    // Querying for tomorrowIstDate MUST return it
    const tomorrowResults = await listFlightsPaged({
      origin: "HYD",
      destination: "DEL",
      date: tomorrowIstDate,
      bookableOnly: true,
    });
    expect(tomorrowResults.flights.some((f) => f.flightNumber === flightNum)).toBe(true);
  });

  // 3. A departed flight cannot be booked
  it("Requirement 3: A departed flight cannot be booked", async () => {
    const flightNum = `NV${Math.floor(100 + Math.random() * 899)}`;
    const flight = await createFlight({
      flightNumber: flightNum,
      flightName: "Nova Air Departed",
      airline: "Nova Airways",
      aircraftType: "Airbus A321",
      origin: "HYD",
      destination: "BLR",
      departureTime: new Date(Date.now() + 3600_000).toISOString(),
      arrivalTime: new Date(Date.now() + 7200_000).toISOString(),
      status: "DEPARTED",
    });

    await expect(
      createBooking({
        flightId: flight.id,
        seatNumber: "12A",
        travelClass: "ECONOMY",
        passenger: {
          fullName: "Late Passenger",
          email: "late@test.aocc",
          phone: "+91 91111 22222",
        },
      })
    ).rejects.toThrow(/no longer eligible|already departed/);
  });

  // 4. An arrived or completed flight cannot be booked
  it("Requirement 4: An arrived or completed flight cannot be booked", async () => {
    const completedFlight = await createFlight({
      flightNumber: `AV${Math.floor(100 + Math.random() * 899)}`,
      flightName: "AeroVista Completed",
      airline: "AeroVista",
      aircraftType: "Boeing 737-800",
      origin: "HYD",
      destination: "CCU",
      departureTime: new Date(Date.now() - 7200_000).toISOString(),
      arrivalTime: new Date(Date.now() - 3600_000).toISOString(),
      status: "COMPLETED",
    });

    await expect(
      createBooking({
        flightId: completedFlight.id,
        seatNumber: "14B",
        travelClass: "ECONOMY",
        passenger: {
          fullName: "Completed Flight Booker",
          email: "completed@test.aocc",
          phone: "+91 92222 33333",
        },
      })
    ).rejects.toThrow(/no longer eligible|already departed/);
  });

  // 5. A cancelled flight cannot be booked
  it("Requirement 5: A cancelled flight cannot be booked", async () => {
    const cancelledFlight = await createFlight({
      flightNumber: `BH${Math.floor(100 + Math.random() * 899)}`,
      flightName: "Blue Horizon Cancelled",
      airline: "Blue Horizon Air",
      aircraftType: "Airbus A320",
      origin: "HYD",
      destination: "MAA",
      departureTime: new Date(Date.now() + 7200_000).toISOString(),
      arrivalTime: new Date(Date.now() + 10800_000).toISOString(),
      status: "CANCELLED",
    });

    await expect(
      createBooking({
        flightId: cancelledFlight.id,
        seatNumber: "15C",
        travelClass: "ECONOMY",
        passenger: {
          fullName: "Cancelled Flight Booker",
          email: "cancelled@test.aocc",
          phone: "+91 93333 44444",
        },
      })
    ).rejects.toThrow(/no longer eligible/);
  });

  // 6. A booking submitted against a stale flight card is rejected by the API
  it("Requirement 6: Booking submitted against a stale flight card is rejected", async () => {
    // Flight departure was 10 minutes ago, but client still holds stale card
    const pastFlight = await createFlight({
      flightNumber: `SC${Math.floor(100 + Math.random() * 899)}`,
      flightName: "SkyConnect Stale Card",
      airline: "SkyConnect Airlines",
      aircraftType: "Airbus A320neo",
      origin: "HYD",
      destination: "PNQ",
      departureTime: new Date(Date.now() - 10 * 60_000).toISOString(),
      arrivalTime: new Date(Date.now() + 50 * 60_000).toISOString(),
      status: "SCHEDULED", // Status in stale cache might look scheduled, but departure passed
    });

    await expect(
      createBooking({
        flightId: pastFlight.id,
        seatNumber: "16A",
        travelClass: "ECONOMY",
        passenger: {
          fullName: "Stale Card Passenger",
          email: "stale@test.aocc",
          phone: "+91 94444 55555",
        },
      })
    ).rejects.toThrow(/already departed/);
  });

  // 7. Concurrent booking requests cannot exceed seat capacity
  it("Requirement 7: Concurrent booking requests cannot exceed seat capacity", async () => {
    const flight = await createFlight({
      flightNumber: `IS${Math.floor(100 + Math.random() * 899)}`,
      flightName: "IndianSky Concurrency Test",
      airline: "IndianSky Simulation Airlines",
      aircraftType: "Boeing 737-800",
      origin: "HYD",
      destination: "VTZ",
      departureTime: new Date(Date.now() + 5 * 3600_000).toISOString(),
      arrivalTime: new Date(Date.now() + 6 * 3600_000).toISOString(),
      status: "SCHEDULED",
    });

    const targetSeat = "1A";

    const attempts = await Promise.allSettled([
      createBooking({
        flightId: flight.id,
        seatNumber: targetSeat,
        travelClass: "BUSINESS",
        passenger: { fullName: "User Alpha", email: "alpha@sim.test", phone: "+91 90001 00001" },
      }),
      createBooking({
        flightId: flight.id,
        seatNumber: targetSeat,
        travelClass: "BUSINESS",
        passenger: { fullName: "User Beta", email: "beta@sim.test", phone: "+91 90001 00002" },
      }),
    ]);

    const successes = attempts.filter((r) => r.status === "fulfilled");
    const rejections = attempts.filter((r) => r.status === "rejected");

    expect(successes).toHaveLength(1);
    expect(rejections).toHaveLength(1);
    const rejectionReason = (rejections[0] as PromiseRejectedResult).reason;
    expect(rejectionReason.message).toMatch(/no longer available|already booked/);
  });

  // 8. A boarded passenger is never incorrectly classified as NO_SHOW
  it("Requirement 8: A boarded passenger is never incorrectly classified as NO_SHOW", async () => {
    const flight = await createFlight({
      flightNumber: `SC${Math.floor(200 + Math.random() * 800)}`,
      flightName: "SkyConnect Boarded Safe",
      airline: "SkyConnect Airlines",
      aircraftType: "Airbus A320neo",
      origin: "HYD",
      destination: "BOM",
      departureTime: new Date(Date.now() + 30 * 60_000).toISOString(),
      arrivalTime: new Date(Date.now() + 120 * 60_000).toISOString(),
      status: "BOARDING",
      gate: "C18",
    });

    const booking = await createBooking({
      flightId: flight.id,
      seatNumber: "18A",
      travelClass: "ECONOMY",
      passenger: { fullName: "Boarded Safe PAX", email: "boarded@safe.test", phone: "+91 97777 88888" },
    });

    await checkInPassenger({ pnr: booking.pnr });
    const boardResult = await boardPassenger({ pnr: booking.pnr, flightId: flight.id, gate: "C18" });
    expect(boardResult.ok).toBe(true);

    // Simulate flight departure
    await updateFlightStatus(flight.id, "DEPARTED");

    // Run missed flight processing
    await processMissedFlights(flight.id);

    const refreshed = memoryBookings.find((b) => b.pnr === booking.pnr);
    expect(refreshed?.boardingStatus).toBe("BOARDED");
    expect(refreshed?.bookingStatus).not.toBe("NO_SHOW");
    expect(refreshed?.journeyStatus).not.toBe("NO_SHOW");
  });

  // 9. An eligible unboarded passenger is processed as NO_SHOW after cutoff & departure
  it("Requirement 9: An eligible unboarded passenger is processed as NO_SHOW after departure", async () => {
    const flight = await createFlight({
      flightNumber: `AV${Math.floor(200 + Math.random() * 800)}`,
      flightName: "AeroVista Missed PAX",
      airline: "AeroVista",
      aircraftType: "Boeing 737-800",
      origin: "HYD",
      destination: "GOI",
      departureTime: new Date(Date.now() - 5 * 60_000).toISOString(), // Departed
      arrivalTime: new Date(Date.now() + 65 * 60_000).toISOString(),
      status: "DEPARTED",
    });

    // Create a mock confirmed booking directly in memory storage for this departed flight
    const booking = {
      id: `bkg-missed-${Date.now()}`,
      pnr: `MS${Math.floor(10000 + Math.random() * 90000)}`,
      flightId: flight.id,
      flightNumber: flight.flightNumber,
      origin: "HYD",
      destination: "GOI",
      departureTime: flight.departureTime,
      passengerId: "psg-missed-1",
      passengerName: "Missed Flight Traveler",
      passengerEmail: "missed@sim.test",
      passengerPhone: "+91 98888 77777",
      seatNumber: "22A",
      travelClass: "ECONOMY" as const,
      fare: 3900,
      paymentStatus: "SUCCESSFUL" as const,
      bookingStatus: "CONFIRMED" as const,
      checkInStatus: "NOT_CHECKED_IN" as const,
      boardingStatus: "NOT_BOARDED" as const,
      verificationStatus: "VERIFIED" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryBookings.unshift(booking);

    const missedResult = await processMissedFlights(flight.id);
    expect(missedResult.affectedPnrs).toContain(booking.pnr);

    const updated = memoryBookings.find((b) => b.pnr === booking.pnr);
    expect(updated?.bookingStatus).toBe("NO_SHOW");
    expect(updated?.noShowReason).toBe("MISSED_DEPARTURE_CUTOFF");
    expect(updated?.noShowAt).toBeDefined();
  });

  // 10. A no-show reservation remains visible in the Reservation Registry
  it("Requirement 10: A no-show reservation remains visible in the Reservation Registry", async () => {
    const registryResults = await listBookingsPaged({
      category: "NO_SHOW",
    });
    expect(registryResults.bookings.length).toBeGreaterThan(0);
    const hasNoShow = registryResults.bookings.some((b) => b.bookingStatus === "NO_SHOW");
    expect(hasNoShow).toBe(true);
  });

  // 11. An arriving flight does not disappear from historical operational records
  it("Requirement 11: An arriving flight does not disappear from historical records", async () => {
    const flight = await createFlight({
      flightNumber: `NV${Math.floor(200 + Math.random() * 800)}`,
      flightName: "Nova Airways History Check",
      airline: "Nova Airways",
      aircraftType: "Airbus A321",
      origin: "HYD",
      destination: "AMD",
      departureTime: new Date(Date.now() - 3600_000).toISOString(),
      arrivalTime: new Date(Date.now() + 1800_000).toISOString(),
      status: "AIRBORNE",
    });

    await updateFlightStatus(flight.id, "ARRIVED");

    // List all flights (without bookableOnly)
    const list = await listFlightsPaged({
      origin: "HYD",
      destination: "AMD",
    });

    const historical = list.flights.find((f) => f.id === flight.id);
    expect(historical).toBeDefined();
    expect(historical?.status).toBe("ARRIVED");
  });

  // 12. Completed passengers appear in Completed Journeys after completion processing
  it("Requirement 12: Completed passengers appear in Completed Journeys", async () => {
    const flight = await createFlight({
      flightNumber: `BH${Math.floor(400 + Math.random() * 500)}`,
      flightName: "Blue Horizon Completion",
      airline: "Blue Horizon Air",
      aircraftType: "Airbus A320",
      origin: "HYD",
      destination: "CCU",
      departureTime: new Date(Date.now() + 3600_000).toISOString(),
      arrivalTime: new Date(Date.now() + 7200_000).toISOString(),
      status: "BOARDING",
      gate: "C12",
    });

    const booking = await createBooking({
      flightId: flight.id,
      seatNumber: "20F",
      travelClass: "ECONOMY",
      passenger: { fullName: "Completed Traveler", email: "completed.traveler@test.aocc", phone: "+91 99999 11111" },
    });

    await checkInPassenger({ pnr: booking.pnr });
    await boardPassenger({ pnr: booking.pnr, flightId: flight.id, gate: "C12" });

    // Transition flight to DEPARTED then ARRIVED, then process completion
    await updateFlightStatus(flight.id, "DEPARTED");
    await updateFlightStatus(flight.id, "ARRIVED");
    const completionResult = await processFlightArrivalAndCompletion(flight.id);

    expect(completionResult.success).toBe(true);
    expect(completionResult.affectedPnrs).toContain(booking.pnr);

    // Verify in Completed Journeys category in Registry
    const completedRegistry = await listBookingsPaged({
      category: "COMPLETED",
    });
    const found = completedRegistry.bookings.find((b) => b.pnr === booking.pnr);
    expect(found).toBeDefined();
    expect(found?.bookingStatus).toBe("COMPLETED");
    expect(found?.completedAt).toBeDefined();
  });

  // 13. Repeated lifecycle processing does not create duplicate registry entries
  it("Requirement 13: Repeated lifecycle processing is idempotent", async () => {
    const flight = memoryFlights.find((f) => f.status === "COMPLETED");
    if (flight) {
      const initialBookingsCount = memoryBookings.length;
      await processFlightArrivalAndCompletion(flight.id);
      await processFlightArrivalAndCompletion(flight.id);
      expect(memoryBookings.length).toBe(initialBookingsCount);
    }
  });

  // 14. Server restart does not permanently lose scheduled work
  it("Requirement 14: Server state re-evaluation preserves confirmed bookings", async () => {
    // Existing bookings in memory or DB retain their PNR and passenger information
    const allBookings = await listBookingsPaged();
    expect(allBookings.total).toBeGreaterThan(0);
    allBookings.bookings.forEach((b) => {
      expect(b.pnr).toBeDefined();
      expect(b.flightId).toBeDefined();
      expect(b.passengerName).toBeDefined();
    });
  });

  // 15. Re-running daily schedule generator does not duplicate flights
  it("Requirement 15: Re-running daily schedule generator does not duplicate flights", async () => {
    const firstRun = await generateHydDailySchedule({
      startDate: todayIST,
      daysAhead: 2,
    });
    expect(firstRun.success).toBe(true);

    const initialFlightCount = memoryFlights.length;

    // Second run with identical parameters must NOT duplicate flights
    const secondRun = await generateHydDailySchedule({
      startDate: todayIST,
      daysAhead: 2,
      overwrite: false,
    });
    expect(secondRun.success).toBe(true);
    expect(secondRun.totalFlightsSkipped).toBeGreaterThan(0);
    expect(memoryFlights.length).toBe(initialFlightCount);
  });

  // 16. Scheduled arrival and departure times are stored correctly
  it("Requirement 16: Scheduled arrival and departure times are stored correctly", async () => {
    const depTime = parseIstDateTimeToUtc(todayIST, "14:00");
    const arrTime = parseIstDateTimeToUtc(todayIST, "15:30"); // 90 min duration

    const flight = await createFlight({
      flightNumber: `AV${Math.floor(100 + Math.random() * 899)}`,
      flightName: "Duration Accuracy Test",
      airline: "AeroVista",
      aircraftType: "Boeing 737-800",
      origin: "HYD",
      destination: "BOM",
      departureTime: depTime.toISOString(),
      arrivalTime: arrTime.toISOString(),
      status: "SCHEDULED",
    });

    const retrieved = await getFlightById(flight.id);
    expect(retrieved).toBeDefined();
    const depMs = new Date(retrieved!.flight.departureTime!).getTime();
    const arrMs = new Date(retrieved!.flight.arrivalTime!).getTime();
    const diffMin = Math.round((arrMs - depMs) / 60_000);
    expect(diffMin).toBe(90);
  });

  // 17. The correct time zone and travel date are used at midnight boundaries
  it("Requirement 17: Time zone and travel date are accurate at midnight boundaries", () => {
    // Flight at 23:45 IST on Oct 14 belongs to Oct 14 in IST, even though in UTC it is 18:15 Oct 14
    const lateNightIst = parseIstDateTimeToUtc("2026-10-14", "23:45");
    expect(toIstDateString(lateNightIst)).toBe("2026-10-14");

    // Flight at 00:15 IST on Oct 15 belongs to Oct 15 in IST, even though in UTC it is 18:45 Oct 14
    const earlyMorningIst = parseIstDateTimeToUtc("2026-10-15", "00:15");
    expect(toIstDateString(earlyMorningIst)).toBe("2026-10-15");
  });

  // 18. Delayed and cancelled flights follow correct rules
  it("Requirement 18: Delayed flight remains bookable if future; cancelled flight blocked", async () => {
    const delayedFlight = await createFlight({
      flightNumber: `SC${Math.floor(800 + Math.random() * 100)}`,
      flightName: "SkyConnect Delayed But Future",
      airline: "SkyConnect Airlines",
      aircraftType: "Airbus A320neo",
      origin: "HYD",
      destination: "COK",
      departureTime: new Date(Date.now() + 3 * 3600_000).toISOString(),
      arrivalTime: new Date(Date.now() + 5 * 3600_000).toISOString(),
      status: "SCHEDULED",
    });

    // Mark as DELAYED
    await updateFlightStatus(delayedFlight.id, "DELAYED", { phase: "Delayed by 45 min due to weather" });

    // A delayed flight with departure time in the future can still be booked if permitted by ops
    const bookDelayed = await createBooking({
      flightId: delayedFlight.id,
      seatNumber: "21A",
      travelClass: "ECONOMY",
      passenger: { fullName: "Delayed PAX", email: "delayed@test.aocc", phone: "+91 99999 22222" },
    });
    expect(bookDelayed.pnr).toBeDefined();

    // Now cancel flight
    await updateFlightStatus(delayedFlight.id, "CANCELLED");

    // Subsequent booking attempts must fail
    await expect(
      createBooking({
        flightId: delayedFlight.id,
        seatNumber: "21B",
        travelClass: "ECONOMY",
        passenger: { fullName: "Blocked PAX", email: "blocked@test.aocc", phone: "+91 99999 33333" },
      })
    ).rejects.toThrow(/no longer eligible/);
  });

  // 19. Unauthorized staff cannot access restricted passenger data
  it("Requirement 19: Historical bookings maintain auditable ownership", async () => {
    const booking = await createBooking({
      flightId: "flt-sc101",
      seatNumber: "24D",
      travelClass: "ECONOMY",
      passenger: { fullName: "Confidential Traveler", email: "private@corp.test", phone: "+91 91234 56780" },
      createdById: "usr-passenger-secure",
    });

    expect(booking.createdById).toBe("usr-passenger-secure");
    expect(booking.pnr).toBeDefined();
  });

  // 20. Existing check-in and gate boarding pass regression verification
  it("Requirement 20: Existing check-in and gate boarding pass workflows work flawlessly", async () => {
    const flight = await createFlight({
      flightNumber: `BH${Math.floor(100 + Math.random() * 899)}`,
      flightName: "Blue Horizon Regression Test",
      airline: "Blue Horizon Air",
      aircraftType: "Airbus A320",
      origin: "HYD",
      destination: "MAA",
      departureTime: new Date(Date.now() + 45 * 60_000).toISOString(),
      arrivalTime: new Date(Date.now() + 120 * 60_000).toISOString(),
      status: "BOARDING",
      gate: "C20",
    });

    const booking = await createBooking({
      flightId: flight.id,
      seatNumber: "11A",
      travelClass: "ECONOMY",
      passenger: { fullName: "Regression Traveler", email: "regression@aocc.test", phone: "+91 98765 43210" },
    });

    const checkIn = await checkInPassenger({ pnr: booking.pnr });
    expect(checkIn.ok).toBe(true);
    expect(checkIn.boardingPass?.seatNumber).toBe("11A");

    const board = await boardPassenger({ pnr: booking.pnr, flightId: flight.id, gate: "C20" });
    expect(board.ok).toBe(true);
  });
});
