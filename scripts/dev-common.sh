# shellcheck shell=bash
# Shared by setup.sh and dev.sh (sourced, not run). Bash 3.2 compatible: macOS ships it as /bin/bash.

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_BOLD=$'\033[1m' C_DIM=$'\033[2m' C_RED=$'\033[31m' C_GREEN=$'\033[32m' C_YELLOW=$'\033[33m' C_RESET=$'\033[0m'
else
  C_BOLD='' C_DIM='' C_RED='' C_GREEN='' C_YELLOW='' C_RESET=''
fi

step() { printf '\n%s==> %s%s\n' "$C_BOLD" "$*" "$C_RESET"; }
ok() { printf '  %s✓%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '  %s!%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
fail() { printf '  %s✗%s %s\n' "$C_RED" "$C_RESET" "$*"; }
# An indented "fix:" line under a failure or warning.
fix() { printf '    %sfix:%s %s\n' "$C_DIM" "$C_RESET" "$*"; }
die() {
  printf '\n%s%s%s\n' "$C_RED" "$*" "$C_RESET" >&2
  exit 1
}

has() { command -v "$1" >/dev/null 2>&1; }

# setup.sh writes this stamp when it finishes; dev.sh refuses to start without a current one.
# shellcheck disable=SC2034 # used by the scripts that source this file
SETUP_STAMP=node_modules/.lmwn-setup-stamp

# A fingerprint of everything setup.sh installs from, so a pull that changes a lockfile asks for a
# re-run.
setup_fingerprint() {
  cat pnpm-lock.yaml uv.lock .nvmrc .python-version package.json | cksum | cut -d' ' -f1
}
