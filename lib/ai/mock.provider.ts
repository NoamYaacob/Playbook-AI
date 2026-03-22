// ---------------------------------------------------------------------------
// Mock AI Provider
//
// Returns realistic-looking, varied outputs without calling any external API.
// A 500 ms artificial delay simulates network/model latency so that loading
// states are exercised during development.
//
// IMPORTANT DISCLAIMER embedded in all outputs:
//   – All analysis is based solely on the user's own defined strategy.
//   – No output constitutes financial advice or trade signals.
//   – The provider never says "you should trade X" or recommends entries/exits.
// ---------------------------------------------------------------------------

import type { AIProvider } from "./provider.interface";
import type {
  StrategyAnalysisInput,
  StrategyAnalysisOutput,
  TradeAnalysisInput,
  TradeAnalysisOutput,
  TradeAnalysisOutputV2,
  DailyReviewInput,
  DailyReviewOutput,
  InsightsInput,
  InsightsOutput,
  ClusterSetupInput,
  ClusterSetupOutput,
  ClusterSetupItem,
  SetupClusterInput,
  SetupClusterOutput,
} from "./types";
import type { AdherenceStatus } from "@/types";

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pick a pseudo-random element from an array using a simple hash of a string seed. */
function seededPick<T>(arr: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return arr[hash % arr.length];
}

// ---------------------------------------------------------------------------
// Mock AI Provider implementation
// ---------------------------------------------------------------------------

class MockAIProvider implements AIProvider {
  // ── analyzeStrategy ───────────────────────────────────────────────────────

  async analyzeStrategy(
    input: StrategyAnalysisInput,
  ): Promise<StrategyAnalysisOutput> {
    await delay(500);

    const strategy = input.strategy as Record<string, unknown>;
    const title = (strategy.title as string | undefined) ?? "Your Strategy";

    const structuredJson = {
      playbookVersion: "1.0",
      title,
      markets: strategy.markets ?? [],
      setupTypes: strategy.setupTypes ?? [],
      riskParameters: {
        minimumRR: strategy.minimumRR ?? null,
        maxTradesPerDay: strategy.maxTradesPerDay ?? null,
        maxDailyLoss: strategy.maxDailyLoss ?? null,
        noTradeWithoutStop:
          (strategy.riskRules as Record<string, unknown> | undefined)
            ?.noTradeWithoutStop ?? false,
        noRevengeTrades:
          (strategy.riskRules as Record<string, unknown> | undefined)
            ?.noRevengeTrades ?? false,
      },
      timeFilters: {
        allowedHoursStart: strategy.allowedHoursStart ?? null,
        allowedHoursEnd: strategy.allowedHoursEnd ?? null,
      },
      analysisTimestamp: new Date().toISOString(),
    };

    const summary =
      `"${title}" is a structured trading approach that focuses on ${
        Array.isArray(strategy.markets) && strategy.markets.length > 0
          ? (strategy.markets as string[]).join(" and ").toLowerCase()
          : "defined markets"
      }. ` +
      `The playbook defines ${
        Array.isArray(strategy.setupTypes) && strategy.setupTypes.length > 0
          ? strategy.setupTypes.length
          : "several"
      } setup type(s) with clear entry criteria, stop-loss logic, and target definitions. ` +
      `Risk management rules are in place to protect capital, including ${
        strategy.minimumRR
          ? `a minimum R:R of ${strategy.minimumRR}`
          : "position sizing guidelines"
      }. ` +
      `Overall this playbook demonstrates a disciplined, rules-based framework that can support consistent review and self-improvement over time.`;

    const suggestions = [
      "Consider adding explicit invalidation conditions for each setup type to sharpen entry discipline.",
      "Logging the emotional state before each trade will help you identify patterns between psychology and adherence.",
      "A defined maximum consecutive-loss rule can help you step back before compounding drawdowns.",
      "Reviewing your best and worst setup types monthly allows you to double down on edge and reduce low-probability trades.",
    ];

    return { structuredJson, summary, suggestions };
  }

  // ── analyzeTrade ──────────────────────────────────────────────────────────

