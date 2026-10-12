import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Listing, SoldRecord } from "@repair-lab/shared";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  useApi: () => ({ fetch: mocks.fetch }),
}));

import Listings from "./Listings";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "l1",
    product: "wii",
    item_id: "item-1",
    title: "Nintendo Wii Console",
    short_description: null,
    price: 14.77,
    currency: "USD",
    url: "https://ebay.com/itm/item-1",
    condition: "For parts or not working",
    shipping_cost: 8.08,
    shipping_currency: "USD",
    shipping_cost_type: "CALCULATED",
    total_cost: 22.85,
    includes_controllers: 1,
    includes_games: 0,
    includes_cords: 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function makeSoldRecord(overrides: Partial<SoldRecord> = {}): SoldRecord {
  return {
    id: "s1",
    product: "wii",
    sub_product_code: "RVL-001",
    sold_price: 30,
    sold_date: "2026-10-01",
    includes_controllers: 1,
    includes_games: 0,
    includes_cords: 1,
    created_at: "2026-10-01",
    updated_at: "2026-10-01",
    ...overrides,
  };
}

function respond(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}

function mockFetches(
  overrides: {
    listings?: unknown;
    filters?: unknown;
    soldProducts?: unknown;
    soldRecords?: unknown;
    stats?: unknown;
  } = {},
) {
  mocks.fetch.mockImplementation((path: string) => {
    if (path === "/listings/filters") {
      return respond(
        overrides.filters ?? { products: ["wii"], conditions: ["Used"] },
      );
    }
    if (path === "/sold-records/products") {
      return respond(overrides.soldProducts ?? { products: [] });
    }
    if (path.startsWith("/sold-records/average")) {
      return respond(
        overrides.stats ?? { count: 0, average: null, min: null, max: null, median: null },
      );
    }
    if (path.startsWith("/sold-records")) {
      return respond(
        overrides.soldRecords ?? { data: [], page: 1, pageSize: 100, total: 0 },
      );
    }
    return respond(
      overrides.listings ?? { data: [], page: 1, pageSize: 25, total: 0 },
    );
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetches();
});

describe("Listings", () => {
  it("shows product tabs and an empty state when there are no listings", async () => {
    render(<Listings />);

    expect(await screen.findByText("No listings yet.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByRole("tab", { name: "wii" })).toBeInTheDocument();
  });

  it("fetches the first page sorted by title by default", async () => {
    render(<Listings />);

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/listings?page=1&pageSize=25&sort=title&order=asc",
      ),
    );
  });

  it("renders a row with money, condition and included flags", async () => {
    mockFetches({
      listings: {
        data: [makeListing()],
        page: 1,
        pageSize: 25,
        total: 1,
      },
    });

    render(<Listings />);

    expect(
      await screen.findByRole("link", { name: "Nintendo Wii Console" }),
    ).toBeInTheDocument();
    expect(screen.getByText("$14.77")).toBeInTheDocument();
    expect(screen.getByText("$8.08")).toBeInTheDocument();
    expect(screen.getByText("$22.85")).toBeInTheDocument();
    expect(screen.getByText("For parts or not working")).toBeInTheDocument();
  });

  it("switches tabs and refetches with the product filter", async () => {
    render(<Listings />);
    await screen.findByRole("tab", { name: "wii" });

    fireEvent.click(screen.getByRole("tab", { name: "wii" }));

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/listings?page=1&pageSize=25&sort=title&order=asc&product=wii",
      ),
    );
  });

  it("sorts by the clicked column", async () => {
    mockFetches({
      listings: { data: [makeListing()], page: 1, pageSize: 25, total: 1 },
    });

    render(<Listings />);
    await screen.findByRole("link", { name: "Nintendo Wii Console" });

    fireEvent.click(screen.getByRole("button", { name: "Price" }));

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/listings?page=1&pageSize=25&sort=price&order=asc",
      ),
    );
  });

  it("debounces the search box and adds a query filter", async () => {
    render(<Listings />);
    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/listings?page=1&pageSize=25&sort=title&order=asc",
      ),
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Search titles" }), {
      target: { value: "nintendo" },
    });

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/listings?page=1&pageSize=25&sort=title&order=asc&q=nintendo",
      ),
    );
  });

  it("applies condition and included-flag filters", async () => {
    render(<Listings />);
    await screen.findByRole("tab", { name: "wii" });

    fireEvent.change(screen.getByRole("combobox", { name: "Condition" }), {
      target: { value: "Used" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Controllers" }));

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/listings?page=1&pageSize=25&sort=title&order=asc&condition=Used&controllers=1",
      ),
    );
  });

  it("paginates through results", async () => {
    mockFetches({
      listings: { data: [makeListing()], page: 1, pageSize: 25, total: 50 },
    });

    render(<Listings />);

    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();

    const previous = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/listings?page=2&pageSize=25&sort=title&order=asc",
      ),
    );
  });

  it("shows an error state when the request fails", async () => {
    mocks.fetch.mockImplementation((path: string) =>
      path === "/listings/filters"
        ? respond({ products: [], conditions: [] })
        : Promise.reject(new Error("API /listings failed: 500")),
    );

    render(<Listings />);

    expect(
      await screen.findByText("Could not load listings."),
    ).toBeInTheDocument();
  });

  it("renders average sold price stats for the selected product", async () => {
    mockFetches({
      stats: {
        count: 2,
        average: 20,
        min: 10,
        max: 30,
        median: 20,
      },
    });

    render(<Listings />);

    expect(await screen.findByText("$10.00")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
    expect(screen.getAllByText("$20.00")).toHaveLength(2);
    expect(screen.getByText("Avg")).toBeInTheDocument();
    expect(screen.getByText("Min")).toBeInTheDocument();
    expect(screen.getByText("Max")).toBeInTheDocument();
    expect(screen.getByText("Median")).toBeInTheDocument();
    expect(screen.getByText("Count")).toBeInTheDocument();
  });

  it("renders sold records in the sold table", async () => {
    mockFetches({
      soldRecords: {
        data: [makeSoldRecord()],
        page: 1,
        pageSize: 100,
        total: 1,
      },
    });

    render(<Listings />);

    expect(await screen.findByText("RVL-001")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
    expect(screen.getByText("2026-10-01")).toBeInTheDocument();
  });

  it("opens the add sold modal", async () => {
    render(<Listings />);
    await screen.findByRole("tab", { name: "wii" });

    fireEvent.click(screen.getByRole("button", { name: "Add sold" }));

    expect(
      await screen.findByRole("dialog", { name: "Add sold record" }),
    ).toBeInTheDocument();
  });

  it("toggles games and cords filters", async () => {
    render(<Listings />);
    await screen.findByRole("tab", { name: "wii" });

    fireEvent.click(screen.getByRole("checkbox", { name: "Games" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Cords" }));

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/listings?page=1&pageSize=25&sort=title&order=asc&games=1&cords=1",
      ),
    );
  });

  it("renders a listing without a url as plain text", async () => {
    mockFetches({
      listings: {
        data: [makeListing({ url: null })],
        page: 1,
        pageSize: 25,
        total: 1,
      },
    });

    render(<Listings />);

    expect(
      await screen.findByText("Nintendo Wii Console"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Nintendo Wii Console" }),
    ).toBeNull();
  });

  it("filters the average by sub-product code and included flags", async () => {
    render(<Listings />);
    await screen.findByRole("tab", { name: "wii" });

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/sold-records/average?product=wii"),
      ),
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "Sub-product code" }),
      { target: { value: "RVL-001" } },
    );
    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.stringContaining("sub_product_code=RVL-001"),
      ),
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Average controllers" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Average games" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Average cords" }));

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.stringContaining("controllers=1&games=1&cords=1"),
      ),
    );
  });

  it("changes the average product", async () => {
    mockFetches({
      filters: { products: ["wii", "gamecube"], conditions: [] },
    });

    render(<Listings />);
    await screen.findByRole("tab", { name: "wii" });

    fireEvent.change(screen.getByLabelText("Product"), {
      target: { value: "gamecube" },
    });

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/sold-records/average?product=gamecube"),
      ),
    );
  });
});
