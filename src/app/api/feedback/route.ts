import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const VALID_ACTIONS = [
  "pin",
  "unpin",
  "reject",
  "unreject",
  "override",
  "remove",
  "select",
  "deselect",
  "compare_add",
  "compare_remove",
] as const;

/**
 * Logs a user edit as training signal. Only persisted when the session has
 * granted consent (checked via ConsentRecord). Always returns 200 so the UX
 * never blocks on logging.
 */
export async function POST(req: NextRequest) {
  let body: {
    sessionKey?: string;
    imageHash?: string;
    market?: string;
    action?: string;
    value?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionKey, imageHash, market, action, value } = body;

  if (!sessionKey || !imageHash || !market || !action) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }
  if (!VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number])) {
    return NextResponse.json(
      { ok: false, error: `Invalid action: ${action}` },
      { status: 400 }
    );
  }

  try {
    // Check consent — only log if granted.
    const consent = await db.consentRecord.findUnique({
      where: { sessionKey },
    });
    if (!consent || !consent.granted) {
      return NextResponse.json({ ok: true, logged: false, reason: "no_consent" });
    }

    await db.feedbackLog.create({
      data: {
        imageHash,
        market,
        action,
        value: value ?? null,
      },
    });
    return NextResponse.json({ ok: true, logged: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
