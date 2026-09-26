import type { DepartmentType, EmployeeDTO, EmployeeStatus, Role } from "@/lib/domain";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { generateStaffBatch, DEPARTMENT_CONFIGS, getRandomElement } from "./virtual-staff-generator";

// In-memory virtual staff cache
let memoryVirtualStaff: EmployeeDTO[] = [];
const isInitialized = false;

export function getShiftForHour(hour: number): "SHIFT_A" | "SHIFT_B" | "SHIFT_C" {
  const normalizedHour = ((hour % 24) + 24) % 24;
  if (normalizedHour >= 0 && normalizedHour < 8) return "SHIFT_A";
  if (normalizedHour >= 8 && normalizedHour < 16) return "SHIFT_B";
  return "SHIFT_C";
}

/**
 * Ensure the requested number of virtual staff exist in database/memory (up to 2,000).
 */
export async function syncVirtualStaffPool(targetCount: number, airportCode = "HYD"): Promise<number> {
  const safeCount = Math.min(2000, Math.max(10, targetCount));

  if (shouldUseDatabase()) {
    try {
      const existingCount = await prisma.employee.count({
        where: { isVirtual: true },
      });

      if (existingCount < safeCount) {
        const needed = safeCount - existingCount;
        const newStaff = generateStaffBatch(needed, airportCode);

        // Batch insert in chunks of 200 to optimize postgres throughput
        const chunkSize = 200;
        for (let i = 0; i < newStaff.length; i += chunkSize) {
          const chunk = newStaff.slice(i, i + chunkSize);
          await prisma.employee.createMany({
            data: chunk.map((s, idx) => ({
              employeeId: `VS-${String(existingCount + i + idx + 1).padStart(4, "0")}`,
              fullName: s.fullName,
              email: `vs${existingCount + i + idx + 1}@sim.aocc.test`,
              phone: s.phone,
              department: s.department,
              jobTitle: s.jobTitle,
              role: s.role,
              airportCode: s.airportCode,
              terminal: s.terminal,
              gateArea: s.gateArea,
              shift: s.shift,
              isVirtual: true,
              status: "ACTIVE",
              verificationStatus: "VERIFIED",
              currentTask: s.currentTask,
              currentLocation: s.currentLocation,
              performanceScore: s.performanceScore,
              tasksCompleted: s.tasksCompleted,
              tasksFailed: s.tasksFailed,
            })),
            skipDuplicates: true,
          });
        }
      }

      return await prisma.employee.count({ where: { isVirtual: true } });
    } catch (err) {
      console.warn("Database syncVirtualStaffPool failed; using memory pool", err);
    }
  }

  // Memory pool fallback
  if (memoryVirtualStaff.length < safeCount) {
    const needed = safeCount - memoryVirtualStaff.length;
    const generated = generateStaffBatch(needed, airportCode);
    const existingLen = memoryVirtualStaff.length;

    const mapped: EmployeeDTO[] = generated.map((s, idx) => ({
      id: `emp-vs-${existingLen + idx + 1}`,
      employeeId: `VS-${String(existingLen + idx + 1).padStart(4, "0")}`,
      fullName: s.fullName,
      email: s.email,
      phone: s.phone,
      department: s.department,
      jobTitle: s.jobTitle,
      role: s.role,
      airportCode: s.airportCode,
      terminal: s.terminal,
      gateArea: s.gateArea,
      shift: s.shift,
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
      joinDate: new Date().toISOString(),
      permissions: [],
      isVirtual: true,
      currentTask: s.currentTask,
      currentLocation: s.currentLocation,
      performanceScore: s.performanceScore,
      tasksCompleted: s.tasksCompleted,
      tasksFailed: s.tasksFailed,
    }));

    memoryVirtualStaff.push(...mapped);
  }

  return memoryVirtualStaff.length;
}

/**
 * Perform a simulation tick on virtual staff:
 * Updates current shifts based on simulation hour, rotates active tasks, and increments task counters.
 */
