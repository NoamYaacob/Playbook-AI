// ---------------------------------------------------------------------------
// Chart Data Utilities
//
// Pure functions that transform TradeRow arrays into chart-ready data for
// all dashboard charts. No database access — pure data transformation only.
// ---------------------------------------------------------------------------

import type {
  TradeRow,
  AdherenceOverTimePoint,
  PnlBySetupPoint,
  AvgRByHourPoint,
  OffPlanByDayPoint,
  EmotionOutcomePoint,
  EmotionTag,
} from "@/types";
import { computeAdherenceScore } from "@/lib/utils/adherence";

// ---------------------------------------------------------------------------
// computeAdherenceOverTime
// ---------------------------------------------------------------------------

/**
 * Groups trades by calendar date, computes a daily adherence score (0–100)
 * using the same weighted formula as computeAdherenceScore, and returns the
 * results sorted chronologically.
 *
 * @param trades    Full trade array (open or closed).
 * @param windowDays  Optional: only include dates from the last N days.
 */
export function computeAdherenceOverTime(
  trades: TradeRow[],
  windowDays?: number,
): AdherenceOverTimePoint[] {
  if (trades.length === 0) return [];

  // Optional time window filter
  let filtered = trades;
  if (windowDays !== undefined && windowDays > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);
    filtered = trades.filter((t) => new Date(t.entryAt) >= cutoff);
  }

  if (filtered.length === 0) return [];

  // Group by YYYY-MM-DD
  const byDate = new Map<string, TradeRow[]>();
  for (const trade of filtered) {
    const dateKey = toDateKey(new Date(trade.entryAt));
    const existing = byDate.get(dateKey) ?? [];
    existing.push(trade);
    byDate.set(dateKey, existing);
  }

  // Build sorted output
  const result: AdherenceOverTimePoint[] = [];
  const sortedDates = [...byDate.keys()].sort();

  for (const date of sortedDates) {
    const dayTrades = byDate.get(date)!;
    result.push({
      date,
      adherenceScore: computeAdherenceScore(dayTrades),
      tradeCount: dayTrades.length,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// computePnlBySetup
// ---------------------------------------------------------------------------

/**
 * Groups closed trades by their setupType and computes aggregate performance
 * metrics for each setup. Trades without a setupType are grouped under "(unclassified)".
 * Results are sorted by totalPnl descending.
 */
export function computePnlBySetup(trades: TradeRow[]): PnlBySetupPoint[] {
  const closedTrades = trades.filter((t) => !t.isOpen);
  if (closedTrades.length === 0) return [];

  const bySetup = new Map<string, TradeRow[]>();

  for (const trade of closedTrades) {
    const key = trade.setupType ?? "(unclassified)";
    const existing = bySetup.get(key) ?? [];
    existing.push(trade);
    bySetup.set(key, existing);
  }

  const result: PnlBySetupPoint[] = [];

  for (const [setupType, group] of bySetup) {
    const totalPnl = group.reduce((sum, t) => sum + (t.pnlAmount ?? 0), 0);
    const avgPnl = totalPnl / group.length;

    const rValues = group.filter((t) => t.pnlR !== null && t.pnlR !== undefined);
    const avgR =
      rValues.length > 0
        ? rValues.reduce((sum, t) => sum + (t.pnlR ?? 0), 0) / rValues.length
        : 0;

    const wins = group.filter(
      (t) => t.pnlAmount !== null && t.pnlAmount !== undefined && t.pnlAmount > 0,
    ).length;
    const winRate = group.length > 0 ? wins / group.length : 0;

    result.push({
      setupType,
      totalPnl,
      avgPnl,
      avgR,
      winRate,
      tradeCount: group.length,
    });
  }

  // Sort by totalPnl descending (best setup first)
  result.sort((a, b) => b.totalPnl - a.totalPnl);

  return result;
}

// ---------------------------------------------------------------------------
// computeAvgRByHour
// ---------------------------------------------------------------------------

/**
 * Groups trades by hour of entry (0–23) and computes average R-multiple,
 * win rate, and trade count for each hour. Only hours with at least one trade
 * are returned.
 */
export function computeAvgRByHour(trades: TradeRow[]): AvgRByHourPoint[] {
  if (trades.length === 0) return [];

  const byHour = new Map<number, TradeRow[]>();

  for (const trade of trades) {
    const hour = new Date(trade.entryAt).getHours();
    const existing = byHour.get(hour) ?? [];
    existing.push(trade);
    byHour.set(hour, existing);
  }

  const result: AvgRByHourPoint[] = [];

  for (const [hour, group] of byHour) {
    const rValues = group.filter((t) => t.pnlR !== null && t.pnlR !== undefined);
    const avgR =
      rValues.length > 0
        ? rValues.reduce((sum, t) => sum + (t.pnlR ?? 0), 0) / rValues.length
        : 0;

    const wins = group.filter(
      (t) => t.pnlR !== null && t.pnlR !== undefined && (t.pnlR ?? 0) > 0,
    ).length;
    const winRate = group.length > 0 ? wins / group.length : 0;

    result.push({
      hour,
      avgR,
      tradeCount: group.length,
      winRate,
    });
  }

  // Sort by hour ascending
  result.sort((a, b) => a.hour - b.hour);

  return result;
}

// ---------------------------------------------------------------------------
// computeOffPlanByDay
// ---------------------------------------------------------------------------

const DAY_LABELS: readonly string[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Groups trades by day of week (0=Sunday…6=Saturday) and counts how many had
 * an adherence status of "NO" (off-plan). Returns 7 data points — one per day —
 * including days with zero trades.
 */
export function computeOffPlanByDay(trades: TradeRow[]): OffPlanByDayPoint[] {
  // Initialise all 7 days
  const byDay: Array<{ total: number; offPlan: number }> = Array.from(
    { length: 7 },
    () => ({ total: 0, offPlan: 0 }),
  );

  for (const trade of trades) {
    const dow = new Date(trade.entryAt).getDay(); // 0–6
    byDay[dow].total += 1;
    if (trade.adherence === "NO") {
      byDay[dow].offPlan += 1;
    }
  }

  return byDay.map((entry, dayOfWeek) => ({
    dayOfWeek,
    dayLabel: DAY_LABELS[dayOfWeek] ?? String(dayOfWeek),
    offPlanCount: entry.offPlan,
    totalCount: entry.total,
    offPlanRate: entry.total > 0 ? entry.offPlan / entry.total : 0,
  }));
}

// ---------------------------------------------------------------------------
// computeEmotionOutcome
// ---------------------------------------------------------------------------

/**
 * Groups trades by pre-trade emotion and computes average PnL, average R-multiple,
 * and win rate for each. Only emotions with at least 2 trades are included to
 * reduce noise from single-sample data points.
 */
export function computeEmotionOutcome(trades: TradeRow[]): EmotionOutcomePoint[] {
  if (trades.length === 0) return [];

  const closedTrades = trades.filter(
    (t) =>
      !t.isOpen &&
      t.emotionBefore !== null &&
      t.emotionBefore !== undefined,
  );

  if (closedTrades.length === 0) return [];

  const byEmotion = new Map<EmotionTag, TradeRow[]>();

  for (const trade of closedTrades) {
    const emotion = trade.emotionBefore as EmotionTag;
    const existing = byEmotion.get(emotion) ?? [];
    existing.push(trade);
    byEmotion.set(emotion, existing);
  }

  const result: EmotionOutcomePoint[] = [];

  for (const [emotion, group] of byEmotion) {
    // Only include emotions with at least 2 trades
    if (group.length < 2) continue;

    const avgPnl =
      group.reduce((sum, t) => sum + (t.pnlAmount ?? 0), 0) / group.length;

    const rValues = group.filter((t) => t.pnlR !== null && t.pnlR !== undefined);
    const avgR =
      rValues.length > 0
        ? rValues.reduce((sum, t) => sum + (t.pnlR ?? 0), 0) / rValues.length
        : 0;

    const wins = group.filter(
      (t) => t.pnlAmount !== null && t.pnlAmount !== undefined && t.pnlAmount > 0,
    ).length;
    const winRate = group.length > 0 ? wins / group.length : 0;

    result.push({
      emotion,
      avgPnl,
      avgR,
      winRate,
      tradeCount: group.length,
    });
  }

  // Sort by tradeCount descending for consistent display
  result.sort((a, b) => b.tradeCount - a.tradeCount);

  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
