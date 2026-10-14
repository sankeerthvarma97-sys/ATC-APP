import { describe, expect, it } from "vitest";
import {
  getSimulationConfig,
  getSimulationMetrics,
  startSimulation,
  pauseSimulation,
  stopSimulation,
  updateSimulationConfig,
  executeSimulationTick,
  resetSimulation,
} from "../src/lib/simulation/simulation-manager";

describe("Master Simulation Controller", () => {
  it("should initialize or retrieve default simulation config", async () => {
    const config = await getSimulationConfig();
    expect(config).toBeDefined();
    expect(config.staffCount).toBeGreaterThanOrEqual(10);
    expect(config.speedMultiplier).toBeGreaterThan(0);
  });

  it("should support state transitions (RUNNING, PAUSED, STOPPED)", async () => {
    const paused = await pauseSimulation();
    expect(paused.status).toBe("PAUSED");

    const resumed = await startSimulation();
    expect(resumed.status).toBe("RUNNING");

    const stopped = await stopSimulation();
    expect(stopped.status).toBe("STOPPED");

    // Restore to RUNNING
    const running = await startSimulation();
    expect(running.status).toBe("RUNNING");
  });

  it("should update configuration parameters safely", async () => {
    const updated = await updateSimulationConfig({
      speedMultiplier: 2.0,
      autoBookingEnabled: true,
      autoFlightEnabled: true,
      maxBookingsPerInterval: 3,
    });

    expect(updated.speedMultiplier).toBe(2.0);
    expect(updated.maxBookingsPerInterval).toBe(3);
  });

  it("should execute simulation ticks and return updated metrics", async () => {
    await startSimulation();
    const tickResult = await executeSimulationTick(1);

    expect(tickResult).toBeDefined();
    expect(tickResult.metrics).toBeDefined();
    expect(tickResult.metrics.totalStaff).toBeGreaterThan(0);
    expect(tickResult.config).toBeDefined();
  });

  it("should calculate simulation metrics including staff and financial KPIs", async () => {
    const metrics = await getSimulationMetrics();

    expect(metrics.totalStaff).toBeGreaterThan(0);
    expect(metrics.activeStaff).toBeGreaterThan(0);
    expect(metrics.workingStaff).toBeGreaterThan(0);
    expect(typeof metrics.totalRevenue).toBe("number");
    expect(typeof metrics.totalCreditsUsed).toBe("number");
  });

  it("should reset simulation counters safely", async () => {
    const reset = await resetSimulation();
    expect(reset.success).toBe(true);
    expect(reset.config.totalBookingsGenerated).toBe(0);
    expect(reset.config.totalTasksProcessed).toBe(0);
  });
});
