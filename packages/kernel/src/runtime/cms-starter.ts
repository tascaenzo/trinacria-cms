import {
  createToken,
  defineModule,
  factoryProvider,
  TrinacriaApp,
  valueProvider,
  type ModuleDefinition
} from "@trinacria/core";
import { createHttpPlugin, httpProvider, type OpenApiDocument } from "@trinacria/http";
import type {
  CmsSwaggerUiConfig,
  CmsStarterHandle,
  CmsStarterOptions
} from "../contracts/cms-starter.js";
import type { KernelAdminRouteGuard } from "../contracts/kernel-admin-route-guard.js";
import type {
  PluginDiscoveryService,
  PluginDiscoverySource,
  PluginSourceSnapshot
} from "../contracts/plugin-discovery.js";
import type { KernelPluginDefinition, PluginRuntime } from "../contracts/plugin-runtime.js";
import type { PluginRuntimeStore } from "../contracts/plugin-runtime-store.js";
import type { PluginSecurityProvisioner } from "../contracts/plugin-security-provisioner.js";
import { CoreError } from "../errors/core-error.js";
import { InMemoryPluginRuntime } from "./in-memory-plugin-runtime.js";
import {
  createDbPluginRuntimeStore,
  createDeferredPluginRuntimeStore,
  createInMemoryPluginRuntimeStore
} from "./plugin-runtime-store.js";
import { CORE_TOKENS } from "../tokens/core-tokens.js";
import { KernelHealthService } from "./kernel-health-service.js";
import { KernelHealthHttpController } from "../http/kernel-health.controller.js";
import { KERNEL_HEALTH_HTTP_CONTROLLER } from "../http/kernel-health.tokens.js";
import { KernelSystemHttpController } from "../http/kernel-system.controller.js";
import { KERNEL_SYSTEM_HTTP_CONTROLLER } from "../http/kernel-system.tokens.js";
import { CmsSwaggerController } from "../http/cms-swagger.controller.js";
import { KernelSystemService } from "./kernel-system-service.js";
import { ConfiguredPluginDiscoveryService } from "./plugin-discovery-service.js";

const CMS_STARTER_SWAGGER_CONFIG_TOKEN = createToken<CmsSwaggerUiConfig>(
  "CMS_STARTER_SWAGGER_CONFIG"
);
const CMS_STARTER_SWAGGER_CONTROLLER = createToken<CmsSwaggerController>(
  "CMS_STARTER_SWAGGER_CONTROLLER"
);
const CMS_STARTER_KERNEL_ADMIN_ROUTE_GUARD = createToken<KernelAdminRouteGuard | null>(
  "CMS_STARTER_KERNEL_ADMIN_ROUTE_GUARD"
);

/**
 * Starts a minimal CMS app with HTTP plugin, runtime token wiring, optional modules,
 * and optional plugin registration/autoload.
 */
