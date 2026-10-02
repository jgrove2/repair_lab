import { describe, expect, it, vi } from "vitest";
import worker from "./worker";

function makeEnv() {
  return {
    API: { fetch: vi.fn().mockResolvedValue(new Response("api")) },
    ASSETS: { fetch: vi.fn().mockResolvedValue(new Response("assets")) },
  };
}

describe("worker fetch", () => {
  it("forwards /api requests to the API service with the prefix stripped", async () => {
    const env = makeEnv();
    await worker.fetch(new Request("https://example.com/api/health"), env as never);
    expect(env.API.fetch).toHaveBeenCalledOnce();

    const forwarded = env.API.fetch.mock.calls[0][0] as Request;
    expect(forwarded.url).toBe("https://example.com/health");
  });

  it("maps bare /api to root", async () => {
    const env = makeEnv();
    await worker.fetch(new Request("https://example.com/api"), env as never);

    const forwarded = env.API.fetch.mock.calls[0][0] as Request;
    expect(forwarded.url).toBe("https://example.com/");
  });

  it("serves non-api requests from assets", async () => {
    const env = makeEnv();
    await worker.fetch(new Request("https://example.com/foo"), env as never);

    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
    expect(env.API.fetch).not.toHaveBeenCalled();
  });

  it("serves the root path from assets", async () => {
    const env = makeEnv();
    await worker.fetch(new Request("https://example.com/"), env as never);

    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });
});