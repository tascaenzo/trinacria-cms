import {
  createToken,
  defineModule,
  factoryProvider,
  TrinacriaApp,
  valueProvider
} from "@trinacria/core";
import { httpProvider, response, type HttpMiddleware } from "@trinacria/http";
import { apiError } from "../../contracts/api-contract.js";
import type { CmsStarterOptions, CmsSwaggerUiConfig } from "../../contracts/cms-starter.js";
import type { KernelAdminRouteGuard } from "../../contracts/kernel-admin-route-guard.js";
import type { PluginSourceSnapshot } from "../../contracts/plugin-discovery.js";
import type { PluginRuntime } from "../../contracts/plugin-runtime.js";
import type { PluginRuntimeStore } from "../../contracts/plugin-runtime-store.js";
import type { PluginSecurityProvisioner } from "../../contracts/plugin-security-provisioner.js";
import { CoreError } from "../../errors/core-error.js";
import { KernelCorsPreflightController } from "../../http/cors-preflight.controller.js";
import { KERNEL_CORS_PREFLIGHT_CONTROLLER } from "../../http/cors-preflight.tokens.js";
import { KernelHealthHttpController } from "../../http/health/kernel-health.controller.js";
import { KERNEL_HEALTH_HTTP_CONTROLLER } from "../../http/health/kernel-health.tokens.js";
import { CmsSwaggerController } from "../../http/swagger/cms-swagger.controller.js";
import { KernelSystemHttpController } from "../../http/system/kernel-system.controller.js";
import { KERNEL_SYSTEM_HTTP_CONTROLLER } from "../../http/system/kernel-system.tokens.js";
import { CORE_TOKENS } from "../../tokens/core-tokens.js";
import { ConfiguredPluginDiscoveryService } from "../plugin-discovery/plugin-discovery-service.js";
import { InMemoryPluginRuntime } from "../plugin-runtime/in-memory-plugin-runtime.js";
import {
  createDbPluginRuntimeStore,
  createDeferredPluginRuntimeStore,
  createInMemoryPluginRuntimeStore
} from "../persistence/plugin-runtime-store.js";
import { KernelHealthService } from "../system/kernel-health-service.js";
import { KernelSystemService } from "../system/kernel-system-service.js";

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
  const securityProvisioningEnabled = options.enablePluginSecurityProvisioning !== false;

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
            app,
            runtimeStore: runtimeStore as PluginRuntimeStore,
            lifecycleHooks: {
              onAfterLoad: async (context) => {
                const provisioner = await resolvePluginSecurityProvisioner(app);
                if (!securityProvisioningEnabled) {
                  await provisioner?.defer?.(context.manifest);
                  return;
                }
                if (!provisioner) {
                  if (hasSecurityDeclarations(context.manifest)) {
                    throw new CoreError(
                      "CMS_STARTER_SECURITY_PROVISIONER_MISSING",
                      `Plugin "${context.pluginId}" declares provisioning metadata but no PluginSecurityProvisioner is available`
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
          pluginSources: pluginSourceSnapshots
        }),
      [CORE_TOKENS.PLUGIN_RUNTIME]
    ),
    factoryProvider(
      CMS_STARTER_KERNEL_ADMIN_ROUTE_GUARD,
      () => createLazyKernelAdminRouteGuard(app),
      []
    ),
    httpProvider(KERNEL_SYSTEM_HTTP_CONTROLLER, KernelSystemHttpController, [
      CORE_TOKENS.KERNEL_SYSTEM_SERVICE,
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
    policyRules?: readonly unknown[];
  };
  settings?: readonly unknown[];
}): boolean {
  return (
    (manifest.security?.permissions?.length ?? 0) > 0 ||
    (manifest.security?.roles?.length ?? 0) > 0 ||
    (manifest.security?.grants?.length ?? 0) > 0 ||
    (manifest.security?.policyRules?.length ?? 0) > 0 ||
    (manifest.settings?.length ?? 0) > 0
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
