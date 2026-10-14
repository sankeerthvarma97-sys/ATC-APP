import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Database Row-Level Security (RLS) Policies", () => {
  const rlsSqlPath = path.resolve(process.cwd(), "scripts/setup-rls.sql");

  it("verifies setup-rls.sql exists and contains valid PostgreSQL policy statements", () => {
    expect(fs.existsSync(rlsSqlPath)).toBe(true);
    const sql = fs.readFileSync(rlsSqlPath, "utf-8");

    // Must enable RLS on critical tables
    expect(sql).toContain('ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE "EmployeeSalary" ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE "FinancialAccount" ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;');
  });

  it("verifies audit log immutability policy (revoking UPDATE/DELETE)", () => {
    const sql = fs.readFileSync(rlsSqlPath, "utf-8");
    expect(sql).toContain('REVOKE UPDATE, DELETE ON "AuditLog" FROM PUBLIC;');
    expect(sql).toContain("CREATE POLICY audit_log_view_policy ON \"AuditLog\"");
    expect(sql).toContain("CREATE POLICY audit_log_insert_policy ON \"AuditLog\"");
  });

  it("enforces tenant and employee isolation in salary and user policies", () => {
    const sql = fs.readFileSync(rlsSqlPath, "utf-8");
    expect(sql).toContain("salary_employee_isolation");
    expect(sql).toContain("user_tenant_isolation_select");
    expect(sql).toContain("booking_passenger_isolation");
    expect(sql).toContain("ticket_passenger_isolation");
  });
});
