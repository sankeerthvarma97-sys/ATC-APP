import type {
  BoardingPassDTO,
  BookingDTO,
  CheckInDTO,
  TicketVerificationResult,
} from "@/lib/domain";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { logAuditEvent } from "./audit-service";
import { getBookingByPNR, memoryBookings } from "./booking-service";
import { getFlightById, updateFlightStatus } from "./flight-service";

export interface VerifyTicketResult {
  status: TicketVerificationResult;
  isValid: boolean;
  message: string;
  booking?: BookingDTO;
  verifiedAt: string;
}

// In-memory Boarding Passes storage
export const memoryBoardingPasses: Map<string, BoardingPassDTO> = new Map();

export async function verifyTicket(
  input: { pnr?: string; qrCode?: string },
  actor?: { id?: string; name?: string },
): Promise<VerifyTicketResult> {
  let searchPnr = input.pnr?.trim().toUpperCase();

  if (!searchPnr && input.qrCode) {
    const match = input.qrCode.match(/PNR:([A-Z0-9]+)/i);
    if (match) {
      searchPnr = match[1].toUpperCase();
    }
  }

  const verifiedAt = new Date().toISOString();

  if (!searchPnr) {
    await logAuditEvent({
      actorId: actor?.id,
      actorName: actor?.name,
      action: "TICKET_VERIFIED",
      entity: "TICKET",
      after: { result: "INVALID", reason: "Missing PNR or QR payload" },
    });

    return {
      status: "INVALID",
      isValid: false,
      message: "Invalid ticket: no PNR or QR code provided.",
      verifiedAt,
    };
  }

  const booking = await getBookingByPNR(searchPnr);

  if (!booking) {
    await logAuditEvent({
      actorId: actor?.id,
      actorName: actor?.name,
      action: "TICKET_VERIFIED",
      entity: "TICKET",
      entityId: searchPnr,
      after: { result: "INVALID", reason: "Booking not found" },
    });

    return {
      status: "INVALID",
      isValid: false,
      message: `No booking found for PNR ${searchPnr}.`,
      verifiedAt,
    };
  }

  if (booking.bookingStatus === "CANCELLED") {
    await logAuditEvent({
      actorId: actor?.id,
      actorName: actor?.name,
      action: "TICKET_VERIFIED",
      entity: "TICKET",
      entityId: booking.pnr,
      after: { result: "CANCELLED" },
    });

    return {
      status: "CANCELLED",
      isValid: false,
      message: "This booking has been cancelled.",
      booking,
      verifiedAt,
    };
  }

  if (booking.paymentStatus !== "SUCCESSFUL") {
    await logAuditEvent({
      actorId: actor?.id,
      actorName: actor?.name,
      action: "TICKET_VERIFIED",
      entity: "TICKET",
      entityId: booking.pnr,
      after: { result: "PAYMENT_FAILED" },
    });

    return {
      status: "PAYMENT_FAILED",
      isValid: false,
      message: "Payment for this booking failed or is pending.",
      booking,
      verifiedAt,
    };
  }

  if (booking.boardingStatus === "BOARDED") {
    await logAuditEvent({
      actorId: actor?.id,
      actorName: actor?.name,
      action: "TICKET_VERIFIED",
      entity: "TICKET",
      entityId: booking.pnr,
      after: { result: "ALREADY_USED" },
    });

    return {
      status: "ALREADY_USED",
      isValid: false,
      message: "This ticket has already been used and boarded.",
      booking,
      verifiedAt,
    };
  }

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "TICKET_VERIFIED",
    entity: "TICKET",
    entityId: booking.pnr,
    after: { result: "VALID", flightNumber: booking.flightNumber, seat: booking.seatNumber },
  });

  return {
    status: "VALID",
    isValid: true,
    message: "Ticket is valid for travel.",
    booking,
    verifiedAt,
  };
}

