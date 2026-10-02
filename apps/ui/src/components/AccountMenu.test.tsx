import { fireEvent, render, screen } from "@testing-library/react";
import type { UserInfoResponse } from "@logto/react";
import { describe, expect, it, vi } from "vitest";
import AccountMenu from "./AccountMenu";

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

const baseProps = {
  open: true,
  signingOut: false,
  onToggle: vi.fn(),
  onSignOut: vi.fn(),
};

describe("AccountMenu", () => {
  it("falls back to name for the label", () => {
    const { container } = render(
      <AccountMenu {...baseProps} user={makeUser({ name: "Alice" })} />,
    );
    expect(container.querySelector(".topnav-menu-name")?.textContent).toBe(
      "Alice",
    );
  });

  it("falls back to username when name is missing", () => {
    const { container } = render(
      <AccountMenu {...baseProps} user={makeUser({ username: "alice_u" })} />,
    );
    expect(container.querySelector(".topnav-menu-name")?.textContent).toBe(
      "alice_u",
    );
  });

  it("falls back to email when name and username are missing", () => {
    const { container } = render(
      <AccountMenu {...baseProps} user={makeUser({ email: "a@b.c" })} />,
    );
    expect(container.querySelector(".topnav-menu-name")?.textContent).toBe(
      "a@b.c",
    );
  });

  it('falls back to "Signed in" when no identifying fields exist', () => {
    const { container } = render(<AccountMenu {...baseProps} user={null} />);
    expect(container.querySelector(".topnav-menu-name")?.textContent).toBe(
      "Signed in",
    );
  });

  it("renders the profile picture when present and not failed", () => {
    const { container } = render(
      <AccountMenu
        {...baseProps}
        user={makeUser({ name: "Alice", picture: "https://img/x.png" })}
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://img/x.png",
    );
  });

  it("renders an initial when no picture is present", () => {
    const { container } = render(
      <AccountMenu {...baseProps} user={makeUser({ name: "Alice" })} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(
      container.querySelector(".topnav-avatar span")?.textContent,
    ).toBe("A");
  });

  it("falls back to the initial when the picture fails to load", () => {
    const { container } = render(
      <AccountMenu
        {...baseProps}
        user={makeUser({ name: "Alice", picture: "https://img/x.png" })}
      />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(
      container.querySelector(".topnav-avatar span")?.textContent,
    ).toBe("A");
  });

  it("renders detail rows only for string fields", () => {
    const { container } = render(
      <AccountMenu
        {...baseProps}
        user={makeUser({ name: "Alice", email: "a@b.c" })}
      />,
    );
    const terms = Array.from(
      container.querySelectorAll(".topnav-menu-details dt"),
    ).map((el) => el.textContent);
    expect(terms).toEqual(["Name", "Email"]);
    expect(terms).not.toContain("Username");
  });

  it("shows the email sub-line when it differs from the label", () => {
    const { container } = render(
      <AccountMenu
        {...baseProps}
        user={makeUser({ name: "Alice", email: "alice@example.com" })}
      />,
    );
    expect(container.querySelector(".topnav-menu-sub")?.textContent).toBe(
      "alice@example.com",
    );
  });

  it("disables the sign out button while signing out", () => {
    render(
      <AccountMenu
        {...baseProps}
        signingOut
        user={makeUser({ name: "Alice" })}
      />,
    );
    const button = screen.getByRole("menuitem", { name: "Signing out…" });
    expect(button).toBeDisabled();
  });

  it("does not render the menu when closed", () => {
    const { container } = render(
      <AccountMenu {...baseProps} open={false} user={makeUser({ name: "Alice" })} />,
    );
    expect(container.querySelector("[role='menu']")).toBeNull();
  });

  it("calls onSignOut when the sign out button is clicked", () => {
    const onSignOut = vi.fn();
    render(
      <AccountMenu
        {...baseProps}
        onSignOut={onSignOut}
        user={makeUser({ name: "Alice" })}
      />,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign Out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});