import { compare, hash } from "bcryptjs";
import { demoUsers } from "@/lib/data/mock";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/services/audit-service";

export function isStrongPassword(password: string): boolean {
  return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(password);
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

  if (!isStrongPassword(newPassword)) {
    return {
      ok: false,
      message: "New password must be at least 12 characters and include uppercase, lowercase, numbers, and symbols.",
    };
  }

  if (currentPassword === newPassword) {
    return { ok: false, message: "Choose a new password that differs from the current password." };
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
