// ---------------------------------------------------------------------------
// Adherence & Risk Violation Utilities
//
// Pure functions – no side effects, no I/O.
// ---------------------------------------------------------------------------

import type { TradeRow, StrategyRow, AdherenceStatus } from "@/types";

// ---------------------------------------------------------------------------
// Risk violation codes
// ---------------------------------------------------------------------------

export const RiskViolationCode = {
  /** Traded outside allowed hours */
  OUTSIDE_ALLOWED_HOURS: "OUTSIDE_ALLOWED_HOURS",
  /** R:R below strategy minimum */
  BELOW_MINIMUM_RR: "BELOW_MINIMUM_RR",
  /** No stop-loss set when required */
  NO_STOP_LOSS: "NO_STOP_LOSS",
  /** Trade entered with a forbidden setup type (not in setupTypes list) */
  UNAPPROVED_SETUP: "UNAPPROVED_SETUP",
  /** Trade entered in a market not on the strategy's market list */
  WRONG_MARKET: "WRONG_MARKET",
  /** Daily trade count limit exceeded */
  MAX_TRADES_EXCEEDED: "MAX_TRADES_EXCEEDED",
  /** Revenge-trade flag (emotion = REVENGE) when strategy forbids it */
  REVENGE_TRADE: "REVENGE_TRADE",
  /** Size increase after a loss */
  SIZE_INCREASE_AFTER_LOSS: "SIZE_INCREASE_AFTER_LOSS",
  /** Target price not set (when targetLogic implies one should exist) */
  NO_TARGET: "NO_TARGET",
} as const;

export type RiskViolationCode =
  (typeof RiskViolationCode)[keyof typeof RiskViolationCode];

// ---------------------------------------------------------------------------
// detectRiskViolations
// ---------------------------------------------------------------------------

/**
 * Checks a single trade against a strategy's risk rules and returns an array
 * of violation codes. Returns an empty array when the trade is compliant.
 */
export function detectRiskViolations(
  trade: TradeRow,
  strategy: StrategyRow,
): string[] {
  const violations: string[] = [];

  // ── Market check ─────────────────────────────────────────────────────────
  if (
    strategy.markets.length > 0 &&
    !strategy.markets.includes(trade.market)
  ) {
    violations.push(RiskViolationCode.WRONG_MARKET);
  }

  // ── Setup type check ──────────────────────────────────────────────────────
  if (
    strategy.setupTypes.length > 0 &&
    trade.setupType &&
    !strategy.setupTypes.includes(trade.setupType)
  ) {
    violations.push(RiskViolationCode.UNAPPROVED_SETUP);
  }

  // ── No stop-loss ──────────────────────────────────────────────────────────
  if (strategy.riskRules?.noTradeWithoutStop && !trade.stopPrice) {
    violations.push(RiskViolationCode.NO_STOP_LOSS);
  }

  // ── Minimum R:R ───────────────────────────────────────────────────────────
  if (
    strategy.minimumRR !== null &&
    strategy.minimumRR !== undefined &&
    trade.stopPrice &&
    trade.targetPrice &&
    trade.entryPrice
  ) {
    const riskPts = Math.abs(trade.entryPrice - trade.stopPrice);
    const rewardPts = Math.abs(trade.targetPrice - trade.entryPrice);
    const plannedRR = riskPts > 0 ? rewardPts / riskPts : 0;
    if (plannedRR < strategy.minimumRR) {
      violations.push(RiskViolationCode.BELOW_MINIMUM_RR);
    }
  }

  // ── Allowed hours ─────────────────────────────────────────────────────────
  if (strategy.allowedHoursStart && strategy.allowedHoursEnd) {
    const entryHHMM = formatHHMM(new Date(trade.entryAt));
    if (
      !isWithinTimeRange(
        entryHHMM,
        strategy.allowedHoursStart,
        strategy.allowedHoursEnd,
      )
    ) {
      violations.push(RiskViolationCode.OUTSIDE_ALLOWED_HOURS);
    }
  }

  // ── Forbidden hours ───────────────────────────────────────────────────────
  const forbiddenHours = strategy.forbiddenHours as
    | Array<{ start: string; end: string }>
    | null
    | undefined;
  if (Array.isArray(forbiddenHours) && forbiddenHours.length > 0) {
    const entryHHMM = formatHHMM(new Date(trade.entryAt));
    const inForbiddenWindow = forbiddenHours.some(({ start, end }) =>
      isWithinTimeRange(entryHHMM, start, end),
    );
    if (inForbiddenWindow) {
      violations.push(RiskViolationCode.OUTSIDE_ALLOWED_HOURS);
    }
  }

  // ── Revenge trade ─────────────────────────────────────────────────────────
  if (
    strategy.riskRules?.noRevengeTrades &&
    trade.emotionBefore === "REVENGE"
  ) {
    violations.push(RiskViolationCode.REVENGE_TRADE);
  }

  return [...new Set(violations)]; // deduplicate
}

