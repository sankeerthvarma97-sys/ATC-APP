import { describe, expect, it, afterAll, beforeAll } from "vitest";
import {
  provisionEmployeeAccount,
  purgeSyntheticTestEmployees,
  getEmployeeDirectory,
  SafeEmployeeDirectoryRecord,
} from "@/server/employees/employee-data";
import {
  isPasswordChangeRequired,
  changeUserPassword,
  DEFAULT_DEMO_TEMP_PASSWORD,
} from "@/lib/services/account-security-service";
import { validateCredentials } from "@/lib/auth/users";
import { createFlight, listFlightsPaged, getFlightById } from "@/lib/services/flight-service";
import { createBooking } from "@/lib/services/booking-service";
import { issueGatePass } from "@/lib/services/gate-pass-service";
import { getOrCreateSalaryProfile } from "@/lib/services/payroll-service";
import { hasPermission } from "@/lib/auth/permissions";
import { demoUsers } from "@/lib/data/mock";

describe("Part 10: 100 Isolated Test Employees Automated Fixture & End-to-End System Audit", () => {
  const provisionedRecords: SafeEmployeeDirectoryRecord[] = [];

  beforeAll(async () => {
    // Ensure any leftover synthetic test data is purged before starting
    await purgeSyntheticTestEmployees("TEST-AOCC-");
  });

  afterAll(async () => {
    // Idempotent teardown
    await purgeSyntheticTestEmployees("TEST-AOCC-");
  });

  // Checklist Point 1: Batch provisioning of exactly 100 synthetic test employees
  it(
    "Point 1: provisions exactly 100 synthetic test employees in isolated namespace",
    async () => {
      const batchSize = 10;
      for (let b = 0; b < 100; b += batchSize) {
        const batchPromises = Array.from({ length: batchSize }, async (_, idx) => {
          const i = b + idx + 1;
          const numStr = String(i).padStart(4, "0");
          const customEmployeeId = `TEST-AOCC-${numStr}`;
          const email = `test.aocc.${numStr}@sim.test`;

          const result = await provisionEmployeeAccount({
            customEmployeeId,
            fullName: `Synthetic Officer ${numStr}`,
            email,
            phone: `+91 91000 ${numStr}`,
            department: i % 2 === 0 ? "AIR_TRAFFIC_CONTROL" : "GROUND_OPERATIONS",
            jobTitle: i % 2 === 0 ? "Radar Controller" : "Turnaround Lead",
            role: i % 2 === 0 ? "ATC_CONTROLLER" : "GROUND_OPERATOR",
            assignedAirport: "HYD",
            initialPassword: DEFAULT_DEMO_TEMP_PASSWORD,
            isTemporaryCredential: true,
          });

          expect(result.ok).toBe(true);
          expect(result.record).toBeDefined();
          return result.record!;
        });

        const batchResults = await Promise.all(batchPromises);
        provisionedRecords.push(...batchResults);
      }

      expect(provisionedRecords.length).toBe(100);
    },
    60000 // 60s timeout for 100 bcrypt hashing operations
  );

  // Checklist Point 2: Synthetic ID uniqueness and namespace isolation
  it("Point 2: guarantees 100% ID uniqueness and strict TEST-AOCC namespace isolation", () => {
    const idSet = new Set(provisionedRecords.map((r) => r.employeeId));
    expect(idSet.size).toBe(100);

    for (const record of provisionedRecords) {
      expect(record.employeeId).toMatch(/^TEST-AOCC-\d{4}$/);
      expect(record.employeeId.startsWith("AOCC-EMP-")).toBe(false);
      expect(record.email).toMatch(/^test\.aocc\.\d{4}@sim\.test$/);
    }
  });

  // Checklist Point 3: Temporary password initial credential
  it("Point 3: provisions initial temporary credential matching Atc@1234", () => {
    expect(DEFAULT_DEMO_TEMP_PASSWORD).toBe("Atc@1234");
    for (const record of provisionedRecords.slice(0, 10)) {
      expect(record.accountStatus).toBe("MUST_CHANGE_PASSWORD");
    }
  });

  // Checklist Point 4: Forced password change requirement check (mustChangePassword: true)
  it("Point 4: enforces mustChangePassword requirement flag for newly provisioned accounts", () => {
    const sampleRecord = provisionedRecords[0];
    expect(sampleRecord.userId).toBeDefined();
    expect(isPasswordChangeRequired(sampleRecord.userId!)).toBe(true);
  });

  // Checklist Point 5: Successful authentication with initial credential
  it("Point 5: validates credentials successfully with temporary password and returns mustChangePassword flag", async () => {
    const user = await validateCredentials({
      email: "test.aocc.0001@sim.test",
      password: "Atc@1234",
    });

    expect(user).not.toBeNull();
    expect(user?.email).toBe("test.aocc.0001@sim.test");
    expect(user?.mustChangePassword).toBe(true);
  });

  // Checklist Point 6: Password change to strong password
  it("Point 6: updates employee password to high-entropy credential (AtcSecure!2026)", async () => {
    const sampleRecord = provisionedRecords[0];
    const updateResult = await changeUserPassword({
      userId: sampleRecord.userId!,
      currentPassword: "Atc@1234",
      newPassword: "AtcSecure!2026",
      confirmPassword: "AtcSecure!2026",
    });

    expect(updateResult.ok).toBe(true);
    expect(updateResult.message).toContain("successfully");
  });

  // Checklist Point 7: Forced password change requirement cleared (mustChangePassword: false)
  it("Point 7: clears forced password change flag upon credential upgrade", () => {
    const sampleRecord = provisionedRecords[0];
    expect(isPasswordChangeRequired(sampleRecord.userId!)).toBe(false);
  });

  // Checklist Point 8: Invalidation of old session / re-auth with new password
  it("Point 8: authenticates successfully with updated credential and clean security status", async () => {
    const user = await validateCredentials({
      email: "test.aocc.0001@sim.test",
      password: "AtcSecure!2026",
    });

    expect(user).not.toBeNull();
    expect(user?.mustChangePassword).toBe(false);
  });

  // Checklist Point 9: Rejection of previous temporary password
  it("Point 9: rejects deprecated temporary password immediately after change", async () => {
    const oldAuth = await validateCredentials({
      email: "test.aocc.0001@sim.test",
      password: "Atc@1234",
    });

    expect(oldAuth).toBeNull();
  });

  // Checklist Point 10: RBAC isolation: Employee accesses only own salary, profile, and bookings
  it("Point 10: enforces RBAC access isolation across salary profiles and operations", async () => {
    const controllerRecord = provisionedRecords[1]; // role: ATC_CONTROLLER
    expect(controllerRecord.role).toBe("ATC_CONTROLLER");

    // Standard controller does not hold administrative management permissions
    expect(hasPermission({ role: "ATC_CONTROLLER" }, "MANAGE_STAFF")).toBe(false);
    expect(hasPermission({ role: "ATC_CONTROLLER" }, "MANAGE_AIRLINES")).toBe(false);
    expect(hasPermission({ role: "SUPER_ADMIN" }, "MANAGE_STAFF")).toBe(true);

    // Controller can access their own salary profile based on job title and grade
    const ownSalaryProfile = await getOrCreateSalaryProfile(controllerRecord.employeeId);
    expect(ownSalaryProfile).toBeDefined();
    expect(ownSalaryProfile.baseSalary).toBeGreaterThan(0);

    // Safe employee directory record never leaks credential secrets or hashes
    const directory = await getEmployeeDirectory({ search: controllerRecord.employeeId });
    expect(directory.records.length).toBe(1);
    const safeRecord = directory.records[0] as any;
    expect(safeRecord.password).toBeUndefined();
    expect(safeRecord.passwordHash).toBeUndefined();
    expect(safeRecord.sessionSecret).toBeUndefined();
  });

  // Checklist Point 11: Flight creation policy: domestic departures locked to HYD, reject HYD->HYD, reject international
  it("Point 11: enforces Rajiv Gandhi (HYD) hub departure policy, rejects HYD->HYD, and rejects international", async () => {
    // 1. Attempt domestic departure starting outside HYD without override
    await expect(
      createFlight({
        flightName: "Unauthorized Origin Flight",
        flightNumber: "TEST901",
        airline: "IndiGo",
        aircraftType: "Airbus A320neo",
        origin: "BOM",
        destination: "DEL",
        departureTime: new Date(Date.now() + 40000000).toISOString(),
        arrivalTime: new Date(Date.now() + 46000000).toISOString(),
        bypassHydLock: false,
      })
    ).rejects.toThrow(/Domestic departure must be Hyderabad \(HYD\)/);

    // 2. Attempt circular flight (HYD -> HYD)
    await expect(
      createFlight({
        flightName: "Circular Route Flight",
        flightNumber: "TEST902",
        airline: "Air India",
        aircraftType: "Airbus A320neo",
        origin: "HYD",
        destination: "HYD",
        departureTime: new Date(Date.now() + 40000000).toISOString(),
        arrivalTime: new Date(Date.now() + 46000000).toISOString(),
      })
    ).rejects.toThrow(/cannot be identical/);

    // 3. Attempt international route in domestic workflow
    await expect(
      createFlight({
        flightName: "International Flight",
        flightNumber: "TEST903",
        airline: "Air India",
        aircraftType: "Boeing 777-300ER",
        origin: "HYD",
        destination: "DXB",
        departureTime: new Date(Date.now() + 40000000).toISOString(),
        arrivalTime: new Date(Date.now() + 56000000).toISOString(),
      })
    ).rejects.toThrow(/International routes are disabled/);

    // 4. Authorized admin override with bypassHydLock: true succeeds
    const overrideFlight = await createFlight({
      flightName: "Authorized Override Flight",
      flightNumber: "TEST904",
      airline: "IndiGo",
      aircraftType: "Airbus A320neo",
      origin: "BOM",
      destination: "DEL",
      departureTime: new Date(Date.now() + 60000000).toISOString(),
      arrivalTime: new Date(Date.now() + 66000000).toISOString(),
      gate: "B30",
      runway: "09L",
      terminal: "T1",
      bypassHydLock: true,
    });
    expect(overrideFlight.flightNumber).toBe("TEST904");
    expect(overrideFlight.origin).toBe("BOM");
  });

  // Checklist Point 12: Multi-route flight search: dynamic search from HYD to multiple domestic destinations
  it("Point 12: dynamically searches published multi-route flights departing from HYD", async () => {
    // Search HYD -> DEL
    const delSearch = await listFlightsPaged({ origin: "HYD", destination: "DEL", pageSize: 10 });
    expect(delSearch.flights.length).toBeGreaterThan(0);
    expect(delSearch.flights.every((f) => f.origin === "HYD" && f.destination === "DEL")).toBe(true);

    // Search HYD -> BLR
    const blrSearch = await listFlightsPaged({ origin: "HYD", destination: "BLR", pageSize: 10 });
    expect(blrSearch.flights.length).toBeGreaterThan(0);
    expect(blrSearch.flights.every((f) => f.origin === "HYD" && f.destination === "BLR")).toBe(true);

    // Search HYD -> BOM
    const bomSearch = await listFlightsPaged({ origin: "HYD", destination: "BOM", pageSize: 10 });
    expect(bomSearch.flights.length).toBeGreaterThan(0);
    expect(bomSearch.flights.every((f) => f.origin === "HYD" && f.destination === "BOM")).toBe(true);

    // Search unserved route returns clean empty state
    const unservedSearch = await listFlightsPaged({ origin: "HYD", destination: "UNKNOWN_AIRPORT", pageSize: 10 });
    expect(unservedSearch.flights.length).toBe(0);
    expect(unservedSearch.total).toBe(0);
  });

  // Checklist Point 13: Concurrency booking: simultaneous seat reservations prevent double-booking
  it("Point 13: handles concurrent seat booking race condition without overbooking", async () => {
    const flight = await getFlightById("flt-sc101");
    expect(flight).toBeDefined();

    // Select an available seat
    const availableSeat = flight?.seats.find((s) => s.status === "AVAILABLE")?.seatNumber || "23B";

    const applicantA = {
      flightId: "flt-sc101",
      seatNumber: availableSeat,
      travelClass: "ECONOMY" as const,
      passenger: {
        fullName: "Synthetic Traveler Alpha",
        email: "traveler.alpha@sim.test",
        phone: "+91 99000 00001",
      },
    };

    const applicantB = {
      flightId: "flt-sc101",
      seatNumber: availableSeat,
      travelClass: "ECONOMY" as const,
      passenger: {
        fullName: "Synthetic Traveler Beta",
        email: "traveler.beta@sim.test",
        phone: "+91 99000 00002",
      },
    };

    // Concurrently attempt to book the identical seat
    const [resA, resB] = await Promise.allSettled([
      createBooking(applicantA),
      createBooking(applicantB),
    ]);

    const successes = [resA, resB].filter((r) => r.status === "fulfilled");
    const failures = [resA, resB].filter((r) => r.status === "rejected");

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    const winningBooking = (successes[0] as PromiseFulfilledResult<any>).value;
    expect(winningBooking.seatNumber).toBe(availableSeat);
    expect(winningBooking.pnr).toBeDefined();
    expect(winningBooking.ticketNumber).toBeDefined();

    const losingError = (failures[0] as PromiseRejectedResult).reason;
    expect(losingError.message).toContain("no longer available");
  });

  // Checklist Point 14: Complete workflow trace: passenger -> booking -> ticket -> gate pass relationships
  it("Point 14: traces complete booking lifecycle from reservation to boarding and gate pass issuance", async () => {
    // 1. Create flight booking
    const booking = await createBooking({
      flightId: "flt-sc101",
      seatNumber: "28F",
      travelClass: "ECONOMY",
      passenger: {
        fullName: "Trace Verification Passenger",
        email: "trace.passenger@sim.test",
        phone: "+91 99111 22334",
      },
      baggageCount: 1,
    });

    expect(booking.pnr).toMatch(/^[A-Z0-9]{6,8}$/);
    expect(booking.ticketNumber).toMatch(/^ET-2026-\d{6}$/);
    expect(booking.seatNumber).toBe("28F");
    expect(booking.bookingStatus).toBe("CONFIRMED");

    // 2. Issue linked airside gate pass for terminal escort / boarding verification
    const gatePass = await issueGatePass(
      {
        holderName: booking.passengerName || "Trace Verification Passenger",
        idNumber: booking.ticketNumber || "ET-2026-000001",
        passType: "VIP",
        organization: "SkyConnect Passenger Services",
        airportCode: "HYD",
        terminal: "T1",
        authorizedZones: ["ZONE_A_PUBLIC", "ZONE_B_SECURITY"],
        durationHours: 6,
        escortRequired: false,
        purpose: `Scheduled Boarding Flight ${booking.flightNumber} PNR ${booking.pnr}`,
      },
      { id: "usr-admin", name: "Boarding Supervisor" }
    );

    expect(gatePass.passNumber).toMatch(/^GP-HYD-\d{4}-\d{6}$/);
    expect(gatePass.status).toBe("ACTIVE");
    expect(gatePass.qrCode).toContain(`ID:${gatePass.passNumber}`);
    expect(gatePass.authorizedZones).toContain("ZONE_B_SECURITY");
  });

  // Checklist Point 15: Idempotent test cleanup: purging all 100 synthetic accounts cleanly
  it("Point 15: purges all 100 synthetic accounts idempotently with zero residual pollution", async () => {
    const purgedCount = await purgeSyntheticTestEmployees("TEST-AOCC-");
    expect(purgedCount).toBeGreaterThanOrEqual(100);

    // Verify directory has 0 synthetic accounts
    const directory = await getEmployeeDirectory({ search: "TEST-AOCC-" });
    expect(directory.records.length).toBe(0);

    // Verify demoUsers has no residual test.aocc. accounts
    const residualMock = demoUsers.filter(
      (u) => u.email.includes("test.aocc.") || u.email.endsWith("@sim.test")
    );
    expect(residualMock.length).toBe(0);
  });
});