  async analyzeTrade(
    input: TradeAnalysisInput,
  ): Promise<TradeAnalysisOutput> {
    await delay(500);

    const trade = input.trade as Record<string, unknown>;
    const strategy = input.strategy as Record<string, unknown>;

    const pnlR = typeof trade.pnlR === "number" ? trade.pnlR : null;
    const hasStop = Boolean(trade.stopPrice);
    const emotion = trade.emotionBefore as string | undefined;
    const setupType = (trade.setupType as string | undefined) ?? "unclassified";
    const strategySetups = Array.isArray(strategy.setupTypes)
      ? (strategy.setupTypes as string[])
      : [];

    // Heuristic adherence scoring
    let score = 0;
    if (hasStop) score += 30;
    if (pnlR !== null && pnlR >= 0) score += 20;
    if (emotion !== "REVENGE" && emotion !== "FOMO" && emotion !== "IMPULSIVE")
      score += 20;
    if (strategySetups.length === 0 || strategySetups.includes(setupType))
      score += 30;

    let adherence: AdherenceStatus;
    let confidence: number;
    let reasoning: string;

    if (score >= 80) {
      adherence = "YES";
      confidence = 0.82 + Math.random() * 0.12;
      reasoning =
        `This trade aligns well with the playbook. A stop-loss was placed, the setup type "${setupType}" ` +
        `is within the approved list, and the emotional state heading into the trade was composed. ` +
        `The R-multiple outcome is consistent with the strategy's expected performance range. ` +
        `Overall this is a good example of rules-based execution.`;
    } else if (score >= 45) {
      adherence = "PARTIAL";
      confidence = 0.65 + Math.random() * 0.12;
      const partialReasons: string[] = [];
      if (!hasStop) partialReasons.push("no stop-loss was recorded");
      if (emotion === "REVENGE" || emotion === "FOMO")
        partialReasons.push(`the emotional state was ${emotion?.toLowerCase()}`);
      if (strategySetups.length > 0 && !strategySetups.includes(setupType))
        partialReasons.push(
          `the setup type "${setupType}" is not in the approved list`,
        );
      reasoning =
        `This trade partially followed the playbook. Some rules were respected, but ${partialReasons.join(
          " and ",
        )}. Reviewing what drove those departures can help reinforce the process going forward.`;
    } else {
      adherence = "NO";
      confidence = 0.7 + Math.random() * 0.15;
      reasoning =
        `This trade did not meet the playbook's criteria. ` +
        (emotion === "REVENGE"
          ? "The emotional state suggests a possible revenge trade, which conflicts with the strategy's no-revenge rule. "
          : "") +
        (!hasStop
          ? "A stop-loss was absent, which violates capital protection rules. "
          : "") +
        `Reflecting on what triggered this deviation is a valuable part of the review process.`;
    }

    const behaviorFlagPool: string[] = [];
    if (emotion === "REVENGE") behaviorFlagPool.push("POSSIBLE_REVENGE_TRADE");
    if (emotion === "FOMO") behaviorFlagPool.push("FOMO_DRIVEN_ENTRY");
    if (emotion === "IMPULSIVE") behaviorFlagPool.push("IMPULSIVE_ENTRY");
    if (!hasStop) behaviorFlagPool.push("MISSING_STOP_LOSS");
    if (pnlR !== null && pnlR < -2)
      behaviorFlagPool.push("LARGE_LOSS_RELATIVE_TO_PLAN");
    if (pnlR !== null && pnlR > 0 && trade.exitPrice && trade.targetPrice) {
      const exitedEarly =
        typeof trade.exitPrice === "number" &&
        typeof trade.targetPrice === "number" &&
        Math.abs(
          (trade.exitPrice as number) - (trade.targetPrice as number),
        ) > 0.001;
      if (exitedEarly) behaviorFlagPool.push("EARLY_EXIT_BEFORE_TARGET");
    }

    return {
      adherence,
      confidence: Math.min(confidence, 0.97),
      reasoning,
      setupClassification: setupType,
      behaviorFlags: behaviorFlagPool,
    };
  }

