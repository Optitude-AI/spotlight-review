import { NextRequest, NextResponse } from "next/server";
import type { HeadshotEvaluation, MarketContext } from "@/lib/types";
import { humanizeType } from "@/lib/scoring";

export const runtime = "nodejs";

interface ExportItem {
  name: string;
  dataUrl: string;
  evaluation: HeadshotEvaluation;
  rank: number;
  pinned: boolean;
  overrideScore?: number;
}

/**
 * Generates a standalone, print-optimised HTML document for the shortlist.
 * The client opens it in a new window and calls print() — the user can then
 * "Save as PDF". This avoids heavy PDF dependencies and produces clean output.
 */
export async function POST(req: NextRequest) {
  let body: {
    items?: ExportItem[];
    market?: MarketContext;
    sessionName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = body.items ?? [];
  const market = body.market ?? "us_commercial";
  const sessionName = body.sessionName ?? "Untitled session";

  if (items.length === 0) {
    return NextResponse.json(
      { error: "No items to export" },
      { status: 400 }
    );
  }

  const html = buildExportHtml(items, market, sessionName);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function buildExportHtml(
  items: ExportItem[],
  market: MarketContext,
  sessionName: string
): string {
  const dateStr = new Date().toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const cards = items
    .map((item) => {
      const score = item.overrideScore ?? item.evaluation.overall_score;
      const topType = item.evaluation.casting.type_labels[0];
      const age = item.evaluation.casting.apparent_age_range;
      const flags = [
        ...item.evaluation.technical.flags,
        ...item.evaluation.aesthetic_market.flags,
      ];
      const tag =
        score >= 80
          ? { label: "Excellent", color: "#10b981" }
          : score >= 65
            ? { label: "Strong", color: "#b45309" }
            : score >= 50
              ? { label: "Competent", color: "#d97706" }
              : { label: "Needs work", color: "#e11d48" };

      return `
      <div class="card">
        <div class="card-rank">${item.rank}</div>
        <div class="card-img-wrap">
          <img src="${escapeAttr(item.dataUrl)}" alt="${escapeAttr(item.name)}" />
        </div>
        <div class="card-body">
          <div class="card-header">
            <h2>${escapeHtml(item.name)}</h2>
            <span class="score" style="border-color:${tag.color};color:${tag.color}">${score} · ${tag.label}</span>
          </div>
          <div class="card-meta">
            ${topType ? `<span class="tag">Type: ${escapeHtml(humanizeType(topType.label))}</span>` : ""}
            <span class="tag">Age read: ${age[0]}–${age[1]}</span>
            ${item.pinned ? `<span class="tag pinned">★ Pinned</span>` : ""}
            ${item.overrideScore != null ? `<span class="tag">score overridden</span>` : ""}
          </div>
          ${
            flags.length > 0
              ? `<div class="card-flags">${flags
                  .map((f) => `<span class="flag">${escapeHtml(f.replace(/_/g, " "))}</span>`)
                  .join("")}</div>`
              : ""
          }
          ${
            item.evaluation.narrative.length > 0
              ? `<div class="card-notes"><strong>Notes:</strong><ul>${item.evaluation.narrative
                  .map((n) => `<li>${escapeHtml(n)}</li>`)
                  .join("")}</ul></div>`
              : ""
          }
          <div class="card-confidence">Confidence: ${Math.round(item.evaluation.overall_confidence * 100)}%</div>
        </div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Spotlight Review — ${escapeHtml(sessionName)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    margin: 0; padding: 32px; color: #1a1a1a; background: #fff;
    line-height: 1.5;
  }
  .header { border-bottom: 2px solid #b45309; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { margin: 0 0 4px 0; font-size: 22px; }
  .header .meta { font-size: 12px; color: #666; }
  .header .meta span { margin-right: 16px; }
  .disclaimer {
    font-size: 10px; color: #888; border-top: 1px solid #ddd;
    margin-top: 32px; padding-top: 12px;
  }
  .card {
    display: flex; gap: 16px; border: 1px solid #e5e5e5;
    border-radius: 8px; padding: 16px; margin-bottom: 16px;
    page-break-inside: avoid; position: relative;
  }
  .card-rank {
    position: absolute; top: 0; left: 0; background: #1a1a1a; color: #fff;
    width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
    font-weight: bold; border-radius: 8px 0 8px 0; font-size: 13px;
  }
  .card-img-wrap { flex-shrink: 0; width: 120px; height: 150px; overflow: hidden; border-radius: 6px; background: #f5f5f5; }
  .card-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .card-body { flex: 1; min-width: 0; }
  .card-header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  .card-header h2 { margin: 0; font-size: 16px; }
  .score { font-size: 13px; font-weight: 600; border: 1px solid; padding: 2px 8px; border-radius: 12px; white-space: nowrap; }
  .card-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .tag { font-size: 10px; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; color: #555; }
  .tag.pinned { background: #fef3c7; color: #92400e; }
  .card-flags { margin-bottom: 8px; }
  .flag { font-size: 10px; background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 3px; margin-right: 4px; display: inline-block; margin-bottom: 2px; }
  .card-notes { font-size: 11px; color: #444; }
  .card-notes ul { margin: 4px 0 0 0; padding-left: 16px; }
  .card-notes li { margin-bottom: 2px; }
  .card-confidence { font-size: 10px; color: #888; margin-top: 6px; }
  @media print {
    body { padding: 16px; }
    .card { box-shadow: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>Spotlight Review — Shortlist Export</h1>
    <div class="meta">
      <span><strong>Session:</strong> ${escapeHtml(sessionName)}</span>
      <span><strong>Market:</strong> ${escapeHtml(market.replace(/_/g, " "))}</span>
      <span><strong>Date:</strong> ${dateStr}</span>
      <span><strong>Items:</strong> ${items.length}</span>
    </div>
  </div>
  ${cards}
  <div class="disclaimer">
    Assistive feedback only. This document evaluates photographs, never people. Final judgement rests with the casting professional. Generated by Spotlight Review.
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
