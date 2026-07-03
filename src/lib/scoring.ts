import type { HeadshotEvaluation } from "./types";

/** Map a 0–100 score to a warm, editorial colour token + qualitative label. */
export function scoreStyle(score: number): {
  label: string;
  textClass: string;
  bgClass: string;
  ringStroke: string; // hex for SVG
  badgeClass: string;
} {
  if (score >= 80) {
    return {
      label: "Excellent",
      textClass: "text-emerald-600 dark:text-emerald-400",
      bgClass: "bg-emerald-500/15",
      ringStroke: "#10b981",
      badgeClass:
        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    };
  }
  if (score >= 65) {
    return {
      label: "Strong",
      textClass: "text-spotlight",
      bgClass: "bg-spotlight/15",
      ringStroke: "oklch(0.74 0.155 62)",
      badgeClass:
        "bg-spotlight/15 text-spotlight-foreground border-spotlight/30",
    };
  }
  if (score >= 50) {
    return {
      label: "Competent",
      textClass: "text-amber-600 dark:text-amber-400",
      bgClass: "bg-amber-500/15",
      ringStroke: "#f59e0b",
      badgeClass:
        "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25",
    };
  }
  return {
    label: "Needs work",
    textClass: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-500/15",
    ringStroke: "#f43f5e",
    badgeClass:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25",
  };
}

export function confidenceLabel(c: number): string {
  if (c >= 0.8) return "High confidence";
  if (c >= 0.6) return "Moderate confidence";
  if (c >= 0.4) return "Low confidence";
  return "Very low confidence";
}

export function confidenceClass(c: number): string {
  if (c >= 0.6)
    return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (c >= 0.4)
    return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";
}

/** Pretty-print a flag slug like "soft_focus" → "Soft focus". */
export function humanizeFlag(flag: string): string {
  return flag
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function humanizeType(label: string): string {
  return label
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Flatten all sub-scores for the radar chart. */
export function radarData(e: HeadshotEvaluation) {
  return [
    { axis: "Exposure", value: e.technical.exposure },
    { axis: "Eye Focus", value: e.technical.eye_focus },
    { axis: "Low Noise", value: e.technical.noise },
    { axis: "Color", value: e.technical.color_balance },
    { axis: "Dyn. Range", value: e.technical.dynamic_range },
    { axis: "Composition", value: e.aesthetic_market.composition },
    { axis: "Background", value: e.aesthetic_market.background_cleanliness },
    { axis: "Expression", value: e.aesthetic_market.expression_fit },
    { axis: "Wardrobe", value: e.aesthetic_market.wardrobe_fit },
    { axis: "Believability", value: e.aesthetic_market.believability },
  ];
}

/** Compute a shortlist that balances score with expression/type diversity. */
export function computeShortlist(
  portraits: { id: string; evaluation?: HeadshotEvaluation; pinned: boolean; rejected: boolean }[],
  topN = 8
): string[] {
  const eligible = portraits.filter(
    (p) => p.evaluation && !p.rejected
  );

  // Always include pinned first.
  const pinned = eligible.filter((p) => p.pinned);
  const pinnedIds = new Set(pinned.map((p) => p.id));

  const rest = eligible
    .filter((p) => !pinnedIds.has(p.id))
    .sort((a, b) => (b.evaluation!.overall_score - a.evaluation!.overall_score));

  const result: string[] = [...pinned.map((p) => p.id)];

  // Greedy diversity fill: pick highest-scoring, but skip near-duplicate type
  // signatures once we already have one of that dominant type.
  const seenTypes = new Set<string>(
    pinned.map((p) => p.evaluation!.casting.type_labels[0]?.label ?? "none")
  );

  for (const p of rest) {
    if (result.length >= topN) break;
    const topType = p.evaluation!.casting.type_labels[0]?.label ?? "none";
    if (seenTypes.has(topType) && result.length >= Math.ceil(topN / 2)) {
      // allow some duplicates after half-filled, but keep adding variety
    }
    seenTypes.add(topType);
    result.push(p.id);
  }

  return result;
}
