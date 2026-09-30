# agent (STUB ONLY)

Future home-lab process for sourcing. **Not implemented.** No real eBay / MCP logic.

## Intended design

1. Runs on a home lab (not on Cloudflare).
2. Reads sourcing `preferences` from the Worker API over HTTPS:
   `GET https://PLACEHOLDER_API_HOST/preferences` with `x-agent-token` header
   (until real Cloudflare Access JWT validation lands).
3. Drives the eBay MCP via an MCP client to search for matching listings.
4. POSTs results back as `candidates` for human review:
   `POST https://PLACEHOLDER_API_HOST/candidates`.

## Run

```bash
# Dev — talks to local wrangler dev (:8787, --env dev)
APP_ENV=development REPAIR_LAB_API_URL=http://127.0.0.1:8787 pnpm --filter agent dev

# Prod — talks to the deployed prod Worker (fill real host + token)
APP_ENV=production REPAIR_LAB_API_URL=https://repair-lab-api.PLACEHOLDER_ACCOUNT.workers.dev \
  AGENT_SERVICE_TOKEN=<prod-secret> pnpm --filter agent dev
```

See `.env.example`. One token per API env
(`wrangler secret put AGENT_SERVICE_TOKEN --env dev|--env production`).

## TODO

- [ ] MCP client wiring (eBay browse/search tools)
- [ ] Preference polling loop + `last_run_at` bookkeeping
- [ ] Dedupe on `ebay_item_id` before POST
- [ ] Real auth: Cloudflare Access service token / JWT
