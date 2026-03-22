// ---------------------------------------------------------------------------
// Display Formatting Utilities
//
// Human-readable labels, emoji mappings, and CSS colour classes for domain
// enum values.  All functions are pure and synchronous.
// ---------------------------------------------------------------------------

import type {
  AdherenceStatus,
  EmotionTag,
  Market,
  TradeSide,
} from "@/types";
import { RiskViolationCode } from "@/lib/utils/adherence";

// ---------------------------------------------------------------------------
// formatAdherence
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable label for an AdherenceStatus value.
 */
export function formatAdherence(status: AdherenceStatus): string {
  const labels: Record<AdherenceStatus, string> = {
    YES: "Followed Playbook",
    NO: "Broke Playbook",
    PARTIAL: "Partial Adherence",
    UNREVIEWED: "Not Reviewed",
  };
  return labels[status] ?? status;
}

// ---------------------------------------------------------------------------
// formatAdherenceBadge
// ---------------------------------------------------------------------------

/**
 * Returns a Tailwind CSS class string suitable for a badge/chip that colours
 * the badge based on adherence status.
 */
export function formatAdherenceBadgeClass(status: AdherenceStatus): string {
  const classes: Record<AdherenceStatus, string> = {
    YES: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    NO: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    PARTIAL:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    UNREVIEWED:
      "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  };
  return classes[status] ?? "";
}

// ---------------------------------------------------------------------------
// formatEmotion
// ---------------------------------------------------------------------------

/**
 * Returns an emoji + human label for an EmotionTag value.
 * E.g. CONFIDENT → "💪 Confident"
 */
export function formatEmotion(tag: EmotionTag): string {
  const map: Record<EmotionTag, string> = {
    CONFIDENT: "💪 Confident",
    ANXIOUS: "😰 Anxious",
    NEUTRAL: "😐 Neutral",
    FOMO: "😱 FOMO",
    REVENGE: "😤 Revenge",
    GREEDY: "🤑 Greedy",
    FEARFUL: "😨 Fearful",
    DISCIPLINED: "🧘 Disciplined",
    IMPULSIVE: "⚡ Impulsive",
    PATIENT: "🕰️ Patient",
  };
  return map[tag] ?? tag;
}

// ---------------------------------------------------------------------------
// formatMarket
// ---------------------------------------------------------------------------

/**
 * Returns the display label for a Market value.
 */
export function formatMarket(market: Market): string {
  const labels: Record<Market, string> = {
    FUTURES: "Futures",
    FOREX: "Forex",
    STOCKS: "Stocks",
    CRYPTO: "Crypto",
    OPTIONS: "Options",
  };
  return labels[market] ?? market;
}

// ---------------------------------------------------------------------------
// formatSide
// ---------------------------------------------------------------------------

export interface SideDisplay {
  label: string;
  /** Tailwind CSS text colour class */
  colorClass: string;
}

/**
 * Returns a human label and a Tailwind text-colour class for a TradeSide
 * value.
 *
 * LONG → { label: "Long",  colorClass: "text-green-600 dark:text-green-400" }
 * SHORT→ { label: "Short", colorClass: "text-red-600 dark:text-red-400" }
 */
export function formatSide(side: TradeSide): SideDisplay {
  if (side === "LONG") {
    return {
      label: "Long",
      colorClass: "text-green-600 dark:text-green-400",
    };
  }
  return {
    label: "Short",
    colorClass: "text-red-600 dark:text-red-400",
  };
}

// ---------------------------------------------------------------------------
// formatRiskViolation
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable description for a risk violation code string.
 * Falls back to the raw code if no description is registered.
 */
export function formatRiskViolation(code: string): string {
  const descriptions: Record<string, string> = {
    [RiskViolationCode.OUTSIDE_ALLOWED_HOURS]:
      "Traded outside allowed hours",
    [RiskViolationCode.BELOW_MINIMUM_RR]:
      "R:R ratio below playbook minimum",
    [RiskViolationCode.NO_STOP_LOSS]:
      "No stop-loss placed (required by playbook)",
    [RiskViolationCode.UNAPPROVED_SETUP]:
      "Setup type not in approved playbook list",
    [RiskViolationCode.WRONG_MARKET]:
      "Market not covered by this strategy",
    [RiskViolationCode.MAX_TRADES_EXCEEDED]:
      "Daily trade count limit exceeded",
    [RiskViolationCode.REVENGE_TRADE]:
      "Revenge trade detected",
    [RiskViolationCode.SIZE_INCREASE_AFTER_LOSS]:
      "Position size increased after a loss",
    [RiskViolationCode.NO_TARGET]:
      "No target / take-profit price set",
  };

  return descriptions[code] ?? `Violation: ${code}`;
}

// ---------------------------------------------------------------------------
// formatPnl
// ---------------------------------------------------------------------------

/**
 * Returns a coloured CSS class and a sign-prefixed string for a P&L amount.
 */
export interface PnlDisplay {
  label: string;
  colorClass: string;
}

export function formatPnlDisplay(pnl: number | null | undefined): PnlDisplay {
  if (pnl === null || pnl === undefined) {
    return { label: "—", colorClass: "text-muted-foreground" };
  }
  if (pnl > 0) {
    return {
      label: `+$${pnl.toFixed(2)}`,
      colorClass: "text-green-600 dark:text-green-400",
    };
  }
  if (pnl < 0) {
    return {
      label: `-$${Math.abs(pnl).toFixed(2)}`,
      colorClass: "text-red-600 dark:text-red-400",
    };
  }
  return { label: "$0.00", colorClass: "text-muted-foreground" };
}
