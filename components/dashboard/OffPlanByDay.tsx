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
import { OffPlanByDayPoint } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OffPlanByDayProps {
  data: OffPlanByDayPoint[];
  height?: number;
}

// ---------------------------------------------------------------------------
// Helpers — interpolate indigo (#6366f1) → red (#ef4444) based on rate 0–1
// ---------------------------------------------------------------------------

function rateToColor(rate: number): string {
  // Indigo: r=99 g=102 b=241
  // Red:    r=239 g=68  b=68
  const r = Math.round(99 + (239 - 99) * rate);
  const g = Math.round(102 + (68 - 102) * rate);
  const b = Math.round(241 + (68 - 241) * rate);
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipEntry {
  payload: OffPlanByDayPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const pct = (d.offPlanRate * 100).toFixed(0);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <p className="text-slate-200 font-semibold mb-1">{d.dayLabel}</p>
      <p className="text-slate-400 text-xs">
        {d.offPlanCount} off-plan of {d.totalCount} total ({pct}%)
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OffPlanByDay({ data, height = 280 }: OffPlanByDayProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm text-center px-4" style={{ height }}>
        Review your trades to see which days you tend to deviate from your playbook.
      </div>
    );
  }

  // Ensure all 7 days are present (Sun–Sat), fill zeros for missing
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDay = new Map<number, OffPlanByDayPoint>();
  for (const d of data) byDay.set(d.dayOfWeek, d);

  const chartData: (OffPlanByDayPoint & { shortLabel: string })[] = DAY_LABELS.map(
    (label, i) => {
      const existing = byDay.get(i);
      return {
        dayOfWeek: i,
        dayLabel: label,
        shortLabel: label,
        offPlanCount: existing?.offPlanCount ?? 0,
        totalCount: existing?.totalCount ?? 0,
        offPlanRate: existing?.offPlanRate ?? 0,
      };
    }
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 12, right: 8, left: 4, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis
          dataKey="shortLabel"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#334155", opacity: 0.4 }} />
        <Bar dataKey="offPlanRate" radius={[3, 3, 0, 0]} maxBarSize={40}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={rateToColor(entry.offPlanRate)}
              fillOpacity={entry.totalCount === 0 ? 0.2 : 1}
            />
          ))}
          <LabelList
            dataKey="totalCount"
            position="top"
            style={{ fill: "#64748b", fontSize: 10 }}
            formatter={(v) => (Number(v) > 0 ? `${v}` : "")}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
