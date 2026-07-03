"use client";

import { Lightbulb, Quote } from "lucide-react";

/** Structured natural-language feedback sentences from the model. */
export function FeedbackList({ narrative }: { narrative: string[] }) {
  if (!narrative || narrative.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No specific notes — the image reads as a competent headshot for this
        market.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {narrative.map((line, i) => (
        <li
          key={i}
          className="flex gap-2.5 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm leading-relaxed"
        >
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-spotlight" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
