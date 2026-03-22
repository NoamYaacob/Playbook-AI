/**
 * Playbook AI — Database Seed
 *
 * Creates one demo user with:
 *  - 2 strategies (one active, one archived)
 *  - 60 trades spread over the last 90 days
 *  - Import batch + post-import review
 *  - Daily reviews for the last 7 days
 *  - Insight snapshots
 *  - Tags + trade tag associations
 *  - Setup clusters
 *
 * Run: npm run db:seed
 */

import { PrismaClient, Market, TradeSide, AdherenceStatus, EmotionTag, ImportMethod, ImportStatus, InsightType, ScreenshotType, PostImportReviewStatus, GoalType, AccountType } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function hoursLater(base: Date, h: number): Date {
  return new Date(base.getTime() + h * 3_600_000);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding Playbook AI database…");

  // ── user ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcryptjs.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@playbookai.app" },
    update: {},
    create: {
      email: "demo@playbookai.app",
      name: "Alex Demo",
      passwordHash,
      timezone: "America/New_York",
      primaryMarkets: [Market.FUTURES, Market.STOCKS],
      accountType: AccountType.PERSONAL,
      goals: [GoalType.IMPROVE_DISCIPLINE, GoalType.FIND_BEST_SETUPS, GoalType.REDUCE_REVENGE_TRADING],
      onboardingDone: true,
    },
  });

  console.log(`  ✓ User: ${user.email}`);

  // ── tags ──────────────────────────────────────────────────────────────────
  const tagData = [
    { name: "high-conviction", color: "#10b981" },
    { name: "gap-and-go", color: "#6366f1" },
    { name: "revenge", color: "#ef4444" },
    { name: "textbook", color: "#f59e0b" },
    { name: "runner", color: "#3b82f6" },
  ];

  const tags = await Promise.all(
    tagData.map((t) =>
      prisma.tag.upsert({
        where: { userId_name: { userId: user.id, name: t.name } },
        update: {},
        create: { userId: user.id, ...t },
      })
    )
  );

  console.log(`  ✓ Tags: ${tags.map((t) => t.name).join(", ")}`);

  // ── strategies ────────────────────────────────────────────────────────────
  const activeStrategy = await prisma.strategy.upsert({
    where: { id: "seed-strategy-active" },
    update: {},
    create: {
      id: "seed-strategy-active",
      userId: user.id,
      title: "Opening Range Breakout",
      description: "Trade breakouts of the first 30-min candle on high-volume days. Entry on retest of the ORB level with confirmation.",
      isActive: true,
      isArchived: false,
      markets: [Market.FUTURES, Market.STOCKS],
      preferredSymbols: ["ES", "NQ", "SPY", "QQQ", "AAPL"],
      timeframes: ["1m", "5m", "15m"],
      tradingSessions: ["NY Open", "London-NY Overlap"],
      allowedHoursStart: "09:30",
      allowedHoursEnd: "11:30",
      setupTypes: ["ORB Long", "ORB Short", "ORB Retest"],
      entryConditions:
        "Price breaks the 30-min ORB level with at least 1.5× average volume. Entry on first pullback / retest of the ORB level.",
      invalidationConditions: "Price closes back inside the opening range on a 5-min candle.",
      stopLogic: "Stop below (long) / above (short) the opposite side of the opening range.",
      targetLogic: "Minimum 2R target. Trail stop at breakeven after 1R. Final target at measured-move projection.",
      noTradeConditions: "No trades during FOMC, NFP, or major Fed speeches. No trading after a 3-loss streak.",
      minimumRR: 2.0,
      maxTradesPerDay: 3,
      maxDailyLoss: 500,
      maxDailyLossPct: 2.0,
      riskRules: {
        noRevengeTrades: true,
        minLossesBeforePause: 2,
        noSizeIncreaseAfterLoss: true,
        noTradeWithoutStop: true,
      },
      notes: "Best results in trending markets with news catalysts. Avoid in choppy, low-volatility environments.",
    },
  });

  const archivedStrategy = await prisma.strategy.upsert({
    where: { id: "seed-strategy-archived" },
    update: {},
    create: {
      id: "seed-strategy-archived",
      userId: user.id,
      title: "VWAP Mean Reversion",
      description: "Fade extended moves away from VWAP. Works best in low-volatility consolidation days.",
      isActive: false,
      isArchived: true,
      markets: [Market.FUTURES],
      preferredSymbols: ["ES", "NQ"],
      timeframes: ["1m", "3m"],
      tradingSessions: ["NY Open"],
      setupTypes: ["VWAP Reversion", "VWAP Cross"],
      minimumRR: 1.5,
      maxTradesPerDay: 5,
      riskRules: {
        noRevengeTrades: true,
        noTradeWithoutStop: true,
      },
    },
  });

  console.log(`  ✓ Strategies: "${activeStrategy.title}", "${archivedStrategy.title}"`);

  // ── import batch ──────────────────────────────────────────────────────────
  const importBatch = await prisma.importBatch.upsert({
    where: { id: "seed-import-batch-1" },
    update: {},
    create: {
      id: "seed-import-batch-1",
      userId: user.id,
      method: ImportMethod.CSV,
      status: ImportStatus.COMPLETED,
      fileName: "trades_q1_2026.csv",
      totalRows: 60,
      validRows: 58,
      invalidRows: 2,
      importedCount: 58,
      columnMapping: {
        symbol: "Symbol",
        entryAt: "Entry Date",
        exitAt: "Exit Date",
        entryPrice: "Entry Price",
        exitPrice: "Exit Price",
        side: "Direction",
        pnlAmount: "P&L",
        size: "Qty",
      },
    },
  });

  console.log(`  ✓ Import batch: ${importBatch.fileName}`);

  // ── trades ────────────────────────────────────────────────────────────────
  const symbols = ["ES", "NQ", "SPY", "QQQ", "AAPL", "TSLA", "NVDA"];
  const setupTypes = ["ORB Long", "ORB Short", "ORB Retest", "VWAP Reclaim", "Breakout", "Fade"];
  const adherenceValues: AdherenceStatus[] = [AdherenceStatus.YES, AdherenceStatus.YES, AdherenceStatus.YES, AdherenceStatus.NO, AdherenceStatus.PARTIAL];
  const emotions: EmotionTag[] = [EmotionTag.CONFIDENT, EmotionTag.NEUTRAL, EmotionTag.DISCIPLINED, EmotionTag.ANXIOUS, EmotionTag.FOMO, EmotionTag.PATIENT];

  const tradeIds: string[] = [];

  for (let i = 0; i < 60; i++) {
    const daysBack = Math.floor(i * 1.5); // spread over ~90 days
    const entryAt = daysAgo(daysBack);
    const exitAt = hoursLater(entryAt, rand(0.25, 3, 2));
    const side = i % 3 === 0 ? TradeSide.SHORT : TradeSide.LONG;
    const entryPrice = rand(4000, 4800);
    const stopOffset = rand(5, 20);
    const stopPrice = side === TradeSide.LONG ? entryPrice - stopOffset : entryPrice + stopOffset;
    const rMultiple = rand(-1.5, 3.5);
    const pnlAmount = parseFloat((rMultiple * stopOffset * rand(1, 5, 0)).toFixed(2));
    const exitPrice = side === TradeSide.LONG
      ? entryPrice + (pnlAmount / rand(1, 5, 0))
      : entryPrice - (pnlAmount / rand(1, 5, 0));
    const adherence = pick(adherenceValues);
    const strategyId = i < 50 ? activeStrategy.id : archivedStrategy.id;

    const trade = await prisma.trade.create({
      data: {
        userId: user.id,
        strategyId,
        importBatchId: i < 50 ? importBatch.id : null,
        symbol: pick(symbols),
        market: Market.FUTURES,
        side,
        entryAt,
        exitAt,
        entryPrice,
        exitPrice,
        stopPrice,
        targetPrice: side === TradeSide.LONG ? entryPrice + stopOffset * 2 : entryPrice - stopOffset * 2,
        size: pick([1, 2, 5, 10]),
        fees: rand(1, 8),
        pnlAmount,
        pnlR: rMultiple,
        session: "NY Open",
        setupType: pick(setupTypes),
        isOpen: false,
        adherence,
        wasReviewed: adherence !== AdherenceStatus.UNREVIEWED,
        emotionBefore: pick(emotions),
        emotionAfter: pnlAmount >= 0 ? EmotionTag.CONFIDENT : pick([EmotionTag.ANXIOUS, EmotionTag.NEUTRAL]),
        wasPlanned: adherence === AdherenceStatus.YES,
        wouldTakeAgain: pnlAmount >= 0 && adherence === AdherenceStatus.YES,
        whyTaken: "Price broke the ORB level with strong momentum and high volume confirmation.",
        riskViolations: adherence === AdherenceStatus.NO
          ? [pick(["NO_STOP_LOSS", "OFF_HOURS_ENTRY", "REVENGE_TRADE", "EXCEEDED_MAX_TRADES"])]
          : [],
        aiAdherence: adherence,
        aiConfidence: rand(0.6, 0.98),
        aiReasoning: adherence === AdherenceStatus.YES
          ? "Trade matches all strategy criteria: correct session, valid setup type, stop-loss placed correctly, R:R above minimum threshold."
          : "Trade deviated from strategy: entry outside allowed hours or setup type not in playbook.",
        aiAnalyzedAt: new Date(),
      },
    });

    tradeIds.push(trade.id);
  }

  console.log(`  ✓ Trades: 60 created`);

  // ── trade tags ────────────────────────────────────────────────────────────
  const tagAssignments = [
    { tradeIdx: 0, tagIdx: 0 },
    { tradeIdx: 0, tagIdx: 3 },
    { tradeIdx: 1, tagIdx: 1 },
    { tradeIdx: 5, tagIdx: 2 },
    { tradeIdx: 8, tagIdx: 4 },
    { tradeIdx: 10, tagIdx: 0 },
    { tradeIdx: 15, tagIdx: 3 },
    { tradeIdx: 20, tagIdx: 1 },
  ];

  for (const { tradeIdx, tagIdx } of tagAssignments) {
    if (tradeIds[tradeIdx] && tags[tagIdx]) {
      await prisma.tradeTag.upsert({
        where: { tradeId_tagId: { tradeId: tradeIds[tradeIdx], tagId: tags[tagIdx].id } },
        update: {},
        create: { tradeId: tradeIds[tradeIdx], tagId: tags[tagIdx].id },
      });
    }
  }

  console.log(`  ✓ Trade tags: ${tagAssignments.length} associations`);

  // ── screenshots ───────────────────────────────────────────────────────────
  const screenshotTypes: ScreenshotType[] = [ScreenshotType.BEFORE_ENTRY, ScreenshotType.AFTER_EXIT, ScreenshotType.MARKED_UP_CHART];
  for (let i = 0; i < 3; i++) {
    await prisma.tradeScreenshot.create({
      data: {
        tradeId: tradeIds[i],
        url: `/uploads/demo-screenshot-${i + 1}.png`,
        screenshotType: screenshotTypes[i],
        label: ["Pre-entry chart", "Post-exit review", "Annotated setup"][i],
        sortOrder: i,
      },
    });
  }

  console.log(`  ✓ Screenshots: 3 demo attachments`);

  // ── setup clusters ────────────────────────────────────────────────────────
  const clusters = [
    {
      id: "seed-cluster-orb",
      name: "Opening Range Breakout",
      description: "Trades that break out of the first 30-minute candle with volume confirmation.",
      keywords: ["ORB", "opening range", "breakout", "volume", "momentum"],
      suggestedSetupType: "ORB Long",
      tradeIds: tradeIds.slice(0, 15),
      winRate: 0.67,
      avgR: 1.4,
    },
    {
      id: "seed-cluster-vwap",
      name: "VWAP Reclaim",
      description: "Price loses VWAP then reclaims it on a subsequent candle with strength.",
      keywords: ["VWAP", "reclaim", "institutional", "mean reversion"],
      suggestedSetupType: "VWAP Reclaim",
      tradeIds: tradeIds.slice(15, 28),
      winRate: 0.54,
      avgR: 0.9,
    },
    {
      id: "seed-cluster-failed",
      name: "Failed Breakdown",
      description: "Short-sellers get trapped when a breakdown fails and reverses sharply.",
      keywords: ["failed breakdown", "short squeeze", "reversal", "trap"],
      suggestedSetupType: "Breakout",
      tradeIds: tradeIds.slice(28, 38),
      winRate: 0.7,
      avgR: 1.8,
    },
  ];

  for (const c of clusters) {
    await prisma.setupCluster.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        userId: user.id,
        name: c.name,
        description: c.description,
        keywords: c.keywords,
        tradeIds: c.tradeIds,
        tradeCount: c.tradeIds.length,
        winRate: c.winRate,
        avgR: c.avgR,
        suggestedSetupType: c.suggestedSetupType,
        userConfirmed: true,
      },
    });
  }

  console.log(`  ✓ Setup clusters: ${clusters.length}`);

  // ── post-import review ────────────────────────────────────────────────────
  const sampleIds = tradeIds.slice(0, 20);
  await prisma.postImportReview.upsert({
    where: { importBatchId: importBatch.id },
    update: {},
    create: {
      userId: user.id,
      importBatchId: importBatch.id,
      status: PostImportReviewStatus.COMPLETED,
      totalTrades: 58,
      sampleSize: 20,
      reviewedCount: 20,
      sampleTradeIds: sampleIds,
      clustersGenerated: true,
    },
  });

  console.log(`  ✓ Post-import review: COMPLETED`);

  // ── daily reviews ─────────────────────────────────────────────────────────
  const dailyReviewData = [
    { daysBack: 0, trades: 3, adherent: 3, violations: 0, pnl: 287.5, pnlR: 2.3, wins: 2, losses: 1 },
    { daysBack: 1, trades: 2, adherent: 2, violations: 0, pnl: 145.0, pnlR: 1.8, wins: 2, losses: 0 },
    { daysBack: 2, trades: 4, adherent: 2, violations: 2, pnl: -312.0, pnlR: -1.4, wins: 1, losses: 3 },
    { daysBack: 3, trades: 3, adherent: 3, violations: 0, pnl: 420.0, pnlR: 3.1, wins: 3, losses: 0 },
    { daysBack: 4, trades: 1, adherent: 1, violations: 0, pnl: 95.0, pnlR: 1.2, wins: 1, losses: 0 },
    { daysBack: 7, trades: 2, adherent: 1, violations: 1, pnl: -88.0, pnlR: -0.6, wins: 1, losses: 1 },
    { daysBack: 8, trades: 3, adherent: 3, violations: 0, pnl: 375.0, pnlR: 2.8, wins: 3, losses: 0 },
  ];

  for (const dr of dailyReviewData) {
    const date = new Date();
    date.setDate(date.getDate() - dr.daysBack);
    date.setHours(0, 0, 0, 0);

    await prisma.dailyReview.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: {},
      create: {
        userId: user.id,
        date,
        tradeCount: dr.trades,
        adherentCount: dr.adherent,
        violationCount: dr.violations,
        pnlAmount: dr.pnl,
        pnlR: dr.pnlR,
        winCount: dr.wins,
        lossCount: dr.losses,
        breakEvenCount: dr.trades - dr.wins - dr.losses,
        topMistakes: dr.violations > 0 ? ["Entered outside allowed hours", "Skipped stop-loss"] : [],
        emotionalState: dr.pnl >= 0 ? "CONFIDENT" : "ANXIOUS",
        marketContext: "ES showed strong directional movement with above-average volume in the opening hour.",
        userNotes: dr.pnl >= 0
          ? "Stuck to the playbook. Waited for confirmation before entering."
          : "Revenge traded after first loss. Need to step away after 2 consecutive losses.",
        tomorrowPlan: "Only trade ORB setups. No trades after 11:30. Max 3 trades.",
        aiSummary: dr.pnl >= 0
          ? "Strong execution day. All entries aligned with strategy criteria. Risk management was excellent."
          : "Challenging day with emotional decision-making. The second and third trades showed signs of revenge trading after the initial loss.",
        aiImprovementSuggestions: dr.pnl >= 0
          ? "Consider trailing stops more aggressively on winning trades to capture larger moves."
          : "Implement a mandatory 15-minute break after any losing trade. Review the no-revenge-trading rule before each session.",
        isCompleted: true,
      },
    });
  }

  console.log(`  ✓ Daily reviews: ${dailyReviewData.length}`);

  // ── insight snapshots ─────────────────────────────────────────────────────
  const insights = [
    {
      type: InsightType.ADHERENCE_SUMMARY,
      title: "Your adherence rate improved 12% this week",
      body: "You followed your Opening Range Breakout playbook on 78% of trades this week, up from 66% last week. The biggest improvement was in waiting for proper confirmation before entering.",
      isRead: false,
    },
    {
      type: InsightType.BEHAVIOR_PATTERN,
      title: "FOMO trades underperform by 2.3R on average",
      body: "Trades tagged or identified as FOMO entries have an average R-multiple of -0.8 compared to +1.5 for planned entries. Consider adding a 5-minute pause before any trade taken in the first 5 minutes of a move.",
      isRead: false,
    },
    {
      type: InsightType.SETUP_PERFORMANCE,
      title: "ORB Long is your best-performing setup",
      body: "ORB Long trades have a 72% win rate with an average R-multiple of 1.8 over the last 90 days. This is significantly better than your other setups. Consider allocating more focus to this setup.",
      isRead: true,
    },
    {
      type: InsightType.RISK_VIOLATION,
      title: "3 trades taken without stop-loss this month",
      body: "You had 3 trades without a defined stop-loss this month. These trades resulted in a combined loss of $847. Enforcing the no-trade-without-stop rule is one of the highest-impact improvements you can make.",
      isRead: false,
    },
    {
      type: InsightType.COACHING_INSIGHT,
      title: "Your best trading happens in the first hour",
      body: "Analysis of your 90-day trade history shows that trades entered between 9:30–10:30 AM ET have a 68% win rate versus 41% for trades entered after 11:00 AM. Your playbook's allowed-hours rule of 9:30–11:30 is well-calibrated.",
      isRead: true,
    },
  ];

  for (const insight of insights) {
    await prisma.insightSnapshot.create({
      data: {
        userId: user.id,
        type: insight.type,
        period: "last-90-days",
        title: insight.title,
        body: insight.body,
        isRead: insight.isRead,
        metadata: { generatedBy: "seed" },
      },
    });
  }

  console.log(`  ✓ Insights: ${insights.length}`);

  // ── done ──────────────────────────────────────────────────────────────────
  console.log("\n✅  Seed complete!\n");
  console.log("   Demo login:");
  console.log("   Email:    demo@playbookai.app");
  console.log("   Password: password123\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
