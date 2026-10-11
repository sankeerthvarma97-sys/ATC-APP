import type {
  AirportResourceDTO,
  FlightCommandInput,
  FlightDTO,
  OperationalEventDTO,
  OperationsSnapshot,
  RadioMessageInput,
  RadioMessageDTO,
  UserDTO,
} from "@/lib/domain";
import { airport, educationalDisclaimer } from "@/lib/data/mock";
import {
  addMemoryMessage,
  applyMemoryCommand,
  buildMemorySnapshot,
  getDemoUser,
} from "@/lib/data/store";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { computeMetrics } from "@/lib/simulation/logic";

function toFlightDTO(record: Record<string, unknown>): FlightDTO {
  const controller = record.assignedController as Record<string, unknown> | null | undefined;

  return {
    id: String(record.id),
    callsign: String(record.callsign),
    airline: String(record.airline),
    aircraftType: String(record.aircraftType),
    status: record.status as FlightDTO["status"],
    phase: String(record.phase),
    origin: String(record.origin),
    destination: String(record.destination),
    gate: record.gate ? String(record.gate) : undefined,
    stand: record.stand ? String(record.stand) : undefined,
    runway: record.runway ? String(record.runway) : undefined,
    squawk: String(record.squawk),
    latitude: Number(record.latitude),
    longitude: Number(record.longitude),
    altitudeFt: Number(record.altitudeFt),
    speedKt: Number(record.speedKt),
    headingDeg: Number(record.headingDeg),
    verticalSpeedFpm: Number(record.verticalSpeedFpm),
    fuelKg: Number(record.fuelKg),
    riskScore: Number(record.riskScore),
    eta: new Date(record.eta as string | Date).toISOString(),
    assignedController: controller
      ? {
          id: String(controller.id),
          name: String(controller.name),
          role: controller.role as UserDTO["role"],
        }
      : undefined,
    updatedAt: new Date(record.updatedAt as string | Date).toISOString(),
  };
}

function toResourceDTO(record: Record<string, unknown>): AirportResourceDTO {
  return {
    id: String(record.id),
    resourceType: record.resourceType as AirportResourceDTO["resourceType"],
    code: String(record.code),
    label: String(record.label),
    status: record.status as AirportResourceDTO["status"],
    metadata: (record.metadata as AirportResourceDTO["metadata"]) ?? undefined,
    updatedAt: new Date(record.updatedAt as string | Date).toISOString(),
  };
}

function toEventDTO(record: Record<string, unknown>): OperationalEventDTO {
  return {
    id: String(record.id),
    type: record.type as OperationalEventDTO["type"],
    severity: record.severity as OperationalEventDTO["severity"],
    title: String(record.title),
    detail: String(record.detail),
    payload: (record.payload as OperationalEventDTO["payload"]) ?? undefined,
    flightId: record.flightId ? String(record.flightId) : undefined,
    userId: record.userId ? String(record.userId) : undefined,
    resolvedAt: record.resolvedAt ? new Date(record.resolvedAt as string | Date).toISOString() : undefined,
    createdAt: new Date(record.createdAt as string | Date).toISOString(),
  };
}

function toMessageDTO(record: Record<string, unknown>): RadioMessageDTO {
  const fromUser = record.fromUser as Record<string, unknown> | null | undefined;
  const flight = record.flight as Record<string, unknown> | null | undefined;

  return {
    id: String(record.id),
    channel: String(record.channel),
    direction: record.direction as RadioMessageDTO["direction"],
    text: String(record.text),
    priority: record.priority as RadioMessageDTO["priority"],
    createdAt: new Date(record.createdAt as string | Date).toISOString(),
    flightId: record.flightId ? String(record.flightId) : undefined,
    callsign: flight?.callsign ? String(flight.callsign) : undefined,
    fromUser: fromUser
      ? {
          id: String(fromUser.id),
          name: String(fromUser.name),
          role: fromUser.role as UserDTO["role"],
        }
      : undefined,
  };
}

interface CachedSnapshotData {
  timestamp: number;
  data: Omit<OperationsSnapshot, "currentUser">;
}

let snapshotCache: CachedSnapshotData | null = null;
let inflightSnapshotPromise: Promise<Omit<OperationsSnapshot, "currentUser">> | null = null;
const SNAPSHOT_CACHE_TTL_MS = 1500;

export function invalidateSnapshotCache() {
  snapshotCache = null;
}

