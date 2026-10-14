import type { FlightDTO, FlightStatus } from "@/lib/domain";
import type { FlightStatus as PrismaFlightStatus } from "@prisma/client";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { memoryFlights } from "./flight-service";
import { generateSeatsForFlight } from "./flight-service";

export interface ScheduledRouteTemplate {
  flightNumber: string;
  airline: string;
  aircraftType: string;
  origin: string; // HYD
  destination: string;
  depTimeIST: string; // "HH:mm" in 24h IST
  durationMinutes: number;
  operatingDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat (all days = [0,1,2,3,4,5,6])
  terminal: string;
  gate: string;
  runway: string;
  economyCapacity: number;
  businessCapacity: number;
  firstCapacity: number;
  economyFare: number;
  businessFare: number;
  firstFare: number;
}

// Authoritative Indian Domestic Routes from HYD / VOHS to other Indian States
// Educational simulation schedule
export const HYD_DOMESTIC_SCHEDULE_TEMPLATES: ScheduledRouteTemplate[] = [
  {
    flightNumber: "SC101",
    airline: "SkyConnect Airlines",
    aircraftType: "Airbus A320neo",
    origin: "HYD",
    destination: "BOM",
    depTimeIST: "06:15",
    durationMinutes: 90,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "B12",
    runway: "09L/27R",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 4500,
    businessFare: 8500,
    firstFare: 15000,
  },
  {
    flightNumber: "SC103",
    airline: "SkyConnect Airlines",
    aircraftType: "Airbus A321neo",
    origin: "HYD",
    destination: "DEL",
    depTimeIST: "07:30",
    durationMinutes: 135,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "A4",
    runway: "09L/27R",
    economyCapacity: 180,
    businessCapacity: 24,
    firstCapacity: 0,
    economyFare: 5400,
    businessFare: 9800,
    firstFare: 18000,
  },
  {
    flightNumber: "AV201",
    airline: "AeroVista",
    aircraftType: "Boeing 737-800",
    origin: "HYD",
    destination: "BLR",
    depTimeIST: "08:20",
    durationMinutes: 70,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "C2",
    runway: "09R/27L",
    economyCapacity: 162,
    businessCapacity: 16,
    firstCapacity: 0,
    economyFare: 3800,
    businessFare: 7600,
    firstFare: 14000,
  },
  {
    flightNumber: "BH301",
    airline: "Blue Horizon Air",
    aircraftType: "Airbus A320",
    origin: "HYD",
    destination: "MAA",
    depTimeIST: "09:45",
    durationMinutes: 75,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "B6",
    runway: "09L/27R",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 4100,
    businessFare: 7900,
    firstFare: 14500,
  },
  {
    flightNumber: "NV401",
    airline: "Nova Airways",
    aircraftType: "Airbus A321",
    origin: "HYD",
    destination: "CCU",
    depTimeIST: "11:10",
    durationMinutes: 130,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "A10",
    runway: "09L/27R",
    economyCapacity: 180,
    businessCapacity: 24,
    firstCapacity: 0,
    economyFare: 5900,
    businessFare: 10500,
    firstFare: 19000,
  },
  {
    flightNumber: "SC105",
    airline: "SkyConnect Airlines",
    aircraftType: "Airbus A320neo",
    origin: "HYD",
    destination: "COK",
    depTimeIST: "12:40",
    durationMinutes: 115,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "B12",
    runway: "09R/27L",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 4700,
    businessFare: 8900,
    firstFare: 16000,
  },
  {
    flightNumber: "AV203",
    airline: "AeroVista",
    aircraftType: "Boeing 737-800",
    origin: "HYD",
    destination: "GOI",
    depTimeIST: "14:15",
    durationMinutes: 75,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "C1",
    runway: "09L/27R",
    economyCapacity: 162,
    businessCapacity: 16,
    firstCapacity: 0,
    economyFare: 3900,
    businessFare: 7800,
    firstFare: 14200,
  },
  {
    flightNumber: "BH303",
    airline: "Blue Horizon Air",
    aircraftType: "Airbus A320",
    origin: "HYD",
    destination: "PNQ",
    depTimeIST: "15:30",
    durationMinutes: 75,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "B4",
    runway: "09L/27R",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 4300,
    businessFare: 8200,
    firstFare: 15000,
  },
  {
    flightNumber: "NV403",
    airline: "Nova Airways",
    aircraftType: "Airbus A321",
    origin: "HYD",
    destination: "AMD",
    depTimeIST: "17:00",
    durationMinutes: 115,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "A12",
    runway: "09R/27L",
    economyCapacity: 180,
    businessCapacity: 24,
    firstCapacity: 0,
    economyFare: 4600,
    businessFare: 8800,
    firstFare: 16200,
  },
  {
    flightNumber: "SC107",
    airline: "SkyConnect Airlines",
    aircraftType: "Airbus A320neo",
    origin: "HYD",
    destination: "JAI",
    depTimeIST: "18:25",
    durationMinutes: 125,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "B24",
    runway: "09L/27R",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 5100,
    businessFare: 9400,
    firstFare: 17500,
  },
  {
    flightNumber: "IS503",
    airline: "IndianSky Simulation Airlines",
    aircraftType: "Boeing 737-800",
    origin: "HYD",
    destination: "VTZ",
    depTimeIST: "19:50",
    durationMinutes: 65,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "A2",
    runway: "09L/27R",
    economyCapacity: 160,
    businessCapacity: 18,
    firstCapacity: 0,
    economyFare: 2900,
    businessFare: 6200,
    firstFare: 11500,
  },
  {
    flightNumber: "AV205",
    airline: "AeroVista",
    aircraftType: "Airbus A320neo",
    origin: "HYD",
    destination: "TIR",
    depTimeIST: "21:10",
    durationMinutes: 60,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "C3",
    runway: "09R/27L",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 2600,
    businessFare: 5800,
    firstFare: 11000,
  },
  {
    flightNumber: "BH307",
    airline: "Blue Horizon Air",
    aircraftType: "Airbus A320",
    origin: "HYD",
    destination: "LKO",
    depTimeIST: "22:15",
    durationMinutes: 120,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "B8",
    runway: "09L/27R",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 4900,
    businessFare: 9100,
    firstFare: 16800,
  },
  {
    flightNumber: "NV405",
    airline: "Nova Airways",
    aircraftType: "Airbus A321",
    origin: "HYD",
    destination: "BBI",
    depTimeIST: "23:05",
    durationMinutes: 110,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    terminal: "T1",
    gate: "A6",
    runway: "09R/27L",
    economyCapacity: 180,
    businessCapacity: 24,
    firstCapacity: 0,
    economyFare: 4200,
    businessFare: 8300,
    firstFare: 15200,
  },
];

