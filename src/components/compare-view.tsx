"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHeadshotStore } from "@/store/headshot-store";
import { ScoreRing } from "@/components/score-ring";
import { DimensionRadar } from "@/components/dimension-radar";
import { humanizeType, humanizeFlag, scoreStyle } from "@/lib/scoring";
import { X, GitCompare, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeadshotEvaluation } from "@/lib/types";

/**
 * Side-by-side comparison of up to 4 portraits. Overlays radar charts and
 * scores so the user can see exactly why one ranks higher than another.
 */
export function CompareView() {
  const open = useHeadshotStore((s) => s.compareOpen);
  const setOpen = useHeadshotStore((s) => s.setCompareOpen);
  const compareIds = useHeadshotStore((s) => s.compareIds);
  const portraits = useHeadshotStore((s) => s.portraits);
  const removeFromCompare = useHeadshotStore((s) => s.removeFromCompare);
  const selectPortrait = useHeadshotStore((s) => s.selectPortrait);

  const items = compareIds
    .map((id) => portraits.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // Find the highest-scoring item to highlight as "winner".
  const winnerId = items.length > 0
    ? items.reduce((best, p) => {
        const ps = p.overrideScore ?? p.evaluation?.overall_score ?? -1;
        const bs = best.overrideScore ?? best.evaluation?.overall_score ?? -1;
        return ps > bs ? p : best;
      }).id
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92vh] max-w-7xl overflow-y-auto thin-scroll p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitCompare className="h-4 w-4 text-spotlight" />
            Compare ({items.length}/4)
            {items.length < 2 && (
              <span className="text-xs font-normal text-muted-foreground">
                · add at least 2 to compare
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No portraits selected for comparison. Use the compare button on any
            portrait card to add it here.
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-0",
              items.length === 1 && "grid-cols-1",
              items.length === 2 && "grid-cols-1 md:grid-cols-2",
              items.length >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
              "divide-x divide-border/60"
            )}
          >
            {items.map((p) => {
              const e = p.evaluation;
              const score = p.overrideScore ?? e?.overall_score ?? 0;
              const style = scoreStyle(score);
              const isWinner = p.id === winnerId && items.length >= 2;
              return (
                <div key={p.id} className="flex flex-col">
                  {/* Image + score */}
                  <div className="relative p-4">
                    <button
                      type="button"
                      onClick={() => removeFromCompare(p.id)}
                      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-background/80 text-muted-foreground hover:text-rose-500"
                      aria-label="Remove from compare"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="relative mx-auto mb-3 w-fit overflow-hidden rounded-lg border border-border/60 bg-muted">
                      <img
                        src={p.dataUrl}
                        alt={p.name}
                        className="aspect-[3/4] w-32 object-cover sm:w-40"
                      />
                      {isWinner && (
                        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          <Trophy className="h-3 w-3" />
                          Best
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <ScoreRing
                        score={score}
                        size={56}
                        strokeWidth={5}
                        confidence={e?.overall_confidence}
                      />
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          style.textClass
                        )}
                      >
                        {style.label}
                      </span>
                      <h4 className="text-center text-xs font-medium" title={p.name}>
                        {p.name}
                      </h4>
                    </div>
                  </div>

                  {/* Radar */}
                  {e && (
                    <div className="border-t border-border/60 p-3">
                      <DimensionRadar evaluation={e} />
                    </div>
                  )}

                  {/* Key metrics */}
                  {e && (
                    <div className="space-y-2 border-t border-border/60 p-4 text-xs">
                      <CompareMetric
                        label="Eye focus"
                        value={e.technical.eye_focus}
                      />
                      <CompareMetric
                        label="Background"
                        value={e.aesthetic_market.background_cleanliness}
                      />
                      <CompareMetric
                        label="Expression fit"
                        value={e.aesthetic_market.expression_fit}
                      />
                      <CompareMetric
                        label="Believability"
                        value={e.aesthetic_market.believability}
                      />
                      <div className="pt-1">
                        <span className="text-muted-foreground">Top type: </span>
                        <span className="font-medium text-spotlight">
                          {e.casting.type_labels[0]
                            ? humanizeType(e.casting.type_labels[0].label)
                            : "—"}
                        </span>
                      </div>
                      {[
                        ...e.technical.flags,
                        ...e.aesthetic_market.flags,
                      ].length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {[
                            ...e.technical.flags,
                            ...e.aesthetic_market.flags,
                          ].slice(0, 4).map((f) => (
                            <span
                              key={f}
                              className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] text-rose-600 dark:text-rose-400"
                            >
                              {humanizeFlag(f)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-auto border-t border-border/60 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        selectPortrait(p.id);
                      }}
                      className="w-full rounded-md border border-border py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      View full details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompareMetric({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{pct}</span>
      </div>
      <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            value >= 0.7 ? "bg-emerald-500" : value >= 0.5 ? "bg-spotlight" : "bg-rose-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
