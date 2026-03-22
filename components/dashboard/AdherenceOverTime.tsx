"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from "recharts";
import { AdherenceOverTimePoint } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AdherenceOverTimeProps {
  data: AdherenceOverTimePoint[];
  height?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayload {
  value: number;
  payload: AdherenceOverTimePoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-indigo-400 font-semibold">
        Adherence: {point.adherenceScore}%
      </p>
      <p className="text-slate-400 text-xs mt-0.5">
        {point.tradeCount} trade{point.tradeCount !== 1 ? "s" : ""} that day
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom dot — only render when tradeCount > 0
// ---------------------------------------------------------------------------

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: AdherenceOverTimePoint;
}

function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (!payload || payload.tradeCount === 0) return null;
  if (cx === undefined || cy === undefined) return null;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={3}
      fill="#6366f1"
      stroke="#0f172a"
      strokeWidth={1.5}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdherenceOverTime({
  data,
  height = 280,
}: AdherenceOverTimeProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm text-center px-4" style={{ height }}>
        No adherence data yet. Start reviewing your trades to see this chart.
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    dateLabel: formatDate(d.date),
  }));

  // Reduce tick density: show at most 8 ticks
  const tickInterval =
    formattedData.length <= 8
      ? 0
      : Math.ceil(formattedData.length / 8) - 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={formattedData}
        margin={{ top: 12, right: 12, left: 4, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis
          dataKey="dateLabel"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={tickInterval}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
          width={44}
          label={{
            value: "Adherence %",
            angle: -90,
            position: "insideLeft",
            offset: 8,
            style: { fill: "#64748b", fontSize: 11 },
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        {/* Target line */}
        <ReferenceLine
          y={70}
          stroke="#22c55e"
          strokeDasharray="5 4"
          label={{
            value: "Target",
            position: "right",
            style: { fill: "#22c55e", fontSize: 10 },
          }}
        />
        {/* Poor threshold */}
        <ReferenceLine
          y={40}
          stroke="#ef4444"
          strokeDasharray="5 4"
          strokeOpacity={0.4}
        />
        <Line
          type="monotone"
          dataKey="adherenceScore"
          stroke="#6366f1"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 5, fill: "#6366f1", stroke: "#0f172a", strokeWidth: 2 }}
          isAnimationActive={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
