"use server";

// ---------------------------------------------------------------------------
// Insight Server Actions
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import { InsightSnapshot } from "@prisma/client";
import { ai } from "@/lib/ai";
import { InsightType } from "@/types";

// ---------------------------------------------------------------------------
// getInsights
// ---------------------------------------------------------------------------

export async function getInsights(
  userId: string,
  type?: InsightType,
): Promise<InsightSnapshot[]> {
  if (!userId) throw new Error("User ID is required");

  return db.insightSnapshot.findMany({
    where: {
      userId,
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// markInsightRead
// ---------------------------------------------------------------------------

export async function markInsightRead(
  insightId: string,
  userId: string,
): Promise<void> {
  if (!insightId) throw new Error("Insight ID is required");
  if (!userId) throw new Error("User ID is required");

  // Verify ownership
  const existing = await db.insightSnapshot.findFirst({
    where: { id: insightId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Insight not found or access denied");
  }

  await db.insightSnapshot.update({
    where: { id: insightId },
    data: { isRead: true },
  });
}

// ---------------------------------------------------------------------------
// generateInsightsSnapshot
// ---------------------------------------------------------------------------

export async function generateInsightsSnapshot(
  userId: string,
): Promise<InsightSnapshot[]> {
  if (!userId) throw new Error("User ID is required");

  // Load recent trades (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const trades = await db.trade.findMany({
    where: {
      userId,
      entryAt: { gte: ninetyDaysAgo },
    },
    orderBy: { entryAt: "desc" },
  });

  // Load active strategy
  const activeStrategy = await db.strategy.findFirst({
    where: { userId, isActive: true },
  });

  const period = "last 90 days";

  // Call AI provider to generate insights
  const aiOutput = await ai.generateInsights({
    trades,
    strategy: activeStrategy ?? {},
    period,
  });

  if (!aiOutput.insights || aiOutput.insights.length === 0) {
    return [];
  }

  // Save insights to InsightSnapshot table
  const savedInsights = await Promise.all(
    aiOutput.insights.map((item) =>
      db.insightSnapshot.create({
        data: {
          userId,
          type: item.type as InsightSnapshot["type"],
          period,
          title: item.title,
          body: item.body,
          metadata: item.metadata ?? undefined,
          isRead: false,
        },
      }),
    ),
  );

  return savedInsights;
}
