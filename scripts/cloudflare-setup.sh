#!/usr/bin/env bash
# Repair Lab — Cloudflare setup (copy-paste, do NOT run blindly).
# All IDs / hosts are PLACEHOLDERS. No real credentials here.
set -euo pipefail

# 1. Create the D1 database (run once). Save the returned database_id.
#    Then paste it into apps/api/wrangler.toml (database_id = "...").
wrangler d1 create repair-lab-db

# 2. Create the R2 bucket for ticket photos (run once).
wrangler r2 bucket create repair-lab-photos

# 3. Apply migrations locally, then verify.
wrangler d1 migrations apply repair-lab-db --local
# wrangler d1 execute repair-lab-db --local --command "SELECT name FROM sqlite_master WHERE type='table';"

# 4. Seed dummy data locally (generates apps/api/scripts/seed.sql first).
# pnpm --filter api seed
# wrangler d1 execute repair-lab-db --local --file ./apps/api/scripts/seed.sql

# 5. Apply migrations to the remote DB.
wrangler d1 migrations apply repair-lab-db --remote

# 6. (Optional) Seed remote with dummy data only.
# wrangler d1 execute repair-lab-db --remote --file ./apps/api/scripts/seed.sql

# 7. Set the agent service-token secret (placeholder value shown).
#    The Worker reads it as AGENT_SERVICE_TOKEN; the stub auth checks x-agent-token.
# wrangler secret put AGENT_SERVICE_TOKEN
#    (paste PLACEHOLDER_AGENT_TOKEN when prompted; rotate before any real use)

# 8. Dev loop.
# pnpm --filter api dev   # Worker on :8787
# pnpm --filter web dev   # Vite on :5173, proxies /api -> :8787

# 9. Create + deploy the Pages frontend (run once for project, then deploy).
# wrangler pages project create repair-lab-web --production-branch main
# pnpm --filter web build
# wrangler pages deploy apps/web/dist --project-name repair-lab-web

# 10. Deploy the Worker API.
# wrangler deploy --config apps/api/wrangler.toml