  // ── analyzeTradeV2 ────────────────────────────────────────────────────────

  async analyzeTradeV2(
    input: TradeAnalysisInput,
  ): Promise<TradeAnalysisOutputV2> {
    await delay(500);

    // Reuse base logic
    const base = await this.analyzeTrade(input);

    const trade = input.trade as Record<string, unknown>;
    const strategy = input.strategy as Record<string, unknown>;

    const hasStop = Boolean(trade.stopPrice);
    const emotion = trade.emotionBefore as string | undefined;
    const setupType = (trade.setupType as string | undefined) ?? "unclassified";
    const strategySetups = Array.isArray(strategy.setupTypes)
      ? (strategy.setupTypes as string[])
      : [];
    const wasPlanned = trade.wasPlanned as boolean | undefined;
    const session = trade.session as string | undefined;
    const strategySessions = Array.isArray(strategy.tradingSessions)
      ? (strategy.tradingSessions as string[])
      : [];

    // Build matched rules
    const matchedRules: string[] = [];
    if (hasStop) matchedRules.push("Stop-loss placed as required by playbook");
    if (strategySetups.length === 0 || strategySetups.includes(setupType))
      matchedRules.push(`Setup type "${setupType}" matches playbook definition`);
    if (emotion !== "REVENGE" && emotion !== "FOMO" && emotion !== "IMPULSIVE")
      matchedRules.push("Pre-trade emotional state was composed and non-reactive");
    if (wasPlanned === true)
      matchedRules.push("Trade was pre-planned before the session");
    if (session && (strategySessions.length === 0 || strategySessions.includes(session)))
      matchedRules.push(`Session "${session}" is within allowed trading windows`);

    // Build broken rules
    const brokenRules: string[] = [];
    if (!hasStop)
      brokenRules.push(
        "No stop-loss was placed — capital protection rule violated",
      );
    if (strategySetups.length > 0 && !strategySetups.includes(setupType))
      brokenRules.push(
        `Setup type "${setupType}" is not in the approved playbook setup list`,
      );
    if (emotion === "REVENGE")
      brokenRules.push(
        "Pre-trade emotion was REVENGE — no-revenge-trade rule triggered",
      );
    if (emotion === "FOMO")
      brokenRules.push(
        "Pre-trade emotion was FOMO — increases risk of chasing entries",
      );
    if (wasPlanned === false)
      brokenRules.push("Trade was not pre-planned (impulsive entry)");
    if (
      session &&
      strategySessions.length > 0 &&
      !strategySessions.includes(session)
    )
      brokenRules.push(
        `Session "${session}" is outside the allowed trading windows`,
      );

    // Build coaching note (2 sentences, educational, process-focused)
    let coachingNote: string;

    if (base.adherence === "YES") {
      coachingNote =
        `This trade demonstrates solid process adherence — all core playbook criteria were met, which is exactly the kind of execution that builds long-term edge. ` +
        `Take note of the conditions that made following your rules easy here so you can recreate that environment in future sessions.`;
    } else if (base.adherence === "PARTIAL") {
      const primaryBroken = brokenRules[0] ?? "one rule was not fully followed";
      coachingNote =
        `Several playbook criteria were satisfied in this trade, showing discipline in key areas. ` +
        `The main area to reflect on is: ${primaryBroken.toLowerCase()} — understanding what drove this departure will help tighten your process over time.`;
    } else {
      const primaryBroken =
        brokenRules[0] ?? "multiple playbook criteria were not met";
      coachingNote =
        `This trade fell outside your defined playbook parameters, primarily because ${primaryBroken.toLowerCase()}. ` +
        `Reviewing what triggered this deviation — whether market conditions, emotional pressure, or missed preparation — is the most valuable step toward consistent rule-based execution.`;
    }

    return {
      ...base,
      matchedRules,
      brokenRules,
      coachingNote,
    };
  }

  // ── summarizeDailyReview ──────────────────────────────────────────────────

