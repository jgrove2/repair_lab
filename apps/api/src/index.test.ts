import { describe, expect, it } from "vitest";
import app from "./index";
import type { Bindings } from "./bindings";

const env = (overrides: Partial<Bindings> = {}): Bindings => ({
  DB: {} as D1Database,
  R2: {} as R2Bucket,
  ...overrides,
});

describe("GET /health", () => {
  it("returns ok with the environment name", async () => {
    const res = await app.request("/health", {}, env({ ENVIRONMENT: "dev" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, env: "dev" });
  });

  it("falls back to unknown when ENVIRONMENT is unset", async () => {
    const res = await app.request("/health", {}, env());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, env: "unknown" });
  });
});

describe("unknown routes", () => {
  it("returns 404", async () => {
    const res = await app.request("/nope", {}, env());
    expect(res.status).toBe(404);
  });
});