export async function startCmsApp(options: CmsStarterOptions): Promise<CmsStarterHandle> {
  const app = new TrinacriaApp();
  const swaggerUi: CmsSwaggerUiConfig = {
    enabled: options.swaggerUi?.enabled ?? true,
    path: options.swaggerUi?.path ?? "/docs",
    openApiJsonPath: options.swaggerUi?.openApiJsonPath ?? "/openapi.json",
    title: options.swaggerUi?.title ?? options.http?.openApi?.title ?? "Trinacria CMS API Docs"
  };
  const securityProvisioningEnabled = options.enablePluginSecurityProvisioning !== false;
  const openApiConfig = options.http?.openApi;
  let pluginSourceSnapshots: readonly PluginSourceSnapshot[] = [];

  app.use(
    createHttpPlugin({
      host: options.http?.host ?? "0.0.0.0",
      port: options.http?.port ?? 3000,
      openApi: !openApiConfig
        ? undefined
        : {
            ...openApiConfig,
            transformDocument: (document) => {
              const withJwtScheme = withJwtBearerSecurityScheme(document);
              return openApiConfig.transformDocument
                ? openApiConfig.transformDocument(withJwtScheme)
                : withJwtScheme;
            },
            onDocumentGenerated: (document) => {
              openApiConfig.onDocumentGenerated?.(document);
            }
          }
    })
  );

  const starterModule = defineModule({
    name: "CmsStarterKernelModule",
    imports: [],
    providers: [
      factoryProvider(
        CORE_TOKENS.PLUGIN_RUNTIME_STORE,
        () =>
          options.pluginRuntimeStore ??
          createDeferredPluginRuntimeStore(() => resolveDefaultRuntimeStore(app)),
        []
      ),
      factoryProvider(
        CORE_TOKENS.PLUGIN_RUNTIME,
        (runtimeStore) =>
          new InMemoryPluginRuntime({
            coreVersion: options.coreVersion,
            app,
            runtimeStore: runtimeStore as PluginRuntimeStore,
            lifecycleHooks: {
              onAfterLoad: async (context) => {
                if (!securityProvisioningEnabled) return;
                const provisioner = await resolvePluginSecurityProvisioner(app);
                if (!provisioner) {
                  if (hasSecurityDeclarations(context.manifest)) {
                    throw new CoreError(
                      "CMS_STARTER_SECURITY_PROVISIONER_MISSING",
                      `Plugin "${context.pluginId}" declares security metadata but no PluginSecurityProvisioner is available`
                    );
                  }
                  return;
                }
                await provisioner.provision(context.manifest);
              },
              onBeforeUnregister: async (context) => {
                if (!securityProvisioningEnabled) return;
                const provisioner = await resolvePluginSecurityProvisioner(app);
                if (!provisioner) return;
                await provisioner.deprovision(context.manifest);
              }
            }
          }),
        [CORE_TOKENS.PLUGIN_RUNTIME_STORE]
      ),
      factoryProvider(
        CORE_TOKENS.PLUGIN_DISCOVERY_SERVICE,
        () =>
          options.pluginDiscoveryService ??
          new ConfiguredPluginDiscoveryService({
            continueOnError: options.continueOnPluginDiscoveryError ?? false
          }),
        []
      ),
      ...(options.enableHealthModule === false
        ? []
        : [
            factoryProvider(
              CORE_TOKENS.KERNEL_HEALTH_SERVICE,
              (runtime) =>
                new KernelHealthService({
                  runtime: runtime as PluginRuntime,
                  dbHealthCheck: async () => {
                    if (!app.hasToken(CORE_TOKENS.DB_ADAPTER)) {
                      return { ok: false, reason: "not_configured" } as const;
                    }
                    const dbAdapter = await app.resolve(CORE_TOKENS.DB_ADAPTER);
                    return dbAdapter.healthCheck();
                  }
                }),
              [CORE_TOKENS.PLUGIN_RUNTIME]
            ),
            httpProvider(KERNEL_HEALTH_HTTP_CONTROLLER, KernelHealthHttpController, [
              CORE_TOKENS.KERNEL_HEALTH_SERVICE
            ]),
            factoryProvider(
              CORE_TOKENS.KERNEL_SYSTEM_SERVICE,
              (runtime) =>
                new KernelSystemService(runtime as PluginRuntime, {
                  pluginSources: () => pluginSourceSnapshots
                }),
              [CORE_TOKENS.PLUGIN_RUNTIME]
            ),
            factoryProvider(CMS_STARTER_KERNEL_ADMIN_ROUTE_GUARD, async () => {
              if (!app.hasToken(CORE_TOKENS.KERNEL_ADMIN_ROUTE_GUARD)) {
                return null;
              }

              return app.resolve<KernelAdminRouteGuard>(CORE_TOKENS.KERNEL_ADMIN_ROUTE_GUARD);
            }, []),
            httpProvider(KERNEL_SYSTEM_HTTP_CONTROLLER, KernelSystemHttpController, [
              CORE_TOKENS.KERNEL_SYSTEM_SERVICE,
              CMS_STARTER_KERNEL_ADMIN_ROUTE_GUARD
            ])
          ]),
      ...(swaggerUi.enabled === false
        ? []
        : [
            valueProvider(CMS_STARTER_SWAGGER_CONFIG_TOKEN, swaggerUi),
            httpProvider(CMS_STARTER_SWAGGER_CONTROLLER, CmsSwaggerController, [
              CMS_STARTER_SWAGGER_CONFIG_TOKEN
            ])
          ])
    ],
    exports: [
      CORE_TOKENS.PLUGIN_RUNTIME_STORE,
      CORE_TOKENS.PLUGIN_RUNTIME,
      CORE_TOKENS.PLUGIN_DISCOVERY_SERVICE,
      ...(options.enableHealthModule === false
        ? []
        : [
            CORE_TOKENS.KERNEL_HEALTH_SERVICE,
            KERNEL_HEALTH_HTTP_CONTROLLER,
            CORE_TOKENS.KERNEL_SYSTEM_SERVICE,
            KERNEL_SYSTEM_HTTP_CONTROLLER
          ]),
      ...(swaggerUi.enabled === false ? [] : [CMS_STARTER_SWAGGER_CONTROLLER])
    ]
  });

  await app.registerModule(starterModule);
  for (const provider of options.globalProviders ?? []) {
    app.registerGlobalProvider(provider);
  }
  await registerAppModules(app, options.modules ?? []);
  await app.start();

  const runtime = await app.resolve<PluginRuntime>(CORE_TOKENS.PLUGIN_RUNTIME);
  const discoveryService = await app.resolve<PluginDiscoveryService>(
    CORE_TOKENS.PLUGIN_DISCOVERY_SERVICE
  );
  const pluginBootstrap = await bootstrapDiscoveredPlugins({
    runtime,
    discoveryService,
    pluginSources: options.pluginSources ?? [],
    plugins: options.plugins ?? [],
    autoLoadPlugins: options.autoLoadPlugins
  });
  pluginSourceSnapshots = pluginBootstrap.pluginSources;

  return {
    runtime,
    pluginSources: pluginBootstrap.pluginSources,
    shutdown: async () => {
      await app.shutdown();
    }
  };
}

