"use client";

// ---------------------------------------------------------------------------
// TradeTable – sortable, paginated trade journal table with bulk actions
// ---------------------------------------------------------------------------

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AdherenceBadge } from "@/components/shared/AdherenceBadge";
import { bulkDeleteTrades } from "@/lib/actions/trade.actions";
import type { TradeRow } from "@/types";
import { cn } from "@/lib/utils";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  Pencil,
  Trash2,
  CheckSquare,
  Loader2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TradeTableProps {
  trades: TradeRow[];
  userId: string;
  /** Total record count (for pagination) */
  total: number;
  page: number;
  pageSize: number;
  /** Current sort column from URL */
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onPageChange?: (page: number) => void;
  onSortChange?: (col: string, dir: "asc" | "desc") => void;
}

type SortCol = keyof TradeRow;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pnlColor(pnl: number | null | undefined) {
  if (pnl == null) return "text-slate-400";
  if (pnl > 0) return "text-green-400";
  if (pnl < 0) return "text-red-400";
  return "text-slate-400";
}

function formatPnl(pnl: number | null | undefined): string {
  if (pnl == null) return "—";
  const abs = Math.abs(pnl);
  const sign = pnl >= 0 ? "+" : "-";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatR(r: number | null | undefined): string {
  if (r == null) return "—";
  const sign = r >= 0 ? "+" : "";
  return `${sign}${r.toFixed(2)}R`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TradeTable({
  trades,
  userId,
  total,
  page,
  pageSize,
  sortBy: externalSortBy = "entryAt",
  sortDir: externalSortDir = "desc",
  onPageChange,
  onSortChange,
}: TradeTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allSelected = trades.length > 0 && trades.every((t) => selected.has(t.id));
  const someSelected = selected.size > 0;

  // ---------------------------------------------------------------------------
  // Selection handlers
  // ---------------------------------------------------------------------------

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(trades.map((t) => t.id)));
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Sort handlers
  // ---------------------------------------------------------------------------

  function handleSort(col: SortCol) {
    let newDir: "asc" | "desc" = "desc";
    if (externalSortBy === col) {
      newDir = externalSortDir === "asc" ? "desc" : "asc";
    }
    onSortChange?.(col, newDir);
  }

  function SortIcon({ col }: { col: string }) {
    if (externalSortBy !== col) {
      return <ChevronsUpDown className="h-3 w-3 text-slate-600 ml-1 inline-block" />;
    }
    return externalSortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-indigo-400 ml-1 inline-block" />
    ) : (
      <ChevronDown className="h-3 w-3 text-indigo-400 ml-1 inline-block" />
    );
  }

  // ---------------------------------------------------------------------------
  // Bulk actions
  // ---------------------------------------------------------------------------

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} selected trade${selected.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await bulkDeleteTrades([...selected], userId);
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch {
      alert("Failed to delete trades. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  function goToPage(p: number) {
    if (p < 1 || p > totalPages) return;
    onPageChange?.(p);
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/35 px-6 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70">
          <BookOpen className="h-8 w-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-300">No trades found</h3>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
          Try adjusting the current filters, or import trades to start building a more useful journal history.
        </p>
        <Button
          className="mt-5 bg-indigo-600 hover:bg-indigo-500 text-white"
          onClick={() => router.push("/import")}
        >
          Import Trades
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", isPending && "opacity-60 pointer-events-none")}>
      {/* ── Bulk actions bar ──────────────────────────────────────────────── */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
          <CheckSquare className="h-4 w-4 text-indigo-400" />
          <span className="text-sm text-indigo-300 font-medium">
            {selected.size} trade{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected(new Set())}
              className="h-7 text-xs border-slate-700 text-slate-400 hover:bg-slate-800"
            >
              Deselect
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="h-7 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3 mr-1" />
              )}
              Delete selected
            </Button>
          </div>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/35">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 bg-slate-900/85 hover:bg-transparent">
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                    className="border-slate-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                </TableHead>

                <TableHead
                  className="cursor-pointer select-none text-slate-400 text-xs"
                  onClick={() => handleSort("entryAt")}
                >
                  Date/Time
                  <SortIcon col="entryAt" />
                </TableHead>

                <TableHead
                  className="cursor-pointer select-none text-slate-400 text-xs"
                  onClick={() => handleSort("symbol")}
                >
                  Symbol
                  <SortIcon col="symbol" />
                </TableHead>

                <TableHead className="text-slate-400 text-xs">Side</TableHead>

                <TableHead className="hidden lg:table-cell text-slate-400 text-xs">
                  Entry / Exit
                </TableHead>

                <TableHead
                  className="hidden md:table-cell cursor-pointer select-none text-slate-400 text-xs"
                  onClick={() => handleSort("size")}
                >
                  Size
                  <SortIcon col="size" />
                </TableHead>

                <TableHead
                  className="cursor-pointer select-none text-slate-400 text-xs"
                  onClick={() => handleSort("pnlAmount")}
                >
                  P&L
                  <SortIcon col="pnlAmount" />
                </TableHead>

                <TableHead
                  className="hidden md:table-cell cursor-pointer select-none text-slate-400 text-xs"
                  onClick={() => handleSort("pnlR")}
                >
                  R-Value
                  <SortIcon col="pnlR" />
                </TableHead>

                <TableHead className="hidden lg:table-cell text-slate-400 text-xs">
                  Setup
                </TableHead>

                <TableHead className="text-slate-400 text-xs">Adherence</TableHead>

                <TableHead className="hidden sm:table-cell text-slate-400 text-xs text-center">
                  Rev.
                </TableHead>

                <TableHead className="text-slate-400 text-xs text-right pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {trades.map((trade) => {
                const isSelected = selected.has(trade.id);
                return (
                  <TableRow
                    key={trade.id}
                    onClick={() => router.push(`/journal/${trade.id}`)}
                    className={cn(
                      "cursor-pointer border-slate-800/90 transition-colors",
                      isSelected
                        ? "bg-indigo-500/5 hover:bg-indigo-500/10"
                        : "hover:bg-slate-900/70",
                    )}
                  >
                    {/* Checkbox */}
                    <TableCell
                      className="pl-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRow(trade.id);
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(trade.id)}
                        aria-label={`Select trade ${trade.symbol}`}
                        className="border-slate-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                    </TableCell>

                    {/* Date/Time */}
                    <TableCell className="whitespace-nowrap py-3 text-xs font-mono text-slate-300">
                      <div>{format(new Date(trade.entryAt), "MMM d, yyyy")}</div>
                      <div className="text-slate-500">{format(new Date(trade.entryAt), "HH:mm")}</div>
                    </TableCell>

                    {/* Symbol + Market */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-100 text-sm">
                          {trade.symbol}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 text-slate-500 border-slate-700"
                        >
                          {trade.market}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Side */}
                    <TableCell className="py-3">
                      <Badge
                        variant={trade.side === "LONG" ? "success" : "destructive"}
                        className="text-[11px] font-semibold"
                      >
                        {trade.side === "LONG" ? "L" : "S"}
                      </Badge>
                    </TableCell>

                    {/* Entry/Exit prices */}
                    <TableCell className="hidden py-3 text-xs font-mono lg:table-cell">
                      <div className="text-slate-300">{trade.entryPrice.toLocaleString()}</div>
                      {trade.exitPrice != null ? (
                        <div className="text-slate-500">{trade.exitPrice.toLocaleString()}</div>
                      ) : (
                        <div className="text-indigo-400 text-[10px]">Open</div>
                      )}
                    </TableCell>

                    {/* Size */}
                    <TableCell className="hidden py-3 text-xs font-mono text-slate-300 md:table-cell">
                      {trade.size.toLocaleString()}
                    </TableCell>

                    {/* P&L */}
                    <TableCell className="py-3">
                      <span className={cn("text-sm font-semibold tabular-nums", pnlColor(trade.pnlAmount))}>
                        {formatPnl(trade.pnlAmount)}
                      </span>
                    </TableCell>

                    {/* R-Value */}
                    <TableCell className="hidden py-3 md:table-cell">
                      <span
                        className={cn(
                          "text-xs font-mono tabular-nums",
                          trade.pnlR != null && trade.pnlR > 0
                            ? "text-green-400"
                            : trade.pnlR != null && trade.pnlR < 0
                            ? "text-red-400"
                            : "text-slate-500",
                        )}
                      >
                        {formatR(trade.pnlR)}
                      </span>
                    </TableCell>

                    {/* Setup type */}
                    <TableCell className="hidden max-w-[120px] truncate py-3 text-xs text-slate-400 lg:table-cell">
                      {trade.setupType ?? <span className="text-slate-700">—</span>}
                    </TableCell>

                    {/* Adherence */}
                    <TableCell className="py-3">
                      <AdherenceBadge status={trade.adherence} />
                    </TableCell>

                    {/* Reviewed */}
                    <TableCell className="hidden py-3 text-center sm:table-cell">
                      {trade.wasReviewed ? (
                        <Eye className="h-4 w-4 text-green-400 mx-auto" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-700 mx-auto" />
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell
                      className="py-3 pr-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-200 hover:bg-slate-800"
                          onClick={() => router.push(`/journal/${trade.id}`)}
                          title="View trade"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-400 hover:bg-slate-800"
                          onClick={() => router.push(`/journal/${trade.id}/edit`)}
                          title="Edit trade"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-red-400 hover:bg-slate-800"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm("Delete this trade?")) return;
                            await bulkDeleteTrades([trade.id], userId);
                            startTransition(() => router.refresh());
                          }}
                          title="Delete trade"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} trades
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="h-8 w-8 p-0 border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <Button
                  key={p}
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(p)}
                  className={cn(
                    "h-8 w-8 p-0 border-slate-700 text-sm",
                    p === page
                      ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500"
                      : "text-slate-400 hover:bg-slate-800",
                  )}
                >
                  {p}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="h-8 w-8 p-0 border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
