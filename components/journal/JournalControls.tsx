"use client";

// ---------------------------------------------------------------------------
// JournalControls – client wrapper handling layout toggle, sort, and pagination
// for the journal page.  Receives trades as props from the server component.
// ---------------------------------------------------------------------------

import { useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TradeTable } from "@/components/journal/TradeTable";
import { TradeCard } from "@/components/journal/TradeCard";
import type { TradeRow } from "@/types";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JournalControlsProps {
  trades: TradeRow[];
  userId: string;
  total: number;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: "asc" | "desc";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JournalControls({
  trades,
  userId,
  total,
  page,
  pageSize,
  sortBy,
  sortDir,
}: JournalControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const layout = searchParams.get("layout") ?? "table";
  const isTable = layout !== "cards";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(updates)) {
          if (value === null) params.delete(key);
          else params.set(key, value);
        }
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  function handlePageChange(p: number) {
    updateParams({ page: String(p) });
  }

  function handleSortChange(col: string, dir: "asc" | "desc") {
    updateParams({ sortBy: col, sortDir: dir, page: "1" });
  }

  function handleLayoutToggle(newLayout: "table" | "cards") {
    updateParams({ layout: newLayout });
  }

  return (
    <div className="space-y-4">
      {/* Layout toggle */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Journal View
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {isTable ? "Dense table for fast scanning" : "Card view for visual trade-by-trade review"}
          </p>
        </div>
        <div className="flex items-center gap-0.5 rounded-xl border border-slate-700/80 bg-slate-900/70 p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleLayoutToggle("table")}
            className={cn(
              "h-7 w-7 p-0 rounded-md transition-colors",
              isTable ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300",
            )}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleLayoutToggle("cards")}
            className={cn(
              "h-7 w-7 p-0 rounded-md transition-colors",
              !isTable ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Table view */}
      {isTable && (
        <TradeTable
          trades={trades}
          userId={userId}
          total={total}
          page={page}
          pageSize={pageSize}
          sortBy={sortBy}
          sortDir={sortDir}
          onPageChange={handlePageChange}
          onSortChange={handleSortChange}
        />
      )}

      {/* Card grid view */}
      {!isTable && (
        <>
          {trades.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/35 px-6 py-14 text-center">
              <p className="text-base font-medium text-slate-300">No trades match these filters</p>
              <p className="mt-2 text-sm text-slate-500">
                Broaden the current filters or import more trades to repopulate this view.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {trades.map((trade) => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          )}

          {/* Card layout pagination */}
          {Math.ceil(total / pageSize) > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-30"
              >
                Previous
              </Button>
              <span className="text-xs text-slate-500">
                Page {page} of {Math.ceil(total / pageSize)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => handlePageChange(page + 1)}
                className="border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-30"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
