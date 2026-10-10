import type { UserDTO } from "@/lib/domain";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { listEmployees } from "@/lib/services/staff-service";

export interface AirportScope {
  global: boolean;
  airportCode?: string;
  terminal?: string;
  gateArea?: string;
  role: UserDTO["role"];
}

const GLOBAL_AIRPORT_ROLES: UserDTO["role"][] = [
  "SUPER_ADMIN",
  "ADMIN",
  "AIRPORT_ADMIN",
  "OPERATIONS_MANAGER",
];

export async function getAirportScope(user: UserDTO): Promise<AirportScope | null> {
  if (GLOBAL_AIRPORT_ROLES.includes(user.role)) return { global: true, role: user.role };

  const employee = shouldUseDatabase()
    ? await prisma.employee.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { airportCode: true, terminal: true, gateArea: true, status: true, verificationStatus: true },
      })
    : (await listEmployees({ search: user.email })).find(
        (record) => record.email.toLowerCase() === user.email.toLowerCase(),
      );

  if (!employee || !["ACTIVE", "ON_DUTY"].includes(employee.status) || employee.verificationStatus !== "VERIFIED") {
    return null;
  }

  return {
    global: false,
    airportCode: employee.airportCode.toUpperCase(),
    terminal: employee.terminal ?? undefined,
    gateArea: employee.gateArea ?? undefined,
    role: user.role,
  };
}

export function airportScopeAllowsFlight(scope: AirportScope, flight: {
  origin: string;
  terminal?: string | null;
  gate?: string | null;
}): boolean {
  if (scope.global) return true;
  if (scope.airportCode !== flight.origin.toUpperCase()) return false;

  if (scope.terminal && scope.terminal !== "ALL" && flight.terminal && scope.terminal !== flight.terminal) {
    return false;
  }

  if (scope.role === "GATE_AGENT" && scope.gateArea) {
    const assignedGate = scope.gateArea.replace(/^GATE\s*/i, "").trim().toUpperCase();
    const actualGate = flight.gate?.replace(/^GATE\s*/i, "").trim().toUpperCase();
    if (assignedGate !== "ALL" && assignedGate !== "MAIN CONCOURSE" && assignedGate !== actualGate) {
      return false;
    }
  }

  return true;
}