  async summarizeDailyReview(
    input: DailyReviewInput,
  ): Promise<DailyReviewOutput> {
    await delay(500);

    const { trades, date } = input;
    const count = trades.length;
    const tradeList = trades as Array<Record<string, unknown>>;

    const winners = tradeList.filter(
      (t) => typeof t.pnlAmount === "number" && t.pnlAmount > 0,
    );
    const losers = tradeList.filter(
      (t) => typeof t.pnlAmount === "number" && t.pnlAmount < 0,
    );

    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const summary =
      `On ${formattedDate} you completed ${count} trade${count !== 1 ? "s" : ""}, ` +
      `recording ${winners.length} winner${winners.length !== 1 ? "s" : ""} and ` +
      `${losers.length} loser${losers.length !== 1 ? "s" : ""}. ` +
      (count > 0
        ? `Your execution showed ${
            winners.length >= losers.length
              ? "solid process discipline overall"
              : "some areas where the playbook rules were challenged"
          }. ` +
          `Reviewing the trades that deviated from your playbook—even when they were profitable—is the most valuable part of the journaling process. ` +
          `Consistency in following your defined rules builds the statistical edge over time.`
        : "No trades were recorded for this session. Rest and preparation are also part of a disciplined trading process.");

    const improvementSuggestions =
      `1. Before your next session, revisit any trade where the emotional state was FOMO, REVENGE, or IMPULSIVE, and write a one-sentence rule you can apply next time.\n` +
      `2. Compare your planned R:R with the actual exit – if you consistently exit early, consider reviewing your target-setting logic in the playbook.\n` +
      (losers.length > 1
        ? `3. You had ${losers.length} losing trades today. Verify that each had a defined stop and met your minimum setup criteria before entry.`
        : `3. Reinforce what worked well today by noting the specific setup conditions that generated your cleanest executions.`);

    const patterns: string[] = [];
    const revengeTrades = tradeList.filter(
      (t) => t.emotionBefore === "REVENGE",
    );
    if (revengeTrades.length > 0)
      patterns.push(
        `${revengeTrades.length} trade(s) were entered with a REVENGE emotional state – a recurring behaviour worth monitoring.`,
      );
    if (count > 4)
      patterns.push(
        `High trade frequency detected (${count} trades). Reviewing whether each met your minimum setup criteria can help reduce overtrading.`,
      );
    const noStopTrades = tradeList.filter((t) => !t.stopPrice);
    if (noStopTrades.length > 0)
      patterns.push(
        `${noStopTrades.length} trade(s) were entered without a recorded stop-loss. Consistent stop placement is a cornerstone of capital protection.`,
      );

    return { summary, improvementSuggestions, patterns };
  }

  // ── generateInsights ──────────────────────────────────────────────────────

