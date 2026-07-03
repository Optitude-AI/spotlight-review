import type { HeadshotEvaluation, MarketContext } from "./types";

/**
 * Market-specific guidance for the vision model. The same photograph can be
 * assessed differently per market — this is legitimate, not a bug, and we
 * surface it explicitly in the UX.
 */
export const MARKET_GUIDANCE: Record<MarketContext, string> = {
  us_commercial:
    "US commercial casting rewards bright, even, friendly lighting; a clean uncluttered backdrop; a warm approachable expression with visible teeth/eyes engaged; and wardrobe that reads relatable and modern. Penalise heavy shadow, moody contrast, and overly intense expressions.",
  uk_theatrical:
    "UK theatrical casting tolerates and often rewards shadow, intensity and character. Mid-to-high contrast is acceptable; a neutral or thoughtful expression is valued; grooming may be less polished. Penalise overly 'smiley commercial' styling and flat snapshot lighting equally.",
  drama:
    "Drama casting rewards emotional depth, strong readable eyes, deliberate contrast and a sense of interior life. Wardrobe may be muted and characterful. Penalise stiff 'say cheese' smiles and flat even lighting that removes dimension.",
  comedy:
    "Comedy casting rewards warmth, energy and an alive, expressive face; a genuine engaged smile; eyes that connect. Penalise deadpan neutral that reads cold, and harsh unflattering shadow.",
  film_tv:
    "Film & TV casting rewards naturalistic believability — mid contrast, real skin texture, subtle expression, wardrobe that could exist in the world of the story. Penalise overt ' modelling shoot' stylisation, heavy retouching cues, and overly graphic backdrops.",
};

/**
 * Composite-score weights per market. Technical + aesthetic feed the base;
 * casting expression_readability adjusts within market. Tunable.
 */
export const MARKET_WEIGHTS: Record<
  MarketContext,
  { technical: number; aesthetic: number; casting: number }
> = {
  us_commercial: { technical: 0.35, aesthetic: 0.45, casting: 0.2 },
  uk_theatrical: { technical: 0.25, aesthetic: 0.4, casting: 0.35 },
  drama: { technical: 0.25, aesthetic: 0.35, casting: 0.4 },
  comedy: { technical: 0.3, aesthetic: 0.4, casting: 0.3 },
  film_tv: { technical: 0.3, aesthetic: 0.4, casting: 0.3 },
};

const MODEL_VERSION = "spotlight-eval-v0.1";

/**
 * Build the structured prompt sent to the vision model. The model is asked to
 * return STRICT JSON matching the raw schema; the server then computes the
 * composite overall_score and confidence.
 */
