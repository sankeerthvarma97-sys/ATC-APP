import type { Role, UserDTO } from "@/lib/domain";

const permissions: Record<Role, Role[]> = {
  ADMIN: ["ADMIN", "SUPERVISOR", "ATC", "PILOT", "GROUND", "ANALYST", "VIEWER"],
  SUPERVISOR: ["SUPERVISOR", "ATC", "PILOT", "GROUND", "ANALYST", "VIEWER"],
  ATC: ["ATC", "PILOT", "VIEWER"],
  PILOT: ["PILOT", "VIEWER"],
  GROUND: ["GROUND", "VIEWER"],
  ANALYST: ["ANALYST", "VIEWER"],
  VIEWER: ["VIEWER"],
};

export function canActAs(role: Role, required: Role) {
  return permissions[role]?.includes(required) ?? false;
}

export function requireAnyRole(user: Pick<UserDTO, "role"> | undefined, allowed: Role[]) {
  if (!user) {
    return { ok: false as const, status: 401, message: "Authentication required." };
  }

  if (!allowed.some((role) => canActAs(user.role, role))) {
    return { ok: false as const, status: 403, message: "This role is not authorized for that operation." };
  }

  return { ok: true as const };
}

export function isCommandRole(role: Role) {
  return ["ADMIN", "SUPERVISOR", "ATC", "GROUND"].some((allowed) => canActAs(role, allowed as Role));
}
