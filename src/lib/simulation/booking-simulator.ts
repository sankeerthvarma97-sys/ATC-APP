import type { BookingDTO, SeatClass } from "@/lib/domain";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { createBooking } from "@/lib/services/booking-service";
import { listFlights } from "@/lib/services/flight-service";
import { getRandomElement } from "./virtual-staff-generator";
import { getRushHourMultiplier } from "./logic";

const FIRST_NAMES = [
  "Aarav", "Aditi", "Ananya", "Arjun", "Bhavna", "Chetan", "Deepika", "Dev",
  "Divya", "Gaurav", "Harish", "Ishaan", "Kavita", "Kiran", "Madhav", "Manish",
  "Meera", "Neha", "Nikhil", "Pooja", "Pranav", "Priya", "Rahul", "Rakesh",
  "Riya", "Rohan", "Sanjay", "Shreya", "Siddharth", "Sneha", "Tanvi", "Varun",
  "Vikram", "Zoya", "Alex", "Elena", "Lucas", "Sophie", "Liam", "Emma"
];

const LAST_NAMES = [
  "Sharma", "Varma", "Patel", "Reddy", "Rao", "Gupta", "Nair", "Iyer",
  "Mehta", "Singh", "Kumar", "Chatterjee", "Bose", "Das", "Joshi", "Kulkarni",
  "Deshmukh", "Chopra", "Malhotra", "Kapoor", "Bhatia", "Saxena", "Menon", "Pillai",
  "Tanaka", "Mendoza", "Schmidt", "Dubois", "Al-Mansoor", "Chen", "Kim", "Smith"
];

const NATIONALITIES = ["IN", "IN", "IN", "IN", "IN", "AE", "SG", "GB", "US", "DE"];

export interface SimulatedPassengerData {
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  gender: "M" | "F";
  dateOfBirth: string;
}

export function generateSimulatedPassenger(): SimulatedPassengerData {
  const first = getRandomElement(FIRST_NAMES);
  const last = getRandomElement(LAST_NAMES);
  const fullName = `${first} ${last}`;
  const slug = `${first.toLowerCase()}.${last.toLowerCase()}.${Math.floor(100 + Math.random() * 900)}`;
  const email = `${slug}@sim.passenger.test`;
  const phone = `+91 ${Math.floor(90000 + Math.random() * 9999)} ${Math.floor(10000 + Math.random() * 89999)}`;
  const nationality = getRandomElement(NATIONALITIES);
  const gender: "M" | "F" = Math.random() > 0.5 ? "M" : "F";
  
  const birthYear = 1970 + Math.floor(Math.random() * 35);
  const birthMonth = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const birthDay = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  const dateOfBirth = `${birthYear}-${birthMonth}-${birthDay}`;

  return { fullName, email, phone, nationality, gender, dateOfBirth };
}

let cachedSimUserId: string | null = null;

/**
 * Ensure a dedicated simulation passenger user account exists for credit ledger tracking.
 */
export async function getOrCreateSimulationUser(): Promise<string> {
  if (cachedSimUserId) return cachedSimUserId;

  if (shouldUseDatabase()) {
    try {
      const existing = await prisma.user.findFirst({
        where: { email: "sim-passengers@aocc.test" },
        select: { id: true },
      });

      if (existing) {
        cachedSimUserId = existing.id;
        return existing.id;
      }

      const created = await prisma.user.create({
        data: {
          name: "Virtual Simulation Passenger Pool",
          email: "sim-passengers@aocc.test",
          role: "PASSENGER",
          creditBalance: 10000000.0, // Large credit pool for continuous 24/7 simulation
        },
        select: { id: true },
      });

      cachedSimUserId = created.id;
      return created.id;
    } catch (err) {
      console.warn("Could not find or create sim-passengers user in DB, using fallback", err);
    }
  }

  cachedSimUserId = "usr-sim-passengers";
  return cachedSimUserId;
}

export interface BookingTickResult {
  generatedCount: number;
  bookings: BookingDTO[];
  errors: string[];
}

/**
 * Execute one booking simulation step:
 * Selects active scheduled flights that have open seats, creates valid bookings with passenger records,
 * and debits virtual credit while tracking ledger transactions.
 */
