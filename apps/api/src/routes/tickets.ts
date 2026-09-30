import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  ticketCreateSchema,
  ticketUpdateSchema,
} from "@repair-lab/shared";
import type { Bindings } from "../bindings.js";
import { getOne, listAll } from "../db/client.js";

export const ticketsRoute = new Hono<{ Bindings: Bindings }>();

ticketsRoute.get("/", async (c) => {
  const rows = await listAll(c.env.DB, "SELECT * FROM tickets ORDER BY created_at DESC");
  return c.json(rows);
});

ticketsRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await getOne(c.env.DB, "SELECT * FROM tickets WHERE id = ?", id);
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

ticketsRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = ticketCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  const id = nanoid();
  await c.env.DB.prepare(
    `INSERT INTO tickets (id, item_id, title, status, priority, description)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, d.item_id ?? null, d.title, d.status ?? "open", d.priority ?? 0, d.description ?? null)
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM tickets WHERE id = ?", id);
  return c.json(row, 201);
});

ticketsRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getOne(c.env.DB, "SELECT * FROM tickets WHERE id = ?", id);
  if (!existing) return c.json({ error: "not found" }, 404);
  const body = await c.req.json().catch(() => ({}));
  const parsed = ticketUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  await c.env.DB.prepare(
    `UPDATE tickets SET
      item_id = COALESCE(?, item_id),
      title = COALESCE(?, title),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      description = COALESCE(?, description),
      updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(d.item_id ?? null, d.title ?? null, d.status ?? null, d.priority ?? null, d.description ?? null, id)
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM tickets WHERE id = ?", id);
  return c.json(row);
});

ticketsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getOne(c.env.DB, "SELECT * FROM tickets WHERE id = ?", id);
  if (!existing) return c.json({ error: "not found" }, 404);
  await c.env.DB.prepare("DELETE FROM tickets WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
