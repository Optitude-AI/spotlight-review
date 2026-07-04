"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useHeadshotStore } from "@/store/headshot-store";
import { computeShortlist, humanizeType, scoreStyle } from "@/lib/scoring";
import { Sparkles, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Mobile-only floating shortlist button + bottom drawer. On desktop, the
 * shortlist is a sticky sidebar (in the main layout); on mobile, it's a
 * bottom sheet reachable from a floating button so it doesn't sit below
 * the entire grid.
 */
export function MobileShortlistSheet() {
  const [open, setOpen] = useState(false);
  const portraits = useHeadshotStore((s) => s.portraits);
  const selectPortrait = useHeadshotStore((s) => s.selectPortrait);

  const shortlist = computeShortlist(portraits, 8)
    .map((id) => portraits.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const doneCount = portraits.filter((p) => p.status === "done").length;

  // Hide on desktop (lg and up) — the sidebar handles it there.
  return (
    <div className="lg:hidden">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Sparkles className="h-4 w-4 text-spotlight" />
            Shortlist
            {shortlist.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-spotlight px-1 text-xs font-bold text-spotlight-foreground">
                {shortlist.length}
              </span>
            )}
            <ChevronUp className="h-4 w-4" />
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-spotlight" />
              Suggested shortlist
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {doneCount}/{portraits.length} done
              </span>
            </DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[60vh] space-y-1.5 overflow-y-auto thin-scroll px-4 pb-6">
            {shortlist.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Upload portraits and we&apos;ll suggest a shortlist here.
              </p>
            ) : (
              shortlist.map((p, i) => {
                const score =
                  p.overrideScore ?? p.evaluation?.overall_score ?? 0;
                const style = scoreStyle(score);
                const topType = p.evaluation?.casting.type_labels[0];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      selectPortrait(p.id);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-card p-2 text-left"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <img
                      src={p.dataUrl}
                      alt={p.name}
                      className="h-9 w-9 shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{p.name}</p>
                      {topType && (
                        <p className="text-[10px] text-spotlight">
                          {humanizeType(topType.label)}
                          {p.pinned && " · pinned"}
                        </p>
                      )}
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
              })
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
