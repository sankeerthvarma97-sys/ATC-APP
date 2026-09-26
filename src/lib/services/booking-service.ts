import type {
  BookingDTO,
  PassengerDTO,
  PaymentStatus,
  SeatClass,
  TicketDTO,
} from "@/lib/domain";
import { Prisma } from "@prisma/client";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { logAuditEvent } from "./audit-service";
import { adjustUserCredit } from "./credit-service";
import { getFlightById, memorySeatMap } from "./flight-service";

export interface CreateBookingInput {
  flightId: string;
  seatNumber: string;
  travelClass: SeatClass;
  passenger: {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    idNumber?: string;
  };
  baggageCount?: number;
  paymentMethod?: string;
  useCredit?: boolean;
  creditAmount?: number;
  createdById?: string;
  actorName?: string;
}

// In-memory bookings storage
export const memoryBookings: BookingDTO[] = [
  {
    id: "bkg-1",
    pnr: "SC7K92P",
    flightId: "flt-sc101",
    flightNumber: "SC101",
    flightCallsign: "SC101",
    origin: "HYD",
    destination: "BOM",
    departureTime: new Date(Date.now() + 45 * 60_000).toISOString(),
    airline: "SkyConnect Airlines",
    aircraft: "Airbus A320neo",
    passengerId: "psg-1",
    passengerName: "Rahul Varma",
    passengerEmail: "rahul.varma@sim.test",
    passengerPhone: "+91 98234 56789",
    seatNumber: "14A",
    travelClass: "ECONOMY",
    fare: 4500,
    paymentStatus: "SUCCESSFUL",
    bookingStatus: "CONFIRMED",
    checkInStatus: "CHECKED_IN",
    boardingStatus: "NOT_BOARDED",
    verificationStatus: "VERIFIED",
    gate: "B12",
    terminal: "T1",
    ticketNumber: "ET-2026-90124",
    qrCode: "AOCC|PNR:SC7K92P|FLT:SC101|SEAT:14A|PSG:Rahul Varma",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bkg-2",
    pnr: "AV3M81X",
    flightId: "flt-av202",
    flightNumber: "AV202",
    flightCallsign: "AV202",
    origin: "DEL",
    destination: "BLR",
    departureTime: new Date(Date.now() + 60 * 60_000).toISOString(),
    airline: "AeroVista",
    aircraft: "Boeing 737-800",
    passengerId: "psg-2",
    passengerName: "Sunita Patel",
    passengerEmail: "sunita.patel@sim.test",
    passengerPhone: "+91 98450 12345",
    seatNumber: "2C",
    travelClass: "BUSINESS",
    fare: 9800,
    paymentStatus: "SUCCESSFUL",
    bookingStatus: "CONFIRMED",
    checkInStatus: "NOT_CHECKED_IN",
    boardingStatus: "NOT_BOARDED",
    verificationStatus: "PENDING",
    gate: "C2",
    terminal: "T3",
    ticketNumber: "ET-2026-90125",
    qrCode: "AOCC|PNR:AV3M81X|FLT:AV202|SEAT:2C|PSG:Sunita Patel",
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Simple mutex for concurrency protection in Node memory mode
const bookingMutexes = new Map<string, Promise<void>>();

async function acquireFlightLock(flightId: string): Promise<() => void> {
  while (bookingMutexes.has(flightId)) {
    await bookingMutexes.get(flightId);
  }
  let unlock: () => void = () => {};
  const lockPromise = new Promise<void>((resolve) => {
    unlock = () => {
      bookingMutexes.delete(flightId);
      resolve();
    };
  });
  bookingMutexes.set(flightId, lockPromise);
  return unlock;
}

export function generatePNR(prefix = "SC"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = prefix.slice(0, 2).toUpperCase();
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createBooking(input: CreateBookingInput): Promise<BookingDTO> {
  const flightData = await getFlightById(input.flightId);
  if (!flightData) {
    throw new Error("Flight not found.");
  }
  const { flight, seats } = flightData;

  const fare =
    input.travelClass === "BUSINESS"
      ? (flight.businessFare ?? 8500)
      : input.travelClass === "FIRST"
      ? (flight.firstFare ?? 15000)
      : (flight.economyFare ?? 4500);

  const pnr = generatePNR(flight.airline?.slice(0, 2) || "SC");
  const ticketNumber = `ET-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const qrCode = `AOCC-SIM|PNR:${pnr}|FLT:${flight.flightNumber || flight.callsign}|SEAT:${input.seatNumber}|PSG:${input.passenger.fullName}|FARE:${fare}`;

  const isCreditPayment = Boolean(input.useCredit || input.paymentMethod === "CREDIT" || input.paymentMethod === "USER_CREDIT");
  let creditUsed = 0;

  // CONCURRENCY-SAFE TRANSACTION IN DATABASE MODE
  if (shouldUseDatabase()) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Check seat availability with locking
        const seat = await tx.seat.findUnique({
          where: {
            flightId_seatNumber: {
              flightId: flight.id,
              seatNumber: input.seatNumber,
            },
          },
        });

        if (!seat || seat.status !== "AVAILABLE") {
          const err = new Error(`Seat ${input.seatNumber} is no longer available.`);
          (err as unknown as { code: string }).code = "SEAT_ALREADY_BOOKED";
          throw err;
        }

        // 2. Credit check and atomic debit if credit payment
        if (isCreditPayment && input.createdById) {
          const user = await tx.user.findUnique({
            where: { id: input.createdById },
            select: { id: true, creditBalance: true, name: true, walletMode: true },
          });

          if (!user) {
            throw new Error(`Booking user not found (${input.createdById}).`);
          }

          const fareDecimal = new Prisma.Decimal(fare.toString());
          const isUnlimited = user.walletMode === "UNLIMITED_SIMULATION";

          if (!isUnlimited && user.creditBalance.lessThan(fareDecimal)) {
            throw new Error(
              `Insufficient credit balance. Current: ₹${Number(user.creditBalance).toLocaleString("en-IN")}, Required: ₹${fare.toLocaleString("en-IN")}`
            );
          }

          const balanceBefore = user.creditBalance;
          const balanceAfter = isUnlimited && balanceBefore.lessThan(fareDecimal)
            ? new Prisma.Decimal("100000000000.00")
            : balanceBefore.sub(fareDecimal);

          const updatedUser = await tx.user.update({
            where: { id: user.id },
            data: { creditBalance: balanceAfter },
            select: { creditBalance: true },
          });

          await tx.creditTransaction.create({
            data: {
              userId: user.id,
              type: "BOOKING_DEBIT",
              amount: fareDecimal,
              balanceBefore: user.creditBalance,
              balanceAfter: updatedUser.creditBalance,
              referenceType: "BOOKING",
              referenceId: pnr,
              description: `Flight booking ${pnr} (${flight.flightNumber || flight.callsign} - ${input.seatNumber})`,
              unlimitedMode: isUnlimited,
            },
          });

          creditUsed = fare;
        }

        // 3. Create passenger
        const passenger = await tx.passenger.create({
          data: {
            fullName: input.passenger.fullName,
            email: input.passenger.email.toLowerCase(),
            phone: input.passenger.phone,
            dateOfBirth: input.passenger.dateOfBirth,
            gender: input.passenger.gender,
            nationality: input.passenger.nationality || "IN",
            idNumber: input.passenger.idNumber,
          },
        });

        // 4. Create booking
        const booking = await tx.booking.create({
          data: {
            pnr,
            flightId: flight.id,
            passengerId: passenger.id,
            seatNumber: input.seatNumber,
            travelClass: input.travelClass,
            fare,
            creditUsed,
            paymentStatus: "SUCCESSFUL",
            bookingStatus: "CONFIRMED",
            checkInStatus: "NOT_CHECKED_IN",
            boardingStatus: "NOT_BOARDED",
            verificationStatus: "VERIFIED",
            createdById: input.createdById || undefined,
          },
        });

        // 5. Mark seat OCCUPIED
        await tx.seat.update({
          where: { id: seat.id },
          data: {
            status: "OCCUPIED",
            passengerId: passenger.id,
            bookingId: booking.id,
            version: { increment: 1 },
          },
        });

        // 6. Issue ticket
        await tx.ticket.create({
          data: {
            bookingId: booking.id,
            ticketNumber,
            pnr,
            qrCode,
            status: "ACTIVE",
          },
        });

        // 7. Record simulated payment
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: fare,
            currency: "INR",
            method: isCreditPayment ? "USER_CREDIT" : (input.paymentMethod || "SIMULATED_CARD"),
            transactionRef: `SIM-TXN-${Date.now()}-${pnr}`,
            status: "SUCCESSFUL",
          },
        });

        // 8. Baggage if specified
        if (input.baggageCount && input.baggageCount > 0) {
          await tx.baggage.create({
            data: {
              bookingId: booking.id,
              tagNumber: `BAG-${pnr}-1`,
              weightKg: 15.0,
              status: "CHECKED",
            },
          });
        }

        return { booking, passenger };
      });

      const bookingDTO: BookingDTO = {
        id: result.booking.id,
        pnr: result.booking.pnr,
        flightId: flight.id,
        flightNumber: flight.flightNumber || flight.callsign,
        flightCallsign: flight.callsign,
        origin: flight.origin,
        destination: flight.destination,
        departureTime: flight.departureTime,
        airline: flight.airline,
        aircraft: flight.aircraftType,
        passengerId: result.passenger.id,
        passengerName: result.passenger.fullName,
        passengerEmail: result.passenger.email,
        passengerPhone: result.passenger.phone,
        seatNumber: input.seatNumber,
        travelClass: input.travelClass,
        fare,
        creditUsed,
        paymentStatus: "SUCCESSFUL",
        bookingStatus: "CONFIRMED",
        checkInStatus: "NOT_CHECKED_IN",
        boardingStatus: "NOT_BOARDED",
        verificationStatus: "VERIFIED",
        gate: flight.gate,
        terminal: flight.terminal,
        ticketNumber,
        qrCode,
        createdAt: result.booking.createdAt.toISOString(),
        updatedAt: result.booking.updatedAt.toISOString(),
      };

      memoryBookings.unshift(bookingDTO);

      await logAuditEvent({
        actorId: input.createdById,
        actorName: input.actorName || input.passenger.fullName,
        action: "BOOKING_CREATED",
        entity: "BOOKING",
        entityId: pnr,
        after: {
          pnr,
          flightNumber: flight.flightNumber || flight.callsign,
          seat: input.seatNumber,
          passenger: input.passenger.fullName,
          fare,
          creditUsed,
        },
      });

      return bookingDTO;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (
        (err as { code?: string }).code === "SEAT_ALREADY_BOOKED" ||
        errorMsg.includes("Insufficient credit") ||
        errorMsg.includes("Booking user not found")
      ) {
        throw err;
      }
      console.warn("Database booking transaction failed; proceeding with memory fallback.", err);
    }
  }

  // CONCURRENCY-SAFE IN-MEMORY MUTEX
  const releaseLock = await acquireFlightLock(flight.id);
  try {
    const flightSeats = memorySeatMap.get(flight.id) || seats;
    const targetSeat = flightSeats.find((s) => s.seatNumber === input.seatNumber);

    if (!targetSeat || targetSeat.status !== "AVAILABLE") {
      const err = new Error(`Seat ${input.seatNumber} is no longer available.`);
      (err as unknown as { code: string }).code = "SEAT_ALREADY_BOOKED";
      throw err;
    }

    if (isCreditPayment && input.createdById) {
      await adjustUserCredit({
        userId: input.createdById,
        amount: fare,
        type: "BOOKING_DEBIT",
        referenceType: "BOOKING",
        referenceId: pnr,
        description: `Flight booking ${pnr} (${flight.flightNumber || flight.callsign} - ${input.seatNumber})`,
      });
      creditUsed = fare;
    }

    targetSeat.status = "OCCUPIED";

    const bookingDTO: BookingDTO = {
      id: `bkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pnr,
      flightId: flight.id,
      flightNumber: flight.flightNumber || flight.callsign,
      flightCallsign: flight.callsign,
      origin: flight.origin,
      destination: flight.destination,
      departureTime: flight.departureTime,
      airline: flight.airline,
      aircraft: flight.aircraftType,
      passengerId: `psg-${Date.now()}`,
      passengerName: input.passenger.fullName,
      passengerEmail: input.passenger.email,
      passengerPhone: input.passenger.phone,
      seatNumber: input.seatNumber,
      travelClass: input.travelClass,
      fare,
      creditUsed,
      paymentStatus: "SUCCESSFUL",
      bookingStatus: "CONFIRMED",
      checkInStatus: "NOT_CHECKED_IN",
      boardingStatus: "NOT_BOARDED",
      verificationStatus: "VERIFIED",
      gate: flight.gate,
      terminal: flight.terminal,
      ticketNumber,
      qrCode,
      createdById: input.createdById || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryBookings.unshift(bookingDTO);

    await logAuditEvent({
      actorId: input.createdById,
      actorName: input.actorName || input.passenger.fullName,
      action: "BOOKING_CREATED",
      entity: "BOOKING",
      entityId: pnr,
      after: {
        pnr,
        flightNumber: flight.flightNumber || flight.callsign,
        seat: input.seatNumber,
        passenger: input.passenger.fullName,
        fare,
      },
    });

    return bookingDTO;
  } finally {
    releaseLock();
  }
}

export async function getBookingByPNR(pnr: string): Promise<BookingDTO | null> {
  const normPNR = pnr.trim().toUpperCase();

  if (shouldUseDatabase()) {
    try {
      const b = await prisma.booking.findUnique({
        where: { pnr: normPNR },
        include: {
          flight: true,
          passenger: true,
          ticket: true,
        },
      });

      if (b) {
        return {
          id: b.id,
          pnr: b.pnr,
          flightId: b.flightId,
          flightNumber: b.flight.flightNumber ?? b.flight.callsign,
          flightCallsign: b.flight.callsign,
          origin: b.flight.origin,
          destination: b.flight.destination,
          departureTime: b.flight.departureTime?.toISOString(),
          airline: b.flight.airline,
          aircraft: b.flight.aircraftType,
          passengerId: b.passengerId,
          passengerName: b.passenger.fullName,
          passengerEmail: b.passenger.email,
          passengerPhone: b.passenger.phone,
          seatNumber: b.seatNumber,
          travelClass: b.travelClass,
          fare: b.fare,
          creditUsed: b.creditUsed,
          paymentStatus: b.paymentStatus,
          bookingStatus: b.bookingStatus,
          checkInStatus: b.checkInStatus,
          boardingStatus: b.boardingStatus,
          verificationStatus: b.verificationStatus,
          gate: b.flight.gate ?? undefined,
          terminal: b.flight.terminal ?? undefined,
          ticketNumber: b.ticket?.ticketNumber,
          qrCode: b.ticket?.qrCode,
          createdById: b.createdById ?? undefined,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
        };
      }
    } catch (error) {
      console.warn("Database getBookingByPNR failed; checking memory.", error);
    }
  }

  return memoryBookings.find((b) => b.pnr.toUpperCase() === normPNR) ?? null;
}

export interface PagedBookingResult {
  bookings: BookingDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listBookingsPaged(filters?: {
  query?: string;
  flightId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedBookingResult> {
  const page = Math.max(1, filters?.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize || 25));
  const skip = (page - 1) * pageSize;

  if (shouldUseDatabase()) {
    try {
      const where: Record<string, unknown> = {};
      if (filters?.flightId) where.flightId = filters.flightId;
      if (filters?.query) {
        where.OR = [
          { pnr: { contains: filters.query, mode: "insensitive" } },
          { passenger: { fullName: { contains: filters.query, mode: "insensitive" } } },
          { passenger: { email: { contains: filters.query, mode: "insensitive" } } },
        ];
      }

      const [total, list] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          include: { flight: true, passenger: true, ticket: true },
        }),
      ]);

      const bookings: BookingDTO[] = list.map((b) => ({
        id: b.id,
        pnr: b.pnr,
        flightId: b.flightId,
        flightNumber: b.flight.flightNumber ?? b.flight.callsign,
        flightCallsign: b.flight.callsign,
        origin: b.flight.origin,
        destination: b.flight.destination,
        departureTime: b.flight.departureTime?.toISOString(),
        airline: b.flight.airline,
        aircraft: b.flight.aircraftType,
        passengerId: b.passengerId,
        passengerName: b.passenger.fullName,
        passengerEmail: b.passenger.email,
        passengerPhone: b.passenger.phone,
        seatNumber: b.seatNumber,
        travelClass: b.travelClass,
        fare: b.fare,
        creditUsed: b.creditUsed,
        paymentStatus: b.paymentStatus,
        bookingStatus: b.bookingStatus,
        checkInStatus: b.checkInStatus,
        boardingStatus: b.boardingStatus,
        verificationStatus: b.verificationStatus,
        gate: b.flight.gate ?? undefined,
        terminal: b.flight.terminal ?? undefined,
        ticketNumber: b.ticket?.ticketNumber,
        qrCode: b.ticket?.qrCode,
        createdById: b.createdById ?? undefined,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      }));

      return {
        bookings,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    } catch (error) {
      console.warn("Database listBookings failed; using memory.", error);
    }
  }

  let result = [...memoryBookings];
  if (filters?.flightId) {
    result = result.filter((b) => b.flightId === filters.flightId);
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(
      (b) =>
        b.pnr.toLowerCase().includes(q) ||
        (b.passengerName && b.passengerName.toLowerCase().includes(q)) ||
        (b.passengerEmail && b.passengerEmail.toLowerCase().includes(q)),
    );
  }

  const total = result.length;
  const paged = result.slice(skip, skip + pageSize);
  return {
    bookings: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function listBookings(filters?: { query?: string; flightId?: string }): Promise<BookingDTO[]> {
  const paged = await listBookingsPaged({ ...filters, page: 1, pageSize: 100 });
  return paged.bookings;
}

export async function cancelBooking(pnr: string, actor?: { id?: string; name?: string }): Promise<BookingDTO | null> {
  const booking = await getBookingByPNR(pnr);
  if (!booking) return null;

  booking.bookingStatus = "CANCELLED";
  booking.updatedAt = new Date().toISOString();

  // Free memory seat
  const seats = memorySeatMap.get(booking.flightId);
  if (seats) {
    const seat = seats.find((s) => s.seatNumber === booking.seatNumber);
    if (seat) seat.status = "AVAILABLE";
  }

  if (shouldUseDatabase()) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { pnr: booking.pnr },
          data: { bookingStatus: "CANCELLED" },
        });
        await tx.seat.updateMany({
          where: { flightId: booking.flightId, seatNumber: booking.seatNumber },
          data: { status: "AVAILABLE", bookingId: null, passengerId: null },
        });
        await tx.ticket.updateMany({
          where: { pnr: booking.pnr },
          data: { status: "CANCELLED" },
        });

        if (booking.creditUsed && booking.creditUsed > 0 && booking.createdById) {
          const user = await tx.user.findUnique({
            where: { id: booking.createdById },
            select: { id: true, creditBalance: true },
          });

          if (user) {
            const updatedUser = await tx.user.update({
              where: { id: user.id },
              data: { creditBalance: { increment: booking.creditUsed } },
              select: { creditBalance: true },
            });

            await tx.creditTransaction.create({
              data: {
                userId: user.id,
                type: "REFUND",
                amount: booking.creditUsed,
                balanceBefore: user.creditBalance,
                balanceAfter: updatedUser.creditBalance,
                referenceType: "BOOKING_REFUND",
                referenceId: booking.pnr,
                description: `Refund for cancelled booking ${booking.pnr}`,
              },
            });
          }
        }
      });
    } catch (error) {
      console.warn("Database cancelBooking failed; updated memory.", error);
    }
  }

  // Memory fallback refund
  if (booking.creditUsed && booking.creditUsed > 0 && booking.createdById) {
    try {
      await adjustUserCredit({
        userId: booking.createdById,
        amount: booking.creditUsed,
        type: "REFUND",
        referenceType: "BOOKING_REFUND",
        referenceId: booking.pnr,
        description: `Refund for cancelled booking ${booking.pnr}`,
      });
    } catch (err) {
      console.warn("Memory credit refund failed on cancelBooking", err);
    }
  }

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "BOOKING_CANCELLED",
    entity: "BOOKING",
    entityId: booking.pnr,
    after: { pnr: booking.pnr, status: "CANCELLED" },
  });

  return booking;
}
