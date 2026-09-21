import type { Role, UserDTO } from "@/lib/domain";
export { assertPermission, getRolePermissions, hasPermission } from "./permissions";

const roleHierarchy: Record<Role, Role[]> = {
  SUPER_ADMIN: [
    "SUPER_ADMIN",
    "ADMIN",
    "AIRPORT_ADMIN",
    "OPERATIONS_MANAGER",
    "SUPERVISOR",
    "ATC",
    "ATC_CONTROLLER",
    "SENIOR_ATC_CONTROLLER",
    "GROUND",
    "GROUND_OPERATOR",
    "AIRLINE_OPERATOR",
    "TICKETING_AGENT",
    "GATE_AGENT",
    "SECURITY_OFFICER",
    "BAGGAGE_STAFF",
    "MAINTENANCE_STAFF",
    "FLIGHT_DISPATCHER",
    "SIMULATOR_OPERATOR",
    "PILOT",
    "PASSENGER",
    "ANALYST",
    "VIEWER",
  ],
  ADMIN: [
    "ADMIN",
    "AIRPORT_ADMIN",
    "OPERATIONS_MANAGER",
    "SUPERVISOR",
    "ATC",
    "ATC_CONTROLLER",
    "SENIOR_ATC_CONTROLLER",
    "GROUND",
    "GROUND_OPERATOR",
    "AIRLINE_OPERATOR",
    "TICKETING_AGENT",
    "GATE_AGENT",
    "SECURITY_OFFICER",
    "BAGGAGE_STAFF",
    "MAINTENANCE_STAFF",
    "FLIGHT_DISPATCHER",
    "SIMULATOR_OPERATOR",
    "PILOT",
    "PASSENGER",
    "ANALYST",
    "VIEWER",
  ],
  AIRPORT_ADMIN: [
    "AIRPORT_ADMIN",
    "OPERATIONS_MANAGER",
    "SUPERVISOR",
    "ATC",
    "ATC_CONTROLLER",
    "SENIOR_ATC_CONTROLLER",
    "GROUND",
    "GROUND_OPERATOR",
    "AIRLINE_OPERATOR",
    "TICKETING_AGENT",
    "GATE_AGENT",
    "SECURITY_OFFICER",
    "BAGGAGE_STAFF",
    "MAINTENANCE_STAFF",
    "FLIGHT_DISPATCHER",
    "SIMULATOR_OPERATOR",
    "PILOT",
    "PASSENGER",
    "ANALYST",
    "VIEWER",
  ],
  OPERATIONS_MANAGER: [
    "OPERATIONS_MANAGER",
    "SUPERVISOR",
    "ATC",
    "ATC_CONTROLLER",
    "SENIOR_ATC_CONTROLLER",
    "GROUND",
    "GROUND_OPERATOR",
    "AIRLINE_OPERATOR",
    "TICKETING_AGENT",
    "GATE_AGENT",
    "BAGGAGE_STAFF",
    "FLIGHT_DISPATCHER",
    "VIEWER",
  ],
  SUPERVISOR: [
    "SUPERVISOR",
    "ATC",
    "ATC_CONTROLLER",
    "GROUND",
    "GROUND_OPERATOR",
    "TICKETING_AGENT",
    "GATE_AGENT",
    "PILOT",
    "ANALYST",
    "VIEWER",
  ],
  ATC: ["ATC", "ATC_CONTROLLER", "PILOT", "VIEWER"],
  ATC_CONTROLLER: ["ATC", "ATC_CONTROLLER", "PILOT", "VIEWER"],
  SENIOR_ATC_CONTROLLER: ["ATC", "ATC_CONTROLLER", "SENIOR_ATC_CONTROLLER", "PILOT", "VIEWER"],
  GROUND: ["GROUND", "GROUND_OPERATOR", "VIEWER"],
  GROUND_OPERATOR: ["GROUND", "GROUND_OPERATOR", "VIEWER"],
  AIRLINE_OPERATOR: ["AIRLINE_OPERATOR", "PILOT", "VIEWER"],
  TICKETING_AGENT: ["TICKETING_AGENT", "GATE_AGENT", "VIEWER"],
  GATE_AGENT: ["GATE_AGENT", "VIEWER"],
  SECURITY_OFFICER: ["SECURITY_OFFICER", "VIEWER"],
  BAGGAGE_STAFF: ["BAGGAGE_STAFF", "VIEWER"],
  MAINTENANCE_STAFF: ["MAINTENANCE_STAFF", "VIEWER"],
  FLIGHT_DISPATCHER: ["FLIGHT_DISPATCHER", "PILOT", "VIEWER"],
  SIMULATOR_OPERATOR: ["SIMULATOR_OPERATOR", "ATC", "PILOT", "VIEWER"],
  PILOT: ["PILOT", "VIEWER"],
  PASSENGER: ["PASSENGER", "VIEWER"],
  ANALYST: ["ANALYST", "VIEWER"],
  VIEWER: ["VIEWER"],
};

export function canActAs(role: Role, required: Role) {
  return roleHierarchy[role]?.includes(required) ?? false;
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
  return [
    "ADMIN",
    "SUPER_ADMIN",
    "AIRPORT_ADMIN",
    "OPERATIONS_MANAGER",
    "SUPERVISOR",
    "ATC",
    "ATC_CONTROLLER",
    "SENIOR_ATC_CONTROLLER",
    "GROUND",
    "GROUND_OPERATOR",
    "SIMULATOR_OPERATOR",
  ].some((allowed) => canActAs(role, allowed as Role));
}

