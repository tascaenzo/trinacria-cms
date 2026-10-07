import { createHash } from "node:crypto";
import type { OperationAuthorizer } from "@trinacria-cms/kernel/contracts";
import { createSystemOperationContext } from "@trinacria-cms/kernel/runtime";
import type { MediaAssetsService } from "@trinacria-cms/media-pack/runtime";
import type { ContentTypeRecord } from "../content-types/content-types.schemas.js";
import type { ContentTypesRepository } from "../content-types/repositories/content-types.repository.js";
import type { EntryRecord } from "../entries/entries.schemas.js";
import type { DeliveryDependency, SharedDeliveryCache } from "./delivery-cache.js";
import { deliveryProjection } from "./delivery-projection.js";
import { NavigationItemsSchema, publicEntryPath } from "./navigation.js";
import { validatePublicationContent } from "./publication-validation.js";
import type { PublicationsRepository } from "./publications.repository.js";
import type { PublicationPointer } from "./publications.schemas.js";

export interface PublicEntry {
  id: string;
  contentTypeKey: string;
  publicationVersion: number;
  deliveryConfigVersion: number;
  publishedAt: string;
  title?: string;
  slug?: string;
  body?: EntryRecord["body"];
  data: Record<string, unknown>;
}
const targets = [
  { ownerPluginId: "editorial-pack", resource: "delivery", action: "read" },
  { ownerPluginId: "media-pack", resource: "assets", action: "read" }
] as const;
interface ProjectionBudget {
  count: number;
  visited: Set<string>;
  checks: (() => Promise<boolean>)[];
  dependencies: DeliveryDependency[];
}
/** Always reads active pointers, current projection and Media ACL; never serves the working record. */
export class EditorialDeliveryService {
  constructor(
    private readonly publications: PublicationsRepository,
    private readonly types: ContentTypesRepository,
    private readonly media: Pick<MediaAssetsService, "validateUse">,
    private readonly authorizer: OperationAuthorizer,
    private readonly readNavigation: () => Promise<unknown> = async () => [],
    private readonly cache?: SharedDeliveryCache
  ) {}
  private async guard<T>(work: () => Promise<T>) {
    const context = createSystemOperationContext("public-delivery", targets);
    const execute = async () => {
      for (const target of targets) await this.authorizer.assert(context, target);
      const result = await work();
      for (const target of targets) await this.authorizer.assert(context, target);
      return result;
    };
    return this.authorizer.run ? this.authorizer.run(context, targets, execute) : execute();
  }
  async navigation() {
    return this.guard(async () => {
      const result: { label: string; href: string }[] = [];
      for (const item of NavigationItemsSchema.parse(await this.readNavigation())) {
        if (item.href) result.push({ label: item.label, href: item.href });
        else if (await this.get(item.contentTypeKey!, item.slug!))
          result.push({
            label: item.label,
            href: publicEntryPath(item.contentTypeKey!, item.slug!)
          });
      }
      return result;
    });
  }
  async get(key: string, slug: string) {
    return this.guard(async () => {
      const type = await this.publicTypeByKey(key);
      if (!type) return null;
      const pointer = await this.publications.findBySlug(type.id, slug);
      if (!pointer) return null;
      const cacheKey = createHash("sha256")
        .update(JSON.stringify([pointer.snapshotId, type.deliveryConfigVersion ?? 1]))
        .digest("hex");
      const cached = await this.cache?.get(cacheKey);
      if (cached) {
        let valid = true;
        for (let pass = 0; pass < 2 && valid; pass++)
          for (const dependency of cached.dependencies)
            if (!(await this.validDependency(dependency))) {
              valid = false;
              break;
            }
        if (valid) return this.result(cached.dto);
      }
      const budget: ProjectionBudget = {
        count: 0,
        visited: new Set(),
        checks: [],
        dependencies: []
      };
      const entry = pointer ? await this.project(type, pointer, budget, 0) : null;
      if (!entry || !(await this.current(budget))) return null;
      await this.cache?.put(cacheKey, entry, budget.dependencies);
      if (!(await this.current(budget))) return null;
      return this.result(entry);
    });
  }
  async list(key: string, limit = 50, offset = 0) {
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 10000
    )
      throw Object.assign(new Error("Invalid delivery pagination"), { code: "invalid_request" });
    return this.guard(async () => {
      const type = await this.publicTypeByKey(key);
      if (!type) return null;
      const items: PublicEntry[] = [];
      for (const pointer of await this.publications.listPointers(type.id, limit, offset)) {
        const budget: ProjectionBudget = {
          count: 0,
          visited: new Set(),
          checks: [],
          dependencies: []
        };
        const entry = await this.project(type, pointer, budget, 0);
        if (entry && (await this.current(budget))) items.push(entry);
      }
      return { items, limit, offset };
    });
  }
  private result(entry: PublicEntry) {
    return {
      entry,
      etag: '"' + createHash("sha256").update(JSON.stringify(entry)).digest("hex") + '"'
    };
  }
  private async validDependency(dependency: DeliveryDependency) {
    const pointer = await this.publications.getPointer(dependency.entryId),
      type = await this.types.findById(dependency.contentTypeId);
    if (
      pointer?.snapshotId !== dependency.snapshotId ||
      !type?.delivery?.enabled ||
      type.deletedAt ||
      type.status !== "active" ||
      (type.deliveryConfigVersion ?? 1) !== dependency.configVersion
    )
      return false;
    const snapshot = await this.publications.snapshot(pointer);
    if (!snapshot) return false;
    try {
      await validatePublicationContent(type, snapshot.entry, this.media);
      return true;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "validation_error")
        return false;
      throw error;
    }
  }
  private async current(budget: ProjectionBudget) {
    for (const check of budget.checks) if (!(await check())) return false;
    return true;
  }
  async previewWorking(type: ContentTypeRecord, entry: EntryRecord) {
    return this.guard(async () => {
      if (!type.delivery?.enabled || type.status !== "active" || type.deletedAt) return null;
      await validatePublicationContent(type, entry, this.media);
      const budget: ProjectionBudget = {
        count: 0,
        visited: new Set([entry.id]),
        checks: [],
        dependencies: []
      };
      const projection = await deliveryProjection(type, entry, async (targetTypeId, id) => {
        const pointer = await this.publications.getPointer(id);
        const target = pointer && (await this.types.findById(pointer.contentTypeId));
        if (
          !pointer ||
          pointer.contentTypeId !== targetTypeId ||
          !target?.delivery?.enabled ||
          target.deletedAt ||
          target.status !== "active"
        )
          return null;
        return this.project(target, pointer, budget, 1);
      });
      const current = await this.types.findById(type.id);
      if (
        !current?.delivery?.enabled ||
        current.deletedAt ||
        current.status !== "active" ||
        (current.deliveryConfigVersion ?? 1) !== (type.deliveryConfigVersion ?? 1) ||
        !(await this.current(budget))
      )
        return null;
      await validatePublicationContent(current, entry, this.media);
      return projection;
    });
  }
  private async publicTypeByKey(key: string) {
    const type = await this.types.findByKey(key);
    return type && !type.deletedAt && type.status === "active" && type.delivery?.enabled
      ? type
      : null;
  }
  private async project(
    type: ContentTypeRecord,
    pointer: PublicationPointer,
    budget: ProjectionBudget,
    depth: number
  ): Promise<PublicEntry | null> {
    if (++budget.count > 100 || budget.visited.has(pointer.entryId)) return null;
    budget.visited.add(pointer.entryId);
    const snapshot = await this.publications.snapshot(pointer),
      config = type.delivery;
    if (!snapshot || !config?.enabled || !pointer.slug) return null;
    try {
      await validatePublicationContent(type, snapshot.entry, this.media);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "validation_error")
        return null;
      throw error; // Outages must remain unavailable, never a stale cached projection.
    }
    const entry = snapshot.entry;
    budget.dependencies.push({
      entryId: pointer.entryId,
      snapshotId: pointer.snapshotId,
      contentTypeId: type.id,
      configVersion: type.deliveryConfigVersion ?? 1
    });
    // Every expanded resource is checked again after the complete projection,
    // so a revoked child or asset cannot survive in its parent's ETag response.
    budget.checks.push(async () => {
      const active = await this.publications.getPointer(pointer.entryId);
      const currentType = await this.types.findById(type.id);
      if (
        active?.snapshotId !== pointer.snapshotId ||
        !currentType?.delivery?.enabled ||
        currentType.deletedAt ||
        currentType.status !== "active" ||
        (currentType.deliveryConfigVersion ?? 1) !== (type.deliveryConfigVersion ?? 1)
      )
        return false;
      try {
        await validatePublicationContent(currentType, entry, this.media);
        return true;
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "validation_error")
          return false;
        throw error;
      }
    });
    const projection = await deliveryProjection(type, entry, async (targetTypeId, id) => {
      if (depth >= 2) return null;
      const target = await this.publications.getPointer(id);
      if (!target || target.contentTypeId !== targetTypeId) return null;
      const targetType = await this.types.findById(target.contentTypeId);
      if (!targetType?.delivery?.enabled || targetType.status !== "active" || targetType.deletedAt)
        return null;
      return this.project(targetType, target, budget, depth + 1);
    });
    // Recheck pointer after asynchronous ACL/relation work, including before a caller considers 304.
    const active = await this.publications.getPointer(pointer.entryId);
    const currentType = await this.types.findById(type.id);
    if (
      active?.snapshotId !== pointer.snapshotId ||
      !currentType?.delivery?.enabled ||
      currentType.status !== "active" ||
      (currentType.deliveryConfigVersion ?? 1) !== (type.deliveryConfigVersion ?? 1)
    )
      return null;
    return {
      ...projection,
      publicationVersion: snapshot.publicationVersion,
      deliveryConfigVersion: type.deliveryConfigVersion ?? 1,
      publishedAt: snapshot.publishedAt
    };
  }
}
