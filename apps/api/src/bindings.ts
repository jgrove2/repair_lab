// Shared Cloudflare bindings type for the Worker.
export type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  ENVIRONMENT?: string;
  AGENT_SERVICE_TOKEN?: string;
};
