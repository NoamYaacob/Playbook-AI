// ---------------------------------------------------------------------------
// Trade Journal – Server Component
// ---------------------------------------------------------------------------

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTrades } from "@/lib/actions/trade.actions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { JournalFilters } from "@/components/journal/JournalFilters";
import { JournalControls } from "@/components/journal/JournalControls";
import { Card, CardContent } from "@/components/ui/card";
import type { TradeRow, TradeFilters, Market, TradeSide, AdherenceStatus } from "@/types";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSearchParams(sp: Record<string, string | string[] | undefined>) {
  function str(key: string): string | undefined {
    const v = sp[key];
    return typeof v === "string" ? v : undefined;
  }
  function num(key: string): number | undefined {
    const v = str(key);
    return v !== undefined ? Number(v) : undefined;
  }

  return {
    symbol: str("symbol"),
    market: str("market") as Market | undefined,
    side: str("side") as TradeSide | undefined,
    adherence: str("adherence") as AdherenceStatus | undefined,
    strategyId: str("strategyId"),
    setupType: str("setupType"),
    dateFrom: str("dateFrom"),
    dateTo: str("dateTo"),
    sortBy: str("sortBy") as keyof TradeRow | undefined,
    sortDir: (str("sortDir") ?? "desc") as "asc" | "desc",
    page: num("page") ?? 1,
    pageSize: num("pageSize") ?? 50,
  };
}

function calcStats(trades: TradeRow[]) {
  const closed = trades.filter((t) => !t.isOpen && t.pnlAmount != null);
  const totalTrades = trades.length;
  const totalPnl = closed.reduce((sum, t) => sum + (t.pnlAmount ?? 0), 0);
  const wins = closed.filter((t) => (t.pnlAmount ?? 0) > 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
  const openCount = trades.filter((t) => t.isOpen).length;

  return { totalTrades, totalPnl, winRate, openCount };
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  highlight?: "green" | "red" | "neutral";
}

function StatCard({ label, value, sub, icon, highlight = "neutral" }: StatCardProps) {
  const colors = {
    green: "text-green-400",
    red: "text-red-400",
    neutral: "text-slate-200",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/65 px-4 py-4 shadow-[0_12px_28px_rgba(2,6,23,0.18)]">
      <div className="rounded-xl border border-slate-700/70 bg-slate-800/80 p-2.5 text-slate-300">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
        <p className={`text-2xl font-semibold tabular-nums leading-tight ${colors[highlight]}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const resolvedParams = await searchParams;
  const filters = parseSearchParams(resolvedParams);

  // Load strategies for filter dropdown
  const strategies = await db.strategy.findMany({
    where: { userId, isArchived: false },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  // Build filters object
  const tradeFilters: TradeFilters = {
    symbol: filters.symbol,
    market: filters.market,
    side: filters.side,
    adherence: filters.adherence,
    strategyId: filters.strategyId,
    setupType: filters.setupType,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    page: filters.page,
    pageSize: filters.pageSize,
  };

  // Fetch trades for display
  const trades = await getTrades(userId, tradeFilters);

  // Fetch total count for pagination (separate count query)
  const totalCount = await db.trade.count({
    where: {
      userId,
      ...(filters.symbol ? { symbol: filters.symbol.toUpperCase() } : {}),
      ...(filters.market ? { market: filters.market } : {}),
      ...(filters.side ? { side: filters.side } : {}),
      ...(filters.adherence ? { adherence: filters.adherence } : {}),
      ...(filters.strategyId ? { strategyId: filters.strategyId } : {}),
      ...(filters.setupType ? { setupType: { contains: filters.setupType, mode: "insensitive" } } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            entryAt: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
            },
          }
        : {}),
    },
  });

  // Cast trades to TradeRow for client components
  const tradeRows = trades as unknown as TradeRow[];

  // Compute stats over filtered trades
  const { totalTrades, totalPnl, winRate, openCount } = calcStats(tradeRows);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Trade Journal"
        subtitle="Review, filter, and analyse all your trades."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Journal" }]}
        actions={
          <a
            href="/import"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Import Trades
          </a>
        }
      />

      <Card className="border-slate-800/80 bg-slate-900/60 shadow-[0_18px_42px_rgba(2,6,23,0.2)]">
        <CardContent className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Journal Overview
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-100">
                Filter, scan, and jump straight into trade review
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Keep the highest-signal trades visible and move quickly from overview to reflection.
              </p>
            </div>
          </div>

          {/* ── Stats bar ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Trades"
              value={String(totalTrades)}
              sub={openCount > 0 ? `${openCount} open` : undefined}
              icon={<Activity className="h-4 w-4" />}
            />
            <StatCard
              label="Win Rate"
              value={`${winRate.toFixed(1)}%`}
              sub="Closed trades"
              icon={<TrendingUp className="h-4 w-4" />}
              highlight={winRate >= 50 ? "green" : "neutral"}
            />
            <StatCard
              label="Total P&L"
              value={
                totalPnl === 0
                  ? "$0.00"
                  : `${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
              icon={<DollarSign className="h-4 w-4" />}
              highlight={totalPnl > 0 ? "green" : totalPnl < 0 ? "red" : "neutral"}
            />
            <StatCard
              label="Showing"
              value={String(totalCount)}
              sub="filtered results"
              icon={<TrendingDown className="h-4 w-4" />}
            />
          </div>

          {/* ── Filters ─────────────────────────────────────────────────────── */}
          <JournalFilters strategies={strategies} />

          {/* ── Trade list (table / cards) ─────────────────────────────────── */}
          <JournalControls
            trades={tradeRows}
            userId={userId}
            total={totalCount}
            page={filters.page}
            pageSize={filters.pageSize}
            sortBy={filters.sortBy ?? "entryAt"}
            sortDir={filters.sortDir}
          />
        </CardContent>
      </Card>
    </div>
  );
}
