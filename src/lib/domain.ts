export const roles = [
  "ADMIN",
  "SUPERVISOR",
  "ATC",
  "PILOT",
  "GROUND",
  "ANALYST",
  "VIEWER",
] as const;

export type Role = (typeof roles)[number];

export const flightStatuses = [
  "SCHEDULED",
  "PUSHBACK",
  "TAXI_OUT",
  "DEPARTING",
  "AIRBORNE",
  "APPROACH",
  "LANDED",
  "TAXI_IN",
  "AT_GATE",
  "HOLDING",
  "DIVERTED",
  "CANCELLED",
  "EMERGENCY",
] as const;

export type FlightStatus = (typeof flightStatuses)[number];

export const severities = ["INFO", "ADVISORY", "WARNING", "CRITICAL"] as const;
export type Severity = (typeof severities)[number];

export const eventTypes = [
  "FLIGHT_UPDATE",
  "POSITION_UPDATE",
  "ATC_MESSAGE",
  "PILOT_MESSAGE",
  "RESOURCE_CHANGE",
  "COMMAND",
  "EMERGENCY",
  "NOTIFICATION",
  "AI_ANALYSIS",
] as const;

export type EventType = (typeof eventTypes)[number];

export type MessageDirection = "ATC_TO_PILOT" | "PILOT_TO_ATC" | "SYSTEM";
export type ResourceType = "RUNWAY" | "GATE" | "STAND" | "BAGGAGE_BELT" | "CREW" | "VEHICLE";
export type ResourceStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE" | "CLOSED";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  shift?: string;
}

export interface FlightDTO {
  id: string;
  callsign: string;
  airline: string;
  aircraftType: string;
  status: FlightStatus;
  phase: string;
  origin: string;
  destination: string;
  gate?: string;
  stand?: string;
  runway?: string;
  squawk: string;
  latitude: number;
  longitude: number;
  altitudeFt: number;
  speedKt: number;
  headingDeg: number;
  verticalSpeedFpm: number;
  fuelKg: number;
  riskScore: number;
  eta: string;
  assignedController?: Pick<UserDTO, "id" | "name" | "role">;
  updatedAt: string;
}

export interface AirportResourceDTO {
  id: string;
  resourceType: ResourceType;
  code: string;
  label: string;
  status: ResourceStatus;
  metadata?: Record<string, string | number | boolean>;
  updatedAt: string;
}

export interface OperationalEventDTO {
  id: string;
  type: EventType;
  severity: Severity;
  title: string;
  detail: string;
  payload?: Record<string, unknown>;
  flightId?: string;
  userId?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface RadioMessageDTO {
  id: string;
  channel: string;
  direction: MessageDirection;
  text: string;
  priority: Severity;
  createdAt: string;
  fromUser?: Pick<UserDTO, "id" | "name" | "role">;
  flightId?: string;
  callsign?: string;
}

export interface AirportMetrics {
  activeFlights: number;
  airborne: number;
  arrivalsInWindow: number;
  departuresInWindow: number;
  emergencyCount: number;
  holdingCount: number;
  runwayUtilization: number;
  averageRisk: number;
  averageDelayMin: number;
  throughputPerHour: number;
}

export interface OperationsSnapshot {
  generatedAt: string;
  airport: {
    iata: string;
    icao: string;
    name: string;
    latitude: number;
    longitude: number;
    fieldElevationFt: number;
  };
  currentUser: UserDTO;
  flights: FlightDTO[];
  resources: AirportResourceDTO[];
  events: OperationalEventDTO[];
  messages: RadioMessageDTO[];
  metrics: AirportMetrics;
  disclaimer: string;
}

export type FlightCommandType =
  | "ASSIGN_RUNWAY"
  | "ASSIGN_GATE"
  | "HOLD"
  | "RELEASE_HOLD"
  | "EXPEDITE"
  | "CLEAR_TAKEOFF"
  | "CLEAR_LANDING"
  | "DECLARE_EMERGENCY"
  | "RESOLVE_EMERGENCY"
  | "DIVERT";

export interface FlightCommandInput {
  flightId: string;
  type: FlightCommandType;
  value?: string;
  note?: string;
}

export interface RadioMessageInput {
  flightId: string;
  text: string;
  direction: MessageDirection;
  priority?: Severity;
  channel?: string;
}

export interface AiBriefingRequest {
  focus: "airport" | "delays" | "emergencies" | "staffing" | "runways";
  question: string;
}

export interface AiBriefingResponse {
  model: string;
  simulated: boolean;
  briefing: string;
  actions: string[];
  risk: Severity;
}
