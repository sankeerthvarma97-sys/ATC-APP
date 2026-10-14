import { describe, expect, it } from "vitest";
import { createBooking } from "@/lib/services/booking-service";
import { getFlightById } from "@/lib/services/flight-service";

describe("Booking Transaction & Concurrency Safety", () => {
  it("strictly prevents double-booking when two users book the same seat concurrently", async () => {
    const flightData = await getFlightById("flt-sc101");
    expect(flightData).toBeDefined();

    // Pick a seat that is currently available in the seat map
    const availableSeat = flightData?.seats.find((s) => s.status === "AVAILABLE")?.seatNumber || "21A";

    const userA = {
      flightId: "flt-sc101",
      seatNumber: availableSeat,
      travelClass: "ECONOMY" as const,
      passenger: {
        fullName: "Concurrent Passenger Alpha",
        email: "passenger.alpha@sim.test",
        phone: "+91 98111 00001",
      },
    };

    const userB = {
      flightId: "flt-sc101",
      seatNumber: availableSeat,
      travelClass: "ECONOMY" as const,
      passenger: {
        fullName: "Concurrent Passenger Bravo",
        email: "passenger.bravo@sim.test",
        phone: "+91 98222 00002",
      },
    };

    // Execute both booking attempts concurrently
    const [resultA, resultB] = await Promise.allSettled([
      createBooking(userA),
      createBooking(userB),
    ]);

    const successes = [resultA, resultB].filter((r) => r.status === "fulfilled");
    const rejections = [resultA, resultB].filter((r) => r.status === "rejected");

    // Exactly ONE must succeed, and exactly ONE must be rejected
    expect(successes.length).toBe(1);
    expect(rejections.length).toBe(1);

    // The successful booking must have a valid PNR and ticket
    const successfulBooking = (
      successes[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof createBooking>>>
    ).value;
    expect(successfulBooking.pnr).toBeDefined();
    expect(successfulBooking.seatNumber).toBe(availableSeat);
    expect(successfulBooking.ticketNumber).toBeDefined();

    // The rejected booking must fail with clear seat unavailable error
    const rejectedError = (rejections[0] as PromiseRejectedResult).reason;
    expect(rejectedError.message).toContain("no longer available");
  });

  it("subsequent attempt on an already occupied seat is immediately rejected", async () => {
    const flightData = await getFlightById("flt-sc101");
    const occupiedSeat = flightData?.seats.find((s) => s.status === "OCCUPIED")?.seatNumber || "14A";

    await expect(
      createBooking({
        flightId: "flt-sc101",
        seatNumber: occupiedSeat,
        travelClass: "ECONOMY",
        passenger: {
          fullName: "Late Passenger",
          email: "late@sim.test",
          phone: "+91 99999 99999",
        },
      })
    ).rejects.toThrow(/no longer available/i);
  });

  it("handles cancellation and re-releases seat for booking", async () => {
    const { cancelBooking, getBookingByPNR } = await import("@/lib/services/booking-service");
    const cancelled = await cancelBooking("SC7K92P", { id: "usr-admin", name: "Admin" });
    expect(cancelled).toBeDefined();
    expect(cancelled?.bookingStatus).toBe("CANCELLED");

    const fetched = await getBookingByPNR("SC7K92P");
    expect(fetched?.bookingStatus).toBe("CANCELLED");
  });
});
