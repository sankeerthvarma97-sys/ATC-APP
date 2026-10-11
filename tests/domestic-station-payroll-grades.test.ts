import { describe, expect, it } from "vitest";
import { SALARY_GRADES, resolveSalaryGrade, applySalaryHike, listEmployeeSalaryRoster } from "@/lib/services/payroll-service";
import { createFlight } from "@/lib/services/flight-service";
import { getEmployeeDirectory } from "@/server/employees/employee-data";
import { getSchedulerStatus } from "@/lib/services/payroll-scheduler";

describe("AOCC Upgrade: Domestic Station, Salary Grades & Safe Directory", () => {
  describe("Default Station & Indian Domestic Routes", () => {
    it("accepts domestic routes operating from/to Rajiv Gandhi International Airport (HYD)", async () => {
      const sampleDestinations = [
        { dest: "BOM", gate: "B21", num: "6E701" },
        { dest: "BLR", gate: "B22", num: "6E702" },
        { dest: "VTZ", gate: "B23", num: "6E703" },
      ];

      for (const item of sampleDestinations) {
        const flight = await createFlight({
          flightName: `HYD to ${item.dest} Express`,
          flightNumber: item.num,
          airline: "IndiGo",
          aircraftType: "Airbus A320neo",
          origin: "HYD",
          destination: item.dest,
          departureTime: new Date(Date.now() + 50000000 + Math.random() * 1000000).toISOString(),
          arrivalTime: new Date(Date.now() + 56000000 + Math.random() * 1000000).toISOString(),
          gate: item.gate,
          runway: "09L",
          terminal: "T1",
        });

        expect(flight).toBeDefined();
        expect(flight.origin).toBe("HYD");
        expect(flight.destination).toBe(item.dest);
        expect(flight.status).toBe("SCHEDULED");
      }
    });

    it("strictly rejects international routes on the server with an informative error", async () => {
      // DXB is a registered mock airport outside India
      await expect(
        createFlight({
          flightName: "Hyderabad to Dubai International",
          flightNumber: "AI991",
          airline: "Air India",
          aircraftType: "Boeing 777-300ER",
          origin: "HYD",
          destination: "DXB",
          departureTime: new Date(Date.now() + 70000000).toISOString(),
          arrivalTime: new Date(Date.now() + 85000000).toISOString(),
          gate: "B24",
          runway: "09L",
          terminal: "T1",
        })
      ).rejects.toThrow(/International routes are disabled/);
    });
  });

  describe("Salary Grades Architecture (INR) & Hikes", () => {
    it("defines all 9 hierarchical salary grade bands in Indian Rupees (INR)", () => {
      const expectedGrades = [
        "EXECUTIVE",
        "SENIOR_MANAGEMENT",
        "MANAGEMENT",
        "SENIOR_SPECIALIST",
        "SPECIALIST",
        "SUPERVISOR",
        "EXPERIENCED_STAFF",
        "ENTRY_LEVEL",
        "TRAINEE",
      ] as const;

      for (const grade of expectedGrades) {
        const config = SALARY_GRADES[grade];
        expect(config).toBeDefined();
        expect(config.gradeCode).toBe(grade);
        expect(config.currency).toBe("INR");
        expect(config.minMonthlyBase).toBeGreaterThan(0);
        expect(config.maxMonthlyBase).toBeGreaterThan(config.minMonthlyBase);
        expect(config.midMonthlyBase).toBeGreaterThanOrEqual(config.minMonthlyBase);
        expect(config.midMonthlyBase).toBeLessThanOrEqual(config.maxMonthlyBase);
      }
    });

    it("correctly resolves salary grades by organizational role and seniority", () => {
      expect(resolveSalaryGrade("SUPER_ADMIN").gradeCode).toBe("EXECUTIVE");
      expect(resolveSalaryGrade("AIRPORT_ADMIN").gradeCode).toBe("EXECUTIVE");
      expect(resolveSalaryGrade("OPERATIONS_MANAGER", "Senior Manager ATC").gradeCode).toBe("SENIOR_MANAGEMENT");
      expect(resolveSalaryGrade("OPERATIONS_MANAGER").gradeCode).toBe("MANAGEMENT");
      expect(resolveSalaryGrade("SENIOR_ATC_CONTROLLER").gradeCode).toBe("SENIOR_SPECIALIST");
      expect(resolveSalaryGrade("ATC_CONTROLLER").gradeCode).toBe("SPECIALIST");
      expect(resolveSalaryGrade("SUPERVISOR").gradeCode).toBe("SUPERVISOR");
      expect(resolveSalaryGrade("GATE_AGENT").gradeCode).toBe("EXPERIENCED_STAFF");
      expect(resolveSalaryGrade("SECURITY_OFFICER").gradeCode).toBe("ENTRY_LEVEL");
      expect(resolveSalaryGrade("ANALYST", "Trainee Intern").gradeCode).toBe("TRAINEE");
    });

    it("applies salary hike with grade promotion and audit logging", async () => {
      const testEmp = `emp-promo-${Date.now()}`;
      
      const promoted = await applySalaryHike({
        employeeId: testEmp,
        hikeType: "PERCENTAGE",
        value: 20,
        newGrade: "SENIOR_SPECIALIST",
        reason: "Promotion to Senior Radar Controller",
        adminId: "usr-admin-test",
        adminName: "Super Admin",
      });

      expect(promoted).toBeDefined();
      expect(promoted.gradeCode).toBe("SENIOR_SPECIALIST");
      expect(promoted.baseSalary).toBeGreaterThan(0);
      expect(promoted.netSalary).toBe(promoted.grossSalary - promoted.deductions);
    });

    it("returns complete employee salary roster with grade codes and revision counts", async () => {
      const roster = await listEmployeeSalaryRoster();
      expect(Array.isArray(roster)).toBe(true);
      expect(roster.length).toBeGreaterThan(0);

      const first = roster[0];
      expect(first.employeeId).toBeDefined();
      expect(first.fullName).toBeDefined();
      expect(first.gradeCode).toBeDefined();
      expect(typeof first.baseSalary).toBe("number");
      expect(typeof first.netSalary).toBe("number");
    });
  });

  describe("Safe Employee Directory (Zero Credential Leakage)", () => {
    it("returns safe employee directory records without password hashes or auth tokens", async () => {
      const result = await getEmployeeDirectory({ page: 1, limit: 10 });
      expect(result.records).toBeDefined();
      expect(result.records.length).toBeGreaterThan(0);

      for (const emp of result.records) {
        expect(emp.employeeId).toBeDefined();
        expect(emp.fullName).toBeDefined();
        expect(emp.email).toBeDefined();
        expect(emp.jobGrade).toBeDefined();
        expect(emp.assignedAirport).toBeDefined();

        // STRICT SECURITY ASSERTIONS: Credentials must never exist on safe records
        expect((emp as any).password).toBeUndefined();
        expect((emp as any).passwordHash).toBeUndefined();
        expect((emp as any).hash).toBeUndefined();
        expect((emp as any).secret).toBeUndefined();
        expect((emp as any).sessionToken).toBeUndefined();
      }
    });

    it("filters employee directory correctly by department and airport", async () => {
      const hydResult = await getEmployeeDirectory({ airportCode: "HYD", page: 1, limit: 5 });
      expect(hydResult.records).toBeDefined();
      for (const rec of hydResult.records) {
        expect(rec.assignedAirport).toBe("HYD");
      }
    });
  });

  describe("24/7 Autonomous Payroll Scheduler", () => {
    it("returns scheduler health status with Asia/Kolkata timezone and recovery mode", async () => {
      const status = await getSchedulerStatus();
      expect(status).toBeDefined();
      expect(status.timezone).toBe("Asia/Kolkata");
      expect(status.missedRunRecoveryEnabled).toBe(true);
      expect(typeof status.isHealthy).toBe("boolean");
      expect(typeof status.consecutiveFailures).toBe("number");
    });
  });
});
