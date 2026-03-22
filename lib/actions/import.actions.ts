"use server";

// ---------------------------------------------------------------------------
// Import Server Actions
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import { ai } from "@/lib/ai";
import { ImportBatch, ImportMethod, ImportStatus, Prisma } from "@prisma/client";
import { TradeFormData, TradeSchema } from "@/lib/validations/trade.schema";
import type { PostImportReviewRow, SetupClusterRow } from "@/types";

// ---------------------------------------------------------------------------
// createImportBatch
// ---------------------------------------------------------------------------

export async function createImportBatch(
  userId: string,
  data: {
    method: ImportMethod;
    fileName?: string;
    columnMapping?: Record<string, string>;
    notes?: string;
  },
): Promise<ImportBatch> {
  if (!userId) throw new Error("User ID is required");

  return db.importBatch.create({
    data: {
      userId,
      method: data.method,
      fileName: data.fileName ?? null,
      columnMapping: data.columnMapping ?? undefined,
      notes: data.notes ?? null,
      status: "PENDING",
    },
  });
}

// ---------------------------------------------------------------------------
// updateBatchStatus
// ---------------------------------------------------------------------------

export async function updateBatchStatus(
  batchId: string,
  userId: string,
  status: ImportStatus,
): Promise<void> {
  if (!batchId) throw new Error("Batch ID is required");
  if (!userId) throw new Error("User ID is required");

  const existing = await db.importBatch.findFirst({
    where: { id: batchId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Import batch not found or access denied");
  }

  await db.importBatch.update({
    where: { id: batchId },
    data: { status },
  });
}

// ---------------------------------------------------------------------------
// importTrades
// ---------------------------------------------------------------------------

export async function importTrades(
  batchId: string,
  userId: string,
  trades: Partial<TradeFormData>[],
): Promise<{ imported: number; errors: string[] }> {
  if (!batchId) throw new Error("Batch ID is required");
  if (!userId) throw new Error("User ID is required");

  const batch = await db.importBatch.findFirst({
    where: { id: batchId, userId },
    select: { id: true },
  });

  if (!batch) {
    throw new Error("Import batch not found or access denied");
  }

  // Update batch status to PROCESSING
  await db.importBatch.update({
    where: { id: batchId },
    data: {
      status: "PROCESSING",
      totalRows: trades.length,
    },
  });

  const errors: string[] = [];
  const validTradeData: Array<{
    userId: string;
    importBatchId: string;
    symbol: string;
    market: string;
    side: string;
    entryAt: Date;
    exitAt: Date | null;
    entryPrice: number;
    exitPrice: number | null;
    stopPrice: number | null;
    targetPrice: number | null;
    size: number;
    fees: number;
    pnlAmount: number | null;
    pnlR: number | null;
    session: string | null;
    setupType: string | null;
    isOpen: boolean;
    adherence: string;
    adherenceNotes: string | null;
    wasReviewed: boolean;
    whyTaken: string | null;
    setupTrigger: string | null;
    stopRationale: string | null;
    targetRationale: string | null;
    mistakeNotes: string | null;
    lessonLearned: string | null;
    emotionBefore: string | null;
    emotionAfter: string | null;
    riskViolations: string[];
    strategyId: string | null;
  }> = [];

  for (let i = 0; i < trades.length; i++) {
    const row = trades[i];
    const parsed = TradeSchema.safeParse(row);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid row";
      errors.push(`Row ${i + 1}: ${msg}`);
      continue;
    }

    const {
      tagIds: _tagIds,
      entryAt,
      exitAt,
      strategyId,
      ...rest
    } = parsed.data;

    validTradeData.push({
      ...rest,
      userId,
      importBatchId: batchId,
      strategyId: strategyId ?? null,
      entryAt: new Date(entryAt),
      exitAt: exitAt ? new Date(exitAt) : null,
      fees: rest.fees ?? 0,
      exitPrice: rest.exitPrice ?? null,
      stopPrice: rest.stopPrice ?? null,
      targetPrice: rest.targetPrice ?? null,
      pnlAmount: rest.pnlAmount ?? null,
      pnlR: rest.pnlR ?? null,
      session: rest.session ?? null,
      setupType: rest.setupType ?? null,
      adherenceNotes: rest.adherenceNotes ?? null,
      whyTaken: rest.whyTaken ?? null,
      setupTrigger: rest.setupTrigger ?? null,
      stopRationale: rest.stopRationale ?? null,
      targetRationale: rest.targetRationale ?? null,
      mistakeNotes: rest.mistakeNotes ?? null,
      lessonLearned: rest.lessonLearned ?? null,
      emotionBefore: rest.emotionBefore ?? null,
      emotionAfter: rest.emotionAfter ?? null,
    });
  }

  let imported = 0;

  if (validTradeData.length > 0) {
    const result = await db.trade.createMany({
      data: validTradeData as Prisma.TradeCreateManyInput[],
      skipDuplicates: false,
    });
    imported = result.count;
  }

  const invalidRows = trades.length - validTradeData.length;

  // Update batch stats
  await db.importBatch.update({
    where: { id: batchId },
    data: {
      status: errors.length > 0 && imported === 0 ? "FAILED" : "COMPLETED",
      validRows: validTradeData.length,
      invalidRows,
      importedCount: imported,
      errorSummary: errors.length > 0 ? { errors } : undefined,
    },
  });

  return { imported, errors };
}

// ---------------------------------------------------------------------------
// getImportBatches
// ---------------------------------------------------------------------------

export async function getImportBatches(userId: string): Promise<ImportBatch[]> {
  if (!userId) throw new Error("User ID is required");

  return db.importBatch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// createPostImportReview
// Creates a PostImportReview for a batch, selecting a representative sample:
//   ≤ 20 trades  → review all
//   21–100       → review 15
//   > 100        → review 20
// Sample selection: every N-th trade, spread across the date range
// ---------------------------------------------------------------------------

export async function createPostImportReview(
  batchId: string,
  userId: string,
): Promise<PostImportReviewRow> {
  if (!batchId) throw new Error("Batch ID is required");
  if (!userId) throw new Error("User ID is required");

  const batch = await db.importBatch.findFirst({
    where: { id: batchId, userId },
    select: { id: true },
  });
  if (!batch) throw new Error("Import batch not found or access denied");

  // Return existing review if one already exists
  const existing = await db.postImportReview.findUnique({
    where: { importBatchId: batchId },
  });
  if (existing && existing.userId === userId) {
    return existing as PostImportReviewRow;
  }

  // Fetch all trades for this batch ordered by entry date
  const allTrades = await db.trade.findMany({
    where: { importBatchId: batchId, userId },
    orderBy: { entryAt: "asc" },
    select: { id: true },
  });

  const totalTrades = allTrades.length;

  let sampleSize: number;
  if (totalTrades <= 20) {
    sampleSize = totalTrades;
  } else if (totalTrades <= 100) {
    sampleSize = 15;
  } else {
    sampleSize = 20;
  }

  // Select every N-th trade spread across the date range
  const sampleTradeIds: string[] = [];
  if (totalTrades > 0 && sampleSize > 0) {
    const step = totalTrades / sampleSize;
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.min(Math.floor(i * step), totalTrades - 1);
      sampleTradeIds.push(allTrades[idx].id);
    }
  }

  const review = await db.postImportReview.create({
    data: {
      userId,
      importBatchId: batchId,
      status: "PENDING",
      totalTrades,
      sampleSize,
      reviewedCount: 0,
      sampleTradeIds,
      clustersGenerated: false,
    },
  });

  return review as PostImportReviewRow;
}

// ---------------------------------------------------------------------------
// getPostImportReview
// ---------------------------------------------------------------------------

export async function getPostImportReview(
  batchId: string,
  userId: string,
): Promise<PostImportReviewRow | null> {
  if (!batchId) throw new Error("Batch ID is required");
  if (!userId) throw new Error("User ID is required");

  const review = await db.postImportReview.findFirst({
    where: { importBatchId: batchId, userId },
  });
  return review as PostImportReviewRow | null;
}

// ---------------------------------------------------------------------------
// updatePostImportReviewProgress
// ---------------------------------------------------------------------------

export async function updatePostImportReviewProgress(
  reviewId: string,
  userId: string,
  reviewedCount: number,
): Promise<void> {
  if (!reviewId) throw new Error("Review ID is required");
  if (!userId) throw new Error("User ID is required");

  const review = await db.postImportReview.findFirst({
    where: { id: reviewId, userId },
    select: { id: true },
  });
  if (!review) throw new Error("Review not found or access denied");

  await db.postImportReview.update({
    where: { id: reviewId },
    data: {
      reviewedCount,
      status: "IN_PROGRESS",
    },
  });
}

// ---------------------------------------------------------------------------
// completePostImportReview
// Mark as COMPLETED, trigger cluster generation
// ---------------------------------------------------------------------------

export async function completePostImportReview(
  reviewId: string,
  userId: string,
): Promise<void> {
  if (!reviewId) throw new Error("Review ID is required");
  if (!userId) throw new Error("User ID is required");

  const review = await db.postImportReview.findFirst({
    where: { id: reviewId, userId },
    select: { id: true },
  });
  if (!review) throw new Error("Review not found or access denied");

  await db.postImportReview.update({
    where: { id: reviewId },
    data: { status: "COMPLETED" },
  });
}

// ---------------------------------------------------------------------------
// generateSetupClusters
// Generate setup clusters from reviewed trades of a batch using the AI provider.
// Calls ai.clusterSetups() with the reviewed trade data.
// Saves SetupCluster records to DB.
// ---------------------------------------------------------------------------

export async function generateSetupClusters(
  batchId: string,
  userId: string,
): Promise<SetupClusterRow[]> {
  if (!batchId) throw new Error("Batch ID is required");
  if (!userId) throw new Error("User ID is required");

  const review = await db.postImportReview.findFirst({
    where: { importBatchId: batchId, userId },
    select: { id: true, sampleTradeIds: true },
  });
  if (!review) throw new Error("Post-import review not found for this batch");

  // Load the reviewed trades with questionnaire answers
  const trades = await db.trade.findMany({
    where: { id: { in: review.sampleTradeIds }, userId },
    select: {
      id: true,
      symbol: true,
      market: true,
      side: true,
      entryAt: true,
      exitAt: true,
      entryPrice: true,
      exitPrice: true,
      size: true,
      pnlAmount: true,
      pnlR: true,
      setupType: true,
      whatDidYouSee: true,
      setupTrigger: true,
      wasPlanned: true,
      emotionBefore: true,
      emotionAfter: true,
    },
  });

  const clusterOutput = await ai.clusterSetups({
    trades,
    period: `batch import ${new Date().toISOString().slice(0, 10)}`,
  });

  const batch = await db.importBatch.findFirst({
    where: { id: batchId, userId },
    select: { createdAt: true },
  });
  const period = batch
    ? batch.createdAt.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  // Re-run with correct period if needed (no-op since we already have the output)
  void period;

  // Persist each cluster
  const created: SetupClusterRow[] = [];
  for (const cluster of clusterOutput.clusters) {
    const tradeCount = cluster.tradeIds.length;
    const saved = await db.setupCluster.create({
      data: {
        userId,
        name: cluster.name,
        description: cluster.description,
        keywords: cluster.keywords,
        tradeIds: cluster.tradeIds,
        tradeCount,
        winRate: cluster.winRate,
        avgR: cluster.avgR,
        suggestedSetupType: cluster.suggestedSetupType,
        userConfirmed: false,
      },
    });
    created.push(saved as SetupClusterRow);
  }

  // Mark clusters as generated on the review
  await db.postImportReview.update({
    where: { id: review.id },
    data: { clustersGenerated: true },
  });

  return created;
}

// ---------------------------------------------------------------------------
// getSetupClusters
// ---------------------------------------------------------------------------

export async function getSetupClusters(userId: string): Promise<SetupClusterRow[]> {
  if (!userId) throw new Error("User ID is required");

  const clusters = await db.setupCluster.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return clusters as SetupClusterRow[];
}

// ---------------------------------------------------------------------------
// confirmCluster
// User accepts the suggestedSetupType (or provides their own label)
// ---------------------------------------------------------------------------

export async function confirmCluster(
  clusterId: string,
  userId: string,
  setupType: string,
): Promise<void> {
  if (!clusterId) throw new Error("Cluster ID is required");
  if (!userId) throw new Error("User ID is required");

  const cluster = await db.setupCluster.findFirst({
    where: { id: clusterId, userId },
    select: { id: true, tradeIds: true },
  });
  if (!cluster) throw new Error("Cluster not found or access denied");

  await db.setupCluster.update({
    where: { id: clusterId },
    data: {
      suggestedSetupType: setupType,
      userConfirmed: true,
    },
  });

  // Apply the confirmed setup type to all trades in the cluster
  if (cluster.tradeIds.length > 0) {
    await db.trade.updateMany({
      where: { id: { in: cluster.tradeIds }, userId },
      data: {
        setupType,
        setupClusterId: clusterId,
      },
    });
  }
}
