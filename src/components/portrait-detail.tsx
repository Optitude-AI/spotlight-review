"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { generateTemplateFeedback } from "@/lib/template-feedback";
import { explainCompositeScore } from "@/lib/score-explainer";
import {
  Pin,
  Ban,
  Camera,
  Palette,
  Clapperboard,
  Wand2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Trophy,
  X,
  GitCompare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OutcomeResult } from "@/lib/types";

export function PortraitDetail() {
  const open = useHeadshotStore((s) => s.detailOpen);
  const setOpen = useHeadshotStore((s) => s.setDetailOpen);
  const portrait = useHeadshotStore((s) =>
    s.selectedId ? s.portraits.find((p) => p.id === s.selectedId) : undefined
  );
  const togglePin = useHeadshotStore((s) => s.togglePin);
  const toggleReject = useHeadshotStore((s) => s.toggleReject);
  const setOverrideScore = useHeadshotStore((s) => s.setOverrideScore);
  const setOutcome = useHeadshotStore((s) => s.setOutcome);
  const compareIds = useHeadshotStore((s) => s.compareIds);
  const addToCompare = useHeadshotStore((s) => s.addToCompare);
  const removeFromCompare = useHeadshotStore((s) => s.removeFromCompare);
  const setCompareOpen = useHeadshotStore((s) => s.setCompareOpen);

  const [overrideActive, setOverrideActive] = React.useState(false);
  const [overrideVal, setOverrideVal] = React.useState(50);
  const [tab, setTab] = React.useState("overview");

  React.useEffect(() => {
    if (portrait) {
      setOverrideActive(portrait.overrideScore != null);
      setOverrideVal(
        portrait.overrideScore ?? portrait.evaluation?.overall_score ?? 50
      );
      setTab("overview");
    }
  }, [portrait?.id, portrait?.overrideScore, portrait?.evaluation?.overall_score]);

  if (!portrait) return null;

  const e = portrait.evaluation;
  const displayScore = portrait.overrideScore ?? e?.overall_score ?? 0;
  const style = scoreStyle(displayScore);
  const inCompare = compareIds.includes(portrait.id);

  const templateFeedback = e ? generateTemplateFeedback(e) : [];
  const breakdown = e ? explainCompositeScore(e) : null;

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
            {e?.cached && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                cached
              </Badge>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
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

              {/* Compare */}
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => {
                  if (inCompare) {
                    removeFromCompare(portrait.id);
                  } else {
                    addToCompare(portrait.id);
                    if (compareIds.length >= 1) setCompareOpen(true);
                  }
                }}
                disabled={!inCompare && compareIds.length >= 4}
              >
                <GitCompare className="mr-1.5 h-3.5 w-3.5" />
                {inCompare ? "Remove from compare" : "Add to compare"}
              </Button>

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
                    onClick={() => setOverrideScore(portrait.id, overrideVal)}
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

              {/* Outcome tracking */}
              <div className="mt-3 rounded-lg border border-border/60 p-3">
                <label className="text-xs font-medium">Submission outcome</label>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Optional — helps correlate headshots with results.
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ["booked", "Booked"],
                      ["audition", "Audition"],
                      ["no_response", "No resp."],
                    ] as [OutcomeResult, string][]
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOutcome(portrait.id, val)}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
                        portrait.outcome === val
                          ? val === "booked"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : val === "audition"
                              ? "border-spotlight bg-spotlight/10 text-spotlight"
                              : "border-muted-foreground bg-muted text-muted-foreground"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                {e.disclaimer}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                Model: {e.model_version} · Market: {e.market_context}
              </p>
            </div>

            {/* Right: breakdown (tabbed on mobile, single column on desktop) */}
            <div className="p-5">
              {/* Use tabs always — works on both mobile and desktop and solves
                  the long-scroll problem on mobile. */}
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
                  <TabsTrigger value="overview" className="text-xs">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="technical" className="text-xs">
                    Technical
                  </TabsTrigger>
                  <TabsTrigger value="aesthetic" className="text-xs">
                    Aesthetic
                  </TabsTrigger>
                  <TabsTrigger value="casting" className="text-xs">
                    Casting
                  </TabsTrigger>
                  <TabsTrigger value="feedback" className="text-xs">
                    <span className="hidden sm:inline">Feedback</span>
                    <span className="sm:hidden">Notes</span>
                  </TabsTrigger>
                </TabsList>

                {/* Overview tab */}
                <TabsContent value="overview" className="mt-4">
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

                  {/* Composite score explainer */}
                  {breakdown && (
                    <div className="mt-4 rounded-lg border border-border/60 p-4">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Trophy className="h-3.5 w-3.5 text-spotlight" />
                        How this score was computed
                      </h4>
                      <div className="mt-2 space-y-1.5">
                        {breakdown.lines.map((line) => (
                          <div
                            key={line.label}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-muted-foreground">
                              {line.label}{" "}
                              <span className="text-muted-foreground/60">
                                ({line.detail})
                              </span>
                            </span>
                            <span className="font-medium tabular-nums">
                              +{line.contribution}
                            </span>
                          </div>
                        ))}
                        {breakdown.flagPenalty > 0 && (
                          <div className="flex items-center justify-between text-xs text-rose-500">
                            <span>Flag penalty</span>
                            <span className="font-medium tabular-nums">
                              −{breakdown.flagPenalty}
                            </span>
                          </div>
                        )}
                        <div className="mt-1.5 flex items-center justify-between border-t border-border/60 pt-1.5 text-sm font-bold">
                          <span>Final score</span>
                          <span className={style.textClass}>
                            {breakdown.finalScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Technical tab */}
                <TabsContent value="technical" className="mt-4">
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
                </TabsContent>

                {/* Aesthetic tab */}
                <TabsContent value="aesthetic" className="mt-4">
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
                </TabsContent>

                {/* Casting tab */}
                <TabsContent value="casting" className="mt-4">
                  <div className="rounded-lg border border-border/60 p-4">
                    <div className="flex items-center gap-2">
                      <Clapperboard className="h-4 w-4 text-spotlight" />
                      <h4 className="text-sm font-semibold">
                        Casting attributes
                      </h4>
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
                          (
                          {Math.round(
                            e.casting.gender_presentation.confidence * 100
                          )}
                          % conf.)
                        </span>
                      </CastingField>
                      <CastingField label="Expression readability">
                        <span className="text-sm font-medium tabular-nums">
                          {Math.round(e.casting.expression_readability * 100)}
                          /100
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
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
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
                          <div key={t.label} className="flex items-center gap-2">
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
                </TabsContent>

                {/* Feedback tab — template-grounded + model notes */}
                <TabsContent value="feedback" className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Structured observations
                      </h4>
                      <p className="mb-2 text-[11px] text-muted-foreground">
                        Deterministic, auditable feedback generated from the
                        structured scores and flags.
                      </p>
                      <div className="space-y-2">
                        {templateFeedback.length === 0 ? (
                          <p className="text-sm italic text-muted-foreground">
                            No flagged issues — the image reads cleanly across
                            all dimensions.
                          </p>
                        ) : (
                          templateFeedback.map((item, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex gap-2.5 rounded-lg border p-3 text-sm leading-relaxed",
                                item.category === "strength"
                                  ? "border-emerald-500/20 bg-emerald-500/5"
                                  : item.category === "issue"
                                    ? "border-rose-500/20 bg-rose-500/5"
                                    : "border-border bg-muted/30"
                              )}
                            >
                              {item.category === "strength" ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              ) : item.category === "issue" ? (
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                              ) : (
                                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-spotlight" />
                              )}
                              <span>{item.text}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Lightbulb className="h-3.5 w-3.5 text-spotlight" />
                        Model notes
                      </h4>
                      <p className="mb-2 text-[11px] text-muted-foreground">
                        Free-form observations from the vision model —
                        supplementary to the structured observations above.
                      </p>
                      <FeedbackList narrative={e.narrative} />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
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