  async generateInsights(input: InsightsInput): Promise<InsightsOutput> {
    await delay(500);

    const { trades, period } = input;
    const tradeList = trades as Array<Record<string, unknown>>;
    const count = tradeList.length;

    const winCount = tradeList.filter(
      (t) => typeof t.pnlAmount === "number" && t.pnlAmount > 0,
    ).length;
    const winRate = count > 0 ? Math.round((winCount / count) * 100) : 0;

    const adherentCount = tradeList.filter(
      (t) => t.adherence === "YES",
    ).length;
    const adherenceRate =
      count > 0 ? Math.round((adherentCount / count) * 100) : 0;

    // Setup frequency analysis
    const setupMap = new Map<string, number>();
    for (const t of tradeList) {
      const s = (t.setupType as string | undefined) ?? "(unclassified)";
      setupMap.set(s, (setupMap.get(s) ?? 0) + 1);
    }
    const topSetup = [...setupMap.entries()].sort(([, a], [, b]) => b - a)[0];

    // Emotion frequency analysis
    const emotionMap = new Map<string, number>();
    for (const t of tradeList) {
      if (t.emotionBefore) {
        const e = t.emotionBefore as string;
        emotionMap.set(e, (emotionMap.get(e) ?? 0) + 1);
      }
    }
    const topEmotion = [...emotionMap.entries()].sort(
      ([, a], [, b]) => b - a,
    )[0];

    const seed = `${period}-${count}-${winRate}`;

    const insights = [
      {
        type: "ADHERENCE_SUMMARY",
        title: `Playbook Adherence – ${period}`,
        body:
          `Over ${period} you followed your playbook in ${adherenceRate}% of ${count} reviewed trade${count !== 1 ? "s" : ""}. ` +
          (adherenceRate >= 70
            ? `This is a strong adherence rate and reflects consistent execution discipline. Continue prioritising process over outcome.`
            : `There is room to strengthen your adherence. Focus on identifying the specific rules most frequently broken and address them one at a time.`),
        metadata: { adherenceRate, tradeCount: count },
      },
      {
        type: "BEHAVIOR_PATTERN",
        title: topEmotion
          ? `Frequent Emotional State: ${topEmotion[0]}`
          : "Emotional Consistency",
        body: topEmotion
          ? `Your most frequently logged pre-trade emotion over ${period} was "${topEmotion[0]}" (${topEmotion[1]} occurrence${topEmotion[1] !== 1 ? "s" : ""}). ` +
            (topEmotion[0] === "CONFIDENT" ||
            topEmotion[0] === "DISCIPLINED" ||
            topEmotion[0] === "PATIENT"
              ? `This positive emotional profile is associated with disciplined playbook adherence. Maintain awareness of what conditions produce this mindset.`
              : `Being aware of how this emotional state affects your decision-making is the first step to managing it. Consider a pre-trade checklist that flags high-risk emotional conditions.`)
          : `No consistent emotional pattern was detected over ${period}. Logging pre-trade emotions on every trade will unlock richer self-coaching data.`,
        metadata: topEmotion
          ? { dominantEmotion: topEmotion[0], occurrences: topEmotion[1] }
          : {},
      },
      {
        type: "SETUP_PERFORMANCE",
        title: topSetup ? `Most Active Setup: ${topSetup[0]}` : "Setup Frequency",
        body: topSetup
          ? `The "${topSetup[0]}" setup was your most frequently traded pattern over ${period} (${topSetup[1]} trade${topSetup[1] !== 1 ? "s" : ""}). ` +
            `Reviewing its win rate, average R-multiple, and adherence rate in isolation will help you determine whether it represents a genuine edge in your playbook or a habitual over-reliance.`
          : `Setup type data is limited for ${period}. Tagging every trade with its setup type is essential for identifying which patterns are producing the best results.`,
        metadata: topSetup
          ? { setupType: topSetup[0], tradeCount: topSetup[1] }
          : {},
      },
      {
        type: "COACHING_INSIGHT",
        title: seededPick(
          [
            "The Process Is the Edge",
            "Consistency Compounds",
            "Review Quality Over Trade Quantity",
          ],
          seed,
        ),
        body: seededPick(
          [
            `A ${winRate}% win rate over ${period} tells you about outcomes, but your adherence rate tells you about your process. Traders who consistently follow a well-defined playbook tend to see their win rate and expectancy improve naturally over months of disciplined execution.`,
            `Every trade you journal with detail—emotions, rationale, stop logic—is a data point that makes future coaching insights more accurate. The more context you capture, the more clearly patterns emerge.`,
            `Review your losing trades that fully followed the playbook separately from losing trades that violated rules. Playbook losses are the cost of operating an edge. Rule-breaking losses are what you can eliminate through discipline.`,
          ],
          seed,
        ),
        metadata: { winRate, period },
      },
    ];

    return { insights };
  }

  // ── clusterSetups ─────────────────────────────────────────────────────────

