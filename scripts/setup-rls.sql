-- ====================================================================
-- AOCC ENTERPRISE POSTGRESQL ROW-LEVEL SECURITY (RLS) POLICIES
-- Educational Airport Operations Simulator - Database Hardening Specification
-- ====================================================================

-- 1. User & Identity Table RLS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_tenant_isolation_select ON "User"
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN', 'AIRPORT_ADMIN')
    OR id = current_setting('app.current_user_id', true)
  );

CREATE POLICY user_admin_mutation ON "User"
  FOR ALL
  USING (
    current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN')
  );

-- 2. Employee Salary & Payroll Table RLS
ALTER TABLE "EmployeeSalary" ENABLE ROW LEVEL SECURITY;

CREATE POLICY salary_employee_isolation ON "EmployeeSalary"
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN', 'AIRPORT_ADMIN', 'FINANCE_MANAGER')
    OR "employeeId" = current_setting('app.current_employee_id', true)
  );

CREATE POLICY salary_admin_mutation ON "EmployeeSalary"
  FOR ALL
  USING (
    current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER')
  );

-- 3. Financial Accounts & Treasury Table RLS
ALTER TABLE "FinancialAccount" ENABLE ROW LEVEL SECURITY;

CREATE POLICY financial_account_admin_access ON "FinancialAccount"
  FOR ALL
  USING (
    current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER')
  );

-- 4. Financial Transactions Table RLS
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;

CREATE POLICY transaction_read_access ON "Transaction"
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER')
    OR "accountId" IN (
      SELECT id FROM "FinancialAccount" WHERE "entityId" = current_setting('app.current_user_id', true)
    )
  );

-- 5. Audit Logs Table RLS (Append-Only Guarantee)
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_view_policy ON "AuditLog"
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN')
  );

CREATE POLICY audit_log_insert_policy ON "AuditLog"
  FOR INSERT
  WITH CHECK (true); -- System-level authenticated processes can write audit logs

-- Reject any UPDATE or DELETE on AuditLog to preserve immutability
REVOKE UPDATE, DELETE ON "AuditLog" FROM PUBLIC;

-- 6. Bookings & Tickets Table RLS
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;

CREATE POLICY booking_passenger_isolation ON "Booking"
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN', 'TICKETING_AGENT', 'GATE_AGENT')
    OR "passengerId" = current_setting('app.current_user_id', true)
    OR "createdById" = current_setting('app.current_user_id', true)
  );

ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;

CREATE POLICY ticket_passenger_isolation ON "Ticket"
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN', 'TICKETING_AGENT', 'GATE_AGENT', 'SECURITY_OFFICER')
    OR "pnr" IN (
      SELECT pnr FROM "Booking" WHERE "passengerId" = current_setting('app.current_user_id', true)
    )
  );

-- Notice: Service roles and database superusers bypass RLS by default.
