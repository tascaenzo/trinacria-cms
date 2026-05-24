import {
  EVENT_BUS_TOKEN,
  startCmsApp,
  type KernelPluginDefinition
} from "@trinacria-cms/kernel";
import { createCorePackMongoGlobalProviders, createCorePackPlugin } from "@trinacria-cms/core-pack";

async function bootstrap(): Promise<void> {
  const mongoUri = resolveMongoUri();
  const host = process.env.HTTP_HOST ?? "0.0.0.0";
  const port = Number(process.env.HTTP_PORT ?? "3000");
  const smokeMode = process.env.PLAYGROUND_EVENT_SMOKE === "1";
  const smokeStandalone = process.env.PLAYGROUND_EVENT_SMOKE_STANDALONE === "1";

  const handle = await startCmsApp({
    coreVersion: "0.1.0",
    http: {
      host,
      port,
      openApi: {
        enabled: true,
        title: "Trinacria CMS Playground API",
        version: "1.0.0"
      }
    },
    globalProviders: smokeStandalone
      ? []
      : createCorePackMongoGlobalProviders({
          uri: mongoUri
        }),
    plugins: smokeStandalone
      ? createPlaygroundEventSmokePlugins()
      : [createCorePackPlugin(), ...createPlaygroundEventSmokePlugins()],
    autoLoadPlugins: true
  });

  const shutdown = async () => {
    await handle.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`[playground] HTTP server ready on http://${host}:${port}`);
  console.log(`[playground] Mongo URI: ${mongoUri}`);
  if (smokeMode) {
    console.log(
      `[playground] Event smoke mode enabled${smokeStandalone ? " (standalone)" : ""}`
    );
  }
  console.log(`[playground] OpenAPI JSON available at http://${host}:${port}/openapi.json`);
  console.log(`[playground] Swagger UI available at http://${host}:${port}/docs`);
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

bootstrap().catch(async (error) => {
  console.error("[playground] bootstrap failed", error);
  process.exit(1);
});

function resolveMongoUri(): string {
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }

  const user = process.env.MONGO_ROOT_USERNAME ?? "trinacria";
  const password = process.env.MONGO_ROOT_PASSWORD ?? "trinacria";
  const host = process.env.MONGO_HOST ?? "127.0.0.1";
  const port = process.env.MONGO_PORT ?? "27017";
  const database = process.env.MONGO_DATABASE ?? "trinacria_cms";

  return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?authSource=admin`;
}
