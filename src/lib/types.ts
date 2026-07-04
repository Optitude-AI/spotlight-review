/**
 * Shared evaluation contract — the durable output schema for the headshot
 * evaluator. Matches the design spec: three dimensions (technical,
 * aesthetic/market, casting), flags, narrative feedback, uncertainty.
 *
 * The API returns `HeadshotEvaluation`. Sub-scores are 0–1; the composite
 * overall_score is 0–100 and computed server-side so it stays tunable per
 * market.
 */

export type MarketContext =
  | "us_commercial"
  | "uk_theatrical"
  | "drama"
  | "comedy"
  | "film_tv";

export interface TechnicalScores {
  exposure: number; // 0–1
  eye_focus: number; // 0–1
  noise: number; // 0–1 (1 = clean)
  color_balance: number; // 0–1
  dynamic_range: number; // 0–1
  flags: string[];
}

export interface AestheticMarketScores {
  composition: number; // 0–1
  background_cleanliness: number; // 0–1
  expression_fit: number; // 0–1
  wardrobe_fit: number; // 0–1
  believability: number; // 0–1
  flags: string[];
}

export interface TypeLabel {
  label: string;
  score: number; // 0–1
}

export interface GenderPresentation {
  label: string; // "femme" | "masc" | "androgynous" | "uncertain"
  confidence: number; // 0–1
}

export interface CastingScores {
  apparent_age_range: [number, number];
  gender_presentation: GenderPresentation;
  type_labels: TypeLabel[];
  expression_readability: number; // 0–1
  expression_tags: string[];
}

export interface HeadshotEvaluation {
  overall_score: number; // 0–100
  overall_confidence: number; // 0–1
  technical: TechnicalScores;
  aesthetic_market: AestheticMarketScores;
  casting: CastingScores;
  narrative: string[]; // short structured NL feedback sentences
  market_context: MarketContext;
  model_version: string;
  disclaimer: string;
}

/** Client-side portrait record: combines the uploaded image with its eval. */
export interface Portrait {
  id: string;
  name: string;
  dataUrl: string; // base64 or remote URL
  source: "upload" | "sample";
  status: "queued" | "evaluating" | "done" | "error";
  evaluation?: HeadshotEvaluation;
  error?: string;
  pinned: boolean; // user force-includes in shortlist
  rejected: boolean; // user force-excludes
  overrideScore?: number; // user override of overall score
  createdAt: number;
}

export const MARKET_OPTIONS: {
  value: MarketContext;
  label: string;
  blurb: string;
}[] = [
  {
    value: "us_commercial",
    label: "US Commercial",
    blurb: "Bright, friendly, approachable. Even lighting, clean backdrop.",
  },
  {
    value: "uk_theatrical",
    label: "UK Theatrical",
    blurb: "Tolerates shadow & intensity. Character and readability over polish.",
  },
  {
    value: "drama",
    label: "Drama",
    blurb: "Emotional depth, stronger contrast, expressive eyes.",
  },
  {
    value: "comedy",
    label: "Comedy",
    blurb: "Warmth, energy, expressive face. Approachable and alive.",
  },
  {
    value: "film_tv",
    label: "Film & TV",
    blurb: "Naturalistic, believable, mid-contrast. Subtle over stylised.",
  },
];

export const DISCLAIMER =
  "Assistive feedback only. This tool evaluates a photograph, never a person. Final judgement rests with the casting professional.";
