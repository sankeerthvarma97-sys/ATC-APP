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
});
