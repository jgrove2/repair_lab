import { Hono } from "hono";
import type { Bindings } from "./bindings.js";
import { requireLogtoAuth } from "./auth.js";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) =>
  c.json({ ok: true, env: c.env.ENVIRONMENT ?? "unknown" }),
);

app.get("/me", requireLogtoAuth(), (c) => c.json({ sub: c.get("auth").sub }));

export default app;
