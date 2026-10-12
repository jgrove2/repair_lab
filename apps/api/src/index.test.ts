import { describe, expect, it } from "vitest";
import app from "./index";
import type { Bindings } from "./bindings";

const env = (overrides: Partial<Bindings> = {}): Bindings => ({
  DB: {} as D1Database,
  R2: {} as R2Bucket,
  ...overrides,
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await app.request("/health", {}, env());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("unknown routes", () => {
  it("returns 404", async () => {
    const res = await app.request("/nope", {}, env());
    expect(res.status).toBe(404);
  });
});