"use client";

// ---------------------------------------------------------------------------
// ValidationTable – shows parsed CSV rows with validation status
// ---------------------------------------------------------------------------

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ValidationStatus = "valid" | "invalid" | "warning";

export interface ValidationResult {
  rowIndex: number;
  status: ValidationStatus;
  /** Key fields extracted for preview */
  symbol?: string;
  side?: string;
  entryAt?: string;
  entryPrice?: string;
  size?: string;
  errors: string[];
  warnings: string[];
}

interface ValidationTableProps {
  rows: ValidationResult[];
}

type SortKey = "rowIndex" | "status" | "symbol";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusOrder(s: ValidationStatus) {
  return s === "invalid" ? 0 : s === "warning" ? 1 : 2;
}

function StatusBadge({ status }: { status: ValidationStatus }) {
  if (status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Valid
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
      <AlertCircle className="h-3.5 w-3.5" />
      Invalid
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ValidationTable({ rows }: ValidationTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rowIndex");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<ValidationStatus | "all">("all");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered =
    statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter);

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "rowIndex") cmp = a.rowIndex - b.rowIndex;
    else if (sortKey === "status") cmp = statusOrder(a.status) - statusOrder(b.status);
    else if (sortKey === "symbol")
      cmp = (a.symbol ?? "").localeCompare(b.symbol ?? "");
    return sortDir === "asc" ? cmp : -cmp;
  });

  const validCount = rows.filter((r) => r.status === "valid").length;
  const warningCount = rows.filter((r) => r.status === "warning").length;
  const invalidCount = rows.filter((r) => r.status === "invalid").length;

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <ChevronUp className="h-3 w-3 opacity-30 inline ml-1" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 opacity-80 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 opacity-80 inline ml-1" />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setStatusFilter("all")}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border transition-colors",
            statusFilter === "all"
              ? "bg-slate-700 border-slate-500 text-slate-100"
              : "border-slate-700 text-slate-400 hover:border-slate-500",
          )}
        >
          All ({rows.length})
        </button>
        <button
          onClick={() => setStatusFilter("valid")}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border transition-colors",
            statusFilter === "valid"
              ? "bg-green-500/20 border-green-500/50 text-green-400"
              : "border-slate-700 text-slate-400 hover:border-green-500/50",
          )}
        >
          <CheckCircle2 className="h-3 w-3 inline mr-1" />
          Valid ({validCount})
        </button>
        {warningCount > 0 && (
          <button
            onClick={() => setStatusFilter("warning")}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              statusFilter === "warning"
                ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                : "border-slate-700 text-slate-400 hover:border-yellow-500/50",
            )}
          >
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Warning ({warningCount})
          </button>
        )}
        {invalidCount > 0 && (
          <button
            onClick={() => setStatusFilter("invalid")}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              statusFilter === "invalid"
                ? "bg-red-500/20 border-red-500/50 text-red-400"
                : "border-slate-700 text-slate-400 hover:border-red-500/50",
            )}
          >
            <AlertCircle className="h-3 w-3 inline mr-1" />
            Invalid ({invalidCount})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="w-14">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs font-medium text-slate-400 hover:text-slate-200"
                  onClick={() => toggleSort("rowIndex")}
                >
                  Row
                  <SortIcon col="rowIndex" />
                </Button>
              </TableHead>
              <TableHead className="w-28">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs font-medium text-slate-400 hover:text-slate-200"
                  onClick={() => toggleSort("status")}
                >
                  Status
                  <SortIcon col="status" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs font-medium text-slate-400 hover:text-slate-200"
                  onClick={() => toggleSort("symbol")}
                >
                  Symbol
                  <SortIcon col="symbol" />
                </Button>
              </TableHead>
              <TableHead className="hidden sm:table-cell text-slate-400">Side</TableHead>
              <TableHead className="hidden md:table-cell text-slate-400">Entry At</TableHead>
              <TableHead className="hidden md:table-cell text-slate-400">Price</TableHead>
              <TableHead className="hidden sm:table-cell text-slate-400">Size</TableHead>
              <TableHead className="text-slate-400">Issues</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                  No rows to display.
                </TableCell>
              </TableRow>
            )}
            {sorted.map((row) => (
              <TableRow
                key={row.rowIndex}
                className={cn(
                  "border-slate-800 transition-colors",
                  row.status === "valid" && "bg-green-950/20 hover:bg-green-950/30",
                  row.status === "warning" && "bg-yellow-950/20 hover:bg-yellow-950/30",
                  row.status === "invalid" && "bg-red-950/20 hover:bg-red-950/30",
                )}
              >
                <TableCell className="text-slate-400 text-xs font-mono">
                  {row.rowIndex + 1}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="font-mono text-sm font-medium text-slate-100">
                  {row.symbol ?? <span className="text-slate-600 text-xs">—</span>}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-slate-300">
                  {row.side ? (
                    <Badge
                      variant={row.side === "LONG" ? "success" : "destructive"}
                      className="text-[10px]"
                    >
                      {row.side}
                    </Badge>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-slate-400 font-mono">
                  {row.entryAt ?? <span className="text-slate-600">—</span>}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-slate-300 font-mono">
                  {row.entryPrice ?? <span className="text-slate-600">—</span>}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-slate-300 font-mono">
                  {row.size ?? <span className="text-slate-600">—</span>}
                </TableCell>
                <TableCell>
                  {row.errors.length > 0 && (
                    <ul className="space-y-0.5">
                      {row.errors.map((err, i) => (
                        <li key={i} className="text-[11px] text-red-400">
                          {err}
                        </li>
                      ))}
                    </ul>
                  )}
                  {row.warnings.length > 0 && (
                    <ul className="space-y-0.5">
                      {row.warnings.map((w, i) => (
                        <li key={i} className="text-[11px] text-yellow-400">
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}
                  {row.errors.length === 0 && row.warnings.length === 0 && (
                    <span className="text-[11px] text-slate-600">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
