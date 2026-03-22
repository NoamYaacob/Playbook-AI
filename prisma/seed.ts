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
  const adherencePool: AdherenceStatus[] = [AdherenceStatus.YES, AdherenceStatus.YES, AdherenceStatus.YES, AdherenceStatus.NO, AdherenceStatus.PARTIAL];
  const emotions: EmotionTag[] = [EmotionTag.CONFIDENT, EmotionTag.NEUTRAL, EmotionTag.DISCIPLINED, EmotionTag.ANXIOUS, EmotionTag.FOMO, EmotionTag.PATIENT];

  // Rich questionnaire answer pools
  const whatDidYouSeePool = [
    "ES was forming a clear ORB pattern. Price spent the first 30 minutes in a tight range near the prior day close with above-average volume. Clean structure with higher lows forming.",
    "NQ gapped up at open and was reclaiming VWAP after a pullback. Buyers stepped in at the 15-min VWAP level. Market structure was bullish.",
    "SPY had a failed breakdown below the prior day low. Shorts got trapped when price reversed sharply above the level. Volume spike on the reversal confirmed the move.",
    "Price was making lower highs and lower lows on the 5-min chart. VWAP acting as resistance. Market context was clearly bearish.",
    "ES broke out of a multi-day range on higher volume. First pullback to the breakout level held perfectly. Clean textbook setup.",
    "I saw momentum but didn't see a clear setup. Chased the move after it was already 60% extended from the ideal entry.",
    "Gap fill opportunity: ES opened with a gap and historical gap fill rate is high. Level was clean on the daily.",
    "Watched NQ reject the premarket high 3 times before entering on the 4th test. Supply was clearly there.",
  ];

  const setupTriggerPool = [
    "First 5-min candle close above the ORB high with volume 2× the 20-period average. Stop placed below the opening range low.",
    "VWAP reclaim confirmed by two consecutive 3-min candle closes above VWAP. Momentum indicators aligned.",
    "Price reclaimed the failed breakdown level. Trigger was the 3-min candle close back above the key support.",
    "Moving average crossover on the 5-min with price below VWAP. Confirmed with price action rejection at resistance.",
    "Break and close of the prior day high on the 15-min chart. Volume expansion confirmed the breakout was real.",
    "No clear trigger — entered based on gut feeling after seeing price move quickly. This was not a valid setup.",
    "Gap fill target was the 4-hour gap. Entered on the 3-min pullback after the initial gap fill move started.",
    "Triple top rejection pattern with a momentum divergence on the RSI. Entered on the break of the pattern's neckline.",
  ];

  const stopRationalePool = [
    "Stop below the opening range low, which is the technical invalidation level for the ORB setup. If price takes that level, the premise is wrong.",
    "Stop above the VWAP reclaim candle's high — if price goes back above there, the reclaim failed.",
    "Stop above the breakdown level. If price gets back above it, shorts are no longer trapped.",
    "Stop above VWAP. If price reclaims VWAP, the bearish thesis is invalidated.",
    "Stop below the breakout level. If price drops back into the range, the breakout was false.",
    "No stop was set. I planned to 'watch it' — this was a risk management violation.",
    "Stop above the gap fill high. If price goes above that level before filling, setup is invalidated.",
    "Stop above the triple top rejection high. Clean level that invalidates the short thesis.",
  ];

  const targetRationalePool = [
    "2R minimum target per my strategy rules. Secondary target at the measured move projection (1.5× the opening range height).",
    "VWAP + 1 standard deviation as the first target (measured extension from the reclaim). 2R minimum maintained.",
    "Prior day high as the first target — natural resistance. Would trail stop to breakeven at 1R.",
    "VWAP as the target — standard mean reversion target when trading a faded extended move.",
    "Prior weekly high as the target — clear resistance level with historical significance.",
    "Target was the round number below. Rough estimate, not based on measured move. No clear plan.",
    "Full gap fill as target — clean measured move with historical context.",
    "Prior swing low as target — natural support on the daily chart.",
  ];

  const mistakeNotesPool = [
    null,
    null,
    null,
    "Moved stop too early. Got scared after a minor pullback and tightened the stop, which got hit before the target was reached.",
    "Chased the entry. Missed the ideal entry and entered late, which reduced my R:R and increased risk unnecessarily.",
    "No stop was set. I rationalized watching the trade but this violates the most important rule in my playbook.",
    "Took the trade without confirming volume. The move looked good but volume wasn't there to support it.",
    "Took profit too early out of fear. The trade hit 1R and I closed it, but it went to 3R without me.",
  ];

  const lessonLearnedPool = [
    null,
    null,
    null,
    "Never move a stop based on emotion. Only move stops based on structure (to breakeven at 1R, or trail at key levels). Fear-based stop adjustments almost always result in getting stopped out before the target.",
    "Wait for the setup to come to you. If you miss the ideal entry, let the trade go. A late entry with poor R:R is worse than no trade.",
    "A trade without a stop is not a trade — it's gambling. This is non-negotiable. Set the stop before entering, always.",
    "Volume confirms the move. If the volume isn't there, the setup isn't complete regardless of how good the chart looks.",
    "Trust the process. Taking 1R when the setup targets 3R is inconsistent. Stick to the defined exit criteria.",
  ];

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
    const adherence = pick(adherencePool);
    const strategyId = i < 50 ? activeStrategy.id : archivedStrategy.id;

    // Determine emotion based on adherence and outcome
    const isWin = pnlAmount >= 0;
    const isRevenge = adherence === AdherenceStatus.NO && i % 7 === 0;
    const isFomo = adherence === AdherenceStatus.NO && i % 5 === 0;
    const emotionBefore = isRevenge
      ? EmotionTag.REVENGE
      : isFomo
        ? EmotionTag.FOMO
        : adherence === AdherenceStatus.YES
          ? pick([EmotionTag.CONFIDENT, EmotionTag.DISCIPLINED, EmotionTag.PATIENT])
          : pick(emotions);
    const emotionAfter = isWin
      ? pick([EmotionTag.CONFIDENT, EmotionTag.NEUTRAL])
      : pick([EmotionTag.ANXIOUS, EmotionTag.NEUTRAL, EmotionTag.FEARFUL]);

    // Risk violations for off-plan trades
    const riskViolations: string[] = [];
    if (adherence === AdherenceStatus.NO) {
      if (isRevenge) riskViolations.push("REVENGE_TRADE");
      else if (isFomo) riskViolations.push("OUTSIDE_ALLOWED_HOURS");
      else riskViolations.push(pick(["NO_STOP_LOSS", "UNAPPROVED_SETUP", "BELOW_MINIMUM_RR"]));
    }

    // AI analysis fields
    const hasStop = riskViolations.includes("NO_STOP_LOSS") ? false : true;
    const rrMet = rMultiple >= 2.0;
    const aiMatchedRules: string[] = [];
    const aiBrokenRules: string[] = [];

    if (adherence !== AdherenceStatus.UNREVIEWED) {
      if (hasStop) aiMatchedRules.push("Stop-loss placed before entry");
      else aiBrokenRules.push("No stop-loss — violates mandatory stop rule");

      if (rrMet) aiMatchedRules.push("R:R ratio meets 2.0 minimum");
      else if (rMultiple < 2.0 && rMultiple > 0) aiBrokenRules.push("R:R below 2.0 minimum threshold");

      if (adherence === AdherenceStatus.YES) {
        aiMatchedRules.push("Setup type is in approved list");
        aiMatchedRules.push("Entry during allowed session (NY Open 9:30–11:30)");
        if (emotionBefore !== EmotionTag.REVENGE) aiMatchedRules.push("No revenge emotion detected");
      } else {
        if (isRevenge) aiBrokenRules.push("Revenge trade detected — strategy prohibits trading under REVENGE emotion");
        if (isFomo) aiBrokenRules.push("Entry outside allowed hours window");
      }
    }

    const questIdx = i % whatDidYouSeePool.length;

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
        stopPrice: hasStop ? stopPrice : null,
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
        wasPlanned: adherence === AdherenceStatus.YES,
        wouldTakeAgain: isWin && adherence === AdherenceStatus.YES,
        emotionBefore,
        emotionAfter,
        // Rich questionnaire answers
        whatDidYouSee: adherence !== AdherenceStatus.UNREVIEWED ? whatDidYouSeePool[questIdx] : null,
        setupTrigger: adherence !== AdherenceStatus.UNREVIEWED ? setupTriggerPool[questIdx] : null,
        stopRationale: adherence !== AdherenceStatus.UNREVIEWED ? stopRationalePool[questIdx] : null,
        targetRationale: adherence !== AdherenceStatus.UNREVIEWED ? targetRationalePool[questIdx] : null,
        whyTaken: adherence !== AdherenceStatus.UNREVIEWED
          ? (adherence === AdherenceStatus.YES
              ? "This setup checked all boxes in my playbook. Clear structure, volume confirmation, valid session, and defined risk."
              : "Saw price moving and felt compelled to act. Did not wait for full confirmation.")
          : null,
        mistakeNotes: mistakeNotesPool[questIdx],
        lessonLearned: lessonLearnedPool[questIdx],
        adherenceNotes: adherence === AdherenceStatus.PARTIAL
          ? "Entry was valid but I sized up slightly above my normal position size. Need to keep size consistent."
          : null,
        riskViolations,
        // AI analysis
        aiAdherence: adherence,
        aiConfidence: rand(0.65, 0.95),
        aiMatchedRules,
        aiBrokenRules,
        aiReasoning: adherence === AdherenceStatus.YES
          ? "Trade aligns with all defined strategy criteria. Entry confirmed during allowed session window, stop-loss in place, and R:R above the 2.0 minimum threshold."
          : adherence === AdherenceStatus.PARTIAL
            ? "Trade partially followed strategy rules. Core setup was valid but one or more secondary criteria were not met."
            : "Trade deviated from strategy. Key rules were broken that increase risk without a clear edge basis.",
        aiCoachingNote: adherence !== AdherenceStatus.UNREVIEWED
          ? (adherence === AdherenceStatus.YES
              ? "Solid execution. You waited for confirmation and respected your rules. Keep this consistency."
              : adherence === AdherenceStatus.PARTIAL
                ? "Good setup awareness but execution had a gap. Review which rule was missed and whether a checklist would help."
                : "This trade fell outside your defined edge. Reflect on what triggered the deviation — was it boredom, FOMO, or something else?")
          : null,
        aiSetupClassification: pick(["Opening Range Breakout", "VWAP Reclaim", "Failed Breakdown", "Momentum Continuation", null, null]),
        aiAnalyzedAt: adherence !== AdherenceStatus.UNREVIEWED ? new Date() : null,
      },
    });

    tradeIds.push(trade.id);
  }

  console.log(`  ✓ Trades: 60 created with rich questionnaire data`);

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
