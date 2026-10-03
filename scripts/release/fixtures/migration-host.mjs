import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { s } from "@trinacria-cms/kernel";
import {
  computeMigrationChecksum,
  createMongoDbAdapter,
  EntityRegistry,
  PLATFORM_ENTITIES,
  PluginMigrationRunner,
  registerPlatformEntities
} from "@trinacria-cms/kernel/runtime";
import mongoose from "mongoose";
import { run } from "./migrate.mjs";

export async function createMigrationDeployHost() {
  const connection = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
  const registry = new EntityRegistry();
  registerPlatformEntities(registry);
  registry.register({
    ownerPluginId: "catalog-migrations",
    entityName: "items",
    schema: s.object({}, { strict: false }),
    indexes: [{ fields: { id: 1 }, unique: true }]
  });
  const adapter = createMongoDbAdapter({ connection, entityRegistry: registry });
  const runner = new PluginMigrationRunner(adapter, {
    instanceId: "external-cli",
    packageRoot: import.meta.dirname
  });
  const migration = {
    id: "0001-item-status",
    checksum: await computeMigrationChecksum(import.meta.dirname, ["migrate.mjs"]),
    sourceFiles: ["migrate.mjs"],
    entities: ["items"],
    fromSchemaVersion: 1,
    toSchemaVersion: 2,
    kind: "transactional",
    destructive: true,
    idempotent: true
  };
  const manifest = {
    id: "catalog-migrations",
    version: "2.0.0",
    requiresCore: "*",
    entities: [{ name: "items", schemaVersion: 2 }],
    migrations: [migration]
  };
  return {
    runner,
    adapter,
    async getPlugin(id) {
      if (id !== manifest.id) return null;
      return {
        manifest,
        migrations: [{ ...migration, run }],
        artifactVersion: manifest.version,
        artifactChecksum: createHash("sha256")
          .update(await readFile(import.meta.filename))
          .digest("hex")
      };
    },
    async verifyBackupReference(reference, pluginId) {
      if (reference !== "fixture-backup-verified" || pluginId !== manifest.id)
        throw new Error("Unknown backup reference");
      const backup = JSON.parse(
        await readFile(new URL("./fixture-backup.json", import.meta.url), "utf8")
      );
      if (
        backup.owner !== manifest.id ||
        backup.sha256 !==
          createHash("sha256").update(JSON.stringify(backup.records)).digest("hex") ||
        backup.records.length !== 1
      )
        throw new Error("Backup integrity/count verification failed");
    },
    async authenticateOperator(token) {
      return token === process.env.FIXTURE_OPERATOR_TOKEN && token
        ? { actorId: "fixture-operator", canMigrate: true }
        : null;
    },
    async initializeFixture() {
      await adapter.ensureIndexes(
        "kernel",
        PLATFORM_ENTITIES.map((entity) => entity.entityName)
      );
      await adapter.ensureIndexes(manifest.id, ["items"]);
      await runner.assertSchemaCompatible({
        ...manifest,
        version: "1.0.0",
        migrations: [],
        entities: [{ name: "items", schemaVersion: 1 }]
      });
      await adapter
        .repository("items", { pluginId: manifest.id })
        .insertOne({ id: "item", schemaVersion: 1, oldLabel: "Old field" });
      const records = await adapter.repository("items", { pluginId: manifest.id }).findMany({});
      await writeFile(
        new URL("./fixture-backup.json", import.meta.url),
        JSON.stringify({
          owner: manifest.id,
          records,
          sha256: createHash("sha256").update(JSON.stringify(records)).digest("hex")
        })
      );
      await runner.maintenance.set([{ pluginId: manifest.id }], true, "fixture-operator");
    },
    async verifyFixture() {
      const item = await adapter
        .repository("items", { pluginId: manifest.id })
        .findOne({ filter: { id: "item" } });
      if (item.schemaVersion !== 2 || item.status !== "ready" || item.oldLabel !== undefined)
        throw new Error("Distributed CLI transformation did not persist");
      const backup = JSON.parse(
        await readFile(new URL("./fixture-backup.json", import.meta.url), "utf8")
      );
      registry.register({
        ownerPluginId: "catalog-restored",
        entityName: "items",
        schema: s.object({}, { strict: false })
      });
      const restored = adapter.repository("items", { pluginId: "catalog-restored" });
      for (const item of backup.records) {
        const { _id, ...record } = item;
        await restored.insertOne(record);
      }
      const original = await restored.findOne({ filter: { id: "item" } });
      if (
        original.schemaVersion !== 1 ||
        original.oldLabel !== "Old field" ||
        original.status !== undefined
      )
        throw new Error("Backup restore did not recover the original dataset");
      await runner.maintenance.assertActive({ pluginId: manifest.id });
    },
    async close() {
      await connection.close();
    }
  };
}
