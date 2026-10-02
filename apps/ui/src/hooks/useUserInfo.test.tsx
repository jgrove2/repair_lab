import { renderHook, waitFor } from "@testing-library/react";
import type { UserInfoResponse } from "@logto/react";
import { describe, expect, it, vi } from "vitest";
import { useUserInfo } from "./useUserInfo";

function makeUser(overrides: Partial<UserInfoResponse> = {}): UserInfoResponse {
  return {
    iss: "issuer",
    sub: "user-1",
    aud: "client-1",
    exp: 1,
    iat: 1,
    ...overrides,
  };
}

describe("useUserInfo", () => {
  it("returns null when not authenticated", () => {
    const fetchUserInfo = vi.fn();
    const { result } = renderHook(() => useUserInfo(false, fetchUserInfo));
    expect(result.current).toBeNull();
    expect(fetchUserInfo).not.toHaveBeenCalled();
  });

  it("resolves to the user info when authenticated", async () => {
    const user = makeUser({ email: "a@b.c" });
    const fetchUserInfo = vi.fn().mockResolvedValue(user);
    const { result } = renderHook(() => useUserInfo(true, fetchUserInfo));

    await waitFor(() => expect(result.current).toEqual(user));
  });

  it("falls back to null when fetch resolves undefined", async () => {
    const fetchUserInfo = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useUserInfo(true, fetchUserInfo));

    await waitFor(() => expect(result.current).toBeNull());
  });

  it("falls back to null when fetch rejects", async () => {
    const fetchUserInfo = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useUserInfo(true, fetchUserInfo));

    await waitFor(() => expect(result.current).toBeNull());
  });

  it("does not set state after unmount", async () => {
    let resolveFetch!: (value: UserInfoResponse) => void;
    const fetchUserInfo = vi.fn(
      () =>
        new Promise<UserInfoResponse>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { unmount } = renderHook(() => useUserInfo(true, fetchUserInfo));
    unmount();

    resolveFetch(makeUser({ sub: "late" }));
    await Promise.resolve();
    expect(fetchUserInfo).toHaveBeenCalledOnce();
  });
});