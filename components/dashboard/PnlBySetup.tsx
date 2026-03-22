"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { PnlBySetupPoint } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Metric = "totalPnl" | "avgR" | "winRate";

interface PnlBySetupProps {
  data: PnlBySetupPoint[];
  metric?: Metric;
  height?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMetricValue(value: number, metric: Metric): string {
  if (metric === "totalPnl") {
    return `${value >= 0 ? "+" : ""}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  if (metric === "avgR") {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
  }
  // winRate
  return `${(value * 100).toFixed(0)}%`;
}

function metricLabel(metric: Metric): string {
  if (metric === "totalPnl") return "Total PnL";
  if (metric === "avgR") return "Avg R";
  return "Win Rate";
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipEntry {
  payload: PnlBySetupPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm min-w-[160px]">
      <p className="text-slate-200 font-semibold mb-1 truncate">{d.setupType}</p>
      <div className="space-y-0.5 text-xs">
        <p className="text-slate-400">Trades: <span className="text-slate-200">{d.tradeCount}</span></p>
        <p className="text-slate-400">Win Rate: <span className="text-slate-200">{(d.winRate * 100).toFixed(0)}%</span></p>
        <p className="text-slate-400">Avg R: <span className={d.avgR >= 0 ? "text-emerald-400" : "text-rose-400"}>{d.avgR >= 0 ? "+" : ""}{d.avgR.toFixed(2)}R</span></p>
        <p className="text-slate-400">Total PnL: <span className={d.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>{d.totalPnl >= 0 ? "+" : ""}${d.totalPnl.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PnlBySetup({
  data,
  metric = "avgR",
  height = 300,
}: PnlBySetupProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm text-center px-4" style={{ height }}>
        Add setup types to your trades to see performance by setup.
      </div>
    );
  }

  // Sort by selected metric descending
  const sorted = [...data].sort((a, b) => b[metric] - a[metric]);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 64, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatMetricValue(v, metric)}
            label={{
              value: metricLabel(metric),
              position: "insideBottom",
              offset: -2,
              style: { fill: "#64748b", fontSize: 11 },
            }}
          />
          <YAxis
            type="category"
            dataKey="setupType"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#334155", opacity: 0.4 }} />
          <Bar dataKey={metric} radius={[0, 3, 3, 0]} maxBarSize={24}>
            {sorted.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry[metric] >= 0 ? "#34d399" : "#f87171"}
              />
            ))}
            <LabelList
              dataKey={metric}
              position="right"
              style={{ fill: "#94a3b8", fontSize: 11 }}
              formatter={(v) => formatMetricValue(Number(v), metric)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
