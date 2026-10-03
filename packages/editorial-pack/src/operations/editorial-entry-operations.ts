import { createToken } from "@trinacria-cms/kernel";
import type { OperationAuthorizer, OperationContext } from "@trinacria-cms/kernel/contracts";
import { assertOperationContext, operationSubjectId } from "@trinacria-cms/kernel/runtime";
import type { CreateEntryInput, UpdateEntryInput } from "../modules/entries/entries.input.js";
import type {
  EntriesService,
  EntryAccessScope
} from "../modules/entries/services/entries.service.js";

export const EDITORIAL_ENTRY_OPERATIONS = createToken<EditorialEntryOperations>(
  "EDITORIAL_ENTRY_OPERATIONS"
);
export class EditorialEntryOperations {
  constructor(
    private readonly implementation: EntriesService,
    private readonly authorizer: OperationAuthorizer
  ) {}
  private service(context: OperationContext) {
    assertOperationContext(context);
    return this.implementation.withAuthorization(context, this.authorizer, () =>
      this.scope(context)
    );
  }
  private async scope(context: OperationContext): Promise<EntryAccessScope> {
    const can = async (action: string) => {
      try {
        await this.authorizer.assert(context, {
          ownerPluginId: "editorial-pack",
          resource: "entries",
          action
        });
        return true;
      } catch {
        return false;
      }
    };
    return {
      actorUserId: operationSubjectId(context),
      canAccessAll: (await Promise.all(["delete", "approve", "publish"].map(can))).some(Boolean),
      canReviewAssigned: await can("review"),
      canUseAuthorScope: (await Promise.all(["create", "update", "submit"].map(can))).some(Boolean)
    };
  }
  async createEntry(context: OperationContext, input: CreateEntryInput) {
    return this.service(context).createEntry(structuredClone(input), operationSubjectId(context));
  }
  async getEntry(context: OperationContext, id: string) {
    return this.service(context).getEntry(id, await this.scope(context));
  }
  async listEntries(
    context: OperationContext,
    options: Omit<NonNullable<Parameters<EntriesService["listEntries"]>[0]>, "accessFilter"> = {}
  ) {
    const { accessFilter: _untrusted, ...filters } = options as typeof options & {
      accessFilter?: unknown;
    };
    return this.service(context).listEntries(filters, await this.scope(context));
  }
  async updateEntry(context: OperationContext, id: string, input: UpdateEntryInput) {
    input = structuredClone(input);
    return this.service(context).updateEntry(id, input, await this.scope(context));
  }
  async transitionEntry(context: OperationContext, id: string, transition: string) {
    return this.service(context).transitionEntry(id, transition, await this.scope(context));
  }
  async publishSnapshot(context: OperationContext, id: string, expectedVersion: number) {
    return this.service(context).publishSnapshot(id, expectedVersion, await this.scope(context));
  }
  async deleteEntry(context: OperationContext, id: string) {
    return this.service(context).deleteEntry(id, await this.scope(context));
  }
  async listRevisions(context: OperationContext, id: string) {
    return this.service(context).listRevisions(id, await this.scope(context));
  }
  async createRevisionSnapshot(context: OperationContext, id: string) {
    return this.service(context).createRevisionSnapshot(id, await this.scope(context));
  }
  async restoreRevision(context: OperationContext, id: string, revisionId: string) {
    return this.service(context).restoreRevision(id, revisionId, await this.scope(context));
  }
}
