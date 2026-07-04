import type { HeadshotEvaluation, MarketContext } from "./types";
import { MARKET_WEIGHTS } from "./evaluator-prompt";

/**
 * Composite score explainer. Returns a human-readable breakdown of how the
 * 0–100 overall score was computed from sub-scores + per-market weights +
 * flag penalty. Shown in the detail dialog so the score feels transparent.
 */
export interface ScoreBreakdownLine {
  label: string;
  detail: string;
  contribution: number; // points contributed to final 0–100
}

export interface ScoreBreakdown {
  lines: ScoreBreakdownLine[];
  flagPenalty: number;
  finalScore: number;
}

export function explainCompositeScore(
  e: HeadshotEvaluation
): ScoreBreakdown {
  const w = MARKET_WEIGHTS[e.market_context];

  const techAvg = avg([
    e.technical.exposure,
    e.technical.eye_focus,
    e.technical.noise,
    e.technical.color_balance,
    e.technical.dynamic_range,
  ]);
  const aesAvg = avg([
    e.aesthetic_market.composition,
    e.aesthetic_market.background_cleanliness,
    e.aesthetic_market.expression_fit,
    e.aesthetic_market.wardrobe_fit,
    e.aesthetic_market.believability,
  ]);
  const castAvg = avg([e.casting.expression_readability, 0.6]);

  const techPts = Math.round(techAvg * 100 * w.technical);
  const aesPts = Math.round(aesAvg * 100 * w.aesthetic);
  const castPts = Math.round(castAvg * 100 * w.casting);

  const flagPenalty = Math.min(
    Math.round(Math.min(e.technical.flags.length * 2, 6)),
    6
  );

  const lines: ScoreBreakdownLine[] = [
    {
      label: "Technical",
      detail: `avg ${pct(techAvg)} × weight ${pct(w.technical)}`,
      contribution: techPts,
    },
    {
      label: "Aesthetic & market",
      detail: `avg ${pct(aesAvg)} × weight ${pct(w.aesthetic)}`,
      contribution: aesPts,
    },
    {
      label: "Casting fit",
      detail: `avg ${pct(castAvg)} × weight ${pct(w.casting)}`,
      contribution: castPts,
    },
  ];

  const finalScore = Math.max(
    0,
    Math.min(100, techPts + aesPts + castPts - flagPenalty)
  );

  return { lines, flagPenalty, finalScore };
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
