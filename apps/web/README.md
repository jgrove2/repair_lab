# web — Repair Lab UI

Static React app (Vite + TypeScript), deployed to Cloudflare Pages. Dummy data only.

## Run

```bash
pnpm --filter web dev   # Vite on :5173, proxies /api → 127.0.0.1:8787
```

In `src/lib/api.ts`, `MOCK=true` renders placeholder data without a backend.
Set `MOCK=false` to fetch from the live Worker (`/api/*`).

## Routes

- `/` — dashboard summary
- `/inventory` — list items
- `/tickets` — list tickets
- `/tickets/:id` — ticket detail + notes
- `/search` — wired to `/api/search`
- `/preferences` — list preferences
