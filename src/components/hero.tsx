"use client";

import { ShieldCheck, Eye, HandHeart } from "lucide-react";

/**
 * Hero / positioning block. Establishes the assistive, human-in-charge framing
 * up front — this is NOT "AI that tells you how attractive you are".
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 paper-bg">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-spotlight/30 bg-spotlight/10 px-3 py-1 text-xs font-medium text-spotlight">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-spotlight opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-spotlight" />
              </span>
              Assistive · Transparent · Human-in-charge
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Put your best{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-spotlight">headshot</span>
                <span className="absolute inset-x-0 bottom-1 z-0 h-3 -rotate-1 bg-spotlight/20" />
              </span>{" "}
              forward.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Structured, transparent feedback on actors&apos; headshot
              portraits — for photographers, actors and casting. We assess the{" "}
              <strong className="font-semibold text-foreground">
                photograph
              </strong>
              , never the person. Final judgement always rests with the human.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <a
                href="#evaluate"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Start evaluating
              </a>
              <a
                href="#how-it-works"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
              >
                How it works
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-3">
            <PillarCard
              icon={<Eye className="h-5 w-5 text-spotlight" />}
              title="Three dimensions"
              body="Technical quality, aesthetic & market fit, and casting attributes — each broken down with sub-scores and flags."
            />
            <PillarCard
              icon={<ShieldCheck className="h-5 w-5 text-spotlight" />}
              title="Uncertainty, surfaced"
              body="Every score ships with a confidence band. When the model is outside its reliable range, we say so and recommend a human reviewer."
            />
            <PillarCard
              icon={<HandHeart className="h-5 w-5 text-spotlight" />}
              title="Assistive, not a verdict"
              body="Pin, override and reject freely — your edits are framed as teaching the tool, and feed back as additional training signal."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PillarCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-spotlight/10">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}
