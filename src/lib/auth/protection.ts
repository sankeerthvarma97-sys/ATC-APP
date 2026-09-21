export const PROTECTED_SUPER_ADMIN_EMAIL = "admin@gmail.com";
export const PROTECTED_ERROR_MESSAGE = "Protected system owner account cannot be modified or removed.";

export interface ProtectedAccountTarget {
  id?: string | null;
  email?: string | null;
  employeeId?: string | null;
  role?: string | null;
}

export interface ProposedAccountChanges {
  role?: string | null;
  status?: string | null;
  verificationStatus?: string | null;
  permissions?: string[] | null;
}

/**
 * Checks whether an account/employee target is the permanent system owner account.
 */
export function isProtectedSuperAdmin(target?: ProtectedAccountTarget | null): boolean {
  if (!target) return false;

  if (target.email && target.email.trim().toLowerCase() === PROTECTED_SUPER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  if (target.employeeId && (target.employeeId === "EMP-0001" || target.employeeId === "emp-0001")) {
    return true;
  }

  if (target.id && (target.id === "usr-super-admin" || target.id === "emp-0001")) {
    return true;
  }

  return false;
}

/**
 * Asserts that the permanent system owner cannot be deleted, deactivated, suspended,
 * demoted from SUPER_ADMIN, or stripped of its root system access.
 */
export function assertSuperAdminNotTargeted(
  target?: ProtectedAccountTarget | null,
  action?: "DELETE" | "MODIFY" | "SUSPEND" | "DEACTIVATE" | "DEMOTE" | "RESET",
  changes?: ProposedAccountChanges,
): { ok: true } | { ok: false; status: 403; error: string } {
  if (!target || !isProtectedSuperAdmin(target)) {
    return { ok: true };
  }

  // Any attempt to delete the super admin account is strictly prohibited
  if (action === "DELETE") {
    return {
      ok: false,
      status: 403,
      error: PROTECTED_ERROR_MESSAGE,
    };
  }

  // Deactivation / Suspension / Demotion is prohibited
  if (action === "SUSPEND" || action === "DEACTIVATE" || action === "DEMOTE") {
    return {
      ok: false,
      status: 403,
      error: PROTECTED_ERROR_MESSAGE,
    };
  }

  // If modifying, inspect proposed changes
  if (changes) {
    if (changes.role && changes.role !== "SUPER_ADMIN") {
      return {
        ok: false,
        status: 403,
        error: PROTECTED_ERROR_MESSAGE,
      };
    }

    if (
      changes.status === "SUSPENDED" ||
      changes.status === "DEACTIVATED" ||
      changes.status === "PENDING" ||
      changes.status === "PENDING_VERIFICATION"
    ) {
      return {
        ok: false,
        status: 403,
        error: PROTECTED_ERROR_MESSAGE,
      };
    }

    if (changes.verificationStatus === "REJECTED" || changes.verificationStatus === "PENDING") {
      return {
        ok: false,
        status: 403,
        error: PROTECTED_ERROR_MESSAGE,
      };
    }
  }

  return { ok: true };
}
