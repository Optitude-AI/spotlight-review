"use client";

import { useMemo } from "react";
import { useHeadshotStore } from "@/store/headshot-store";
import { PortraitCard } from "@/components/portrait-card";
import { computeShortlist } from "@/lib/scoring";
import { ImageOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "score" | "name" | "recent";

export function PortraitGrid({
  sortKey,
  showRejected,
}: {
  sortKey: SortKey;
  showRejected: boolean;
}) {
  const portraits = useHeadshotStore((s) => s.portraits);
  const isEvaluating = useHeadshotStore((s) => s.isEvaluating);

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
      // score desc, done first
      const sa = a.overrideScore ?? a.evaluation?.overall_score ?? -1;
      const sb = b.overrideScore ?? b.evaluation?.overall_score ?? -1;
      return sb - sa;
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
    <div className="relative">
      {(isEvaluating || portraits.some((p) => p.status === "evaluating")) && (
        <div className="pointer-events-none sticky top-16 z-20 mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-spotlight" />
          Evaluating portraits…
        </div>
      )}
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
      {visible.length === 0 && (
        <p className={cn("py-8 text-center text-sm text-muted-foreground")}>
          All portraits are rejected. Toggle &quot;show rejected&quot; to
          review them.
        </p>
      )}
    </div>
  );
}
