import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useLogto } from "@logto/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@logto/react", () => ({
  useLogto: vi.fn(),
}));

vi.mock("../lib/logto", () => ({
  CALLBACK_URI: "https://app.example.com/callback",
  SIGN_OUT_URI: "https://app.example.com/",
  logtoConfigured: true,
}));

import TopNav from "./TopNav";

const mockedUseLogto = vi.mocked(useLogto);

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseLogto.mockReturnValue({
    signIn: vi.fn(),
    signOut: vi.fn(),
    isAuthenticated: false,
    isLoading: false,
    error: undefined,
    fetchUserInfo: vi.fn().mockResolvedValue(undefined),
  } as never);
});

function renderTopNav() {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <TopNav />
    </MemoryRouter>,
  );
}

describe("TopNav", () => {
  it("renders a collapsed hamburger and the nav links", () => {
    renderTopNav();
    const hamburger = screen.getByRole("button", {
      name: "Toggle navigation",
    });
    expect(hamburger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inventory" })).toBeInTheDocument();
  });

  it("opens the menu when the hamburger is clicked", () => {
    const { container } = renderTopNav();
    const hamburger = screen.getByRole("button", {
      name: "Toggle navigation",
    });
    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector("#topnav-links.open")).not.toBeNull();
  });

  it("closes the menu when a link is clicked", () => {
    const { container } = renderTopNav();
    const hamburger = screen.getByRole("button", {
      name: "Toggle navigation",
    });
    fireEvent.click(hamburger);
    fireEvent.click(screen.getByRole("link", { name: "Inventory" }));
    expect(hamburger).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector("#topnav-links.open")).toBeNull();
  });

  it("closes the menu on an outside pointer down", () => {
    const { container } = renderTopNav();
    fireEvent.click(
      screen.getByRole("button", { name: "Toggle navigation" }),
    );
    fireEvent.pointerDown(document.body);
    expect(container.querySelector("#topnav-links.open")).toBeNull();
  });

  it("closes the menu when Escape is pressed", () => {
    const { container } = renderTopNav();
    fireEvent.click(
      screen.getByRole("button", { name: "Toggle navigation" }),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector("#topnav-links.open")).toBeNull();
  });

  it("renders a backdrop only while the menu is open and closes on click", () => {
    const { container } = renderTopNav();
    expect(container.querySelector(".topnav-backdrop")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Toggle navigation" }),
    );
    const backdrop = container.querySelector(".topnav-backdrop");
    expect(backdrop).not.toBeNull();

    fireEvent.click(backdrop!);
    expect(container.querySelector("#topnav-links.open")).toBeNull();
  });
});
