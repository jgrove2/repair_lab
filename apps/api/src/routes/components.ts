import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  componentCreateSchema,
  componentUpdateSchema,
} from "@repair-lab/shared";
import type { Bindings } from "../bindings.js";
import { getOne, listAll } from "../db/client.js";

export const componentsRoute = new Hono<{ Bindings: Bindings }>();

componentsRoute.get("/", async (c) => {
  const rows = await listAll(c.env.DB, "SELECT * FROM components ORDER BY name ASC");
  return c.json(rows);
});

componentsRoute.get("/:id", async (c) => {
  const row = await getOne(c.env.DB, "SELECT * FROM components WHERE id = ?", c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

componentsRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = componentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  const id = nanoid();
  await c.env.DB.prepare(
    "INSERT INTO components (id, name, category, quantity, location_id, cost_per_unit, sku) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, d.name, d.category ?? null, d.quantity ?? 0, d.location_id ?? null, d.cost_per_unit ?? null, d.sku ?? null)
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM components WHERE id = ?", id);
  return c.json(row, 201);
});

componentsRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getOne(c.env.DB, "SELECT * FROM components WHERE id = ?", id);
  if (!existing) return c.json({ error: "not found" }, 404);
  const body = await c.req.json().catch(() => ({}));
  const parsed = componentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  await c.env.DB.prepare(
    `UPDATE components SET
      name = COALESCE(?, name),
      category = COALESCE(?, category),
      quantity = COALESCE(?, quantity),
      location_id = COALESCE(?, location_id),
      cost_per_unit = COALESCE(?, cost_per_unit),
      sku = COALESCE(?, sku)
     WHERE id = ?`
  )
    .bind(d.name ?? null, d.category ?? null, d.quantity ?? null, d.location_id ?? null, d.cost_per_unit ?? null, d.sku ?? null, id)
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM components WHERE id = ?", id);
  return c.json(row);
});

componentsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getOne(c.env.DB, "SELECT * FROM components WHERE id = ?", id);
  if (!existing) return c.json({ error: "not found" }, 404);
  await c.env.DB.prepare("DELETE FROM components WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
