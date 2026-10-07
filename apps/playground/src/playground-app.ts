import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCorePackPlugin } from "@trinacria-cms/core-pack";
import {
  CorePackOfflineInstallerModule,
  createCorePackMongoGlobalProviders,
  inspectInstallationPrerequisites
} from "@trinacria-cms/core-pack/runtime";
import { createEditorialPackPlugin } from "@trinacria-cms/editorial-pack";
import { createEmailPackPlugin } from "@trinacria-cms/email-pack";
import type {
  CmsStarterHandle,
  KernelPluginDefinition,
  PluginDiscoverySource
} from "@trinacria-cms/kernel";
import {
  computePluginArtifactChecksum,
  createInMemoryPluginRuntimeStore,
  startCmsApp
} from "@trinacria-cms/kernel/runtime";
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
  const prerequisites = smokeStandalone
    ? undefined
    : await inspectInstallationPrerequisites(mongoUri);
  const installationMode = !prerequisites?.installed;
  const installerOnly = prerequisites?.checks.some((check) => check.status !== "pass") ?? false;
  const clusterEnabled = readPlaygroundClusterEnabled(process.env.PLAYGROUND_CLUSTER_ENABLED);

  const plugins = createPlaygroundPlugins(smokeStandalone);
  const artifacts: Record<string, { version: string; checksum: string }> = {};
  if (clusterEnabled && !smokeStandalone)
    for (const plugin of plugins) {
      const root = plugin.manifest.id.startsWith("playground/")
        ? resolve(dirname(fileURLToPath(import.meta.url)), "..")
        : resolve(
            dirname(fileURLToPath(import.meta.resolve(`@trinacria-cms/${plugin.manifest.id}`))),
            ".."
          );
      artifacts[plugin.manifest.id] = {
        version: plugin.manifest.version,
        checksum: await computePluginArtifactChecksum(root)
      };
    }
  if (clusterEnabled && !smokeStandalone && process.env.PLAYGROUND_TEAM_ONBOARDING_PLUGIN === "1") {
    const root = resolve(
      dirname(fileURLToPath(import.meta.resolve("@trinacria-cms/example-team-onboarding-plugin"))),
      ".."
    );
    artifacts["team-onboarding"] = {
      version: "0.1.0",
      checksum: await computePluginArtifactChecksum(root)
    };
  }
  const handle = await startCmsApp({
    coreVersion: "0.1.0",
    ...(clusterEnabled && !smokeStandalone && process.env.E2E_READINESS_FIXTURE !== "degraded"
      ? { cluster: { artifacts } }
      : {}),
    installerOnly,
    installation: smokeStandalone
      ? undefined
      : { inspect: async () => inspectInstallationPrerequisites(mongoUri) },
    offlineInstallerModules: [CorePackOfflineInstallerModule],
    migrations: { allowStartupWithoutDb: installerOnly },
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
    globalProviders: createGlobalProviders({
      mongoUri,
      installationMode: installerOnly,
      smokeStandalone
    }),
    plugins,
    pluginSources: createPlaygroundPluginSources(smokeStandalone),
    pluginRuntimeStore: installerOnly ? createInMemoryPluginRuntimeStore() : undefined,
    enablePluginManifestProvisioning: !smokeStandalone && !installerOnly,
    autoLoadPlugins: true
  });

  if (process.env.PLAYGROUND_EVENT_SMOKE === "1") {
    await handle.runtime.emitPluginEvent("playground/event-emitter", "smoke-triggered", {
      source: "playground/event-emitter",
      at: new Date().toISOString()
    });
  }

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

/** Multiple CMS instances require an explicit opt-in; a Mongo replica set does not imply a CMS cluster. */
export function readPlaygroundClusterEnabled(value?: string): boolean {
  if (value === undefined || value === "false" || value === "0") return false;
  if (value === "true" || value === "1") return true;
  throw new Error("PLAYGROUND_CLUSTER_ENABLED must be true, false, 1 or 0");
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
            visibility: "public",
            version: 1,
            delivery: "sync"
          }
        ]
      }
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
