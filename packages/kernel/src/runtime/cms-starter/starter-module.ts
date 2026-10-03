import {
  createToken,
  defineModule,
  factoryProvider,
  type TrinacriaApp,
  valueProvider
} from "@trinacria/core";
import { type HttpMiddleware, httpProvider, response } from "@trinacria/http";
import { apiError } from "../../contracts/api-contract.js";
import type { CmsStarterOptions, CmsSwaggerUiConfig } from "../../contracts/cms-starter.js";
import type { KernelAdminRouteGuard } from "../../contracts/kernel-admin-route-guard.js";
import type { PluginSourceSnapshot } from "../../contracts/plugin-discovery.js";
import type { PluginManifestProvisioner } from "../../contracts/plugin-manifest-provisioner.js";
import type { PluginRuntime } from "../../contracts/plugin-runtime.js";
import type { PluginRuntimeStore } from "../../contracts/plugin-runtime-store.js";
import { CoreError } from "../../errors/core-error.js";
import { KernelCorsPreflightController } from "../../http/cors-preflight.controller.js";
import { KERNEL_CORS_PREFLIGHT_CONTROLLER } from "../../http/cors-preflight.tokens.js";
import { KernelHealthHttpController } from "../../http/health/kernel-health.controller.js";
import { KERNEL_HEALTH_HTTP_CONTROLLER } from "../../http/health/kernel-health.tokens.js";
import { CmsSwaggerController } from "../../http/swagger/cms-swagger.controller.js";
import { KernelDeliveriesController } from "../../http/system/deliveries.controller.js";
import { KernelEmailJobsController } from "../../http/system/email-jobs.controller.js";
import { KernelSystemHttpController } from "../../http/system/kernel-system.controller.js";
import { KERNEL_SYSTEM_HTTP_CONTROLLER } from "../../http/system/kernel-system.tokens.js";
import { CORE_TOKENS } from "../../tokens/core-tokens.js";
import {
  createKernelSystemOperations,
  KERNEL_SYSTEM_OPERATIONS
} from "../operations/kernel-system-operations.js";
import { assertOperationContext, operationForbidden } from "../operations/operation-context.js";
import {
  createDbPluginRuntimeStore,
  createDeferredPluginRuntimeStore,
  createInMemoryPluginRuntimeStore
} from "../persistence/plugin-runtime-store.js";
import { PublicRequestLimiter } from "../persistence/public-request-limiter.js";
import { ConfiguredPluginDiscoveryService } from "../plugin-discovery/plugin-discovery-service.js";
import { InMemoryPluginRuntime } from "../plugin-runtime/in-memory-plugin-runtime.js";
import { PluginActivityRegistry } from "../plugin-runtime/plugin-activity.js";
import { KernelHealthService } from "../system/kernel-health-service.js";
import { KernelSystemService } from "../system/kernel-system-service.js";
import { registerDurableEventHost } from "./durable-event-host.js";
import { createPlatformPreflight } from "./platform-preflight.js";

const KERNEL_EMAIL_JOBS_CONTROLLER = createToken<KernelEmailJobsController>(
  "KERNEL_EMAIL_JOBS_CONTROLLER"
);
const KERNEL_DELIVERIES_CONTROLLER = createToken<KernelDeliveriesController>(
  "KERNEL_DELIVERIES_CONTROLLER"
);
const CMS_STARTER_SWAGGER_CONFIG_TOKEN = createToken<CmsSwaggerUiConfig>(
  "CMS_STARTER_SWAGGER_CONFIG"
);
const CMS_STARTER_SWAGGER_CONTROLLER = createToken<CmsSwaggerController>(
  "CMS_STARTER_SWAGGER_CONTROLLER"
);
const CMS_STARTER_KERNEL_ADMIN_ROUTE_GUARD = createToken<KernelAdminRouteGuard>(
  "CMS_STARTER_KERNEL_ADMIN_ROUTE_GUARD"
);

