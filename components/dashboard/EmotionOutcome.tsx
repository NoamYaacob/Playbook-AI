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
import { EmotionOutcomePoint, EmotionTag } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EmotionOutcomeProps {
  data: EmotionOutcomePoint[];
  height?: number;
}

// ---------------------------------------------------------------------------
// Emotion display map
// ---------------------------------------------------------------------------

const EMOTION_DISPLAY: Record<EmotionTag, string> = {
  CONFIDENT: "😊 Confident",
  ANXIOUS: "😰 Anxious",
  NEUTRAL: "😌 Neutral",
  FOMO: "😤 FOMO",
  REVENGE: "😡 Revenge",
  GREEDY: "🤑 Greedy",
  FEARFUL: "😨 Fearful",
  DISCIPLINED: "🧘 Disciplined",
  IMPULSIVE: "⚡ Impulsive",
  PATIENT: "🙂 Patient",
};

function emotionLabel(emotion: EmotionTag): string {
  return EMOTION_DISPLAY[emotion] ?? emotion;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipEntry {
  payload: EmotionOutcomePoint;
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
      <p className="text-slate-200 font-semibold mb-1">{emotionLabel(d.emotion)}</p>
      <div className="space-y-0.5 text-xs">
        <p className="text-slate-400">
          Avg R:{" "}
          <span className={d.avgR >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {d.avgR >= 0 ? "+" : ""}{d.avgR.toFixed(2)}R
          </span>
        </p>
        <p className="text-slate-400">
          Avg PnL:{" "}
          <span className={d.avgPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {d.avgPnl >= 0 ? "+" : ""}${Math.abs(d.avgPnl).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </p>
        <p className="text-slate-400">Win Rate: <span className="text-slate-200">{(d.winRate * 100).toFixed(0)}%</span></p>
        <p className="text-slate-400">Trades: <span className="text-slate-200">{d.tradeCount}</span></p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmotionOutcome({ data, height = 280 }: EmotionOutcomeProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm text-center px-4" style={{ height }}>
        Log your emotional state on trades to see this analysis.
      </div>
    );
  }

  // Sort by avgR descending (best-performing emotions first)
  const sorted = [...data].sort((a, b) => b.avgR - a.avgR);

  const chartData = sorted.map((d) => ({
    ...d,
    emotionLabel: emotionLabel(d.emotion),
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 8, left: 4, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="emotionLabel"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-30}
            textAnchor="end"
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
          <Bar dataKey="avgR" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.avgR >= 0 ? "#34d399" : "#f87171"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 text-center mt-1 px-4">
        Emotions are self-reported. This chart reflects patterns in your own data only.
      </p>
    </div>
  );
}
