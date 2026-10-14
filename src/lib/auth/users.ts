import { compare } from "bcryptjs";
import type { UserDTO } from "@/lib/domain";
import { demoUsers } from "@/lib/data/mock";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/operations";
import { BOOTSTRAP_ADMIN_EMAIL, ensurePermanentSuperAdmin } from "@/lib/auth/bootstrap";
import {
  DEFAULT_DEMO_TEMP_PASSWORD,
  isPasswordChangeRequired,
  isTemporaryPasswordExpired,
  setPasswordChangeRequired,
} from "@/lib/services/account-security-service";
import { memoryEmployees } from "@/lib/services/staff-service";

export interface StaffIdentityResolution {
  raw: string;
  isEmail: boolean;
  primaryEmail: string;
  candidateEmails: string[];
  candidateEmployeeIds: string[];
}

/**
 * Normalizes staff login inputs into canonical identity representations.
 * Handles employee IDs ("EMP101", "emp101", "101", "EMP-0101"), mapped emails ("emp101@gmail.com"),
 * and standard email identities ("admin@aocc.test", "admin@gmail.com").
 */
export function normalizeStaffIdentity(input: string): StaffIdentityResolution {
  const raw = input.trim();
  const lower = raw.toLowerCase();
  const upper = raw.toUpperCase();
  const isEmail = raw.includes("@");

  const candidateEmails = new Set<string>();
  const candidateEmployeeIds = new Set<string>();

  if (isEmail) {
    candidateEmails.add(lower);
    // Support atc{num}@gmail.com, emp{num}@gmail.com, vs{num}@sim.aocc.test
    const match = lower.match(/^(?:atc|emp|vs)[-_.]?(\d+)@/i);
    if (match) {
      const num = match[1];
      const unpadded = String(Number.parseInt(num, 10));
      candidateEmployeeIds.add(`AOCC-EMP-V${unpadded.padStart(5, "0")}`);
      candidateEmployeeIds.add(`AOCC-EMP-${unpadded.padStart(6, "0")}`);
      candidateEmployeeIds.add(`EMP${unpadded}`);
      candidateEmployeeIds.add(`EMP-${unpadded}`);
      candidateEmployeeIds.add(`EMP-${unpadded.padStart(4, "0")}`);
      candidateEmployeeIds.add(`V${unpadded.padStart(5, "0")}`);
      candidateEmployeeIds.add(unpadded);
      candidateEmployeeIds.add(num);

      candidateEmails.add(`atc${unpadded}@gmail.com`);
      candidateEmails.add(`atc${unpadded.padStart(4, "0")}@gmail.com`);
      candidateEmails.add(`vs${unpadded}@sim.aocc.test`);
      candidateEmails.add(`emp${unpadded}@gmail.com`);
    }

    return {
      raw,
      isEmail: true,
      primaryEmail: lower,
      candidateEmails: Array.from(candidateEmails),
      candidateEmployeeIds: Array.from(candidateEmployeeIds),
    };
  }

  // Direct Employee ID or sequence entered (e.g. AOCC-EMP-V09807, atc9807, 9807, EMP101, etc.)
  candidateEmployeeIds.add(upper);
  candidateEmployeeIds.add(raw);

  const digitMatch = raw.match(/^(?:AOCC-EMP-V|AOCC-EMP-|EMP-|ATC-|VS-|V|EMP|ATC|VS)?0*(\d+)$/i);
  if (digitMatch) {
    const num = digitMatch[1];
    const unpadded = String(Number.parseInt(num, 10));
    candidateEmployeeIds.add(`AOCC-EMP-V${unpadded.padStart(5, "0")}`);
    candidateEmployeeIds.add(`AOCC-EMP-${unpadded.padStart(6, "0")}`);
    candidateEmployeeIds.add(`EMP${unpadded}`);
    candidateEmployeeIds.add(`EMP-${unpadded}`);
    candidateEmployeeIds.add(`EMP-${unpadded.padStart(4, "0")}`);
    candidateEmployeeIds.add(`V${unpadded.padStart(5, "0")}`);
    candidateEmployeeIds.add(unpadded);
    candidateEmployeeIds.add(num);

    // Standard login email: atc{number}@gmail.com
    candidateEmails.add(`atc${unpadded}@gmail.com`);
    candidateEmails.add(`emp${unpadded}@gmail.com`);
    candidateEmails.add(`vs${unpadded}@sim.aocc.test`);
  }

  candidateEmails.add(`${lower}@gmail.com`);
  const primaryEmail = candidateEmails.values().next().value || `${lower}@gmail.com`;

  return {
    raw,
    isEmail: false,
    primaryEmail,
    candidateEmails: Array.from(candidateEmails),
    candidateEmployeeIds: Array.from(candidateEmployeeIds),
  };
}

