import { Hono } from "hono";
import type { Bindings } from "./bindings.js";
import { itemsRoute } from "./routes/items.js";
import { ticketsRoute } from "./routes/tickets.js";
import { ticketNotesRoute } from "./routes/tickets.notes.js";
import { componentsRoute } from "./routes/components.js";
import { locationsRoute } from "./routes/locations.js";
import { preferencesRoute } from "./routes/preferences.js";
import { candidatesRoute } from "./routes/candidates.js";
import { searchRoute } from "./routes/search.js";
import { photoRoute } from "./photo.js";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) =>
  c.json({ ok: true, env: c.env.ENVIRONMENT ?? "unknown" }),
);

app.route("/items", itemsRoute);
app.route("/tickets", ticketsRoute);
// Nested ticket sub-resources (notes / photos / components) share the
// /tickets/:id prefix.
app.route("/tickets", ticketNotesRoute);
app.route("/components", componentsRoute);
app.route("/locations", locationsRoute);
app.route("/preferences", preferencesRoute);
app.route("/candidates", candidatesRoute);
app.route("/search", searchRoute);
app.route("/photos", photoRoute);

export default app;
