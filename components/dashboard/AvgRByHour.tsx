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
  ReferenceLine,
} from "recharts";
import { AvgRByHourPoint } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AvgRByHourProps {
  data: AvgRByHourPoint[];
  height?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipEntry {
  payload: AvgRByHourPoint;
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
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <p className="text-slate-200 font-semibold mb-1">{formatHour(d.hour)}</p>
      <div className="space-y-0.5 text-xs">
        <p className="text-slate-400">
          Avg R:{" "}
          <span className={d.avgR >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {d.avgR >= 0 ? "+" : ""}{d.avgR.toFixed(2)}R
          </span>
        </p>
        <p className="text-slate-400">
          Trades: <span className="text-slate-200">{d.tradeCount}</span>
          {d.tradeCount < 3 && (
            <span className="text-amber-400 ml-1">(low sample)</span>
          )}
        </p>
        <p className="text-slate-400">
          Win Rate: <span className="text-slate-200">{(d.winRate * 100).toFixed(0)}%</span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvgRByHour({ data, height = 280 }: AvgRByHourProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm text-center px-4" style={{ height }}>
        No completed trades with R values yet.
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 12, right: 8, left: 4, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatHour}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}R`}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#334155", opacity: 0.4 }} />
          <ReferenceLine y={0} stroke="#ffffff" strokeOpacity={0.2} />
          <Bar dataKey="avgR" radius={[3, 3, 0, 0]} maxBarSize={28}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.avgR >= 0 ? "#34d399" : "#f87171"}
                fillOpacity={entry.tradeCount < 3 ? 0.35 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 text-center mt-1 px-4">
        Hours with fewer than 3 trades may not be statistically significant.
      </p>
    </div>
  );
}
