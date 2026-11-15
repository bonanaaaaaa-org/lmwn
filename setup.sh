#!/usr/bin/env bash
# Gets a clone ready for ./dev.sh on macOS or Linux. Safe to re-run: every step checks first.
#
#   ./setup.sh               check prerequisites, install dependencies, browsers, hooks, web/.env
#   ./setup.sh --with-deps   Linux only: also install Chromium's and MongoDB's system libraries
#                            (apt, through sudo; the dev container does this)
#
# It never uses sudo unless --with-deps is given, and changes nothing outside this clone except the
# tool caches (pnpm store, uv cache, Playwright browsers, ~/.cache/mongodb-binaries).
set -euo pipefail

cd "$(dirname "$0")"
# shellcheck source=scripts/dev-common.sh
. scripts/dev-common.sh

with_deps=false
for arg in "$@"; do
  case "$arg" in
    --with-deps) with_deps=true ;;
    -h | --help)
      sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) die "Unknown option: $arg (see ./setup.sh --help)" ;;
  esac
done

os=$(uname -s)
want_node=$(tr -d ' \nv' <.nvmrc)
want_python=$(tr -d ' \n' <.python-version)
want_pnpm=$(sed -n 's/.*"packageManager": *"pnpm@\([^"]*\)".*/\1/p' package.json)

# ---------------------------------------------------------------------------------------------
step "Checking prerequisites"
missing=0

if has node; then
  have_node=$(node -p 'process.versions.node')
  if [ "$have_node" = "$want_node" ]; then
    ok "Node $have_node"
  elif [ "${have_node%%.*}" -ge "${want_node%%.*}" ]; then
    warn "Node $have_node (the repo pins $want_node in .nvmrc; this should work)"
    fix "nvm install   # or: fnm use, volta install node@$want_node"
  else
    fail "Node $have_node is too old (the repo pins $want_node in .nvmrc)"
    fix "nvm install   # or: fnm use --install-if-missing, volta install node@$want_node"
    missing=1
  fi
else
  fail "Node is not installed (the repo pins $want_node in .nvmrc)"
  fix "install nvm (https://github.com/nvm-sh/nvm), then: nvm install"
  missing=1
fi

pnpm_fix="corepack enable pnpm   # Node 25+ no longer bundles corepack: npm install --global corepack first"
if has pnpm; then
  have_pnpm=$(pnpm --version 2>/dev/null || echo unknown)
  if [ "$have_pnpm" = "$want_pnpm" ]; then
    ok "pnpm $have_pnpm"
  else
    # pnpm switches to the packageManager version on its own (manage-package-manager-versions).
    warn "pnpm $have_pnpm on PATH; the repo pins $want_pnpm (package.json packageManager), which pnpm uses for this repo"
  fi
else
  fail "pnpm is not installed (the repo pins $want_pnpm in package.json)"
  fix "$pnpm_fix"
  missing=1
fi

if has uv; then
  ok "uv $(uv --version | cut -d' ' -f2)"
else
  fail "uv is not installed"
  fix "curl -LsSf https://astral.sh/uv/install.sh | sh   # or: brew install uv"
  missing=1
fi

if has uv; then
  if python_path=$(uv python find "$want_python" 2>/dev/null); then
    ok "Python $("$python_path" -c 'import platform; print(platform.python_version())') ($python_path)"
  else
    warn "Python $want_python not found; uv will download a managed copy (into uv's own data dir)"
  fi
fi

if [ "$os" = Linux ] && [ "$with_deps" = false ] && ! has apt-get; then
  warn "Not a Debian/Ubuntu system: install Chromium's libraries yourself if Playwright can't launch it"
fi

[ "$missing" -eq 0 ] || die "Install the missing prerequisites above, then run ./setup.sh again."

# ---------------------------------------------------------------------------------------------
step "Installing JavaScript dependencies (pnpm install --frozen-lockfile)"
# The data server's MongoDB binary downloads in a postinstall; CI turns that off with this
# variable, so make sure a leftover value in the shell doesn't skip it here.
MONGOMS_DISABLE_POSTINSTALL=0 pnpm install --frozen-lockfile
ok "node_modules up to date"

step "Installing Python dependencies (uv sync --frozen)"
uv sync --frozen
ok ".venv up to date"

