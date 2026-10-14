import { describe, expect, it } from "vitest";
import {
  getAircraftIcaoCode,
  isGatePhysicallyCompatible,
  optimizeGateAllocations,
  STATION_GATE_CAPABILITIES,
} from "@/lib/services/gate-allocation-service";
import type { FlightDTO } from "@/lib/domain";

describe("Automated Intelligent Gate Allocation (A-GAMS)", () => {
  it("classifies aircraft into correct ICAO Aerodrome Reference Codes", () => {
    expect(getAircraftIcaoCode("Airbus A380-800")).toBe("CODE_F");
    expect(getAircraftIcaoCode("Boeing 777-300ER")).toBe("CODE_E");
    expect(getAircraftIcaoCode("Boeing 787-8 Dreamliner")).toBe("CODE_E");
    expect(getAircraftIcaoCode("Airbus A350-900")).toBe("CODE_E");
    expect(getAircraftIcaoCode("Airbus A320neo")).toBe("CODE_C");
    expect(getAircraftIcaoCode("Boeing 737-800")).toBe("CODE_C");
  });

  it("enforces physical wingspan compatibility restrictions per gate", () => {
    const widebodyGate = STATION_GATE_CAPABILITIES.HYD.find((g) => g.gateCode === "B12")!;
    const narrowbodyGate = STATION_GATE_CAPABILITIES.HYD.find((g) => g.gateCode === "A4")!;

    // Code E gate accepts both widebody and narrowbody
    expect(isGatePhysicallyCompatible(widebodyGate, "Boeing 787-8")).toBe(true);
    expect(isGatePhysicallyCompatible(widebodyGate, "Airbus A320neo")).toBe(true);

    // Code C gate rejects widebody
    expect(isGatePhysicallyCompatible(narrowbodyGate, "Boeing 777-300ER")).toBe(false);
    expect(isGatePhysicallyCompatible(narrowbodyGate, "Airbus A350-900")).toBe(false);
    expect(isGatePhysicallyCompatible(narrowbodyGate, "Airbus A320neo")).toBe(true);
  });

  it("optimizes gate allocations for arrival fleet with airline and size matching", () => {
    const mockFlights: FlightDTO[] = [
      {
        id: "flt-ai-widebody",
        callsign: "AIC101",
        flightNumber: "AI101",
        airline: "Air India",
        aircraftType: "Boeing 787-8",
        status: "APPROACH",
        phase: "Final approach",
        origin: "DEL",
        destination: "HYD",
        squawk: "4211",
        latitude: 17.24,
        longitude: 78.43,
        altitudeFt: 3000,
        speedKt: 160,
        headingDeg: 90,
        verticalSpeedFpm: -700,
        fuelKg: 14000,
        riskScore: 10,
        eta: new Date(Date.now() + 15 * 60000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "flt-igo-narrowbody",
        callsign: "IGO502",
        flightNumber: "6E502",
        airline: "IndiGo",
        aircraftType: "Airbus A320neo",
        status: "APPROACH",
        phase: "Base leg",
        origin: "BOM",
        destination: "HYD",
        squawk: "4212",
        latitude: 17.26,
        longitude: 78.45,
        altitudeFt: 4500,
        speedKt: 190,
        headingDeg: 120,
        verticalSpeedFpm: -500,
        fuelKg: 6500,
        riskScore: 5,
        eta: new Date(Date.now() + 25 * 60000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const plan = optimizeGateAllocations(mockFlights, "HYD");

    expect(plan.airportCode).toBe("HYD");
    expect(plan.totalFlightsAllocated).toBe(2);
    expect(plan.overallEfficiencyScore).toBeGreaterThanOrEqual(80);

    // Widebody flight assigned to Code E heavy stand (B12, B14, or C1)
    const widebodyAssignment = plan.assignments.find((a) => a.callsign === "AIC101")!;
    expect(widebodyAssignment).toBeDefined();
    expect(["B12", "B14", "C1"]).toContain(widebodyAssignment.allocatedGateCode);
    expect(widebodyAssignment.hasJetBridge).toBe(true);
    expect(widebodyAssignment.turnaroundMinutes).toBe(60);

    // Narrowbody IndiGo assigned to contact gate (e.g. A4, A1, B1)
    const narrowbodyAssignment = plan.assignments.find((a) => a.callsign === "IGO502")!;
    expect(narrowbodyAssignment).toBeDefined();
    expect(narrowbodyAssignment.turnaroundMinutes).toBe(45);
  });
});
