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
        "rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-4 transition-opacity",
        isPending && "opacity-60 pointer-events-none",
      )}
    >
      <div className="flex items-center gap-2 text-slate-400">
        <SlidersHorizontal className="h-4 w-4" />
        <span className="text-sm font-medium text-slate-300">Filters</span>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            <X className="h-3 w-3" />
            Reset filters
          </button>
        )}
      </div>

      {/* Row 1: Symbol search + date range */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Symbol search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <Input
            placeholder="Search symbol…"
            defaultValue={symbol}
            onChange={(e) => updateParam("symbol", e.target.value)}
            className="pl-8 h-9 text-sm bg-slate-800/60 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-indigo-500"
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
            className="ml-auto h-8 text-xs border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-red-400"
          >
            <X className="h-3 w-3 mr-1" />
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
