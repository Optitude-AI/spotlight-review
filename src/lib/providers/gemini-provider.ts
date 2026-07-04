import type { VisionProvider } from "@/lib/vision-provider";
import { buildEvaluatorPrompt, type RawEvaluation } from "@/lib/evaluator-prompt";
import type { MarketContext } from "@/lib/types";

/**
 * Google Gemini 1.5 Flash provider — free tier (15 req/min, 1,500/day).
 *
 * Uses Gemini's native `responseMimeType: "application/json"` + a
 * `responseSchema` so the model is constrained to emit valid JSON matching
 * our RawEvaluation shape. This is far more reliable than prompt-only JSON.
 *
 * Requires env var: GEMINI_API_KEY (get a free key at
 * https://aistudio.google.com/apikey)
 */
export class GeminiProvider implements VisionProvider {
  name = "gemini-1.5-flash";

  async evaluate(image: string, market: MarketContext): Promise<RawEvaluation> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY env var is required for the Gemini provider. Get a free key at https://aistudio.google.com/apikey"
      );
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        // Constrain output to our schema — Gemini will only emit valid JSON
        // matching this shape. Arrays use the item schema; mixed arrays of
        // strings are modelled as string arrays with a description.
        responseSchema: {
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
              required: [
                "exposure",
                "eye_focus",
                "noise",
                "color_balance",
                "dynamic_range",
                "flags",
              ],
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
              required: [
                "composition",
                "background_cleanliness",
                "expression_fit",
                "wardrobe_fit",
                "believability",
                "flags",
              ],
            },
            casting: {
              type: "object",
              properties: {
                apparent_age_range: {
                  type: "array",
                  items: { type: "integer" },
                },
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
              required: [
                "apparent_age_range",
                "gender_presentation",
                "type_labels",
                "expression_readability",
                "expression_tags",
              ],
            },
            confidence: { type: "number" },
            narrative: { type: "array", items: { type: "string" } },
          },
          required: [
            "technical",
            "aesthetic_market",
            "casting",
            "confidence",
            "narrative",
          ],
        },
        temperature: 0.4,
      },
    });

    const prompt = buildEvaluatorPrompt(market);
    const imageData = await this.extractImageData(image);

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
    return this.coerce(parsed);
  }

  /** Extract base64 data + mime type from a data URL or fetch a remote URL. */
  private async extractImageData(
    image: string
  ): Promise<{ mimeType: string; data: string }> {
    // Data URL: data:image/jpeg;base64,....
    const dataUrlMatch = image.match(
      /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/
    );
    if (dataUrlMatch) {
      return { mimeType: dataUrlMatch[1], data: dataUrlMatch[2] };
    }
    // Remote URL — Gemini's inlineData needs base64, so fetch + convert.
    const res = await fetch(image);
    if (!res.ok) {
      throw new Error(`Failed to fetch image: HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    return { mimeType, data: buf.toString("base64") };
  }

  private coerce(obj: unknown): RawEvaluation {
    // Gemini's responseSchema already constrains the shape, but we still
    // validate/clamp to be safe (matching the ZAI provider's coerce logic).
    const o = (obj ?? {}) as Record<string, unknown>;
    const clamp01 = (x: unknown) =>
      Math.max(0, Math.min(1, Number(x) || 0));
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
