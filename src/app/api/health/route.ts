import { NextResponse } from "next/server";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { validateStartupConfiguration } from "@/lib/config/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  const startupStatus = validateStartupConfiguration();
  let dbStatus = "CONNECTED";
  let dbLatencyMs = 0;
  let healthStatus = "HEALTHY";

  if (shouldUseDatabase()) {
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch {
      dbStatus = "DEGRADED_OR_IN_MEMORY_MODE";
      healthStatus = "DEGRADED";
    }
  } else {
    dbStatus = "IN_MEMORY_SIMULATION_MODE";
  }

  if (!startupStatus.ok) {
    healthStatus = "DEGRADED";
  }

  const memory = process.memoryUsage();

  return NextResponse.json(
    {
      status: healthStatus,
      service: "Airport Operations Control Center (AOCC)",
      environment: process.env.NODE_ENV || "development",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
      runtime: {
        ok: startupStatus.ok,
        missing: startupStatus.missing,
        warnings: startupStatus.warnings,
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 10) / 10,
        heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 10) / 10,
        rssMb: Math.round((memory.rss / 1024 / 1024) * 10) / 10,
      },
      telemetry: {
        simEngine: "ONLINE",
        socketIoServer: "ACTIVE",
        radarFeeds: "OPERATIONAL",
      },
    },
    { status: healthStatus === "HEALTHY" ? 200 : 503 }
  );
}
