import { useLogto } from "@logto/react";

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

export const API_BASE = "/api";

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return res;
}

// Authenticated fetch bound to the current Logto session. The access token is
// a JWT for VITE_LOGTO_API_RESOURCE; requests fail with 401 if that resource
// is missing from the Logto `resources` config.
export function useApi() {
  const { getAccessToken } = useLogto();
  return {
    fetch: async (path: string, init?: RequestInit) => {
      const token = await getAccessToken();
      return apiFetch(path, init, token);
    },
  };
}