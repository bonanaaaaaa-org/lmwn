#!/usr/bin/env bash
# Deploy both Firebase Hosting sites with one web/firebase.json, with a pinned
# Firebase CLI:
#   - target "web": the built web app (web/build/client) to the project's
#     default site;
#   - target "storybook": the static Storybook build (web/storybook-static) to
#     the Storybook's own site.
# It authenticates with the Application Default Credentials
# google-github-actions/auth set up (workload identity; no key, no token).
#
# Usage: deploy-hosting.sh   (from the repository root)
# Environment: GCP_PROJECT_ID, GITHUB_SHA, and from apply.sh: API_URL (the web
# build must have used it as VITE_API_BASE_URL), HOSTING_SITE_ID and
# STORYBOOK_SITE_ID (the sites the targets deploy to).
set -euo pipefail

# Bumped by hand; the CLI is not a workspace dependency, so it only runs here.
FIREBASE_TOOLS_VERSION=15.36.0

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is not set}"
: "${API_URL:?API_URL is not set (scripts/apply.sh exports it)}"
: "${HOSTING_SITE_ID:?HOSTING_SITE_ID is not set (scripts/apply.sh exports it)}"
: "${STORYBOOK_SITE_ID:?STORYBOOK_SITE_ID is not set (scripts/apply.sh exports it)}"
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

storybook=web/storybook-static
if [[ ! -f $storybook/index.html || ! -f $storybook/iframe.html || ! -f $storybook/index.json ]]; then
  fail "$storybook is incomplete; build the Storybook first (pnpm turbo run build-storybook --filter=web)."
fi
# Stories use fixtures only and never call the gateway. (A belt-and-braces
# check: the post-deploy Playwright run fails on any request off the
# Storybook's origin.)
api_host=${API_URL#*://}
api_host=${api_host%%/*}
if grep -rqsF "$api_host" "$storybook"; then
  fail "the Storybook build names the gateway's host $api_host; stories must not call the gateway."
fi

# Map web/firebase.json's targets to this project's sites. The CLI reads
# .firebaserc next to the config; it is written here and never committed, so
# the site IDs come only from Terraform.
jq -n --arg project "$GCP_PROJECT_ID" --arg web "$HOSTING_SITE_ID" --arg storybook "$STORYBOOK_SITE_ID" '
  {projects: {default: $project},
   targets: {($project): {hosting: {web: [$web], storybook: [$storybook]}}}}
' >web/.firebaserc

pnpm dlx "firebase-tools@$FIREBASE_TOOLS_VERSION" deploy \
  --config web/firebase.json \
  --only hosting:web,hosting:storybook --project "$GCP_PROJECT_ID" --non-interactive \
  --message "${GITHUB_SHA:-local}"
