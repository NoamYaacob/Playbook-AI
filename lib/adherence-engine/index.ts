// ---------------------------------------------------------------------------
// Adherence Engine
//
// Full adherence scoring engine that replaces the lightweight checkAdherence
// in lib/utils/adherence.ts with richer rule-matching, confidence scoring,
// and educational coaching output.
//
// Pure module — no I/O, no side effects.
// ---------------------------------------------------------------------------

import type {
  TradeRow,
  StrategyRow,
  AdherenceEngineResult,
  AdherenceStatus,
  TopImprovement,
} from "@/types";
import { detectRiskViolations, RiskViolationCode } from "@/lib/utils/adherence";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatHHMM(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isWithinTimeRange(time: string, start: string, end: string): boolean {
  if (start <= end) {
    return time >= start && time <= end;
  }
  // Midnight-crossing range e.g. "22:00" – "06:00"
  return time >= start || time <= end;
}

function computePlannedRR(trade: TradeRow): number | null {
  if (!trade.stopPrice || !trade.targetPrice || !trade.entryPrice) return null;
  const riskPts = Math.abs(trade.entryPrice - trade.stopPrice);
  if (riskPts === 0) return null;
  const rewardPts = Math.abs(trade.targetPrice - trade.entryPrice);
  return rewardPts / riskPts;
}

// ---------------------------------------------------------------------------
// scoreAdherence
// ---------------------------------------------------------------------------

/**
 * Evaluates a single trade against the user's strategy and returns a rich
 * adherence result including matched/broken rules, a confidence score, and an
 * educational coaching note.
 *
 * This function is purely analytical and references only the user's own
 * defined strategy rules. It never produces buy/sell recommendations.
 */
export function scoreAdherence(
  trade: TradeRow,
  strategy: StrategyRow,
): AdherenceEngineResult {
  // ── Step 1: collect raw violations ────────────────────────────────────────
  const violations = detectRiskViolations(trade, strategy);

  // ── Step 2: evaluate each rule ────────────────────────────────────────────
  const matchedRules: string[] = [];
  const brokenRules: string[] = [];

  // Rule: Setup type matches playbook
  if (strategy.setupTypes.length > 0) {
    if (trade.setupType && strategy.setupTypes.includes(trade.setupType)) {
      matchedRules.push(`Setup type matches playbook ("${trade.setupType}")`);
    } else if (trade.setupType) {
      brokenRules.push(
        `Setup type "${trade.setupType}" is not in the approved playbook setup list`,
      );
    }
  }

  // Rule: Traded in allowed market
  if (strategy.markets.length > 0) {
    if (strategy.markets.includes(trade.market)) {
      matchedRules.push(`Traded in allowed market (${trade.market})`);
    } else {
      brokenRules.push(
        `Market "${trade.market}" is not covered by this strategy`,
      );
    }
  }

  // Rule: Stop-loss placed (when strategy requires it)
  if (strategy.riskRules?.noTradeWithoutStop) {
    if (trade.stopPrice) {
      matchedRules.push("Stop-loss placed as required by playbook");
    } else {
      brokenRules.push(
        "Trade entered without a stop-loss (required by playbook)",
      );
    }
  } else if (trade.stopPrice) {
    // Strategy doesn't strictly require it, but the trader placed one — credit it
    matchedRules.push("Stop-loss placed");
  }

  // Rule: R:R meets minimum
  if (
    strategy.minimumRR !== null &&
    strategy.minimumRR !== undefined
  ) {
    const plannedRR = computePlannedRR(trade);
    if (plannedRR !== null) {
      if (plannedRR >= strategy.minimumRR) {
        matchedRules.push(
          `R:R meets minimum (${strategy.minimumRR.toFixed(1)}) — planned ${plannedRR.toFixed(1)}`,
        );
      } else {
        brokenRules.push(
          `Planned R:R ${plannedRR.toFixed(1)} is below the strategy minimum of ${strategy.minimumRR.toFixed(1)}`,
        );
      }
    }
  }

  // Rule: Entry within allowed hours
  if (strategy.allowedHoursStart && strategy.allowedHoursEnd) {
    const entryHHMM = formatHHMM(new Date(trade.entryAt));
    if (
      isWithinTimeRange(
        entryHHMM,
        strategy.allowedHoursStart,
        strategy.allowedHoursEnd,
      )
    ) {
      matchedRules.push(
        `Entry time ${entryHHMM} is within allowed hours (${strategy.allowedHoursStart}–${strategy.allowedHoursEnd})`,
      );
    } else {
      brokenRules.push(
        `Entry at ${entryHHMM} is outside allowed hours (${strategy.allowedHoursStart}–${strategy.allowedHoursEnd})`,
      );
    }
  }

  // Rule: Session matches playbook
  if (strategy.tradingSessions.length > 0 && trade.session) {
    if (strategy.tradingSessions.includes(trade.session)) {
      matchedRules.push(`Session matches playbook ("${trade.session}")`);
    } else {
      brokenRules.push(
        `Trading session "${trade.session}" is not in the playbook's allowed sessions`,
      );
    }
  }

  // Rule: Trade was pre-planned
  if (trade.wasPlanned === true) {
    matchedRules.push("Trade was pre-planned before the session");
  } else if (trade.wasPlanned === false) {
    brokenRules.push("Trade was not pre-planned (taken impulsively)");
  }

  // Rule: No revenge emotion detected
  if (strategy.riskRules?.noRevengeTrades) {
    if (trade.emotionBefore !== "REVENGE") {
      matchedRules.push("No revenge emotion detected before entry");
    } else {
      brokenRules.push(
        "Pre-trade emotion was REVENGE — violates no-revenge-trade rule",
      );
    }
  }

  // ── Step 3: compute confidence ────────────────────────────────────────────
  let confidence = 0.5;
  confidence += matchedRules.length * 0.1;
  confidence -= brokenRules.length * 0.15;
  confidence = Math.max(0.1, Math.min(0.95, confidence));

  // ── Step 4: determine status ──────────────────────────────────────────────
  let status: AdherenceStatus;

  if (!trade.wasReviewed) {
    status = "UNREVIEWED";
  } else {
    const criticalViolations: string[] = [
      RiskViolationCode.REVENGE_TRADE,
      RiskViolationCode.NO_STOP_LOSS,
      RiskViolationCode.WRONG_MARKET,
    ];

    const hasCritical = violations.some((v) =>
      criticalViolations.includes(v),
    );

    if (violations.length === 0 && matchedRules.length >= 2) {
      status = "YES";
    } else if (hasCritical || violations.length >= 3) {
      status = "NO";
    } else if (violations.length >= 1 && violations.length <= 2) {
      status = "PARTIAL";
    } else {
      // No violations but fewer than 2 matched rules — partial credit
      status = matchedRules.length > 0 ? "PARTIAL" : "NO";
    }
  }

  // ── Step 5: generate coaching note ────────────────────────────────────────
  const coachingNote = buildCoachingNote(status, matchedRules, brokenRules, violations);

  // ── Step 6: build human-readable reasons list ─────────────────────────────
  const reasons: string[] = [
    ...matchedRules.map((r) => `✓ ${r}`),
    ...brokenRules.map((r) => `✗ ${r}`),
  ];

  if (status === "UNREVIEWED") {
    reasons.unshift("Trade has not been marked as reviewed yet");
  }

  return {
    status,
    confidence,
    matchedRules,
    brokenRules,
    violations,
    coachingNote,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// buildCoachingNote — internal helper
// ---------------------------------------------------------------------------

function buildCoachingNote(
  status: AdherenceStatus,
  matchedRules: string[],
  brokenRules: string[],
  violations: string[],
): string {
  if (status === "UNREVIEWED") {
    return (
      "This trade has not been reviewed yet. " +
      "Taking a few minutes to log your emotional state, rationale, and outcome details will unlock " +
      "adherence scoring and provide the context needed for meaningful coaching insights."
    );
  }

  if (status === "YES") {
    const ruleCount = matchedRules.length;
    return (
      `This trade followed your playbook well, satisfying ${ruleCount} defined rule${ruleCount !== 1 ? "s" : ""}. ` +
      "Consistent rule-based execution like this is the foundation of building a statistically reliable edge over time. " +
      "Reviewing what conditions made adherence easy here can help you replicate this process in future sessions."
    );
  }

  if (status === "PARTIAL") {
    const goodParts =
      matchedRules.length > 0
        ? `Several rules were respected — ${matchedRules[0].toLowerCase()}.`
        : "Some aspects of the trade aligned with your playbook.";
    const brokenPart =
      brokenRules.length > 0
        ? ` However, the following area${brokenRules.length !== 1 ? "s" : ""} need attention: ${brokenRules[0].toLowerCase()}.`
        : " A small number of violations were detected.";
    return (
      `${goodParts}${brokenPart} ` +
      "Reflecting on what drove the deviation — whether market conditions, timing pressure, or emotional state — " +
      "is the most productive step toward tightening your process."
    );
  }

  // status === "NO"
  const primaryBreach =
    violations.length > 0
      ? describeViolationShort(violations[0])
      : brokenRules.length > 0
        ? brokenRules[0].toLowerCase()
        : "multiple playbook criteria";

  return (
    `This trade did not meet your playbook's criteria, primarily because ${primaryBreach}. ` +
    "Rule violations on individual trades are part of the learning process — the key is to understand " +
    "what prompted the deviation so you can build better pre-trade checks. " +
    "This trade is worth adding to your review list for a dedicated reflection session."
  );
}

function describeViolationShort(code: string): string {
  const map: Record<string, string> = {
    [RiskViolationCode.REVENGE_TRADE]:
      "the trade was entered in a REVENGE emotional state",
    [RiskViolationCode.NO_STOP_LOSS]:
      "no stop-loss was placed (required by your playbook)",
    [RiskViolationCode.WRONG_MARKET]:
      "the market is not covered by this strategy",
    [RiskViolationCode.UNAPPROVED_SETUP]:
      "the setup type is not in the approved list",
    [RiskViolationCode.OUTSIDE_ALLOWED_HOURS]:
      "the entry was outside allowed trading hours",
    [RiskViolationCode.BELOW_MINIMUM_RR]:
      "the planned R:R was below the strategy minimum",
    [RiskViolationCode.MAX_TRADES_EXCEEDED]:
      "the daily trade limit was exceeded",
    [RiskViolationCode.SIZE_INCREASE_AFTER_LOSS]:
      "position size was increased after a loss",
    [RiskViolationCode.NO_TARGET]: "no target price was defined",
  };
  return map[code] ?? `a violation occurred (${code})`;
}

// ---------------------------------------------------------------------------
// computeTopImprovements
// ---------------------------------------------------------------------------

/**
 * Analyses a set of trades against the user's strategy and returns the top 3
 * improvement areas ranked by impact (largest average negative outcome or
 * biggest win-rate gap).
 *
 * Output is framed educationally. It never prescribes future trades or actions
 * beyond reflecting on one's own recorded strategy rules.
 */
export function computeTopImprovements(
  trades: TradeRow[],
  strategy: StrategyRow,
): TopImprovement[] {
  const closedTrades = trades.filter(
    (t) => !t.isOpen && t.pnlR !== null && t.pnlR !== undefined,
  );

  if (closedTrades.length === 0) return [];

  const overallAvgR =
    closedTrades.reduce((sum, t) => sum + (t.pnlR ?? 0), 0) /
    closedTrades.length;

  interface ImprovementCandidate {
    title: string;
    description: string;
    metric: string;
    type: TopImprovement["type"];
    impact: number; // absolute impact score (higher = worse)
  }

  const candidates: ImprovementCandidate[] = [];

  // ── FOMO trades ───────────────────────────────────────────────────────────
  const fomoTrades = closedTrades.filter((t) => t.emotionBefore === "FOMO");
  if (fomoTrades.length >= 2) {
    const fomoAvgR =
      fomoTrades.reduce((sum, t) => sum + (t.pnlR ?? 0), 0) / fomoTrades.length;
    const gap = overallAvgR - fomoAvgR;
    if (gap > 0) {
      candidates.push({
        title: "FOMO-Driven Entry Performance",
        description:
          `Trades entered with a FOMO emotional state underperform your overall average by ${gap.toFixed(2)}R. ` +
          `Reviewing what conditions trigger FOMO can help you build a pre-trade pause rule into your process.`,
        metric: `${fomoAvgR.toFixed(2)}R avg on FOMO trades vs ${overallAvgR.toFixed(2)}R overall`,
        type: "behavior",
        impact: gap,
      });
    }
  }

  // ── Outside allowed hours ─────────────────────────────────────────────────
  if (strategy.allowedHoursStart && strategy.allowedHoursEnd) {
    const offHoursTrades = closedTrades.filter((t) => {
      const entryHHMM = formatHHMM(new Date(t.entryAt));
      return !isWithinTimeRange(
        entryHHMM,
        strategy.allowedHoursStart!,
        strategy.allowedHoursEnd!,
      );
    });
    if (offHoursTrades.length >= 2) {
      const offHoursAvgR =
        offHoursTrades.reduce((sum, t) => sum + (t.pnlR ?? 0), 0) /
        offHoursTrades.length;
      const gap = overallAvgR - offHoursAvgR;
      if (gap > 0) {
        candidates.push({
          title: "Off-Hours Trade Underperformance",
          description:
            `Trades taken outside your playbook's allowed hours window underperform your average by ${gap.toFixed(2)}R. ` +
            `Your defined time filter exists for a reason — reviewing what draws you to trade outside those hours can reinforce this boundary.`,
          metric: `${offHoursAvgR.toFixed(2)}R avg outside allowed hours`,
          type: "timing",
          impact: gap,
        });
      }
    }
  }

  // ── Revenge trades ────────────────────────────────────────────────────────
  const revengeTrades = closedTrades.filter(
    (t) => t.emotionBefore === "REVENGE",
  );
  if (revengeTrades.length >= 2) {
    const revengeAvgR =
      revengeTrades.reduce((sum, t) => sum + (t.pnlR ?? 0), 0) /
      revengeTrades.length;
    const gap = overallAvgR - revengeAvgR;
    const revengeWinRate =
      revengeTrades.filter((t) => (t.pnlR ?? 0) > 0).length /
      revengeTrades.length;
    if (gap > 0 || revengeWinRate < 0.35) {
      candidates.push({
        title: "Revenge Trading Pattern",
        description:
          `Trades taken in a REVENGE emotional state have a ${Math.round(revengeWinRate * 100)}% win rate ` +
          `and average ${revengeAvgR.toFixed(2)}R. This pattern consistently erodes edge. ` +
          `A post-loss cooling-off rule is a common process safeguard worth exploring in your playbook.`,
        metric: `${revengeAvgR.toFixed(2)}R avg on REVENGE trades (${Math.round(revengeWinRate * 100)}% win rate)`,
        type: "behavior",
        impact: Math.max(gap, (0.35 - revengeWinRate) * 5),
      });
    }
  }

  // ── Unapproved setups ─────────────────────────────────────────────────────
  if (strategy.setupTypes.length > 0) {
    const unapprovedTrades = closedTrades.filter(
      (t) =>
        t.setupType !== null &&
        t.setupType !== undefined &&
        !strategy.setupTypes.includes(t.setupType),
    );
    const approvedTrades = closedTrades.filter(
      (t) =>
        t.setupType !== null &&
        t.setupType !== undefined &&
        strategy.setupTypes.includes(t.setupType),
    );

    if (unapprovedTrades.length >= 2 && approvedTrades.length >= 2) {
      const unapprovedAvgR =
        unapprovedTrades.reduce((sum, t) => sum + (t.pnlR ?? 0), 0) /
        unapprovedTrades.length;
      const approvedAvgR =
        approvedTrades.reduce((sum, t) => sum + (t.pnlR ?? 0), 0) /
        approvedTrades.length;
      const gap = approvedAvgR - unapprovedAvgR;
      if (gap > 0) {
        candidates.push({
          title: "Unapproved Setup Underperformance",
          description:
            `Trades taken on setup types not in your playbook average ${unapprovedAvgR.toFixed(2)}R, ` +
            `compared to ${approvedAvgR.toFixed(2)}R for approved setups. ` +
            `Staying within your defined setup list protects the statistical edge you've built.`,
          metric: `${unapprovedAvgR.toFixed(2)}R avg on unapproved setups vs ${approvedAvgR.toFixed(2)}R on approved`,
          type: "setup",
          impact: gap,
        });
      }
    }
  }

  // ── Over-trading days ─────────────────────────────────────────────────────
  if (strategy.maxTradesPerDay !== null && strategy.maxTradesPerDay !== undefined) {
    // Group trades by date
    const byDate = new Map<string, TradeRow[]>();
    for (const t of closedTrades) {
      const dateKey = new Date(t.entryAt).toISOString().slice(0, 10);
      const existing = byDate.get(dateKey) ?? [];
      existing.push(t);
      byDate.set(dateKey, existing);
    }

    const overTradingDayTrades: TradeRow[] = [];
    for (const [, dayTrades] of byDate) {
      if (dayTrades.length > (strategy.maxTradesPerDay ?? 0)) {
        // Only count the excess trades (those beyond the limit)
        const sorted = [...dayTrades].sort(
          (a, b) => new Date(a.entryAt).getTime() - new Date(b.entryAt).getTime(),
        );
        overTradingDayTrades.push(...sorted.slice(strategy.maxTradesPerDay));
      }
    }

    if (overTradingDayTrades.length >= 2) {
      const overAvgR =
        overTradingDayTrades.reduce((sum, t) => sum + (t.pnlR ?? 0), 0) /
        overTradingDayTrades.length;
      const gap = overallAvgR - overAvgR;
      if (gap > 0) {
        candidates.push({
          title: "Over-Trading Day Drag",
          description:
            `Trades taken beyond your daily limit of ${strategy.maxTradesPerDay} average ${overAvgR.toFixed(2)}R. ` +
            `This suggests diminishing quality as the session extends. ` +
            `Tracking what triggers additional entries after the limit can sharpen your session discipline.`,
          metric: `${overAvgR.toFixed(2)}R avg on excess trades vs ${overallAvgR.toFixed(2)}R overall`,
          type: "risk",
          impact: gap,
        });
      }
    }
  }

  // ── No-stop trades ────────────────────────────────────────────────────────
  const noStopTrades = closedTrades.filter((t) => !t.stopPrice);
  const withStopTrades = closedTrades.filter((t) => Boolean(t.stopPrice));
  if (noStopTrades.length >= 2 && withStopTrades.length >= 2) {
    const noStopAvgR =
      noStopTrades.reduce((sum, t) => sum + (t.pnlR ?? 0), 0) /
      noStopTrades.length;
    const withStopAvgR =
      withStopTrades.reduce((sum, t) => sum + (t.pnlR ?? 0), 0) /
      withStopTrades.length;
    const gap = withStopAvgR - noStopAvgR;
    if (gap > 0) {
      candidates.push({
        title: "Trades Without Stop-Loss",
        description:
          `Trades entered without a recorded stop-loss average ${noStopAvgR.toFixed(2)}R, ` +
          `compared to ${withStopAvgR.toFixed(2)}R when a stop was placed. ` +
          `Consistent stop placement is a cornerstone of capital protection and variance reduction.`,
        metric: `${noStopAvgR.toFixed(2)}R avg without stop vs ${withStopAvgR.toFixed(2)}R with stop`,
        type: "risk",
        impact: gap,
      });
    }
  }

  // ── Rank and return top 3 ─────────────────────────────────────────────────
  candidates.sort((a, b) => b.impact - a.impact);

  return candidates.slice(0, 3).map((c, index) => ({
    rank: index + 1,
    title: c.title,
    description: c.description,
    metric: c.metric,
    type: c.type,
  }));
}
