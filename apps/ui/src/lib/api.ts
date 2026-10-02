import { useCallback } from "react";
import { useLogto } from "@logto/react";
import { API_RESOURCE } from "./logto";

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

// Authenticated fetch bound to the current Logto session. getAccessToken() is
// called with API_RESOURCE so Logto issues a JWT scoped to our API (aud =
// VITE_LOGTO_API_RESOURCE), matching LOGTO_API_RESOURCE on the API Worker. A
// no-arg call returns Logto's opaque userinfo token, which the API's jwtVerify
// rejects with 401 ("Invalid Compact JWS").
export function useApi() {
  const { getAccessToken } = useLogto();
  const fetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getAccessToken(API_RESOURCE || undefined);
      return apiFetch(path, init, token);
    },
    [getAccessToken],
  );
  return { fetch };
}