  async clusterSetups(input: ClusterSetupInput): Promise<ClusterSetupOutput> {
    await delay(800);

    const tradeList = input.trades as Array<Record<string, unknown>>;

    // Group by setup type if available, otherwise by emotional state
    const bySetup = new Map<string, Array<Record<string, unknown>>>();

    for (const t of tradeList) {
      const key =
        (t.setupType as string | undefined) ??
        (t.whatDidYouSee ? "observation-based" : "unclassified");
      const group = bySetup.get(key) ?? [];
      group.push(t);
      bySetup.set(key, group);
    }

    const clusterTemplates: Array<{
      name: string;
      description: string;
      suggestedSetupType: string;
      keywords: string[];
    }> = [
      {
        name: "Pre-market Breakouts",
        description:
          "Trades taken at key levels when price breaks above prior session highs with momentum.",
        suggestedSetupType: "Breakout",
        keywords: ["breakout", "momentum", "level", "high", "pre-market"],
      },
      {
        name: "Pullback to Structure",
        description:
          "Counter-trend retracements to a defined support or resistance zone with a clear trigger.",
        suggestedSetupType: "Pullback",
        keywords: ["pullback", "retracement", "support", "zone", "structure"],
      },
      {
        name: "Opening Range Plays",
        description:
          "Directional plays based on the first 15–30 minute range established at the market open.",
        suggestedSetupType: "Opening Range",
        keywords: ["opening", "range", "open", "session", "first"],
      },
      {
        name: "Trend Continuation",
        description:
          "Trades taken with the prevailing trend after a consolidation or small correction.",
        suggestedSetupType: "Trend Continuation",
        keywords: ["trend", "continuation", "with", "direction"],
      },
    ];

    const clusters: ClusterSetupItem[] = [];
    let templateIdx = 0;

    for (const [, groupTrades] of bySetup.entries()) {
      if (groupTrades.length === 0) continue;

      const template = clusterTemplates[templateIdx % clusterTemplates.length];
      templateIdx++;

      const tradeIds = groupTrades
        .map((t) => t.id as string | undefined)
        .filter((id): id is string => typeof id === "string");

      const winners = groupTrades.filter(
        (t) => typeof t.pnlAmount === "number" && t.pnlAmount > 0,
      );
      const winRate =
        groupTrades.length > 0 ? winners.length / groupTrades.length : null;

      const rValues = groupTrades
        .map((t) => t.pnlR)
        .filter((r): r is number => typeof r === "number");
      const avgR =
        rValues.length > 0
          ? rValues.reduce((sum, r) => sum + r, 0) / rValues.length
          : null;

      clusters.push({
        name: template.name,
        description: template.description,
        keywords: template.keywords,
        tradeIds,
        winRate,
        avgR,
        suggestedSetupType: template.suggestedSetupType,
      });
    }

    // Ensure at least one cluster if input had trades
    if (clusters.length === 0 && tradeList.length > 0) {
      const allIds = tradeList
        .map((t) => t.id as string | undefined)
        .filter((id): id is string => typeof id === "string");

      clusters.push({
        name: "General Setups",
        description:
          "A mixed group of trades that share similar market conditions and entry logic.",
        keywords: ["setup", "entry", "plan"],
        tradeIds: allIds,
        winRate: null,
        avgR: null,
        suggestedSetupType: "General",
      });
    }

    return { clusters };
  }

  // ── clusterSetupsV2 ───────────────────────────────────────────────────────

