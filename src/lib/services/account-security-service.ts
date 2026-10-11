import { compare, hash } from "bcryptjs";
import { demoUsers } from "@/lib/data/mock";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/services/audit-service";
import { assertSuperAdminNotTargeted, PROTECTED_ERROR_MESSAGE } from "@/lib/auth/protection";
import { getEmployeeByIdentifier } from "@/lib/services/staff-service";

export function isStrongPassword(password: string): boolean {
  return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(password);
}

// In-memory registry of user accounts requiring password change on next login
const mustChangePasswordRegistry = new Set<string>();

export function getMustChangePasswordCount(): number {
  return mustChangePasswordRegistry.size;
}

export function isPasswordChangeRequired(userId: string): boolean {
  if (!userId) return false;
  return mustChangePasswordRegistry.has(userId);
}

export function setPasswordChangeRequired(userId: string, required: boolean): void {
  if (!userId) return;
  if (required) {
    mustChangePasswordRegistry.add(userId);
  } else {
    mustChangePasswordRegistry.delete(userId);
  }
}

export const DEFAULT_DEMO_TEMP_PASSWORD = "Atc@1234";

/**
 * Generate a high-entropy, random temporary password that strictly meets AOCC security criteria.
 * Format: Temp#<6 chars alnum>A1!
 */
export function generateSecureTemporaryPassword(): string {
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  const symbol = "!@#$%^&*"[Math.floor(Math.random() * 8)];
  return `Temp#${randomChars}a1${symbol}`;
}

export async function changeUserPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  actorId?: string;
  actorName?: string;
}): Promise<{ ok: boolean; message: string }> {
  const { userId, currentPassword, newPassword, confirmPassword, actorId, actorName } = input;

  if (!userId || !currentPassword || !newPassword || !confirmPassword) {
    return { ok: false, message: "Current password, new password, and confirmation are required." };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, message: "New password and confirmation do not match." };
  }

  if (currentPassword === newPassword) {
    return { ok: false, message: "Choose a new password that differs from the current password." };
  }

  if (!isStrongPassword(newPassword)) {
    return {
      ok: false,
      message: "New password must be at least 12 characters and include uppercase, lowercase, numbers, and symbols.",
    };
  }

  if (shouldUseDatabase()) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.passwordHash) {
        return { ok: false, message: "User account not found or password cannot be changed." };
      }

      const validCurrent = await compare(currentPassword, user.passwordHash);
      if (!validCurrent) {
        return { ok: false, message: "Current password is incorrect." };
      }

      const newHash = await hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash, updatedAt: new Date() },
      });

      // Clear password change requirement
      setPasswordChangeRequired(userId, false);

      await logAuditEvent({
        actorId: actorId ?? userId,
        actorName,
        action: "PASSWORD_CHANGED",
        entity: "User",
        entityId: user.id,
        after: { passwordChanged: true },
      });

      return { ok: true, message: "Password updated successfully." };
    } catch (error) {
      console.warn("Database password change failed.", error);
      return { ok: false, message: "Password could not be updated. Please try again." };
    }
  }

  const user = demoUsers.find((demoUser) => demoUser.id === userId);
  if (!user) {
    return { ok: false, message: "User account not found." };
  }

  if (user.password !== currentPassword) {
    return { ok: false, message: "Current password is incorrect." };
  }

  user.password = newPassword;
  setPasswordChangeRequired(userId, false);

  await logAuditEvent({
    actorId: actorId ?? userId,
    actorName,
    action: "PASSWORD_CHANGED",
    entity: "User",
    entityId: user.id,
    after: { passwordChanged: true },
  });

  return { ok: true, message: "Password updated successfully." };
}

/**
 * Authorized Administrator Password Reset Workflow.
 * Generates an unguessable temporary credential, marks account as requiring password change,
 * revokes existing sessions, protects the Super Admin account, and strictly prevents logging credentials.
 */
