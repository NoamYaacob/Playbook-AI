"use client";

// ---------------------------------------------------------------------------
// TradeCard – compact card view for a single trade
// Used in mobile layout or card-grid toggle.
// ---------------------------------------------------------------------------

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AdherenceBadge } from "@/components/shared/AdherenceBadge";
import type { TradeRow } from "@/types";
import { cn } from "@/lib/utils";
import { Eye, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pnlColor(pnl: number | null | undefined) {
  if (pnl == null) return "text-slate-400";
  if (pnl > 0) return "text-green-400";
  if (pnl < 0) return "text-red-400";
  return "text-slate-400";
}

function pnlBorder(pnl: number | null | undefined) {
  if (pnl == null) return "border-slate-800";
  if (pnl > 0) return "border-green-500/20";
  if (pnl < 0) return "border-red-500/20";
  return "border-slate-800";
}

function formatPnl(pnl: number | null | undefined): string {
  if (pnl == null) return "—";
  const abs = Math.abs(pnl);
  const sign = pnl >= 0 ? "+" : "-";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatR(r: number | null | undefined): string {
  if (r == null) return "";
  const sign = r >= 0 ? "+" : "";
  return `${sign}${r.toFixed(2)}R`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TradeCardProps {
  trade: TradeRow;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TradeCard({ trade, className }: TradeCardProps) {
  const router = useRouter();
  const isLong = trade.side === "LONG";
  const isOpen = trade.isOpen || !trade.exitAt;

  return (
    <div
      onClick={() => router.push(`/journal/${trade.id}`)}
      className={cn(
        "group relative rounded-xl border bg-slate-900/60 p-4 cursor-pointer transition-all",
        "hover:bg-slate-900 hover:shadow-lg hover:shadow-black/20",
        pnlBorder(trade.pnlAmount),
        className,
      )}
    >
      {/* Top row: Symbol + Market + Side + Reviewed icon */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-white text-base leading-none">
            {trade.symbol}
          </span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 text-slate-500 border-slate-700"
          >
            {trade.market}
          </Badge>
          <Badge
            variant={isLong ? "success" : "destructive"}
            className="text-[11px] font-semibold"
          >
            {isLong ? "Long" : "Short"}
          </Badge>
          {isOpen && (
            <Badge variant="default" className="text-[10px] bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
              Open
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {trade.wasReviewed && (
            <span title="Reviewed">
              <Eye className="h-3.5 w-3.5 text-green-400" />
            </span>
          )}
          {isLong ? (
            <TrendingUp className="h-4 w-4 text-green-400/60" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-400/60" />
          )}
        </div>
      </div>

      {/* Adherence badge – prominent */}
      <div className="mb-3">
        <AdherenceBadge status={trade.adherence} />
      </div>

      {/* P&L + R row */}
      <div className="flex items-baseline gap-3 mb-3">
        <span className={cn("text-xl font-bold tabular-nums", pnlColor(trade.pnlAmount))}>
          {formatPnl(trade.pnlAmount)}
        </span>
        {trade.pnlR != null && (
          <span
            className={cn(
              "text-sm font-mono",
              trade.pnlR > 0 ? "text-green-400/70" : trade.pnlR < 0 ? "text-red-400/70" : "text-slate-500",
            )}
          >
            {formatR(trade.pnlR)}
          </span>
        )}
      </div>

      {/* Price details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">Entry</p>
          <p className="text-xs font-mono text-slate-300">{trade.entryPrice.toLocaleString()}</p>
        </div>
        {trade.exitPrice != null && (
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Exit</p>
            <p className="text-xs font-mono text-slate-300">{trade.exitPrice.toLocaleString()}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">Size</p>
          <p className="text-xs font-mono text-slate-300">{trade.size.toLocaleString()}</p>
        </div>
        {trade.setupType && (
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Setup</p>
            <p className="text-xs text-slate-400 truncate">{trade.setupType}</p>
          </div>
        )}
      </div>

      {/* Footer: date */}
      <div className="flex items-center justify-between text-[10px] text-slate-600 border-t border-slate-800/50 pt-2 mt-1">
        <span>{format(new Date(trade.entryAt), "MMM d, yyyy HH:mm")}</span>
        {trade.session && <span>{trade.session}</span>}
      </div>

      {/* Hover overlay arrow */}
      <div className="absolute inset-y-0 right-3 flex items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="h-5 w-5 rounded-full bg-slate-700 flex items-center justify-center">
          <svg className="h-2.5 w-2.5 text-slate-300" viewBox="0 0 6 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
