import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLogto } from "@logto/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthControl from "./AuthControl";

vi.mock("@logto/react", () => ({
  useLogto: vi.fn(),
}));

vi.mock("../lib/logto", () => ({
  CALLBACK_URI: "https://app.example.com/callback",
  SIGN_OUT_URI: "https://app.example.com/",
  logtoConfigured: true,
}));

const mockedUseLogto = vi.mocked(useLogto);

const defaultLogto = {
  signIn: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: false,
  isLoading: false,
  error: undefined as Error | undefined,
  fetchUserInfo: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseLogto.mockReturnValue(defaultLogto as never);
});

describe("AuthControl", () => {
  it("renders a disabled button while loading", () => {
    mockedUseLogto.mockReturnValue({ ...defaultLogto, isLoading: true } as never);
    render(<AuthControl />);
    const button = screen.getByRole("button", { name: "Checking session…" });
    expect(button).toBeDisabled();
  });

  it("renders the error state when there is a session error", () => {
    mockedUseLogto.mockReturnValue({
      ...defaultLogto,
      error: new Error("boom"),
    } as never);
    render(<AuthControl />);
    expect(screen.getByText("Session error.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeInTheDocument();
  });

  it("calls signIn when the sign in again button is clicked", () => {
    const signIn = vi.fn();
    mockedUseLogto.mockReturnValue({
      ...defaultLogto,
      error: new Error("boom"),
      signIn,
    } as never);
    render(<AuthControl />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }));
    expect(signIn).toHaveBeenCalledWith("https://app.example.com/callback");
  });

  it("renders a Sign In button and calls signIn on click", () => {
    const signIn = vi.fn();
    mockedUseLogto.mockReturnValue({ ...defaultLogto, signIn } as never);
    render(<AuthControl />);
    const button = screen.getByRole("button", { name: "Sign In" });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(signIn).toHaveBeenCalledWith("https://app.example.com/callback");
  });

  it("renders the account menu when authenticated", async () => {
    mockedUseLogto.mockReturnValue({
      ...defaultLogto,
      isAuthenticated: true,
      fetchUserInfo: vi.fn().mockResolvedValue({
        sub: "user-1",
        name: "Alice",
        iss: "i",
        aud: "a",
        exp: 1,
        iat: 1,
      }),
    } as never);
    render(<AuthControl />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /account menu for alice/i }),
      ).toBeInTheDocument(),
    );
  });

  it("calls signOut when Sign Out is clicked", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    mockedUseLogto.mockReturnValue({
      ...defaultLogto,
      isAuthenticated: true,
      signOut,
      fetchUserInfo: vi.fn().mockResolvedValue({
        sub: "user-1",
        name: "Alice",
        iss: "i",
        aud: "a",
        exp: 1,
        iat: 1,
      }),
    } as never);
    render(<AuthControl />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /account menu for alice/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /account menu for alice/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign Out" }));

    await waitFor(() =>
      expect(signOut).toHaveBeenCalledWith("https://app.example.com/"),
    );
  });
});