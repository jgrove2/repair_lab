import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@logto/react", () => ({
  useLogto: () => ({ isAuthenticated: true, signOut: mocks.signOut }),
}));

vi.mock("./lib/api", () => ({
  useApi: () => ({ fetch: mocks.fetch }),
}));

vi.mock("./lib/logto", () => ({
  SIGN_OUT_URI: "https://app.example.com/",
}));

import { Dashboard } from "./pages";

describe("Dashboard", () => {
  beforeEach(() => {
    mocks.signOut.mockReset();
    mocks.fetch.mockReset();
  });

  it("signs the user out when /me fails", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("API /me failed: 500"));

    render(<Dashboard />);

    await waitFor(() =>
      expect(mocks.signOut).toHaveBeenCalledWith("https://app.example.com/"),
    );
    expect(mocks.fetch).toHaveBeenCalledWith("/me");
  });

  it("does not sign out when /me succeeds", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

    render(<Dashboard />);

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith("/me"));
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
