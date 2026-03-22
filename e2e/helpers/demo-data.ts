import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export interface SmokeTargets {
  strategyId: string;
  strategyTitle: string;
  tradeId: string;
  batchId: string;
}

export async function getSmokeTargets(): Promise<SmokeTargets> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the smoke test.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email: "demo@playbookai.app" },
      select: { id: true },
    });

    if (!user) {
      throw new Error("Seeded demo user not found. Run the seed command first.");
    }

    const [strategy, trade, batch] = await Promise.all([
      prisma.strategy.findFirst({
        where: { userId: user.id, isArchived: false },
        orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
        select: { id: true, title: true },
      }),
      prisma.trade.findFirst({
        where: { userId: user.id },
        orderBy: { entryAt: "desc" },
        select: { id: true },
      }),
      prisma.importBatch.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      }),
    ]);

    if (!strategy) {
      throw new Error("No strategy found for the seeded demo user.");
    }

    if (!trade) {
      throw new Error("No trade found for the seeded demo user.");
    }

    if (!batch) {
      throw new Error("No import batch found for the seeded demo user.");
    }

    return {
      strategyId: strategy.id,
      strategyTitle: strategy.title,
      tradeId: trade.id,
      batchId: batch.id,
    };
  } finally {
    await prisma.$disconnect();
  }
}
