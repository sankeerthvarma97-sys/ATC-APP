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

export function syncResourcesWithFlights(
  resources: AirportResourceDTO[],
  flights: FlightDTO[]
): AirportResourceDTO[] {
  const activeRollouts = new Set(
    flights
      .filter((f) => f.status === "DEPARTING" || f.status === "LANDED" || (f.status === "APPROACH" && f.altitudeFt < 400))
      .map((f) => f.runway)
      .filter(Boolean)
  );

  const occupiedGates = new Set(
    flights
      .filter((f) => f.status === "AT_GATE" || f.status === "BOARDING")
      .map((f) => f.gate)
      .filter(Boolean)
  );

  return resources.map((res) => {
    if (res.resourceType === "RUNWAY") {
      if (activeRollouts.has(res.code)) {
        return { ...res, status: "OCCUPIED" as const, updatedAt: new Date().toISOString() };
      }
      if (res.status === "OCCUPIED" && !activeRollouts.has(res.code)) {
        return { ...res, status: "AVAILABLE" as const, updatedAt: new Date().toISOString() };
      }
    }
    if (res.resourceType === "GATE") {
      if (occupiedGates.has(res.code)) {
        return { ...res, status: "OCCUPIED" as const, updatedAt: new Date().toISOString() };
      }
      if (res.status === "OCCUPIED" && !occupiedGates.has(res.code)) {
        return { ...res, status: "AVAILABLE" as const, updatedAt: new Date().toISOString() };
      }
    }
    return res;
  });
}

export function advanceFlight(flight: FlightDTO, tickMs: number, index: number): FlightDTO {
  const now = Date.now();
  let status = flight.status;
  let phase = flight.phase;
  let altitudeFt = flight.altitudeFt;
  let speedKt = flight.speedKt;
  let verticalSpeedFpm = flight.verticalSpeedFpm;
  let riskScore = flight.riskScore;

  // 1. SCHEDULED -> BOARDING transition
  if (status === "SCHEDULED") {
    const depTime = flight.departureTime ? new Date(flight.departureTime).getTime() : 0;
    const boardTime = flight.boardingTime ? new Date(flight.boardingTime).getTime() : 0;
    const shouldBoard = (boardTime && now >= boardTime) || (depTime && depTime - now <= 35 * 60_000);

    if (shouldBoard) {
      status = "BOARDING";
      phase = `Boarding in progress at Gate ${flight.gate ?? "assigned"}`;
    } else {
      return { ...flight, updatedAt: new Date().toISOString() };
    }
  }

  // Terminal static states
  if (status === "CANCELLED" || status === "DIVERTED" || status === "AT_GATE") {
    return { ...flight, updatedAt: new Date().toISOString() };
  }

  const seconds = tickMs / 1000;
  const headingRad = (flight.headingDeg * Math.PI) / 180;
  const nauticalMiles = (Math.max(flight.speedKt, 1) * seconds) / 3600;
  const latDelta = (Math.cos(headingRad) * nauticalMiles) / 60;
  const lonDelta = (Math.sin(headingRad) * nauticalMiles) / (60 * Math.cos((flight.latitude * Math.PI) / 180));
  const orbit = status === "HOLDING" ? Math.sin(now / 7000 + index) * 8 : 0;
  const headingDeg = Math.round((flight.headingDeg + orbit + 360) % 360);

  // 2. BOARDING -> PUSHBACK (Auto or manual)
  if (status === "BOARDING") {
    const depTime = flight.departureTime ? new Date(flight.departureTime).getTime() : 0;
    if (depTime && depTime - now <= 8 * 60_000) {
      status = "PUSHBACK";
      phase = "Pushback tug connected, doors armed";
      speedKt = 3;
    }
  }

  // 3. PUSHBACK -> TAXI_OUT
  if (status === "PUSHBACK") {
    speedKt = clamp(speedKt + 1, 2, 14);
    if (speedKt >= 8) {
      status = "TAXI_OUT";
      phase = `Taxiing via Taxiway Echo to RWY ${flight.runway ?? "09L"}`;
      speedKt = 16;
    }
  }

  // 4. TAXI_OUT -> DEPARTING
  if (status === "TAXI_OUT") {
    speedKt = clamp(speedKt + 2, 12, 42);
    if (speedKt >= 36) {
      status = "DEPARTING";
      phase = `Takeoff roll active on RWY ${flight.runway ?? "assigned"}`;
      verticalSpeedFpm = 1400;
      speedKt = 95;
    }
  }

  // 5. DEPARTING -> AIRBORNE
  if (status === "DEPARTING") {
    altitudeFt = clamp(altitudeFt + Math.round((seconds / 60) * Math.max(verticalSpeedFpm, 1000)), 0, 14000);
    speedKt = clamp(speedKt + 5, 95, 275);
    if (altitudeFt >= 1800) {
      status = "AIRBORNE";
      phase = "Climbing through 5,000 ft, contact Radar";
      verticalSpeedFpm = 1800;
    }
  }

  // 6. AIRBORNE en-route progression
  if (status === "AIRBORNE") {
    if (altitudeFt < 32000 && !phase.includes("Descent")) {
      altitudeFt = clamp(altitudeFt + Math.round((seconds / 60) * 1100), 1800, 36000);
      speedKt = clamp(speedKt + 4, 250, 460);
    }
  }

  // 7. APPROACH / EMERGENCY -> LANDED
  if (status === "APPROACH" || status === "EMERGENCY") {
    const vSpeed = verticalSpeedFpm !== 0 ? verticalSpeedFpm : -750;
    altitudeFt = clamp(altitudeFt + Math.round((seconds / 60) * vSpeed), 0, 45000);
    speedKt = clamp(speedKt - (altitudeFt < 2000 ? 3 : 0), 135, 260);

    if (altitudeFt <= 50 && status !== "EMERGENCY") {
      altitudeFt = 0;
      status = "LANDED";
      phase = `Touchdown RWY ${flight.runway ?? "assigned"}. Decelerating, reverse thrust.`;
      speedKt = 78;
      verticalSpeedFpm = 0;
    }
  }

  // 8. LANDED -> TAXI_IN
  if (status === "LANDED") {
    speedKt = clamp(speedKt - 4, 15, 80);
    if (speedKt <= 30) {
      status = "TAXI_IN";
      phase = `Vacated runway, taxiing to Gate ${flight.gate ?? flight.stand ?? "A1"}`;
    }
  }

  // 9. TAXI_IN -> AT_GATE
  if (status === "TAXI_IN") {
    speedKt = clamp(speedKt - 3, 0, 24);
    if (speedKt <= 3) {
      status = "AT_GATE";
      phase = `Chocks in at Gate ${flight.gate ?? flight.stand ?? "A1"}. Ground turnaround active.`;
      speedKt = 0;
    }
  }

  if (status === "HOLDING") {
    riskScore = clamp(riskScore + 1, 0, 100);
  } else if (status !== "EMERGENCY") {
    riskScore = clamp(riskScore + (Math.random() > 0.75 ? 1 : -1), 8, 85);
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
      case "PUSHBACK_APPROVE":
        return {
          ...flight,
          status: "PUSHBACK",
          phase: input.note || "Pushback and engine start approved",
          speedKt: 4,
          updatedAt: new Date().toISOString(),
        };
      case "TAXI_CLEARANCE":
        return {
          ...flight,
          status: "TAXI_OUT",
          phase: input.note || `Cleared to taxi to holding point RWY ${flight.runway ?? "assigned"}`,
          speedKt: 18,
          updatedAt: new Date().toISOString(),
        };
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