// ---------------------------------------------------------------------------
// checkAdherence
// ---------------------------------------------------------------------------

export interface AdherenceResult {
  status: AdherenceStatus;
  violations: string[];
  reasons: string[];
}

/**
 * Determines the overall adherence status of a trade against a strategy.
 *
 * - YES:        no violations detected and trade has a reviewed setup
 * - PARTIAL:    1–2 minor violations
 * - NO:         3+ violations or a single critical violation
 * - UNREVIEWED: trade has not been reviewed (wasReviewed = false)
 */
export function checkAdherence(
  trade: TradeRow,
  strategy: StrategyRow,
): AdherenceResult {
  if (!trade.wasReviewed) {
    return {
      status: "UNREVIEWED",
      violations: [],
      reasons: ["Trade has not been reviewed yet"],
    };
  }

  const violations = detectRiskViolations(trade, strategy);
  const reasons: string[] = [];

  // Positive reasons
  if (violations.length === 0) {
    if (strategy.setupTypes.length > 0 && trade.setupType) {
      reasons.push(`Setup type "${trade.setupType}" matches playbook`);
    }
    if (!strategy.riskRules?.noTradeWithoutStop || trade.stopPrice) {
      reasons.push("Stop-loss placed as required");
    }
    if (strategy.minimumRR && trade.pnlR !== null && trade.pnlR !== undefined) {
      reasons.push("Risk/reward ratio met strategy minimum");
    }
  }

  // Violation reasons
  for (const v of violations) {
    reasons.push(describeViolation(v));
  }

  let status: AdherenceStatus;

  // Critical violations immediately set status to NO
  const criticalViolations = [
    RiskViolationCode.REVENGE_TRADE,
    RiskViolationCode.NO_STOP_LOSS,
    RiskViolationCode.WRONG_MARKET,
  ];

  const hasCritical = violations.some((v) =>
    criticalViolations.includes(v as RiskViolationCode),
  );

  if (violations.length === 0) {
    status = "YES";
  } else if (hasCritical || violations.length >= 3) {
    status = "NO";
  } else {
    status = "PARTIAL";
  }

  return { status, violations, reasons };
}

// ---------------------------------------------------------------------------
// computeAdherenceScore
// ---------------------------------------------------------------------------

/**
 * Computes an overall adherence score (0–100) for a set of trades.
 *
 * Scoring:
 *   YES      = 100 points
 *   PARTIAL  = 50 points
 *   NO       = 0 points
 *   UNREVIEWED = excluded from calculation
 */
export function computeAdherenceScore(trades: TradeRow[]): number {
  const reviewed = trades.filter((t) => t.adherence !== "UNREVIEWED");
  if (reviewed.length === 0) return 0;

  const totalScore = reviewed.reduce((sum, t) => {
    if (t.adherence === "YES") return sum + 100;
    if (t.adherence === "PARTIAL") return sum + 50;
    return sum; // NO = 0
  }, 0);

  return Math.round(totalScore / reviewed.length);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatHHMM(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Returns true if time (HH:mm) is within [start, end] (handles midnight wrap). */
function isWithinTimeRange(time: string, start: string, end: string): boolean {
  if (start <= end) {
    return time >= start && time <= end;
  }
  // Midnight-crossing range e.g. "22:00" – "06:00"
  return time >= start || time <= end;
}

function describeViolation(code: string): string {
  const descriptions: Record<string, string> = {
    [RiskViolationCode.OUTSIDE_ALLOWED_HOURS]:
      "Trade entered outside allowed trading hours",
    [RiskViolationCode.BELOW_MINIMUM_RR]:
      "Planned risk/reward ratio is below the strategy minimum",
    [RiskViolationCode.NO_STOP_LOSS]:
      "Trade was taken without a stop-loss (required by playbook)",
    [RiskViolationCode.UNAPPROVED_SETUP]:
      "Setup type is not in the approved playbook setup list",
    [RiskViolationCode.WRONG_MARKET]:
      "Trade taken in a market not covered by this strategy",
    [RiskViolationCode.MAX_TRADES_EXCEEDED]:
      "Daily trade limit was exceeded",
    [RiskViolationCode.REVENGE_TRADE]:
      "Trade appears to be a revenge trade (emotion: REVENGE)",
    [RiskViolationCode.SIZE_INCREASE_AFTER_LOSS]:
      "Position size was increased after a losing trade",
    [RiskViolationCode.NO_TARGET]:
      "No target price set; unclear exit plan",
  };
  return descriptions[code] ?? `Unknown violation: ${code}`;
}
