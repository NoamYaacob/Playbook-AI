// ---------------------------------------------------------------------------
// AI Layer – Input / Output Types
//
// These types define the contract between the application layer and any AI
// provider implementation.  They are framework-agnostic and contain no
// provider-specific details.
// ---------------------------------------------------------------------------

import type { AdherenceStatus } from "@/types";

// ---------------------------------------------------------------------------
// Strategy Analysis
// ---------------------------------------------------------------------------

export interface StrategyAnalysisInput {
  /** Full strategy / playbook object as stored in the database. */
  strategy: object;
}

export interface StrategyAnalysisOutput {
  /**
   * A structured JSON representation of the strategy extracted / normalised
   * by the AI (e.g. setup rules, risk parameters, time filters).
   */
  structuredJson: object;
  /** One-paragraph plain-text summary of the strategy. */
  summary: string;
  /** Actionable improvement suggestions for the playbook (not trade signals). */
  suggestions: string[];
}

// ---------------------------------------------------------------------------
// Trade Analysis
// ---------------------------------------------------------------------------

export interface TradeAnalysisInput {
  /** Full trade record as stored in the database. */
  trade: object;
  /** The strategy the trade is being evaluated against. */
  strategy: object;
}

export interface TradeAnalysisOutput {
  /** Evaluated adherence status of the trade. */
  adherence: AdherenceStatus;
  /** Model confidence in the assessment, 0–1. */
  confidence: number;
  /** Human-readable explanation of the adherence verdict. */
  reasoning: string;
  /**
   * AI-classified setup type label (may match or differ from the user-supplied
   * setupType).
   */
  setupClassification: string;
  /**
   * Behaviour flags detected (e.g. "REVENGE_ENTRY", "EARLY_EXIT",
   * "OVERSIZE_POSITION").  These are educational observations only.
   */
  behaviorFlags: string[];
}

// ---------------------------------------------------------------------------
// Daily Review
// ---------------------------------------------------------------------------

export interface DailyReviewInput {
  /** Array of trade records for the day. */
  trades: object[];
  /** The active strategy. */
  strategy: object;
  /** ISO date string for the trading day being reviewed. */
  date: string;
}

export interface DailyReviewOutput {
  /** Educational summary paragraph for the trading day. */
  summary: string;
  /** Improvement suggestions focused on process, not on future trades. */
  improvementSuggestions: string;
  /** Repeated behavioural patterns observed across the day's trades. */
  patterns: string[];
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export interface InsightsInput {
  /** Array of historical trade records (may span many days). */
  trades: object[];
  /** The active strategy. */
  strategy: object;
  /**
   * Human-readable period label, e.g. "last 30 days" or "2024-Q1".
   * Used for contextualising the insight text.
   */
  period: string;
}

export interface InsightItem {
  /** Insight type code matching the InsightType enum. */
  type: string;
  /** Short title for the insight card. */
  title: string;
  /** Full body text (educational, not prescriptive). */
  body: string;
  /** Optional structured metadata attached to the insight. */
  metadata?: object;
}

export interface InsightsOutput {
  insights: InsightItem[];
}

// ---------------------------------------------------------------------------
// Setup Cluster Generation
// ---------------------------------------------------------------------------

export interface ClusterSetupInput {
  /**
   * Array of reviewed trade objects containing questionnaire answers:
   * whatDidYouSee, setupTrigger, setupType, emotionBefore, wasPlanned, etc.
   */
  trades: object[];
  /** Period label for context (e.g. "batch import 2024-Q1"). */
  period: string;
}

export interface ClusterSetupItem {
  /** Short human-readable name for the cluster (e.g. "Pre-market Breakouts"). */
  name: string;
  /** One-sentence description of the pattern. */
  description: string;
  /** Keywords extracted from the trade narratives. */
  keywords: string[];
  /** IDs of the trades that belong to this cluster. */
  tradeIds: string[];
  /** Win rate estimate (0–1) if enough data, otherwise null. */
  winRate: number | null;
  /** Average R-multiple if enough data, otherwise null. */
  avgR: number | null;
  /** The suggested setup label for the user to confirm or rename. */
  suggestedSetupType: string;
}

export interface ClusterSetupOutput {
  clusters: ClusterSetupItem[];
}

// ---------------------------------------------------------------------------
// Setup Cluster Suggestion (new structured form used by provider.interface)
// ---------------------------------------------------------------------------

export interface SetupClusterInput {
  trades: Array<{
    id: string;
    setupType?: string | null;
    whatDidYouSee?: string | null;
    setupTrigger?: string | null;
    whyTaken?: string | null;
    symbol: string;
    session?: string | null;
    pnlR?: number | null;
  }>;
}

export interface SetupClusterOutput {
  clusters: Array<{
    name: string;
    description: string;
    keywords: string[];
    tradeIds: string[];
    suggestedSetupType: string;
    winRateEstimate?: number;
  }>;
  summary: string;
}

// ---------------------------------------------------------------------------
// Extended Trade Analysis V2 (with matched/broken rules and coaching note)
// ---------------------------------------------------------------------------

/**
 * Extends TradeAnalysisOutput with rule-level detail and an educational
 * coaching note.
 *
 * All text output is reflective and educational only — no buy/sell signals,
 * no specific trade recommendations, no financial advice.
 */
export interface TradeAnalysisOutputV2 extends TradeAnalysisOutput {
  /** Strategy rules that the trade satisfied. */
  matchedRules: string[];
  /** Strategy rules that the trade violated. */
  brokenRules: string[];
  /**
   * Short (2-sentence) educational coaching note focused on process
   * adherence. References only the user's own defined strategy rules.
   */
  coachingNote: string;
}
