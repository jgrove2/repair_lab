# web — Repair Lab UI

Static React app (Vite + TypeScript), deployed to Cloudflare Pages. Dummy data only.

## Run

```bash
pnpm --filter web dev          # Vite on :5173, proxies /api → 127.0.0.1:8787 (dev Worker)
pnpm --filter web build:dev    # staging build → talks to DEV Worker URL (.env.staging)
pnpm --filter web build:prod   # production build → talks to PROD Worker URL (.env.production)
pnpm --filter web deploy:dev   # build:dev + Pages deploy to repair-lab-web-dev
pnpm --filter web deploy:prod  # build:prod + Pages deploy to repair-lab-web
```

Env files (placeholders committed, no secrets):

- `.env.development` — `VITE_API_BASE=/api` (Vite proxy), `VITE_MOCK=true`
- `.env.staging` — absolute dev Worker URL, used by `build:dev` / dev Pages
- `.env.production` — absolute prod Worker URL, used by `build` / prod Pages

`VITE_APP_ENV` renders as a badge in the nav so dev/staging/prod are visually
distinct. Set `VITE_MOCK=false` to fetch from the live Worker.

## Routes

- `/` — dashboard summary
- `/inventory` — list items
- `/tickets` — list tickets
- `/tickets/:id` — ticket detail + notes
- `/search` — wired to `/api/search`
- `/preferences` — list preferences
