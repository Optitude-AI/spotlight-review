"use client";

import { useMemo } from "react";
import { useHeadshotStore } from "@/store/headshot-store";
import { PortraitCard } from "@/components/portrait-card";
import { computeShortlist } from "@/lib/scoring";
import { ImageOff } from "lucide-react";

type SortKey =
  | "score"
  | "name"
  | "recent"
  | "eye_focus"
  | "background"
  | "expression"
  | "believability";

export function PortraitGrid({
  sortKey,
  showRejected,
}: {
  sortKey: SortKey;
  showRejected: boolean;
}) {
  const portraits = useHeadshotStore((s) => s.portraits);

  const shortlistIds = useMemo(
    () => new Set(computeShortlist(portraits, 8)),
    [portraits]
  );

  const visible = useMemo(() => {
    let list = portraits;
    if (!showRejected) list = list.filter((p) => !p.rejected);
    const sorted = [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "recent") return b.createdAt - a.createdAt;
      const getVal = (p: typeof a): number => {
        const e = p.evaluation;
        if (!e) return -1;
        switch (sortKey) {
          case "eye_focus":
            return e.technical.eye_focus;
          case "background":
            return e.aesthetic_market.background_cleanliness;
          case "expression":
            return e.aesthetic_market.expression_fit;
          case "believability":
            return e.aesthetic_market.believability;
          default:
            return p.overrideScore ?? e.overall_score;
        }
      };
      return getVal(b) - getVal(a);
    });
    return sorted;
  }, [portraits, sortKey, showRejected]);

  if (portraits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <ImageOff className="h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          No portraits yet
        </p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Upload a batch of headshots or try the samples to see structured
          feedback across three dimensions.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {visible.map((p) => {
        const rank = shortlistIds.has(p.id)
          ? Array.from(shortlistIds).indexOf(p.id) + 1
          : undefined;
        return (
          <PortraitCard
            key={p.id}
            portrait={p}
            inShortlist={shortlistIds.has(p.id)}
            rank={rank}
          />
        );
      })}
    </div>
  );
}
