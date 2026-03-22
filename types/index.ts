// ---------------------------------------------------------------------------
// Playbook AI – Domain Types
//
// Enums are defined as plain TypeScript const objects (not Prisma imports) so
// they can be safely used in both server and client components.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ENUMS
// ---------------------------------------------------------------------------

export const Market = {
  FUTURES: "FUTURES",
  FOREX: "FOREX",
  STOCKS: "STOCKS",
  CRYPTO: "CRYPTO",
  OPTIONS: "OPTIONS",
} as const;
export type Market = (typeof Market)[keyof typeof Market];

export const AccountType = {
  PERSONAL: "PERSONAL",
  PROP_FIRM: "PROP_FIRM",
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const TradeSide = {
  LONG: "LONG",
  SHORT: "SHORT",
} as const;
export type TradeSide = (typeof TradeSide)[keyof typeof TradeSide];

export const AdherenceStatus = {
  YES: "YES",
  NO: "NO",
  PARTIAL: "PARTIAL",
  UNREVIEWED: "UNREVIEWED",
} as const;
export type AdherenceStatus =
  (typeof AdherenceStatus)[keyof typeof AdherenceStatus];

export const EmotionTag = {
  CONFIDENT: "CONFIDENT",
  ANXIOUS: "ANXIOUS",
  NEUTRAL: "NEUTRAL",
  FOMO: "FOMO",
  REVENGE: "REVENGE",
  GREEDY: "GREEDY",
  FEARFUL: "FEARFUL",
  DISCIPLINED: "DISCIPLINED",
  IMPULSIVE: "IMPULSIVE",
  PATIENT: "PATIENT",
} as const;
export type EmotionTag = (typeof EmotionTag)[keyof typeof EmotionTag];

export const ImportMethod = {
  CSV: "CSV",
  MANUAL: "MANUAL",
  SCREENSHOT: "SCREENSHOT",
  BROKER_INTEGRATION: "BROKER_INTEGRATION",
} as const;
export type ImportMethod = (typeof ImportMethod)[keyof typeof ImportMethod];

export const ImportStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type ImportStatus = (typeof ImportStatus)[keyof typeof ImportStatus];

export const GoalType = {
  IMPROVE_DISCIPLINE: "IMPROVE_DISCIPLINE",
  FIND_BEST_SETUPS: "FIND_BEST_SETUPS",
  REDUCE_REVENGE_TRADING: "REDUCE_REVENGE_TRADING",
  REDUCE_OVERTRADING: "REDUCE_OVERTRADING",
  IMPROVE_PLAYBOOK_ADHERENCE: "IMPROVE_PLAYBOOK_ADHERENCE",
  IMPROVE_WIN_RATE: "IMPROVE_WIN_RATE",
  IMPROVE_RISK_MANAGEMENT: "IMPROVE_RISK_MANAGEMENT",
} as const;
export type GoalType = (typeof GoalType)[keyof typeof GoalType];

export const InsightType = {
  ADHERENCE_SUMMARY: "ADHERENCE_SUMMARY",
  BEHAVIOR_PATTERN: "BEHAVIOR_PATTERN",
  SETUP_PERFORMANCE: "SETUP_PERFORMANCE",
  RISK_VIOLATION: "RISK_VIOLATION",
  COACHING_INSIGHT: "COACHING_INSIGHT",
  DAILY_SUMMARY: "DAILY_SUMMARY",
} as const;
export type InsightType = (typeof InsightType)[keyof typeof InsightType];

export const ScreenshotType = {
  BEFORE_ENTRY: "BEFORE_ENTRY",
  AFTER_EXIT: "AFTER_EXIT",
  MARKED_UP_CHART: "MARKED_UP_CHART",
  BROKER_SCREENSHOT: "BROKER_SCREENSHOT",
  HIGHER_TIMEFRAME: "HIGHER_TIMEFRAME",
  OTHER: "OTHER",
} as const;
export type ScreenshotType = (typeof ScreenshotType)[keyof typeof ScreenshotType];

export const PostImportReviewStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  SKIPPED: "SKIPPED",
} as const;
export type PostImportReviewStatus =
  (typeof PostImportReviewStatus)[keyof typeof PostImportReviewStatus];

// ---------------------------------------------------------------------------
// TRADE FILTERS
// ---------------------------------------------------------------------------

