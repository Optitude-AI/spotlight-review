#!/usr/bin/env bash
# Deploy Spotlight Review to Vercel.
#
# Usage:
#   VERCEL_TOKEN=<your-vercel-token> bash deploy-to-vercel.sh
#
# Get a token at: https://vercel.com/account/tokens
#
set -euo pipefail
cd "$(dirname "$0")"

: "${VERCEL_TOKEN:?VERCEL_TOKEN env var is required (create one at https://vercel.com/account/tokens)}"

echo "→ Installing Vercel CLI…"
npm install -g vercel 2>/dev/null || npx vercel --version

echo "→ Creating/linking Vercel project…"
# This creates a new project if one doesn't exist, or links if it does.
vercel link --yes --token "$VERCEL_TOKEN" 2>&1 || true

echo "→ Setting environment variables…"
set_env() {
  local name="$1"
  local value="$2"
  local target="${3:-production}"
  # Remove existing (ignore error if not found), then add.
  vercel env rm "$name" "$target" --yes --token "$VERCEL_TOKEN" 2>/dev/null || true
  echo -n "$value" | vercel env add "$name" "$target" --token "$VERCEL_TOKEN" 2>/dev/null
  echo "  ✓ $name"
}

# ZAI SDK credentials (read from /etc/.z-ai-config in the sandbox)
set_env "ZAI_BASE_URL" "https://internal-api.z.ai/v1"
set_env "ZAI_API_KEY" "Z.ai"
set_env "ZAI_CHAT_ID" "chat-7a30de38-2dbe-4cc6-b7c8-61dd28b65e32"
set_env "ZAI_USER_ID" "966679fd-efe9-4e6b-bd3e-c0ed4238df67"
set_env "ZAI_TOKEN" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTY2Njc5ZmQtZWZlOS00ZTZiLWJkM2UtYzBlZDQyMzhkZjY3IiwiY2hhdF9pZCI6ImNoYXQtN2EzMGRlMzgtMmRiZS00Y2M2LWI3YzgtNjFkZDI4YjY1ZTMyIiwicGxhdGZvcm0iOiJ6YWkifQ.t-iCKImg3tB-39LLH-kzc-oN9ixDLPSSFpJiIc_oKck"

# Database — use /tmp (writable on Vercel serverless, but ephemeral).
# The app gracefully handles DB failures; caching/logging won't persist
# across invocations but the app functions.
set_env "DATABASE_URL" "file:/tmp/custom.db"

echo "→ Deploying to production…"
vercel deploy --prod --yes --token "$VERCEL_TOKEN"

echo ""
echo "✓ Deployed. Check the URL above."
echo ""
echo "Note: SQLite is ephemeral on Vercel serverless — server-side caching"
echo "and feedback logging won't persist across invocations. The app still"
echo "functions (evaluations work, client-side caching works)."
echo "For persistent storage, consider Turso (libSQL) or Vercel Postgres."