/**
 * Convert a date string (YYYY-MM-DD) and an IST time ("HH:mm") into a UTC Date object.
 * IST is UTC+05:30.
 */
export function parseIstDateTimeToUtc(dateStr: string, timeStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const [hourStr, minuteStr] = timeStr.split(":");

  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10) - 1;
  const day = Number.parseInt(dayStr, 10);
  const hour = Number.parseInt(hourStr, 10);
  const minute = Number.parseInt(minuteStr, 10);

  // UTC equivalent: subtract 5 hours 30 minutes (330 minutes)
  const utcDate = new Date(Date.UTC(year, month, day, hour, minute));
  utcDate.setUTCMinutes(utcDate.getUTCMinutes() - 330);
  return utcDate;
}

/**
 * Format a Date object to "YYYY-MM-DD" in Indian Standard Time (UTC+05:30).
 */
export function getIstDateString(date: Date = new Date()): string {
  const istDate = new Date(date.getTime() + 330 * 60_000);
  return istDate.toISOString().slice(0, 10);
}

export interface GenerateScheduleOptions {
  startDate?: string; // YYYY-MM-DD in IST (default: today IST)
  daysAhead?: number; // default: 3, max: 14
  overwrite?: boolean;
}

export interface GeneratedScheduleSummary {
  success: boolean;
  startDate: string;
  endDate: string;
  totalFlightsGenerated: number;
  totalFlightsSkipped: number;
  flights: FlightDTO[];
}

