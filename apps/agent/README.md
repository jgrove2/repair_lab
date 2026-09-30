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
pnpm --filter agent dev   # prints "agent not implemented" and exits
```

## TODO

- [ ] MCP client wiring (eBay browse/search tools)
- [ ] Preference polling loop + `last_run_at` bookkeeping
- [ ] Dedupe on `ebay_item_id` before POST
- [ ] Real auth: Cloudflare Access service token / JWT
