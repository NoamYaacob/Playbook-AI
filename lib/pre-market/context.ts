import { db } from "@/lib/db";

type StrategyRiskRules = {
  noRevengeTrades?: boolean;
  minLossesBeforePause?: number;
  noSizeIncreaseAfterLoss?: boolean;
  noTradeWithoutStop?: boolean;
} | null;

type ForbiddenHourRange = {
  start: string;
  end: string;
};

export type PreMarketChecklistItem = {
  title: string;
  detail: string;
  tone: "required" | "focus" | "carry-forward" | "placeholder";
};

export type PlaceholderAnalysisModule = {
  id: string;
  title: string;
  status: "placeholder";
  summary: string;
  futureSource: string;
};

export type PreMarketContext = {
  dateLabel: string;
  timezone: string;
  activeStrategy: {
    id: string;
    title: string;
    description: string | null;
    markets: string[];
    preferredSymbols: string[];
    timeframes: string[];
    tradingSessions: string[];
    allowedHoursStart: string | null;
    allowedHoursEnd: string | null;
    forbiddenHours: ForbiddenHourRange[];
    setupTypes: string[];
    entryConditions: string | null;
    invalidationConditions: string | null;
    stopLogic: string | null;
    targetLogic: string | null;
    noTradeConditions: string | null;
    minimumRR: number | null;
    maxTradesPerDay: number | null;
    maxDailyLoss: number | null;
    maxDailyLossPct: number | null;
    riskRules: StrategyRiskRules;
    notes: string | null;
  } | null;
  checklist: PreMarketChecklistItem[];
  todayContext: {
    carryForwardPlan: string | null;
    lastReviewSummary: string | null;
    topMistakes: string[];
    recentAdherenceRate: number | null;
    recentRiskViolations: string[];
  };
  placeholderModules: PlaceholderAnalysisModule[];
};

function buildDateLabel(language: string, timezone: string): string {
  return new Intl.DateTimeFormat(language || "en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone || "UTC",
  }).format(new Date());
}

