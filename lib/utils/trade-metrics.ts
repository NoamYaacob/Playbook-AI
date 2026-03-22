// ---------------------------------------------------------------------------
// Trade Metrics – Pure Computation Functions
//
// All functions are pure, strongly typed, and have no side effects.
// They operate on TradeRow arrays (the lightweight projection type).
// ---------------------------------------------------------------------------

import type {
  TradeRow,
  TradeMetrics,
  SetupPerformance,
  HourPerformance,
  StrategyRow,
} from "@/types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isWin(trade: TradeRow): boolean {
  if (trade.pnlAmount !== null && trade.pnlAmount !== undefined) {
    return trade.pnlAmount > 0;
  }
  if (trade.pnlR !== null && trade.pnlR !== undefined) {
    return trade.pnlR > 0;
  }
  return false;
}

function isLoss(trade: TradeRow): boolean {
  if (trade.pnlAmount !== null && trade.pnlAmount !== undefined) {
    return trade.pnlAmount < 0;
  }
  if (trade.pnlR !== null && trade.pnlR !== undefined) {
    return trade.pnlR < 0;
  }
  return false;
}

function isBreakEven(trade: TradeRow): boolean {
  return !isWin(trade) && !isLoss(trade) && !trade.isOpen;
}

function getPnl(trade: TradeRow): number {
  return trade.pnlAmount ?? 0;
}

function getR(trade: TradeRow): number {
  return trade.pnlR ?? 0;
}

// ---------------------------------------------------------------------------
// computeMetrics
// ---------------------------------------------------------------------------

/**
 * Computes aggregate performance metrics for a set of closed trades.
 * Open trades are excluded from P&L-based metrics.
 */
export function computeMetrics(trades: TradeRow[]): TradeMetrics {
  const closedTrades = trades.filter((t) => !t.isOpen);
  const totalTrades = closedTrades.length;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      breakEvenCount: 0,
      winRate: 0,
      avgPnl: 0,
      totalPnl: 0,
      avgR: 0,
      maxWin: 0,
      maxLoss: 0,
      bestSetup: null,
      worstSetup: null,
      adherenceScore: 0,
      disciplineScore: 0,
      profitFactor: 0,
      expectancy: 0,
      setupBreakdown: [],
      hourBreakdown: [],
    };
  }

  const winCount = closedTrades.filter(isWin).length;
  const lossCount = closedTrades.filter(isLoss).length;
  const breakEvenCount = closedTrades.filter(isBreakEven).length;
  const winRate = totalTrades > 0 ? winCount / totalTrades : 0;

  const pnlValues = closedTrades.map(getPnl);
  const totalPnl = pnlValues.reduce((sum, v) => sum + v, 0);
  const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

  const rValues = closedTrades.map(getR);
  const totalR = rValues.reduce((sum, v) => sum + v, 0);
  const avgR = totalTrades > 0 ? totalR / totalTrades : 0;

  const maxWin = Math.max(...pnlValues, 0);
  const maxLoss = Math.min(...pnlValues, 0);

  // Profit factor: gross wins / |gross losses|
  const grossWins = pnlValues.filter((v) => v > 0).reduce((s, v) => s + v, 0);
  const grossLosses = Math.abs(
    pnlValues.filter((v) => v < 0).reduce((s, v) => s + v, 0),
  );
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  // Expectancy: (winRate * avgWin) - (lossRate * avgLoss)
  const avgWin = winCount > 0 ? grossWins / winCount : 0;
  const avgLoss = lossCount > 0 ? grossLosses / lossCount : 0;
  const lossRate = totalTrades > 0 ? lossCount / totalTrades : 0;
  const expectancy = winRate * avgWin - lossRate * avgLoss;

  // Setup breakdown
  const setupBreakdown = groupBySetup(closedTrades);

  // Best / worst setups by avgR
  let bestSetup: string | null = null;
  let worstSetup: string | null = null;
  if (setupBreakdown.length > 0) {
    const sorted = [...setupBreakdown].sort((a, b) => b.avgR - a.avgR);
    bestSetup = sorted[0].setupType;
    worstSetup = sorted[sorted.length - 1].setupType;
  }

  // Adherence score
  const adherenceScore = computeAdherenceScoreFromTrades(trades);

  // Discipline score: % of trades that have no risk violations
  const totalReviewed = closedTrades.filter((t) => t.wasReviewed).length;
  const disciplineScore =
    totalReviewed > 0
      ? (closedTrades.filter(
          (t) => t.wasReviewed && t.riskViolations.length === 0,
        ).length /
          totalReviewed) *
        100
      : 0;

  const hourBreakdown = groupByHour(closedTrades);

  return {
    totalTrades,
    winCount,
    lossCount,
    breakEvenCount,
    winRate,
    avgPnl,
    totalPnl,
    avgR,
    maxWin,
    maxLoss,
    bestSetup,
    worstSetup,
    adherenceScore,
    disciplineScore,
    profitFactor,
    expectancy,
    setupBreakdown,
    hourBreakdown,
  };
}

