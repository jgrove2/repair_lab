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

## Previews (prod + preview isolation)

Top-level `wrangler.toml` = production (`repair-lab-db` + `repair-lab-photos`).
The `[previews.*]` Base block binds **every** branch Preview (`npx wrangler
preview`) to dev resources (`repair-lab-db-dev` + `repair-lab-photos-dev`).

WHY: Previews do not inherit production settings, and D1/R2 are
account-level resources — two Previews sharing the same `database_id` /
`bucket_name` share the same rows/objects. If previews were bound to prod,
a preview would read and write production data (test tickets clobbering real
repair jobs, dummy uploads polluting prod photos). Dev bindings keep all
preview writes off production. Requires `wrangler >= 4.135.0`
(`pnpm add -D wrangler@latest` in `apps/api`); syntax verified 2026-09-30
against <https://developers.cloudflare.com/workers/previews/configuration/>.
Preview secrets are set via `wrangler preview base-config secret put ...`,
never committed.

## Routes

Scoped down to home page only (2026-09-30) — see `API_SCOPE_TODOS.md`.

- `GET /health` → `{ ok: true, env }` (only live route; verifies backend env)
