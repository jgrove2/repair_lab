import { Hono } from "hono";
import { nanoid } from "nanoid";
import { agentIngestSchema } from "@repair-lab/shared";
import type { Listing, PaginatedResponse } from "@repair-lab/shared";
import type { Bindings } from "./bindings.js";
import { requireLogtoAuth } from "./auth.js";

export type ListingSort =
  | "title"
  | "price"
  | "shipping_cost"
  | "total_cost"
  | "condition"
  | "created_at";
export type SortOrder = "asc" | "desc";

// Whitelisted mapping from public sort key to SQL column. Never interpolate a
// client-supplied string into the query; only values from this map reach SQL.
const SORT_COLUMNS: Record<ListingSort, string> = {
  title: "title",
  price: "price",
  shipping_cost: "shipping_cost",
  total_cost: "total_cost",
  condition: "condition",
  created_at: "created_at",
};

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export type ListingQuery = {
  page: number;
  pageSize: number;
  sort: ListingSort;
  order: SortOrder;
  offset: number;
  product?: string;
  q?: string;
  condition?: string;
  controllers?: 0 | 1;
  games?: 0 | 1;
  cords?: 0 | 1;
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

function isSort(value: string | undefined): value is ListingSort {
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

export function parseListingQuery(
  query: Record<string, string | undefined>,
): ListingQuery {
  const page = clampInt(query.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInt(query.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const sort: ListingSort = isSort(query.sort) ? query.sort : "title";
  const order: SortOrder = query.order === "desc" ? "desc" : "asc";

  const product = query.product?.trim();
  const q = query.q?.trim();
  const condition = query.condition?.trim();

  return {
    page,
    pageSize,
    sort,
    order,
    offset: (page - 1) * pageSize,
    ...(product ? { product } : {}),
    ...(q ? { q } : {}),
    ...(condition ? { condition } : {}),
    ...(parseFlag(query.controllers) !== undefined
      ? { controllers: parseFlag(query.controllers) }
      : {}),
    ...(parseFlag(query.games) !== undefined
      ? { games: parseFlag(query.games) }
      : {}),
    ...(parseFlag(query.cords) !== undefined
      ? { cords: parseFlag(query.cords) }
      : {}),
  };
}

// Escape the SQLite LIKE metacharacters so user input is matched literally.
// Paired with `ESCAPE '\'` in the query.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

const SELECT_LISTING = `SELECT id, product, item_id, title, short_description, price,
         currency, url, condition, shipping_cost, shipping_currency,
         shipping_cost_type, total_cost, includes_controllers, includes_games,
         includes_cords, created_at, updated_at
    FROM listings`;

const app = new Hono<{ Bindings: Bindings }>();

app.get("/listings/filters", requireLogtoAuth(), async (c) => {
  const products = await c.env.DB.prepare(
    "SELECT DISTINCT product FROM listings ORDER BY product ASC",
  ).all<{ product: string }>();
  const conditions = await c.env.DB.prepare(
    "SELECT DISTINCT condition FROM listings WHERE condition IS NOT NULL ORDER BY condition ASC",
  ).all<{ condition: string }>();

  return c.json({
    products: (products.results ?? []).map((row) => row.product),
    conditions: (conditions.results ?? []).map((row) => row.condition),
  });
});

app.get("/listings", requireLogtoAuth(), async (c) => {
  const {
    page,
    pageSize,
    sort,
    order,
    offset,
    product,
    q,
    condition,
    controllers,
    games,
    cords,
  } = parseListingQuery({
    page: c.req.query("page"),
    pageSize: c.req.query("pageSize"),
    sort: c.req.query("sort"),
    order: c.req.query("order"),
    product: c.req.query("product"),
    q: c.req.query("q"),
    condition: c.req.query("condition"),
    controllers: c.req.query("controllers"),
    games: c.req.query("games"),
    cords: c.req.query("cords"),
  });

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (product) {
    where.push("product = ?");
    params.push(product);
  }
  if (q) {
    const like = `%${escapeLike(q)}%`;
    where.push("(title LIKE ? ESCAPE '\\' OR short_description LIKE ? ESCAPE '\\')");
    params.push(like, like);
  }
  if (condition) {
    where.push("condition = ?");
    params.push(condition);
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

  const whereSql = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM listings${whereSql}`,
  )
    .bind(...params)
    .first<{ total: number }>();
  const total = countRow?.total ?? 0;

  const { results } = await c.env.DB.prepare(
    `${SELECT_LISTING}${whereSql}
      ORDER BY ${SORT_COLUMNS[sort]} ${order.toUpperCase()}, id ASC
      LIMIT ? OFFSET ?`,
  )
    .bind(...params, pageSize, offset)
    .all<Listing>();

  const body: PaginatedResponse<Listing> = {
    data: results ?? [],
    page,
    pageSize,
    total,
  };

  return c.json(body);
});

app.post("/listings", requireLogtoAuth(), async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const parsed = agentIngestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const rows: { product: string; itemId: string; values: unknown[] }[] = [];
  for (const [product, listings] of Object.entries(parsed.data)) {
    for (const listing of listings) {
      const included = listing.included ?? {};
      rows.push({
        product,
        itemId: listing.item_id,
        values: [
          listing.title,
          listing.short_description ?? null,
          listing.price ?? null,
          listing.currency ?? null,
          listing.url ?? null,
          listing.condition ?? null,
          listing.shipping_cost ?? null,
          listing.shipping_currency ?? null,
          listing.shipping_cost_type ?? null,
          listing.total_cost ?? null,
          included.controllers ? 1 : 0,
          included.games ? 1 : 0,
          included.cords ? 1 : 0,
        ],
      });
    }
  }

  // Find which item ids already exist so re-runs update instead of inserting.
  // D1 caps the number of bound parameters per query, so chunk the IN clause.
  const existing = new Set<string>();
  const itemIds = [...new Set(rows.map((row) => row.itemId))];
  const IN_CLAUSE_BATCH_SIZE = 100;
  for (let i = 0; i < itemIds.length; i += IN_CLAUSE_BATCH_SIZE) {
    const batch = itemIds.slice(i, i + IN_CLAUSE_BATCH_SIZE);
    const placeholders = batch.map(() => "?").join(", ");
    const { results } = await c.env.DB.prepare(
      `SELECT item_id FROM listings WHERE item_id IN (${placeholders})`,
    )
      .bind(...batch)
      .all<{ item_id: string }>();
    for (const row of results ?? []) {
      existing.add(row.item_id);
    }
  }

  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const id = nanoid();
    const isNew = !existing.has(row.itemId);
    await c.env.DB.prepare(
      `INSERT INTO listings (
         id, product, item_id, title, short_description, price, currency, url,
         condition, shipping_cost, shipping_currency, shipping_cost_type,
         total_cost, includes_controllers, includes_games, includes_cords
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET
         product = excluded.product,
         title = excluded.title,
         short_description = excluded.short_description,
         price = excluded.price,
         currency = excluded.currency,
         url = excluded.url,
         condition = excluded.condition,
         shipping_cost = excluded.shipping_cost,
         shipping_currency = excluded.shipping_currency,
         shipping_cost_type = excluded.shipping_cost_type,
         total_cost = excluded.total_cost,
         includes_controllers = excluded.includes_controllers,
         includes_games = excluded.includes_games,
         includes_cords = excluded.includes_cords,
         updated_at = datetime('now')`,
    )
      .bind(id, row.product, row.itemId, ...row.values)
      .run();

    if (isNew) {
      inserted += 1;
      existing.add(row.itemId);
    } else {
      updated += 1;
    }
  }

  return c.json({ inserted, updated, total: inserted + updated });
});

export default app;
