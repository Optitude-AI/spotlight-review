import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const VALID_RESULTS = ["booked", "audition", "no_response"] as const;

/**
 * Records an outcome for a headshot (booked / audition / no response).
 * Secondary, noisy training signal. Requires consent.
 */
export async function POST(req: NextRequest) {
  let body: {
    sessionKey?: string;
    imageHash?: string;
    market?: string;
    result?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionKey, imageHash, market, result, note } = body;

  if (!sessionKey || !imageHash || !market || !result) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }
  if (!VALID_RESULTS.includes(result as (typeof VALID_RESULTS)[number])) {
    return NextResponse.json(
      { ok: false, error: `Invalid result: ${result}` },
      { status: 400 }
    );
  }

  try {
    const consent = await db.consentRecord.findUnique({
      where: { sessionKey },
    });
    if (!consent || !consent.granted) {
      return NextResponse.json({ ok: true, logged: false, reason: "no_consent" });
    }

    await db.outcome.create({
      data: { imageHash, market, result, note: note ?? null },
    });
    return NextResponse.json({ ok: true, logged: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