# ---------------------------------------------------------------------------------------------
step "Git hooks"
if [ -d .git ] || git rev-parse --git-dir >/dev/null 2>&1; then
  # pnpm install runs the root `prepare` script (husky) already; run it again only if it didn't.
  if [ "$(git config --get core.hooksPath || true)" = ".husky/_" ]; then
    ok "husky pre-commit hook installed"
  else
    pnpm run prepare
    ok "husky pre-commit hook installed"
  fi
else
  warn "Not a git checkout; skipping the husky hooks"
fi

# ---------------------------------------------------------------------------------------------
if [ "$with_deps" = true ]; then
  step "System libraries (--with-deps)"
  if [ "$os" != Linux ] || ! has apt-get; then
    warn "--with-deps only applies to Debian/Ubuntu Linux; skipping"
  else
    sudo_cmd=""
    if [ "$(id -u)" -ne 0 ]; then
      has sudo || die "--with-deps needs root or sudo to run apt-get."
      sudo_cmd="sudo"
      printf '  Using sudo to apt-get install Chromium'"'"'s and MongoDB'"'"'s system libraries.\n'
    fi
    # MongoDB's mongod links against libcurl.
    $sudo_cmd apt-get update -qq
    $sudo_cmd env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends libcurl4 >/dev/null
    # Playwright resolves the package list for its own Chromium build.
    $sudo_cmd env PATH="$PATH" "$(pwd)/e2e/node_modules/.bin/playwright" install-deps chromium
    ok "System libraries installed"
  fi
fi

# ---------------------------------------------------------------------------------------------
step "Playwright Chromium (e2e and Storybook tests)"
# web and e2e pin the same Playwright, so one download serves both. A no-op when it's there.
pnpm --filter e2e exec playwright install chromium
if pnpm --filter e2e exec node -e \
  "require('@playwright/test').chromium.launch().then((b) => b.close())" >/dev/null 2>&1; then
  ok "Chromium launches"
else
  fail "Playwright's Chromium is installed but won't launch (missing system libraries?)"
  if [ "$os" = Linux ]; then
    fix "./setup.sh --with-deps   # runs apt-get through sudo"
  else
    fix "pnpm --filter e2e exec playwright install --force chromium"
  fi
  die "Fix Chromium, then run ./setup.sh again."
fi

# ---------------------------------------------------------------------------------------------
step "web/.env"
if [ -f web/.env ]; then
  ok "web/.env exists (left as is)"
else
  cp web/.env.example web/.env
  ok "Created web/.env from web/.env.example"
fi

# ---------------------------------------------------------------------------------------------
step "Data Server (MongoDB binary)"
# The provided server runs an in-memory MongoDB (mongodb-memory-server) and downloads mongod on
# its first start if the postinstall didn't. Resolve it now, from the package directory the server
# runs in, so the first ./dev.sh doesn't wait on a download (or fail offline).
# The download progress goes to stdout, so it's sent on to the terminal (1>&2) and only the path
# comes back, on fd 3.
if ! mongod_path=$(cd api-gateway && node -e '
  const { createRequire } = require("node:module");
  const { writeSync } = require("node:fs");
  const server = require.resolve("lmwn-assignment-2025-server/package.json");
  const { MongoBinary } = createRequire(server)("mongodb-memory-server");
  MongoBinary.getPath().then((p) => writeSync(3, p), (e) => { console.error(e.message); process.exit(1); });
' 3>&1 1>&2); then
  fail "Couldn't download the MongoDB binary"
  if [ "$os" = Linux ] && [ "$(uname -m)" != x86_64 ]; then
    fix "MongoDB has no Linux arm64 build of the server's version: use an x86_64 machine or a linux/amd64 container"
  fi
  die "The Data Server can't start without it."
fi
if "$mongod_path" --version >/dev/null 2>&1; then
  ok "mongod ready ($mongod_path)"
else
  fail "mongod is downloaded but won't run ($mongod_path)"
  [ "$os" = Linux ] && fix "./setup.sh --with-deps   # installs libcurl4 through sudo"
  die "The Data Server can't start until mongod runs."
fi

# ---------------------------------------------------------------------------------------------
setup_fingerprint >"$SETUP_STAMP"

printf '\n%sSetup complete.%s Next: %s./dev.sh%s  (app on http://localhost:3000)\n' \
  "$C_GREEN$C_BOLD" "$C_RESET" "$C_BOLD" "$C_RESET"
