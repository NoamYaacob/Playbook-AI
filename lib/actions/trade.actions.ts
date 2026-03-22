"use server";

// ---------------------------------------------------------------------------
// Trade Server Actions
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import { TradeFormData, TradeSchema } from "@/lib/validations/trade.schema";
import { Trade, Prisma } from "@prisma/client";
import type {
  TradeFilters,
  TradeRow,
  StrategyRow,
  AdherenceEngineResult,
  AdherenceOverTimePoint,
  PnlBySetupPoint,
  AvgRByHourPoint,
  OffPlanByDayPoint,
  EmotionOutcomePoint,
  TopImprovement,
  AdherenceStatus,
  EmotionTag,
  Market,
  TradeSide,
} from "@/types";
import {
  computeAdherenceOverTime,
  computePnlBySetup,
  computeAvgRByHour,
  computeOffPlanByDay,
  computeEmotionOutcome,
} from "@/lib/utils/chart-data";
import {
  scoreAdherence,
  computeTopImprovements,
} from "@/lib/adherence-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeReviewData {
  adherence: string;
  adherenceNotes?: string | null;
  whyTaken?: string | null;
  setupTrigger?: string | null;
  stopRationale?: string | null;
  targetRationale?: string | null;
  mistakeNotes?: string | null;
  lessonLearned?: string | null;
  emotionBefore?: string | null;
  emotionAfter?: string | null;
}

export type TradeWithRelations = Trade & {
  screenshots: {
    id: string;
    tradeId: string;
    url: string;
    screenshotType: string;
    label: string | null;
    notes: string | null;
    sortOrder: number;
    createdAt: Date;
  }[];
  tradeTags: {
    tradeId: string;
    tagId: string;
    tag: {
      id: string;
      userId: string;
      name: string;
      color: string | null;
      createdAt: Date;
    };
  }[];
};

// ---------------------------------------------------------------------------
// createTrade
// ---------------------------------------------------------------------------

export async function createTrade(
  userId: string,
  data: TradeFormData,
): Promise<Trade> {
  if (!userId) throw new Error("User ID is required");

  const parsed = TradeSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid trade data");
  }

  const {
    tagIds,
    strategyId,
    importBatchId,
    entryAt,
    exitAt,
    ...rest
  } = parsed.data;

  const trade = await db.trade.create({
    data: {
      ...rest,
      userId,
      strategyId: strategyId ?? null,
      importBatchId: importBatchId ?? null,
      entryAt: new Date(entryAt),
      exitAt: exitAt ? new Date(exitAt) : null,
      ...(tagIds && tagIds.length > 0
        ? {
            tradeTags: {
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }
        : {}),
    },
  });

  return trade;
}

// ---------------------------------------------------------------------------
// updateTrade
// ---------------------------------------------------------------------------

