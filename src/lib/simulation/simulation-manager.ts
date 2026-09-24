import type {
  SimulationConfigDTO,
  SimulationMetricsDTO,
  SimulationStatus,
} from "@/lib/domain";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { getFinancialSummary } from "@/lib/services/credit-service";
import { listFlights } from "@/lib/services/flight-service";
import { advanceFlights } from "./logic";
import { simulateBookingTick } from "./booking-simulator";
import {
  syncVirtualStaffPool,
  tickVirtualStaff,
  resetVirtualStaffSimulation,
} from "./staff-engine";

// In-memory simulation state
let memoryConfig: SimulationConfigDTO = {
  id: "default",
  status: "RUNNING",
  staffCount: 500,
  speedMultiplier: 1.0,
  autoBookingEnabled: true,
  autoFlightEnabled: true,
  maxBookingsPerInterval: 5,
  maxBookingsPerFlight: 180,
  totalBookingsGenerated: 0,
  totalTasksProcessed: 0,
  lastTickAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

let lastTickTimestamp = Date.now();

/**
 * Get current simulation configuration from DB or memory.
 */
export async function getSimulationConfig(): Promise<SimulationConfigDTO> {
  if (shouldUseDatabase()) {
    try {
      let cfg = await prisma.simulationConfig.findUnique({
        where: { id: "default" },
      });

      if (!cfg) {
        cfg = await prisma.simulationConfig.create({
          data: {
            id: "default",
            status: "RUNNING",
            staffCount: 500,
            speedMultiplier: 1.0,
            autoBookingEnabled: true,
            autoFlightEnabled: true,
            maxBookingsPerInterval: 5,
            maxBookingsPerFlight: 180,
          },
        });
      }

      return {
        id: cfg.id,
        status: cfg.status as SimulationStatus,
        staffCount: cfg.staffCount,
        speedMultiplier: cfg.speedMultiplier,
        autoBookingEnabled: cfg.autoBookingEnabled,
        autoFlightEnabled: cfg.autoFlightEnabled,
        maxBookingsPerInterval: cfg.maxBookingsPerInterval,
        maxBookingsPerFlight: cfg.maxBookingsPerFlight,
        totalBookingsGenerated: cfg.totalBookingsGenerated,
        totalTasksProcessed: cfg.totalTasksProcessed,
        lastTickAt: cfg.lastTickAt?.toISOString(),
        updatedAt: cfg.updatedAt.toISOString(),
        createdAt: cfg.createdAt.toISOString(),
      };
    } catch (err) {
      console.warn("Database getSimulationConfig failed, using memory", err);
    }
  }

  return { ...memoryConfig };
}

/**
 * Update simulation configuration (e.g. speed multiplier, staff count, toggles).
 */
export async function updateSimulationConfig(
  updates: Partial<Omit<SimulationConfigDTO, "id" | "createdAt" | "updatedAt">>
): Promise<SimulationConfigDTO> {
  if (updates.staffCount !== undefined) {
    updates.staffCount = Math.min(2000, Math.max(10, updates.staffCount));
    // Ensure staff pool is synchronized to target count
    await syncVirtualStaffPool(updates.staffCount);
  }

  if (updates.speedMultiplier !== undefined) {
    const validSpeeds = [0.5, 1.0, 2.0, 5.0, 10.0];
    if (!validSpeeds.includes(updates.speedMultiplier)) {
      updates.speedMultiplier = 1.0;
    }
  }

  if (shouldUseDatabase()) {
    try {
      const updated = await prisma.simulationConfig.upsert({
        where: { id: "default" },
        update: {
          ...updates,
          status: updates.status ? (updates.status as any) : undefined,
          updatedAt: new Date(),
        },
        create: {
          id: "default",
          status: (updates.status as any) || "RUNNING",
          staffCount: updates.staffCount || 500,
          speedMultiplier: updates.speedMultiplier || 1.0,
          autoBookingEnabled: updates.autoBookingEnabled ?? true,
          autoFlightEnabled: updates.autoFlightEnabled ?? true,
          maxBookingsPerInterval: updates.maxBookingsPerInterval || 5,
          maxBookingsPerFlight: updates.maxBookingsPerFlight || 180,
        },
      });

      return {
        id: updated.id,
        status: updated.status as SimulationStatus,
        staffCount: updated.staffCount,
        speedMultiplier: updated.speedMultiplier,
        autoBookingEnabled: updated.autoBookingEnabled,
        autoFlightEnabled: updated.autoFlightEnabled,
        maxBookingsPerInterval: updated.maxBookingsPerInterval,
        maxBookingsPerFlight: updated.maxBookingsPerFlight,
        totalBookingsGenerated: updated.totalBookingsGenerated,
        totalTasksProcessed: updated.totalTasksProcessed,
        lastTickAt: updated.lastTickAt?.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        createdAt: updated.createdAt.toISOString(),
      };
    } catch (err) {
      console.warn("Database updateSimulationConfig failed, using memory", err);
    }
  }

  memoryConfig = {
    ...memoryConfig,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return { ...memoryConfig };
}

/**
 * Start or resume simulation.
 */
export async function startSimulation(): Promise<SimulationConfigDTO> {
  return await updateSimulationConfig({ status: "RUNNING" });
}

/**
 * Pause simulation.
 */
export async function pauseSimulation(): Promise<SimulationConfigDTO> {
  return await updateSimulationConfig({ status: "PAUSED" });
}

/**
 * Stop simulation.
 */
export async function stopSimulation(): Promise<SimulationConfigDTO> {
  return await updateSimulationConfig({ status: "STOPPED" });
}

/**
 * Reset simulation state safely (never deleting real user accounts or real flights).
 */
export async function resetSimulation(): Promise<{
  success: boolean;
  message: string;
  config: SimulationConfigDTO;
}> {
  await resetVirtualStaffSimulation();

  if (shouldUseDatabase()) {
    try {
      await prisma.$transaction([
        prisma.simulationTask.deleteMany({}),
        prisma.simulationEvent.deleteMany({}),
        prisma.simulationConfig.upsert({
          where: { id: "default" },
          update: {
            totalBookingsGenerated: 0,
            totalTasksProcessed: 0,
            lastTickAt: new Date(),
          },
          create: {
            id: "default",
            totalBookingsGenerated: 0,
            totalTasksProcessed: 0,
          },
        }),
      ]);
    } catch (err) {
      console.warn("Database resetSimulation transaction failed", err);
    }
  }

  memoryConfig.totalBookingsGenerated = 0;
  memoryConfig.totalTasksProcessed = 0;
  memoryConfig.lastTickAt = new Date().toISOString();

  // Re-sync standard 500 staff
  await syncVirtualStaffPool(memoryConfig.staffCount);

  return {
    success: true,
    message: "Simulation reset successfully. Virtual staff roster restored to nominal baseline.",
    config: await getSimulationConfig(),
  };
}

/**
 * Execute 1 or N simulation ticks:
 * 1. Advances virtual staff shifts and active tasks
 * 2. Simulates passenger bookings and debits credit ledger
 * 3. Advances flight operational phases (pushback, taxi, takeoff, cruise, approach, landing)
 * 4. Resolves simulation tasks
 * 5. Aggregates live simulation metrics
 */
export async function executeSimulationTick(steps = 1): Promise<{
  metrics: SimulationMetricsDTO;
  config: SimulationConfigDTO;
  stepResults: {
    bookingsGenerated: number;
    tasksProcessed: number;
  };
}> {
  const config = await getSimulationConfig();
  const safeSteps = Math.min(10, Math.max(1, steps));

  let totalNewBookings = 0;
  let totalTasksProcessed = 0;

  const now = new Date();
  const currentSimHour = now.getUTCHours() + 5.5; // Indian Standard Time (UTC+5:30)

  // 1. Staff Engine Tick
  const staffCounts = await tickVirtualStaff(Math.floor(currentSimHour));

  // 2. Flight Simulation Tick if autoFlightEnabled
  if (config.autoFlightEnabled && config.status === "RUNNING") {
    try {
      const flights = await listFlights();
      const tickDurationMs = 5000 * config.speedMultiplier * safeSteps;
      advanceFlights(flights, tickDurationMs);
    } catch (err) {
      console.warn("Flight advance tick error", err);
    }
  }

  // 3. Automated Booking Tick if autoBookingEnabled
  if (config.autoBookingEnabled && config.status === "RUNNING") {
    const bookingResult = await simulateBookingTick({
      maxBookings: Math.min(config.maxBookingsPerInterval * safeSteps, 20),
      maxPerFlight: config.maxBookingsPerFlight,
    });
    totalNewBookings += bookingResult.generatedCount;
  }

  // 4. Resolve a slice of Simulation Tasks
  if (shouldUseDatabase() && config.status === "RUNNING") {
    try {
      // Transition some pending tasks to in_progress / completed
      const pendingTasks = await prisma.simulationTask.findMany({
        where: { status: "PENDING" },
        take: 10 * safeSteps,
        select: { id: true, staffId: true },
      });

      if (pendingTasks.length > 0) {
        const taskIds = pendingTasks.map((t) => t.id);
        await prisma.simulationTask.updateMany({
          where: { id: { in: taskIds } },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
        totalTasksProcessed += pendingTasks.length;
      }
    } catch (err) {
      console.warn("Simulation task processing error", err);
    }
  } else {
    totalTasksProcessed += Math.floor(Math.random() * 5 * safeSteps);
  }

  // Update config counters
  const updatedConfig = await updateSimulationConfig({
    totalBookingsGenerated: config.totalBookingsGenerated + totalNewBookings,
    totalTasksProcessed: config.totalTasksProcessed + totalTasksProcessed,
    lastTickAt: new Date().toISOString(),
  });

  const metrics = await getSimulationMetrics();

  return {
    metrics,
    config: updatedConfig,
    stepResults: {
      bookingsGenerated: totalNewBookings,
      tasksProcessed: totalTasksProcessed,
    },
  };
}

/**
 * Calculate comprehensive simulation operational metrics.
 */
export async function getSimulationMetrics(): Promise<SimulationMetricsDTO> {
  const config = await getSimulationConfig();
  const financial = await getFinancialSummary();

  if (shouldUseDatabase()) {
    try {
      const [
        totalStaff,
        activeStaff,
        completedTasks,
        failedTasks,
        pendingTasks,
      ] = await Promise.all([
        prisma.employee.count({ where: { isVirtual: true } }),
        prisma.employee.count({ where: { isVirtual: true, status: "ACTIVE" } }),
        prisma.simulationTask.count({ where: { status: "COMPLETED" } }),
        prisma.simulationTask.count({ where: { status: "FAILED" } }),
        prisma.simulationTask.count({ where: { status: "PENDING" } }),
      ]);

      const workingStaff = Math.round(activeStaff * 0.75);
      const onBreakStaff = Math.round(activeStaff * 0.12);
      const idleStaff = Math.round(activeStaff * 0.13);
      const offShiftStaff = Math.max(0, totalStaff - activeStaff);

      return {
        totalStaff,
        activeStaff,
        workingStaff,
        onBreakStaff,
        offShiftStaff,
        idleStaff,
        completedTasks: completedTasks + config.totalTasksProcessed,
        failedTasks,
        pendingTasks,
        activeBookings: financial.activeBookingsCount,
        totalRevenue: financial.totalSimulatedRevenue,
        totalCreditsUsed: financial.totalCreditsUsed,
        simSpeed: config.speedMultiplier,
        status: config.status,
      };
    } catch (err) {
      console.warn("Database getSimulationMetrics failed; using calculated values", err);
    }
  }

  // Fallback metrics
  const totalStaff = config.staffCount;
  const activeStaff = Math.round(totalStaff * 0.65);
  const workingStaff = Math.round(activeStaff * 0.78);
  const onBreakStaff = Math.round(activeStaff * 0.12);
  const idleStaff = Math.round(activeStaff * 0.10);
  const offShiftStaff = totalStaff - activeStaff;

  return {
    totalStaff,
    activeStaff,
    workingStaff,
    onBreakStaff,
    offShiftStaff,
    idleStaff,
    completedTasks: config.totalTasksProcessed,
    failedTasks: 0,
    pendingTasks: 4,
    activeBookings: financial.activeBookingsCount || 12,
    totalRevenue: financial.totalSimulatedRevenue || 148500,
    totalCreditsUsed: financial.totalCreditsUsed || 45000,
    simSpeed: config.speedMultiplier,
    status: config.status,
  };
}
