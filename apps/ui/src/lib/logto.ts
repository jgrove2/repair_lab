// Central Logto configuration for the UI.
//
// Env (baked at `vite build` time):
//   VITE_LOGTO_ENDPOINT  e.g. https://your-tenant.logto.app
//   VITE_LOGTO_APP_ID    SPA application ID from Logto Console
//
// Logto Console setup (SPA):
//   - Redirect URI:             http://localhost:5173/callback (+ prod URL + /callback)
//   - Post sign-out redirect:   http://localhost:5173/ (+ prod URL + /)
//
// Scopes: openid + offline_access (reserved) plus profile + email so we can
// render the user's avatar, name, and email in the top nav.

import type { LogtoConfig } from "@logto/react";

export const LOGTO_ENDPOINT: string =
  import.meta.env.VITE_LOGTO_ENDPOINT ?? "";

export const LOGTO_APP_ID: string = import.meta.env.VITE_LOGTO_APP_ID ?? "";

// Request avatar/name (profile) and email address.
export const LOGTO_SCOPES = ["openid", "offline_access", "profile", "email"];

export const LOGTO_REDIRECT_URI =
  typeof window !== "undefined" ? `${window.location.origin}/callback` : "/callback";

export const LOGTO_POST_SIGN_OUT_REDIRECT =
  typeof window !== "undefined" ? `${window.location.origin}/` : "/";

export const isLogtoConfigured = Boolean(LOGTO_ENDPOINT && LOGTO_APP_ID);

export const logtoConfig: LogtoConfig = {
  endpoint: LOGTO_ENDPOINT,
  appId: LOGTO_APP_ID,
  scopes: LOGTO_SCOPES,
};
