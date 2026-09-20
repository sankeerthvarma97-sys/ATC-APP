import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import {
  createInitialEvents,
  createInitialFlights,
  createInitialMessages,
  createInitialResources,
  demoUsers,
} from "../src/lib/data/mock";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

async function main() {
  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        shift: user.shift,
        passwordHash: await hash(user.password, 12),
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shift: user.shift,
        passwordHash: await hash(user.password, 12),
      },
    });
  }

  for (const flight of createInitialFlights()) {
    await prisma.flight.upsert({
      where: { callsign: flight.callsign },
      update: {
        airline: flight.airline,
        aircraftType: flight.aircraftType,
        status: flight.status,
        phase: flight.phase,
        origin: flight.origin,
        destination: flight.destination,
        gate: flight.gate,
        stand: flight.stand,
        runway: flight.runway,
        squawk: flight.squawk,
        latitude: flight.latitude,
        longitude: flight.longitude,
        altitudeFt: flight.altitudeFt,
        speedKt: flight.speedKt,
        headingDeg: flight.headingDeg,
        verticalSpeedFpm: flight.verticalSpeedFpm,
        fuelKg: flight.fuelKg,
        riskScore: flight.riskScore,
        eta: new Date(flight.eta),
        assignedControllerId: flight.assignedController?.id,
      },
      create: {
        id: flight.id,
        callsign: flight.callsign,
        airline: flight.airline,
        aircraftType: flight.aircraftType,
        status: flight.status,
        phase: flight.phase,
        origin: flight.origin,
        destination: flight.destination,
        gate: flight.gate,
        stand: flight.stand,
        runway: flight.runway,
        squawk: flight.squawk,
        latitude: flight.latitude,
        longitude: flight.longitude,
        altitudeFt: flight.altitudeFt,
        speedKt: flight.speedKt,
        headingDeg: flight.headingDeg,
        verticalSpeedFpm: flight.verticalSpeedFpm,
        fuelKg: flight.fuelKg,
        riskScore: flight.riskScore,
        eta: new Date(flight.eta),
        assignedControllerId: flight.assignedController?.id,
      },
    });
  }

  for (const resource of createInitialResources()) {
    await prisma.airportResource.upsert({
      where: {
        resourceType_code: {
          resourceType: resource.resourceType,
          code: resource.code,
        },
      },
      update: {
        label: resource.label,
        status: resource.status,
        metadata: resource.metadata ?? undefined,
      },
      create: {
        id: resource.id,
        resourceType: resource.resourceType,
        code: resource.code,
        label: resource.label,
        status: resource.status,
        metadata: resource.metadata ?? undefined,
      },
    });
  }

  for (const event of createInitialEvents()) {
    await prisma.operationalEvent.upsert({
      where: { id: event.id },
      update: {},
      create: {
        id: event.id,
        type: event.type,
        severity: event.severity,
        title: event.title,
        detail: event.detail,
        payload: event.payload as Prisma.InputJsonValue | undefined,
        flightId: event.flightId,
        userId: event.userId,
        createdAt: new Date(event.createdAt),
      },
    });
  }

  for (const message of createInitialMessages()) {
    await prisma.radioMessage.upsert({
      where: { id: message.id },
      update: {},
      create: {
        id: message.id,
        channel: message.channel,
        direction: message.direction,
        text: message.text,
        priority: message.priority,
        createdAt: new Date(message.createdAt),
        flightId: message.flightId,
        fromUserId: message.fromUser?.id,
      },
    });
  }

  console.log("AOCC demo data seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
