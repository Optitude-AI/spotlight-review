"use client";

import { Pin, Ban, RotateCw, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useHeadshotStore } from "@/store/headshot-store";
import type { Portrait } from "@/lib/types";
import { ScoreRing } from "@/components/score-ring";
import { humanizeFlag, humanizeType, scoreStyle } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PortraitCardProps {
  portrait: Portrait;
  inShortlist?: boolean;
  rank?: number;
}

export function PortraitCard({
  portrait,
  inShortlist,
  rank,
}: PortraitCardProps) {
  const selectPortrait = useHeadshotStore((s) => s.selectPortrait);
  const togglePin = useHeadshotStore((s) => s.togglePin);
  const toggleReject = useHeadshotStore((s) => s.toggleReject);
  const evaluatePortrait = useHeadshotStore((s) => s.evaluatePortrait);
  const removePortrait = useHeadshotStore((s) => s.removePortrait);

  const { evaluation, status } = portrait;
  const displayScore =
    portrait.overrideScore ?? evaluation?.overall_score ?? 0;
  const style = scoreStyle(displayScore);

  const topType = evaluation?.casting.type_labels[0];
  const flags = [
    ...(evaluation?.technical.flags ?? []),
    ...(evaluation?.aesthetic_market.flags ?? []),
  ].slice(0, 3);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md",
        portrait.rejected
          ? "border-rose-500/30 opacity-60"
          : portrait.pinned
            ? "border-spotlight ring-1 ring-spotlight/40"
            : "border-border",
        inShortlist && !portrait.pinned && "ring-1 ring-emerald-500/30"
      )}
    >
      {/* Rank ribbon for shortlist */}
      {rank != null && (
        <div className="absolute left-0 top-0 z-20 flex h-7 w-7 items-center justify-center rounded-br-lg rounded-tl-xl bg-primary text-xs font-bold text-primary-foreground">
          {rank}
        </div>
      )}

      {/* Image */}
      <button
        type="button"
        onClick={() => selectPortrait(portrait.id)}
        className="relative block aspect-[3/4] w-full overflow-hidden bg-muted"
        aria-label={`View details for ${portrait.name}`}
      >
        {/* next/no-img-element rule is not enabled in this config */}
        <img
          src={portrait.dataUrl}
          alt={portrait.name}
          className={cn(
            "h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            portrait.rejected && "grayscale"
          )}
          loading="lazy"
        />
        {portrait.source === "sample" && (
          <span className="absolute left-2 top-2 z-10 rounded bg-background/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
            Sample
          </span>
        )}

        {/* Status overlays */}
        {status === "evaluating" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-spotlight" />
            <span className="text-xs font-medium text-foreground">
              Evaluating…
            </span>
          </div>
        )}
        {status === "queued" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              Queued
            </span>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-rose-500/10 p-3 text-center backdrop-blur-sm">
            <AlertCircle className="h-6 w-6 text-rose-500" />
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              {portrait.error ?? "Evaluation failed"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void evaluatePortrait(portrait.id);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-[10px] font-medium text-foreground shadow-sm hover:bg-muted"
            >
              <RotateCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {/* Score ring top-right when done */}
        {status === "done" && evaluation && (
          <div className="absolute right-2 top-2 z-10 rounded-full bg-background/85 p-0.5 backdrop-blur">
            <ScoreRing score={displayScore} size={48} strokeWidth={4} />
          </div>
        )}
      </button>

      {/* Footer */}
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1">
          <h4 className="truncate text-xs font-semibold" title={portrait.name}>
            {portrait.name}
          </h4>
          {status === "done" && evaluation && (
            <Badge
              variant="outline"
              className={cn("shrink-0 px-1.5 py-0 text-[9px]", style.badgeClass)}
            >
              {style.label}
            </Badge>
          )}
        </div>

        {status === "done" && evaluation && (
          <div className="mt-1.5 space-y-1.5">
            {topType && (
              <div className="flex flex-wrap gap-1">
                <span className="rounded bg-spotlight/10 px-1.5 py-0.5 text-[9px] font-medium text-spotlight">
                  {humanizeType(topType.label)}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                  {evaluation.casting.apparent_age_range[0]}–
                  {evaluation.casting.apparent_age_range[1]}
                </span>
              </div>
            )}
            {flags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {flags.map((f) => (
                  <span
                    key={f}
                    className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] text-rose-600 dark:text-rose-400"
                  >
                    {humanizeFlag(f)}
                  </span>
                ))}
              </div>
            )}
            {portrait.overrideScore != null && (
              <span className="text-[9px] italic text-muted-foreground">
                score overridden
              </span>
            )}
          </div>
        )}

        {/* Action row */}
        <div className="mt-2 flex items-center gap-1 border-t border-border/60 pt-2">
          <button
            type="button"
            onClick={() => togglePin(portrait.id)}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded transition-colors",
              portrait.pinned
                ? "bg-spotlight/15 text-spotlight"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={portrait.pinned ? "Unpin" : "Pin to shortlist"}
            aria-label={portrait.pinned ? "Unpin" : "Pin to shortlist"}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => toggleReject(portrait.id)}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded transition-colors",
              portrait.rejected
                ? "bg-rose-500/15 text-rose-500"
                : "text-muted-foreground hover:bg-muted hover:text-rose-500"
            )}
            title={portrait.rejected ? "Un-reject" : "Reject"}
            aria-label={portrait.rejected ? "Un-reject" : "Reject"}
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => removePortrait(portrait.id)}
            className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Remove"
            aria-label="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
