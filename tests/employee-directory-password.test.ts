import { describe, expect, it } from "vitest";
import {
  createEmployee,
  getEmployeeByIdentifier,
  listEmployees,
  updateEmployee,
  memoryEmployees,
} from "@/lib/services/staff-service";
import {
  changeUserPassword,
  adminResetEmployeePassword,
  toggleEmployeeAccountStatus,
  isPasswordChangeRequired,
  isStrongPassword,
} from "@/lib/services/account-security-service";
import {
  getEmployeeDirectory,
  provisionEmployeeAccount,
} from "@/server/employees/employee-data";
import {
  generateNextEmployeeId,
  formatEmployeeId,
  parseEmployeeSequence,
  isValidEmployeeId,
} from "@/server/employees/employee-id-service";
import { demoUsers } from "@/lib/data/mock";

describe("AOCC Employee ID, 24/7 Directory & Credential Management", () => {
  it("generates sequential collision-resistant Employee IDs in canonical AOCC format", async () => {
    const id1 = await generateNextEmployeeId(false);
    expect(id1).toMatch(/^AOCC-EMP-\d{6}$/);
    expect(isValidEmployeeId(id1)).toBe(true);

    const virtualId = await generateNextEmployeeId(true);
    expect(virtualId).toMatch(/^AOCC-EMP-V\d{5}$/);
    expect(isValidEmployeeId(virtualId)).toBe(true);

    const parsed1 = parseEmployeeSequence(id1);
    expect(parsed1?.isVirtual).toBe(false);

    const parsedV = parseEmployeeSequence(virtualId);
    expect(parsedV?.isVirtual).toBe(true);
  });

  it("creates employee with unique permanent ID and preserves ID across profile updates", async () => {
    const created = await createEmployee({
      fullName: "Immutability Test User",
      email: "immutability-test@aocc.test",
      phone: "+91 90000 33333",
      department: "AIR_TRAFFIC_CONTROL",
      jobTitle: "Junior Controller",
      role: "ATC_CONTROLLER",
      airportCode: "HYD",
      shift: "MORNING",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    });

    const originalId = created.employeeId;
    expect(originalId).toMatch(/^AOCC-EMP-\d{6}$/);

    // Update name, role, department, shift, status
    const updated = await updateEmployee(created.id, {
      fullName: "Senior Imm Test User",
      department: "ADMINISTRATION",
      jobTitle: "Lead Director",
      role: "OPERATIONS_MANAGER",
      shift: "NIGHT",
      status: "ACTIVE",
    });

    // Employee ID MUST REMAIN EXACTLY UNCHANGED
    expect(updated?.employeeId).toBe(originalId);

    const retrieved = await getEmployeeByIdentifier(originalId);
    expect(retrieved?.employeeId).toBe(originalId);
    expect(retrieved?.fullName).toBe("Senior Imm Test User");
    expect(retrieved?.jobTitle).toBe("Lead Director");
  });

  it("prioritizes exact Employee ID lookup in directory search", async () => {
    const provisionResult = await provisionEmployeeAccount({
      fullName: "Target Exact Search Officer",
      email: "exact-search-officer@aocc.test",
      phone: "+91 90000 44444",
      department: "GROUND_OPERATIONS",
      jobTitle: "Marshalling Lead",
      role: "GROUND_OPERATOR",
      assignedAirport: "HYD",
      terminal: "T1",
      shift: "AFTERNOON",
    });

    expect(provisionResult.ok).toBe(true);
    const targetEmpId = provisionResult.record?.employeeId;
    expect(targetEmpId).toBeDefined();

    // Query directory using exact Employee ID
    const searchResult = await getEmployeeDirectory({
      search: targetEmpId,
      limit: 10,
    });

    expect(searchResult.records.length).toBeGreaterThan(0);
    // The very first record must match the exact Employee ID
    expect(searchResult.records[0].employeeId).toBe(targetEmpId);
    expect(searchResult.records[0].fullName).toBe("Target Exact Search Officer");
  });

  it("never exposes password hashes, temporary passwords, or session secrets in directory projections", async () => {
    const dirResult = await getEmployeeDirectory({ limit: 20 });
    expect(dirResult.records.length).toBeGreaterThan(0);

    for (const record of dirResult.records) {
      expect((record as any).passwordHash).toBeUndefined();
      expect((record as any).password).toBeUndefined();
      expect((record as any).temporaryPassword).toBeUndefined();
      expect((record as any).sessionToken).toBeUndefined();
      expect((record as any).secret).toBeUndefined();

      // All 16 core attributes are defined and safe
      expect(record.employeeId).toBeDefined();
      expect(record.fullName).toBeDefined();
      expect(record.email).toBeDefined();
      expect(record.department).toBeDefined();
      expect(record.jobTitle).toBeDefined();
      expect(record.role).toBeDefined();
      expect(record.jobGrade).toBeDefined();
      expect(record.assignedAirport).toBeDefined();
      expect(record.shift).toBeDefined();
      expect(record.employmentStatus).toBeDefined();
      expect(record.accountStatus).toBeDefined();
      expect(record.verificationStatus).toBeDefined();
    }
  });

  it("enforces strong password validation rules", () => {
    expect(isStrongPassword("short")).toBe(false);
    expect(isStrongPassword("nouppercase123!@#")).toBe(false);
    expect(isStrongPassword("NOLOWERCASE123!@#")).toBe(false);
    expect(isStrongPassword("NoSpecialSymbols123")).toBe(false);
    expect(isStrongPassword("Aocc@Hyderabad2026!")).toBe(true);
  });

  it("validates self-service password change: rejects wrong current, mismatch, and weak passwords", async () => {
    const created = await createEmployee({
      fullName: "Auth Security User",
      email: "auth-security-user@aocc.test",
      phone: "+91 90000 55555",
      department: "TICKETING",
      jobTitle: "Ticketing Supervisor",
      role: "TICKETING_AGENT",
      airportCode: "HYD",
      shift: "MORNING",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    });

    const userId = created.userId || "missing-user";

    // 1. Wrong current password rejected
    const wrongCurrent = await changeUserPassword({
      userId,
      currentPassword: "IncorrectOldPassword!1",
      newPassword: "ValidNewPassword@2026",
      confirmPassword: "ValidNewPassword@2026",
    });
    expect(wrongCurrent.ok).toBe(false);
    expect(wrongCurrent.message).toContain("incorrect");

    // 2. Mismatched confirmation rejected
    const mismatch = await changeUserPassword({
      userId,
      currentPassword: "Admin@123",
      newPassword: "ValidNewPassword@2026",
      confirmPassword: "DifferentConfirmation@2026",
    });
    expect(mismatch.ok).toBe(false);
    expect(mismatch.message).toContain("do not match");

    // 3. Weak password rejected
    const weak = await changeUserPassword({
      userId,
      currentPassword: "Admin@123",
      newPassword: "weak",
      confirmPassword: "weak",
    });
    expect(weak.ok).toBe(false);
    expect(weak.message).toContain("12 characters");

    // 4. Same as current password rejected
    const same = await changeUserPassword({
      userId,
      currentPassword: "Admin@123",
      newPassword: "Admin@123",
      confirmPassword: "Admin@123",
    });
    expect(same.ok).toBe(false);
    expect(same.message).toContain("differs");

    // 5. Successful password change
    const success = await changeUserPassword({
      userId,
      currentPassword: "Admin@123",
      newPassword: "Aocc@StrongPass2026!",
      confirmPassword: "Aocc@StrongPass2026!",
    });
    expect(success.ok).toBe(true);
    expect(success.message).toContain("successfully");

    // 6. Old password no longer authenticates
    const oldFails = await changeUserPassword({
      userId,
      currentPassword: "Admin@123",
      newPassword: "YetAnotherPass@2026!",
      confirmPassword: "YetAnotherPass@2026!",
    });
    expect(oldFails.ok).toBe(false);
  });

  it("handles administrative password reset and prevents resetting Super Admin", async () => {
    // 1. Create target employee
    const target = await createEmployee({
      fullName: "Reset Target Staff",
      email: "reset-target-staff@aocc.test",
      phone: "+91 90000 66666",
      department: "SECURITY",
      jobTitle: "Checkpoint Officer",
      role: "SECURITY_OFFICER",
      airportCode: "HYD",
      shift: "NIGHT",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    });

    // 2. Admin performs authorized reset
    const resetResult = await adminResetEmployeePassword({
      employeeId: target.employeeId,
      actor: { id: "usr-admin", name: "Maya Rao", role: "ADMIN" },
    });

    expect(resetResult.ok).toBe(true);
    expect(resetResult.temporaryPassword).toBeDefined();
    expect(isStrongPassword(resetResult.temporaryPassword!)).toBe(true);

    // Verify account requires password change on next login
    if (target.userId) {
      expect(isPasswordChangeRequired(target.userId)).toBe(true);
    }

    // 3. Attempting to reset Permanent Super Admin is strictly blocked!
    const superAdminReset = await adminResetEmployeePassword({
      employeeId: "EMP-0001",
      actor: { id: "usr-admin", name: "Maya Rao", role: "ADMIN" },
    });

    expect(superAdminReset.ok).toBe(false);
    expect(superAdminReset.message).toContain("Protected system owner account");
  });

  it("supports administrative account suspension and reactivations while protecting Super Admin", async () => {
    const staff = await createEmployee({
      fullName: "Suspendable Staff",
      email: "suspendable-staff@aocc.test",
      phone: "+91 90000 77777",
      department: "BAGGAGE",
      jobTitle: "Loader Marshall",
      role: "BAGGAGE_STAFF",
      airportCode: "HYD",
      shift: "MORNING",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    });

    // Suspend
    const suspendResult = await toggleEmployeeAccountStatus({
      employeeId: staff.employeeId,
      status: "SUSPENDED",
      actor: { id: "usr-admin", name: "Maya Rao" },
    });
    expect(suspendResult.ok).toBe(true);
    expect(suspendResult.newStatus).toBe("SUSPENDED");

    // Reactivate
    const reactivateResult = await toggleEmployeeAccountStatus({
      employeeId: staff.employeeId,
      status: "ACTIVE",
      actor: { id: "usr-admin", name: "Maya Rao" },
    });
    expect(reactivateResult.ok).toBe(true);
    expect(reactivateResult.newStatus).toBe("ACTIVE");

    // Super Admin cannot be suspended!
    const superAdminSuspend = await toggleEmployeeAccountStatus({
      employeeId: "EMP-0001",
      status: "SUSPENDED",
      actor: { id: "usr-admin", name: "Maya Rao" },
    });
    expect(superAdminSuspend.ok).toBe(false);
    expect(superAdminSuspend.message).toContain("Protected system owner account");
  });
});
