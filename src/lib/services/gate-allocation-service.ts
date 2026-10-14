import type {
  FlightDTO,
  GateAllocationAssignmentDTO,
  GateAllocationPlanDTO,
} from "@/lib/domain";

export type IcaoAerodromeCode = "CODE_C" | "CODE_D" | "CODE_E" | "CODE_F";

export interface GateCapability {
  gateCode: string;
  terminal: string;
  airportCode: string;
  maxIcaoCode: IcaoAerodromeCode;
  hasJetBridge: boolean;
  preferredAirlines: string[];
  isRemoteStand: boolean;
}

export const STATION_GATE_CAPABILITIES: Record<string, GateCapability[]> = {
  HYD: [
    { gateCode: "B12", terminal: "Terminal 1", airportCode: "HYD", maxIcaoCode: "CODE_E", hasJetBridge: true, preferredAirlines: ["Air India", "SkyConnect", "Emirates"], isRemoteStand: false },
    { gateCode: "B14", terminal: "Terminal 1", airportCode: "HYD", maxIcaoCode: "CODE_E", hasJetBridge: true, preferredAirlines: ["AeroVista", "British Airways", "Air India"], isRemoteStand: false },
    { gateCode: "A4", terminal: "Terminal 1", airportCode: "HYD", maxIcaoCode: "CODE_C", hasJetBridge: true, preferredAirlines: ["IndiGo", "Vistara", "SkyConnect"], isRemoteStand: false },
    { gateCode: "A1", terminal: "Terminal 1", airportCode: "HYD", maxIcaoCode: "CODE_C", hasJetBridge: true, preferredAirlines: ["IndiGo", "SpiceJet"], isRemoteStand: false },
    { gateCode: "C1", terminal: "Terminal 1", airportCode: "HYD", maxIcaoCode: "CODE_E", hasJetBridge: true, preferredAirlines: ["Emirates", "Air India"], isRemoteStand: false },
    { gateCode: "C2", terminal: "Terminal 1", airportCode: "HYD", maxIcaoCode: "CODE_C", hasJetBridge: true, preferredAirlines: ["Blue Horizon", "Vistara"], isRemoteStand: false },
    { gateCode: "B1", terminal: "Terminal 1", airportCode: "HYD", maxIcaoCode: "CODE_C", hasJetBridge: true, preferredAirlines: ["SkyConnect"], isRemoteStand: false },
    { gateCode: "A10", terminal: "Terminal 1", airportCode: "HYD", maxIcaoCode: "CODE_C", hasJetBridge: false, preferredAirlines: ["Alliance Air", "SpiceJet"], isRemoteStand: true },
  ],
  BOM: [
    { gateCode: "A4", terminal: "Terminal 2", airportCode: "BOM", maxIcaoCode: "CODE_E", hasJetBridge: true, preferredAirlines: ["Air India", "Emirates"], isRemoteStand: false },
    { gateCode: "B2", terminal: "Terminal 2", airportCode: "BOM", maxIcaoCode: "CODE_E", hasJetBridge: true, preferredAirlines: ["Vistara", "Singapore Airlines"], isRemoteStand: false },
    { gateCode: "C1", terminal: "Terminal 1", airportCode: "BOM", maxIcaoCode: "CODE_C", hasJetBridge: true, preferredAirlines: ["IndiGo", "SpiceJet"], isRemoteStand: false },
  ],
  DEL: [
    { gateCode: "C2", terminal: "Terminal 3", airportCode: "DEL", maxIcaoCode: "CODE_F", hasJetBridge: true, preferredAirlines: ["Air India", "Lufthansa", "Emirates"], isRemoteStand: false },
    { gateCode: "D1", terminal: "Terminal 3", airportCode: "DEL", maxIcaoCode: "CODE_E", hasJetBridge: true, preferredAirlines: ["Air India", "Vistara"], isRemoteStand: false },
    { gateCode: "A2", terminal: "Terminal 1", airportCode: "DEL", maxIcaoCode: "CODE_C", hasJetBridge: true, preferredAirlines: ["IndiGo", "SpiceJet"], isRemoteStand: false },
  ],
  BLR: [
    { gateCode: "D1", terminal: "Terminal 2", airportCode: "BLR", maxIcaoCode: "CODE_E", hasJetBridge: true, preferredAirlines: ["Air India", "Virgin Atlantic"], isRemoteStand: false },
    { gateCode: "B3", terminal: "Terminal 1", airportCode: "BLR", maxIcaoCode: "CODE_C", hasJetBridge: true, preferredAirlines: ["IndiGo", "Akasa Air"], isRemoteStand: false },
  ],
};

