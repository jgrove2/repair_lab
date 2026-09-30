// Sourcing agent — STUB ONLY. No real eBay / MCP logic.
// TODO: implement home-lab loop (read preferences → eBay MCP → POST candidates).
//
// Env (see .env.example):
//   REPAIR_LAB_API_URL   e.g. http://127.0.0.1:8787 (dev Worker) or
//                        https://repair-lab-api-dev.… (deployed dev) / prod URL
//   AGENT_SERVICE_TOKEN  must match the Worker's secret for that env
//                        (wrangler secret put AGENT_SERVICE_TOKEN --env dev|production)
const API_URL = process.env.REPAIR_LAB_API_URL ?? "http://127.0.0.1:8787";
const TOKEN = process.env.AGENT_SERVICE_TOKEN ?? "dev-only-placeholder-token";
const APP_ENV = process.env.APP_ENV ?? "development";

async function healthCheck(): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/health`, {
      headers: { "x-agent-token": TOKEN },
    });
    console.log(`[agent:${APP_ENV}] GET ${API_URL}/health -> ${res.status}`);
  } catch (err) {
    console.log(
      `[agent:${APP_ENV}] health check skipped (API not reachable at ${API_URL}):`,
      (err as Error).message,
    );
  }
}

function main(): void {
  console.log(`agent stub [env=${APP_ENV}] api=${API_URL}`);
  void healthCheck().finally(() => process.exit(0));
}

main();