export async function checkInPassenger(input: {
  pnr: string;
  baggageCount?: number;
  baggageWeightKg?: number;
  actor?: { id?: string; name?: string };
}): Promise<{ ok: boolean; checkIn?: CheckInDTO; boardingPass?: BoardingPassDTO; message: string }> {
  const booking = await getBookingByPNR(input.pnr);

  if (!booking) {
    return { ok: false, message: `Booking for PNR ${input.pnr} not found.` };
  }

  if (booking.bookingStatus === "CANCELLED") {
    return { ok: false, message: "Cannot check in a cancelled booking." };
  }

  if (booking.checkInStatus === "CHECKED_IN") {
    // Return existing boarding pass
    const existingPass = memoryBoardingPasses.get(booking.pnr);
    return {
      ok: true,
      boardingPass: existingPass,
      message: "Passenger already checked in. Retrieved boarding pass.",
    };
  }

  booking.checkInStatus = "CHECKED_IN";
  booking.updatedAt = new Date().toISOString();

  const passNumber = `BP-${booking.pnr}-${booking.seatNumber}`;
  const boardingTime = new Date(Date.now() + 25 * 60_000).toISOString();
  const boardingPass: BoardingPassDTO = {
    id: `bp-${Date.now()}`,
    bookingId: booking.id,
    passNumber,
    pnr: booking.pnr,
    passengerName: booking.passengerName || "Simulation Passenger",
    airline: booking.airline || "SkyConnect",
    flightNumber: booking.flightNumber || booking.flightCallsign || "SC101",
    origin: booking.origin || "HYD",
    destination: booking.destination || "BOM",
    date: new Date().toISOString().slice(0, 10),
    seatNumber: booking.seatNumber,
    gate: booking.gate || "B12",
    terminal: booking.terminal || "T1",
    boardingTime,
    departureTime: booking.departureTime,
    boardingGroup: booking.travelClass === "BUSINESS" ? "Group 1" : "Group 2",
    seatClass: booking.travelClass || "ECONOMY",
    qrCode: `AOCC-BOARDING|PNR:${booking.pnr}|PASS:${passNumber}|SEAT:${booking.seatNumber}|GATE:${booking.gate}`,
    status: "NOT_BOARDED",
  };

  memoryBoardingPasses.set(booking.pnr, boardingPass);

  const checkInDTO: CheckInDTO = {
    id: `chk-${Date.now()}`,
    bookingId: booking.id,
    pnr: booking.pnr,
    checkedInAt: new Date().toISOString(),
    checkedInBy: input.actor?.name || "Self-Service",
    seatConfirmed: true,
    baggageCount: input.baggageCount ?? 1,
    baggageWeightKg: input.baggageWeightKg ?? 15,
    boardingPass,
  };

  if (shouldUseDatabase()) {
    try {
      await prisma.$transaction([
        prisma.booking.update({
          where: { pnr: booking.pnr },
          data: { checkInStatus: "CHECKED_IN" },
        }),
        prisma.checkIn.upsert({
          where: { bookingId: booking.id },
          update: {
            checkedInAt: new Date(),
            baggageCount: checkInDTO.baggageCount,
            baggageWeightKg: checkInDTO.baggageWeightKg,
          },
          create: {
            bookingId: booking.id,
            checkedInAt: new Date(),
            checkedInBy: input.actor?.id,
            baggageCount: checkInDTO.baggageCount,
            baggageWeightKg: checkInDTO.baggageWeightKg,
          },
        }),
        prisma.boardingPass.upsert({
          where: { bookingId: booking.id },
          update: { status: "NOT_BOARDED" },
          create: {
            bookingId: booking.id,
            passNumber,
            gate: boardingPass.gate,
            terminal: boardingPass.terminal,
            seatNumber: boardingPass.seatNumber,
            boardingTime: new Date(boardingTime),
            boardingGroup: boardingPass.boardingGroup,
            qrCode: boardingPass.qrCode,
            status: "NOT_BOARDED",
          },
        }),
      ]);
    } catch (error) {
      console.warn("Database checkInPassenger failed; updated in memory.", error);
    }
  }

  await logAuditEvent({
    actorId: input.actor?.id,
    actorName: input.actor?.name,
    action: "PASSENGER_CHECKED_IN",
    entity: "BOOKING",
    entityId: booking.pnr,
    after: {
      pnr: booking.pnr,
      passenger: booking.passengerName,
      seat: booking.seatNumber,
      gate: booking.gate,
    },
  });

  return {
    ok: true,
    checkIn: checkInDTO,
    boardingPass,
    message: "Passenger checked in successfully. Digital boarding pass issued.",
  };
}

export async function boardPassenger(input: {
  pnr: string;
  actor?: { id?: string; name?: string };
}): Promise<{ ok: boolean; message: string; booking?: BookingDTO }> {
  const booking = await getBookingByPNR(input.pnr);

  if (!booking) {
    return { ok: false, message: `Booking for PNR ${input.pnr} not found.` };
  }

  if (booking.checkInStatus !== "CHECKED_IN") {
    return { ok: false, message: "Passenger must check in before boarding." };
  }

  if (booking.boardingStatus === "BOARDED") {
    return { ok: false, message: "Passenger has already boarded." };
  }

  booking.boardingStatus = "BOARDED";
  booking.updatedAt = new Date().toISOString();

  const bp = memoryBoardingPasses.get(booking.pnr);
  if (bp) {
    bp.status = "BOARDED";
  }

  if (shouldUseDatabase()) {
    try {
      await prisma.$transaction([
        prisma.booking.update({
          where: { pnr: booking.pnr },
          data: { boardingStatus: "BOARDED" },
        }),
        prisma.boardingPass.updateMany({
          where: { bookingId: booking.id },
          data: { status: "BOARDED" },
        }),
      ]);
    } catch (error) {
      console.warn("Database boardPassenger failed; updated in memory.", error);
    }
  }

  await logAuditEvent({
    actorId: input.actor?.id,
    actorName: input.actor?.name,
    action: "PASSENGER_BOARDED",
    entity: "BOOKING",
    entityId: booking.pnr,
    after: {
      pnr: booking.pnr,
      flightNumber: booking.flightNumber,
      seat: booking.seatNumber,
    },
  });

  // Check if flight can transition from BOARDING to PUSHBACK / READY
  const flightData = await getFlightById(booking.flightId);
  if (flightData && flightData.flight.status === "BOARDING") {
    // In simulation, once passengers start boarding, keep or advance flight
  }

  return {
    ok: true,
    message: `Passenger ${booking.passengerName} (Seat ${booking.seatNumber}) boarded.`,
    booking,
  };
}
