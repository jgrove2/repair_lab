import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("@logto/react", () => ({
  LogtoProvider: ({ children }: { children?: ReactNode }) => children ?? null,
  useLogto: () => ({ isLoading: true }),
}));

describe("App", () => {
  it("renders the navbar and dashboard at /", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Repair lab" }),
    ).toBeInTheDocument();
  });
});