export async function simulateBookingTick(options?: {
  maxBookings?: number;
  maxPerFlight?: number;
}): Promise<BookingTickResult> {
  const rush = getRushHourMultiplier();
  const rawMax = options?.maxBookings || 3;
  const maxBookings = Math.min(30, Math.max(1, Math.round(rawMax * rush.multiplier)));
  const maxPerFlight = options?.maxPerFlight || 180;
  const result: BookingTickResult = { generatedCount: 0, bookings: [], errors: [] };

  const simUserId = await getOrCreateSimulationUser();

  try {
    if (shouldUseDatabase()) {
      // Find flights with status SCHEDULED or BOARDING that still have available seats
      const candidateFlights = await prisma.flight.findMany({
        where: {
          status: { in: ["SCHEDULED", "BOARDING"] },
        },
        include: {
          seats: {
            where: { status: "AVAILABLE" },
            take: 10,
          },
          _count: {
            select: { bookings: true },
          },
        },
        take: 15,
      });

      const eligibleFlights = candidateFlights.filter(
        (f) => f._count.bookings < maxPerFlight && f.seats.length > 0
      );

      if (eligibleFlights.length === 0) {
        return result;
      }

      for (let i = 0; i < maxBookings; i++) {
        const flight = getRandomElement(eligibleFlights);
        if (!flight || flight.seats.length === 0) continue;

        // Pick an available seat
        const seat = flight.seats.pop();
        if (!seat) continue;

        const passenger = generateSimulatedPassenger();
        const travelClass: SeatClass = seat.seatClass as SeatClass;

        try {
          const booking = await createBooking({
            flightId: flight.id,
            seatNumber: seat.seatNumber,
            travelClass,
            passenger,
            useCredit: true,
            createdById: simUserId,
            actorName: "Virtual Booking Simulator",
          });

          result.bookings.push(booking);
          result.generatedCount++;

          // Create a simulation task for airport operations (e.g. checkin or baggage screening)
          const taskTypes = ["TICKET_CHECKIN", "SECURITY_SCREENING", "GATE_BOARDING"] as const;
          const assignedTaskType = getRandomElement(taskTypes);

          // Find a virtual staff member in ticketing or security
          const availableStaff = await prisma.employee.findFirst({
            where: {
              isVirtual: true,
              department: { in: ["TICKETING", "SECURITY", "PASSENGER_SERVICES"] },
              status: "ACTIVE",
            },
            select: { id: true },
          });

          if (availableStaff) {
            await prisma.simulationTask.create({
              data: {
                type: assignedTaskType,
                status: "PENDING",
                priority: "NORMAL",
                staffId: availableStaff.id,
                flightId: flight.id,
                targetEntity: "BOOKING",
                targetEntityId: booking.pnr,
                payload: {
                  passengerName: passenger.fullName,
                  seat: seat.seatNumber,
                  pnr: booking.pnr,
                },
              },
            }).catch(() => {}); // non-blocking task creation
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(`Booking failed for ${flight.callsign} (${seat.seatNumber}): ${msg}`);
        }
      }

      return result;
    }

    // In-memory fallback
    const flights = await listFlights();
    const activeFlights = flights.filter(
      (f) => f.status === "SCHEDULED" || f.status === "BOARDING"
    );

    if (activeFlights.length === 0) return result;

    for (let i = 0; i < maxBookings; i++) {
      const flight = getRandomElement(activeFlights);
      const passenger = generateSimulatedPassenger();
      const seatRow = Math.floor(1 + Math.random() * 25);
      const seatLetter = getRandomElement(["A", "B", "C", "D", "E", "F"]);
      const seatNumber = `${seatRow}${seatLetter}`;

      try {
        const booking = await createBooking({
          flightId: flight.id,
          seatNumber,
          travelClass: seatRow <= 3 ? "BUSINESS" : "ECONOMY",
          passenger,
          useCredit: true,
          createdById: simUserId,
          actorName: "Virtual Booking Simulator",
        });

        result.bookings.push(booking);
        result.generatedCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Memory booking failed: ${msg}`);
      }
    }

    return result;
  } catch (globalErr) {
    console.warn("simulateBookingTick error", globalErr);
    return result;
  }
}
