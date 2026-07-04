"use client";

import { ArrowUpDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "score" | "name" | "recent";

interface GridToolbarProps {
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
  showRejected: boolean;
  onToggleRejected: () => void;
  total: number;
  shown: number;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "Score" },
  { value: "recent", label: "Recent" },
  { value: "name", label: "Name" },
];

export function GridToolbar({
  sortKey,
  onSortChange,
  showRejected,
  onToggleRejected,
  total,
  shown,
}: GridToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Sort</span>
        <div className="flex rounded-lg border border-border bg-card p-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSortChange(opt.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                sortKey === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {shown} of {total}
        </span>
        <button
          type="button"
          onClick={onToggleRejected}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            showRejected
              ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          {showRejected ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          Rejected
        </button>
      </div>
    </div>
  );
}