export interface CreateCmsStarterKernelModuleOptions {
  app: TrinacriaApp;
  options: CmsStarterOptions;
  swaggerUi: CmsSwaggerUiConfig;
  pluginSourceSnapshots: () => readonly PluginSourceSnapshot[];
}

export function createCmsStarterKernelModule({
  app,
  options,
  swaggerUi,
  pluginSourceSnapshots
}: CreateCmsStarterKernelModuleOptions) {
  if (!app.hasToken(CORE_TOKENS.DURABLE_EVENTS)) registerDurableEventHost(app, options);
  const activity = new PluginActivityRegistry();
  app.registerGlobalProvider(
    factoryProvider(
      CORE_TOKENS.PUBLIC_REQUEST_LIMITER,
      () => ({
        async consume(clientId: string) {
          const adapter = await app.resolve(CORE_TOKENS.DB_ADAPTER);
          await new PublicRequestLimiter(adapter).consume(clientId);
        }
      }),
      []
    )
  );
  const platformPreflight = createPlatformPreflight(app, options);
  app.registerGlobalProvider(
    factoryProvider(
      CORE_TOKENS.PLUGIN_RUNTIME_VIEW,
      () => ({
        list: async () => (await app.resolve(CORE_TOKENS.PLUGIN_RUNTIME)).list()
      }),
      []
    )
  );
  if (!app.hasToken(CORE_TOKENS.OPERATION_AUTHORIZER)) {
    app.registerGlobalProvider(
      factoryProvider(
        CORE_TOKENS.OPERATION_AUTHORIZER,
        () => ({
          async assert(context, target) {
            assertOperationContext(context);
            if (!app.hasToken(CORE_TOKENS.OPERATION_POLICY))
              throw operationForbidden("policy_required");
            const policy = await app.resolve(CORE_TOKENS.OPERATION_POLICY);
            if (app.hasToken(CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR)) {
              const cluster = await app.resolve(CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR);
              await cluster.assertActive(target.ownerPluginId);
              if (context.actor.kind === "plugin")
                await cluster.assertActive(context.actor.pluginId);
            }
            await policy.assert(context, target);
          },
          run: async (context, targets, work) =>
            activity.run(
              [
                ...targets.map((target) => target.ownerPluginId),
                ...(context.actor.kind === "plugin" ? [context.actor.pluginId] : [])
              ],
              async () => {
                const policy = await app.resolve(CORE_TOKENS.OPERATION_POLICY);
                if (policy.run) return policy.run(context, targets, work);
                for (const target of targets) await policy.assert(context, target);
                return work();
              }
            )
        }),
        []
      )
    );
  }

  const manifestProvisioningEnabled = options.enablePluginManifestProvisioning !== false;

  return defineModule({
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
            activity,
            assertPluginActive: async (pluginId) => {
              if (app.hasToken(CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR))
                await (await app.resolve(CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR)).assertActive(
                  pluginId
                );
            },
            app,
            runtimeStore: runtimeStore as PluginRuntimeStore,
            onDeliveryDiagnostic:
              options.onPluginEventDeliveryDiagnostic ??
              ((diagnostic) => console.warn("[kernel:plugin-events] Delivery skipped", diagnostic)),
            lifecycleHooks: {
              onBeforeLoad: async (definition) => {
                if (app.hasToken(CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR)) {
                  const cluster = await app.resolve(CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR);
                  if (cluster.isInitialized() || !options.migrations?.allowStartupWithoutDb)
                    await cluster.assertActive(definition.manifest.id);
                }
                await platformPreflight(definition);
              },
              onAfterLoad: async (context) => {
                const provisioner = await resolvePluginManifestProvisioner(app);
                if (!manifestProvisioningEnabled) {
                  await provisioner?.defer?.(context.manifest);
                  return;
                }
                if (!provisioner) {
                  if (hasManifestProvisioningDeclarations(context.manifest)) {
                    throw new CoreError(
                      "CMS_STARTER_MANIFEST_PROVISIONER_MISSING",
                      `Plugin "${context.pluginId}" declares provisioning metadata but no PluginManifestProvisioner is available`
                    );
                  }
                  return;
                }
                await provisioner.provision(context.manifest, context.i18nSources);
              },
              onBeforeUnregister: async (context) => {
                if (!manifestProvisioningEnabled) return;
                const provisioner = await resolvePluginManifestProvisioner(app);
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
            allowedRoots: options.pluginAllowedRoots,
            continueOnError: options.continueOnPluginDiscoveryError ?? false
          }),
        []
      ),
      ...createHealthProviders(app, options, pluginSourceSnapshots),
      ...createSwaggerProviders(swaggerUi)
    ],
    exports: [
      CORE_TOKENS.PLUGIN_RUNTIME_STORE,
      CORE_TOKENS.PLUGIN_RUNTIME,
      CORE_TOKENS.PLUGIN_DISCOVERY_SERVICE,
      ...createHealthExports(options),
      ...createSwaggerExports(swaggerUi)
    ]
  });
}

