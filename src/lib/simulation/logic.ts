import type {
  AirportMetrics,
  AirportResourceDTO,
  FlightCommandInput,
  FlightDTO,
  OperationalEventDTO,
  RadioMessageDTO,
} from "@/lib/domain";
import { airport } from "@/lib/data/mock";
import { clamp } from "@/lib/utils";

const terminalStatuses = new Set(["AT_GATE", "CANCELLED", "DIVERTED"]);

export function computeMetrics(flights: FlightDTO[], resources: AirportResourceDTO[]): AirportMetrics {
  const activeFlights = flights.filter((flight) => !terminalStatuses.has(flight.status)).length;
  const airborne = flights.filter((flight) => flight.altitudeFt > 0).length;
  const arrivalsInWindow = flights.filter((flight) => flight.destination === airport.icao && flight.status !== "AT_GATE").length;
  const departuresInWindow = flights.filter((flight) => flight.origin === airport.icao && flight.status !== "AIRBORNE").length;
  const emergencyCount = flights.filter((flight) => flight.status === "EMERGENCY").length;
  const holdingCount = flights.filter((flight) => flight.status === "HOLDING").length;
  const runways = resources.filter((resource) => resource.resourceType === "RUNWAY");
  const occupiedRunways = runways.filter((resource) => resource.status === "OCCUPIED" || resource.status === "RESERVED").length;
  const averageRisk = Math.round(flights.reduce((sum, flight) => sum + flight.riskScore, 0) / Math.max(flights.length, 1));
  const averageDelayMin = Math.round(
    flights.reduce((sum, flight) => sum + Math.max(0, flight.riskScore - 25) * 0.42, 0) / Math.max(flights.length, 1),
  );

  return {
    activeFlights,
    airborne,
    arrivalsInWindow,
    departuresInWindow,
    emergencyCount,
    holdingCount,
    runwayUtilization: Math.round((occupiedRunways / Math.max(runways.length, 1)) * 100),
    averageRisk,
    averageDelayMin,
    throughputPerHour: Math.max(12, Math.round(activeFlights * 5.8 - holdingCount * 1.7)),
  };
}

export function advanceFlights(flights: FlightDTO[], tickMs: number): FlightDTO[] {
  return flights.map((flight, index) => advanceFlight(flight, tickMs, index));
}

export function advanceFlight(flight: FlightDTO, tickMs: number, index: number): FlightDTO {
  if (terminalStatuses.has(flight.status) || flight.status === "SCHEDULED") {
    return { ...flight, updatedAt: new Date().toISOString() };
  }

  const seconds = tickMs / 1000;
  const headingRad = (flight.headingDeg * Math.PI) / 180;
  const nauticalMiles = (Math.max(flight.speedKt, 1) * seconds) / 3600;
  const latDelta = (Math.cos(headingRad) * nauticalMiles) / 60;
  const lonDelta = (Math.sin(headingRad) * nauticalMiles) / (60 * Math.cos((flight.latitude * Math.PI) / 180));
  const orbit = flight.status === "HOLDING" ? Math.sin(Date.now() / 7000 + index) * 8 : 0;
  const headingDeg = Math.round((flight.headingDeg + orbit + 360) % 360);

  let status = flight.status;
  let phase = flight.phase;
  let altitudeFt = flight.altitudeFt;
  let speedKt = flight.speedKt;
  let verticalSpeedFpm = flight.verticalSpeedFpm;
  let riskScore = flight.riskScore;

  if (flight.status === "PUSHBACK" && flight.speedKt > 5) {
    status = "TAXI_OUT";
    phase = "Taxi clearance in progress";
  }

  if (flight.status === "TAXI_OUT" && flight.speedKt > 35) {
    status = "DEPARTING";
    phase = `Rolling runway ${flight.runway ?? "assigned"}`;
    verticalSpeedFpm = 1300;
  }

  if (flight.status === "DEPARTING") {
    altitudeFt = clamp(altitudeFt + Math.round((seconds / 60) * Math.max(verticalSpeedFpm, 900)), 0, 12000);
    speedKt = clamp(speedKt + 2, 80, 260);
    if (altitudeFt > 2200) {
      status = "AIRBORNE";
      phase = "Departure climb";
    }
  }

  if (flight.status === "APPROACH" || flight.status === "EMERGENCY") {
    altitudeFt = clamp(altitudeFt + Math.round((seconds / 60) * verticalSpeedFpm), 0, 45000);
    speedKt = clamp(speedKt - (altitudeFt < 1800 ? 2 : 0), 136, 260);
    if (altitudeFt <= 120 && flight.status !== "EMERGENCY") {
      status = "LANDED";
      phase = "Runway rollout";
      speedKt = 82;
      verticalSpeedFpm = 0;
    }
  }

  if (flight.status === "LANDED" && flight.speedKt < 45) {
    status = "TAXI_IN";
    phase = `Taxiing to ${flight.gate ?? flight.stand ?? "assigned gate"}`;
  }

  if (flight.status === "HOLDING") {
    riskScore = clamp(riskScore + 1, 0, 100);
  } else if (flight.status !== "EMERGENCY") {
    riskScore = clamp(riskScore + (Math.random() > 0.72 ? 1 : -1), 8, 85);
  }

  return {
    ...flight,
    status,
    phase,
    latitude: Number((flight.latitude + latDelta).toFixed(5)),
    longitude: Number((flight.longitude + lonDelta).toFixed(5)),
    altitudeFt,
    speedKt,
    headingDeg,
    verticalSpeedFpm,
    riskScore,
    updatedAt: new Date().toISOString(),
  };
}

