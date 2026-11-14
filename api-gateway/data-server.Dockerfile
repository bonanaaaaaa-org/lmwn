# The provided data server (lmwn-assignment-2025-server), run as the Cloud Run service's sidecar
# (infra/run.tf). It listens on :8888 (guides), :9999 (restaurants) and :7777 (images), which the
# gateway reaches on localhost.
#
# Build from the repository root, so the pnpm workspace and its lockfile pin the server's version:
#   docker build -f api-gateway/data-server.Dockerfile -t data-server .
#
# The server keeps its data in an in-memory MongoDB (mongodb-memory-server). Its mongod binary is
# downloaded here, at build time, into MONGOMS_DOWNLOAD_DIR, so a cold start never downloads it.

ARG NODE_VERSION=26.13.1

FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /repo
ENV MONGOMS_DOWNLOAD_DIR=/opt/mongodb-binaries
# Every workspace manifest, so the frozen lockfile matches; only api-gateway's production
# dependencies (the data server) are installed.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# The pnpm the repository pins (packageManager); Node 25+ no longer ships corepack.
RUN npm install --global --no-fund --no-audit "$(node -p 'require("./package.json").packageManager')"
COPY api-gateway/package.json api-gateway/
COPY web/package.json web/
COPY e2e/package.json e2e/
# Installs the server with its build scripts (allowBuilds: sharp, mongodb-memory-server, whose
# postinstall downloads mongod into MONGOMS_DOWNLOAD_DIR).
RUN pnpm --filter api-gateway deploy --prod /app \
    && test -n "$(find /opt/mongodb-binaries -name 'mongod*' -type f)"

FROM node:${NODE_VERSION}-bookworm-slim
# mongod links against libcurl and OpenSSL 3.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    MONGOMS_DOWNLOAD_DIR=/opt/mongodb-binaries \
    MONGOMS_DISABLE_POSTINSTALL=1
COPY --from=build /opt/mongodb-binaries /opt/mongodb-binaries
COPY --from=build --chown=node:node /app /app
WORKDIR /app
# mongod writes its data files under the OS temp dir (in memory on Cloud Run).
USER node
EXPOSE 8888 9999 7777
CMD ["node", "node_modules/lmwn-assignment-2025-server/main.js"]