export function buildEvaluatorPrompt(market: MarketContext): string {
  return `You are "Spotlight Review", an assistive headshot-evaluation assistant for actors, photographers and casting professionals.

CRITICAL FRAMING:
- You are evaluating a PHOTOGRAPH (a casting headshot), never a person.
- You never judge attractiveness as a headline. "Attractiveness" is at most a weak, buried signal inside market-fit.
- You always communicate uncertainty. Where a judgement is genuinely ambiguous, lower the confidence and widen ranges.
- You are assistive only; a human makes the final call.

MARKET CONTEXT for THIS evaluation: ${market}
${MARKET_GUIDANCE[market]}

Analyse the headshot across THREE dimensions and return STRICT JSON only (no markdown fences, no prose outside JSON) with EXACTLY this shape:

{
  "technical": {
    "exposure": <0..1>,            // 1 = well-exposed, no harsh clipping
    "eye_focus": <0..1>,           // 1 = eyes tack-sharp (most important technical signal)
    "noise": <0..1>,               // 1 = clean, low noise
    "color_balance": <0..1>,       // 1 = neutral, pleasing color
    "dynamic_range": <0..1>,       // 1 = good detail in highlights & shadows, no harsh clipping
    "flags": [<zero or more of: "backlit","soft_focus","noisy","underexposed","overexposed","color_cast","clipped_highlights","crushed_shadows","motion_blur">]
  },
  "aesthetic_market": {
    "composition": <0..1>,          // 1 = strong framing, head/eyes well placed
    "background_cleanliness": <0..1>,// 1 = clean, non-distracting backdrop
    "expression_fit": <0..1>,       // 1 = expression suits the market context above
    "wardrobe_fit": <0..1>,         // 1 = wardrobe suits the market context
    "believability": <0..1>,        // 1 = reads as a credible professional headshot for this market
    "flags": [<zero or more of: "busy_background","tight_crop","loose_crop","distracting_wardrobe","flat_lighting","overstylised","low_contrast","tilted_horizon">]
  },
  "casting": {
    "apparent_age_range": [<low int>, <high int>],   // e.g. [26,32]; widen if uncertain
    "gender_presentation": { "label": <"femme"|"masc"|"androgynous"|"uncertain">, "confidence": <0..1> },
    "type_labels": [ { "label": <one of: "commercial","romantic_lead","villain","best_friend","character_actor","corporate","ingénue","authority","quirky","dramatic_lead">, "score": <0..1> }, ... up to 4 ],
    "expression_readability": <0..1>, // 1 = expression reads clearly & is market-appropriate
    "expression_tags": [<zero or more of: "neutral","approachable","intense","warm","serious","playful","confident","vulnerable","authoritative","mysterious">]
  },
  "confidence": <0..1>,             // your overall confidence in THIS evaluation (lower if image is unusual, low-res, ambiguous, or outside your reliable range)
  "narrative": [                     // 2-4 short, specific, ACTIONABLE sentences about the PHOTOGRAPH. Phrase as observations about the image, never the person. Pair problems with suggestions where possible.
    "..."
  ]
}

RULES:
- Output ONLY the JSON object. No code fences, no commentary.
- All 0..1 numbers must be decimals between 0 and 1 inclusive (e.g. 0.72).
- If you cannot confidently detect a face suitable for a headshot, set confidence low (<=0.4) and add a narrative note like "No clear single face detected — results are unreliable."
- Expression_fit and wardrobe_fit MUST be judged relative to the market context above.
- Be honest and specific in narrative; avoid generic praise. Each sentence should reference a concrete visual feature.`;
}

/** Raw shape returned by the model before we compute composites. */
export interface RawEvaluation {
  technical: HeadshotEvaluation["technical"];
  aesthetic_market: HeadshotEvaluation["aesthetic_market"];
  casting: HeadshotEvaluation["casting"];
  confidence: number;
  narrative: string[];
}

/** Compute the 0–100 composite from raw sub-scores, weighted per market. */
export function computeComposite(
  raw: RawEvaluation,
  market: MarketContext
): { overall_score: number; overall_confidence: number } {
  const w = MARKET_WEIGHTS[market];

  const techAvg = avg([
    raw.technical.exposure,
    raw.technical.eye_focus,
    raw.technical.noise,
    raw.technical.color_balance,
    raw.technical.dynamic_range,
  ]);
  const aesAvg = avg([
    raw.aesthetic_market.composition,
    raw.aesthetic_market.background_cleanliness,
    raw.aesthetic_market.expression_fit,
    raw.aesthetic_market.wardrobe_fit,
    raw.aesthetic_market.believability,
  ]);
  const castAvg = avg([raw.casting.expression_readability, 0.6]); // base, expression-weighted

  const composite01 =
    techAvg * w.technical + aesAvg * w.aesthetic + castAvg * w.casting;

  // Slight penalty if many technical flags fire.
  const techFlagPenalty = Math.min(raw.technical.flags.length * 0.02, 0.06);

  const overall_score = clamp(
    Math.round((composite01 - techFlagPenalty) * 100),
    0,
    100
  );

  // Confidence: model's own confidence, softened slightly when many flags fire.
  const overall_confidence = clamp(
    raw.confidence - Math.min(raw.technical.flags.length * 0.03, 0.12),
    0,
    1
  );

  return { overall_score, overall_confidence };
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export const DISCLAIMER =
  "Assistive feedback only. This tool evaluates a photograph, never a person. Final judgement rests with the casting professional.";

export { MODEL_VERSION };