function createHealthProviders(
  app: TrinacriaApp,
  options: CmsStarterOptions,
  pluginSourceSnapshots: () => readonly PluginSourceSnapshot[]
) {
  if (options.enableHealthModule === false) {
    return [];
  }

  return [
    httpProvider(KERNEL_CORS_PREFLIGHT_CONTROLLER, KernelCorsPreflightController, []),
    factoryProvider(
      CORE_TOKENS.KERNEL_HEALTH_SERVICE,
      (runtime) =>
        new KernelHealthService({
          runtime: runtime as PluginRuntime,
          durableReadiness: async () =>
            (runtime as PluginRuntime)
              .list()
              .some((record) =>
                record.manifest.events?.emits?.some((event) => event.delivery !== "sync")
              )
              ? await (async () => {
                  const store = await app.resolve(CORE_TOKENS.DURABLE_EVENTS);
                  return store.isInitialized()
                    ? store.readiness()
                    : { ok: false, reason: "durable-store-not-initialized" };
                })()
              : { ok: true },
          clusterReadiness: async () =>
            app.hasToken(CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR)
              ? await (async () => {
                  const coordinator = await app.resolve(CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR);
                  return coordinator.isInitialized()
                    ? coordinator.readiness()
                    : { ok: false, reason: "cluster-not-started" };
                })()
              : {
                  ok: !options.cluster,
                  ...(options.cluster ? { reason: "cluster-not-started" } : {})
                },
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
          pluginSources: pluginSourceSnapshots,
          coordinator: async () =>
            app.hasToken(CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR)
              ? app.resolve(CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR)
              : null
        }),
      [CORE_TOKENS.PLUGIN_RUNTIME]
    ),
    factoryProvider(
      CMS_STARTER_KERNEL_ADMIN_ROUTE_GUARD,
      () => createLazyKernelAdminRouteGuard(app),
      []
    ),
    factoryProvider(KERNEL_SYSTEM_OPERATIONS, createKernelSystemOperations, [
      CORE_TOKENS.KERNEL_SYSTEM_SERVICE,
      CORE_TOKENS.OPERATION_AUTHORIZER
    ]),
    httpProvider(KERNEL_EMAIL_JOBS_CONTROLLER, KernelEmailJobsController, [
      CORE_TOKENS.SECURE_EMAIL_JOBS,
      CORE_TOKENS.OPERATION_AUTHORIZER,
      CMS_STARTER_KERNEL_ADMIN_ROUTE_GUARD
    ]),
    httpProvider(KERNEL_DELIVERIES_CONTROLLER, KernelDeliveriesController, [
      CORE_TOKENS.DURABLE_EVENTS,
      CORE_TOKENS.OPERATION_AUTHORIZER,
      CMS_STARTER_KERNEL_ADMIN_ROUTE_GUARD
    ]),
    httpProvider(KERNEL_SYSTEM_HTTP_CONTROLLER, KernelSystemHttpController, [
      KERNEL_SYSTEM_OPERATIONS,
      CMS_STARTER_KERNEL_ADMIN_ROUTE_GUARD
    ])
  ];
}