/**
 * Sliding Window In-Memory Rate Limiter
 * Maximum 5 failed login attempts per 5 minutes per identifier/IP.
 */
interface LoginRateLimitRecord {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}
const loginRateLimitMap = new Map<string, LoginRateLimitRecord>();
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_RATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = loginRateLimitMap.get(key.toLowerCase());
  if (!entry) return { allowed: true };

  if (entry.lockedUntil && entry.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  if (now - entry.firstAttempt > LOGIN_RATE_WINDOW_MS) {
    loginRateLimitMap.delete(key.toLowerCase());
    return { allowed: true };
  }

  if (entry.attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    entry.lockedUntil = now + LOGIN_LOCKOUT_MS;
    return { allowed: false, retryAfterSeconds: Math.ceil(LOGIN_LOCKOUT_MS / 1000) };
  }

  return { allowed: true };
}

export function recordFailedLoginAttempt(key: string): void {
  const now = Date.now();
  const k = key.toLowerCase();
  const entry = loginRateLimitMap.get(k);
  if (!entry || now - entry.firstAttempt > LOGIN_RATE_WINDOW_MS) {
    loginRateLimitMap.set(k, { attempts: 1, firstAttempt: now });
  } else {
    entry.attempts += 1;
    if (entry.attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      entry.lockedUntil = now + LOGIN_LOCKOUT_MS;
    }
  }
}

export function clearLoginRateLimit(key: string): void {
  loginRateLimitMap.delete(key.toLowerCase());
}

