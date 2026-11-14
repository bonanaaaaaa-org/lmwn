#!/usr/bin/env bash
# Smoke-test a deploy through its public URLs:
#   - the gateway: GET /health is {"status":"ok"}; GET /guides lists Guides
#     whose photo URLs are all on the gateway's own /photos route (none on the
#     data server's localhost:7777), and the first one is served as an image; CORS allows the web origin and no other;
#   - the web app: / and a deep link serve the SPA with Cache-Control:
#     no-cache, and a hashed /assets/ file is immutable.
# Each check retries for about two minutes (a new revision, a cold start, or a
# Hosting release propagating).
#
# Usage: smoke-test.sh <api-url> <web-url>
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <api-url> <web-url>" >&2
  exit 2
fi
api=${1%/}
web=${2%/}

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
