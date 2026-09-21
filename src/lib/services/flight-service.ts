import type { FlightDTO, FlightStatus, SeatDTO } from "@/lib/domain";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { logAuditEvent } from "./audit-service";
import { initialAirports } from "./fleet-service";

export interface CreateFlightInput {
  flightName: string;
  flightNumber: string;
  airline: string;
  aircraftType: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  flightDuration?: string;
  terminal?: string;
  gate?: string;
  runway?: string;
  economyCapacity?: number;
  businessCapacity?: number;
  firstCapacity?: number;
  economyFare?: number;
  businessFare?: number;
  firstFare?: number;
  status?: FlightStatus;
  boardingTime?: string;
  checkInCloseTime?: string;
  airlineId?: string;
  aircraftId?: string;
  actorId?: string;
  actorName?: string;
}

export interface FlightSearchCriteria {
  origin?: string;
  destination?: string;
  date?: string;
  travelClass?: "ECONOMY" | "BUSINESS" | "FIRST";
  status?: string;
  query?: string;
}

// Global in-memory storage for flights and seats (used when DB is off or as supplementary cache)
const memoryFlights: FlightDTO[] = [
  {
    id: "flt-sc101",
    callsign: "SC101",
    flightNumber: "SC101",
    flightName: "SkyConnect 101",
    airline: "SkyConnect Airlines",
    aircraftType: "Airbus A320neo",
    status: "SCHEDULED",
    phase: "Pre-flight boarding preparation",
    origin: "HYD",
    destination: "BOM",
    gate: "B12",
    stand: "B12",
    runway: "09L/27R",
    squawk: "4210",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 90,
    verticalSpeedFpm: 0,
    fuelKg: 7800,
    riskScore: 12,
    eta: new Date(Date.now() + 100 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 45 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 145 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 20 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 15 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 4500,
    businessFare: 8500,
    firstFare: 15000,
    availableSeats: 168,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-av202",
    callsign: "AV202",
    flightNumber: "AV202",
    flightName: "AeroVista 202",
    airline: "AeroVista",
    aircraftType: "Boeing 737-800",
    status: "SCHEDULED",
    phase: "Gate check-in active",
    origin: "DEL",
    destination: "BLR",
    gate: "C2",
    stand: "C2",
    runway: "28/10",
    squawk: "5312",
    latitude: 28.5562,
    longitude: 77.1000,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 190,
    verticalSpeedFpm: 0,
    fuelKg: 11200,
    riskScore: 16,
    eta: new Date(Date.now() + 160 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 60 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 220 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 35 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 30 * 60_000).toISOString(),
    terminal: "T3",
    economyCapacity: 162,
    businessCapacity: 16,
    firstCapacity: 0,
    economyFare: 5200,
    businessFare: 9800,
    firstFare: 18000,
    availableSeats: 175,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-bh305",
    callsign: "BH305",
    flightNumber: "BH305",
    flightName: "Blue Horizon 305",
    airline: "Blue Horizon Air",
    aircraftType: "Airbus A320",
    status: "BOARDING",
    phase: "Passenger boarding at gate B6",
    origin: "MAA",
    destination: "CCU",
    gate: "B6",
    stand: "B6",
    runway: "07/25",
    squawk: "6144",
    latitude: 12.9941,
    longitude: 80.1709,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 45,
    verticalSpeedFpm: 0,
    fuelKg: 8900,
    riskScore: 20,
    eta: new Date(Date.now() + 130 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 15 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 145 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() - 10 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() - 5 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 4800,
    businessFare: 8900,
    firstFare: 16000,
    availableSeats: 142,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-nv412",
    callsign: "NV412",
    flightNumber: "NV412",
    flightName: "Nova Airways 412",
    airline: "Nova Airways",
    aircraftType: "Airbus A321",
    status: "DEPARTING",
    phase: "Takeoff roll clearance",
    origin: "COK",
    destination: "GOI",
    gate: "B2",
    stand: "B2",
    runway: "27",
    squawk: "3411",
    latitude: 10.1520,
    longitude: 76.4019,
    altitudeFt: 1500,
    speedKt: 160,
    headingDeg: 340,
    verticalSpeedFpm: 1200,
    fuelKg: 9500,
    riskScore: 25,
    eta: new Date(Date.now() + 55 * 60_000).toISOString(),
    departureTime: new Date(Date.now() - 5 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 55 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 180,
    businessCapacity: 24,
    firstCapacity: 0,
    economyFare: 3600,
    businessFare: 7200,
    firstFare: 12000,
    availableSeats: 150,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-is501",
    callsign: "IS501",
    flightNumber: "IS501",
    flightName: "IndianSky 501",
    airline: "IndianSky Simulation Airlines",
    aircraftType: "Boeing 777-200ER",
    status: "AIRBORNE",
    phase: "En-route cruising level FL340",
    origin: "HYD",
    destination: "DXB",
    gate: "A10",
    stand: "A10",
    runway: "09L/27R",
    squawk: "7214",
    latitude: 20.8420,
    longitude: 68.4220,
    altitudeFt: 34000,
    speedKt: 460,
    headingDeg: 290,
    verticalSpeedFpm: 0,
    fuelKg: 38400,
    riskScore: 18,
    eta: new Date(Date.now() + 110 * 60_000).toISOString(),
    departureTime: new Date(Date.now() - 70 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 110 * 60_000).toISOString(),
    terminal: "T2",
    economyCapacity: 260,
    businessCapacity: 40,
    firstCapacity: 12,
    economyFare: 14500,
    businessFare: 32000,
    firstFare: 65000,
    availableSeats: 210,
    updatedAt: new Date().toISOString(),
  },
];

// Seat storage keyed by flightId
export const memorySeatMap: Map<string, SeatDTO[]> = new Map();

export function generateSeatsForFlight(flightId: string, economyCap = 150, businessCap = 20, firstCap = 0): SeatDTO[] {
  const seats: SeatDTO[] = [];

  // First class rows (if any)
  let row = 1;
  if (firstCap > 0) {
    const firstRows = Math.ceil(firstCap / 4);
    for (let r = 0; r < firstRows; r++, row++) {
      for (const col of ["A", "D"]) {
        seats.push({
          id: `seat-${flightId}-${row}${col}`,
          flightId,
          seatNumber: `${row}${col}`,
          seatClass: "FIRST",
          status: "AVAILABLE",
          price: 15000,
        });
      }
    }
  }

  // Business class rows (2-2 config: A, C - aisle - D, F)
  const businessRows = Math.ceil(businessCap / 4);
  for (let r = 0; r < businessRows; r++, row++) {
    for (const col of ["A", "C", "D", "F"]) {
      seats.push({
        id: `seat-${flightId}-${row}${col}`,
        flightId,
        seatNumber: `${row}${col}`,
        seatClass: "BUSINESS",
        status: "AVAILABLE",
        price: 8500,
      });
    }
  }

  // Economy class rows (3-3 config: A, B, C - aisle - D, E, F)
  const economyRows = Math.ceil(economyCap / 6);
  for (let r = 0; r < economyRows; r++, row++) {
    for (const col of ["A", "B", "C", "D", "E", "F"]) {
      seats.push({
        id: `seat-${flightId}-${row}${col}`,
        flightId,
        seatNumber: `${row}${col}`,
        seatClass: "ECONOMY",
        status: "AVAILABLE",
        price: 4500,
      });
    }
  }

  // Seed a few realistically occupied seats
  if (seats.length > 5) {
    seats[2].status = "OCCUPIED";
    seats[6].status = "OCCUPIED";
    seats[14].status = "OCCUPIED";
    seats[22].status = "RESERVED";
  }

  return seats;
}

// Pre-populate memory seat maps for initial flights
for (const flt of memoryFlights) {
  memorySeatMap.set(
    flt.id,
    generateSeatsForFlight(flt.id, flt.economyCapacity ?? 150, flt.businessCapacity ?? 20, flt.firstCapacity ?? 0),
  );
}

export interface PagedFlightResult {
  flights: FlightDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listFlightsPaged(
  criteria?: FlightSearchCriteria & { page?: number; pageSize?: number }
): Promise<PagedFlightResult> {
  const page = Math.max(1, criteria?.page || 1);
  const pageSize = Math.min(100, Math.max(1, criteria?.pageSize || 20));
  const skip = (page - 1) * pageSize;

  if (shouldUseDatabase()) {
    try {
      const where: Record<string, unknown> = {};
      if (criteria?.origin && criteria.origin !== "ALL") where.origin = criteria.origin;
      if (criteria?.destination && criteria.destination !== "ALL") where.destination = criteria.destination;
      if (criteria?.status && criteria.status !== "ALL") where.status = criteria.status;
      if (criteria?.query) {
        where.OR = [
          { callsign: { contains: criteria.query, mode: "insensitive" } },
          { airline: { contains: criteria.query, mode: "insensitive" } },
          { flightNumber: { contains: criteria.query, mode: "insensitive" } },
        ];
      }

      const [total, dbFlights] = await Promise.all([
        prisma.flight.count({ where }),
        prisma.flight.findMany({
          where,
          orderBy: { departureTime: "asc" },
          skip,
          take: pageSize,
          include: {
            seats: {
              where: { status: "AVAILABLE" },
              select: { id: true },
            },
          },
        }),
      ]);

      const flights = dbFlights.map((f) => ({
        id: f.id,
        callsign: f.callsign,
        flightNumber: f.flightNumber ?? f.callsign,
        flightName: f.flightName ?? `${f.airline} ${f.flightNumber ?? f.callsign}`,
        airline: f.airline,
        aircraftType: f.aircraftType,
        status: f.status as FlightStatus,
        phase: f.phase,
        origin: f.origin,
        destination: f.destination,
        gate: f.gate ?? undefined,
        stand: f.stand ?? undefined,
        runway: f.runway ?? undefined,
        squawk: f.squawk,
        latitude: f.latitude,
        longitude: f.longitude,
        altitudeFt: f.altitudeFt,
        speedKt: f.speedKt,
        headingDeg: f.headingDeg,
        verticalSpeedFpm: f.verticalSpeedFpm,
        fuelKg: f.fuelKg,
        riskScore: f.riskScore,
        eta: f.eta.toISOString(),
        departureTime: f.departureTime?.toISOString(),
        arrivalTime: f.arrivalTime?.toISOString(),
        boardingTime: f.boardingTime?.toISOString(),
        checkInCloseTime: f.checkInCloseTime?.toISOString(),
        terminal: f.terminal ?? undefined,
        economyCapacity: f.economyCapacity,
        businessCapacity: f.businessCapacity,
        firstCapacity: f.firstCapacity,
        economyFare: f.economyFare,
        businessFare: f.businessFare,
        firstFare: f.firstFare,
        availableSeats: f.seats.length || (f.economyCapacity + f.businessCapacity - 5),
        updatedAt: f.updatedAt.toISOString(),
      }));

      return {
        flights,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    } catch (error) {
      console.warn("Database flight query failed; falling back to memory.", error);
    }
  }

  let result = [...memoryFlights];
  if (criteria?.origin && criteria.origin !== "ALL") {
    result = result.filter((f) => f.origin.toUpperCase() === criteria.origin?.toUpperCase());
  }
  if (criteria?.destination && criteria.destination !== "ALL") {
    result = result.filter((f) => f.destination.toUpperCase() === criteria.destination?.toUpperCase());
  }
  if (criteria?.status && criteria.status !== "ALL") {
    result = result.filter((f) => f.status === criteria.status);
  }
  if (criteria?.query) {
    const q = criteria.query.toLowerCase();
    result = result.filter(
      (f) =>
        f.callsign.toLowerCase().includes(q) ||
        f.airline.toLowerCase().includes(q) ||
        (f.flightNumber && f.flightNumber.toLowerCase().includes(q)),
    );
  }

  const total = result.length;
  const paged = result.slice(skip, skip + pageSize);
  return {
    flights: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function listFlights(criteria?: FlightSearchCriteria): Promise<FlightDTO[]> {
  const paged = await listFlightsPaged({ ...criteria, page: 1, pageSize: 100 });
  return paged.flights;
}

export async function getFlightById(id: string): Promise<{ flight: FlightDTO; seats: SeatDTO[] } | null> {
  if (shouldUseDatabase()) {
    try {
      const f = await prisma.flight.findFirst({
        where: { OR: [{ id }, { callsign: id }, { flightNumber: id }] },
        include: { seats: true },
      });

      if (f) {
        const flightDTO: FlightDTO = {
          id: f.id,
          callsign: f.callsign,
          flightNumber: f.flightNumber ?? f.callsign,
          flightName: f.flightName ?? `${f.airline} ${f.callsign}`,
          airline: f.airline,
          aircraftType: f.aircraftType,
          status: f.status as FlightStatus,
          phase: f.phase,
          origin: f.origin,
          destination: f.destination,
          gate: f.gate ?? undefined,
          stand: f.stand ?? undefined,
          runway: f.runway ?? undefined,
          squawk: f.squawk,
          latitude: f.latitude,
          longitude: f.longitude,
          altitudeFt: f.altitudeFt,
          speedKt: f.speedKt,
          headingDeg: f.headingDeg,
          verticalSpeedFpm: f.verticalSpeedFpm,
          fuelKg: f.fuelKg,
          riskScore: f.riskScore,
          eta: f.eta.toISOString(),
          departureTime: f.departureTime?.toISOString(),
          arrivalTime: f.arrivalTime?.toISOString(),
          boardingTime: f.boardingTime?.toISOString(),
          checkInCloseTime: f.checkInCloseTime?.toISOString(),
          terminal: f.terminal ?? undefined,
          economyCapacity: f.economyCapacity,
          businessCapacity: f.businessCapacity,
          firstCapacity: f.firstCapacity,
          economyFare: f.economyFare,
          businessFare: f.businessFare,
          firstFare: f.firstFare,
          availableSeats: f.seats.filter((s) => s.status === "AVAILABLE").length,
          updatedAt: f.updatedAt.toISOString(),
        };

        const seatsDTO: SeatDTO[] = f.seats.map((s) => ({
          id: s.id,
          flightId: s.flightId,
          seatNumber: s.seatNumber,
          seatClass: s.seatClass,
          status: s.status,
          passengerId: s.passengerId ?? undefined,
          bookingId: s.bookingId ?? undefined,
        }));

        return { flight: flightDTO, seats: seatsDTO };
      }
    } catch (error) {
      console.warn("Database getFlightById failed; using memory.", error);
    }
  }

  const flight = memoryFlights.find((f) => f.id === id || f.callsign === id || f.flightNumber === id);
  if (!flight) return null;

  let seats = memorySeatMap.get(flight.id);
  if (!seats) {
    seats = generateSeatsForFlight(flight.id, flight.economyCapacity ?? 150, flight.businessCapacity ?? 20, flight.firstCapacity ?? 0);
    memorySeatMap.set(flight.id, seats);
  }

  return { flight, seats };
}

export async function createFlight(input: CreateFlightInput): Promise<FlightDTO> {
  const originAirport = initialAirports.find((a) => a.iata === input.origin);
  const lat = originAirport ? originAirport.latitude : 17.2403;
  const lon = originAirport ? originAirport.longitude : 78.4294;

  const id = `flt-${input.flightNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`;
  const squawk = Math.floor(1000 + Math.random() * 6777).toString();

  const flightDTO: FlightDTO = {
    id,
    callsign: input.flightNumber,
    flightNumber: input.flightNumber,
    flightName: input.flightName || `${input.airline} ${input.flightNumber}`,
    airline: input.airline,
    aircraftType: input.aircraftType,
    status: input.status || "SCHEDULED",
    phase: "Flight scheduled in system",
    origin: input.origin.toUpperCase(),
    destination: input.destination.toUpperCase(),
    gate: input.gate || "B12",
    stand: input.gate || "B12",
    runway: input.runway || "09L",
    squawk,
    latitude: lat,
    longitude: lon,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 90,
    verticalSpeedFpm: 0,
    fuelKg: 10000,
    riskScore: 10,
    eta: input.arrivalTime,
    departureTime: input.departureTime,
    arrivalTime: input.arrivalTime,
    boardingTime: input.boardingTime,
    checkInCloseTime: input.checkInCloseTime,
    terminal: input.terminal || "T1",
    economyCapacity: input.economyCapacity ?? 150,
    businessCapacity: input.businessCapacity ?? 20,
    firstCapacity: input.firstCapacity ?? 0,
    economyFare: input.economyFare ?? 4500,
    businessFare: input.businessFare ?? 8500,
    firstFare: input.firstFare ?? 15000,
    availableSeats: (input.economyCapacity ?? 150) + (input.businessCapacity ?? 20) + (input.firstCapacity ?? 0),
    updatedAt: new Date().toISOString(),
  };

  // Generate seats
  const seats = generateSeatsForFlight(
    id,
    flightDTO.economyCapacity ?? 150,
    flightDTO.businessCapacity ?? 20,
    flightDTO.firstCapacity ?? 0,
  );
  memorySeatMap.set(id, seats);
  memoryFlights.unshift(flightDTO);

  if (shouldUseDatabase()) {
    try {
      await prisma.flight.create({
        data: {
          id: flightDTO.id,
          callsign: flightDTO.callsign,
          flightNumber: flightDTO.flightNumber,
          flightName: flightDTO.flightName,
          airline: flightDTO.airline,
          aircraftType: flightDTO.aircraftType,
          status: flightDTO.status,
          phase: flightDTO.phase,
          origin: flightDTO.origin,
          destination: flightDTO.destination,
          gate: flightDTO.gate,
          stand: flightDTO.stand,
          runway: flightDTO.runway,
          squawk: flightDTO.squawk,
          latitude: flightDTO.latitude,
          longitude: flightDTO.longitude,
          altitudeFt: flightDTO.altitudeFt,
          speedKt: flightDTO.speedKt,
          headingDeg: flightDTO.headingDeg,
          verticalSpeedFpm: flightDTO.verticalSpeedFpm,
          fuelKg: flightDTO.fuelKg,
          riskScore: flightDTO.riskScore,
          eta: new Date(flightDTO.eta),
          departureTime: new Date(flightDTO.departureTime!),
          arrivalTime: new Date(flightDTO.arrivalTime!),
          boardingTime: flightDTO.boardingTime ? new Date(flightDTO.boardingTime) : null,
          checkInCloseTime: flightDTO.checkInCloseTime ? new Date(flightDTO.checkInCloseTime) : null,
          terminal: flightDTO.terminal,
          economyCapacity: flightDTO.economyCapacity,
          businessCapacity: flightDTO.businessCapacity,
          firstCapacity: flightDTO.firstCapacity,
          economyFare: flightDTO.economyFare,
          businessFare: flightDTO.businessFare,
          firstFare: flightDTO.firstFare,
          seats: {
            create: seats.map((s) => ({
              id: s.id,
              seatNumber: s.seatNumber,
              seatClass: s.seatClass,
              status: s.status,
            })),
          },
        },
      });
    } catch (error) {
      console.warn("Database createFlight failed; stored in memory.", error);
    }
  }

  await logAuditEvent({
    actorId: input.actorId,
    actorName: input.actorName,
    action: "ADMIN_CREATED_FLIGHT",
    entity: "FLIGHT",
    entityId: flightDTO.flightNumber,
    after: {
      flightNumber: flightDTO.flightNumber,
      route: `${flightDTO.origin} -> ${flightDTO.destination}`,
      airline: flightDTO.airline,
      gate: flightDTO.gate,
      runway: flightDTO.runway,
    },
  });

  return flightDTO;
}

export async function updateFlightStatus(
  flightId: string,
  status: FlightStatus,
  actor?: { id?: string; name?: string },
): Promise<FlightDTO | null> {
  const flight = memoryFlights.find((f) => f.id === flightId || f.callsign === flightId);
  if (!flight) return null;

  const oldStatus = flight.status;
  flight.status = status;
  flight.updatedAt = new Date().toISOString();

  if (shouldUseDatabase()) {
    try {
      await prisma.flight.update({
        where: { id: flight.id },
        data: { status, updatedAt: new Date() },
      });
    } catch (error) {
      console.warn("Database flight status update failed; updated in memory.", error);
    }
  }

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "ADMIN_UPDATED_FLIGHT",
    entity: "FLIGHT",
    entityId: flight.flightNumber || flight.callsign,
    before: { status: oldStatus },
    after: { status },
  });

  return flight;
}
