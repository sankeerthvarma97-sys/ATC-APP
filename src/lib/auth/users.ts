import { compare } from "bcryptjs";
import type { UserDTO } from "@/lib/domain";
import { demoUsers } from "@/lib/data/mock";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/operations";
import { BOOTSTRAP_ADMIN_EMAIL, ensurePermanentSuperAdmin } from "@/lib/auth/bootstrap";
import { isPasswordChangeRequired } from "@/lib/services/account-security-service";

export async function validateCredentials(input: unknown): Promise<UserDTO | null> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  // If attempting to login as super admin, ensure the account is provisioned in the database
  if (normalizedEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() && shouldUseDatabase()) {
    try {
      await ensurePermanentSuperAdmin();
    } catch (err) {
      console.warn("Could not ensure super admin in database:", err);
    }
  }

  if (shouldUseDatabase()) {
    try {
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      const isPasswordValid = user?.passwordHash ? await compare(password, user.passwordHash) : false;

      if (user && isPasswordValid) {
        // Record successful login audit log in PostgreSQL database
        try {
          await prisma.auditLog.create({
            data: {
              actorId: user.id,
              action: "AUTH_LOGIN_SUCCESS",
              entity: "User",
              entityId: user.id,
              after: {
                email: user.email,
                role: user.role,
                shift: user.shift,
                timestamp: new Date().toISOString(),
              },
            },
          });
          // Update employee lastLogin timestamp
          await prisma.employee.updateMany({
            where: { email: user.email },
            data: { lastLogin: new Date() },
          });
        } catch (auditErr) {
          console.warn("Audit log creation on login encountered non-fatal error:", auditErr);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserDTO["role"],
          shift: user.shift ?? undefined,
          mustChangePassword: isPasswordChangeRequired(user.id),
        };
      }

      // Log failed authentication attempt in database
      try {
        await prisma.auditLog.create({
          data: {
            actorId: user?.id ?? undefined,
            action: "AUTH_LOGIN_FAILED",
            entity: "User",
            entityId: user?.id ?? undefined,
            after: {
              attemptedEmail: normalizedEmail,
              reason: user ? "INVALID_PASSWORD" : "USER_NOT_FOUND",
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch {
        // Non-blocking
      }

      return null;
    } catch (error) {
      console.warn("Database credential check failed.", error);
      return null;
    }
  }

  // Graceful fallback store when database is offline or unconfigured
  const demoUser = demoUsers.find(
    (user) =>
      user.email.toLowerCase() === normalizedEmail &&
      user.password === password,
  );
  if (!demoUser) {
    return null;
  }

  return {
    id: demoUser.id,
    name: demoUser.name,
    email: demoUser.email,
    role: demoUser.role,
    shift: demoUser.shift,
    mustChangePassword: isPasswordChangeRequired(demoUser.id),
  };
}
