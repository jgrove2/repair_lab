import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  preferenceCreateSchema,
  preferenceUpdateSchema,
} from "@repair-lab/shared";
import type { Bindings } from "../bindings.js";
import { getOne, listAll } from "../db/client.js";

export const preferencesRoute = new Hono<{ Bindings: Bindings }>();

preferencesRoute.get("/", async (c) => {
  const rows = await listAll(c.env.DB, "SELECT * FROM preferences ORDER BY priority DESC, name ASC");
  return c.json(rows);
});

preferencesRoute.get("/:id", async (c) => {
  const row = await getOne(c.env.DB, "SELECT * FROM preferences WHERE id = ?", c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

preferencesRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = preferenceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  const id = nanoid();
  await c.env.DB.prepare(
    "INSERT INTO preferences (id, name, search_terms, category, max_price, condition, active, priority, last_run_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, d.name, d.search_terms, d.category ?? null, d.max_price ?? null, d.condition ?? null, d.active ?? 1, d.priority ?? 0, d.last_run_at ?? null)
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM preferences WHERE id = ?", id);
  return c.json(row, 201);
});

preferencesRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getOne(c.env.DB, "SELECT * FROM preferences WHERE id = ?", id);
  if (!existing) return c.json({ error: "not found" }, 404);
  const body = await c.req.json().catch(() => ({}));
  const parsed = preferenceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  await c.env.DB.prepare(
    `UPDATE preferences SET
      name = COALESCE(?, name),
      search_terms = COALESCE(?, search_terms),
      category = COALESCE(?, category),
      max_price = COALESCE(?, max_price),
      condition = COALESCE(?, condition),
      active = COALESCE(?, active),
      priority = COALESCE(?, priority),
      last_run_at = COALESCE(?, last_run_at)
     WHERE id = ?`
  )
    .bind(d.name ?? null, d.search_terms ?? null, d.category ?? null, d.max_price ?? null, d.condition ?? null, d.active ?? null, d.priority ?? null, d.last_run_at ?? null, id)
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM preferences WHERE id = ?", id);
  return c.json(row);
});

preferencesRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getOne(c.env.DB, "SELECT * FROM preferences WHERE id = ?", id);
  if (!existing) return c.json({ error: "not found" }, 404);
  await c.env.DB.prepare("DELETE FROM preferences WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
