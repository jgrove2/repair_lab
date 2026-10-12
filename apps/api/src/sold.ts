import { Hono } from "hono";
import { nanoid } from "nanoid";
import { soldRecordCreateSchema } from "@repair-lab/shared";
import type {
  PaginatedResponse,
  SoldPriceStats,
  SoldRecord,
} from "@repair-lab/shared";
import type { Bindings } from "./bindings.js";
import { requireLogtoAuth } from "./auth.js";

export type SoldRecordSort = "sold_date" | "sold_price" | "product";
export type SortOrder = "asc" | "desc";

// Whitelisted mapping from public sort key to SQL column. Never interpolate a
// client-supplied string into the query; only values from this map reach SQL.
const SORT_COLUMNS: Record<SoldRecordSort, string> = {
  sold_date: "sold_date",
  sold_price: "sold_price",
  product: "product",
};

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export type SoldRecordQuery = {
  page: number;
  pageSize: number;
  sort: SoldRecordSort;
  order: SortOrder;
  offset: number;
  product?: string;
};

function clampInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

function isSort(value: string | undefined): value is SoldRecordSort {
  return (
    value !== undefined &&
    Object.prototype.hasOwnProperty.call(SORT_COLUMNS, value)
  );
}

function parseFlag(value: string | undefined): 0 | 1 | undefined {
  if (value === "0") {
    return 0;
  }
  if (value === "1") {
    return 1;
  }
  return undefined;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseSoldRecordQuery(
  query: Record<string, string | undefined>,
): SoldRecordQuery {
  const page = clampInt(query.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInt(query.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const sort: SoldRecordSort = isSort(query.sort) ? query.sort : "sold_date";
  const order: SortOrder = query.order === "asc" ? "asc" : "desc";
  const product = query.product?.trim();

  return {
    page,
    pageSize,
    sort,
    order,
    offset: (page - 1) * pageSize,
    ...(product ? { product } : {}),
  };
}

// Compute count/average/min/max/median from an array of sold prices. The
// dataset is manually entered and small, so stats are computed in JS rather
// than leaning on SQLite (which has no built-in median aggregate).
export function computeStats(prices: number[]): SoldPriceStats {
  const count = prices.length;
  if (count === 0) {
    return { count: 0, average: null, min: null, max: null, median: null };
  }
  const sorted = [...prices].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mid = Math.floor(count / 2);
  const median =
    count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { count, average: sum / count, min, max, median };
}

const SELECT_SOLD = `SELECT id, product, sub_product_code, sold_price, sold_date,
         includes_controllers, includes_games, includes_cords,
         created_at, updated_at
    FROM sold_records`;

const app = new Hono<{ Bindings: Bindings }>();

app.get("/sold-records/products", requireLogtoAuth(), async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT DISTINCT product FROM sold_records ORDER BY product ASC",
  ).all<{ product: string }>();

  return c.json({ products: (results ?? []).map((row) => row.product) });
});

app.get("/sold-records/sub-products", requireLogtoAuth(), async (c) => {
  const product = c.req.query("product")?.trim();
  if (!product) {
    return c.json({ error: "missing_product" }, 400);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT DISTINCT sub_product_code
       FROM sold_records
      WHERE product = ? AND sub_product_code IS NOT NULL
      ORDER BY sub_product_code ASC`,
  )
    .bind(product)
    .all<{ sub_product_code: string }>();

  return c.json({
    codes: (results ?? []).map((row) => row.sub_product_code),
  });
});

app.get("/sold-records/average", requireLogtoAuth(), async (c) => {
  const product = c.req.query("product")?.trim();
  if (!product) {
    return c.json({ error: "missing_product" }, 400);
  }

  const subProductCode = c.req.query("sub_product_code")?.trim();
  const controllers = parseFlag(c.req.query("controllers"));
  const games = parseFlag(c.req.query("games"));
  const cords = parseFlag(c.req.query("cords"));

  const where: string[] = ["product = ?"];
  const params: (string | number)[] = [product];

  if (subProductCode) {
    where.push("sub_product_code = ?");
    params.push(subProductCode);
  }
  if (controllers !== undefined) {
    where.push("includes_controllers = ?");
    params.push(controllers);
  }
  if (games !== undefined) {
    where.push("includes_games = ?");
    params.push(games);
  }
  if (cords !== undefined) {
    where.push("includes_cords = ?");
    params.push(cords);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT sold_price FROM sold_records WHERE ${where.join(" AND ")}`,
  )
    .bind(...params)
    .all<{ sold_price: number }>();

  const prices = (results ?? []).map((row) => row.sold_price);
  return c.json(computeStats(prices));
});

app.get("/sold-records", requireLogtoAuth(), async (c) => {
  const { page, pageSize, sort, order, offset, product } = parseSoldRecordQuery({
    page: c.req.query("page"),
    pageSize: c.req.query("pageSize"),
    sort: c.req.query("sort"),
    order: c.req.query("order"),
    product: c.req.query("product"),
  });

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (product) {
    where.push("product = ?");
    params.push(product);
  }
  const whereSql = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM sold_records${whereSql}`,
  )
    .bind(...params)
    .first<{ total: number }>();
  const total = countRow?.total ?? 0;

  const { results } = await c.env.DB.prepare(
    `${SELECT_SOLD}${whereSql}
      ORDER BY ${SORT_COLUMNS[sort]} ${order.toUpperCase()}, id ASC
      LIMIT ? OFFSET ?`,
  )
    .bind(...params, pageSize, offset)
    .all<SoldRecord>();

  const body: PaginatedResponse<SoldRecord> = {
    data: results ?? [],
    page,
    pageSize,
    total,
  };

  return c.json(body);
});

app.post("/sold-records", requireLogtoAuth(), async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const parsed = soldRecordCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const input = parsed.data;
  const id = nanoid();
  const subProductCode = input.sub_product_code?.trim() || null;
  const soldDate = input.sold_date ?? todayIsoDate();

  await c.env.DB.prepare(
    `INSERT INTO sold_records (
       id, product, sub_product_code, sold_price, sold_date,
       includes_controllers, includes_games, includes_cords
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      input.product.trim(),
      subProductCode,
      input.sold_price,
      soldDate,
      input.controllers ? 1 : 0,
      input.games ? 1 : 0,
      input.cords ? 1 : 0,
    )
    .run();

  const record = await c.env.DB.prepare(`${SELECT_SOLD} WHERE id = ?`)
    .bind(id)
    .first<SoldRecord>();

  return c.json({ record }, 201);
});

export default app;
