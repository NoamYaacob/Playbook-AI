import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarCheck,
  DollarSign,
  TrendingUp,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { getTrades } from "@/lib/actions/trade.actions";
import { getStrategies } from "@/lib/actions/strategy.actions";
import { getInsights } from "@/lib/actions/insight.actions";
import { getDailyReview } from "@/lib/actions/review.actions";
import {
  TradeRow,
  InsightSnapshotRow,
  DashboardStats,
  SetupPerformance,
  AdherenceOverTimePoint,
  PnlBySetupPoint,
  AvgRByHourPoint,
  OffPlanByDayPoint,
  EmotionOutcomePoint,
  TopImprovement,
  EmotionTag,
} from "@/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatCard } from "@/components/dashboard/StatCard";
import { PnlChart } from "@/components/dashboard/PnlChart";
import { AdherenceGauge } from "@/components/dashboard/AdherenceGauge";
import { AdherenceOverTime } from "@/components/dashboard/AdherenceOverTime";
import { PnlBySetup } from "@/components/dashboard/PnlBySetup";
import { AvgRByHour } from "@/components/dashboard/AvgRByHour";
import { OffPlanByDay } from "@/components/dashboard/OffPlanByDay";
import { EmotionOutcome } from "@/components/dashboard/EmotionOutcome";
import { TopImprovements } from "@/components/dashboard/TopImprovements";
import { BehaviorPatterns } from "@/components/dashboard/BehaviorPatterns";
import { AdherenceBadge } from "@/components/shared/AdherenceBadge";
import { DisclaimerBanner } from "@/components/shared/DisclaimerBanner";
import { formatCurrency, formatR } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Search params type
// ---------------------------------------------------------------------------

interface DashboardSearchParams {
  period?: string;
}

// ---------------------------------------------------------------------------
// Period helper
// ---------------------------------------------------------------------------

function getPeriodDays(period: string | undefined): number | null {
  if (period === "30d") return 30;
  if (period === "all") return null;
  return 90; // default: last 90 days
}

function getPeriodLabel(period: string | undefined): string {
  if (period === "30d") return "Last 30 days";
  if (period === "all") return "All time";
  return "Last 90 days";
}

// ---------------------------------------------------------------------------
// Metrics helpers
// ---------------------------------------------------------------------------

