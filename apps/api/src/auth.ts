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

/**
 * Did verification fail because the caller's token is bad, or because we could
 * not reach the identity provider to check it?
 *
 * In jose 6, reaching the JWKS endpoint but not finding a usable key throws
 * `ERR_JWKS_NO_MATCHING_KEY`, which is a genuine token problem. Failures of the
 * fetch itself surface as `ERR_JWKS_TIMEOUT` (jose maps aborts to this), a
 * non-200 or unparseable response as a generic `ERR_JOSE_GENERIC`, and a
 * transport-level rejection as a `TypeError`. Those are all "we could not ask",
 * which is our outage, not the caller's.
 */
function isJwksUnavailable(err: unknown): boolean {
  if (err instanceof TypeError) {
    return true;
  }
  const code = (err as { code?: unknown } | null)?.code;
  return code === "ERR_JWKS_TIMEOUT" || code === "ERR_JOSE_GENERIC";
}

function extractBearerToken(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ? match[1].trim() : null;
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

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, getJwks(endpoint), {
        issuer: `${normalizeEndpoint(endpoint)}/oidc`,
        audience: resource,
      }));
    } catch (err) {
      // A key fetch that never completes is an unavailable identity provider,
      // not a bad token. Reporting that as 401 would make an upstream outage
      // look like a wave of invalid credentials.
      if (isJwksUnavailable(err)) {
        console.error("logto: JWKS unavailable", err);
        return c.json(
          {
            error: "auth_service_unavailable",
            message: "Unable to verify credentials. Try again shortly.",
          },
          503,
        );
      }

      console.warn("logto: token verification failed", err);
      return c.json(
        { error: "invalid_token", message: "Token verification failed." },
        401,
      );
    }

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

    // Outside the try/catch above: a throwing handler is an application error
    // and must not be reported as an authentication failure.
    await next();
  };
}
