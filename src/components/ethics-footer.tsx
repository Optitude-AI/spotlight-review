"use client";

import { Heart, Scale, Eye } from "lucide-react";

/**
 * Sticky ethics footer. Reinforces the assistive framing and the three
 * ethical pillars (subjectivity, fairness, positioning) on every screen.
 */
export function EthicsFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <EthicsPillar
            icon={<Scale className="h-4 w-4 text-spotlight" />}
            title="Subjectivity, honoured"
            body="Beauty and casting suitability aren't universal. Every score is market-relative and ships with a confidence band — when we're unsure, we say so."
          />
          <EthicsPillar
            icon={<Eye className="h-4 w-4 text-spotlight" />}
            title="Bias under watch"
            body="We test for demographic score-parity on a frozen benchmark and surface low-reliability flags. Diverse training data and human-in-the-loop overrides are built in, not bolted on."
          />
          <EthicsPillar
            icon={<Heart className="h-4 w-4 text-spotlight" />}
            title="Assistive, not a verdict"
            body="This tool evaluates a photograph, never a person. It exists to support photographers, actors and casting — never to replace human judgement or act as a screening gate."
          />
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-5 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Spotlight Review · Assistive headshot
            feedback for photographers, actors &amp; casting.
          </p>
          <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground/70">
            Model outputs are estimates with uncertainty. This tool does not
            assess attractiveness and must not be used as an automated
            screening gate.
          </p>
        </div>
      </div>
    </footer>
  );
}

function EthicsPillar({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-spotlight/10">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}