/**
 * Generates recurring daily domestic flight schedules for Hyderabad (HYD / VOHS).
 * Completely idempotent: running for the same date does not create duplicates.
 */
export async function generateHydDailySchedule(
  options?: GenerateScheduleOptions
): Promise<GeneratedScheduleSummary> {
  const startDateStr = options?.startDate || getIstDateString();
  const daysAhead = Math.min(14, Math.max(1, options?.daysAhead || 3));

  let generatedCount = 0;
  let skippedCount = 0;
  const generatedFlights: FlightDTO[] = [];

  const startUtc = parseIstDateTimeToUtc(startDateStr, "00:00");

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const currentIstDateObj = new Date(startUtc.getTime() + dayOffset * 24 * 3600_000 + 330 * 60_000);
    const currentDateStr = currentIstDateObj.toISOString().slice(0, 10);
    const dayOfWeek = currentIstDateObj.getUTCDay();

    for (const template of HYD_DOMESTIC_SCHEDULE_TEMPLATES) {
      if (!template.operatingDays.includes(dayOfWeek)) {
        continue;
      }

      // Stable flight identifier for this specific day and route
      const stableFlightId = `flt-hyd-${template.flightNumber.toLowerCase()}-${currentDateStr}`;
      const stableCallsign = `${template.flightNumber}-${currentDateStr.replace(/-/g, "").slice(2)}`;

      const depDateUtc = parseIstDateTimeToUtc(currentDateStr, template.depTimeIST);
      const arrDateUtc = new Date(depDateUtc.getTime() + template.durationMinutes * 60_000);

      const boardingUtc = new Date(depDateUtc.getTime() - 35 * 60_000);
      const checkInCloseUtc = new Date(depDateUtc.getTime() - 25 * 60_000);

      // Determine initial operational status based on time relative to now
      const now = new Date();
      let initialStatus: FlightStatus = "SCHEDULED";
      let phase = "Simulated Domestic Scheduled Flight";

      if (now.getTime() >= arrDateUtc.getTime()) {
        initialStatus = "COMPLETED";
        phase = "Completed flight segment (Turnaround finished)";
      } else if (now.getTime() >= depDateUtc.getTime()) {
        initialStatus = "DEPARTED";
        phase = "En-route to destination";
      } else if (now.getTime() >= boardingUtc.getTime()) {
        initialStatus = "BOARDING";
        phase = `Boarding active at Gate ${template.gate}`;
      }

      const totalCap = template.economyCapacity + template.businessCapacity + template.firstCapacity;

      const flightDTO: FlightDTO = {
        id: stableFlightId,
        callsign: stableCallsign,
        flightNumber: template.flightNumber,
        flightName: `${template.airline} ${template.flightNumber} (Simulated)`,
        airline: template.airline,
        aircraftType: template.aircraftType,
        status: initialStatus,
        phase,
        origin: template.origin,
        destination: template.destination,
        gate: template.gate,
        stand: template.gate,
        runway: template.runway,
        squawk: `5${Math.floor(100 + Math.random() * 899)}`,
        latitude: 17.2403,
        longitude: 78.4294,
        altitudeFt: 0,
        speedKt: 0,
        headingDeg: 90,
        verticalSpeedFpm: 0,
        fuelKg: 10500,
        riskScore: 10,
        eta: arrDateUtc.toISOString(),
        departureTime: depDateUtc.toISOString(),
        arrivalTime: arrDateUtc.toISOString(),
        boardingTime: boardingUtc.toISOString(),
        checkInCloseTime: checkInCloseUtc.toISOString(),
        terminal: template.terminal,
        economyCapacity: template.economyCapacity,
        businessCapacity: template.businessCapacity,
        firstCapacity: template.firstCapacity,
        economyFare: template.economyFare,
        businessFare: template.businessFare,
        firstFare: template.firstFare,
        availableSeats: totalCap,
        updatedAt: new Date().toISOString(),
      };

      if (shouldUseDatabase()) {
        try {
          const existing = await prisma.flight.findFirst({
            where: {
              OR: [
                { id: stableFlightId },
                { callsign: stableCallsign },
                {
                  AND: [
                    { flightNumber: template.flightNumber },
                    { departureTime: { gte: parseIstDateTimeToUtc(currentDateStr, "00:00"), lte: parseIstDateTimeToUtc(currentDateStr, "23:59") } },
                  ],
                },
              ],
            },
          });

          if (existing && !options?.overwrite) {
            skippedCount++;
            continue;
          }

          if (existing && options?.overwrite) {
            await prisma.flight.update({
              where: { id: existing.id },
              data: {
                status: (initialStatus === "DEPARTED" ? "AIRBORNE" : initialStatus === "COMPLETED" ? "ARRIVED" : initialStatus) as PrismaFlightStatus,
                phase,
                departureTime: depDateUtc,
                arrivalTime: arrDateUtc,
                boardingTime: boardingUtc,
                checkInCloseTime: checkInCloseUtc,
                updatedAt: new Date(),
              },
            });
            generatedCount++;
            generatedFlights.push(flightDTO);
            continue;
          }

          await prisma.flight.create({
            data: {
              id: stableFlightId,
              callsign: stableCallsign,
              flightNumber: template.flightNumber,
              flightName: flightDTO.flightName,
              airline: template.airline,
              aircraftType: template.aircraftType,
              status: (initialStatus === "DEPARTED" ? "AIRBORNE" : initialStatus === "COMPLETED" ? "ARRIVED" : initialStatus) as PrismaFlightStatus,
              phase,
              origin: template.origin,
              destination: template.destination,
              gate: template.gate,
              stand: template.gate,
              runway: template.runway,
              squawk: flightDTO.squawk,
              latitude: flightDTO.latitude,
              longitude: flightDTO.longitude,
              altitudeFt: 0,
              speedKt: 0,
              headingDeg: 90,
              verticalSpeedFpm: 0,
              fuelKg: flightDTO.fuelKg,
              riskScore: 10,
              eta: arrDateUtc,
              departureTime: depDateUtc,
              arrivalTime: arrDateUtc,
              boardingTime: boardingUtc,
              checkInCloseTime: checkInCloseUtc,
              terminal: template.terminal,
              economyCapacity: template.economyCapacity,
              businessCapacity: template.businessCapacity,
              firstCapacity: template.firstCapacity,
              economyFare: template.economyFare,
              businessFare: template.businessFare,
              firstFare: template.firstFare,
            },
          });

          generatedCount++;
          generatedFlights.push(flightDTO);
          continue;
        } catch (err) {
          console.warn(`Database insert for ${stableFlightId} failed; registering in memory.`, err);
        }
      }

      // In-Memory Storage check (Idempotent)
      const existingMemIndex = memoryFlights.findIndex(
        (f) =>
          f.id === stableFlightId ||
          f.callsign === stableCallsign ||
          (f.flightNumber === template.flightNumber &&
            f.departureTime &&
            getIstDateString(new Date(f.departureTime)) === currentDateStr)
      );

      if (existingMemIndex >= 0) {
        if (options?.overwrite) {
          memoryFlights[existingMemIndex] = flightDTO;
          generatedCount++;
          generatedFlights.push(flightDTO);
        } else {
          skippedCount++;
        }
      } else {
        generateSeatsForFlight(
          stableFlightId,
          template.economyCapacity,
          template.businessCapacity,
          template.firstCapacity
        );
        memoryFlights.unshift(flightDTO);
        generatedCount++;
        generatedFlights.push(flightDTO);
      }
    }
  }

  const endUtc = new Date(startUtc.getTime() + (daysAhead - 1) * 24 * 3600_000 + 330 * 60_000);

  return {
    success: true,
    startDate: startDateStr,
    endDate: endUtc.toISOString().slice(0, 10),
    totalFlightsGenerated: generatedCount,
    totalFlightsSkipped: skippedCount,
    flights: generatedFlights,
  };
}
