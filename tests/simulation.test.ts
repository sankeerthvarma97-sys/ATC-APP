import { describe, expect, it } from "vitest";
import { createInitialFlights, createInitialResources } from "@/lib/data/mock";
import { applyFlightCommand, computeMetrics } from "@/lib/simulation/logic";

describe("AOCC simulation logic", () => {
  it("computes metrics from live flights and resources", () => {
    const metrics = computeMetrics(createInitialFlights(), createInitialResources());

    expect(metrics.activeFlights).toBeGreaterThan(0);
    expect(metrics.runwayUtilization).toBeGreaterThan(0);
    expect(metrics.emergencyCount).toBe(1);
  });

  it("applies flight commands without mutating unrelated flights", () => {
    const flights = createInitialFlights();
    const target = flights[0];
    const updated = applyFlightCommand(flights, {
      flightId: target.id,
      type: "HOLD",
      note: "Sequence for wake spacing",
    });

    const changed = updated.find((flight) => flight.id === target.id);
    const untouched = updated.find((flight) => flight.id === flights[1].id);

    expect(changed?.status).toBe("HOLDING");
    expect(changed?.riskScore).toBeGreaterThan(target.riskScore);
    expect(untouched?.status).toBe(flights[1].status);
  });

  it("applies pushback and taxi clearance commands cleanly", () => {
    const flights = createInitialFlights();
    const target = flights[1]; // flt-dal88
    const pushbackResult = applyFlightCommand(flights, {
      flightId: target.id,
      type: "PUSHBACK_APPROVE",
      note: "Cleared push and start Facing West",
    });

    const pushed = pushbackResult.find((f) => f.id === target.id);
    expect(pushed?.status).toBe("PUSHBACK");
    expect(pushed?.speedKt).toBe(4);

    const taxiResult = applyFlightCommand(pushbackResult, {
      flightId: target.id,
      type: "TAXI_CLEARANCE",
      note: "Taxi to holding point RWY 04L via Kilo",
    });

    const taxied = taxiResult.find((f) => f.id === target.id);
    expect(taxied?.status).toBe("TAXI_OUT");
    expect(taxied?.speedKt).toBe(18);
  });

  it("advances airborne and approach flights along glideslope to touchdown", async () => {
    const { advanceFlight } = await import("@/lib/simulation/logic");
    const approachingFlight = {
      ...createInitialFlights()[0],
      status: "APPROACH" as const,
      altitudeFt: 180,
      speedKt: 140,
      verticalSpeedFpm: -700,
    };

    // Advance 12 seconds
    const advanced = advanceFlight(approachingFlight, 12000, 0);
    expect(advanced.status).toBe("LANDED");
    expect(advanced.altitudeFt).toBe(0);
    expect(advanced.speedKt).toBeLessThanOrEqual(82);
  });

  it("synchronizes runways and gates with active flight rollouts", async () => {
    const { syncResourcesWithFlights } = await import("@/lib/simulation/logic");
    const resources = createInitialResources();
    const flights = [
      {
        ...createInitialFlights()[0],
        status: "DEPARTING" as const,
        runway: "04L",
      },
      {
        ...createInitialFlights()[1],
        status: "AT_GATE" as const,
        gate: "A12",
      },
    ];

    const synced = syncResourcesWithFlights(resources, flights);
    const rwy04L = synced.find((r) => r.code === "04L" && r.resourceType === "RUNWAY");
    const gateA12 = synced.find((r) => r.code === "A12" && r.resourceType === "GATE");

    expect(rwy04L?.status).toBe("OCCUPIED");
    expect(gateA12?.status).toBe("OCCUPIED");
  });
});