function computeStats(trades: TradeRow[]): DashboardStats {
  const closed = trades.filter((t) => !t.isOpen && t.pnlAmount != null);

  const totalTrades = closed.length;
  const openTrades = trades.filter((t) => t.isOpen).length;
  const wins = closed.filter((t) => (t.pnlAmount ?? 0) > 0);

  const winRate = totalTrades > 0 ? wins.length / totalTrades : 0;
  const totalPnl = closed.reduce((sum, t) => sum + (t.pnlAmount ?? 0), 0);
  const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

  const rValues = closed
    .filter((t) => t.pnlR != null)
    .map((t) => t.pnlR as number);
  const avgR =
    rValues.length > 0
      ? rValues.reduce((a, b) => a + b, 0) / rValues.length
      : 0;

  // Adherence score
  const reviewed = trades.filter((t) => t.adherence !== "UNREVIEWED");
  const adherent = reviewed.filter((t) => t.adherence === "YES");
  const partial = reviewed.filter((t) => t.adherence === "PARTIAL");
  const adherenceScore =
    reviewed.length > 0
      ? Math.round(
          ((adherent.length + partial.length * 0.5) / reviewed.length) * 100,
        )
      : 0;

  // Discipline score
  const noViolation = closed.filter(
    (t) => t.riskViolations.length === 0,
  ).length;
  const disciplineScore =
    totalTrades > 0 ? Math.round((noViolation / totalTrades) * 100) : 0;

  // Setup breakdown
  const setupMap = new Map<string, SetupPerformance>();
  for (const t of closed) {
    const key = t.setupType ?? "Unknown";
    const existing = setupMap.get(key) ?? {
      setupType: key,
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
    };
    existing.totalTrades++;
    const pnl = t.pnlAmount ?? 0;
    existing.totalPnl += pnl;
    if (pnl > 0) {
      existing.winCount++;
      existing.maxWin = Math.max(existing.maxWin, pnl);
    } else if (pnl < 0) {
      existing.lossCount++;
      existing.maxLoss = Math.min(existing.maxLoss, pnl);
    } else {
      existing.breakEvenCount++;
    }
    setupMap.set(key, existing);
  }
  const setupBreakdown: SetupPerformance[] = Array.from(setupMap.values()).map(
    (s) => ({
      ...s,
      winRate: s.totalTrades > 0 ? s.winCount / s.totalTrades : 0,
      avgPnl: s.totalTrades > 0 ? s.totalPnl / s.totalTrades : 0,
      avgR: 0,
    }),
  );

  const sortedByWin = [...setupBreakdown].sort(
    (a, b) => b.winRate - a.winRate,
  );
  const bestSetup = sortedByWin[0]?.setupType ?? null;
  const worstSetup = sortedByWin[sortedByWin.length - 1]?.setupType ?? null;

  // Equity curve
  const sortedClosed = [...closed].sort(
    (a, b) => new Date(a.entryAt).getTime() - new Date(b.entryAt).getTime(),
  );
  let running = 0;
  const equityCurve = sortedClosed.map((t) => {
    running += t.pnlAmount ?? 0;
    return {
      date: new Date(t.entryAt).toISOString().slice(0, 10),
      equity: parseFloat(running.toFixed(2)),
    };
  });

  // Win streak
  let streakCurrent = 0;
  let streakBest = 0;
  let tempStreak = 0;
  for (let i = sortedClosed.length - 1; i >= 0; i--) {
    const pnl = sortedClosed[i]?.pnlAmount ?? 0;
    if (pnl > 0) {
      if (i === sortedClosed.length - 1 || streakCurrent === 0)
        streakCurrent++;
      tempStreak++;
      streakBest = Math.max(streakBest, tempStreak);
    } else {
      if (streakCurrent > 0) break;
      tempStreak = 0;
    }
  }

  // R distribution
  const buckets: Record<string, number> = {
    "<-2R": 0,
    "-2R to -1R": 0,
    "-1R to 0": 0,
    "0 to 1R": 0,
    "1R to 2R": 0,
    ">2R": 0,
  };
  for (const t of closed) {
    const r = t.pnlR ?? 0;
    if (r < -2) buckets["<-2R"]++;
    else if (r < -1) buckets["-2R to -1R"]++;
    else if (r < 0) buckets["-1R to 0"]++;
    else if (r < 1) buckets["0 to 1R"]++;
    else if (r < 2) buckets["1R to 2R"]++;
    else buckets[">2R"]++;
  }

  return {
    totalTrades,
    openTrades,
    winRate,
    totalPnl,
    avgPnl,
    avgR,
    adherenceScore,
    disciplineScore,
    bestSetup,
    worstSetup,
    streakCurrent,
    streakBest,
    equityCurve,
    rDistribution: Object.entries(buckets).map(([bucket, count]) => ({
      bucket,
      count,
    })),
    recentTrades: trades.slice(0, 5),
  };
}

// ---------------------------------------------------------------------------
// Chart data computation (local fallback — used when getDashboardChartData
// is not yet available as a server action)
// ---------------------------------------------------------------------------

function computeAdherenceOverTime(
  trades: TradeRow[],
): AdherenceOverTimePoint[] {
  const byDate = new Map<
    string,
    { adherent: number; partial: number; total: number }
  >();

  for (const t of trades) {
    if (t.adherence === "UNREVIEWED") continue;
    const date = new Date(t.entryAt).toISOString().slice(0, 10);
    const existing = byDate.get(date) ?? {
      adherent: 0,
      partial: 0,
      total: 0,
    };
    existing.total++;
    if (t.adherence === "YES") existing.adherent++;
    if (t.adherence === "PARTIAL") existing.partial++;
    byDate.set(date, existing);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      adherenceScore:
        v.total > 0
          ? Math.round(
              ((v.adherent + v.partial * 0.5) / v.total) * 100,
            )
          : 0,
      tradeCount: v.total,
    }));
}

function computePnlBySetup(trades: TradeRow[]): PnlBySetupPoint[] {
  const closed = trades.filter((t) => !t.isOpen && t.pnlAmount != null);
  const map = new Map<
    string,
    {
      totalPnl: number;
      pnlList: number[];
      rList: number[];
      wins: number;
      total: number;
    }
  >();

  for (const t of closed) {
    const key = t.setupType ?? "Unknown";
    const existing = map.get(key) ?? {
      totalPnl: 0,
      pnlList: [],
      rList: [],
      wins: 0,
      total: 0,
    };
    const pnl = t.pnlAmount ?? 0;
    existing.totalPnl += pnl;
    existing.pnlList.push(pnl);
    if (t.pnlR != null) existing.rList.push(t.pnlR);
    if (pnl > 0) existing.wins++;
    existing.total++;
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.total >= 2)
    .map(([setupType, v]) => ({
      setupType,
      totalPnl: parseFloat(v.totalPnl.toFixed(2)),
      avgPnl:
        v.total > 0 ? parseFloat((v.totalPnl / v.total).toFixed(2)) : 0,
      avgR:
        v.rList.length > 0
          ? parseFloat(
              (v.rList.reduce((a, b) => a + b, 0) / v.rList.length).toFixed(2),
            )
          : 0,
      winRate: v.total > 0 ? v.wins / v.total : 0,
      tradeCount: v.total,
    }));
}

