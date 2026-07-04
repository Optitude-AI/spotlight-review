/**
 * Shared evaluation contract — the durable output schema for the headshot
 * evaluator. Matches the design spec: three dimensions (technical,
 * aesthetic/market, casting), flags, narrative feedback, uncertainty.
 */

export type MarketContext =
  | "us_commercial"
  | "uk_theatrical"
  | "drama"
  | "comedy"
  | "film_tv";

export interface TechnicalScores {
  exposure: number;
  eye_focus: number;
  noise: number;
  color_balance: number;
  dynamic_range: number;
  flags: string[];
}

export interface AestheticMarketScores {
  composition: number;
  background_cleanliness: number;
  expression_fit: number;
  wardrobe_fit: number;
  believability: number;
  flags: string[];
}

export interface TypeLabel {
  label: string;
  score: number;
}

export interface GenderPresentation {
  label: string;
  confidence: number;
}

export interface CastingScores {
  apparent_age_range: [number, number];
  gender_presentation: GenderPresentation;
  type_labels: TypeLabel[];
  expression_readability: number;
  expression_tags: string[];
}

export interface HeadshotEvaluation {
  overall_score: number;
  overall_confidence: number;
  technical: TechnicalScores;
  aesthetic_market: AestheticMarketScores;
  casting: CastingScores;
  narrative: string[];
  market_context: MarketContext;
  model_version: string;
  disclaimer: string;
  /** True when this result was served from cache (no new API call). */
  cached?: boolean;
}

export type PortraitStatus = "queued" | "evaluating" | "done" | "error";

export type OutcomeResult = "booked" | "audition" | "no_response";

/** Client-side portrait record: combines the uploaded image with its eval. */
export interface Portrait {
  id: string;
  name: string;
  dataUrl: string;
  source: "upload" | "sample";
  status: PortraitStatus;
  evaluation?: HeadshotEvaluation;
  error?: string;
  pinned: boolean;
  rejected: boolean;
  overrideScore?: number;
  createdAt: number;
  /** Image hash for cache keying + feedback logging. */
  imageHash?: string;
  /** Optional outcome tracking. */
  outcome?: OutcomeResult;
  /** Cached evaluations per market (for instant market switching). */
  marketCache?: Partial<Record<MarketContext, HeadshotEvaluation>>;
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