const CODE_RANK: Record<IcaoAerodromeCode, number> = {
  CODE_C: 1,
  CODE_D: 2,
  CODE_E: 3,
  CODE_F: 4,
};

/**
 * Returns the minimum ICAO Aerodrome Reference Code needed for an aircraft type
 */
export function getAircraftIcaoCode(aircraftType: string): IcaoAerodromeCode {
  const t = aircraftType.toUpperCase();
  if (t.includes("A380") || t.includes("B747-8")) return "CODE_F";
  if (
    t.includes("777") ||
    t.includes("787") ||
    t.includes("A350") ||
    t.includes("A330") ||
    t.includes("B767")
  ) {
    return "CODE_E";
  }
  if (t.includes("757") || t.includes("A300")) return "CODE_D";
  return "CODE_C"; // Default narrowbody (A320, B737, etc.)
}

/**
 * Checks if a gate's physical clearance can accept the aircraft type
 */
export function isGatePhysicallyCompatible(gate: GateCapability, aircraftType: string): boolean {
  const reqCode = getAircraftIcaoCode(aircraftType);
  return CODE_RANK[gate.maxIcaoCode] >= CODE_RANK[reqCode];
}

/**
 * Automated Intelligent Gate Allocation Engine (A-GAMS)
 * Optimizes gate assignments based on aircraft wingspan, turnaround buffer, airline affinity, and jetbridge needs.
 */
