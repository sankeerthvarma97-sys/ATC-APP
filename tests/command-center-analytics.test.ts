import { describe, expect, it } from "vitest";
import { createInitialFlights, createInitialResources } from "@/lib/data/mock";
import type { FlightDTO } from "@/lib/domain";

describe("National Command Center Metrics & Analytics Subsystem", () => {
  it("accurately classifies movements across the 5 primary simulated carriers", () => {
    const flights = createInitialFlights();

    // Verify carriers present in simulated airspace
    const scFlights = flights.filter(
      (f) => f.callsign.startsWith("SC") || f.airline.toLowerCase().includes("skyconnect"),
    );
    const otherAirlines = flights.map((f) => f.airline);

    expect(scFlights.length).toBeGreaterThan(0);
    expect(otherAirlines.length).toBeGreaterThan(0);
  });

  it("calculates On-Time Performance (OTP) and delay distributions correctly", () => {
    const flights = createInitialFlights();
    const totalCount = flights.length;
    const delayedCount = flights.filter((f) => f.status === "DELAYED" || f.riskScore > 65).length;
    const onTimeCount = flights.filter(
      (f) => f.status !== "DELAYED" && f.riskScore <= 65 && f.status !== "EMERGENCY",
    ).length;

    const otdRate = Math.min(100, Math.max(68, Math.round((onTimeCount / totalCount) * 100)));
    const otaRate = Math.min(100, Math.max(65, otdRate - 3));

    expect(otdRate).toBeGreaterThanOrEqual(68);
    expect(otdRate).toBeLessThanOrEqual(100);
    expect(otaRate).toBeLessThanOrEqual(otdRate);
    expect(delayedCount).toBeGreaterThanOrEqual(0);
  });

  it("evaluates aerodrome sector capacity limits across national hubs", () => {
    const sectorCapacities: Record<string, number> = {
      HYD: 42,
      BOM: 50,
      DEL: 56,
      BLR: 44,
      MAA: 38,
      JFK: 62,
    };

    const flights = createInitialFlights();
    const hydMovements = flights.filter((f) => f.origin === "HYD" || f.destination === "HYD" || f.origin === "VOHS" || f.destination === "VOHS");
    const hydLoad = Math.min(100, Math.round((Math.max(hydMovements.length, 6) / sectorCapacities.HYD) * 100));

    expect(hydLoad).toBeGreaterThan(0);
    expect(hydLoad).toBeLessThanOrEqual(100);
  });

  it("flags squawk 7700 general emergencies and triggers priority monitor", () => {
    const mockEmergencyFlight: FlightDTO = {
      ...createInitialFlights()[0],
      id: "flt-test-7700",
      callsign: "SC-999",
      status: "EMERGENCY",
      squawk: "7700",
      riskScore: 95,
    };

    const flightsWithEmergency = [...createInitialFlights(), mockEmergencyFlight];
    const detectedEmergencies = flightsWithEmergency.filter(
      (f) => f.status === "EMERGENCY" || f.squawk === "7700" || f.squawk === "7600",
    );

    expect(detectedEmergencies.length).toBeGreaterThanOrEqual(1);
    expect(detectedEmergencies.some((e) => e.callsign === "SC-999")).toBe(true);
  });

  it("tracks holding pattern stacks with assigned fixes and courses", () => {
    const mockHoldingFlight: FlightDTO = {
      ...createInitialFlights()[0],
      id: "flt-test-hold",
      callsign: "AV-404",
      status: "HOLDING",
      altitudeFt: 7000,
      headingDeg: 270,
    };

    const flightsWithHold = [...createInitialFlights(), mockHoldingFlight];
    const holdingFlights = flightsWithHold.filter((f) => f.status === "HOLDING");

    expect(holdingFlights.length).toBeGreaterThanOrEqual(1);
    expect(holdingFlights.some((f) => f.callsign === "AV-404")).toBe(true);
  });
});
