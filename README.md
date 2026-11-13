# Guide to Hidden Gems

LMWN Frontend Assignment 2025 — a restaurant guide web app with an API gateway.

| App | Stack | Port |
| --- | --- | --- |
| `web` | React 19, React Router 7 (SPA), CSS Modules, Vitest, oxlint, stylelint | 3000 |
| `api-gateway` | Python 3.14, FastAPI, Pydantic, uv, ruff, pyrefly, pytest | 4000 |

`pnpm dev` in `api-gateway` also starts the provided data server
(guides `:8888`, restaurants `:9999`, images `:7777`).

## Prerequisites

- Node.js ≥ 26 and pnpm
- [uv](https://docs.astral.sh/uv/) (installs Python 3.14 automatically)

## Getting started

```bash
pnpm install
uv sync
pnpm dev        # turbo: data server + gateway + web
```

Open http://localhost:3000. Gateway API docs: http://localhost:4000/docs.

## Common tasks

A husky pre-commit hook (lint-staged) lints with auto-fix and then formats the staged files, and blocks the commit on anything it can't fix.

Tasks run through [Turborepo](https://turbo.build/) and are cached:

```bash
pnpm format:check # oxfmt (web), ruff format (gateway)
pnpm lint         # oxlint + stylelint (web), ruff (gateway)
pnpm type-check   # tsc (web), pyrefly (gateway)
pnpm test         # vitest (web), pytest (gateway)
```
