import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" });
  }

  const keyPrefix = apiKey.substring(0, 6);
  const keyFormat = apiKey.startsWith("AIza") ? "AI Studio (standard)" : `Unknown (${keyPrefix}...)`;

  // List models
  let models: unknown = null;
  let listError: string | null = null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json();
    if (data.error) {
      listError = `${data.error.code}: ${data.error.message}`;
    } else {
      models = data.models
        ?.filter((m: { supportedGenerationMethods?: string[] }) =>
          m.supportedGenerationMethods?.includes("generateContent")
        )
        .map((m: { name: string }) => m.name);
    }
  } catch (err) {
    listError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    keyFormat,
    keyPrefix,
    visionProvider: process.env.VISION_PROVIDER || "gemini",
    modelsAvailable: models,
    listError,
  });
}
