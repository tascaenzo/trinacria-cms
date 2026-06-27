import { factoryProvider, TrinacriaApp } from "@trinacria/core";
import { createEventsPlugin } from "@trinacria/events";
import { createHttpPlugin } from "@trinacria/http";
import type { ModuleDefinition } from "@trinacria/core";
import type { CmsStarterHandle, CmsStarterOptions } from "../contracts/cms-starter.js";
import type {
  PluginDiscoveryService,
  PluginSourceSnapshot
} from "../contracts/plugin-discovery.js";
import type { PluginRuntime } from "../contracts/plugin-runtime.js";
import { CORE_TOKENS } from "../tokens/core-tokens.js";
import { registerAppModules } from "./cms-starter/app-modules.js";
import { createOpenApiConfig, resolveSwaggerUiConfig } from "./cms-starter/openapi.js";
import { bootstrapDiscoveredPlugins } from "./cms-starter/plugin-bootstrap.js";
import { createCmsStarterKernelModule } from "./cms-starter/starter-module.js";
import { SecureEventPayloadCrypto } from "./secure-payloads/secure-event-payloads.crypto.js";
import { SecureEventPayloadsRepository } from "./secure-payloads/secure-event-payloads.repository.js";
import { SECURE_EVENT_PAYLOADS_ENTITY } from "./secure-payloads/secure-event-payloads.schemas.js";
import { SecureEventPayloadsService } from "./secure-payloads/secure-event-payloads.service.js";

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
  const swaggerUi = resolveSwaggerUiConfig(options);
  let pluginSourceSnapshots: readonly PluginSourceSnapshot[] = [];

  app.use(
    createHttpPlugin({
      host: options.http?.host ?? "0.0.0.0",
      port: options.http?.port ?? 3000,
      middlewares: options.http?.middlewares ?? [],
      openApi: createOpenApiConfig(options.http?.openApi)
    })
  );

  if (options.enableEventsPlugin !== false) {
    app.use(createEventsPlugin());
  }

  for (const provider of options.globalProviders ?? []) {
    app.registerGlobalProvider(provider);
  }
  registerSecurePayloadStoreProvider(app);

  const kernelModule = createCmsStarterKernelModule({
    app,
    options,
    swaggerUi,
    pluginSourceSnapshots: () => pluginSourceSnapshots
  });

  await app.registerModule(kernelModule);
  await registerAppModules(app, withKernelModuleImports(options.modules ?? [], kernelModule));
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

function registerSecurePayloadStoreProvider(app: TrinacriaApp): void {
  if (
    !app.hasToken(CORE_TOKENS.DB_ADAPTER) ||
    app.hasToken(CORE_TOKENS.SECURE_EVENT_PAYLOAD_STORE)
  ) {
    return;
  }

  app.registerGlobalProvider(
    factoryProvider(
      CORE_TOKENS.SECURE_EVENT_PAYLOAD_STORE,
      async () => {
        const dbAdapter = await app.resolve(CORE_TOKENS.DB_ADAPTER);
        if (app.hasToken(CORE_TOKENS.ENTITY_REGISTRY)) {
          const registry = await app.resolve(CORE_TOKENS.ENTITY_REGISTRY);
          registry.register(SECURE_EVENT_PAYLOADS_ENTITY);
        }
        const authorizer = app.hasToken(CORE_TOKENS.SECURE_EVENT_PAYLOAD_AUTHORIZER)
          ? await app.resolve(CORE_TOKENS.SECURE_EVENT_PAYLOAD_AUTHORIZER)
          : null;
        return new SecureEventPayloadsService(
          new SecureEventPayloadsRepository(dbAdapter),
          new SecureEventPayloadCrypto({
            masterKey: process.env.CMS_SECURE_PAYLOAD_MASTER_KEY,
            keyVersion: process.env.CMS_SECURE_PAYLOAD_KEY_VERSION
          }),
          authorizer
        );
      },
      []
    )
  );
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
