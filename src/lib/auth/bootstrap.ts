import { hash } from "bcryptjs";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import type { UserDTO } from "@/lib/domain";

export const BOOTSTRAP_ADMIN_EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@gmail.com";
export const BOOTSTRAP_ADMIN_DEFAULT_PASS = process.env.ADMIN_BOOTSTRAP_PASSWORD || "Sankeerth@80";

/**
 * Idempotently ensures the permanent Super Admin account exists in the database.
 * Never stores plaintext passwords; hashes using bcrypt with 12 salt rounds.
 */
export async function ensurePermanentSuperAdmin(): Promise<UserDTO | null> {
  const email = BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
  const rawPassword = BOOTSTRAP_ADMIN_DEFAULT_PASS;

  if (shouldUseDatabase()) {
    try {
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        const passwordHash = await hash(rawPassword, 12);
        user = await prisma.user.create({
          data: {
            id: "usr-super-admin",
            name: "Permanent Super Admin",
            email,
            role: "SUPER_ADMIN",
            shift: "ALL",
            passwordHash,
          },
        });

        // Upsert corresponding Employee record
        await prisma.employee.upsert({
          where: { email },
          update: {
            role: "SUPER_ADMIN",
            status: "ACTIVE",
            verificationStatus: "VERIFIED",
            permissions: ["SUPER_ADMIN_ALL_ACCESS"],
          },
          create: {
            id: "emp-0001",
            employeeId: "EMP-0001",
            fullName: "Permanent Super Admin",
            email,
            phone: "+91 80000 00001",
            department: "ADMINISTRATION",
            jobTitle: "Airport Authority System Owner",
            role: "SUPER_ADMIN",
            airportCode: "HYD",
            terminal: "ALL",
            gateArea: "ALL",
            shift: "ALL",
            status: "ACTIVE",
            verificationStatus: "VERIFIED",
            permissions: ["SUPER_ADMIN_ALL_ACCESS"],
            userId: user.id,
          },
        });
      } else if (user.role !== "SUPER_ADMIN") {
        // Ensure role remains SUPER_ADMIN
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: "SUPER_ADMIN" },
        });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "SUPER_ADMIN",
        shift: user.shift ?? "ALL",
      };
    } catch (err) {
      console.warn("Bootstrap super admin database check failed:", err);
    }
  }

  return {
    id: "usr-super-admin",
    name: "Permanent Super Admin",
    email,
    role: "SUPER_ADMIN",
    shift: "ALL",
  };
}
