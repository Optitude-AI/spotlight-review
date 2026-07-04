import type { RawEvaluation } from "@/lib/evaluator-prompt";
import type { MarketContext } from "@/lib/types";

/**
 * Vision provider abstraction. Multiple backends (ZAI, Gemini, OpenAI, …)
 * implement this interface. The active provider is selected by the
 * VISION_PROVIDER env var (default: gemini, which has a free tier that works
 * from Vercel). This keeps the structured-output contract identical across
 * providers so the frontend never changes.
 */
export interface VisionProvider {
  /** Name for logging / model_version metadata. */
  name: string;
  /**
   * Evaluate a headshot image and return raw structured fields. The provider
   * is responsible for extracting valid JSON from its model's response.
   */
  evaluate(image: string, market: MarketContext): Promise<RawEvaluation>;
}

let cached: VisionProvider | null = null;

export async function getVisionProvider(): Promise<VisionProvider> {
  if (cached) return cached;
  const choice = (process.env.VISION_PROVIDER || "gemini").toLowerCase();

  if (choice === "zai") {
    const { ZaiProvider } = await import("@/lib/providers/zai-provider");
    cached = new ZaiProvider();
  } else if (choice === "gemini") {
    const { GeminiProvider } = await import("@/lib/providers/gemini-provider");
    cached = new GeminiProvider();
  } else {
    throw new Error(
      `Unknown VISION_PROVIDER "${choice}". Supported: gemini, zai.`
    );
  }
  return cached;
}
