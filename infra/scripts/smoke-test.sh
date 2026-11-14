#!/usr/bin/env bash
# Smoke-test a deploy through its public URLs:
#   - the gateway: GET /health is {"status":"ok"}; GET /guides lists Guides
#     whose photo URLs are all on the gateway's own /photos route (none on the
#     data server's localhost:7777), and the first one is served as an image; CORS allows the web origin and no other;
#     The same for the first Guide's Guide Item photos;
#   - the web app: / and a deep link serve the SPA with Cache-Control:
#     no-cache, a hashed /assets/ file is immutable, and a missing one is 404;
#   - the Storybook (when given): / and iframe.html are served with
#     Cache-Control: no-cache and X-Robots-Tag: noindex, index.json lists
#     stories, a hashed /assets/ file is immutable, and a missing one is 404.
# Each check retries for about two minutes (a new revision, a cold start, or a
# Hosting release propagating).
#
# Usage: smoke-test.sh <api-url> <web-url> [<storybook-url>]
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "usage: $0 <api-url> <web-url> [<storybook-url>]" >&2
  exit 2
fi
api=${1%/}
web=${2%/}
storybook=${3:+${3%/}}

fail() {
  echo "::error title=Smoke test failed::$*"
  exit 1
}

# retry COMMAND...: runs it up to 24 times, 5 s apart.
retry() {
  local _
  for _ in $(seq 1 24); do
    if "$@"; then
      return 0
    fi
    sleep 5
  done
  return 1
}

# header URL NAME [CURL ARGS...]: the (case-insensitive) response header's value.
header() {
  local url=$1 name=$2
  shift 2
  curl -sS --max-time 15 -o /dev/null -D - "$@" "$url" 2>/dev/null |
    tr -d '\r' |
    awk -v n="$(tr '[:upper:]' '[:lower:]' <<<"$name")" 'index(tolower($0), n ": ") == 1 { sub(/^[^:]*: /, ""); print; exit }'
}

health_ok() { [[ $(curl -sS --max-time 15 "$api/health") == '{"status":"ok"}' ]]; }
retry health_ok || fail "GET $api/health is not {\"status\":\"ok\"}."
echo "ok: $api/health"

guides=""
guides_ok() { guides=$(curl -sS --fail --max-time 30 "$api/guides") && jq -e '.total > 0' <<<"$guides" >/dev/null; }
retry guides_ok || fail "GET $api/guides lists no Guides."
# Every photo URL must be on the gateway's own /photos route: never the data
# server's localhost:7777, which no browser can reach.
stray=$(jq -r --arg prefix "$api/photos/" '
  [.items[].coverPhoto | .smallUrl, .largeUrl] | map(select(startswith($prefix) | not)) | .[]
' <<<"$guides")
[[ -z $stray ]] || fail "GET $api/guides has photo URLs outside $api/photos/: $stray"
if grep -qE 'localhost:(7777|8888|9999)' <<<"$guides"; then
  fail "GET $api/guides names a data server port."
fi
echo "ok: $api/guides ($(jq '.total' <<<"$guides") Guides, photos on $api/photos/)"

# The same for a Guide's Guide Item photos.
guide_id=$(jq -r '.items[0].id' <<<"$guides")
detail=$(curl -sS --fail --max-time 30 "$api/guides/$guide_id") || fail "GET $api/guides/$guide_id failed."
stray=$(jq -r --arg prefix "$api/photos/" '
  [.coverPhoto, (.items[].photos[])] | map(.smallUrl, .largeUrl) | map(select(startswith($prefix) | not)) | .[]
' <<<"$detail")
[[ -z $stray ]] || fail "GET $api/guides/$guide_id has photo URLs outside $api/photos/: $stray"
if grep -qE 'localhost:(7777|8888|9999)' <<<"$detail"; then
  fail "GET $api/guides/$guide_id names a data server port."
fi
echo "ok: $api/guides/$guide_id (Guide Item photos on $api/photos/)"

photo=$(jq -r '.items[0].coverPhoto.smallUrl' <<<"$guides")
photo_ok() { [[ $(header "$photo" Content-Type) == image/* ]]; }
retry photo_ok || fail "GET $photo is not an image."
echo "ok: $photo is an image"

allowed=$(header "$api/guides" Access-Control-Allow-Origin -H "Origin: $web")
[[ $allowed == "$web" ]] || fail "the gateway does not allow $web (Access-Control-Allow-Origin: '$allowed')."
foreign=$(header "$api/guides" Access-Control-Allow-Origin -H "Origin: https://example.com")
[[ -z $foreign ]] || fail "the gateway allows https://example.com."
echo "ok: CORS allows $web and not https://example.com"

page_ok() { [[ $(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "$1") == 200 ]] && [[ $(header "$1" Cache-Control) == no-cache ]]; }
retry page_ok "$web/" || fail "GET $web/ is not 200 with Cache-Control: no-cache."
retry page_ok "$web/guides/00000000-0000-4000-8000-000000000000" || fail "a deep link is not rewritten to the SPA."
echo "ok: $web/ and a deep link serve the SPA, not cached"

asset=$(curl -sS --max-time 15 "$web/" | grep -oE '/assets/[A-Za-z0-9._-]+\.js' | head -1 || true)
[[ -n $asset ]] || fail "$web/ names no /assets/*.js file."
[[ $(header "$web$asset" Cache-Control) == *immutable* ]] || fail "$web$asset is not cached as immutable."
echo "ok: $web$asset is immutable"
missing=$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "$web/assets/missing-00000000.js")
[[ $missing == 404 ]] || fail "a missing /assets/ file answers $missing, not 404 (it must not get index.html)."
echo "ok: a missing /assets/ file is 404"

[[ -n $storybook ]] || exit 0

sb_page_ok() {
  [[ $(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "$1") == 200 ]] &&
    [[ $(header "$1" Cache-Control) == no-cache ]] &&
    [[ $(header "$1" X-Robots-Tag) == *noindex* ]]
}
retry sb_page_ok "$storybook/" || fail "GET $storybook/ is not 200 with Cache-Control: no-cache and X-Robots-Tag: noindex."
retry sb_page_ok "$storybook/iframe.html" || fail "GET $storybook/iframe.html is not 200 with Cache-Control: no-cache and X-Robots-Tag: noindex."
echo "ok: $storybook/ and iframe.html are served, not cached, not indexed"

stories=$(curl -sS --fail --max-time 15 "$storybook/index.json" | jq '[.entries[] | select(.type == "story")] | length' || echo 0)
[[ $stories -gt 0 ]] || fail "$storybook/index.json lists no stories."
echo "ok: $storybook/index.json lists $stories stories"

sb_asset=$(curl -sS --max-time 15 "$storybook/iframe.html" | grep -oE '/assets/[A-Za-z0-9._-]+\.js' | head -1 || true)
[[ -n $sb_asset ]] || fail "$storybook/iframe.html names no /assets/*.js file."
[[ $(header "$storybook$sb_asset" Cache-Control) == *immutable* ]] || fail "$storybook$sb_asset is not cached as immutable."
echo "ok: $storybook$sb_asset is immutable"
missing=$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "$storybook/assets/missing-00000000.js")
[[ $missing == 404 ]] || fail "a missing Storybook /assets/ file answers $missing, not 404."
echo "ok: a missing Storybook /assets/ file is 404"
