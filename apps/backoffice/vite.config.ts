import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

/**
 * Local aliases point the app at workspace source files so the backoffice can
 * start before the internal packages are prebuilt.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@trinacria-cms/admin-kernel": fileURLToPath(
        new URL("../../packages/admin-kernel/src/index.ts", import.meta.url),
      ),
      "@trinacria-cms/admin-ui": fileURLToPath(
        new URL("../../packages/admin-ui/src/index.ts", import.meta.url),
      ),
      "@trinacria-cms/sdk": fileURLToPath(
        new URL("../../packages/sdk/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    port: 4174,
    host: "127.0.0.1",
    proxy: {
      "/cms": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cms/, ""),
      },
    },
  },
});
