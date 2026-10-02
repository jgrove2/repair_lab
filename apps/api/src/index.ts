import { Hono } from "hono";
import { requireLogtoAuth } from "./auth.js";
import type { Bindings } from "./bindings.js";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) =>
  c.json({ ok: true, env: c.env.ENVIRONMENT ?? "unknown" }),
);

// Temporary integration diagnostic proving that the UI's access token is
// accepted here. Not an authorization check: it echoes claims back and grants
// nothing. Replace with a real protected route (with its own scope check) and
// remove this one.
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
