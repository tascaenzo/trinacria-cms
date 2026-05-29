import { createPlaygroundCmsApp } from "./playground-app.js";
import { loadPlaygroundEnv } from "./playground-env.js";

loadPlaygroundEnv();

createPlaygroundCmsApp()
  .then((app) => {
    registerShutdown(app.handle.shutdown);
    logStartup(app);
  })
  .catch((error) => {
    console.error("[playground] bootstrap failed", error);
    process.exit(1);
  });

function registerShutdown(shutdownApp: () => Promise<void>): void {
  const shutdown = async () => {
    await shutdownApp();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function logStartup(app: Awaited<ReturnType<typeof createPlaygroundCmsApp>>): void {
  console.log(`[playground] HTTP server ready on http://${app.host}:${app.port}`);
  console.log(`[playground] Mongo URI: ${app.mongoUri}`);
  if (app.installationMode) {
    console.log("[playground] Installation mode active (CMS_INSTALLED not set to true)");
  }
  if (app.smokeMode) {
    console.log(
      `[playground] Event smoke mode enabled${app.smokeStandalone ? " (standalone)" : ""}`
    );
  }
  console.log(`[playground] OpenAPI JSON available at http://${app.host}:${app.port}/openapi.json`);
  console.log(`[playground] Swagger UI available at http://${app.host}:${app.port}/docs`);
}
