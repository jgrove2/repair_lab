import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  locationCreateSchema,
  locationUpdateSchema,
} from "@repair-lab/shared";
import type { Bindings } from "../bindings.js";
import { getOne, listAll } from "../db/client.js";

export const locationsRoute = new Hono<{ Bindings: Bindings }>();

locationsRoute.get("/", async (c) => {
  const rows = await listAll(c.env.DB, "SELECT * FROM locations ORDER BY sort_order ASC, name ASC");
  return c.json(rows);
});

locationsRoute.get("/:id", async (c) => {
  const row = await getOne(c.env.DB, "SELECT * FROM locations WHERE id = ?", c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

locationsRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = locationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  const id = nanoid();
  await c.env.DB.prepare("INSERT INTO locations (id, name, type, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)")
    .bind(id, d.name, d.type ?? "drawer", d.parent_id ?? null, d.sort_order ?? 0)
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM locations WHERE id = ?", id);
  return c.json(row, 201);
});

locationsRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getOne(c.env.DB, "SELECT * FROM locations WHERE id = ?", id);
  if (!existing) return c.json({ error: "not found" }, 404);
  const body = await c.req.json().catch(() => ({}));
  const parsed = locationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  await c.env.DB.prepare(
    "UPDATE locations SET name = COALESCE(?, name), type = COALESCE(?, type), parent_id = COALESCE(?, parent_id), sort_order = COALESCE(?, sort_order) WHERE id = ?"
  )
    .bind(d.name ?? null, d.type ?? null, d.parent_id ?? null, d.sort_order ?? null, id)
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM locations WHERE id = ?", id);
  return c.json(row);
});

locationsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getOne(c.env.DB, "SELECT * FROM locations WHERE id = ?", id);
  if (!existing) return c.json({ error: "not found" }, 404);
  await c.env.DB.prepare("DELETE FROM locations WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
