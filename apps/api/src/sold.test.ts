import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "./bindings";

vi.mock("./auth.js", () => ({
  requireLogtoAuth: () => async (_c: unknown, next: () => Promise<void>) => {
    await next();
  },
}));

import sold, {
  computeStats,
  DEFAULT_PAGE_SIZE,
  parseSoldRecordQuery,
} from "./sold";

type DbHandler = (sql: string, params: unknown[]) => {
  all?: unknown[];
  first?: unknown;
};

function makeDbEnv(handler: DbHandler) {
  const run = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });
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
};

describe("parseSoldRecordQuery", () => {
  it("applies defaults with sold_date desc", () => {
    expect(parseSoldRecordQuery({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      sort: "sold_date",
      order: "desc",
      offset: 0,
    });
  });

  it("parses page, pageSize, product and computes offset", () => {
    expect(parseSoldRecordQuery({ page: "2", pageSize: "50", product: "wii" })).toMatchObject({
      page: 2,
      pageSize: 50,
      offset: 50,
      product: "wii",
    });
  });

  it("accepts a valid sort and falls back otherwise", () => {
    expect(parseSoldRecordQuery({ sort: "sold_price" }).sort).toBe("sold_price");
    expect(parseSoldRecordQuery({ sort: "bogus" }).sort).toBe("sold_date");
  });

  it("only accepts asc as an explicit order", () => {
    expect(parseSoldRecordQuery({ order: "asc" }).order).toBe("asc");
    expect(parseSoldRecordQuery({ order: "sideways" }).order).toBe("desc");
  });
});

describe("computeStats", () => {
  it("returns nulls for an empty set", () => {
    expect(computeStats([])).toEqual({
      count: 0,
      average: null,
      min: null,
      max: null,
      median: null,
    });
  });

  it("computes stats for a single value", () => {
    expect(computeStats([10])).toEqual({
      count: 1,
      average: 10,
      min: 10,
      max: 10,
      median: 10,
    });
  });

  it("averages an odd count", () => {
    expect(computeStats([10, 20, 30])).toEqual({
      count: 3,
      average: 20,
      min: 10,
      max: 30,
      median: 20,
    });
  });

  it("averages an even count with a fractional median", () => {
    expect(computeStats([10, 20, 30, 40])).toEqual({
      count: 4,
      average: 25,
      min: 10,
      max: 40,
      median: 25,
    });
  });
});

describe("GET /sold-records", () => {
  it("returns a paginated payload", async () => {
    const { env } = makeDbEnv((sql) =>
      sql.includes("COUNT(*)") ? { first: { total: 1 } } : { all: [row] },
    );

    const res = await sold.request("/sold-records", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: [row],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 1,
    });
  });

  it("orders by sold_date desc by default", async () => {
    const { env, prepare } = makeDbEnv(() => ({}));

    await sold.request("/sold-records", {}, env);

    const dataSql = prepare.mock.calls[1][0] as string;
    expect(dataSql).toContain("ORDER BY sold_date DESC");
  });
});

describe("GET /sold-records/average", () => {
  it("requires a product", async () => {
    const { env } = makeDbEnv(() => ({}));

    const res = await sold.request("/sold-records/average", {}, env);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "missing_product" });
  });

  it("computes stats from matching sold prices", async () => {
    const { env } = makeDbEnv(() => ({
      all: [{ sold_price: 10 }, { sold_price: 30 }],
    }));

    const res = await sold.request("/sold-records/average?product=wii", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      count: 2,
      average: 20,
      min: 10,
      max: 30,
      median: 20,
    });
  });

  it("filters by sub_product_code and included flags", async () => {
    const { env, prepare, run } = makeDbEnv(() => ({
      all: [{ sold_price: 5 }],
    }));

    await sold.request(
      "/sold-records/average?product=wii&sub_product_code=RVL-001&controllers=1&games=0&cords=1",
      {},
      env,
    );

    expect(run).not.toHaveBeenCalled();
    const sql = prepare.mock.calls[0][0] as string;
    expect(sql).toContain("sub_product_code = ?");
    expect(sql).toContain("includes_controllers = ?");
    expect(sql).toContain("includes_games = ?");
    expect(sql).toContain("includes_cords = ?");
  });
});

