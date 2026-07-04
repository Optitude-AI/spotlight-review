#!/usr/bin/env bash
# Push the current project to GitHub.
#
# Usage:
#   GH_TOKEN=ghp_xxx REPO=your-name/spotlight-review bash push-to-github.sh
#
# Prerequisites:
#   - Create an EMPTY repo on GitHub first (no README, no license, no .gitignore)
#     so it has no initial commit that would clash with the push.
#   - GH_TOKEN must be a Personal Access Token with `repo` scope.
#     Create one at: https://github.com/settings/tokens
#
set -euo pipefail

cd "$(dirname "$0")"

: "${GH_TOKEN:?GH_TOKEN env var is required (create one at https://github.com/settings/tokens)}"
: "${REPO:?REPO env var is required, e.g. your-name/spotlight-review}"

REMOTE_URL="https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git"

echo "→ Setting remote 'origin' (token hidden)…"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

echo "→ Pushing main to origin…"
git push -u origin main

# Scrub the token from the stored remote URL so it doesn't linger in .git/config.
git remote set-url origin "https://github.com/${REPO}.git"

echo "✓ Pushed. Repo: https://github.com/${REPO}"
