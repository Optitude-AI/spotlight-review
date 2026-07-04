import { NextRequest, NextResponse } from "next/server";
import {
  computeComposite,
  DISCLAIMER,
  MODEL_VERSION,
  type RawEvaluation,
} from "@/lib/evaluator-prompt";
import type { HeadshotEvaluation, MarketContext } from "@/lib/types";
import { db } from "@/lib/db";
import { getVisionProvider } from "@/lib/vision-provider";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_MARKETS: MarketContext[] = [
  "us_commercial",
  "uk_theatrical",
  "drama",
  "comedy",
  "film_tv",
];

/** Fast non-crypto hash of the image payload for cache keying (server side). */
function serverHash(input: string): string {
  const head = input.slice(0, 1_000_000);
  const tail = input.slice(-256);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  const combined = `${head.length}:${head}|${tail}|${input.length}`;
  for (let i = 0; i < combined.length; i++) {
    const ch = combined.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  return (
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0")
  );
}

export async function POST(req: NextRequest) {
  let body: { image?: string; market?: string; imageHash?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const image = body.image;
  const market = body.market as MarketContext;

  if (!image || typeof image !== "string") {
    return NextResponse.json(
      { error: "Missing 'image' (data URL or remote URL)" },
      { status: 400 }
    );
  }
  if (!VALID_MARKETS.includes(market)) {
    return NextResponse.json(
      { error: `Invalid market. Must be one of: ${VALID_MARKETS.join(", ")}` },
      { status: 400 }
    );
  }

  // Cache lookup
  const imageHash = body.imageHash || serverHash(image);
  try {
    const cached = await db.evaluationCache.findUnique({
      where: { imageHash_market: { imageHash, market } },
    });
    if (cached) {
      const evaluation = JSON.parse(cached.result) as HeadshotEvaluation;
      evaluation.cached = true;
      return NextResponse.json({ evaluation, imageHash });
    }
  } catch {
    // DB not critical; continue to live evaluation.
  }

  try {
    const provider = await getVisionProvider();
    let raw: RawEvaluation;
    let parseFailed = false;
    try {
      raw = await provider.evaluate(image, market);
    } catch {
      parseFailed = true;
      raw = fallbackRaw();
    }

    const { overall_score, overall_confidence } = computeComposite(raw, market);
    const evaluation: HeadshotEvaluation = {
      overall_score,
      overall_confidence,
      technical: raw.technical,
      aesthetic_market: raw.aesthetic_market,
      casting: raw.casting,
      narrative: parseFailed
        ? raw.narrative
        : raw.narrative.length > 0
          ? raw.narrative
          : [
              "No specific notes — the image reads as a competent headshot for this market.",
            ],
      market_context: market,
      model_version: `${MODEL_VERSION} (${provider.name})`,
      disclaimer: DISCLAIMER,
      cached: false,
    };

    // Persist to cache (best-effort)
    try {
      await db.evaluationCache.upsert({
        where: { imageHash_market: { imageHash, market } },
        create: { imageHash, market, result: JSON.stringify(evaluation) },
        update: { result: JSON.stringify(evaluation), updatedAt: new Date() },
      });
    } catch {
      // non-critical
    }

    return NextResponse.json({ evaluation, imageHash });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown evaluation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function fallbackRaw(): RawEvaluation {
  return {
    technical: {
      exposure: 0.5,
      eye_focus: 0.5,
      noise: 0.5,
      color_balance: 0.5,
      dynamic_range: 0.5,
      flags: [],
    },
    aesthetic_market: {
      composition: 0.5,
      background_cleanliness: 0.5,
      expression_fit: 0.5,
      wardrobe_fit: 0.5,
      believability: 0.5,
      flags: [],
    },
    casting: {
      apparent_age_range: [25, 40],
      gender_presentation: { label: "uncertain", confidence: 0.2 },
      type_labels: [],
      expression_readability: 0.5,
      expression_tags: [],
    },
    confidence: 0.2,
    narrative: [
      "The model returned an unparseable response for this image — please retry.",
    ],
  };
}
