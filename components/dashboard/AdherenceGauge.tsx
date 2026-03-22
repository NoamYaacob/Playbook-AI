"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AdherenceGaugeProps {
  score: number; // 0–100
}

// ---------------------------------------------------------------------------
// Color logic
// ---------------------------------------------------------------------------

function getColor(score: number): string {
  if (score <= 40) return "#f87171"; // red-400
  if (score <= 70) return "#fbbf24"; // amber-400
  return "#34d399"; // emerald-400
}

function getLabel(score: number): string {
  if (score <= 40) return "Needs Work";
  if (score <= 70) return "Improving";
  return "On Plan";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdherenceGauge({ score }: AdherenceGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = getColor(clamped);
  const label = getLabel(clamped);

  // RadialBar expects a "value" between 0–100
  const data = [
    { name: "Adherence", value: clamped, fill: color },
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative w-[180px] h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="90%"
            barSize={14}
            data={data}
            startAngle={210}
            endAngle={-30}
          >
            {/* Background track */}
            <RadialBar
              background={{ fill: "#1e293b" }}
              dataKey="value"
              cornerRadius={8}
              isAnimationActive={true}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold" style={{ color }}>
            {clamped}%
          </span>
          <span className="text-xs text-slate-400 mt-0.5">{label}</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-slate-300">Adherence Score</p>
        <p className="text-xs text-slate-500 mt-0.5">Based on reviewed trades</p>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
          0–40
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          41–70
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          71–100
        </span>
      </div>
    </div>
  );
}
