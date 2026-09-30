import type { Context, Next } from "hono";

// TODO: Replace this stub with real Cloudflare Access JWT validation.
// Real implementation should:
//  - Read the `CF-Authorization` (JWT) header, NOT x-agent-token.
//  - Fetch the JWKS from your Access team domain, e.g.
//    https://<team-domain>.cloudflareaccess.com/cdn-cgi/access/certs
//  - Verify signature, aud (policy AUD), iss, and expiry.
// This stub exists so the home-lab agent can hit the Worker over HTTPS
// during local development.
export async function agentAuth(c: Context, next: Next) {
  const token = c.req.header("x-agent-token");
  if (!token) {
    return c.json({ error: "unauthorized" }, 401);
  }
  // In production, compare against a secret + validate Access JWT.
  // For now, any present header passes through.
  await next();
}
