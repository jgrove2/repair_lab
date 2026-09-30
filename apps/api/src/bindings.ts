// Shared Cloudflare bindings type for the Worker.
export type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  AGENT_SERVICE_TOKEN?: string;
};
