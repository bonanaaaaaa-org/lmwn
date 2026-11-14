# api-gateway

FastAPI gateway that aggregates the guide (`:8888`) and restaurant (`:9999`)
services for the web app. Validation is done with Pydantic; dependencies are
managed with [uv](https://docs.astral.sh/uv/).

```bash
uv sync                 # from the repo root (uv workspace)
pnpm --filter api-gateway dev         # http://localhost:4000 (docs at /docs)
pnpm --filter api-gateway lint        # ruff
pnpm --filter api-gateway type-check  # pyrefly
pnpm --filter api-gateway test        # pytest + coverage
```

Settings come from env vars (see `app/settings.py`), e.g.
`GUIDE_SERVICE_URL`, `RESTAURANT_SERVICE_URL`, `UPSTREAM_TIMEOUT_SECONDS`,
`CACHE_TTL_SECONDS` (default 60: how long a successful upstream read is
served from memory).
