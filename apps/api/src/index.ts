import { Hono } from "hono";
import type { Bindings } from "./bindings.js";
import { requireLogtoAuth } from "./auth.js";
import components from "./components.js";
import listings from "./listings.js";
import sold from "./sold.js";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) => c.json({ ok: true }));

app.get("/me", requireLogtoAuth(), (c) => c.json({ sub: c.get("auth").sub }));

app.route("/", components);
app.route("/", listings);
app.route("/", sold);

export default app;
