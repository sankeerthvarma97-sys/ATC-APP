import type {
  BoardingPassDTO,
  BookingDTO,
  CheckInDTO,
  TicketVerificationResult,
} from "@/lib/domain";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { logAuditEvent } from "./audit-service";
import { getBookingByPNR, memoryBookings } from "./booking-service";
import { getFlightById } from "./flight-service";

export interface VerifyTicketResult {
  status: TicketVerificationResult;
  isValid: boolean;
  message: string;
  booking?: BookingDTO;
  verifiedAt: string;
}

export interface BoardingManifestEntry {
  id: string;
  pnr: string;
  ticketNumber: string;
  flightId: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime?: string;
  name: string;
  seat: string;
  seatClass: BookingDTO["travelClass"];
  terminal?: string;
  gate?: string;
  checkedInAt?: string;
  checkedIn: boolean;
  boarded: boolean;
  ticketStatus?: string;
  boardingPassStatus?: string;
  baggageCount: number;
}

// In-memory Boarding Passes storage
export const memoryBoardingPasses: Map<string, BoardingPassDTO> = new Map();

export async function getBoardingManifest(flightId: string): Promise<BoardingManifestEntry[]> {
  if (shouldUseDatabase()) {
    const bookings = await prisma.booking.findMany({
      where: {
        flightId,
        bookingStatus: "CONFIRMED",
        checkInStatus: "CHECKED_IN",
      },
      orderBy: { createdAt: "asc" },
      take: 500,
      select: {
        id: true,
        pnr: true,
        seatNumber: true,
        travelClass: true,
        boardingStatus: true,
        passenger: { select: { fullName: true } },
        flight: {
          select: {
            id: true,
            callsign: true,
            flightNumber: true,
            origin: true,
            destination: true,
            departureTime: true,
            terminal: true,
            gate: true,
            status: true,
          },
        },
        ticket: { select: { ticketNumber: true, status: true } },
        checkIn: { select: { checkedInAt: true, baggageCount: true } },
        boardingPass: { select: { status: true } },
      },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      pnr: booking.pnr,
      ticketNumber: booking.ticket?.ticketNumber ?? "",
      flightId: booking.flight.id,
      flightNumber: booking.flight.flightNumber ?? booking.flight.callsign,
      origin: booking.flight.origin,
      destination: booking.flight.destination,
      departureTime: booking.flight.departureTime?.toISOString(),
      name: booking.passenger.fullName,
      seat: booking.seatNumber,
      seatClass: booking.travelClass,
      terminal: booking.flight.terminal ?? undefined,
      gate: booking.flight.gate ?? undefined,
      checkedInAt: booking.checkIn?.checkedInAt.toISOString(),
      checkedIn: true,
      boarded: booking.boardingStatus === "BOARDED",
      ticketStatus: booking.ticket?.status,
      boardingPassStatus: booking.boardingPass?.status,
      baggageCount: booking.checkIn?.baggageCount ?? 0,
    }));
  }

  return memoryBookings
    .filter((booking) => booking.flightId === flightId && booking.bookingStatus === "CONFIRMED" && booking.checkInStatus === "CHECKED_IN")
    .map((booking) => {
      const boardingPass = memoryBoardingPasses.get(booking.pnr);
      return {
        id: booking.id,
        pnr: booking.pnr,
        ticketNumber: booking.ticketNumber ?? "",
        flightId: booking.flightId,
        flightNumber: booking.flightNumber ?? booking.flightCallsign ?? "",
        origin: booking.origin ?? "",
        destination: booking.destination ?? "",
        departureTime: booking.departureTime,
        name: booking.passengerName ?? "",
        seat: booking.seatNumber,
        seatClass: booking.travelClass,
        terminal: booking.terminal,
        gate: booking.gate,
        checkedIn: true,
        boarded: booking.boardingStatus === "BOARDED",
        ticketStatus: booking.bookingStatus === "CONFIRMED" ? "ACTIVE" : "CANCELLED",
        boardingPassStatus: boardingPass?.status,
        baggageCount: 0,
      };
    });
}

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

  if (booking.bookingStatus !== "CONFIRMED" || booking.paymentStatus !== "SUCCESSFUL" || !booking.ticketNumber) {
    return { ok: false, message: "A confirmed booking with a paid ticket is required for check-in." };
  }

  const flightData = await getFlightById(booking.flightId);
  if (!flightData || flightData.flight.status === "CANCELLED") {
    return { ok: false, message: "The flight is unavailable for check-in." };
  }

  if (flightData.flight.checkInCloseTime && Date.now() > new Date(flightData.flight.checkInCloseTime).getTime()) {
    return { ok: false, message: "The check-in window for this flight has closed." };
  }

  if (booking.checkInStatus === "CHECKED_IN") {
    if (shouldUseDatabase()) {
      const persisted = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: { checkIn: true, boardingPass: true },
      });
      if (persisted?.checkIn && persisted.boardingPass) {
        const existingPass: BoardingPassDTO = {
          id: persisted.boardingPass.id,
          bookingId: booking.id,
          passNumber: persisted.boardingPass.passNumber,
          pnr: booking.pnr,
          passengerName: booking.passengerName ?? "",
          airline: booking.airline ?? "",
          flightNumber: booking.flightNumber ?? booking.flightCallsign ?? "",
          origin: booking.origin ?? "",
          destination: booking.destination ?? "",
          date: booking.departureTime?.slice(0, 10) ?? "",
          seatNumber: persisted.boardingPass.seatNumber,
          gate: persisted.boardingPass.gate ?? undefined,
          terminal: persisted.boardingPass.terminal ?? undefined,
          boardingTime: persisted.boardingPass.boardingTime?.toISOString(),
          departureTime: booking.departureTime,
          boardingGroup: persisted.boardingPass.boardingGroup,
          seatClass: booking.travelClass,
          qrCode: persisted.boardingPass.qrCode,
          status: persisted.boardingPass.status,
        };
        return {
          ok: true,
          checkIn: {
            id: persisted.checkIn.id,
            bookingId: booking.id,
            pnr: booking.pnr,
            checkedInAt: persisted.checkIn.checkedInAt.toISOString(),
            checkedInBy: persisted.checkIn.checkedInBy ?? undefined,
            seatConfirmed: persisted.checkIn.seatConfirmed,
            baggageCount: persisted.checkIn.baggageCount,
            baggageWeightKg: persisted.checkIn.baggageWeightKg,
            boardingPass: existingPass,
          },
          boardingPass: existingPass,
          message: "Passenger already checked in. Retrieved boarding pass.",
        };
      }
      return { ok: false, message: "Check-in records are incomplete. Contact an administrator." };
    }

    const existingPass = memoryBoardingPasses.get(booking.pnr);
    if (!existingPass) return { ok: false, message: "Check-in records are incomplete. Contact an administrator." };
    return { ok: true, boardingPass: existingPass, message: "Passenger already checked in. Retrieved boarding pass." };
  }

  const passNumber = `BP-${booking.pnr}-${booking.seatNumber}`;
  const boardingTime = flightData.flight.boardingTime ?? booking.departureTime;
  const boardingPass: BoardingPassDTO = {
    id: `bp-${Date.now()}`,
    bookingId: booking.id,
    passNumber,
    pnr: booking.pnr,
    passengerName: booking.passengerName ?? "",
    airline: booking.airline ?? "",
    flightNumber: booking.flightNumber ?? booking.flightCallsign ?? "",
    origin: booking.origin ?? "",
    destination: booking.destination ?? "",
    date: booking.departureTime?.slice(0, 10) ?? "",
    seatNumber: booking.seatNumber,
    gate: booking.gate,
    terminal: booking.terminal,
    boardingTime,
    departureTime: booking.departureTime,
    boardingGroup: booking.travelClass === "BUSINESS" ? "Group 1" : "Group 2",
    seatClass: booking.travelClass,
    qrCode: `AOCC-BOARDING|PNR:${booking.pnr}|PASS:${passNumber}|SEAT:${booking.seatNumber}|GATE:${booking.gate ?? ""}`,
    status: "NOT_BOARDED",
  };

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
      const persisted = await prisma.$transaction(async (tx) => {
        const current = await tx.booking.findUnique({
          where: { id: booking.id },
          include: { flight: true, ticket: true, seats: true },
        });
        if (!current || current.bookingStatus !== "CONFIRMED" || current.paymentStatus !== "SUCCESSFUL") {
          throw new Error("A confirmed, paid booking is required for check-in.");
        }
        if (current.flight.status === "CANCELLED" || current.ticket?.status !== "ACTIVE") {
          throw new Error("The flight or ticket is not eligible for check-in.");
        }
        if (current.flight.checkInCloseTime && Date.now() > current.flight.checkInCloseTime.getTime()) {
          throw new Error("The check-in window for this flight has closed.");
        }
        const seatIsAssigned = current.seats.some(
          (seat) => seat.flightId === current.flightId && seat.seatNumber === current.seatNumber && seat.status === "OCCUPIED" && seat.bookingId === current.id,
        );
        if (!seatIsAssigned) throw new Error("The booking seat assignment is invalid.");

        const updated = await tx.booking.updateMany({
          where: {
            id: booking.id,
            bookingStatus: "CONFIRMED",
            checkInStatus: "NOT_CHECKED_IN",
          },
          data: { checkInStatus: "CHECKED_IN" },
        });
        if (updated.count !== 1) throw new Error("Booking has already been checked in or is no longer eligible.");

        const savedCheckIn = await tx.checkIn.create({
          data: {
            bookingId: booking.id,
            checkedInBy: input.actor?.id,
            baggageCount: checkInDTO.baggageCount,
            baggageWeightKg: checkInDTO.baggageWeightKg,
          },
        });
        const savedPass = await tx.boardingPass.create({
          data: {
            bookingId: booking.id,
            passNumber,
            gate: boardingPass.gate,
            terminal: boardingPass.terminal,
            seatNumber: boardingPass.seatNumber,
            boardingTime: boardingTime ? new Date(boardingTime) : undefined,
            boardingGroup: boardingPass.boardingGroup,
            qrCode: boardingPass.qrCode,
            status: "NOT_BOARDED",
          },
        });
        return { savedCheckIn, savedPass };
      });
      checkInDTO.id = persisted.savedCheckIn.id;
      checkInDTO.checkedInAt = persisted.savedCheckIn.checkedInAt.toISOString();
      boardingPass.id = persisted.savedPass.id;
      boardingPass.passNumber = persisted.savedPass.passNumber;
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Check-in could not be persisted." };
    }
  } else {
    booking.checkInStatus = "CHECKED_IN";
    booking.updatedAt = new Date().toISOString();
    memoryBoardingPasses.set(booking.pnr, boardingPass);
  }

  await logAuditEvent({
    actorId: input.actor?.id,
    actorName: input.actor?.name,
    action: "PASSENGER_CHECKED_IN",
    entity: "BOOKING",
    entityId: booking.pnr,
    after: {
      pnr: booking.pnr,
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
  flightId?: string;
  gate?: string;
  actor?: { id?: string; name?: string };
}): Promise<{ ok: boolean; message: string; booking?: BookingDTO }> {
  const booking = await getBookingByPNR(input.pnr);

  if (!booking) {
    return { ok: false, message: `Booking for PNR ${input.pnr} not found.` };
  }

  if (input.flightId && booking.flightId !== input.flightId) {
    return { ok: false, message: "This boarding pass is not valid for the selected flight." };
  }

  if (input.gate && booking.gate && input.gate !== booking.gate) {
    return { ok: false, message: "This boarding pass is assigned to a different gate." };
  }

  if (booking.bookingStatus !== "CONFIRMED" || booking.paymentStatus !== "SUCCESSFUL" || !booking.ticketNumber) {
    return { ok: false, message: "The booking or ticket is not valid for boarding." };
  }

  if (booking.checkInStatus !== "CHECKED_IN") {
    return { ok: false, message: "Passenger must check in before boarding." };
  }

  const flightData = await getFlightById(booking.flightId);
  if (!flightData || !["SCHEDULED", "BOARDING", "AT_GATE"].includes(flightData.flight.status)) {
    return { ok: false, message: "This flight is not accepting passengers for boarding." };
  }

  if (booking.boardingStatus === "BOARDED") {
    return { ok: false, message: "Passenger has already boarded." };
  }

  if (!shouldUseDatabase()) {
    const pass = memoryBoardingPasses.get(booking.pnr);
    if (!pass || pass.status !== "NOT_BOARDED") {
      return { ok: false, message: "An active, unused boarding pass is required." };
    }
  }

  if (shouldUseDatabase()) {
    const persisted = await prisma.$transaction(async (tx) => {
      const record = await tx.booking.findUnique({
        where: { pnr: booking.pnr },
        include: { flight: true, ticket: true, boardingPass: true },
      });

      if (!record || record.flightId !== booking.flightId) {
        throw new Error("Booking no longer exists for this flight.");
      }
      if (!["SCHEDULED", "BOARDING", "AT_GATE"].includes(record.flight.status) || record.bookingStatus !== "CONFIRMED") {
        throw new Error("This flight or booking is not accepting passengers for boarding.");
      }
      if (record.ticket?.status !== "ACTIVE" || !record.boardingPass || record.boardingPass.status !== "NOT_BOARDED") {
        throw new Error("An active ticket and unused boarding pass are required.");
      }
      if (input.flightId && record.flightId !== input.flightId) {
        throw new Error("This boarding pass is not valid for the selected flight.");
      }
      if (input.gate && record.flight.gate && input.gate !== record.flight.gate) {
        throw new Error("This boarding pass is assigned to a different gate.");
      }

      const updated = await tx.booking.updateMany({
        where: {
          id: record.id,
          checkInStatus: "CHECKED_IN",
          bookingStatus: "CONFIRMED",
          boardingStatus: "NOT_BOARDED",
        },
        data: { boardingStatus: "BOARDED" },
      });
      if (updated.count !== 1) {
        throw new Error("Passenger has already boarded or is no longer eligible.");
      }

      await tx.boardingPass.update({
        where: { bookingId: record.id },
        data: { status: "BOARDED" },
      });
      return true;
    });
    if (!persisted) return { ok: false, message: "Boarding could not be persisted." };
  } else {
    booking.boardingStatus = "BOARDED";
    booking.updatedAt = new Date().toISOString();
    const bp = memoryBoardingPasses.get(booking.pnr);
    if (bp) bp.status = "BOARDED";
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

  return {
    ok: true,
    message: `Passenger ${booking.passengerName} (Seat ${booking.seatNumber}) boarded.`,
    booking,
  };
}
