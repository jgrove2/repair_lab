import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "./bindings";

vi.mock("./auth.js", () => ({
  requireLogtoAuth: () => async (_c: unknown, next: () => Promise<void>) => {
    await next();
  },
}));

import listings, {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parseListingQuery,
} from "./listings";

function makeEnv(opts: { total?: number; results?: unknown[] } = {}) {
  const all = vi
    .fn()
    .mockResolvedValue({ results: opts.results ?? [], success: true, meta: {} });
  const first = vi.fn().mockResolvedValue({ total: opts.total ?? 0 });
  const bind = vi.fn();
  const prepare = vi.fn((sql: string) => {
    if (sql.includes("COUNT(*)")) {
      bind.mockReturnValue({ first });
    } else {
      bind.mockReturnValue({ all });
    }
    return { bind };
  });

  const env = {
    DB: { prepare } as unknown as D1Database,
    R2: {} as R2Bucket,
  } as Bindings;

  return { env, prepare, bind, all, first };
}

type DbHandler = (sql: string, params: unknown[]) => {
  all?: unknown[];
  first?: unknown;
};

function makeDbEnv(handler: DbHandler) {
  const run = vi.fn().mockResolvedValue({ success: true, meta: {} });
  const statement = (sql: string, params: unknown[]) => ({
    first: () => Promise.resolve(handler(sql, params).first ?? null),
    all: () =>
      Promise.resolve({
        results: handler(sql, params).all ?? [],
        success: true,
        meta: {},
      }),
    run: () => run(...params),
    bind: (...bound: unknown[]) => statement(sql, bound),
  });
  const prepare = vi.fn((sql: string) => statement(sql, []));

  const env = {
    DB: { prepare } as unknown as D1Database,
    R2: {} as R2Bucket,
  } as Bindings;

  return { env, prepare, run };
}

const row = {
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
};

describe("parseListingQuery", () => {
  it("applies defaults", () => {
    expect(parseListingQuery({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      sort: "title",
      order: "asc",
      offset: 0,
    });
  });

  it("parses page, pageSize and computes the offset", () => {
    expect(parseListingQuery({ page: "3", pageSize: "50" })).toMatchObject({
      page: 3,
      pageSize: 50,
      offset: 100,
    });
  });

  it("clamps page and pageSize to allowed ranges", () => {
    expect(parseListingQuery({ page: "0" }).page).toBe(1);
    expect(parseListingQuery({ pageSize: "0" }).pageSize).toBe(1);
    expect(parseListingQuery({ pageSize: "9999" }).pageSize).toBe(MAX_PAGE_SIZE);
  });

  it("accepts a valid sort and falls back otherwise", () => {
    expect(parseListingQuery({ sort: "total_cost" }).sort).toBe("total_cost");
    expect(parseListingQuery({ sort: "bogus" }).sort).toBe("title");
  });

  it("only accepts desc as an explicit order", () => {
    expect(parseListingQuery({ order: "desc" }).order).toBe("desc");
    expect(parseListingQuery({ order: "sideways" }).order).toBe("asc");
  });

  it("parses product, q and condition filters", () => {
    const parsed = parseListingQuery({
      product: "wii",
      q: " console ",
      condition: "Used",
    });
    expect(parsed.product).toBe("wii");
    expect(parsed.q).toBe("console");
    expect(parsed.condition).toBe("Used");
  });

  it("parses included-flag filters, ignoring invalid values", () => {
    expect(parseListingQuery({ controllers: "1" }).controllers).toBe(1);
    expect(parseListingQuery({ games: "0" }).games).toBe(0);
    expect(parseListingQuery({ cords: "yes" }).cords).toBeUndefined();
  });
});

describe("GET /listings", () => {
  it("returns a paginated payload with the total count", async () => {
    const { env } = makeEnv({ total: 1, results: [row] });

    const res = await listings.request("/listings", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: [row],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 1,
    });
  });

  it("returns an empty list when there are no listings", async () => {
    const { env } = makeEnv({ total: 0, results: [] });

    const res = await listings.request("/listings", {}, env);

    expect(await res.json()).toEqual({
      data: [],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 0,
    });
  });

  it("passes the page size and offset to the data query", async () => {
    const { env, prepare, bind } = makeEnv();

    await listings.request("/listings?page=3&pageSize=5", {}, env);

    expect(prepare.mock.calls[1][0]).toContain("LIMIT ? OFFSET ?");
    expect(bind).toHaveBeenCalledWith(5, 10);
  });

  it("orders by the requested whitelisted column", async () => {
    const { env, prepare } = makeEnv();

    await listings.request(
      "/listings?sort=total_cost&order=desc",
      {},
      env,
    );

    expect(prepare.mock.calls[1][0]).toContain("ORDER BY total_cost DESC");
  });

  it("ignores an unknown sort value instead of interpolating it", async () => {
    const { env, prepare } = makeEnv();

    await listings.request(
      "/listings?sort=;DROP%20TABLE%20listings",
      {},
      env,
    );

    const dataSql = prepare.mock.calls[1][0] as string;
    expect(dataSql).toContain("ORDER BY title ASC");
    expect(dataSql).not.toContain("DROP");
  });

  it("filters by product and condition", async () => {
    const { env, prepare, bind } = makeEnv();

    await listings.request(
      "/listings?product=wii&condition=Used",
      {},
      env,
    );

    const dataSql = prepare.mock.calls[1][0] as string;
    expect(dataSql).toContain("product = ?");
    expect(dataSql).toContain("condition = ?");
    expect(bind).toHaveBeenCalledWith("wii", "Used", DEFAULT_PAGE_SIZE, 0);
  });

  it("escapes the search query and matches title and description", async () => {
    const { env, prepare, bind } = makeEnv();

    await listings.request("/listings?q=100%25", {}, env);

    const dataSql = prepare.mock.calls[1][0] as string;
    expect(dataSql).toContain(
      "(title LIKE ? ESCAPE '\\' OR short_description LIKE ? ESCAPE '\\')",
    );
    expect(bind).toHaveBeenCalledWith(
      "%100\\%%",
      "%100\\%%",
      DEFAULT_PAGE_SIZE,
      0,
    );
  });

  it("filters by included-flag value", async () => {
    const { env, prepare, bind } = makeEnv();

    await listings.request("/listings?controllers=1&cords=0", {}, env);

    const dataSql = prepare.mock.calls[1][0] as string;
    expect(dataSql).toContain("includes_controllers = ?");
    expect(dataSql).toContain("includes_cords = ?");
    expect(bind).toHaveBeenCalledWith(1, 0, DEFAULT_PAGE_SIZE, 0);
  });
});

