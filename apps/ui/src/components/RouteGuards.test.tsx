import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useLogto } from "@logto/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@logto/react", () => ({
  useLogto: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  useApi: () => ({ fetch: mocks.fetch }),
}));

vi.mock("../lib/logto", () => ({
  CALLBACK_URI: "https://app.example.com/callback",
  SIGN_OUT_URI: "https://app.example.com/",
  logtoConfigured: true,
}));

import { RedirectIfAuthenticated, RequireAuth } from "./RouteGuards";

const mockedUseLogto = vi.mocked(useLogto);

const baseLogto = {
  signIn: vi.fn(),
  signOut: mocks.signOut,
  isAuthenticated: false,
  isLoading: false,
  error: undefined,
  fetchUserInfo: vi.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetch.mockResolvedValue(new Response(null, { status: 200 }));
  mockedUseLogto.mockReturnValue(baseLogto as never);
});

function renderRequireAuth() {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/app" element={<div>Protected content</div>} />
        </Route>
        <Route path="/" element={<div>Sales home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  it("renders a loading state while the session is loading", () => {
    mockedUseLogto.mockReturnValue({ ...baseLogto, isLoading: true } as never);
    renderRequireAuth();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("redirects signed-out users to the sales home", () => {
    renderRequireAuth();
    expect(screen.getByText("Sales home")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders protected content while authenticated even if loading is set", () => {
    mockedUseLogto.mockReturnValue({
      ...baseLogto,
      isAuthenticated: true,
      isLoading: true,
    } as never);

    renderRequireAuth();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("renders the nav and protected content for signed-in users", async () => {
    mockedUseLogto.mockReturnValue({
      ...baseLogto,
      isAuthenticated: true,
    } as never);

    renderRequireAuth();

    await waitFor(() =>
      expect(screen.getByText("Protected content")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inventory" })).toBeInTheDocument();
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith("/me"));
  });

  it("signs the user out when /me fails", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("API /me failed: 500"));
    mockedUseLogto.mockReturnValue({
      ...baseLogto,
      isAuthenticated: true,
    } as never);

    renderRequireAuth();

    await waitFor(() =>
      expect(mocks.signOut).toHaveBeenCalledWith("https://app.example.com/"),
    );
  });
});

function renderRedirect() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={
            <RedirectIfAuthenticated>
              <div>Sales home</div>
            </RedirectIfAuthenticated>
          }
        />
        <Route path="/app" element={<div>App home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RedirectIfAuthenticated", () => {
  it("renders a loading state while the session is loading", () => {
    mockedUseLogto.mockReturnValue({ ...baseLogto, isLoading: true } as never);
    renderRedirect();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders children for signed-out users", () => {
    renderRedirect();
    expect(screen.getByText("Sales home")).toBeInTheDocument();
  });

  it("redirects signed-in users to the app home", () => {
    mockedUseLogto.mockReturnValue({
      ...baseLogto,
      isAuthenticated: true,
    } as never);
    renderRedirect();
    expect(screen.getByText("App home")).toBeInTheDocument();
  });
});