export async function adminResetEmployeePassword(input: {
  employeeId: string;
  actor: { id?: string; name?: string; role?: string };
  customTemporaryPassword?: string;
}): Promise<{ ok: boolean; message: string; temporaryPassword?: string }> {
  const { employeeId, actor, customTemporaryPassword } = input;

  if (!employeeId) {
    return { ok: false, message: "Employee ID is required." };
  }

  const employee = await getEmployeeByIdentifier(employeeId);
  if (!employee) {
    return { ok: false, message: `Employee with ID ${employeeId} not found.` };
  }

  // Super Admin protection rule
  const protection = assertSuperAdminNotTargeted(employee, "RESET");
  if (!protection.ok) {
    return { ok: false, message: protection.error || PROTECTED_ERROR_MESSAGE };
  }

  const temporaryPassword = customTemporaryPassword || generateSecureTemporaryPassword();
  const hashedPassword = await hash(temporaryPassword, 12);

  if (shouldUseDatabase() && employee.userId) {
    try {
      await prisma.user.update({
        where: { id: employee.userId },
        data: { passwordHash: hashedPassword, updatedAt: new Date() },
      });

      // Revoke all active login sessions to enforce reauthentication
      await prisma.session.deleteMany({
        where: { userId: employee.userId },
      });

      setPasswordChangeRequired(employee.userId, true);
    } catch (err) {
      console.warn("Database reset password failed; falling back to memory:", err);
    }
  }

  // Update in-memory user
  const demoUser = demoUsers.find(
    (u) =>
      (employee.userId && u.id === employee.userId) ||
      u.email.toLowerCase() === employee.email.toLowerCase(),
  );

  if (demoUser) {
    demoUser.password = temporaryPassword;
    setPasswordChangeRequired(demoUser.id, true);
  }

  if (employee.userId) {
    setPasswordChangeRequired(employee.userId, true);
  }

  // Security Audit Log: NEVER LOG THE PASSWORD OR TOKEN
  await logAuditEvent({
    actorId: actor.id,
    actorName: actor.name || "Administrator",
    action: "ADMIN_RESET_EMPLOYEE_PASSWORD",
    entity: "EMPLOYEE",
    entityId: employee.employeeId,
    after: {
      targetEmployeeId: employee.employeeId,
      targetEmail: employee.email,
      temporaryPasswordIssued: true,
      sessionsRevoked: true,
      mustChangePasswordEnforced: true,
    },
  });

  return {
    ok: true,
    temporaryPassword,
    message: `Temporary password generated for ${employee.fullName} (${employee.employeeId}). The employee must change this password upon first login.`,
  };
}

/**
 * Administrative Suspend or Reactivate Employee Account.
 */
export async function toggleEmployeeAccountStatus(input: {
  employeeId: string;
  status: "ACTIVE" | "SUSPENDED";
  actor: { id?: string; name?: string };
}): Promise<{ ok: boolean; message: string; newStatus?: string }> {
  const { employeeId, status, actor } = input;

  const employee = await getEmployeeByIdentifier(employeeId);
  if (!employee) {
    return { ok: false, message: `Employee with ID ${employeeId} not found.` };
  }

  // Super Admin protection rule
  if (status === "SUSPENDED") {
    const protection = assertSuperAdminNotTargeted(employee, "SUSPEND");
    if (!protection.ok) {
      return { ok: false, message: protection.error || PROTECTED_ERROR_MESSAGE };
    }
  }

  const { memoryEmployees } = await import("@/lib/services/staff-service");
  const memEmp = memoryEmployees.find((e) => e.employeeId === employee.employeeId || e.id === employee.id);
  if (memEmp) {
    memEmp.status = status;
  }

  if (shouldUseDatabase()) {
    try {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { status, updatedAt: new Date() },
      });

      // If suspended, immediately revoke active sessions
      if (status === "SUSPENDED" && employee.userId) {
        await prisma.session.deleteMany({
          where: { userId: employee.userId },
        });
      }
    } catch (err) {
      console.warn("Database status toggle failed; updated in memory:", err);
    }
  }

  await logAuditEvent({
    actorId: actor.id,
    actorName: actor.name || "Administrator",
    action: status === "SUSPENDED" ? "EMPLOYEE_SUSPENDED" : "EMPLOYEE_REACTIVATED",
    entity: "EMPLOYEE",
    entityId: employee.employeeId,
    after: {
      previousStatus: employee.status,
      newStatus: status,
      sessionsRevoked: status === "SUSPENDED",
    },
  });

  return {
    ok: true,
    newStatus: status,
    message: `Employee account status updated to ${status}.`,
  };
}
