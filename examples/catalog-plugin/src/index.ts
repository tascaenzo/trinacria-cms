import {
  CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
  CorePackAuthModule,
  CorePackSecurityModule
} from "@trinacria-cms/core-pack/runtime";
import {
  CORE_TOKENS,
  createToken,
  defineModule,
  factoryProvider,
  httpProvider,
  s,
  valueProvider
} from "@trinacria-cms/kernel";
import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import {
  createApplicationOperations,
  defineEntity,
  type EntityRegistry,
  pluginOperationsProvider
} from "@trinacria-cms/kernel/runtime";
import { ITEM } from "./contracts.js";
import { CatalogController, type CatalogOperations } from "./http.js";
import { CATALOG_MANIFEST } from "./manifest.js";
import { CatalogService } from "./service.js";

export type { CatalogItem, CatalogItemInput } from "./contracts.js";
export { CATALOG_MANIFEST } from "./manifest.js";
export function createCatalogPlugin(): KernelPluginDefinition {
  const service = new CatalogService();
  const operations = createToken<CatalogOperations>("CATALOG_OPERATIONS"),
    entity = createToken<boolean>("CATALOG_ENTITY"),
    controller = createToken<CatalogController>("CATALOG_HTTP"),
    cross = createToken<import("@trinacria-cms/kernel/plugin-api").PluginOperationsProvider>(
      "CATALOG_CROSS_OPERATIONS"
    );
  const module = defineModule({
    name: "catalog-plugin:CatalogModule",
    imports: [CorePackAuthModule, CorePackSecurityModule],
    providers: [
      factoryProvider(
        entity,
        (registry: EntityRegistry) => {
          registry.register(
            defineEntity({
              ownerPluginId: "catalog-plugin",
              entityName: "items",
              schema: ITEM,
              indexes: [{ fields: { id: 1 }, unique: true, name: "catalog_item_id" }]
            })
          );
          return true;
        },
        [CORE_TOKENS.ENTITY_REGISTRY]
      ),
      factoryProvider(
        operations,
        (authorizer) =>
          createApplicationOperations(
            service,
            authorizer,
            Object.fromEntries(
              ["list", "get", "create", "update", "remove"].map((name) => [
                name,
                {
                  target: {
                    ownerPluginId: "catalog-plugin",
                    resource: "items",
                    action: ["list", "get"].includes(name) ? "read" : "write"
                  }
                }
              ])
            ) as never
          ),
        [CORE_TOKENS.OPERATION_AUTHORIZER]
      ),
      httpProvider(controller, CatalogController, [operations, CORE_PACK_JWT_AUTH_SERVICE_TOKEN]),
      pluginOperationsProvider(
        cross,
        "catalog-plugin",
        (facade: CatalogOperations) => [
          {
            name: "items.get",
            requiredPermission: "catalog-plugin:items:read",
            input: s.object({ id: s.string({ minLength: 1, maxLength: 120 }) }, { strict: true }),
            invoke: (input, context) =>
              facade.get(context.operationContext, (input as { id: string }).id)
          }
        ],
        [operations]
      )
    ],
    exports: [entity, operations, controller, cross]
  });
  return {
    manifest: CATALOG_MANIFEST,
    modules: [module],
    onLoad(context) {
      service.bind(context.services);
    },
    onUnload() {
      service.bind(undefined);
    }
  };
}
