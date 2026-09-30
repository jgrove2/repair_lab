# api — Repair Lab Worker

Hono router on Cloudflare Workers + D1 (SQLite) + R2 (photos). Dummy data only.

## Run

```bash
pnpm install
pnpm --filter api dev      # wrangler dev on :8787
pnpm --filter api seed     # writes apps/api/scripts/seed.sql (dummy rows)
pnpm --filter api typecheck
```

Apply migrations / seed to local D1:

```bash
wrangler d1 migrations apply repair-lab-db --local
wrangler d1 execute repair-lab-db --local --file ./scripts/seed.sql
```

## Routes

- `GET /health` → `{ ok: true }`
- `/items` — CRUD
- `/tickets` — CRUD + nested `/:id/notes`, `/:id/photos`, `/:id/components`
- `/components`, `/locations`, `/preferences`, `/candidates` — CRUD
- `GET /search?q=` — FTS5 `items_fts` + `components_fts`, bm25, LIMIT 20
- `POST /photos/presign` — **stub**, returns fake `{ key, uploadUrl }`

Auth (`src/middleware/auth.ts`) is a stub checking `x-agent-token`.
TODO: real Cloudflare Access JWT validation via `CF-Authorization` + JWKS.
