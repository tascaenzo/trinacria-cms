import { randomUUID } from "node:crypto";
import type { PluginHostServices } from "@trinacria-cms/kernel/plugin-api";
import { type CatalogItem, type CatalogItemInput, ITEM_INPUT } from "./contracts.js";

class CatalogConflict extends Error {
  readonly code = "conflict";
}
export class CatalogService {
  private host?: PluginHostServices;
  bind(host?: PluginHostServices) {
    this.host = host;
  }
  private services() {
    if (!this.host)
      throw Object.assign(new Error("Catalog is not loaded"), { code: "plugin_draining" });
    return this.host;
  }
  async list(limit = 50, offset = 0) {
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 10000
    )
      throw Object.assign(new Error("Invalid pagination"), { code: "invalid_request" });
    return this.services()
      .storage.repository<CatalogItem>("items")
      .findMany({ limit, offset, sort: { createdAt: "asc", id: "asc" } });
  }
  async get(id: string) {
    return this.services().storage.repository<CatalogItem>("items").findOne({ filter: { id } });
  }
  async create(input: CatalogItemInput) {
    const data = ITEM_INPUT.parse(input),
      host = this.services();
    const prefix = await host.settings.get("catalog-plugin:catalog:prefix");
    if (prefix !== null && (typeof prefix !== "string" || prefix.length > 40))
      throw Object.assign(new Error("Catalog prefix must be a string of at most 40 characters"), {
        code: "invalid_request"
      });
    const item: CatalogItem = {
      id: randomUUID(),
      ...data,
      name: `${typeof prefix === "string" ? prefix : ""}${data.name}`,
      version: 1,
      createdAt: new Date().toISOString()
    };
    if (item.name.length > 160)
      throw Object.assign(new Error("Catalog name and prefix too long"), {
        code: "invalid_request"
      });
    return host.storage.transaction(async (storage, events) => {
      const saved = await storage.repository<CatalogItem>("items").insertOne(item);
      await events.emit(
        "catalog-plugin:item-created",
        { id: saved.id, version: saved.version },
        { partitionKey: saved.id }
      );
      return saved;
    });
  }
  async update(id: string, expectedVersion: number, input: CatalogItemInput) {
    const data = ITEM_INPUT.parse(input);
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1)
      throw new CatalogConflict("Invalid expected version");
    return this.services().storage.transaction(async (storage) => {
      const updated = await storage
        .repository<CatalogItem>("items")
        .updateOne(
          { filter: { id, version: expectedVersion } },
          { ...data, version: expectedVersion + 1 }
        );
      if (!updated) throw new CatalogConflict("Catalog item changed or no longer exists");
      return updated;
    });
  }
  async remove(id: string, expectedVersion: number) {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1)
      throw new CatalogConflict("Invalid expected version");
    return this.services().storage.transaction(async (storage) => {
      if (
        !(await storage
          .repository<CatalogItem>("items")
          .deleteOne({ filter: { id, version: expectedVersion } }))
      )
        throw new CatalogConflict("Catalog item changed or no longer exists");
      return { deleted: true };
    });
  }
}
