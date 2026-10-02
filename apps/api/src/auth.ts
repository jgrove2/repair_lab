import type { Context, MiddlewareHandler } from "hono";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Bindings } from "./bindings.js";

export type AuthInfo = {
  sub: string;
  clientId?: string;
  scopes: string[];
  audience: string[];
  payload: JWTPayload;
};

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthInfo;
  }
}

// Cache one JWKS client per Logto endpoint per isolate. createRemoteJWKSet
// already caches keys internally, so this just avoids rebuilding clients.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

function getJwks(base: string): ReturnType<typeof createRemoteJWKSet> {
  const cached = jwksCache.get(base);
  if (cached) {
    return cached;
  }
  const jwks = createRemoteJWKSet(new URL(`${base}/oidc/jwks`));
  jwksCache.set(base, jwks);
  return jwks;
}

function extractBearerToken(header: string | null): string | null {
  if (!header) {
    return null;
  }
  return header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
}

function authError(
  c: Context<{ Bindings: Bindings }>,
  status: 401 | 500,
  error: string,
  message: string,
): Response {
  return c.json({ error, message }, status);
}

/**
 * Authenticate a request as a Logto-issued JWT access token and stash its
 * claims on the context as `auth`.
 *
 * This establishes authentication only: the token's signature, issuer, and
 * audience are verified. It grants no permission to perform any particular
 * operation. Protected routes must additionally check the scopes/permissions
 * relevant to what they do.
 *
 * Prerequisites (Logto Console):
 *   1. Register an API resource, e.g. `https://api.yourapp.com`.
 *   2. Set `LOGTO_ENDPOINT` (tenant, e.g. `https://your-tenant.logto.app`) and
 *      `LOGTO_API_RESOURCE` (the API identifier from step 1) as Worker vars.
 *      These are per-environment identifiers; production must not reuse the
 *      dev resource, or a dev token would be accepted here.
 *   3. The SPA must request that resource in its `resources` config so
 *      `getAccessToken()` returns a JWT with the expected audience
 *      (see `apps/ui/src/lib/logto.ts`).
 */
export function requireLogtoAuth(): MiddlewareHandler<{
  Bindings: Bindings;
}> {
  return async (c, next) => {
    const endpoint = c.env.LOGTO_ENDPOINT?.trim();
    const resource = c.env.LOGTO_API_RESOURCE?.trim();

    if (!endpoint || !resource) {
      return authError(
        c,
        500,
        "server_misconfigured",
        "LOGTO_ENDPOINT / LOGTO_API_RESOURCE are not set on this Worker.",
      );
    }

    const token = extractBearerToken(c.req.header("authorization") ?? null);
    if (!token) {
      return authError(
        c,
        401,
        "missing_token",
        "Expected Authorization: Bearer <access_token>.",
      );
    }

    const base = normalizeEndpoint(endpoint);

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, getJwks(base), {
        issuer: `${base}/oidc`,
        audience: resource,
      }));
    } catch (err) {
      console.warn("logto: token verification failed", err);
      return authError(c, 401, "invalid_token", "Token verification failed.");
    }

    if (!payload.sub) {
      return authError(c, 401, "invalid_token", "Missing sub claim.");
    }

    const scopes =
      typeof payload.scope === "string" && payload.scope.length > 0
        ? payload.scope.split(" ")
        : [];
    const audience = Array.isArray(payload.aud)
      ? payload.aud
      : typeof payload.aud === "string"
        ? [payload.aud]
        : [];

    c.set("auth", {
      sub: payload.sub,
      clientId:
        typeof payload.client_id === "string" ? payload.client_id : undefined,
      scopes,
      audience,
      payload,
    });

    await next();
  };
}