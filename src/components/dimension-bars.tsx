"use client";

import { cn } from "@/lib/utils";

export interface BarItem {
  label: string;
  value: number; // 0–1
}

/** Horizontal sub-score bars for a single dimension block. */
export function DimensionBars({
  items,
  className,
}: {
  items: BarItem[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {items.map((item) => {
        const pct = Math.round(item.value * 100);
        const color =
          item.value >= 0.7
            ? "bg-emerald-500"
            : item.value >= 0.5
              ? "bg-spotlight"
              : "bg-rose-500";
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium tabular-nums text-foreground">
                {pct}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", color)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