describe("GET /sold-records/sub-products", () => {
  it("requires a product", async () => {
    const { env } = makeDbEnv(() => ({}));

    const res = await sold.request("/sold-records/sub-products", {}, env);

    expect(res.status).toBe(400);
  });

  it("returns distinct sub-product codes", async () => {
    const { env } = makeDbEnv(() => ({
      all: [{ sub_product_code: "RVL-001" }, { sub_product_code: "RVL-101" }],
    }));

    const res = await sold.request(
      "/sold-records/sub-products?product=wii",
      {},
      env,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ codes: ["RVL-001", "RVL-101"] });
  });
});

describe("GET /sold-records/products", () => {
  it("returns distinct products", async () => {
    const { env } = makeDbEnv(() => ({ all: [{ product: "wii" }] }));

    const res = await sold.request("/sold-records/products", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ products: ["wii"] });
  });
});

describe("GET /sold-records/summary", () => {
  it("returns an empty list when there are no records", async () => {
    const { env } = makeDbEnv(() => ({ all: [] }));

    const res = await sold.request("/sold-records/summary", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ products: [] });
  });

  it("groups stats by product and sub-product code, including null codes", async () => {
    const { env } = makeDbEnv(() => ({
      all: [
        { product: "wii", sub_product_code: "RVL-001", sold_price: 10 },
        { product: "wii", sub_product_code: "RVL-001", sold_price: 30 },
        { product: "wii", sub_product_code: null, sold_price: 50 },
        { product: "gamecube", sub_product_code: "DOL-001", sold_price: 20 },
      ],
    }));

    const res = await sold.request("/sold-records/summary", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      products: [
        {
          product: "gamecube",
          overall: { count: 1, average: 20, min: 20, max: 20, median: 20 },
          sub_products: [
            {
              sub_product_code: "DOL-001",
              stats: { count: 1, average: 20, min: 20, max: 20, median: 20 },
            },
          ],
        },
        {
          product: "wii",
          overall: { count: 3, average: 30, min: 10, max: 50, median: 30 },
          sub_products: [
            {
              sub_product_code: null,
              stats: { count: 1, average: 50, min: 50, max: 50, median: 50 },
            },
            {
              sub_product_code: "RVL-001",
              stats: { count: 2, average: 20, min: 10, max: 30, median: 20 },
            },
          ],
        },
      ],
    });
  });
});

describe("POST /sold-records", () => {
  it("creates a record and coerces flags to 0/1", async () => {
    const { env, run } = makeDbEnv((sql) =>
      sql.includes("WHERE id = ?") ? { first: row } : {},
    );

    const res = await sold.request(
      "/sold-records",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          product: "wii",
          sub_product_code: "RVL-001",
          sold_price: 30,
          sold_date: "2026-10-01",
          controllers: true,
          games: false,
          cords: true,
        }),
      },
      env,
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ record: row });

    const insertParams = run.mock.calls[0] as unknown[];
    expect(insertParams[1]).toBe("wii");
    expect(insertParams[2]).toBe("RVL-001");
    expect(insertParams[3]).toBe(30);
    expect(insertParams[4]).toBe("2026-10-01");
    expect(insertParams[5]).toBe(1);
    expect(insertParams[6]).toBe(0);
    expect(insertParams[7]).toBe(1);
  });

  it("defaults sold_date to today and omits empty sub_product_code", async () => {
    const { env, run } = makeDbEnv(() => ({}));

    const res = await sold.request(
      "/sold-records",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: "wii", sold_price: 30 }),
      },
      env,
    );

    expect(res.status).toBe(201);
    const insertParams = run.mock.calls[0] as unknown[];
    expect(insertParams[2]).toBeNull();
    expect(insertParams[4]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rejects an invalid payload", async () => {
    const { env } = makeDbEnv(() => ({}));

    const res = await sold.request(
      "/sold-records",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: "wii", sold_price: -1 }),
      },
      env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_body" });
  });
});
