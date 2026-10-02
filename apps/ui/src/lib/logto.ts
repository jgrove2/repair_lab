// The single Logto configuration for the UI. `LogtoProvider` memoizes the
// client on this object's identity, so it must stay a module-level constant.
//
// Logto Console (SPA application):
//   - Redirect URI:           <origin>/callback
//   - Post sign-out redirect: <origin>/
//
import type { LogtoConfig } from "@logto/react";

const { VITE_LOGTO_ENDPOINT, VITE_LOGTO_APP_ID, VITE_LOGTO_API_RESOURCE } =
  import.meta.env;

// API identifier registered as an API resource in Logto Console. Must match
// LOGTO_API_RESOURCE on the API Worker, which verifies tokens against it. Ask
// for it in `resources` so getAccessToken() returns a JWT (aud = resource)
// rather than an opaque token; without this, login succeeds but every
// authenticated API request fails with 401.
export const API_RESOURCE = VITE_LOGTO_API_RESOURCE ?? "";

export const logtoConfig: LogtoConfig = {
  endpoint: VITE_LOGTO_ENDPOINT ?? "",
  appId: VITE_LOGTO_APP_ID ?? "",
  scopes: ["openid", "offline_access", "profile", "email"],
  resources: API_RESOURCE ? [API_RESOURCE] : [],
};

// Absolute URIs matching the redirect URIs registered in the console above.
export const CALLBACK_URI = `${window.location.origin}/callback`;
export const SIGN_OUT_URI = `${window.location.origin}/`;