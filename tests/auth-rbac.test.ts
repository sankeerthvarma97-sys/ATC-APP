import { describe, expect, it } from "vitest";
import { assertPermission, hasPermission, rolePermissionMap } from "@/lib/auth/permissions";
import {
  assertSuperAdminNotTargeted,
  isProtectedSuperAdmin,
  PROTECTED_ERROR_MESSAGE,
} from "@/lib/auth/protection";
import { validateCredentials } from "@/lib/auth/users";
import {
  deleteEmployee,
  getEmployeeById,
  updateEmployee,
  createEmployee,
} from "@/lib/services/staff-service";
import type { UserDTO } from "@/lib/domain";

describe("Permanent Super Admin & Multi-Portal RBAC", () => {
  describe("1. Authentication & Auto-Bootstrap", () => {
    it("successfully authenticates permanent Super Admin with bootstrap credentials", async () => {
      const user = await validateCredentials({
        email: "admin@gmail.com",
        password: "Sankeerth@80",
      });

      expect(user).not.toBeNull();
      expect(user?.email).toBe("admin@gmail.com");
      expect(user?.role).toBe("SUPER_ADMIN");
    });

    it("rejects invalid login credentials", async () => {
      const user = await validateCredentials({
        email: "admin@gmail.com",
        password: "WrongPassword!999",
      });

      expect(user).toBeNull();
    });

    it("authenticates standard staff demo users correctly", async () => {
      const atcUser = await validateCredentials({
        email: "atc@aocc.test",
        password: "AoccDemo!2026",
      });
      expect(atcUser?.role).toBe("ATC");

      const ticketUser = await validateCredentials({
        email: "ticket@aocc.test",
        password: "AoccDemo!2026",
      });
      expect(ticketUser?.role).toBe("TICKETING_AGENT");
    });
  });

  describe("2. Super Admin Root Authority", () => {
    const superAdmin: UserDTO = {
      id: "usr-super-admin",
      name: "Permanent Super Admin",
      email: "admin@gmail.com",
      role: "SUPER_ADMIN",
    };

    it("grants SUPER_ADMIN access to every single permission unconditionally", () => {
      expect(hasPermission(superAdmin, "SUPER_ADMIN_ALL_ACCESS")).toBe(true);
      expect(hasPermission(superAdmin, "CONTROL_ATC")).toBe(true);
      expect(hasPermission(superAdmin, "CREATE_FLIGHT")).toBe(true);
      expect(hasPermission(superAdmin, "MANAGE_STAFF")).toBe(true);
      expect(hasPermission(superAdmin, "MANAGE_ROLES")).toBe(true);
      expect(hasPermission(superAdmin, "CREATE_BOOKING")).toBe(true);
      expect(hasPermission(superAdmin, "MANAGE_GROUND_OPERATIONS")).toBe(true);
    });

    it("assertPermission returns ok: true for super admin on any resource", () => {
      const auth = assertPermission(superAdmin, "MANAGE_ROLES");
      expect(auth.ok).toBe(true);
    });
  });

  describe("3. Departmental Staff RBAC Boundaries", () => {
    const atcController: UserDTO = {
      id: "usr-atc-1",
      name: "Evan Torres",
      email: "atc@aocc.test",
      role: "ATC_CONTROLLER",
    };

    const ticketingAgent: UserDTO = {
      id: "usr-ticket-1",
      name: "Karan Sharma",
      email: "ticket@aocc.test",
      role: "TICKETING_AGENT",
    };

    const groundOperator: UserDTO = {
      id: "usr-ground-1",
      name: "Priya Nair",
      email: "ground@aocc.test",
      role: "GROUND_OPERATOR",
    };

    it("ATC controller has ATC & Runway permissions, but CANNOT manage staff or book tickets", () => {
      expect(hasPermission(atcController, "CONTROL_ATC")).toBe(true);
      expect(hasPermission(atcController, "VIEW_TRAFFIC")).toBe(true);
      expect(hasPermission(atcController, "MANAGE_RUNWAYS")).toBe(true);

      expect(hasPermission(atcController, "MANAGE_STAFF")).toBe(false);
      expect(hasPermission(atcController, "CREATE_BOOKING")).toBe(false);
      expect(hasPermission(atcController, "MANAGE_PERMISSIONS")).toBe(false);

      const staffAuth = assertPermission(atcController, "MANAGE_STAFF");
      expect(staffAuth.ok).toBe(false);
      expect(staffAuth.status).toBe(403);
    });

    it("Ticketing agent has booking & ticket verification, but CANNOT control ATC or manage runways", () => {
      expect(hasPermission(ticketingAgent, "CREATE_BOOKING")).toBe(true);
      expect(hasPermission(ticketingAgent, "VERIFY_TICKET")).toBe(true);
      expect(hasPermission(ticketingAgent, "CHECK_IN_PASSENGER")).toBe(true);

      expect(hasPermission(ticketingAgent, "CONTROL_ATC")).toBe(false);
      expect(hasPermission(ticketingAgent, "MANAGE_RUNWAYS")).toBe(false);
      expect(hasPermission(ticketingAgent, "MANAGE_STAFF")).toBe(false);

      const atcAuth = assertPermission(ticketingAgent, "CONTROL_ATC");
      expect(atcAuth.ok).toBe(false);
      expect(atcAuth.status).toBe(403);
    });

    it("Ground operator has ground ops & gates, but CANNOT book tickets or assign roles", () => {
      expect(hasPermission(groundOperator, "MANAGE_GROUND_OPERATIONS")).toBe(true);
      expect(hasPermission(groundOperator, "MANAGE_GATES")).toBe(true);

      expect(hasPermission(groundOperator, "CREATE_BOOKING")).toBe(false);
      expect(hasPermission(groundOperator, "ASSIGN_ROLES")).toBe(false);
      expect(hasPermission(groundOperator, "CONTROL_ATC")).toBe(false);
    });

    it("blocks operational access for suspended or pending employees", () => {
      const suspendedStaff = {
        role: "ATC_CONTROLLER" as const,
        status: "SUSPENDED",
        verificationStatus: "VERIFIED",
      };

      const result = assertPermission(suspendedStaff, "CONTROL_ATC");
      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.message).toContain("suspended");

      const pendingStaff = {
        role: "TICKETING_AGENT" as const,
        status: "PENDING",
        verificationStatus: "PENDING",
      };

      const pendingResult = assertPermission(pendingStaff, "CREATE_BOOKING");
      expect(pendingResult.ok).toBe(false);
      expect(pendingResult.status).toBe(403);
      expect(pendingResult.message).toContain("pending verification");
    });
  });

  describe("4. Permanent Super Admin Account Protection", () => {
    const protectedAdmin = {
      id: "usr-super-admin",
      employeeId: "EMP-0001",
      email: "admin@gmail.com",
      role: "SUPER_ADMIN",
    };

    it("identifies protected super admin targets correctly", () => {
      expect(isProtectedSuperAdmin(protectedAdmin)).toBe(true);
      expect(isProtectedSuperAdmin({ email: "admin@gmail.com" })).toBe(true);
      expect(isProtectedSuperAdmin({ email: "ADMIN@GMAIL.COM" })).toBe(true);
      expect(isProtectedSuperAdmin({ employeeId: "EMP-0001" })).toBe(true);
      expect(isProtectedSuperAdmin({ email: "normal@aocc.test" })).toBe(false);
    });

    it("strictly blocks deletion of the permanent super admin account", () => {
      const check = assertSuperAdminNotTargeted(protectedAdmin, "DELETE");
      expect(check.ok).toBe(false);
      if (!check.ok) {
        expect(check.status).toBe(403);
        expect(check.error).toBe(PROTECTED_ERROR_MESSAGE);
      }
    });

    it("strictly blocks suspension or deactivation of the permanent super admin", () => {
      const suspendCheck = assertSuperAdminNotTargeted(protectedAdmin, "SUSPEND");
      expect(suspendCheck.ok).toBe(false);
      if (!suspendCheck.ok) {
        expect(suspendCheck.error).toBe(PROTECTED_ERROR_MESSAGE);
      }

      const deactivateCheck = assertSuperAdminNotTargeted(protectedAdmin, "MODIFY", {
        status: "DEACTIVATED",
      });
      expect(deactivateCheck.ok).toBe(false);
      if (!deactivateCheck.ok) {
        expect(deactivateCheck.error).toBe(PROTECTED_ERROR_MESSAGE);
      }
    });

    it("strictly blocks demotion from SUPER_ADMIN role", () => {
      const demoteCheck = assertSuperAdminNotTargeted(protectedAdmin, "MODIFY", {
        role: "ADMIN",
      });
      expect(demoteCheck.ok).toBe(false);
      if (!demoteCheck.ok) {
        expect(demoteCheck.error).toBe(PROTECTED_ERROR_MESSAGE);
      }
    });

    it("staff service deleteEmployee refuses to delete super admin", async () => {
      const result = await deleteEmployee("emp-0001");
      expect(result.ok).toBe(false);
      expect(result.error).toBe(PROTECTED_ERROR_MESSAGE);
    });

    it("staff service updateEmployee refuses to suspend or demote super admin", async () => {
      await expect(
        updateEmployee("emp-0001", { status: "SUSPENDED" }),
      ).rejects.toThrow(PROTECTED_ERROR_MESSAGE);

      await expect(
        updateEmployee("emp-0001", { role: "VIEWER" }),
      ).rejects.toThrow(PROTECTED_ERROR_MESSAGE);
    });
  });

  describe("5. Staff Lifecycle Management", () => {
    it("creates a staff member with initial PENDING status", async () => {
      const newStaff = await createEmployee({
        fullName: "Test Dispatcher",
        email: "test.dispatch@aocc.test",
        phone: "+91 99999 88888",
        department: "AIRLINE_OPERATIONS",
        jobTitle: "Junior Dispatcher",
        role: "FLIGHT_DISPATCHER",
        airportCode: "HYD",
        shift: "NIGHT",
      });

      expect(newStaff.status).toBe("PENDING");
      expect(newStaff.verificationStatus).toBe("PENDING");

      // Verify updating to VERIFIED
      const verifiedStaff = await updateEmployee(newStaff.id, {
        status: "ACTIVE",
        verificationStatus: "VERIFIED",
      });

      expect(verifiedStaff?.status).toBe("ACTIVE");
      expect(verifiedStaff?.verificationStatus).toBe("VERIFIED");
    });
  });

  describe("6. Authoritative Booking & Ticket Verification", () => {
    it("creates a booking with a unique PNR and prevents seat double-booking", async () => {
      const { createBooking } = await import("@/lib/services/booking-service");

      const booking1 = await createBooking({
        flightId: "flt-sc101",
        seatNumber: "22A",
        travelClass: "ECONOMY",
        passenger: {
          fullName: "Ananya Sharma",
          email: "ananya.sharma@test.aocc",
          phone: "+91 91234 56789",
        },
      });

      expect(booking1.pnr).toBeDefined();
      expect(booking1.pnr.length).toBeGreaterThanOrEqual(6);
      expect(booking1.seatNumber).toBe("22A");
      expect(booking1.bookingStatus).toBe("CONFIRMED");

      // Attempting to book the SAME seat on the SAME flight must fail
      await expect(
        createBooking({
          flightId: "flt-sc101",
          seatNumber: "22A",
          travelClass: "ECONOMY",
          passenger: {
            fullName: "Second Passenger",
            email: "second.passenger@test.aocc",
            phone: "+91 91234 99999",
          },
        }),
      ).rejects.toThrow(/no longer available/i);
    });

    it("verifies a valid ticket and rejects an invalid PNR", async () => {
      const { verifyTicket } = await import("@/lib/services/checkin-service");

      // Test valid existing seeded ticket (bkg-1 has SC7K92P)
      const validCheck = await verifyTicket({ pnr: "SC7K92P" });
      expect(validCheck.isValid).toBe(true);
      expect(validCheck.booking?.pnr).toBe("SC7K92P");

      // Test non-existent PNR
      const invalidCheck = await verifyTicket({ pnr: "INVALID999" });
      expect(invalidCheck.isValid).toBe(false);
      expect(invalidCheck.status).toBe("INVALID");
    });
  });

  describe("7. Security Boundaries & Direct Authorization Enforcement", () => {
    it("rejects non-admin role attempting admin staff operations with 403", () => {
      const ticketingAgent = {
        role: "TICKETING_AGENT" as const,
        status: "ACTIVE",
        verificationStatus: "VERIFIED",
      };

      const result = assertPermission(ticketingAgent, "MANAGE_STAFF");
      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.message).toContain("Missing required permission");
    });

    it("rejects normal staff attempting to manage system permissions", () => {
      const groundOperator = {
        role: "GROUND_OPERATOR" as const,
        status: "ACTIVE",
        verificationStatus: "VERIFIED",
      };

      const result = assertPermission(groundOperator, "MANAGE_PERMISSIONS");
      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
    });

    it("ensures unauthenticated requests return 401", () => {
      const result = assertPermission(null, "VIEW_DASHBOARD");
      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
    });
  });
});
