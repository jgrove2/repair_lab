import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SoldRecord } from "@repair-lab/shared";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  useApi: () => ({ fetch: mocks.fetch }),
}));

import Sold from "./Sold";

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
    filters?: unknown;
    soldProducts?: unknown;
    soldRecords?: unknown;
  } = {},
) {
  mocks.fetch.mockImplementation((path: string) => {
    if (path === "/listings/filters") {
      return respond(overrides.filters ?? { products: [], conditions: [] });
    }
    if (path === "/sold-records/products") {
      return respond(overrides.soldProducts ?? { products: [] });
    }
    if (path.startsWith("/sold-records")) {
      return respond(
        overrides.soldRecords ?? { data: [], page: 1, pageSize: 100, total: 0 },
      );
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

  it("fetches sold records sorted by date descending", async () => {
    render(<Sold />);

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/sold-records?page=1&pageSize=100&sort=sold_date&order=desc",
      ),
    );
  });

  it("renders sold records in the table", async () => {
    mockFetches({
      soldRecords: {
        data: [makeSoldRecord()],
        page: 1,
        pageSize: 100,
        total: 1,
      },
    });

    render(<Sold />);

    expect(await screen.findByText("RVL-001")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
    expect(screen.getByText("2026-10-01")).toBeInTheDocument();
  });

  it("opens the add sold modal", async () => {
    render(<Sold />);

    fireEvent.click(screen.getByRole("button", { name: "Add sold" }));

    expect(
      await screen.findByRole("dialog", { name: "Add sold record" }),
    ).toBeInTheDocument();
  });
});
