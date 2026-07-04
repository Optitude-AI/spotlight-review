#!/usr/bin/env bash
# Deploy Spotlight Review to Vercel.
#
# Usage:
#   VERCEL_TOKEN=<token> GEMINI_API_KEY=<key> bash deploy-to-vercel.sh
#
# Get tokens:
#   VERCEL_TOKEN  — https://vercel.com/account/tokens
#   GEMINI_API_KEY — https://aistudio.google.com/apikey  (FREE, 1500 req/day)
#
set -euo pipefail
cd "$(dirname "$0")"

: "${VERCEL_TOKEN:?VERCEL_TOKEN env var is required (https://vercel.com/account/tokens)}"
: "${GEMINI_API_KEY:?GEMINI_API_KEY env var is required (https://aistudio.google.com/apikey — FREE)}"

echo "→ Installing Vercel CLI…"
npm install -g vercel 2>/dev/null || true

echo "→ Linking project (creates if new)…"
vercel link --yes --token "$VERCEL_TOKEN" 2>&1 || true

echo "→ Setting environment variables…"
set_env() {
  local name="$1"
  local value="$2"
  vercel env rm "$name" production --yes --token "$VERCEL_TOKEN" 2>/dev/null || true
  vercel env rm "$name" preview --yes --token "$VERCEL_TOKEN" 2>/dev/null || true
  printf "%s" "$value" | vercel env add "$name" production --token "$VERCEL_TOKEN" 2>/dev/null
  printf "%s" "$value" | vercel env add "$name" preview --token "$VERCEL_TOKEN" 2>/dev/null
  echo "  ✓ $name"
}

# Use Gemini (free, public API) — not ZAI (internal-only, unreachable from Vercel)
set_env "VISION_PROVIDER" "gemini"
set_env "GEMINI_API_KEY" "$GEMINI_API_KEY"

# Database — ephemeral on Vercel serverless, but app handles failures gracefully
set_env "DATABASE_URL" "file:/tmp/custom.db"

echo "→ Deploying to production…"
DEPLOY_URL=$(vercel deploy --prod --yes --token "$VERCEL_TOKEN" 2>&1 | grep -oE 'https://[a-z0-9.-]+\.vercel\.app' | head -1)
echo ""
echo "✓ Deployed to: ${DEPLOY_URL:-<check output above>}"
echo ""
echo "The app uses Google Gemini (free tier, 1500 evals/day) for vision."
echo "SQLite is ephemeral on Vercel — client-side caching still works,"
echo "server-side cache/feedback logging won't persist across invocations."
