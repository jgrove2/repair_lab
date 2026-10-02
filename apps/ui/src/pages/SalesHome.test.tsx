import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@logto/react", () => ({
  useLogto: () => ({
    isLoading: false,
    isAuthenticated: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    error: undefined,
    fetchUserInfo: vi.fn(),
  }),
}));

import SalesHome from "./SalesHome";

describe("SalesHome", () => {
  it("renders the project name and sign in control", () => {
    render(<SalesHome />);
    expect(
      screen.getByRole("heading", { name: "Repair lab" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign In" }),
    ).toBeInTheDocument();
  });
});
