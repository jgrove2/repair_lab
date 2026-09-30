# Repair Lab

Personal repair / flipping side-hobby tracker. **All data in this repo is DUMMY / placeholder only.**
No real credentials, API keys, or eBay data.

## Architecture (Cloudflare-native)

```
┌─────────────┐      HTTPS       ┌──────────────────┐
│  apps/web   │ ───────────────► │    apps/api      │
│ React+Vite  │   /api/* JSON    │ Hono on Workers  │
│ Pages       │                  │  D1 (SQLite)     │
└─────────────┘                  │  R2 (photos)     │
       ▲                         └──────────────────┘
       │ Cloudflare Access            ▲ HTTPS
       │ (auth in front)              │ x-agent-token (stub)
                                  ┌───┴────────┐
                                  │ apps/agent │
                                  │ home-lab   │
                                  │ STUB ONLY  │
                                  └────────────┘
```

| App | What | Deploy |
|-----|------|--------|
| `apps/api` | Hono Worker router, D1 + R2 bindings, FTS5 search | Cloudflare Workers (`wrangler dev` / `deploy`) |
| `apps/web` | Static React app, react-router, typed fetch wrapper | Cloudflare Pages, proxies `/api` → Worker in dev |
| `apps/agent` | **Stub only.** Future home-lab process: reads preferences from Worker, drives eBay MCP, POSTs candidates back | Home lab (not implemented) |
| `packages/shared` | zod schemas + TS types shared by api, web, agent | npm workspace `@repair-lab/shared` |

## Quickstart

```bash
pnpm install

# Terminal 1 — API dev (wrangler dev --env dev on :8787)
pnpm --filter api dev

# Terminal 2 — Web dev (Vite on :5173, proxies /api → :8787)
pnpm --filter web dev

# Seed DUMMY data (prints SQL + counts; apply via wrangler d1 execute)
pnpm --filter api seed
```

## Environments: dev vs prod

| Layer | Dev | Prod |
|-------|-----|------|
| API Worker | `repair-lab-api-dev` (`wrangler dev --env dev` / `deploy:dev`) | `repair-lab-api` (`--env production` / `deploy:prod`) |
| D1 database | `repair-lab-db-dev` (`PLACEHOLDER_D1_DEV_ID`) | `repair-lab-db` (`PLACEHOLDER_D1_PROD_ID`) |
| R2 bucket | `repair-lab-photos-dev` | `repair-lab-photos` |
| Web (Pages) | `repair-lab-web-dev` — built with `--mode staging` (`.env.staging` → dev Worker URL) | `repair-lab-web` — built with `--mode production` (`.env.production` → prod Worker URL) |
| Secrets | `wrangler secret put AGENT_SERVICE_TOKEN --env dev` + `apps/api/.dev.vars` locally | `wrangler secret put AGENT_SERVICE_TOKEN --env production` (different value) |
| Agent | `APP_ENV=development REPAIR_LAB_API_URL=http://127.0.0.1:8787` | `APP_ENV=production REPAIR_LAB_API_URL=https://repair-lab-api…` |

`GET /health` returns `{ ok, env }` so you can verify which backend you're hitting.
The web UI shows a `development / staging / production` badge from `VITE_APP_ENV`.

Local dev always talks dev: `apps/web/.env.development` uses `VITE_API_BASE=/api`
proxied to the dev Worker. Prod builds bake in the absolute Worker URL.

## Cloudflare setup

See `scripts/cloudflare-setup.sh` for copy-pasteable `wrangler d1 / r2 / pages`
commands. All IDs are `PLACEHOLDER_` values — fill in your own.

## Repo layout

```
apps/api        Worker + migrations/0001_init.sql + seed script
apps/web        Vite + React UI
apps/agent      Stub (README + TODO index.ts)
packages/shared Types + zod schemas
scripts/        cloudflare-setup.sh
```
