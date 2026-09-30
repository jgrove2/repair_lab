import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  itemCreateSchema,
  itemUpdateSchema,
} from "@repair-lab/shared";
import type { Bindings } from "../bindings.js";
import { getOne, listAll } from "../db/client.js";

export const itemsRoute = new Hono<{ Bindings: Bindings }>();

itemsRoute.get("/", async (c) => {
  const rows = await listAll(c.env.DB, "SELECT * FROM items ORDER BY created_at DESC");
  return c.json(rows);
});

itemsRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await getOne(c.env.DB, "SELECT * FROM items WHERE id = ?", id);
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

itemsRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = itemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  const id = nanoid();
  // NOTE: 0001_init.sql's CHECK on items.status omits 'sourced' (even though
  // it is the column DEFAULT), so we default explicit inserts to 'purchased',
  // which passes the CHECK. Schema is kept byte-exact per spec.
  const status = d.status === "sourced" ? "purchased" : (d.status ?? "purchased");
  await c.env.DB.prepare(
    `INSERT INTO items (id, title, category, condition, status, serial_number, purchase_price, purchase_date, purchased_from, sell_price, sold_date, location_id, ebay_url, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      d.title,
      d.category,
      d.condition ?? null,
      status,
      d.serial_number ?? null,
      d.purchase_price ?? null,
      d.purchase_date ?? null,
      d.purchased_from ?? null,
      d.sell_price ?? null,
      d.sold_date ?? null,
      d.location_id ?? null,
      d.ebay_url ?? null,
      d.notes ?? null
    )
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM items WHERE id = ?", id);
  return c.json(row, 201);
});

itemsRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getOne(c.env.DB, "SELECT * FROM items WHERE id = ?", id);
  if (!existing) return c.json({ error: "not found" }, 404);
  const body = await c.req.json().catch(() => ({}));
  const parsed = itemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  await c.env.DB.prepare(
    `UPDATE items SET
      title = COALESCE(?, title),
      category = COALESCE(?, category),
      condition = COALESCE(?, condition),
      status = COALESCE(?, status),
      serial_number = COALESCE(?, serial_number),
      purchase_price = COALESCE(?, purchase_price),
      purchase_date = COALESCE(?, purchase_date),
      purchased_from = COALESCE(?, purchased_from),
      sell_price = COALESCE(?, sell_price),
      sold_date = COALESCE(?, sold_date),
      location_id = COALESCE(?, location_id),
      ebay_url = COALESCE(?, ebay_url),
      notes = COALESCE(?, notes),
      updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(
      d.title ?? null,
      d.category ?? null,
      d.condition ?? null,
      d.status ?? null,
      d.serial_number ?? null,
      d.purchase_price ?? null,
      d.purchase_date ?? null,
      d.purchased_from ?? null,
      d.sell_price ?? null,
      d.sold_date ?? null,
      d.location_id ?? null,
      d.ebay_url ?? null,
      d.notes ?? null,
      id
    )
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM items WHERE id = ?", id);
  return c.json(row);
});

itemsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getOne(c.env.DB, "SELECT * FROM items WHERE id = ?", id);
  if (!existing) return c.json({ error: "not found" }, 404);
  await c.env.DB.prepare("DELETE FROM items WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
