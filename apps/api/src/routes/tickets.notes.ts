import { Hono } from "hono";
import { nanoid } from "nanoid";
import { ticketNoteCreateSchema } from "@repair-lab/shared";
import type { Bindings } from "../bindings.js";
import { getOne } from "../db/client.js";

// Nested under /tickets/:id/notes and /tickets/:id/photos+components.
// Kept in one file for simplicity.
export const ticketNotesRoute = new Hono<{ Bindings: Bindings }>();

// ---- Notes ----
ticketNotesRoute.get("/:id/notes", async (c) => {
  const ticketId = c.req.param("id");
  const ticket = await getOne(c.env.DB, "SELECT id FROM tickets WHERE id = ?", ticketId);
  if (!ticket) return c.json({ error: "ticket not found" }, 404);
  const rows = await c.env.DB.prepare("SELECT * FROM ticket_notes WHERE ticket_id = ? ORDER BY created_at ASC")
    .bind(ticketId)
    .all();
  return c.json(rows.results ?? []);
});

ticketNotesRoute.post("/:id/notes", async (c) => {
  const ticketId = c.req.param("id");
  const ticket = await getOne(c.env.DB, "SELECT id FROM tickets WHERE id = ?", ticketId);
  if (!ticket) return c.json({ error: "ticket not found" }, 404);
  const body = await c.req.json().catch(() => ({}));
  const parsed = ticketNoteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
  }
  const id = nanoid();
  await c.env.DB.prepare("INSERT INTO ticket_notes (id, ticket_id, body) VALUES (?, ?, ?)")
    .bind(id, ticketId, parsed.data.body)
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM ticket_notes WHERE id = ?", id);
  return c.json(row, 201);
});

ticketNotesRoute.delete("/:id/notes/:noteId", async (c) => {
  const ticketId = c.req.param("id");
  const noteId = c.req.param("noteId");
  const row = await getOne(
    c.env.DB,
    "SELECT * FROM ticket_notes WHERE id = ? AND ticket_id = ?",
    noteId,
    ticketId
  );
  if (!row) return c.json({ error: "not found" }, 404);
  await c.env.DB.prepare("DELETE FROM ticket_notes WHERE id = ?").bind(noteId).run();
  return c.json({ ok: true });
});

// ---- Photos (metadata only; bytes live in R2) ----
ticketNotesRoute.get("/:id/photos", async (c) => {
  const ticketId = c.req.param("id");
  const rows = await c.env.DB.prepare("SELECT * FROM ticket_photos WHERE ticket_id = ? ORDER BY created_at ASC")
    .bind(ticketId)
    .all();
  return c.json(rows.results ?? []);
});

ticketNotesRoute.post("/:id/photos", async (c) => {
  const ticketId = c.req.param("id");
  const ticket = await getOne(c.env.DB, "SELECT id FROM tickets WHERE id = ?", ticketId);
  if (!ticket) return c.json({ error: "ticket not found" }, 404);
  const body = (await c.req.json().catch(() => ({}))) as { r2_key?: string; caption?: string };
  if (!body.r2_key) return c.json({ error: "r2_key required" }, 400);
  const id = nanoid();
  await c.env.DB.prepare("INSERT INTO ticket_photos (id, ticket_id, r2_key, caption) VALUES (?, ?, ?, ?)")
    .bind(id, ticketId, body.r2_key, body.caption ?? null)
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM ticket_photos WHERE id = ?", id);
  return c.json(row, 201);
});

// ---- Components consumed by a ticket ----
ticketNotesRoute.get("/:id/components", async (c) => {
  const ticketId = c.req.param("id");
  const rows = await c.env.DB.prepare("SELECT * FROM ticket_components WHERE ticket_id = ?")
    .bind(ticketId)
    .all();
  return c.json(rows.results ?? []);
});

ticketNotesRoute.post("/:id/components", async (c) => {
  const ticketId = c.req.param("id");
  const ticket = await getOne(c.env.DB, "SELECT id FROM tickets WHERE id = ?", ticketId);
  if (!ticket) return c.json({ error: "ticket not found" }, 404);
  const body = (await c.req.json().catch(() => ({}))) as {
    component_id?: string;
    description?: string;
    quantity?: number;
  };
  const id = nanoid();
  await c.env.DB.prepare(
    "INSERT INTO ticket_components (id, ticket_id, component_id, description, quantity) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, ticketId, body.component_id ?? null, body.description ?? null, body.quantity ?? 1)
    .run();
  const row = await getOne(c.env.DB, "SELECT * FROM ticket_components WHERE id = ?", id);
  return c.json(row, 201);
});
