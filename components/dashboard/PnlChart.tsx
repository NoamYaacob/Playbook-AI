"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TradeRow } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PnlChartProps {
  trades: TradeRow[];
}

// ---------------------------------------------------------------------------
// Data builder
// ---------------------------------------------------------------------------

interface DataPoint {
  date: string;
  equity: number;
  pnl: number;
}

function buildEquityCurve(trades: TradeRow[]): DataPoint[] {
  // Sort by entry date ascending, only closed trades with PnL
  const sorted = [...trades]
    .filter((t) => t.pnlAmount != null && !t.isOpen)
    .sort((a, b) => new Date(a.entryAt).getTime() - new Date(b.entryAt).getTime());

  let running = 0;
  const points: DataPoint[] = [];

  for (const trade of sorted) {
    const pnl = trade.pnlAmount ?? 0;
    running += pnl;

    const date = new Date(trade.entryAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    // Merge same-day points by overwriting
    const last = points[points.length - 1];
    if (last && last.date === date) {
      last.equity = running;
      last.pnl += pnl;
    } else {
      points.push({ date, equity: parseFloat(running.toFixed(2)), pnl: parseFloat(pnl.toFixed(2)) });
    }
  }

  return points;
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface TooltipPayload {
  value: number;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const equity = payload[0]?.value ?? 0;
  const isPositive = equity >= 0;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className={isPositive ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
        {isPositive ? "+" : ""}
        {equity.toLocaleString("en-US", { style: "currency", currency: "USD" })}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart component
// ---------------------------------------------------------------------------

export function PnlChart({ trades }: PnlChartProps) {
  const data = buildEquityCurve(trades);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No closed trade data to display.
      </div>
    );
  }

  const finalEquity = data[data.length - 1]?.equity ?? 0;
  const isPositiveTrend = finalEquity >= 0;
  const strokeColor = isPositiveTrend ? "#34d399" : "#f87171";
  const gradientId = isPositiveTrend ? "pnlGradientGreen" : "pnlGradientRed";
  const gradientColor = isPositiveTrend ? "#34d399" : "#f87171";

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={gradientColor} stopOpacity={0.2} />
            <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v === 0
              ? "$0"
              : `${v >= 0 ? "+" : ""}${(v / 1000).toFixed(1)}k`
          }
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={strokeColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: strokeColor, stroke: "#0f172a", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
