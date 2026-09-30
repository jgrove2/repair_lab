# api — Repair Lab Worker

Hono router on Cloudflare Workers + D1 (SQLite) + R2 (photos). Dummy data only.

## Run

```bash
pnpm install
pnpm --filter api dev            # wrangler dev --env dev on :8787
pnpm --filter api dev:prod       # wrangler dev --env production on :8788 (prod bindings check)
pnpm --filter api seed           # writes apps/api/scripts/seed.sql (dummy rows)
pnpm --filter api typecheck
```

Apply migrations / seed per env:

```bash
# Dev
pnpm --filter api migrate:dev:local
pnpm --filter api migrate:dev:remote
pnpm --filter api seed:dev:local     # after `seed`
# Prod (remote only)
pnpm --filter api migrate:prod:remote
```

Deploy:

```bash
pnpm --filter api deploy:dev    # -> repair-lab-api-dev
pnpm --filter api deploy:prod   # -> repair-lab-api
```

Envs are defined in `wrangler.toml` (`[env.dev]` / `[env.production]`,
separate D1 + R2 + `ENVIRONMENT` var). `GET /health` returns `{ ok, env }`.
Local secrets go in `.dev.vars` (see `.dev.vars.example`); remote secrets via
`wrangler secret put AGENT_SERVICE_TOKEN --env dev|production`.

## Routes

- `GET /health` → `{ ok: true }`
- `/items` — CRUD
- `/tickets` — CRUD + nested `/:id/notes`, `/:id/photos`, `/:id/components`
- `/components`, `/locations`, `/preferences`, `/candidates` — CRUD
- `GET /search?q=` — FTS5 `items_fts` + `components_fts`, bm25, LIMIT 20
- `POST /photos/presign` — **stub**, returns fake `{ key, uploadUrl }`

Auth (`src/middleware/auth.ts`) is a stub checking `x-agent-token`.
TODO: real Cloudflare Access JWT validation via `CF-Authorization` + JWKS.
