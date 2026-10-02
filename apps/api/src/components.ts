import { Hono } from "hono";
import { nanoid } from "nanoid";
import { componentUpsertSchema } from "@repair-lab/shared";
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
export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 50;

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

// Escape the SQLite LIKE metacharacters so user input is matched literally.
// Paired with `ESCAPE '\'` in the query.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

const SELECT_COMPONENT = `SELECT c.id, c.name, c.category, c.quantity, c.location_id,
         c.cost_per_unit, c.sku, l.name AS location_name
    FROM components c
    LEFT JOIN locations l ON l.id = c.location_id`;

async function getComponentById(
  env: Bindings,
  id: string,
): Promise<ComponentListItem | null> {
  return env.DB.prepare(`${SELECT_COMPONENT} WHERE c.id = ?`)
    .bind(id)
    .first<ComponentListItem>();
}

type ResolvedLocation = string | null;

async function resolveLocation(
  env: Bindings,
  input: { location_id?: string; location_name?: string; location_type?: string },
): Promise<ResolvedLocation> {
  if (input.location_id) {
    return input.location_id;
  }
  const name = input.location_name?.trim();
  if (!name) {
    return null;
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM locations WHERE lower(name) = lower(?) LIMIT 1",
  )
    .bind(name)
    .first<{ id: string }>();
  if (existing) {
    return existing.id;
  }

  const id = nanoid();
  await env.DB.prepare(
    "INSERT INTO locations (id, name, type, sort_order) VALUES (?, ?, ?, 0)",
  )
    .bind(id, name, input.location_type ?? "drawer")
    .run();
  return id;
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
    `${SELECT_COMPONENT}
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

// Typeahead for the add-component dialog. Prefix match on name, ordered by
// name so the closest matches surface first. A blank query returns the first
// page of components so the dialog can show a browsable list on focus.
app.get("/components/search", requireLogtoAuth(), async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  const limit = clampInt(
    c.req.query("limit"),
    DEFAULT_SEARCH_LIMIT,
    1,
    MAX_SEARCH_LIMIT,
  );

  const { results } = await c.env.DB.prepare(
    `${SELECT_COMPONENT}
      WHERE c.name LIKE ? ESCAPE '\\'
      ORDER BY c.name ASC
      LIMIT ?`,
  )
    .bind(`${escapeLike(q)}%`, limit)
    .all<ComponentListItem>();

  return c.json({ data: results ?? [] });
});

app.get("/locations/search", requireLogtoAuth(), async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  const limit = clampInt(
    c.req.query("limit"),
    DEFAULT_SEARCH_LIMIT,
    1,
    MAX_SEARCH_LIMIT,
  );

  if (!q) {
    return c.json({ data: [] });
  }

  const { results } = await c.env.DB.prepare(
    `SELECT id, name, type, parent_id, sort_order
       FROM locations
      WHERE name LIKE ? ESCAPE '\\'
      ORDER BY name ASC
      LIMIT ?`,
  )
    .bind(`${escapeLike(q)}%`, limit)
    .all();

  return c.json({ data: results ?? [] });
});

// Add to inventory: resolve a location (creating it if the typed name is new),
// then either increment an existing component's quantity or insert a new row.
app.post("/components", requireLogtoAuth(), async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const parsed = componentUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const input = parsed.data;
  const name = input.name.trim();
  const quantity = input.quantity ?? 1;
  const locationId = await resolveLocation(c.env, input);

  const existing = await c.env.DB.prepare(
    "SELECT id, quantity FROM components WHERE lower(name) = lower(?) LIMIT 1",
  )
    .bind(name)
    .first<{ id: string; quantity: number }>();

  let componentId: string;
  let created: boolean;

  if (existing) {
    componentId = existing.id;
    created = false;
    await c.env.DB.prepare("UPDATE components SET quantity = ? WHERE id = ?")
      .bind(existing.quantity + quantity, componentId)
      .run();
  } else {
    componentId = nanoid();
    created = true;
    await c.env.DB.prepare(
      `INSERT INTO components (id, name, category, quantity, location_id, cost_per_unit, sku)
       VALUES (?, ?, NULL, ?, ?, NULL, NULL)`,
    )
      .bind(componentId, name, quantity, locationId)
      .run();
  }

  const component = await getComponentById(c.env, componentId);
  return c.json({ component, created }, created ? 201 : 200);
});

export default app;
