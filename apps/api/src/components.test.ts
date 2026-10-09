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

type DbHandler = (sql: string, params: unknown[]) => {
  all?: unknown[];
  first?: unknown;
};

function makeDbEnv(handler: DbHandler) {
  const run = vi.fn().mockResolvedValue({ success: true, meta: {} });
  const statement = (sql: string, params: unknown[]) => ({
    first: () => Promise.resolve(handler(sql, params).first ?? null),
    all: () =>
      Promise.resolve({ results: handler(sql, params).all ?? [], success: true }),
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

describe("GET /components/search", () => {
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

  it("returns prefix matches on name", async () => {
    const { env } = makeDbEnv((sql) =>
      sql.includes("FROM components c") ? { all: [row] } : {},
    );

    const res = await components.request("/components/search?q=10k", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [row] });
  });

  it("lists components for a blank query", async () => {
    const { env, prepare } = makeDbEnv((sql) =>
      sql.includes("FROM components c") ? { all: [row] } : {},
    );

    const res = await components.request("/components/search?q=", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [row] });
    expect(prepare).toHaveBeenCalled();
  });
});

describe("GET /locations/search", () => {
  it("returns matching locations", async () => {
    const location = {
      id: "l1",
      name: "Drawer A",
      type: "drawer",
      parent_id: null,
      sort_order: 0,
    };
    const { env } = makeDbEnv((sql) =>
      sql.includes("FROM locations") ? { all: [location] } : {},
    );

    const res = await components.request("/locations/search?q=Draw", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [location] });
  });
});

describe("POST /components", () => {
  const createdRow = {
    id: "new-component",
    name: "Cap",
    category: null,
    quantity: 3,
    location_id: "new-location",
    cost_per_unit: null,
    sku: null,
    location_name: "Drawer A",
  };

  it("creates a new location and a new component", async () => {
    const { env, prepare, run } = makeDbEnv((sql) => {
      if (sql.includes("FROM locations WHERE lower(name)")) {
        return { first: null };
      }
      if (sql.includes("FROM components WHERE lower(name)")) {
        return { first: null };
      }
      if (sql.includes("SELECT c.id, c.name")) {
        return { first: createdRow };
      }
      return {};
    });

    const res = await components.request(
      "/components",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Cap",
          quantity: 3,
          location_name: "Drawer A",
        }),
      },
      env,
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ component: createdRow, created: true });
    expect(
      prepare.mock.calls.some(([sql]) =>
        (sql as string).includes("INSERT INTO locations"),
      ),
    ).toBe(true);
    expect(
      prepare.mock.calls.some(([sql]) =>
        (sql as string).includes("INSERT INTO components"),
      ),
    ).toBe(true);
    expect(run).toHaveBeenCalled();
  });

  it("adds the quantity to an existing component", async () => {
    const merged = { ...createdRow, id: "c1", quantity: 8 };
    const { env, run } = makeDbEnv((sql) => {
      if (sql.includes("FROM components WHERE lower(name)")) {
        return { first: { id: "c1", quantity: 5 } };
      }
      if (sql.includes("SELECT c.id, c.name")) {
        return { first: merged };
      }
      return {};
    });

    const res = await components.request(
      "/components",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Cap", quantity: 3, location_id: "l1" }),
      },
      env,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ component: merged, created: false });
    expect(run).toHaveBeenCalledWith(8, "c1");
  });

  it("rejects a missing name", async () => {
    const { env } = makeDbEnv(() => ({}));

    const res = await components.request(
      "/components",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "" }),
      },
      env,
    );

    expect(res.status).toBe(400);
  });

  it("rejects malformed JSON", async () => {
    const { env } = makeDbEnv(() => ({}));

    const res = await components.request(
      "/components",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json",
      },
      env,
    );

    expect(res.status).toBe(400);
  });
});
