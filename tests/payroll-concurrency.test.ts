import { describe, expect, it } from "vitest";
import {
  getOrCreateSalaryProfile,
  applySalaryHike,
  applySalaryReduction,
  previewPayroll,
  processPayroll,
  getPayrollCalendar,
} from "@/lib/services/payroll-service";
import { initializeCompanyTreasury, listFinancialAccounts } from "@/lib/services/company-finance-service";

describe("24/7 Automated Payroll & Critical Concurrency Tests", () => {
  const testPeriod = `PAYROLL-TEST-${Date.now()}`;
  const testEmpId = `emp-test-${Date.now()}`;

  it("should calculate salary profile accurately based on department benchmarks", async () => {
    const profile = await getOrCreateSalaryProfile(testEmpId);

    expect(profile).toBeDefined();
    expect(profile.baseSalary).toBeGreaterThan(0);
    expect(profile.allowances).toBe(Math.round(profile.baseSalary * 0.15));
    expect(profile.deductions).toBe(Math.round(profile.baseSalary * 0.10));

    // Gross = Base + Allowances + Overtime + Bonus
    const expectedGross = profile.baseSalary + profile.allowances + profile.overtime + profile.bonus;
    expect(profile.grossSalary).toBe(expectedGross);

    // Net = Gross - Deductions
    expect(profile.netSalary).toBe(expectedGross - profile.deductions);
  });

  it("should apply percentage and fixed salary hikes correctly with revision audit", async () => {
    const initialProfile = await getOrCreateSalaryProfile(testEmpId);
    const initialBase = initialProfile.baseSalary;

    // 10% percentage hike
    const hikedProfile = await applySalaryHike({
      employeeId: testEmpId,
      hikeType: "PERCENTAGE",
      value: 10,
      reason: "Annual performance review",
      adminId: "usr-admin-test",
    });

    const expectedNewBase = Math.round(initialBase * 1.10);
    expect(hikedProfile.baseSalary).toBe(expectedNewBase);
    expect(hikedProfile.netSalary).toBeGreaterThan(initialProfile.netSalary);

    // ₹5,000 fixed hike
    const fixedHikedProfile = await applySalaryHike({
      employeeId: testEmpId,
      hikeType: "FIXED",
      value: 5000,
      reason: "Operational excellence allowance",
      adminId: "usr-admin-test",
    });

    expect(fixedHikedProfile.baseSalary).toBe(expectedNewBase + 5000);
  });

  it("should apply salary reduction with reason and audit", async () => {
    const reducedProfile = await applySalaryReduction({
      employeeId: testEmpId,
      newSalary: 60000,
      reason: "Role realignment adjustment",
      adminId: "usr-admin-test",
    });

    expect(reducedProfile.baseSalary).toBe(60000);
    expect(reducedProfile.allowances).toBe(9000); // 15%
    expect(reducedProfile.deductions).toBe(6000); // 10%
    expect(reducedProfile.grossSalary).toBe(69000);
    expect(reducedProfile.netSalary).toBe(63000);
  });

  it("should preview payroll without modifying any account or employee balances (Pre-Flight Check)", async () => {
    await initializeCompanyTreasury();
    const accountsBefore = await listFinancialAccounts();
    const payrollAccBefore = accountsBefore.find((a) => a.accountType === "PAYROLL_ACCOUNT")!;

    const preview = await previewPayroll(testPeriod);

    expect(preview).toBeDefined();
    expect(preview.period).toBe(testPeriod);
    expect(preview.employeeCount).toBeGreaterThanOrEqual(1);
    expect(preview.grossSalary).toBeGreaterThan(0);
    expect(preview.netSalary).toBeGreaterThan(0);
    expect(preview.companyBalance).toBe(payrollAccBefore.balance);
    expect(preview.isSufficient).toBe(true);

    // Verify balances did NOT change during preview
    const accountsAfter = await listFinancialAccounts();
    const payrollAccAfter = accountsAfter.find((a) => a.accountType === "PAYROLL_ACCOUNT")!;
    expect(payrollAccAfter.balance).toBe(payrollAccBefore.balance);
  });

  // =========================================================================
  // CRITICAL REQUIREMENT (PART 82): WORKER A vs WORKER B CONCURRENCY TEST
  // =========================================================================
  it("PART 82: should ensure idempotent concurrent execution (Worker A vs Worker B)", async () => {
    const concurrentPeriod = `PAYROLL-CONCUR-${Date.now()}`;

    // Launch Worker A and Worker B concurrently against the EXACT same payroll period
    const [workerA, workerB] = await Promise.all([
      processPayroll({
        payrollPeriod: concurrentPeriod,
        approvedBy: "WORKER_A",
        forceRun: true,
      }),
      processPayroll({
        payrollPeriod: concurrentPeriod,
        approvedBy: "WORKER_B",
        forceRun: true,
      }),
    ]);

    // One worker must succeed, and the other must safely detect the in-progress/paid state and exit safely
    const successCount = (workerA.success ? 1 : 0) + (workerB.success ? 1 : 0);
    expect(successCount).toBeGreaterThanOrEqual(1);

    // If both returned success (e.g. one returned existing completed record), verify exact same payroll ID
    if (workerA.success && workerB.success) {
      expect(workerA.payroll.id).toBe(workerB.payroll.id);
      expect(workerA.payroll.payrollPeriod).toBe(concurrentPeriod);
    } else {
      const winner = workerA.success ? workerA : workerB;
      const safeExit = workerA.success ? workerB : workerA;
      expect(winner.payroll.status).toBe("PAID");
      expect(safeExit.message).toMatch(/(already processed|currently processing|SAFE EXIT)/i);
    }

    // Verify third subsequent execution is safely idempotent
    const rerun = await processPayroll({
      payrollPeriod: concurrentPeriod,
      approvedBy: "WORKER_C",
    });

    expect(rerun.success).toBe(true);
    expect(rerun.message).toMatch(/already paid/i);
    expect(rerun.payroll.status).toBe("PAID");
  });

  it("should provide payroll calendar schedule with status tracking", async () => {
    const calendar = await getPayrollCalendar();
    expect(calendar).toBeDefined();
    expect(calendar.length).toBeGreaterThanOrEqual(1);

    const event = calendar[0];
    expect(event.period).toBeDefined();
    expect(event.employeeCount).toBeGreaterThan(0);
    expect(event.netAmount).toBeGreaterThan(0);
    expect(event.status).toBeDefined();
  });
});
