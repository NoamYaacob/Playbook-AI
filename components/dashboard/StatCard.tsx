import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StatCardVariant = "positive" | "negative" | "neutral";

interface SparklinePoint {
  value: number;
}

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeLabel?: string;
  variant?: StatCardVariant;
  sparkline?: SparklinePoint[];
  icon?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Sparkline (inline SVG, no recharts overhead)
// ---------------------------------------------------------------------------

function MiniSparkline({ points, variant }: { points: SparklinePoint[]; variant: StatCardVariant }) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 80;
  const H = 28;
  const step = W / (points.length - 1);

  const coords = values.map((v, i) => ({
    x: i * step,
    y: H - ((v - min) / range) * H,
  }));

  const pathD = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  const fillD =
    pathD +
    ` L ${coords[coords.length - 1].x.toFixed(1)} ${H} L 0 ${H} Z`;

  const strokeColor =
    variant === "positive"
      ? "#34d399"
      : variant === "negative"
      ? "#f87171"
      : "#94a3b8";

  const fillColor =
    variant === "positive"
      ? "#34d39920"
      : variant === "negative"
      ? "#f8717120"
      : "#94a3b820";

  return (
    <svg width={W} height={H} className="shrink-0 overflow-visible">
      <path d={fillD} fill={fillColor} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  variant = "neutral",
  sparkline,
  icon,
}: StatCardProps) {
  const variantConfig = {
    positive: {
      valueClass: "text-emerald-400",
      changeClass: "text-emerald-400",
      Icon: TrendingUp,
    },
    negative: {
      valueClass: "text-rose-400",
      changeClass: "text-rose-400",
      Icon: TrendingDown,
    },
    neutral: {
      valueClass: "text-slate-100",
      changeClass: "text-slate-400",
      Icon: Minus,
    },
  };

  const { valueClass, changeClass, Icon } = variantConfig[variant];

  return (
    <Card className="border-slate-800/80 bg-slate-900/65 shadow-[0_10px_30px_rgba(2,6,23,0.22)] transition-colors hover:border-slate-700/80">
      <CardContent className="px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex items-center gap-2">
              {icon && (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-800/80 text-slate-300">
                  {icon}
                </span>
              )}
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {title}
              </p>
            </div>
            <p className={cn("text-3xl font-semibold leading-none tracking-tight", valueClass)}>
              {value}
            </p>
            {change && (
              <div className="mt-2 flex items-center gap-1.5">
                <Icon className={cn("h-3.5 w-3.5", changeClass)} />
                <span className={cn("text-xs font-medium", changeClass)}>{change}</span>
                {changeLabel && (
                  <span className="text-xs text-slate-500">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          {sparkline && sparkline.length >= 2 && (
            <MiniSparkline points={sparkline} variant={variant} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
