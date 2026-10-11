import { describe, expect, it } from "vitest";
import { generateStaffBatch, DEPARTMENT_CONFIGS } from "../src/lib/simulation/virtual-staff-generator";
import {
  syncVirtualStaffPool,
  getShiftForHour,
  tickVirtualStaff,
  listVirtualStaffPaged,
  resetVirtualStaffSimulation,
} from "../src/lib/simulation/staff-engine";

describe("Virtual Staff Simulation Engine (Up to 10,000 Staff)", () => {
  it("should generate realistic staff batches with appropriate department distribution", () => {
    const batch = generateStaffBatch(50, "HYD");
    expect(batch.length).toBe(50);

    const first = batch[0];
    expect(first.fullName).toBeTruthy();
    expect(first.email).toMatch(/@sim\.aocc\.test$/);
    expect(first.phone).toMatch(/^\+91/);
    expect(first.airportCode).toBe("HYD");
    expect(first.isVirtual).toBe(true);
    expect(first.performanceScore).toBeGreaterThanOrEqual(80);
    expect(first.performanceScore).toBeLessThanOrEqual(100);

    // Verify departments belong to known configurations
    for (const staff of batch) {
      expect(DEPARTMENT_CONFIGS[staff.department]).toBeDefined();
    }
  });

  it("should correctly partition 24/7 operations into Shift A, B, and C", () => {
    // 00:00 - 07:59 -> Shift A (Night/Early Morning)
    expect(getShiftForHour(0)).toBe("SHIFT_A");
    expect(getShiftForHour(4)).toBe("SHIFT_A");
    expect(getShiftForHour(7)).toBe("SHIFT_A");

    // 08:00 - 15:59 -> Shift B (Day peak)
    expect(getShiftForHour(8)).toBe("SHIFT_B");
    expect(getShiftForHour(12)).toBe("SHIFT_B");
    expect(getShiftForHour(15)).toBe("SHIFT_B");

    // 16:00 - 23:59 -> Shift C (Evening/Late)
    expect(getShiftForHour(16)).toBe("SHIFT_C");
    expect(getShiftForHour(20)).toBe("SHIFT_C");
    expect(getShiftForHour(23)).toBe("SHIFT_C");
  });

  it("should scale virtual staff pool up to target count (e.g. 100, 500, up to 10,000)", async () => {
    const count100 = await syncVirtualStaffPool(100, "HYD");
    expect(count100).toBeGreaterThanOrEqual(100);

    const count250 = await syncVirtualStaffPool(250, "HYD");
    expect(count250).toBeGreaterThanOrEqual(250);

    const count1000 = await syncVirtualStaffPool(1000, "HYD");
    expect(count1000).toBeGreaterThanOrEqual(1000);
  });

  it("should execute virtual staff ticks rotating shifts and tasks", async () => {
    // Tick at 10 AM (Shift B)
    const tickResultB = await tickVirtualStaff(10);
    expect(tickResultB.activeCount).toBeGreaterThan(0);
    expect(tickResultB.workingCount).toBeGreaterThan(0);
    expect(tickResultB.offShiftCount).toBeGreaterThan(0);

    // Tick at 2 AM (Shift A)
    const tickResultA = await tickVirtualStaff(2);
    expect(tickResultA.activeCount).toBeGreaterThan(0);
  });

  it("should support server-side paged queries with filters", async () => {
    const pagedAll = await listVirtualStaffPaged({ page: 1, pageSize: 15 });
    expect(pagedAll.staff.length).toBeLessThanOrEqual(15);
    expect(pagedAll.total).toBeGreaterThan(0);
    expect(pagedAll.page).toBe(1);

    // Filter by department
    const pagedAtc = await listVirtualStaffPaged({
      department: "AIR_TRAFFIC_CONTROL",
      pageSize: 10,
    });
    for (const member of pagedAtc.staff) {
      expect(member.department).toBe("AIR_TRAFFIC_CONTROL");
    }

    // Filter by shift
    const pagedShiftA = await listVirtualStaffPaged({
      shift: "SHIFT_A",
      pageSize: 10,
    });
    for (const member of pagedShiftA.staff) {
      expect(member.shift).toBe("SHIFT_A");
    }
  });

  it("should reset virtual staff simulation state cleanly", async () => {
    await resetVirtualStaffSimulation();
    const pagedAfterReset = await listVirtualStaffPaged({ page: 1, pageSize: 10 });
    for (const member of pagedAfterReset.staff) {
      expect(member.tasksCompleted).toBe(0);
      expect(member.tasksFailed).toBe(0);
      expect(member.performanceScore).toBe(95);
    }
  });
});
