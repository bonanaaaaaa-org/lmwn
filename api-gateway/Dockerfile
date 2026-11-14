# The API gateway: the Cloud Run service's ingress container (infra/run.tf).
#
# Build from the repository root, so the uv workspace and its lockfile are available:
#   docker build -f api-gateway/Dockerfile -t api-gateway .
#
# Listens on $PORT (Cloud Run sets it; 8080 otherwise). Settings come from environment variables
# (app/settings.py).

ARG PYTHON_VERSION=3.14
ARG UV_VERSION=0.12.21

FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

FROM python:${PYTHON_VERSION}-slim AS build
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /repo
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PYTHON=/usr/local/bin/python3
# Dependencies first (cached while only app code changes), then the gateway itself, installed
# into the virtualenv rather than linked to the source tree.
COPY pyproject.toml uv.lock .python-version ./
COPY api-gateway/pyproject.toml api-gateway/README.md api-gateway/
RUN uv sync --frozen --no-dev --package api-gateway --no-install-workspace
COPY api-gateway/app api-gateway/app
RUN uv sync --frozen --no-dev --package api-gateway --no-editable

FROM python:${PYTHON_VERSION}-slim
COPY --from=build /repo/.venv /repo/.venv
ENV PATH=/repo/.venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PORT=8080
USER nobody
EXPOSE 8080
# sh expands $PORT; exec hands uvicorn the process, so it receives SIGTERM directly.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"$PORT\" --no-server-header"]
