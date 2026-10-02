import { Hono } from "hono";
import { requireLogtoAuth } from "./auth.js";
import type { Bindings } from "./bindings.js";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) =>
  c.json({ ok: true, env: c.env.ENVIRONMENT ?? "unknown" }),
);

app.get("/health/auth", requireLogtoAuth(), (c) => {
  const auth = c.get("auth");
  return c.json({
    ok: true,
    env: c.env.ENVIRONMENT ?? "unknown",
    sub: auth.sub,
    clientId: auth.clientId ?? null,
    scopes: auth.scopes,
    audience: auth.audience,
  });
});

export default app;
