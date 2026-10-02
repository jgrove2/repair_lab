// Tiny typed fetch wrapper for the Worker API.
//
// Same-origin via the UI Worker service binding (see src/worker.ts):
//   browser -> /api/* -> API Worker (prefix stripped).
// Local dev uses the Vite proxy in vite.config.ts (same /api shape).
//
// Env (baked at `vite build` time):
//   VITE_APP_ENV  development | staging | production  (UI badge)

export const APP_ENV: string =
  import.meta.env.VITE_APP_ENV ?? "development";

export const API_BASE = "/api"

export async function getHealth(): Promise<{ ok: boolean; env: string }> {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error(`GET /health failed: ${res.status}`)
  return res.json()
}
