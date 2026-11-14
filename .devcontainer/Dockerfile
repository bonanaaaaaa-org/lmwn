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
# sudo: setup.sh --with-deps installs Chromium's system libraries as the node user.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4 lsof sudo \
    && rm -rf /var/lib/apt/lists/* \
    && echo 'node ALL=(root) NOPASSWD:ALL' >/etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

# The pnpm the repository pins (packageManager); Node 25+ no longer ships corepack.
COPY package.json /tmp/package.json
RUN npm install --global --no-fund --no-audit "$(node -p 'require("/tmp/package.json").packageManager')" \
    && rm /tmp/package.json

USER node
