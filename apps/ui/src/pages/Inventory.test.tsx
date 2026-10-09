import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentListItem } from "@repair-lab/shared";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  useApi: () => ({ fetch: mocks.fetch }),
}));

import Inventory from "./Inventory";

function makeItem(
  overrides: Partial<ComponentListItem> = {},
): ComponentListItem {
  return {
    id: "c1",
    name: "10k resistor",
    category: "resistor",
    quantity: 42,
    location_id: "l1",
    cost_per_unit: 0.01,
    sku: "R-10K",
    location_name: "Drawer A",
    ...overrides,
  };
}

function respond(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status: 200 }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetch.mockResolvedValue(
    respond({ data: [], page: 1, pageSize: 10, total: 0 }),
  );
});

describe("Inventory", () => {
  it("shows an empty state when there are no components", async () => {
    render(<Inventory />);

    expect(await screen.findByText("No components yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("combobox", { name: "Sort by" }),
    ).toBeInTheDocument();
  });

  it("opens the add component dialog", async () => {
    render(<Inventory />);

    await screen.findByText("No components yet.");
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByRole("dialog", { name: "Add component" }),
    ).toBeInTheDocument();
  });

  it("fetches the first page sorted by name by default", async () => {
    render(<Inventory />);

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/components?page=1&pageSize=10&sort=name",
      ),
    );
  });

  it("renders a row with an edit button for each component", async () => {
    mocks.fetch.mockResolvedValue(
      respond({
        data: [
          makeItem(),
          makeItem({ id: "c2", name: "Screen", location_name: null }),
        ],
        page: 1,
        pageSize: 10,
        total: 2,
      }),
    );

    render(<Inventory />);

    expect(await screen.findByText("10k resistor")).toBeInTheDocument();
    expect(screen.getByText("Drawer A")).toBeInTheDocument();
    expect(screen.getByText("Screen")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();

    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    expect(editButtons).toHaveLength(2);
    editButtons.forEach((button) => expect(button).toBeDisabled());
  });

  it("refetches from page 1 when the sort changes", async () => {
    render(<Inventory />);
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), {
      target: { value: "quantity" },
    });

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/components?page=1&pageSize=10&sort=quantity",
      ),
    );
  });

  it("paginates through results", async () => {
    mocks.fetch.mockResolvedValue(
      respond({ data: [makeItem()], page: 1, pageSize: 10, total: 25 }),
    );

    render(<Inventory />);

    expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();

    const previous = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/components?page=2&pageSize=10&sort=name",
      ),
    );
  });

  it("shows an error state when the request fails", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("API /components failed: 500"));

    render(<Inventory />);

    expect(
      await screen.findByText("Could not load inventory."),
    ).toBeInTheDocument();
  });
});
