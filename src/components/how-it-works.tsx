"use client";

import { Camera, Palette, Clapperboard } from "lucide-react";

/** "How it works" explainer — the three evaluation dimensions. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Three dimensions, one structured read
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every headshot is assessed across technical craft, aesthetic &amp;
            market fit, and casting attributes — broken down into sub-scores,
            flags, and a short, actionable explanation.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <DimensionExplainer
            icon={<Camera className="h-5 w-5 text-spotlight" />}
            tag="01 · Technical"
            title="Is it well-made?"
            points={[
              "Exposure & dynamic range",
              "Eye sharpness (the key signal)",
              "Noise, grain & color balance",
            ]}
          />
          <DimensionExplainer
            icon={<Palette className="h-5 w-5 text-spotlight" />}
            tag="02 · Aesthetic & market"
            title="Does it fit the market?"
            points={[
              "Composition & framing",
              "Background & distraction control",
              "Expression, wardrobe & believability",
            ]}
          />
          <DimensionExplainer
            icon={<Clapperboard className="h-5 w-5 text-spotlight" />}
            tag="03 · Casting"
            title="Who could it play?"
            points={[
              "Apparent age range & type labels",
              "Expression readability",
              "Type: lead, villain, character, commercial…",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function DimensionExplainer({
  icon,
  tag,
  title,
  points,
}: {
  icon: React.ReactNode;
  tag: string;
  title: string;
  points: string[];
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-spotlight/10">
        {icon}
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-spotlight">
        {tag}
      </p>
      <h3 className="mt-1 text-base font-semibold">{title}</h3>
      <ul className="mt-3 space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-spotlight" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
