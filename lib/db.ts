// ---------------------------------------------------------------------------
// Prisma Client Singleton
//
// Uses the globalThis pattern to prevent multiple PrismaClient instances from
// being created during Next.js hot reloads in development. In production a
// fresh instance is always created once.
// ---------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";

// Extend globalThis to hold the optional prisma instance without TypeScript
// complaining about an unknown property.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
