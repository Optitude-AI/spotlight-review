"use client";

import { useMemo } from "react";
import { useHeadshotStore } from "@/store/headshot-store";
import { computeShortlist, humanizeType, scoreStyle } from "@/lib/scoring";
import { Sparkles, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Smart shortlist panel — suggests a top-8 that balances score with
 * expression/type diversity, and surfaces pinned items explicitly.
 */
export function ShortlistPanel() {
  const portraits = useHeadshotStore((s) => s.portraits);
  const selectPortrait = useHeadshotStore((s) => s.selectPortrait);

  const shortlist = useMemo(() => {
    const ids = computeShortlist(portraits, 8);
    return ids
      .map((id) => portraits.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [portraits]);

  const doneCount = portraits.filter((p) => p.status === "done").length;
  const pinnedCount = portraits.filter((p) => p.pinned).length;

  if (portraits.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-spotlight/10">
            <Sparkles className="h-4 w-4 text-spotlight" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Suggested shortlist</h2>
            <p className="text-[11px] text-muted-foreground">
              Top {Math.min(8, shortlist.length)} balancing score &amp; range
              {pinnedCount > 0 && ` · ${pinnedCount} pinned`}
            </p>
          </div>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {doneCount}/{portraits.length} done
        </span>
      </div>

      {shortlist.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
          <ArrowDown className="h-3.5 w-3.5" />
          Upload portraits and we&apos;ll suggest a shortlist here once
          evaluations complete.
        </div>
      ) : (
        <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto thin-scroll pr-1">
          {shortlist.map((p, i) => {
            const score = p.overrideScore ?? p.evaluation?.overall_score ?? 0;
            const style = scoreStyle(score);
            const topType = p.evaluation?.casting.type_labels[0];
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPortrait(p.id)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-background p-2 text-left transition-colors hover:border-spotlight/40 hover:bg-muted/40"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
                {/* shortlist thumbnail */}
                <img
                  src={p.dataUrl}
                  alt={p.name}
                  className="h-9 w-9 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{p.name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {topType && (
                      <span className="text-[10px] text-spotlight">
                        {humanizeType(topType.label)}
                      </span>
                    )}
                    {p.pinned && (
                      <span className="text-[10px] text-emerald-500">
                        · pinned
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-bold tabular-nums",
                    style.textClass
                  )}
                >
                  {Math.round(score)}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Shortlist prioritises portfolio range over raw score — a mix of types
        at slightly lower scores beats eight near-identical frames. Override
        freely; your pins always win.
      </p>
    </div>
  );
}