function normalizeTextList(value: string | null | undefined): string[] {
  if (!value) return [];

  return value
    .split(/\n|;|•|-/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function formatCurrency(value: number | null): string | null {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function getPreMarketContext(userId: string): Promise<PreMarketContext> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      language: true,
      timezone: true,
      strategies: {
        where: { isActive: true, isArchived: false },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          title: true,
          description: true,
          markets: true,
          preferredSymbols: true,
          timeframes: true,
          tradingSessions: true,
          allowedHoursStart: true,
          allowedHoursEnd: true,
          forbiddenHours: true,
          setupTypes: true,
          entryConditions: true,
          invalidationConditions: true,
          stopLogic: true,
          targetLogic: true,
          noTradeConditions: true,
          minimumRR: true,
          maxTradesPerDay: true,
          maxDailyLoss: true,
          maxDailyLossPct: true,
          riskRules: true,
          notes: true,
        },
      },
      dailyReviews: {
        where: { isCompleted: true },
        orderBy: { date: "desc" },
        take: 1,
        select: {
          tomorrowPlan: true,
          aiSummary: true,
          topMistakes: true,
        },
      },
      trades: {
        orderBy: { entryAt: "desc" },
        take: 20,
        select: {
          adherence: true,
          riskViolations: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const activeStrategy = user.strategies[0] ?? null;
  const latestReview = user.dailyReviews[0] ?? null;
  const reviewedTrades = user.trades.filter((trade) => trade.adherence !== "UNREVIEWED");
  const recentAdherenceRate =
    reviewedTrades.length > 0
      ? Math.round(
          (reviewedTrades.filter((trade) => trade.adherence === "YES").length / reviewedTrades.length) * 100,
        )
      : null;

  const recentRiskViolations = Array.from(
    new Set(user.trades.flatMap((trade) => trade.riskViolations).filter(Boolean)),
  ).slice(0, 4);

  const forbiddenHours = (activeStrategy?.forbiddenHours as ForbiddenHourRange[] | null) ?? [];
  const riskRules = (activeStrategy?.riskRules as StrategyRiskRules) ?? null;

  const checklist: PreMarketChecklistItem[] = activeStrategy
    ? [
        {
          title: "Re-center on today's playbook",
          detail: `Anchor on "${activeStrategy.title}" and review the approved setups before the session opens.`,
          tone: "required",
        },
        {
          title: "Confirm your trading window",
          detail:
            activeStrategy.allowedHoursStart && activeStrategy.allowedHoursEnd
              ? `Primary trading window is ${activeStrategy.allowedHoursStart}–${activeStrategy.allowedHoursEnd}. Anything outside that window should start from a no-trade stance.`
              : "No explicit allowed-hours rule is defined yet, so review your session boundaries manually before trading.",
          tone: "required",
        },
        {
          title: "Review your no-trade triggers",
          detail:
            activeStrategy.noTradeConditions?.trim() ||
            (forbiddenHours.length > 0
              ? `Avoid the explicitly blocked time windows: ${forbiddenHours
                  .map((range) => `${range.start}–${range.end}`)
                  .join(", ")}.`
              : "No explicit no-trade text is defined yet, so use your risk rules and setup invalidation logic as the default filter."),
          tone: "focus",
        },
        {
          title: "Restate your daily loss limits",
          detail:
            [
              activeStrategy.maxDailyLoss !== null ? formatCurrency(activeStrategy.maxDailyLoss) : null,
              activeStrategy.maxDailyLossPct !== null ? `${activeStrategy.maxDailyLossPct}% max loss` : null,
              activeStrategy.maxTradesPerDay !== null ? `${activeStrategy.maxTradesPerDay} trades max` : null,
            ]
              .filter(Boolean)
              .join(" • ") || "No explicit daily cap is defined yet. Review your risk ceiling before the open.",
          tone: "required",
        },
        {
          title: "Carry forward your last review",
          detail:
            latestReview?.tomorrowPlan?.trim() ||
            latestReview?.aiSummary?.trim() ||
            "No completed daily review was found to carry forward, so note your main focus manually before you begin.",
          tone: latestReview ? "carry-forward" : "placeholder",
        },
      ]
    : [
        {
          title: "Build an active playbook first",
          detail: "This page becomes useful once you have at least one active strategy with time, setup, and risk rules.",
          tone: "placeholder",
        },
      ];

  return {
    dateLabel: buildDateLabel(user.language, user.timezone),
    timezone: user.timezone,
    activeStrategy: activeStrategy
      ? {
          ...activeStrategy,
          forbiddenHours,
          riskRules,
        }
      : null,
    checklist,
    todayContext: {
      carryForwardPlan: latestReview?.tomorrowPlan ?? null,
      lastReviewSummary: latestReview?.aiSummary ?? null,
      topMistakes: latestReview?.topMistakes ?? [],
      recentAdherenceRate,
      recentRiskViolations,
    },
    placeholderModules: [
      {
        id: "overnight-structure",
        title: "Overnight structure snapshot",
        status: "placeholder",
        summary: "Reserved for future overnight range, gap, and prior-session context. For now, add your own notes before the open.",
        futureSource: "Market-data adapter + manual user notes",
      },
      {
        id: "macro-calendar",
        title: "Event and catalyst monitor",
        status: "placeholder",
        summary: "Reserved for future economic calendar and scheduled catalyst awareness. No live events are pulled yet.",
        futureSource: "Calendar feed integration",
      },
      {
        id: "scenario-map",
        title: "Scenario map against your playbook",
        status: "placeholder",
        summary: "Reserved for future structured scenario framing that compares incoming market conditions against your own setup rules.",
        futureSource: "Market-data adapter + rules engine",
      },
    ],
  };
}

export function buildConditionItems(value: string | null | undefined): string[] {
  return normalizeTextList(value);
}
