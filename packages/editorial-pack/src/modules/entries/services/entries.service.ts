import { randomUUID } from "node:crypto";
import type { SettingsService } from "@trinacria-cms/core-pack/runtime";
import type { DbAdapter } from "@trinacria-cms/kernel";
import type { OperationAuthorizer, OperationContext } from "@trinacria-cms/kernel/contracts";
import type { MongoDurableEventStore } from "@trinacria-cms/kernel/runtime";
import type { MediaAssetsService } from "@trinacria-cms/media-pack/runtime";
import type { ContentTypeRecord } from "../../content-types/content-types.schemas.js";
import { ContentTypesRepository } from "../../content-types/repositories/content-types.repository.js";
import { ContentTypesService } from "../../content-types/services/content-types.service.js";
import { validatePublicationContent } from "../../publications/publication-validation.js";
import { PublicationsRepository } from "../../publications/publications.repository.js";
import { RevisionsRepository } from "../../revisions/revisions.repository.js";
import {
  type CreateEntryInput,
  CreateEntryInputSchema,
  type UpdateEntryInput,
  UpdateEntryInputSchema
} from "../entries.input.js";
import type { EntryRecord } from "../entries.schemas.js";
import { EntryRecordSchema } from "../entries.schemas.js";
import { EntriesRepository } from "../repositories/entries.repository.js";
import { resolveEntryWorkflow } from "./entry-workflows.js";

export class EntryValidationError extends Error {
  readonly code: string = "validation_error";
  constructor(message: string) {
    super(message);
    this.name = "EntryValidationError";
  }
}

export class EntryConflictError extends EntryValidationError {
  readonly code = "conflict";
}

export class EntryAccessError extends Error {
  readonly code = "auth_forbidden_admin_required";

  constructor(message = "Editorial permission denied") {
    super(message);
    this.name = "EntryAccessError";
  }
}

export type EditorialTransition = string;

export interface EditorialDomainEventPublisher {
  emit(eventName: string, payload: unknown): Promise<void>;
}

export interface EntryAccessScope {
  actorUserId: string;
  canAccessAll: boolean;
  canReviewAssigned?: boolean;
  canUseAuthorScope?: boolean;
}

export class EntriesService {
  private publisher?: EditorialDomainEventPublisher;

  constructor(
    private readonly repository: EntriesRepository,
    private readonly contentTypes: ContentTypesService,
    private readonly revisions: RevisionsRepository,
    private readonly settings?: SettingsService,
    private readonly db?: DbAdapter,
    private readonly authorization?: {
      context: OperationContext;
      authorizer: OperationAuthorizer;
      scope?: () => Promise<EntryAccessScope>;
    },
    private readonly fenceModel = false,
    private readonly durable?: MongoDurableEventStore,
    private readonly publications: PublicationsRepository | undefined = db
      ? new PublicationsRepository(db)
      : undefined,
    private readonly media?: Pick<MediaAssetsService, "validateUse">
  ) {}

  withAuthorization(
    context: OperationContext,
    authorizer: OperationAuthorizer,
    scope?: () => Promise<EntryAccessScope>
  ): EntriesService {
    const service = new EntriesService(
      this.repository,
      this.contentTypes,
      this.revisions,
      this.settings,
      this.db,
      { context, authorizer, scope },
      this.fenceModel,
      this.durable,
      this.publications,
      this.media
    );
    service.setPublisher(this.publisher);
    return service;
  }

  private async assertAction(action: string, id?: string, resource = "entries") {
    if (this.authorization)
      await this.authorization.authorizer.assert(this.authorization.context, {
        ownerPluginId: "editorial-pack",
        resource,
        action,
        resourceId: id
      });
  }

  setPublisher(publisher: EditorialDomainEventPublisher | undefined): void {
    this.publisher = publisher;
  }

  async createEntry(input: CreateEntryInput, ownerUserId: string): Promise<EntryRecord> {
    if (this.db) return this.atomic((service) => service.createEntry(input, ownerUserId));
    await this.assertAction("create");
    const parsed = CreateEntryInputSchema.parse(input);
    const contentType = await this.requireActiveContentType(parsed.contentTypeId);
    const initialStatus =
      resolveEntryWorkflow(contentType).states.find((state) => state.initial)?.key ?? "draft";
    if (initialStatus === "published") await this.assertAction("publish");
    this.validateData(contentType, parsed.data as Record<string, unknown>);
    const created = await this.repository.create({
      ...parsed,
      ownerUserId,
      initialStatus:
        resolveEntryWorkflow(contentType).states.find((state) => state.initial)?.key ?? "draft"
    });
    const revision = await this.createRevision(created, "created", ownerUserId);
    if (created.status === "published") {
      await validatePublicationContent(contentType, created, this.media);
      await this.requirePublications().publish(created, revision.id);
      await this.publisher?.emit("entry-published", toEventPayload(created, ownerUserId));
      await this.publisher?.emit("delivery-invalidated", { scope: "entry", id: created.id });
    }
    await this.publisher?.emit("entry-created", toEventPayload(created, ownerUserId));
    return created;
  }

