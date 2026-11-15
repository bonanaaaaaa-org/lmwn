#!/usr/bin/env bash
# Runs once after the dev container is created (devcontainer.json's postCreateCommand).
# A script rather than an inline command: Zed hands postCreateCommand to `sh -c` unquoted, which
# breaks anything with arguments and `&&`.
set -euo pipefail

cd "$(dirname "$0")/.."

# node_modules and .venv are Docker volumes (devcontainer.json "mounts"), created owned by root.
sudo chown node:node .venv node_modules api-gateway/node_modules e2e/node_modules web/node_modules

# Zed's terminal starts in / (its remote server's working directory); start in the clone instead.
# Shells that already start somewhere else (VS Code's, in the clone) are left where they are.
marker="# guide: start in the clone"
grep -qF "$marker" ~/.bashrc 2>/dev/null ||
  printf '\n%s\n[ "$PWD" = / ] && cd %q\n' "$marker" "$PWD" >>~/.bashrc

# No --with-deps: the Dockerfile already installs Chromium's and MongoDB's system libraries.
exec ./setup.sh
