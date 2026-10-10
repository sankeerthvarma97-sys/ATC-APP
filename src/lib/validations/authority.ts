import { z } from "zod";
import { departments, flightStatuses, roles } from "@/lib/domain";

export const createFlightSchema = z.object({
  flightName: z.string().trim().min(3).max(64),
  flightNumber: z.string().trim().min(3).max(12).toUpperCase(),
  airline: z.string().trim().min(2).max(64),
  aircraftType: z.string().trim().min(2).max(48),
  origin: z.string().trim().length(3).toUpperCase().default("HYD"),
  destination: z.string().trim().length(3).toUpperCase(),
  departureTime: z.string().min(10),
  arrivalTime: z.string().min(10),
  flightDuration: z.string().optional(),
  terminal: z.string().trim().max(16).optional().default("T1"),
  gate: z.string().trim().max(16).optional().default("B12"),
  runway: z.string().trim().max(16).optional().default("09L"),
  economyCapacity: z.coerce.number().int().min(10).max(500).default(150),
  businessCapacity: z.coerce.number().int().min(0).max(100).default(20),
  firstCapacity: z.coerce.number().int().min(0).max(50).default(0),
  economyFare: z.coerce.number().min(500).default(4500),
  businessFare: z.coerce.number().min(1000).default(8500),
  firstFare: z.coerce.number().min(2000).default(15000),
  status: z.enum(flightStatuses).optional().default("SCHEDULED"),
  boardingTime: z.string().optional(),
  checkInCloseTime: z.string().optional(),
});

export const createBookingSchema = z.object({
  flightId: z.string().min(3),
  seatNumber: z.string().trim().min(2).max(6).toUpperCase(),
  travelClass: z.enum(["ECONOMY", "BUSINESS", "FIRST"]).default("ECONOMY"),
  passenger: z.object({
    fullName: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    phone: z.string().trim().min(8).max(20),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    nationality: z.string().trim().max(32).optional().default("IN"),
    idNumber: z.string().trim().max(32).optional(),
  }),
  baggageCount: z.coerce.number().int().min(0).max(5).optional().default(1),
  paymentMethod: z.string().trim().max(32).optional().default("SIMULATED_CARD"),
});

export const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().min(8).max(20),
  department: z.enum(departments),
  jobTitle: z.string().trim().min(2).max(64),
  role: z.enum(roles),
  airportCode: z.string().trim().length(3).toUpperCase().default("HYD"),
  terminal: z.string().trim().max(16).optional().default("T1"),
  gateArea: z.string().trim().max(32).optional(),
  shift: z.string().trim().max(32).default("MORNING"),
  permissions: z.array(z.string()).optional().default([]),
});

export const updateEmployeeSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  department: z.enum(departments).optional(),
  jobTitle: z.string().trim().min(2).max(64).optional(),
  role: z.enum(roles).optional(),
  airportCode: z.string().trim().length(3).toUpperCase().optional(),
  terminal: z.string().trim().max(16).optional(),
  gateArea: z.string().trim().max(32).optional(),
  shift: z.string().trim().max(32).optional(),
  status: z.enum(["ACTIVE", "OFFLINE", "ON_DUTY", "PENDING_VERIFICATION", "SUSPENDED", "DEACTIVATED"]).optional(),
  verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional(),
  permissions: z.array(z.string()).optional(),
});

export const verifyTicketSchema = z.object({
  pnr: z.string().trim().min(3).max(16).toUpperCase().optional(),
  qrCode: z.string().trim().optional(),
}).refine((data) => Boolean(data.pnr || data.qrCode), {
  message: "Either PNR or QR code must be provided for verification.",
});

export const checkInSchema = z.object({
  pnr: z.string().trim().min(3).max(16).toUpperCase(),
  baggageCount: z.coerce.number().int().min(0).max(5).optional().default(1),
  baggageWeightKg: z.coerce.number().min(0).max(100).optional().default(15),
});

export const boardingSchema = z.object({
  pnr: z.string().trim().min(3).max(16).toUpperCase(),
  flightId: z.string().trim().min(3),
  gate: z.string().trim().min(1).max(16),
});

export const createAirlineSchema = z.object({
  name: z.string().trim().min(2).max(64),
  iata: z.string().trim().length(2).toUpperCase(),
  icao: z.string().trim().length(3).toUpperCase(),
  logo: z.string().trim().max(8).optional().default("✈️"),
  country: z.string().trim().max(48).default("India"),
  contactEmail: z.string().trim().email().optional(),
  contactPhone: z.string().trim().max(20).optional(),
});

export const createAircraftSchema = z.object({
  registration: z.string().trim().min(3).max(16).toUpperCase(),
  model: z.string().trim().min(2).max(48),
  manufacturer: z.string().trim().min(2).max(48),
  airlineId: z.string().min(2),
  airlineName: z.string().optional(),
  economyCapacity: z.coerce.number().int().min(10).max(500).default(150),
  businessCapacity: z.coerce.number().int().min(0).max(100).default(20),
  firstClassCapacity: z.coerce.number().int().min(0).max(50).default(0),
  totalCapacity: z.coerce.number().int().min(10).max(600).default(170),
  status: z.string().default("IN_SERVICE"),
  currentAirport: z.string().trim().length(3).toUpperCase().optional().default("HYD"),
  currentGate: z.string().trim().max(16).optional().default("B12"),
});