  async getEntry(id: string, scope?: EntryAccessScope) {
    await this.assertAction("read", id);
    const entry = await this.repository.findById(id);
    if (entry && scope) await this.assertEntryAccess(entry, scope);
    return entry;
  }

  async listEntries(
    options: Parameters<EntriesRepository["list"]>[0] = {},
    scope?: EntryAccessScope
  ) {
    await this.assertAction("read");
    if (this.authorization?.scope) scope = await this.authorization.scope();
    if (!scope || scope.canAccessAll) return this.repository.list(options);
    const types = await this.contentTypes.listContentTypes();
    const unrestricted: string[] = [];
    for (const type of types)
      if (scope.canUseAuthorScope !== false && (await this.authorCanAccessAll(type)))
        unrestricted.push(type.id);
    return this.repository.list({
      ...options,
      accessFilter: {
        $or: [
          { ownerUserId: scope.actorUserId },
          ...(scope.canReviewAssigned ? [{ reviewerUserId: scope.actorUserId }] : []),
          ...(unrestricted.length ? [{ contentTypeId: { $in: unrestricted } }] : [])
        ]
      }
    });
  }

  /** Seeds a small, immediately understandable blog only when the workspace is empty. */
  async ensureDefaultBlogContent(): Promise<void> {
    if ((await this.repository.list({ limit: 1 })).length > 0) return;
    const contentTypes = await this.contentTypes.listContentTypes({ status: "active", limit: 20 });
    const article = contentTypes.find((contentType) => contentType.key === "article");
    const page = contentTypes.find((contentType) => contentType.key === "page");
    if (article) {
      await this.createEntry(
        {
          contentTypeId: article.id,
          title: "Benvenuto nel tuo nuovo blog",
          slug: "benvenuto-nel-tuo-nuovo-blog",
          data: { category: "Tecnologia", tags: ["CMS", "Editoriale"] }
        },
        "system:editorial-pack"
      );
    }
    if (page) {
      await this.createEntry(
        {
          contentTypeId: page.id,
          title: "Chi siamo",
          slug: "chi-siamo",
          data: {}
        },
        "system:editorial-pack"
      );
    }
  }

  async updateEntry(
    id: string,
    input: UpdateEntryInput,
    scope: EntryAccessScope
  ): Promise<EntryRecord | null> {
    if (this.db) return this.atomic((service) => service.updateEntry(id, input, scope));
    await this.assertAction("update", id);
    const parsed = UpdateEntryInputSchema.parse(input);
    const entry = await this.repository.findById(id);
    if (!entry) return null;
    await this.assertEntryAccess(entry, scope);
    if (entry.status === "published") await this.assertAction("publish", id);
    await this.requireContentTypeForExistingEntry(entry.contentTypeId);
    if (parsed.data !== undefined) {
      const contentType = await this.requireActiveContentType(entry.contentTypeId);
      this.validateData(contentType, parsed.data as Record<string, unknown>);
    }
    const updated = await this.repository.update(
      entry.id,
      parsed,
      parsed.expectedVersion ?? entry.version ?? 1
    );
    if (!updated) {
      throw new EntryConflictError(
        "Il contenuto è stato modificato da un altro utente. Aggiorna e riprova."
      );
    }
    return updated;
  }

