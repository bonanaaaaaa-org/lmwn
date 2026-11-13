---
name: devops
description: Devops skill for the Guide to Hidden Gems repo. Owns the pnpm + Turborepo workspace, the uv workspace, build/lint/test tooling config (Vite, React Router, Vitest, oxlint, Stylelint, ruff, pyrefly, pytest), dependency and lockfile hygiene, local dev orchestration, CI/CD workflows, and Dockerfiles if added.
---

This assignment runs locally and has no cloud infrastructure; the skill covers the workspace tooling, local dev, and CI/Docker if they are added.

Use this skill when changing workspace or tooling configuration, editing root scripts, adding dependencies across packages, wiring local dev, adding CI workflows, or adding Dockerfiles.

---

## Scope

| Area | Paths |
|---|---|
| **Workspace** | `package.json`, `pnpm-workspace.yaml` (packages + `allowBuilds`), `pnpm-lock.yaml`, `turbo.json`, `*/turbo.json` |
| **Python workspace** | `pyproject.toml` (uv workspace), `.python-version`, `uv.lock` |
| **Web tooling** | `web/vite.config.ts`, `web/react-router.config.ts`, `web/vitest.config.ts`, `web/vitest.setup.tsx`, `web/tsconfig.json`, `web/.oxlintrc.json`, `web/stylelint.config.mjs`, `web/stylelint-plugins/` |
| **Gateway tooling** | `[tool.ruff]`, `[tool.pyrefly]`, `[tool.pytest.ini_options]`, `[tool.coverage]` in `api-gateway/pyproject.toml`; `api-gateway/package.json` scripts |
| **Local dev** | Root `pnpm dev` (turbo) → `api-gateway` dev (uvicorn :4000 + the provided data server :8888/:9999/:7777) and `web` dev (:3000); `.claude/launch.json` |
| **CI/CD** | `.github/workflows/*.yml` (if added) |
| **Runtime** | Dockerfiles next to their app (if added) |
| **Git hooks** | `.husky/pre-commit` → `lint-staged.config.mjs` (lint with auto-fix, then format, staged files only); installed by the root `prepare` script |
| **Repo hygiene** | `.gitignore`, `.env.example` files, README "Getting started" / "Common tasks" |

---

## MANDATORY: Verification Before Completion

Every task MUST end with the verification gates relevant to the files you touched.

### Any workspace or tooling change

```bash
pnpm install --frozen-lockfile   # lockfile matches package.json files
uv sync --frozen                 # uv.lock matches pyproject.toml files
pnpm lint
pnpm format:check
pnpm type-check
pnpm test
pnpm build
```

Run the same commands a second time and confirm turbo reports cache hits (`FULL TURBO`) without `no output files found` warnings — a miss on an unchanged tree means `inputs`/`outputs` are wrong.

### Local dev orchestration (scripts, ports, launch config)

```bash
pnpm dev
curl -s localhost:4000/health            # {"status":"ok"}
curl -s localhost:8888/guides            # data server
curl -s -o /dev/null -w "%{http_code}" localhost:3000/   # 200
```

### Lint/format rule changes

Prove the rule bites: add a throwaway violating file, confirm the linter reports it, delete the file. (The original `"../"` relative-import pattern silently matched nothing — this is how it was caught.)

### GitHub Actions (any `.github/workflows/` change)

```bash
actionlint .github/workflows/*.yml 2>/dev/null || echo "actionlint not installed — rely on CI"
```

### Docker (any `Dockerfile` change)

```bash
docker build -f api-gateway/Dockerfile -t api-gateway:verify .
```

**Do NOT skip these.** Fix every failure before marking work done; report any gate you could not run, and why.

---

## Workspace Conventions

### pnpm + Turborepo

- Packages are listed explicitly in `pnpm-workspace.yaml` (`api-gateway`, `web`) — the repo keeps the assignment's top-level shape, no `apps/` folder
- Root scripts call `turbo run <task>`; package scripts do the work. Never chain packages with `&&` in root scripts
- Root `turbo.json` holds defaults (`dev` is `persistent` and uncached; `test` outputs `coverage/**`); per-package `turbo.json` files `extends: ["//"]` and override `inputs`/`outputs`
- `api-gateway/turbo.json` hashes only `app/**/*.py`, `tests/**/*.py` and `pyproject.toml` so Python tasks don't rerun on unrelated changes
- `web` runs `gen:css-types` as a turbo dependency of `type-check`
- Build scripts of dependencies are opt-in via `allowBuilds` in `pnpm-workspace.yaml` (the data server needs `mongodb-memory-server` and `sharp`; `msw` is explicitly `false`)
- `api-gateway/package.json` is the turbo entry point for the Python app: it wraps `uv run …` and its `dev` script starts uvicorn and the provided `lmwn-assignment-2025-server` together with `run-p`

