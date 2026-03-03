import {
  createToken,
  defineModule,
  factoryProvider,
  TrinacriaApp,
  valueProvider,
  type ModuleDefinition,
} from "@trinacria/core";
import { createHttpPlugin, httpProvider } from "@trinacria/http";
import type {
  CmsSwaggerUiConfig,
  CmsStarterHandle,
  CmsStarterOptions,
} from "../contracts/cms-starter.js";
import type { PluginRuntime } from "../contracts/plugin-runtime.js";
import { CoreError } from "../errors/core-error.js";
import { InMemoryPluginRuntime } from "./in-memory-plugin-runtime.js";
import { CORE_TOKENS } from "../tokens/core-tokens.js";
import { KernelHealthService } from "./kernel-health-service.js";
import { KernelHealthHttpController } from "../http/kernel-health.controller.js";
import { KERNEL_HEALTH_HTTP_CONTROLLER } from "../http/kernel-health.tokens.js";
import { CmsSwaggerController } from "../http/cms-swagger.controller.js";

const CMS_STARTER_SWAGGER_CONFIG_TOKEN = createToken<CmsSwaggerUiConfig>(
  "CMS_STARTER_SWAGGER_CONFIG",
);
const CMS_STARTER_SWAGGER_CONTROLLER = createToken<CmsSwaggerController>(
  "CMS_STARTER_SWAGGER_CONTROLLER",
);

/**
 * Starts a minimal CMS app with HTTP plugin, runtime token wiring, optional modules,
 * and optional plugin registration/autoload.
 */
export async function startCmsApp(
  options: CmsStarterOptions,
): Promise<CmsStarterHandle> {
  const app = new TrinacriaApp();
  const swaggerUi: CmsSwaggerUiConfig = {
    enabled: options.swaggerUi?.enabled ?? true,
    path: options.swaggerUi?.path ?? "/docs",
    openApiJsonPath: options.swaggerUi?.openApiJsonPath ?? "/openapi.json",
    title:
      options.swaggerUi?.title ??
      options.http?.openApi?.title ??
      "Trinacria CMS API Docs",
  };

  app.use(
    createHttpPlugin({
      host: options.http?.host ?? "0.0.0.0",
      port: options.http?.port ?? 3000,
      openApi: options.http?.openApi,
    }),
  );

  const starterModule = defineModule({
    name: "CmsStarterKernelModule",
    imports: [],
    providers: [
      factoryProvider(
        CORE_TOKENS.PLUGIN_RUNTIME,
        () =>
          new InMemoryPluginRuntime({
            coreVersion: options.coreVersion,
            app,
          }),
        [],
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
                  },
                }),
              [CORE_TOKENS.PLUGIN_RUNTIME],
            ),
            httpProvider(
              KERNEL_HEALTH_HTTP_CONTROLLER,
              KernelHealthHttpController,
              [CORE_TOKENS.KERNEL_HEALTH_SERVICE],
            ),
          ]),
      ...(swaggerUi.enabled === false
        ? []
        : [
            valueProvider(CMS_STARTER_SWAGGER_CONFIG_TOKEN, swaggerUi),
            httpProvider(CMS_STARTER_SWAGGER_CONTROLLER, CmsSwaggerController, [
              CMS_STARTER_SWAGGER_CONFIG_TOKEN,
            ]),
          ]),
    ],
    exports: [
      CORE_TOKENS.PLUGIN_RUNTIME,
      ...(options.enableHealthModule === false
        ? []
        : [CORE_TOKENS.KERNEL_HEALTH_SERVICE, KERNEL_HEALTH_HTTP_CONTROLLER]),
      ...(swaggerUi.enabled === false ? [] : [CMS_STARTER_SWAGGER_CONTROLLER]),
    ],
  });

  await app.registerModule(starterModule);
  for (const provider of options.globalProviders ?? []) {
    app.registerGlobalProvider(provider);
  }
  await registerAppModules(app, options.modules ?? []);
  await app.start();

  const runtime = await app.resolve<PluginRuntime>(CORE_TOKENS.PLUGIN_RUNTIME);
  const plugins = options.plugins ?? [];
  for (const plugin of plugins) {
    await runtime.register(plugin);
  }
  if (options.autoLoadPlugins !== false && plugins.length > 0) {
    await runtime.loadMany(plugins.map((plugin) => plugin.manifest.id));
  }

  return {
    runtime,
    shutdown: async () => {
      await app.shutdown();
    },
  };
}

async function registerAppModules(
  app: TrinacriaApp,
  modules: readonly ModuleDefinition[],
): Promise<void> {
  for (const moduleDefinition of modules) {
    if (!moduleDefinition || typeof moduleDefinition !== "object") {
      throw new CoreError(
        "CMS_STARTER_INVALID_MODULE",
        "Invalid module provided to CMS starter",
      );
    }
    await app.registerModule(moduleDefinition);
  }
}
