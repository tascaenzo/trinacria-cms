import { createPlaygroundCmsApp } from "./playground-app.js";
import { loadPlaygroundEnv } from "./playground-env.js";
import { registerProcessErrorReporting } from "./playground-observability.js";

loadPlaygroundEnv();

createPlaygroundCmsApp()
  .then((app) => {
    registerProcessErrorReporting(app.logger);
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
  app.logger.info("playground.started", {
    url: `http://${app.host}:${app.port}`,
    mongo: sanitizeMongoUri(app.mongoUri)
  });
  if (app.installationMode) {
    app.logger.warn("playground.installation_mode", {
      reason: "CMS_INSTALLED not set to true"
    });
  }
  if (app.smokeMode) {
    app.logger.info("playground.event_smoke_enabled", {
      standalone: app.smokeStandalone
    });
  }
  app.logger.info("playground.security_profile", {
    profile: app.security.production ? "production" : "development",
    openApiEnabled: app.security.openApiEnabled,
    docsEnabled: app.security.docsEnabled,
    observabilityEnabled: app.observability.enabled,
    metricsEnabled: app.observability.metricsEnabled,
    checklistEnabled: app.observability.checklistEnabled
  });
  if (app.security.openApiEnabled) {
    app.logger.info("playground.openapi_available", {
      url: `http://${app.host}:${app.port}/openapi.json`
    });
  }
  if (app.security.docsEnabled) {
    app.logger.info("playground.swagger_available", {
      url: `http://${app.host}:${app.port}/docs`
    });
  }
}

function sanitizeMongoUri(uri: string): Record<string, string> {
  try {
    const parsed = new URL(uri);
    return {
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.host,
      database: parsed.pathname.replace(/^\//, "")
    };
  } catch {
    return { value: "<invalid-or-redacted>" };
  }
}