### uv

- Root `pyproject.toml` declares the uv workspace (`members = ["api-gateway"]`); there is one `.venv` and one `uv.lock` at the repo root
- `.python-version` pins 3.14; pyrefly points at `../.venv/bin/python3`
- Add Python deps with `uv add --package api-gateway <pkg>` (dev deps: `--group dev`) — never edit `uv.lock` by hand

### Dependencies

- Commit `pnpm-lock.yaml` and `uv.lock`; CI installs with `--frozen-lockfile` / `--frozen`
- Keep shared tool versions aligned across packages; prefer exact or caret ranges consistent with the rest of the file
- Load nothing from a CDN at runtime

---

## CI/CD Conventions

- Workflows live in `.github/workflows/` — kebab-case filenames matching their purpose. `ci.yml` (job **Verify**) runs format check, lint, type-check, test and build through turbo on every PR, push to main and by hand
- `auto-assign.yml` assigns new issues and PRs to the maintainer when nobody is assigned; it uses `pull_request_target` so fork PRs work too, and must never check out or run PR code
- Jobs run on GitHub-hosted runners (`runs-on: ubuntu-24.04`); setup actions install Node, pnpm and uv on top of the image
- Node comes from `.nvmrc`, pnpm from `packageManager`, Python from `.python-version`; `MONGOMS_DISABLE_POSTINSTALL=1` skips the data server's MongoDB download where `pnpm dev` isn't run
- Pin actions by full commit SHA (with a version comment), never by `@main`
- Least-privilege `permissions:` (default `contents: read`), `timeout-minutes` on every job, `concurrency` to cancel superseded runs
- Use `pnpm/action-setup` + `actions/setup-node` (pnpm cache) and `astral-sh/setup-uv` (uv cache, keyed on `uv.lock`)
- E2E only where a browser and the data server can run
- Secrets only via `${{ secrets.* }}` — never echo them, never commit them

---

## Runtime (Docker, if added)

- Dockerfiles live next to their app (e.g. `api-gateway/Dockerfile`), built from the repo root so the uv workspace and lockfile are available
- Multi-stage builds: builder stage for deps (`uv sync --frozen --no-dev --package api-gateway`), slim final stage for runtime
- Non-root user in the final stage
- Read the port from env; do not hardcode it
- `.dockerignore` excludes `node_modules`, `.venv`, caches and build output

---

## Environment and Secrets

- Gateway config: env vars read by `api-gateway/app/settings.py` (`GUIDE_SERVICE_URL`, `RESTAURANT_SERVICE_URL`, `UPSTREAM_TIMEOUT_SECONDS`, `CORS_ALLOWED_ORIGINS`)
- Web config: `VITE_*` vars (`VITE_API_BASE_URL`), documented in `web/.env.example`; turbo `globalEnv` includes `VITE_*` so builds re-hash when they change
- `.env` files stay git-ignored; every new variable gets an `.env.example` entry and a README line

---

## FORBIDDEN

- Hardcoded secrets, credentials or environment-specific URLs in committed config
- Weakening lint/type/test gates to get green (lowering the coverage floor, disabling a rule, `--no-verify`) without an explicit, commented reason
- Editing lockfiles by hand, or committing `package.json`/`pyproject.toml` changes without the matching lockfile
- Root scripts that bypass turbo for workspace tasks
- Running servers with ad hoc background shell commands when a launch configuration exists
- Disabling an existing required CI check
- Deploying or creating cloud resources without explicit user authorization — prepare configuration, don't provision

---

## Adding a New Package

1. Create the folder at the repo root and add it to `pnpm-workspace.yaml` (and to `[tool.uv.workspace].members` if it is Python)
2. Give it `package.json` scripts named like the existing ones (`dev`, `build`, `lint`, `format:check`, `type-check`, `test`) so turbo picks them up
3. Add a `turbo.json` with `extends: ["//"]` and accurate `inputs`/`outputs`
4. Update the root README table and "Common tasks"
5. Run the workspace verification gates (twice, for cache hits)

## Adding a New Workflow

1. Create `.github/workflows/<name>.yml`
2. Pin all actions by SHA, set `permissions`, `timeout-minutes` and `concurrency`
3. Run the same root scripts developers run — no CI-only commands
4. Validate with `actionlint` before pushing
