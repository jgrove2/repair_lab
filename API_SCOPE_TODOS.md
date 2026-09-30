# API Scope TODO Tracker

Scoped down on 2026-09-30: API gutted to **`GET /health` only** to match the
home-page-only UI and limit initial scope/testing. The home page
(`apps/web/src/pages.tsx` Dashboard) is fully static and makes zero API
calls — `/health` is kept so you can verify which backend env the web UI
is pointed at.

Kept:
- `apps/api/src/index.ts` — Hono app with `GET /health` only
- `apps/api/src/bindings.ts` — `Bindings` type (DB, R2, ENVIRONMENT, AGENT_SERVICE_TOKEN)
- `apps/api/migrations/0001_init.sql` — full schema untouched (restore targets)
- `apps/api/scripts/seed.ts` + `seed.sql` — dummy seed data untouched
- `packages/shared` — zod schemas + TS types untouched (restore targets)
- `wrangler.toml`, `.dev.vars.example` — bindings config untouched

Deleted (recoverable via git history):
- `apps/api/src/routes/items.ts` → `GET/POST /items`, `GET/PUT/DELETE /items/:id`
- `apps/api/src/routes/tickets.ts` → `GET/POST /tickets`, `GET/PUT/DELETE /tickets/:id`
- `apps/api/src/routes/tickets.notes.ts` → `GET/POST /tickets/:id/notes`,
  `DELETE /tickets/:id/notes/:noteId`, `GET/POST /tickets/:id/photos`,
  `GET/POST /tickets/:id/components`
- `apps/api/src/routes/components.ts` → CRUD `/components`
- `apps/api/src/routes/locations.ts` → CRUD `/locations`
- `apps/api/src/routes/preferences.ts` → CRUD `/preferences`
- `apps/api/src/routes/candidates.ts` → CRUD `/candidates` (+ `?preference_id` filter)
- `apps/api/src/routes/search.ts` → `GET /search?q=` (FTS5 items + components, bm25)
- `apps/api/src/photo.ts` → `POST /photos/presign` (R2 stub, fake URL)
- `apps/api/src/search.ts` → re-export shim of `routes/search.ts`
- `apps/api/src/db/client.ts` → `listAll` / `getOne` D1 helpers (only used by deleted routes)
- `apps/api/src/middleware/auth.ts` → `agentAuth` stub (defined but never wired up;
  TODO was real Cloudflare Access JWT validation)

## Restore stories (vision check required before re-adding)

Re-add one at a time, confirm vision, then check off. Suggested order
follows the UI stories in `UI_SCOPE_TODOS.md`.

- [ ] **Story: Items API** (`/items` CRUD)
  - Restore: `routes/items.ts` + `db/client.ts`, mount in `index.ts`
  - Pairs with UI story: Inventory page
  - Test: list/get/create/update/delete incl. 404s + 400 on invalid input

- [ ] **Story: Tickets API** (`/tickets` CRUD)
  - Restore: `routes/tickets.ts`, mount in `index.ts`
  - Pairs with UI story: Tickets list page
  - Test: list/get/create/update/delete incl. 404s + 400 on invalid input

- [ ] **Story: Ticket notes/photos/components API** (`/tickets/:id/...`)
  - Restore: `routes/tickets.notes.ts`, mount in `index.ts`
  - Pairs with UI story: Ticket detail page
  - Test: notes CRUD, photo metadata POST, component attach

- [ ] **Story: Search API** (`GET /search?q=`)
  - Restore: `routes/search.ts` (+ `src/search.ts` shim if wanted), mount in `index.ts`
  - Pairs with UI story: Search page
  - Test: empty query → empty lists; FTS5 match + bm25 ranking

- [ ] **Story: Preferences API** (`/preferences` CRUD)
  - Restore: `routes/preferences.ts`, mount in `index.ts`
  - Pairs with UI story: Preferences page
  - Test: list/get/create/update/delete incl. priority ordering

- [ ] **Story: Components + Locations API** (`/components`, `/locations` CRUD)
  - No UI story yet — needs vision check first (no UI page ever consumed locations)
  - Test: CRUD per resource

- [ ] **Story: Candidates + Agent API** (`/candidates` CRUD)
  - No UI story yet — needs vision check first (agent is stub-only)
  - Test: CRUD + `?preference_id` filter

- [ ] **Story: Photo upload API** (`POST /photos/presign` + R2)
  - Was a stub returning a fake URL — needs real design before restoring
  - Test: real presigned PUT URL, web PUT → D1 metadata POST round-trip

- [ ] **Story: Auth** (`middleware/auth.ts`)
  - Was defined but never wired to any route; TODO is real Cloudflare Access
    JWT validation (`CF-Authorization` + JWKS), not `x-agent-token`
  - Decide auth model before restoring any write endpoints
