import type { FlightDTO, FlightStatus, SeatDTO } from "@/lib/domain";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { logAuditEvent } from "./audit-service";
import { ensureDomesticAirports, initialAirports } from "./fleet-service";

const DOMESTIC_ONLY = process.env.AOCC_DOMESTIC_ONLY !== "false";

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
  bypassHydLock?: boolean;
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
  {
    id: "flt-sc103",
    callsign: "SC103",
    flightNumber: "SC103",
    flightName: "SkyConnect 103",
    airline: "SkyConnect Airlines",
    aircraftType: "Airbus A321neo",
    status: "SCHEDULED",
    phase: "Pre-flight boarding preparation",
    origin: "HYD",
    destination: "DEL",
    gate: "A4",
    stand: "A4",
    runway: "09L/27R",
    squawk: "4215",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 350,
    verticalSpeedFpm: 0,
    fuelKg: 9200,
    riskScore: 10,
    eta: new Date(Date.now() + 150 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 90 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 210 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 65 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 60 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 180,
    businessCapacity: 24,
    firstCapacity: 0,
    economyFare: 5400,
    businessFare: 9800,
    firstFare: 18000,
    availableSeats: 195,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-av201",
    callsign: "AV201",
    flightNumber: "AV201",
    flightName: "AeroVista 201",
    airline: "AeroVista",
    aircraftType: "Boeing 737-800",
    status: "SCHEDULED",
    phase: "Security check completed",
    origin: "HYD",
    destination: "BLR",
    gate: "C2",
    stand: "C2",
    runway: "09R/27L",
    squawk: "5318",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 180,
    verticalSpeedFpm: 0,
    fuelKg: 6400,
    riskScore: 8,
    eta: new Date(Date.now() + 120 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 60 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 130 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 35 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 30 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 162,
    businessCapacity: 16,
    firstCapacity: 0,
    economyFare: 3800,
    businessFare: 7400,
    firstFare: 14000,
    availableSeats: 170,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-bh301",
    callsign: "BH301",
    flightNumber: "BH301",
    flightName: "Blue Horizon 301",
    airline: "Blue Horizon Air",
    aircraftType: "Airbus A320",
    status: "SCHEDULED",
    phase: "Baggage loading in progress",
    origin: "HYD",
    destination: "MAA",
    gate: "B6",
    stand: "B6",
    runway: "09L/27R",
    squawk: "6150",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 140,
    verticalSpeedFpm: 0,
    fuelKg: 6800,
    riskScore: 11,
    eta: new Date(Date.now() + 140 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 75 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 150 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 50 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 45 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 4100,
    businessFare: 7800,
    firstFare: 15000,
    availableSeats: 162,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-nv401",
    callsign: "NV401",
    flightNumber: "NV401",
    flightName: "Nova Airways 401",
    airline: "Nova Airways",
    aircraftType: "Airbus A321",
    status: "SCHEDULED",
    phase: "Flight clearance filed",
    origin: "HYD",
    destination: "CCU",
    gate: "A10",
    stand: "A10",
    runway: "09L/27R",
    squawk: "3425",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 65,
    verticalSpeedFpm: 0,
    fuelKg: 8900,
    riskScore: 14,
    eta: new Date(Date.now() + 230 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 110 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 240 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 85 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 80 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 180,
    businessCapacity: 24,
    firstCapacity: 0,
    economyFare: 5900,
    businessFare: 11000,
    firstFare: 19000,
    availableSeats: 198,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-sc105",
    callsign: "SC105",
    flightNumber: "SC105",
    flightName: "SkyConnect 105",
    airline: "SkyConnect Airlines",
    aircraftType: "Airbus A320neo",
    status: "SCHEDULED",
    phase: "Crew briefing active",
    origin: "HYD",
    destination: "COK",
    gate: "B14",
    stand: "B14",
    runway: "09R/27L",
    squawk: "4220",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 200,
    verticalSpeedFpm: 0,
    fuelKg: 7500,
    riskScore: 12,
    eta: new Date(Date.now() + 245 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 130 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 250 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 105 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 100 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 4700,
    businessFare: 8900,
    firstFare: 16000,
    availableSeats: 165,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-av203",
    callsign: "AV203",
    flightNumber: "AV203",
    flightName: "AeroVista 203",
    airline: "AeroVista",
    aircraftType: "Boeing 737-800",
    status: "BOARDING",
    phase: "Gate boarding active",
    origin: "HYD",
    destination: "GOI",
    gate: "C1",
    stand: "C1",
    runway: "09L/27R",
    squawk: "5322",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 230,
    verticalSpeedFpm: 0,
    fuelKg: 6200,
    riskScore: 10,
    eta: new Date(Date.now() + 125 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 50 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 125 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 20 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 15 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 162,
    businessCapacity: 16,
    firstCapacity: 0,
    economyFare: 3900,
    businessFare: 7600,
    firstFare: 14500,
    availableSeats: 172,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-bh303",
    callsign: "BH303",
    flightNumber: "BH303",
    flightName: "Blue Horizon 303",
    airline: "Blue Horizon Air",
    aircraftType: "Airbus A320",
    status: "SCHEDULED",
    phase: "Ramp maintenance check OK",
    origin: "HYD",
    destination: "PNQ",
    gate: "B4",
    stand: "B4",
    runway: "09L/27R",
    squawk: "6155",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 290,
    verticalSpeedFpm: 0,
    fuelKg: 6100,
    riskScore: 9,
    eta: new Date(Date.now() + 155 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 80 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 155 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 55 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 50 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 4300,
    businessFare: 8100,
    firstFare: 15500,
    availableSeats: 160,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-nv403",
    callsign: "NV403",
    flightNumber: "NV403",
    flightName: "Nova Airways 403",
    airline: "Nova Airways",
    aircraftType: "Airbus A321",
    status: "SCHEDULED",
    phase: "Fuel upload verified",
    origin: "HYD",
    destination: "AMD",
    gate: "A12",
    stand: "A12",
    runway: "09R/27L",
    squawk: "3430",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 320,
    verticalSpeedFpm: 0,
    fuelKg: 7800,
    riskScore: 11,
    eta: new Date(Date.now() + 210 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 100 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 215 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 75 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 70 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 180,
    businessCapacity: 24,
    firstCapacity: 0,
    economyFare: 4600,
    businessFare: 8700,
    firstFare: 16500,
    availableSeats: 196,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-sc107",
    callsign: "SC107",
    flightNumber: "SC107",
    flightName: "SkyConnect 107",
    airline: "SkyConnect Airlines",
    aircraftType: "Airbus A320neo",
    status: "SCHEDULED",
    phase: "Flight manifest generated",
    origin: "HYD",
    destination: "JAI",
    gate: "B24",
    stand: "B24",
    runway: "09L/27R",
    squawk: "4225",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 345,
    verticalSpeedFpm: 0,
    fuelKg: 8300,
    riskScore: 12,
    eta: new Date(Date.now() + 265 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 140 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 265 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 115 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 110 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 5100,
    businessFare: 9500,
    firstFare: 17500,
    availableSeats: 164,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-is503",
    callsign: "IS503",
    flightNumber: "IS503",
    flightName: "IndianSky 503",
    airline: "IndianSky Simulation Airlines",
    aircraftType: "Boeing 737-800",
    status: "SCHEDULED",
    phase: "Gate boarding announced",
    origin: "HYD",
    destination: "VTZ",
    gate: "A2",
    stand: "A2",
    runway: "09L/27R",
    squawk: "7220",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 80,
    verticalSpeedFpm: 0,
    fuelKg: 5200,
    riskScore: 7,
    eta: new Date(Date.now() + 105 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 40 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 105 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 15 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 10 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 162,
    businessCapacity: 16,
    firstCapacity: 0,
    economyFare: 2900,
    businessFare: 5800,
    firstFare: 11500,
    availableSeats: 175,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-av205",
    callsign: "AV205",
    flightNumber: "AV205",
    flightName: "AeroVista 205",
    airline: "AeroVista",
    aircraftType: "Airbus A320neo",
    status: "SCHEDULED",
    phase: "Final call for passenger boarding",
    origin: "HYD",
    destination: "TIR",
    gate: "C3",
    stand: "C3",
    runway: "09R/27L",
    squawk: "5325",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 155,
    verticalSpeedFpm: 0,
    fuelKg: 4900,
    riskScore: 6,
    eta: new Date(Date.now() + 95 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 35 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 95 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 10 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 5 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 2600,
    businessFare: 5200,
    firstFare: 10500,
    availableSeats: 166,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-bh307",
    callsign: "BH307",
    flightNumber: "BH307",
    flightName: "Blue Horizon 307",
    airline: "Blue Horizon Air",
    aircraftType: "Airbus A320",
    status: "SCHEDULED",
    phase: "Security check active",
    origin: "HYD",
    destination: "LKO",
    gate: "B8",
    stand: "B8",
    runway: "09L/27R",
    squawk: "6160",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 15,
    verticalSpeedFpm: 0,
    fuelKg: 8100,
    riskScore: 11,
    eta: new Date(Date.now() + 240 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 120 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 245 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 95 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 90 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 150,
    businessCapacity: 20,
    firstCapacity: 0,
    economyFare: 4900,
    businessFare: 9200,
    firstFare: 17000,
    availableSeats: 163,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "flt-nv405",
    callsign: "NV405",
    flightNumber: "NV405",
    flightName: "Nova Airways 405",
    airline: "Nova Airways",
    aircraftType: "Airbus A321",
    status: "SCHEDULED",
    phase: "Pre-departure checklist OK",
    origin: "HYD",
    destination: "BBI",
    gate: "A6",
    stand: "A6",
    runway: "09R/27L",
    squawk: "3435",
    latitude: 17.2403,
    longitude: 78.4294,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 75,
    verticalSpeedFpm: 0,
    fuelKg: 7300,
    riskScore: 10,
    eta: new Date(Date.now() + 205 * 60_000).toISOString(),
    departureTime: new Date(Date.now() + 95 * 60_000).toISOString(),
    arrivalTime: new Date(Date.now() + 205 * 60_000).toISOString(),
    boardingTime: new Date(Date.now() + 70 * 60_000).toISOString(),
    checkInCloseTime: new Date(Date.now() + 65 * 60_000).toISOString(),
    terminal: "T1",
    economyCapacity: 180,
    businessCapacity: 24,
    firstCapacity: 0,
    economyFare: 4200,
    businessFare: 8200,
    firstFare: 15500,
    availableSeats: 198,
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
  const origin = input.origin.trim().toUpperCase();
  const destination = input.destination.trim().toUpperCase();

  if (origin === destination) {
    throw new Error(`Invalid route: Origin (${origin}) and destination (${destination}) cannot be identical.`);
  }

  if (!input.bypassHydLock && origin !== "HYD") {
    throw new Error("Flight creation policy violation: Domestic departure must be Hyderabad (HYD). Administrative override required to originate outside HYD.");
  }

  const depDate = new Date(input.departureTime);
  const arrDate = new Date(input.arrivalTime);

  if (isNaN(depDate.getTime()) || isNaN(arrDate.getTime())) {
    throw new Error("Invalid schedule timestamps: departureTime and arrivalTime must be valid ISO dates.");
  }

  if (arrDate.getTime() <= depDate.getTime()) {
    throw new Error("Invalid flight schedule: arrivalTime must be later than departureTime.");
  }

  const durationMin = (arrDate.getTime() - depDate.getTime()) / 60000;
  if (durationMin < 20) {
    throw new Error(`Flight duration is unrealistically short (${Math.round(durationMin)} min). Minimum flight duration is 20 minutes.`);
  }

  const [originAirport, destAirport] = shouldUseDatabase()
    ? await Promise.all([
        prisma.airport.findUnique({ where: { iata: origin } }),
        prisma.airport.findUnique({ where: { iata: destination } }),
      ])
    : [initialAirports.find((airport) => airport.iata === origin), initialAirports.find((airport) => airport.iata === destination)];
  if (!originAirport) {
    throw new Error(`Origin airport ${origin} is not registered.`);
  }
  if (!destAirport) {
    throw new Error(`Destination airport ${destination} is not registered.`);
  }
  if (originAirport.status !== "ACTIVE" || destAirport.status !== "ACTIVE") {
    throw new Error("Both route airports must be active.");
  }
  if (DOMESTIC_ONLY && (originAirport.country !== "India" || destAirport.country !== "India")) {
    throw new Error("International routes are disabled while domestic-only mode is active.");
  }

  const gate = input.gate || "B12";
  const runway = input.runway || "09L";
  const terminal = input.terminal || "T1";
  const flightNumber = input.flightNumber.trim().toUpperCase();
  const callsign = flightNumber;

  // Window for gate conflict check (aircraft turns around 45 min before departure to 15 min after)
  const gateWindowStart = new Date(depDate.getTime() - 45 * 60000);
  const gateWindowEnd = new Date(depDate.getTime() + 15 * 60000);

  // Window for runway departure slot (3 min buffer)
  const runwayWindowStart = new Date(depDate.getTime() - 3 * 60000);
  const runwayWindowEnd = new Date(depDate.getTime() + 3 * 60000);

  if (shouldUseDatabase()) {
    await ensureDomesticAirports();
    return await prisma.$transaction(async (tx) => {
      // Check 1: Duplicate flight number on same departure date/time
      const existingDuplicate = await tx.flight.findFirst({
        where: {
          flightNumber,
          departureTime: {
            gte: new Date(depDate.getTime() - 120 * 60000),
            lte: new Date(depDate.getTime() + 120 * 60000),
          },
          status: { notIn: ["CANCELLED"] },
        },
      });

      if (existingDuplicate) {
        throw new Error(
          `Conflict: Flight ${flightNumber} is already scheduled departing at ${existingDuplicate.departureTime?.toISOString().slice(11, 16)}Z on this date.`
        );
      }

      // Check 2: Gate conflict at origin airport
      const gateConflict = await tx.flight.findFirst({
        where: {
          origin,
          gate,
          departureTime: {
            gte: gateWindowStart,
            lte: gateWindowEnd,
          },
          status: { notIn: ["CANCELLED", "ARRIVED"] },
        },
      });

      if (gateConflict) {
        throw new Error(
          `Gate Conflict: Gate ${gate} at ${origin} is already allocated to flight ${gateConflict.callsign} (${gateConflict.departureTime?.toISOString().slice(11, 16)}Z). Please assign an alternate gate.`
        );
      }

      // Check 3: Runway conflict at origin airport (minimum 3-minute wake turbulence separation)
      const runwayConflict = await tx.flight.findFirst({
        where: {
          origin,
          runway,
          departureTime: {
            gte: runwayWindowStart,
            lte: runwayWindowEnd,
          },
          status: { notIn: ["CANCELLED", "ARRIVED"] },
        },
      });

      if (runwayConflict) {
        throw new Error(
          `Runway Slot Conflict: Runway ${runway} at ${origin} has a departure clearance conflict with flight ${runwayConflict.callsign} within 3 minutes of ${depDate.toISOString().slice(11, 16)}Z.`
        );
      }

      // Check 4: Aircraft conflict (if aircraftId provided)
      if (input.aircraftId) {
        const aircraftConflict = await tx.flight.findFirst({
          where: {
            aircraftId: input.aircraftId,
            status: { notIn: ["CANCELLED", "ARRIVED"] },
            OR: [
              {
                departureTime: { lte: arrDate },
                arrivalTime: { gte: depDate },
              },
            ],
          },
        });

        if (aircraftConflict) {
          throw new Error(
            `Aircraft Conflict: Airframe is already committed to flight ${aircraftConflict.callsign} (${aircraftConflict.origin} -> ${aircraftConflict.destination}) during this operational window.`
          );
        }
      }

      const id = `flt-${flightNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`;
      const squawk = Math.floor(1000 + Math.random() * 6777).toString();
      const economyCapacity = input.economyCapacity ?? 150;
      const businessCapacity = input.businessCapacity ?? 20;
      const firstCapacity = input.firstCapacity ?? 0;

      const seats = generateSeatsForFlight(id, economyCapacity, businessCapacity, firstCapacity);

      const dbFlight = await tx.flight.create({
        data: {
          id,
          callsign,
          flightNumber,
          flightName: input.flightName || `${input.airline} ${flightNumber}`,
          airline: input.airline,
          aircraftType: input.aircraftType,
          status: input.status || "SCHEDULED",
          phase: "Flight scheduled in system",
          origin,
          destination,
          gate,
          stand: gate,
          runway,
          squawk,
          latitude: originAirport.latitude,
          longitude: originAirport.longitude,
          altitudeFt: 0,
          speedKt: 0,
          headingDeg: 90,
          verticalSpeedFpm: 0,
          fuelKg: 10000,
          riskScore: 10,
          eta: arrDate,
          departureTime: depDate,
          arrivalTime: arrDate,
          boardingTime: input.boardingTime ? new Date(input.boardingTime) : new Date(depDate.getTime() - 25 * 60000),
          checkInCloseTime: input.checkInCloseTime ? new Date(input.checkInCloseTime) : new Date(depDate.getTime() - 15 * 60000),
          terminal,
          economyCapacity,
          businessCapacity,
          firstCapacity,
          economyFare: input.economyFare ?? 4500,
          businessFare: input.businessFare ?? 8500,
          firstFare: input.firstFare ?? 15000,
          airlineId: input.airlineId || undefined,
          aircraftId: input.aircraftId || undefined,
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

      const flightDTO: FlightDTO = {
        id: dbFlight.id,
        callsign: dbFlight.callsign,
        flightNumber: dbFlight.flightNumber ?? dbFlight.callsign,
        flightName: dbFlight.flightName ?? `${dbFlight.airline} ${dbFlight.callsign}`,
        airline: dbFlight.airline,
        aircraftType: dbFlight.aircraftType,
        status: dbFlight.status as FlightStatus,
        phase: dbFlight.phase,
        origin: dbFlight.origin,
        destination: dbFlight.destination,
        gate: dbFlight.gate ?? undefined,
        stand: dbFlight.stand ?? undefined,
        runway: dbFlight.runway ?? undefined,
        squawk: dbFlight.squawk,
        latitude: dbFlight.latitude,
        longitude: dbFlight.longitude,
        altitudeFt: dbFlight.altitudeFt,
        speedKt: dbFlight.speedKt,
        headingDeg: dbFlight.headingDeg,
        verticalSpeedFpm: dbFlight.verticalSpeedFpm,
        fuelKg: dbFlight.fuelKg,
        riskScore: dbFlight.riskScore,
        eta: dbFlight.eta.toISOString(),
        departureTime: dbFlight.departureTime?.toISOString(),
        arrivalTime: dbFlight.arrivalTime?.toISOString(),
        boardingTime: dbFlight.boardingTime?.toISOString(),
        checkInCloseTime: dbFlight.checkInCloseTime?.toISOString(),
        terminal: dbFlight.terminal ?? undefined,
        economyCapacity: dbFlight.economyCapacity,
        businessCapacity: dbFlight.businessCapacity,
        firstCapacity: dbFlight.firstCapacity,
        economyFare: dbFlight.economyFare,
        businessFare: dbFlight.businessFare,
        firstFare: dbFlight.firstFare,
        availableSeats: economyCapacity + businessCapacity + firstCapacity,
        updatedAt: dbFlight.updatedAt.toISOString(),
      };

      memorySeatMap.set(id, seats);
      memoryFlights.unshift(flightDTO);

      await logAuditEvent({
        actorId: input.actorId,
        actorName: input.actorName || "Admin",
        action: "FLIGHT_CREATED",
        entity: "FLIGHT",
        entityId: flightDTO.flightNumber,
        after: {
          flightNumber: flightDTO.flightNumber,
          route: `${flightDTO.origin} -> ${flightDTO.destination}`,
          airline: flightDTO.airline,
          gate: flightDTO.gate,
          runway: flightDTO.runway,
          departureTime: flightDTO.departureTime,
        },
      });

      return flightDTO;
    });
  }

  // Memory fallback with conflict checks
  const existingDup = memoryFlights.find(
    (f) =>
      f.flightNumber === flightNumber &&
      f.status !== "CANCELLED" &&
      Math.abs(new Date(f.departureTime || "").getTime() - depDate.getTime()) < 120 * 60000
  );
  if (existingDup) {
    throw new Error(`Conflict: Flight ${flightNumber} already exists in memory store for this schedule.`);
  }

  const gateConf = memoryFlights.find(
    (f) =>
      f.origin === origin &&
      f.gate === gate &&
      f.status !== "CANCELLED" &&
      f.status !== "ARRIVED" &&
      Math.abs(new Date(f.departureTime || "").getTime() - depDate.getTime()) < 45 * 60000
  );
  if (gateConf) {
    throw new Error(`Gate Conflict: Stand ${gate} is already occupied by ${gateConf.callsign}.`);
  }

  const id = `flt-${flightNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`;
  const squawk = Math.floor(1000 + Math.random() * 6777).toString();
  const seats = generateSeatsForFlight(id, input.economyCapacity ?? 150, input.businessCapacity ?? 20, input.firstCapacity ?? 0);

  const flightDTO: FlightDTO = {
    id,
    callsign,
    flightNumber,
    flightName: input.flightName || `${input.airline} ${flightNumber}`,
    airline: input.airline,
    aircraftType: input.aircraftType,
    status: input.status || "SCHEDULED",
    phase: "Flight scheduled in system",
    origin,
    destination,
    gate,
    stand: gate,
    runway,
    squawk,
    latitude: originAirport.latitude,
    longitude: originAirport.longitude,
    altitudeFt: 0,
    speedKt: 0,
    headingDeg: 90,
    verticalSpeedFpm: 0,
    fuelKg: 10000,
    riskScore: 10,
    eta: arrDate.toISOString(),
    departureTime: depDate.toISOString(),
    arrivalTime: arrDate.toISOString(),
    boardingTime: new Date(depDate.getTime() - 25 * 60000).toISOString(),
    checkInCloseTime: new Date(depDate.getTime() - 15 * 60000).toISOString(),
    terminal,
    economyCapacity: input.economyCapacity ?? 150,
    businessCapacity: input.businessCapacity ?? 20,
    firstCapacity: input.firstCapacity ?? 0,
    economyFare: input.economyFare ?? 4500,
    businessFare: input.businessFare ?? 8500,
    firstFare: input.firstFare ?? 15000,
    availableSeats: (input.economyCapacity ?? 150) + (input.businessCapacity ?? 20) + (input.firstCapacity ?? 0),
    updatedAt: new Date().toISOString(),
  };

  memorySeatMap.set(id, seats);
  memoryFlights.unshift(flightDTO);
  return flightDTO;
}

export async function updateFlightStatus(
  flightId: string,
  status: FlightStatus,
  extraOrActor?: { squawk?: string; phase?: string; runway?: string; gate?: string; id?: string; name?: string },
  actor?: { id?: string; name?: string },
): Promise<FlightDTO | null> {
  const flight = memoryFlights.find((f) => f.id === flightId || f.callsign === flightId || f.flightNumber === flightId);
  if (!flight) return null;

  const oldStatus = flight.status;
  flight.status = status;

  let extra: { squawk?: string; phase?: string; runway?: string; gate?: string } | undefined;
  let effectiveActor: { id?: string; name?: string } | undefined = actor;

  if (extraOrActor && ("squawk" in extraOrActor || "phase" in extraOrActor || "runway" in extraOrActor || "gate" in extraOrActor)) {
    extra = extraOrActor;
  } else if (extraOrActor && ("id" in extraOrActor || "name" in extraOrActor)) {
    effectiveActor = extraOrActor;
  }

  if (extra?.squawk) flight.squawk = extra.squawk;
  if (extra?.phase) flight.phase = extra.phase;
  if (extra?.runway) flight.runway = extra.runway;
  if (extra?.gate) flight.gate = extra.gate;
  flight.updatedAt = new Date().toISOString();

  if (shouldUseDatabase()) {
    try {
      await prisma.flight.update({
        where: { id: flight.id },
        data: {
          status,
          ...(extra?.squawk ? { squawk: extra.squawk } : {}),
          ...(extra?.phase ? { phase: extra.phase } : {}),
          ...(extra?.runway ? { runway: extra.runway } : {}),
          ...(extra?.gate ? { gate: extra.gate } : {}),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.warn("Database flight status update failed; updated in memory.", error);
    }
  }

  await logAuditEvent({
    actorId: effectiveActor?.id,
    actorName: effectiveActor?.name,
    action: "ADMIN_UPDATED_FLIGHT",
    entity: "FLIGHT",
    entityId: flight.flightNumber || flight.callsign,
    before: { status: oldStatus },
    after: { status, ...(extra || {}) },
  });

  return flight;
}
