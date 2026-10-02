import { Hono } from "hono";
import type { ComponentListItem, PaginatedResponse } from "@repair-lab/shared";
import type { Bindings } from "./bindings.js";
import { requireLogtoAuth } from "./auth.js";

export type ComponentSort = "name" | "quantity" | "location";
export type SortOrder = "asc" | "desc";

// Whitelisted mapping from public sort key to SQL column. Never interpolate a
// client-supplied string into the query; only values from this map reach SQL.
const SORT_COLUMNS: Record<ComponentSort, string> = {
  name: "c.name",
  quantity: "c.quantity",
  location: "l.name",
};

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export type ComponentQuery = {
  page: number;
  pageSize: number;
  sort: ComponentSort;
  order: SortOrder;
  offset: number;
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

function isSort(value: string | undefined): value is ComponentSort {
  return value === "name" || value === "quantity" || value === "location";
}

export function parseComponentQuery(
  query: Record<string, string | undefined>,
): ComponentQuery {
  const page = clampInt(query.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInt(query.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const sort = isSort(query.sort) ? query.sort : "name";
  const order: SortOrder = query.order === "desc" ? "desc" : "asc";

  return { page, pageSize, sort, order, offset: (page - 1) * pageSize };
}

const app = new Hono<{ Bindings: Bindings }>();

app.get("/components", requireLogtoAuth(), async (c) => {
  const { page, pageSize, sort, order, offset } = parseComponentQuery({
    page: c.req.query("page"),
    pageSize: c.req.query("pageSize"),
    sort: c.req.query("sort"),
    order: c.req.query("order"),
  });

  const countRow = await c.env.DB.prepare(
    "SELECT COUNT(*) AS total FROM components",
  ).first<{ total: number }>();
  const total = countRow?.total ?? 0;

  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.name, c.category, c.quantity, c.location_id,
            c.cost_per_unit, c.sku, l.name AS location_name
       FROM components c
       LEFT JOIN locations l ON l.id = c.location_id
      ORDER BY ${SORT_COLUMNS[sort]} ${order.toUpperCase()}, c.id ASC
      LIMIT ? OFFSET ?`,
  )
    .bind(pageSize, offset)
    .all<ComponentListItem>();

  const body: PaginatedResponse<ComponentListItem> = {
    data: results ?? [],
    page,
    pageSize,
    total,
  };

  return c.json(body);
});

export default app;