export function applyFlightCommand(flights: FlightDTO[], input: FlightCommandInput): FlightDTO[] {
  return flights.map((flight) => {
    if (flight.id !== input.flightId) {
      return flight;
    }

    switch (input.type) {
      case "ASSIGN_RUNWAY":
        return { ...flight, runway: input.value, phase: `Assigned runway ${input.value}`, updatedAt: new Date().toISOString() };
      case "ASSIGN_GATE":
        return { ...flight, gate: input.value, phase: `Gate ${input.value} assigned`, updatedAt: new Date().toISOString() };
      case "HOLD":
        return { ...flight, status: "HOLDING", phase: input.note || "ATC hold instruction active", speedKt: Math.max(flight.speedKt, 190), riskScore: clamp(flight.riskScore + 12, 0, 100), updatedAt: new Date().toISOString() };
      case "RELEASE_HOLD":
        return { ...flight, status: "APPROACH", phase: input.note || "Released from hold, sequencing to final", riskScore: clamp(flight.riskScore - 10, 0, 100), updatedAt: new Date().toISOString() };
      case "EXPEDITE":
        return { ...flight, speedKt: clamp(flight.speedKt + 28, 0, 380), phase: input.note || "Expedite approved in simulation", updatedAt: new Date().toISOString() };
      case "CLEAR_TAKEOFF":
        return { ...flight, status: "DEPARTING", speedKt: 112, verticalSpeedFpm: 1400, phase: `Cleared for takeoff ${flight.runway ?? ""}`.trim(), updatedAt: new Date().toISOString() };
      case "CLEAR_LANDING":
        return { ...flight, status: "APPROACH", phase: `Cleared to land ${flight.runway ?? ""}`.trim(), riskScore: clamp(flight.riskScore - 7, 0, 100), updatedAt: new Date().toISOString() };
      case "DECLARE_EMERGENCY":
        return { ...flight, status: "EMERGENCY", squawk: "7700", phase: input.note || "Emergency declared in simulation", riskScore: 95, updatedAt: new Date().toISOString() };
      case "RESOLVE_EMERGENCY":
        return { ...flight, status: flight.altitudeFt > 0 ? "APPROACH" : "LANDED", phase: input.note || "Emergency condition resolved in exercise", squawk: flight.squawk === "7700" ? "4210" : flight.squawk, riskScore: 41, updatedAt: new Date().toISOString() };
      case "DIVERT":
        return { ...flight, status: "DIVERTED", destination: input.value || "KPHL", phase: `Diverting to ${input.value || "alternate"}`, riskScore: clamp(flight.riskScore + 16, 0, 100), updatedAt: new Date().toISOString() };
      default:
        return flight;
    }
  });
}

export function commandToEvent(input: FlightCommandInput, flight?: FlightDTO): OperationalEventDTO {
  const critical = input.type === "DECLARE_EMERGENCY";
  return {
    id: `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: critical ? "EMERGENCY" : "COMMAND",
    severity: critical ? "CRITICAL" : input.type === "HOLD" || input.type === "DIVERT" ? "WARNING" : "ADVISORY",
    title: `${flight?.callsign ?? "Flight"} ${input.type.toLowerCase().replaceAll("_", " ")}`,
    detail: input.note || `Command ${input.type} applied in the AOCC simulation.`,
    flightId: input.flightId,
    payload: { command: input.type, value: input.value },
    createdAt: new Date().toISOString(),
  };
}

export function makeMessage(input: {
  flight?: FlightDTO;
  text: string;
  direction: "ATC_TO_PILOT" | "PILOT_TO_ATC" | "SYSTEM";
  priority?: "INFO" | "ADVISORY" | "WARNING" | "CRITICAL";
  channel?: string;
}): RadioMessageDTO {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    channel: input.channel || "Tower",
    direction: input.direction,
    text: input.text,
    priority: input.priority || "INFO",
    flightId: input.flight?.id,
    callsign: input.flight?.callsign,
    createdAt: new Date().toISOString(),
  };
}

export function capFeed<T extends { createdAt?: string }>(items: T[], limit = 40): T[] {
  return [...items]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, limit);
}
