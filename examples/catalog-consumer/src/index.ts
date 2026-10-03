import { CORE_TOKENS, createToken, defineModule, factoryProvider, s } from "@trinacria-cms/kernel";
import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import type {
  PluginHostServices,
  PluginOperationsProvider
} from "@trinacria-cms/kernel/plugin-api";
import {
  defineEntity,
  type EntityRegistry,
  pluginOperationsProvider
} from "@trinacria-cms/kernel/runtime";

const OBSERVATION_SCHEMA = s.object({ id: s.string(), itemId: s.string() }, { strict: true });
export function createCatalogConsumer(): KernelPluginDefinition {
  let services: PluginHostServices | undefined;
  const operations = pluginOperationsProvider(
    createToken<PluginOperationsProvider>("CATALOG_CONSUMER_OPERATIONS"),
    "catalog-consumer",
    () => [
      {
        name: "inspect",
        requiredPermission: "catalog-consumer:observations:read",
        input: s.object({ id: s.string({ minLength: 1 }) }, { strict: true }),
        async invoke(input) {
          if (!services) throw new Error("Consumer unavailable");
          return services.operations.call("catalog-plugin", "items.get", input as { id: string });
        }
      }
    ]
  );
  const entity = createToken<boolean>("CATALOG_CONSUMER_ENTITY");
  const registration = factoryProvider(
    entity,
    (registry: EntityRegistry) => {
      registry.register(
        defineEntity({
          ownerPluginId: "catalog-consumer",
          entityName: "observations",
          schema: OBSERVATION_SCHEMA,
          indexes: [{ fields: { id: 1 }, unique: true, name: "observations_event_id" }]
        })
      );
      return true;
    },
    [CORE_TOKENS.ENTITY_REGISTRY]
  );
  return {
    manifest: {
      id: "catalog-consumer",
      version: "0.1.0",
      requiresCore: "^0.1.0",
      dependencies: [{ pluginId: "catalog-plugin", versionRange: "^0.1.0" }],
      entities: [
        {
          name: "observations",
          schemaVersion: 1,
          documentSchema: {
            type: "object",
            required: ["id", "itemId"],
            properties: { id: { type: "string" }, itemId: { type: "string" } },
            additionalProperties: false
          },
          indexes: [{ name: "observations_event_id", fields: { id: 1 }, unique: true }]
        }
      ],
      security: {
        permissions: [
          { key: "catalog-consumer:observations:read", displayName: "Read observations" }
        ]
      },
      events: {
        subscribes: [
          {
            eventName: "catalog-plugin:item-created",
            handler: "observe",
            requiredPermission: "catalog-plugin:items:read"
          }
        ]
      }
    },
    modules: [
      defineModule({
        name: "catalog-consumer:ConsumerModule",
        providers: [registration, operations],
        exports: [entity, operations.token]
      })
    ],
    onLoad(context) {
      services = context.services;
    },
    onUnload() {
      services = undefined;
    },
    eventHandlers: {
      async observe(payload, envelope, context) {
        const value = s
          .object({ id: s.string(), version: s.number({ int: true, min: 1 }) }, { strict: true })
          .parse(payload);
        await context.services.storage
          .repository("observations")
          .insertOne({ id: envelope.id, itemId: value.id });
      }
    }
  };
}
