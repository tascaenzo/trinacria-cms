import {
  apiError,
  CORE_TOKENS,
  createToken,
  defineModule,
  HttpController,
  httpProvider,
  type InstallationHost,
  response
} from "@trinacria-cms/kernel";
import { InstallationStatusResponseSchema } from "./dto/index.js";
import { readInstallationEnvironmentStatus } from "./services/installation.service.js";
/** Environment-only status when host prerequisites fail. No business plugin is executed. */
export class OfflineInstallerController extends HttpController {
  constructor(private readonly host: InstallationHost) {
    super();
  }
  routes() {
    return this.router()
      .get(
        "/v1/install/status",
        async () => {
          const prerequisites = await this.host.inspect();
          return {
            data: {
              installed: prerequisites.installed ?? false,
              ...readInstallationEnvironmentStatus(),
              phase: "prerequisites",
              canInstall: false,
              restartRequired: true,
              checks: prerequisites.checks
            },
            meta: { pluginId: "core-pack" }
          };
        },
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
          const healthy = (await this.host.inspect()).checks.every(
            (check) => check.status === "pass"
          );
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
  providers: [
    httpProvider(controller, OfflineInstallerController, [CORE_TOKENS.INSTALLATION_HOST])
  ],
  exports: [controller]
});
