import { startCmsApp } from "@trinacria-cms/kernel";
import {
  createCorePackMongoGlobalProviders,
  createCorePackPlugin,
} from "@trinacria-cms/core-pack";

async function bootstrap(): Promise<void> {
  const mongoUri = resolveMongoUri();
  const host = process.env.HTTP_HOST ?? "0.0.0.0";
  const port = Number(process.env.HTTP_PORT ?? "3000");

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
    globalProviders: createCorePackMongoGlobalProviders({
      uri: mongoUri,
    }),
    plugins: [createCorePackPlugin()],
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
  console.log(`[playground] OpenAPI JSON available at http://${host}:${port}/openapi.json`);
  console.log(`[playground] Swagger UI available at http://${host}:${port}/docs`);
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
