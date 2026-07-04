"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHeadshotStore } from "@/store/headshot-store";
import { ScoreRing } from "@/components/score-ring";
import { DimensionRadar } from "@/components/dimension-radar";
import { DimensionBars } from "@/components/dimension-bars";
import { FeedbackList } from "@/components/feedback-list";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  humanizeFlag,
  humanizeType,
  confidenceClass,
  confidenceLabel,
  scoreStyle,
} from "@/lib/scoring";
import {
  Pin,
  Ban,
  Camera,
  Palette,
  Clapperboard,
  Wand2,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function PortraitDetail() {
  const open = useHeadshotStore((s) => s.detailOpen);
  const setOpen = useHeadshotStore((s) => s.setDetailOpen);
  const selectedId = useHeadshotStore((s) => s.selectedId);
  const portrait = useHeadshotStore((s) =>
    s.selectedId ? s.portraits.find((p) => p.id === s.selectedId) : undefined
  );
  const togglePin = useHeadshotStore((s) => s.togglePin);
  const toggleReject = useHeadshotStore((s) => s.toggleReject);
  const setOverrideScore = useHeadshotStore((s) => s.setOverrideScore);

  const [overrideActive, setOverrideActive] = React.useState(false);
  const [overrideVal, setOverrideVal] = React.useState(50);

  React.useEffect(() => {
    if (portrait) {
      setOverrideActive(portrait.overrideScore != null);
      setOverrideVal(portrait.overrideScore ?? portrait.evaluation?.overall_score ?? 50);
    }
  }, [portrait?.id, portrait?.overrideScore, portrait?.evaluation?.overall_score]);

  if (!portrait) return null;

  const e = portrait.evaluation;
  const displayScore = portrait.overrideScore ?? e?.overall_score ?? 0;
  const style = scoreStyle(displayScore);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto thin-scroll p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="truncate">{portrait.name}</span>
            {portrait.source === "sample" && (
              <Badge variant="outline" className="text-[10px]">
                Sample
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {!e ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {portrait.status === "evaluating"
              ? "Evaluating this headshot…"
              : portrait.status === "error"
                ? portrait.error ?? "Evaluation failed."
                : "No evaluation available."}
          </div>
        ) : (
          <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
            {/* Left: image + score + actions */}
            <div className="border-b border-border/60 p-5 lg:border-b-0 lg:border-r">
              <div className="relative overflow-hidden rounded-lg border border-border/60 bg-muted">
                {/* portrait preview */}
                <img
                  src={portrait.dataUrl}
                  alt={portrait.name}
                  className="aspect-[3/4] w-full object-cover"
                />
                <div className="absolute right-3 top-3 rounded-full bg-background/85 p-1 backdrop-blur">
                  <ScoreRing
                    score={displayScore}
                    size={64}
                    strokeWidth={5}
                    confidence={e.overall_confidence}
                    showLabel
                  />
                </div>
              </div>

              {/* Confidence band */}
              <div
                className={cn(
                  "mt-3 flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
                  confidenceClass(e.overall_confidence)
                )}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {confidenceLabel(e.overall_confidence)}
                </span>
                <span className="tabular-nums opacity-80">
                  {Math.round(e.overall_confidence * 100)}%
                </span>
              </div>
              {e.overall_confidence < 0.5 && (
                <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                  This image may be outside the model&apos;s reliable range —
                  we recommend a human reviewer for the final call.
                </p>
              )}

              {/* Actions */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={portrait.pinned ? "default" : "outline"}
                  onClick={() => togglePin(portrait.id)}
                >
                  <Pin className="mr-1.5 h-3.5 w-3.5" />
                  {portrait.pinned ? "Pinned" : "Pin"}
                </Button>
                <Button
                  size="sm"
                  variant={portrait.rejected ? "destructive" : "outline"}
                  onClick={() => toggleReject(portrait.id)}
                >
                  <Ban className="mr-1.5 h-3.5 w-3.5" />
                  {portrait.rejected ? "Rejected" : "Reject"}
                </Button>
              </div>

              {/* Override */}
              <div className="mt-3 rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-medium">
                    <Wand2 className="h-3.5 w-3.5 text-spotlight" />
                    Override score
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    teaches the tool
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Slider
                    value={[overrideVal]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => {
                      setOverrideActive(true);
                      setOverrideVal(v[0]);
                    }}
                    className="flex-1"
                  />
                  <span className="w-9 text-right text-sm font-bold tabular-nums">
                    {overrideVal}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 text-xs"
                    onClick={() => {
                      setOverrideScore(portrait.id, overrideVal);
                    }}
                    disabled={!overrideActive}
                  >
                    Save override
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => {
                      setOverrideScore(portrait.id, undefined);
                      setOverrideActive(false);
                      setOverrideVal(e.overall_score);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                {e.disclaimer}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                Model: {e.model_version} · Market: {e.market_context}
              </p>
            </div>

            {/* Right: breakdown */}
            <div className="p-5">
              {/* Headline score + radar */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-muted/20 p-4">
                  <ScoreRing
                    score={displayScore}
                    size={120}
                    strokeWidth={9}
                    confidence={e.overall_confidence}
                    showLabel
                  />
                  <Badge
                    variant="outline"
                    className={cn("mt-2", style.badgeClass)}
                  >
                    {style.label}
                  </Badge>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Dimension radar
                  </h4>
                  <DimensionRadar evaluation={e} />
                </div>
              </div>

              {/* Three dimensions */}
              <div className="mt-5 space-y-4">
                <DimensionBlock
                  icon={<Camera className="h-4 w-4 text-spotlight" />}
                  title="Technical quality"
                  items={[
                    { label: "Exposure", value: e.technical.exposure },
                    { label: "Eye focus", value: e.technical.eye_focus },
                    { label: "Low noise", value: e.technical.noise },
                    {
                      label: "Color balance",
                      value: e.technical.color_balance,
                    },
                    {
                      label: "Dynamic range",
                      value: e.technical.dynamic_range,
                    },
                  ]}
                  flags={e.technical.flags}
                />

                <DimensionBlock
                  icon={<Palette className="h-4 w-4 text-spotlight" />}
                  title="Aesthetic & market fit"
                  items={[
                    { label: "Composition", value: e.aesthetic_market.composition },
                    {
                      label: "Background cleanliness",
                      value: e.aesthetic_market.background_cleanliness,
                    },
                    {
                      label: "Expression fit",
                      value: e.aesthetic_market.expression_fit,
                    },
                    { label: "Wardrobe fit", value: e.aesthetic_market.wardrobe_fit },
                    {
                      label: "Believability",
                      value: e.aesthetic_market.believability,
                    },
                  ]}
                  flags={e.aesthetic_market.flags}
                />

                {/* Casting block */}
                <div className="rounded-lg border border-border/60 p-4">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="h-4 w-4 text-spotlight" />
                    <h4 className="text-sm font-semibold">Casting attributes</h4>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <CastingField label="Apparent age">
                      <span className="text-sm font-medium">
                        {e.casting.apparent_age_range[0]}–
                        {e.casting.apparent_age_range[1]}
                      </span>
                    </CastingField>
                    <CastingField label="Gender presentation">
                      <span className="text-sm font-medium capitalize">
                        {e.casting.gender_presentation.label}
                      </span>
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({Math.round(e.casting.gender_presentation.confidence * 100)}% conf.)
                      </span>
                    </CastingField>
                    <CastingField label="Expression readability">
                      <span className="text-sm font-medium tabular-nums">
                        {Math.round(e.casting.expression_readability * 100)}/100
                      </span>
                    </CastingField>
                    <CastingField label="Expression tags">
                      <div className="flex flex-wrap gap-1">
                        {e.casting.expression_tags.length > 0 ? (
                          e.casting.expression_tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </CastingField>
                  </div>
                  <div className="mt-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Type labels
                    </p>
                    <div className="mt-1.5 space-y-1.5">
                      {e.casting.type_labels.map((t) => (
                        <div
                          key={t.label}
                          className="flex items-center gap-2"
                        >
                          <span className="w-28 shrink-0 text-xs">
                            {humanizeType(t.label)}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-spotlight"
                              style={{ width: `${t.score * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                            {Math.round(t.score * 100)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Narrative */}
              <div className="mt-5">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Structured feedback
                </h4>
                <FeedbackList narrative={e.narrative} />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DimensionBlock({
  icon,
  title,
  items,
  flags,
}: {
  icon: React.ReactNode;
  title: string;
  items: { label: string; value: number }[];
  flags: string[];
}) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {flags.map((f) => (
              <span
                key={f}
                className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-600 dark:text-rose-400"
              >
                {humanizeFlag(f)}
              </span>
            ))}
          </div>
        )}
      </div>
      <DimensionBars items={items} className="mt-3" />
    </div>
  );
}

function CastingField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
