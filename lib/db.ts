// ---------------------------------------------------------------------------
// Prisma Client Singleton
//
// Prisma v7 uses the "client" engine which requires a driver adapter.
// We use @prisma/adapter-pg (the official PostgreSQL adapter).
//
// Uses the globalThis pattern to prevent multiple PrismaClient instances from
// being created during Next.js hot reloads in development.
// ---------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

// Extend globalThis to hold the optional prisma instance without TypeScript
// complaining about an unknown property.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
