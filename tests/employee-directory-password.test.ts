import { describe, expect, it } from "vitest";
import { createEmployee, getEmployeeByIdentifier, listEmployees } from "@/lib/services/staff-service";
import { changeUserPassword } from "@/lib/services/account-security-service";

describe("Employee directory and password security", () => {
  it("creates a database-safe employee ID in the AOCC format and finds it exactly", async () => {
    const created = await createEmployee({
      fullName: "QA Directory User",
      email: "qa-directory-user@example.com",
      phone: "+91 90000 11111",
      department: "ADMINISTRATION",
      jobTitle: "Directory QA Analyst",
      role: "ANALYST",
      airportCode: "HYD",
      shift: "MORNING",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    });

    expect(created.employeeId).toMatch(/^AOCC-EMP-\d{6}$/);

    const exact = await getEmployeeByIdentifier(created.employeeId);
    expect(exact?.id).toBe(created.id);

    const matchesBySearch = await listEmployees({ search: created.employeeId });
    expect(matchesBySearch.some((employee) => employee.employeeId === created.employeeId)).toBe(true);
  });

  it("rejects wrong current password and mismatched confirmation before changing a password", async () => {
    const created = await createEmployee({
      fullName: "Password Change User",
      email: "password-change-user@example.com",
      phone: "+91 90000 22222",
      department: "AIRPORT_OPERATIONS",
      jobTitle: "Security Agent",
      role: "OPERATIONS_MANAGER",
      airportCode: "HYD",
      shift: "OPS-A",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    });

    const wrongCurrent = await changeUserPassword({
      userId: created.userId || "missing-user",
      currentPassword: "WrongOldPassword!2",
      newPassword: "NewStrongPass!2026",
      confirmPassword: "NewStrongPass!2026",
    });
    expect(wrongCurrent.ok).toBe(false);

    const mismatch = await changeUserPassword({
      userId: created.userId || "missing-user",
      currentPassword: "Admin@123",
      newPassword: "NewStrongPass!2026",
      confirmPassword: "DifferentStrongPass!2026",
    });
    expect(mismatch.ok).toBe(false);
  });
});
