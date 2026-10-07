import { defineConfig } from "vite";
export default defineConfig(({ isSsrBuild }) => ({
  build: {
    manifest: !isSsrBuild,
    outDir: "dist/client",
    ...(isSsrBuild ? {} : { rolldownOptions: { input: "src/client.tsx" } })
  }
}));
