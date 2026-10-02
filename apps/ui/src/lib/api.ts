// Tiny typed fetch wrapper for the Worker API.
//
// Same-origin via the UI Worker service binding (see src/worker.ts):
//   browser -> /api/* -> API Worker (prefix stripped).
// Local dev uses the Vite proxy in vite.config.ts (same /api shape).
//
// Env (baked at `vite build` time):
//   VITE_APP_ENV  development | staging | production  (UI badge)
//
// Authenticated calls take the JWT from `getAccessToken()` (see `useLogto()`),
// which is a token for VITE_LOGTO_API_RESOURCE.

export const APP_ENV: string =
  import.meta.env.VITE_APP_ENV ?? "development";

export const API_BASE = "/api"
