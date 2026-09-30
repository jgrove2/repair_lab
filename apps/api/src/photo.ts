import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { Bindings } from "./bindings.js";

export const photoRoute = new Hono<{ Bindings: Bindings }>();

// STUB: R2 presigned upload is NOT implemented yet.
// TODO: Replace the fake URL below with a real presigned URL, e.g.
//   - `await c.env.R2.createMultipartUpload(key)` for multipart, or
//   - generate a presigned PUT URL (via `aws4fetch` or a Worker-side signer)
//     scoped to `ticket-photos/<ticketId>/<nanoid>.<ext>`.
// The web UI should PUT bytes to `uploadUrl`, then POST the `key` to
// `/tickets/:id/photos` to record metadata in D1 (ticket_photos).
photoRoute.post("/presign", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    ticketId?: string;
    contentType?: string;
  };
  const ticketId = body.ticketId ?? "dummy-ticket";
  const key = `ticket-photos/${ticketId}/dummy-${nanoid()}.jpg`;
  return c.json({
    key,
    uploadUrl: `https://placeholder-r2.example.com/${key}?presign=dummy`,
    contentType: body.contentType ?? "image/jpeg",
  });
});
