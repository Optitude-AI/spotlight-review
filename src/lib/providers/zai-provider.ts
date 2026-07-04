import ZAI from "z-ai-web-dev-sdk";
import type { VisionProvider } from "@/lib/vision-provider";
import {
  buildEvaluatorPrompt,
  type RawEvaluation,
} from "@/lib/evaluator-prompt";
import type { MarketContext } from "@/lib/types";
import { ensureZaiConfig } from "@/lib/zai-init";

/**
 * ZAI provider — uses the z-ai-web-dev-sdk with the GLM-4V vision model.
 * This is the default in the Z.ai sandbox environment where
 * /etc/.z-ai-config exists. Not reachable from Vercel (internal API).
 */
export class ZaiProvider implements VisionProvider {
  name = "zai-glm-4v";

  async evaluate(image: string, market: MarketContext): Promise<RawEvaluation> {
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
    if (!response) {
      throw lastError instanceof Error
        ? lastError
        : new Error("Vision request failed");
    }

    const content = response.choices[0]?.message?.content ?? "";
    return coerceZaiResponse(content);
  }
}

/** Extract + coerce a RawEvaluation from the ZAI model's free-form response. */
function coerceZaiResponse(text: string): RawEvaluation {
  const obj = extractJson(text);
  return coerceRaw(obj);
}

function extractJson(text: string): unknown {
  if (!text) throw new Error("Empty model response");
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    // fall through to balanced-brace extraction
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