export async function tickVirtualStaff(simHour: number): Promise<{
  activeCount: number;
  workingCount: number;
  breakCount: number;
  offShiftCount: number;
}> {
  const currentShift = getShiftForHour(simHour);

  if (shouldUseDatabase()) {
    try {
      // Rotate tasks for a subset of working staff
      const sampleStaff = await prisma.employee.findMany({
        where: { isVirtual: true, shift: currentShift },
        take: 30,
        select: { id: true, department: true, tasksCompleted: true },
      });

      for (const s of sampleStaff) {
        const config = DEPARTMENT_CONFIGS[s.department];
        if (config) {
          const newTask = getRandomElement(config.tasks);
          const newLoc = getRandomElement(config.locations);
          await prisma.employee.update({
            where: { id: s.id },
            data: {
              currentTask: newTask,
              currentLocation: newLoc,
              tasksCompleted: { increment: 1 },
              lastLogin: new Date(),
            },
          });
        }
      }

      // Count aggregates
      const [totalActive, onShiftTotal] = await Promise.all([
        prisma.employee.count({ where: { isVirtual: true } }),
        prisma.employee.count({ where: { isVirtual: true, shift: currentShift } }),
      ]);

      const workingCount = Math.round(onShiftTotal * 0.85);
      const breakCount = Math.round(onShiftTotal * 0.15);
      const offShiftCount = totalActive - onShiftTotal;

      return {
        activeCount: onShiftTotal,
        workingCount,
        breakCount,
        offShiftCount,
      };
    } catch (err) {
      console.warn("Database tickVirtualStaff failed; using memory", err);
    }
  }

  // Memory fallback tick
  let workingCount = 0;
  let breakCount = 0;
  let offShiftCount = 0;

  for (const s of memoryVirtualStaff) {
    if (s.shift === currentShift) {
      const isBreak = Math.random() < 0.15;
      if (isBreak) {
        breakCount++;
        s.currentTask = "On scheduled shift break";
      } else {
        workingCount++;
        if (Math.random() < 0.3) {
          const cfg = DEPARTMENT_CONFIGS[s.department];
          if (cfg) {
            s.currentTask = getRandomElement(cfg.tasks);
            s.tasksCompleted = (s.tasksCompleted || 0) + 1;
          }
        }
      }
    } else {
      offShiftCount++;
      s.currentTask = "Off shift (rest period)";
    }
  }

  return {
    activeCount: workingCount + breakCount,
    workingCount,
    breakCount,
    offShiftCount,
  };
}

/**
 * Server-side paged query for Virtual Staff Directory.
 */
export async function listVirtualStaffPaged(params: {
  page?: number;
  pageSize?: number;
  department?: string;
  role?: string;
  shift?: string;
  search?: string;
}): Promise<{
  staff: EmployeeDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const skip = (page - 1) * pageSize;

  if (shouldUseDatabase()) {
    try {
      const where: Record<string, unknown> = { isVirtual: true };
      if (params.department && params.department !== "ALL") where.department = params.department;
      if (params.role && params.role !== "ALL") where.role = params.role;
      if (params.shift && params.shift !== "ALL") where.shift = params.shift;
      if (params.search) {
        where.OR = [
          { fullName: { contains: params.search, mode: "insensitive" } },
          { employeeId: { contains: params.search, mode: "insensitive" } },
          { email: { contains: params.search, mode: "insensitive" } },
        ];
      }

      const [total, records] = await Promise.all([
        prisma.employee.count({ where }),
        prisma.employee.findMany({
          where,
          orderBy: { employeeId: "asc" },
          skip,
          take: pageSize,
        }),
      ]);

      const staff: EmployeeDTO[] = records.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        fullName: r.fullName,
        email: r.email,
        phone: r.phone,
        department: r.department,
        jobTitle: r.jobTitle,
        role: r.role,
        airportCode: r.airportCode,
        terminal: r.terminal ?? undefined,
        gateArea: r.gateArea ?? undefined,
        shift: r.shift,
        status: r.status,
        verificationStatus: r.verificationStatus,
        joinDate: r.joinDate.toISOString(),
        lastLogin: r.lastLogin?.toISOString(),
        permissions: r.permissions,
        isVirtual: r.isVirtual,
        currentTask: r.currentTask ?? undefined,
        currentLocation: r.currentLocation ?? undefined,
        performanceScore: r.performanceScore,
        tasksCompleted: r.tasksCompleted,
        tasksFailed: r.tasksFailed,
        nextActivity: r.nextActivity?.toISOString(),
      }));

      return {
        staff,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    } catch (err) {
      console.warn("Database listVirtualStaffPaged failed; using memory", err);
    }
  }

  // Memory fallback
  let list = memoryVirtualStaff;
  if (params.department && params.department !== "ALL") {
    list = list.filter((s) => s.department === params.department);
  }
  if (params.role && params.role !== "ALL") {
    list = list.filter((s) => s.role === params.role);
  }
  if (params.shift && params.shift !== "ALL") {
    list = list.filter((s) => s.shift === params.shift);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter((s) => s.fullName.toLowerCase().includes(q) || s.employeeId.toLowerCase().includes(q));
  }

  const total = list.length;
  const paged = list.slice(skip, skip + pageSize);
  return {
    staff: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

/**
 * Reset virtual staff simulation data (protected: does NOT delete real human staff).
 */
export async function resetVirtualStaffSimulation(): Promise<{ deleted: number }> {
  if (shouldUseDatabase()) {
    try {
      const res = await prisma.employee.deleteMany({
        where: { isVirtual: true },
      });
      memoryVirtualStaff = [];
      return { deleted: res.count };
    } catch (err) {
      console.warn("Database resetVirtualStaffSimulation failed; clearing memory", err);
    }
  }

  const count = memoryVirtualStaff.length;
  memoryVirtualStaff = [];
  return { deleted: count };
}
