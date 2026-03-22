"use client";

import { Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TopImprovement } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TopImprovementsProps {
  improvements: TopImprovement[];
  isLoading?: boolean;
  lastUpdated?: Date | null;
}

// ---------------------------------------------------------------------------
// Type config
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<
  TopImprovement["type"],
  { label: string; badgeClass: string; glowClass: string }
> = {
  behavior: {
    label: "Behavior",
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    glowClass: "shadow-amber-900/30",
  },
  setup: {
    label: "Setup",
    badgeClass: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    glowClass: "shadow-indigo-900/30",
  },
  risk: {
    label: "Risk",
    badgeClass: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    glowClass: "shadow-rose-900/30",
  },
  timing: {
    label: "Timing",
    badgeClass: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    glowClass: "shadow-teal-900/30",
  },
};

const RANK_COLORS = ["text-amber-400", "text-slate-300", "text-amber-600"];

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 rounded-lg bg-slate-700/60 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 rounded-full bg-slate-700/60" />
          </div>
          <div className="h-4 w-3/4 rounded bg-slate-700/60" />
          <div className="h-3 w-full rounded bg-slate-700/40" />
          <div className="h-3 w-2/3 rounded bg-slate-700/40" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Improvement card
// ---------------------------------------------------------------------------

function ImprovementCard({ item }: { item: TopImprovement }) {
  const config = TYPE_CONFIG[item.type];
  const rankColor = RANK_COLORS[item.rank - 1] ?? "text-slate-400";

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-lg transition-colors hover:border-slate-600/60",
        config.glowClass,
      )}
    >
      <div className="flex items-start gap-4">
        {/* Rank badge */}
        <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-900/60 border border-slate-700/50 flex items-center justify-center">
          <span className={cn("text-lg font-bold leading-none", rankColor)}>
            {item.rank}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge
              className={cn("text-xs border font-medium", config.badgeClass)}
              variant="outline"
            >
              {config.label}
            </Badge>
          </div>

          <p className="text-sm font-semibold text-slate-100 leading-snug mb-1.5">
            {item.title}
          </p>

          <p className="text-xs text-slate-400 leading-relaxed">
            {item.description}
          </p>

          {item.metric && (
            <div className="mt-2.5">
              <span className="inline-flex items-center rounded-md bg-slate-900/60 border border-slate-700/50 px-2 py-0.5 text-xs font-mono text-rose-400">
                {item.metric}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TopImprovements({
  improvements,
  isLoading = false,
  lastUpdated,
}: TopImprovementsProps) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-indigo-400 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Your Top 3 Improvement Areas
          </h2>
        </div>
        {lastUpdated && !isLoading && (
          <span className="text-xs text-slate-600 shrink-0">
            Updated{" "}
            {lastUpdated.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : improvements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center rounded-xl border border-slate-700/40 bg-slate-800/20">
          <Brain className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500 max-w-xs">
            Complete at least 10 reviewed trades to unlock improvement insights.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {improvements.slice(0, 3).map((item) => (
            <ImprovementCard key={item.rank} item={item} />
          ))}
        </div>
      )}

      {/* Footer disclaimer */}
      {!isLoading && improvements.length > 0 && (
        <p className="mt-3 text-xs text-slate-600 leading-relaxed">
          These observations are based on patterns in your own historical trade
          data. They do not constitute advice on future trades.
        </p>
      )}
    </div>
  );
}
