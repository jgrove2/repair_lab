import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load VITE_* vars for the current mode so the dev proxy can follow env.
  //   .env.development -> local  (VITE_API_PROXY_TARGET=http://127.0.0.1:8787)
  //   .env.staging     -> dev Worker remote URL (used by build:dev / preview)
  //   .env.production  -> prod Worker remote URL
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget =
    env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8787";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
