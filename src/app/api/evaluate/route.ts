import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import {
  buildEvaluatorPrompt,
  computeComposite,
  DISCLAIMER,
  MODEL_VERSION,
  type RawEvaluation,
} from "@/lib/evaluator-prompt";
import type { HeadshotEvaluation, MarketContext } from "@/lib/types";
import { db } from "@/lib/db";
import { ensureZaiConfig } from "@/lib/zai-init";

export const runtime = "nodejs";
// Vercel Hobby caps at 60s; Pro allows up to 300s. Evaluations take ~20s;
// 429-retry backoff can add ~13s. 60s covers the common case.
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
  // Use the first 1MB + last 256 bytes + length to avoid hashing huge strings fully.
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

function extractJson(text: string): unknown {
  if (!text) throw new Error("Empty model response");
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    // fall through
  }
  const start = candidate.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in response");
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          return JSON.parse(candidate.slice(start, i + 1));
        }
      }
    }
  }
  throw new Error("Unbalanced JSON in model response");
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, Number(x) || 0));

function coerceRaw(obj: unknown): RawEvaluation {
  const o = (obj ?? {}) as Record<string, unknown>;
  const technical = (o.technical ?? {}) as Record<string, unknown>;
  const aesthetic = (o.aesthetic_market ?? {}) as Record<string, unknown>;
  const casting = (o.casting ?? {}) as Record<string, unknown>;
  const gender = (casting.gender_presentation ?? {}) as Record<string, unknown>;

  const toFlags = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

  const toTypes = (v: unknown): { label: string; score: number }[] =>
    Array.isArray(v)
      ? v
          .map((t) => {
            const tt = t as Record<string, unknown>;
            return {
              label: String(tt?.label ?? ""),
              score: clamp01(Number(tt?.score ?? 0)),
            };
          })
          .filter((t) => t.label)
          .slice(0, 4)
      : [];

  let ageRaw = casting.apparent_age_range;
  let age: [number, number] = [25, 40];
  if (Array.isArray(ageRaw) && ageRaw.length >= 2) {
    const lo = Math.round(Number(ageRaw[0]) || 25);
    const hi = Math.round(Number(ageRaw[1]) || 40);
    age = [Math.min(lo, hi), Math.max(lo, hi)];
  }

  return {
    technical: {
      exposure: clamp01(technical.exposure),
      eye_focus: clamp01(technical.eye_focus),
      noise: clamp01(technical.noise),
      color_balance: clamp01(technical.color_balance),
      dynamic_range: clamp01(technical.dynamic_range),
      flags: toFlags(technical.flags),
    },
    aesthetic_market: {
      composition: clamp01(aesthetic.composition),
      background_cleanliness: clamp01(aesthetic.background_cleanliness),
      expression_fit: clamp01(aesthetic.expression_fit),
      wardrobe_fit: clamp01(aesthetic.wardrobe_fit),
      believability: clamp01(aesthetic.believability),
      flags: toFlags(aesthetic.flags),
    },
    casting: {
      apparent_age_range: age,
      gender_presentation: {
        label: String(gender.label ?? "uncertain"),
        confidence: clamp01(gender.confidence),
      },
      type_labels: toTypes(casting.type_labels),
      expression_readability: clamp01(casting.expression_readability),
      expression_tags: toFlags(casting.expression_tags),
    },
    confidence: clamp01(o.confidence),
    narrative: toFlags(o.narrative),
  };
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

  // Cache lookup: use client-provided hash if present, else compute one.
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
    ensureZaiConfig();
    const zai = await ZAI.create();
    const prompt = buildEvaluatorPrompt(market);

    const messages = [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: prompt },
          { type: "image_url" as const, image_url: { url: image } },
        ],
      },
    ];

    let response;
    let lastError: unknown = null;
    const attempts = 3;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        response = await zai.chat.completions.createVision({
          messages,
          thinking: { type: "disabled" },
        });
        break;
      } catch (attemptErr) {
        lastError = attemptErr;
        const msg =
          attemptErr instanceof Error ? attemptErr.message : String(attemptErr);
        const is429 = msg.includes("429") || msg.includes("Too many requests");
        if (!is429 || attempt === attempts - 1) throw attemptErr;
        await new Promise((r) => setTimeout(r, 4000 + attempt * 5000));
      }
    }
    if (!response)
      throw lastError instanceof Error
        ? lastError
        : new Error("Vision request failed");

    const content = response.choices[0]?.message?.content ?? "";

    let raw: RawEvaluation;
    let parseFailed = false;
    try {
      raw = coerceRaw(extractJson(content));
    } catch {
      parseFailed = true;
      raw = {
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
      model_version: MODEL_VERSION,
      disclaimer: DISCLAIMER,
      cached: false,
    };

    // Persist to cache (best-effort).
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
