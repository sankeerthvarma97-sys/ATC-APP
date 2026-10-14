import { describe, expect, it } from "vitest";
import { createBooking } from "@/lib/services/booking-service";
import { boardPassenger, checkInPassenger, getBoardingManifest } from "@/lib/services/checkin-service";

describe("check-in and gate manifest workflow", () => {
  it("shows checked-in booking details and rejects duplicate boarding", async () => {
    const booking = await createBooking({
      flightId: "flt-sc101",
      seatNumber: "25A",
      travelClass: "ECONOMY",
      passenger: {
        fullName: "Manifest Workflow Passenger",
        email: "manifest.workflow@test.aocc",
        phone: "+91 90000 00025",
      },
    });

    const checkIn = await checkInPassenger({ pnr: booking.pnr });
    expect(checkIn.ok).toBe(true);
    expect(checkIn.boardingPass?.passNumber).toBeDefined();

    const manifest = await getBoardingManifest(booking.flightId);
    const manifestPassenger = manifest.find((passenger) => passenger.pnr === booking.pnr);
    expect(manifestPassenger).toMatchObject({
      name: "Manifest Workflow Passenger",
      ticketNumber: booking.ticketNumber,
      flightNumber: "SC101",
      origin: "HYD",
      destination: "BOM",
      seat: "25A",
      checkedIn: true,
      boarded: false,
    });

    await expect(boardPassenger({
      pnr: booking.pnr,
      flightId: "flt-av202",
      gate: "C2",
    })).resolves.toMatchObject({ ok: false, message: expect.stringContaining("selected flight") });
    await expect(boardPassenger({
      pnr: booking.pnr,
      flightId: booking.flightId,
      gate: "A1",
    })).resolves.toMatchObject({ ok: false, message: expect.stringContaining("different gate") });

    const attempts = await Promise.all([
      boardPassenger({ pnr: booking.pnr, flightId: booking.flightId, gate: "B12" }),
      boardPassenger({ pnr: booking.pnr, flightId: booking.flightId, gate: "B12" }),
    ]);
    expect(attempts.filter((attempt) => attempt.ok)).toHaveLength(1);

    const refreshedManifest = await getBoardingManifest(booking.flightId);
    expect(refreshedManifest.find((passenger) => passenger.pnr === booking.pnr)?.boarded).toBe(true);
  });
});