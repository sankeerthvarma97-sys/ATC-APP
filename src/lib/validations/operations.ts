import { z } from "zod";
import { flightStatuses, roles, severities } from "@/lib/domain";

export const roleSchema = z.enum(roles);
export const severitySchema = z.enum(severities);
export const flightStatusSchema = z.enum(flightStatuses);

export const flightCommandSchema = z.object({
  flightId: z.string().min(3),
  type: z.enum([
    "ASSIGN_RUNWAY",
    "ASSIGN_GATE",
    "HOLD",
    "RELEASE_HOLD",
    "EXPEDITE",
    "CLEAR_TAKEOFF",
    "CLEAR_LANDING",
    "DECLARE_EMERGENCY",
    "RESOLVE_EMERGENCY",
    "DIVERT",
  ]),
  value: z.string().trim().max(32).optional(),
  note: z.string().trim().max(240).optional(),
});

export const radioMessageSchema = z.object({
  flightId: z.string().min(3),
  text: z.string().trim().min(4).max(320),
  direction: z.enum(["ATC_TO_PILOT", "PILOT_TO_ATC", "SYSTEM"]),
  priority: severitySchema.optional(),
  channel: z.string().trim().max(32).optional(),
});

export const aiBriefingSchema = z.object({
  focus: z.enum(["airport", "delays", "emergencies", "staffing", "runways"]),
  question: z.string().trim().min(4).max(600),
});

export const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(128),
});
