import { AlertTriangle, BarChart2, BookOpen, Brain, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InsightSnapshotRow, InsightType } from "@/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BehaviorPatternsProps {
  insights: InsightSnapshotRow[];
}

// ---------------------------------------------------------------------------
// Config per insight type
// ---------------------------------------------------------------------------

const insightConfig: Record<
  InsightType,
  { label: string; icon: React.ElementType; badgeClass: string }
> = {
  ADHERENCE_SUMMARY: {
    label: "Adherence",
    icon: BookOpen,
    badgeClass: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  },
  BEHAVIOR_PATTERN: {
    label: "Behavior",
    icon: Brain,
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  SETUP_PERFORMANCE: {
    label: "Setup",
    icon: BarChart2,
    badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  RISK_VIOLATION: {
    label: "Risk",
    icon: AlertTriangle,
    badgeClass: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  },
  COACHING_INSIGHT: {
    label: "Coaching",
    icon: Zap,
    badgeClass: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  DAILY_SUMMARY: {
    label: "Daily",
    icon: TrendingUp,
    badgeClass: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  },
};

// ---------------------------------------------------------------------------
// Single insight card
// ---------------------------------------------------------------------------

function InsightCard({ insight }: { insight: InsightSnapshotRow }) {
  const config = insightConfig[insight.type] ?? insightConfig.COACHING_INSIGHT;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "p-4 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:border-slate-600/60 transition-colors",
        !insight.isRead && "ring-1 ring-indigo-500/20",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-slate-700/50 shrink-0 mt-0.5">
          <Icon className="h-4 w-4 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge
              className={cn("text-xs border font-medium", config.badgeClass)}
              variant="outline"
            >
              {config.label}
            </Badge>
            {!insight.isRead && (
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            )}
          </div>
          <p className="text-sm font-semibold text-slate-200 leading-snug mb-1">{insight.title}</p>
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{insight.body}</p>
          <p className="text-xs text-slate-600 mt-2">
            {new Date(insight.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BehaviorPatterns({ insights }: BehaviorPatternsProps) {
  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <Brain className="h-8 w-8 text-slate-600" />
        <p className="text-sm text-slate-500">No behavior patterns detected yet.</p>
        <p className="text-xs text-slate-600">
          Keep logging and reviewing trades to generate AI insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