// ---------------------------------------------------------------------------
// groupBySetup
// ---------------------------------------------------------------------------

/**
 * Groups trades by their setupType and returns performance stats for each.
 * Trades with no setupType are grouped under the key "(unclassified)".
 */
export function groupBySetup(trades: TradeRow[]): SetupPerformance[] {
  const map = new Map<string, TradeRow[]>();

  for (const trade of trades) {
    const key = trade.setupType?.trim() || "(unclassified)";
    const bucket = map.get(key) ?? [];
    bucket.push(trade);
    map.set(key, bucket);
  }

  return Array.from(map.entries()).map(([setupType, bucket]) => {
    const totalTrades = bucket.length;
    const winCount = bucket.filter(isWin).length;
    const lossCount = bucket.filter(isLoss).length;
    const breakEvenCount = bucket.filter(isBreakEven).length;
    const winRate = totalTrades > 0 ? winCount / totalTrades : 0;

    const pnlValues = bucket.map(getPnl);
    const totalPnl = pnlValues.reduce((s, v) => s + v, 0);
    const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

    const rValues = bucket.map(getR);
    const totalR = rValues.reduce((s, v) => s + v, 0);
    const avgR = totalTrades > 0 ? totalR / totalTrades : 0;

    const maxWin = Math.max(...pnlValues, 0);
    const maxLoss = Math.min(...pnlValues, 0);

    return {
      setupType,
      totalTrades,
      winCount,
      lossCount,
      breakEvenCount,
      winRate,
      avgPnl,
      totalPnl,
      avgR,
      maxWin,
      maxLoss,
    };
  });
}

// ---------------------------------------------------------------------------
// groupByHour
// ---------------------------------------------------------------------------

/**
 * Groups trades by the local hour of their entryAt timestamp and returns
 * performance stats per hour (0-23).
 */
export function groupByHour(trades: TradeRow[]): HourPerformance[] {
  const map = new Map<number, TradeRow[]>();

  for (const trade of trades) {
    const hour = new Date(trade.entryAt).getHours();
    const bucket = map.get(hour) ?? [];
    bucket.push(trade);
    map.set(hour, bucket);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, bucket]) => {
      const totalTrades = bucket.length;
      const winCount = bucket.filter(isWin).length;
      const lossCount = bucket.filter(isLoss).length;
      const winRate = totalTrades > 0 ? winCount / totalTrades : 0;

      const pnlValues = bucket.map(getPnl);
      const totalPnl = pnlValues.reduce((s, v) => s + v, 0);
      const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

      return { hour, totalTrades, winCount, lossCount, winRate, avgPnl, totalPnl };
    });
}

// ---------------------------------------------------------------------------
// computeRiskScore
// ---------------------------------------------------------------------------

/**
 * Returns a 0-100 risk score for a set of trades against a strategy.
 *
 * Higher = more risk violations detected.
 * Score is weighted by frequency and severity of violations.
 */
export function computeRiskScore(
  trades: TradeRow[],
  strategy: Pick<
    StrategyRow,
    "minimumRR" | "maxTradesPerDay" | "maxDailyLoss" | "maxDailyLossPct" | "riskRules"
  >,
): number {
  if (trades.length === 0) return 0;

  let penaltyPoints = 0;

  for (const trade of trades) {
    // Each risk violation recorded on the trade = 10 penalty points
    penaltyPoints += trade.riskViolations.length * 10;

    // Missing stop when required
    if (strategy.riskRules?.noTradeWithoutStop && !trade.stopPrice) {
      penaltyPoints += 15;
    }

    // Below minimum R:R
    if (
      strategy.minimumRR !== null &&
      strategy.minimumRR !== undefined &&
      trade.pnlR !== null &&
      trade.pnlR !== undefined
    ) {
      const plannedRR =
        trade.stopPrice && trade.targetPrice && trade.entryPrice
          ? Math.abs(trade.targetPrice - trade.entryPrice) /
            Math.abs(trade.entryPrice - trade.stopPrice)
          : null;
      if (plannedRR !== null && plannedRR < strategy.minimumRR) {
        penaltyPoints += 8;
      }
    }
  }

  const maxPossiblePenalty = trades.length * 33; // ~3 violations at max weight each
  const rawScore = Math.min(penaltyPoints / maxPossiblePenalty, 1) * 100;
  return Math.round(rawScore);
}

// ---------------------------------------------------------------------------
// Internal adherence helper (used by computeMetrics)
// ---------------------------------------------------------------------------

function computeAdherenceScoreFromTrades(trades: TradeRow[]): number {
  const reviewed = trades.filter((t) => t.adherence !== "UNREVIEWED");
  if (reviewed.length === 0) return 0;

  const yesWeight = 1.0;
  const partialWeight = 0.5;
  const noWeight = 0.0;

  const totalScore = reviewed.reduce((sum, t) => {
    if (t.adherence === "YES") return sum + yesWeight;
    if (t.adherence === "PARTIAL") return sum + partialWeight;
    return sum + noWeight; // NO
  }, 0);

  return Math.round((totalScore / reviewed.length) * 100);
}