export async function updateTrade(
  tradeId: string,
  userId: string,
  data: Partial<TradeFormData>,
): Promise<Trade> {
  if (!tradeId) throw new Error("Trade ID is required");
  if (!userId) throw new Error("User ID is required");

  // Verify ownership
  const existing = await db.trade.findFirst({
    where: { id: tradeId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Trade not found or access denied");
  }

  const { tagIds, entryAt, exitAt, strategyId, importBatchId, ...rest } = data;

  const updateData: Record<string, unknown> = { ...rest };

  if (entryAt !== undefined) {
    updateData.entryAt = new Date(entryAt);
  }
  if (exitAt !== undefined) {
    updateData.exitAt = exitAt ? new Date(exitAt) : null;
  }
  if (strategyId !== undefined) {
    updateData.strategyId = strategyId ?? null;
  }
  if (importBatchId !== undefined) {
    updateData.importBatchId = importBatchId ?? null;
  }

  const trade = await db.trade.update({
    where: { id: tradeId },
    data: updateData as Parameters<typeof db.trade.update>[0]["data"],
  });

  // Update tags if provided
  if (tagIds !== undefined) {
    await db.tradeTag.deleteMany({ where: { tradeId } });
    if (tagIds.length > 0) {
      await db.tradeTag.createMany({
        data: tagIds.map((tagId) => ({ tradeId, tagId })),
        skipDuplicates: true,
      });
    }
  }

  return trade;
}

// ---------------------------------------------------------------------------
// deleteTrade
// ---------------------------------------------------------------------------

export async function deleteTrade(
  tradeId: string,
  userId: string,
): Promise<void> {
  if (!tradeId) throw new Error("Trade ID is required");
  if (!userId) throw new Error("User ID is required");

  const existing = await db.trade.findFirst({
    where: { id: tradeId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Trade not found or access denied");
  }

  await db.trade.delete({ where: { id: tradeId } });
}

// ---------------------------------------------------------------------------
// getTrades
// ---------------------------------------------------------------------------

export async function getTrades(
  userId: string,
  filters?: TradeFilters,
): Promise<Trade[]> {
  if (!userId) throw new Error("User ID is required");

  const {
    symbol,
    market,
    side,
    setupType,
    adherence,
    dateFrom,
    dateTo,
    strategyId,
    search,
    page = 1,
    pageSize = 50,
    sortBy,
    sortDir = "desc",
  } = filters ?? {};

  const where: Record<string, unknown> = { userId };

  if (symbol) where.symbol = symbol.toUpperCase();
  if (market) where.market = market;
  if (side) where.side = side;
  if (setupType) where.setupType = setupType;
  if (adherence) where.adherence = adherence;
  if (strategyId) where.strategyId = strategyId;

  if (dateFrom || dateTo) {
    where.entryAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  if (search) {
    where.OR = [
      { symbol: { contains: search.toUpperCase(), mode: "insensitive" } },
      { setupType: { contains: search, mode: "insensitive" } },
      { whyTaken: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * pageSize;

  const trades = await db.trade.findMany({
    where: where as Prisma.TradeWhereInput,
    orderBy: sortBy
      ? { [sortBy]: sortDir }
      : { entryAt: "desc" },
    skip,
    take: pageSize,
  });

  return trades;
}

// ---------------------------------------------------------------------------
// getTrade
// ---------------------------------------------------------------------------

export async function getTrade(
  tradeId: string,
  userId: string,
): Promise<TradeWithRelations | null> {
  if (!tradeId) throw new Error("Trade ID is required");
  if (!userId) throw new Error("User ID is required");

  return db.trade.findFirst({
    where: { id: tradeId, userId },
    include: {
      screenshots: true,
      tradeTags: {
        include: { tag: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// reviewTrade
// ---------------------------------------------------------------------------

export async function reviewTrade(
  tradeId: string,
  userId: string,
  reviewData: TradeReviewData,
): Promise<Trade> {
  if (!tradeId) throw new Error("Trade ID is required");
  if (!userId) throw new Error("User ID is required");

  // Verify ownership
  const existing = await db.trade.findFirst({
    where: { id: tradeId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Trade not found or access denied");
  }

  return db.trade.update({
    where: { id: tradeId },
    data: {
      adherence: reviewData.adherence as Trade["adherence"],
      adherenceNotes: reviewData.adherenceNotes ?? null,
      whyTaken: reviewData.whyTaken ?? null,
      setupTrigger: reviewData.setupTrigger ?? null,
      stopRationale: reviewData.stopRationale ?? null,
      targetRationale: reviewData.targetRationale ?? null,
      mistakeNotes: reviewData.mistakeNotes ?? null,
      lessonLearned: reviewData.lessonLearned ?? null,
      emotionBefore: reviewData.emotionBefore
        ? (reviewData.emotionBefore as Trade["emotionBefore"])
        : null,
      emotionAfter: reviewData.emotionAfter
        ? (reviewData.emotionAfter as Trade["emotionAfter"])
        : null,
      wasReviewed: true,
    },
  });
}

// ---------------------------------------------------------------------------
// bulkDeleteTrades
// ---------------------------------------------------------------------------

export async function bulkDeleteTrades(
  tradeIds: string[],
  userId: string,
): Promise<void> {
  if (!tradeIds || tradeIds.length === 0) return;
  if (!userId) throw new Error("User ID is required");

  // Delete only trades owned by this user
  await db.trade.deleteMany({
    where: {
      id: { in: tradeIds },
      userId,
    },
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Maps a Prisma Trade record to the lightweight TradeRow projection. */
function toTradeRow(t: Trade): TradeRow {
  return {
    id: t.id,
    userId: t.userId,
    strategyId: t.strategyId,
    importBatchId: t.importBatchId,
    symbol: t.symbol,
    market: t.market as Market,
    side: t.side as TradeSide,
    entryAt: t.entryAt,
    exitAt: t.exitAt ?? null,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice ?? null,
    stopPrice: t.stopPrice ?? null,
    targetPrice: t.targetPrice ?? null,
    size: t.size,
    fees: t.fees ?? null,
    pnlAmount: t.pnlAmount ?? null,
    pnlR: t.pnlR ?? null,
    session: t.session ?? null,
    setupType: t.setupType ?? null,
    isOpen: t.isOpen,
    adherence: t.adherence as AdherenceStatus,
    adherenceNotes: t.adherenceNotes ?? null,
    wasReviewed: t.wasReviewed,
    whyTaken: t.whyTaken ?? null,
    setupTrigger: t.setupTrigger ?? null,
    stopRationale: t.stopRationale ?? null,
    targetRationale: t.targetRationale ?? null,
    mistakeNotes: t.mistakeNotes ?? null,
    lessonLearned: t.lessonLearned ?? null,
    emotionBefore: (t.emotionBefore as EmotionTag | null) ?? null,
    emotionAfter: (t.emotionAfter as EmotionTag | null) ?? null,
    riskViolations: t.riskViolations,
    aiAdherence: (t.aiAdherence as AdherenceStatus | null) ?? null,
    aiConfidence: t.aiConfidence ?? null,
    aiReasoning: t.aiReasoning ?? null,
    aiSetupClassification: t.aiSetupClassification ?? null,
    aiAnalyzedAt: t.aiAnalyzedAt ?? null,
    whatDidYouSee: t.whatDidYouSee ?? null,
    wasPlanned: t.wasPlanned ?? null,
    wouldTakeAgain: t.wouldTakeAgain ?? null,
    aiMatchedRules: t.aiMatchedRules,
    aiBrokenRules: t.aiBrokenRules,
    aiCoachingNote: t.aiCoachingNote ?? null,
    setupClusterId: t.setupClusterId ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/** Maps a Prisma Strategy record to the lightweight StrategyRow projection. */
function toStrategyRow(s: {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  isActive: boolean;
  isArchived: boolean;
  markets: string[];
  preferredSymbols: string[];
  timeframes: string[];
  tradingSessions: string[];
  allowedHoursStart: string | null;
  allowedHoursEnd: string | null;
  forbiddenHours: unknown;
  setupTypes: string[];
  entryConditions: string | null;
  invalidationConditions: string | null;
  stopLogic: string | null;
  targetLogic: string | null;
  noTradeConditions: string | null;
  minimumRR: number | null;
  maxTradesPerDay: number | null;
  maxDailyLoss: number | null;
  maxDailyLossPct: number | null;
  riskRules: unknown;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): StrategyRow {
  return {
    id: s.id,
    userId: s.userId,
    title: s.title,
    description: s.description,
    isActive: s.isActive,
    isArchived: s.isArchived,
    markets: s.markets as Market[],
    preferredSymbols: s.preferredSymbols,
    timeframes: s.timeframes,
    tradingSessions: s.tradingSessions,
    allowedHoursStart: s.allowedHoursStart,
    allowedHoursEnd: s.allowedHoursEnd,
    forbiddenHours: s.forbiddenHours,
    setupTypes: s.setupTypes,
    entryConditions: s.entryConditions,
    invalidationConditions: s.invalidationConditions,
    stopLogic: s.stopLogic,
    targetLogic: s.targetLogic,
    noTradeConditions: s.noTradeConditions,
    minimumRR: s.minimumRR,
    maxTradesPerDay: s.maxTradesPerDay,
    maxDailyLoss: s.maxDailyLoss,
    maxDailyLossPct: s.maxDailyLossPct,
    riskRules: s.riskRules as StrategyRow["riskRules"],
    notes: s.notes,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// getAdherenceTimeSeries
// ---------------------------------------------------------------------------

/**
 * Loads all trades for the user and returns a time-series of daily adherence
 * scores suitable for charting. Optionally restricted to the last `days` days.
 */
export async function getAdherenceTimeSeries(
  userId: string,
  days?: number,
): Promise<AdherenceOverTimePoint[]> {
  if (!userId) throw new Error("User ID is required");

  const where: Record<string, unknown> = { userId };

  if (days !== undefined && days > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    where.entryAt = { gte: cutoff };
  }

  const trades = await db.trade.findMany({
    where: where as Prisma.TradeWhereInput,
    orderBy: { entryAt: "asc" },
  });

  return computeAdherenceOverTime(trades.map(toTradeRow), days);
}

// ---------------------------------------------------------------------------
// getDashboardChartData
// ---------------------------------------------------------------------------

/**
 * Loads the user's active strategy and all trades, then computes all five
 * dashboard chart datasets plus the top improvement areas.
 */
export async function getDashboardChartData(userId: string): Promise<{
  adherenceOverTime: AdherenceOverTimePoint[];
  pnlBySetup: PnlBySetupPoint[];
  avgRByHour: AvgRByHourPoint[];
  offPlanByDay: OffPlanByDayPoint[];
  emotionOutcome: EmotionOutcomePoint[];
  topImprovements: TopImprovement[];
}> {
  if (!userId) throw new Error("User ID is required");

  const [prismaTrades, prismaStrategy] = await Promise.all([
    db.trade.findMany({
      where: { userId },
      orderBy: { entryAt: "asc" },
    }),
    db.strategy.findFirst({
      where: { userId, isActive: true, isArchived: false },
    }),
  ]);

  const trades = prismaTrades.map(toTradeRow);

  const [
    adherenceOverTime,
    pnlBySetup,
    avgRByHour,
    offPlanByDay,
    emotionOutcome,
  ] = [
    computeAdherenceOverTime(trades),
    computePnlBySetup(trades),
    computeAvgRByHour(trades),
    computeOffPlanByDay(trades),
    computeEmotionOutcome(trades),
  ];

  const topImprovements =
    prismaStrategy !== null
      ? computeTopImprovements(trades, toStrategyRow(prismaStrategy))
      : [];

  return {
    adherenceOverTime,
    pnlBySetup,
    avgRByHour,
    offPlanByDay,
    emotionOutcome,
    topImprovements,
  };
}

// ---------------------------------------------------------------------------
// analyzeTradeWithEngine
// ---------------------------------------------------------------------------

/**
 * Loads a single trade and the user's active strategy, runs the full
 * adherence engine, persists the AI analysis fields back to the database,
 * and returns the result.
 */
export async function analyzeTradeWithEngine(
  tradeId: string,
  userId: string,
): Promise<AdherenceEngineResult> {
  if (!tradeId) throw new Error("Trade ID is required");
  if (!userId) throw new Error("User ID is required");

  const [prismaTrade, prismaStrategy] = await Promise.all([
    db.trade.findFirst({
      where: { id: tradeId, userId },
    }),
    db.strategy.findFirst({
      where: { userId, isActive: true, isArchived: false },
    }),
  ]);

  if (!prismaTrade) {
    throw new Error("Trade not found or access denied");
  }

  if (!prismaStrategy) {
    throw new Error("No active strategy found for this user");
  }

  const trade = toTradeRow(prismaTrade);
  const strategy = toStrategyRow(prismaStrategy);

  const result = scoreAdherence(trade, strategy);

  // Persist AI analysis fields back to the trade record
  await db.trade.update({
    where: { id: tradeId },
    data: {
      aiAdherence: result.status as Trade["aiAdherence"],
      aiConfidence: result.confidence,
      aiReasoning: result.reasons.join("\n"),
      aiMatchedRules: result.matchedRules,
      aiBrokenRules: result.brokenRules,
      aiCoachingNote: result.coachingNote,
      riskViolations: result.violations,
      aiAnalyzedAt: new Date(),
    },
  });

  return result;
}

// ---------------------------------------------------------------------------
// addTradeScreenshot
// ---------------------------------------------------------------------------

export async function addTradeScreenshot(
  tradeId: string,
  userId: string,
  data: {
    url: string;
    screenshotType: string;
    label?: string;
    notes?: string;
    sortOrder?: number;
  },
): Promise<{
  id: string;
  tradeId: string;
  url: string;
  screenshotType: string;
  label: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: Date;
}> {
  if (!tradeId) throw new Error("Trade ID is required");
  if (!userId) throw new Error("User ID is required");

  // Verify ownership
  const existing = await db.trade.findFirst({
    where: { id: tradeId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Trade not found or access denied");
  }

  return db.tradeScreenshot.create({
    data: {
      tradeId,
      url: data.url,
      screenshotType: data.screenshotType as import("@prisma/client").ScreenshotType,
      label: data.label ?? null,
      notes: data.notes ?? null,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

// ---------------------------------------------------------------------------
// deleteTradeScreenshot
// ---------------------------------------------------------------------------

export async function deleteTradeScreenshot(
  screenshotId: string,
  userId: string,
): Promise<void> {
  if (!screenshotId) throw new Error("Screenshot ID is required");
  if (!userId) throw new Error("User ID is required");

  // Verify ownership via the parent trade
  const screenshot = await db.tradeScreenshot.findFirst({
    where: { id: screenshotId },
    include: { trade: { select: { userId: true } } },
  });

  if (!screenshot || screenshot.trade.userId !== userId) {
    throw new Error("Screenshot not found or access denied");
  }

  await db.tradeScreenshot.delete({ where: { id: screenshotId } });
}

// ---------------------------------------------------------------------------
// updateTradeScreenshotLabel
// ---------------------------------------------------------------------------

export async function updateTradeScreenshotLabel(
  screenshotId: string,
  userId: string,
  label: string,
  notes?: string,
): Promise<void> {
  if (!screenshotId) throw new Error("Screenshot ID is required");
  if (!userId) throw new Error("User ID is required");

  // Verify ownership via the parent trade
  const screenshot = await db.tradeScreenshot.findFirst({
    where: { id: screenshotId },
    include: { trade: { select: { userId: true } } },
  });

  if (!screenshot || screenshot.trade.userId !== userId) {
    throw new Error("Screenshot not found or access denied");
  }

  await db.tradeScreenshot.update({
    where: { id: screenshotId },
    data: {
      label,
      ...(notes !== undefined ? { notes } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// saveTradeQuestionnaire
// ---------------------------------------------------------------------------

export async function saveTradeQuestionnaire(
  tradeId: string,
  userId: string,
  data: {
    whatDidYouSee?: string;
    setupTrigger?: string;
    stopRationale?: string;
    targetRationale?: string;
    wasPlanned?: boolean;
    emotionBefore?: string;
    emotionAfter?: string;
    wouldTakeAgain?: boolean;
    whyTaken?: string;
    mistakeNotes?: string;
    lessonLearned?: string;
    adherence?: string;
    adherenceNotes?: string;
  },
): Promise<void> {
  if (!tradeId) throw new Error("Trade ID is required");
  if (!userId) throw new Error("User ID is required");

  // Verify ownership
  const existing = await db.trade.findFirst({
    where: { id: tradeId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Trade not found or access denied");
  }

  const updateData: Record<string, unknown> = { wasReviewed: true };

  if (data.whatDidYouSee !== undefined) updateData.whatDidYouSee = data.whatDidYouSee || null;
  if (data.setupTrigger !== undefined) updateData.setupTrigger = data.setupTrigger || null;
  if (data.stopRationale !== undefined) updateData.stopRationale = data.stopRationale || null;
  if (data.targetRationale !== undefined) updateData.targetRationale = data.targetRationale || null;
  if (data.wasPlanned !== undefined) updateData.wasPlanned = data.wasPlanned;
  if (data.emotionBefore !== undefined) {
    updateData.emotionBefore = data.emotionBefore
      ? (data.emotionBefore as Trade["emotionBefore"])
      : null;
  }
  if (data.emotionAfter !== undefined) {
    updateData.emotionAfter = data.emotionAfter
      ? (data.emotionAfter as Trade["emotionAfter"])
      : null;
  }
  if (data.wouldTakeAgain !== undefined) updateData.wouldTakeAgain = data.wouldTakeAgain;
  if (data.whyTaken !== undefined) updateData.whyTaken = data.whyTaken || null;
  if (data.mistakeNotes !== undefined) updateData.mistakeNotes = data.mistakeNotes || null;
  if (data.lessonLearned !== undefined) updateData.lessonLearned = data.lessonLearned || null;
  if (data.adherence !== undefined && data.adherence) {
    updateData.adherence = data.adherence as Trade["adherence"];
  }
  if (data.adherenceNotes !== undefined) updateData.adherenceNotes = data.adherenceNotes || null;

  await db.trade.update({
    where: { id: tradeId },
    data: updateData as Parameters<typeof db.trade.update>[0]["data"],
  });
}
