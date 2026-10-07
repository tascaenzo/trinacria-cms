import { randomUUID } from "node:crypto";
import type { ModuleDefinition } from "@trinacria/core";
import { factoryProvider, TrinacriaApp } from "@trinacria/core";
import { createEventsPlugin } from "@trinacria/events";
import { createHttpPlugin } from "@trinacria/http";
import type { CmsStarterHandle, CmsStarterOptions } from "../contracts/cms-starter.js";
import type {
  PluginDiscoveryService,
  PluginSourceSnapshot
} from "../contracts/plugin-discovery.js";
import type { PluginRuntime } from "../contracts/plugin-runtime.js";
import { CORE_TOKENS } from "../tokens/core-tokens.js";
import { PluginClusterCoordinator } from "./cluster/plugin-cluster.js";
import { registerAppModules } from "./cms-starter/app-modules.js";
import { registerDurableEventHost } from "./cms-starter/durable-event-host.js";
import { createOpenApiHooks, resolveSwaggerUiConfig } from "./cms-starter/openapi.js";
import { bootstrapDiscoveredPlugins } from "./cms-starter/plugin-bootstrap.js";
import { registerPluginNonceHost } from "./cms-starter/plugin-nonce-host.js";
import { registerSecurePayloadHostProvider } from "./cms-starter/secure-payload-host.js";
import { createCmsStarterKernelModule } from "./cms-starter/starter-module.js";
import { MongoDbAdapter } from "./persistence/mongo-db-adapter.js";
import { InMemoryPluginRuntime } from "./plugin-runtime/in-memory-plugin-runtime.js";

export {
  bootstrapDiscoveredPlugins,
  type PluginBootstrapOptions,
  type PluginBootstrapResult
} from "./cms-starter/plugin-bootstrap.js";
export { createCmsStarterKernelModule } from "./cms-starter/starter-module.js";

/**
 * Starts a minimal CMS app with HTTP plugin, runtime token wiring, optional modules,
 * and optional plugin registration/autoload.
 */
export async function startCmsApp(options: CmsStarterOptions): Promise<CmsStarterHandle> {
  const app = new TrinacriaApp();
  let cluster: PluginClusterCoordinator | undefined;
  if (options.cluster)
    app.registerGlobalProvider(
      factoryProvider(
        CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR,
        () =>
          new Proxy({} as PluginClusterCoordinator, {
            get(_target, property) {
              if (property === "isInitialized") return () => cluster?.isInitialized() ?? false;
              if (typeof Reflect.get(PluginClusterCoordinator.prototype, property) !== "function")
                return undefined;
              return (...args: unknown[]) => {
                if (!cluster) return Promise.reject(new Error("Cluster is not initialized"));
                const method = Reflect.get(cluster, property);
                return typeof method === "function" ? method.apply(cluster, args) : method;
              };
            }
          }),
        []
      )
    );
  const swaggerUi = resolveSwaggerUiConfig(options);
  let pluginSourceSnapshots: readonly PluginSourceSnapshot[] = [];

  const openApiHooks = createOpenApiHooks(options.http?.openApi, app);
  app.use(
    createHttpPlugin({
      host: options.http?.host ?? "0.0.0.0",
      port: options.http?.port ?? 3000,
      middlewares: options.http?.middlewares ?? [],
      openApi: openApiHooks.config,
      onRoutesRebuilt: openApiHooks.onRoutesRebuilt
    })
  );

  if (options.enableEventsPlugin !== false) {
    app.use(createEventsPlugin());
  }

  for (const provider of options.globalProviders ?? []) {
    app.registerGlobalProvider(provider);
  }
  registerSecurePayloadHostProvider(app, options);
  registerPluginNonceHost(app);
  const durable = registerDurableEventHost(app, options);

  const kernelModule = createCmsStarterKernelModule({
    app,
    options,
    swaggerUi,
    pluginSourceSnapshots: () => pluginSourceSnapshots
  });

  await app.registerModule(kernelModule);
  await registerAppModules(app, withKernelModuleImports(options.modules ?? [], kernelModule));
  try {
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
      autoLoadPlugins: false
    });
    pluginSourceSnapshots = pluginBootstrap.pluginSources;
    const installerOnly =
      options.installerOnly ||
      (options.migrations?.allowStartupWithoutDb &&
        app.hasToken(CORE_TOKENS.DB_ADAPTER) &&
        !(await (await app.resolve(CORE_TOKENS.DB_ADAPTER)).healthCheck()).ok);
    if (!installerOnly && runtime instanceof InMemoryPluginRuntime)
      await durable.initialize(runtime);
    if (installerOnly) {
      if (!options.offlineInstallerModules?.length)
        throw new Error(
          "Offline installation requires explicit environment-only installer modules"
        );
      await registerAppModules(
        app,
        withKernelModuleImports(options.offlineInstallerModules, kernelModule)
      );
    }
    if (options.cluster && !installerOnly) {
      const adapter = await app.resolve(CORE_TOKENS.DB_ADAPTER),
        registry = await app.resolve(CORE_TOKENS.ENTITY_REGISTRY);
      if (!(adapter instanceof MongoDbAdapter) || !(runtime instanceof InMemoryPluginRuntime))
        throw new Error("Cluster coordination requires the Mongo host runtime");
      const health = await adapter.healthCheck();
      if (!health.ok) throw new Error("Cluster coordination requires a healthy database");
      cluster = new PluginClusterCoordinator(adapter, registry, runtime, {
        ...options.cluster,
        instanceId: options.cluster.instanceId ?? randomUUID(),
        activity: runtime.activity
      });
      await cluster.initialize();
      await cluster.start();
    }

    if (!installerOnly && !options.cluster && options.autoLoadPlugins !== false)
      await runtime.loadMany(pluginBootstrap.plugins.map((plugin) => plugin.manifest.id));
    if (!installerOnly) await durable.start();

    return {
      startupMode: installerOnly ? "installer" : "cms",
      runtime,
      getHttpRouteInventory: openApiHooks.getInventory,
      pluginSources: pluginBootstrap.pluginSources,
      shutdown: async () => {
        await durable.close();
        await cluster?.close();
        await app.shutdown();
      }
    };
  } catch (error) {
    await durable.close().catch(() => {});
    await cluster?.close().catch(() => {});
    await app.shutdown().catch(() => {});
    throw error;
  }
}

function withKernelModuleImports(
  modules: readonly ModuleDefinition[],
  kernelModule: ModuleDefinition
): readonly ModuleDefinition[] {
  return modules.map((module) => ({
    ...module,
    imports: [kernelModule, ...(module.imports ?? [])]
  }));
}
