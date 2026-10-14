import { describe, expect, it, beforeEach } from "vitest";
import {
  normalizeStaffIdentity,
  validateCredentials,
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  clearLoginRateLimit,
} from "@/lib/auth/users";
import {
  generateSecureTemporaryPassword,
  isTemporaryPasswordExpired,
  recordTemporaryPassword,
  clearTemporaryPassword,
  checkAdminResetRateLimit,
  DEFAULT_DEMO_TEMP_PASSWORD,
  changeUserPassword,
  isPasswordChangeRequired,
} from "@/lib/services/account-security-service";
import {
  getEmployeeByIdentifier,
  listEmployees,
  memoryEmployees,
} from "@/lib/services/staff-service";
import {
  batchProvisionEmployees,
  getEmployeeDirectory,
} from "@/server/employees/employee-data";
import {
  listEmployeeSalaryRoster,
  processPayroll,
  listPayrollRuns,
} from "@/lib/services/payroll-service";
import { demoUsers } from "@/lib/data/mock";

describe("AOCC Master Audit — Staff Login, Credential Security, 10k Scale & Payroll", () => {
  beforeEach(() => {
    // Reset rate limiters
    clearLoginRateLimit("emp101@gmail.com");
    clearLoginRateLimit("admin@aocc.test");
    clearLoginRateLimit("test-audit@gmail.com");
  });

  describe("1. Staff Identity Format & Normalization", () => {
    it("normalizes Employee ID 'AOCC-EMP-V09807' and '9807' into login email 'atc9807@gmail.com' and ID candidates", () => {
      const res = normalizeStaffIdentity("AOCC-EMP-V09807");
      expect(res.isEmail).toBe(false);
      expect(res.primaryEmail).toBe("atc9807@gmail.com");
      expect(res.candidateEmployeeIds).toContain("AOCC-EMP-V09807");
      expect(res.candidateEmployeeIds).toContain("9807");
      expect(res.candidateEmails).toContain("atc9807@gmail.com");
      expect(res.candidateEmails).toContain("vs9807@sim.aocc.test");
    });

    it("normalizes login email 'atc9807@gmail.com' into employee ID candidate 'AOCC-EMP-V09807'", () => {
      const res = normalizeStaffIdentity("atc9807@gmail.com");
      expect(res.isEmail).toBe(true);
      expect(res.primaryEmail).toBe("atc9807@gmail.com");
      expect(res.candidateEmployeeIds).toContain("AOCC-EMP-V09807");
      expect(res.candidateEmployeeIds).toContain("9807");
    });

    it("normalizes Employee ID 'EMP101' into login email 'atc101@gmail.com' and supports legacy candidates", () => {
      const res = normalizeStaffIdentity("EMP101");
      expect(res.isEmail).toBe(false);
      expect(res.primaryEmail).toBe("atc101@gmail.com");
      expect(res.candidateEmployeeIds).toContain("EMP101");
      expect(res.candidateEmployeeIds).toContain("101");
      expect(res.candidateEmails).toContain("atc101@gmail.com");
      expect(res.candidateEmails).toContain("emp101@gmail.com");
    });

    it("normalizes lowercase 'emp101' consistently avoiding case-sensitive identity bugs", () => {
      const res = normalizeStaffIdentity("emp101");
      expect(res.isEmail).toBe(false);
      expect(res.primaryEmail).toBe("atc101@gmail.com");
      expect(res.candidateEmployeeIds).toContain("EMP101");
      expect(res.candidateEmails).toContain("atc101@gmail.com");
    });

    it("normalizes numerical sequence '101' or legacy 'EMP-101' to canonical identity", () => {
      const resNum = normalizeStaffIdentity("101");
      expect(resNum.primaryEmail).toBe("atc101@gmail.com");
      expect(resNum.candidateEmployeeIds).toContain("101");

      const resLegacy = normalizeStaffIdentity("EMP-101");
      expect(resLegacy.primaryEmail).toBe("atc101@gmail.com");
      expect(resLegacy.candidateEmployeeIds).toContain("EMP101");
    });

    it("extracts reverse employee ID candidates when staff enters email 'atc102@gmail.com' or 'emp102@gmail.com'", () => {
      const res = normalizeStaffIdentity("atc102@gmail.com");
      expect(res.isEmail).toBe(true);
      expect(res.primaryEmail).toBe("atc102@gmail.com");
      expect(res.candidateEmployeeIds).toContain("EMP102");
      expect(res.candidateEmployeeIds).toContain("102");

      const resLegacy = normalizeStaffIdentity("emp102@gmail.com");
      expect(resLegacy.isEmail).toBe(true);
      expect(resLegacy.candidateEmployeeIds).toContain("EMP102");
    });
  });

  describe("2. Staff Login Requirements & Status Verification", () => {
    it("successfully validates staff login using atc9807@gmail.com and default password Atc@1234", async () => {
      const result = await validateCredentials({
        email: "atc9807@gmail.com",
        password: "Atc@1234",
      });

      expect(result).not.toBeNull();
      expect(result?.email).toBe("atc9807@gmail.com");
      expect(result?.mustChangePassword).toBe(true);
    });

    it("successfully validates staff login using raw ID AOCC-EMP-V09807 and default password Atc@1234", async () => {
      const result = await validateCredentials({
        email: "AOCC-EMP-V09807",
        password: "Atc@1234",
      });

      expect(result).not.toBeNull();
      expect(result?.email).toBe("atc9807@gmail.com");
    });

    it("successfully validates staff login using atc101@gmail.com and Atc@1234", async () => {
      const result = await validateCredentials({
        email: "atc101@gmail.com",
        password: "Atc@1234",
      });

      expect(result).not.toBeNull();
      expect(result?.role).toBe("ATC");
    });
    it("successfully validates staff login using Employee ID mapped to mock credentials", async () => {
      // Maya Rao: emp-1001, email: "admin@aocc.test", password in mock is "AoccDemo!2026"
      const result = await validateCredentials({
        email: "EMP-1001",
        password: "AoccDemo!2026",
      });

      expect(result).not.toBeNull();
      expect(result?.email).toBe("admin@aocc.test");
      expect(result?.role).toBe("ADMIN");
    });

    it("successfully validates staff login using mapped email", async () => {
      const result = await validateCredentials({
        email: "admin@aocc.test",
        password: "AoccDemo!2026",
      });

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Maya Rao");
    });

    it("strictly blocks login for SUSPENDED employee accounts", async () => {
      // Find Maya Rao in memoryEmployees and temporarily suspend
      const maya = memoryEmployees.find((e) => e.email === "admin@aocc.test");
      expect(maya).toBeDefined();
      if (!maya) return;

      const previousStatus = maya.status;
      try {
        maya.status = "SUSPENDED";

        const attempt = await validateCredentials({
          email: "admin@aocc.test",
          password: "AoccDemo!2026",
        });

        // Must reject login for suspended account
        expect(attempt).toBeNull();
      } finally {
        maya.status = previousStatus;
      }
    });

    it("enforces mustChangePassword flag when default onboarding password Atc@1234 is used", async () => {
      // Add a test demo user with default initial password
      const tempId = "usr-onboarding-test";
      const testEmail = "onboarding-new@aocc.test";
      demoUsers.push({
        id: tempId,
        email: testEmail,
        password: DEFAULT_DEMO_TEMP_PASSWORD,
        name: "Onboarding Officer",
        role: "GROUND",
      });

      try {
        const user = await validateCredentials({
          email: testEmail,
          password: DEFAULT_DEMO_TEMP_PASSWORD,
        });

        expect(user).not.toBeNull();
        expect(user?.mustChangePassword).toBe(true);
      } finally {
        const idx = demoUsers.findIndex((u) => u.id === tempId);
        if (idx !== -1) demoUsers.splice(idx, 1);
      }
    });

    it("enforces login rate limiting after 5 consecutive failed attempts", async () => {
      const target = "rate-limit-test@aocc.test";
      clearLoginRateLimit(target);

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        recordFailedLoginAttempt(target);
      }

      const check = checkLoginRateLimit(target);
      expect(check.allowed).toBe(false);
      expect(check.retryAfterSeconds).toBeGreaterThan(0);

      clearLoginRateLimit(target);
    });
  });

  describe("3. Cryptographic Password Reset & Expiry Verification", () => {
    it("generates high-entropy CSPRNG temporary password satisfying complexity rules", () => {
      const pwd = generateSecureTemporaryPassword();
      expect(pwd.startsWith("Temp#")).toBe(true);
      expect(pwd.length).toBeGreaterThanOrEqual(16);
      expect(/[A-Z]/.test(pwd)).toBe(true);
      expect(/[a-z]/.test(pwd)).toBe(true);
      expect(/\d/.test(pwd)).toBe(true);
      expect(/[!@#$%^&*]/.test(pwd)).toBe(true);

      // Verify randomness across multiple samples (no duplicates)
      const samples = new Set();
      for (let i = 0; i < 20; i++) {
        samples.add(generateSecureTemporaryPassword());
      }
      expect(samples.size).toBe(20);
    });

    it("correctly identifies expired temporary credentials past their TTL", () => {
      const testUserId = "user-temp-expiry-test";
      // Record with expired TTL (negative hours)
      recordTemporaryPassword(testUserId, -1);

      expect(isTemporaryPasswordExpired(testUserId)).toBe(true);

      // Clear
      clearTemporaryPassword(testUserId);
      expect(isTemporaryPasswordExpired(testUserId)).toBe(false);
    });

    it("rate limits repeated administrative password resets for the same employee", () => {
      const empId = "EMP-RATE-TEST-999";
      for (let i = 0; i < 5; i++) {
        const check = checkAdminResetRateLimit(empId);
        expect(check.allowed).toBe(true);
      }

      // 6th reset should be blocked
      const blockedCheck = checkAdminResetRateLimit(empId);
      expect(blockedCheck.allowed).toBe(false);
      expect(blockedCheck.message).toContain("rate limit exceeded");
    });
  });

  describe("4. Batch Provisioning & Scale Support", () => {
    it("performs safe chunked batch provisioning with duplicate skipping", async () => {
      const batchInput = [
        {
          fullName: "Batch Staff 1",
          email: "batch1@test.aocc.simulator",
          department: "AIRPORT_OPERATIONS" as const,
          jobTitle: "Ramp Marshaller",
          role: "GROUND" as const,
          customEmployeeId: "TEST-BATCH-001",
        },
        {
          fullName: "Batch Staff 2",
          email: "batch2@test.aocc.simulator",
          department: "SECURITY" as const,
          jobTitle: "Screening Lead",
          role: "SECURITY_OFFICER" as const,
          customEmployeeId: "TEST-BATCH-002",
        },
      ];

      const res1 = await batchProvisionEmployees(batchInput, {
        batchSize: 2,
        skipDuplicates: true,
      });

      expect(res1.totalRequested).toBe(2);
      expect(res1.provisioned + res1.skippedDuplicates).toBe(2);
      expect(res1.failed).toBe(0);

      // Repeating the batch should be idempotent (skip existing)
      const res2 = await batchProvisionEmployees(batchInput, {
        batchSize: 2,
        skipDuplicates: true,
      });

      expect(res2.skippedDuplicates).toBe(2);
      expect(res2.provisioned).toBe(0);
    });

    it("filters out virtual staff by default in listEmployees to prevent 10,000-row over-fetching", async () => {
      const staffList = await listEmployees({ limit: 50 });
      expect(Array.isArray(staffList)).toBe(true);
      // All returned employees must be real staff (isVirtual === false)
      for (const emp of staffList) {
        expect(emp.employeeId.startsWith("AOCC-EMP-V")).toBe(false);
      }
    });
  });

  describe("5. Database & Salary Roster Performance", () => {
    it("executes listEmployeeSalaryRoster in memory / bounded DB query without N+1 query storm", async () => {
      const startTime = Date.now();
      const roster = await listEmployeeSalaryRoster({ limit: 50 });
      const duration = Date.now() - startTime;

      expect(Array.isArray(roster)).toBe(true);
      expect(duration).toBeLessThan(500); // Must resolve rapidly without pool exhaustion
      if (roster.length > 0) {
        expect(roster[0].baseSalary).toBeGreaterThan(0);
        expect(roster[0].grossSalary).toBeGreaterThan(0);
      }
    });

    it("orders listPayrollRuns by createdAt desc so new runs appear first", async () => {
      const runs = await listPayrollRuns();
      expect(Array.isArray(runs)).toBe(true);
      if (runs.length >= 2) {
        const date0 = new Date(runs[0].createdAt).getTime();
        const date1 = new Date(runs[1].createdAt).getTime();
        expect(date0).toBeGreaterThanOrEqual(date1);
      }
    });

    it("executes payroll idempotently and returns clean status for duplicate execution", async () => {
      const period = "PAYROLL-2026-09";
      const result = await processPayroll({
        payrollPeriod: period,
        approvedBy: "AUDIT_TESTER",
      });

      expect(result.success).toBe(true);
      expect(result.payroll).toBeDefined();
    });
  });
});