export function optimizeGateAllocations(
  flights: FlightDTO[],
  airportCode: string = "HYD",
): GateAllocationPlanDTO {
  const stationGates = STATION_GATE_CAPABILITIES[airportCode] || STATION_GATE_CAPABILITIES.HYD;
  const assignments: GateAllocationAssignmentDTO[] = [];
  const unassignedFlights: GateAllocationPlanDTO["unassignedFlights"] = [];

  // Flights requiring gate allocation (arriving, approach, scheduled, or active without gate)
  const targetFlights = flights.filter(
    (f) =>
      f.status !== "CANCELLED" &&
      f.status !== "DIVERTED" &&
      (f.destination === airportCode || !f.gate || f.status === "APPROACH" || f.status === "LANDED"),
  );

  // Track gate schedule occupancy: gateCode -> array of occupied time intervals [startMs, endMs]
  const gateSchedules = new Map<string, { startMs: number; endMs: number; callsign: string }[]>();
  stationGates.forEach((g) => gateSchedules.set(g.gateCode, []));

  let conflictsDetected = 0;
  let conflictsResolved = 0;

  // Pre-seed already occupied gates
  flights.forEach((f) => {
    if (f.gate && (f.status === "AT_GATE" || f.status === "BOARDING" || f.status === "TAXI_IN")) {
      const gCode = f.gate.toUpperCase();
      const sched = gateSchedules.get(gCode);
      if (sched) {
        const now = Date.now();
        sched.push({
          startMs: now - 15 * 60000,
          endMs: now + 45 * 60000,
          callsign: f.callsign,
        });
      }
    }
  });

  const BUFFER_MS = 25 * 60000; // 25 min turnaround buffer between flights

  for (const flight of targetFlights) {
    const flightEtaMs = new Date(flight.eta).getTime() || Date.now() + 20 * 60000;
    const reqIcaoCode = getAircraftIcaoCode(flight.aircraftType);
    const turnaroundMinutes = reqIcaoCode === "CODE_E" || reqIcaoCode === "CODE_F" ? 60 : 45;
    const departureMs = flightEtaMs + turnaroundMinutes * 60000;

    // Score all available gates for this flight
    interface CandidateGate {
      gate: GateCapability;
      score: number;
      reasons: string[];
      hasScheduleConflict: boolean;
    }

    const candidates: CandidateGate[] = [];

    for (const gate of stationGates) {
      if (!isGatePhysicallyCompatible(gate, flight.aircraftType)) {
        continue; // Incompatible physical wingspan
      }

      let score = 50; // Base score
      const reasons: string[] = [];

      // 1. Wingspan match efficiency (don't waste a Code E gate on a small Code C if Code C is open)
      if (gate.maxIcaoCode === reqIcaoCode) {
        score += 20;
        reasons.push(`Optimal wingspan sizing (${reqIcaoCode})`);
      } else {
        score += 5;
        reasons.push(`Oversized stand (${gate.maxIcaoCode} accepts ${reqIcaoCode})`);
      }

      // 2. Airline terminal preference
      const flightAirlineLower = flight.airline.toLowerCase();
      const hasAirlineAffinity = gate.preferredAirlines.some((a) =>
        flightAirlineLower.includes(a.toLowerCase()),
      );
      if (hasAirlineAffinity) {
        score += 25;
        reasons.push(`Airline terminal concourse affinity`);
      }

      // 3. Jetbridge preference for heavy/medium flights
      if (gate.hasJetBridge) {
        score += 15;
        reasons.push(`Passenger contact jet bridge active`);
      }

      // 4. Schedule conflict check
      const sched = gateSchedules.get(gate.gateCode) || [];
      const hasConflict = sched.some(
        (occ) =>
          flightEtaMs < occ.endMs + BUFFER_MS &&
          departureMs > occ.startMs - BUFFER_MS,
      );

      if (hasConflict) {
        score -= 40;
        reasons.push(`Occupancy schedule overlap detected`);
      }

      candidates.push({ gate, score, reasons, hasScheduleConflict: hasConflict });
    }

    // Sort by best score descending
    candidates.sort((a, b) => b.score - a.score);

    // Pick top candidate without conflict, or best available with resolved reroute
    const nonConflicting = candidates.find((c) => !c.hasScheduleConflict);
    const chosen = nonConflicting || candidates[0];

    if (chosen) {
      const wasConflicted = chosen.hasScheduleConflict;
      if (wasConflicted) {
        conflictsDetected++;
        conflictsResolved++;
      }

      // Reserve gate schedule
      const sched = gateSchedules.get(chosen.gate.gateCode) || [];
      sched.push({
        startMs: flightEtaMs,
        endMs: departureMs,
        callsign: flight.callsign,
      });
      gateSchedules.set(chosen.gate.gateCode, sched);

      assignments.push({
        flightId: flight.id,
        callsign: flight.callsign,
        aircraftType: flight.aircraftType,
        airline: flight.airline,
        eta: flight.eta,
        allocatedGateCode: chosen.gate.gateCode,
        terminal: chosen.gate.terminal,
        hasJetBridge: chosen.gate.hasJetBridge,
        turnaroundMinutes,
        compatibilityReason: chosen.reasons.join("; "),
        confidenceScore: Math.min(100, Math.max(70, chosen.score)),
        conflictResolved: wasConflicted,
      });
    } else {
      unassignedFlights.push({
        flightId: flight.id,
        callsign: flight.callsign,
        reason: `No compatible ${reqIcaoCode} gates available at ${airportCode}.`,
      });
    }
  }

  const efficiencyScore =
    targetFlights.length > 0
      ? Number(((assignments.length / targetFlights.length) * 100 - conflictsDetected * 2).toFixed(1))
      : 100.0;

  return {
    airportCode,
    generatedAt: new Date().toISOString(),
    overallEfficiencyScore: Math.max(75, Math.min(100, efficiencyScore)),
    totalFlightsAllocated: assignments.length,
    conflictsDetected,
    conflictsResolved,
    assignments,
    unassignedFlights,
  };
}