async function fetchRawSnapshotData(): Promise<Omit<OperationsSnapshot, "currentUser">> {
  const [flights, resources, events, messages, dbAirport] = await Promise.all([
    prisma.flight.findMany({
      include: { assignedController: { select: { id: true, name: true, role: true } } },
      orderBy: [{ riskScore: "desc" }, { eta: "asc" }],
    }),
    prisma.airportResource.findMany({ orderBy: [{ resourceType: "asc" }, { code: "asc" }] }),
    prisma.operationalEvent.findMany({ orderBy: { createdAt: "desc" }, take: 32 }),
    prisma.radioMessage.findMany({
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        flight: { select: { callsign: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 28,
    }),
    prisma.airport.findFirst({
      where: { iata: "HYD", status: "ACTIVE" },
    }),
  ]);

  const flightDtos = flights.map((flight) => toFlightDTO(flight as unknown as Record<string, unknown>));
  const resourceDtos = resources.map((resource) => toResourceDTO(resource as unknown as Record<string, unknown>));

  const resolvedAirport = dbAirport
    ? {
        iata: dbAirport.iata,
        icao: dbAirport.icao,
        name: dbAirport.name,
        latitude: dbAirport.latitude,
        longitude: dbAirport.longitude,
        fieldElevationFt: dbAirport.elevationFt,
      }
    : airport;

  return {
    generatedAt: new Date().toISOString(),
    airport: resolvedAirport,
    flights: flightDtos,
    resources: resourceDtos,
    events: events.map((event) => toEventDTO(event as unknown as Record<string, unknown>)),
    messages: messages.map((message) => toMessageDTO(message as unknown as Record<string, unknown>)),
    metrics: computeMetrics(flightDtos, resourceDtos),
    disclaimer: educationalDisclaimer,
  };
}

export async function getOperationsSnapshot(currentUser = getDemoUser()): Promise<OperationsSnapshot> {
  if (!shouldUseDatabase()) {
    return buildMemorySnapshot(currentUser);
  }

  const now = Date.now();
  if (snapshotCache && now - snapshotCache.timestamp < SNAPSHOT_CACHE_TTL_MS) {
    return {
      ...snapshotCache.data,
      currentUser,
    };
  }

  if (inflightSnapshotPromise) {
    const data = await inflightSnapshotPromise;
    return { ...data, currentUser };
  }

  try {
    inflightSnapshotPromise = fetchRawSnapshotData();
    const data = await inflightSnapshotPromise;
    snapshotCache = { timestamp: Date.now(), data };
    return { ...data, currentUser };
  } catch (error) {
    console.warn("Falling back to in-memory AOCC snapshot", error);
    return buildMemorySnapshot(currentUser);
  } finally {
    inflightSnapshotPromise = null;
  }
}

export async function executeFlightCommand(input: FlightCommandInput, actor: UserDTO) {
  if (!shouldUseDatabase()) {
    return applyMemoryCommand(input);
  }

  try {
    const before = await prisma.flight.findUnique({ where: { id: input.flightId } });
    if (!before) {
      return applyMemoryCommand(input);
    }

    const next = applyMemoryCommand(input).flight;
    if (!next) {
      return { flight: undefined, snapshot: await getOperationsSnapshot(actor) };
    }

    const flight = await prisma.flight.update({
      where: { id: input.flightId },
      data: {
        status: next.status,
        phase: next.phase,
        runway: next.runway,
        gate: next.gate,
        destination: next.destination,
        squawk: next.squawk,
        speedKt: next.speedKt,
        verticalSpeedFpm: next.verticalSpeedFpm,
        riskScore: next.riskScore,
      },
    });

    await prisma.operationalEvent.create({
      data: {
        type: input.type === "DECLARE_EMERGENCY" ? "EMERGENCY" : "COMMAND",
        severity: input.type === "DECLARE_EMERGENCY" ? "CRITICAL" : "ADVISORY",
        title: `${flight.callsign} ${input.type.toLowerCase().replaceAll("_", " ")}`,
        detail: input.note || "Command applied from AOCC console.",
        flightId: input.flightId,
        userId: actor.id,
        payload: { command: input.type, value: input.value },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: input.type,
        entity: "Flight",
        entityId: input.flightId,
        before: before as unknown as object,
        after: flight as unknown as object,
      },
    });

    invalidateSnapshotCache();
    return { flight: toFlightDTO(flight as unknown as Record<string, unknown>), snapshot: await getOperationsSnapshot(actor) };
  } catch (error) {
    console.warn("Falling back to in-memory command execution", error);
    return applyMemoryCommand(input);
  }
}

export async function recordRadioMessage(input: RadioMessageInput, actor: UserDTO) {
  if (!shouldUseDatabase()) {
    return addMemoryMessage(input);
  }

  try {
    const flight = await prisma.flight.findUnique({ where: { id: input.flightId } });
    if (!flight) {
      return addMemoryMessage(input);
    }

    const message = await prisma.radioMessage.create({
      data: {
        channel: input.channel || "Tower",
        direction: input.direction,
        text: input.text,
        priority: input.priority || "INFO",
        flightId: input.flightId,
        fromUserId: actor.id,
      },
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        flight: { select: { callsign: true } },
      },
    });

    await prisma.operationalEvent.create({
      data: {
        type: input.direction === "ATC_TO_PILOT" ? "ATC_MESSAGE" : "PILOT_MESSAGE",
        severity: input.priority || "INFO",
        title: `${flight.callsign} radio message`,
        detail: input.text,
        flightId: input.flightId,
        userId: actor.id,
      },
    });

    invalidateSnapshotCache();
    return { message: toMessageDTO(message as unknown as Record<string, unknown>), snapshot: await getOperationsSnapshot(actor) };
  } catch (error) {
    console.warn("Falling back to in-memory radio message", error);
    return addMemoryMessage(input);
  }
}