function createHealthExports(options: CmsStarterOptions) {
  if (options.enableHealthModule === false) {
    return [];
  }

  return [
    CORE_TOKENS.KERNEL_HEALTH_SERVICE,
    KERNEL_EMAIL_JOBS_CONTROLLER,
    KERNEL_DELIVERIES_CONTROLLER,
    KERNEL_CORS_PREFLIGHT_CONTROLLER,
    KERNEL_HEALTH_HTTP_CONTROLLER,
    CORE_TOKENS.KERNEL_SYSTEM_SERVICE,
    KERNEL_SYSTEM_HTTP_CONTROLLER
  ];
}

function createSwaggerProviders(swaggerUi: CmsSwaggerUiConfig) {
  if (swaggerUi.enabled === false) {
    return [];
  }

  return [
    valueProvider(CMS_STARTER_SWAGGER_CONFIG_TOKEN, swaggerUi),
    httpProvider(CMS_STARTER_SWAGGER_CONTROLLER, CmsSwaggerController, [
      CMS_STARTER_SWAGGER_CONFIG_TOKEN
    ])
  ];
}

function createSwaggerExports(swaggerUi: CmsSwaggerUiConfig) {
  return swaggerUi.enabled === false ? [] : [CMS_STARTER_SWAGGER_CONTROLLER];
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

async function resolvePluginManifestProvisioner(
  app: TrinacriaApp
): Promise<PluginManifestProvisioner | null> {
  if (app.hasToken(CORE_TOKENS.PLUGIN_MANIFEST_PROVISIONER)) {
    return app.resolve<PluginManifestProvisioner>(CORE_TOKENS.PLUGIN_MANIFEST_PROVISIONER);
  }
  return null;
}

function hasManifestProvisioningDeclarations(manifest: {
  security?: {
    permissions?: readonly unknown[];
    roles?: readonly unknown[];
    grants?: readonly unknown[];
    policyRules?: readonly unknown[];
  };
  settings?: readonly unknown[];
  i18n?: unknown;
}): boolean {
  return (
    (manifest.security?.permissions?.length ?? 0) > 0 ||
    (manifest.security?.roles?.length ?? 0) > 0 ||
    (manifest.security?.grants?.length ?? 0) > 0 ||
    (manifest.security?.policyRules?.length ?? 0) > 0 ||
    (manifest.settings?.length ?? 0) > 0 ||
    manifest.i18n !== undefined
  );
}

/**
 * Plugin modules are registered after the kernel HTTP controllers. Resolve the
 * concrete admin guard per request so runtime-loaded auth plugins can provide it.
 */
function createLazyKernelAdminRouteGuard(app: TrinacriaApp): KernelAdminRouteGuard {
  return {
    middleware: async (ctx, next) => {
      const guard = await resolveKernelAdminRouteGuard(app);
      if (!guard) {
        return denyMissingAdminRouteGuard(ctx, next);
      }

      return guard.middleware(ctx, next);
    },
    security: [{ bearerAuth: [] }]
  };
}

async function resolveKernelAdminRouteGuard(
  app: TrinacriaApp
): Promise<KernelAdminRouteGuard | null> {
  if (!app.hasToken(CORE_TOKENS.KERNEL_ADMIN_ROUTE_GUARD)) {
    return null;
  }

  return app.resolve<KernelAdminRouteGuard>(CORE_TOKENS.KERNEL_ADMIN_ROUTE_GUARD);
}

const denyMissingAdminRouteGuard: HttpMiddleware = async () => {
  return response(
    apiError(
      "admin_route_guard_required",
      "Kernel system endpoints require an admin route guard provider",
      undefined,
      { pluginId: "kernel" }
    ),
    { status: 403 }
  );
};
