#!/usr/bin/env bash
# Starts the local stack the way `pnpm dev` does: the provided Data Server (:8888 guides,
# :9999 restaurants, :7777 images), the API gateway (:4000) and the web app (:3000).
#
#   ./dev.sh               start the stack; Ctrl-C stops everything
#   ./dev.sh --storybook   also start Storybook (:6006)
#   ./dev.sh --e2e         start the stack, run the Playwright suite against it, then stop
#
# Run ./setup.sh first.
set -euo pipefail

cd "$(dirname "$0")"
# shellcheck source=scripts/dev-common.sh
. scripts/dev-common.sh

storybook=false
e2e=false
for arg in "$@"; do
  case "$arg" in
    --storybook) storybook=true ;;
    --e2e) e2e=true ;;
    -h | --help)
      sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) die "Unknown option: $arg (see ./dev.sh --help)" ;;
  esac
done

# ---------------------------------------------------------------------------------------------
step "Checking setup"
if [ ! -f "$SETUP_STAMP" ]; then
  fail "./setup.sh hasn't run in this clone"
  die "Run ./setup.sh first."
fi
if [ "$(cat "$SETUP_STAMP")" != "$(setup_fingerprint)" ]; then
  fail "A lockfile or a version pin changed since ./setup.sh last ran"
  die "Run ./setup.sh again."
fi
ok "Set up"

# ---------------------------------------------------------------------------------------------
# Prints "<pid> <command>" of whatever listens on TCP port $1, or nothing if it's free.
port_holder() {
  local port=$1 out
  if has lsof; then
    out=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -Fpc 2>/dev/null || true)
    if [ -n "$out" ]; then
      printf '%s %s\n' "$(printf '%s\n' "$out" | sed -n 's/^p//p' | head -1)" \
        "$(printf '%s\n' "$out" | sed -n 's/^c//p' | head -1)"
      return
    fi
  fi
  if has ss; then
    out=$(ss -Hltnp "sport = :$port" 2>/dev/null || true)
    if [ -n "$out" ]; then
      # users:(("node",pid=123,fd=21)); the process part is empty for another user's process.
      printf '%s %s\n' "$(printf '%s' "$out" | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)" \
        "$(printf '%s' "$out" | sed -n 's/.*(("\([^"]*\)".*/\1/p' | head -1)"
      return
    fi
  fi
  # No lsof or ss: at least tell busy from free.
  if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
    echo "? (install lsof to see which process)"
  fi
}

step "Checking ports"
ports="8888 9999 7777 4000 3000"
[ "$storybook" = true ] && ports="$ports 6006"
busy=0
for port in $ports; do
  holder=$(port_holder "$port")
  if [ -n "$holder" ]; then
    pid=${holder%% *}
    fail ":$port is in use by ${holder#* } (pid ${pid:-?})"
    if [ -n "$pid" ] && [ "$pid" != "?" ]; then
      fix "stop it, or: kill $pid   # check it's yours first: ps -p $pid -o pid,command"
    fi
    busy=1
  else
    ok ":$port free"
  fi
done
[ "$busy" -eq 0 ] || die "Free the ports above, then run ./dev.sh again."

# ---------------------------------------------------------------------------------------------
# Each process runs in its own process group (job control), so a signal reaches its whole tree.
set -m
pids=""

stop_all() {
  trap - INT TERM EXIT
  [ -n "$pids" ] || exit "${1:-0}"
  printf '\n%s==> Stopping%s\n' "$C_BOLD" "$C_RESET"
  local pid alive
  # Ctrl-C semantics first: turbo forwards SIGINT to the data server, uvicorn and Vite.
  for pid in $pids; do kill -INT -- "-$pid" 2>/dev/null || true; done
  for _ in $(seq 1 20); do
    alive=""
    for pid in $pids; do kill -0 "$pid" 2>/dev/null && alive="$alive $pid"; done
    [ -n "$alive" ] || break
    sleep 0.5
  done
  for pid in $pids; do kill -TERM -- "-$pid" 2>/dev/null || true; done
  sleep 1
  for pid in $pids; do kill -KILL -- "-$pid" 2>/dev/null || true; done
  ok "Stopped"
  exit "${1:-0}"
}
trap 'stop_all 130' INT
trap 'stop_all 143' TERM
trap 'stop_all $?' EXIT

step "Starting the stack (pnpm dev)"
# --ui=stream: interleaved, prefixed logs instead of turbo's full-screen UI. stdin from
# /dev/null: a background process group that reads the terminal would be stopped.
pnpm dev --ui=stream </dev/null &
pids="$!"
if [ "$storybook" = true ]; then
  pnpm --filter web storybook </dev/null &
  pids="$pids $!"
fi

# Waits until URL $1 answers, while every process is still running; $2 is the timeout (s).
wait_for() {
  local url=$1 deadline=$((SECONDS + $2)) pid
  until curl -fsS -o /dev/null "$url" 2>/dev/null; do
    for pid in $pids; do
      kill -0 "$pid" 2>/dev/null || die "A process exited before $url came up (see the log above)."
    done
    [ "$SECONDS" -lt "$deadline" ] || die "$url didn't come up within $2s."
    sleep 1
  done
}

# The data server starts MongoDB and seeds it first, so it's the slowest.
wait_for http://localhost:8888/guides 180
wait_for http://localhost:4000/health 60
wait_for http://localhost:3000/ 60
[ "$storybook" = true ] && wait_for http://localhost:6006/ 120

printf '\n%sThe stack is up.%s\n' "$C_GREEN$C_BOLD" "$C_RESET"
printf '  Web app       http://localhost:3000\n'
printf '  API gateway   http://localhost:4000   (docs: /docs, health: /health)\n'
printf '  Data Server   http://localhost:8888 guides, :9999 restaurants, :7777 images\n'
[ "$storybook" = true ] && printf '  Storybook     http://localhost:6006\n'

if [ "$e2e" = true ]; then
  step "Running the e2e suite (pnpm test:e2e, against this stack)"
  # Playwright reuses the running stack (reuseExistingServer outside CI).
  status=0
  pnpm test:e2e </dev/null || status=$?
  stop_all "$status"
fi

printf '\n%sCtrl-C to stop.%s\n\n' "$C_DIM" "$C_RESET"
# Stay up until Ctrl-C, or stop everything if one of the processes exits on its own.
while :; do
  for pid in $pids; do
    if ! kill -0 "$pid" 2>/dev/null; then
      wait "$pid" && code=0 || code=$?
      warn "A process exited (status $code); stopping the rest"
      stop_all 1
    fi
  done
  sleep 1
done
