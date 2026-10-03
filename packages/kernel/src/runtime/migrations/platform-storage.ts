import { s } from "@trinacria/schema";
import type { EntityRegistry } from "../persistence/entity-registry.js";
import { defineEntity } from "../persistence/entity-registry.js";
import { PUBLIC_REQUEST_LIMIT_ENTITY } from "../persistence/public-request-limiter.js";

const common = s.object({}, { strict: false });
export const PLATFORM_ENTITIES = [
  PUBLIC_REQUEST_LIMIT_ENTITY,
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "platform_locks",
    schema: s.object(
      {
        id: s.string(),
        ownerInstanceId: s.string(),
        epoch: s.number({ int: true, min: 0 }),
        leaseUntil: s.date(),
        heartbeat: s.date(),
        fenceRevision: s.number({ int: true, min: 0 })
      },
      { strict: true }
    ),
    indexes: [{ fields: { id: 1 }, unique: true, name: "platform_locks_id" }]
  }),
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "plugin_migrations",
    schema: common,
    indexes: [
      {
        fields: { pluginId: 1, namespace: 1, migrationId: 1 },
        unique: true,
        name: "plugin_migrations_identity"
      },
      { fields: { status: 1 }, name: "plugin_migrations_status" }
    ]
  }),
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "plugin_schema_versions",
    schema: common,
    indexes: [
      {
        fields: { pluginId: 1, namespace: 1, entityName: 1 },
        unique: true,
        name: "plugin_schema_versions_identity"
      }
    ]
  }),
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "platform_writer_fences",
    schema: common,
    indexes: [{ fields: { id: 1 }, unique: true, name: "platform_writer_fences_id" }]
  }),
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "platform_audit",
    schema: common,
    indexes: [
      { fields: { id: 1 }, unique: true, name: "platform_audit_id" },
      { fields: { owner: 1, at: -1 }, name: "platform_audit_owner_time" },
      { fields: { purgeAt: 1 }, expireAfterSeconds: 0, name: "platform_audit_retention" }
    ]
  })
] as const;
export const KERNEL_NAMESPACE = Object.freeze({ pluginId: "kernel" });
export function registerPlatformEntities(registry: EntityRegistry) {
  for (const definition of PLATFORM_ENTITIES) registry.register(definition);
}
export function duplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
