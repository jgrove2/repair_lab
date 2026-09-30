#!/usr/bin/env bash
# Repair Lab — Cloudflare setup for DEV + PROD (copy-paste, do NOT run blindly).
# All IDs / hosts are PLACEHOLDERS. No real credentials here.
set -euo pipefail

# Convention in this repo:
#   DEV   Worker repair-lab-api-dev  + D1 repair-lab-db-dev  + R2 repair-lab-photos-dev  + Pages repair-lab-web-dev
#   PROD  Worker repair-lab-api      + D1 repair-lab-db      + R2 repair-lab-photos      + Pages repair-lab-web
# Wrangler envs live in apps/api/wrangler.toml ([env.dev] / [env.production]).
# Top-level wrangler config = prod defaults; pass --env dev for dev.

# ── 1. Create D1 databases (run once each). Save the returned database_ids ──
#    into apps/api/wrangler.toml (PLACEHOLDER_D1_DEV_ID / PLACEHOLDER_D1_PROD_ID).
wrangler d1 create repair-lab-db-dev
wrangler d1 create repair-lab-db

# ── 2. Create R2 buckets for ticket photos (run once each) ──
wrangler r2 bucket create repair-lab-photos-dev
wrangler r2 bucket create repair-lab-photos

# ── 3. Apply migrations ──
# Dev: local preview + remote dev DB
wrangler d1 migrations apply repair-lab-db-dev --env dev --local
wrangler d1 migrations apply repair-lab-db-dev --env dev --remote
# Prod: remote only (never --local for prod)
wrangler d1 migrations apply repair-lab-db --env production --remote

# ── 4. Seed DUMMY data (generates apps/api/scripts/seed.sql first) ──
# pnpm --filter api seed
# Dev local + remote dev (safe for dummy data):
# wrangler d1 execute repair-lab-db-dev --env dev --local --file ./apps/api/scripts/seed.sql
# wrangler d1 execute repair-lab-db-dev --env dev --remote --file ./apps/api/scripts/seed.sql
# Prod remote — dummy data only, think twice before seeding prod:
# wrangler d1 execute repair-lab-db --env production --remote --file ./apps/api/scripts/seed.sql

# ── 5. Agent service-token secrets (one per env, values never in git) ──
# wrangler secret put AGENT_SERVICE_TOKEN --env dev
#    (paste dev-only placeholder when prompted)
# wrangler secret put AGENT_SERVICE_TOKEN --env production
#    (paste a rotated prod value; different from dev)

# ── 6. Dev loop ──
# pnpm --filter api dev   # Worker --env dev on :8787 (+ reads apps/api/.dev.vars locally)
# pnpm --filter web dev   # Vite on :5173, proxies /api -> :8787 (see apps/web/.env.development)

# ── 7. Deploy the API ──
# pnpm --filter api deploy:dev    # -> repair-lab-api-dev
# pnpm --filter api deploy:prod   # -> repair-lab-api (prod)

# ── 8. Deploy the frontends (two Pages projects for full isolation) ──
# Dev Pages (points at dev Worker via apps/web/.env.staging):
# wrangler pages project create repair-lab-web-dev --production-branch main
# pnpm --filter web deploy:dev
# Prod Pages (points at prod Worker via apps/web/.env.production):
# wrangler pages project create repair-lab-web --production-branch main
# pnpm --filter web deploy:prod
#
# Alternative: a single Pages project with preview deployments per branch.
# This repo uses two projects so dev/prod data + API URLs can never mix.

# ── 9. Verify env isolation ──
# curl https://repair-lab-api-dev.PLACEHOLDER_ACCOUNT.workers.dev/health
#   -> {"ok":true,"env":"development"}
# curl https://repair-lab-api.PLACEHOLDER_ACCOUNT.workers.dev/health
#   -> {"ok":true,"env":"production"}
# The web UI shows a development/staging/production badge (VITE_APP_ENV).
