"use client";

// ---------------------------------------------------------------------------
// JournalFilters – filter bar for the trade journal
// Persists all filter state in URL search params.
// ---------------------------------------------------------------------------

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Market, TradeSide, AdherenceStatus } from "@/types";
import { Search, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StrategyOption {
  id: string;
  title: string;
}

interface JournalFiltersProps {
  strategies: StrategyOption[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: "entryAt:desc", label: "Date (newest)" },
  { value: "entryAt:asc", label: "Date (oldest)" },
  { value: "pnlAmount:desc", label: "P&L (highest)" },
  { value: "pnlAmount:asc", label: "P&L (lowest)" },
  { value: "pnlR:desc", label: "R-value (highest)" },
  { value: "pnlR:asc", label: "R-value (lowest)" },
  { value: "symbol:asc", label: "Symbol (A-Z)" },
];

const ADHERENCE_OPTIONS = [
  { value: "__all__", label: "All Adherence" },
  { value: AdherenceStatus.YES, label: "In Plan" },
  { value: AdherenceStatus.NO, label: "Off Plan" },
  { value: AdherenceStatus.PARTIAL, label: "Partial" },
  { value: AdherenceStatus.UNREVIEWED, label: "Unreviewed" },
];

const MARKET_OPTIONS = [
  { value: "__all__", label: "All Markets" },
  ...Object.values(Market).map((m) => ({ value: m, label: m })),
];

const SIDE_OPTIONS = [
  { value: "__all__", label: "Both Sides" },
  { value: TradeSide.LONG, label: "Long" },
  { value: TradeSide.SHORT, label: "Short" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JournalFilters({ strategies }: JournalFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read current values from URL
  const symbol = searchParams.get("symbol") ?? "";
  const market = searchParams.get("market") ?? "__all__";
  const side = searchParams.get("side") ?? "__all__";
  const adherence = searchParams.get("adherence") ?? "__all__";
  const strategyId = searchParams.get("strategyId") ?? "__all__";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const setupType = searchParams.get("setupType") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "entryAt";
  const sortDir = searchParams.get("sortDir") ?? "desc";
  const sortValue = `${sortBy}:${sortDir}`;

  const hasActiveFilters = [symbol, dateFrom, dateTo, setupType].some(Boolean)
    || [market, side, adherence, strategyId].some((v) => v !== "__all__");

  // ---------------------------------------------------------------------------
  // Update helpers
  // ---------------------------------------------------------------------------

  const updateParam = useCallback(
    (key: string, value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (!value || value === "__all__") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
        // Reset to page 1 whenever a filter changes
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  function handleSortChange(value: string) {
    const [sb, sd] = value.split(":");
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sortBy", sb);
      params.set("sortDir", sd);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  const selectClass =
    "bg-slate-800/60 border-slate-700 text-slate-200 focus:ring-indigo-500 focus:border-indigo-500 h-9 text-sm";

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/35 p-4 transition-opacity sm:p-5",
        isPending && "opacity-60 pointer-events-none",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-800/80">
            <SlidersHorizontal className="h-4 w-4 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Refine your journal view</p>
            <p className="mt-1 text-sm text-slate-400">
              Use focused filters to surface the trades worth reviewing right now.
            </p>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 self-start rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-red-500/40 hover:text-red-400"
          >
            <X className="h-3 w-3" />
            Reset filters
          </button>
        )}
      </div>

      {/* Row 1: Symbol search + date range */}
      <div className="grid grid-cols-1 gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:grid-cols-3">
        <span>Symbol</span>
        <span>Date from</span>
        <span>Date to</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Symbol search */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
            style={{ insetInlineStart: "0.625rem" }}
          />
          <Input
            placeholder="Search symbol…"
            defaultValue={symbol}
            onChange={(e) => updateParam("symbol", e.target.value)}
            className="h-9 bg-slate-800/60 text-sm text-slate-200 placeholder:text-slate-500 border-slate-700 focus-visible:ring-indigo-500"
            style={{ paddingInlineStart: "2rem" }}
          />
        </div>

        {/* Date from */}
        <div className="relative">
          <Input
            type="date"
            defaultValue={dateFrom}
            onChange={(e) => updateParam("dateFrom", e.target.value)}
            className="h-9 text-sm bg-slate-800/60 border-slate-700 text-slate-200 dark:[color-scheme:dark] focus-visible:ring-indigo-500"
            placeholder="From date"
          />
        </div>

        {/* Date to */}
        <div className="relative">
          <Input
            type="date"
            defaultValue={dateTo}
            onChange={(e) => updateParam("dateTo", e.target.value)}
            className="h-9 text-sm bg-slate-800/60 border-slate-700 text-slate-200 dark:[color-scheme:dark] focus-visible:ring-indigo-500"
            placeholder="To date"
          />
        </div>
      </div>

      {/* Row 2: Market, Side, Adherence, Strategy, Setup */}
      <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:grid-cols-3 lg:grid-cols-5">
        <span>Market</span>
        <span>Side</span>
        <span>Adherence</span>
        <span>Strategy</span>
        <span>Setup</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Market */}
        <Select value={market} onValueChange={(v) => updateParam("market", v)}>
          <SelectTrigger className={selectClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {MARKET_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-slate-200 text-sm">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Side */}
        <Select value={side} onValueChange={(v) => updateParam("side", v)}>
          <SelectTrigger className={selectClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {SIDE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-slate-200 text-sm">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Adherence */}
        <Select value={adherence} onValueChange={(v) => updateParam("adherence", v)}>
          <SelectTrigger className={selectClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {ADHERENCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-slate-200 text-sm">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Strategy */}
        <Select value={strategyId} onValueChange={(v) => updateParam("strategyId", v)}>
          <SelectTrigger className={selectClass}>
            <SelectValue placeholder="All Strategies" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="__all__" className="text-slate-200 text-sm">All Strategies</SelectItem>
            {strategies.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-slate-200 text-sm">
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Setup type */}
        <Input
          placeholder="Setup type…"
          defaultValue={setupType}
          onChange={(e) => updateParam("setupType", e.target.value)}
          className="h-9 text-sm bg-slate-800/60 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-indigo-500"
        />
      </div>

      {/* Row 3: Sort */}
      <div className="flex items-center gap-3 pt-1 border-t border-slate-800">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Sort by
        </div>
        <Select value={sortValue} onValueChange={handleSortChange}>
          <SelectTrigger className="h-8 w-48 bg-slate-800/60 border-slate-700 text-slate-300 text-xs focus:ring-indigo-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-slate-200 text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-red-400"
            style={{ marginInlineStart: "auto" }}
          >
            <X className="h-3 w-3" />
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
