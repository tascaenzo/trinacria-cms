import { createCorePackMongoGlobalProviders, createCorePackPlugin } from "@trinacria-cms/core-pack";
import { createEditorialPackPlugin } from "@trinacria-cms/editorial-pack";
import { createEmailPackPlugin } from "@trinacria-cms/email-pack";
import {
  type CmsStarterHandle,
  createInMemoryPluginRuntimeStore,
  EVENT_BUS_TOKEN,
  type KernelPluginDefinition,
  type PluginDiscoverySource,
  startCmsApp
} from "@trinacria-cms/kernel";
import { createMediaPackPlugin } from "@trinacria-cms/media-pack";
import {
  applyProductionSecurityDefaults,
  assertProductionSecurityConfig,
  createHttpMiddlewares,
  createPlaygroundSecurityConfig,
  loadSecretFileEnvironment,
  type PlaygroundSecurityConfig
} from "./playground-hardening.js";
import {
  createObservabilityMiddlewares,
  createPlaygroundObservabilityConfig,
  createPlaygroundObservabilityModule,
  JsonStructuredLogger,
  PlaygroundMetricsRecorder,
  type PlaygroundObservabilityConfig,
  type StructuredLogger
} from "./playground-observability.js";

export interface PlaygroundCmsApp {
  handle: CmsStarterHandle;
  host: string;
  port: number;
  mongoUri: string;
  installationMode: boolean;
  smokeMode: boolean;
  smokeStandalone: boolean;
  security: PlaygroundSecurityConfig;
  observability: PlaygroundObservabilityConfig;
  logger: StructuredLogger;
}

export async function createPlaygroundCmsApp(): Promise<PlaygroundCmsApp> {
  loadSecretFileEnvironment();
  const security = createPlaygroundSecurityConfig();
  const observability = createPlaygroundObservabilityConfig();
  const logger = new JsonStructuredLogger(observability);
  const metrics = new PlaygroundMetricsRecorder();
  applyProductionSecurityDefaults(security);
  assertProductionSecurityConfig(security);

  const mongoUri = resolveMongoUri();
  const host = process.env.HTTP_HOST ?? "0.0.0.0";
  const port = Number(process.env.HTTP_PORT ?? process.env.PORT ?? "3000");
  const smokeMode = process.env.PLAYGROUND_EVENT_SMOKE === "1";
  const smokeStandalone = process.env.PLAYGROUND_EVENT_SMOKE_STANDALONE === "1";
  const installationMode = !isCmsInstalled();

  const handle = await startCmsApp({
    coreVersion: "0.1.0",
    http: {
      host,
      port,
      middlewares: [
        ...createObservabilityMiddlewares({ config: observability, logger, metrics }),
        ...createHttpMiddlewares(security)
      ],
      openApi: security.openApiEnabled
        ? {
            enabled: true,
            title: "Trinacria CMS Playground API",
            version: "1.0.0"
          }
        : undefined
    },
    swaggerUi: {
      enabled: security.docsEnabled
    },
    modules: [createPlaygroundObservabilityModule({ config: observability, logger, metrics })],
    globalProviders: createGlobalProviders({ mongoUri, installationMode, smokeStandalone }),
    plugins: createPlaygroundPlugins(smokeStandalone),
    pluginSources: createPlaygroundPluginSources(smokeStandalone),
    pluginRuntimeStore: installationMode ? createInMemoryPluginRuntimeStore() : undefined,
    enablePluginManifestProvisioning: smokeStandalone ? false : !installationMode,
    autoLoadPlugins: true
  });

  return {
    handle,
    host,
    port,
    mongoUri,
    installationMode,
    smokeMode,
    smokeStandalone,
    security,
    observability,
    logger
  };
}

function createGlobalProviders({
  mongoUri,
  installationMode,
  smokeStandalone
}: {
  mongoUri: string;
  installationMode: boolean;
  smokeStandalone: boolean;
}) {
  if (smokeStandalone) {
    return [];
  }

  return createCorePackMongoGlobalProviders({
    uri: mongoUri,
    options: {
      serverSelectionTimeoutMS: 3000
    },
    allowStartupWithoutDb: installationMode
  });
}

function createPlaygroundPlugins(smokeStandalone: boolean): readonly KernelPluginDefinition[] {
  const smokePlugins = createPlaygroundEventSmokePlugins();
  return smokeStandalone
    ? smokePlugins
    : [
        createCorePackPlugin(),
        createEmailPackPlugin(),
        createMediaPackPlugin(),
        createEditorialPackPlugin(),
        ...smokePlugins
      ];
}

/**
 * The reference plugin remains opt-in so the default playground stays a clean
 * product baseline. Enable it with PLAYGROUND_TEAM_ONBOARDING_PLUGIN=1 while
 * following the beta onboarding guide.
 */
function createPlaygroundPluginSources(smokeStandalone: boolean): readonly PluginDiscoverySource[] {
  if (smokeStandalone || process.env.PLAYGROUND_TEAM_ONBOARDING_PLUGIN !== "1") {
    return [];
  }

  return [
    {
      type: "workspace",
      name: "team-onboarding-plugin",
      entrypoint: "@trinacria-cms/example-team-onboarding-plugin"
    }
  ];
}

function isCmsInstalled(): boolean {
  return process.env.CMS_INSTALLED?.trim().toLowerCase() === "true";
}

function createPlaygroundEventSmokePlugins(): readonly KernelPluginDefinition[] {
  if (process.env.PLAYGROUND_EVENT_SMOKE !== "1") {
    return [];
  }

  const subscriberPlugin: KernelPluginDefinition = {
    manifest: {
      id: "playground/event-subscriber",
      version: "1.0.0",
      requiresCore: "^0.1.0",
      events: {
        subscribes: [
          {
            eventName: "playground/event-emitter:smoke-triggered",
            handler: "onSmokeTriggered"
          }
        ]
      }
    },
    eventHandlers: {
      async onSmokeTriggered(payload) {
        console.log("[playground:event-smoke] subscriber received payload", payload);
      }
    }
  };

  const emitterPlugin: KernelPluginDefinition = {
    manifest: {
      id: "playground/event-emitter",
      version: "1.0.0",
      requiresCore: "^0.1.0",
      dependencies: [
        {
          pluginId: "playground/event-subscriber",
          versionRange: "^1.0.0"
        }
      ],
      events: {
        emits: [
          {
            name: "smoke-triggered",
            visibility: "private",
            version: 1
          }
        ]
      }
    },
    async onInit(context) {
      const bus = await context.app.resolve(EVENT_BUS_TOKEN);
      await bus.emit("playground/event-emitter:smoke-triggered", {
        source: context.pluginId,
        at: new Date().toISOString()
      });
      console.log("[playground:event-smoke] emitter emitted smoke-triggered");
    }
  };

  return [subscriberPlugin, emitterPlugin];
}

function resolveMongoUri(): string {
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }

  const user = readConfiguredCredential(process.env.MONGO_ROOT_USERNAME);
  const password = readConfiguredCredential(process.env.MONGO_ROOT_PASSWORD);
  const host = process.env.MONGO_HOST ?? "127.0.0.1";
  const port = process.env.MONGO_PORT ?? "27017";
  const database = process.env.MONGO_DATABASE ?? "trinacria_cms";
  const hasCredentials = user !== undefined && password !== undefined;
  const credentialsSegment = hasCredentials
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
    : "";
  const authSourceQuery = hasCredentials ? "?authSource=admin" : "";

  return `mongodb://${credentialsSegment}${host}:${port}/${database}${authSourceQuery}`;
}

function readConfiguredCredential(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}
