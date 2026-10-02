import { render, screen } from "@testing-library/react";
import { useHandleSignInCallback } from "@logto/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Callback from "./Callback";

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("@logto/react", () => ({
  useHandleSignInCallback: vi.fn(),
}));

const mockedHandle = vi.mocked(useHandleSignInCallback);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Callback", () => {
  it("renders a redirecting message while loading", () => {
    mockedHandle.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      error: undefined,
    });
    render(
      <MemoryRouter>
        <Callback />
      </MemoryRouter>,
    );
    expect(screen.getByText("Redirecting…")).toBeInTheDocument();
  });

  it("renders the error message on failure", () => {
    mockedHandle.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      error: new Error("boom"),
    });
    render(
      <MemoryRouter>
        <Callback />
      </MemoryRouter>,
    );
    expect(screen.getByText("Sign-in failed: boom")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toBeInTheDocument();
  });

  it("navigates to home on success", () => {
    let callback: (() => void) | undefined;
    mockedHandle.mockImplementation((cb?: () => void) => {
      callback = cb;
      return { isLoading: false, isAuthenticated: true, error: undefined };
    });

    render(
      <MemoryRouter>
        <Callback />
      </MemoryRouter>,
    );

    callback?.();
    expect(mocks.navigate).toHaveBeenCalledWith("/app", { replace: true });
  });
});