"use client";

import { scoreStyle } from "@/lib/scoring";

interface ScoreRingProps {
  score: number; // 0–100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  confidence?: number; // 0–1, optional
}

/**
 * Circular score gauge. Renders an SVG ring whose arc length is proportional
 * to the score, coloured by quality band. A fainter confidence arc sits
 * behind it when provided.
 */
export function ScoreRing({
  score,
  size = 64,
  strokeWidth = 6,
  showLabel = false,
  confidence,
}: ScoreRingProps) {
  const style = scoreStyle(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const confDash =
    confidence != null ? (confidence * circumference) : circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        {confidence != null && confidence < 0.95 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${confDash} ${circumference}`}
            strokeLinecap="round"
            className="text-muted-foreground/30"
          />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={style.ringStroke}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-semibold tabular-nums ${style.textClass}`}
          style={{ fontSize: size * 0.28 }}
        >
          {Math.round(score)}
        </span>
        {showLabel && (
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground -mt-0.5">
            {style.label}
          </span>
        )}
      </div>
    </div>
  );
}
