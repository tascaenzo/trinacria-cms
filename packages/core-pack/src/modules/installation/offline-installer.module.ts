import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  apiError,
  CORE_TOKENS,
  createToken,
  type DbAdapter,
  defineModule,
  HttpController,
  httpProvider,
  response
} from "@trinacria-cms/kernel";
import { InstallationStatusResponseSchema } from "./dto/index.js";
/** Only environmental status is mounted while Mongo is unavailable. No business plugin is executed. */
export class OfflineInstallerController extends HttpController {
  constructor(private readonly db: DbAdapter) {
    super();
  }
  routes() {
    return this.router()
      .get(
        "/v1/install/status",
        async () => ({
          data: {
            installed: false,
            envFilePresent: existsSync(resolve(process.cwd(), ".env")),
            dbConfigured: Boolean(process.env.MONGO_URI),
            envFilePath: resolve(process.cwd(), ".env")
          },
          meta: { pluginId: "core-pack" }
        }),
        {
          docs: {
            pluginId: "core-pack",
            operationId: "getInstallationStatus",
            tags: ["Installation"],
            summary: "Read environment setup status",
            responses: {
              200: {
                description: "Setup status; restart after configuring Mongo",
                schema: InstallationStatusResponseSchema.toOpenApi()
              }
            }
          }
        }
      )
      .post(
        "/v1/install/bootstrap",
        async () => {
          const healthy = (await this.db.healthCheck()).ok;
          return response(
            apiError(
              "platform_maintenance",
              healthy
                ? "Restart the host to initialize transactional plugins before installation"
                : "Configure MONGO_URI for a Mongo replica set and restart the host before installation"
            ),
            { status: 503 }
          );
        },
        {
          docs: {
            pluginId: "core-pack",
            operationId: "bootstrapInstallation",
            tags: ["Installation"],
            summary: "Setup requires a transactional database and a restart",
            responses: { 503: { description: "Database setup/restart required" } }
          }
        }
      )
      .build();
  }
}
const controller = createToken<OfflineInstallerController>("CORE_OFFLINE_INSTALLER_CONTROLLER");
export const CorePackOfflineInstallerModule = defineModule({
  name: "CorePackOfflineInstallerModule",
  providers: [httpProvider(controller, OfflineInstallerController, [CORE_TOKENS.DB_ADAPTER])],
  exports: [controller]
});
