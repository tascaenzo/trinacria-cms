import { TrinacriaApp } from "@trinacria/core";
import { createEventsPlugin } from "@trinacria/events";
import { createHttpPlugin } from "@trinacria/http";
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

export {
  bootstrapDiscoveredPlugins,
  type PluginBootstrapOptions,
  type PluginBootstrapResult
} from "./cms-starter/plugin-bootstrap.js";

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

  await app.registerModule(
    createCmsStarterKernelModule({
      app,
      options,
      swaggerUi,
      pluginSourceSnapshots: () => pluginSourceSnapshots
    })
  );

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
