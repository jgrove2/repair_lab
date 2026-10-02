import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@logto/react", () => ({
  useLogto: () => ({ getAccessToken: async () => "token-abc" }),
}));

import { API_BASE, apiFetch, useApi } from "./api";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("calls fetch with the API base path", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await apiFetch("/items");
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/items`, expect.anything());
  });

  it("sets the Authorization header when a token is provided", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await apiFetch("/items", {}, "secret");
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer secret");
  });

  it("does not set Authorization when no token is provided", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await apiFetch("/items");
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Headers).get("Authorization")).toBeNull();
  });

  it("throws when the response is not ok", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(apiFetch("/items")).rejects.toThrow("API /items failed: 500");
  });

  it("preserves existing headers when a token is given", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await apiFetch("/items", { headers: { "Content-Type": "application/json" } }, "t");
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Headers).get("Content-Type")).toBe("application/json");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer t");
  });
});

describe("useApi", () => {
  it("injects the Logto access token into requests", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const { result } = renderHook(() => useApi());
    await result.current.fetch("/items");

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer token-abc");
  });
});