#!/usr/bin/env bash
# Deploy the built web app (web/build/client) and web/firebase.json's rewrites
# and headers to the project's default Firebase Hosting site, with a pinned
# Firebase CLI. It authenticates with the Application Default Credentials
# google-github-actions/auth set up (workload identity; no key, no token).
#
# Usage: deploy-hosting.sh   (from the repository root)
# Environment: GCP_PROJECT_ID, GITHUB_SHA, API_URL (from apply.sh: the web
# build must have used it as VITE_API_BASE_URL).
set -euo pipefail

# Bumped by hand; the CLI is not a workspace dependency, so it only runs here.
FIREBASE_TOOLS_VERSION=15.36.0

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is not set}"
: "${API_URL:?API_URL is not set (scripts/apply.sh exports it)}"
# Bill API quota to the target project, not to the deploy identity's
# management project.
export GOOGLE_CLOUD_QUOTA_PROJECT=${GOOGLE_CLOUD_QUOTA_PROJECT:-$GCP_PROJECT_ID}

fail() {
  echo "::error title=Hosting not deployed::$*"
  exit 1
}

build=web/build/client
if [[ ! -f $build/index.html ]]; then
  fail "$build/index.html is missing; build the web app first (VITE_API_BASE_URL=\$API_URL pnpm turbo run build --filter=web)."
fi
# The bundle must call the gateway's public origin. (It always contains the
# http://localhost:4000 fallback of web/src/lib/env.ts, so only the presence
# of API_URL is checked.)
if ! grep -rqsF "$API_URL" "$build/assets"; then
  fail "the built bundle does not contain $API_URL; build it with VITE_API_BASE_URL=$API_URL."
fi

pnpm dlx "firebase-tools@$FIREBASE_TOOLS_VERSION" deploy \
  --config web/firebase.json \
  --only hosting --project "$GCP_PROJECT_ID" --non-interactive \
  --message "${GITHUB_SHA:-local}"