  async transitionEntry(
    id: string,
    transition: EditorialTransition,
    scope: EntryAccessScope
  ): Promise<EntryRecord | null> {
    if (this.db) return this.atomic((service) => service.transitionEntry(id, transition, scope));
    const entry = await this.repository.findById(id);
    if (!entry) return null;
    await this.assertEntryAccess(entry, scope);
    const contentType = await this.requireContentTypeForExistingEntry(entry.contentTypeId);
    const configuredWorkflow = resolveEntryWorkflow(contentType);
    const configuredTransition = configuredWorkflow.transitions.find(
      (candidate) => candidate.key === transition && candidate.from === entry.status
    );
    if (!configuredTransition) {
      throw new EntryValidationError(
        `Transition "${transition}" is not available from status "${entry.status}"`
      );
    }
    const action =
      configuredTransition.requiredPermission ??
      (configuredTransition.to === "published" || entry.status === "published"
        ? "publish"
        : transition === "request_changes"
          ? "review"
          : transition === "approve"
            ? "approve"
            : "submit");
    await this.assertAction(action, id);
    if (configuredTransition.to === "published" || entry.status === "published")
      await this.assertAction("publish", id);
    if (
      configuredTransition.to === "in_review" &&
      (await this.requiresReviewerAssignment()) &&
      !entry.reviewerUserId
    ) {
      throw new EntryValidationError(
        "Assegna un revisore prima di inviare il contenuto in revisione."
      );
    }
    if (
      configuredTransition.to === "published" &&
      entry.scheduledAt &&
      new Date(entry.scheduledAt).getTime() > Date.now()
    ) {
      throw new EntryValidationError(
        "Il contenuto è programmato per una data futura e non può essere pubblicato ora."
      );
    }
    const updated = await this.repository.updateStatus(
      entry.id,
      configuredTransition.to,
      entry.status,
      entry.version ?? 1
    );
    if (!updated) {
      throw new EntryConflictError(
        "Il contenuto è stato modificato da un altro utente. Aggiorna e riprova."
      );
    }
    const revision = await this.createRevision(
      updated,
      `transition:${transition}`,
      scope.actorUserId
    );
    await this.publisher?.emit("entry-transitioned", toEventPayload(updated, scope.actorUserId));
    if (updated.status === "published") {
      await validatePublicationContent(contentType, updated, this.media);
      await this.requirePublications().publish(updated, revision.id);
      await this.publisher?.emit("entry-published", toEventPayload(updated, scope.actorUserId));
    } else if (entry.status === "published") {
      await this.requirePublications().unpublish(entry.id);
    }
    if (updated.status === "published" || entry.status === "published")
      await this.publisher?.emit("delivery-invalidated", { scope: "entry", id: entry.id });
    return updated;
  }

