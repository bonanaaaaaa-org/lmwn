# Dev container for VS Code Dev Containers and GitHub Codespaces (devcontainer.json).
# linux/amd64 only: MongoDB has no Linux arm64 build of the version the provided Data Server pins.
#
# Built from the repository root, so the pnpm version comes from package.json (packageManager).
# Node and uv match the repo's pins: NODE_VERSION = .nvmrc, UV_VERSION = api-gateway/Dockerfile.
# Python isn't installed here: `uv sync` (./setup.sh) downloads the one .python-version pins.

ARG NODE_VERSION=26.13.1
ARG UV_VERSION=0.12.21

FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

FROM node:${NODE_VERSION}-bookworm
COPY --from=uv /uv /uvx /usr/local/bin/

# lsof: dev.sh names the process holding a busy port. libcurl4: mongod links against it.
# sudo: lets the node user apt-get install anything else it needs.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4 lsof sudo \
    && rm -rf /var/lib/apt/lists/* \
    && echo 'node ALL=(root) NOPASSWD:ALL' >/etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

# Chromium's system libraries, for the Playwright version pnpm-lock.yaml resolves. They live in the
# image rather than in postCreateCommand so every dev container client gets them: Zed's runs of
# ./setup.sh --with-deps never installed them. ./setup.sh still downloads Chromium itself.
COPY pnpm-lock.yaml /tmp/pnpm-lock.yaml
RUN playwright_version=$(sed -nE "s/^  '@playwright\/test@([^']+)':$/\1/p" /tmp/pnpm-lock.yaml | head -n 1) \
    && test -n "$playwright_version" \
    && npx --yes "playwright@${playwright_version}" install-deps chromium \
    && rm -rf /var/lib/apt/lists/* /root/.npm /tmp/pnpm-lock.yaml

# The pnpm the repository pins (packageManager); Node 25+ no longer ships corepack.
COPY package.json /tmp/package.json
RUN npm install --global --no-fund --no-audit "$(node -p 'require("/tmp/package.json").packageManager')" \
    && rm /tmp/package.json

USER node
