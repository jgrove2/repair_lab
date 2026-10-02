import { Hono } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authError,
  extractBearerToken,
  getJwks,
  normalizeEndpoint,
  requireLogtoAuth,
} from "./auth";
import type { Bindings } from "./bindings";

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(),
  jwtVerify: vi.fn(),
}));

const mockedJwtVerify = vi.mocked(jwtVerify);
const mockedCreate = vi.mocked(createRemoteJWKSet);

function makeApp() {
  const app = new Hono<{ Bindings: Bindings }>();
  app.use("/protected", requireLogtoAuth());
  app.get("/protected", (c) => c.json({ auth: c.get("auth") }));
  return app;
}

const env = (overrides: Partial<Bindings> = {}): Bindings => ({
  DB: {} as D1Database,
  R2: {} as R2Bucket,
  LOGTO_ENDPOINT: "https://auth.example.com",
  LOGTO_API_RESOURCE: "https://api.example.com",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("extractBearerToken", () => {
  it("returns null for null header", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractBearerToken("")).toBeNull();
  });

  it("returns null when missing Bearer prefix", () => {
    expect(extractBearerToken("Basic abc")).toBeNull();
  });

  it("extracts a bearer token", () => {
    expect(extractBearerToken("Bearer abc")).toBe("abc");
  });

  it("is case-insensitive", () => {
    expect(extractBearerToken("bearer abc")).toBe("abc");
  });

  it("trims surrounding whitespace", () => {
    expect(extractBearerToken("Bearer   padded  ")).toBe("padded");
  });
});

describe("normalizeEndpoint", () => {
  it("preserves endpoint without trailing slash", () => {
    expect(normalizeEndpoint("https://auth.example.com")).toBe(
      "https://auth.example.com",
    );
  });

  it("removes a single trailing slash", () => {
    expect(normalizeEndpoint("https://auth.example.com/")).toBe(
      "https://auth.example.com",
    );
  });

  it("removes multiple trailing slashes", () => {
    expect(normalizeEndpoint("https://auth.example.com///")).toBe(
      "https://auth.example.com",
    );
  });

  it("preserves the path", () => {
    expect(normalizeEndpoint("https://auth.example.com/tenant")).toBe(
      "https://auth.example.com/tenant",
    );
  });
});

describe("getJwks", () => {
  it("builds a JWKS client once per base and caches it", () => {
    const fake = { fake: true } as unknown as ReturnType<typeof createRemoteJWKSet>;
    mockedCreate.mockReturnValue(fake);

    const first = getJwks("https://auth.example.com");
    const second = getJwks("https://auth.example.com");

    expect(first).toBe(second);
    expect(mockedCreate).toHaveBeenCalledTimes(1);
  });

  it("builds distinct clients for distinct bases", () => {
    mockedCreate.mockReturnValue(
      {} as ReturnType<typeof createRemoteJWKSet>,
    );

    getJwks("https://a.example.com");
    getJwks("https://b.example.com");

    expect(mockedCreate).toHaveBeenCalledTimes(2);
  });
});

describe("authError", () => {
  it("returns a JSON response with status", async () => {
    const app = new Hono<{ Bindings: Bindings }>();
    app.get("/err", (c) => authError(c, 401, "missing_token", "Expected..."));

    const res = await app.request("/err", {}, env());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "missing_token",
      message: "Expected...",
    });
  });
});

describe("requireLogtoAuth", () => {
  it("returns 500 when LOGTO_ENDPOINT is missing", async () => {
    const res = await makeApp().request(
      "/protected",
      { headers: { authorization: "Bearer abc" } },
      env({ LOGTO_ENDPOINT: undefined }),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "server_misconfigured",
      message: "LOGTO_ENDPOINT / LOGTO_API_RESOURCE are not set on this Worker.",
    });
  });

  it("returns 500 when LOGTO_API_RESOURCE is missing", async () => {
    const res = await makeApp().request(
      "/protected",
      { headers: { authorization: "Bearer abc" } },
      env({ LOGTO_API_RESOURCE: undefined }),
    );
    expect(res.status).toBe(500);
  });

  it("returns 401 when authorization header is absent", async () => {
    const res = await makeApp().request("/protected", {}, env());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "missing_token",
      message: "Expected Authorization: Bearer <access_token>.",
    });
  });

  it("returns 401 when verification fails", async () => {
    mockedJwtVerify.mockRejectedValueOnce(new Error("bad signature"));
    const res = await makeApp().request(
      "/protected",
      { headers: { authorization: "Bearer abc" } },
      env(),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "invalid_token",
      message: "Token verification failed.",
    });
  });

  it("returns 401 when sub claim is missing", async () => {
    mockedJwtVerify.mockResolvedValueOnce({
      payload: { aud: "https://api.example.com" },
      protectedHeader: {},
    } as never);
    const res = await makeApp().request(
      "/protected",
      { headers: { authorization: "Bearer abc" } },
      env(),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "invalid_token",
      message: "Missing sub claim.",
    });
  });

  it("parses scope, audience and client_id on success", async () => {
    mockedJwtVerify.mockResolvedValueOnce({
      payload: {
        sub: "user-1",
        scope: "read write",
        aud: ["https://api.example.com", "https://other.example.com"],
        client_id: "client-1",
      },
      protectedHeader: {},
    } as never);

    const res = await makeApp().request(
      "/protected",
      { headers: { authorization: "Bearer abc" } },
      env(),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { auth: { sub: string; scopes: string[]; audience: string[]; clientId: string } };
    expect(body.auth.sub).toBe("user-1");
    expect(body.auth.scopes).toEqual(["read", "write"]);
    expect(body.auth.audience).toEqual([
      "https://api.example.com",
      "https://other.example.com",
    ]);
    expect(body.auth.clientId).toBe("client-1");
  });

  it("defaults scopes to empty array when scope is missing or empty", async () => {
    mockedJwtVerify.mockResolvedValueOnce({
      payload: { sub: "user-1", aud: "https://api.example.com" },
      protectedHeader: {},
    } as never);

    const res = await makeApp().request(
      "/protected",
      { headers: { authorization: "Bearer abc" } },
      env(),
    );

    const body = (await res.json()) as { auth: { scopes: string[]; clientId?: string } };
    expect(body.auth.scopes).toEqual([]);
    expect(body.auth.clientId).toBeUndefined();
  });

  it("normalizes a string audience to an array", async () => {
    mockedJwtVerify.mockResolvedValueOnce({
      payload: { sub: "user-1", aud: "https://api.example.com" },
      protectedHeader: {},
    } as never);

    const res = await makeApp().request(
      "/protected",
      { headers: { authorization: "Bearer abc" } },
      env(),
    );

    const body = (await res.json()) as { auth: { audience: string[] } };
    expect(body.auth.audience).toEqual(["https://api.example.com"]);
  });

  it("defaults audience to empty array when aud is neither string nor array", async () => {
    mockedJwtVerify.mockResolvedValueOnce({
      payload: { sub: "user-1" },
      protectedHeader: {},
    } as never);

    const res = await makeApp().request(
      "/protected",
      { headers: { authorization: "Bearer abc" } },
      env(),
    );

    const body = (await res.json()) as { auth: { audience: string[] } };
    expect(body.auth.audience).toEqual([]);
  });
});