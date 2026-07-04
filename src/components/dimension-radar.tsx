"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { HeadshotEvaluation } from "@/lib/types";
import { radarData } from "@/lib/scoring";

/** Ten-axis radar comparing the three dimensions at a glance. */
export function DimensionRadar({
  evaluation,
}: {
  evaluation: HeadshotEvaluation;
}) {
  const data = radarData(evaluation).map((d) => ({
    ...d,
    value: Math.round(d.value * 100),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <Radar
            dataKey="value"
            stroke="oklch(0.74 0.155 62)"
            fill="oklch(0.74 0.155 62)"
            fillOpacity={0.28}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
