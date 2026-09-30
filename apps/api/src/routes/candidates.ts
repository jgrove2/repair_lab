import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  candidateCreateSchema,
  candidateUpdateSchema,
} from "@repair-lab/shared";
import type { Bindings } from "../bindings.js";
import { getOne, listAll } from "../db/client.js";

export const candidatesRoute = new Hono<{ Bindings: Bindings }>();

candidatesRoute.get("/", async (c) => {
  const preferenceId = c.req.query("preference_id");
  if (preferenceId) {
    const res = await c.env.DB.prepare("SELECT * FROM candidates WHERE preference_id = ? ORDER BY discovered_at DESC")
      .bind(preferenceId)
      .all();
    return c.json(res.results ?? []);
  }
  const rows = await listAll(c.env.DB, "SELECT * FROM candidates ORDER BY discovered_at DESC");
  return c.json(rows);
});

candidatesRoute.get("/:id", async (c) => {
  const row = await getOne(c.env.DB, "SELECT * FROM candidates WHERE id = ?", c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

candidatesRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = candidateCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  const id = nanoid();
  await c.env.DB.prepare(
    "INSERT INTO candidates (id, preference_id, ebay_item_id, title, price, listing_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, d.preference_id ?? null, d.ebay_item_id ?? null, d.title, d.price ?? null, d.listing_url ?? null, d.status ?? "new")
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM candidates WHERE id = ?", id);
  return c.json(row, 201);
});

candidatesRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getOne(c.env.DB, "SELECT * FROM candidates WHERE id = ?", id);
  if (!existing) return c.json({ error: "not found" }, 404);
  const body = await c.req.json().catch(() => ({}));
  const parsed = candidateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  await c.env.DB.prepare(
    `UPDATE candidates SET
      preference_id = COALESCE(?, preference_id),
      ebay_item_id = COALESCE(?, ebay_item_id),
      title = COALESCE(?, title),
      price = COALESCE(?, price),
      listing_url = COALESCE(?, listing_url),
      status = COALESCE(?, status)
     WHERE id = ?`
  )
    .bind(d.preference_id ?? null, d.ebay_item_id ?? null, d.title ?? null, d.price ?? null, d.listing_url ?? null, d.status ?? null, id)
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM candidates WHERE id = ?", id);
  return c.json(row);
});

candidatesRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getOne(c.env.DB, "SELECT * FROM candidates WHERE id = ?", id);
  if (!existing) return c.json({ error: "not found" }, 404);
  await c.env.DB.prepare("DELETE FROM candidates WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
