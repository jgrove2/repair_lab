import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadLogto() {
  return import("./logto");
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_LOGTO_ENDPOINT", "");
  vi.stubEnv("VITE_LOGTO_APP_ID", "");
  vi.stubEnv("VITE_LOGTO_API_RESOURCE", "");
});

describe("logtoConfig derivation", () => {
  it("marks configured when endpoint and appId are present", async () => {
    vi.stubEnv("VITE_LOGTO_ENDPOINT", "https://tenant.logto.app");
    vi.stubEnv("VITE_LOGTO_APP_ID", "app-id");
    const { logtoConfigured } = await loadLogto();
    expect(logtoConfigured).toBe(true);
  });

  it("marks unconfigured when only endpoint is present", async () => {
    vi.stubEnv("VITE_LOGTO_ENDPOINT", "https://tenant.logto.app");
    const { logtoConfigured } = await loadLogto();
    expect(logtoConfigured).toBe(false);
  });

  it("marks unconfigured when only appId is present", async () => {
    vi.stubEnv("VITE_LOGTO_APP_ID", "app-id");
    const { logtoConfigured } = await loadLogto();
    expect(logtoConfigured).toBe(false);
  });

  it("marks unconfigured when neither is present", async () => {
    const { logtoConfigured } = await loadLogto();
    expect(logtoConfigured).toBe(false);
  });

  it("derives API_RESOURCE and resources from VITE_LOGTO_API_RESOURCE", async () => {
    vi.stubEnv("VITE_LOGTO_API_RESOURCE", "https://api.example.com");
    const { API_RESOURCE, logtoConfig } = await loadLogto();
    expect(API_RESOURCE).toBe("https://api.example.com");
    expect(logtoConfig.resources).toEqual(["https://api.example.com"]);
  });

  it("defaults API_RESOURCE and resources to empty when unset", async () => {
    const { API_RESOURCE, logtoConfig } = await loadLogto();
    expect(API_RESOURCE).toBe("");
    expect(logtoConfig.resources).toEqual([]);
  });

  it("derives redirect URIs from the window origin", async () => {
    const { CALLBACK_URI, SIGN_OUT_URI } = await loadLogto();
    expect(CALLBACK_URI).toBe(`${window.location.origin}/callback`);
    expect(SIGN_OUT_URI).toBe(`${window.location.origin}/`);
  });
});