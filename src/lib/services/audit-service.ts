import type { AuditLogDTO } from "@/lib/domain";
import { prisma, shouldUseDatabase } from "@/lib/prisma";

export interface LogAuditInput {
  actorId?: string;
  actorName?: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
}

// In-memory audit log store for fallback mode
const memoryAuditLogs: AuditLogDTO[] = [
  {
    id: "audit-evt-006",
    actorId: "usr-admin",
    actorName: "Maya Rao",
    actorRole: "SUPER_ADMIN",
    action: "CLEAR_RUNWAY_TAKEOFF",
    entity: "FLIGHT",
    entityId: "SKY-402",
    details: { runway: "04L", squawk: "4201", wind: "270/12KT", clearanceLimit: "FL240" },
    after: { status: "DEPARTING", assignedRunway: "04L" },
    createdAt: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: "audit-evt-005",
    actorId: "usr-atc",
    actorName: "Ground Controller 02",
    actorRole: "ATC_CONTROLLER",
    action: "ASSIGN_GATE",
    entity: "GATE",
    entityId: "GATE-A1",
    details: { flightNumber: "BHA-101", gate: "A1", terminal: "T1", tugAssigned: "TUG-04" },
    after: { status: "OCCUPIED", currentFlight: "BHA-101" },
    createdAt: new Date(Date.now() - 480_000).toISOString(),
  },
  {
    id: "audit-evt-004",
    actorId: "usr-staff-1",
    actorName: "Ananya Deshmukh",
    actorRole: "SECURITY_OFFICER",
    action: "PASSENGER_SECURITY_VERIFIED",
    entity: "PASSENGER",
    entityId: "PAX-9821411",
    details: { pnr: "SC7K92P", passenger: "Capt. Eleanor Vance", gate: "A1", seat: "4A", biometricMatch: true },
    after: { securityStatus: "CLEARED", verifiedAt: new Date().toISOString() },
    createdAt: new Date(Date.now() - 900_000).toISOString(),
  },
  {
    id: "audit-evt-003",
    actorId: "usr-atc",
    actorName: "Tower Controller 01",
    actorRole: "ATC_CONTROLLER",
    action: "ACKNOWLEDGE_EMERGENCY",
    entity: "FLIGHT",
    entityId: "AVS-205",
    details: { code: "7700", nature: "HYDRAULIC_SYS_WARN", priorityVector: "ILS 22R DIRECT", fireCrewsDispatched: true },
    after: { status: "EMERGENCY", emergencyHandled: true },
    createdAt: new Date(Date.now() - 1800_000).toISOString(),
  },
  {
    id: "audit-evt-002",
    actorId: "usr-dispatch",
    actorName: "Karan Johar",
    actorRole: "DISPATCHER",
    action: "DISPATCH_CREW_ASSIGNMENT",
    entity: "FLIGHT",
    entityId: "ISK-303",
    details: { captain: "Capt. S. Verma", firstOfficer: "FO N. Gupta", cabinCrewCount: 4 },
    after: { crewReady: true, briefingSigned: true },
    createdAt: new Date(Date.now() - 2700_000).toISOString(),
  },
  {
    id: "audit-evt-001",
    actorId: "usr-admin",
    actorName: "Maya Rao",
    actorRole: "SUPER_ADMIN",
    action: "SYSTEM_INITIALIZED",
    entity: "SYSTEM",
    entityId: "AOCC-SIM-1",
    after: { status: "OPERATIONAL", mode: "FULL_AUTHORITY" },
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
];

export async function logAuditEvent(input: LogAuditInput): Promise<AuditLogDTO> {
  const logEntry: AuditLogDTO = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actorId: input.actorId,
    actorName: input.actorName,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    before: input.before,
    after: input.after,
    ip: input.ip,
    createdAt: new Date().toISOString(),
  };

  memoryAuditLogs.unshift(logEntry);
  if (memoryAuditLogs.length > 500) {
    memoryAuditLogs.pop();
  }

  if (shouldUseDatabase()) {
    try {
      await prisma.auditLog.create({
        data: {
          id: logEntry.id,
          actorId: input.actorId || undefined,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          before: input.before as object,
          after: input.after as object,
          ip: input.ip,
          createdAt: new Date(logEntry.createdAt),
        },
      });
    } catch (error) {
      console.warn("Database audit log write failed; recorded in memory.", error);
    }
  }

  return logEntry;
}

export async function getAuditLogs(limit = 100): Promise<AuditLogDTO[]> {
  if (shouldUseDatabase()) {
    try {
      const records = await prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, name: true, email: true } } },
      });

      return records.map((record) => ({
        id: record.id,
        actorId: record.actorId ?? undefined,
        actorName: record.actor?.name ?? undefined,
        action: record.action,
        entity: record.entity,
        entityId: record.entityId ?? undefined,
        before: (record.before as Record<string, unknown>) ?? undefined,
        after: (record.after as Record<string, unknown>) ?? undefined,
        ip: record.ip ?? undefined,
        createdAt: record.createdAt.toISOString(),
      }));
    } catch (error) {
      console.warn("Database audit log read failed; returning in-memory.", error);
    }
  }

  return [...memoryAuditLogs.slice(0, limit)];
}
