"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  Pencil,
  Star,
  Archive,
  Trash2,
  TrendingUp,
  BarChart2,
  Clock,
  AlertCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteStrategy,
  setActiveStrategy,
  updateStrategy,
} from "@/lib/actions/strategy.actions";
import { formatDate } from "@/lib/utils";

// Local type mirroring Prisma Strategy model
type StrategyRecord = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  isArchived: boolean;
  markets: string[];
  setupTypes: string[];
  updatedAt: Date;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaybookCardProps {
  strategy: StrategyRecord;
  tradeCount?: number;
  adherenceScore?: number;
  userId: string;
}

// ---------------------------------------------------------------------------
// Market color map
// ---------------------------------------------------------------------------

const MARKET_COLORS: Record<string, string> = {
  FUTURES: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  FOREX: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  STOCKS: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  CRYPTO: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  OPTIONS: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlaybookCard({
  strategy,
  tradeCount = 0,
  adherenceScore,
  userId,
}: PlaybookCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSetActive = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionError(null);
    startTransition(async () => {
      try {
        await setActiveStrategy(strategy.id, userId);
        router.refresh();
      } catch {
        setActionError("Failed to set strategy as active.");
      }
    });
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionError(null);
    startTransition(async () => {
      try {
        await updateStrategy(strategy.id, userId, { isArchived: !strategy.isArchived });
        router.refresh();
      } catch {
        setActionError("Failed to archive strategy.");
      }
    });
  };

  const handleDelete = async () => {
    setActionError(null);
    try {
      await deleteStrategy(strategy.id, userId);
      router.refresh();
    } catch {
      setActionError("Failed to delete strategy.");
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const adherenceColor =
    adherenceScore === undefined
      ? "text-slate-500"
      : adherenceScore >= 80
      ? "text-green-400"
      : adherenceScore >= 60
      ? "text-amber-400"
      : "text-red-400";

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col rounded-2xl border bg-slate-800/60 p-5 shadow-md transition-all duration-200",
          "hover:border-indigo-500/40 hover:bg-slate-800/80 hover:shadow-indigo-500/10 hover:shadow-lg",
          strategy.isArchived
            ? "border-slate-700/50 opacity-60"
            : "border-slate-700"
        )}
      >
        {/* Top row: title + options */}
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/playbook/${strategy.id}`}
            className="flex-1 min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="truncate text-base font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
              {strategy.title}
            </h3>
          </Link>

          <div className="flex flex-shrink-0 items-center gap-2">
            {/* Status badges */}
            {strategy.isActive && !strategy.isArchived && (
              <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-400 text-xs">
                Active
              </Badge>
            )}
            {strategy.isArchived && (
              <Badge className="border-slate-600/30 bg-slate-700/30 text-slate-500 text-xs">
                Archived
              </Badge>
            )}

            {/* Options dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-500 hover:bg-slate-700 hover:text-slate-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Strategy options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 border-slate-700 bg-slate-800 text-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem asChild>
                  <Link
                    href={`/playbook/${strategy.id}/edit`}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                </DropdownMenuItem>

                {!strategy.isActive && !strategy.isArchived && (
                  <DropdownMenuItem
                    onClick={handleSetActive}
                    disabled={isPending}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Set as Active
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={handleArchive}
                  disabled={isPending}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Archive className="h-3.5 w-3.5" />
                  {strategy.isArchived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-700" />

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  className="flex cursor-pointer items-center gap-2 text-sm text-red-400 focus:bg-red-500/10 focus:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Description */}
        {strategy.description && (
          <p className="mt-2 line-clamp-2 text-sm text-slate-400">
            {strategy.description}
          </p>
        )}

        {/* Markets */}
        {strategy.markets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {strategy.markets.map((market: string) => (
              <span
                key={market}
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                  MARKET_COLORS[market] ?? "bg-slate-700/50 text-slate-400 border-slate-600"
                )}
              >
                {market}
              </span>
            ))}
          </div>
        )}

        {/* Setup types */}
        {strategy.setupTypes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {strategy.setupTypes.slice(0, 4).map((setup: string) => (
              <span
                key={setup}
                className="inline-flex items-center rounded-md border border-slate-600/40 bg-slate-700/40 px-2 py-0.5 text-xs text-slate-400"
              >
                {setup}
              </span>
            ))}
            {strategy.setupTypes.length > 4 && (
              <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                +{strategy.setupTypes.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="mt-4 flex items-center gap-4 border-t border-slate-700/60 pt-4">
          {/* Trade count */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <BarChart2 className="h-3.5 w-3.5" />
            <span>{tradeCount} trade{tradeCount !== 1 ? "s" : ""}</span>
          </div>

          {/* Adherence score */}
          {tradeCount > 0 && adherenceScore !== undefined && (
            <div className={cn("flex items-center gap-1.5 text-xs font-medium", adherenceColor)}>
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{adherenceScore}% adherence</span>
            </div>
          )}

          {/* Last updated */}
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-600">
            <Clock className="h-3 w-3" />
            <span>{formatDate(strategy.updatedAt)}</span>
          </div>
        </div>

        {/* Action error */}
        {actionError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {actionError}
          </div>
        )}

        {/* Clickable overlay for card navigation */}
        <Link
          href={`/playbook/${strategy.id}`}
          className="absolute inset-0 rounded-2xl"
          aria-label={`View ${strategy.title}`}
          tabIndex={-1}
        />
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="border-slate-700 bg-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Delete Strategy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-200">{strategy.title}</span>?
              This action cannot be undone and will remove all association with existing trades.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
