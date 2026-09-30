# UI Scope TODO Tracker

Scoped down on 2026-09-30: UI gutted to **home page only** (`/` → `Dashboard`)
to limit initial scope and testing. Backend (`apps/api`) was left untouched.

Kept:
- `apps/web/src/App.tsx` — nav with Home only + env badge, single `/` route
- `apps/web/src/pages.tsx` — `Dashboard` placeholder only
- `apps/web/src/lib/api.ts` — `APP_ENV` + `MOCK` flags only (used by Dashboard badge)
- `apps/web/src/main.tsx`, `index.css` — unchanged

## Restore stories (vision check required before re-adding)

Each story below was removed in this scope cut. Re-add one at a time,
confirm vision, then check off.

- [ ] **Story: Inventory page** (`/inventory`)
  - Removed: `Inventory()` from `pages.tsx`, nav link, route in `App.tsx`
  - Used: `api.items()` + `mockItems`, `useFetch` hook
  - To restore: re-add component, nav link, route, API wrapper + mock data
  - Test: renders item cards (title, status, category/condition), MOCK + live modes

- [ ] **Story: Tickets list page** (`/tickets`)
  - Removed: `Tickets()` from `pages.tsx`, nav link, route in `App.tsx`
  - Used: `api.tickets()` + `mockTickets`, `Link to /tickets/:id`
  - To restore: re-add component, nav link, route, API wrapper + mock data
  - Test: renders ticket cards with links, MOCK + live modes

- [ ] **Story: Ticket detail page** (`/tickets/:id`)
  - Removed: `apps/web/src/TicketDetail.tsx`, route in `App.tsx`
  - Used: `api.ticket(id)` + `api.ticketNotes(id)`, MOCK fallback ticket + note
  - To restore: re-create `TicketDetail.tsx`, route, API wrappers
  - Test: loads ticket by param, shows notes, handles not-found, MOCK + live modes

- [ ] **Story: Search page** (`/search`)
  - Removed: `apps/web/src/Search.tsx`, nav link, route in `App.tsx`
  - Used: `api.search(q)` → `{ items, components }`, MOCK fallback item
  - To restore: re-create `Search.tsx`, nav link, route, API wrapper
  - Test: query input, item + component result lists, MOCK + live modes

- [ ] **Story: Preferences page** (`/preferences`)
  - Removed: `Preferences()` from `pages.tsx`, nav link, route in `App.tsx`
  - Used: `api.preferences()` + `mockPreferences`
  - To restore: re-add component, nav link, route, API wrapper + mock data
  - Test: renders preference cards (name, search_terms, max_price), MOCK + live modes

- [ ] **Story: API client wrappers** (`apps/web/src/lib/api.ts`)
  - Removed: `api.items, api.item, api.tickets, api.ticket, api.ticketNotes,`
    `api.components, api.preferences, api.candidates, api.search`
    plus `API_BASE`, `get<T>()` helper and `mockItems/mockTickets/mockPreferences`
  - To restore: re-add per-page as each story above is approved (don't bulk-restore)
  - Test: `tsc --noEmit` in `apps/web`, live fetch against dev Worker

## Notes
- Backend endpoints were also scoped down to `GET /health` only on 2026-09-30 —
  see `API_SCOPE_TODOS.md`. UI stories that need APIs list their pair there.
- Shared types in `packages/shared` (`Item, Ticket, Component, Preference, Candidate`) left intact.
