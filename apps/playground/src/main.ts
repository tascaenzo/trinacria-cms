import { CmsKernel } from "@trinacria-cms/core";
import { createCorePackPlugin } from "@trinacria-cms/core-pack";
import { TrinacriaApp } from "@trinacria/core";
import { createHttpPlugin } from "@trinacria/http";
import { HealthModule } from "./modules/health/health.module";

async function bootstrap() {
  const kernel = new CmsKernel();
  await kernel.registerPlugin(createCorePackPlugin());
  await kernel.boot();

  const app = new TrinacriaApp();
  app.use(
    createHttpPlugin({
      host: "0.0.0.0",
      port: Number(process.env.PORT ?? 3000)
    })
  );

  await app.registerModule(HealthModule);
  await app.start();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
