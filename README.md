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

# Terminal 1 — API (wrangler dev on :8787)
pnpm --filter api dev

# Terminal 2 — Web (Vite on :5173, proxies /api → :8787)
pnpm --filter web dev

# Seed DUMMY data (prints SQL + counts; apply via wrangler d1 execute)
pnpm --filter api seed
```

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