describe("GET /listings/filters", () => {
  it("returns distinct products and conditions", async () => {
    const all = vi
      .fn()
      .mockResolvedValueOnce({
        results: [{ product: "wii" }],
        success: true,
        meta: {},
      })
      .mockResolvedValueOnce({
        results: [{ condition: "Used" }],
        success: true,
        meta: {},
      });
    const prepare = vi.fn(() => ({ all }));
    const env = {
      DB: { prepare } as unknown as D1Database,
      R2: {} as R2Bucket,
    } as Bindings;

    const res = await listings.request("/listings/filters", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      products: ["wii"],
      conditions: ["Used"],
    });
  });
});

describe("POST /listings", () => {
  const payload = {
    wii: [
      {
        title: "Nintendo Wii Console",
        item_id: "item-1",
        price: "14.77",
        currency: "USD",
        url: "https://ebay.com/itm/item-1",
        condition: "Used",
        shipping_cost: "8.08",
        total_cost: "22.85",
        included: { controllers: true, games: false, cords: true },
      },
    ],
  };

  it("inserts new listings and coerces money strings to numbers", async () => {
    const { env, run } = makeDbEnv((sql) =>
      sql.includes("WHERE item_id IN") ? { all: [] } : {},
    );

    const res = await listings.request(
      "/listings",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
      env,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ inserted: 1, updated: 0, total: 1 });
    expect(run).toHaveBeenCalledTimes(1);
    const insertParams = run.mock.calls[0] as unknown[];
    expect(insertParams[1]).toBe("wii");
    expect(insertParams[2]).toBe("item-1");
    expect(insertParams[5]).toBe(14.77);
    expect(insertParams[12]).toBe(22.85);
    expect(insertParams[13]).toBe(1);
    expect(insertParams[15]).toBe(1);
  });

  it("updates an existing listing instead of duplicating it", async () => {
    const { env } = makeDbEnv((sql) =>
      sql.includes("WHERE item_id IN") ? { all: [{ item_id: "item-1" }] } : {},
    );

    const res = await listings.request(
      "/listings",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
      env,
    );

    expect(await res.json()).toEqual({ inserted: 0, updated: 1, total: 1 });
  });

  it("rejects malformed JSON", async () => {
    const { env } = makeDbEnv(() => ({}));

    const res = await listings.request(
      "/listings",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json",
      },
      env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_json" });
  });

  it("rejects a payload missing the required title", async () => {
    const { env } = makeDbEnv(() => ({}));

    const res = await listings.request(
      "/listings",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wii: [{ item_id: "item-1" }] }),
      },
      env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_body" });
  });

  it("rejects a payload with an empty product key", async () => {
    const { env } = makeDbEnv(() => ({}));

    const res = await listings.request(
      "/listings",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ "": [{ item_id: "item-1", title: "x" }] }),
      },
      env,
    );

    expect(res.status).toBe(400);
  });
});
