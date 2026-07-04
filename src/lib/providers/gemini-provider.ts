import type { VisionProvider } from "@/lib/vision-provider";
import { buildEvaluatorPrompt, type RawEvaluation } from "@/lib/evaluator-prompt";
import type { MarketContext } from "@/lib/types";

/**
 * Google Gemini provider — uses the free tier of Gemini 2.0 Flash Lite
 * (or falls back to 1.5 Flash). Native JSON response schema constrains
 * output to our RawEvaluation shape.
 *
 * Requires env var: GEMINI_API_KEY (free key from https://aistudio.google.com/apikey)
 */
const MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-flash-latest",
];

export class GeminiProvider implements VisionProvider {
  name = "gemini-flash";

  async evaluate(image: string, market: MarketContext): Promise<RawEvaluation> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY env var is required for the Gemini provider."
      );
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = buildEvaluatorPrompt(market);
    const imageData = await this.extractImageData(image);

    const responseSchema = this.buildSchema();
    let lastError: unknown = null;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.4,
          },
        });

        const result = await model.generateContent([
          { text: prompt },
          {
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.data,
            },
          },
        ]);

        const text = result.response.text();
        const parsed = JSON.parse(text);
        this.name = modelName;
        return this.coerce(parsed);
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        // 404 = model not found, try next. 429 = quota, try next.
        // Other errors (network, auth) — also try next, we'll surface the last.
        if (msg.includes("404") || msg.includes("429")) continue;
        // For other errors, stop and throw.
        throw err;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("All Gemini model candidates failed");
  }

  private async extractImageData(
    image: string
  ): Promise<{ mimeType: string; data: string }> {
    const dataUrlMatch = image.match(
      /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/
    );
    if (dataUrlMatch) {
      return { mimeType: dataUrlMatch[1], data: dataUrlMatch[2] };
    }
    const res = await fetch(image);
    if (!res.ok) {
      throw new Error(`Failed to fetch image: HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    return { mimeType, data: buf.toString("base64") };
  }

  private buildSchema(): object {
    return {
      type: "object",
      properties: {
        technical: {
          type: "object",
          properties: {
            exposure: { type: "number" },
            eye_focus: { type: "number" },
            noise: { type: "number" },
            color_balance: { type: "number" },
            dynamic_range: { type: "number" },
            flags: { type: "array", items: { type: "string" } },
          },
          required: ["exposure", "eye_focus", "noise", "color_balance", "dynamic_range", "flags"],
        },
        aesthetic_market: {
          type: "object",
          properties: {
            composition: { type: "number" },
            background_cleanliness: { type: "number" },
            expression_fit: { type: "number" },
            wardrobe_fit: { type: "number" },
            believability: { type: "number" },
            flags: { type: "array", items: { type: "string" } },
          },
          required: ["composition", "background_cleanliness", "expression_fit", "wardrobe_fit", "believability", "flags"],
        },
        casting: {
          type: "object",
          properties: {
            apparent_age_range: { type: "array", items: { type: "integer" } },
            gender_presentation: {
              type: "object",
              properties: {
                label: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["label", "confidence"],
            },
            type_labels: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  score: { type: "number" },
                },
                required: ["label", "score"],
              },
            },
            expression_readability: { type: "number" },
            expression_tags: { type: "array", items: { type: "string" } },
          },
          required: ["apparent_age_range", "gender_presentation", "type_labels", "expression_readability", "expression_tags"],
        },
        confidence: { type: "number" },
        narrative: { type: "array", items: { type: "string" } },
      },
      required: ["technical", "aesthetic_market", "casting", "confidence", "narrative"],
    };
  }

  private coerce(obj: unknown): RawEvaluation {
    const o = (obj ?? {}) as Record<string, unknown>;
    const clamp01 = (x: unknown) => Math.max(0, Math.min(1, Number(x) || 0));
    const toFlags = (v: unknown): string[] =>
      Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

    const technical = (o.technical ?? {}) as Record<string, unknown>;
    const aesthetic = (o.aesthetic_market ?? {}) as Record<string, unknown>;
    const casting = (o.casting ?? {}) as Record<string, unknown>;
    const gender = (casting.gender_presentation ?? {}) as Record<string, unknown>;

    let age: [number, number] = [25, 40];
    const ageRaw = casting.apparent_age_range;
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
        type_labels: Array.isArray(casting.type_labels)
          ? (casting.type_labels as unknown[])
              .map((t) => {
                const tt = t as Record<string, unknown>;
                return {
                  label: String(tt?.label ?? ""),
                  score: clamp01(tt?.score),
                };
              })
              .filter((t) => t.label)
              .slice(0, 4)
          : [],
        expression_readability: clamp01(casting.expression_readability),
        expression_tags: toFlags(casting.expression_tags),
      },
      confidence: clamp01(o.confidence),
      narrative: toFlags(o.narrative),
    };
  }
}
