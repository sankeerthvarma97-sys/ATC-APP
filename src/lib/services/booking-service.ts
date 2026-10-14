import type {
  BookingDTO,
  PassengerCategory,
  SeatClass,
} from "@/lib/domain";
import { Prisma, type FlightStatus } from "@prisma/client";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { logAuditEvent } from "./audit-service";
import { adjustUserCredit } from "./credit-service";
import { getFlightById, memorySeatMap } from "./flight-service";
import { calculateFareDiscount, redeemCouponAtomic } from "./coupon-service";

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
  couponCode?: string;
  passengerCategory?: PassengerCategory;
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

  // 1. ELIGIBILITY VALIDATION: Reject departed, arrived, completed, cancelled, or past flights
  const nonBookableStatuses = [
    "DEPARTED",
    "PUSHBACK",
    "TAXI_OUT",
    "DEPARTING",
    "AIRBORNE",
    "APPROACH",
    "LANDED",
    "TAXI_IN",
    "ARRIVED",
    "COMPLETED",
    "CANCELLED",
    "DIVERTED",
    "EMERGENCY",
  ];
  if (nonBookableStatuses.includes(flight.status)) {
    const err = new Error(
      `Flight ${flight.flightNumber || flight.callsign} with status ${flight.status} is no longer eligible for new bookings.`
    );
    (err as unknown as { code: string; status: number }).code = "FLIGHT_NOT_BOOKABLE";
    (err as unknown as { status: number }).status = 400;
    throw err;
  }

  if (flight.departureTime && new Date(flight.departureTime).getTime() <= Date.now()) {
    const err = new Error(
      `Flight ${flight.flightNumber || flight.callsign} has already departed.`
    );
    (err as unknown as { code: string; status: number }).code = "FLIGHT_NOT_BOOKABLE";
    (err as unknown as { status: number }).status = 400;
    throw err;
  }

  const baseFare =
    input.travelClass === "BUSINESS"
      ? (flight.businessFare ?? 8500)
      : input.travelClass === "FIRST"
      ? (flight.firstFare ?? 15000)
      : (flight.economyFare ?? 4500);

  // Authoritative server-side discount calculation & coupon validation
  const fareResult = await calculateFareDiscount({
    baseFare,
    couponCode: input.couponCode,
    passengerCategory: input.passengerCategory,
    seatClass: input.travelClass,
    passengerEmail: input.passenger?.email,
  });

  if (input.couponCode && !fareResult.valid) {
    const err = new Error(fareResult.error || "Invalid coupon code.");
    (err as unknown as { code: string; status: number }).code = "INVALID_COUPON";
    (err as unknown as { status: number }).status = 400;
    throw err;
  }

  const originalFare = baseFare;
  const fare = fareResult.finalFare;
  const couponDiscount = fareResult.discountAmount;
  const couponCode = fareResult.couponApplied?.code;
  const passengerCategory = input.passengerCategory || "GENERAL";

  const pnr = generatePNR(flight.airline?.slice(0, 2) || "SC");
  const ticketNumber = `ET-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const passengerName = input.passenger?.fullName || (input as unknown as { passengerName?: string }).passengerName || "PASSENGER";
  const qrCode = `AOCC-SIM|PNR:${pnr}|FLT:${flight.flightNumber || flight.callsign}|SEAT:${input.seatNumber}|PSG:${passengerName}|FARE:${fare}`;

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
            originalFare,
            couponCode,
            couponDiscount,
            passengerCategory,
            creditUsed,
            paymentStatus: "SUCCESSFUL",
            bookingStatus: "CONFIRMED",
            checkInStatus: "NOT_CHECKED_IN",
            boardingStatus: "NOT_BOARDED",
            verificationStatus: "VERIFIED",
            createdById: input.createdById || undefined,
          },
        });

        // 4b. Record coupon redemption atomically if coupon applied
        if (couponCode && couponDiscount > 0) {
          await redeemCouponAtomic({
            couponCode,
            bookingId: booking.id,
            pnr,
            passengerId: passenger.id,
            passengerName,
            originalFare,
            discountAmount: couponDiscount,
            finalFare: fare,
            tx,
          });
        }

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

        // 8. Baggage - Automatically create and associate default baggage record and tag (BAG-${pnr}-1) for every booking
        const count = Math.max(1, input.baggageCount || 1);
        for (let i = 1; i <= count; i++) {
          await tx.baggage.create({
            data: {
              bookingId: booking.id,
              tagNumber: `BAG-${pnr}-${i}`,
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
        originalFare,
        couponCode,
        couponDiscount,
        passengerCategory,
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
        baggageTag: `BAG-${pnr}-1`,
        baggageAllowanceKg: 15.0,
        baggageStatus: "CHECKED",
        arrivalTime: flight.arrivalTime,
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
      passengerName: input.passenger?.fullName || (input as unknown as { passengerName?: string }).passengerName || "Passenger",
      passengerEmail: input.passenger?.email || (input as unknown as { passengerEmail?: string }).passengerEmail || "passenger@aocc.test",
      passengerPhone: input.passenger?.phone || (input as unknown as { passengerPhone?: string }).passengerPhone || "+91 9999999999",
      seatNumber: input.seatNumber,
      travelClass: input.travelClass,
      fare,
      originalFare,
      couponCode,
      couponDiscount,
      passengerCategory,
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
      baggageTag: `BAG-${pnr}-1`,
      baggageAllowanceKg: 15.0,
      baggageStatus: "CHECKED",
      arrivalTime: flight.arrivalTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryBookings.unshift(bookingDTO);

    // Record coupon redemption in memory mode
    if (couponCode && couponDiscount > 0) {
      await redeemCouponAtomic({
        couponCode,
        bookingId: bookingDTO.id,
        pnr,
        passengerId: bookingDTO.passengerId,
        passengerName,
        originalFare,
        discountAmount: couponDiscount,
        finalFare: fare,
      });
    }

    await logAuditEvent({
      actorId: input.createdById,
      actorName: input.actorName || bookingDTO.passengerName,
      action: "BOOKING_CREATED",
      entity: "BOOKING",
      entityId: pnr,
      after: {
        pnr,
        flightNumber: flight.flightNumber || flight.callsign,
        seat: input.seatNumber,
        passenger: bookingDTO.passengerName,
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
          originalFare: b.originalFare ?? undefined,
          couponCode: b.couponCode ?? undefined,
          couponDiscount: b.couponDiscount ?? undefined,
          passengerCategory: (b.passengerCategory as PassengerCategory) ?? undefined,
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
      console.warn("Database getBookingByPNR failed.", error);
      throw error;
    }
  }

  return memoryBookings.find((b) => b.pnr.toUpperCase() === normPNR) ?? null;
}

export const getBookingByPnr = getBookingByPNR;

export interface PagedBookingResult {
  bookings: BookingDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListBookingsFilters {
  query?: string;
  flightId?: string;
  airportCode?: string;
  status?: string;
  category?: "ALL" | "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  date?: string;
  page?: number;
  pageSize?: number;
}

export async function listBookingsPaged(filters?: ListBookingsFilters): Promise<PagedBookingResult> {
  const page = Math.max(1, filters?.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize || 25));
  const skip = (page - 1) * pageSize;

  if (shouldUseDatabase()) {
    try {
      const where: Record<string, unknown> = {};
      if (filters?.flightId) where.flightId = filters.flightId;
      if (filters?.airportCode) where.flight = { origin: filters.airportCode };
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
        originalFare: b.originalFare ?? undefined,
        couponCode: b.couponCode ?? undefined,
        couponDiscount: b.couponDiscount ?? undefined,
        passengerCategory: (b.passengerCategory as PassengerCategory) ?? undefined,
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
      console.warn("Database listBookings failed.", error);
      throw error;
    }
  }

  let result = [...memoryBookings];
  if (filters?.flightId) {
    result = result.filter((b) => b.flightId === filters.flightId);
  }
  if (filters?.airportCode) {
    result = result.filter((booking) => booking.origin?.toUpperCase() === filters.airportCode?.toUpperCase());
  }
  if (filters?.category && filters.category !== "ALL") {
    const nowMs = Date.now();
    if (filters.category === "UPCOMING") {
      result = result.filter(
        (b) =>
          (b.bookingStatus === "CONFIRMED" || b.bookingStatus === "PENDING") &&
          b.checkInStatus !== "CHECKED_IN" &&
          b.boardingStatus !== "BOARDED" &&
          (!b.departureTime || new Date(b.departureTime).getTime() > nowMs)
      );
    } else if (filters.category === "ACTIVE") {
      result = result.filter(
        (b) =>
          (b.checkInStatus === "CHECKED_IN" || b.boardingStatus === "BOARDED") &&
          b.bookingStatus !== "COMPLETED" &&
          b.bookingStatus !== "CANCELLED" &&
          b.bookingStatus !== "NO_SHOW"
      );
    } else if (filters.category === "COMPLETED") {
      result = result.filter(
        (b) => b.bookingStatus === "COMPLETED" || b.journeyStatus === "COMPLETED"
      );
    } else if (filters.category === "CANCELLED") {
      result = result.filter((b) => b.bookingStatus === "CANCELLED");
    } else if (filters.category === "NO_SHOW") {
      result = result.filter(
        (b) => b.bookingStatus === "NO_SHOW" || b.journeyStatus === "NO_SHOW"
      );
    }
  }
  if (filters?.status && filters.status !== "ALL") {
    result = result.filter((b) => b.bookingStatus === filters.status);
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

export async function processMissedFlights(flightId?: string): Promise<{
  processedCount: number;
  affectedPnrs: string[];
}> {
  const affectedPnrs: string[] = [];
  const nowMs = Date.now();
  const departedStatuses = [
    "DEPARTED",
    "PUSHBACK",
    "TAXI_OUT",
    "DEPARTING",
    "AIRBORNE",
    "APPROACH",
    "LANDED",
    "TAXI_IN",
    "ARRIVED",
    "COMPLETED",
  ];

  // 1. Process In-Memory Bookings
  for (const booking of memoryBookings) {
    if (flightId && booking.flightId !== flightId) continue;

    // A passenger who has already BOARDED must never be marked NO_SHOW
    if (booking.boardingStatus === "BOARDED") continue;

    // Only process active/eligible reservations that haven't been completed or cancelled or already no-show
    if (
      (booking.bookingStatus === "CONFIRMED" || booking.bookingStatus === "PENDING") &&
      booking.journeyStatus !== "COMPLETED" &&
      booking.journeyStatus !== "NO_SHOW"
    ) {
      const fltData = await getFlightById(booking.flightId);
      const isDeparted =
        fltData &&
        (departedStatuses.includes(fltData.flight.status) ||
          (fltData.flight.departureTime && new Date(fltData.flight.departureTime).getTime() <= nowMs));

      if (isDeparted) {
        booking.bookingStatus = "NO_SHOW";
        booking.journeyStatus = "NO_SHOW";
        booking.noShowReason = "MISSED_DEPARTURE_CUTOFF";
        booking.noShowAt = new Date().toISOString();
        booking.updatedAt = new Date().toISOString();

        // Release seat for safe reuse
        const seats = memorySeatMap.get(booking.flightId);
        if (seats) {
          const seat = seats.find((s) => s.seatNumber === booking.seatNumber);
          if (seat) {
            seat.status = "AVAILABLE";
            seat.bookingId = undefined;
            seat.passengerId = undefined;
          }
        }

        affectedPnrs.push(booking.pnr);
      }
    }
  }

  // 2. Process Database Bookings
  if (shouldUseDatabase()) {
    try {
      const candidateFlights = await prisma.flight.findMany({
        where: {
          OR: [
            { status: { in: ["PUSHBACK", "TAXI_OUT", "DEPARTING", "AIRBORNE", "APPROACH", "LANDED", "TAXI_IN", "ARRIVED", "AT_GATE"] as FlightStatus[] } },
            { departureTime: { lte: new Date() } },
          ],
          ...(flightId ? { id: flightId } : {}),
        },
        select: { id: true },
      });

      const departedIds = candidateFlights.map((f) => f.id);

      if (departedIds.length > 0) {
        const candidateBookings = await prisma.booking.findMany({
          where: {
            flightId: { in: departedIds },
            bookingStatus: { in: ["CONFIRMED", "PENDING"] },
            boardingStatus: { not: "BOARDED" },
          },
          select: { id: true, pnr: true, flightId: true, seatNumber: true },
        });

        for (const b of candidateBookings) {
          await prisma.$transaction([
            prisma.booking.update({
              where: { id: b.id },
              data: {
                bookingStatus: "CANCELLED",
                updatedAt: new Date(),
              },
            }),
            prisma.ticket.updateMany({
              where: { bookingId: b.id },
              data: { status: "EXPIRED" },
            }),
            prisma.seat.updateMany({
              where: { flightId: b.flightId, seatNumber: b.seatNumber },
              data: { status: "AVAILABLE", bookingId: null, passengerId: null },
            }),
          ]);
          if (!affectedPnrs.includes(b.pnr)) {
            affectedPnrs.push(b.pnr);
          }
        }
      }
    } catch (err) {
      console.warn("Database processMissedFlights failed; memory updated.", err);
    }
  }

  if (affectedPnrs.length > 0) {
    await logAuditEvent({
      action: "MISSED_FLIGHTS_PROCESSED",
      entity: "BOOKING",
      entityId: flightId || "BATCH",
      after: {
        affectedCount: affectedPnrs.length,
        pnrs: affectedPnrs.slice(0, 10),
      },
    });
  }

  return { processedCount: affectedPnrs.length, affectedPnrs };
}

export async function processFlightArrivalAndCompletion(flightId: string): Promise<{
  success: boolean;
  completedCount: number;
  flightNumber: string;
  affectedPnrs: string[];
}> {
  const fltData = await getFlightById(flightId);
  if (!fltData) {
    throw new Error(`Flight ${flightId} not found.`);
  }

  const flight = fltData.flight;
  flight.status = "COMPLETED";
  flight.phase = "Flight completed. Passenger journeys concluded.";
  flight.updatedAt = new Date().toISOString();

  // First classify any unboarded passengers on this flight as NO_SHOW
  await processMissedFlights(flight.id);

  const completedPnrs: string[] = [];
  const nowIso = new Date().toISOString();

  // Mark all boarded passengers on this flight as COMPLETED
  for (const booking of memoryBookings) {
    if (booking.flightId === flight.id || (flight.flightNumber && booking.flightNumber === flight.flightNumber)) {
      if (booking.boardingStatus === "BOARDED" && booking.bookingStatus !== "CANCELLED") {
        booking.bookingStatus = "COMPLETED";
        booking.journeyStatus = "COMPLETED";
        booking.actualDepartureTime = flight.departureTime;
        booking.actualArrivalTime = flight.arrivalTime || nowIso;
        booking.completedAt = nowIso;
        booking.updatedAt = nowIso;
        if (!completedPnrs.includes(booking.pnr)) {
          completedPnrs.push(booking.pnr);
        }
      }
    }
  }

  if (shouldUseDatabase()) {
    try {
      await prisma.flight.update({
        where: { id: flight.id },
        data: {
          status: "ARRIVED",
          phase: flight.phase,
          updatedAt: new Date(),
        },
      });

      const boardedBookings = await prisma.booking.findMany({
        where: {
          flightId: flight.id,
          boardingStatus: "BOARDED",
          bookingStatus: { not: "CANCELLED" },
        },
        select: { id: true, pnr: true },
      });

      for (const b of boardedBookings) {
        await prisma.ticket.updateMany({
          where: { bookingId: b.id },
          data: { status: "USED" },
        });
        if (!completedPnrs.includes(b.pnr)) {
          completedPnrs.push(b.pnr);
        }
      }
    } catch (err) {
      console.warn("Database processFlightArrivalAndCompletion failed; memory updated.", err);
    }
  }

  await logAuditEvent({
    action: "JOURNEY_COMPLETED",
    entity: "FLIGHT",
    entityId: flight.flightNumber || flight.callsign,
    after: {
      flightId: flight.id,
      completedPassengerCount: completedPnrs.length,
      completedPnrs: completedPnrs.slice(0, 10),
    },
  });

  return {
    success: true,
    completedCount: completedPnrs.length,
    flightNumber: flight.flightNumber || flight.callsign,
    affectedPnrs: completedPnrs,
  };
}

