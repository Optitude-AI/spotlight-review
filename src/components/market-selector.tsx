"use client";

import { Globe } from "lucide-react";
import { useHeadshotStore } from "@/store/headshot-store";
import { MARKET_OPTIONS } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Market / genre context selector. The same photograph can score differently
 * per market — this is legitimate and surfaced explicitly. Switching market
 * offers to re-evaluate the whole set.
 */
export function MarketSelector() {
  const market = useHeadshotStore((s) => s.market);
  const setMarket = useHeadshotStore((s) => s.setMarket);
  const portraits = useHeadshotStore((s) => s.portraits);
  const reevaluateAll = useHeadshotStore((s) => s.reevaluateAll);

  const hasPortraits = portraits.length > 0;

  const handleChange = (m: (typeof MARKET_OPTIONS)[number]["value"]) => {
    setMarket(m);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-spotlight" />
        <h2 className="text-sm font-semibold">Market context</h2>
        <span className="text-xs text-muted-foreground">
          · scores adapt to the casting lens
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        The same headshot reads differently per market. Pick the lens
        you&apos;re curating for — feedback and weights change accordingly.
      </p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {MARKET_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleChange(opt.value)}
            className={cn(
              "group rounded-lg border px-3 py-2 text-left transition-all",
              market === opt.value
                ? "border-spotlight bg-spotlight/10 shadow-sm"
                : "border-border bg-background hover:border-spotlight/40 hover:bg-muted/40"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  market === opt.value ? "bg-spotlight" : "bg-muted-foreground/40"
                )}
              />
              <span className="text-xs font-semibold">{opt.label}</span>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
              {opt.blurb}
            </p>
          </button>
        ))}
      </div>
      {hasPortraits && (
        <div className="mt-3.5 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            Market changed — re-evaluate your set with the new lens?
          </span>
          <button
            type="button"
            onClick={() => void reevaluateAll()}
            className="font-medium text-spotlight hover:underline"
          >
            Re-evaluate all
          </button>
        </div>
      )}
    </div>
  );
}
