import { createPlaygroundCmsApp } from "./playground-app.js";
import { loadPlaygroundEnv } from "./playground-env.js";
import { registerProcessErrorReporting } from "./playground-observability.js";

loadPlaygroundEnv();

createPlaygroundCmsApp()
  .then((app) => {
    registerProcessErrorReporting(app.logger);
    registerShutdown(app.handle.shutdown);
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
