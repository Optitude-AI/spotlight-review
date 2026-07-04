import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Records consent for a session. Must be called before any feedback/outcome
 * is logged. The sessionKey is an anonymous client-generated ID.
 *
 * GET  /api/consent?sessionKey=...  — check current consent state
 * POST /api/consent                  — grant or revoke
 */
export async function GET(req: NextRequest) {
  const sessionKey = req.nextUrl.searchParams.get("sessionKey");
  if (!sessionKey) {
    return NextResponse.json(
      { ok: false, error: "Missing sessionKey" },
      { status: 400 }
    );
  }
  try {
    const record = await db.consentRecord.findUnique({
      where: { sessionKey },
    });
    return NextResponse.json({
      ok: true,
      granted: record?.granted ?? false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { sessionKey?: string; granted?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionKey, granted } = body;
  if (!sessionKey || typeof granted !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "Missing sessionKey or granted" },
      { status: 400 }
    );
  }

  try {
    await db.consentRecord.upsert({
      where: { sessionKey },
      create: {
        sessionKey,
        granted,
        grantedAt: granted ? new Date() : null,
      },
      update: {
        granted,
        grantedAt: granted ? new Date() : null,
      },
    });
    return NextResponse.json({ ok: true, granted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