export interface TradeFilters {
  /** ISO date string – inclusive lower bound */
  dateFrom?: string;
  /** ISO date string – inclusive upper bound */
  dateTo?: string;
  symbol?: string;
  market?: Market;
  side?: TradeSide;
  setupType?: string;
  adherence?: AdherenceStatus;
  emotionBefore?: EmotionTag;
  strategyId?: string;
  isOpen?: boolean;
  /** Free-text search applied to symbol, setupType, whyTaken */
  search?: string;
  /** Pagination */
  page?: number;
  pageSize?: number;
  /** Sorting */
  sortBy?: keyof TradeRow;
  sortDir?: "asc" | "desc";
}

// ---------------------------------------------------------------------------
// TRADE ROW (lightweight projection used by tables & metrics functions)
// ---------------------------------------------------------------------------

export interface TradeRow {
  id: string;
  userId: string;
  strategyId?: string | null;
  importBatchId?: string | null;
  symbol: string;
  market: Market;
  side: TradeSide;
  entryAt: Date;
  exitAt?: Date | null;
  entryPrice: number;
  exitPrice?: number | null;
  stopPrice?: number | null;
  targetPrice?: number | null;
  size: number;
  fees?: number | null;
  pnlAmount?: number | null;
  pnlR?: number | null;
  session?: string | null;
  setupType?: string | null;
  isOpen: boolean;
  adherence: AdherenceStatus;
  adherenceNotes?: string | null;
  wasReviewed: boolean;
  whyTaken?: string | null;
  setupTrigger?: string | null;
  stopRationale?: string | null;
  targetRationale?: string | null;
  mistakeNotes?: string | null;
  lessonLearned?: string | null;
  emotionBefore?: EmotionTag | null;
  emotionAfter?: EmotionTag | null;
  riskViolations: string[];
  aiAdherence?: AdherenceStatus | null;
  aiConfidence?: number | null;
  aiReasoning?: string | null;
  aiSetupClassification?: string | null;
  aiAnalyzedAt?: Date | null;
  // Extended trade questionnaire fields
  whatDidYouSee?: string | null;
  wasPlanned?: boolean | null;
  wouldTakeAgain?: boolean | null;
  // AI rule evaluation results
  aiMatchedRules: string[];
  aiBrokenRules: string[];
  aiCoachingNote?: string | null;
  // Setup cluster assignment
  setupClusterId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// TRADE SCREENSHOT
// ---------------------------------------------------------------------------

export interface TradeScreenshotRow {
  id: string;
  tradeId: string;
  url: string;
  screenshotType: ScreenshotType;
  label?: string | null;
  notes?: string | null;
  sortOrder: number;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// SETUP CLUSTER
// ---------------------------------------------------------------------------

export interface SetupClusterRow {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  keywords: string[];
  tradeIds: string[];
  tradeCount: number;
  winRate?: number | null;
  avgR?: number | null;
  suggestedSetupType?: string | null;
  userConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// POST-IMPORT REVIEW SESSION
// ---------------------------------------------------------------------------

export interface PostImportReviewRow {
  id: string;
  userId: string;
  importBatchId: string;
  status: PostImportReviewStatus;
  totalTrades: number;
  sampleSize: number;
  reviewedCount: number;
  sampleTradeIds: string[];
  clustersGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// ADHERENCE ENGINE RESULT
// ---------------------------------------------------------------------------

export interface AdherenceEngineResult {
  status: AdherenceStatus;
  confidence: number;       // 0–1
  matchedRules: string[];   // rules from the strategy that were satisfied
  brokenRules: string[];    // rules from the strategy that were violated
  violations: string[];     // risk violation codes (e.g. NO_STOP_LOSS)
  coachingNote: string;     // short educational coaching paragraph
  reasons: string[];        // human-readable reason list
}

// ---------------------------------------------------------------------------
// SETUP PERFORMANCE
// ---------------------------------------------------------------------------

export interface SetupPerformance {
  setupType: string;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  breakEvenCount: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
  avgR: number;
  maxWin: number;
  maxLoss: number;
}

// ---------------------------------------------------------------------------
// HOUR-OF-DAY PERFORMANCE
// ---------------------------------------------------------------------------

export interface HourPerformance {
  hour: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
}

// ---------------------------------------------------------------------------
// DASHBOARD STATS
// ---------------------------------------------------------------------------

export interface DashboardStats {
  totalTrades: number;
  openTrades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgR: number;
  adherenceScore: number;
  disciplineScore: number;
  bestSetup: string | null;
  worstSetup: string | null;
  streakCurrent: number;
  streakBest: number;
  /** Equity curve data points { date: ISO string; equity: number } */
  equityCurve: Array<{ date: string; equity: number }>;
  /** R-distribution bucket counts */
  rDistribution: Array<{ bucket: string; count: number }>;
  recentTrades: TradeRow[];
}

// ---------------------------------------------------------------------------
// TRADE METRICS (full computed metrics for a set of trades)
// ---------------------------------------------------------------------------

export interface TradeMetrics {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  breakEvenCount: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
  avgR: number;
  maxWin: number;
  maxLoss: number;
  bestSetup: string | null;
  worstSetup: string | null;
  adherenceScore: number;
  disciplineScore: number;
  profitFactor: number;
  expectancy: number;
  setupBreakdown: SetupPerformance[];
  hourBreakdown: HourPerformance[];
}

// ---------------------------------------------------------------------------
// STRATEGY (lightweight client-side representation)
// ---------------------------------------------------------------------------

export interface StrategyRow {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  isArchived: boolean;
  markets: Market[];
  preferredSymbols: string[];
  timeframes: string[];
  tradingSessions: string[];
  allowedHoursStart?: string | null;
  allowedHoursEnd?: string | null;
  forbiddenHours?: unknown;
  setupTypes: string[];
  entryConditions?: string | null;
  invalidationConditions?: string | null;
  stopLogic?: string | null;
  targetLogic?: string | null;
  noTradeConditions?: string | null;
  minimumRR?: number | null;
  maxTradesPerDay?: number | null;
  maxDailyLoss?: number | null;
  maxDailyLossPct?: number | null;
  riskRules?: RiskRules | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// RISK RULES (structured subset of Strategy.riskRules JSON)
// ---------------------------------------------------------------------------

export interface RiskRules {
  noRevengeTrades?: boolean;
  minLossesBeforePause?: number;
  noSizeIncreaseAfterLoss?: boolean;
  noTradeWithoutStop?: boolean;
}

// ---------------------------------------------------------------------------
// INSIGHT SNAPSHOT
// ---------------------------------------------------------------------------

export interface InsightSnapshotRow {
  id: string;
  userId: string;
  type: InsightType;
  period?: string | null;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// DAILY REVIEW
// ---------------------------------------------------------------------------

export interface DailyReviewRow {
  id: string;
  userId: string;
  date: Date;
  tradeCount: number;
  adherentCount: number;
  violationCount: number;
  pnlAmount?: number | null;
  pnlR?: number | null;
  winCount: number;
  lossCount: number;
  breakEvenCount: number;
  topMistakes: string[];
  emotionalState?: string | null;
  marketContext?: string | null;
  userNotes?: string | null;
  tomorrowPlan?: string | null;
  aiSummary?: string | null;
  aiImprovementSuggestions?: string | null;
  aiGeneratedAt?: Date | null;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// API RESPONSE WRAPPERS
// ---------------------------------------------------------------------------

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// ---------------------------------------------------------------------------
// CHART DATA TYPES
// ---------------------------------------------------------------------------

export interface AdherenceOverTimePoint {
  date: string;          // YYYY-MM-DD
  adherenceScore: number; // 0–100
  tradeCount: number;
}

export interface PnlBySetupPoint {
  setupType: string;
  totalPnl: number;
  avgPnl: number;
  avgR: number;
  winRate: number;
  tradeCount: number;
}

export interface AvgRByHourPoint {
  hour: number;          // 0–23
  avgR: number;
  tradeCount: number;
  winRate: number;
}

export interface OffPlanByDayPoint {
  dayOfWeek: number;     // 0=Sun … 6=Sat
  dayLabel: string;      // "Monday", etc.
  offPlanCount: number;
  totalCount: number;
  offPlanRate: number;
}

export interface EmotionOutcomePoint {
  emotion: EmotionTag;
  avgPnl: number;
  avgR: number;
  winRate: number;
  tradeCount: number;
}

export interface TopImprovement {
  rank: number;
  title: string;
  description: string;
  metric?: string;  // e.g. "−2.4R avg on FOMO trades"
  type: "behavior" | "setup" | "risk" | "timing";
}
