import type { MiddlewareHandler } from "hono";
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

function getJwks(endpoint: string): ReturnType<typeof createRemoteJWKSet> {
  const base = normalizeEndpoint(endpoint);
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
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

/**
 * Verify a Logto-issued JWT access token and stash its claims on the context.
 *
 * Prerequisites (Logto Console):
 *   1. Register an API resource, e.g. `https://api.yourapp.com`.
 *   2. Set `LOGTO_ENDPOINT` (tenant, e.g. `https://your-tenant.logto.app`) and
 *      `LOGTO_API_RESOURCE` (the API identifier from step 1) as Worker vars.
 *   3. The SPA must request that resource so `getAccessToken(resource)`
 *      returns a JWT (see `apps/ui/src/lib/logto.ts`).
 */
export function requireLogtoAuth(): MiddlewareHandler<{
  Bindings: Bindings;
}> {
  return async (c, next) => {
    const endpoint = c.env.LOGTO_ENDPOINT?.trim();
    const resource = c.env.LOGTO_API_RESOURCE?.trim();

    if (!endpoint || !resource) {
      return c.json(
        {
          error: "server_misconfigured",
          message:
            "LOGTO_ENDPOINT / LOGTO_API_RESOURCE are not set on this Worker.",
        },
        500,
      );
    }

    const token = extractBearerToken(c.req.header("authorization") ?? null);
    if (!token) {
      return c.json(
        {
          error: "missing_token",
          message: "Expected Authorization: Bearer <access_token>.",
        },
        401,
      );
    }

    try {
      const { payload } = await jwtVerify(
        token,
        getJwks(endpoint),
        {
          issuer: `${normalizeEndpoint(endpoint)}/oidc`,
          audience: resource,
        },
      );

      if (!payload.sub) {
        return c.json({ error: "invalid_token", message: "Missing sub claim." }, 401);
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
    } catch (err) {
      const reason = err instanceof Error ? err.message : "verification failed";
      return c.json(
        { error: "invalid_token", message: `Token verification failed: ${reason}` },
        401,
      );
    }
  };
}
