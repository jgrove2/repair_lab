import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SoldProductSummary } from "@repair-lab/shared";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  useApi: () => ({ fetch: mocks.fetch }),
}));

import Sold from "./Sold";

function makeSummary(overrides: Partial<SoldProductSummary> = {}): SoldProductSummary {
  return {
    product: "wii",
    overall: { count: 2, average: 30, min: 20, max: 40, median: 30 },
    sub_products: [
      {
        sub_product_code: "RVL-001",
        stats: { count: 2, average: 30, min: 20, max: 40, median: 30 },
      },
    ],
    ...overrides,
  };
}

function respond(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}

function mockFetches(
  overrides: {
    filters?: unknown;
    soldProducts?: unknown;
    summary?: unknown;
  } = {},
) {
  mocks.fetch.mockImplementation((path: string) => {
    if (path === "/listings/filters") {
      return respond(overrides.filters ?? { products: [], conditions: [] });
    }
    if (path === "/sold-records/products") {
      return respond(overrides.soldProducts ?? { products: [] });
    }
    if (path === "/sold-records/summary") {
      return respond(overrides.summary ?? { products: [] });
    }
    return respond({});
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetches();
});

describe("Sold", () => {
  it("shows an empty state when there are no sold records", async () => {
    render(<Sold />);

    expect(await screen.findByText("No sold records yet.")).toBeInTheDocument();
  });

  it("fetches the sold summary", async () => {
    render(<Sold />);

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith("/sold-records/summary"),
    );
  });

  it("renders product cards with sub-product and overall stats", async () => {
    mockFetches({
      summary: {
        products: [
          makeSummary(),
          makeSummary({
            product: "gamecube",
            sub_products: [
              {
                sub_product_code: null,
                stats: { count: 1, average: 50, min: 50, max: 50, median: 50 },
              },
            ],
            overall: { count: 1, average: 50, min: 50, max: 50, median: 50 },
          }),
        ],
      },
    });

    render(<Sold />);

    expect(await screen.findByText("wii")).toBeInTheDocument();
    expect(screen.getByText("gamecube")).toBeInTheDocument();

    expect(screen.getByText("RVL-001")).toBeInTheDocument();
    expect(screen.getAllByText("$30.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$50.00").length).toBeGreaterThan(0);
  });

  it("opens the add sold modal", async () => {
    render(<Sold />);

    fireEvent.click(screen.getByRole("button", { name: "Add sold" }));

    expect(
      await screen.findByRole("dialog", { name: "Add sold record" }),
    ).toBeInTheDocument();
  });
});