  async publishSnapshot(
    id: string,
    expectedVersion: number,
    scope: EntryAccessScope
  ): Promise<EntryRecord | null> {
    if (this.db)
      return this.atomic((service) => service.publishSnapshot(id, expectedVersion, scope));
    await this.assertAction("publish", id);
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1)
      throw new EntryValidationError("expectedVersion required");
    const entry = await this.repository.findById(id);
    if (!entry) return null;
    await this.assertEntryAccess(entry, scope);
    if (entry.status !== "published")
      throw new EntryValidationError("Publish through the workflow before republishing");
    const type = await this.requireActiveContentType(entry.contentTypeId);
    await validatePublicationContent(type, entry, this.media);
    const updated = await this.repository.update(id, {}, expectedVersion);
    if (!updated) throw new EntryConflictError("Working copy changed before publication");
    const revision = await this.createRevision(updated, "publication", scope.actorUserId);
    await this.requirePublications().publish(updated, revision.id);
    await this.publisher?.emit("entry-published", toEventPayload(updated, scope.actorUserId));
    await this.publisher?.emit("delivery-invalidated", { scope: "entry", id: entry.id });
    return updated;
  }

  private requirePublications() {
    if (!this.publications)
      throw new EntryValidationError("Transactional publication repository required");
    return this.publications;
  }

  async listRevisions(entryId: string, scope?: EntryAccessScope) {
    await this.assertAction("read", entryId, "revisions");
    const entry = await this.repository.findById(entryId);
    if (!entry) return null;
    if (scope) await this.assertEntryAccess(entry, scope);
    return this.revisions.listByEntryId(entryId);
  }

  /** Saves an intentional restore point; ordinary and automatic saves do not create revisions. */
  async createRevisionSnapshot(id: string, scope: EntryAccessScope): Promise<EntryRecord | null> {
    if (this.db) return this.atomic((service) => service.createRevisionSnapshot(id, scope));
    await this.assertAction("update", id);
    const entry = await this.repository.findById(id);
    if (!entry) return null;
    await this.assertEntryAccess(entry, scope);
    await this.requireContentTypeForExistingEntry(entry.contentTypeId);
    const locked = await this.repository.update(id, {}, entry.version ?? 1);
    if (!locked)
      throw new EntryConflictError("Il contenuto è stato modificato da un altro utente.");
    await this.createRevision(locked, "snapshot", scope.actorUserId);
    return locked;
  }

  async getTransitionPermission(
    id: string,
    transition: EditorialTransition
  ): Promise<string | null> {
    const entry = await this.repository.findById(id);
    if (!entry) return null;
    const contentType = await this.requireContentTypeForExistingEntry(entry.contentTypeId);
    const configured = resolveEntryWorkflow(contentType).transitions.find(
      (candidate) => candidate.key === transition && candidate.from === entry.status
    );
    if (!configured) return null;
    if (configured.to === "published" || entry.status === "published") return "publish";
    if (configured.requiredPermission) return configured.requiredPermission;
    if (transition === "request_changes") return "review";
    if (transition === "approve") return "approve";
    return "submit";
  }

  async restoreRevision(
    id: string,
    revisionId: string,
    scope: EntryAccessScope
  ): Promise<EntryRecord | null> {
    if (this.db) return this.atomic((service) => service.restoreRevision(id, revisionId, scope));
    await this.assertAction("restore", id, "revisions");
    const entry = await this.repository.findById(id);
    if (!entry) return null;
    await this.assertEntryAccess(entry, scope);
    if (entry.status === "published") await this.assertAction("publish", id);
    const revision = await this.revisions.findById(id, revisionId);
    if (!revision) throw new EntryValidationError(`Revision "${revisionId}" does not exist`);
    let snapshot: EntryRecord;
    try {
      snapshot = EntryRecordSchema.parse(JSON.parse(revision.snapshotJson));
    } catch {
      throw new EntryValidationError("La revisione selezionata non è leggibile.");
    }
    const type = await this.requireActiveContentType(entry.contentTypeId);
    if (snapshot.id !== entry.id || snapshot.contentTypeId !== entry.contentTypeId) {
      throw new EntryValidationError("La revisione non appartiene a questo contenuto.");
    }
    this.validateData(type, snapshot.data as Record<string, unknown>);
    // Restore content only: lifecycle, assignment and publication remain governed by transitions.
    const restored = await this.repository.restore(entry.id, snapshot, entry.version ?? 1);
    if (!restored) {
      throw new EntryConflictError("Il contenuto è stato modificato da un altro utente.");
    }
    await this.createRevision(restored, `restore:${revision.revisionNumber}`, scope.actorUserId);
    return restored;
  }

  async deleteEntry(id: string, scope: EntryAccessScope): Promise<boolean> {
    if (this.db) return this.atomic((service) => service.deleteEntry(id, scope));
    await this.assertAction("delete", id);
    const entry = await this.repository.findById(id);
    if (!entry) return false;
    await this.assertEntryAccess(entry, scope);
    await this.requireContentTypeForExistingEntry(entry.contentTypeId);
    if (entry.status === "published") {
      await this.requirePublications().unpublish(id);
      await this.publisher?.emit("delivery-invalidated", { scope: "entry", id });
    }
    return this.repository.delete(id);
  }

  private async requireActiveContentType(contentTypeId: string): Promise<ContentTypeRecord> {
    const contentType = await this.contentTypes.getContentTypeForEntry(
      contentTypeId,
      this.fenceModel
    );
    if (!contentType) {
      throw new EntryValidationError(`Content type "${contentTypeId}" does not exist`);
    }
    if (contentType.status !== "active") {
      throw new EntryValidationError(`Content type "${contentType.key}" is archived`);
    }
    return contentType;
  }

  private async requireContentTypeForExistingEntry(
    contentTypeId: string
  ): Promise<ContentTypeRecord> {
    const contentType = await this.contentTypes.getContentTypeForEntry(
      contentTypeId,
      this.fenceModel
    );
    if (!contentType) {
      throw new EntryValidationError(`Content type "${contentTypeId}" does not exist`);
    }
    return contentType;
  }

  private async authorCanAccessAll(type: ContentTypeRecord): Promise<boolean> {
    const setting = await this.settings?.getResolvedValueByKey(
      "editorial-pack:access:author_scope"
    );
    const policy = setting?.value ?? "own_entries";
    return (
      policy === "all_entries" ||
      (policy === "by_content_type" && type.ownershipScope === "all_entries")
    );
  }

  private async assertEntryAccess(entry: EntryRecord, scope: EntryAccessScope) {
    if (this.authorization?.scope) scope = await this.authorization.scope();
    if (
      scope.canAccessAll ||
      entry.ownerUserId === scope.actorUserId ||
      (scope.canReviewAssigned && entry.reviewerUserId === scope.actorUserId)
    )
      return;
    const type = await this.requireContentTypeForExistingEntry(entry.contentTypeId);
    if (scope.canUseAuthorScope === false || !(await this.authorCanAccessAll(type))) {
      throw new EntryAccessError("Non hai accesso a questo contenuto.");
    }
  }

  private async atomic<T>(work: (service: EntriesService) => Promise<T>): Promise<T> {
    if (this.durable && this.publisher)
      return this.durable.transaction("editorial-pack", async (db, publisher) => {
        const service = new EntriesService(
          new EntriesRepository(db),
          new ContentTypesService(new ContentTypesRepository(db), db),
          new RevisionsRepository(db),
          this.settings,
          undefined,
          this.authorization,
          true,
          undefined,
          new PublicationsRepository(db),
          this.media
        );
        service.setPublisher(publisher);
        return work(service);
      });
    if (!this.db?.withTransaction)
      throw new EntryValidationError("Editorial writes require MongoDB replica-set transactions");
    const events: Array<{ name: string; payload: unknown }> = [];
    const result = await this.db.withTransaction({ pluginId: "editorial-pack" }, async (db) => {
      events.length = 0;
      const service = new EntriesService(
        new EntriesRepository(db),
        new ContentTypesService(new ContentTypesRepository(db), db),
        new RevisionsRepository(db),
        this.settings,
        undefined,
        this.authorization,
        true,
        undefined,
        new PublicationsRepository(db),
        this.media
      );
      service.setPublisher({
        emit: async (name, payload) => {
          events.push({ name, payload });
        }
      });
      return work(service);
    });
    for (const event of events) await this.publisher?.emit(event.name, event.payload);
    return result;
  }

  private async createRevision(entry: EntryRecord, reason: string, actorUserId: string) {
    const revisions = await this.revisions.listByEntryId(entry.id, { limit: 1 });
    return this.revisions.create({
      id: randomUUID(),
      entryId: entry.id,
      revisionNumber: (revisions[0]?.revisionNumber ?? 0) + 1,
      reason,
      snapshotJson: JSON.stringify(entry),
      createdByUserId: actorUserId,
      createdAt: new Date().toISOString()
    });
  }

  private async requiresReviewerAssignment(): Promise<boolean> {
    const setting = await this.settings?.getResolvedValueByKey(
      "editorial-pack:workflow:require_reviewer_assignment"
    );
    return setting?.value !== false;
  }

  private validateData(contentType: ContentTypeRecord, data: Record<string, unknown>) {
    const allowedKeys = new Set(contentType.fields.map((field) => field.key));
    for (const key of Object.keys(data)) {
      if (!allowedKeys.has(key)) {
        throw new EntryValidationError(
          `Field "${key}" is not defined by content type "${contentType.key}"`
        );
      }
    }
    for (const field of contentType.fields) {
      const value = data[field.key];
      if (value === undefined || value === null) {
        if (field.required) throw new EntryValidationError(`Field "${field.key}" is required`);
        continue;
      }
      if (field.multiple) {
        if (!Array.isArray(value) || value.length === 0) {
          throw new EntryValidationError(`Field "${field.key}" must be a non-empty array`);
        }
        for (const item of value) this.validateFieldValue(field, item);
      } else {
        this.validateFieldValue(field, value);
      }
    }
  }

  private validateFieldValue(field: ContentTypeRecord["fields"][number], value: unknown) {
    const { type, key } = field;
    const selectOptions = (field.config as { options?: readonly string[] } | undefined)?.options;
    const isRecord = value !== null && typeof value === "object" && !Array.isArray(value);
    const isString = typeof value === "string" && value.trim().length > 0;
    let valid = false;

    switch (type) {
      case "text":
      case "media":
      case "relation":
        valid = isString;
        break;
      case "select":
        valid = isString && (!selectOptions?.length || selectOptions.includes(value));
        break;
      case "url":
        valid = isString && /^https?:\/\//i.test(value);
        break;
      case "number":
        valid = typeof value === "number" && Number.isFinite(value);
        break;
      case "boolean":
        valid = typeof value === "boolean";
        break;
      case "date_time":
        valid = isString && !Number.isNaN(Date.parse(value));
        break;
      case "rich_text":
        valid = isRecord || Array.isArray(value);
        break;
      case "repeatable":
        valid = Array.isArray(value);
        break;
      case "json":
        valid = value !== undefined;
        break;
    }

    if (!valid) throw new EntryValidationError(`Field "${key}" has an invalid ${type} value`);
  }
}

function toEventPayload(entry: EntryRecord, actorUserId: string) {
  return {
    entryId: entry.id,
    contentTypeId: entry.contentTypeId,
    actorUserId,
    status: entry.status,
    occurredAt: new Date().toISOString()
  };
}
