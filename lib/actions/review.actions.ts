"use server";

// ---------------------------------------------------------------------------
// Daily Review Server Actions
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import { DailyReview } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyReviewFormData {
  topMistakes?: string[];
  emotionalState?: string | null;
  marketContext?: string | null;
  userNotes?: string | null;
  tomorrowPlan?: string | null;
  isCompleted?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Date representing midnight (UTC) for the given date, allowing
 * consistent lookups against the @db.Date Prisma column.
 */
function toDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Computes trade stats for a specific day from the trades table.
 */
async function computeDayStats(userId: string, date: Date) {
  const dayStart = toDateOnly(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const trades = await db.trade.findMany({
    where: {
      userId,
      entryAt: { gte: dayStart, lt: dayEnd },
    },
    select: {
      pnlAmount: true,
      pnlR: true,
      adherence: true,
    },
  });

  let adherentCount = 0;
  let violationCount = 0;
  let winCount = 0;
  let lossCount = 0;
  let breakEvenCount = 0;
  let totalPnl = 0;
  let totalR = 0;

  for (const t of trades) {
    if (t.adherence === "YES") adherentCount++;
    if (t.adherence === "NO") violationCount++;

    if (t.pnlAmount != null) {
      totalPnl += t.pnlAmount;
      if (t.pnlAmount > 0) winCount++;
      else if (t.pnlAmount < 0) lossCount++;
      else breakEvenCount++;
    }

    if (t.pnlR != null) {
      totalR += t.pnlR;
    }
  }

  return {
    tradeCount: trades.length,
    adherentCount,
    violationCount,
    winCount,
    lossCount,
    breakEvenCount,
    pnlAmount: trades.length > 0 ? totalPnl : null,
    pnlR: trades.length > 0 ? totalR : null,
  };
}

// ---------------------------------------------------------------------------
// getDailyReview
// ---------------------------------------------------------------------------

export async function getDailyReview(
  userId: string,
  date: Date,
): Promise<DailyReview | null> {
  if (!userId) throw new Error("User ID is required");

  return db.dailyReview.findUnique({
    where: {
      userId_date: {
        userId,
        date: toDateOnly(date),
      },
    },
  });
}

// ---------------------------------------------------------------------------
// createOrUpdateDailyReview
// ---------------------------------------------------------------------------

export async function createOrUpdateDailyReview(
  userId: string,
  date: Date,
  data: DailyReviewFormData,
): Promise<DailyReview> {
  if (!userId) throw new Error("User ID is required");

  const dateOnly = toDateOnly(date);

  // Compute trade stats for the day
  const stats = await computeDayStats(userId, date);

  return db.dailyReview.upsert({
    where: {
      userId_date: { userId, date: dateOnly },
    },
    create: {
      userId,
      date: dateOnly,
      ...stats,
      topMistakes: data.topMistakes ?? [],
      emotionalState: data.emotionalState ?? null,
      marketContext: data.marketContext ?? null,
      userNotes: data.userNotes ?? null,
      tomorrowPlan: data.tomorrowPlan ?? null,
      isCompleted: data.isCompleted ?? false,
    },
    update: {
      ...stats,
      ...(data.topMistakes !== undefined && { topMistakes: data.topMistakes }),
      ...(data.emotionalState !== undefined && { emotionalState: data.emotionalState }),
      ...(data.marketContext !== undefined && { marketContext: data.marketContext }),
      ...(data.userNotes !== undefined && { userNotes: data.userNotes }),
      ...(data.tomorrowPlan !== undefined && { tomorrowPlan: data.tomorrowPlan }),
      ...(data.isCompleted !== undefined && { isCompleted: data.isCompleted }),
    },
  });
}

// ---------------------------------------------------------------------------
// getDailyReviews
// ---------------------------------------------------------------------------

export async function getDailyReviews(
  userId: string,
  limit?: number,
): Promise<DailyReview[]> {
  if (!userId) throw new Error("User ID is required");

  return db.dailyReview.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    ...(limit ? { take: limit } : {}),
  });
}
