import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

/**
 * Local aliases point the app at workspace source files so the backoffice can
 * start before the internal packages are prebuilt.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = normalizeViteBase(env.VITE_BACKOFFICE_BASE_PATH);
  const cmsProxy = {
    "/cms": {
      target: env.VITE_CMS_PROXY_TARGET || "http://127.0.0.1:3000",
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/cms/, "")
    }
  };

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        "@trinacria-cms/admin-kernel": fileURLToPath(
          new URL("../../packages/admin-kernel/src/index.ts", import.meta.url)
        ),
        "@trinacria-cms/core-pack/admin-manifest": fileURLToPath(
          new URL(
            "../../packages/core-pack/src/plugin/core-pack-admin.manifest.ts",
            import.meta.url
          )
        ),
        "@trinacria-cms/media-pack/admin-manifest": fileURLToPath(
          new URL(
            "../../packages/media-pack/src/plugin/media-pack-admin.manifest.ts",
            import.meta.url
          )
        ),
        "@trinacria-cms/media-pack/admin": fileURLToPath(
          new URL("../../packages/media-pack/src/admin/index.tsx", import.meta.url)
        ),
        "@trinacria-cms/trinacria-ui": fileURLToPath(
          new URL("../../packages/trinacria-ui/src/index.ts", import.meta.url)
        ),
        "@trinacria-cms/sdk": fileURLToPath(
          new URL("../../packages/sdk/src/index.ts", import.meta.url)
        )
      }
    },
    server: {
      port: 4174,
      host: "127.0.0.1",
      proxy: cmsProxy
    },
    preview: {
      port: 4174,
      host: "127.0.0.1",
      proxy: cmsProxy
    }
  };
});

function normalizeViteBase(basePath: string | undefined): string {
  if (!basePath) {
    return "/";
  }
  const normalized = basePath.trim().replace(/^\/?/, "/").replace(/\/?$/, "/");
  return normalized === "//" ? "/" : normalized;
}
