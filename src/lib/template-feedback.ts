import type { HeadshotEvaluation, MarketContext } from "./types";
import { MARKET_GUIDANCE } from "./evaluator-prompt";

/**
 * Deterministic template-based feedback generator. Produces reliable,
 * auditable sentences from the structured evaluation — impossible to
 * hallucinate. This is the Phase-1 backbone recommended in the design spec.
 *
 * The VLM's narrative is shown separately as "Model notes" (supplementary),
 * so the user always has a trustworthy, explainable set of observations.
 */
export function generateTemplateFeedback(
  e: HeadshotEvaluation
): { category: "strength" | "issue" | "suggestion"; text: string }[] {
  const out: {
    category: "strength" | "issue" | "suggestion";
    text: string;
  }[] = [];
  const m = e.market_context;

  // --- Technical ---
  if (e.technical.eye_focus < 0.5) {
    out.push({
      category: "issue",
      text: "Eyes appear soft — focus seems to fall forward or back of the face. For a headshot, the near eye should be the sharpest point in the frame.",
    });
  } else if (e.technical.eye_focus >= 0.85) {
    out.push({
      category: "strength",
      text: "Eyes are tack-sharp — the most important technical signal in a headshot is well handled.",
    });
  }

  for (const flag of e.technical.flags) {
    switch (flag) {
      case "soft_focus":
        out.push({
          category: "issue",
          text: "Soft focus detected — consider a faster shutter speed or single-point AF on the near eye.",
        });
        break;
      case "backlit":
        out.push({
          category: "suggestion",
          text: "Image is backlit — add fill from the front or expose for the face to avoid a muddy subject.",
        });
        break;
      case "noisy":
        out.push({
          category: "issue",
          text: "Noise/grain is visible — shoot at a lower ISO or use larger aperture / more light.",
        });
        break;
      case "underexposed":
        out.push({
          category: "issue",
          text: "Underexposed — shadow detail is lost on the face. Lift exposure by ~⅓ to ⅔ stop.",
        });
        break;
      case "overexposed":
        out.push({
          category: "issue",
          text: "Overexposed — highlights on the forehead/nose are clipping. Pull exposure or feather the key light.",
        });
        break;
      case "color_cast":
        out.push({
          category: "suggestion",
          text: "A colour cast is present — check white balance against a neutral reference.",
        });
        break;
      case "clipped_highlights":
        out.push({
          category: "issue",
          text: "Highlights are clipped — reduce contrast or pull back the key light.",
        });
        break;
      case "crushed_shadows":
        out.push({
          category: "issue",
          text: "Shadows are crushed — lift the fill or open up shadows in post.",
        });
        break;
      case "motion_blur":
        out.push({
          category: "issue",
          text: "Motion blur detected — use a faster shutter speed (≥ 1/200s for headshots).",
        });
        break;
    }
  }

  // --- Aesthetic / market ---
  for (const flag of e.aesthetic_market.flags) {
    switch (flag) {
      case "busy_background":
        out.push({
          category: "suggestion",
          text: "Background is busy — consider a cleaner backdrop or wider aperture to separate the subject.",
        });
        break;
      case "tight_crop":
        out.push({
          category: "suggestion",
          text: "Crop is tight — leave a little more headroom and negative space for casting-platform framing.",
        });
        break;
      case "loose_crop":
        out.push({
          category: "suggestion",
          text: "Crop is loose — tighten to chest-up so the face reads at thumbnail size on casting sites.",
        });
        break;
      case "distracting_wardrobe":
        out.push({
          category: "suggestion",
          text: "Wardrobe competes for attention — simpler, solid-tone clothing keeps focus on the face.",
        });
        break;
      case "flat_lighting":
        out.push({
          category: "suggestion",
          text: "Lighting is flat — add dimension with a small fill or move the key off-axis for facial sculpting.",
        });
        break;
      case "overstylised":
        out.push({
          category: "suggestion",
          text: "Reads as over-stylised for a casting headshot — casting wants to see you, not a fashion edit.",
        });
        break;
      case "low_contrast":
        out.push({
          category: "suggestion",
          text: "Low contrast — add a touch of contrast in post for more presence.",
        });
        break;
      case "tilted_horizon":
        out.push({
          category: "issue",
          text: "Horizon is tilted — straighten or level the camera.",
        });
        break;
    }
  }

  if (e.aesthetic_market.background_cleanliness >= 0.85) {
    out.push({
      category: "strength",
      text: "Background is clean and non-distracting — good separation keeps focus on the face.",
    });
  }

  // --- Market-relative expression feedback ---
  if (e.aesthetic_market.expression_fit < 0.5) {
    out.push({
      category: "suggestion",
      text: `Expression doesn't fully suit the ${marketLabel(m)} lens — ${marketExpressionHint(m)}.`,
    });
  } else if (e.aesthetic_market.expression_fit >= 0.8) {
    out.push({
      category: "strength",
      text: `Expression fits the ${marketLabel(m)} lens well.`,
    });
  }

  // --- Confidence ---
  if (e.overall_confidence < 0.5) {
    out.push({
      category: "issue",
      text: "The model is outside its reliable range for this image — we recommend a human reviewer for the final call.",
    });
  }

  // Deduplicate by text, preserve order.
  const seen = new Set<string>();
  return out.filter((item) => {
    if (seen.has(item.text)) return false;
    seen.add(item.text);
    return true;
  });
}

function marketLabel(m: MarketContext): string {
  return {
    us_commercial: "US commercial",
    uk_theatrical: "UK theatrical",
    drama: "drama",
    comedy: "comedy",
    film_tv: "film & TV",
  }[m];
}

function marketExpressionHint(m: MarketContext): string {
  return {
    us_commercial: "aim for warm, approachable, eyes engaged",
    uk_theatrical: "a neutral or thoughtful read is valued",
    drama: "lean into emotional depth and readable eyes",
    comedy: "bring warmth, energy and an alive face",
    film_tv: "keep it naturalistic and believable",
  }[m];
}

/** Keep the import of MARKET_GUIDANCE used so tree-shaking doesn't drop it. */
void MARKET_GUIDANCE;
