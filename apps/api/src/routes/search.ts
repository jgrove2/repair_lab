import { Hono } from "hono";
import type { Bindings } from "../bindings.js";

export const searchRoute = new Hono<{ Bindings: Bindings }>();

// Unified FTS5 search across items + components, ranked with bm25.
searchRoute.get("/", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (!q) return c.json({ items: [], components: [] });

  const db = c.env.DB;

  const itemsRes = await db
    .prepare(
      `SELECT items.* FROM items_fts
       JOIN items ON items.rowid = items_fts.rowid
       WHERE items_fts MATCH ?
       ORDER BY bm25(items_fts)
       LIMIT 20`
    )
    .bind(q)
    .all()
    .catch(() => ({ results: [] as unknown[] }));

  const componentsRes = await db
    .prepare(
      `SELECT components.* FROM components_fts
       JOIN components ON components.rowid = components_fts.rowid
       WHERE components_fts MATCH ?
       ORDER BY bm25(components_fts)
       LIMIT 20`
    )
    .bind(q)
    .all()
    .catch(() => ({ results: [] as unknown[] }));

  return c.json({
    items: itemsRes.results ?? [],
    components: componentsRes.results ?? [],
  });
});
