// Tiny typed fetch wrapper for the Worker API.
//
// Env (baked at `vite build` time, see .env.development/.env.staging/.env.production):
//   VITE_APP_ENV  development | staging | production  (UI badge)
//   VITE_API_BASE /api (local proxy) or https://<worker-host> (Pages)
//   VITE_MOCK     true = placeholder data, no backend needed
//
// NOTE: Scoped down to home page only (2026-09-30). All endpoint wrappers
// and mock data were removed — see UI_SCOPE_TODOS.md for restore stories.
// Only env flags are kept because Dashboard uses them for the env badge.

export const APP_ENV: string =
  import.meta.env.VITE_APP_ENV ?? "development";

export const MOCK: boolean =
  (import.meta.env.VITE_MOCK ?? "true") !== "false";
