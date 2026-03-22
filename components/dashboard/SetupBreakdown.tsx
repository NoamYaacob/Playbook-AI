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
} from "recharts";
import { SetupPerformance } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SetupBreakdownProps {
  setups: SetupPerformance[];
  metric?: "winRate" | "avgR";
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface TooltipPayload {
  value: number;
  payload: SetupPerformance & { winRatePct: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  metric: "winRate" | "avgR";
}

function CustomTooltip({ active, payload, label, metric }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm space-y-1">
      <p className="text-slate-300 font-medium">{label}</p>
      <p className="text-slate-400">
        Trades: <span className="text-slate-200">{d.totalTrades}</span>
      </p>
      <p className="text-slate-400">
        Win Rate: <span className="text-slate-200">{(d.winRate * 100).toFixed(0)}%</span>
      </p>
      <p className="text-slate-400">
        Avg R: <span className={d.avgR >= 0 ? "text-emerald-400" : "text-rose-400"}>
          {d.avgR >= 0 ? "+" : ""}{d.avgR.toFixed(2)}R
        </span>
      </p>
      <p className="text-slate-400">
        Total PnL: <span className={d.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
          {d.totalPnl >= 0 ? "+" : ""}${d.totalPnl.toFixed(0)}
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SetupBreakdown({ setups, metric = "winRate" }: SetupBreakdownProps) {
  if (setups.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        No setup data available.
      </div>
    );
  }

  const data = setups.map((s) => ({
    ...s,
    winRatePct: parseFloat((s.winRate * 100).toFixed(1)),
  }));

  const dataKey = metric === "winRate" ? "winRatePct" : "avgR";

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis
          dataKey="setupType"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={data.length > 4 ? -20 : 0}
          textAnchor={data.length > 4 ? "end" : "middle"}
          height={data.length > 4 ? 40 : 24}
        />
        <YAxis
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            metric === "winRate" ? `${v}%` : `${v >= 0 ? "+" : ""}${v.toFixed(1)}R`
          }
          width={42}
        />
        <Tooltip
          content={<CustomTooltip metric={metric} />}
          cursor={{ fill: "#1e293b" }}
        />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => {
            const val = metric === "winRate" ? entry.winRatePct : entry.avgR;
            const color = val >= (metric === "winRate" ? 50 : 0) ? "#34d399" : "#f87171";
            return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.85} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
