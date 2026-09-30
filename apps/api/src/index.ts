import { Hono } from "hono";
import type { Bindings } from "./bindings.js";

// NOTE: Scoped down to home page only (2026-09-30). The home UI
// (`apps/web/src/pages.tsx` Dashboard) is fully static and makes zero
// API calls, so `/health` is the only route kept — it verifies which
// backend env the web UI is pointed at. All other routes were removed;
// see API_SCOPE_TODOS.md for restore stories.

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) =>
  c.json({ ok: true, env: c.env.ENVIRONMENT ?? "unknown" }),
);

export default app;
