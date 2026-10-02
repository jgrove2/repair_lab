import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "./bindings";

vi.mock("./auth.js", () => ({
  requireLogtoAuth: () => async (_c: unknown, next: () => Promise<void>) => {
    await next();
  },
}));

import components, {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parseComponentQuery,
} from "./components";

function makeEnv(opts: { total?: number; results?: unknown[] } = {}) {
  const all = vi
    .fn()
    .mockResolvedValue({ results: opts.results ?? [], success: true, meta: {} });
  const bind = vi.fn().mockReturnValue({ all });
  const first = vi.fn().mockResolvedValue({ total: opts.total ?? 0 });
  const prepare = vi.fn((sql: string) =>
    sql.includes("COUNT(*)") ? { first } : { bind },
  );

  const env = {
    DB: { prepare } as unknown as D1Database,
    R2: {} as R2Bucket,
  } as Bindings;

  return { env, prepare, bind, all, first };
}

describe("parseComponentQuery", () => {
  it("applies defaults", () => {
    expect(parseComponentQuery({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      sort: "name",
      order: "asc",
      offset: 0,
    });
  });

  it("parses page, pageSize and computes the offset", () => {
    expect(parseComponentQuery({ page: "3", pageSize: "25" })).toMatchObject({
      page: 3,
      pageSize: 25,
      offset: 50,
    });
  });

  it("clamps page to a minimum of 1", () => {
    expect(parseComponentQuery({ page: "0" }).page).toBe(1);
    expect(parseComponentQuery({ page: "-5" }).page).toBe(1);
  });

  it("clamps pageSize to the allowed range", () => {
    expect(parseComponentQuery({ pageSize: "0" }).pageSize).toBe(1);
    expect(parseComponentQuery({ pageSize: "9999" }).pageSize).toBe(
      MAX_PAGE_SIZE,
    );
  });

  it("falls back to defaults for non-numeric input", () => {
    expect(parseComponentQuery({ page: "abc", pageSize: "abc" })).toMatchObject({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it("accepts a valid sort and falls back otherwise", () => {
    expect(parseComponentQuery({ sort: "quantity" }).sort).toBe("quantity");
    expect(parseComponentQuery({ sort: "location" }).sort).toBe("location");
    expect(parseComponentQuery({ sort: "bogus" }).sort).toBe("name");
  });

  it("only accepts desc as an explicit order", () => {
    expect(parseComponentQuery({ order: "desc" }).order).toBe("desc");
    expect(parseComponentQuery({ order: "asc" }).order).toBe("asc");
    expect(parseComponentQuery({ order: "sideways" }).order).toBe("asc");
  });
});

describe("GET /components", () => {
  it("returns a paginated payload with the total count", async () => {
    const row = {
      id: "c1",
      name: "10k resistor",
      category: "resistor",
      quantity: 42,
      location_id: "l1",
      cost_per_unit: 0.01,
      sku: "R-10K",
      location_name: "Drawer A",
    };
    const { env } = makeEnv({ total: 1, results: [row] });

    const res = await components.request("/components", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: [row],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 1,
    });
  });

  it("returns an empty list when there are no components", async () => {
    const { env } = makeEnv({ total: 0, results: [] });

    const res = await components.request("/components", {}, env);

    expect(await res.json()).toEqual({
      data: [],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 0,
    });
  });

  it("passes the page size and offset to the data query", async () => {
    const { env, prepare, bind } = makeEnv();

    await components.request("/components?page=3&pageSize=5", {}, env);

    expect(prepare.mock.calls[1][0]).toContain("LIMIT ? OFFSET ?");
    expect(bind).toHaveBeenCalledWith(5, 10);
  });

  it("orders by the requested whitelisted column", async () => {
    const { env, prepare } = makeEnv();

    await components.request(
      "/components?sort=location&order=desc",
      {},
      env,
    );

    expect(prepare.mock.calls[1][0]).toContain("ORDER BY l.name DESC");
  });

  it("ignores an unknown sort value instead of interpolating it", async () => {
    const { env, prepare } = makeEnv();

    await components.request("/components?sort=;DROP%20TABLE%20components", {}, env);

    const dataSql = prepare.mock.calls[1][0] as string;
    expect(dataSql).toContain("ORDER BY c.name ASC");
    expect(dataSql).not.toContain("DROP");
  });
});