function computeAvgRByHour(trades: TradeRow[]): AvgRByHourPoint[] {
  const closed = trades.filter(
    (t) => !t.isOpen && t.pnlR != null,
  );
  const map = new Map<
    number,
    { rList: number[]; wins: number; total: number }
  >();

  for (const t of closed) {
    const hour = new Date(t.entryAt).getHours();
    const existing = map.get(hour) ?? {
      rList: [],
      wins: 0,
      total: 0,
    };
    existing.rList.push(t.pnlR as number);
    if ((t.pnlR as number) > 0) existing.wins++;
    existing.total++;
    map.set(hour, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, v]) => ({
      hour,
      avgR: parseFloat(
        (v.rList.reduce((a, b) => a + b, 0) / v.rList.length).toFixed(2),
      ),
      tradeCount: v.total,
      winRate: v.total > 0 ? v.wins / v.total : 0,
    }));
}

function computeOffPlanByDay(trades: TradeRow[]): OffPlanByDayPoint[] {
  const reviewed = trades.filter((t) => t.adherence !== "UNREVIEWED");
  const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const map = new Map<number, { offPlan: number; total: number }>();

  for (const t of reviewed) {
    const dow = new Date(t.entryAt).getDay();
    const existing = map.get(dow) ?? { offPlan: 0, total: 0 };
    existing.total++;
    if (t.adherence === "NO") existing.offPlan++;
    map.set(dow, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayOfWeek, v]) => ({
      dayOfWeek,
      dayLabel: DAY_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`,
      offPlanCount: v.offPlan,
      totalCount: v.total,
      offPlanRate: v.total > 0 ? v.offPlan / v.total : 0,
    }));
}

function computeEmotionOutcome(trades: TradeRow[]): EmotionOutcomePoint[] {
  const closed = trades.filter(
    (t) => !t.isOpen && t.emotionBefore != null && t.pnlAmount != null,
  );
  const map = new Map<
    EmotionTag,
    { pnlList: number[]; rList: number[]; wins: number; total: number }
  >();

  for (const t of closed) {
    const emotion = t.emotionBefore as EmotionTag;
    const existing = map.get(emotion) ?? {
      pnlList: [],
      rList: [],
      wins: 0,
      total: 0,
    };
    const pnl = t.pnlAmount ?? 0;
    existing.pnlList.push(pnl);
    if (t.pnlR != null) existing.rList.push(t.pnlR);
    if (pnl > 0) existing.wins++;
    existing.total++;
    map.set(emotion, existing);
  }

  return Array.from(map.entries()).map(([emotion, v]) => ({
    emotion,
    avgPnl:
      v.total > 0
        ? parseFloat(
            (
              v.pnlList.reduce((a, b) => a + b, 0) / v.total
            ).toFixed(2),
          )
        : 0,
    avgR:
      v.rList.length > 0
        ? parseFloat(
            (
              v.rList.reduce((a, b) => a + b, 0) / v.rList.length
            ).toFixed(2),
          )
        : 0,
    winRate: v.total > 0 ? v.wins / v.total : 0,
    tradeCount: v.total,
  }));
}

function computeTopImprovements(trades: TradeRow[]): TopImprovement[] {
  const improvements: TopImprovement[] = [];
  const closed = trades.filter((t) => !t.isOpen && t.pnlAmount != null);

  if (closed.length < 10) return [];

  // 1. FOMO trades
  const fomoTrades = closed.filter((t) => t.emotionBefore === "FOMO");
  if (fomoTrades.length >= 3) {
    const avgR =
      fomoTrades
        .filter((t) => t.pnlR != null)
        .reduce((s, t) => s + (t.pnlR ?? 0), 0) /
      (fomoTrades.filter((t) => t.pnlR != null).length || 1);

    improvements.push({
      rank: improvements.length + 1,
      type: "behavior",
      title: "Reduce FOMO-driven entries",
      description: `You have ${fomoTrades.length} trades taken under FOMO. These trades consistently underperform your disciplined entries.`,
      metric:
        fomoTrades.filter((t) => t.pnlR != null).length > 0
          ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R avg on FOMO trades`
          : undefined,
    });
  }

  // 2. Off-plan trades
  const offPlan = closed.filter((t) => t.adherence === "NO");
  if (offPlan.length >= 3) {
    const offPlanRate = offPlan.length / closed.length;
    improvements.push({
      rank: improvements.length + 1,
      type: "risk",
      title: "Stick to your playbook entries",
      description: `${(offPlanRate * 100).toFixed(0)}% of your closed trades deviated from your strategy. Off-plan trades carry higher risk and tend to produce worse outcomes.`,
      metric: `${offPlan.length} of ${closed.length} trades off-plan`,
    });
  }

  // 3. Worst setup
  const setupMap = new Map<string, { rList: number[]; count: number }>();
  for (const t of closed) {
    if (!t.setupType) continue;
    const existing = setupMap.get(t.setupType) ?? { rList: [], count: 0 };
    if (t.pnlR != null) existing.rList.push(t.pnlR);
    existing.count++;
    setupMap.set(t.setupType, existing);
  }
  const worstSetup = Array.from(setupMap.entries())
    .filter(([, v]) => v.count >= 3 && v.rList.length > 0)
    .map(([name, v]) => ({
      name,
      avgR: v.rList.reduce((a, b) => a + b, 0) / v.rList.length,
      count: v.count,
    }))
    .sort((a, b) => a.avgR - b.avgR)[0];

  if (worstSetup && worstSetup.avgR < 0) {
    improvements.push({
      rank: improvements.length + 1,
      type: "setup",
      title: `Review your "${worstSetup.name}" setup`,
      description: `This setup has a negative average R across ${worstSetup.count} trades. Consider whether entry criteria need tightening or if this setup should be paused.`,
      metric: `${worstSetup.avgR.toFixed(2)}R avg across ${worstSetup.count} trades`,
    });
  }

  return improvements.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<DashboardSearchParams>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const params = await searchParams;
  const periodDays = getPeriodDays(params.period);
  const periodLabel = getPeriodLabel(params.period);

  // Date window
  const dateFrom = periodDays
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() - periodDays);
        return d.toISOString();
      })()
    : undefined;

  // Load all data in parallel
  const [rawTrades, strategies, rawInsights, todayReview] = await Promise.all([
    getTrades(userId, {
      dateFrom,
      pageSize: 1000,
    }),
    getStrategies(userId),
    getInsights(userId),
    getDailyReview(userId, new Date()),
  ]);

  const trades = rawTrades as unknown as TradeRow[];
  const insights = rawInsights as unknown as InsightSnapshotRow[];

  const stats = computeStats(trades);
  const activeStrategy =
    strategies.find(
      (s: { isActive: boolean; title: string }) => s.isActive,
    ) ?? null;

  // Sparkline
  const sparklineData = stats.equityCurve
    .slice(-10)
    .map((p) => ({ value: p.equity }));

  // Variants
  const pnlVariant =
    stats.totalPnl > 0
      ? "positive"
      : stats.totalPnl < 0
        ? "negative"
        : "neutral";
  const winRateVariant =
    stats.winRate >= 0.5
      ? "positive"
      : stats.winRate >= 0.35
        ? "neutral"
        : "negative";
  const avgRVariant =
    stats.avgR > 0 ? "positive" : stats.avgR < 0 ? "negative" : "neutral";

  // Chart data (local computation as fallback)
  const adherenceOverTimeData = computeAdherenceOverTime(trades);
  const pnlBySetupData = computePnlBySetup(trades);
  const avgRByHourData = computeAvgRByHour(trades);
  const offPlanByDayData = computeOffPlanByDay(trades);
  const emotionOutcomeData = computeEmotionOutcome(trades);
  const topImprovements = computeTopImprovements(trades);

  const todayComplete = todayReview?.isCompleted ?? false;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">
            Performance Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {periodLabel}
            {activeStrategy && (
              <span className="ml-2">
                · Strategy:{" "}
                <span className="text-slate-300">{activeStrategy.title}</span>
              </span>
            )}
          </p>
        </div>

        {/* Date range selector */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/50 p-1">
          {(
            [
              { value: "30d", label: "Last 30d" },
              { value: "90d", label: "Last 90d" },
              { value: "all", label: "All Time" },
            ] as const
          ).map(({ value, label }) => {
            const currentPeriod = params.period ?? "90d";
            const isActive = currentPeriod === value;
            return (
              <Link
                key={value}
                href={`?period=${value}`}
                className={
                  isActive
                    ? "px-3 py-1 rounded-md text-xs font-medium bg-slate-700 text-slate-100 transition-colors"
                    : "px-3 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                }
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Row 1: 5 StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Trades"
          value={stats.totalTrades.toString()}
          change={
            stats.openTrades > 0 ? `${stats.openTrades} open` : undefined
          }
          variant="neutral"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title="Win Rate"
          value={`${(stats.winRate * 100).toFixed(0)}%`}
          variant={winRateVariant}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Total PnL"
          value={formatCurrency(stats.totalPnl)}
          variant={pnlVariant}
          sparkline={sparklineData}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Avg R"
          value={formatR(stats.avgR)}
          variant={avgRVariant}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          title="Adherence"
          value={`${stats.adherenceScore}%`}
          variant={
            stats.adherenceScore >= 71
              ? "positive"
              : stats.adherenceScore >= 41
                ? "neutral"
                : "negative"
          }
          icon={<BookOpen className="h-4 w-4" />}
        />
      </div>

      {/* Row 2: Cumulative PnL chart */}
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Cumulative PnL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PnlChart trades={trades} />
        </CardContent>
      </Card>

      {/* Row 3: Adherence Over Time | Adherence Gauge + quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Adherence over time */}
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Adherence Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdherenceOverTime data={adherenceOverTimeData} height={260} />
          </CardContent>
        </Card>

        {/* Right: Gauge + quick stats */}
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Playbook Adherence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <AdherenceGauge score={stats.adherenceScore} />
              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/40 px-3 py-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">
                    Win Streak
                  </p>
                  <p className="text-lg font-bold text-slate-200">
                    {stats.streakCurrent}
                  </p>
                  <p className="text-xs text-slate-500">
                    Best: {stats.streakBest}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/40 px-3 py-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">
                    Discipline
                  </p>
                  <p className="text-lg font-bold text-slate-200">
                    {stats.disciplineScore}%
                  </p>
                  <p className="text-xs text-slate-500">No-violation trades</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: PnL by Setup | Avg R by Hour */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              PnL by Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PnlBySetup data={pnlBySetupData} metric="avgR" height={300} />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Avg R by Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AvgRByHour data={avgRByHourData} height={280} />
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Off-Plan by Day | Emotion Outcome */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Off-Plan Rate by Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OffPlanByDay data={offPlanByDayData} height={280} />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Outcome by Emotion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmotionOutcome data={emotionOutcomeData} height={280} />
          </CardContent>
        </Card>
      </div>

      {/* Row 6: Top Improvements | Behavior Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardContent className="pt-5">
            <TopImprovements
              improvements={topImprovements}
              lastUpdated={new Date()}
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Behavioral Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BehaviorPatterns insights={insights.slice(0, 6)} />
          </CardContent>
        </Card>
      </div>

      {/* Daily review prompt */}
      {!todayComplete && (
        <Card className="bg-indigo-950/40 border-indigo-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <CalendarCheck className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Complete today&apos;s daily review
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Reflect on your trades, emotions, and lessons for{" "}
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                    .
                  </p>
                </div>
              </div>
              <Link href="/daily-review">
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                >
                  Start Review
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 7: Recent trades mini table */}
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Recent Trades
          </CardTitle>
          <Link
            href="/journal"
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recentTrades.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              No trades in the selected period.
            </p>
          ) : (
            <div className="space-y-2">
              {stats.recentTrades.map((trade) => {
                const pnlPositive = (trade.pnlAmount ?? 0) >= 0;
                return (
                  <Link
                    key={trade.id}
                    href={`/journal/${trade.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-900/70 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200 truncate">
                            {trade.symbol}
                          </span>
                          <Badge
                            className={
                              trade.side === "LONG"
                                ? "bg-emerald-500/20 text-emerald-400 border-transparent text-xs"
                                : "bg-rose-500/20 text-rose-400 border-transparent text-xs"
                            }
                          >
                            {trade.side}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {new Date(trade.entryAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {trade.setupType && ` · ${trade.setupType}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AdherenceBadge status={trade.adherence} />
                      {trade.pnlAmount != null && (
                        <span
                          className={`text-sm font-semibold ${pnlPositive ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          {pnlPositive ? "+" : ""}
                          {formatCurrency(trade.pnlAmount)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="bg-slate-800" />

      {/* Footer: DisclaimerBanner (prominent) */}
      <DisclaimerBanner variant="prominent" />
    </div>
  );
}