export async function validateCredentials(input: unknown): Promise<UserDTO | null> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }

  const { email: rawIdentifier, password } = parsed.data;
  const identity = normalizeStaffIdentity(rawIdentifier);

  // Rate Limiting check
  const rateLimit = checkLoginRateLimit(identity.primaryEmail);
  if (!rateLimit.allowed) {
    console.warn(`[AUTH] Login rate limit exceeded for ${identity.primaryEmail}`);
    return null;
  }

  // Super admin bootstrap assurance
  if (
    identity.candidateEmails.includes(BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) &&
    shouldUseDatabase()
  ) {
    try {
      await ensurePermanentSuperAdmin();
    } catch (err) {
      console.warn("Could not ensure super admin in database:", err);
    }
  }

  if (shouldUseDatabase()) {
    try {
      // 1. Locate Employee profile by email candidates OR employee ID candidates
      const employee = await prisma.employee.findFirst({
        where: {
          OR: [
            { email: { in: identity.candidateEmails, mode: "insensitive" } },
            { employeeId: { in: identity.candidateEmployeeIds, mode: "insensitive" } },
          ],
        },
        include: { user: true },
      });

      // 2. Account Status Validation: Active, disabled, locked, or terminated status
      if (employee) {
        const empStatus = (employee.status || "").toUpperCase();
        if (empStatus === "SUSPENDED" || empStatus === "DEACTIVATED" || empStatus === "LOCKED") {
          recordFailedLoginAttempt(identity.primaryEmail);
          try {
            await prisma.auditLog.create({
              data: {
                actorId: employee.userId ?? undefined,
                action: "AUTH_LOGIN_BLOCKED_STATUS",
                entity: "Employee",
                entityId: employee.id,
                after: {
                  attemptedIdentity: rawIdentifier,
                  employeeId: employee.employeeId,
                  status: employee.status,
                  reason: "ACCOUNT_SUSPENDED_OR_INACTIVE",
                  timestamp: new Date().toISOString(),
                },
              },
            });
          } catch {
            // Non-blocking audit
          }
          return null; // Return null to prevent user enumeration while safely rejecting login
        }
      }

      // 3. Locate linked User account
      let user = employee?.user || null;
      if (!user) {
        const queryEmails = Array.from(
          new Set([
            ...identity.candidateEmails,
            ...(employee?.email ? [employee.email] : []),
          ])
        );
        user = await prisma.user.findFirst({
          where: {
            OR: queryEmails.map((e) => ({ email: { equals: e, mode: "insensitive" as const } })),
          },
        });
      }

      // 4. If User record is missing but Employee exists, allow initial login with DEFAULT_DEMO_TEMP_PASSWORD
      if (!user || !user.passwordHash) {
        const isInitialSharedPassword =
          password === DEFAULT_DEMO_TEMP_PASSWORD ||
          password === "AoccDemo!2026" ||
          password === "Admin@123";

        if (
          employee &&
          employee.status !== "SUSPENDED" &&
          employee.status !== "DEACTIVATED" &&
          isInitialSharedPassword
        ) {
          clearLoginRateLimit(identity.primaryEmail);
          const userId = employee.userId || `usr-${employee.employeeId.toLowerCase()}`;
          setPasswordChangeRequired(userId, true);

          try {
            const { hash } = await import("bcryptjs");
            const pHash = await hash(DEFAULT_DEMO_TEMP_PASSWORD, 10);
            const dbUser = await prisma.user.upsert({
              where: { email: employee.email },
              update: {
                role: employee.role,
                shift: employee.shift,
              },
              create: {
                id: userId,
                name: employee.fullName,
                email: employee.email,
                role: employee.role,
                shift: employee.shift,
                passwordHash: pHash,
                creditBalance: 10_000,
              },
            });

            if (!employee.userId) {
              await prisma.employee.update({
                where: { id: employee.id },
                data: { userId: dbUser.id, lastLogin: new Date() },
              });
            }
          } catch {
            // Non-blocking user sync
          }

          return {
            id: userId,
            name: employee.fullName,
            email: employee.email,
            role: (employee.role as UserDTO["role"]) || "ATC",
            shift: employee.shift,
            mustChangePassword: true,
          };
        }

        recordFailedLoginAttempt(identity.primaryEmail);
        try {
          await prisma.auditLog.create({
            data: {
              action: "AUTH_LOGIN_FAILED",
              entity: "User",
              after: {
                attemptedIdentity: rawIdentifier,
                reason: "USER_NOT_FOUND",
                timestamp: new Date().toISOString(),
              },
            },
          });
        } catch {
          // Non-blocking
        }
        // Fall through to memory check if not found in DB
      } else {
        // User exists - check temporary credential expiration
        if (isTemporaryPasswordExpired(user.id)) {
          recordFailedLoginAttempt(identity.primaryEmail);
          try {
            await prisma.auditLog.create({
              data: {
                actorId: user.id,
                action: "AUTH_LOGIN_FAILED",
                entity: "User",
                entityId: user.id,
                after: {
                  attemptedIdentity: rawIdentifier,
                  reason: "TEMPORARY_PASSWORD_EXPIRED",
                  timestamp: new Date().toISOString(),
                },
              },
            });
          } catch {
            // Non-blocking
          }
          return null;
        }

        // 5. Password Verification
        let isPasswordValid = await compare(password, user.passwordHash);
        const isInitialSharedPassword =
          password === DEFAULT_DEMO_TEMP_PASSWORD ||
          password === "AoccDemo!2026" ||
          password === "Admin@123";

        // Allow initial default temporary password for staff accounts only if password change is still required
        if (!isPasswordValid && isInitialSharedPassword && user.role !== "SUPER_ADMIN" && isPasswordChangeRequired(user.id)) {
          isPasswordValid = true;
        }

        if (!isPasswordValid) {
          recordFailedLoginAttempt(identity.primaryEmail);
          try {
            await prisma.auditLog.create({
              data: {
                actorId: user.id,
                action: "AUTH_LOGIN_FAILED",
                entity: "User",
                entityId: user.id,
                after: {
                  attemptedIdentity: rawIdentifier,
                  reason: "INVALID_PASSWORD",
                  timestamp: new Date().toISOString(),
                },
              },
            });
          } catch {
            // Non-blocking
          }
          return null;
        }

        // 6. Success: Clear rate limit record
        clearLoginRateLimit(identity.primaryEmail);

        if (isInitialSharedPassword) {
          setPasswordChangeRequired(user.id, true);
        }
        const mustChange = isInitialSharedPassword || isPasswordChangeRequired(user.id);

        // Record successful login audit log and update lastLogin
        try {
          await prisma.auditLog.create({
            data: {
              actorId: user.id,
              action: "AUTH_LOGIN_SUCCESS",
              entity: "User",
              entityId: user.id,
              after: {
                email: user.email,
                matchedEmployeeId: employee?.employeeId,
                role: user.role,
                shift: user.shift,
                mustChangePassword: mustChange,
                timestamp: new Date().toISOString(),
              },
            },
          });

          await prisma.employee.updateMany({
            where: {
              OR: [
                { email: user.email },
                { userId: user.id },
              ],
            },
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
          mustChangePassword: mustChange,
        };
      }
    } catch (error) {
      console.warn("Database credential check failed; trying memory store.", error);
    }
  }

  // In-memory demo fallback store
  const matchedMemEmp = memoryEmployees.find((e) =>
    identity.candidateEmployeeIds.includes(e.employeeId.toUpperCase()) ||
    identity.candidateEmails.includes(e.email.toLowerCase())
  );

  if (matchedMemEmp && (matchedMemEmp.status === "SUSPENDED" || matchedMemEmp.status === "DEACTIVATED")) {
    recordFailedLoginAttempt(identity.primaryEmail);
    return null;
  }

  const effectiveEmails = new Set(identity.candidateEmails.map((e) => e.toLowerCase()));
  if (matchedMemEmp?.email) {
    effectiveEmails.add(matchedMemEmp.email.toLowerCase());
  }

  const demoUser = demoUsers.find(
    (user) =>
      (effectiveEmails.has(user.email.toLowerCase()) ||
       (matchedMemEmp?.userId && user.id === matchedMemEmp.userId)) &&
      (user.password === password ||
       ((password === DEFAULT_DEMO_TEMP_PASSWORD || password === "AoccDemo!2026") &&
         user.role !== "SUPER_ADMIN" &&
         isPasswordChangeRequired(user.id))),
  );

  const matchedUserId = matchedMemEmp?.userId || (matchedMemEmp ? `usr-${matchedMemEmp.employeeId.toLowerCase()}` : "");
  if (
    !demoUser &&
    matchedMemEmp &&
    (password === DEFAULT_DEMO_TEMP_PASSWORD || password === "AoccDemo!2026") &&
    (!matchedUserId || isPasswordChangeRequired(matchedUserId))
  ) {
    clearLoginRateLimit(identity.primaryEmail);
    const userId = matchedUserId;
    setPasswordChangeRequired(userId, true);
    return {
      id: userId,
      name: matchedMemEmp.fullName,
      email: matchedMemEmp.email,
      role: matchedMemEmp.role,
      shift: matchedMemEmp.shift,
      mustChangePassword: true,
    };
  }

  if (!demoUser) {
    recordFailedLoginAttempt(identity.primaryEmail);
    return null;
  }

  if (isTemporaryPasswordExpired(demoUser.id)) {
    recordFailedLoginAttempt(identity.primaryEmail);
    return null;
  }

  clearLoginRateLimit(identity.primaryEmail);

  const isInitialSharedPassword = password === DEFAULT_DEMO_TEMP_PASSWORD;
  if (isInitialSharedPassword) {
    setPasswordChangeRequired(demoUser.id, true);
  }
  const mustChange = isInitialSharedPassword || isPasswordChangeRequired(demoUser.id);

  return {
    id: demoUser.id,
    name: demoUser.name,
    email: demoUser.email,
    role: demoUser.role,
    shift: demoUser.shift,
    mustChangePassword: mustChange,
  };
}
