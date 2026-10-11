import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function createPgPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL ?? "",
    max: 25, // Cap connection pool to prevent PostgreSQL saturation under high concurrent load
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });
}

const pool = globalForPrisma.pgPool ?? createPgPool();
globalForPrisma.pgPool = pool;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Cache in globalThis across all environments (including production serverless hot invocations)
globalForPrisma.prisma = prisma;

export function shouldUseDatabase() {
  if (process.env.NODE_ENV === "test" && process.env.TEST_USE_DATABASE !== "true") {
    return false;
  }
  return process.env.AOCC_USE_DATABASE === "true" && Boolean(process.env.DATABASE_URL);
}