export interface PluginBootstrapOptions {
  runtime: Pick<PluginRuntime, "register" | "loadMany" | "list"> & {
    reconcileDiscoveredPlugins?(pluginIds: readonly string[]): Promise<void>;
  };
  discoveryService: PluginDiscoveryService;
  pluginSources: readonly PluginDiscoverySource[];
  plugins?: readonly KernelPluginDefinition[];
  autoLoadPlugins?: boolean;
}

export interface PluginBootstrapResult {
  plugins: readonly KernelPluginDefinition[];
  pluginSources: readonly PluginSourceSnapshot[];
}

export async function bootstrapDiscoveredPlugins(
  options: PluginBootstrapOptions
): Promise<PluginBootstrapResult> {
  const discovery = await options.discoveryService.discover(options.pluginSources);
  const plugins = [...(options.plugins ?? []), ...discovery.plugins];

  for (const plugin of plugins) {
    await options.runtime.register(plugin);
  }

  await options.runtime.reconcileDiscoveredPlugins?.(plugins.map((plugin) => plugin.manifest.id));

  if (options.autoLoadPlugins !== false && plugins.length > 0) {
    const autoloadPluginIds = plugins
      .map((plugin) => plugin.manifest.id)
      .filter((pluginId) => {
        const record = options.runtime.list().find((item) => item.manifest.id === pluginId);
        return record ? ["registered", "unloaded"].includes(record.state) : false;
      });

    if (autoloadPluginIds.length > 0) {
      await options.runtime.loadMany(autoloadPluginIds);
    }
  }

  return {
    plugins,
    pluginSources: discovery.sources
  };
}

async function resolveDefaultRuntimeStore(app: TrinacriaApp): Promise<PluginRuntimeStore> {
  if (!app.hasToken(CORE_TOKENS.DB_ADAPTER)) {
    return createInMemoryPluginRuntimeStore();
  }

  const dbAdapter = await app.resolve(CORE_TOKENS.DB_ADAPTER);
  const entityRegistry = app.hasToken(CORE_TOKENS.ENTITY_REGISTRY)
    ? await app.resolve(CORE_TOKENS.ENTITY_REGISTRY)
    : undefined;

  return createDbPluginRuntimeStore({
    dbAdapter,
    entityRegistry
  });
}

async function resolvePluginSecurityProvisioner(
  app: TrinacriaApp
): Promise<PluginSecurityProvisioner | null> {
  if (!app.hasToken(CORE_TOKENS.PLUGIN_SECURITY_PROVISIONER)) {
    return null;
  }
  return app.resolve<PluginSecurityProvisioner>(CORE_TOKENS.PLUGIN_SECURITY_PROVISIONER);
}

function hasSecurityDeclarations(manifest: {
  security?: {
    permissions?: readonly unknown[];
    roles?: readonly unknown[];
    grants?: readonly unknown[];
  };
}): boolean {
  return (
    (manifest.security?.permissions?.length ?? 0) > 0 ||
    (manifest.security?.roles?.length ?? 0) > 0 ||
    (manifest.security?.grants?.length ?? 0) > 0
  );
}

async function registerAppModules(
  app: TrinacriaApp,
  modules: readonly ModuleDefinition[]
): Promise<void> {
  for (const moduleDefinition of modules) {
    if (!moduleDefinition || typeof moduleDefinition !== "object") {
      throw new CoreError("CMS_STARTER_INVALID_MODULE", "Invalid module provided to CMS starter");
    }
    await app.registerModule(moduleDefinition);
  }
}

function withJwtBearerSecurityScheme(document: OpenApiDocument): OpenApiDocument {
  const components =
    document.components && typeof document.components === "object"
      ? (document.components as Record<string, unknown>)
      : {};
  const securitySchemes =
    components.securitySchemes && typeof components.securitySchemes === "object"
      ? (components.securitySchemes as Record<string, unknown>)
      : {};

  return {
    ...document,
    components: {
      ...components,
      securitySchemes: {
        ...securitySchemes,
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Paste access token as `Bearer <token>`"
        },
        pluginCallerAuth: {
          type: "apiKey",
          in: "header",
          name: "x-cms-plugin-signature",
          description:
            "Signed plugin caller flow. Requests also require x-cms-plugin-id, x-cms-plugin-ts, and x-cms-plugin-nonce headers."
        }
      }
    }
  };
}
