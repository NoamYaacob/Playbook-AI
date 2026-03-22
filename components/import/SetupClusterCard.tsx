"use client";

// ---------------------------------------------------------------------------
// SetupClusterCard – displays a single AI-generated setup cluster suggestion
// ---------------------------------------------------------------------------

import { useState } from "react";
import type { SetupClusterRow } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Pencil,
  X,
  BarChart2,
  TrendingUp,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  cluster: SetupClusterRow;
  onConfirm: (clusterId: string, setupType: string) => void;
  onRename: (clusterId: string, newName: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function rMultiple(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SetupClusterCard({ cluster, onConfirm, onRename }: Props) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(cluster.name);
  const [confirmLabel, setConfirmLabel] = useState(
    cluster.suggestedSetupType ?? cluster.name,
  );
  const [isEditingLabel, setIsEditingLabel] = useState(false);

  const handleConfirm = () => {
    onConfirm(cluster.id, confirmLabel);
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim()) {
      onRename(cluster.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all space-y-4",
        cluster.userConfirmed
          ? "border-indigo-500/30 bg-indigo-500/5"
          : "border-slate-700 bg-slate-900/60",
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <div className="flex items-center gap-2">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") setIsRenaming(false);
                }}
                className="h-8 text-base font-semibold bg-slate-800/80 border-slate-600 text-slate-100 focus:border-indigo-500"
                autoFocus
              />
              <button
                type="button"
                onClick={handleRenameSubmit}
                className="p-1 rounded text-indigo-400 hover:text-indigo-300"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenameValue(cluster.name);
                  setIsRenaming(false);
                }}
                className="p-1 rounded text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-100 leading-tight">
                {cluster.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsRenaming(true)}
                className="text-slate-600 hover:text-slate-400 transition-colors"
                title="Rename cluster"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {cluster.description && (
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              {cluster.description}
            </p>
          )}
        </div>

        {/* Trade count badge */}
        <div className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          <Hash className="h-3 w-3 text-slate-500" />
          {cluster.tradeCount} trade{cluster.tradeCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      {(cluster.winRate != null || cluster.avgR != null) && (
        <div className="flex items-center gap-4">
          {cluster.winRate != null && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <BarChart2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Win rate:</span>
              <span
                className={cn(
                  "font-semibold",
                  cluster.winRate >= 0.55
                    ? "text-green-400"
                    : cluster.winRate >= 0.4
                    ? "text-yellow-400"
                    : "text-red-400",
                )}
              >
                {pct(cluster.winRate)}
              </span>
            </div>
          )}
          {cluster.avgR != null && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
              <span>Avg R:</span>
              <span
                className={cn(
                  "font-semibold",
                  cluster.avgR > 0 ? "text-green-400" : "text-red-400",
                )}
              >
                {rMultiple(cluster.avgR)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Keywords ────────────────────────────────────────────────── */}
      {cluster.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cluster.keywords.map((kw) => (
            <span
              key={kw}
              className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* ── Trade previews ──────────────────────────────────────────── */}
      {cluster.tradeIds.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">
            Sample trades:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {cluster.tradeIds.slice(0, 3).map((id) => (
              <span
                key={id}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700/50"
                title={id}
              >
                …{id.slice(-6)}
              </span>
            ))}
            {cluster.tradeIds.length > 3 && (
              <span className="text-[10px] text-slate-600">
                +{cluster.tradeIds.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm / confirmed section ─────────────────────────────── */}
      <div className="pt-1 border-t border-slate-800">
        {cluster.userConfirmed ? (
          <div className="flex items-center gap-2 text-sm text-indigo-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Confirmed as{" "}
              <span className="font-semibold">&ldquo;{confirmLabel}&rdquo;</span>
            </span>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1.5">
              <p className="text-xs text-slate-500">Suggested label:</p>
              {isEditingLabel ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={confirmLabel}
                    onChange={(e) => setConfirmLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setIsEditingLabel(false);
                      if (e.key === "Escape") setIsEditingLabel(false);
                    }}
                    className="h-7 text-sm bg-slate-800/80 border-slate-600 text-slate-100 focus:border-indigo-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingLabel(false)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 whitespace-nowrap"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-200">
                    {confirmLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingLabel(true)}
                    className="text-slate-600 hover:text-slate-400 transition-colors"
                    title="Edit label"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <Button
              size="sm"
              onClick={handleConfirm}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 h-8"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Confirm
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