  async clusterSetupsV2(
    input: SetupClusterInput,
  ): Promise<SetupClusterOutput> {
    await delay(800);

    const { trades } = input;

    if (trades.length === 0) {
      return {
        clusters: [],
        summary:
          "No trades were provided for clustering. Add more trade detail — including what you saw on the chart and your setup trigger — to unlock pattern analysis.",
      };
    }

    // Named cluster definitions for the mock
    const namedClusters: Array<{
      name: string;
      description: string;
      suggestedSetupType: string;
      keywords: string[];
      triggerKeywords: string[];
    }> = [
      {
        name: "Opening Range Breakout",
        description:
          "Trades that capture a directional move when price breaks out of the first 15–30 minutes range at the session open.",
        suggestedSetupType: "Opening Range Breakout",
        keywords: ["opening range", "breakout", "ORB", "open", "first candle"],
        triggerKeywords: ["open", "range", "breakout", "first", "session"],
      },
      {
        name: "VWAP Reclaim",
        description:
          "Trades entered when price reclaims the VWAP level after a failed breakdown, signalling intraday mean reversion.",
        suggestedSetupType: "VWAP Reclaim",
        keywords: ["VWAP", "reclaim", "mean reversion", "intraday", "volume"],
        triggerKeywords: ["vwap", "reclaim", "volume", "average", "revert"],
      },
      {
        name: "Failed Breakdown",
        description:
          "Trades taken when price fails to sustain a breakdown below a key support level and reverses sharply.",
        suggestedSetupType: "Failed Breakdown",
        keywords: [
          "failed breakdown",
          "support",
          "reversal",
          "trap",
          "rejection",
        ],
        triggerKeywords: [
          "support",
          "breakdown",
          "fail",
          "reject",
          "reverse",
          "trap",
        ],
      },
      {
        name: "Gap Fill",
        description:
          "Trades that target the closing of a price gap from the previous session's close to the current session's open.",
        suggestedSetupType: "Gap Fill",
        keywords: ["gap", "fill", "previous close", "overnight", "reversion"],
        triggerKeywords: ["gap", "fill", "close", "overnight", "prior"],
      },
    ];

    // Assign trades to clusters based on keyword matching in narrative fields
    const clusterBuckets: Map<
      number,
      Array<(typeof input.trades)[number]>
    > = new Map(namedClusters.map((_, i) => [i, []]));
    const unassigned: Array<(typeof input.trades)[number]> = [];

    for (const trade of trades) {
      const narrative = [
        trade.whatDidYouSee ?? "",
        trade.setupTrigger ?? "",
        trade.whyTaken ?? "",
        trade.setupType ?? "",
      ]
        .join(" ")
        .toLowerCase();

      let bestCluster = -1;
      let bestScore = 0;

      for (let i = 0; i < namedClusters.length; i++) {
        const score = namedClusters[i].triggerKeywords.filter((kw) =>
          narrative.includes(kw),
        ).length;
        if (score > bestScore) {
          bestScore = score;
          bestCluster = i;
        }
      }

      if (bestCluster >= 0 && bestScore > 0) {
        clusterBuckets.get(bestCluster)!.push(trade);
      } else {
        unassigned.push(trade);
      }
    }

    // Distribute unassigned trades evenly across clusters using a seeded approach
    for (let i = 0; i < unassigned.length; i++) {
      const trade = unassigned[i];
      const idx = i % namedClusters.length;
      clusterBuckets.get(idx)!.push(trade);
    }

    // Build output — only emit clusters that received at least 2 trades
    const outputClusters: SetupClusterOutput["clusters"] = [];

    for (let i = 0; i < namedClusters.length; i++) {
      const bucket = clusterBuckets.get(i) ?? [];
      if (bucket.length < 2) continue;

      const tradeIds = bucket.map((t) => t.id);

      const winCount = bucket.filter(
        (t) => t.pnlR !== null && t.pnlR !== undefined && t.pnlR > 0,
      ).length;
      const winRateEstimate =
        bucket.length > 0 ? winCount / bucket.length : undefined;

      outputClusters.push({
        name: namedClusters[i].name,
        description: namedClusters[i].description,
        keywords: namedClusters[i].keywords,
        tradeIds,
        suggestedSetupType: namedClusters[i].suggestedSetupType,
        winRateEstimate,
      });
    }

    // Fallback: if no clusters had enough trades, put everything in one
    if (outputClusters.length === 0) {
      outputClusters.push({
        name: "Mixed Setups",
        description:
          "A diverse group of trades — adding more detail to your trade narratives will allow more specific pattern groupings.",
        keywords: ["mixed", "varied", "general"],
        tradeIds: trades.map((t) => t.id),
        suggestedSetupType: "General",
        winRateEstimate: undefined,
      });
    }

    const summary =
      `${outputClusters.length} setup cluster${outputClusters.length !== 1 ? "s were" : " was"} identified across ${trades.length} trade${trades.length !== 1 ? "s" : ""}. ` +
      `These groupings are based on patterns in your own narrative descriptions and are suggestions only — ` +
      `review each cluster and confirm or rename the setup type to match your playbook terminology.`;

    return { clusters: outputClusters, summary };
  }
}

export const mockAIProvider = new MockAIProvider();
