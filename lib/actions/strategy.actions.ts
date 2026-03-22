"use server";

// ---------------------------------------------------------------------------
// Strategy Server Actions
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import { StrategyFormData } from "@/lib/validations/strategy.schema";
import { Strategy } from "@prisma/client";

// ---------------------------------------------------------------------------
// createStrategy
// ---------------------------------------------------------------------------

export async function createStrategy(
  userId: string,
  data: StrategyFormData,
): Promise<Strategy> {
  if (!userId) throw new Error("User ID is required");

  const strategy = await db.strategy.create({
    data: {
      userId,
      title: data.title,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
      isArchived: data.isArchived ?? false,
      markets: data.markets,
      preferredSymbols: data.preferredSymbols ?? [],
      timeframes: data.timeframes ?? [],
      tradingSessions: data.tradingSessions ?? [],
      allowedHoursStart: data.allowedHoursStart ?? null,
      allowedHoursEnd: data.allowedHoursEnd ?? null,
      forbiddenHours: data.forbiddenHours ?? undefined,
      setupTypes: data.setupTypes ?? [],
      entryConditions: data.entryConditions ?? null,
      invalidationConditions: data.invalidationConditions ?? null,
      stopLogic: data.stopLogic ?? null,
      targetLogic: data.targetLogic ?? null,
      noTradeConditions: data.noTradeConditions ?? null,
      minimumRR: data.minimumRR ?? null,
      maxTradesPerDay: data.maxTradesPerDay ?? null,
      maxDailyLoss: data.maxDailyLoss ?? null,
      maxDailyLossPct: data.maxDailyLossPct ?? null,
      riskRules: data.riskRules ?? undefined,
      notes: data.notes ?? null,
    },
  });

  return strategy;
}

// ---------------------------------------------------------------------------
// updateStrategy
// ---------------------------------------------------------------------------

export async function updateStrategy(
  strategyId: string,
  userId: string,
  data: Partial<StrategyFormData>,
): Promise<Strategy> {
  if (!strategyId) throw new Error("Strategy ID is required");
  if (!userId) throw new Error("User ID is required");

  // Verify ownership
  const existing = await db.strategy.findFirst({
    where: { id: strategyId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Strategy not found or access denied");
  }

  const strategy = await db.strategy.update({
    where: { id: strategyId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
      ...(data.markets !== undefined && { markets: data.markets }),
      ...(data.preferredSymbols !== undefined && { preferredSymbols: data.preferredSymbols }),
      ...(data.timeframes !== undefined && { timeframes: data.timeframes }),
      ...(data.tradingSessions !== undefined && { tradingSessions: data.tradingSessions }),
      ...(data.allowedHoursStart !== undefined && { allowedHoursStart: data.allowedHoursStart }),
      ...(data.allowedHoursEnd !== undefined && { allowedHoursEnd: data.allowedHoursEnd }),
      ...(data.forbiddenHours !== undefined && { forbiddenHours: data.forbiddenHours ?? undefined }),
      ...(data.setupTypes !== undefined && { setupTypes: data.setupTypes }),
      ...(data.entryConditions !== undefined && { entryConditions: data.entryConditions }),
      ...(data.invalidationConditions !== undefined && { invalidationConditions: data.invalidationConditions }),
      ...(data.stopLogic !== undefined && { stopLogic: data.stopLogic }),
      ...(data.targetLogic !== undefined && { targetLogic: data.targetLogic }),
      ...(data.noTradeConditions !== undefined && { noTradeConditions: data.noTradeConditions }),
      ...(data.minimumRR !== undefined && { minimumRR: data.minimumRR }),
      ...(data.maxTradesPerDay !== undefined && { maxTradesPerDay: data.maxTradesPerDay }),
      ...(data.maxDailyLoss !== undefined && { maxDailyLoss: data.maxDailyLoss }),
      ...(data.maxDailyLossPct !== undefined && { maxDailyLossPct: data.maxDailyLossPct }),
      ...(data.riskRules !== undefined && { riskRules: data.riskRules ?? undefined }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return strategy;
}

// ---------------------------------------------------------------------------
// deleteStrategy
// ---------------------------------------------------------------------------

export async function deleteStrategy(
  strategyId: string,
  userId: string,
): Promise<void> {
  if (!strategyId) throw new Error("Strategy ID is required");
  if (!userId) throw new Error("User ID is required");

  // Verify ownership
  const existing = await db.strategy.findFirst({
    where: { id: strategyId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Strategy not found or access denied");
  }

  await db.strategy.delete({ where: { id: strategyId } });
}

// ---------------------------------------------------------------------------
// getStrategies
// ---------------------------------------------------------------------------

export async function getStrategies(userId: string): Promise<Strategy[]> {
  if (!userId) throw new Error("User ID is required");

  return db.strategy.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });
}

// ---------------------------------------------------------------------------
// getStrategy
// ---------------------------------------------------------------------------

export async function getStrategy(
  strategyId: string,
  userId: string,
): Promise<Strategy | null> {
  if (!strategyId) throw new Error("Strategy ID is required");
  if (!userId) throw new Error("User ID is required");

  return db.strategy.findFirst({
    where: { id: strategyId, userId },
  });
}

// ---------------------------------------------------------------------------
// setActiveStrategy
// ---------------------------------------------------------------------------

export async function setActiveStrategy(
  strategyId: string,
  userId: string,
): Promise<void> {
  if (!strategyId) throw new Error("Strategy ID is required");
  if (!userId) throw new Error("User ID is required");

  // Verify ownership
  const target = await db.strategy.findFirst({
    where: { id: strategyId, userId },
    select: { id: true },
  });

  if (!target) {
    throw new Error("Strategy not found or access denied");
  }

  // Deactivate all strategies for this user, then activate the target
  await db.$transaction([
    db.strategy.updateMany({
      where: { userId },
      data: { isActive: false },
    }),
    db.strategy.update({
      where: { id: strategyId },
      data: { isActive: true },
    }),
  ]);
}
